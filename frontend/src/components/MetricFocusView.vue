<template>
  <section class="metric-focus-view" :aria-label="config.title">
    <header class="metric-focus-head">
      <div>
        <span class="section-label">指标</span>
        <h2>{{ config.title }}</h2>
      </div>
      <div class="focus-result" :class="config.status">
        <span>{{ config.resultLabel }}</span>
        <strong>{{ config.resultValue }}</strong>
      </div>
    </header>

    <section v-if="indicator === 'improvement'" class="metric-focus-quick improvement-summary-strip" aria-label="改善关键数据">
      <article
        v-for="group in improvementKpiGroups"
        :key="group.label"
        class="improvement-summary-card"
        :class="`status-${group.status}`"
      >
        <div class="improvement-summary-title">
          <strong>{{ group.label }}</strong>
          <span>{{ group.caption }}</span>
        </div>
        <div class="improvement-summary-values">
          <div v-for="metric in group.metrics" :key="metric.label" class="improvement-summary-metric">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>{{ metric.note }}</small>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="kpis.length" class="metric-focus-quick" aria-label="关键数据">
      <div
        v-for="item in kpis"
        :key="item.label"
        class="quick-metric"
        :class="`status-${item.status}`"
      >
        <div class="quick-metric-top">
          <span>{{ item.eyebrow || item.label }}</span>
          <em v-if="item.metricLabel">{{ item.metricLabel }}</em>
        </div>
        <strong>
          {{ item.value }}
          <small v-if="item.unit">{{ item.unit }}</small>
        </strong>
        <i v-if="item.badge">{{ item.badge }}</i>
      </div>
    </section>

    <section class="metric-focus-main" :class="{ 'reliability-main': indicator === 'reliability' }">
      <article class="data-panel focus-hero-panel">
        <div class="focus-hero-top">
          <div>
            <span class="section-label">{{ scopeLabel }}</span>
            <h3>{{ activeSparkPanel?.title }}</h3>
          </div>

          <div v-if="sparkPanels.length > 1" class="focus-switch" role="tablist" :aria-label="config.title + ' 子指标切换'">
            <button
              v-for="panel in sparkPanels"
              :key="panel.key"
              type="button"
              role="tab"
              :aria-selected="activeSparkKey === panel.key"
              :class="{ active: activeSparkKey === panel.key }"
              @click="activeSparkKey = panel.key"
            >
              {{ panel.tabLabel }}
            </button>
          </div>
        </div>

        <div class="focus-hero-value">
          <strong>{{ activeSparkPanel?.metric }}</strong>
          <span>{{ activeSparkPanel?.latestLabel }}</span>
        </div>

        <div v-if="activeSparkPanel?.hasExpandedYears" class="pi-chart-actions focus-chart-actions">
          <span>{{ activeSparkPanel.expandedYearsLabel }}</span>
          <button type="button" class="pi-collapse-action" @click="collapseCompositeYears">收起明细</button>
        </div>

        <div class="focus-chart-wrap">
          <span v-if="activeSparkPanel?.unit" class="focus-chart-unit">{{ activeSparkPanel.unit }}</span>
          <ChartPanel
            class="focus-chart"
            :title="activeSparkPanel?.title || '趋势'"
            :option="activeSparkPanel?.option || emptyChartOption"
            height="220px"
            dense
            @chart-ready="bindFocusChart"
          />
        </div>

        <div class="focus-chart-foot">
          <span>{{ activeSparkPanel?.deltaLabel }}</span>
        </div>
      </article>

      <article v-if="indicator === 'reliability'" class="data-panel mttr-distribution-panel">
        <div class="panel-head">
          <div>
            <span class="section-label">个人分布</span>
            <h3>MTTR 分布</h3>
          </div>
          <strong>{{ formatInteger(mttrStats.covered) }}</strong>
        </div>

        <div class="mttr-stat-strip" aria-label="MTTR 统计">
          <span>
            <small>中位数</small>
            <strong>{{ formatMinutesNullable(mttrStats.median) }}</strong>
          </span>
          <span>
            <small>P90</small>
            <strong>{{ formatMinutesNullable(mttrStats.p90) }}</strong>
          </span>
          <span>
            <small>最高</small>
            <strong>{{ formatMinutesNullable(mttrStats.max) }}</strong>
          </span>
        </div>

        <div class="mttr-band-list">
          <div v-for="band in mttrBands" :key="band.key" class="mttr-band-row">
            <div class="mttr-band-label">
              <strong>{{ band.label }}</strong>
              <span>{{ formatInteger(band.count) }} 人</span>
            </div>
            <div class="mttr-band-track" aria-hidden="true">
              <i :style="{ width: band.width }"></i>
            </div>
          </div>
        </div>
      </article>

      <article v-if="indicator !== 'reliability'" class="data-panel focus-side-panel">
        <div class="panel-head">
          <div>
            <span class="section-label">{{ sidePanelEyebrow }}</span>
            <h3>{{ sidePanelTitle }}</h3>
          </div>
          <strong>{{ sideRowTotal }}</strong>
        </div>

        <div v-if="sideRows.length" class="focus-list">
          <button
            v-for="row in sideRows"
            :key="row.key"
            class="focus-row"
            :class="{ static: !row.employeeKey, selected: row.employeeKey === props.selectedEmployeeKey }"
            type="button"
            @click="selectRow(row)"
          >
            <span>
              <strong>{{ row.title }}</strong>
              <small>{{ row.note }}</small>
            </span>
            <i :class="row.status">{{ row.value }}</i>
          </button>
        </div>
        <div v-else class="empty-state compact">{{ sidePanelEmptyText }}</div>
      </article>
    </section>

    <article class="data-panel" :class="tablePanelClass">
      <div class="panel-head">
        <div>
          <span class="section-label">{{ scopeLabel }}</span>
          <h3>{{ config.tableTitle }}</h3>
        </div>
        <div v-if="indicator !== 'composite'" class="panel-meta">
          <strong>{{ tableCoverageLabel }}</strong>
          <small>{{ tableSortLabel }}</small>
        </div>
      </div>

      <div class="table-scroll">
        <table :class="tableClass">
          <thead>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                :aria-sort="column.sortable === false ? 'none' : tableSort.key === column.key ? (tableSort.direction === 'desc' ? 'descending' : 'ascending') : 'none'"
              >
                <button v-if="column.sortable !== false" type="button" class="sort-head" @click="toggleTableSort(column.key)">
                  {{ column.label }} {{ sortMark(tableSort, column.key) }}
                </button>
                <span v-else class="sort-head static">{{ column.label }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in tableRows"
              :key="row.key"
              :class="{
                'focus-table-clickable': row.employeeKey && indicator !== 'improvement',
                selected: row.employeeKey === props.selectedEmployeeKey,
                highlighted: indicator === 'composite' && row.employeeKey === props.selectedEmployeeKey,
              }"
              :tabindex="row.employeeKey && indicator !== 'improvement' ? 0 : undefined"
              :role="row.employeeKey && indicator !== 'improvement' ? 'button' : undefined"
              @click="selectTableRow(row)"
              @keydown.enter="selectTableRow(row)"
              @keydown.space.prevent="selectTableRow(row)"
            >
              <td v-for="column in columns" :key="column.key">
                <span v-if="column.type === 'index'" class="row-index">{{ rowIndex + 1 }}</span>
                <span v-else-if="['composite', 'improvement', 'reliability'].includes(indicator) && column.key === 'employeeName'" class="focus-employee-cell">
                  <strong>{{ formatCell(row, column) }}</strong>
                  <small>{{ employeeMetaText(row) }}</small>
                </span>
                <button
                  v-else-if="column.key === 'employeeName' && row.employeeKey"
                  type="button"
                  class="employee-name-button"
                  @click.stop="selectTableRow(row)"
                >
                  {{ formatCell(row, column) }}
                </button>
                <div v-else-if="indicator === 'reliability' && column.key === 'mttrMinutes'" class="mttr-table-meter">
                  <strong>{{ formatCell(row, column) }}</strong>
                  <span aria-hidden="true"><i :style="{ width: mttrMeterWidth(row.mttrMinutes) }"></i></span>
                </div>
                <strong v-else-if="column.strong && column.key !== 'employeeName'">{{ formatCell(row, column) }}</strong>
                <span v-else>{{ formatCell(row, column) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!tableRows.length" class="empty-state compact">暂无数据</div>
      </div>
    </article>

    <article v-if="indicator !== 'improvement'" ref="detailShellRef" class="data-panel employee-detail-shell" :class="{ 'mttr-detail-shell': indicator === 'reliability' }">
      <div class="panel-head">
        <div>
          <span class="section-label">详情</span>
          <h3>{{ config.title }} 员工下钻</h3>
        </div>
        <strong>{{ selectedEmployeeDisplay }}</strong>
      </div>
      <EmployeeDetailPanel :detail="employeeDetail" :mode="detailMode" />
    </article>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import ChartPanel from "./ChartPanel.vue";
import EmployeeDetailPanel from "./EmployeeDetailPanel.vue";
import { buildMetricSparkPanel, hasCompositeWorkHourData as hasMetricCompositeWorkHourData } from "../utils/metricFocusChart";
import {
  formatCompactMoney as formatCompactMoneyValue,
  formatDecimal,
  formatHours,
  formatInteger,
  formatMinutes,
  formatMoney,
  formatPercent,
} from "../utils/numberFormat";

const props = defineProps({
  indicator: { type: String, required: true },
  filters: { type: Object, default: () => ({}) },
  trend: { type: Array, default: () => [] },
  employees: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({}) },
  selectedEmployeeKey: { type: String, default: "" },
  employeeDetail: { type: Object, default: () => ({ profile: null, comparisons: {}, monthlyTrends: [], records: [] }) },
});

const emit = defineEmits(["select-employee"]);

const emptyChartOption = {
  series: [],
};
const MTTR_ATTENTION_MINUTES = 120;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const defaultTableSorts = {
  composite: { key: "compositeHours", direction: "desc" },
  reliability: { key: "mttrMinutes", direction: "desc" },
  improvement: { key: "benefit", direction: "desc" },
};
const tableSort = ref({ ...defaultTableSorts.reliability });
const detailShellRef = ref(null);

const scopeLabel = computed(() => {
  if (props.filters?.monthFrom && props.filters?.monthTo) return `${props.filters.monthFrom} - ${props.filters.monthTo}`;
  if (props.filters?.monthFrom) return `${props.filters.monthFrom} 起`;
  if (props.filters?.monthTo) return `${props.filters.monthTo} 止`;
  return "全部月份";
});

const config = computed(() => {
  if (props.indicator === "composite") {
    const riskCount = compositeRiskRows.value.length;
    return {
      title: "综合工时",
      resultLabel: "预警人数",
      resultValue: formatInteger(riskCount),
      status: riskCount ? "danger" : "good",
      sideEyebrow: "预警",
      sideTitle: "接近 432 h/考核年",
      tableTitle: "员工排序参考",
      emptyText: "暂无预警",
    };
  }

  if (props.indicator === "reliability") {
    const riskCount = mttrRiskRows.value.length;
    return {
      title: "MTTR",
      resultLabel: "个人均值",
      resultValue: formatMinutesNullable(props.summary.mttrMinutes),
      status: riskCount ? "warning" : "info",
      sideEyebrow: "员工",
      sideTitle: riskCount ? "MTTR 高关注" : "MTTR 最高",
      tableTitle: "员工 MTTR 明细",
      emptyText: "暂无个人 MTTR",
    };
  }

  return {
    title: "改善",
    resultLabel: "改善收益",
    resultValue: formatMoneyNullable(totalBenefit.value),
    status: "good",
    sideEyebrow: "员工",
    sideTitle: "改善贡献",
    tableTitle: "员工改善",
    emptyText: "暂无数据",
  };
});

const improvementKpis = computed(() => [
  ...buildImprovementKpiGroup({
    label: "PDCA",
    count: props.summary.pdcaCount,
    countField: "pdcaCount",
    benefit: props.summary.pdcaBenefit,
    status: "good",
  }),
  ...buildImprovementKpiGroup({
    label: "Kaizen",
    count: props.summary.kaizenCount,
    countField: "kaizenCount",
    benefit: props.summary.kaizenBenefit,
    status: "good",
  }),
  ...buildImprovementKpiGroup({
    label: "Near miss",
    count: props.summary.nearMissCount,
    countField: "nearMissCount",
    benefit: props.summary.nearMissBenefit,
    status: "info",
  }),
]);

const improvementKpiGroups = computed(() => [
  buildImprovementKpiGroupCompact({
    label: "PDCA",
    count: props.summary.pdcaCount,
    countField: "pdcaCount",
    benefit: props.summary.pdcaBenefit,
    status: "good",
  }),
  buildImprovementKpiGroupCompact({
    label: "Kaizen",
    count: props.summary.kaizenCount,
    countField: "kaizenCount",
    benefit: props.summary.kaizenBenefit,
    status: "good",
  }),
  buildImprovementKpiGroupCompact({
    label: "Near miss",
    count: props.summary.nearMissCount,
    countField: "nearMissCount",
    benefit: props.summary.nearMissBenefit,
    status: "info",
  }),
]);

const kpis = computed(() => {
  if (props.indicator === "composite") {
    return [
      { label: "综合工时", value: formatHours(props.summary.totalCompositeHours), badge: "OT-请假", status: "info" },
      { label: "OT 合计", value: formatHours(props.summary.totalOvertimeHours), badge: "1.5x / 2x", status: "neutral" },
      { label: "请假", value: formatHours(sum(props.trend, "leaveHours")), badge: "年假+病假", status: "neutral" },
    ];
  }

  if (props.indicator === "reliability") {
    return [];
  }

  return improvementKpis.value;
});

const activeSparkKey = ref("");
const expandedCompositeYears = ref([]);

const sparkPanels = computed(() => {
  if (props.indicator === "composite") {
    return [
      buildSparkPanel({
        key: "composite",
        title: "综合工时趋势",
        tabLabel: "综合",
        metric: formatHours(props.summary.totalCompositeHours),
        field: "compositeHours",
        color: "#435166",
        formatter: formatHours,
        chartType: "bar",
        usePiYearLogic: true,
        yearLogicDataPredicate: hasMetricCompositeWorkHourData,
      }),
      buildSparkPanel({
        key: "overtime",
        title: "OT 合计趋势",
        tabLabel: "OT",
        metric: formatHours(props.summary.totalOvertimeHours),
        field: "overtimeTotalHours",
        color: "#256d9f",
        formatter: formatHours,
        chartType: "bar",
      }),
      buildSparkPanel({
        key: "leave",
        title: "请假趋势",
        tabLabel: "请假",
        metric: formatHours(sum(props.trend, "leaveHours")),
        field: "leaveHours",
        color: "#b7791f",
        formatter: formatHours,
        chartType: "bar",
      }),
    ];
  }

  if (props.indicator === "reliability") {
    return [
      buildSparkPanel({
        key: "mttr",
        title: "MTTR 趋势",
        tabLabel: "MTTR",
        metric: formatMinutesNullable(props.summary.mttrMinutes),
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
      }),
    ];
  }

  return [
    buildSparkPanel({
      key: "benefit",
      title: "改善收益趋势",
      tabLabel: "收益",
      metric: formatMoneyNullable(totalBenefit.value),
      valueGetter: (row) => sumKnown(row.nearMissBenefit, row.pdcaBenefit, row.kaizenBenefit),
      color: "#18837e",
      formatter: formatMoney,
      labelFormatter: formatCompactMoney,
      axisFormatter: formatCompactMoney,
      chartType: "bar",
      hideEmptyMonths: true,
      usePiYearLogic: true,
    }),
    buildSparkPanel({
      key: "near-miss",
      title: "Near miss 趋势",
      tabLabel: "Near miss",
      metric: formatCountNullable(props.summary.nearMissCount),
      field: "nearMissCount",
      color: "#256d9f",
      formatter: formatCount,
      chartType: "bar",
      hideEmptyMonths: true,
      usePiYearLogic: true,
    }),
    buildSparkPanel({
      key: "pdca",
      title: "PDCA 趋势",
      tabLabel: "PDCA",
      metric: formatCountNullable(props.summary.pdcaCount),
      field: "pdcaCount",
      color: "#2f7f7a",
      formatter: formatCount,
      chartType: "bar",
      hideEmptyMonths: true,
      usePiYearLogic: true,
    }),
    buildSparkPanel({
      key: "kaizen",
      title: "Kaizen 趋势",
      tabLabel: "Kaizen",
      metric: formatCountNullable(props.summary.kaizenCount),
      field: "kaizenCount",
      color: "#5f8f1f",
      formatter: formatCount,
      chartType: "bar",
      hideEmptyMonths: true,
      usePiYearLogic: true,
    }),
  ];
});

const activeSparkPanel = computed(() => {
  if (!sparkPanels.value.length) return null;
  return sparkPanels.value.find((panel) => panel.key === activeSparkKey.value) || sparkPanels.value[0];
});

const activeSidePanel = computed(() => {
  if (props.indicator === "composite") {
    if (activeSparkKey.value === "overtime") {
      return {
        eyebrow: "员工",
        title: "OT 最高",
        emptyText: "暂无 OT 员工",
        rows: employeeMetricRows(props.employees, {
          valueGetter: (employee) => employee.overtimeTotalHours,
          formatter: formatHours,
          status: "warning",
          noteBuilder: employeeMeta,
        }),
      };
    }
    if (activeSparkKey.value === "leave") {
      return {
        eyebrow: "员工",
        title: "请假最高",
        emptyText: "暂无请假员工",
        rows: employeeMetricRows(props.employees, {
          valueGetter: (employee) => employee.leaveHours,
          formatter: formatHours,
          status: "neutral",
          noteBuilder: employeeMeta,
        }),
      };
    }
    return {
      eyebrow: "员工",
      title: "综合工时最高",
      emptyText: "暂无综合工时员工",
      rows: employeeMetricRows(props.employees, {
        valueGetter: (employee) => employee.annualCompositeHours || employee.compositeHours,
        formatter: formatHours,
        statusBuilder: (employee) => employee.compositeRisk === "ok" ? "good" : employee.compositeRisk || "neutral",
        noteBuilder: employeeMeta,
      }),
    };
  }

  if (props.indicator === "reliability") {
    return {
      eyebrow: "员工",
      title: mttrRiskRows.value.length ? "MTTR 高关注" : "MTTR 最高",
      emptyText: "暂无个人 MTTR",
      rows: mttrRiskRows.value.length ? mttrRiskRows.value : mttrTopRows.value,
    };
  }

  if (activeSparkKey.value === "near-miss") {
    return {
      eyebrow: "员工",
      title: "Near miss 最高",
      emptyText: "暂无 Near miss 员工",
      rows: improvementMetricRows("nearMissCount", formatCount, "info"),
    };
  }
  if (activeSparkKey.value === "pdca") {
    return {
      eyebrow: "员工",
      title: "PDCA 最高",
      emptyText: "暂无 PDCA 员工",
      rows: improvementMetricRows("pdcaCount", formatCount, "good"),
    };
  }
  if (activeSparkKey.value === "kaizen") {
    return {
      eyebrow: "员工",
      title: "Kaizen 最高",
      emptyText: "暂无 Kaizen 员工",
      rows: improvementMetricRows("kaizenCount", formatCount, "good"),
    };
  }
  return {
    eyebrow: "员工",
    title: "改善收益最高",
    emptyText: "暂无改善收益",
    rows: improvementMetricRows("benefit", formatMoney, "valid"),
  };
});

const sidePanelEyebrow = computed(() => activeSidePanel.value.eyebrow);
const sidePanelTitle = computed(() => activeSidePanel.value.title);
const sidePanelEmptyText = computed(() => activeSidePanel.value.emptyText);

const improvementEmployeeRows = computed(() =>
  [...props.employees]
    .map((employee) => {
      const nearMissCount = chartNumberOrNull(employee.nearMissCount);
      const pdcaCount = chartNumberOrNull(employee.pdcaCount);
      const kaizenCount = chartNumberOrNull(employee.kaizenCount);
      const nearMissBenefit = chartNumberOrNull(employee.nearMissBenefit);
      const pdcaBenefit = chartNumberOrNull(employee.pdcaBenefit);
      const kaizenBenefit = chartNumberOrNull(employee.kaizenBenefit);
      const pdcaAwardCount = chartNumberOrNull(employee.pdcaAwardCount);
      const kaizenAwardCount = chartNumberOrNull(employee.kaizenAwardCount);
      const benefit = sumKnown(employee.nearMissBenefit, employee.pdcaBenefit, employee.kaizenBenefit);
      return {
        key: employee.employeeKey || employee.employeeNo || employee.employeeName,
        employeeKey: employee.employeeKey,
        employeeNo: employee.employeeNo,
        employeeName: employee.employeeName,
        scope: organizationLabel(employee),
        nearMissCount,
        nearMissBenefit,
        pdcaCount,
        pdcaBenefit,
        pdcaAwardCount,
        kaizenCount,
        kaizenBenefit,
        kaizenAwardCount,
        benefit,
      };
    })
    .sort(
      (left, right) =>
        Number(right.benefit || 0) - Number(left.benefit || 0) ||
        Number(right.pdcaAwardCount || 0) - Number(left.pdcaAwardCount || 0) ||
        Number(right.kaizenAwardCount || 0) - Number(left.kaizenAwardCount || 0) ||
        Number(right.pdcaCount || 0) - Number(left.pdcaCount || 0) ||
        Number(right.kaizenCount || 0) - Number(left.kaizenCount || 0)
    )
);

const allSideRows = computed(() => {
  return activeSidePanel.value.rows;
});

const sideRows = computed(() => allSideRows.value.slice(0, 5));
const sideRowTotal = computed(() => formatInteger(allSideRows.value.length));
const tablePanelClass = computed(() => {
  if (props.indicator === "composite") return "pi-table-panel composite-table-panel";
  if (props.indicator === "improvement") return "focus-table-panel improvement-table-panel";
  if (props.indicator === "reliability") return "focus-table-panel mttr-table-panel";
  return "focus-table-panel";
});
const tableClass = computed(() =>
  props.indicator === "composite"
    ? "pi-employee-table composite-employee-table"
    : ["focus-table", `focus-table-${props.indicator}`, { "pi-employee-table": props.indicator === "improvement" || props.indicator === "reliability" }]
);

const columns = computed(() => {
  if (props.indicator === "composite") {
    return [
      { key: "rowIndex", label: "序号", type: "index", sortable: false },
      { key: "employeeName", label: "员工", strong: true },
      { key: "scope", label: "组织" },
      { key: "overtimeTotalHours", label: "OT", type: "hours" },
      { key: "leaveHours", label: "请假", type: "hours" },
      { key: "compositeHours", label: "综合工时", type: "hours", strong: true },
      { key: "attendanceHours", label: "合计出勤", type: "hours" },
      { key: "orderCount", label: "接单", type: "count" },
    ];
  }

  if (props.indicator === "reliability") {
    return [
      { key: "rowIndex", label: "序号", type: "index", sortable: false },
      { key: "employeeName", label: "员工", strong: true },
      { key: "scope", label: "组织" },
      { key: "mttrMinutes", label: "MTTR", type: "minutes", strong: true },
      { key: "orderCount", label: "接单", type: "count" },
      { key: "repairHours", label: "维修工时", type: "hours" },
      { key: "repairEfficiency", label: "PI", type: "percent" },
    ];
  }

  return [
    { key: "rowIndex", label: "序号", type: "index", sortable: false },
    { key: "employeeName", label: "员工", strong: true },
    { key: "scope", label: "组织" },
    { key: "nearMissCount", label: "Near miss" },
    { key: "pdcaCount", label: "PDCA" },
    { key: "kaizenCount", label: "快改" },
    { key: "pdcaAwardCount", label: "PDCA 获奖", type: "count" },
    { key: "kaizenAwardCount", label: "快改获奖", type: "count" },
    { key: "benefit", label: "Saving Money", type: "money", strong: true },
  ];
});

const baseTableRows = computed(() => {
  if (props.indicator === "composite") {
    return [...props.employees]
      .map((employee) => ({
        key: employee.employeeKey || employee.employeeNo || employee.employeeName,
        ...employee,
        scope: employeeScope(employee),
      }))
      .sort((left, right) => Number(right.compositeHours || 0) - Number(left.compositeHours || 0));
  }

  if (props.indicator === "reliability") {
    return mttrEmployeeRows.value;
  }

  return improvementEmployeeRows.value;
});

const tableRows = computed(() => sortTableRows(baseTableRows.value, tableSort.value));

const compositeRiskRows = computed(() =>
  [...props.employees]
    .filter((employee) => employee.compositeRisk !== "ok")
    .sort((left, right) => Number(right.annualCompositeHours || right.compositeHours || 0) - Number(left.annualCompositeHours || left.compositeHours || 0))
    .map((employee) => ({
      key: employee.employeeKey,
      employeeKey: employee.employeeKey,
      title: employee.employeeName,
      note: employeeMeta(employee),
      value: formatHours(employee.annualCompositeHours || employee.compositeHours),
      status: employee.compositeRisk,
    }))
);

const mttrRiskRows = computed(() =>
  mttrEmployeeRows.value
    .filter((employee) => Number(employee.mttrMinutes || 0) >= MTTR_ATTENTION_MINUTES)
    .map((employee) => ({
      key: employee.key,
      employeeKey: employee.employeeKey,
      title: employee.employeeName,
      note: employee.scope,
      value: formatMinutes(employee.mttrMinutes, 0),
      status: "warning",
    }))
);

const mttrTopRows = computed(() =>
  mttrEmployeeRows.value
    .filter((employee) => Number(employee.mttrMinutes || 0) > 0)
    .slice(0, 8)
    .map((employee) => ({
      key: employee.key,
      employeeKey: employee.employeeKey,
      title: employee.employeeName,
      note: employee.scope,
      value: formatMinutes(employee.mttrMinutes, 0),
      status: "neutral",
    }))
);

const mttrEmployeeRows = computed(() => {
  const maxValue = Math.max(0, ...props.employees.map((employee) => Number(employee.mttrMinutes || 0)));
  return [...props.employees]
    .map((employee) => {
      const mttrMinutes = chartNumberOrNull(employee.mttrMinutes);
      return {
        key: employee.employeeKey || employee.employeeNo || employee.employeeName,
        employeeKey: employee.employeeKey,
        employeeNo: employee.employeeNo,
        employeeName: employee.employeeName,
        positionTitle: employee.positionTitle || employee.jobTitle || employee.role,
        scope: employeeScope(employee),
        mttrMinutes,
        mttrRatio: maxValue && mttrMinutes ? mttrMinutes / maxValue : 0,
        orderCount: Number(employee.orderCount || 0),
        repairHours: Number(employee.repairHours || 0),
        repairEfficiency: Number(employee.repairEfficiency || 0),
      };
    })
    .sort(
      (left, right) =>
        Number(right.mttrMinutes || 0) - Number(left.mttrMinutes || 0) ||
        Number(right.orderCount || 0) - Number(left.orderCount || 0)
    );
});

const mttrValues = computed(() =>
  mttrEmployeeRows.value
    .map((employee) => Number(employee.mttrMinutes || 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right)
);

const mttrStats = computed(() => ({
  covered: mttrValues.value.length,
  median: percentile(mttrValues.value, 0.5),
  p90: percentile(mttrValues.value, 0.9),
  max: mttrValues.value.length ? mttrValues.value[mttrValues.value.length - 1] : null,
}));

const mttrCoverageLabel = computed(() => {
  const total = props.employees.length;
  if (!total) return "暂无员工";
  return `${formatDecimal((mttrStats.value.covered / total) * 100, 0)}% 有数据`;
});

const mttrBands = computed(() => {
  const bands = [
    { key: "target", label: "≤ 30 min", min: 0, max: 30 },
    { key: "steady", label: "30-60 min", min: 30, max: 60 },
    { key: "watch", label: "60-120 min", min: 60, max: 120 },
    { key: "high", label: "> 120 min", min: 120, max: Infinity },
  ].map((band) => ({
    ...band,
    count: mttrValues.value.filter((value) => value > band.min && value <= band.max).length,
  }));
  const maxCount = Math.max(1, ...bands.map((band) => band.count));
  return bands.map((band) => ({
    ...band,
    width: `${Math.max(4, (band.count / maxCount) * 100)}%`,
  }));
});

const totalBenefit = computed(() => sumKnown(props.summary.nearMissBenefit, props.summary.pdcaBenefit, props.summary.kaizenBenefit));

const detailMode = computed(() => {
  if (props.indicator === "composite") return "composite";
  if (props.indicator === "reliability") return "mttr";
  if (props.indicator === "improvement") return "improvement";
  return "pi";
});

const tableCoverageLabel = computed(() => {
  const total = props.employees.length;
  return total ? `${formatInteger(baseTableRows.value.length)}/${formatInteger(total)} 人` : "暂无员工";
});

const tableSortLabel = computed(() => {
  const label = columnLabel(tableSort.value.key) || "员工";
  return `${label} ${tableSort.value.direction === "desc" ? "降序" : "升序"}`;
});

const selectedEmployeeDisplay = computed(() => {
  const profile = props.employeeDetail?.profile;
  if (profile?.employeeName) {
    return [profile.employeeName, profile.positionTitle || profile.jobTitle || profile.role, profile.employeeNo].filter(Boolean).join(" · ");
  }
  const employee = props.employees.find((item) => item.employeeKey === props.selectedEmployeeKey);
  if (employee?.employeeName) {
    return [employee.employeeName, employee.positionTitle || employee.jobTitle || employee.role, employee.employeeNo].filter(Boolean).join(" · ");
  }
  return "未选择";
});

watch(
  () => props.indicator,
  () => {
    activeSparkKey.value = sparkPanels.value[0]?.key || "";
    tableSort.value = { ...(defaultTableSorts[props.indicator] || { key: "employeeName", direction: "asc" }) };
  },
  { immediate: true }
);

watch(
  () => props.trend,
  () => {
    expandedCompositeYears.value = [];
  }
);

function buildSparkPanel({
  key,
  title,
  tabLabel,
  metric,
  field,
  valueGetter,
  color,
  formatter,
  labelFormatter = formatter,
  axisFormatter = null,
  unit = "",
  zeroAsNull = false,
  chartType = "line",
  hideEmptyMonths = false,
  usePiYearLogic = false,
  yearLogicDataPredicate = null,
  showAverageLine = false,
  usePiBarFormat = false,
  aggregateMode = "sum",
}) {
  return buildMetricSparkPanel({
    key,
    title,
    tabLabel,
    metric,
    field,
    valueGetter,
    color,
    formatter,
    labelFormatter,
    axisFormatter,
    unit,
    zeroAsNull,
    chartType,
    hideEmptyMonths,
    usePiYearLogic,
    yearLogicDataPredicate,
    showAverageLine,
    usePiBarFormat,
    aggregateMode,
    trend: props.trend,
    expandedYears: expandedCompositeYears.value,
  });
}

function focusChartOption({ rows, values, title, color, formatter, labelFormatter = formatter, axisFormatter = null, chartType = "line", usePiYearLogic = false, usePiBarFormat = false, averageValue = null }) {
  const isBar = chartType === "bar";
  const data = values.map((value) => {
    const roundedValue = Number.isFinite(value) ? Number(value.toFixed(2)) : null;
    return isBar ? barDataItem(roundedValue, color) : roundedValue;
  });
  const isPiStyleBar = usePiYearLogic || usePiBarFormat;
  return {
    color: [color],
    backgroundColor: "#ffffff",
    animationDuration: 220,
    ...(isBar && Number.isFinite(averageValue) ? { graphic: averageGraphic("均值") } : {}),
    tooltip: {
      trigger: "axis",
      backgroundColor: "#ffffff",
      borderColor: "#d8e0e8",
      borderWidth: 1,
      textStyle: { color: "#1f2937", fontSize: 12 },
      ...(usePiYearLogic ? { formatter: (params) => formatPiStyleSparkTooltip(params, rows, title, color, formatter) } : {}),
      valueFormatter: (value) => (value === null || value === undefined ? "-" : formatter(value)),
    },
    grid: {
      top: isBar ? 34 : 18,
      right: isBar && Number.isFinite(averageValue) ? 48 : 18,
      bottom: 34,
      left: 54,
      containLabel: false,
    },
    xAxis: {
      type: "category",
      boundaryGap: isBar,
      data: rows.map((row) => row.label || row.month),
      axisLine: { lineStyle: { color: "#d7dde5" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#667085",
        fontSize: 11,
        hideOverlap: true,
        interval: usePiYearLogic ? (index) => shouldShowSparkAxisLabel(rows, index) : "auto",
        rotate: usePiYearLogic && rows.length > 14 && rows.length <= 24 ? 24 : 0,
      },
    },
    yAxis: {
      type: "value",
      scale: !isBar,
      splitNumber: 4,
      axisLabel: { color: "#667085", fontSize: 11, ...(axisFormatter ? { formatter: axisFormatter } : {}) },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#edf1f5", type: "solid" } },
    },
    series: [
      {
        name: title,
        type: chartType,
        data,
        ...(isBar
          ? {
              barWidth: isPiStyleBar ? sparkAnalysisBarWidth(rows) : compactBarWidth(rows),
              barMaxWidth: isPiStyleBar ? 104 : 36,
              barCategoryGap: isPiStyleBar ? "14%" : "18%",
              itemStyle: { color, borderRadius: [6, 6, 0, 0], opacity: 0.88 },
              label: {
                show: true,
                position: "top",
                distance: 6,
                color: "#465160",
                backgroundColor: "rgba(250, 252, 255, 0.96)",
                borderRadius: 4,
                padding: [2, 4],
                fontSize: 10,
                fontWeight: 800,
                formatter: (params) => labelFormatter(params.value),
              },
              labelLayout: { hideOverlap: true },
              ...(Number.isFinite(averageValue) ? { markLine: averageMarkLine(averageValue, 2) } : {}),
            }
          : {
              smooth: false,
              symbol: "circle",
              symbolSize: 5,
              connectNulls: false,
              lineStyle: { width: 2.6 },
              itemStyle: { borderColor: "#ffffff", borderWidth: 1.5 },
              areaStyle: { opacity: 0.08 },
            }),
        emphasis: { focus: "series" },
      },
    ],
  };
}

function barDataItem(value, color) {
  if (value === null) return null;
  const isNegative = value < 0;
  return {
    value,
    itemStyle: {
      color,
      borderRadius: isNegative ? [0, 0, 6, 6] : [6, 6, 0, 0],
      opacity: 0.88,
    },
    label: {
      position: isNegative ? "bottom" : "top",
      distance: 6,
    },
  };
}

function buildPiStyleSparkRows(chartPoints, aggregateMode = "sum") {
  const sourceRows = chartPoints
    .filter((point) => Number.isFinite(point.value))
    .map((point) => makeSparkSourceRow(point.row, point.value))
    .sort((left, right) => Number(left.monthIndex || 0) - Number(right.monthIndex || 0));
  const years = [...new Set(sourceRows.map((row) => row.year).filter(Boolean))];
  if (years.length <= 1) return sourceRows;

  const latestYear = years[years.length - 1] || "";
  const groups = groupSparkRowsByYear(sourceRows);
  const expanded = new Set(expandedCompositeYears.value);

  return [...groups.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([year, items]) => {
      const sortedItems = sortSparkRowsByMonth(items);
      if (year === latestYear) {
        const ytdRow = buildAggregateSparkRow(year, sortedItems, {
          month: `${year} YTD`,
          label: "YTD",
          displayLabel: `${year} YTD`,
          isYtd: true,
          forceAxisLabel: true,
          monthIndex: Number(year) * 100 + 13,
        }, aggregateMode);
        return [
          ytdRow,
          ...buildCompleteSparkYearRows(year, sortedItems),
        ];
      }
      if (expanded.has(year)) {
        return sortedItems.map((item) => ({
          ...item,
          label: getMonthName(item.month) || item.month,
          isAnnual: false,
          sourceMonthCount: 1,
        }));
      }
      return [buildAggregateSparkRow(year, sortedItems, {
        label: shortYearLabel(year),
        displayLabel: `${year} 年`,
        isAnnual: true,
        monthIndex: Number(year) * 100,
      }, aggregateMode)];
    });
}

function makeSparkSourceRow(row, value) {
  const year = getMonthYear(row.month);
  return {
    ...row,
    value,
    label: getMonthName(row.month) || row.month,
    displayLabel: row.month,
    year,
    isAnnual: false,
    isYtd: false,
    isPlaceholder: false,
    hasSourceData: true,
    sourceMonthCount: 1,
    monthIndex: getMonthIndex(row.month),
  };
}

function buildCompleteSparkYearRows(year, items) {
  const rowsByMonth = new Map(items.map((item) => [getMonthNumber(item.month), item]));
  return MONTH_NAMES.map((monthName, index) => {
    const monthNumber = index + 1;
    const month = `${year} ${monthName}`;
    const sourceRow = rowsByMonth.get(monthNumber);
    if (sourceRow) {
      return {
        ...sourceRow,
        label: monthName,
        displayLabel: month,
        forceAxisLabel: true,
      };
    }
    return {
      month,
      label: monthName,
      displayLabel: month,
      year,
      value: 0,
      isAnnual: false,
      isYtd: false,
      isPlaceholder: true,
      hasSourceData: false,
      forceAxisLabel: true,
      sourceMonthCount: 0,
      monthIndex: Number(year) * 100 + monthNumber,
    };
  });
}

function buildAggregateSparkRow(year, items, overrides = {}, aggregateMode = "sum") {
  return {
    month: overrides.month || items[0]?.month || year,
    label: overrides.label || year,
    displayLabel: overrides.displayLabel || `${year} 年`,
    year,
    value: aggregateMode === "average" ? averageKnown(items.map((item) => item.value)) : sum(items, "value"),
    isAnnual: Boolean(overrides.isAnnual),
    isYtd: Boolean(overrides.isYtd),
    isPlaceholder: false,
    hasSourceData: items.length > 0,
    forceAxisLabel: Boolean(overrides.forceAxisLabel),
    sourceMonthCount: items.length || 0,
    monthIndex: overrides.monthIndex ?? Number(year) * 100,
  };
}

function groupSparkRowsByYear(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!row.year) return;
    if (!groups.has(row.year)) groups.set(row.year, []);
    groups.get(row.year).push(row);
  });
  return groups;
}

