const {
  readMonthlyWorkerData,
  readAppDb,
  readEmployeeCertificateData,
  readRepairTimeAnomalies,
  readPdcaImprovements,
  readNearMissRecords,
  readMockImprovementSupplements,
} = require("../repositories/fileRepository");
const { readCertificatesFromDatabase, readImprovementRecordsFromDatabase, readPerformanceRecordsFromDatabase } = require("../repositories/databaseRepository");
const { getDbType } = require("../../src/database");
const { buildDataAuthenticityAudit, gapRowsToCsv } = require("./dataAuthenticityService");
const {
  PI_AVERAGE_EXCLUSION_REASON,
  isPiExcludedEmployee,
  piExclusionReasonFor,
} = require("./piExclusionRules");

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HIDDEN_FILTER_MONTHS = new Set(["2026 May"]);
const PI_TARGET_RATE_80 = 0.8;
const PI_TARGET_RATE_101_MAINTENANCE = 0.85;
const CERTIFICATE_TYPES = [
  { code: "ELECTRICIAN", name: "电工证" },
  { code: "HEIGHT", name: "高空作业证" },
  { code: "FORKLIFT", name: "叉车证" },
  { code: "WELDING", name: "焊工证" },
  { code: "SAFETY", name: "安全员证" },
  { code: "JUNIOR_TECHNICIAN", name: "初级技工证" },
  { code: "INTERMEDIATE_TECHNICIAN", name: "中级技工证" },
  { code: "SENIOR_TECHNICIAN", name: "高级技工证" },
  { code: "TECHNICIAN", name: "技师证" },
  { code: "ADVANCED_TECHNICIAN", name: "高级技师证" },
];

const EMPLOYEE_PROFILE_OVERRIDES = [
  { employeeNo: "88156828", name: "杜业波", positionTitle: "101 班长" },
  { employeeNo: "88153359", name: "来宋江", positionTitle: "101 班长" },
  { employeeNo: "88156089", name: "郑平", positionTitle: "101 班长" },
  { employeeNo: "88154660", name: "鲁孟云", positionTitle: "101 班长" },
  { employeeNo: "88152751", name: "方建", positionTitle: "101 班长" },
  { employeeNo: "88161821", name: "王一志", positionTitle: "103 班长" },
  { employeeNo: "88163080", name: "蒋卫强", positionTitle: "103 班长" },
  { employeeNo: "88165532", name: "郑余忠", positionTitle: "103 班长" },
  { employeeNo: "88160181", name: "何彪", positionTitle: "104 班长" },
  { employeeNo: "88161732", name: "刘卫兵", positionTitle: "104 班长" },
  { employeeNo: "88165319", name: "刘涛", positionTitle: "104 班长" },
  { employeeNo: "88153019", name: "刘斌", positionTitle: "整改" },
  { employeeNo: "85651398", name: "周永顶", positionTitle: "101 模具负责" },
  { employeeNo: "88150245", name: "周小飞", positionTitle: "101 模具负责" },
];
const EMPLOYEE_PROFILE_BY_NO = new Map(EMPLOYEE_PROFILE_OVERRIDES.map((item) => [item.employeeNo, item]));
const EMPLOYEE_PROFILE_BY_NAME = new Map(EMPLOYEE_PROFILE_OVERRIDES.map((item) => [item.name, item]));

function round(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Number(number.toFixed(digits));
}

function hasMetricValue(record, field) {
  return record[field] !== undefined && record[field] !== null && record[field] !== "";
}

function metricNumber(record, field) {
  return hasMetricValue(record, field) ? Number(record[field]) : null;
}

function piNumeratorFromValues(pm01Hours, pm03Hours, transferHours) {
  return Number(pm01Hours || 0) + Number(pm03Hours || 0) + Number(transferHours || 0);
}

function piNumeratorForRecord(record) {
  return piNumeratorFromValues(record.pm01Hours, record.pm03Hours, record.transferHours);
}

function piNumerator(records) {
  return records.reduce((total, record) => total + piNumeratorForRecord(record), 0);
}

function repairEfficiencyPi(attendanceHours, pm01Hours, pm03Hours, transferHours) {
  const attendance = Number(attendanceHours || 0);
  if (attendance <= 0) {
    return 0;
  }
  return piNumeratorFromValues(pm01Hours, pm03Hours, transferHours) / attendance;
}

function repairEfficiencyFromNumerator(attendanceHours, numerator) {
  const attendance = Number(attendanceHours || 0);
  if (attendance <= 0) {
    return 0;
  }
  return Number(numerator || 0) / attendance;
}

function parseMonthLabel(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) {
    return { year: "", month: 0 };
  }
  return {
    year: match[1],
    month: MONTH_NAMES.indexOf(match[2]) + 1,
  };
}

function getMonthIndex(label) {
  const parts = parseMonthLabel(label);
  return Number(parts.year || 0) * 100 + Number(parts.month || 0);
}

function inferDepartment(record) {
  if (record.department) {
    return record.department;
  }
  return "";
}

function normalizePositionTitle(value) {
  const title = String(value || "").trim();
  return title === "维修技师" ? "" : title;
}

function firstPositionTitle(...values) {
  for (const value of values) {
    const title = normalizePositionTitle(value);
    if (title) {
      return title;
    }
  }
  return "";
}

function findEmployeeProfileOverride(record, employeeName) {
  const employeeNo = normalizeEmployeeNo(record.employeeNo || record.employee_no);
  const normalizedName = normalizeEmployeeName(employeeName || record.employeeName || record.employee_name || record.sourceName);
  return EMPLOYEE_PROFILE_BY_NO.get(employeeNo) || EMPLOYEE_PROFILE_BY_NAME.get(normalizedName) || null;
}

function inferPositionTitle(record, employeeName) {
  const profileOverride = findEmployeeProfileOverride(record, employeeName);
  if (profileOverride?.positionTitle) {
    return profileOverride.positionTitle;
  }
  return firstPositionTitle(record.positionTitle, record.position_title, record.jobTitle, record.job_title, record.role);
}

function inferPlantCode(record = {}) {
  const directPlant = String(record.plant || record.workshop_code || "").trim();
  const directMatch = directPlant.match(/\b(101|103|104)\b/);
  if (directMatch) {
    return directMatch[1];
  }

  const fields = [
    record.businessArea && record.plant ? `${record.businessArea} / ${record.plant}` : "",
    record.department,
    record.workshop,
  ].filter(Boolean);
  const matched = fields.map((value) => String(value).match(/(^|[^\d])(101|103|104)(?:厂房|车间)?($|[^\d])/)).find(Boolean);
  return matched ? matched[2] : "";
}

function isMaintenanceGroupRecord(record = {}) {
  return [record.shift, record.team, record.department, record.workshop, record.employeeKey]
    .filter(Boolean)
    .some((value) => /维护组|维护团队/.test(String(value)));
}

function inferPiTarget(record = {}) {
  const plant = inferPlantCode(record);
  if (plant === "101") {
    const isMaintenance = isMaintenanceGroupRecord(record);
    return {
      rate: isMaintenance ? PI_TARGET_RATE_101_MAINTENANCE : PI_TARGET_RATE_80,
      label: isMaintenance ? "101 维护组 85%" : "101 非维护组 80%",
    };
  }
  if (["103", "104"].includes(plant)) {
    return {
      rate: PI_TARGET_RATE_80,
      label: `${plant} 80%`,
    };
  }
  return null;
}

function inferAverageExclusion(record, employeeName) {
  return isPiExcludedEmployee(record, employeeName);
}

function inferAverageExclusionReason(record, employeeName) {
  return piExclusionReasonFor(record, employeeName);
}

function averageEligibleRecords(records = []) {
  return records.filter((record) => !record.excludeFromAverages);
}

function isRepairHoursQualityRecord(record = {}) {
  return Boolean(record.repairHoursQualityReason || record.repairHoursQualityIssue || hasMetricValue(record, "repairHoursSourceValue"));
}

function combineAverageExclusionReasons(...reasons) {
  return [...new Set(reasons.map((reason) => String(reason || "").trim()).filter(Boolean))].join("；");
}

function applyConfiguredPiAverageExclusions(record = {}) {
  const configuredExcludeFromAverages = inferAverageExclusion(record, record.employeeName);
  return {
    ...record,
    excludeFromAverages: Boolean(record.excludeFromAverages || configuredExcludeFromAverages),
    averageExclusionReason: combineAverageExclusionReasons(record.averageExclusionReason, inferAverageExclusionReason(record, record.employeeName)),
  };
}

function employeeCountIdentity(record = {}) {
  const employeeNo = normalizeEmployeeNo(record.employeeNo || record.employee_no);
  if (employeeNo) {
    return `no:${employeeNo}`;
  }

  const employeeName = normalizeEmployeeName(record.employeeName || record.employee_name || record.sourceName);
  const profileOverride = findEmployeeProfileOverride(record, employeeName);
  if (profileOverride?.employeeNo) {
    return `no:${profileOverride.employeeNo}`;
  }

  if (employeeName) {
    return `name:${employeeName}`;
  }

  return record.employeeKey ? `key:${record.employeeKey}` : "";
}

function uniqueEmployeeCount(records = []) {
  return new Set(records.map(employeeCountIdentity).filter(Boolean)).size;
}

