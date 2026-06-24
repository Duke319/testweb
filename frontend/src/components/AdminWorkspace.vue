<template>
  <section class="admin-workspace" aria-label="员工绩效明细">
    <div class="admin-main">
      <EmployeeTable
        :employees="employees"
        :selected-employee-key="selectedEmployeeKey"
        @select="$emit('select-employee', $event)"
      />
      <ChartPanel
        title="工时结构"
        :option="workMixOption"
        height="320px"
        dense
      />
    </div>

    <EmployeeDetailPanel :detail="employeeDetail" />
  </section>
</template>

<script setup>
import ChartPanel from "./ChartPanel.vue";
import EmployeeDetailPanel from "./EmployeeDetailPanel.vue";
import EmployeeTable from "./EmployeeTable.vue";

defineProps({
  employees: { type: Array, default: () => [] },
  selectedEmployeeKey: { type: String, default: "" },
  employeeDetail: { type: Object, default: () => ({ profile: null, monthlyTrends: [], records: [] }) },
  workMixOption: { type: Object, required: true },
});

defineEmits(["select-employee"]);
</script>
