<template>
  <article class="data-panel employee-detail-panel">
    <div v-if="!profile" class="empty-detail">请选择员工</div>

    <template v-else>
      <div class="profile-strip compact">
        <div class="profile-identity">
          <span class="section-label">员工</span>
          <h3>{{ profile.employeeName }}</h3>
          <p>{{ profileMetaText }}</p>
          <div class="profile-tags">
            <span :class="['risk-pill', detailRiskClass]">
              {{ detailRiskLabel }}
            </span>
            <span v-if="mode === 'mttr'">MTTR {{ formatMinutes(profile.mttrMinutes) }}</span>
            <span v-else-if="mode === 'improvement'">改善 {{ formatNumber(improvementTotalCount) }}</span>
            <span v-else-if="mode === 'composite'">综合工时 {{ formatHours(profile.compositeHours) }}</span>
            <span v-else>PI {{ formatPercent(profile.repairEfficiency) }}</span>
            <span v-if="mode === 'composite'">OT {{ formatHours(profile.overtimeTotalHours) }}</span>
            <span v-if="mode === 'composite'">请假 {{ formatHours(profile.leaveHours) }}</span>
            <span v-if="mode === 'improvement'">Saving Money {{ formatMoney(improvementTotalBenefit) }}</span>
            <span v-if="mode === 'composite'">合计出勤 {{ formatHours(profile.attendanceHours) }}</span>
            <span v-else>接单 {{ formatNumber(profile.orderCount) }}</span>
          </div>
        </div>
      </div>

      <section class="detail-hero-grid">
        <template v-if="mode === 'mttr'">
          <ChartPanel title="MTTR 趋势" eyebrow="年均 / 月度 · min" :option="mttrTrendOption" />
          <ChartPanel title="接单与维修工时" eyebrow="年 / 月" :option="mttrContextOption" />
        </template>
        <template v-else-if="mode === 'improvement'">
          <ChartPanel title="改善数量趋势" eyebrow="Near miss / PDCA / Kaizen" :option="improvementCountOption" />
          <ChartPanel title="Saving Money 趋势" eyebrow="Near miss / PDCA / Kaizen" :option="improvementBenefitOption" />
        </template>
        <template v-else-if="mode === 'composite'">
          <ChartPanel title="综合工时趋势" eyebrow="OT - 请假 · hrs" :option="compositeTrendOption" />
          <ChartPanel title="OT / 请假构成" eyebrow="OT 1.5x / OT 2x / 请假 · hrs" :option="compositeBreakdownOption" />
        </template>
        <template v-else>
          <ChartPanel title="PI 对比" eyebrow="个人 / 部门" :option="efficiencyCompareOption" />
          <ChartPanel title="工时结构" eyebrow="PM01 / PM03 / 转移 / 出勤" :option="workloadOption" />
        </template>
      </section>

      <section class="detail-stat-grid">
        <template v-if="mode === 'mttr'">
          <div class="detail-stat">
            <span>个人均值</span>
            <strong>{{ formatMinutes(profile.mttrMinutes) }}</strong>
            <small>{{ mttrLatestMonthLabel }}</small>
          </div>
          <div class="detail-stat">
            <span>数据月份</span>
            <strong>{{ formatNumber(mttrValues.length) }}</strong>
            <small>有 MTTR 的月份</small>
          </div>
          <div class="detail-stat">
            <span>最高 MTTR</span>
            <strong>{{ formatMinutes(mttrMax) }}</strong>
            <small>月度峰值</small>
          </div>
          <div class="detail-stat">
            <span>P90</span>
            <strong>{{ formatMinutes(mttrP90) }}</strong>
            <small>月度分位</small>
          </div>
        </template>
        <template v-else-if="mode === 'improvement'">
          <div class="detail-stat">
            <span>Near miss</span>
            <strong>{{ formatNumber(improvementSummary.nearMissCount) }}</strong>
            <small>Saving Money {{ formatMoney(improvementSummary.nearMissBenefit) }}</small>
          </div>
          <div class="detail-stat">
            <span>PDCA</span>
            <strong>{{ formatNumber(improvementSummary.pdcaCount) }}</strong>
            <small>Saving Money {{ formatMoney(improvementSummary.pdcaBenefit) }}</small>
          </div>
          <div class="detail-stat">
            <span>Kaizen</span>
            <strong>{{ formatNumber(improvementSummary.kaizenCount) }}</strong>
            <small>Saving Money {{ formatMoney(improvementSummary.kaizenBenefit) }}</small>
          </div>
          <div class="detail-stat">
            <span>合计收益</span>
            <strong>{{ formatMoney(improvementTotalBenefit) }}</strong>
            <small>{{ formatNumber(improvementRecords.length) }} 条改善记录</small>
          </div>
        </template>
        <template v-else-if="mode === 'composite'">
          <div class="detail-stat">
            <span>综合工时</span>
            <strong>{{ formatHours(profile.compositeHours) }}</strong>
            <small>{{ compositeRiskSummary }}</small>
          </div>
          <div class="detail-stat">
            <span>OT 合计</span>
            <strong>{{ formatHours(profile.overtimeTotalHours) }}</strong>
            <small>1.5x {{ formatHours(profile.overtime15Hours) }} · 2x {{ formatHours(profile.overtime20Hours) }}</small>
          </div>
          <div class="detail-stat">
            <span>请假</span>
            <strong>{{ formatHours(profile.leaveHours) }}</strong>
            <small>年假 {{ formatHours(profile.annualLeaveHours) }} · 病假 {{ formatHours(profile.sickLeaveHours) }}</small>
          </div>
          <div class="detail-stat">
            <span>考核范围</span>
            <strong>{{ formatNumber(compositeRows.length) }}</strong>
            <small>{{ profile.selectedPeriod || "去年 8 月 - 今年 7 月" }}</small>
          </div>
        </template>
        <template v-else>
        <div class="detail-stat">
          <span>当前接单</span>
          <strong>{{ formatNumber(profile.orderCount) }}</strong>
          <small :class="deltaClass(comparisons.orderCountDelta)">较上月 {{ signed(comparisons.orderCountDelta, 0) }} 单</small>
        </div>
        <div class="detail-stat">
          <span>出勤小时</span>
          <strong>{{ formatHours(profile.attendanceHours) }}</strong>
          <small>接单效率 {{ formatDecimal(profile.orderEfficiency, 2) }} 单/h</small>
        </div>
        <div class="detail-stat">
          <span>维修工时</span>
          <strong>{{ formatHours(profile.repairHours) }}</strong>
          <small :class="deltaClass(comparisons.repairHoursDelta)">占比 {{ formatDecimal(profile.repairHoursShare, 1) }}% · 较上月 {{ signed(comparisons.repairHoursDelta, 0) }} h</small>
        </div>
        <div class="detail-stat">
          <span>维修效率 PI</span>
          <strong>{{ formatPercent(profile.repairEfficiency) }}</strong>
          <small :class="deltaClass(comparisons.repairEfficiencyDelta)">较上月 {{ signedPercent(comparisons.repairEfficiencyDelta) }}</small>
        </div>
        </template>
      </section>

      <section v-if="mode === 'improvement'" class="provenance-section improvement-record-section" aria-label="员工改善记录">
        <div class="panel-head compact-head">
          <div>
            <span class="section-label">改善</span>
            <h3>改善记录</h3>
          </div>
          <strong>{{ formatNumber(improvementRecords.length) }}</strong>
        </div>
        <div v-if="improvementRecords.length" class="improvement-record-list">
          <div v-for="row in improvementRecords" :key="row.id || `${row.month}-${row.projectTitle}`" class="improvement-record-row">
            <span>
              <strong>{{ row.projectTitle || improvementTypeLabel(row.improvementType) }}</strong>
              <small>{{ improvementRecordMeta(row) }}</small>
            </span>
            <i>
              <b>{{ formatNumber(row.quantity) }}</b>
              <small>{{ formatMoney(row.benefitAmount) }}</small>
            </i>
          </div>
        </div>
        <div v-else class="empty-state compact">暂无改善记录</div>
      </section>

    </template>
  </article>
