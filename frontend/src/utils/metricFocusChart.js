import { formatDecimal, formatHours, formatInteger, formatPercent } from "./numberFormat";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YTD_BAR_DECAL = {
  symbol: "rect",
  symbolSize: 1,
  dashArrayX: [1, 0],
  dashArrayY: [4, 3],
  rotation: -Math.PI / 4,
  color: "rgba(24, 33, 45, 0.32)",
  backgroundColor: "rgba(255, 255, 255, 0)",
};

export function buildMetricSparkPanel({
  trend = [],
  expandedYears = [],
  key,
  title,
  tabLabel,
  metric,
  field,
  valueGetter,
  color,
  formatter,
  labelFormatter = formatter,
  axisFormatter = null,
  unit = "",
  zeroAsNull = false,
  chartType = "line",
  hideEmptyMonths = false,
  usePiYearLogic = false,
  yearLogicDataPredicate = null,
  showAverageLine = false,
  usePiBarFormat = false,
  aggregateMode = "sum",
}) {
  const sourceRows = trend.filter((row) => row.month);
  const sourceValues = sourceRows.map((row) => emptyToNull(valueGetter ? valueGetter(row) : row[field], zeroAsNull));
  const sourcePoints = sourceRows.map((row, index) => ({ row, value: sourceValues[index] }));
  const chartPoints = usePiYearLogic
    ? sourcePoints.filter((point) => yearLogicDataPredicate ? yearLogicDataPredicate(point.row, point.value) : Number.isFinite(point.value))
    : sourcePoints.filter((point) => !hideEmptyMonths || Number.isFinite(point.value));
  const rows = usePiYearLogic ? buildPiStyleSparkRows(chartPoints, aggregateMode, expandedYears) : chartPoints.map((point) => point.row);
  const values = chartPoints.map((point) => point.value);
  const validPoints = values
    .map((value, index) => ({ value, index, month: chartPoints[index]?.row?.month || "" }))
    .filter((point) => Number.isFinite(point.value));
  const latest = validPoints[validPoints.length - 1];
  const previous = validPoints[validPoints.length - 2];
  const delta = latest && previous ? latest.value - previous.value : 0;
  const chartValues = usePiYearLogic ? rows.map((row) => row.value) : values;

  return {
    key,
    title,
    tabLabel: tabLabel || title,
    metric,
    unit,
    color,
    rows,
    values: chartValues,
    option: focusChartOption({
      rows,
      values: chartValues,
      title,
      color,
      formatter,
      labelFormatter,
      axisFormatter,
      chartType,
      usePiYearLogic,
      usePiBarFormat,
      averageValue: showAverageLine ? averageKnown(chartValues) : null,
    }),
    latestLabel: latest ? `${latest.month} ${formatter(latest.value)}` : "暂无数据",
    deltaLabel: latest && previous ? formatDelta(delta, formatter) : "-",
    deltaDirection: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    hasYearDrilldown: usePiYearLogic,
    hasExpandedYears: usePiYearLogic && expandedYears.length > 0,
    expandedYearsLabel: `${expandedYears.join("、")} 已展开`,
  };
}

export function hasCompositeWorkHourData(row, value) {
  if (!Number.isFinite(value)) return false;
  return [
    "compositeHours",
    "overtimeTotalHours",
    "overtime15Hours",
    "overtime20Hours",
    "overtime30Hours",
    "leaveHours",
    "annualLeaveHours",
    "sickLeaveHours",
  ].some((field) => {
    const number = Number(row?.[field]);
    return Number.isFinite(number) && number !== 0;
  });
}

