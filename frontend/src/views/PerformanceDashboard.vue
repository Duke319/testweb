<template>
  <main class="performance-app">
    <DashboardHeader
      v-model:active-view="activeView"
      :scope-text="currentScopeText"
      :current-user="currentUser"
      @logout="$emit('logout')"
    />

    <section class="workspace-shell">
      <FilterBar
        v-if="!['overview', 'competence', 'exception'].includes(activeView)"
        v-model:filters="filters"
        :options="filterOptions"
        :locked-department="currentUser?.departmentScope || ''"
        :mode="filterMode"
        @apply="loadData"
        @reset="resetFilters"
      />

      <div class="dashboard-content" :class="{ refreshing: loading }">
        <div v-if="loading" class="loading-overlay" role="status" aria-live="polite">
          <span class="loading-spinner" aria-hidden="true"></span>
          正在更新
        </div>
        <div v-if="error" class="loading-state error" role="alert">{{ error }}</div>

        <template v-else>
          <template v-if="activeView === 'overview'">
            <BossOverview
              v-model:filters="filters"
              :chart-options="overviewChartOptions"
              :filter-options="filterOptions"
              :metrics="overviewMetrics"
              :module-cards="overviewModuleCards"
              :locked-department="currentUser?.departmentScope || ''"
              :scope-label="monthRangeText"
              @navigate="activeView = $event"
            />
          </template>

          <PiIndicatorView
            v-else-if="activeView === 'pi'"
            :filters="effectiveViewFilters"
            :trend="monthlyTrend"
            :employees="employeeRows"
            :raw-records="adminData.rawRecords"
            :employee-detail="employeeDetail"
            :selected-employee-key="selectedEmployeeKey"
            @select-employee="selectEmployee"
          />

          <MetricFocusView
            v-else-if="['composite', 'reliability', 'improvement'].includes(activeView)"
            :indicator="activeView"
            :filters="effectiveViewFilters"
            :trend="activeView === 'improvement' ? improvementTrend : monthlyTrend"
            :employees="employeeRows"
            :summary="summary"
            :employee-detail="employeeDetail"
            :selected-employee-key="selectedEmployeeKey"
            @select-employee="selectEmployee"
          />

          <CompetenceWorkspace
            v-else-if="activeView === 'competence'"
            :matrix="competenceMatrix"
            :summary="competenceSummary"
            :selected-employee-key="selectedEmployeeKey"
            @select-employee="selectEmployee"
          />

          <SafetyWorkspace
            v-else-if="activeView === 'safety'"
            :filters="effectiveViewFilters"
          />

          <ExceptionWorkspace
            v-else-if="activeView === 'exception'"
            :employees="employeeRows"
            :raw-records="adminData.rawRecords"
            :repair-time-anomalies="repairTimeAnomalyData"
            :data-authenticity="dataAuthenticity"
            :summary="summary"
            @select-employee="selectEmployee"
          />
        </template>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BossOverview from "../components/BossOverview.vue";
import DashboardHeader from "../components/DashboardHeader.vue";
import FilterBar from "../components/FilterBar.vue";
import CompetenceWorkspace from "../components/CompetenceWorkspace.vue";
import ExceptionWorkspace from "../components/ExceptionWorkspace.vue";
import SafetyWorkspace from "../components/SafetyWorkspace.vue";
import MetricFocusView from "../components/MetricFocusView.vue";
import PiIndicatorView from "../components/PiIndicatorView.vue";
import { buildMetricSparkPanel, buildPiMonthlyChart, hasCompositeWorkHourData } from "../utils/metricFocusChart";
import {
  formatCompactMoney as formatCompactMoneyValue,
  formatDecimal,
  formatHours,
  formatInteger,
  formatMinutes,
  formatMoney,
  formatPercent,
} from "../utils/numberFormat";
import {
  getAdminEmployees,
  getBossSummary,
  getCompetenceMatrix,
  getDataAuthenticity,
  getEmployeeDetail,
  getRepairTimeAnomalies,
} from "../services/performanceApi";