function normalizeRecord(record, index = 0) {
  const parts = parseMonthLabel(record.month);
  const shift = record.shift || record.team || "未分组";
  const employeeName = record.employeeName || record.employee_name || "未命名员工";
  const employeeKey = record.employeeKey || `${shift}::${employeeName}`;
  const department = inferDepartment(record);
  const positionTitle = inferPositionTitle(record, employeeName);
  const profileExcludeFromAverages = inferAverageExclusion(record, employeeName);
  const profileAverageExclusionReason = inferAverageExclusionReason(record, employeeName);
  const inferredPiTarget = inferPiTarget({ ...record, shift, employeeKey });
  const sourcePiTargetRate = hasMetricValue(record, "piTargetRate")
    ? Number(record.piTargetRate)
    : hasMetricValue(record, "pi_target_rate")
      ? Number(record.pi_target_rate)
      : null;
  const piTargetRate = inferredPiTarget?.rate ?? sourcePiTargetRate;
  const attendanceHours = Number(record.attendanceHours) || 0;
  const orderCount = Number(record.orderCount) || 0;
  const repairHours = Number(record.repairHours) || 0;
  const overtime15Hours = round(Number(record.overtime15Hours) || 0, 1);
  const overtime20Hours = round(Number(record.overtime20Hours) || 0, 1);
  const overtime30Hours = round(Number(record.overtime30Hours) || 0, 1);
  const leaveHours = round(
    hasMetricValue(record, "leaveHours")
      ? Number(record.leaveHours)
      : (Number(record.annualLeaveHours) || 0) + (Number(record.sickLeaveHours) || 0),
    1
  );
  const annualLeaveHours = round(Number(record.annualLeaveHours) || leaveHours, 1);
  const sickLeaveHours = round(Number(record.sickLeaveHours) || 0, 1);
  const pm01Value = metricNumber(record, "pm01Hours");
  const pm03Value = metricNumber(record, "pm03Hours");
  const transferValue = metricNumber(record, "transferHours");
  const pm01Hours = pm01Value === null ? 0 : round(pm01Value, 1);
  const pm03Hours = pm03Value === null ? 0 : round(pm03Value, 1);
  const transferHours = transferValue === null ? 0 : round(transferValue, 1);
  const otTotal = overtime15Hours + overtime20Hours;
  const compositeHours = hasMetricValue(record, "compositeHours") ? round(Number(record.compositeHours), 1) : round(otTotal - leaveHours, 1);
  const repairEfficiency = repairEfficiencyPi(attendanceHours, pm01Hours, pm03Hours, transferHours);
  const sourceExcludeFromAverages = Boolean(record.excludeFromAverages || record.exclude_from_averages);
  const sourceAverageExclusionReason = record.averageExclusionReason || record.average_exclusion_reason || "";
  const excludeFromAverages = sourceExcludeFromAverages || profileExcludeFromAverages;
  const averageExclusionReason = combineAverageExclusionReasons(sourceAverageExclusionReason, profileAverageExclusionReason);

  return {
    id: record.id || `${employeeKey}::${record.month || index}`,
    sourceId: record.sourceId || "",
    employeeId: record.employeeId || "",
    employeeNo: record.employeeNo || record.employee_no || "",
    positionTitle,
    jobTitle: normalizePositionTitle(record.jobTitle || record.job_title),
    role: normalizePositionTitle(record.role),
    excludeFromAverages,
    averageExclusionReason,
    piTargetRate: Number.isFinite(piTargetRate) ? piTargetRate : null,
    piTargetLabel: inferredPiTarget?.label || record.piTargetLabel || record.pi_target_label || "",
    businessArea: record.businessArea || record.business_area || "Tools",
    plant: String(record.plant || "101"),
    employmentStatus: record.employmentStatus || record.employment_status || "active",
    isHistoricalEmployee: Boolean(record.isHistoricalEmployee || record.is_historical_employee),
    employeeKey,
    employeeName,
    department,
    workshop: record.workshop || "101车间",
    shift,
    month: record.month,
    year: record.year || parts.year,
    monthNumber: Number(record.monthNumber || parts.month || 0),
    attendanceHours: round(attendanceHours, 1),
    orderCount: round(orderCount, 1),
    repairHours: round(repairHours, 1),
    repairHoursSourceValue: hasMetricValue(record, "repairHoursSourceValue") ? round(Number(record.repairHoursSourceValue), 1) : null,
    pm01HoursSourceValue: hasMetricValue(record, "pm01HoursSourceValue") ? round(Number(record.pm01HoursSourceValue), 1) : null,
    repairEfficiencySourceValue: hasMetricValue(record, "repairEfficiencySourceValue") ? round(Number(record.repairEfficiencySourceValue), 4) : null,
    repairHoursQualityThreshold: hasMetricValue(record, "repairHoursQualityThreshold") ? round(Number(record.repairHoursQualityThreshold), 1) : null,
    repairHoursQualityPercentile: hasMetricValue(record, "repairHoursQualityPercentile") ? Number(record.repairHoursQualityPercentile) : null,
    repairHoursQualityReason: record.repairHoursQualityReason || null,
    repairHoursQualityIssue: record.repairHoursQualityIssue || null,
    repairEfficiency: round(repairEfficiency, 4),
    orderEfficiency: attendanceHours > 0 ? round(orderCount / attendanceHours, 4) : 0,
    overtime15Hours,
    overtime20Hours,
    overtime30Hours,
    overtimeTotalHours: round(otTotal, 1),
    holidayOvertimeHours: overtime30Hours,
    leaveHours,
    annualLeaveHours,
    sickLeaveHours,
    compositeHours,
    compositeRisk: compositeHours >= 432 ? "over" : compositeHours >= 390 ? "warning" : "ok",
    pm01Hours,
    pm03Hours,
    transferHours,
    repairTimeHours: round(Number(record.repairTimeHours) || repairHours, 1),
    mttrMinutes: hasMetricValue(record, "mttrMinutes") ? round(Number(record.mttrMinutes), 1) : null,
    mttrSourceValue: hasMetricValue(record, "mttrSourceValue") ? round(Number(record.mttrSourceValue), 1) : null,
    mttrSourceMaxDayValue: hasMetricValue(record, "mttrSourceMaxDayValue") ? round(Number(record.mttrSourceMaxDayValue), 1) : null,
    mttrSourceMaxDayColumnIndex: hasMetricValue(record, "mttrSourceMaxDayColumnIndex") ? Number(record.mttrSourceMaxDayColumnIndex) : null,
    mttrQualityIssue: record.mttrQualityIssue || null,
    mttrDataSource: record.mttrDataSource || "",
    faultResponseMinutes: hasMetricValue(record, "faultResponseMinutes") ? round(Number(record.faultResponseMinutes), 0) : null,
    nearMissCount: hasMetricValue(record, "nearMissCount") ? round(Number(record.nearMissCount), 0) : null,
    nearMissBenefit: hasMetricValue(record, "nearMissBenefit") ? round(Number(record.nearMissBenefit), 0) : null,
    pdcaCount: hasMetricValue(record, "pdcaCount") ? round(Number(record.pdcaCount), 0) : null,
    pdcaBenefit: hasMetricValue(record, "pdcaBenefit") ? round(Number(record.pdcaBenefit), 0) : null,
    pdcaAwardCount: hasMetricValue(record, "pdcaAwardCount") ? round(Number(record.pdcaAwardCount), 0) : null,
    kaizenCount: hasMetricValue(record, "kaizenCount") ? round(Number(record.kaizenCount), 0) : null,
    kaizenBenefit: hasMetricValue(record, "kaizenBenefit") ? round(Number(record.kaizenBenefit), 0) : null,
    kaizenAwardCount: hasMetricValue(record, "kaizenAwardCount") ? round(Number(record.kaizenAwardCount), 0) : null,
    transferSupplemental: Boolean(record.transferSupplemental),
    transferSupplementalReason: record.transferSupplementalReason || "",
    transferSupplementalReasons: record.transferSupplementalReasons || [],
    transferSupplementalSourceRows: Number(record.transferSupplementalSourceRows) || 0,
    transferSupplementalSourceHours: round(Number(record.transferSupplementalSourceHours) || 0, 1),
    transferSupplementalRawRequester: record.transferSupplementalRawRequester || [],
    transferSupplementalRawResponsible: record.transferSupplementalRawResponsible || [],
    transferSupplementalSourceResponsible: record.transferSupplementalSourceResponsible || [],
    transferSupplementalSourceFiles: record.transferSupplementalSourceFiles || [],
    importBatchId: record.importBatchId || record.import_batch_id || null,
    sourceFile: record.sourceFile || record.source_file || "",
    sourceFiles: record.sourceFiles || [],
    sourceSheet: record.sourceSheet || record.source_sheet || "",
    sourceRow: record.sourceRow || record.source_row || null,
    sourceField: record.sourceField || record.source_field || "",
    rawValue: record.rawValue ?? record.raw_value ?? null,
    parsedValue: record.parsedValue ?? record.parsed_value ?? null,
    validationStatus: record.validationStatus || record.validation_status || "valid",
    anomalyReason: record.anomalyReason || record.anomaly_reason || "",
    excludedFromPi: Boolean(record.excludedFromPi || record.excluded_from_pi),
  };
}

function filterRecords(records, filters = {}) {
  const { year, month, monthFrom, monthTo, businessArea, plant, department, userDepartmentScope, workshop, shift, employeeKey } = filters;
  const effectiveDepartment = userDepartmentScope || department;
  const fromIndex = monthFrom ? getMonthIndex(monthFrom) : 0;
  const toIndex = monthTo ? getMonthIndex(monthTo) : 0;
  return records.filter((record) => {
    if (year && String(record.year) !== String(year)) return false;
    if (month && record.month !== month) return false;
    if (fromIndex && getMonthIndex(record.month) < fromIndex) return false;
    if (toIndex && getMonthIndex(record.month) > toIndex) return false;
    if (businessArea && record.businessArea !== businessArea) return false;
    if (plant && record.plant !== plant) return false;
    if (effectiveDepartment && record.department !== effectiveDepartment) return false;
    if (workshop && record.workshop !== workshop) return false;
    if (shift && record.shift !== shift) return false;
    if (employeeKey && record.employeeKey !== employeeKey) return false;
    return true;
  });
}

function recordDepartmentMatches(record = {}, department = "") {
  if (!department) {
    return true;
  }
  const explicitDepartments = [record.department, record.sourceDepartment]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (explicitDepartments.length) {
    return explicitDepartments.includes(department);
  }
  return String(record.performanceDepartment || "").trim() === department;
}

function filterRepairTimeAnomalyRecords(records, filters = {}) {
  const { year, month, monthFrom, monthTo, businessArea, plant, department, userDepartmentScope, workshop, shift, employeeKey } = filters;
  const effectiveDepartment = userDepartmentScope || department;
  const fromIndex = monthFrom ? getMonthIndex(monthFrom) : 0;
  const toIndex = monthTo ? getMonthIndex(monthTo) : 0;
  return records.filter((record) => {
    if (year && String(record.year) !== String(year)) return false;
    if (month && record.month !== month) return false;
    if (fromIndex && getMonthIndex(record.month) < fromIndex) return false;
    if (toIndex && getMonthIndex(record.month) > toIndex) return false;
    if (businessArea && record.businessArea && record.businessArea !== businessArea) return false;
    if (plant && record.plant && String(record.plant) !== String(plant)) return false;
    if (!recordDepartmentMatches(record, effectiveDepartment)) return false;
    if (workshop && record.workshop && record.workshop !== workshop) return false;
    if (shift && record.shift && record.shift !== shift) return false;
    if (employeeKey && record.employeeKey !== employeeKey) return false;
    return true;
  });
}

function filterReliabilityMetrics(metrics = [], filters = {}) {
  const { year, month, monthFrom, monthTo } = filters;
  const fromIndex = monthFrom ? getMonthIndex(monthFrom) : 0;
  const toIndex = monthTo ? getMonthIndex(monthTo) : 0;
  return metrics.filter((record) => {
    if (year && String(record.year) !== String(year)) return false;
    if (month && record.month !== month) return false;
    if (fromIndex && getMonthIndex(record.month) < fromIndex) return false;
    if (toIndex && getMonthIndex(record.month) > toIndex) return false;
    return true;
  });
}

function normalizeImprovementType(record = {}) {
  const directType = String(record.improvementType || record.improvement_type || "").trim().toLowerCase();
  if (["near_miss", "pdca", "kaizen"].includes(directType)) {
    return directType;
  }

  const projectType = String(record.projectType || record.project_type || "").trim();
  if (projectType.toUpperCase() === "PDCA") {
    return "pdca";
  }
  if (projectType === "快改" || projectType.toLowerCase() === "kaizen") {
    return "kaizen";
  }
  return "";
}

function monthFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { year: "", monthNumber: 0, month: "" };
  }
  const year = String(date.getFullYear());
  const monthNumber = date.getMonth() + 1;
  return {
    year,
    monthNumber,
    month: `${year} ${MONTH_NAMES[monthNumber - 1]}`,
  };
}

function normalizeImprovementRecord(record = {}, index = 0) {
  const dateParts = record.month
    ? {
        year: String(record.year || parseMonthLabel(record.month).year || ""),
        monthNumber: Number(record.monthNumber || parseMonthLabel(record.month).month || 0),
        month: record.month,
      }
    : monthFromDate(record.createdDate || record.improvementDate || record.improvement_date);
  const quantity = hasMetricValue(record, "quantity") ? Number(record.quantity) : 1;
  const benefitAmount = hasMetricValue(record, "benefitAmount")
    ? Number(record.benefitAmount)
    : hasMetricValue(record, "benefit_amount")
      ? Number(record.benefit_amount)
      : Number(record.costSavingTotal || 0);
  const employeeNo = normalizeEmployeeNo(record.employeeNo || record.employee_no || record.operatorNo || record.operator_no);
  const employeeName = normalizeEmployeeName(record.employeeName || record.employee_name || record.operatorName || record.operator_name);
  return {
    id: record.id || record.projectId || record.project_id || `improvement-${index + 1}`,
    projectId: record.projectId || record.project_id || record.sourceProjectId || record.source_project_id || "",
    projectTitle: record.projectTitle || record.project_title || record.sourceProjectTitle || record.source_project_title || "",
    projectType: record.projectType || record.project_type || "",
    improvementType: normalizeImprovementType(record),
    employeeNo,
    employeeName,
    employeeKey: record.employeeKey || record.employee_key || employeeNo || employeeName,
    businessArea: record.businessArea || record.business_area || "",
    plant: String(record.plant || record.workshop_code || ""),
    department: record.department || "",
    workshop: record.workshop || record.workshop_name || "",
    shift: record.shift || record.team || record.team_name || "",
    sourceDepartment: record.sourceDepartment || record.source_department || "",
    lineArea: record.lineArea || record.line_area || "",
    station: record.station || "",
    createdDate: record.createdDate || record.created_date || record.improvementDate || record.improvement_date || "",
    approved: record.approved === undefined || record.approved === null ? true : Boolean(record.approved),
    approvalStep: record.approvalStep || record.approval_step || "",
    month: dateParts.month,
    year: dateParts.year,
    monthNumber: dateParts.monthNumber,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    benefitAmount: Number.isFinite(benefitAmount) ? benefitAmount : 0,
    pdcaAwardCount: hasMetricValue(record, "pdcaAwardCount")
      ? Number(record.pdcaAwardCount)
      : hasMetricValue(record, "pdca_award_count")
        ? Number(record.pdca_award_count)
        : 0,
    kaizenAwardCount: hasMetricValue(record, "kaizenAwardCount")
      ? Number(record.kaizenAwardCount)
      : hasMetricValue(record, "kaizen_award_count")
        ? Number(record.kaizen_award_count)
        : 0,
  };
}