</template>

<script setup>
import { computed } from "vue";
import ChartPanel from "./ChartPanel.vue";
import { isYtdLikeRow, ytdBarItemStyle } from "../utils/metricFocusChart";
import {
  formatDecimal,
  formatHours,
  formatInteger,
  formatMinutes as formatMinutesValue,
  formatMoney,
  formatPercent,
} from "../utils/numberFormat";

const props = defineProps({
  detail: {
    type: Object,
    default: () => ({ profile: null, comparisons: {}, monthlyTrends: [], records: [] }),
  },
  mode: { type: String, default: "pi" },
});

const profile = computed(() => props.detail.profile || null);
const comparisons = computed(() => props.detail.comparisons || {});
const monthlyTrends = computed(() => props.detail.monthlyTrends || []);
const improvementSummary = computed(() => props.detail.improvementSummary || {});
const improvementTrend = computed(() => props.detail.improvementTrend || []);
const improvementRecords = computed(() => props.detail.improvementRecords || []);
const metricColors = {
  pm01: "#3b8b69",
  pm03: "#1f6fb2",
  transfer: "#c27a2c",
  attendance: "#7d8794",
  pi: "#f5c542",
  reference: "#596171",
  composite: "#435166",
  overtime15: "#256d9f",
  overtime20: "#70a6d8",
  leave: "#b7791f",
  nearMiss: "#256d9f",
  pdca: "#2f7f7a",
  kaizen: "#5f8f1f",
};
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const profileMetaText = computed(() => {
  if (!profile.value) return "";
  return [
    profile.value.employeeNo,
    profile.value.positionTitle || profile.value.jobTitle || profile.value.role,
    profile.value.department || profile.value.businessArea || profile.value.plant,
    profile.value.selectedPeriod,
  ].filter(Boolean).join(" · ");
});