const props = defineProps({
  currentUser: { type: Object, default: null },
});

defineEmits(["logout"]);

const loading = ref(false);
const error = ref("");
const activeView = ref("overview");
const DEFAULT_MONTH_FROM = "2024 Jan";
const DEFAULT_MONTH_TO = "2026 Apr";
const HIDDEN_PI_MONTHS = new Set(["2026 May"]);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_ASSESSMENT_YEAR = "2026";
const filters = ref({
  monthFrom: DEFAULT_MONTH_FROM,
  monthTo: DEFAULT_MONTH_TO,
  assessmentYear: DEFAULT_ASSESSMENT_YEAR,
  businessArea: "",
  department: "",
});
const filterOptions = ref({ years: [], months: [], businessAreas: [], departments: [], employees: [] });
const bossData = ref({ summary: {}, trend: [], topEmployees: [], attentionEmployees: [] });
const adminData = ref({ summary: {}, employees: [], rawRecords: [] });
const competenceData = ref({ certificateTypes: [], employees: [] });
const repairTimeAnomalyData = ref({ source: {}, summary: {}, records: [] });
const dataAuthenticity = ref({ summary: {}, sourceCoverage: { ledgers: [], totals: {} }, gapChecklist: { rows: [] }, importBatches: [], anomalies: [] });
const employeeDetail = ref({ profile: null, comparisons: {}, monthlyTrends: [], records: [] });
const selectedEmployeeKey = ref("");
let dataRequestSeq = 0;
let filterApplyTimer = 0;

const emptyFilters = () => ({
  monthFrom: DEFAULT_MONTH_FROM,
  monthTo: DEFAULT_MONTH_TO,
  assessmentYear: DEFAULT_ASSESSMENT_YEAR,
  businessArea: "",
  department: props.currentUser?.departmentScope || "",
});

const metricColors = {
  pi: "#f5c542",
  reference: "#596171",
};

const summary = computed(() => bossData.value.summary || {});
const employeeRows = computed(() => adminData.value.employees || []);
const monthlyTrend = computed(() => {
  return bossData.value.trend || [];
});
const filterMode = computed(() => activeView.value === "composite" ? "assessmentYear" : "range");
const effectiveViewFilters = computed(() => filtersForView(filters.value, activeView.value));
const visiblePiTrend = computed(() => monthlyTrend.value.filter((row) => !isHiddenPiMonth(row.month)));
const improvementTrend = computed(() => monthlyTrend.value.filter(hasImprovementData));
const competenceMatrix = computed(() => competenceData.value || { certificateTypes: [], employees: [] });
const hasHeldCertificate = (certificate) => certificate.hasCertificate || ["valid", "expiring", "expired"].includes(certificate.status);
const competenceSummary = computed(() => {
  const certificateTypes = competenceMatrix.value.certificateTypes || [];
  const employees = competenceMatrix.value.employees || [];
  const totalSlots = certificateTypes.length * employees.length;
  const heldCount = employees.reduce(
    (total, employee) => total + (employee.certificates || []).filter(hasHeldCertificate).length,
    0
  );
  const certifiedEmployeeCount = employees.filter((employee) =>
    (employee.certificates || []).some(hasHeldCertificate)
  ).length;
  const multiSkillEmployeeCount = employees.filter((employee) =>
    (employee.certificates || []).filter(hasHeldCertificate).length >= 2
  ).length;

  return {
    certificateTypes: certificateTypes.length,
    employeeCount: employees.length,
    certifiedEmployeeCount,
    multiSkillEmployeeCount,
    heldCount,
    totalSlots,
    missingCount: Math.max(totalSlots - heldCount, 0),
    coverageRate: totalSlots ? heldCount / totalSlots : 0,
    multiSkillRate: employees.length ? multiSkillEmployeeCount / employees.length : 0,
  };
});

