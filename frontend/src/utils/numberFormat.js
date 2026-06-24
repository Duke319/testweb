export function formatInteger(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number).toLocaleString("en-US") : "0";
}

export function formatDecimal(value, digits = 1) {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : (0).toFixed(digits);
}

export function formatPercent(value, digits = 1) {
  return `${formatDecimal(Number(value || 0) * 100, digits)}%`;
}

export function formatHours(value, digits = 1) {
  return `${formatDecimal(value, digits)} hrs`;
}

export function formatMinutes(value, digits = 1) {
  return `${formatDecimal(value, digits)} min`;
}

export function formatMoney(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 10000) return `¥${formatDecimal(number / 10000, 1)}万`;
  return `¥${formatInteger(number)}`;
}

export function formatCompactMoney(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 10000) return `¥${formatDecimal(number / 10000, 1)}万`;
  if (Math.abs(number) >= 1000) return `¥${formatInteger(number / 1000)}k`;
  return `¥${formatInteger(number)}`;
}

export function formatNullable(value, formatter, emptyText = "暂无") {
  return value === null || value === undefined ? emptyText : formatter(value);
}
