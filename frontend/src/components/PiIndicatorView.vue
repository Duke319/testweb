<template>
  <section class="pi-indicator-view" aria-label="PI 单指标">
    <div class="pi-board-head">
      <div>
        <span class="section-label">单指标</span>
        <h2>PI 维修效率</h2>
      </div>
      <div class="pi-formula">PI = (PM01 + PM03 + 转移工时) / 出勤小时</div>
    </div>

    <section class="pi-kpi-strip" aria-label="当前范围 PI 概览">
      <div class="pi-kpi-cell">
        <span>{{ selectedScopeLabel }} PI</span>
        <strong>{{ scopeSummary.hasData ? formatPercent(scopeSummary.pi) : "暂无数据" }}</strong>
      </div>
      <div class="pi-kpi-cell">
        <span>维修工时</span>
        <strong>{{ scopeSummary.hasData ? formatHours(scopeSummary.repairHours) : "暂无数据" }}</strong>
      </div>
      <div class="pi-kpi-cell">
        <span>PI 工时</span>
        <strong>{{ scopeSummary.hasData ? formatHours(scopeSummary.piHours) : "暂无数据" }}</strong>
      </div>
      <div class="pi-kpi-cell">
        <span>出勤小时</span>
        <strong>{{ scopeSummary.hasData ? formatHours(scopeSummary.attendanceHours) : "暂无数据" }}</strong>
      </div>
      <div class="pi-kpi-cell">
        <span>接单数量</span>
        <strong>{{ scopeSummary.hasData ? formatNumber(scopeSummary.orderCount) : "暂无数据" }}</strong>
      </div>
    </section>

    <section class="pi-chart-grid">
      <div v-if="hasExpandedAnalysisYears" class="pi-chart-actions">
        <span>{{ expandedAnalysisLabel }}</span>
        <button type="button" class="pi-collapse-action" @click="collapseAnalysisYears">收起明细</button>
      </div>
      <ChartPanel
        class="pi-main-chart"
        :title="monthlyPiTitle"
        :eyebrow="monthlyPiEyebrow"
        :option="monthlyPiOption"
        height="320px"
        @chart-ready="bindMonthlyChart"
      />
    </section>

    <section class="pi-analysis-grid" aria-label="PI 分析图">
      <!--
      <ChartPanel
        :title="piGapTitle"
        :eyebrow="piGapEyebrow"
        :option="piGapOption"
        height="240px"
        dense
        @chart-ready="bindMonthBarChart"
      />
      -->
      <ChartPanel
        title="工时结构"
        :eyebrow="workMixEyebrow"
        :option="workMixOption"
        height="240px"
        dense
        @chart-ready="bindMonthBarChart"
      />
      <ChartPanel
        title="工时总量"
        eyebrow="PI 工时合计 · 出勤总量"
        :option="workTotalOption"
        height="240px"
        dense
        @chart-ready="bindWorkTotalChart"
      />
    </section>

    <section class="pi-scatter-row" aria-label="员工 PI 散点">
      <ChartPanel
        class="pi-scatter-panel"
        title="员工 PI 散点"
        eyebrow="滚轮缩放 · 点色为状态"
        :metric="`${formatNumber(employeeDetailRows.length)} 人`"
        :option="employeeScatterOption"
        height="520px"
        @chart-ready="bindEmployeeScatter"
      />
    </section>

    <section class="pi-detail-grid">
      <article class="data-panel pi-table-panel">
        <div class="panel-head">
          <div>
            <span class="section-label">{{ selectedScopeLabel }}</span>
            <h3>月度数据</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="pi-month-table">
            <thead>
              <tr>
                <th><span class="sort-head static">序号</span></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('monthIndex')">月份 {{ sortMark(monthSort, 'monthIndex') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('pi')">PI {{ sortMark(monthSort, 'pi') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('repairHours')">维修工时 {{ sortMark(monthSort, 'repairHours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('attendanceHours')">出勤小时 {{ sortMark(monthSort, 'attendanceHours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('orderCount')">接单 {{ sortMark(monthSort, 'orderCount') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('pm01Hours')">PM01 {{ sortMark(monthSort, 'pm01Hours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('pm03Hours')">PM03 {{ sortMark(monthSort, 'pm03Hours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('transferHours')">转移 {{ sortMark(monthSort, 'transferHours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('averagePi')">均值 {{ sortMark(monthSort, 'averagePi') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleMonthSort('piGap')">差值 {{ sortMark(monthSort, 'piGap') }}</button></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in sortedMonthlyRows"
                :key="row.month"
                :ref="(element) => setMonthlyRowRef(row.month, element)"
                :class="{ highlighted: row.month === highlightedMonthKey }"
              >
                <td><span class="row-index">{{ index + 1 }}</span></td>
                <td>{{ row.label }}</td>
                <td><strong>{{ formatPercent(row.pi) }}</strong></td>
                <td>{{ formatHours(row.repairHours) }}</td>
                <td>{{ formatHours(row.attendanceHours) }}</td>
                <td>{{ formatNumber(row.orderCount) }}</td>
                <td>{{ formatHours(row.pm01Hours) }}</td>
                <td>{{ formatHours(row.pm03Hours) }}</td>
                <td>{{ formatHours(row.transferHours) }}</td>
                <td>{{ formatPercent(row.averagePi) }}</td>
                <td :class="piGapClass(row.piGap)">{{ signedPercent(row.piGap) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!monthlyRowsWithData.length" class="empty-state compact">暂无数据</div>
        </div>
      </article>

      <article class="data-panel pi-table-panel">
        <div class="panel-head">
          <div>
            <span class="section-label">{{ selectedScopeLabel }}</span>
            <h3>员工排序参考</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="pi-employee-table">
            <thead>
              <tr>
                <th><span class="sort-head static">序号</span></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('employeeName')">员工 {{ sortMark(employeeSort, 'employeeName') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('department')">组织 {{ sortMark(employeeSort, 'department') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('repairEfficiency')">PI {{ sortMark(employeeSort, 'repairEfficiency') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('repairHours')">维修工时 {{ sortMark(employeeSort, 'repairHours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('pm01Hours')">PM01 {{ sortMark(employeeSort, 'pm01Hours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('pm03Hours')">PM03 {{ sortMark(employeeSort, 'pm03Hours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('transferHours')">转移 {{ sortMark(employeeSort, 'transferHours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('piHours')">PI 工时 {{ sortMark(employeeSort, 'piHours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('attendanceHours')">合计出勤 {{ sortMark(employeeSort, 'attendanceHours') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('monthCount')">统计月数 {{ sortMark(employeeSort, 'monthCount') }}</button></th>
                <th><button type="button" class="sort-head" @click="toggleEmployeeSort('orderCount')">接单 {{ sortMark(employeeSort, 'orderCount') }}</button></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(employee, index) in sortedEmployeeRows"
                :key="employee.employeeKey"
                :ref="(element) => setEmployeeRowRef(employee.employeeKey, element)"
                :class="{ highlighted: employee.employeeKey === highlightedEmployeeKey || employee.employeeKey === selectedEmployeeKey }"
                tabindex="0"
                role="button"
                @click="selectEmployeeRow(employee.employeeKey)"
                @keydown.enter.prevent="selectEmployeeRow(employee.employeeKey)"
                @keydown.space.prevent="selectEmployeeRow(employee.employeeKey)"
              >
                <td><span class="row-index">{{ index + 1 }}</span></td>
                <td>
                  <strong>{{ employee.employeeName }}</strong>
                  <span v-if="employee.excludeFromAverages" class="calculation-exclusion-badge">不计入计算</span>
                  <small>{{ employeeMetaText(employee) }}</small>
                </td>
                <td>{{ organizationLabel(employee) || "-" }}</td>
                <td><strong>{{ formatPercent(employee.repairEfficiency) }}</strong></td>
                <td>{{ formatHours(employee.repairHours) }}</td>
                <td>{{ formatHours(employee.pm01Hours) }}</td>
                <td>{{ formatHours(employee.pm03Hours) }}</td>
                <td>{{ formatHours(employee.transferHours) }}</td>
                <td>{{ formatHours(employee.piHours) }}</td>
                <td>{{ formatHours(employee.attendanceHours) }}</td>
                <td>{{ formatMonthCount(employee.monthCount) }}</td>
                <td>{{ formatNumber(employee.orderCount) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!employeeDetailRows.length" class="empty-state compact">暂无数据</div>
        </div>
      </article>
    </section>

    <article ref="detailShellRef" class="data-panel employee-detail-shell">
      <div class="panel-head">
        <div>
          <span class="section-label">详情</span>
          <h3>员工排序参考图</h3>
        </div>
        <strong>{{ selectedEmployeeDisplay }}</strong>
      </div>
      <EmployeeDetailPanel :detail="employeeDetail" hide-provenance />
    </article>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import ChartPanel from "./ChartPanel.vue";
import EmployeeDetailPanel from "./EmployeeDetailPanel.vue";
import { buildPiMonthlyChart, isYtdLikeRow, ytdBarItemStyle } from "../utils/metricFocusChart";
import {
  formatDecimal,
  formatHours,
  formatInteger,
  formatPercent as formatPercentNumber,
} from "../utils/numberFormat";

const props = defineProps({
  filters: { type: Object, default: () => ({}) },
  trend: { type: Array, default: () => [] },
  employees: { type: Array, default: () => [] },
  rawRecords: { type: Array, default: () => [] },
  selectedEmployeeKey: { type: String, default: "" },
  employeeDetail: { type: Object, default: () => ({ profile: null, monthlyTrends: [], records: [] }) },
});

const emit = defineEmits(["select-employee"]);

const metricColors = {
  pm01: "#3b8b69",
  pm03: "#1f6fb2",
  transfer: "#c27a2c",
  attendance: "#7d8794",
  pi: "#f5c542",
  reference: "#596171",
};
const statusColors = {
  over: "#6f4ea2",
  good: "#3b8b69",
  warning: "#c49a3a",
  missing: "#996b2a",
  excluded: "#ff74cb",
};
const piGreen = statusColors.good;
const piBelow = statusColors.warning;
const piSlate = metricColors.reference;
const piAmber = statusColors.warning;
const piExcluded = statusColors.excluded;

const TEF_PI_TARGETS = {
  TEF31: null,
  TEF32: null,
  TEF33: null,
};
const PLANT_101_PI_TARGETS = {
  maintenance: 0.85,
  default: 0.8,
};
const HIDDEN_PI_MONTHS = new Set(["2026 May"]);

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const highlightedMonthKey = ref("");
const highlightedEmployeeKey = ref("");
const expandedAnalysisYears = ref([]);
const detailShellRef = ref(null);
const monthlyRowRefs = new Map();
const employeeRowRefs = new Map();
let monthHighlightTimer = 0;
let highlightTimer = 0;
let detailScrollTimer = 0;
const monthSort = ref({ key: "monthIndex", direction: "asc" });
const employeeSort = ref({ key: "repairEfficiency", direction: "desc" });
const selectedScopeLabel = computed(() => {
  if (props.filters?.monthFrom && props.filters?.monthTo) {
    return `${props.filters.monthFrom} - ${props.filters.monthTo}`;
  }
  if (props.filters?.monthFrom) {
    return `${props.filters.monthFrom} 起`;
  }
  if (props.filters?.monthTo) {
    return `${props.filters.monthTo} 止`;
  }
  return "全部月份";
});
const visibleTrend = computed(() => props.trend.filter((row) => !isHiddenPiMonth(row.month)));
const visibleRawRecords = computed(() => props.rawRecords.filter((record) => !isHiddenPiMonth(record.month)));

const scopeSummary = computed(() => {
  const rows = visibleTrend.value;
  const attendanceHours = sum(rows, "attendanceHours");
  const repairHours = sum(rows, "repairHours");
  const piHours = piNumerator(rows);
  const averageBasisAttendanceHours = sumAverageBasisAttendance(rows);
  const averageBasisPiHours = sumAverageBasisPiHours(rows);
  const orderCount = sum(rows, "orderCount");
  return {
    hasData: rows.length > 0 && averageBasisAttendanceHours > 0,
    monthCount: rows.length,
    attendanceHours,
    repairHours,
    piHours,
    averageBasisAttendanceHours,
    averageBasisPiHours,
    orderCount,
    pi: repairEfficiencyFromTotals(averageBasisAttendanceHours, averageBasisPiHours),
  };
});

const scopeAveragePi = computed(() => (scopeSummary.value.hasData ? scopeSummary.value.pi : 0));

const monthlyRows = computed(() => {
  return visibleTrend.value.map((row) => makeMonthRow(row.month, row));
});

function makeMonthRow(month, row = {}, label = month) {
  const attendanceHours = Number(row.attendanceHours || 0);
  const repairHours = Number(row.repairHours || 0);
  const pm01Hours = Number(row.pm01Hours || 0);
  const pm03Hours = Number(row.pm03Hours || 0);
  const transferHours = Number(row.transferHours || 0);
  const piHours = piNumeratorFromValues(pm01Hours, pm03Hours, transferHours, repairHours);
  const averageBasisAttendanceHours = averageBasisAttendance(row, attendanceHours);
  const averageBasisPiHours = averageBasisPi(row, piHours);
  const averagePi = scopeAveragePi.value;
  const pi = repairEfficiencyFromTotals(averageBasisAttendanceHours, averageBasisPiHours);
  return {
    month,
    label: label || month,
    monthIndex: getMonthIndex(month),
    hasData: Boolean(row.month) && averageBasisAttendanceHours > 0,
    attendanceHours,
    repairHours,
    orderCount: Number(row.orderCount || 0),
    pm01Hours,
    pm03Hours,
    transferHours,
    averageBasisAttendanceHours,
    averageBasisPiHours,
    averagePi,
    pi,
    piGap: pi - averagePi,
  };
}

const monthlyRowsWithData = computed(() => monthlyRows.value.filter((row) => row.hasData));
const sortedMonthlyRows = computed(() => sortRows(monthlyRowsWithData.value, monthSort.value));
const shouldUseAnnualAnalysis = computed(() => monthlyRowsWithData.value.length > 18);
const analysisYears = computed(() => [...new Set(monthlyRowsWithData.value.map((row) => getMonthYear(row.month)).filter(Boolean))]);
const latestAnalysisYear = computed(() => analysisYears.value[analysisYears.value.length - 1] || "");
const analysisGranularityLabel = computed(() => (shouldUseAnnualAnalysis.value ? "按年 / 最新月度" : "月度"));
const workMixEyebrow = computed(() => "PI 工时构成占比");
const piGapTitle = computed(() => "PI 差值");
const piGapEyebrow = computed(() => "基准 = Σ(PM01 + PM03 + 转移工时) / Σ出勤小时");
const analysisRows = computed(() =>
  shouldUseAnnualAnalysis.value
    ? buildHybridAnalysisRows(monthlyRowsWithData.value, latestAnalysisYear.value, expandedAnalysisYears.value)
    : monthlyRowsWithData.value
);
const workTotalRows = computed(() =>
  shouldUseAnnualAnalysis.value
    ? buildWorkTotalRows(monthlyRowsWithData.value, latestAnalysisYear.value, expandedAnalysisYears.value)
    : monthlyRowsWithData.value
);
const monthlyPiPanel = computed(() =>
  buildPiMonthlyChart({
    trend: visibleTrend.value,
    expandedYears: expandedAnalysisYears.value,
    latestYearPosition: "front",
    referenceRate: monthlyPiReferenceRate.value,
    referenceName: monthlyPiReferenceName.value,
    referenceLabel: monthlyPiReferenceLabel.value,
    colors: {
      good: statusColors.good,
      warning: statusColors.warning,
      reference: metricColors.reference,
    },
    shouldUseAnnual: shouldUseAnnualAnalysis.value,
    formatPercent,
    formatNumber,
    formatHours,
    formatMonthCount,
  })
);
const monthlyPiRows = computed(() => monthlyPiPanel.value.rows);
const hasExpandedAnalysisYears = computed(() => expandedAnalysisYears.value.length > 0);
const expandedAnalysisLabel = computed(() => `${expandedAnalysisYears.value.join("、")} 已展开`);

const employeeRowsForScope = computed(() => {
  const sourceRows = visibleRawRecords.value;
  if (!sourceRows.length) {
    return props.employees.map((employee) => ({
      ...employee,
      positionTitle: employee.positionTitle || employee.jobTitle || employee.role || "",
      excludeFromAverages: Boolean(employee.excludeFromAverages),
      averageExclusionReason: employee.averageExclusionReason || "",
      piTargetRate: employee.piTargetRate ?? null,
      piTargetLabel: employee.piTargetLabel || "",
      piHours: Number(employee.piHours || 0) || piNumeratorForRecord(employee),
    }));
  }

  const employeeSummaryByKey = new Map(props.employees.map((employee) => [employee.employeeKey, employee]));
  const groups = new Map();
  sourceRows.forEach((record) => {
    const key = record.employeeKey || `${record.department || ""}::${record.employeeName || ""}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(record);
  });

  return [...groups.entries()].map(([employeeKey, records]) => {
    const first = records[0] || {};
    const summary = employeeSummaryByKey.get(employeeKey) || {};
    const attendanceHours = sum(records, "attendanceHours");
    const repairHours = sum(records, "repairHours");
    const piRecords = records.filter((record) => !isRepairHoursQualityRecord(record));
    const piAttendanceHours = sum(piRecords, "attendanceHours");
    const piHours = piNumerator(piRecords);
    const monthCount = uniqueCount(records, "month");
    const allRecordsExcludedFromAverages = records.length > 0 && records.every((record) => record.excludeFromAverages);
    const employee = {
      employeeKey,
      employeeName: first.employeeName || "-",
      employeeNo: first.employeeNo || "",
      positionTitle: first.positionTitle || first.jobTitle || first.role || summary.positionTitle || summary.jobTitle || summary.role || "",
      excludeFromAverages: allRecordsExcludedFromAverages,
      averageExclusionReason: allRecordsExcludedFromAverages ? first.averageExclusionReason || summary.averageExclusionReason || "" : "",
      piTargetRate: first.piTargetRate ?? summary.piTargetRate ?? null,
      piTargetLabel: first.piTargetLabel || summary.piTargetLabel || "",
      department: first.department || "",
      businessArea: first.businessArea || "",
      plant: first.plant || "",
      workshop: first.workshop || summary.workshop || "",
      shift: first.shift || summary.shift || "",
      attendanceHours,
      averageMonthlyAttendanceHours: monthCount > 0 ? attendanceHours / monthCount : 0,
      monthCount,
      repairHours,
      orderCount: sum(records, "orderCount"),
      pm01Hours: sum(records, "pm01Hours"),
      pm03Hours: sum(records, "pm03Hours"),
      transferHours: sum(records, "transferHours"),
      piHours,
      repairEfficiency: repairEfficiencyFromTotals(piAttendanceHours, piHours),
      performanceScore: summary.performanceScore || 0,
    };
    return {
      ...employee,
      piStatusValue: piStatusValue(employee.repairEfficiency, piAttendanceHours, piHours, employee),
    };
  });
});

const employeeDetailRows = computed(() =>
  [...employeeRowsForScope.value]
    .filter((employee) => Number(employee.attendanceHours || 0) > 0 || employee.excludeFromAverages)
    .map((employee) => ({ ...employee, piStatusValue: piStatusValue(employee.repairEfficiency, employee.attendanceHours, employee.piHours, employee) }))
);
const sortedEmployeeRows = computed(() => sortRows(employeeDetailRows.value, employeeSort.value));

const selectedEmployeeDisplay = computed(() => {
  const profile = props.employeeDetail?.profile;
  if (profile?.employeeName) {
    return [profile.employeeName, profile.positionTitle || profile.jobTitle || profile.role, profile.employeeNo].filter(Boolean).join(" · ");
  }

  const employee = employeeRowsForScope.value.find((item) => item.employeeKey === props.selectedEmployeeKey);
  if (employee?.employeeName) {
    return [employee.employeeName, employee.positionTitle || employee.jobTitle || employee.role, employee.employeeNo].filter(Boolean).join(" · ");
  }

  return props.selectedEmployeeKey || "未选择";
});

const monthlyPiOption = computed(() => monthlyPiPanel.value.option);

const piGapOption = computed(() => {
  const rows = analysisRows.value;
  return {
    color: [piGreen, piBelow],
    tooltip: {
      ...baseTooltip("axis"),
      formatter: (params) => formatPiGapTooltip(params, rows),
    },
    grid: chartGrid(56, 34, 26, 34),
    xAxis: analysisCategoryAxis(rows),
    yAxis: {
      type: "value",
      axisLabel: { color: "#667085", fontSize: 11, formatter: "{value}pt" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#e8eef5" } },
    },
    series: [
      {
        name: "差值",
        type: "bar",
        barWidth: analysisBarWidth(rows),
        barMaxWidth: 104,
        barCategoryGap: "14%",
        data: rows.map((row) => {
          const value = round(row.piGap * 100, 1);
          return {
            value,
            itemStyle: ytdBarItemStyle(row, {
              color: value >= 0 ? piGreen : piBelow,
              borderRadius: value >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
              borderColor: row.isAnnual ? "rgba(24, 33, 45, 0.16)" : "transparent",
              borderWidth: row.isAnnual ? 1 : 0,
            }),
          };
        }),
      },
    ],
  };
});

const workMixOption = computed(() => {
  const rows = analysisRows.value;
  return {
    color: [metricColors.pm01, metricColors.pm03, metricColors.transfer],
    tooltip: {
      ...baseTooltip("axis"),
      formatter: (params) => formatWorkMixTooltip(params, rows),
    },
    legend: compactLegend(["PM01", "PM03", "转移工时"]),
    grid: chartGrid(64, 34, 42, 34),
    xAxis: analysisCategoryAxis(rows),
    yAxis: percentAxis(100),
    series: [
      {
        name: "PM01",
        type: "bar",
        stack: "work",
        barWidth: analysisBarWidth(rows),
        barMaxWidth: 104,
        barCategoryGap: "14%",
        barMinHeight: 2,
        itemStyle: { ...stackBarStyle([0, 0, 4, 4]), color: metricColors.pm01, opacity: 0.9 },
        data: rows.map((row) => barDataValue(row, workMixShareValue(row, "pm01Hours"), metricColors.pm01, { ...stackBarStyle([0, 0, 4, 4]), opacity: 0.9 })),
        z: 3,
      },
      {
        name: "PM03",
        type: "bar",
        stack: "work",
        barMinHeight: 2,
        itemStyle: { ...stackBarStyle(), color: metricColors.pm03, opacity: 0.88 },
        data: rows.map((row) => barDataValue(row, workMixShareValue(row, "pm03Hours"), metricColors.pm03, { ...stackBarStyle(), opacity: 0.88 })),
        z: 3,
      },
      {
        name: "转移工时",
        type: "bar",
        stack: "work",
        barMinHeight: 2,
        itemStyle: { ...stackBarStyle([4, 4, 0, 0]), color: metricColors.transfer, opacity: 0.9 },
        label: {
          show: true,
          position: "top",
          color: "#465160",
          fontSize: 10,
          formatter: (params) => (workMixDisplayTotal(rows[params.dataIndex] || {}) > 0 ? "100%" : ""),
        },
        labelLayout: { hideOverlap: true },
        data: rows.map((row) => barDataValue(row, workMixShareValue(row, "transferHours"), metricColors.transfer, { ...stackBarStyle([4, 4, 0, 0]), opacity: 0.9 })),
        z: 3,
      },
    ],
  };
});

const workTotalOption = computed(() => {
  const rows = workTotalRows.value;
  return {
    color: [metricColors.pm01, metricColors.pm03, metricColors.transfer, metricColors.attendance],
    tooltip: {
      ...baseTooltip("axis"),
      formatter: (params) => formatWorkTotalTooltip(params, rows),
    },
    legend: compactLegend(["PM01", "PM03", "转移工时", "出勤时间"]),
    grid: chartGrid(64, 28, 28, 34),
    xAxis: analysisCategoryAxis(rows),
    yAxis: hoursAxis("小时"),
    series: [
      {
        name: "PM01",
        type: "bar",
        stack: "workTotal",
        barWidth: analysisBarWidth(rows),
        barMaxWidth: 104,
        barCategoryGap: "14%",
        barMinHeight: 2,
        itemStyle: { ...stackBarStyle([0, 0, 4, 4]), color: metricColors.pm01, opacity: 0.9 },
        data: rows.map((row) => barDataValue(row, round(row.pm01Hours, 0), metricColors.pm01, { ...stackBarStyle([0, 0, 4, 4]), opacity: 0.9 })),
      },
      {
        name: "PM03",
        type: "bar",
        stack: "workTotal",
        barMinHeight: 2,
        itemStyle: { ...stackBarStyle(), color: metricColors.pm03, opacity: 0.88 },
        data: rows.map((row) => barDataValue(row, round(row.pm03Hours, 0), metricColors.pm03, { ...stackBarStyle(), opacity: 0.88 })),
      },
      {
        name: "转移工时",
        type: "bar",
        stack: "workTotal",
        barMinHeight: 2,
        itemStyle: { ...stackBarStyle([6, 6, 0, 0]), color: metricColors.transfer, opacity: 0.9 },
        label: {
          show: true,
          position: "top",
          color: "#465160",
          backgroundColor: "rgba(250, 252, 255, 0.96)",
          borderRadius: 4,
          padding: [2, 4],
          fontSize: 10,
          fontWeight: 800,
          formatter: (params) => formatChartTotalLabel(params, rows, (row) => workMixTotal(row)),
        },
        labelLayout: { hideOverlap: true },
        emphasis: { focus: "series" },
        data: rows.map((row) => barDataValue(row, round(row.transferHours, 0), metricColors.transfer, { ...stackBarStyle([6, 6, 0, 0]), opacity: 0.9 })),
      },
      {
        name: "出勤时间",
        type: "line",
        smooth: false,
        symbolSize: 5,
        lineStyle: { width: 2, color: metricColors.attendance, opacity: 0.78 },
        itemStyle: { color: metricColors.attendance, borderColor: "#fff", borderWidth: 1.5 },
        data: rows.map((row) => round(row.attendanceHours, 0)),
        z: 4,
      },
    ],
  };
});

const employeeScatterOption = computed(() => ({
  tooltip: {
    ...baseTooltip("item"),
    confine: true,
    appendToBody: false,
    position: scatterTooltipPosition,
    extraCssText: "max-width:260px;line-height:1.35;white-space:normal;overflow-wrap:anywhere;box-shadow:0 10px 26px rgba(24,33,45,0.18);",
    formatter: formatEmployeeScatterTooltip,
  },
  legend: {
    top: 2,
    right: 4,
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 14,
    textStyle: { color: "#536071", fontSize: 12, fontWeight: 700 },
    data: ["达标/临时达标", "低于 target", ">100%", "不计入考核"],
  },
  grid: chartGrid(82, 66, 74, 64),
  dataZoom: [
    { type: "inside", xAxisIndex: 0, filterMode: "none", zoomOnMouseWheel: true, moveOnMouseMove: true },
    { type: "inside", yAxisIndex: 0, filterMode: "none", zoomOnMouseWheel: true, moveOnMouseMove: true },
  ],
  xAxis: {
    name: "月均出勤小时",
    nameLocation: "center",
    nameGap: 28,
    type: "value",
    scale: true,
    splitLine: { lineStyle: { color: "#edf1f5" } },
    axisLabel: { color: "#667085", formatter: (value) => formatCompactHours(value) },
    nameTextStyle: { color: "#667085" },
  },
  yAxis: {
    name: "PI",
    nameLocation: "center",
    nameGap: 42,
    type: "value",
    min: 0,
    max: employeeScatterYAxisMax.value,
    splitLine: { lineStyle: { color: "#e8eef5" } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#667085", formatter: "{value}%" },
    nameTextStyle: { color: "#667085" },
  },
  series: employeeScatterSeries.value,
}));

const employeeScatterSeries = computed(() => {
  const rows = employeeScatterData.value;
  const groups = [
    { key: "good", name: "达标/临时达标", color: statusColors.good },
    { key: "warning", name: "低于 target", color: statusColors.warning },
    { key: "over", name: ">100%", color: statusColors.over },
    { key: "excluded", name: "不计入考核", color: piExcluded },
  ];
  return groups.map((group, index) => ({
    name: group.name,
    type: "scatter",
    cursor: "pointer",
    ...(index === 0 ? { markLine: employeeScatterMarkLine.value } : {}),
    symbolSize: (value) => {
      const repairHours = Number(Array.isArray(value) ? value[2] || 0 : 0);
      return Math.max(11, Math.min(24, 11 + Math.sqrt(Math.max(repairHours, 0)) / 3.2));
    },
    data: rows.filter((row) => row.statusKey === group.key),
    itemStyle: {
      color: group.color,
      opacity: 0.86,
      borderColor: "#fff",
      borderWidth: 2,
    },
    emphasis: {
      focus: "self",
      scale: 1.3,
      itemStyle: { opacity: 0.98 },
    },
  }));
});

const employeeScatterData = computed(() =>
  employeeDetailRows.value.map((employee) => {
    const attendanceHours = Number(employee.attendanceHours || 0);
    const averageMonthlyAttendanceHours = Number(employee.averageMonthlyAttendanceHours || 0);
    const repairHours = Number(employee.repairHours || 0);
    const piPercent = round(Number(employee.repairEfficiency || 0) * 100, 1);
    const status = piStatus(employee);
    return {
      value: [round(averageMonthlyAttendanceHours, 1), piPercent, round(repairHours, 1)],
      statusKey: status.status,
      employeeKey: employee.employeeKey,
      employeeName: employee.employeeName || "-",
      employeeNo: employee.employeeNo || "",
      positionTitle: employee.positionTitle || "",
      excludeFromAverages: Boolean(employee.excludeFromAverages),
      department: employee.department || employee.businessArea || "-",
      attendanceHours,
      monthCount: Number(employee.monthCount || 0),
      orderCount: Number(employee.orderCount || 0),
      pm01Hours: Number(employee.pm01Hours || 0),
      pm03Hours: Number(employee.pm03Hours || 0),
      transferHours: Number(employee.transferHours || 0),
      piHours: Number(employee.piHours || 0),
      performanceScore: Number(employee.performanceScore || 0),
      piStatusLabel: status.label,
      targetLabel: status.targetLabel,
    };
  })
);

const employeeScatterYAxisMax = computed(() => {
  const maxPi = employeeDetailRows.value.reduce((max, employee) => Math.max(max, Number(employee.repairEfficiency || 0) * 100), 0);
  if (maxPi <= 100) return 100;
  return Math.min(160, Math.ceil(maxPi / 10) * 10);
});

const employeeScatterMarkLine = computed(() => ({
  symbol: ["none", "none"],
  label: {
    show: false,
    position: "insideEndTop",
    color: piSlate,
    formatter: (params) => params?.name || "",
    fontWeight: 700,
  },
  lineStyle: { color: piSlate, type: "dashed", width: 1.4 },
  data: [
    ...asArray(targetReferenceLine.value),
    {
      name: "100%",
      referenceLineType: "pi-ceiling",
      referenceLineLabel: "PI 100%",
      referenceLineValue: 100,
      yAxis: 100,
      lineStyle: { color: statusColors.over, type: "dotted", width: 1.5 },
      label: { color: statusColors.over },
    },
    {
      name: "平均出勤",
      referenceLineType: "attendance-average",
      referenceLineLabel: "平均出勤",
      referenceLineValue: round(averageEmployeeMonthlyAttendance.value, 1),
      xAxis: round(averageEmployeeMonthlyAttendance.value, 1),
      lineStyle: { color: "#9aa4b2", type: "dashed", width: 1.2 },
      label: { show: false },
    },
  ].filter(Boolean)
    .filter((item) => item.xAxis === undefined || Number(item.xAxis) > 0)
    .filter((item) => item.yAxis === undefined || Number(item.yAxis) > 0),
}));

const employeeTargetRows = computed(() =>
  employeeDetailRows.value
    .filter((employee) => !employee.excludeFromAverages)
    .map((employee) => ({ employee, target: getEmployeeTarget(employee) }))
    .filter(({ target }) => target.hasTarget)
);

const scopeTargetRate = computed(() => {
  const rows = employeeTargetRows.value;
  if (!rows.length) return Number(scopeAveragePi.value || 0);

  let weightedTarget = 0;
  let totalWeight = 0;
  rows.forEach(({ employee, target }) => {
    const weight = Number(employee.attendanceHours || employee.averageMonthlyAttendanceHours || 0);
    if (weight > 0) {
      weightedTarget += target.value * weight;
      totalWeight += weight;
    }
  });
  if (totalWeight > 0) return weightedTarget / totalWeight;

  return rows.reduce((total, row) => total + Number(row.target.value || 0), 0) / rows.length;
});
const selectedTef = computed(() => {
  const department = String(props.filters?.department || "").trim().toUpperCase();
  return /^TEF3[1-3]$/.test(department) ? department : "";
});
const monthlyPiUsesTarget = computed(() => Boolean(selectedTef.value && employeeTargetRows.value.length));
const monthlyPiReferenceRate = computed(() => (monthlyPiUsesTarget.value ? scopeTargetRate.value : scopeAveragePi.value));
const monthlyPiReferencePercent = computed(() => round(monthlyPiReferenceRate.value * 100, 1));
const monthlyPiReferenceName = computed(() => (monthlyPiUsesTarget.value ? "Target" : "均值"));
const monthlyPiReferenceLabel = computed(() => `${monthlyPiReferenceName.value} ${formatPercent(monthlyPiReferenceRate.value)}`);
const monthlyPiTitle = computed(() => (monthlyPiUsesTarget.value ? "月度 PI / Target" : "月度 PI / 均值"));
const monthlyPiEyebrow = computed(() => (monthlyPiUsesTarget.value ? `基准：${selectedTef.value} Target` : "基准：当前范围加权平均 PI"));

const selectedTargets = computed(() => {
  const groups = new Map();
  employeeTargetRows.value.forEach(({ target }) => {
    const value = round(target.value * 100, 1);
    const key = String(value);
    if (!groups.has(key)) {
      groups.set(key, { value, count: 0, labels: new Set() });
    }
    const group = groups.get(key);
    group.count += 1;
    if (target.label) {
      group.labels.add(target.label);
    }
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      labels: [...group.labels].sort((left, right) => left.localeCompare(right, "zh-Hans-CN")),
    }))
    .sort((left, right) => left.value - right.value);
});

const hasConfirmedTarget = computed(() => selectedTargets.value.length > 0);
const fallbackTargetPercent = computed(() => round(Number(scopeAveragePi.value || 0) * 100, 1));
const targetReferenceLine = computed(() => {
  if (hasConfirmedTarget.value) {
    return selectedTargets.value.map((target) => ({
      name: `Target ${formatPercentValue(target.value / 100)}`,
      referenceLineType: "target",
      referenceLineLabel: `Target ${formatPercentValue(target.value / 100)}`,
      referenceLineValue: target.value,
      referenceLineDetail: target.labels.join(" / "),
      employeeCount: target.count,
      yAxis: target.value,
      lineStyle: { color: metricColors.reference, type: "dashed", width: 1.5 },
      label: { color: metricColors.reference },
    }));
  }
  return {
    name: `Target 待确认 · 临时均值 ${formatPercent(scopeAveragePi.value)}`,
    referenceLineType: "fallback-target",
    referenceLineLabel: "Target 待确认",
    referenceLineValue: fallbackTargetPercent.value,
    referenceLineDetail: "临时使用当前范围均值",
    yAxis: fallbackTargetPercent.value,
    lineStyle: { color: metricColors.reference, type: "dashed", width: 1.5 },
    label: { color: metricColors.reference },
  };
});

const averageEmployeeMonthlyAttendance = computed(() => {
  const rows = employeeDetailRows.value.filter((employee) => !employee.excludeFromAverages && Number(employee.averageMonthlyAttendanceHours || 0) > 0);
  return rows.length ? sum(rows, "averageMonthlyAttendanceHours") / rows.length : 0;
});

function buildMonthlyPiRows(rows, latestYear, expandedYears = []) {
  const groups = groupRowsByYear(rows);
  const expanded = new Set(expandedYears);
  return [...groups.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([year, items]) => {
      const sortedItems = sortRowsByMonth(items);
      if (year === latestYear) {
        return [
          buildYtdPiRow(year, sortedItems),
          ...buildCompleteYearMonthRows(year, sortedItems),
        ];
      }
      if (expanded.has(year)) {
        return sortedItems.map((item) => toMonthlyPiSourceRow(item, year));
      }
      return [buildAnnualPiRow(year, sortedItems)];
    });
}

function buildWorkTotalRows(rows, latestYear, expandedYears = []) {
  const groups = groupRowsByYear(rows);
  const expanded = new Set(expandedYears);
  return [...groups.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([year, items]) => {
      const sortedItems = sortRowsByMonth(items);
      if (year === latestYear) {
        return [buildWorkTotalYearRow(year, sortedItems, true)];
      }
      if (expanded.has(year)) {
        return sortedItems.map((item) => ({
          ...item,
          label: getMonthName(item.month) || item.month,
          year,
          isAnnual: false,
          sourceMonthCount: 1,
        }));
      }
      return [buildWorkTotalYearRow(year, sortedItems, false)];
    });
}

function buildHybridAnalysisRows(rows, latestYear, expandedYears = []) {
  const groups = groupRowsByYear(rows);

  const expanded = new Set(expandedYears);
  return [...groups.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([year, items]) => {
      if (year === latestYear || expanded.has(year)) {
        return sortRowsByMonth(items).map((item) => ({
          ...item,
          label: getMonthName(item.month) || item.month,
          year,
          isAnnual: false,
          sourceMonthCount: 1,
        }));
      }

      const sortedItems = sortRowsByMonth(items);
      const attendanceHours = sum(sortedItems, "attendanceHours");
      const repairHours = sum(sortedItems, "repairHours");
      const pm01Hours = sum(sortedItems, "pm01Hours");
      const pm03Hours = sum(sortedItems, "pm03Hours");
      const transferHours = sum(sortedItems, "transferHours");
      const piHours = piNumeratorFromValues(pm01Hours, pm03Hours, transferHours, repairHours);
      const pi = repairEfficiencyFromTotals(attendanceHours, piHours);
      return [{
        month: sortedItems[0]?.month || year,
        label: year,
        year,
        isAnnual: true,
        sourceMonthCount: sortedItems.length || 1,
        monthIndex: Number(year) * 100,
        hasData: attendanceHours > 0,
        attendanceHours,
        repairHours,
        orderCount: sum(sortedItems, "orderCount"),
        pm01Hours,
        pm03Hours,
        transferHours,
        averagePi: scopeAveragePi.value,
        pi,
        piGap: pi - scopeAveragePi.value,
      }];
    });
}

function groupRowsByYear(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const year = getMonthYear(row.month);
    if (!year) return;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(row);
  });
  return groups;
}

function sortRowsByMonth(rows) {
  return [...rows].sort((left, right) => Number(left.monthIndex || getMonthIndex(left.month)) - Number(right.monthIndex || getMonthIndex(right.month)));
}

function buildCompleteYearMonthRows(year, items) {
  const rowsByMonth = new Map(items.map((item) => [getMonthNumber(item.month), item]));
  return monthNames.map((monthName, index) => {
    const monthNumber = index + 1;
    const month = `${year} ${monthName}`;
    const sourceRow = rowsByMonth.get(monthNumber);
    if (sourceRow) {
      return toMonthlyPiSourceRow(sourceRow, year);
    }
    return {
      ...makeMonthRow(month, { month }, monthName),
      year,
      label: monthName,
      isAnnual: false,
      isPlaceholder: true,
      hasData: true,
      hasSourceData: false,
      forceAxisLabel: true,
      monthIndex: Number(year) * 100 + monthNumber,
      averagePi: scopeAveragePi.value,
      piGap: -scopeAveragePi.value,
    };
  });
}

function toMonthlyPiSourceRow(row, year) {
  return {
    ...row,
    label: getMonthName(row.month) || row.label,
    year,
    isAnnual: false,
    isPlaceholder: false,
    hasSourceData: true,
    forceAxisLabel: true,
    sourceMonthCount: 1,
  };
}

function buildAnnualPiRow(year, items) {
  return buildAggregatePiRow(year, items, {
    label: shortYearLabel(year),
    displayLabel: `${year} 年`,
    isAnnual: true,
    monthIndex: Number(year) * 100,
  });
}

function buildYtdPiRow(year, items) {
  return buildAggregatePiRow(year, items, {
    month: `${year} YTD`,
    label: "YTD",
    displayLabel: `${year} YTD`,
    isYtd: true,
    forceAxisLabel: true,
    monthIndex: Number(year) * 100 + 13,
  });
}

function buildWorkTotalYearRow(year, items, isLatestYear = false) {
  return buildAggregatePiRow(year, items, {
    month: isLatestYear ? `${year} YTD` : items[0]?.month,
    label: year,
    displayLabel: isLatestYear ? `${year} 年累计` : `${year} 年`,
    isAnnual: !isLatestYear,
    isLatestYearTotal: isLatestYear,
    forceAxisLabel: isLatestYear,
    monthIndex: Number(year) * 100 + (isLatestYear ? 13 : 0),
  });
}

function buildAggregatePiRow(year, items, overrides = {}) {
  const attendanceHours = sum(items, "attendanceHours");
  const repairHours = sum(items, "repairHours");
  const pm01Hours = sum(items, "pm01Hours");
  const pm03Hours = sum(items, "pm03Hours");
  const transferHours = sum(items, "transferHours");
  const averageBasisAttendanceHours = sumAverageBasisAttendance(items);
  const averageBasisPiHours = sumAverageBasisPiHours(items);
  const pi = repairEfficiencyFromTotals(averageBasisAttendanceHours, averageBasisPiHours);
  return {
    month: overrides.month || items[0]?.month || year,
    label: overrides.label || year,
    displayLabel: overrides.displayLabel || year,
    year,
    isAnnual: Boolean(overrides.isAnnual),
    isYtd: Boolean(overrides.isYtd),
    isLatestYearTotal: Boolean(overrides.isLatestYearTotal),
    isPlaceholder: false,
    hasSourceData: items.length > 0,
    forceAxisLabel: Boolean(overrides.forceAxisLabel),
    sourceMonthCount: items.length || 0,
    monthIndex: overrides.monthIndex ?? Number(year) * 100,
    hasData: averageBasisAttendanceHours > 0,
    attendanceHours,
    repairHours,
    orderCount: sum(items, "orderCount"),
    pm01Hours,
    pm03Hours,
    transferHours,
    averageBasisAttendanceHours,
    averageBasisPiHours,
    averagePi: scopeAveragePi.value,
    pi,
    piGap: pi - scopeAveragePi.value,
  };
}

function shortYearLabel(year) {
  const text = String(year || "");
  return text.length === 4 ? text.slice(2) : text;
}

function getMonthYear(label) {
  const match = String(label || "").match(/^(\d{4})\s+[A-Za-z]{3}$/);
  return match ? match[1] : "";
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  return Number(match[1]) * 100 + monthNames.indexOf(match[2]) + 1;
}

function analysisCategoryAxis(rows) {
  return {
    ...categoryAxis(rows.map((row) => row.label)),
    axisLabel: {
      color: "#667085",
      hideOverlap: true,
      interval: (index) => shouldShowAnalysisAxisLabel(rows, index),
      formatter: (value, index) => formatAnalysisAxisLabel(rows[index] || { label: value }, rows.length, index),
      margin: rows.length > 24 ? 12 : 8,
      rotate: rows.length > 14 && rows.length <= 24 ? 24 : 0,
    },
  };
}

function shouldShowAnalysisAxisLabel(rows, index) {
  const total = rows.length;
  const row = rows[index] || {};
  if (row.forceAxisLabel) return true;
  if (row.isAnnual || total <= 14) return true;
  if (index === 0 || index === total - 1) return true;

  const monthNumber = getMonthNumber(row.month);
  if (!monthNumber) return index % Math.ceil(total / 10) === 0;
  if (total <= 24) return index % 2 === 0 || monthNumber === 1;
  if (total <= 40) return [1, 4, 7, 10].includes(monthNumber);
  return monthNumber === 1 || monthNumber === 7;
}

function shouldShowValueLabel(rows, index) {
  const total = rows.length;
  const row = rows[index] || {};
  if (row.isAnnual || total <= 8) return true;
  if (index === 0 || index === total - 1) return true;
  if (total <= 14) return index % 2 === 0;
  if (total <= 24) return index % 3 === 0;
  return index % Math.ceil(total / 8) === 0;
}

function formatChartTotalLabel(params, rows, valueGetter) {
  const index = Number(params?.dataIndex || 0);
  if (!shouldShowValueLabel(rows, index)) return "";
  return formatHoursLabel(valueGetter(rows[index] || {}));
}

function formatAnalysisAxisLabel(row, total, index) {
  if (row.isLatestYearTotal) return row.label;
  if (row.isAnnual) return row.label;

  const year = getMonthYear(row.month);
  const month = getMonthName(row.month);
  if (!year || !month) return row.label;
  if (year === latestAnalysisYear.value) return month;
  if (total <= 18) return month;
  if (total <= 24) return month;
  if (month === "Jan" || index === 0 || index === total - 1) return month;
  return month;
}

function getMonthNumber(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? monthNames.indexOf(match[1]) + 1 : 0;
}

function getMonthName(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? match[1] : "";
}

function isHiddenPiMonth(month) {
  return HIDDEN_PI_MONTHS.has(String(month || "").trim());
}

function analysisBarWidth(rows) {
  const count = rows.length;
  if (count <= 4) return "76%";
  if (count <= 8) return "68%";
  if (!shouldUseAnnualAnalysis.value) return "58%";
  if (count <= 16) return "56%";
  return "44%";
}

function piChartValue(row) {
  if (row?.isPlaceholder) return 0;
  return row?.hasData ? round(row.pi * 100, 1) : null;
}

function piChartColor(value) {
  return Number(value || 0) >= monthlyPiReferencePercent.value ? statusColors.good : statusColors.warning;
}

function barDataValue(row, value, color, itemStyle = {}) {
  if (!isYtdLikeRow(row)) return value;
  return {
    value,
    itemStyle: ytdBarItemStyle(row, { ...itemStyle, color }),
  };
}

function piChartDataItem(row) {
  const value = piChartValue(row);
  if (value === null) return null;
  return {
    value,
    itemStyle: ytdBarItemStyle(row, { color: piChartColor(value) }),
  };
}

function stackBarStyle(borderRadius = [0, 0, 0, 0]) {
  return {
    borderRadius,
    borderColor: "#ffffff",
    borderWidth: 1,
  };
}

function workMixTotal(row) {
  return Number(row.pm01Hours || 0) + Number(row.pm03Hours || 0) + Number(row.transferHours || 0);
}

function workMixMonthFactor(row) {
  return row?.isAnnual ? Math.max(1, Number(row.sourceMonthCount || 1)) : 1;
}

function workMixDisplayValue(row, field) {
  return Number(row?.[field] || 0) / workMixMonthFactor(row);
}

function workMixDisplayTotal(row) {
  return workMixDisplayValue(row, "pm01Hours") + workMixDisplayValue(row, "pm03Hours") + workMixDisplayValue(row, "transferHours");
}

function workMixShareValue(row, field) {
  const total = workMixDisplayTotal(row);
  if (total <= 0) return 0;
  if (field === "transferHours") {
    return round(Math.max(0, 100 - workMixShareValue(row, "pm01Hours") - workMixShareValue(row, "pm03Hours")), 1);
  }
  return round((workMixDisplayValue(row, field) / total) * 100, 1);
}

function workMixPercent(row, field) {
  const total = workMixTotal(row);
  return total > 0 ? round((Number(row[field] || 0) / total) * 100, 1) : 0;
}

function formatWorkMixTooltip(params, rows) {
  const items = Array.isArray(params) ? params : [params];
  const row = rows[items[0]?.dataIndex] || {};
  const total = workMixTotal(row);
  const displayTotal = workMixDisplayTotal(row);
  const metricLines = [
    { name: "PM01", field: "pm01Hours", color: metricColors.pm01 },
    { name: "PM03", field: "pm03Hours", color: metricColors.pm03 },
    { name: "转移工时", field: "transferHours", color: metricColors.transfer },
  ].map((item) => `${marker(item.color)}${item.name} ${formatPercentValue(workMixShareValue(row, item.field) / 100)} · ${formatHours(workMixDisplayValue(row, item.field))} / 月`);
  const annualLines = row.isAnnual ? [
    `年度合计 ${formatHours(total)}`,
    `统计月数 ${formatMonthCount(row.sourceMonthCount)}`,
  ] : [];
  return [
    `${analysisDisplayLabel(row)}<br/>PI 工时构成 · 月均 ${formatHours(displayTotal)}`,
    ...metricLines,
    ...annualLines,
  ].join("<br/>");
}

function formatWorkTotalTooltip(params, rows) {
  const items = Array.isArray(params) ? params : [params];
  const row = rows[items[0]?.dataIndex] || {};
  const total = workMixTotal(row);
  const metricLines = [
    { name: "PM01", field: "pm01Hours", color: metricColors.pm01 },
    { name: "PM03", field: "pm03Hours", color: metricColors.pm03 },
    { name: "转移工时", field: "transferHours", color: metricColors.transfer },
  ].map((item) => `${marker(item.color)}${item.name} ${formatHours(row[item.field])} (${formatPercentValue(workMixPercent(row, item.field) / 100)})`);
  return [
    `${analysisDisplayLabel(row)}<br/>PI 工时 ${formatHours(total)}`,
    ...metricLines,
    `${marker(metricColors.attendance)}出勤时间 ${formatHours(row.attendanceHours)}`,
    `PI 占比 ${formatPercent(repairEfficiencyFromTotals(row.attendanceHours, total))}`,
  ].join("<br/>");
}

function formatPiTooltip(params, rows) {
  const items = Array.isArray(params) ? params : [params];
  const row = rows[items[0]?.dataIndex] || {};
  const value = round(Number(row.pi || 0) * 100, 1);
  return [
    analysisDisplayLabel(row),
    `${marker(piChartColor(value))}PI ${formatPercent(row.pi)}`,
    `${marker(metricColors.reference)}${monthlyPiReferenceName.value} ${formatPercent(monthlyPiReferenceRate.value)}`,
    `PI 工时 ${formatHours(workMixTotal(row))}`,
    `出勤时间 ${formatHours(row.attendanceHours)}`,
    row.isYtd ? `统计月数 ${formatMonthCount(row.sourceMonthCount)}` : "",
    row.isPlaceholder ? "暂无数据，按 0 显示" : "",
  ].filter(Boolean).join("<br/>");
}

function formatPiGapTooltip(params, rows) {
  const items = Array.isArray(params) ? params : [params];
  const row = rows[items[0]?.dataIndex] || {};
  return [
    analysisDisplayLabel(row),
    `当前 PI ${formatPercent(row.pi)}`,
    `基准 PI ${formatPercent(scopeAveragePi.value)}`,
    `差值 ${signedPercent(row.piGap)}`,
    "基准 = Σ(PM01 + PM03 + 转移工时) / Σ出勤小时",
  ].join("<br/>");
}

function analysisDisplayLabel(row) {
  if (!row) return "";
  if (row.displayLabel) return row.displayLabel;
  if (row.isAnnual) return row.label || "";
  return getMonthName(row.month) || row.label || "";
}

function sum(recordsList, field) {
  return recordsList.reduce((total, record) => total + (Number(record[field]) || 0), 0);
}

function averageBasisAttendance(row, fallback = 0) {
  return hasAverageBasisValue(row, "averageBasisAttendanceHours") ? Number(row.averageBasisAttendanceHours || 0) : Number(fallback || 0);
}

function averageBasisPi(row, fallback = 0) {
  return hasAverageBasisValue(row, "averageBasisPiHours") ? Number(row.averageBasisPiHours || 0) : Number(fallback || 0);
}

function hasAverageBasisValue(row, field) {
  return row && row[field] !== undefined && row[field] !== null && row[field] !== "";
}

function isRepairHoursQualityRecord(record = {}) {
  return Boolean(record.repairHoursQualityReason || record.repairHoursQualityIssue || hasAverageBasisValue(record, "repairHoursSourceValue"));
}

function sumAverageBasisAttendance(recordsList) {
  return recordsList.reduce((total, record) => total + averageBasisAttendance(record, Number(record.attendanceHours || 0)), 0);
}

function sumAverageBasisPiHours(recordsList) {
  return recordsList.reduce((total, record) => total + averageBasisPi(record, piNumeratorForRecord(record)), 0);
}

function uniqueCount(recordsList, field) {
  return new Set(recordsList.map((record) => String(record[field] || "").trim()).filter(Boolean)).size;
}

function piNumerator(recordsList) {
  return recordsList.reduce((total, record) => total + piNumeratorForRecord(record), 0);
}

function piNumeratorFromValues(pm01Hours, pm03Hours, transferHours) {
  return Number(pm01Hours || 0) + Number(pm03Hours || 0) + Number(transferHours || 0);
}

function piNumeratorForRecord(record) {
  return piNumeratorFromValues(record.pm01Hours, record.pm03Hours, record.transferHours);
}

function repairEfficiencyFromTotals(attendanceHours, piHours) {
  const attendance = Number(attendanceHours || 0);
  if (attendance <= 0) return 0;
  return Number(piHours || 0) / attendance;
}

function toggleMonthSort(key) {
  monthSort.value = nextSort(monthSort.value, key);
}

function toggleEmployeeSort(key) {
  employeeSort.value = nextSort(employeeSort.value, key);
}

function setMonthlyRowRef(month, element) {
  if (!element) {
    monthlyRowRefs.delete(month);
    return;
  }
  monthlyRowRefs.set(month, element);
}

function setEmployeeRowRef(employeeKey, element) {
  if (!element) {
    employeeRowRefs.delete(employeeKey);
    return;
  }
  employeeRowRefs.set(employeeKey, element);
}

async function focusMonthlyRow(month) {
  highlightedMonthKey.value = month;
  window.clearTimeout(monthHighlightTimer);
  await nextTick();
  const target = monthlyRowRefs.get(month);
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  monthHighlightTimer = window.setTimeout(() => {
    if (highlightedMonthKey.value === month) {
      highlightedMonthKey.value = "";
    }
  }, 1800);
}

async function focusEmployeeRow(employeeKey) {
  highlightedEmployeeKey.value = employeeKey;
  window.clearTimeout(highlightTimer);
  await nextTick();
  const target = employeeRowRefs.get(employeeKey);
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  highlightTimer = window.setTimeout(() => {
    if (highlightedEmployeeKey.value === employeeKey) {
      highlightedEmployeeKey.value = "";
    }
  }, 1800);
}

async function selectEmployeeRow(employeeKey) {
  await focusEmployeeRow(employeeKey);
  emit("select-employee", employeeKey);
  await scrollToEmployeeDetail();
}

async function scrollToEmployeeDetail() {
  window.clearTimeout(detailScrollTimer);
  await nextTick();
  detailScrollTimer = window.setTimeout(() => {
    detailShellRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

function bindMonthlyChart(chart) {
  chart.off("click");
  chart.on("click", (params) => {
    const row = findMonthlyPiRowFromChartParam(params) || findMonthRowFromChartParam(params);
    if (row?.isAnnual && row.year) {
      toggleAnalysisYear(row.year);
      return;
    }
    if (row?.month && row.hasSourceData !== false && !row.isYtd) {
      focusMonthlyRow(row.month);
    }
  });
}

function bindMonthBarChart(chart) {
  chart.off("click");
  chart.on("click", (params) => {
    const row = findAnalysisRowFromChartParam(params);
    if (row?.isAnnual && row.year) {
      toggleAnalysisYear(row.year);
      return;
    }
    if (row?.month) {
      focusMonthlyRow(row.month);
    }
  });
}

function bindWorkTotalChart(chart) {
  chart.off("click");
  chart.on("click", (params) => {
    const row = findWorkTotalRowFromChartParam(params);
    if (row?.isAnnual && row.year) {
      toggleAnalysisYear(row.year);
      return;
    }
    if (row?.month && !row.isLatestYearTotal) {
      focusMonthlyRow(row.month);
    }
  });
}

function toggleAnalysisYear(year) {
  const current = new Set(expandedAnalysisYears.value);
  if (current.has(year)) {
    current.delete(year);
  } else {
    current.add(year);
  }
  expandedAnalysisYears.value = [...current].sort((left, right) => Number(left) - Number(right));
}

function collapseAnalysisYears() {
  expandedAnalysisYears.value = [];
}

function bindEmployeeScatter(chart) {
  chart.off("click");
  chart.on("click", (params) => {
    if (params?.componentType !== "series" || params?.seriesType !== "scatter") {
      return;
    }
    const key = params?.data?.employeeKey;
    if (key) {
      selectEmployeeRow(key);
    }
  });
}

function findMonthRowFromChartParam(params) {
  const label = String(params?.name || "");
  const dataIndex = Number(params?.dataIndex);
  return (Number.isInteger(dataIndex) ? monthlyRows.value[dataIndex] : null)
    || monthlyRows.value.find((row) => row.label === label || row.month === label);
}

function findMonthlyPiRowFromChartParam(params) {
  const label = String(params?.name || "");
  const dataIndex = Number(params?.dataIndex);
  return (Number.isInteger(dataIndex) ? monthlyPiRows.value[dataIndex] : null)
    || monthlyPiRows.value.find((row) => row.label === label || row.month === label || row.displayLabel === label);
}

function findAnalysisRowFromChartParam(params) {
  const label = String(params?.name || "");
  const dataIndex = Number(params?.dataIndex);
  return (Number.isInteger(dataIndex) ? analysisRows.value[dataIndex] : null)
    || analysisRows.value.find((row) => row.label === label || row.month === label);
}

function findWorkTotalRowFromChartParam(params) {
  const label = String(params?.name || "");
  const dataIndex = Number(params?.dataIndex);
  return (Number.isInteger(dataIndex) ? workTotalRows.value[dataIndex] : null)
    || workTotalRows.value.find((row) => row.label === label || row.month === label || row.displayLabel === label);
}

function nextSort(current, key) {
  return {
    key,
    direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
  };
}

function sortMark(sort, key) {
  if (sort.key !== key) return "";
  return sort.direction === "desc" ? "↓" : "↑";
}

function sortRows(rows, sort) {
  return [...rows].sort((left, right) => compareValues(getSortValue(left, sort.key), getSortValue(right, sort.key), sort.direction));
}

function getSortValue(row, key) {
  if (key === "department") {
    return organizationLabel(row);
  }
  return row[key];
}

function compareValues(left, right, direction) {
  const factor = direction === "asc" ? 1 : -1;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const bothNumbers = Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && left !== "" && right !== "";
  if (bothNumbers) {
    return (leftNumber - rightNumber) * factor;
  }
  return String(left || "").localeCompare(String(right || ""), "zh-Hans-CN") * factor;
}

function round(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function formatPercentValue(value) {
  return formatPercentNumber(value);
}

function formatCompactHours(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return formatInteger(number);
}

function formatPercent(value) {
  return formatPercentValue(value);
}

function formatHoursLabel(value) {
  return formatInteger(value);
}

function formatMonthCount(value) {
  return `${formatDecimal(value, 0)} 月`;
}

function formatNumber(value) {
  return formatInteger(value);
}

function signedPercent(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${formatPercent(number)}`;
}

function piGapClass(value) {
  const number = Number(value || 0);
  if (number > 0) return "delta-positive";
  if (number < 0) return "delta-negative";
  return "";
}

function piStatus(employee) {
  if (employee?.excludeFromAverages) {
    const target = getEmployeeTarget(employee);
    return { status: "excluded", label: "不计入考核", color: statusColors.excluded, targetLabel: target.label };
  }
  const attendanceHours = Number(employee.attendanceHours || 0);
  const piHours = Number(employee.pm01Hours || 0) + Number(employee.pm03Hours || 0) + Number(employee.transferHours || 0);
  const pi = Number(employee.repairEfficiency || 0);
  const target = getEmployeeTarget(employee);
  if (attendanceHours <= 0 && piHours > 0) {
    return { status: "warning", label: "缺出勤", color: statusColors.missing, targetLabel: target.label };
  }
  if (pi > 1) {
    return { status: "over", label: ">100%", color: statusColors.over, targetLabel: target.label };
  }
  if (pi >= target.value) {
    return {
      status: "good",
      label: target.hasTarget ? "达标" : "临时达标",
      color: statusColors.good,
      targetLabel: target.label,
    };
  }
  return {
    status: "warning",
    label: target.hasTarget ? "低于 target" : "低于临时均值",
    color: statusColors.warning,
    targetLabel: target.label,
  };
}

function piStatusValue(pi, attendanceHours, piHours, employee = {}) {
  if (employee?.excludeFromAverages) return 4;
  const target = getEmployeeTarget(employee);
  if (Number(attendanceHours || 0) <= 0 && Number(piHours || 0) > 0) return 2;
  if (Number(pi || 0) > 1) return 1;
  if (Number(pi || 0) >= Number(target.value || 0)) return 0;
  return 3;
}

function getEmployeeTarget(employee) {
  const explicitTargetRate = Number(employee?.piTargetRate);
  if (Number.isFinite(explicitTargetRate) && explicitTargetRate > 0) {
    return {
      hasTarget: true,
      key: employee?.piTargetLabel || "SQL",
      value: explicitTargetRate,
      label: employee?.piTargetLabel || formatPercent(explicitTargetRate),
    };
  }

  const plant101Target = getPlant101Target(employee);
  if (plant101Target) {
    return plant101Target;
  }
  return getTargetForOrganization(organizationLabel(employee) || employee?.department || "");
}

function getPlant101Target(employee = {}) {
  if (!isPlant101Employee(employee)) {
    return null;
  }

  const isMaintenance = isMaintenanceGroupEmployee(employee);
  const value = isMaintenance ? PLANT_101_PI_TARGETS.maintenance : PLANT_101_PI_TARGETS.default;
  const key = isMaintenance ? "101-MAINTENANCE" : "101";
  const label = isMaintenance ? `101 维护组 ${formatPercent(value)}` : `101 非维护组 ${formatPercent(value)}`;
  return { hasTarget: true, key, value, label };
}

function isPlant101Employee(employee = {}) {
  const plant = String(employee.plant || "").trim();
  if (plant === "101" || plant === "101厂房") {
    return true;
  }

  return [employee.businessArea && employee.plant ? `${employee.businessArea} / ${employee.plant}` : "", employee.department, employee.workshop]
    .filter(Boolean)
    .some((value) => /(^|[^\d])101(?:厂房|车间)?($|[^\d])/.test(String(value)));
}

function isMaintenanceGroupEmployee(employee = {}) {
  return [employee.shift, employee.department, employee.workshop, employee.employeeKey, organizationLabel(employee)]
    .filter(Boolean)
    .some((value) => /维护组|维护团队/.test(String(value)));
}

function getTargetForOrganization(organization = "") {
  const tef = String(organization || "").match(/TEF\d+/i)?.[0]?.toUpperCase() || "";
  const configured = tef ? TEF_PI_TARGETS[tef] : null;
  const number = Number(configured);
  if (Number.isFinite(number) && number > 0) {
    return { hasTarget: true, key: tef, value: number, label: `${tef} ${formatPercent(number)}` };
  }
  return {
    hasTarget: false,
    key: tef,
    value: Number(scopeAveragePi.value || 0),
    label: `${tef ? `${tef} ` : ""}待确认，临时均值 ${formatPercent(scopeAveragePi.value)}`,
  };
}

function employeeMetaText(employee) {
  return [
    employee.employeeNo,
    employee.positionTitle,
  ].filter(Boolean).join(" · ") || "-";
}

function organizationLabel(employee) {
  if (!employee) return "";
  if (employee.department) return employee.department;
  if (employee.businessArea && employee.plant) return `${employee.businessArea} / ${employee.plant}`;
  return employee.businessArea || employee.plant || "";
}

function marker(color) {
  return `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:9px;height:9px;background:${color};"></span>`;
}

function formatEmployeeScatterTooltip(params) {
  const data = params?.data || {};
  if (params?.componentType === "markLine" || data.referenceLineType) {
    return formatScatterReferenceLineTooltip(params);
  }

  const values = Array.isArray(data.value) ? data.value : [];
  return [
    data.employeeName || "-",
    data.positionTitle ? `职位 ${data.positionTitle}` : "",
    `组织 ${data.department || "-"}`,
    `PI ${formatDecimal(values[1], 1)}%`,
    `Target ${data.targetLabel || "待确认"}`,
    `状态 ${data.piStatusLabel || "-"}`,
    data.excludeFromAverages ? `${marker(piExcluded)}不计入绩效考核` : "",
    `月均出勤 ${formatHours(values[0])}`,
    `合计出勤 ${formatHours(data.attendanceHours)}`,
    `统计月数 ${formatMonthCount(data.monthCount)}`,
    `PM01 ${formatHours(data.pm01Hours)}`,
    `PM03 ${formatHours(data.pm03Hours)}`,
    `转移工时 ${formatHours(data.transferHours)}`,
    `PI 工时 ${formatHours(data.piHours)}`,
    `接单 ${formatNumber(data.orderCount)}`,
  ].filter(Boolean).join("<br/>");
}

function formatScatterReferenceLineTooltip(params = {}) {
  const data = Array.isArray(params.data) ? {} : params.data || {};
  const label = data.referenceLineLabel || params.name || data.name || "参考线";
  const type = data.referenceLineType || inferScatterReferenceLineType(label);
  const value = Number(data.referenceLineValue ?? params.value ?? data.yAxis ?? data.xAxis);
  if (type === "target" || type === "fallback-target") {
    return [
      `Target ${Number.isFinite(value) ? formatDecimal(value, 1) : "0.0"}%`,
      data.employeeCount ? `${formatNumber(data.employeeCount)} 人` : type === "fallback-target" ? "临时均值" : "",
    ].filter(Boolean).join("<br/>");
  }
  if (type === "pi-ceiling") {
    return "PI 100.0%";
  }
  if (type === "attendance-average") {
    return `平均出勤 ${formatHours(value)}`;
  }
  return label;
}

function inferScatterReferenceLineType(label = "") {
  const text = String(label);
  if (/Target/i.test(text)) return "target";
  if (/100/.test(text)) return "pi-ceiling";
  if (/平均出勤/.test(text)) return "attendance-average";
  return "reference";
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function baseTooltip(trigger = "axis") {
  return {
    trigger,
    backgroundColor: "#18212d",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  };
}

function scatterTooltipPosition(point, params, dom, rect, size) {
  const [pointX = 0, pointY = 0] = Array.isArray(point) ? point : [0, 0];
  const [contentWidth = 260, contentHeight = 260] = size?.contentSize || [];
  const [viewWidth = 0, viewHeight = 0] = size?.viewSize || [];
  const margin = 12;
  const legendClearance = 56;

  const rightX = pointX + margin;
  const leftX = pointX - contentWidth - margin;
  const x = rightX + contentWidth <= viewWidth - margin ? rightX : Math.max(margin, leftX);

  const belowY = pointY + margin;
  const aboveY = pointY - contentHeight - margin;
  let y = belowY + contentHeight <= viewHeight - margin ? belowY : aboveY;
  if (y < legendClearance) {
    y = Math.min(Math.max(legendClearance, belowY), Math.max(legendClearance, viewHeight - contentHeight - margin));
  }

  return [
    Math.max(margin, Math.min(x, Math.max(margin, viewWidth - contentWidth - margin))),
    Math.max(legendClearance, Math.min(y, Math.max(legendClearance, viewHeight - contentHeight - margin))),
  ];
}

function chartGrid(left = 46, right = 24, top = 30, bottom = 36) {
  return {
    left,
    right,
    top,
    bottom,
    containLabel: false,
  };
}

function compactLegend(data = null) {
  return {
    top: 0,
    right: 0,
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: "#667085", fontSize: 11 },
    ...(data ? { data } : {}),
  };
}

function categoryAxis(data) {
  return {
    type: "category",
    data,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#d7dde5" } },
    axisLabel: { color: "#667085" },
  };
}

function hoursAxis(name = "") {
  return {
    type: "value",
    min: 0,
    ...(name ? { name, nameTextStyle: { color: "#667085", fontWeight: 700 }, nameGap: 10 } : {}),
    splitLine: { lineStyle: { color: "#edf1f5" } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#667085", formatter: (value) => formatInteger(value) },
  };
}

function percentAxis(max = null) {
  return {
    type: "value",
    ...(max ? { min: 0, max } : {}),
    splitLine: { lineStyle: { color: "#edf1f5" } },
    axisLabel: { color: "#667085", formatter: "{value}%" },
  };
}

function averageMarkLine(averagePi, width = 1.5, axis = "yAxis") {
  return {
    symbol: ["none", "none"],
    label: { show: false },
    silent: true,
    lineStyle: { color: piSlate, type: "dashed", width },
    data: [{ [axis]: round(Number(averagePi || 0) * 100, 1) }],
    z: 1,
    zlevel: 0,
  };
}

function averageGraphic(averagePi, label = "均值") {
  const labelText = String(label || "均值");
  const labelWidth = Math.max(96, Math.min(168, labelText.length * 7.6 + 38));
  return [
    {
      type: "group",
      right: 16,
      top: 0,
      silent: true,
      children: [
        {
          type: "rect",
          shape: { x: 0, y: 0, width: labelWidth, height: 18 },
          style: { fill: "rgba(255, 255, 255, 0)" },
        },
        {
          type: "line",
          shape: { x1: 0, y1: 8, x2: 22, y2: 8 },
          style: { stroke: piSlate, lineWidth: 2, lineDash: [6, 4] },
        },
        {
          type: "text",
          x: 28,
          y: 0,
          style: {
            text: labelText,
            fill: piSlate,
            font: "700 12px Aptos, Segoe UI, sans-serif",
          },
        },
      ],
    },
  ];
}

onBeforeUnmount(() => {
  window.clearTimeout(monthHighlightTimer);
  window.clearTimeout(highlightTimer);
  window.clearTimeout(detailScrollTimer);
});
</script>
