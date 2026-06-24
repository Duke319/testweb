<template>
  <article class="data-panel employee-list-panel">
    <div class="panel-head">
      <div>
        <span class="section-label">人员</span>
        <h3>员工列表</h3>
      </div>
      <div class="panel-meta">
        <strong>{{ formatInteger(employees.length) }} 人</strong>
        <small>{{ riskSummary }}</small>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th
              v-for="column in columns"
              :key="column.key"
              :aria-sort="tableSort.key === column.key ? (tableSort.direction === 'desc' ? 'descending' : 'ascending') : 'none'"
            >
              <button type="button" class="sort-head" @click="toggleSort(column.key)">
                {{ column.label }} {{ sortMark(column.key) }}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(employee, index) in sortedEmployees"
            :key="employee.employeeKey"
            :class="{ selected: employee.employeeKey === selectedEmployeeKey }"
            tabindex="0"
            :aria-selected="employee.employeeKey === selectedEmployeeKey"
            @click="$emit('select', employee.employeeKey)"
            @keydown.enter="$emit('select', employee.employeeKey)"
            @keydown.space.prevent="$emit('select', employee.employeeKey)"
          >
            <td><strong>{{ index + 1 }}</strong></td>
            <td><strong>{{ employee.rank }}</strong></td>
            <td>
              <strong>{{ employee.employeeName }}</strong>
              <small>{{ employeeMeta(employee) }}</small>
            </td>
            <td>{{ employee.department }}</td>
            <td>
              <span :class="['risk-pill', employee.compositeRisk]">{{ formatHours(displayCompositeHours(employee)) }}</span>
            </td>
            <td>{{ formatPercent(employee.repairEfficiency) }}</td>
            <td>{{ formatHours(employee.overtimeTotalHours) }}</td>
            <td>{{ formatHours(employee.pm01Hours) }}</td>
            <td>{{ formatHours(employee.pm03Hours) }}</td>
            <td>{{ formatInteger(employee.orderCount) }}</td>
            <td>{{ formatMinutesNullable(employee.mttrMinutes) }}</td>
            <td>
              <span class="score-chip">{{ formatDecimal(employee.performanceScore, 1) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from "vue";
import { formatDecimal, formatHours, formatInteger, formatMinutes, formatPercent } from "../utils/numberFormat";

const props = defineProps({
  employees: { type: Array, default: () => [] },
  selectedEmployeeKey: { type: String, default: "" },
});
defineEmits(["select"]);

const columns = [
  { key: "rank", label: "排名" },
  { key: "employeeName", label: "员工" },
  { key: "department", label: "部门" },
  { key: "compositeHours", label: "综合工时" },
  { key: "repairEfficiency", label: "PI" },
  { key: "overtimeTotalHours", label: "OT" },
  { key: "pm01Hours", label: "PM01" },
  { key: "pm03Hours", label: "PM03" },
  { key: "orderCount", label: "接单" },
  { key: "mttrMinutes", label: "MTTR" },
  { key: "performanceScore", label: "得分" },
];
const tableSort = ref({ key: "rank", direction: "asc" });

const riskSummary = computed(() => {
  const over = props.employees.filter((employee) => employee.compositeRisk === "over").length;
  const warning = props.employees.filter((employee) => employee.compositeRisk === "warning").length;
  return `${formatInteger(over)} 超限 · ${formatInteger(warning)} 临近`;
});

const sortedEmployees = computed(() => sortRows(props.employees, tableSort.value));

function displayCompositeHours(employee) {
  return employee.annualCompositeHours ?? employee.compositeHours;
}

function formatMinutesNullable(value) {
  return value === null || value === undefined ? "-" : formatMinutes(value);
}

function employeeMeta(employee) {
  return [
    employee.employeeNo,
    employee.positionTitle || employee.jobTitle || employee.role,
  ].filter(Boolean).join(" · ") || "-";
}

function toggleSort(key) {
  tableSort.value = {
    key,
    direction: tableSort.value.key === key && tableSort.value.direction === "desc" ? "asc" : "desc",
  };
}

function sortMark(key) {
  if (tableSort.value.key !== key) return "↕";
  return tableSort.value.direction === "desc" ? "↓" : "↑";
}

function sortRows(rows, sort) {
  return [...rows].sort((left, right) => {
    const compared = compareValues(getSortValue(left, sort.key), getSortValue(right, sort.key), sort.direction);
    return compared || compareValues(getSortValue(left, "rank"), getSortValue(right, "rank"), "asc");
  });
}

function getSortValue(employee, key) {
  if (key === "compositeHours") return displayCompositeHours(employee);
  return employee?.[key];
}

function compareValues(left, right, direction = "desc") {
  const factor = direction === "asc" ? 1 : -1;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const bothNumbers = Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && left !== "" && right !== "";
  if (bothNumbers) {
    return (leftNumber - rightNumber) * factor;
  }
  return String(left || "").localeCompare(String(right || ""), "zh-Hans-CN", { numeric: true }) * factor;
}
</script>
