<template>
  <article class="metric-tile" :class="`status-${status}`">
    <span class="metric-status-bar" aria-hidden="true"></span>
    <div class="metric-label">
      <span>{{ label }}</span>
      <small v-if="badge">{{ badge }}</small>
    </div>
    <div class="metric-value">
      <strong>{{ value }}</strong>
      <em v-if="unit">{{ unit }}</em>
    </div>
    <p v-if="note">{{ note }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  unit: { type: String, default: "" },
  badge: { type: String, default: "" },
  note: { type: String, default: "" },
  status: { type: String, default: "neutral" },
});
</script>