export function buildPiMonthlyChart({
  trend = [],
  expandedYears = [],
  latestYearPosition = "front",
  referenceRate = null,
  referenceName = "均值",
  referenceLabel = null,
  colors = {},
  shouldUseAnnual = null,
  formatPercent = defaultFormatPercent,
  formatNumber = defaultFormatNumber,
  formatHours = defaultFormatHours,
  formatMonthCount = defaultFormatMonthCount,
}) {
  const palette = {
    good: "#3b8b69",
    warning: "#c49a3a",
    reference: "#596171",
    ...colors,
  };
  const sourceRows = trend
    .filter((row) => row.month)
    .map((row) => makePiMonthRow(row.month, row))
    .filter((row) => row.hasData)
    .sort((left, right) => Number(left.monthIndex || 0) - Number(right.monthIndex || 0));
  const scopeRate = repairEfficiencyFromTotals(sumAverageBasisAttendance(sourceRows), sumAverageBasisPiHours(sourceRows));
  const years = [...new Set(sourceRows.map((row) => getMonthYear(row.month)).filter(Boolean))];
  const latestYear = years[years.length - 1] || "";
  const useAnnual = shouldUseAnnual ?? sourceRows.length > 18;
  const rows = useAnnual
    ? buildPiMonthlyRows(sourceRows, latestYear, expandedYears, latestYearPosition, scopeRate)
    : sourceRows.map((row) => ({ ...row, averagePi: scopeRate, piGap: row.pi - scopeRate }));
  const hasReferenceRate = referenceRate !== null && referenceRate !== undefined && referenceRate !== "";
  const effectiveReferenceRate = hasReferenceRate && Number.isFinite(Number(referenceRate)) ? Number(referenceRate) : scopeRate;
  const referencePercent = round(Number(effectiveReferenceRate || 0) * 100, 1);
  const effectiveReferenceLabel = referenceLabel || `${referenceName} ${formatPercent(effectiveReferenceRate)}`;
  const option = {
    color: [palette.good, palette.warning],
    tooltip: {
      ...darkTooltip("axis"),
      formatter: (params) => formatPiMonthlyTooltip(params, rows, {
        palette,
        referenceName,
        referenceRate: effectiveReferenceRate,
        referencePercent,
        formatPercent,
        formatHours,
        formatMonthCount,
      }),
    },
    graphic: percentageReferenceGraphic(effectiveReferenceRate, effectiveReferenceLabel, palette.reference),
    grid: chartGrid(54, 48, 34, 34),
    xAxis: piAnalysisCategoryAxis(rows, latestYear),
    yAxis: percentAxis(),
    series: [
      {
        name: "PI",
        type: "bar",
        barWidth: piAnalysisBarWidth(rows, useAnnual),
        barMaxWidth: 104,
        barCategoryGap: "14%",
        itemStyle: { borderRadius: [6, 6, 0, 0], opacity: 0.88 },
        label: {
          show: true,
          position: "top",
          distance: 6,
          color: "#465160",
          backgroundColor: "rgba(250, 252, 255, 0.96)",
          borderRadius: 4,
          padding: [2, 4],
          fontSize: 10,
          fontWeight: 800,
          formatter: (params) => `${formatNumber(params.value)}%`,
        },
        emphasis: { focus: "series" },
        markLine: percentageReferenceMarkLine(effectiveReferenceRate, palette.reference, 2),
        data: rows.map((row) => piChartDataItem(row, referencePercent, palette)),
      },
    ],
  };

  return {
    rows,
    sourceRows,
    scopeRate,
    latestYear,
    option,
  };
}

