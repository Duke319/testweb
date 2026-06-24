const API_BASE = import.meta.env.VITE_API_BASE || "";
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";
const EMPTY_DETAIL = { profile: null, comparisons: {}, monthlyTrends: [], records: [] };
let authToken = "";

export function setPerformanceAuthToken(token) {
  authToken = token || "";
}

function staticSnapshot() {
  return window.__BOSCH_STATIC_DEMO__ || {};
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function request(path, params) {
  if (STATIC_DEMO) {
    return requestStatic(path, params);
  }
  const headers = { Accept: "application/json" };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const response = await fetch(`${API_BASE}${path}${toQuery(params)}`, { headers });
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return response.json();
}

const EDITOR_SCOPES = {
  editor01: "TEF31",
  editor02: "TEF32",
  editor03: "TEF33",
  root: "TEF31",
};

function currentStaticScope() {
  const username = String(authToken || "").replace(/^static-demo-/, "");
  return EDITOR_SCOPES[username] || "";
}

function withStaticScope(filters = {}) {
  const scope = currentStaticScope();
  return scope ? { ...filters, businessArea: "", department: scope } : { ...filters };
}

function getMonthIndex(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) return 0;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Number(match[1]) * 100 + monthNames.indexOf(match[2]) + 1;
}

function departmentMatches(row = {}, department = "") {
  if (!department) return true;
  const explicitDepartments = [row.department, row.sourceDepartment].map((value) => String(value || "").trim()).filter(Boolean);
  if (explicitDepartments.length) {
    return explicitDepartments.includes(department);
  }
  return String(row.performanceDepartment || "").trim() === department;
}

function filterStaticRows(rows = [], params = {}) {
  const filters = withStaticScope(params);
  const fromIndex = filters.monthFrom ? getMonthIndex(filters.monthFrom) : 0;
  const toIndex = filters.monthTo ? getMonthIndex(filters.monthTo) : 0;
  return rows.filter((row) => {
    if (filters.year && String(row.year || "") !== String(filters.year)) return false;
    if (filters.month && row.month !== filters.month) return false;
    if (fromIndex && getMonthIndex(row.month) < fromIndex) return false;
    if (toIndex && getMonthIndex(row.month) > toIndex) return false;
    if (filters.businessArea && row.businessArea && row.businessArea !== filters.businessArea) return false;
    if (!departmentMatches(row, filters.department)) return false;
    if (filters.workshop && row.workshop && row.workshop !== filters.workshop) return false;
    if (filters.shift && row.shift && row.shift !== filters.shift) return false;
    if (filters.employeeKey && row.employeeKey !== filters.employeeKey) return false;
    return true;
  });
}

function staticSummaryFromRows(rows = [], fallback = {}) {
  const employeeKeys = new Set(rows.map((row) => row.employeeKey).filter(Boolean));
  const attendance = rows.reduce((total, row) => total + (Number(row.attendanceHours) || 0), 0);
  const piHours = rows.reduce((total, row) => total + (Number(row.pm01Hours) || 0) + (Number(row.pm03Hours) || 0) + (Number(row.transferHours) || 0), 0);
  return {
    ...fallback,
    employeeCount: employeeKeys.size,
    departmentCount: new Set(rows.map((row) => row.department).filter(Boolean)).size,
    totalAttendanceHours: attendance,
    totalRepairHours: rows.reduce((total, row) => total + (Number(row.repairHours) || 0), 0),
    totalOrderCount: rows.reduce((total, row) => total + (Number(row.orderCount) || 0), 0),
    avgRepairEfficiency: attendance > 0 ? piHours / attendance : 0,
    totalOvertimeHours: rows.reduce((total, row) => total + (Number(row.overtimeTotalHours) || 0), 0),
    totalCompositeHours: rows.reduce((total, row) => total + (Number(row.compositeHours) || 0), 0),
  };
}