const detailChartRows = computed(() => chartRowsFromFirstDataPoint(buildHybridRows(monthlyTrends.value)));
const workloadChartRows = computed(() => chartRowsFromFirstDataPoint(buildHybridRows(monthlyTrends.value, { includeLatestYtd: true })));
const efficiencyChartRows = computed(() => chartRowsFromFirstDataPoint(buildHybridRows(monthlyTrends.value, { includeLatestYtd: true })).filter(hasEmployeePiData));
const compositeRows = computed(() => buildCompositeRows(monthlyTrends.value));
const compositeRiskSummary = computed(() => {
  const value = Number(profile.value?.compositeHours || 0);
  const remaining = 432 - value;
  if (remaining < 0) return `超出 432h ${formatHours(Math.abs(remaining))}`;
  return `距 432h 还差 ${formatHours(remaining)}`;
});
const rawMttrRows = computed(() =>
  [...monthlyTrends.value]
    .filter((row) => Number(row.mttrMinutes || 0) > 0)
    .sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month))
    .map((row) => ({
      ...row,
      label: getMonthName(row.month) || row.month,
      mttrMinutes: Number(row.mttrMinutes || 0),
      orderCount: Number(row.orderCount || 0),
      repairHours: Number(row.repairHours || 0),
    }))
);
const mttrChartRows = computed(() => buildMttrHybridRows(rawMttrRows.value));
const mttrValues = computed(() => rawMttrRows.value.map((row) => row.mttrMinutes).filter((value) => Number.isFinite(value) && value > 0));
const mttrMax = computed(() => (mttrValues.value.length ? Math.max(...mttrValues.value) : null));
const mttrP90 = computed(() => percentile(mttrValues.value, 0.9));
const mttrLatestMonthLabel = computed(() => {
  const latest = rawMttrRows.value[rawMttrRows.value.length - 1];
  return latest ? `最近有值 ${latest.month} ${formatMinutes(latest.mttrMinutes)}` : "暂无月度 MTTR";
});
const improvementRows = computed(() =>
  [...improvementTrend.value]
    .filter((row) => row.month)
    .sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month))
    .map((row) => ({
      ...row,
      label: getMonthName(row.month) || row.month,
      nearMissBenefit: Number(row.nearMissBenefit || 0),
      pdcaBenefit: Number(row.pdcaBenefit || 0),
      kaizenBenefit: Number(row.kaizenBenefit || 0),
      nearMissCount: Number(row.nearMissCount || 0),
      pdcaCount: Number(row.pdcaCount || 0),
      kaizenCount: Number(row.kaizenCount || 0),
    }))
);
const improvementTotalCount = computed(() =>
  Number(improvementSummary.value.nearMissCount || 0) +
  Number(improvementSummary.value.pdcaCount || 0) +
  Number(improvementSummary.value.kaizenCount || 0)
);
const improvementTotalBenefit = computed(() =>
  Number(improvementSummary.value.nearMissBenefit || 0) +
  Number(improvementSummary.value.pdcaBenefit || 0) +
  Number(improvementSummary.value.kaizenBenefit || 0)
);
const detailRiskClass = computed(() => {
  if (props.mode === "mttr") return mttrRiskClass(profile.value?.mttrMinutes);
  if (props.mode === "improvement") return improvementTotalCount.value > 0 ? "ok" : "warning";
  return profile.value?.compositeRisk;
});
const detailRiskLabel = computed(() => {
  if (props.mode === "mttr") return mttrRiskLabel(profile.value?.mttrMinutes);
  if (props.mode === "improvement") return improvementTotalCount.value > 0 ? "有改善" : "暂无改善";
  return riskLabel(profile.value?.compositeRisk);
});

function formatMinutes(value) {
  if (value === null || value === undefined || value === "") return "-";
  return formatMinutesValue(value);
}

function signed(value, digits = 1) {
  const number = Number(value || 0);
  const formatted = digits === 0 ? formatInteger(number) : formatDecimal(number, digits);
  return `${number >= 0 ? "+" : ""}${formatted}`;
}