function focusChartOption({ rows, values, title, color, formatter, labelFormatter = formatter, axisFormatter = null, chartType = "line", usePiYearLogic = false, usePiBarFormat = false, averageValue = null }) {
  const isBar = chartType === "bar";
  const data = values.map((value, index) => {
    const roundedValue = Number.isFinite(value) ? Number(value.toFixed(2)) : null;
    return isBar ? barDataItem(roundedValue, color, rows[index]) : roundedValue;
  });
  const isPiStyleBar = usePiYearLogic || usePiBarFormat;
  return {
    color: [color],
    backgroundColor: "#ffffff",
    animationDuration: 220,
    ...(isBar && Number.isFinite(averageValue) ? { graphic: averageGraphic("均值") } : {}),
    tooltip: {
      trigger: "axis",
      backgroundColor: "#ffffff",
      borderColor: "#d8e0e8",
      borderWidth: 1,
      textStyle: { color: "#1f2937", fontSize: 12 },
      ...(usePiYearLogic ? { formatter: (params) => formatPiStyleSparkTooltip(params, rows, title, color, formatter) } : {}),
      valueFormatter: (value) => (value === null || value === undefined ? "-" : formatter(value)),
    },
    grid: {
      top: isBar ? 34 : 18,
      right: isBar && Number.isFinite(averageValue) ? 48 : 18,
      bottom: 34,
      left: 54,
      containLabel: false,
    },
    xAxis: {
      type: "category",
      boundaryGap: isBar,
      data: rows.map((row) => row.label || row.month),
      axisLine: { lineStyle: { color: "#d7dde5" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#667085",
        fontSize: 11,
        hideOverlap: true,
        interval: usePiYearLogic ? (index) => shouldShowSparkAxisLabel(rows, index) : "auto",
        rotate: usePiYearLogic && rows.length > 14 && rows.length <= 24 ? 24 : 0,
      },
    },
    yAxis: {
      type: "value",
      scale: !isBar,
      splitNumber: 4,
      axisLabel: { color: "#667085", fontSize: 11, ...(axisFormatter ? { formatter: axisFormatter } : {}) },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#edf1f5", type: "solid" } },
    },
    series: [
      {
        name: title,
        type: chartType,
        data,
        ...(isBar
          ? {
              barWidth: isPiStyleBar ? sparkAnalysisBarWidth(rows) : compactBarWidth(rows),
              barMaxWidth: isPiStyleBar ? 104 : 36,
              barCategoryGap: isPiStyleBar ? "14%" : "18%",
              itemStyle: { color, borderRadius: [6, 6, 0, 0], opacity: 0.88 },
              label: {
                show: true,
                position: "top",
                distance: 6,
                color: "#465160",
                backgroundColor: "rgba(250, 252, 255, 0.96)",
                borderRadius: 4,
                padding: [2, 4],
                fontSize: 10,
                fontWeight: 800,
                formatter: (params) => labelFormatter(params.value),
              },
              labelLayout: { hideOverlap: true },
              ...(Number.isFinite(averageValue) ? { markLine: averageMarkLine(averageValue, 2) } : {}),
            }
          : {
              smooth: false,
              symbol: "circle",
              symbolSize: 5,
              connectNulls: false,
              lineStyle: { width: 2.6 },
              itemStyle: { borderColor: "#ffffff", borderWidth: 1.5 },
              areaStyle: { opacity: 0.08 },
            }),
        emphasis: { focus: "series" },
      },
    ],
  };
}

function barDataItem(value, color, row = {}) {
  if (value === null) return null;
  const isNegative = value < 0;
  return {
    value,
    itemStyle: ytdBarItemStyle(row, {
      color,
      borderRadius: isNegative ? [0, 0, 6, 6] : [6, 6, 0, 0],
      opacity: 0.88,
    }),
    label: {
      position: isNegative ? "bottom" : "top",
      distance: 6,
    },
  };
}

export function ytdBarItemStyle(row, itemStyle) {
  if (!isYtdLikeRow(row)) return itemStyle;
  return {
    ...itemStyle,
    borderColor: "rgba(24, 33, 45, 0.48)",
    borderWidth: Math.max(Number(itemStyle.borderWidth || 0), 1.5),
    decal: { ...YTD_BAR_DECAL },
  };
}

export function isYtdLikeRow(row) {
  if (!row) return false;
  return Boolean(row.isYtd || row.isLatestYearTotal || /\bYTD\b/i.test(String(row.month || row.displayLabel || row.label || "")));
}

function buildPiStyleSparkRows(chartPoints, aggregateMode = "sum", expandedYears = []) {
  const sourceRows = chartPoints
    .filter((point) => Number.isFinite(point.value))
    .map((point) => makeSparkSourceRow(point.row, point.value))
    .sort((left, right) => Number(left.monthIndex || 0) - Number(right.monthIndex || 0));
  const years = [...new Set(sourceRows.map((row) => row.year).filter(Boolean))];
  if (years.length <= 1) return sourceRows;

  const latestYear = years[years.length - 1] || "";
  const groups = groupSparkRowsByYear(sourceRows);
  const expanded = new Set(expandedYears);

  return [...groups.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([year, items]) => {
      const sortedItems = sortSparkRowsByMonth(items);
      if (year === latestYear) {
        const ytdRow = buildAggregateSparkRow(year, sortedItems, {
          month: `${year} YTD`,
          label: "YTD",
          displayLabel: `${year} YTD`,
          isYtd: true,
          forceAxisLabel: true,
          monthIndex: Number(year) * 100 + 13,
        }, aggregateMode);
        return [
          ytdRow,
          ...buildCompleteSparkYearRows(year, sortedItems),
        ];
      }
      if (expanded.has(year)) {
        return sortedItems.map((item) => ({
          ...item,
          label: getMonthName(item.month) || item.month,
          isAnnual: false,
          sourceMonthCount: 1,
        }));
      }
      return [buildAggregateSparkRow(year, sortedItems, {
        label: shortYearLabel(year),
        displayLabel: `${year} 年`,
        isAnnual: true,
        monthIndex: Number(year) * 100,
      }, aggregateMode)];
    });
}

function makeSparkSourceRow(row, value) {
  const year = getMonthYear(row.month);
  return {
    ...row,
    value,
    label: getMonthName(row.month) || row.month,
    displayLabel: row.month,
    year,
    isAnnual: false,
    isYtd: false,
    isPlaceholder: false,
    hasSourceData: true,
    sourceMonthCount: 1,
    monthIndex: getMonthIndex(row.month),
  };
}

function buildCompleteSparkYearRows(year, items) {
  const rowsByMonth = new Map(items.map((item) => [getMonthNumber(item.month), item]));
  return MONTH_NAMES.map((monthName, index) => {
    const monthNumber = index + 1;
    const month = `${year} ${monthName}`;
    const sourceRow = rowsByMonth.get(monthNumber);
    if (sourceRow) {
      return {
        ...sourceRow,
        label: monthName,
        displayLabel: month,
        forceAxisLabel: true,
      };
    }
    return {
      month,
      label: monthName,
      displayLabel: month,
      year,
      value: 0,
      isAnnual: false,
      isYtd: false,
      isPlaceholder: true,
      hasSourceData: false,
      forceAxisLabel: true,
      sourceMonthCount: 0,
      monthIndex: Number(year) * 100 + monthNumber,
    };
  });
}

function buildAggregateSparkRow(year, items, overrides = {}, aggregateMode = "sum") {
  return {
    month: overrides.month || items[0]?.month || year,
    label: overrides.label || year,
    displayLabel: overrides.displayLabel || `${year} 年`,
    year,
    value: aggregateMode === "average" ? averageKnown(items.map((item) => item.value)) : sum(items, "value"),
    isAnnual: Boolean(overrides.isAnnual),
    isYtd: Boolean(overrides.isYtd),
    isPlaceholder: false,
    hasSourceData: items.length > 0,
    forceAxisLabel: Boolean(overrides.forceAxisLabel),
    sourceMonthCount: items.length || 0,
    monthIndex: overrides.monthIndex ?? Number(year) * 100,
  };
}

function groupSparkRowsByYear(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!row.year) return;
    if (!groups.has(row.year)) groups.set(row.year, []);
    groups.get(row.year).push(row);
  });
  return groups;
}

