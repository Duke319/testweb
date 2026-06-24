<template>
  <article class="chart-panel" :class="{ dense }">
    <div class="panel-head">
      <div>
        <span v-if="eyebrow" class="section-label">{{ eyebrow }}</span>
        <h3>{{ title }}</h3>
      </div>
      <strong v-if="metric" class="panel-metric">{{ metric }}</strong>
    </div>
    <div class="chart-frame">
      <div ref="chartEl" class="chart-surface" :style="{ height }" />
      <div v-if="!hasData" class="chart-empty">{{ emptyText }}</div>
    </div>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";

const props = defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: "" },
  metric: { type: String, default: "" },
  option: { type: Object, required: true },
  height: { type: String, default: "300px" },
  dense: { type: Boolean, default: false },
  emptyText: { type: String, default: "暂无数据" },
});
const emit = defineEmits(["chart-ready"]);

const chartEl = ref(null);
let chart = null;
let resizeObserver = null;
let resizeFrame = 0;

const hasData = computed(() => {
  const series = props.option?.series || [];
  if (!series.length) return false;
  return series.some((item) => Array.isArray(item.data) && item.data.some(hasNumericData));
});

function hasNumericData(value) {
  if (Array.isArray(value)) return value.some(hasNumericData);
  if (value && typeof value === "object") return hasNumericData(value.value);
  const number = Number(value);
  return Number.isFinite(number) && number !== 0;
}

async function render() {
  await nextTick();
  if (!chartEl.value) return;
  if (!chart) {
    chart = echarts.init(chartEl.value, null, { renderer: "canvas" });
    emit("chart-ready", chart);
  }
  chart.setOption(props.option, true);
  scheduleResize();
}

function resize() {
  chart?.resize();
}

function scheduleResize() {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    resize();
    window.setTimeout(resize, 80);
  });
}

onMounted(() => {
  render();
  window.addEventListener("resize", scheduleResize);
  if (chartEl.value && "ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(chartEl.value);
  }
});

watch(() => props.option, render, { deep: true, flush: "post" });
watch(() => props.height, scheduleResize, { flush: "post" });

onBeforeUnmount(() => {
  window.removeEventListener("resize", scheduleResize);
  window.cancelAnimationFrame(resizeFrame);
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>