function signedPercent(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${formatPercent(number)}`;
}

function riskLabel(risk) {
  return { over: "超限", warning: "临近上限", ok: "正常" }[risk] || "正常";
}

function mttrRiskClass(value) {
  const number = Number(value || 0);
  if (number >= 120) return "over";
  if (number >= 60) return "warning";
  return "ok";
}

function mttrRiskLabel(value) {
  const number = Number(value || 0);
  if (number >= 120) return "高关注";
  if (number >= 60) return "观察";
  return "稳定";
}

function deltaClass(value) {
  const number = Number(value || 0);
  if (number > 0) return "delta-positive";
  if (number < 0) return "delta-negative";
  return "";
}

function formatNumber(value) {
  return formatInteger(value);
}

function improvementTypeLabel(value) {
  return {
    near_miss: "Near miss",
    pdca: "PDCA",
    kaizen: "Kaizen",
  }[value] || value || "-";
}

function improvementRecordMeta(row) {
  return [
    row.month || row.createdDate,
    improvementTypeLabel(row.improvementType),
    row.department || row.sourceDepartment,
    row.lineArea,
    row.station,
  ].filter(Boolean).join(" · ") || "-";
}

function round(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function piNumerator(row) {
  return Number(row.pm01Hours || 0) + Number(row.pm03Hours || 0) + Number(row.transferHours || 0);
}

function chartRowsFromFirstDataPoint(rows = []) {
  const firstDataIndex = rows.findIndex(hasEmployeeChartData);
  return firstDataIndex >= 0 ? rows.slice(firstDataIndex).filter(hasEmployeeChartData) : [];
}

function hasEmployeeChartData(row) {
  return [
    row.attendanceHours,
    row.repairHours,
    row.pm01Hours,
    row.pm03Hours,
    row.transferHours,
  ].some((value) => Number(value || 0) > 0);
}

function hasEmployeePiData(row) {
  return Number(row.attendanceHours || 0) > 0;
}

function hasCompositeData(row) {
  return [
    "compositeHours",
    "overtimeTotalHours",
    "overtime15Hours",
    "overtime20Hours",
    "leaveHours",
    "annualLeaveHours",
    "sickLeaveHours",
  ].some((field) => {
    const number = Number(row?.[field]);
    return Number.isFinite(number) && number !== 0;
  });
}

function getMonthYear(label) {
  const match = String(label || "").match(/^(\d{4})\s+[A-Za-z]{3}$/);
  return match ? match[1] : "";
}

function getMonthName(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? match[1] : "";
}

function getMonthNumber(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? monthNames.indexOf(match[1]) + 1 : 0;
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  return Number(match[1]) * 100 + monthNames.indexOf(match[2]) + 1;
}

function buildHybridRows(rows = [], options = {}) {
  const normalized = [...rows].sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month));
  const years = [...new Set(normalized.map((row) => getMonthYear(row.month)).filter(Boolean))];
  const latestYear = years[years.length - 1] || "";
  if (years.length <= 1 || !latestYear) {
    const monthlyRows = normalized.map((row) => ({ ...row, label: getMonthName(row.month) || row.month, isAnnual: false }));
    return options.includeLatestYtd && latestYear
      ? [buildAggregateWorkloadRow(latestYear, normalized, { label: "YTD", month: `${latestYear} YTD`, displayLabel: `${latestYear} YTD`, isYtd: true, forceAxisLabel: true }), ...monthlyRows]
      : monthlyRows;
  }

  const groups = new Map();
  normalized.forEach((row) => {
    const year = getMonthYear(row.month);
    if (!year) return;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(row);
  });

  return [...groups.entries()].sort(([left], [right]) => Number(left) - Number(right)).flatMap(([year, items]) => {
    const sortedItems = [...items].sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month));
    if (year === latestYear) {
      const monthlyRows = sortedItems.map((item) => ({ ...item, label: getMonthName(item.month) || item.month, isAnnual: false }));
      return options.includeLatestYtd ? [buildAggregateWorkloadRow(year, sortedItems, { label: "YTD", month: `${year} YTD`, displayLabel: `${year} YTD`, isYtd: true, forceAxisLabel: true }), ...monthlyRows] : monthlyRows;
    }
    return [buildAggregateWorkloadRow(year, sortedItems, { label: year, month: sortedItems[0]?.month || year, isAnnual: true })];
  });
}

function buildAggregateWorkloadRow(year, items, overrides = {}) {
  const attendanceHours = sum(items, "attendanceHours");
  const pm01Hours = sum(items, "pm01Hours");
  const pm03Hours = sum(items, "pm03Hours");
  const transferHours = sum(items, "transferHours");
  const piHours = pm01Hours + pm03Hours + transferHours;
  const repairEfficiency = attendanceHours > 0 ? piHours / attendanceHours : 0;
  return {
    label: overrides.label || year,
    displayLabel: overrides.displayLabel || "",
    month: overrides.month || items[0]?.month || year,
    isAnnual: Boolean(overrides.isAnnual),
    isYtd: Boolean(overrides.isYtd),
    forceAxisLabel: Boolean(overrides.forceAxisLabel),
    sourceMonthCount: items.length,
    attendanceHours,
    orderCount: sum(items, "orderCount"),
    repairHours: sum(items, "repairHours"),
    pm01Hours,
    pm03Hours,
    transferHours,
    repairEfficiency,
    departmentAvgRepairEfficiency: averageEfficiency(items, "departmentAvgRepairEfficiency"),
    shiftAvgRepairEfficiency: averageEfficiency(items, "shiftAvgRepairEfficiency"),
    overallAvgRepairEfficiency: averageEfficiency(items, "overallAvgRepairEfficiency"),
  };
}

function buildMttrHybridRows(rows = []) {
  const normalized = [...rows].sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month));
  const years = [...new Set(normalized.map((row) => getMonthYear(row.month)).filter(Boolean))];
  const latestYear = years[years.length - 1] || "";
  if (years.length <= 1 || !latestYear) {
    return normalized.map((row) => ({ ...row, label: getMonthName(row.month) || row.month, isAnnual: false, sourceMonthCount: 1 }));
  }

  const groups = new Map();
  normalized.forEach((row) => {
    const year = getMonthYear(row.month);
    if (!year) return;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(row);
  });

  return [...groups.entries()].sort(([left], [right]) => Number(left) - Number(right)).flatMap(([year, items]) => {
    const sortedItems = [...items].sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month));
    if (year === latestYear) {
      return sortedItems.map((item) => ({
        ...item,
        label: getMonthName(item.month) || item.month,
        displayLabel: item.month,
        isAnnual: false,
        sourceMonthCount: 1,
      }));
    }

    return [{
      label: year,
      displayLabel: `${year} 年`,
      month: year,
      isAnnual: true,
      sourceMonthCount: sortedItems.length,
      mttrMinutes: averageValues(sortedItems, "mttrMinutes"),
      orderCount: sum(sortedItems, "orderCount"),
      repairHours: sum(sortedItems, "repairHours"),
    }];
  });
}

function buildCompositeRows(rows = []) {
  return [...rows]
    .filter((row) => row.month && hasCompositeData(row))
    .sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month))
    .map((row) => ({
      ...row,
      label: getMonthName(row.month) || row.month,
      compositeHours: Number(row.compositeHours || 0),
      overtime15Hours: Number(row.overtime15Hours || 0),
      overtime20Hours: Number(row.overtime20Hours || 0),
      overtime30Hours: Number(row.overtime30Hours || 0),
      overtimeTotalHours: Number(row.overtimeTotalHours || 0),
      leaveHours: Number(row.leaveHours || 0),
      annualLeaveHours: Number(row.annualLeaveHours || 0),
      sickLeaveHours: Number(row.sickLeaveHours || 0),
    }));
}

function barDataItem(value, color, row = {}, itemStyle = {}) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const isNegative = number < 0;
  return {
    value: round(number, 1),
    itemStyle: ytdBarItemStyle(row, {
      ...itemStyle,
      color,
      opacity: 0.88,
      borderRadius: isNegative ? [0, 0, 5, 5] : [5, 5, 0, 0],
    }),
    label: {
      position: isNegative ? "bottom" : "top",
      distance: 6,
    },
  };
}

function ytdBarDataItem(row, value, color, itemStyle = {}) {
  if (!isYtdLikeRow(row)) return value;
  return {
    value,
    itemStyle: ytdBarItemStyle(row, { ...itemStyle, color }),
  };
}

function averageEfficiency(rows, field) {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function averageValues(rows, field) {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function marker(color) {
  return `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:9px;height:9px;background:${color};"></span>`;
}

