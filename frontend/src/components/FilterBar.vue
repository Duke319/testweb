<template>
  <form class="filter-bar is-expanded" :class="`mode-${mode}`" @submit.prevent="$emit('apply')">
    <div class="filter-summary">
      <span class="section-label">筛选条件</span>
      <strong>{{ summaryText }}</strong>
    </div>

    <div v-if="mode === 'assessmentYear'" class="filter-fields">
      <label>
        <span>考核年</span>
        <select :value="selectedAssessmentYear" @change="updateAssessmentYear($event.target.value)">
          <option v-for="option in assessmentYearOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="filter-readonly">
        <span>计算范围</span>
        <strong>{{ assessmentRangeText }}</strong>
      </label>
      <label>
        <span>TEF</span>
        <select :value="effectiveDepartment" :disabled="Boolean(lockedDepartment)" @change="updateBusinessUnit($event.target.value)">
          <option value="">全部</option>
          <option v-for="area in businessAreaOptions" :key="area" :value="area">{{ area }}</option>
        </select>
      </label>
      <div class="filter-actions">
        <button class="primary-action" type="submit">应用</button>
        <button class="secondary-action" type="button" @click="$emit('reset')">重置</button>
      </div>
    </div>

    <div v-else class="filter-fields">
      <label>
        <span>开始时间</span>
        <select :value="filters.monthFrom" @change="updateMonthFrom($event.target.value)">
          <option value="">全部</option>
          <option v-for="option in timeFromOptions" :key="option.key" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label>
        <span>结束时间</span>
        <select :value="filters.monthTo" @change="updateMonthTo($event.target.value)">
          <option value="">全部</option>
          <option v-for="option in timeToOptions" :key="option.key" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label>
        <span>TEF</span>
        <select :value="effectiveDepartment" :disabled="Boolean(lockedDepartment)" @change="updateBusinessUnit($event.target.value)">
          <option value="">全部</option>
          <option v-for="area in businessAreaOptions" :key="area" :value="area">{{ area }}</option>
        </select>
      </label>
      <div class="filter-actions">
        <button class="primary-action" type="submit">应用</button>
        <button class="secondary-action" type="button" @click="$emit('reset')">重置</button>
      </div>
    </div>
  </form>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  filters: { type: Object, required: true },
  options: { type: Object, required: true },
  lockedDepartment: { type: String, default: "" },
  mode: { type: String, default: "range" },
});
const emit = defineEmits(["update:filters", "apply", "reset"]);
const HIDDEN_FILTER_MONTHS = new Set(["2026 May"]);
const YEAR_OPTIONS = ["2022", "2023", "2024", "2025"];
const businessAreaOptions = computed(() => {
  if (props.lockedDepartment) {
    return [props.lockedDepartment];
  }
  const departments = props.options.departments || [];
  const tefDepartments = departments.filter((department) => /^TEF3[1-3]$/.test(department));
  return tefDepartments.length ? tefDepartments : ["TEF31", "TEF32", "TEF33"];
});
const effectiveDepartment = computed(() => props.lockedDepartment || props.filters.department || "");
const timeFromOptions = computed(() => buildTimeOptions("from"));
const timeToOptions = computed(() => {
  const options = buildTimeOptions("to");
  if (!props.filters.monthFrom) return options;
  const fromIndex = getMonthIndex(props.filters.monthFrom);
  return options.filter((option) => option.index >= fromIndex);
});
const assessmentYearOptions = computed(() => buildAssessmentYearOptions());
const selectedAssessmentYear = computed(() => {
  const explicitYear = String(props.filters.assessmentYear || "");
  if (explicitYear) return explicitYear;
  const exactYear = assessmentYearFromRange(props.filters.monthFrom, props.filters.monthTo);
  const inferredYear = exactYear || assessmentYearFromMonth(props.filters.monthTo) || assessmentYearFromMonth(props.filters.monthFrom);
  if (inferredYear) return inferredYear;
  return assessmentYearOptions.value[assessmentYearOptions.value.length - 1]?.value || "";
});
const assessmentRangeText = computed(() => {
  const range = assessmentRangeForYear(selectedAssessmentYear.value);
  return range ? `${range.monthFrom} - ${range.monthTo}` : "全部月份";
});