function filterImprovementRecords(records = [], filters = {}) {
  const { year, month, monthFrom, monthTo, businessArea, plant, department, userDepartmentScope, workshop, shift, employeeKey } = filters;
  const effectiveDepartment = userDepartmentScope || department;
  const fromIndex = monthFrom ? getMonthIndex(monthFrom) : 0;
  const toIndex = monthTo ? getMonthIndex(monthTo) : 0;
  return records.filter((record) => {
    if (!record.approved || !record.improvementType || !record.month) return false;
    if (year && String(record.year) !== String(year)) return false;
    if (month && record.month !== month) return false;
    if (fromIndex && getMonthIndex(record.month) < fromIndex) return false;
    if (toIndex && getMonthIndex(record.month) > toIndex) return false;
    if (businessArea && record.businessArea !== businessArea) return false;
    if (plant && String(record.plant || "") !== String(plant)) return false;
    if (!recordDepartmentMatches(record, effectiveDepartment)) return false;
    if (workshop && record.workshop !== workshop) return false;
    if (shift && record.shift !== shift) return false;
    if (employeeKey && record.employeeKey !== employeeKey) return false;
    return true;
  });
}

function serializeSafetyIncidentRecord(record = {}) {
  return {
    id: record.id,
    projectId: record.projectId,
    projectTitle: record.projectTitle,
    projectType: record.projectType,
    improvementType: record.improvementType,
    employeeNo: record.employeeNo,
    employeeName: record.employeeName,
    employeeKey: record.employeeKey,
    businessArea: record.businessArea,
    plant: record.plant,
    department: record.department,
    workshop: record.workshop,
    shift: record.shift,
    sourceDepartment: record.sourceDepartment,
    incidentDate: record.incidentDate || record.createdDate,
    createdDate: record.createdDate,
    month: record.month,
    year: record.year,
    monthNumber: record.monthNumber,
  };
}

function aggregateSafetyIncidentEmployees(records = []) {
  const groups = new Map();

  records.forEach((record) => {
    const key = record.employeeKey || `${record.department || record.sourceDepartment || ""}-${record.employeeNo || record.employeeName || record.id}`;
    const existing = groups.get(key);
    const incidentDate = record.incidentDate || record.createdDate || "";
    const incidentCount = Math.max(1, Number(record.quantity) || 0);

    if (!existing) {
      groups.set(key, {
        key,
        employeeKey: record.employeeKey,
        employeeName: record.employeeName,
        employeeNo: record.employeeNo,
        businessArea: record.businessArea,
        plant: record.plant,
        department: record.department || record.sourceDepartment,
        workshop: record.workshop,
        shift: record.shift,
        incidentCount,
        latestIncidentDate: incidentDate,
        incidentMonths: record.month ? [record.month] : [],
      });
      return;
    }

    existing.incidentCount += incidentCount;
    if (record.month && !existing.incidentMonths.includes(record.month)) {
      existing.incidentMonths.push(record.month);
    }
    if (incidentDate && incidentDate > existing.latestIncidentDate) {
      existing.latestIncidentDate = incidentDate;
    }
  });

  return [...groups.values()]
    .map((employee) => ({
      ...employee,
      incidentMonths: employee.incidentMonths.sort((left, right) => getMonthIndex(left) - getMonthIndex(right)),
    }))
    .sort((left, right) =>
      String(left.department || "").localeCompare(String(right.department || ""), "zh-Hans-CN") ||
      String(left.employeeName || "").localeCompare(String(right.employeeName || ""), "zh-Hans-CN")
    );
}

async function getSafetyIncidents(filters = {}) {
  const safetyData = await readMockImprovementSupplements();
  const sourceRecords = (safetyData.records || []).map((record, index) => {
    const normalized = normalizeImprovementRecord(record, index);
    return {
      ...normalized,
      incidentDate: record.incidentDate || record.incident_date || normalized.createdDate,
    };
  });
  const filtered = filterImprovementRecords(sourceRecords, filters);
  const employees = aggregateSafetyIncidentEmployees(filtered);

  return {
    source: safetyData.source || {},
    summary: {
      sourceRecordCount: sourceRecords.length,
      recordCount: filtered.length,
      employeeCount: employees.length,
      selectedPeriod: getSelectedPeriod(filters, null),
    },
    employees,
    records: filtered
      .sort((left, right) => getMonthIndex(right.month) - getMonthIndex(left.month))
      .map(serializeSafetyIncidentRecord),
  };
}

function aggregateImprovementMetrics(records = []) {
  const metrics = {
    nearMissCount: null,
    nearMissBenefit: null,
    pdcaCount: null,
    pdcaBenefit: null,
    pdcaAwardCount: null,
    kaizenCount: null,
    kaizenBenefit: null,
    kaizenAwardCount: null,
  };

  records.forEach((record) => {
    const quantity = Number(record.quantity) || 0;
    const benefitAmount = Number(record.benefitAmount) || 0;
    const pdcaAwardCount = Number(record.pdcaAwardCount) || 0;
    const kaizenAwardCount = Number(record.kaizenAwardCount) || 0;
    if (pdcaAwardCount) {
      metrics.pdcaAwardCount = (metrics.pdcaAwardCount || 0) + pdcaAwardCount;
    }
    if (kaizenAwardCount) {
      metrics.kaizenAwardCount = (metrics.kaizenAwardCount || 0) + kaizenAwardCount;
    }
    if (record.improvementType === "near_miss") {
      metrics.nearMissCount = (metrics.nearMissCount || 0) + quantity;
      metrics.nearMissBenefit = (metrics.nearMissBenefit || 0) + benefitAmount;
    }
    if (record.improvementType === "pdca") {
      metrics.pdcaCount = (metrics.pdcaCount || 0) + quantity;
      metrics.pdcaBenefit = (metrics.pdcaBenefit || 0) + benefitAmount;
    }
    if (record.improvementType === "kaizen") {
      metrics.kaizenCount = (metrics.kaizenCount || 0) + quantity;
      metrics.kaizenBenefit = (metrics.kaizenBenefit || 0) + benefitAmount;
    }
  });

  return {
    nearMissCount: metrics.nearMissCount === null ? null : round(metrics.nearMissCount, 0),
    nearMissBenefit: metrics.nearMissBenefit === null ? null : round(metrics.nearMissBenefit, 0),
    pdcaCount: metrics.pdcaCount === null ? null : round(metrics.pdcaCount, 0),
    pdcaBenefit: metrics.pdcaBenefit === null ? null : round(metrics.pdcaBenefit, 0),
    pdcaAwardCount: metrics.pdcaAwardCount === null ? null : round(metrics.pdcaAwardCount, 0),
    kaizenCount: metrics.kaizenCount === null ? null : round(metrics.kaizenCount, 0),
    kaizenBenefit: metrics.kaizenBenefit === null ? null : round(metrics.kaizenBenefit, 0),
    kaizenAwardCount: metrics.kaizenAwardCount === null ? null : round(metrics.kaizenAwardCount, 0),
  };
}

function combineNullableMetric(left, right, digits = 1) {
  const leftKnown = left !== undefined && left !== null && left !== "";
  const rightKnown = right !== undefined && right !== null && right !== "";
  if (!leftKnown && !rightKnown) {
    return null;
  }
  return round((leftKnown ? Number(left) || 0 : 0) + (rightKnown ? Number(right) || 0 : 0), digits);
}

function mergeImprovementMetrics(base = {}, improvement = {}) {
  return {
    nearMissCount: combineNullableMetric(base.nearMissCount, improvement.nearMissCount, 0),
    nearMissBenefit: combineNullableMetric(base.nearMissBenefit, improvement.nearMissBenefit, 0),
    pdcaCount: combineNullableMetric(base.pdcaCount, improvement.pdcaCount, 0),
    pdcaBenefit: combineNullableMetric(base.pdcaBenefit, improvement.pdcaBenefit, 0),
    pdcaAwardCount: combineNullableMetric(base.pdcaAwardCount, improvement.pdcaAwardCount, 0),
    kaizenCount: combineNullableMetric(base.kaizenCount, improvement.kaizenCount, 0),
    kaizenBenefit: combineNullableMetric(base.kaizenBenefit, improvement.kaizenBenefit, 0),
    kaizenAwardCount: combineNullableMetric(base.kaizenAwardCount, improvement.kaizenAwardCount, 0),
  };
}

function aggregateImprovementTrend(records = []) {
  return [...groupBy(records, (record) => record.month).entries()]
    .sort(([left], [right]) => getMonthIndex(left) - getMonthIndex(right))
    .map(([month, items]) => ({
      month,
      ...aggregateImprovementMetrics(items),
    }));
}

function improvementEmployeeIdentity(record = {}) {
  if (record.employeeKey) {
    return `key:${record.employeeKey}`;
  }
  if (record.employeeNo) {
    return `no:${record.employeeNo}`;
  }
  if (record.employeeName) {
    return `name:${normalizeEmployeeName(record.employeeName)}`;
  }
  return "";
}

function aggregateImprovementByEmployee(records = []) {
  return [...groupBy(records.filter(improvementEmployeeIdentity), improvementEmployeeIdentity).entries()]
    .map(([identity, items]) => {
      const first = items[0] || {};
      return {
        identity,
        employeeKey: first.employeeKey || first.employeeNo || first.employeeName || "",
        employeeNo: first.employeeNo || "",
        employeeName: first.employeeName || "",
        businessArea: first.businessArea || "",
        plant: first.plant || "",
        department: first.department || first.sourceDepartment || "",
        workshop: first.workshop || "",
        shift: first.shift || "",
        ...aggregateImprovementMetrics(items),
      };
    });
}

function improvementEmployeeMatchScore(employee = {}, improvement = {}) {
  let score = 0;
  if (employee.employeeKey && improvement.employeeKey && employee.employeeKey === improvement.employeeKey) {
    score += 100;
  }
  if (employee.employeeNo && improvement.employeeNo && employee.employeeNo === improvement.employeeNo) {
    score += 90;
  }
  if (normalizeEmployeeName(employee.employeeName) && normalizeEmployeeName(employee.employeeName) === normalizeEmployeeName(improvement.employeeName)) {
    score += 40;
  }
  if (employee.plant && improvement.plant && String(employee.plant) === String(improvement.plant)) {
    score += 12;
  }
  if (employee.shift && improvement.shift && employee.shift === improvement.shift) {
    score += 8;
  }
  if (employee.workshop && improvement.workshop && employee.workshop === improvement.workshop) {
    score += 4;
  }
  if (employee.businessArea && improvement.businessArea && employee.businessArea === improvement.businessArea) {
    score += 4;
  }
  if (employee.department && improvement.department && employee.department === improvement.department) {
    score += 2;
  }
  if (!employee.isHistoricalEmployee) {
    score += 6;
  }
  if (!employee.employmentStatus || employee.employmentStatus === "active") {
    score += 3;
  }
  return score;
}