function chartLabel(row) {
  return row.displayLabel || row.month || row.label || "";
}

function formatWorkloadTooltip(params) {
  const items = Array.isArray(params) ? params : [params];
  const row = workloadChartRows.value[items[0]?.dataIndex] || {};
  const total = piNumerator(row);
  const percent = (field) => (total > 0 ? (Number(row[field] || 0) / total) : 0);
  return [
    chartLabel(row),
    `${marker(metricColors.pm01)}PM01 ${formatHours(row.pm01Hours)} (${formatPercent(percent("pm01Hours"))})`,
    `${marker(metricColors.pm03)}PM03 ${formatHours(row.pm03Hours)} (${formatPercent(percent("pm03Hours"))})`,
    `${marker(metricColors.transfer)}转移工时 ${formatHours(row.transferHours)} (${formatPercent(percent("transferHours"))})`,
    `${marker(metricColors.attendance)}出勤时间 ${formatHours(row.attendanceHours)}`,
    `接单 ${formatNumber(row.orderCount)}`,
    row.isYtd ? `统计月数 ${formatNumber(row.sourceMonthCount)} 月` : "",
  ].filter(Boolean).join("<br/>");
}

function formatEfficiencyTooltip(params) {
  const items = Array.isArray(params) ? params : [params];
  const row = efficiencyChartRows.value[items[0]?.dataIndex] || {};
  return [
    row.label || "",
    ...items.map((item) => `${marker(item.color)}${item.seriesName} ${formatPercent(item.value)}`),
  ].join("<br/>");
}

function formatCompositeTooltip(params) {
  const items = Array.isArray(params) ? params : [params];
  const row = compositeRows.value[items[0]?.dataIndex] || {};
  return [
    row.month || row.label || "",
    `${marker(metricColors.composite)}综合工时 ${formatHours(row.compositeHours)}`,
    `${marker(metricColors.overtime15)}OT 1.5x ${formatHours(row.overtime15Hours)}`,
    `${marker(metricColors.overtime20)}OT 2x ${formatHours(row.overtime20Hours)}`,
    `${marker(metricColors.leave)}请假 ${formatHours(Math.abs(Number(row.leaveHours || 0)))}`,
  ].join("<br/>");
}

function baseAxisOption(rows = detailChartRows.value) {
  return {
    tooltip: { trigger: "axis", backgroundColor: "#18212d", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { top: 0, right: 0, textStyle: { color: "#5b6472" } },
    grid: { left: 48, right: 64, top: 38, bottom: 36 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.label),
      axisTick: { show: false },
      axisLabel: {
        color: "#6c7583",
        hideOverlap: true,
        interval: (index) => shouldShowDetailAxisLabel(rows, index),
        rotate: rows.length > 14 && rows.length <= 24 ? 24 : 0,
      },
    },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#ecf0f4" } }, axisLabel: { color: "#6c7583" } },
  };
}