function sortSparkRowsByMonth(rows) {
  return [...rows].sort((left, right) => Number(left.monthIndex || 0) - Number(right.monthIndex || 0));
}

function shouldShowSparkAxisLabel(rows, index) {
  const total = rows.length;
  const row = rows[index] || {};
  if (row.forceAxisLabel || row.isAnnual || total <= 14) return true;
  if (index === 0 || index === total - 1) return true;
  const monthNumber = getMonthNumber(row.month);
  if (!monthNumber) return index % Math.ceil(total / 10) === 0;
  if (total <= 24) return index % 2 === 0 || monthNumber === 1;
  if (total <= 40) return [1, 4, 7, 10].includes(monthNumber);
  return monthNumber === 1 || monthNumber === 7;
}

function sparkAnalysisBarWidth(rows) {
  const count = rows.length;
  if (count <= 4) return "76%";
  if (count <= 8) return "68%";
  if (count <= 16) return "56%";
  return "44%";
}

function compactBarWidth(rows) {
  const count = rows.length;
  if (count <= 8) return "48%";
  if (count <= 16) return "42%";
  if (count <= 28) return "34%";
  return "28%";
}

function buildPiMonthlyRows(rows, latestYear, expandedYears = [], latestYearPosition = "front", scopeRate = 0) {
  const groups = groupRowsByYear(rows);
  const expanded = new Set(expandedYears);
  return [...groups.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([year, items]) => {
      const sortedItems = sortRowsByMonth(items);
      if (year === latestYear) {
        const ytdRow = buildYtdPiRow(year, sortedItems, scopeRate);
        const monthRows = buildCompleteYearMonthRows(year, sortedItems, scopeRate);
        return latestYearPosition === "front" ? [ytdRow, ...monthRows] : [...monthRows, ytdRow];
      }
      if (expanded.has(year)) {
        return sortedItems.map((item) => toMonthlyPiSourceRow(item, year, scopeRate));
      }
      return [buildAnnualPiRow(year, sortedItems, scopeRate)];
    });
}

