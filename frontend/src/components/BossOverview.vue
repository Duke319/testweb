<template>
  <section class="overview-workspace" aria-label="绩效总览">
    <section class="overview-time-filter" aria-label="时间筛选">
      <div>
        <span class="section-label">时间筛选</span>
        <strong>{{ scopeLabel }}</strong>
      </div>
      <div class="overview-time-controls">
        <label>
          <span>开始</span>
          <select :value="filters.monthFrom" @change="updateMonthFrom($event.target.value)">
            <option value="">全部</option>
            <option v-for="option in timeFromOptions" :key="option.key" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          <span>结束</span>
          <select :value="filters.monthTo" @change="updateMonthTo($event.target.value)">
            <option value="">全部</option>
            <option v-for="option in timeToOptions" :key="option.key" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          <span>TEF</span>
          <select :value="effectiveDepartment" :disabled="Boolean(lockedDepartment)" @change="updateTef($event.target.value)">
            <option value="">全部</option>
            <option v-for="department in tefOptions" :key="department" :value="department">{{ department }}</option>
          </select>
        </label>
        <button type="button" @click="resetTimeFilter">全部</button>
      </div>
    </section>

    <section class="overview-executive-panel" aria-label="PI 概览">
      <ChartPanel
        class="overview-hero-chart"
        role="button"
        tabindex="0"
        title="月度 PI / 均值"
        eyebrow="基准：当前范围加权平均 PI"
        :metric="metrics.repairEfficiency"
        :option="chartOptions.efficiencyTrend"
        height="236px"
        @click="navigate('pi')"
        @keydown.enter.prevent="navigate('pi')"
        @keydown.space.prevent="navigate('pi')"
      />
    </section>

    <section class="overview-lower-grid" aria-label="栏目入口">
      <section class="overview-module-dock" aria-label="栏目入口">
        <article
          v-for="card in moduleCards"
          :key="card.key"
          class="data-panel overview-module-card"
          role="button"
          tabindex="0"
          @click="navigate(card.target)"
          @keydown.enter.prevent="navigate(card.target)"
          @keydown.space.prevent="navigate(card.target)"
        >
          <div class="overview-module-copy">
            <span>{{ card.eyebrow }}</span>
            <strong>{{ card.title }}</strong>
            <em>{{ card.metric }}</em>
          </div>
          <ChartPanel
            class="overview-module-chart"
            :title="`${card.title}趋势`"
            :option="card.option"
            height="236px"
            dense
          />
          <div class="overview-module-foot">
            <span>{{ moduleFootText(card.target) }}</span>
            <i>进入</i>
          </div>
        </article>
      </section>
    </section>
  </section>
</template>

<script setup>
import ChartPanel from "./ChartPanel.vue";
import { computed } from "vue";

const props = defineProps({
  chartOptions: { type: Object, required: true },
  filterOptions: { type: Object, default: () => ({ months: [] }) },
  filters: { type: Object, default: () => ({ monthFrom: "", monthTo: "" }) },
  lockedDepartment: { type: String, default: "" },
  metrics: { type: Object, required: true },
  moduleCards: { type: Array, default: () => [] },
  scopeLabel: { type: String, default: "全部月份" },
});

const emit = defineEmits(["navigate", "update:filters"]);
const HIDDEN_FILTER_MONTHS = new Set(["2026 May"]);
const DEFAULT_MONTH_FROM = "2024 Jan";
const DEFAULT_MONTH_TO = "2026 Apr";
const YEAR_OPTIONS = ["2022", "2023", "2024", "2025"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const timeFromOptions = computed(() => buildTimeOptions("from"));
const tefOptions = computed(() => {
  if (props.lockedDepartment) {
    return [props.lockedDepartment];
  }
  const departments = props.filterOptions.departments || [];
  const tefDepartments = departments.filter((department) => /^TEF3[1-3]$/.test(department));
  return tefDepartments.length ? tefDepartments : ["TEF31", "TEF32", "TEF33"];
});
const effectiveDepartment = computed(() => props.lockedDepartment || props.filters.department || "");
const timeToOptions = computed(() => {
  const options = buildTimeOptions("to");
  if (!props.filters.monthFrom) return options;
  const fromIndex = getMonthIndex(props.filters.monthFrom);
  return options.filter((option) => option.index >= fromIndex);
});

function navigate(target) {
  if (target && target !== "overview") {
    emit("navigate", target);
  }
}

function updateMonthFrom(value) {
  const next = { ...props.filters, monthFrom: value, month: "" };
  if (value && next.monthTo && getMonthIndex(value) > getMonthIndex(next.monthTo)) {
    next.monthTo = "";
  }
  emit("update:filters", next);
}

function updateMonthTo(value) {
  const next = { ...props.filters, monthTo: value, month: "" };
  if (value && next.monthFrom && getMonthIndex(value) < getMonthIndex(next.monthFrom)) {
    next.monthTo = "";
  }
  emit("update:filters", next);
}

function updateTef(value) {
  emit("update:filters", { ...props.filters, businessArea: "", department: value });
}

function resetTimeFilter() {
  emit("update:filters", { ...props.filters, monthFrom: DEFAULT_MONTH_FROM, monthTo: DEFAULT_MONTH_TO, month: "" });
}

function buildTimeOptions(boundary) {
  const options = YEAR_OPTIONS.map((year) => {
    const value = boundary === "from" ? `${year} Jan` : `${year} Dec`;
    return {
      key: `${boundary}-${year}`,
      label: year,
      value,
      index: getMonthIndex(value),
    };
  });

  const existingValues = new Set(options.map((option) => option.value));
  (props.filterOptions.months || [])
    .filter((month) => String(month).startsWith("2026 ") && !isHiddenFilterMonth(month))
    .filter((month) => !existingValues.has(month))
    .forEach((month) => {
      options.push({
        key: `${boundary}-${month}`,
        label: month,
        value: month,
        index: getMonthIndex(month),
      });
    });

  return options;
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  return Number(match[1]) * 100 + monthNames.indexOf(match[2]) + 1;
}

function isHiddenFilterMonth(month) {
  return HIDDEN_FILTER_MONTHS.has(String(month || "").trim());
}

function moduleFootText(target) {
  return {
    pi: "查看 PI 详情",
    composite: "查看综合工时",
    reliability: "查看 MTTR",
    improvement: "查看改善",
    competence: "查看能力矩阵",
    exception: "查看异常",
  }[target] || "查看详情";
}
</script>