function compositeAxisOption() {
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#18212d",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: formatCompositeTooltip,
    },
    legend: { top: 0, right: 0, textStyle: { color: "#5b6472" } },
    grid: { left: 48, right: 36, top: 42, bottom: 42 },
    xAxis: {
      type: "category",
      data: compositeRows.value.map((item) => item.label),
      axisTick: { show: false },
      axisLabel: {
        color: "#6c7583",
        hideOverlap: true,
        interval: (index) => shouldShowDetailAxisLabel(compositeRows.value, index),
        rotate: compositeRows.value.length > 14 && compositeRows.value.length <= 24 ? 24 : 0,
      },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#ecf0f4" } },
      axisLabel: { color: "#6c7583", formatter: (value) => formatInteger(value) },
    },
  };
}

function baseMttrAxisOption(rows = mttrChartRows.value) {
  return {
    tooltip: { trigger: "axis", backgroundColor: "#18212d", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { top: 0, right: 0, textStyle: { color: "#5b6472" } },
    grid: { left: 48, right: 52, top: 42, bottom: 42 },
    xAxis: {
      type: "category",
      data: rows.map((item) => item.label),
      axisTick: { show: false },
      axisLabel: {
        color: "#6c7583",
        hideOverlap: true,
        interval: (index) => shouldShowDetailAxisLabel(rows, index),
        rotate: rows.length > 14 && rows.length <= 24 ? 24 : 0,
      },
    },
    yAxis: { type: "value", min: 0, splitLine: { lineStyle: { color: "#ecf0f4" } }, axisLabel: { color: "#6c7583" } },
  };
}

function shouldShowDetailAxisLabel(rows, index) {
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

function detailGroupedBarWidth(rows) {
  if (rows.length <= 4) return "22%";
  if (rows.length <= 8) return "18%";
  if (rows.length <= 28) return "14%";
  return "10%";
}

function detailStackedBarWidth(rows) {
  if (rows.length <= 4) return "72%";
  if (rows.length <= 8) return "64%";
  if (rows.length <= 28) return "52%";
  return "40%";
}

function improvementAxisOption(valueFormatter = formatNumber) {
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#18212d",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];
        const row = improvementRows.value[items[0]?.dataIndex] || {};
        return [
          row.month || row.label || "",
          ...items.map((item) => `${marker(item.color)}${item.seriesName} ${valueFormatter(item.value)}`),
        ].join("<br/>");
      },
    },
    legend: { top: 0, right: 0, textStyle: { color: "#5b6472" } },
    grid: { left: 52, right: 36, top: 42, bottom: 42 },
    xAxis: {
      type: "category",
      data: improvementRows.value.map((item) => item.label),
      axisTick: { show: false },
      axisLabel: {
        color: "#6c7583",
        hideOverlap: true,
        interval: (index) => shouldShowDetailAxisLabel(improvementRows.value, index),
        rotate: improvementRows.value.length > 14 && improvementRows.value.length <= 24 ? 24 : 0,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      splitLine: { lineStyle: { color: "#ecf0f4" } },
      axisLabel: { color: "#6c7583", formatter: valueFormatter },
    },
  };
}