const summaryText = computed(() => {
  const labels = [
    props.mode === "assessmentYear" ? `考核年 ${selectedAssessmentYear.value}（${assessmentRangeText.value}）` : monthRangeText.value,
    effectiveDepartment.value || "全部 TEF",
  ].filter(Boolean);
  return labels.join(" / ");
});

const monthRangeText = computed(() => {
  if (props.filters.monthFrom && props.filters.monthTo) {
    const fromLabel = displayTimeLabel(props.filters.monthFrom, "from");
    const toLabel = displayTimeLabel(props.filters.monthTo, "to");
    return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`;
  }
  if (props.filters.monthFrom) {
    return `${displayTimeLabel(props.filters.monthFrom, "from")} 起`;
  }
  if (props.filters.monthTo) {
    return `${displayTimeLabel(props.filters.monthTo, "to")} 止`;
  }
  return "全部月份";
});

function updateBusinessUnit(value) {
  emit("update:filters", { ...props.filters, businessArea: "", department: value });
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Number(match[1]) * 100 + monthNames.indexOf(match[2]) + 1;
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

function updateAssessmentYear(value) {
  const range = assessmentRangeForYear(value);
  if (!range) return;
  emit("update:filters", { ...props.filters, ...range, assessmentYear: value, month: "" });
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
  (props.options.months || [])
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

function buildAssessmentYearOptions() {
  const years = new Set();
  const explicitYear = String(props.filters.assessmentYear || "");
  if (explicitYear) years.add(explicitYear);
  const inferredYear = assessmentYearFromRange(props.filters.monthFrom, props.filters.monthTo) ||
    assessmentYearFromMonth(props.filters.monthTo) ||
    assessmentYearFromMonth(props.filters.monthFrom);
  if (inferredYear) years.add(inferredYear);
  const seedMonths = [
    ...YEAR_OPTIONS.flatMap((year) => [`${year} Jan`, `${year} Dec`]),
    ...(props.options.months || []),
  ];
  seedMonths.forEach((month) => {
    const year = assessmentYearFromMonth(month);
    if (year) years.add(year);
  });
  return [...years]
    .sort((left, right) => Number(left) - Number(right))
    .map((year) => ({
      value: year,
      label: `${year}`,
      range: assessmentRangeForYear(year),
    }));
}

function assessmentYearFromMonth(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return "";
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNumber = monthNames.indexOf(match[2]) + 1;
  if (!monthNumber) return "";
  const year = Number(match[1]);
  return String(monthNumber >= 8 ? year + 1 : year);
}

function assessmentRangeForYear(value) {
  const year = Number(value || 0);
  if (!Number.isFinite(year) || year <= 0) return null;
  return {
    monthFrom: `${year - 1} Aug`,
    monthTo: `${year} Jul`,
  };
}

function assessmentYearFromRange(monthFrom, monthTo) {
  const toMatch = String(monthTo || "").match(/^(\d{4})\s+Jul$/);
  const fromMatch = String(monthFrom || "").match(/^(\d{4})\s+Aug$/);
  if (!toMatch || !fromMatch) return "";
  const endYear = Number(toMatch[1]);
  return Number(fromMatch[1]) === endYear - 1 ? String(endYear) : "";
}

function isHiddenFilterMonth(month) {
  return HIDDEN_FILTER_MONTHS.has(String(month || "").trim());
}

function displayTimeLabel(value, boundary) {
  const match = String(value || "").match(/^(\d{4})\s+(Jan|Dec)$/);
  if (match && ((boundary === "from" && match[2] === "Jan") || (boundary === "to" && match[2] === "Dec"))) {
    return match[1];
  }
  return value;
}
</script>