function makePiMonthRow(month, row = {}, label = month) {
  const attendanceHours = Number(row.attendanceHours || 0);
  const repairHours = Number(row.repairHours || 0);
  const pm01Hours = Number(row.pm01Hours || 0);
  const pm03Hours = Number(row.pm03Hours || 0);
  const transferHours = Number(row.transferHours || 0);
  const piHours = piNumeratorFromValues(pm01Hours, pm03Hours, transferHours);
  const averageBasisAttendanceHours = averageBasisAttendance(row, attendanceHours);
  const averageBasisPiHours = averageBasisPi(row, piHours);
  const pi = repairEfficiencyFromTotals(averageBasisAttendanceHours, averageBasisPiHours);
  return {
    month,
    label: label || month,
    monthIndex: getMonthIndex(month),
    hasData: Boolean(row.month) && averageBasisAttendanceHours > 0,
    attendanceHours,
    repairHours,
    orderCount: Number(row.orderCount || 0),
    pm01Hours,
    pm03Hours,
    transferHours,
    averageBasisAttendanceHours,
    averageBasisPiHours,
    pi,
  };
}

function buildCompleteYearMonthRows(year, items, scopeRate) {
  const rowsByMonth = new Map(items.map((item) => [getMonthNumber(item.month), item]));
  return MONTH_NAMES.map((monthName, index) => {
    const monthNumber = index + 1;
    const month = `${year} ${monthName}`;
    const sourceRow = rowsByMonth.get(monthNumber);
    if (sourceRow) {
      return toMonthlyPiSourceRow(sourceRow, year, scopeRate);
    }
    return {
      ...makePiMonthRow(month, { month }, monthName),
      year,
      label: monthName,
      isAnnual: false,
      isPlaceholder: true,
      hasData: true,
      hasSourceData: false,
      forceAxisLabel: true,
      monthIndex: Number(year) * 100 + monthNumber,
      averagePi: scopeRate,
      piGap: -scopeRate,
    };
  });
}

function toMonthlyPiSourceRow(row, year, scopeRate) {
  return {
    ...row,
    label: getMonthName(row.month) || row.label,
    year,
    isAnnual: false,
    isPlaceholder: false,
    hasSourceData: true,
    forceAxisLabel: true,
    sourceMonthCount: 1,
    averagePi: scopeRate,
    piGap: row.pi - scopeRate,
  };
}