function findBestEmployeeForImprovement(improvement = {}, employees = []) {
  const improvementName = normalizeEmployeeName(improvement.employeeName);
  const candidates = employees.filter((employee) => {
    if (employee.employeeKey && improvement.employeeKey && employee.employeeKey === improvement.employeeKey) return true;
    if (employee.employeeNo && improvement.employeeNo && employee.employeeNo === improvement.employeeNo) return true;
    return improvementName && normalizeEmployeeName(employee.employeeName) === improvementName;
  });

  return candidates
    .map((employee) => ({ employee, score: improvementEmployeeMatchScore(employee, improvement) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.employee || null;
}

function mergeEmployeeImprovementMetrics(employees = [], improvementRecords = []) {
  const assignedMetrics = new Map();
  aggregateImprovementByEmployee(improvementRecords).forEach((improvement) => {
    const employee = findBestEmployeeForImprovement(improvement, employees);
    if (!employee?.employeeKey) {
      return;
    }
    assignedMetrics.set(employee.employeeKey, mergeImprovementMetrics(assignedMetrics.get(employee.employeeKey) || {}, improvement));
  });

  return employees.map((employee) => {
    const improvement = assignedMetrics.get(employee.employeeKey);
    if (!improvement) {
      return employee;
    }
    const mergedMetrics = mergeImprovementMetrics(
      {
        nearMissCount: employee.nearMissCount,
        nearMissBenefit: employee.nearMissBenefit,
        pdcaCount: employee.pdcaCount,
        pdcaBenefit: employee.pdcaBenefit,
        pdcaAwardCount: employee.pdcaAwardCount,
        kaizenCount: employee.kaizenCount,
        kaizenBenefit: employee.kaizenBenefit,
        kaizenAwardCount: employee.kaizenAwardCount,
      },
      improvement
    );
    return {
      ...employee,
      ...mergedMetrics,
    };
  });
}

function getEmployeeImprovementRecords(improvementRecords = [], employee = {}, employees = []) {
  if (!employee?.employeeKey) {
    return [];
  }
  return improvementRecords
    .filter((record) => findBestEmployeeForImprovement(record, employees)?.employeeKey === employee.employeeKey)
    .sort((left, right) => getMonthIndex(right.month) - getMonthIndex(left.month));
}

function serializeImprovementRecord(record = {}) {
  return {
    id: record.id,
    projectId: record.projectId || "",
    projectTitle: record.projectTitle || "",
    projectType: record.projectType || "",
    improvementType: record.improvementType || "",
    employeeNo: record.employeeNo || "",
    employeeName: record.employeeName || "",
    businessArea: record.businessArea || "",
    plant: record.plant || "",
    department: record.department || record.sourceDepartment || "",
    workshop: record.workshop || "",
    shift: record.shift || "",
    sourceDepartment: record.sourceDepartment || "",
    lineArea: record.lineArea || "",
    station: record.station || "",
    createdDate: record.createdDate || "",
    month: record.month || "",
    year: record.year || "",
    quantity: Number(record.quantity) || 0,
    benefitAmount: Number(record.benefitAmount) || 0,
    pdcaAwardCount: Number(record.pdcaAwardCount) || 0,
    kaizenAwardCount: Number(record.kaizenAwardCount) || 0,
    approvalStep: record.approvalStep || "",
  };
}

function sum(records, field) {
  return records.reduce((total, record) => total + (Number(record[field]) || 0), 0);
}

function sumNullable(records, field) {
  const values = records
    .map((record) => record[field])
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? round(values.reduce((total, value) => total + value, 0), 1) : null;
}

function averageNullable(records, field) {
  const values = records
    .map((record) => record[field])
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function average(records, field) {
  if (!records.length) {
    return 0;
  }
  return sum(records, field) / records.length;
}

function groupBy(records, getKey) {
  const groups = new Map();
  records.forEach((record) => {
    const key = getKey(record);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(record);
  });
  return groups;
}

function compositeRiskForYearlyHours(hours) {
  if (hours >= 432) return "over";
  if (hours >= 390) return "warning";
  return "ok";
}

function compositeAssessmentCycle(record = {}) {
  const parsed = parseMonthLabel(record.month);
  const year = Number(parsed.year || record.year || 0);
  const month = Number(parsed.month || record.monthNumber || 0);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    key: `${startYear}-${endYear}`,
    label: `${startYear} Aug-${endYear} Jul`,
    startYear,
    endYear,
    sortKey: startYear * 100 + 8,
  };
}

function getAnnualCompositeStats(records) {
  const cycles = new Map();
  records.forEach((record) => {
    const cycle = compositeAssessmentCycle(record);
    if (!cycle) {
      return;
    }
    const current = cycles.get(cycle.key) || {
      year: cycle.label,
      cycleKey: cycle.key,
      cycleStartYear: cycle.startYear,
      cycleEndYear: cycle.endYear,
      sortKey: cycle.sortKey,
      compositeHours: 0,
    };
    current.compositeHours += Number(record.compositeHours) || 0;
    cycles.set(cycle.key, current);
  });

  const cycleRows = [...cycles.values()].map((row) => ({
    ...row,
    compositeHours: round(row.compositeHours, 1),
  }));
  const topYear = [...cycleRows].sort((left, right) => Number(right.compositeHours || 0) - Number(left.compositeHours || 0))[0] || { year: "", compositeHours: 0 };
  return {
    annualCompositeHours: topYear.compositeHours,
    compositeRiskYear: topYear.year,
    annualCompositeByYear: cycleRows.sort((left, right) => Number(left.sortKey || 0) - Number(right.sortKey || 0)),
    compositeRisk: compositeRiskForYearlyHours(topYear.compositeHours),
  };
}

function aggregateByEmployee(records) {
  return [...groupBy(records, (record) => record.employeeKey).entries()]
    .map(([employeeKey, items]) => {
      const first = items[0] || {};
      const attendanceHours = sum(items, "attendanceHours");
      const repairHours = sum(items, "repairHours");
      const orderCount = sum(items, "orderCount");
      const compositeHours = sum(items, "compositeHours");
      const annualComposite = getAnnualCompositeStats(items);
      const piItems = items.filter((record) => !isRepairHoursQualityRecord(record));
      const piAttendanceHours = sum(piItems, "attendanceHours");
      const repairEfficiencyNumerator = piNumerator(piItems);
      const repairEfficiency = repairEfficiencyFromNumerator(piAttendanceHours, repairEfficiencyNumerator);
      const allRecordsExcludedFromAverages = items.length > 0 && items.every((record) => record.excludeFromAverages);
      const score =
        orderCount * 0.36 +
        repairHours * 0.24 +
        repairEfficiency * 120 +
        Math.max(0, 100 - Math.max(0, annualComposite.annualCompositeHours - 360)) * 0.15;

      return {
        employeeKey,
        employeeNo: first.employeeNo,
        employeeName: first.employeeName,
        positionTitle: first.positionTitle,
        jobTitle: first.jobTitle,
        role: first.role,
        excludeFromAverages: allRecordsExcludedFromAverages,
        averageExclusionReason: allRecordsExcludedFromAverages ? combineAverageExclusionReasons(...items.map((record) => record.averageExclusionReason)) : "",
        piTargetRate: first.piTargetRate ?? null,
        piTargetLabel: first.piTargetLabel || "",
        businessArea: first.businessArea,
        plant: first.plant,
        employmentStatus: first.employmentStatus,
        isHistoricalEmployee: first.isHistoricalEmployee,
        department: first.department,
        workshop: first.workshop,
        shift: first.shift,
        attendanceHours: round(attendanceHours, 1),
        orderCount: round(orderCount, 1),
        repairHours: round(repairHours, 1),
        repairEfficiency: round(repairEfficiency, 4),
        overtime15Hours: round(sum(items, "overtime15Hours"), 1),
        overtime20Hours: round(sum(items, "overtime20Hours"), 1),
        overtime30Hours: round(sum(items, "overtime30Hours"), 1),
        overtimeTotalHours: round(sum(items, "overtimeTotalHours"), 1),
        leaveHours: round(sum(items, "leaveHours"), 1),
        annualLeaveHours: round(sum(items, "annualLeaveHours"), 1),
        sickLeaveHours: round(sum(items, "sickLeaveHours"), 1),
        compositeHours: round(compositeHours, 1),
        annualCompositeHours: annualComposite.annualCompositeHours,
        annualCompositeByYear: annualComposite.annualCompositeByYear,
        compositeRiskYear: annualComposite.compositeRiskYear,
        compositeRisk: annualComposite.compositeRisk,
        pm01Hours: round(sum(items, "pm01Hours"), 1),
        pm03Hours: round(sum(items, "pm03Hours"), 1),
        transferHours: round(sum(items, "transferHours"), 1),
        repairTimeHours: round(sum(items, "repairTimeHours"), 1),
        mttrMinutes: averageNullable(items, "mttrMinutes") === null ? null : round(averageNullable(items, "mttrMinutes"), 1),
        faultResponseMinutes: averageNullable(items, "faultResponseMinutes") === null ? null : round(averageNullable(items, "faultResponseMinutes"), 0),
        nearMissCount: sumNullable(items, "nearMissCount"),
        nearMissBenefit: sumNullable(items, "nearMissBenefit"),
        pdcaCount: sumNullable(items, "pdcaCount"),
        pdcaBenefit: sumNullable(items, "pdcaBenefit"),
        pdcaAwardCount: sumNullable(items, "pdcaAwardCount"),
        kaizenCount: sumNullable(items, "kaizenCount"),
        kaizenBenefit: sumNullable(items, "kaizenBenefit"),
        kaizenAwardCount: sumNullable(items, "kaizenAwardCount"),
        performanceScore: round(score, 1),
      };
    })
    .sort((left, right) => right.performanceScore - left.performanceScore)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function aggregateTrend(records) {
  return [...groupBy(records, (record) => record.month).entries()]
    .sort(([left], [right]) => getMonthIndex(left) - getMonthIndex(right))
    .map(([month, items]) => {
      const attendanceHours = sum(items, "attendanceHours");
      const repairHours = sum(items, "repairHours");
      const repairEfficiencyNumerator = piNumerator(items);
      const averageItems = averageEligibleRecords(items);
      const averageAttendanceHours = sum(averageItems, "attendanceHours");
      const averageRepairEfficiencyNumerator = piNumerator(averageItems);
      return {
        month,
        attendanceHours: round(attendanceHours, 1),
        orderCount: round(sum(items, "orderCount"), 1),
        repairHours: round(repairHours, 1),
        repairEfficiency: round(repairEfficiencyFromNumerator(averageAttendanceHours, averageRepairEfficiencyNumerator), 4),
        allRecordRepairEfficiency: round(repairEfficiencyFromNumerator(attendanceHours, repairEfficiencyNumerator), 4),
        averageBasisAttendanceHours: round(averageAttendanceHours, 1),
        averageBasisPiHours: round(averageRepairEfficiencyNumerator, 1),
        averageBasisRepairEfficiency: round(repairEfficiencyFromNumerator(averageAttendanceHours, averageRepairEfficiencyNumerator), 4),
        averageExcludedEmployeeCount: uniqueEmployeeCount(items.filter((record) => record.excludeFromAverages)),
        overtime15Hours: round(sum(items, "overtime15Hours"), 1),
        overtime20Hours: round(sum(items, "overtime20Hours"), 1),
        overtime30Hours: round(sum(items, "overtime30Hours"), 1),
        overtimeTotalHours: round(sum(items, "overtimeTotalHours"), 1),
        leaveHours: round(sum(items, "leaveHours"), 1),
        annualLeaveHours: round(sum(items, "annualLeaveHours"), 1),
        sickLeaveHours: round(sum(items, "sickLeaveHours"), 1),
        compositeHours: round(sum(items, "compositeHours"), 1),
        pm01Hours: round(sum(items, "pm01Hours"), 1),
        pm03Hours: round(sum(items, "pm03Hours"), 1),
        transferHours: round(sum(items, "transferHours"), 1),
        mttrMinutes: averageNullable(items, "mttrMinutes") === null ? null : round(averageNullable(items, "mttrMinutes"), 1),
        faultResponseMinutes: averageNullable(items, "faultResponseMinutes") === null ? null : round(averageNullable(items, "faultResponseMinutes"), 0),
        nearMissCount: sumNullable(items, "nearMissCount"),
        nearMissBenefit: sumNullable(items, "nearMissBenefit"),
        pdcaCount: sumNullable(items, "pdcaCount"),
        pdcaBenefit: sumNullable(items, "pdcaBenefit"),
        pdcaAwardCount: sumNullable(items, "pdcaAwardCount"),
        kaizenCount: sumNullable(items, "kaizenCount"),
        kaizenBenefit: sumNullable(items, "kaizenBenefit"),
        kaizenAwardCount: sumNullable(items, "kaizenAwardCount"),
      };
    });
}

function getFactoryReliabilityRows(metrics = []) {
  const totalRows = metrics.filter((item) => String(item.bpsName || "").toLowerCase() === "total");
  return totalRows.length ? totalRows : metrics;
}

function averageMetricRows(rows, metric) {
  const values = rows
    .filter((item) => item.metric === metric)
    .map((item) => Number(item.value))
    .filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function averageMetricTarget(rows, metric) {
  const values = rows
    .filter((item) => item.metric === metric)
    .map((item) => Number(item.target))
    .filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function buildReliabilityTrend(metrics = []) {
  const rows = getFactoryReliabilityRows(metrics);
  return [...groupBy(rows, (record) => record.month).entries()]
    .sort(([left], [right]) => getMonthIndex(left) - getMonthIndex(right))
    .map(([month, items]) => {
      const mttrMinutes = averageMetricRows(items, "mttrMinutes");
      const mttrTargetMinutes = averageMetricTarget(items, "mttrMinutes");
      return {
        month,
        mttrMinutes: mttrMinutes ? round(mttrMinutes, 1) : null,
        mttrTargetMinutes: mttrTargetMinutes ? round(mttrTargetMinutes, 1) : null,
      };
    });
}

function buildReliabilityOverview(metrics = []) {
  const rows = getFactoryReliabilityRows(metrics);
  const mttrMinutes = averageMetricRows(rows, "mttrMinutes");
  return {
    mttrMinutes: mttrMinutes ? round(mttrMinutes, 1) : null,
  };
}

function mergeReliabilityTrend(trend, reliabilityTrend = []) {
  const reliabilityByMonth = new Map(reliabilityTrend.map((item) => [item.month, item]));
  const trendMonths = new Set(trend.map((item) => item.month));
  const merged = trend.map((item) => {
    const reliability = reliabilityByMonth.get(item.month) || {};
    return {
      ...item,
      ...Object.fromEntries(
        Object.entries(reliability).filter(([key, value]) => {
          if (value === null || value === undefined || value === "") return false;
          if (key === "mttrMinutes" && item.mttrMinutes !== null && item.mttrMinutes !== undefined) return false;
          return true;
        })
      ),
    };
  });

  reliabilityTrend.forEach((item) => {
    if (!trendMonths.has(item.month)) {
      merged.push(item);
    }
  });

  return merged.sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month));
}

function mergeImprovementTrend(trend, improvementTrend = []) {
  const improvementByMonth = new Map(improvementTrend.map((item) => [item.month, item]));
  const trendMonths = new Set(trend.map((item) => item.month));
  const merged = trend.map((item) => {
    const improvement = improvementByMonth.get(item.month) || {};
    return {
      ...item,
      ...mergeImprovementMetrics(
        {
          nearMissCount: item.nearMissCount,
          nearMissBenefit: item.nearMissBenefit,
          pdcaCount: item.pdcaCount,
          pdcaBenefit: item.pdcaBenefit,
          pdcaAwardCount: item.pdcaAwardCount,
          kaizenCount: item.kaizenCount,
          kaizenBenefit: item.kaizenBenefit,
          kaizenAwardCount: item.kaizenAwardCount,
        },
        improvement
      ),
    };
  });

  improvementTrend.forEach((item) => {
    if (!trendMonths.has(item.month)) {
      merged.push(item);
    }
  });

  return merged.sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month));
}

function aggregateImprovementForRecordGroup(improvementRecords = [], records = []) {
  if (!records.length) {
    return aggregateImprovementMetrics([]);
  }
  const employeeKeys = new Set(records.map((record) => record.employeeKey).filter(Boolean));
  return aggregateImprovementMetrics(
    improvementRecords.filter((improvement) => {
      const employee = findBestEmployeeForImprovement(improvement, records);
      return employee?.employeeKey && employeeKeys.has(employee.employeeKey);
    })
  );
}

function getLatestRecord(records) {
  return [...records].sort((left, right) => getMonthIndex(right.month) - getMonthIndex(left.month))[0] || null;
}

function getTrendDelta(items, field) {
  if (!Array.isArray(items) || items.length < 2) {
    return 0;
  }
  const latest = Number(items[items.length - 1]?.[field]) || 0;
  const previous = Number(items[items.length - 2]?.[field]) || 0;
  return round(latest - previous, field.includes("Efficiency") ? 4 : 1);
}

function buildEmployeeMonthlyTrends(employeeRecords, allRecords) {
  return [...employeeRecords]
    .sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month))
    .map((record) => {
      const sameMonth = allRecords.filter((item) => item.month === record.month);
      const averageSameMonth = averageEligibleRecords(sameMonth);
      const sameDepartmentMonth = averageSameMonth.filter((item) => item.department === record.department);
      const departmentAttendance = sum(sameDepartmentMonth, "attendanceHours");
      const departmentPiNumerator = piNumerator(sameDepartmentMonth);
      const overallAttendance = sum(averageSameMonth, "attendanceHours");
      const overallPiNumerator = piNumerator(averageSameMonth);

      return {
        ...record,
        departmentAvgRepairEfficiency: round(repairEfficiencyFromNumerator(departmentAttendance, departmentPiNumerator), 4),
        shiftAvgRepairEfficiency: round(repairEfficiencyFromNumerator(departmentAttendance, departmentPiNumerator), 4),
        overallAvgRepairEfficiency: round(repairEfficiencyFromNumerator(overallAttendance, overallPiNumerator), 4),
        departmentAvgOrderEfficiency: departmentAttendance > 0 ? round(sum(sameDepartmentMonth, "orderCount") / departmentAttendance, 4) : 0,
        shiftAvgOrderEfficiency: departmentAttendance > 0 ? round(sum(sameDepartmentMonth, "orderCount") / departmentAttendance, 4) : 0,
        overallAvgOrderEfficiency: overallAttendance > 0 ? round(sum(averageSameMonth, "orderCount") / overallAttendance, 4) : 0,
      };
    });
}

