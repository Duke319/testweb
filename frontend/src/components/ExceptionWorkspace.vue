<template>
  <section class="exception-workspace-shell" aria-label="异常">
    <section class="exception-summary-row authenticity-summary-row" aria-label="数据真实性概览">
      <div class="authenticity-metric" :class="batchStatusClass">
        <span>批次状态</span>
        <strong>{{ batchStatusLabel }}</strong>
        <small>{{ dataQualitySummary.policy || "异常不修正、不计入计算" }}</small>
      </div>
      <div class="authenticity-metric">
        <span>隔离记录</span>
        <strong>{{ formatNumber(dataQualitySummary.filteredQuarantinedRecords ?? dataQualitySummary.quarantinedRecords) }}</strong>
        <small>Critical {{ formatNumber(dataQualitySummary.criticalCount) }}</small>
      </div>
      <div class="authenticity-metric">
        <span>有效绩效记录</span>
        <strong>{{ formatNumber(dataQualitySummary.validRecords) }}</strong>
        <small>总记录 {{ formatNumber(dataQualitySummary.totalRecords) }}</small>
      </div>
      <div class="authenticity-metric">
        <span>来源覆盖</span>
        <strong>{{ sourceLedgerCount }}</strong>
        <small>{{ sourceCoverage.servingSource || "json" }} 服务口径</small>
      </div>
    </section>

    <div class="exception-grid">
      <article class="data-panel exception-card exception-card-wide">
        <div class="panel-head">
          <div>
            <span class="section-label">真实性</span>
            <h3>异常隔离队列</h3>
          </div>
          <strong>{{ formatNumber(authenticityAnomalies.length) }}</strong>
        </div>
        <div v-if="anomalyTypeSummary.length" class="exception-year-strip">
          <button type="button" :class="{ active: !authenticityType }" @click="authenticityType = ''">
            <span>全部</span>
            <strong>{{ formatNumber(authenticityAnomalies.length) }}</strong>
          </button>
          <button
            v-for="typeRow in anomalyTypeSummary"
            :key="typeRow.key"
            type="button"
            :class="{ active: authenticityType === typeRow.key }"
            @click="authenticityType = typeRow.key"
          >
            <span>{{ anomalyTypeLabel(typeRow.key) }}</span>
            <strong>{{ formatNumber(typeRow.count) }}</strong>
          </button>
        </div>
        <div v-if="filteredAuthenticityAnomalies.length" class="exception-list authenticity-list">
          <component
            :is="record.employeeKey ? 'button' : 'div'"
            v-for="record in filteredAuthenticityAnomalies"
            :key="record.id"
            class="exception-row"
            :class="{ static: !record.employeeKey }"
            :type="record.employeeKey ? 'button' : undefined"
            @click="selectAuthenticityRecord(record)"
          >
            <span>
              <strong>{{ record.employeeName || record.metric || anomalyTypeLabel(record.type) }}</strong>
              <small>{{ authenticityRecordMeta(record) }}</small>
            </span>
            <i :class="record.severity === 'critical' ? 'over' : 'warning'">{{ severityLabel(record.severity) }}</i>
          </component>
        </div>
        <div v-else class="empty-state">暂无真实性隔离记录</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">缺口</span>
            <h3>数据缺口清单</h3>
          </div>
          <strong>{{ formatNumber(gapRows.length) }}</strong>
        </div>
        <div v-if="gapRows.length" class="exception-list">
          <div v-for="row in gapRows.slice(0, 12)" :key="`${row.module}-${row.item}`" class="exception-row static gap-row">
            <span>
              <strong>{{ row.item }}</strong>
              <small>{{ [row.module, row.need, row.sourceStatus].filter(Boolean).join(" · ") }}</small>
            </span>
            <i :class="row.severity === 'critical' ? 'over' : row.severity === 'major' ? 'warning' : 'missing'">{{ row.category }}</i>
          </div>
        </div>
        <div v-else class="empty-state">暂无缺口</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">来源</span>
            <h3>数据源总账</h3>
          </div>
          <strong>{{ sourceLedgerCount }}</strong>
        </div>
        <div v-if="sourceLedgers.length" class="exception-list">
          <div v-for="source in sourceLedgers" :key="source.id" class="exception-row static source-row">
            <span>
              <strong>{{ source.name }}</strong>
              <small>{{ [source.source, source.note].filter(Boolean).join(" · ") }}</small>
            </span>
            <i :class="source.status === '异常隔离' ? 'over' : source.status === '缺失' ? 'missing' : 'warning'">{{ source.status }}</i>
          </div>
        </div>
        <div v-else class="empty-state">暂无来源总账</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">工时</span>
            <h3>综合工时预警</h3>
          </div>
        </div>
        <div v-if="compositeRisks.length" class="exception-list">
          <button
            v-for="employee in compositeRisks"
            :key="employee.employeeKey"
            class="exception-row"
            type="button"
            @click="$emit('select-employee', employee.employeeKey)"
          >
            <span>
              <strong>{{ employee.employeeName }}</strong>
              <small>{{ employeeMeta(employee) }} · OT {{ formatHours(employee.overtimeTotalHours) }}</small>
            </span>
            <i :class="employee.compositeRisk">{{ formatHours(displayCompositeHours(employee)) }}</i>
          </button>
        </div>
        <div v-else class="empty-state">暂无预警</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">数据</span>
            <h3>维修工时数据异常</h3>
          </div>
          <strong>{{ formatNumber(repairHoursQualityRecords.length) }}</strong>
        </div>
        <div v-if="repairHoursQualityRecords.length" class="exception-list">
          <button
            v-for="record in repairHoursQualityRecords"
            :key="record.id"
            class="exception-row"
            type="button"
            @click="selectRepairHoursRecord(record)"
          >
            <span>
              <strong>{{ record.employeeName || "未登记技工" }}</strong>
              <small>{{ repairHoursRecordMeta(record) }}</small>
            </span>
            <i class="over">{{ formatHours(displayRepairHoursSource(record)) }}</i>
          </button>
        </div>
        <div v-else class="empty-state">暂无维修工时数据异常</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">维修</span>
            <h3>MTTR &gt; {{ formatNumber(mttrThreshold) }} min</h3>
          </div>
          <strong>{{ formatNumber(mttrAnomalyRecords.length) }}</strong>
        </div>
        <div class="exception-filter-row">
          <label>
            <span>阈值</span>
            <select v-model.number="mttrThreshold">
              <option v-for="threshold in mttrThresholdOptions" :key="threshold" :value="threshold">大于 {{ formatNumber(threshold) }} min</option>
            </select>
          </label>
          <label>
            <span>年份</span>
            <select v-model="mttrYear">
              <option value="">全部年份</option>
              <option v-for="year in mttrYearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </label>
        </div>
        <div v-if="mttrYearSummary.length" class="exception-year-strip">
          <button type="button" :class="{ active: !mttrYear }" @click="mttrYear = ''">
            <span>全部</span>
            <strong>{{ formatNumber(mttrYearSummaryTotal) }}</strong>
          </button>
          <button
            v-for="yearRow in mttrYearSummary"
            :key="yearRow.year"
            type="button"
            :class="{ active: mttrYear === yearRow.year }"
            @click="mttrYear = yearRow.year"
          >
            <span>{{ yearRow.year }}</span>
            <strong>{{ formatNumber(yearRow.count) }}</strong>
          </button>
        </div>
        <div v-if="mttrAnomalyRecords.length" class="exception-list">
          <component
            :is="record.employeeKey ? 'button' : 'div'"
            v-for="record in mttrAnomalyRecords"
            :key="record.id"
            class="exception-row"
            :class="{ static: !record.employeeKey }"
            :type="record.employeeKey ? 'button' : undefined"
            @click="selectMttrRecord(record)"
          >
            <span>
              <strong>{{ record.employeeName || "未登记技工" }}</strong>
              <small>{{ mttrRecordMeta(record) }}</small>
            </span>
            <i class="over">{{ formatMinutes(displayMttrMinutes(record)) }}</i>
          </component>
        </div>
        <div v-else class="empty-state">暂无超过 {{ formatNumber(mttrThreshold) }} min 的 MTTR 记录</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">维修</span>
            <h3>维修时间 &gt; {{ formatNumber(repairTimeThreshold) }} min</h3>
          </div>
          <strong>{{ formatNumber(repairTimeAnomalyRecords.length) }}</strong>
        </div>
        <div class="exception-filter-row">
          <label>
            <span>阈值</span>
            <select v-model.number="repairTimeThreshold">
              <option v-for="threshold in repairTimeThresholdOptions" :key="threshold" :value="threshold">大于 {{ formatNumber(threshold) }} min</option>
            </select>
          </label>
          <label>
            <span>年份</span>
            <select v-model="repairTimeYear">
              <option value="">全部年份</option>
              <option v-for="year in repairTimeYearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </label>
        </div>
        <div v-if="repairTimeYearSummary.length" class="exception-year-strip">
          <button type="button" :class="{ active: !repairTimeYear }" @click="repairTimeYear = ''">
            <span>全部</span>
            <strong>{{ formatNumber(repairTimeYearSummaryTotal) }}</strong>
          </button>
          <button
            v-for="yearRow in repairTimeYearSummary"
            :key="yearRow.year"
            type="button"
            :class="{ active: repairTimeYear === yearRow.year }"
            @click="repairTimeYear = yearRow.year"
          >
            <span>{{ yearRow.year }}</span>
            <strong>{{ formatNumber(yearRow.count) }}</strong>
          </button>
        </div>
        <div v-if="repairTimeAnomalyRecords.length" class="exception-list">
          <component
            :is="record.employeeKey ? 'button' : 'div'"
            v-for="record in repairTimeAnomalyRecords"
            :key="record.id"
            class="exception-row"
            :class="{ static: !record.employeeKey }"
            :type="record.employeeKey ? 'button' : undefined"
            @click="selectRepairTimeRecord(record)"
          >
            <span>
              <strong>{{ record.employeeName || record.technician || "未登记技工" }}</strong>
              <small>{{ repairRecordMeta(record) }}</small>
            </span>
            <i class="over">{{ formatMinutes(record.repairTimeMinutes) }}</i>
          </component>
        </div>
        <div v-else class="empty-state">暂无超过 {{ formatNumber(repairTimeThreshold) }} min 的维修记录</div>
      </article>

    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { formatHours, formatInteger, formatMinutes } from "../utils/numberFormat";

