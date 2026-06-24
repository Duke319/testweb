<template>
  <section class="competence-workspace" aria-label="能力">
    <section class="competence-hero-panel" aria-label="能力概览">
      <div>
        <span class="section-label">能力</span>
        <h2>证书与多技能覆盖</h2>
      </div>
      <div class="competence-hero-metrics">
        <span>
          <small>持证覆盖</small>
          <strong>{{ formatPercent(filteredSummary.coverageRate) }}</strong>
        </span>
        <span>
          <small>证书缺口</small>
          <strong>{{ formatInteger(filteredSummary.missingCount) }}</strong>
        </span>
      </div>
    </section>

    <article class="data-panel competence-filter-card">
      <div class="panel-head">
        <div>
          <span class="section-label">筛选</span>
          <h3>TEF 分类</h3>
        </div>
        <strong>{{ activeTefLabel }}</strong>
      </div>

      <div class="competence-tef-filter" role="list" aria-label="按 TEF 筛选能力矩阵">
        <button
          v-for="option in tefOptions"
          :key="option.value || 'all'"
          type="button"
          class="tef-filter-button"
          :class="{ active: option.value === activeTef }"
          @click="selectTef(option.value)"
        >
          <span>{{ option.label }}</span>
          <i>{{ formatPeople(option.count) }}</i>
        </button>
      </div>
    </article>

    <div class="competence-summary-row">
      <MetricTile label="员工数" :value="formatInteger(filteredSummary.employeeCount)" badge="证书矩阵" :note="`${formatInteger(filteredSummary.certifiedEmployeeCount)} 人已持证`" status="neutral" />
      <MetricTile label="持证覆盖率" :value="formatPercent(filteredSummary.coverageRate)" badge="证书槽位" :note="`${formatInteger(filteredSummary.heldCount)} / ${formatInteger(filteredSummary.totalSlots)} 项`" status="info" />
      <MetricTile label="多技能员工比例" :value="formatPercent(filteredSummary.multiSkillRate)" badge=">=2 类证书" :note="formatPeople(filteredSummary.multiSkillEmployeeCount)" status="good" />
      <MetricTile label="待补齐证书" :value="formatInteger(filteredSummary.missingCount)" badge="未登记/缺失" :note="`${formatInteger(filteredSummary.certificateTypes)} 类证书`" status="warning" />
    </div>

    <article class="data-panel competence-card competence-type-shell">
      <div class="panel-head">
        <div>
          <span class="section-label">能力</span>
          <h3>证件类型</h3>
        </div>
        <strong>{{ selectedCertificate ? `${formatInteger(selectedEmployees.length)} 人持有` : `${formatInteger(certificateRows.length)} 类` }}</strong>
      </div>

      <div v-if="!certificateRows.length" class="empty-state compact">暂无证件类型数据</div>
      <div
        v-else
        class="certificate-type-list horizontal"
        :style="{ '--certificate-type-count': certificateRows.length }"
      >
        <button
          v-for="type in certificateRows"
          :key="type.code"
          type="button"
          class="certificate-type-button"
          :class="{ active: type.code === activeCertificateCode }"
          @click="selectCertificate(type.code)"
        >
          <span>
            <strong>{{ type.name }}</strong>
          </span>
          <i>{{ formatPeople(type.holders.length) }}</i>
        </button>
      </div>

      <div v-if="selectedCertificate" class="competence-certificate-holders">
        <div class="competence-employee-head">
          <span>{{ selectedCertificate.name }}持证员工</span>
          <span>{{ formatPeople(selectedEmployees.length) }}</span>
        </div>

        <div v-if="!selectedEmployees.length" class="empty-state compact">当前筛选范围内暂无持证员工</div>
        <div v-else class="competence-employee-list">
          <button
            v-for="employee in selectedEmployees"
            :key="employee.employeeKey"
            type="button"
            class="competence-employee-row"
            :class="{ selected: employee.employeeKey === selectedEmployeeKey }"
            @click="selectEmployeeAndScroll(employee.employeeKey)"
          >
            <span>
              <strong>{{ employee.employeeName }}</strong>
              <small>{{ employeeMeta(employee) }}</small>
            </span>
            <i :class="employee.certificate.status">{{ certificateLabel(employee.certificate) }}</i>
          </button>
        </div>
      </div>
    </article>

    <CompetenceMatrix
      ref="matrixRef"
      :matrix="filteredMatrix"
      :selected-employee-key="selectedEmployeeKey"
      @select="selectEmployee"
    />
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import CompetenceMatrix from "./CompetenceMatrix.vue";
import MetricTile from "./MetricTile.vue";
import { formatInteger, formatPercent } from "../utils/numberFormat";