function buildAnnualPiRow(year, items, scopeRate) {
  return buildAggregatePiRow(year, items, {
    label: shortYearLabel(year),
    displayLabel: `${year} 年`,
    isAnnual: true,
    monthIndex: Number(year) * 100,
  }, scopeRate);
}

function buildYtdPiRow(year, items, scopeRate) {
  return buildAggregatePiRow(year, items, {
    month: `${year} YTD`,
    label: "YTD",
    displayLabel: `${year} YTD`,
    isYtd: true,
    forceAxisLabel: true,
    monthIndex: Number(year) * 100 + 13,
  }, scopeRate);
}

function buildAggregatePiRow(year, items, overrides = {}, scopeRate = 0) {
  const attendanceHours = sum(items, "attendanceHours");
  const repairHours = sum(items, "repairHours");
  const pm01Hours = sum(items, "pm01Hours");
  const pm03Hours = sum(items, "pm03Hours");
  const transferHours = sum(items, "transferHours");
  const averageBasisAttendanceHours = sumAverageBasisAttendance(items);
  const averageBasisPiHours = sumAverageBasisPiHours(items);
  const pi = repairEfficiencyFromTotals(averageBasisAttendanceHours, averageBasisPiHours);
  return {
    month: overrides.month || items[0]?.month || year,
    label: overrides.label || year,
    displayLabel: overrides.displayLabel || year,
    year,
    isAnnual: Boolean(overrides.isAnnual),
    isYtd: Boolean(overrides.isYtd),
    isPlaceholder: false,
    hasSourceData: items.length > 0,
    forceAxisLabel: Boolean(overrides.forceAxisLabel),
    sourceMonthCount: items.length || 0,
    monthIndex: overrides.monthIndex ?? Number(year) * 100,
    hasData: averageBasisAttendanceHours > 0,
    attendanceHours,
    repairHours,
    orderCount: sum(items, "orderCount"),
    pm01Hours,
    pm03Hours,
    transferHours,
    averageBasisAttendanceHours,
    averageBasisPiHours,
    averagePi: scopeRate,
    pi,
    piGap: pi - scopeRate,
  };
}

function groupRowsByYear(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const year = getMonthYear(row.month);
    if (!year) return;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(row);
  });
  return groups;
}

function sortRowsByMonth(rows) {
  return [...rows].sort((left, right) => Number(left.monthIndex || getMonthIndex(left.month)) - Number(right.monthIndex || getMonthIndex(right.month)));
}

function piAnalysisCategoryAxis(rows, latestYear) {
  return {
    type: "category",
    data: rows.map((row) => row.label),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#d7dde5" } },
    axisLabel: {
      color: "#667085",
      hideOverlap: true,
      interval: (index) => shouldShowPiAnalysisAxisLabel(rows, index),
      formatter: (value, index) => formatPiAnalysisAxisLabel(rows[index] || { label: value }, rows.length, index, latestYear),
      margin: rows.length > 24 ? 12 : 8,
      rotate: rows.length > 14 && rows.length <= 24 ? 24 : 0,
    },
  };
}

function shouldShowPiAnalysisAxisLabel(rows, index) {
  const total = rows.length;
  const row = rows[index] || {};
  if (row.forceAxisLabel) return true;
  if (row.isAnnual || total <= 14) return true;
  if (index === 0 || index === total - 1) return true;

  const monthNumber = getMonthNumber(row.month);
  if (!monthNumber) return index % Math.ceil(total / 10) === 0;
  if (total <= 24) return index % 2 === 0 || monthNumber === 1;
  if (total <= 40) return [1, 4, 7, 10].includes(monthNumber);
  return monthNumber === 1 || monthNumber === 7;
}

function formatPiAnalysisAxisLabel(row, total, index, latestYear) {
  if (row.isAnnual) return row.label;
  const year = getMonthYear(row.month);
  const month = getMonthName(row.month);
  if (!year || !month) return row.label;
  if (year === latestYear) return month;
  if (total <= 24) return month;
  if (month === "Jan" || index === 0 || index === total - 1) return month;
  return month;
}