function getFilterOptions(records) {
  const employees = [];
  const employeeKeys = new Set();
  records.forEach((record) => {
    if (!employeeKeys.has(record.employeeKey)) {
      employeeKeys.add(record.employeeKey);
      employees.push({
        id: record.employeeKey,
        name: record.employeeName,
        businessArea: record.businessArea,
        plant: record.plant,
        department: record.department,
        shift: record.shift,
        workshop: record.workshop,
      });
    }
  });

  return {
    years: [...new Set(records.map((record) => record.year).filter(Boolean))].sort(),
    months: [...new Set(records.map((record) => record.month).filter(Boolean))]
      .filter((month) => !HIDDEN_FILTER_MONTHS.has(String(month || "").trim()))
      .sort((left, right) => getMonthIndex(left) - getMonthIndex(right)),
    businessAreas: [...new Set(records.map((record) => record.businessArea).filter(Boolean))].sort(),
    plants: [...new Set(records.map((record) => record.plant).filter(Boolean))].sort(),
    departments: [...new Set(records.map((record) => record.department).filter(Boolean))].sort(),
    workshops: [...new Set(records.map((record) => record.workshop).filter(Boolean))].sort(),
    shifts: [...new Set(records.map((record) => record.shift).filter(Boolean))].sort(),
    employees,
  };
}

function getFilterOptionRecords(records = [], filters = {}) {
  if (!filters.userDepartmentScope) {
    return records;
  }
  return filterRecords(records, { userDepartmentScope: filters.userDepartmentScope });
}

