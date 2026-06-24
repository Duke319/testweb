<template>
  <section class="overview-summary" aria-label="绩效概览">
    <MetricTile
      v-for="metric in metrics"
      :key="metric.label"
      :label="metric.label"
      :value="metric.value"
      :unit="metric.unit"
      :badge="metric.badge"
      :note="metric.note"
      :status="metric.status"
    />
  </section>
</template>

<script setup>
import MetricTile from "./MetricTile.vue";

defineProps({
  metrics: { type: Array, default: () => [] },
});
</script>