const currentScopeText = computed(() => {
  const scopeLabel = props.currentUser?.departmentScope || "全部 TEF";
  if (activeView.value === "competence") {
    return `能力 / ${scopeLabel}`;
  }
  if (activeView.value === "exception") {
    return `异常 / ${scopeLabel}`;
  }
  if (activeView.value === "safety") {
    return `安全 / ${monthRangeText.value} / ${filters.value.department || scopeLabel}`;
  }
  const parts = [
    monthRangeText.value,
    filters.value.department || scopeLabel,
  ].filter(Boolean);
  return parts.join(" / ");
});

const monthRangeText = computed(() => {
  const activeFilters = effectiveViewFilters.value;
  if (activeFilters.monthFrom && activeFilters.monthTo) {
    const fromLabel = displayTimeLabel(activeFilters.monthFrom, "from");
    const toLabel = displayTimeLabel(activeFilters.monthTo, "to");
    return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`;
  }
  if (activeFilters.monthFrom) {
    return `${displayTimeLabel(activeFilters.monthFrom, "from")} 起`;
  }
  if (activeFilters.monthTo) {
    return `${displayTimeLabel(activeFilters.monthTo, "to")} 止`;
  }
  return "全部月份";
});

const overviewMetrics = computed(() => ({
  repairEfficiency: formatPercent(overviewPiPanel.value.scopeRate),
  compositeHours: formatHours(summary.value.totalCompositeHours),
  mttr: formatMinutesNullable(summary.value.mttrMinutes),
  improvementBenefit: formatMoneyNullable(sumKnown(summary.value.nearMissBenefit, summary.value.pdcaBenefit, summary.value.kaizenBenefit)),
}));

const overviewCompositePanel = computed(() =>
  buildMetricSparkPanel({
    trend: monthlyTrend.value,
    key: "composite",
    title: "综合工时趋势",
    tabLabel: "综合",
    metric: formatHours(summary.value.totalCompositeHours),
    field: "compositeHours",
    color: "#435166",
    formatter: formatHours,
    chartType: "bar",
    usePiYearLogic: true,
    yearLogicDataPredicate: hasCompositeWorkHourData,
  })
);

const overviewReliabilityPanel = computed(() =>
  buildMetricSparkPanel({
    trend: monthlyTrend.value,
    key: "mttr",
    title: "MTTR 趋势",
    tabLabel: "MTTR",
    metric: formatMinutesNullable(summary.value.mttrMinutes),
    field: "mttrMinutes",
    color: "#256d9f",
    formatter: formatMinutes,
    labelFormatter: formatOneDecimal,
    chartType: "bar",
    showAverageLine: true,
    usePiYearLogic: true,
    usePiBarFormat: true,
    aggregateMode: "average",
    unit: "min",
  })
);

const overviewImprovementPanel = computed(() =>
  buildMetricSparkPanel({
    trend: improvementTrend.value,
    key: "benefit",
    title: "改善收益趋势",
    tabLabel: "收益",
    metric: formatMoneyNullable(sumKnown(summary.value.nearMissBenefit, summary.value.pdcaBenefit, summary.value.kaizenBenefit)),
    valueGetter: (row) => sumKnown(row.nearMissBenefit, row.pdcaBenefit, row.kaizenBenefit),
    color: "#18837e",
    formatter: formatMoney,
    labelFormatter: formatCompactMoney,
    axisFormatter: formatCompactMoney,
    chartType: "bar",
    hideEmptyMonths: true,
    usePiYearLogic: true,
  })
);

const overviewPiPanel = computed(() =>
  buildPiMonthlyChart({
    trend: visiblePiTrend.value,
    latestYearPosition: "front",
    referenceName: "均值",
    colors: {
      good: "#3b8b69",
      warning: "#c49a3a",
      reference: metricColors.reference,
    },
    formatPercent,
    formatNumber,
    formatHours,
    formatMonthCount,
  })
);

const overviewChartOptions = computed(() => ({
  efficiencyTrend: overviewPiPanel.value.option,
  overtime: overviewCompositePanel.value.option,
  workMix: monthlyWorkMixOption.value,
  reliability: overviewReliabilityPanel.value.option,
  improvement: overviewImprovementPanel.value.option,
}));

const overviewModuleCards = computed(() => [
  {
    key: "composite",
    target: "composite",
    eyebrow: "Workload",
    title: "综合工时",
    metric: overviewMetrics.value.compositeHours,
    option: overviewCompositePanel.value.option,
  },
  {
    key: "reliability",
    target: "reliability",
    eyebrow: "Reliability",
    title: "MTTR",
    metric: overviewMetrics.value.mttr,
    option: overviewReliabilityPanel.value.option,
  },
  {
    key: "improvement",
    target: "improvement",
    eyebrow: "Improvement",
    title: "改善收益",
    metric: overviewMetrics.value.improvementBenefit,
    option: overviewImprovementPanel.value.option,
  },
]);

const formatNumber = formatInteger;

function formatMoneyNullable(value) {
  return value === null || value === undefined ? "暂无数据" : formatMoney(value);
}

function formatMinutesNullable(value) {
  return value === null || value === undefined ? "暂无数据" : formatMinutes(value);
}

function formatOneDecimal(value) {
  return formatDecimal(value, 1);
}

function formatCompactMoney(value) {
  return formatCompactMoneyValue(value);
}

function formatMonthCount(value) {
  return `${formatDecimal(value, 0)} 月`;
}

function round(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function formatCountNullable(value) {
  return value === null || value === undefined ? "暂无数据" : formatInteger(value);
}

function hasKnown(...values) {
  return values.some((value) => value !== null && value !== undefined && value !== "");
}

function hasImprovementData(row) {
  return hasKnown(row.nearMissCount, row.nearMissBenefit, row.pdcaCount, row.kaizenCount, row.pdcaBenefit, row.kaizenBenefit, row.pdcaAwardCount, row.kaizenAwardCount);
}

function displayTimeLabel(value, boundary) {
  const match = String(value || "").match(/^(\d{4})\s+(Jan|Dec)$/);
  if (match && ((boundary === "from" && match[2] === "Jan") || (boundary === "to" && match[2] === "Dec"))) {
    return match[1];
  }
  return value;
}

function sumKnown(...values) {
  const known = values.filter((value) => value !== null && value !== undefined && value !== "").map(Number).filter(Number.isFinite);
  return known.length ? known.reduce((total, value) => total + value, 0) : null;
}

function chartNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sum(records, field) {
  return records.reduce((total, record) => total + (Number(record[field]) || 0), 0);
}

function average(records, field) {
  return records.length ? sum(records, field) / records.length : 0;
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  return Number(match[1]) * 100 + monthNames.indexOf(match[2]) + 1;
}

function isHiddenPiMonth(month) {
  return HIDDEN_PI_MONTHS.has(String(month || "").trim());
}

function baseTooltip(trigger = "axis") {
  return {
    trigger,
    backgroundColor: "#18212d",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  };
}

function baseGrid(left = 46) {
  return { left, right: 20, top: 34, bottom: 34 };
}

function valueAxis() {
  return {
    type: "value",
    splitLine: { lineStyle: { color: "#edf1f5" } },
    axisLabel: { color: "#667085" },
  };
}

const reliabilityOption = computed(() => ({
  color: ["#e20015"],
  tooltip: baseTooltip(),
  grid: { left: 58, right: 28, top: 56, bottom: 38 },
  legend: { top: 2, right: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: "#667085" } },
  xAxis: { type: "category", data: monthlyTrend.value.map((item) => item.month), axisTick: { show: false }, axisLine: { lineStyle: { color: "#d7dde5" } } },
  yAxis: {
    ...valueAxis(),
    name: "MTTR min",
    nameLocation: "end",
    nameGap: 12,
    nameTextStyle: { color: "#667085", align: "left" },
    axisLabel: { color: "#667085", formatter: "{value}" },
  },
  series: [
    {
      name: "MTTR",
      type: "line",
      smooth: true,
      symbolSize: 5,
      lineStyle: { width: 3 },
      data: monthlyTrend.value.map((item) => chartNumberOrNull(item.mttrMinutes)),
    },
  ],
}));

const overtimeStackOption = computed(() => ({
  color: ["#007bc0", "#f0a202", "#9aa4b2", "#263238"],
  tooltip: { ...baseTooltip(), axisPointer: { type: "shadow" } },
  legend: { top: 0, right: 0, textStyle: { color: "#667085" } },
  grid: baseGrid(),
  xAxis: { type: "category", data: monthlyTrend.value.map((item) => item.month), axisTick: { show: false } },
  yAxis: valueAxis(),
  series: [
    { name: "OT 1.5x", type: "bar", stack: "hours", data: monthlyTrend.value.map((item) => item.overtime15Hours), barWidth: 14 },
    { name: "OT 2x", type: "bar", stack: "hours", data: monthlyTrend.value.map((item) => item.overtime20Hours) },
    { name: "请假", type: "bar", data: monthlyTrend.value.map((item) => item.leaveHours) },
    { name: "综合工时", type: "line", smooth: true, data: monthlyTrend.value.map((item) => item.compositeHours) },
  ],
}));

const improvementOption = computed(() => ({
  color: ["#18837e", "#78be20", "#f0a202"],
  tooltip: { ...baseTooltip(), axisPointer: { type: "shadow" } },
  legend: { top: 0, right: 0, textStyle: { color: "#667085" } },
  grid: baseGrid(),
  xAxis: {
    type: "category",
    data: improvementTrend.value.map((item) => item.month),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#d7dde5" } },
    axisLabel: { color: "#667085" },
  },
  yAxis: [{ ...valueAxis(), min: 0 }, { ...valueAxis(), min: 0, show: false }],
  series: [
    { name: "Near miss", type: "bar", data: improvementTrend.value.map((item) => chartNumberOrNull(item.nearMissCount)), barWidth: 14, barMaxWidth: 36, itemStyle: { borderRadius: [6, 6, 0, 0], opacity: 0.88 } },
    { name: "PDCA", type: "bar", data: improvementTrend.value.map((item) => chartNumberOrNull(item.pdcaCount)), barWidth: 14, barMaxWidth: 36, itemStyle: { borderRadius: [6, 6, 0, 0], opacity: 0.88 } },
    { name: "收益", type: "bar", yAxisIndex: 1, data: improvementTrend.value.map((item) => sumKnown(item.nearMissBenefit, item.pdcaBenefit, item.kaizenBenefit)), barWidth: 14, barMaxWidth: 36, itemStyle: { borderRadius: [6, 6, 0, 0], opacity: 0.88 } },
  ],
}));

const monthlyWorkMixOption = computed(() => ({
  color: ["#007bc0", "#18837e", "#f0a202"],
  tooltip: { ...baseTooltip(), axisPointer: { type: "shadow" } },
  legend: { top: 0, right: 0, textStyle: { color: "#667085" } },
  grid: baseGrid(),
  xAxis: { type: "category", data: monthlyTrend.value.map((item) => item.month), axisTick: { show: false } },
  yAxis: valueAxis(),
  series: [
    { name: "PM01", type: "bar", stack: "work", data: monthlyTrend.value.map((item) => item.pm01Hours), barWidth: 14 },
    { name: "PM03", type: "bar", stack: "work", data: monthlyTrend.value.map((item) => item.pm03Hours) },
    { name: "转移", type: "bar", stack: "work", data: monthlyTrend.value.map((item) => item.transferHours) },
  ],
}));

async function loadData() {
  const requestId = ++dataRequestSeq;
  const activeFilters = scopedFilters(filtersForView(filters.value, activeView.value));
  if (activeView.value === "exception") {
    activeFilters.monthFrom = "";
    activeFilters.monthTo = "";
    activeFilters.month = "";
  }
  loading.value = true;
  error.value = "";
  try {
    const [boss, admin, competence, repairTimeAnomalies, authenticity] = await Promise.all([
      getBossSummary(activeFilters),
      getAdminEmployees(activeFilters),
      getCompetenceMatrix({}),
      getRepairTimeAnomalies(activeFilters),
      getDataAuthenticity(activeFilters),
    ]);
    if (requestId !== dataRequestSeq) return;

    bossData.value = boss;
    adminData.value = admin;
    competenceData.value = competence;
    repairTimeAnomalyData.value = repairTimeAnomalies;
    dataAuthenticity.value = authenticity;
    filterOptions.value = boss.filterOptions || admin.filterOptions || filterOptions.value;
    if (selectedEmployeeKey.value) {
      await loadEmployeeDetail(selectedEmployeeKey.value, activeFilters, requestId);
    }
  } catch (err) {
    if (requestId !== dataRequestSeq) return;
    error.value = err.message || "加载失败";
  } finally {
    if (requestId === dataRequestSeq) {
      loading.value = false;
    }
  }
}

async function loadEmployeeDetail(employeeKey, activeFilters, requestId = dataRequestSeq) {
  if (!employeeKey) {
    employeeDetail.value = { profile: null, comparisons: {}, monthlyTrends: [], records: [] };
    return;
  }
  const detail = await getEmployeeDetail(employeeKey, activeFilters);
  if (requestId !== dataRequestSeq) return;
  employeeDetail.value = detail;
}

async function selectEmployee(employeeKey) {
  selectedEmployeeKey.value = employeeKey;
  await loadEmployeeDetail(employeeKey, scopedFilters(filtersForView(filters.value, activeView.value)));
}

function scheduleFilterApply() {
  window.clearTimeout(filterApplyTimer);
  filterApplyTimer = window.setTimeout(() => {
    loadData();
  }, 180);
}

function resetFilters() {
  filters.value = emptyFilters();
}

function scopedFilters(source = {}) {
  const next = { ...source };
  delete next.plant;
  if (props.currentUser?.departmentScope) {
    next.businessArea = "";
    next.department = props.currentUser.departmentScope;
  }
  return next;
}

function filtersForView(source = {}, view = activeView.value) {
  const next = { ...source };
  const assessmentYear = next.assessmentYear ||
    assessmentYearFromRange(next.monthFrom, next.monthTo) ||
    assessmentYearFromMonth(next.monthTo) ||
    assessmentYearFromMonth(next.monthFrom);
  delete next.assessmentYear;
  if (view !== "composite") {
    return next;
  }
  const range = assessmentRangeForYear(assessmentYear);
  return range ? { ...next, ...range, month: "" } : next;
}

function assessmentYearFromMonth(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return "";
  const monthNumber = monthNames.indexOf(match[2]) + 1;
  if (!monthNumber) return "";
  const year = Number(match[1]);
  return String(monthNumber >= 8 ? year + 1 : year);
}

function assessmentRangeForYear(value) {
  const year = Number(value || 0);
  if (!Number.isFinite(year) || year <= 0) return null;
  return {
    monthFrom: `${year - 1} Aug`,
    monthTo: `${year} Jul`,
  };
}

function assessmentYearFromRange(monthFrom, monthTo) {
  const fromMatch = String(monthFrom || "").match(/^(\d{4})\s+Aug$/);
  const toMatch = String(monthTo || "").match(/^(\d{4})\s+Jul$/);
  if (!fromMatch || !toMatch) return "";
  const endYear = Number(toMatch[1]);
  return Number(fromMatch[1]) === endYear - 1 ? String(endYear) : "";
}

watch(
  () => props.currentUser?.departmentScope,
  (departmentScope) => {
    if (departmentScope && filters.value.department !== departmentScope) {
      filters.value = { ...filters.value, businessArea: "", department: departmentScope };
    }
  },
  { immediate: true }
);

onMounted(loadData);

watch(filters, scheduleFilterApply, { deep: true });

watch(activeView, loadData);

onBeforeUnmount(() => {
  window.clearTimeout(filterApplyTimer);
});
</script>
