<template>
  <article class="data-panel competence-panel">
    <div class="panel-head">
      <div>
        <span class="section-label">技能</span>
        <h3>证书矩阵</h3>
      </div>
      <strong>{{ formatInteger(matrix.employees?.length || 0) }} 人</strong>
    </div>
    <div class="matrix-wrap" :style="{ '--cert-cols': certColCount, '--matrix-min-width': matrixMinWidth }">
      <div class="matrix-head">
        <span>员工</span>
        <span v-for="type in matrix.certificateTypes" :key="type.code">{{ type.name }}</span>
      </div>
      <button
        v-for="employee in matrix.employees"
        :key="employee.employeeKey"
        :ref="(element) => setRowRef(employee.employeeKey, element)"
        class="matrix-row matrix-button"
        :class="{ selected: employee.employeeKey === selectedEmployeeKey }"
        type="button"
        @click="emit('select', employee.employeeKey)"
      >
        <strong>
          {{ employee.employeeName }}
          <small>{{ employeeMeta(employee) }}</small>
        </strong>
        <span
          v-for="cert in employee.certificates"
          :key="cert.code"
          class="cert-cell"
          :class="cert.status"
          :title="certificateTitle(cert)"
          :aria-label="certificateTitle(cert)"
        >
          {{ certificateMark(cert) }}
        </span>
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed, onBeforeUpdate } from "vue";
import { formatInteger } from "../utils/numberFormat";

const emit = defineEmits(["select"]);

const props = defineProps({
  matrix: { type: Object, default: () => ({ certificateTypes: [], employees: [] }) },
  selectedEmployeeKey: { type: String, default: "" },
});

const certColCount = computed(() => Math.max(1, (props.matrix.certificateTypes || []).length));
const matrixMinWidth = computed(() => `${240 + certColCount.value * 128}px`);
const rowRefs = new Map();

onBeforeUpdate(() => {
  rowRefs.clear();
});

function setRowRef(employeeKey, element) {
  if (element) {
    rowRefs.set(employeeKey, element);
  }
}

function scrollToEmployee(employeeKey) {
  const row = rowRefs.get(employeeKey);
  if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  row.focus({ preventScroll: true });
}

defineExpose({ scrollToEmployee });

function certificateMark(cert) {
  if (cert.detail) return cert.detail;
  if (cert.status === "expired") return "过";
  if (cert.status === "expiring") return "临";
  return cert.hasCertificate || cert.status === "valid" ? "✓" : "-";
}

function certificateTitle(cert) {
  const label = cert.stateLabel || (cert.hasCertificate || cert.status === "valid" ? "已登记" : "未登记");
  const detailText = cert.detail ? ` · ${cert.detail}` : "";
  const dateText = cert.expireDate ? ` · ${cert.expireDate}` : "";
  return `${cert.name}: ${label}${detailText}${dateText}`;
}

function employeeMeta(employee) {
  return [
    employee.department,
    employee.positionTitle || employee.jobTitle || employee.role,
    employee.employeeNo,
  ].filter(Boolean).join(" · ") || "-";
}
</script>