function sortSparkRowsByMonth(rows) {
  return [...rows].sort((left, right) => Number(left.monthIndex || 0) - Number(right.monthIndex || 0));
}

function hasCompositeWorkHourData(row, value) {
  if (!Number.isFinite(value)) return false;
  return [
    "compositeHours",
    "overtimeTotalHours",
    "overtime15Hours",
    "overtime20Hours",
    "overtime30Hours",
    "leaveHours",
    "annualLeaveHours",
    "sickLeaveHours",
  ].some((field) => {
    const number = Number(row?.[field]);
    return Number.isFinite(number) && number !== 0;
  });
}

function shouldShowSparkAxisLabel(rows, index) {
  const total = rows.length;
  const row = rows[index] || {};
  if (row.forceAxisLabel || row.isAnnual || total <= 14) return true;
  if (index === 0 || index === total - 1) return true;
  const monthNumber = getMonthNumber(row.month);
  if (!monthNumber) return index % Math.ceil(total / 10) === 0;
  if (total <= 24) return index % 2 === 0 || monthNumber === 1;
  if (total <= 40) return [1, 4, 7, 10].includes(monthNumber);
  return monthNumber === 1 || monthNumber === 7;
}

function sparkAnalysisBarWidth(rows) {
  const count = rows.length;
  if (count <= 4) return "76%";
  if (count <= 8) return "68%";
  if (count <= 16) return "56%";
  return "44%";
}

