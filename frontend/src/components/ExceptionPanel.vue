<template>
  <section class="exception-workspace" aria-label="异常记录">
    <div class="exception-summary-row">
      <MetricTile label="综合工时" :value="formatInteger(compositeRisks.length)" badge="432 h/考核年" note="临近或超限" :status="compositeRisks.length ? 'danger' : 'good'" />
      <MetricTile label="MTTR" :value="formatInteger(mttrRisks.length)" badge=">1,440 min" note="疑似异常记录" :status="mttrRisks.length ? 'danger' : 'good'" />
      <MetricTile label="证书" :value="formatInteger(certificateRisks.length)" badge="临期/过期/缺失" note="排班前检查" :status="certificateRisks.length ? 'warning' : 'good'" />
      <MetricTile label="数据质量" :value="formatInteger(dataQualityRisks.length)" badge="待核对" note="出勤与工单冲突" :status="dataQualityRisks.length ? 'warning' : 'good'" />
    </div>

    <div class="exception-grid">
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
              <small>{{ employee.department }} · OT {{ formatHours(employee.overtimeTotalHours) }}</small>
            </span>
            <i :class="employee.compositeRisk">{{ formatHours(displayCompositeHours(employee)) }}</i>
          </button>
        </div>
        <div v-else class="empty-state">暂无预警</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">维修</span>
            <h3>MTTR 异常</h3>
          </div>
        </div>
        <div v-if="mttrRisks.length" class="exception-list">
          <button
            v-for="employee in mttrRisks"
            :key="employee.employeeKey"
            class="exception-row"
            type="button"
            @click="$emit('select-employee', employee.employeeKey)"
          >
            <span>
              <strong>{{ employee.employeeName }}</strong>
              <small>{{ employee.department }} · 疑似日期填写错误</small>
            </span>
            <i class="over">{{ formatMinutes(employee.mttrMinutes) }}</i>
          </button>
        </div>
        <div v-else class="empty-state">暂无异常</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">能力</span>
            <h3>证书状态</h3>
          </div>
        </div>
        <div v-if="certificateRisks.length" class="exception-list">
          <button
            v-for="item in certificateRisks"
            :key="`${item.employeeKey}-${item.code}`"
            class="exception-row"
            type="button"
            @click="$emit('select-employee', item.employeeKey)"
          >
            <span>
              <strong>{{ item.employeeName }}</strong>
              <small>{{ item.department }} · {{ item.name }} {{ item.expireDate || "" }}</small>
            </span>
            <i :class="item.status">{{ statusText(item.status) }}</i>
          </button>
        </div>
        <div v-else class="empty-state">证书状态正常</div>
      </article>

      <article class="data-panel exception-card">
        <div class="panel-head">
          <div>
            <span class="section-label">数据</span>
            <h3>待核对记录</h3>
          </div>
        </div>
        <div v-if="dataQualityRisks.length" class="exception-list">
          <div v-for="record in dataQualityRisks" :key="record.id" class="exception-row static">
            <span>
              <strong>{{ record.employeeName }}</strong>
              <small>{{ record.month }} · 出勤 0 h，但存在维修或接单</small>
            </span>
            <i class="warning">{{ formatDecimal(record.orderCount, 1) }} 单</i>
          </div>
        </div>
        <div v-else class="empty-state">暂无待核对记录</div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import MetricTile from "./MetricTile.vue";
import { formatDecimal, formatHours, formatInteger, formatMinutes } from "../utils/numberFormat";

const props = defineProps({
  employees: { type: Array, default: () => [] },
  matrix: { type: Object, default: () => ({ certificateTypes: [], employees: [] }) },
  rawRecords: { type: Array, default: () => [] },
});

defineEmits(["select-employee"]);

const compositeRisks = computed(() =>
  [...props.employees]
    .filter((employee) => employee.compositeRisk !== "ok")
    .sort((left, right) => Number(displayCompositeHours(right) || 0) - Number(displayCompositeHours(left) || 0))
);

const mttrRisks = computed(() =>
  [...props.employees]
    .filter((employee) => Number(employee.mttrMinutes || 0) > 1440)
    .sort((left, right) => Number(right.mttrMinutes || 0) - Number(left.mttrMinutes || 0))
);

const certificateRisks = computed(() => {
  const rows = [];
  (props.matrix.employees || []).forEach((employee) => {
    (employee.certificates || []).forEach((certificate) => {
      if (certificate.status !== "valid") {
        rows.push({
          employeeKey: employee.employeeKey,
          employeeName: employee.employeeName,
          department: employee.department,
          ...certificate,
        });
      }
    });
  });
  return rows;
});

const dataQualityRisks = computed(() =>
  props.rawRecords.filter((record) => {
    const attendance = Number(record.attendanceHours || 0);
    const repair = Number(record.repairHours || 0);
    const orders = Number(record.orderCount || 0);
    return attendance === 0 && (repair > 0 || orders > 0);
  })
);

function displayCompositeHours(employee) {
  return employee.annualCompositeHours ?? employee.compositeHours;
}

function statusText(status) {
  return {
    expiring: "临期",
    expired: "过期",
    missing: "缺失",
  }[status] || "异常";
}
</script>