function piAnalysisBarWidth(rows, useAnnual) {
  const count = rows.length;
  if (count <= 4) return "76%";
  if (count <= 8) return "68%";
  if (!useAnnual) return "58%";
  if (count <= 16) return "56%";
  return "44%";
}

function piChartValue(row) {
  if (row?.isPlaceholder) return 0;
  return row?.hasData ? round(row.pi * 100, 1) : null;
}

function piChartDataItem(row, referencePercent, palette) {
  const value = piChartValue(row);
  if (value === null) return null;
  return {
    value,
    itemStyle: ytdBarItemStyle(row, { color: value >= referencePercent ? palette.good : palette.warning }),
  };
}

function workMixTotal(row) {
  return Number(row.pm01Hours || 0) + Number(row.pm03Hours || 0) + Number(row.transferHours || 0);
}

function formatPiMonthlyTooltip(params, rows, context) {
  const items = Array.isArray(params) ? params : [params];
  const row = rows[items[0]?.dataIndex] || {};
  const value = round(Number(row.pi || 0) * 100, 1);
  const piColor = value >= context.referencePercent ? context.palette.good : context.palette.warning;
  return [
    piAnalysisDisplayLabel(row),
    `${marker(piColor)}PI ${context.formatPercent(row.pi)}`,
    `${marker(context.palette.reference)}${context.referenceName} ${context.formatPercent(context.referenceRate)}`,
    `PI 工时 ${context.formatHours(workMixTotal(row))}`,
    `出勤时间 ${context.formatHours(row.attendanceHours)}`,
    row.isYtd ? `统计月数 ${context.formatMonthCount(row.sourceMonthCount)}` : "",
    row.isPlaceholder ? "暂无数据，按 0 显示" : "",
  ].filter(Boolean).join("<br/>");
}

function piAnalysisDisplayLabel(row) {
  if (!row) return "";
  if (row.displayLabel) return row.displayLabel;
  if (row.isAnnual) return row.label || "";
  return getMonthName(row.month) || row.label || "";
}

function averageBasisAttendance(row, fallback = 0) {
  return hasAverageBasisValue(row, "averageBasisAttendanceHours") ? Number(row.averageBasisAttendanceHours || 0) : Number(fallback || 0);
}

function averageBasisPi(row, fallback = 0) {
  return hasAverageBasisValue(row, "averageBasisPiHours") ? Number(row.averageBasisPiHours || 0) : Number(fallback || 0);
}

function hasAverageBasisValue(row, field) {
  return row && row[field] !== undefined && row[field] !== null && row[field] !== "";
}

function sumAverageBasisAttendance(records) {
  return records.reduce((total, record) => total + averageBasisAttendance(record, Number(record.attendanceHours || 0)), 0);
}

function sumAverageBasisPiHours(records) {
  return records.reduce((total, record) => total + averageBasisPi(record, piNumeratorForRecord(record)), 0);
}

function piNumeratorFromValues(pm01Hours, pm03Hours, transferHours) {
  return Number(pm01Hours || 0) + Number(pm03Hours || 0) + Number(transferHours || 0);
}

function piNumeratorForRecord(record) {
  return piNumeratorFromValues(record.pm01Hours, record.pm03Hours, record.transferHours);
}

function repairEfficiencyFromTotals(attendanceHours, piHours) {
  const attendance = Number(attendanceHours || 0);
  if (attendance <= 0) return 0;
  return Number(piHours || 0) / attendance;
}

function darkTooltip(trigger = "axis") {
  return {
    trigger,
    backgroundColor: "#18212d",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  };
}

function chartGrid(left = 46, right = 24, top = 30, bottom = 36) {
  return { left, right, top, bottom, containLabel: false };
}

function percentAxis() {
  return {
    type: "value",
    splitLine: { lineStyle: { color: "#edf1f5" } },
    axisLabel: { color: "#667085", formatter: "{value}%" },
  };
}