const props = defineProps({
  employees: { type: Array, default: () => [] },
  rawRecords: { type: Array, default: () => [] },
  repairTimeAnomalies: { type: Object, default: () => ({ source: {}, summary: {}, records: [] }) },
  dataAuthenticity: { type: Object, default: () => ({ summary: {}, sourceCoverage: { ledgers: [], totals: {} }, gapChecklist: { rows: [] }, importBatches: [], anomalies: [] }) },
  summary: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["select-employee"]);
const authenticityType = ref("");
const mttrThreshold = ref(120);
const mttrYear = ref("");
const repairTimeThreshold = ref(300);
const repairTimeYear = ref("");
const mttrThresholdOptions = [60, 90, 120, 180, 240, 300];
const repairTimeThresholdOptions = [300, 400, 500, 600, 800, 1000];
const dataQualitySummary = computed(() => props.dataAuthenticity.summary || {});
const sourceCoverage = computed(() => props.dataAuthenticity.sourceCoverage || { ledgers: [], totals: {} });
const sourceLedgers = computed(() => sourceCoverage.value.ledgers || []);
const sourceLedgerCount = computed(() => formatNumber(sourceLedgers.value.length));
const gapRows = computed(() => props.dataAuthenticity.gapChecklist?.rows || []);
const authenticityAnomalies = computed(() => props.dataAuthenticity.anomalies || []);
const anomalyTypeSummary = computed(() => {
  const groups = new Map();
  authenticityAnomalies.value.forEach((record) => {
    const key = record.type || "data_quality";
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  return [...groups.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count);
});
const filteredAuthenticityAnomalies = computed(() =>
  authenticityAnomalies.value
    .filter((record) => !authenticityType.value || record.type === authenticityType.value)
    .slice(0, 80)
);
const batchStatusLabel = computed(() => {
  const status = dataQualitySummary.value.batchStatus || props.dataAuthenticity.importBatches?.[0]?.status || "";
  return {
    blocked: "Blocked",
    published: "Published",
    publishable: "Publishable",
    created: "Created",
  }[status] || status || "Unknown";
});
const batchStatusClass = computed(() => {
  const status = dataQualitySummary.value.batchStatus || props.dataAuthenticity.importBatches?.[0]?.status || "";
  return status === "blocked" ? "danger" : status ? "good" : "warning";
});

const compositeRisks = computed(() =>
  [...props.employees]
    .filter((employee) => employee.compositeRisk !== "ok")
    .sort((left, right) => Number(displayCompositeHours(right) || 0) - Number(displayCompositeHours(left) || 0))
);

const mttrSourceRecords = computed(() => {
  const rawRows = (props.rawRecords || [])
    .map(normalizeMttrRecord)
    .filter(Boolean);
  if (rawRows.length) return rawRows;

  return (props.employees || [])
    .map((employee, index) => normalizeEmployeeMttrRecord(employee, index))
    .filter(Boolean);
});
const mttrYearOptions = computed(() =>
  [...new Set(mttrSourceRecords.value.map((record) => String(record.year || "")).filter(Boolean))]
    .sort((left, right) => Number(left) - Number(right))
);
const mttrYearSummary = computed(() => {
  const groups = new Map();
  mttrSourceRecords.value
    .filter((record) => Number(displayMttrMinutes(record) || 0) > mttrThreshold.value)
    .forEach((record) => {
      const year = String(record.year || "");
      if (!year) return;
      groups.set(year, (groups.get(year) || 0) + 1);
    });
  return [...groups.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((left, right) => Number(left.year) - Number(right.year));
});
const mttrYearSummaryTotal = computed(() =>
  mttrYearSummary.value.reduce((total, row) => total + Number(row.count || 0), 0)
);
const mttrAnomalyRecords = computed(() =>
  mttrSourceRecords.value
    .filter((record) => Number(displayMttrMinutes(record) || 0) > mttrThreshold.value)
    .filter((record) => !mttrYear.value || String(record.year || "") === mttrYear.value)
    .sort((left, right) => Number(displayMttrMinutes(right) || 0) - Number(displayMttrMinutes(left) || 0))
);
const repairHoursQualityRecords = computed(() =>
  (props.rawRecords || [])
    .filter((record) => record.repairHoursQualityReason || record.repairHoursQualityIssue || Number(record.repairHoursSourceValue || 0) > 0)
    .map((record, index) => ({
      ...record,
      id: `repair-hours-quality-${record.id || record.employeeKey || index}-${record.month || index}`,
    }))
    .sort((left, right) => displayRepairHoursSource(right) - displayRepairHoursSource(left))
);
const repairTimeSourceRecords = computed(() => props.repairTimeAnomalies.records || []);
const repairTimeYearOptions = computed(() =>
  [...new Set(repairTimeSourceRecords.value.map((record) => String(record.year || "")).filter(Boolean))]
    .sort((left, right) => Number(left) - Number(right))
);
const repairTimeYearSummary = computed(() => {
  const groups = new Map();
  repairTimeSourceRecords.value
    .filter((record) => Number(record.repairTimeMinutes || 0) > repairTimeThreshold.value)
    .forEach((record) => {
      const year = String(record.year || "");
      if (!year) return;
      groups.set(year, (groups.get(year) || 0) + 1);
    });
  return [...groups.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((left, right) => Number(left.year) - Number(right.year));
});
const repairTimeYearSummaryTotal = computed(() =>
  repairTimeYearSummary.value.reduce((total, row) => total + Number(row.count || 0), 0)
);
const repairTimeAnomalyRecords = computed(() =>
  repairTimeSourceRecords.value
    .filter((record) => Number(record.repairTimeMinutes || 0) > repairTimeThreshold.value)
    .filter((record) => !repairTimeYear.value || String(record.year || "") === repairTimeYear.value)
    .sort(
      (left, right) => Number(right.repairTimeMinutes || 0) - Number(left.repairTimeMinutes || 0)
    )
);

function formatNumber(value) {
  return formatInteger(value);
}

function severityLabel(value) {
  return {
    critical: "阻断",
    major: "待复核",
    warning: "预警",
    info: "记录",
  }[value] || "待复核";
}

function anomalyTypeLabel(type) {
  return {
    zero_attendance_with_work: "0出勤有工作量",
    repair_hours_exceed_attendance: "维修>出勤",
    repair_hours_quality: "维修工时异常",
    mttr_quality: "MTTR异常",
    transfer_unconfirmed: "转移未确认",
    pm_split_unconfirmed: "PM拆分待确认",
    certificate_missing_expiry: "证书缺编号/到期",
    employee_identity_missing_no: "缺工号",
    improvement_not_approved: "改善未审批",
    improvement_employee_unmatched: "改善归属缺失",
    repair_time_over_threshold: "维修时间超阈值",
    missing_month_performance: "月份缺失",
  }[type] || type || "数据异常";
}

function authenticityRecordMeta(record) {
  return [
    anomalyTypeLabel(record.type),
    record.reason,
    record.month,
    record.department || record.businessArea,
    sourceLocation(record),
  ].filter(Boolean).join(" · ") || "-";
}

function sourceLocation(record) {
  const source = record.sourceFile || record.provenance?.sourceFile || "";
  const row = record.sourceRow || record.provenance?.sourceRow || "";
  if (source && row) return `${source}:${row}`;
  return source;
}

function repairRecordMeta(record) {
  return [
    record.positionTitle || record.jobTitle || record.role,
    record.recordDate || record.month,
    record.valueStream,
    record.productionLine,
    record.equipmentName,
  ].filter(Boolean).join(" · ") || "-";
}

function mttrRecordMeta(record) {
  return [
    record.mttrQualityIssue ? "源记录错误" : "",
    record.positionTitle || record.jobTitle || record.role,
    record.recordDate || record.month,
    record.department || record.businessArea,
    record.mttrSourceMaxDayValue ? `单日 ${formatMinutes(record.mttrSourceMaxDayValue)}` : "",
    record.valueStream,
    record.productionLine,
    record.equipmentName,
  ].filter(Boolean).join(" · ") || "-";
}

function repairHoursRecordMeta(record) {
  return [
    repairHoursQualityReasonLabel(record),
    record.positionTitle || record.jobTitle || record.role,
    record.month,
    record.department || record.businessArea,
    repairHoursQualityThresholdLabel(record),
  ].filter(Boolean).join(" · ") || "-";
}

function repairHoursQualityReasonLabel(record) {
  const reason = String(record.repairHoursQualityReason || record.repairHoursQualityIssue?.reason || "");
  const exceedsP99 = reason.includes("repairHoursExceedsP99");
  const exceedsAttendance = reason.includes("repairHoursExceedsAttendanceHours");
  if (exceedsP99 && exceedsAttendance) {
    return "维修工时超过 P99 和出勤工时";
  }
  if (exceedsP99) {
    return "维修工时超过 P99";
  }
  if (exceedsAttendance) {
    return "维修工时超过出勤工时";
  }
  return "源记录错误";
}

function repairHoursQualityThresholdLabel(record) {
  const reason = String(record.repairHoursQualityReason || record.repairHoursQualityIssue?.reason || "");
  const labels = [];
  if (reason.includes("repairHoursExceedsP99") && record.repairHoursQualityThreshold) {
    labels.push(`P99 ${formatHours(record.repairHoursQualityThreshold)}`);
  }
  if (reason.includes("repairHoursExceedsAttendanceHours")) {
    labels.push(`出勤 ${formatHours(record.repairHoursQualityIssue?.attendanceHours || record.attendanceHours)}`);
  }
  return labels.join(" · ");
}

function employeeMeta(employee) {
  return [
    employee.department || employee.businessArea,
    employee.positionTitle || employee.jobTitle || employee.role,
  ].filter(Boolean).join(" · ") || "-";
}

function normalizeMttrRecord(record, index) {
  const mttrMinutes = Number(record.mttrMinutes);
  const mttrSourceValue = Number(record.mttrSourceValue);
  const hasMttr = Number.isFinite(mttrMinutes) && mttrMinutes > 0;
  const hasSourceError = record.mttrQualityIssue && Number.isFinite(mttrSourceValue) && mttrSourceValue > 0;
  if (!hasMttr && !hasSourceError) return null;
  const year = resolveRecordYear(record);
  return {
    ...record,
    id: `mttr-${record.id || record.employeeKey || index}-${record.month || year || index}`,
    mttrMinutes: hasMttr ? mttrMinutes : null,
    mttrSourceValue: hasSourceError ? mttrSourceValue : record.mttrSourceValue,
    year,
  };
}

function normalizeEmployeeMttrRecord(employee, index) {
  const mttrMinutes = Number(employee.mttrMinutes);
  const mttrSourceValue = Number(employee.mttrSourceValue);
  const hasMttr = Number.isFinite(mttrMinutes) && mttrMinutes > 0;
  const hasSourceError = employee.mttrQualityIssue && Number.isFinite(mttrSourceValue) && mttrSourceValue > 0;
  if (!hasMttr && !hasSourceError) return null;
  return {
    ...employee,
    id: `employee-mttr-${employee.employeeKey || index}`,
    mttrMinutes: hasMttr ? mttrMinutes : null,
    mttrSourceValue: hasSourceError ? mttrSourceValue : employee.mttrSourceValue,
    year: String(employee.year || ""),
  };
}

function displayMttrMinutes(record) {
  if (record.mttrQualityIssue && Number(record.mttrSourceValue) > 0) {
    return Number(record.mttrSourceValue);
  }
  return Number(record.mttrMinutes || 0);
}

function displayCompositeHours(employee) {
  return employee.annualCompositeHours ?? employee.compositeHours;
}

function displayRepairHoursSource(record) {
  return Number(record.repairHoursSourceValue || record.pm01HoursSourceValue || record.repairHours || 0);
}

function resolveRecordYear(record) {
  const explicitYear = String(record.year || "").trim();
  if (explicitYear) return explicitYear;
  const match = String(record.month || record.recordDate || "").match(/\b(20\d{2})\b/);
  return match ? match[1] : "";
}

function selectMttrRecord(record) {
  if (record.employeeKey) {
    emit("select-employee", record.employeeKey);
  }
}

function selectRepairTimeRecord(record) {
  if (record.employeeKey) {
    emit("select-employee", record.employeeKey);
  }
}

function selectRepairHoursRecord(record) {
  if (record.employeeKey) {
    emit("select-employee", record.employeeKey);
  }
}

function selectAuthenticityRecord(record) {
  if (record.employeeKey) {
    emit("select-employee", record.employeeKey);
  }
}
</script>