const props = defineProps({
  matrix: { type: Object, default: () => ({ certificateTypes: [], employees: [] }) },
  summary: { type: Object, default: () => ({ certificateTypes: 0, employeeCount: 0 }) },
  selectedEmployeeKey: { type: String, default: "" },
});

const emit = defineEmits(["select-employee"]);

const activeCertificateCode = ref("");
const activeTef = ref("");
const matrixRef = ref(null);

const certificateRows = computed(() =>
  (filteredMatrix.value.certificateTypes || []).map((type) => {
    const holders = (filteredMatrix.value.employees || [])
      .map((employee) => {
        const certificate = findEmployeeCertificate(employee, type.code);
        if (!certificate || !hasCertificate(certificate)) {
          return null;
        }
        return {
          ...employee,
          certificate,
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(a.employeeName || "").localeCompare(String(b.employeeName || ""), "zh-Hans-CN"));

    return {
      ...type,
      holders,
    };
  })
);

const tefOptions = computed(() => {
  const employees = props.matrix.employees || [];
  const counts = new Map();
  employees.forEach((employee) => {
    const tef = employeeTef(employee);
    if (tef) {
      counts.set(tef, (counts.get(tef) || 0) + 1);
    }
  });

  const options = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "zh-Hans-CN", { numeric: true }))
    .map(([value, count]) => ({ label: value, value, count }));
  return options.length <= 1 ? options : [{ label: "全部 TEF", value: "", count: employees.length }, ...options];
});

const filteredMatrix = computed(() => ({
  ...props.matrix,
  certificateTypes: props.matrix.certificateTypes || [],
  employees: activeTef.value
    ? (props.matrix.employees || []).filter((employee) => employeeTef(employee) === activeTef.value)
    : props.matrix.employees || [],
}));

const filteredSummary = computed(() => buildSummary(filteredMatrix.value));

const activeTefLabel = computed(() => tefOptions.value.find((option) => option.value === activeTef.value)?.label || "全部 TEF");

const selectedCertificate = computed(() =>
  certificateRows.value.find((type) => type.code === activeCertificateCode.value) || certificateRows.value[0] || null
);

const selectedEmployees = computed(() => selectedCertificate.value?.holders || []);

watch(
  certificateRows,
  (types) => {
    if (!types.length) {
      activeCertificateCode.value = "";
      return;
    }
    if (!types.some((type) => type.code === activeCertificateCode.value)) {
      activeCertificateCode.value = types[0].code;
    }
  },
  { immediate: true }
);

watch(
  tefOptions,
  (options) => {
    if (!options.some((option) => option.value === activeTef.value)) {
      activeTef.value = "";
    }
  },
  { immediate: true }
);

function findEmployeeCertificate(employee, certificateCode) {
  return (employee.certificates || []).find((cert) => cert.code === certificateCode) || null;
}

function hasCertificate(certificate) {
  return certificate.hasCertificate || ["valid", "expiring", "expired"].includes(certificate.status);
}

function selectCertificate(certificateCode) {
  activeCertificateCode.value = certificateCode;
}

function selectTef(tef) {
  activeTef.value = tef;
}

function selectEmployee(employeeKey) {
  emit("select-employee", employeeKey);
}

async function selectEmployeeAndScroll(employeeKey) {
  selectEmployee(employeeKey);
  await nextTick();
  matrixRef.value?.scrollToEmployee(employeeKey);
}

function employeeMeta(employee) {
  return [
    employee.department,
    employee.positionTitle || employee.jobTitle || employee.role,
    employee.employeeNo,
  ].filter(Boolean).join(" · ") || "-";
}

function certificateLabel(cert) {
  const label = cert.stateLabel || (hasCertificate(cert) ? "已登记" : "未登记");
  const detailText = cert.detail ? ` · ${cert.detail}` : "";
  const dateText = cert.expireDate ? ` · ${cert.expireDate}` : "";
  return `${label}${detailText}${dateText}`;
}

function formatPeople(value) {
  return `${formatInteger(value)} 人`;
}

function employeeTef(employee) {
  const direct = String(employee.department || "").match(/^TEF3[1-3]$/i);
  if (direct) return direct[0].toUpperCase();
  const orgUnit = String(employee.orgUnit || "").match(/TEF3[1-3]/i);
  return orgUnit ? orgUnit[0].toUpperCase() : "";
}

function buildSummary(matrix) {
  const employees = matrix.employees || [];
  const certificateTypes = matrix.certificateTypes || [];
  const heldCount = employees.reduce((total, employee) => total + (employee.certificates || []).filter(hasCertificate).length, 0);
  const totalSlots = certificateTypes.length * employees.length;
  const certifiedEmployeeCount = employees.filter((employee) =>
    (employee.certificates || []).some(hasCertificate)
  ).length;
  const multiSkillEmployeeCount = employees.filter((employee) =>
    (employee.certificates || []).filter(hasCertificate).length >= 2
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
}
</script>
