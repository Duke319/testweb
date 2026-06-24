<template>
  <section class="safety-workspace" aria-label="安全">
    <article class="data-panel safety-card safety-card-wide">
      <div class="panel-head">
        <div>
          <span class="section-label">Safety</span>
          <h3>发生过安全事故的员工（模拟，非真实数据）</h3>
        </div>
        <strong>{{ loading ? "..." : `${formatInteger(employeeRows.length)} 人` }}</strong>
      </div>

      <div v-if="loading" class="empty-state compact">正在读取安全记录</div>
      <div v-else-if="error" class="empty-state compact safety-error">{{ error }}</div>
      <div v-else-if="employeeRows.length" class="safety-employee-grid">
        <div
          v-for="employee in employeeRows"
          :key="employee.key"
          class="safety-employee-card"
        >
          <div>
            <strong>{{ employee.employeeName }}</strong>
            <small>{{ employee.department }} · {{ employee.employeeNo }}</small>
          </div>
          <i>{{ formatInteger(employee.incidentCount) }} 次</i>
          <p>{{ employee.incidentMonths.length ? employee.incidentMonths.join("、") : "未登记月份" }}</p>
        </div>
      </div>
      <div v-else class="empty-state">{{ emptyText }}</div>
    </article>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { getSafetyIncidents } from "../services/performanceApi";
import { formatInteger } from "../utils/numberFormat";

const props = defineProps({
  filters: { type: Object, default: () => ({}) },
});

const loading = ref(false);
const error = ref("");
const payload = ref({ source: {}, summary: {}, employees: [], records: [] });
let requestSeq = 0;

const employeeRows = computed(() => payload.value.employees || []);
const emptyText = computed(() => {
  const filters = props.filters || {};
  const scope = filters.department || filters.userDepartmentScope || filters.businessArea || "当前筛选范围";
  const period = filters.month || [filters.monthFrom, filters.monthTo].filter(Boolean).join(" - ");
  return period ? `${scope} / ${period} 暂无安全事故员工` : `${scope} 暂无安全事故员工`;
});

watch(
  () => ({ ...(props.filters || {}) }),
  loadSafetyIncidents,
  { deep: true, immediate: true }
);

async function loadSafetyIncidents(filters) {
  const requestId = ++requestSeq;
  loading.value = true;
  error.value = "";
  try {
    const data = await getSafetyIncidents(filters || {});
    if (requestId !== requestSeq) return;
    payload.value = data || { source: {}, summary: {}, employees: [], records: [] };
  } catch (err) {
    if (requestId !== requestSeq) return;
    error.value = err.message || "安全记录加载失败";
    payload.value = { source: {}, summary: {}, employees: [], records: [] };
  } finally {
    if (requestId === requestSeq) {
      loading.value = false;
    }
  }
}
</script>