function summarizeRowsBy(records = [], field) {
  const groups = new Map();
  records.forEach((record) => {
    const key = String(record[field] || "未分类");
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  return [...groups.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key, "zh-Hans-CN"));
}

function scopeDataQualitySummary(summary = {}, records = [], validRecords = [], anomalies = []) {
  const performanceAnomalies = anomalies.filter((item) => item.category === "数据真实性");
  const performanceCriticalCount = performanceAnomalies.filter((item) => item.severity === "critical").length;
  const totalCriticalCount = anomalies.filter((item) => item.severity === "critical").length;
  return {
    ...summary,
    totalRecords: records.length,
    validRecords: validRecords.length,
    quarantinedRecords: performanceAnomalies.length,
    filteredQuarantinedRecords: anomalies.length,
    criticalCount: performanceCriticalCount,
    totalAnomalies: anomalies.length,
    totalCriticalCount,
    batchStatus: performanceCriticalCount ? "blocked" : "publishable",
    byType: summarizeRowsBy(anomalies, "type"),
    byCategory: summarizeRowsBy(anomalies, "category"),
  };
}

const GAP_ROW_TYPE_BY_ITEM = {
  "月度绩效主表缺失月份": "missing_month_performance",
  "0 出勤但有工作量": "zero_attendance_with_work",
  "维修工时超过出勤": "repair_hours_exceed_attendance",
  "维修工时源记录异常": "repair_hours_quality",
  "MTTR 源记录异常": "mttr_quality",
  "转移工时未确认": "transfer_unconfirmed",
  "PM01/PM03 口径不明": "pm_split_unconfirmed",
  "证书编号/到期日缺失": "certificate_missing_expiry",
  "维修时间超过阈值": "repair_time_over_threshold",
  "改善记录未审批": "improvement_not_approved",
};

function scopeGapChecklist(gapChecklist = {}, anomalies = []) {
  const countsByType = new Map();
  anomalies.forEach((item) => {
    if (item.type) {
      countsByType.set(item.type, (countsByType.get(item.type) || 0) + 1);
    }
  });

  const rows = (gapChecklist.rows || []).flatMap((row) => {
    const type = GAP_ROW_TYPE_BY_ITEM[row.item];
    if (!type) {
      return [row];
    }
    const count = countsByType.get(type) || 0;
    if (!count) {
      return [];
    }
    return [{
      ...row,
      sourceStatus: String(row.sourceStatus || "").replace(/当前\s+\d+\s+条/g, `当前 ${count} 条`),
    }];
  });

  return {
    ...gapChecklist,
    rows,
    csv: gapRowsToCsv(rows),
  };
}

function scopeImportBatches(importBatches = [], records = [], validRecords = [], anomalies = []) {
  return importBatches.map((batch) => ({
    ...batch,
    recordCount: records.length,
    validRecordCount: validRecords.length,
    quarantinedRecordCount: anomalies.filter((item) => item.category === "数据真实性").length,
    totalAnomalyCount: anomalies.length,
    status: anomalies.some((item) => item.severity === "critical") ? "blocked" : "publishable",
  }));
}

function scopedAuditPayload(audit = {}, filters = {}, records = []) {
  const effectiveDepartment = filters.userDepartmentScope || filters.department;
  if (!effectiveDepartment) {
    return {
      summary: audit?.summary || null,
      anomalies: audit?.anomalies || [],
      sourceCoverage: audit?.sourceCoverage || {},
      gapChecklist: audit?.gapChecklist || { rows: [] },
      importBatches: audit?.importBatches || [],
    };
  }

  const scopedAnomalies = filterAuthenticityAnomalies(audit?.anomalies || [], filters);
  const scopedRecords = filterRecords(records, filters);
  const scopedValidRecords = filterRecords(audit?.validPerformanceRecords || [], filters);
  return {
    summary: scopeDataQualitySummary(audit?.summary || {}, scopedRecords, scopedValidRecords, scopedAnomalies),
    anomalies: scopedAnomalies,
    sourceCoverage: scopeSourceCoverage(audit?.sourceCoverage || {}, scopedRecords, scopedAnomalies),
    gapChecklist: scopeGapChecklist(audit?.gapChecklist || { rows: [] }, scopedAnomalies),
    importBatches: scopeImportBatches(audit?.importBatches || [], scopedRecords, scopedValidRecords, scopedAnomalies),
  };
}

function scopeSourceCoverage(sourceCoverage = {}, records = [], anomalies = []) {
  return {
    ...sourceCoverage,
    totals: {
      performanceRecords: records.length,
      anomalies: anomalies.length,
      quarantinedRecords: anomalies.filter((item) => item.category === "数据真实性").length,
      certificateAnomalies: anomalies.filter((item) => item.category === "能力证书").length,
      improvementAnomalies: anomalies.filter((item) => item.category === "工厂改善").length,
      repairTimeAnomalies: anomalies.filter((item) => item.category === "维修响应").length,
    },
  };
}

function getSelectedPeriod(filters, latest) {
  if (filters.month) {
    return filters.month;
  }
  if (filters.monthFrom && filters.monthTo) {
    return `${filters.monthFrom} - ${filters.monthTo}`;
  }
  if (filters.monthFrom) {
    return `${filters.monthFrom} 起`;
  }
  if (filters.monthTo) {
    return `${filters.monthTo} 止`;
  }
  return latest ? latest.month : "全部期间";
}

async function loadPerformanceRecords() {
  const nearMissData = await readNearMissRecords();
  const nearMissRecords = nearMissData.records || [];
  const mockImprovementSupplements = await readMockImprovementSupplements();
  const mockImprovementRecords = (mockImprovementSupplements.records || []).filter(
    (record) => Number(record.pdcaAwardCount || record.pdca_award_count || 0) > 0 || Number(record.kaizenAwardCount || record.kaizen_award_count || 0) > 0
  );
  const databaseRecords = await readPerformanceRecordsFromDatabase();
  if (databaseRecords && databaseRecords.length) {
    const databaseImprovementRecords = await readImprovementRecordsFromDatabase();
    const fallbackImprovementData = databaseImprovementRecords && databaseImprovementRecords.length ? null : await readPdcaImprovements();
    const improvementSourceRecords = (databaseImprovementRecords && databaseImprovementRecords.length ? databaseImprovementRecords : fallbackImprovementData?.records) || [];
    const monthly = await readMonthlyWorkerData();
    const allRecords = await enrichPerformanceRecordsWithCertificateDepartments(databaseRecords.map(normalizeRecord));
    const audit = await buildDataAuthenticityAudit({ source: getDbType(), records: allRecords });
    return {
      source: getDbType(),
      records: audit.validPerformanceRecords,
      allRecords,
      audit,
      improvementRecords: [...improvementSourceRecords, ...nearMissRecords, ...mockImprovementRecords].map(normalizeImprovementRecord),
      reliabilityMetrics: monthly.reliabilityMetrics || [],
    };
  }

  const monthly = await readMonthlyWorkerData();
  const pdcaImprovements = await readPdcaImprovements();
  const records = (monthly.records || [])
    .filter((record) => !record.isTotal && record.month)
    .map(normalizeRecord);
  const allRecords = await enrichPerformanceRecordsWithCertificateDepartments(records);
  const audit = await buildDataAuthenticityAudit({ source: "json", records: allRecords });

  return {
    source: "json",
    records: audit.validPerformanceRecords,
    allRecords,
    audit,
    improvementRecords: [...(pdcaImprovements.records || []), ...nearMissRecords, ...mockImprovementRecords].map(normalizeImprovementRecord),
    reliabilityMetrics: monthly.reliabilityMetrics || [],
    legacyPayload: monthly,
  };
}

async function enrichPerformanceRecordsWithCertificateDepartments(records = []) {
  if (!records.length) {
    return records;
  }

  if (records.every((record) => record.department)) {
    return records.map(applyConfiguredPiAverageExclusions);
  }

  const certificateData = await readEmployeeCertificateData();
  if (!Array.isArray(certificateData.employees) || !certificateData.employees.length) {
    return records.map(applyConfiguredPiAverageExclusions);
  }

  const certificateLookup = buildCertificateLookup(certificateData.employees);
  return records.map((record) => {
    const certificateEmployee = findCertificateEmployee(record, certificateLookup);
    if (!certificateEmployee?.department) {
      return applyConfiguredPiAverageExclusions(record);
    }
    return applyConfiguredPiAverageExclusions({
      ...record,
      department: certificateEmployee.department,
      orgUnit: certificateEmployee.orgUnit || record.orgUnit || "",
    });
  });
}

function buildOverview(records, source, reliabilityMetrics = [], overrides = {}) {
  const employees = aggregateByEmployee(records);
  const averageRecords = averageEligibleRecords(records);
  const totalAttendanceHours = sum(records, "attendanceHours");
  const totalRepairHours = sum(records, "repairHours");
  const averageAttendanceHours = sum(averageRecords, "attendanceHours");
  const averagePiNumerator = piNumerator(averageRecords);
  const compositeWarningCount = employees.filter((item) => item.compositeRisk !== "ok").length;
  const reliabilityOverview = buildReliabilityOverview(reliabilityMetrics);
  const recordMttrMinutes = averageNullable(records, "mttrMinutes");
  const recordImprovementMetrics = {
    nearMissCount: sumNullable(records, "nearMissCount"),
    nearMissBenefit: sumNullable(records, "nearMissBenefit"),
    pdcaCount: sumNullable(records, "pdcaCount"),
    pdcaBenefit: sumNullable(records, "pdcaBenefit"),
    pdcaAwardCount: sumNullable(records, "pdcaAwardCount"),
    kaizenCount: sumNullable(records, "kaizenCount"),
    kaizenBenefit: sumNullable(records, "kaizenBenefit"),
    kaizenAwardCount: sumNullable(records, "kaizenAwardCount"),
  };
  const improvementMetrics = mergeImprovementMetrics(recordImprovementMetrics, overrides.improvementMetrics || {});

  return {
    source,
    employeeCount: overrides.employeeCount ?? employees.length,
    departmentCount: new Set(records.map((record) => record.department).filter(Boolean)).size,
    businessAreaCount: new Set(records.map((record) => record.businessArea)).size,
    plantCount: new Set(records.map((record) => record.plant)).size,
    workshopCount: new Set(records.map((record) => record.workshop)).size,
    shiftCount: new Set(records.map((record) => record.shift)).size,
    totalAttendanceHours: round(totalAttendanceHours, 1),
    totalRepairHours: round(totalRepairHours, 1),
    totalOrderCount: round(sum(records, "orderCount"), 1),
    avgRepairEfficiency: round(repairEfficiencyFromNumerator(averageAttendanceHours, averagePiNumerator), 4),
    averageBasisAttendanceHours: round(averageAttendanceHours, 1),
    averageBasisPiHours: round(averagePiNumerator, 1),
    averageExcludedEmployeeCount: uniqueEmployeeCount(employees.filter((employee) => employee.excludeFromAverages)),
    totalOvertimeHours: round(sum(records, "overtimeTotalHours"), 1),
    totalCompositeHours: round(sum(records, "compositeHours"), 1),
    compositeWarningCount,
    certificateGapCount: null,
    mttrMinutes: reliabilityOverview.mttrMinutes ?? (recordMttrMinutes === null ? null : round(recordMttrMinutes, 1)),
    reactionTimeHours: null,
    faultResponseMinutes: null,
    nearMissCount: improvementMetrics.nearMissCount,
    nearMissBenefit: improvementMetrics.nearMissBenefit,
    pdcaCount: improvementMetrics.pdcaCount,
    pdcaBenefit: improvementMetrics.pdcaBenefit,
    pdcaAwardCount: improvementMetrics.pdcaAwardCount,
    kaizenCount: improvementMetrics.kaizenCount,
    kaizenBenefit: improvementMetrics.kaizenBenefit,
    kaizenAwardCount: improvementMetrics.kaizenAwardCount,
  };
}

async function getCertificateEmployeeCount(filters = {}, records = []) {
  const certificateData = await readEmployeeCertificateData();
  if (!Array.isArray(certificateData.employees) || !certificateData.employees.length) {
    return null;
  }

  const certificateTypes = buildCertificateTypes(certificateData);
  const performanceEmployees = aggregateByEmployee(records);
  const performanceLookup = buildPerformanceEmployeeLookup(performanceEmployees);
  return certificateData.employees
    .map((certificateEmployee, index) =>
      buildCertificateMatrixEmployee(
        certificateEmployee,
        certificateTypes,
        findPerformanceEmployee(certificateEmployee, performanceLookup),
        index
      )
    )
    .filter((employee) => filterCertificateMatrixEmployee(employee, filters)).length;
}

async function getBossSummary(filters = {}) {
  const { source, records, allRecords, reliabilityMetrics, improvementRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  const filtered = filterRecords(records, filters);
  const filteredImprovementRecords = filterImprovementRecords(improvementRecords, filters);
  const improvementMetrics = aggregateImprovementMetrics(filteredImprovementRecords);
  const filteredReliabilityMetrics = filterReliabilityMetrics(reliabilityMetrics, filters);
  const employees = mergeEmployeeImprovementMetrics(aggregateByEmployee(filtered), filteredImprovementRecords);
  const reliabilityTrend = buildReliabilityTrend(filteredReliabilityMetrics);
  const improvementTrend = aggregateImprovementTrend(filteredImprovementRecords);
  const trend = mergeImprovementTrend(mergeReliabilityTrend(aggregateTrend(filtered), reliabilityTrend), improvementTrend);
  const certificateEmployeeCount = await getCertificateEmployeeCount(filters, records);

  return {
    summary: buildOverview(filtered, source, filteredReliabilityMetrics, { employeeCount: certificateEmployeeCount, improvementMetrics }),
    trend,
    reliabilityTrend,
    topEmployees: employees.slice(0, 5),
    attentionEmployees: [...employees]
      .filter((employee) => employee.compositeRisk !== "ok")
      .sort((left, right) => {
        if (left.compositeRisk !== right.compositeRisk) {
          return left.compositeRisk === "over" ? -1 : right.compositeRisk === "over" ? 1 : left.compositeRisk === "warning" ? -1 : 1;
        }
        return right.annualCompositeHours - left.annualCompositeHours;
      })
      .slice(0, 6),
    filterOptions: getFilterOptions(getFilterOptionRecords(allRecords || records, filters)),
    dataQuality: scopedAudit.summary,
  };
}

async function getTrends(filters = {}) {
  const { source, records, allRecords, reliabilityMetrics, improvementRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  const filtered = filterRecords(records, filters);
  const filteredImprovementRecords = filterImprovementRecords(improvementRecords, filters);
  const filteredReliabilityMetrics = filterReliabilityMetrics(reliabilityMetrics, filters);
  const reliabilityTrend = buildReliabilityTrend(filteredReliabilityMetrics);
  const improvementTrend = aggregateImprovementTrend(filteredImprovementRecords);
  return {
    source,
    trend: mergeImprovementTrend(mergeReliabilityTrend(aggregateTrend(filtered), reliabilityTrend), improvementTrend),
    byDepartment: [...groupBy(filtered, (record) => record.department).entries()].map(([department, items]) => ({
      department,
      ...buildOverview(items, source, filteredReliabilityMetrics, {
        improvementMetrics: aggregateImprovementForRecordGroup(filteredImprovementRecords, items),
      }),
    })),
    byShift: [...groupBy(filtered, (record) => record.shift).entries()].map(([shift, items]) => ({
      shift,
      ...buildOverview(items, source, filteredReliabilityMetrics, {
        improvementMetrics: aggregateImprovementForRecordGroup(filteredImprovementRecords, items),
      }),
    })),
    dataQuality: scopedAudit.summary,
  };
}

async function getAdminEmployees(filters = {}) {
  const { source, records, allRecords, reliabilityMetrics, improvementRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  const filtered = filterRecords(records, filters);
  const filteredImprovementRecords = filterImprovementRecords(improvementRecords, filters);
  const filteredReliabilityMetrics = filterReliabilityMetrics(reliabilityMetrics, filters);
  const certificateEmployeeCount = await getCertificateEmployeeCount(filters, records);
  return {
    source,
    summary: buildOverview(filtered, source, filteredReliabilityMetrics, {
      employeeCount: certificateEmployeeCount,
      improvementMetrics: aggregateImprovementMetrics(filteredImprovementRecords),
    }),
    employees: mergeEmployeeImprovementMetrics(aggregateByEmployee(filtered), filteredImprovementRecords),
    rawRecords: filtered,
    quarantinedRecords: filterRecords(allRecords || [], filters).filter((record) =>
      (audit?.anomalies || []).some((anomaly) => anomaly.employeeKey && anomaly.employeeKey === record.employeeKey && anomaly.month === record.month)
    ),
    dataQuality: scopedAudit.summary,
    filterOptions: getFilterOptions(getFilterOptionRecords(allRecords || records, filters)),
  };
}

function normalizeEmployeeNo(value) {
  return String(value || "").trim();
}

function normalizeEmployeeName(value) {
  return String(value || "")
    .trim()
    .replace(/^(Mr\.|Ms\.)\s*/i, "")
    .split("/")[0]
    .trim();
}

function certificateStateLabel(status) {
  return {
    valid: "已登记",
    expiring: "临期",
    expired: "过期",
    missing: "未登记",
  }[status] || "未登记";
}

function parseDateOnly(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function certificateStatusFromExpiry(hasCertificate, expireDate) {
  if (!hasCertificate) {
    return "missing";
  }
  const expiry = parseDateOnly(expireDate);
  if (!expiry) {
    return "valid";
  }
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const daysUntilExpiry = Math.floor((expiry.getTime() - todayUtc.getTime()) / 86400000);
  if (daysUntilExpiry < 0) {
    return "expired";
  }
  return daysUntilExpiry <= 90 ? "expiring" : "valid";
}

function buildCertificateTypes(certificateData) {
  const types = Array.isArray(certificateData?.certificateTypes) ? certificateData.certificateTypes : [];
  return types.length
    ? types.map((type) => ({
        code: type.code,
        name: type.name,
        sourceColumn: type.sourceColumn || type.name,
      }))
    : CERTIFICATE_TYPES;
}

function buildCertificateLookup(employees = []) {
  const byEmployeeNo = new Map();
  const byEmployeeName = new Map();

  employees.forEach((employee) => {
    const employeeNo = normalizeEmployeeNo(employee.employeeNo);
    const employeeName = normalizeEmployeeName(employee.employeeName || employee.sourceName);
    if (employeeNo) {
      byEmployeeNo.set(employeeNo, employee);
    }
    if (employeeName && !byEmployeeName.has(employeeName)) {
      byEmployeeName.set(employeeName, employee);
    }
  });

  return { byEmployeeName, byEmployeeNo };
}

function buildPerformanceEmployeeLookup(employees = []) {
  const byEmployeeNo = new Map();
  const byEmployeeName = new Map();

  employees.forEach((employee) => {
    const employeeNo = normalizeEmployeeNo(employee.employeeNo);
    const employeeName = normalizeEmployeeName(employee.employeeName);
    if (employeeNo && !byEmployeeNo.has(employeeNo)) {
      byEmployeeNo.set(employeeNo, employee);
    }
    if (employeeName && !byEmployeeName.has(employeeName)) {
      byEmployeeName.set(employeeName, employee);
    }
  });

  return { byEmployeeName, byEmployeeNo };
}

function findCertificateEmployee(employee, lookup) {
  const employeeNo = normalizeEmployeeNo(employee.employeeNo);
  if (employeeNo && lookup.byEmployeeNo.has(employeeNo)) {
    return lookup.byEmployeeNo.get(employeeNo);
  }

  const employeeName = normalizeEmployeeName(employee.employeeName);
  return employeeName ? lookup.byEmployeeName.get(employeeName) : null;
}

function findPerformanceEmployee(certificateEmployee, lookup) {
  const employeeNo = normalizeEmployeeNo(certificateEmployee.employeeNo);
  if (employeeNo && lookup.byEmployeeNo.has(employeeNo)) {
    return lookup.byEmployeeNo.get(employeeNo);
  }

  const employeeName = normalizeEmployeeName(certificateEmployee.employeeName || certificateEmployee.sourceName);
  return employeeName ? lookup.byEmployeeName.get(employeeName) : null;
}

function enrichRepairTimeAnomalyRecord(record, performanceLookup) {
  const matchedEmployee = findPerformanceEmployee(record, performanceLookup);
  if (!matchedEmployee) {
    return record;
  }

  return {
    ...record,
    employeeKey: record.employeeKey || matchedEmployee.employeeKey,
    employeeNo: record.employeeNo || matchedEmployee.employeeNo || "",
    department: record.department || matchedEmployee.department || "",
    shift: record.shift || matchedEmployee.shift || "",
    positionTitle: firstPositionTitle(record.positionTitle, matchedEmployee.positionTitle),
    jobTitle: normalizePositionTitle(record.jobTitle || matchedEmployee.jobTitle),
    role: normalizePositionTitle(record.role || matchedEmployee.role),
    excludeFromAverages: Boolean(record.excludeFromAverages || matchedEmployee.excludeFromAverages),
    averageExclusionReason: record.averageExclusionReason || matchedEmployee.averageExclusionReason || "",
    workshop: record.workshop || matchedEmployee.workshop || "",
    businessArea: record.businessArea || matchedEmployee.businessArea || "",
    plant: record.plant || matchedEmployee.plant || "",
    matchedPerformanceEmployee: true,
  };
}

function certificateRowMatchesEmployee(row, employee) {
  const employeeNo = normalizeEmployeeNo(employee.employeeNo);
  const rowEmployeeNumbers = [row.employee_no, row.source_employee_no].map(normalizeEmployeeNo).filter(Boolean);
  if (employeeNo && rowEmployeeNumbers.includes(employeeNo)) {
    return true;
  }

  if (`${row.team_name || employee.shift}::${row.employee_name}` === employee.employeeKey) {
    return true;
  }

  return normalizeEmployeeName(row.employee_name) === normalizeEmployeeName(employee.employeeName);
}

function inferPlantFromCertificate(certificateEmployee, performanceEmployee) {
  if (performanceEmployee?.plant) {
    return String(performanceEmployee.plant);
  }

  const orgUnit = String(certificateEmployee.orgUnit || "");
  const plantMatch = orgUnit.match(/\b(101|103|104)\b/);
  if (plantMatch) {
    return plantMatch[1];
  }

  if (["TEF31", "TEF32"].includes(certificateEmployee.department)) {
    return "101";
  }

  return "";
}

function inferBusinessAreaFromCertificate(plant, performanceEmployee) {
  if (performanceEmployee?.businessArea) {
    return performanceEmployee.businessArea;
  }
  if (["103", "104"].includes(String(plant))) {
    return "AC";
  }
  if (String(plant) === "101") {
    return "Tools";
  }
  return "";
}

function buildCertificateMatrixEmployee(certificateEmployee, certificateTypes, performanceEmployee, index) {
  const employeeNo = normalizeEmployeeNo(certificateEmployee.employeeNo);
  const employeeName = certificateEmployee.employeeName || normalizeEmployeeName(certificateEmployee.sourceName) || performanceEmployee?.employeeName || "";
  const plant = inferPlantFromCertificate(certificateEmployee, performanceEmployee);
  const businessArea = inferBusinessAreaFromCertificate(plant, performanceEmployee);
  const profileOverride = EMPLOYEE_PROFILE_BY_NO.get(employeeNo) || EMPLOYEE_PROFILE_BY_NAME.get(normalizeEmployeeName(employeeName || certificateEmployee.sourceName));
  const positionTitle = profileOverride?.positionTitle || firstPositionTitle(performanceEmployee?.positionTitle, performanceEmployee?.jobTitle, performanceEmployee?.role);
  const excludeFromAverages = inferAverageExclusion({ employeeNo, employeeName, sourceName: certificateEmployee.sourceName }, employeeName);

  return {
    employeeKey: employeeNo || performanceEmployee?.employeeKey || `certificate-row-${certificateEmployee.sourceRow || index + 1}`,
    employeeNo,
    employeeName,
    positionTitle,
    jobTitle: normalizePositionTitle(performanceEmployee?.jobTitle),
    role: normalizePositionTitle(performanceEmployee?.role),
    excludeFromAverages,
    averageExclusionReason: excludeFromAverages ? PI_AVERAGE_EXCLUSION_REASON : "",
    department: certificateEmployee.department || performanceEmployee?.department || "",
    performanceDepartment: performanceEmployee?.department || "",
    businessArea,
    plant,
    workshop: performanceEmployee?.workshop || "",
    shift: performanceEmployee?.shift || "",
    orgUnit: certificateEmployee.orgUnit || "",
    sourceMatched: true,
    performanceMatched: Boolean(performanceEmployee),
    sourceRow: certificateEmployee.sourceRow || null,
    listNumber: certificateEmployee.listNumber || "",
    sourceName: certificateEmployee.sourceName || "",
    certificates: certificateTypes.map((type) => {
      const hasCertificate = Boolean(certificateEmployee.certificates?.[type.code]);
      const expireDate = hasCertificate ? certificateEmployee.expireDates?.[type.code] || "" : "";
      const detail = hasCertificate ? certificateEmployee.certificateDetails?.[type.code] || "" : "";
      const status = certificateStatusFromExpiry(hasCertificate, expireDate);
      return {
        ...type,
        hasCertificate,
        status,
        stateLabel: certificateStateLabel(status),
        expireDate,
        detail,
        sourceRow: certificateEmployee.sourceRow || null,
      };
    }),
  };
}

function filterCertificateMatrixEmployee(employee, filters = {}) {
  const effectiveDepartment = filters.userDepartmentScope || filters.department;
  if (filters.businessArea && employee.businessArea !== filters.businessArea) return false;
  if (filters.plant && employee.plant !== filters.plant) return false;
  if (!recordDepartmentMatches(employee, effectiveDepartment)) return false;
  if (filters.workshop && employee.workshop !== filters.workshop) return false;
  if (filters.shift && employee.shift !== filters.shift) return false;
  if (filters.employeeKey && employee.employeeKey !== filters.employeeKey) return false;
  return true;
}

async function getCompetenceMatrix(filters = {}) {
  const { records, allRecords } = await loadPerformanceRecords();
  const performanceRecords = allRecords || records;
  const certificateData = await readEmployeeCertificateData();
  const hasCertificateData = Array.isArray(certificateData.employees) && certificateData.employees.length;

  if (hasCertificateData) {
    const certificateTypes = buildCertificateTypes(certificateData);
    const performanceEmployees = aggregateByEmployee(performanceRecords);
    const performanceLookup = buildPerformanceEmployeeLookup(performanceEmployees);
    const matrixEmployees = certificateData.employees
      .map((certificateEmployee, index) =>
        buildCertificateMatrixEmployee(
          certificateEmployee,
          certificateTypes,
          findPerformanceEmployee(certificateEmployee, performanceLookup),
          index
        )
      )
      .filter((employee) => filterCertificateMatrixEmployee(employee, filters));

    return {
      source: certificateData.source || {},
      certificateTypes,
      employees: matrixEmployees,
    };
  }

  const employees = aggregateByEmployee(filterRecords(performanceRecords, filters));
  const databaseCertificates = await readCertificatesFromDatabase();

  if (databaseCertificates && databaseCertificates.length) {
    return {
      certificateTypes: CERTIFICATE_TYPES,
      employees: employees.map((employee) => {
        const rows = databaseCertificates.filter((row) => certificateRowMatchesEmployee(row, employee));
        return {
          employeeKey: employee.employeeKey,
          employeeNo: employee.employeeNo,
          employeeName: employee.employeeName,
          positionTitle: employee.positionTitle,
          jobTitle: employee.jobTitle,
          role: employee.role,
          excludeFromAverages: employee.excludeFromAverages,
          averageExclusionReason: employee.averageExclusionReason,
          department: employee.department,
          shift: employee.shift,
          certificates: CERTIFICATE_TYPES.map((type) => {
            const row = rows.find((item) => item.certificate_code === type.code);
            if (!row) return null;
            const status = row.status || null;
            return {
              ...type,
              hasCertificate: status !== "missing",
              status,
              stateLabel: status ? certificateStateLabel(status) : "",
              expireDate: row.expire_date || "",
            };
          }).filter(Boolean),
        };
      }),
    };
  }

  return {
    certificateTypes: CERTIFICATE_TYPES,
    employees: employees.map((employee) => ({
      employeeKey: employee.employeeKey,
      employeeNo: employee.employeeNo,
      employeeName: employee.employeeName,
      positionTitle: employee.positionTitle,
      jobTitle: employee.jobTitle,
      role: employee.role,
      excludeFromAverages: employee.excludeFromAverages,
      averageExclusionReason: employee.averageExclusionReason,
      department: employee.department,
      shift: employee.shift,
      certificates: [],
    })),
  };
}

async function getEmployeeDetail(employeeKey, filters = {}) {
  const { source, records, allRecords, improvementRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  const baseFilters = { ...filters };
  delete baseFilters.employeeKey;
  const contextRecords = filterRecords(records, baseFilters);
  const contextEmployees = aggregateByEmployee(contextRecords);
  const filtered = filterRecords(contextRecords, { employeeKey });
  const trendFilters = { ...baseFilters };
  delete trendFilters.year;
  delete trendFilters.month;
  delete trendFilters.monthFrom;
  delete trendFilters.monthTo;
  const trendContextRecords = filterRecords(records, trendFilters);
  const trendEmployeeRecords = filterRecords(trendContextRecords, { employeeKey });
  const rankedEmployees = aggregateByEmployee(contextRecords);
  const [profile] = aggregateByEmployee(filtered);
  const rankedProfile = rankedEmployees.find((employee) => employee.employeeKey === employeeKey);
  const detailProfile = rankedProfile || profile || contextEmployees.find((employee) => employee.employeeKey === employeeKey);
  const employeeImprovementRecords = getEmployeeImprovementRecords(
    filterImprovementRecords(improvementRecords, baseFilters),
    detailProfile,
    contextEmployees
  );
  const improvementSummary = aggregateImprovementMetrics(employeeImprovementRecords);
  const improvementTrend = aggregateImprovementTrend(employeeImprovementRecords);
  const trends = buildEmployeeMonthlyTrends(trendEmployeeRecords, trendContextRecords);
  const latest = getLatestRecord(filtered.length ? filtered : trendEmployeeRecords);
  const department = profile?.department || latest?.department || "";
  const departmentRecords = department ? contextRecords.filter((record) => record.department === department) : [];
  const overallRecords = contextRecords;
  const averageDepartmentRecords = averageEligibleRecords(departmentRecords);
  const averageOverallRecords = averageEligibleRecords(overallRecords);
  const departmentEmployees = aggregateByEmployee(averageDepartmentRecords);
  const overallEmployees = aggregateByEmployee(averageOverallRecords);
  const departmentAttendance = sum(averageDepartmentRecords, "attendanceHours");
  const overallAttendance = sum(averageOverallRecords, "attendanceHours");
  const departmentPiNumerator = piNumerator(averageDepartmentRecords);
  const overallPiNumerator = piNumerator(averageOverallRecords);

  return {
    source,
    profile: profile
      ? {
          ...profile,
          rank: rankedProfile?.rank || profile.rank,
          performanceScore: rankedProfile?.performanceScore ?? profile.performanceScore,
          selectedPeriod: getSelectedPeriod(filters, latest),
          orderEfficiency: profile.attendanceHours > 0 ? round(profile.orderCount / profile.attendanceHours, 4) : 0,
          repairHoursShare: sum(contextRecords, "repairHours")
            ? round((profile.repairHours / sum(contextRecords, "repairHours")) * 100, 1)
            : 0,
        }
      : null,
    comparisons: {
      selectedMonth: getSelectedPeriod(filters, latest),
      department,
      shift: department,
      departmentEmployeeCount: new Set(departmentRecords.map((record) => record.employeeKey)).size,
      shiftEmployeeCount: new Set(departmentRecords.map((record) => record.employeeKey)).size,
      overallEmployeeCount: new Set(overallRecords.map((record) => record.employeeKey)).size,
      departmentAvgRepairEfficiency: departmentAttendance > 0 ? round(repairEfficiencyFromNumerator(departmentAttendance, departmentPiNumerator), 4) : null,
      shiftAvgRepairEfficiency: departmentAttendance > 0 ? round(repairEfficiencyFromNumerator(departmentAttendance, departmentPiNumerator), 4) : null,
      overallAvgRepairEfficiency: overallAttendance > 0 ? round(repairEfficiencyFromNumerator(overallAttendance, overallPiNumerator), 4) : null,
      departmentAvgOrderEfficiency: departmentAttendance > 0 ? round(sum(averageDepartmentRecords, "orderCount") / departmentAttendance, 4) : null,
      shiftAvgOrderEfficiency: departmentAttendance > 0 ? round(sum(averageDepartmentRecords, "orderCount") / departmentAttendance, 4) : null,
      overallAvgOrderEfficiency: overallAttendance > 0 ? round(sum(averageOverallRecords, "orderCount") / overallAttendance, 4) : null,
      departmentAvgRepairHours: departmentEmployees.length ? round(average(departmentEmployees, "repairHours"), 1) : null,
      overallAvgRepairHours: overallEmployees.length ? round(average(overallEmployees, "repairHours"), 1) : null,
      departmentAvgOrderCount: departmentEmployees.length ? round(average(departmentEmployees, "orderCount"), 1) : null,
      overallAvgOrderCount: overallEmployees.length ? round(average(overallEmployees, "orderCount"), 1) : null,
      repairEfficiencyDelta: getTrendDelta(trends, "repairEfficiency"),
      orderCountDelta: getTrendDelta(trends, "orderCount"),
      repairHoursDelta: getTrendDelta(trends, "repairHours"),
    },
    monthlyTrends: trends,
    records: filtered,
    improvementSummary,
    improvementTrend,
    improvementRecords: employeeImprovementRecords.map(serializeImprovementRecord),
    provenance: filtered.map((record) => ({
      id: record.id,
      month: record.month,
      employeeKey: record.employeeKey,
      employeeName: record.employeeName,
      validationStatus: record.validationStatus || "valid",
      provenance: record.provenance || {},
    })),
    dataQuality: scopedAudit.summary,
  };
}

async function getLegacyMonthly(filters = {}) {
  const adminPayload = await getAdminEmployees(filters);
  const monthOrder = adminPayload.filterOptions.months || [];
  return {
    monthOrder,
    records: adminPayload.rawRecords.map((record) => ({
      id: record.id,
      department: record.department,
      shift: record.shift,
      employeeKey: record.employeeKey,
      employeeName: record.employeeName,
      month: record.month,
      isTotal: false,
      attendanceHours: record.attendanceHours,
      orderCount: record.orderCount,
      repairHours: record.repairHours,
      repairEfficiency: repairEfficiencyPi(record.attendanceHours, record.pm01Hours, record.pm03Hours, record.transferHours),
      orderEfficiency: record.orderEfficiency,
      computedRepairEfficiency: repairEfficiencyPi(record.attendanceHours, record.pm01Hours, record.pm03Hours, record.transferHours),
    })),
    filterOptions: {
      years: adminPayload.filterOptions.years,
      months: monthOrder,
      departments: adminPayload.filterOptions.departments,
      shifts: adminPayload.filterOptions.shifts,
      employees: adminPayload.filterOptions.employees,
      defaultMonth: monthOrder[monthOrder.length - 1] || "",
    },
  };
}

function summarizeRepairTimeAnomalies(records = [], sourceSummary = {}) {
  const yearlyMap = new Map();
  const monthlyMap = new Map();

  records.forEach((record) => {
    const year = String(record.year || "");
    const month = record.month || "";
    const repairTime = Number(record.repairTimeMinutes || 0);
    if (year) {
      const yearly = yearlyMap.get(year) || {
        year,
        rowsScanned: null,
        anomalyCount: 0,
        anomalyRate: null,
        maxRepairTimeMinutes: 0,
        technicianCount: 0,
        technicians: new Set(),
      };
      yearly.anomalyCount += 1;
      yearly.maxRepairTimeMinutes = Math.max(yearly.maxRepairTimeMinutes, repairTime);
      if (record.employeeName || record.technician) {
        yearly.technicians.add(record.employeeName || record.technician);
      }
      yearlyMap.set(year, yearly);
    }
    if (month) {
      const monthly = monthlyMap.get(month) || {
        month,
        rowsScanned: null,
        anomalyCount: 0,
        anomalyRate: null,
        maxRepairTimeMinutes: 0,
      };
      monthly.anomalyCount += 1;
      monthly.maxRepairTimeMinutes = Math.max(monthly.maxRepairTimeMinutes, repairTime);
      monthlyMap.set(month, monthly);
    }
  });

  const rowsScanned = filtersLikelyUnscoped(records, sourceSummary) ? Number(sourceSummary.rowsScanned || 0) : null;
  const anomalyCount = records.length;
  return {
    workbookCount: sourceSummary.workbookCount || 0,
    rowsScanned,
    anomalyCount,
    anomalyRate: rowsScanned ? round(anomalyCount / rowsScanned, 4) : null,
    yearly: [...yearlyMap.values()]
      .map((item) => ({
        year: item.year,
        rowsScanned: item.rowsScanned,
        anomalyCount: item.anomalyCount,
        anomalyRate: item.anomalyRate,
        maxRepairTimeMinutes: round(item.maxRepairTimeMinutes, 1),
        technicianCount: item.technicians.size,
      }))
      .sort((left, right) => Number(left.year) - Number(right.year)),
    monthly: [...monthlyMap.values()]
      .map((item) => ({
        month: item.month,
        rowsScanned: item.rowsScanned,
        anomalyCount: item.anomalyCount,
        anomalyRate: item.anomalyRate,
        maxRepairTimeMinutes: round(item.maxRepairTimeMinutes, 1),
      }))
      .sort((left, right) => getMonthIndex(left.month) - getMonthIndex(right.month)),
  };
}

function filtersLikelyUnscoped(records, sourceSummary = {}) {
  return records.length === Number(sourceSummary.anomalyCount || 0);
}

async function getRepairTimeAnomalies(filters = {}) {
  const anomalyData = await readRepairTimeAnomalies();
  const { records, allRecords } = await loadPerformanceRecords();
  const performanceLookup = buildPerformanceEmployeeLookup(aggregateByEmployee(allRecords || records));
  const enrichedRecords = (anomalyData.records || []).map((record) => enrichRepairTimeAnomalyRecord(record, performanceLookup));
  const filtered = filterRepairTimeAnomalyRecords(enrichedRecords, filters);

  return {
    source: anomalyData.source || {},
    summary: summarizeRepairTimeAnomalies(filtered, anomalyData.summary || {}),
    records: filtered.sort((left, right) => Number(right.repairTimeMinutes || 0) - Number(left.repairTimeMinutes || 0)),
  };
}

function filterAuthenticityAnomalies(anomalies = [], filters = {}) {
  return filterRepairTimeAnomalyRecords(anomalies, filters);
}

function compactSourceCoverage(sourceCoverage = {}) {
  return {
    servingSource: sourceCoverage.servingSource || "",
    ledgers: sourceCoverage.ledgers || [],
    totals: sourceCoverage.totals || {},
  };
}

async function getDataAuthenticity(filters = {}) {
  const { records, allRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  return {
    summary: scopedAudit.summary || {},
    sourceCoverage: compactSourceCoverage(scopedAudit.sourceCoverage),
    gapChecklist: scopedAudit.gapChecklist || { rows: [] },
    importBatches: scopedAudit.importBatches || [],
    anomalies: scopedAudit.anomalies || [],
  };
}

async function getDataSourceCoverage(filters = {}) {
  const { records, allRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  return {
    summary: scopedAudit.summary || {},
    sourceCoverage: compactSourceCoverage(scopedAudit.sourceCoverage),
  };
}

async function getDataGapChecklist(filters = {}) {
  const { records, allRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  return scopedAudit.gapChecklist || { rows: [], csv: "" };
}

async function getImportBatches(filters = {}) {
  const { records, allRecords, audit } = await loadPerformanceRecords();
  const scopedAudit = scopedAuditPayload(audit, filters, allRecords || records);
  return {
    importBatches: scopedAudit.importBatches || [],
    summary: scopedAudit.summary || {},
  };
}

async function getRecordProvenance(recordId, filters = {}) {
  const { records, allRecords, audit } = await loadPerformanceRecords();
  const sourceRecords = [...(allRecords || []), ...records];
  const record = sourceRecords.find((item) => String(item.id) === String(recordId) || String(item.sourceId) === String(recordId));
  if (record && !recordDepartmentMatches(record, filters.userDepartmentScope || filters.department)) {
    return {
      record: null,
      provenance: null,
      anomalies: [],
    };
  }
  const anomalies = (audit?.anomalies || []).filter((item) =>
    (record && item.employeeKey === record.employeeKey && item.month === record.month) || String(item.id) === String(recordId)
  ).filter((item) => recordDepartmentMatches(item, filters.userDepartmentScope || filters.department));
  return {
    record: record || null,
    provenance: record?.provenance || null,
    anomalies,
  };
}

async function getAuditLogs() {
  const db = await readAppDb();
  return {
    auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs.slice(0, 200) : [],
  };
}

module.exports = {
  getAdminEmployees,
  getAuditLogs,
  getBossSummary,
  getCompetenceMatrix,
  getDataAuthenticity,
  getDataGapChecklist,
  getDataSourceCoverage,
  getEmployeeDetail,
  getImportBatches,
  getLegacyMonthly,
  getRecordProvenance,
  getRepairTimeAnomalies,
  getSafetyIncidents,
  getTrends,
};