const improvementCountOption = computed(() => ({
  ...improvementAxisOption(formatNumber),
  color: [metricColors.nearMiss, metricColors.pdca, metricColors.kaizen],
  series: [
    {
      name: "Near miss",
      type: "bar",
      stack: "count",
      data: improvementRows.value.map((item) => item.nearMissCount),
      barWidth: detailStackedBarWidth(improvementRows.value),
      barMaxWidth: 80,
      itemStyle: { color: metricColors.nearMiss, opacity: 0.88, borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "PDCA",
      type: "bar",
      stack: "count",
      data: improvementRows.value.map((item) => item.pdcaCount),
      itemStyle: { color: metricColors.pdca, opacity: 0.9, borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "Kaizen",
      type: "bar",
      stack: "count",
      data: improvementRows.value.map((item) => item.kaizenCount),
      itemStyle: { color: metricColors.kaizen, opacity: 0.88, borderRadius: [5, 5, 0, 0], borderColor: "#fff", borderWidth: 1 },
    },
  ],
}));

const improvementBenefitOption = computed(() => ({
  ...improvementAxisOption(formatMoney),
  color: [metricColors.nearMiss, metricColors.pdca, metricColors.kaizen],
  series: [
    {
      name: "Near miss",
      type: "bar",
      stack: "money",
      data: improvementRows.value.map((item) => item.nearMissBenefit),
      barWidth: detailStackedBarWidth(improvementRows.value),
      barMaxWidth: 80,
      itemStyle: { color: metricColors.nearMiss, opacity: 0.88, borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "PDCA",
      type: "bar",
      stack: "money",
      data: improvementRows.value.map((item) => item.pdcaBenefit),
      itemStyle: { color: metricColors.pdca, opacity: 0.9, borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "Kaizen",
      type: "bar",
      stack: "money",
      data: improvementRows.value.map((item) => item.kaizenBenefit),
      itemStyle: { color: metricColors.kaizen, opacity: 0.88, borderRadius: [5, 5, 0, 0], borderColor: "#fff", borderWidth: 1 },
    },
  ],
}));

const compositeTrendOption = computed(() => ({
  ...compositeAxisOption(),
  color: [metricColors.composite],
  series: [
    {
      name: "综合工时",
      type: "bar",
      data: compositeRows.value.map((item) => barDataItem(item.compositeHours, metricColors.composite)),
      barWidth: detailStackedBarWidth(compositeRows.value),
      barMaxWidth: 72,
      barCategoryGap: "14%",
      label: {
        show: true,
        color: "#465160",
        fontSize: 10,
        formatter: (params) => formatInteger(params.value),
      },
      labelLayout: { hideOverlap: true },
      emphasis: { focus: "series" },
    },
  ],
}));

const compositeBreakdownOption = computed(() => ({
  ...compositeAxisOption(),
  color: [metricColors.overtime15, metricColors.overtime20, metricColors.leave],
  series: [
    {
      name: "OT 1.5x",
      type: "bar",
      stack: "ot",
      data: compositeRows.value.map((item) => round(item.overtime15Hours, 1)),
      barWidth: detailStackedBarWidth(compositeRows.value),
      barMaxWidth: 82,
      itemStyle: { color: metricColors.overtime15, opacity: 0.88, borderRadius: [0, 0, 5, 5], borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "OT 2x",
      type: "bar",
      stack: "ot",
      data: compositeRows.value.map((item) => round(item.overtime20Hours, 1)),
      itemStyle: { color: metricColors.overtime20, opacity: 0.9, borderRadius: [5, 5, 0, 0], borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "请假",
      type: "bar",
      data: compositeRows.value.map((item) => barDataItem(-Math.abs(item.leaveHours), metricColors.leave)),
      barWidth: detailGroupedBarWidth(compositeRows.value),
      barMaxWidth: 42,
      itemStyle: { color: metricColors.leave, opacity: 0.82 },
    },
  ],
}));

const efficiencyCompareOption = computed(() => ({
  ...baseAxisOption(efficiencyChartRows.value),
  color: [metricColors.pi, "#007bc0"],
  tooltip: { trigger: "axis", axisPointer: { type: "cross" }, backgroundColor: "#18212d", borderWidth: 0, textStyle: { color: "#fff" }, formatter: formatEfficiencyTooltip },
  grid: { left: 48, right: 64, top: 42, bottom: 42 },
  yAxis: { type: "value", min: 0, splitLine: { lineStyle: { color: "#ecf0f4" } }, axisLabel: { color: "#6c7583", formatter: (value) => formatPercent(value, 0) } },
  series: [
    {
      name: "个人",
      type: "bar",
      barWidth: detailGroupedBarWidth(efficiencyChartRows.value),
      barMaxWidth: 34,
      barGap: "16%",
      barCategoryGap: "24%",
      itemStyle: { borderRadius: [5, 5, 0, 0], opacity: 0.9 },
      data: efficiencyChartRows.value.map((item) => {
        if (!item.repairEfficiency) return null;
        const color = item.repairEfficiency >= (item.departmentAvgRepairEfficiency || item.shiftAvgRepairEfficiency || 0) ? "#3b8b69" : "#c49a3a";
        return { value: item.repairEfficiency, itemStyle: ytdBarItemStyle(item, { color }) };
      }),
    },
    {
      name: "部门均值",
      type: "line",
      smooth: false,
      symbolSize: 6,
      connectNulls: false,
      lineStyle: { color: "#007bc0", width: 2.2, opacity: 0.86 },
      itemStyle: { color: "#007bc0", borderColor: "#fff", borderWidth: 1.5 },
      data: efficiencyChartRows.value.map((item) => (item.departmentAvgRepairEfficiency || item.shiftAvgRepairEfficiency) || null),
      z: 4,
    },
  ],
}));

const workloadOption = computed(() => ({
  ...baseAxisOption(workloadChartRows.value),
  color: [metricColors.pm01, metricColors.pm03, metricColors.transfer, metricColors.attendance],
  tooltip: { trigger: "axis", backgroundColor: "#18212d", borderWidth: 0, textStyle: { color: "#fff" }, formatter: formatWorkloadTooltip },
  grid: { left: 48, right: 52, top: 42, bottom: 42 },
  yAxis: { type: "value", min: 0, splitLine: { lineStyle: { color: "#ecf0f4" } }, axisLabel: { color: "#6c7583", formatter: (value) => formatInteger(value) } },
  series: [
    {
      name: "PM01",
      type: "bar",
      stack: "work",
      data: workloadChartRows.value.map((item) => ytdBarDataItem(item, round(item.pm01Hours, 0), metricColors.pm01, { opacity: 0.9, borderRadius: [0, 0, 4, 4], borderColor: "#fff", borderWidth: 1 })),
      barWidth: detailStackedBarWidth(workloadChartRows.value),
      barMaxWidth: 96,
      barCategoryGap: "14%",
      itemStyle: { color: metricColors.pm01, opacity: 0.9, borderRadius: [0, 0, 4, 4], borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "PM03",
      type: "bar",
      stack: "work",
      data: workloadChartRows.value.map((item) => ytdBarDataItem(item, round(item.pm03Hours, 0), metricColors.pm03, { opacity: 0.88, borderColor: "#fff", borderWidth: 1 })),
      itemStyle: { color: metricColors.pm03, opacity: 0.88, borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "转移工时",
      type: "bar",
      stack: "work",
      data: workloadChartRows.value.map((item) => ytdBarDataItem(item, round(item.transferHours, 0), metricColors.transfer, { opacity: 0.9, borderRadius: [4, 4, 0, 0], borderColor: "#fff", borderWidth: 1 })),
      label: {
        show: true,
        position: "top",
        color: "#465160",
        fontSize: 10,
        formatter: (params) => formatInteger(piNumerator(workloadChartRows.value[params.dataIndex] || {})),
      },
      itemStyle: { color: metricColors.transfer, opacity: 0.9, borderRadius: [4, 4, 0, 0], borderColor: "#fff", borderWidth: 1 },
    },
    {
      name: "出勤时间",
      type: "line",
      smooth: false,
      symbolSize: 5,
      lineStyle: { width: 2.2, color: metricColors.attendance, opacity: 0.86 },
      itemStyle: { color: metricColors.attendance, borderColor: "#fff", borderWidth: 1.5 },
      data: workloadChartRows.value.map((item) => round(item.attendanceHours, 0)),
      z: 4,
    },
  ],
}));

const mttrTrendOption = computed(() => ({
  ...baseMttrAxisOption(),
  color: ["#256d9f"],
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    backgroundColor: "#18212d",
    borderWidth: 0,
    textStyle: { color: "#fff" },
    formatter: (params) => {
      const items = Array.isArray(params) ? params : [params];
      const row = mttrChartRows.value[items[0]?.dataIndex] || {};
      return [
        chartLabel(row),
        `${marker("#256d9f")}MTTR ${formatMinutes(row.mttrMinutes)}`,
        row.isAnnual ? `统计月数 ${formatNumber(row.sourceMonthCount)} 月` : "",
      ].filter(Boolean).join("<br/>");
    },
  },
  yAxis: { type: "value", min: 0, splitLine: { lineStyle: { color: "#ecf0f4" } }, axisLabel: { color: "#6c7583" } },
  series: [
    {
      name: "MTTR",
      type: "bar",
      data: mttrChartRows.value.map((item) => round(item.mttrMinutes, 1)),
      barWidth: detailStackedBarWidth(mttrChartRows.value),
      barMaxWidth: 72,
      barCategoryGap: "14%",
      itemStyle: { color: "#256d9f", borderRadius: [5, 5, 0, 0], opacity: 0.88 },
      label: {
        show: true,
        position: "top",
        color: "#465160",
        fontSize: 10,
        formatter: (params) => formatDecimal(params.value, 1),
      },
    },
  ],
}));

const mttrContextOption = computed(() => ({
  ...baseMttrAxisOption(),
  color: ["#18837e", "#7d8794"],
  tooltip: {
    trigger: "axis",
    backgroundColor: "#18212d",
    borderWidth: 0,
    textStyle: { color: "#fff" },
    formatter: (params) => {
      const items = Array.isArray(params) ? params : [params];
      const row = mttrChartRows.value[items[0]?.dataIndex] || {};
      return [
        chartLabel(row),
        `${marker("#18837e")}接单 ${formatNumber(row.orderCount)}`,
        `${marker("#7d8794")}维修工时 ${formatHours(row.repairHours)}`,
        row.isAnnual ? `统计月数 ${formatNumber(row.sourceMonthCount)} 月` : "",
      ].filter(Boolean).join("<br/>");
    },
  },
  yAxis: [
    { type: "value", min: 0, splitLine: { lineStyle: { color: "#ecf0f4" } }, axisLabel: { color: "#6c7583" } },
    { type: "value", min: 0, splitLine: { show: false }, axisLabel: { color: "#6c7583", formatter: (value) => formatInteger(value) } },
  ],
  series: [
    {
      name: "接单",
      type: "bar",
      data: mttrChartRows.value.map((item) => Math.round(item.orderCount)),
      barWidth: detailGroupedBarWidth(mttrChartRows.value),
      barMaxWidth: 48,
      itemStyle: { color: "#18837e", borderRadius: [5, 5, 0, 0], opacity: 0.82 },
    },
    {
      name: "维修工时",
      type: "line",
      yAxisIndex: 1,
      smooth: false,
      symbolSize: 5,
      lineStyle: { width: 2.2, color: "#7d8794", opacity: 0.86 },
      itemStyle: { color: "#7d8794", borderColor: "#fff", borderWidth: 1.5 },
      data: mttrChartRows.value.map((item) => round(item.repairHours, 1)),
    },
  ],
}));

</script>