function compactBarWidth(rows) {
  const count = rows.length;
  if (count <= 8) return "48%";
  if (count <= 16) return "42%";
  if (count <= 28) return "34%";
  return "28%";
}

function bindFocusChart(chart) {
  chart.off("click");
  chart.on("click", (params) => {
    const panel = activeSparkPanel.value;
    if (!panel?.hasYearDrilldown) return;
    const row = findSparkRowFromChartParam(params, panel.rows || []);
    if (row?.isAnnual && row.year) {
      toggleCompositeYear(row.year);
    }
  });
}

function findSparkRowFromChartParam(params, rows) {
  const dataIndex = Number(params?.dataIndex);
  const label = params?.name || params?.axisValue || "";
  return (Number.isInteger(dataIndex) ? rows[dataIndex] : null)
    || rows.find((row) => row.label === label || row.month === label || row.displayLabel === label);
}

function toggleCompositeYear(year) {
  const current = new Set(expandedCompositeYears.value);
  if (current.has(year)) {
    current.delete(year);
  } else {
    current.add(year);
  }
  expandedCompositeYears.value = [...current].sort((left, right) => Number(left) - Number(right));
}

function collapseCompositeYears() {
  expandedCompositeYears.value = [];
}

function formatPiStyleSparkTooltip(params, rows, title, color, valueFormatter) {
  const items = Array.isArray(params) ? params : [params];
  const row = rows[items[0]?.dataIndex] || {};
  return [
    row.displayLabel || row.month || row.label,
    `${marker(color)}${title} ${valueFormatter(row.value)}`,
    row.isAnnual || row.isYtd ? `统计月数 ${formatCount(row.sourceMonthCount)} 月` : "",
    row.isPlaceholder ? "暂无数据，按 0 显示" : "",
  ].filter(Boolean).join("<br/>");
}