function sumStaticField(rows = [], field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function averageStaticField(rows = [], field) {
  const values = rows.map((row) => Number(row[field])).filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function scopedStaticAdmin(snapshot, params = {}) {
  const filters = withStaticScope(params);
  const rawRecords = filterStaticRows(snapshot.admin?.rawRecords || [], filters);
  const employees = filterStaticRows(snapshot.admin?.employees || [], filters);
  return {
    ...(snapshot.admin || {}),
    summary: staticSummaryFromRows(rawRecords, snapshot.admin?.summary || {}),
    employees,
    rawRecords,
    quarantinedRecords: filterStaticRows(snapshot.admin?.quarantinedRecords || [], filters),
    filterOptions: {
      ...(snapshot.admin?.filterOptions || {}),
      departments: [...new Set(rawRecords.map((row) => row.department).filter(Boolean))].sort(),
      employees: (snapshot.admin?.filterOptions?.employees || []).filter((row) => departmentMatches(row, filters.department)),
    },
  };
}

function scopedStaticBoss(snapshot, params = {}) {
  const admin = scopedStaticAdmin(snapshot, params);
  return {
    ...(snapshot.boss || {}),
    summary: staticSummaryFromRows(admin.rawRecords, snapshot.boss?.summary || {}),
    topEmployees: filterStaticRows(snapshot.boss?.topEmployees || [], params),
    attentionEmployees: filterStaticRows(snapshot.boss?.attentionEmployees || [], params),
    filterOptions: admin.filterOptions,
  };
}

function scopedStaticAuthenticity(snapshot, params = {}) {
  const anomalies = filterStaticRows(snapshot.dataAuthenticity?.anomalies || [], params);
  const admin = scopedStaticAdmin(snapshot, params);
  return {
    ...(snapshot.dataAuthenticity || {}),
    anomalies,
    summary: {
      ...(snapshot.dataAuthenticity?.summary || {}),
      totalRecords: admin.rawRecords.length,
      validRecords: admin.rawRecords.length,
      quarantinedRecords: anomalies.filter((item) => item.category === "数据真实性").length,
      criticalCount: anomalies.filter((item) => item.category === "数据真实性" && item.severity === "critical").length,
      totalAnomalies: anomalies.length,
      totalCriticalCount: anomalies.filter((item) => item.severity === "critical").length,
      filteredQuarantinedRecords: anomalies.length,
    },
    importBatches: (snapshot.dataAuthenticity?.importBatches || []).map((batch) => ({
      ...batch,
      recordCount: admin.rawRecords.length,
      validRecordCount: admin.rawRecords.length,
      quarantinedRecordCount: anomalies.filter((item) => item.category === "数据真实性").length,
      totalAnomalyCount: anomalies.length,
    })),
  };
}

function buildStaticEmployeeDetail(snapshot, employeeKey, params = {}) {
  const filters = withStaticScope(params);
  const allRows = (snapshot.admin?.rawRecords || []).filter((row) => row.employeeKey === employeeKey);
  const scopedRows = filterStaticRows(allRows, filters);
  const profile = (snapshot.admin?.employees || []).find((employee) => employee.employeeKey === employeeKey) || allRows[0] || null;
  if (!profile || !departmentMatches(profile, filters.department)) {
    return EMPTY_DETAIL;
  }

  const departmentEmployees = (snapshot.admin?.employees || []).filter((employee) => employee.department === profile.department);
  const overallEmployees = snapshot.admin?.employees || [];
  const overallAvgRepairEfficiency = averageStaticField(overallEmployees, "repairEfficiency") || 0;
  const detailRows = scopedRows.length ? scopedRows : allRows;
  const lastRow = detailRows[detailRows.length - 1] || {};

  return {
    source: "static-demo",
    profile,
    comparisons: {
      selectedMonth: params.month || lastRow.month || profile.month || "",
      department: profile.department || "",
      departmentEmployeeCount: departmentEmployees.length,
      overallEmployeeCount: overallEmployees.length,
      departmentAvgRepairEfficiency: averageStaticField(departmentEmployees, "repairEfficiency"),
      overallAvgRepairEfficiency,
      repairEfficiencyDelta: Number(profile.repairEfficiency || 0) - overallAvgRepairEfficiency,
      orderCountDelta: 0,
      repairHoursDelta: 0,
    },
    monthlyTrends: scopedRows,
    records: scopedRows,
    improvementSummary: {
      nearMissCount: sumStaticField(scopedRows, "nearMissCount"),
      nearMissBenefit: sumStaticField(scopedRows, "nearMissBenefit"),
      pdcaCount: sumStaticField(scopedRows, "pdcaCount"),
      pdcaBenefit: sumStaticField(scopedRows, "pdcaBenefit"),
      pdcaAwardCount: sumStaticField(scopedRows, "pdcaAwardCount"),
      kaizenCount: sumStaticField(scopedRows, "kaizenCount"),
      kaizenBenefit: sumStaticField(scopedRows, "kaizenBenefit"),
      kaizenAwardCount: sumStaticField(scopedRows, "kaizenAwardCount"),
    },
    improvementTrend: scopedRows.filter((row) => row.nearMissCount || row.pdcaCount || row.kaizenCount),
    improvementRecords: [],
    provenance: scopedRows.map((row) => ({
      id: row.id,
      month: row.month,
      employeeKey: row.employeeKey,
      employeeName: row.employeeName,
      validationStatus: row.validationStatus || "valid",
      provenance: row.provenance || null,
    })),
    dataQuality: { source: "static-demo", totalRecords: scopedRows.length, validRecords: scopedRows.length, quarantinedRecords: 0, criticalCount: 0 },
  };
}

function requestStatic(path, params = {}) {
  const snapshot = staticSnapshot();
  if (path === "/api/performance/boss-summary") {
    return Promise.resolve(scopedStaticBoss(snapshot, params));
  }
  if (path === "/api/performance/admin/employees") {
    return Promise.resolve(scopedStaticAdmin(snapshot, params));
  }
  if (path === "/api/performance/competence-matrix") {
    return Promise.resolve({
      ...(snapshot.competence || {}),
      certificateTypes: snapshot.competence?.certificateTypes || [],
      employees: filterStaticRows(snapshot.competence?.employees || [], params),
    });
  }
  if (path === "/api/performance/repair-time-anomalies") {
    return Promise.resolve({
      ...(snapshot.repairTimeAnomalies || {}),
      records: filterStaticRows(snapshot.repairTimeAnomalies?.records || [], params),
    });
  }
  if (path === "/api/performance/safety-incidents") {
    return Promise.resolve({
      ...(snapshot.safetyIncidents || {}),
      employees: filterStaticRows(snapshot.safetyIncidents?.employees || [], params),
      records: filterStaticRows(snapshot.safetyIncidents?.records || [], params),
    });
  }
  if (path === "/api/performance/data-authenticity") {
    return Promise.resolve(scopedStaticAuthenticity(snapshot, params));
  }
  if (path === "/api/performance/data-gaps") {
    return Promise.resolve(scopedStaticAuthenticity(snapshot, params).gapChecklist || { rows: [] });
  }
  if (path === "/api/performance/data-source-coverage") {
    const authenticity = scopedStaticAuthenticity(snapshot, params);
    return Promise.resolve({
      summary: authenticity.summary || {},
      sourceCoverage: authenticity.sourceCoverage || { ledgers: [], totals: {} },
    });
  }
  if (path === "/api/performance/import-batches") {
    const authenticity = scopedStaticAuthenticity(snapshot, params);
    return Promise.resolve({
      importBatches: authenticity.importBatches || [],
      summary: authenticity.summary || {},
    });
  }

  const employeeMatch = path.match(/^\/api\/performance\/employees\/(.+)$/);
  if (employeeMatch) {
    const employeeKey = decodeURIComponent(employeeMatch[1]);
    const detail = snapshot.employeeDetails?.[employeeKey] || buildStaticEmployeeDetail(snapshot, employeeKey, params);
    const filters = withStaticScope(params);
    if (detail.profile && !departmentMatches(detail.profile, filters.department)) {
      return Promise.resolve(EMPTY_DETAIL);
    }
    return Promise.resolve({
      ...detail,
      records: filterStaticRows(detail.records || [], filters),
      monthlyTrends: filterStaticRows(detail.monthlyTrends || [], filters),
      provenance: filterStaticRows(detail.provenance || [], filters),
      improvementRecords: filterStaticRows(detail.improvementRecords || [], filters),
    });
  }

  const provenanceMatch = path.match(/^\/api\/performance\/records\/(.+)\/provenance$/);
  if (provenanceMatch) {
    const recordId = decodeURIComponent(provenanceMatch[1]);
    const record = (snapshot.admin?.rawRecords || []).find((item) => String(item.id) === String(recordId) || String(item.sourceId) === String(recordId));
    if (record && !departmentMatches(record, withStaticScope(params).department)) {
      return Promise.resolve({ record: null, provenance: null, anomalies: [] });
    }
    return Promise.resolve({ record: record || null, provenance: record?.provenance || null, anomalies: [] });
  }

  return Promise.reject(new Error(`Static demo data for ${path} is not available`));
}

export function getBossSummary(filters) {
  return request("/api/performance/boss-summary", filters);
}

export function getAdminEmployees(filters) {
  return request("/api/performance/admin/employees", filters);
}

export function getCompetenceMatrix(filters) {
  return request("/api/performance/competence-matrix", filters);
}

export function getRepairTimeAnomalies(filters) {
  return request("/api/performance/repair-time-anomalies", filters);
}

export function getSafetyIncidents(filters) {
  return request("/api/performance/safety-incidents", filters);
}

export function getDataAuthenticity(filters) {
  return request("/api/performance/data-authenticity", filters);
}

export function getDataGapChecklist() {
  return request("/api/performance/data-gaps");
}

export function getDataSourceCoverage() {
  return request("/api/performance/data-source-coverage");
}

export function getImportBatches() {
  return request("/api/performance/import-batches");
}

export function getRecordProvenance(recordId) {
  return request(`/api/performance/records/${encodeURIComponent(recordId)}/provenance`);
}

export function getEmployeeDetail(employeeKey, filters) {
  return request(`/api/performance/employees/${encodeURIComponent(employeeKey)}`, filters);
}