function percentageReferenceMarkLine(rate, color = "#596171", width = 1.5) {
  return {
    symbol: ["none", "none"],
    label: { show: false },
    silent: true,
    lineStyle: { color, type: "dashed", width },
    data: [{ yAxis: round(Number(rate || 0) * 100, 1) }],
    z: 1,
    zlevel: 0,
  };
}

function percentageReferenceGraphic(rate, label = "均值", color = "#596171") {
  const text = label || defaultFormatPercent(rate);
  return [
    {
      type: "group",
      right: 6,
      top: 0,
      silent: true,
      children: [
        {
          type: "line",
          shape: { x1: 0, y1: 8, x2: 22, y2: 8 },
          style: { stroke: color, lineWidth: 2, lineDash: [6, 4] },
        },
        {
          type: "text",
          left: 28,
          top: 0,
          style: {
            text,
            fill: color,
            font: "700 12px Aptos, Segoe UI, sans-serif",
          },
        },
      ],
    },
  ];
}

function formatPiStyleSparkTooltip(params, rows, title, color, valueFormatter) {
  const items = Array.isArray(params) ? params : [params];
  const row = rows[items[0]?.dataIndex] || {};
  return [
    row.displayLabel || row.month || row.label,
    `${marker(color)}${title} ${valueFormatter(row.value)}`,
    row.isAnnual || row.isYtd ? `统计月数 ${formatCount(row.sourceMonthCount)} 月` : "",
    row.isPlaceholder ? "暂无数据，按 0 显示" : "",
  ].filter(Boolean).join("<br/>");
}

function getMonthYear(label) {
  const match = String(label || "").match(/^(\d{4})\s+[A-Za-z]{3}$/);
  return match ? match[1] : "";
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  return Number(match[1]) * 100 + MONTH_NAMES.indexOf(match[2]) + 1;
}

function getMonthNumber(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? MONTH_NAMES.indexOf(match[1]) + 1 : 0;
}

function getMonthName(label) {
  const match = String(label || "").match(/^\d{4}\s+([A-Za-z]{3})$/);
  return match ? match[1] : "";
}

function shortYearLabel(year) {
  const text = String(year || "");
  return text.length === 4 ? text.slice(2) : text;
}

function marker(color) {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>`;
}

function emptyToNull(value, zeroAsNull = false) {
  if (value === null || value === undefined || value === "") return null;
  if (zeroAsNull && Number(value) === 0) return null;
  return Number(value);
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function formatCount(value) {
  return formatInteger(value);
}

function averageKnown(values) {
  const known = values.map(Number).filter(Number.isFinite);
  return known.length ? known.reduce((total, value) => total + value, 0) / known.length : null;
}

function averageMarkLine(value, width = 1.5) {
  return {
    symbol: ["none", "none"],
    label: { show: false },
    silent: true,
    lineStyle: { color: "#596171", type: "dashed", width },
    data: [{ yAxis: Number(value.toFixed(2)) }],
    z: 1,
    zlevel: 0,
  };
}

function averageGraphic(label = "均值") {
  return [
    {
      type: "group",
      right: 6,
      top: 0,
      silent: true,
      children: [
        {
          type: "line",
          shape: { x1: 0, y1: 8, x2: 22, y2: 8 },
          style: { stroke: "#596171", lineWidth: 2, lineDash: [6, 4] },
        },
        {
          type: "text",
          left: 28,
          top: 0,
          style: {
            text: label,
            fill: "#596171",
            font: "700 12px Aptos, Segoe UI, sans-serif",
          },
        },
      ],
    },
  ];
}

function formatDelta(delta, formatter) {
  if (Math.abs(delta) < 0.0001) return "持平";
  return `较上月 ${delta > 0 ? "+" : ""}${formatter(delta)}`;
}

function round(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function defaultFormatPercent(value) {
  return formatPercent(value);
}

function defaultFormatNumber(value) {
  return formatInteger(value);
}

function defaultFormatHours(value) {
  return formatHours(value);
}

function defaultFormatMonthCount(value) {
  return `${formatDecimal(value, 0)} 月`;
}