function getMonthYear(label) {
  const match = String(label || "").match(/^(\d{4})\s+[A-Za-z]{3}$/);
  return match ? match[1] : "";
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  return Number(match[1]) * 100 + MONTH_NAMES.indexOf(match[2]) + 1;
}

function getMonthNumber(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? MONTH_NAMES.indexOf(match[1]) + 1 : 0;
}

function getMonthName(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? match[1] : "";
}

function shortYearLabel(year) {
  const text = String(year || "");
  return text.length === 4 ? text.slice(2) : text;
}

function marker(color) {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>`;
}

function employeeMetricRows(employees, { valueGetter, formatter, status = "neutral", statusBuilder = null, noteBuilder = employeeMeta }) {
  return [...employees]
    .map((employee) => {
      const value = Number(valueGetter(employee) || 0);
      return {
        key: employee.employeeKey || employee.employeeNo || employee.employeeName,
        employeeKey: employee.employeeKey,
        title: employee.employeeName,
        note: noteBuilder(employee),
        rawValue: value,
        value: formatter(value),
        status: statusBuilder ? statusBuilder(employee, value) : status,
      };
    })
    .filter((row) => Number(row.rawValue || 0) > 0)
    .sort((left, right) => Number(right.rawValue || 0) - Number(left.rawValue || 0));
}

function improvementMetricRows(field, formatter, status = "valid") {
  return improvementEmployeeRows.value
    .map((row) => ({
      key: row.key,
      employeeKey: row.employeeKey,
      title: row.employeeName,
      note: improvementRowNote(row),
      rawValue: Number(row[field] || 0),
      value: formatter(row[field]),
      status,
    }))
    .filter((row) => Number(row.rawValue || 0) > 0)
    .sort((left, right) => Number(right.rawValue || 0) - Number(left.rawValue || 0));
}

function improvementRowNote(row) {
  const awardCount = sumKnown(row.pdcaAwardCount, row.kaizenAwardCount);
  const awardText = Number(awardCount || 0) > 0 ? ` / 获奖 ${formatCount(awardCount)}` : "";
  return `Near miss ${formatCountNullable(row.nearMissCount)} / PDCA ${formatCountNullable(row.pdcaCount)} / 快改 ${formatCountNullable(row.kaizenCount)}${awardText}`;
}

async function selectRow(row) {
  if (props.indicator === "improvement") return;
  if (row.employeeKey) {
    emit("select-employee", row.employeeKey);
    await scrollToEmployeeDetail();
  }
}

async function selectTableRow(row) {
  if (props.indicator === "improvement") return;
  if (row.employeeKey) {
    emit("select-employee", row.employeeKey);
    await scrollToEmployeeDetail();
  }
}

async function scrollToEmployeeDetail() {
  await nextTick();
  window.setTimeout(() => {
    detailShellRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

function employeeMeta(employee) {
  return [
    employee.department || employee.businessArea,
    employee.positionTitle || employee.jobTitle || employee.role,
  ].filter(Boolean).join(" · ") || "-";
}

function employeeScope(employee) {
  const group = employee.department ||
    (employee.shift && employee.shift !== "历史" ? employee.shift : "") ||
    employee.positionTitle ||
    employee.workshop;
  return [
    employee.businessArea,
    employee.plant ? `${employee.plant}厂房` : "",
    group,
  ].filter(Boolean).join(" / ") || "-";
}

function employeeMetaText(employee) {
  return [
    employee.employeeNo,
    employee.positionTitle || employee.jobTitle || employee.role,
  ].filter(Boolean).join(" · ") || "-";
}

function organizationLabel(employee) {
  if (!employee) return "";
  if (employee.department) return employee.department;
  if (employee.businessArea && employee.plant) return `${employee.businessArea} / ${employee.plant}`;
  return employee.businessArea || employee.plant || employee.workshop || employee.shift || "-";
}

function formatCell(row, column) {
  const value = row[column.key];
  if (props.indicator === "reliability" && column.key.includes("Target") && !Number(value || 0)) return "-";
  if (column.type === "hours") return formatHours(value);
  if (column.type === "minutes") return value === null || value === undefined ? "-" : formatMinutes(value);
  if (column.type === "percent") return formatPercent(value);
  if (column.type === "count") return formatCount(value);
  if (column.type === "money") return formatMoney(value);
  if (typeof value === "number") return formatInteger(value);
  return value || "-";
}

function mttrMeterWidth(value) {
  const maxValue = Number(mttrStats.value.max || 0);
  const ratio = maxValue ? Number(value || 0) / maxValue : 0;
  return `${Math.max(6, Math.min(100, ratio * 100))}%`;
}

function toggleTableSort(key) {
  tableSort.value = {
    key,
    direction: tableSort.value.key === key && tableSort.value.direction === "desc" ? "asc" : "desc",
  };
}

function sortMark(sort, key) {
  if (sort.key !== key) return "↕";
  return sort.direction === "desc" ? "↓" : "↑";
}

function columnLabel(key) {
  return columns.value.find((column) => column.key === key)?.label || "";
}

function sortTableRows(rows, sort) {
  if (!sort?.key) return rows;
  return [...rows].sort((left, right) => compareValues(getSortValue(left, sort.key), getSortValue(right, sort.key), sort.direction));
}

function getSortValue(row, key) {
  const value = row?.[key];
  if (typeof value === "string") return value;
  return Number(value ?? 0);
}

function compareValues(left, right, direction = "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  if (typeof left === "string" || typeof right === "string") {
    return String(left || "").localeCompare(String(right || ""), "zh-Hans-CN", { numeric: true }) * multiplier;
  }
  return ((Number(left) || 0) - (Number(right) || 0)) * multiplier;
}

function buildImprovementKpiGroup({ label, count, countField, benefit, status }) {
  const coverage = improvementCoverage(countField, count);
  return [
    {
      label: `${label} 数量`,
      eyebrow: label,
      metricLabel: "数量",
      value: formatCountNullable(count),
      badge: "累计提交",
      status,
    },
    {
      label: `${label} 覆盖率`,
      eyebrow: label,
      metricLabel: "覆盖率",
      value: formatPercentNullable(coverage.rate),
      badge: coverage.badge,
      status,
    },
    {
      label: `${label} Saving Money`,
      eyebrow: label,
      metricLabel: "Saving Money",
      value: formatMoneyNullable(benefit),
      badge: "节约金额",
      status,
    },
  ];
}

function buildImprovementKpiGroupCompact({ label, count, countField, benefit, status }) {
  const coverage = improvementCoverage(countField, count);
  return {
    label,
    status,
    caption: improvementGroupCaption(label),
    metrics: [
      { label: "数量", value: formatCountNullable(count), note: "累计" },
      { label: "覆盖率", value: formatPercentNullable(coverage.rate), note: coverage.badge },
      { label: "Saving", value: formatMoneyNullable(benefit), note: "节约金额" },
    ],
  };
}

function improvementGroupCaption(label) {
  return {
    PDCA: "项目改善",
    Kaizen: "快速改善",
    "Near miss": "风险预防",
  }[label] || "";
}

function improvementCoverage(countField, countValue) {
  const total = props.employees.length;
  if (!total) return { rate: null, badge: "暂无员工" };
  if (!hasKnown(countValue)) return { rate: null, badge: "无数据" };
  const covered = props.employees.filter((employee) => Number(employee[countField] || 0) > 0).length;
  return {
    rate: covered / total,
    badge: `${formatInteger(covered)}/${formatInteger(total)} 人`,
  };
}

function riskText(risk) {
  return { over: "超限", warning: "临近", ok: "正常" }[risk] || "-";
}

function emptyToNull(value, zeroAsNull = false) {
  if (value === null || value === undefined || value === "") return null;
  if (zeroAsNull && Number(value) === 0) return null;
  return Number(value);
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function formatPercentNullable(value) {
  return value === null || value === undefined ? "暂无" : formatPercent(value);
}

function formatOneDecimal(value) {
  return formatDecimal(value, 1);
}

function formatCount(value) {
  return formatInteger(value);
}

function formatCompactMoney(value) {
  return formatCompactMoneyValue(value);
}

function formatMoneyNullable(value) {
  return value === null || value === undefined ? "暂无" : formatMoney(value);
}

function formatMinutesNullable(value) {
  return value === null || value === undefined ? "暂无" : formatMinutes(value);
}

function formatPlainNumberNullable(value) {
  return value === null || value === undefined ? "暂无" : formatDecimal(value, 1);
}

function formatCountNullable(value) {
  return value === null || value === undefined ? "暂无" : formatInteger(value);
}

function chartNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sumKnown(...values) {
  const known = values.filter((value) => value !== null && value !== undefined && value !== "").map(Number).filter(Number.isFinite);
  return known.length ? known.reduce((total, value) => total + value, 0) : null;
}

function averageKnown(values) {
  const known = values.map(Number).filter(Number.isFinite);
  return known.length ? known.reduce((total, value) => total + value, 0) / known.length : null;
}

function averageMarkLine(value, width = 1.5) {
  return {
    symbol: ["none", "none"],
    label: { show: false },
    silent: true,
    lineStyle: { color: "#596171", type: "dashed", width },
    data: [{ yAxis: Number(value.toFixed(2)) }],
    z: 1,
    zlevel: 0,
  };
}

function averageGraphic(label = "均值") {
  return [
    {
      type: "group",
      right: 6,
      top: 0,
      silent: true,
      children: [
        {
          type: "line",
          shape: { x1: 0, y1: 8, x2: 22, y2: 8 },
          style: { stroke: "#596171", lineWidth: 2, lineDash: [6, 4] },
        },
        {
          type: "text",
          left: 28,
          top: 0,
          style: {
            text: label,
            fill: "#596171",
            font: "700 12px Aptos, Segoe UI, sans-serif",
          },
        },
      ],
    },
  ];
}

function hasKnown(...values) {
  return values.some((value) => value !== null && value !== undefined && value !== "");
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const index = (values.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

function formatDelta(delta, formatter) {
  if (Math.abs(delta) < 0.0001) return "持平";
  return `较上月 ${delta > 0 ? "+" : ""}${formatter(delta)}`;
}
</script>
