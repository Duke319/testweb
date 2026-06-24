const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");

const { loadEnv } = require("../src/env");
const { getMssqlPool } = require("../src/database");
const { auditPerformanceRecords, provenanceForRecord } = require("../backend/services/dataAuthenticityService");
const {
  PI_AVERAGE_EXCLUSION_REASON,
  isPiExcludedEmployee,
  piExclusionReasonFor,
} = require("../backend/services/piExclusionRules");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT_DIR, "data", "worker-performance-monthly.json");
const IMPROVEMENTS_FILE = path.join(ROOT_DIR, "data", "pdca-improvements.json");
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_WORKSHOP = { code: "101", name: "101车间" };
const EMPLOYEE_PROFILE_OVERRIDES = [
  { employeeNo: "88156828", name: "杜业波", positionTitle: "101 班长", piTargetRate: 0.8, piTargetLabel: "101 非维护组 80%" },
  { employeeNo: "88153359", name: "来宋江", positionTitle: "101 班长", piTargetRate: 0.8, piTargetLabel: "101 非维护组 80%" },
  { employeeNo: "88156089", name: "郑平", positionTitle: "101 班长", piTargetRate: 0.8, piTargetLabel: "101 非维护组 80%" },
  { employeeNo: "88154660", name: "鲁孟云", positionTitle: "101 班长", piTargetRate: 0.8, piTargetLabel: "101 非维护组 80%" },
  { employeeNo: "88152751", name: "方建", positionTitle: "101 班长", piTargetRate: 0.8, piTargetLabel: "101 非维护组 80%" },
  { employeeNo: "88161821", name: "王一志", positionTitle: "103 班长" },
  { employeeNo: "88165532", name: "郑余忠", positionTitle: "103 班长" },
  { employeeNo: "88161732", name: "刘卫兵", positionTitle: "104 班长" },
  { employeeNo: "88165319", name: "刘涛", positionTitle: "104 班长" },
  { employeeNo: "88153019", name: "刘斌", positionTitle: "整改" },
];
const EMPLOYEE_PROFILE_BY_NO = new Map(EMPLOYEE_PROFILE_OVERRIDES.map((item) => [item.employeeNo, item]));
const EMPLOYEE_PROFILE_BY_NAME = new Map(EMPLOYEE_PROFILE_OVERRIDES.map((item) => [item.name, item]));
const PI_TARGET_RATE_80 = 0.8;
const PI_TARGET_RATE_101_MAINTENANCE = 0.85;

loadEnv(ROOT_DIR);

function parseMonthLabel(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) {
    return null;
  }
  const month = MONTH_NAMES.indexOf(match[2]) + 1;
  if (!month) {
    return null;
  }
  return {
    year: Number(match[1]),
    month,
  };
}

function makeEmployeeNo(record) {
  const employeeNo = String(record.employeeNo || "").trim();
  if (employeeNo) {
    return employeeNo;
  }

  const identityParts = [
    record.businessArea || "UNKNOWN_BUSINESS",
    record.plant || "UNKNOWN_PLANT",
    record.workshop || "UNKNOWN_WORKSHOP",
    record.shift || "UNKNOWN_SHIFT",
    record.employeeName || "UNKNOWN_EMPLOYEE",
  ];
  const identityText = identityParts.map((part) => String(part).trim()).join("::");
  return `NOID_${crypto.createHash("sha1").update(identityText).digest("hex").slice(0, 24)}`;
}

function getSourceEmployeeNo(record) {
  return String(record.employeeNo || "").trim();
}

function getDepartment(record) {
  return record.department || "";
}

function normalizeEmployeeName(value) {
  return String(value || "")
    .trim()
    .replace(/^(Mr\.|Ms\.)\s*/i, "")
    .split("/")[0]
    .trim();
}

function normalizeEmployeeNo(value) {
  return String(value || "").trim();
}

function findEmployeeProfileOverride(record) {
  const employeeNo = normalizeEmployeeNo(record.employeeNo);
  const employeeName = normalizeEmployeeName(record.employeeName || record.sourceName);
  return EMPLOYEE_PROFILE_BY_NO.get(employeeNo) || EMPLOYEE_PROFILE_BY_NAME.get(employeeName) || null;
}

function normalizePositionTitle(value) {
  const title = String(value || "").trim();
  return title === "维修技师" ? "" : title;
}

function resolvePositionTitle(record) {
  const profileOverride = findEmployeeProfileOverride(record);
  if (profileOverride?.positionTitle) {
    return profileOverride.positionTitle;
  }
  return normalizePositionTitle(record.positionTitle || record.jobTitle || record.role);
}

function resolveAverageExclusion(record) {
  const profileOverride = findEmployeeProfileOverride(record);
  const piTarget = resolvePiTarget(record, profileOverride);
  const excludeFromAverages = isPiExcludedEmployee(record);
  return {
    excludeFromAverages,
    averageExclusionReason: excludeFromAverages ? PI_AVERAGE_EXCLUSION_REASON : "",
    recordExcludeFromAverages: Boolean(record.excludeFromAverages || record.exclude_from_averages),
    recordAverageExclusionReason: record.averageExclusionReason || record.average_exclusion_reason || "",
    piTargetRate: piTarget?.rate ?? null,
    piTargetLabel: piTarget?.label ?? null,
  };
}

function resolvePiTarget(record, profileOverride = null) {
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

  if (profileOverride?.piTargetRate) {
    return {
      rate: profileOverride.piTargetRate,
      label: profileOverride.piTargetLabel || "",
    };
  }

  return null;
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
  return [record.shift, record.department, record.workshop, record.employeeKey]
    .filter(Boolean)
    .some((value) => /维护组|维护团队/.test(String(value)));
}

function getWorkshop(record) {
  const code = String(record.plant || DEFAULT_WORKSHOP.code);
  return {
    code,
    name: record.workshop || `${code}车间`,
  };
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function addNumericField(target, source, field) {
  target[field] = numberValue(target[field]) + numberValue(source[field]);
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function mergeRecordQualityFields(target, source) {
  [
    "repairHoursSourceValue",
    "repairHoursQualityThreshold",
    "repairHoursQualityPercentile",
    "repairHoursQualityReason",
    "repairHoursQualityIssue",
  ].forEach((field) => {
    if (!hasValue(target[field]) && hasValue(source[field])) {
      target[field] = source[field];
    }
  });
  target.excludeFromAverages = Boolean(target.excludeFromAverages || source.excludeFromAverages);
  target.averageExclusionReason = [target.averageExclusionReason, source.averageExclusionReason]
    .map((reason) => String(reason || "").trim())
    .filter(Boolean)
    .filter((reason, index, list) => list.indexOf(reason) === index)
    .join("；");
}

function aggregatePerformanceRecords(records) {
  const aggregated = new Map();
  let duplicateRecords = 0;

  for (const record of records) {
    const period = parseMonthLabel(record.month);
    if (!period) {
      continue;
    }

    const key = `${makeEmployeeNo(record)}::${period.year}::${period.month}`;
    const existing = aggregated.get(key);
    if (!existing) {
      aggregated.set(key, { ...record });
      continue;
    }

    duplicateRecords += 1;
    const merged = {
      ...existing,
      ...record,
      attendanceHours: existing.attendanceHours,
      orderCount: existing.orderCount,
      repairHours: existing.repairHours,
      overtime15Hours: existing.overtime15Hours,
      overtime20Hours: existing.overtime20Hours,
      overtime30Hours: existing.overtime30Hours,
      annualLeaveHours: existing.annualLeaveHours,
      leaveHours: existing.leaveHours,
      sickLeaveHours: existing.sickLeaveHours,
      pm01Hours: existing.pm01Hours,
      pm03Hours: existing.pm03Hours,
      transferHours: existing.transferHours,
    };
    [
      "attendanceHours",
      "orderCount",
      "repairHours",
      "overtime15Hours",
      "overtime20Hours",
      "overtime30Hours",
      "annualLeaveHours",
      "leaveHours",
      "sickLeaveHours",
      "pm01Hours",
      "pm03Hours",
      "transferHours",
    ].forEach((field) => addNumericField(merged, record, field));
    mergeRecordQualityFields(merged, record);

    aggregated.set(key, merged);
  }

  return {
    records: [...aggregated.values()].map(applyPiExclusionRule),
    duplicateRecords,
  };
}

function applyPiExclusionRule(record = {}) {
  const excluded = isPiExcludedEmployee(record);
  return {
    ...record,
    excludeFromAverages: excluded,
    averageExclusionReason: excluded ? piExclusionReasonFor(record) : "",
  };
}

async function scalar(request, sqlText) {
  const result = await request.query(sqlText);
  const row = result.recordset[0] || {};
  return row.id || null;
}

async function getOrCreateWorkshopId(transaction, sql, record = {}) {
  const workshop = getWorkshop(record);
  let request = new sql.Request(transaction);
  request.input("code", sql.NVarChar(50), workshop.code);
  request.input("name", sql.NVarChar(100), workshop.name);
  let id = await scalar(request, "SELECT id FROM dbo.workshops WHERE workshop_code = @code");
  if (id) {
    request = new sql.Request(transaction);
    request.input("id", sql.BigInt, id);
    request.input("name", sql.NVarChar(100), workshop.name);
    await request.query("UPDATE dbo.workshops SET workshop_name = @name, updated_at = SYSUTCDATETIME() WHERE id = @id");
    return id;
  }

  request = new sql.Request(transaction);
  request.input("code", sql.NVarChar(50), workshop.code);
  request.input("name", sql.NVarChar(100), workshop.name);
  id = await scalar(
    request,
    "INSERT INTO dbo.workshops (workshop_code, workshop_name) OUTPUT INSERTED.id VALUES (@code, @name)"
  );
  return id;
}

async function getOrCreateTeamId(transaction, sql, workshopId, shiftName) {
  const teamCode = String(shiftName || "UNKNOWN").replace(/\s+/g, "_").toUpperCase();
  let request = new sql.Request(transaction);
  request.input("code", sql.NVarChar(50), teamCode);
  let id = await scalar(request, "SELECT id FROM dbo.teams WHERE team_code = @code");
  if (id) {
    return id;
  }

  request = new sql.Request(transaction);
  request.input("workshopId", sql.BigInt, workshopId);
  request.input("code", sql.NVarChar(50), teamCode);
  request.input("name", sql.NVarChar(100), shiftName || "未分组");
  id = await scalar(
    request,
    "INSERT INTO dbo.teams (workshop_id, team_code, team_name) OUTPUT INSERTED.id VALUES (@workshopId, @code, @name)"
  );
  return id;
}

async function getOrCreateEmployeeId(transaction, sql, workshopId, teamId, record) {
  const employeeNo = makeEmployeeNo(record);
  const sourceEmployeeNo = getSourceEmployeeNo(record);
  const department = getDepartment(record);
  const profile = resolveAverageExclusion(record);
  const positionTitle = resolvePositionTitle(record);
  let request = new sql.Request(transaction);
  request.input("employeeNo", sql.NVarChar(50), employeeNo);
  let id = await scalar(request, "SELECT id FROM dbo.employees WHERE employee_no = @employeeNo");
  if (id) {
    request = new sql.Request(transaction);
    request.input("id", sql.BigInt, id);
    request.input("employeeName", sql.NVarChar(100), record.employeeName || "");
    request.input("sourceEmployeeNo", sql.NVarChar(50), sourceEmployeeNo);
    request.input("department", sql.NVarChar(50), department);
    request.input("positionName", sql.NVarChar(100), positionTitle || null);
    request.input("excludeFromAverages", sql.Bit, profile.excludeFromAverages ? 1 : 0);
    request.input("averageExclusionReason", sql.NVarChar(255), profile.averageExclusionReason || null);
    request.input("piTargetRate", sql.Decimal(5, 4), profile.piTargetRate);
    request.input("piTargetLabel", sql.NVarChar(100), profile.piTargetLabel);
    request.input("workshopId", sql.BigInt, workshopId);
    request.input("teamId", sql.BigInt, teamId);
    await request.query(`
      UPDATE dbo.employees
      SET employee_name = @employeeName,
          source_employee_no = @sourceEmployeeNo,
          department = @department,
          position_name = @positionName,
          exclude_from_averages = @excludeFromAverages,
          average_exclusion_reason = @averageExclusionReason,
          pi_target_rate = @piTargetRate,
          pi_target_label = @piTargetLabel,
          workshop_id = @workshopId,
          team_id = @teamId,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `);
    return id;
  }

  request = new sql.Request(transaction);
  request.input("employeeNo", sql.NVarChar(50), employeeNo);
  request.input("sourceEmployeeNo", sql.NVarChar(50), sourceEmployeeNo);
  request.input("employeeName", sql.NVarChar(100), record.employeeName || "");
  request.input("department", sql.NVarChar(50), department);
  request.input("positionName", sql.NVarChar(100), positionTitle || null);
  request.input("excludeFromAverages", sql.Bit, profile.excludeFromAverages ? 1 : 0);
  request.input("averageExclusionReason", sql.NVarChar(255), profile.averageExclusionReason || null);
  request.input("piTargetRate", sql.Decimal(5, 4), profile.piTargetRate);
  request.input("piTargetLabel", sql.NVarChar(100), profile.piTargetLabel);
  request.input("workshopId", sql.BigInt, workshopId);
  request.input("teamId", sql.BigInt, teamId);
  id = await scalar(
    request,
    `
      INSERT INTO dbo.employees
        (employee_no, source_employee_no, employee_name, department, workshop_id, team_id, position_name, exclude_from_averages, average_exclusion_reason, pi_target_rate, pi_target_label)
      OUTPUT INSERTED.id
      VALUES (@employeeNo, @sourceEmployeeNo, @employeeName, @department, @workshopId, @teamId, @positionName, @excludeFromAverages, @averageExclusionReason, @piTargetRate, @piTargetLabel)
    `
  );
  return id;
}

async function seedCertificates(transaction, sql) {
  const certificates = [
    ["ELECTRICIAN", "电工证"],
    ["HEIGHT", "高空作业证"],
    ["FORKLIFT", "叉车证"],
    ["WELDING", "焊工证"],
    ["SAFETY", "安全员证"],
  ];
  for (const [code, name] of certificates) {
    const request = new sql.Request(transaction);
    request.input("code", sql.NVarChar(50), code);
    request.input("name", sql.NVarChar(100), name);
    await request.query(`
      MERGE dbo.certificates AS target
      USING (SELECT @code AS certificate_code, @name AS certificate_name) AS source
      ON target.certificate_code = source.certificate_code
      WHEN MATCHED THEN UPDATE SET certificate_name = source.certificate_name, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (certificate_code, certificate_name) VALUES (source.certificate_code, source.certificate_name);
    `);
  }
}

async function upsertPerformance(transaction, sql, employeeId, period, record, batchId) {
  const provenance = provenanceForRecord(record);
  const request = new sql.Request(transaction);
  request.input("employeeId", sql.BigInt, employeeId);
  request.input("year", sql.Int, period.year);
  request.input("month", sql.TinyInt, period.month);
  request.input("attendanceHours", sql.Decimal(12, 2), Number(record.attendanceHours) || 0);
  request.input("orderCount", sql.Decimal(12, 2), Number(record.orderCount) || 0);
  request.input("repairHours", sql.Decimal(12, 4), Number(record.repairHours) || 0);
  request.input("repairHoursSourceValue", sql.Decimal(12, 4), Number.isFinite(Number(record.repairHoursSourceValue)) ? Number(record.repairHoursSourceValue) : null);
  request.input("repairHoursQualityThreshold", sql.Decimal(12, 4), Number.isFinite(Number(record.repairHoursQualityThreshold)) ? Number(record.repairHoursQualityThreshold) : null);
  request.input("repairHoursQualityPercentile", sql.Decimal(5, 4), Number.isFinite(Number(record.repairHoursQualityPercentile)) ? Number(record.repairHoursQualityPercentile) : null);
  request.input("repairHoursQualityReason", sql.NVarChar(100), record.repairHoursQualityReason || null);
  request.input("recordExcludeFromAverages", sql.Bit, record.excludeFromAverages ? 1 : 0);
  request.input("recordAverageExclusionReason", sql.NVarChar(255), record.averageExclusionReason || null);
  request.input("overtime15", sql.Decimal(12, 2), Number(record.overtime15Hours) || 0);
  request.input("overtime20", sql.Decimal(12, 2), Number(record.overtime20Hours) || 0);
  request.input("overtime30", sql.Decimal(12, 2), Number(record.overtime30Hours) || 0);
  request.input("annualLeave", sql.Decimal(12, 2), Number(record.annualLeaveHours ?? record.leaveHours) || 0);
  request.input("sickLeave", sql.Decimal(12, 2), Number(record.sickLeaveHours) || 0);
  request.input("pm01", sql.Decimal(12, 2), Number(record.pm01Hours) || 0);
  request.input("pm03", sql.Decimal(12, 2), Number(record.pm03Hours) || 0);
  request.input("transfer", sql.Decimal(12, 2), Number(record.transferHours) || 0);
  request.input("repairTime", sql.Decimal(12, 2), Number(record.repairHours) || 0);
  request.input("mttr", sql.Decimal(12, 2), Number.isFinite(Number(record.mttrMinutes)) ? Number(record.mttrMinutes) : null);
  request.input("faultResponse", sql.Decimal(12, 2), null);
  request.input("batchId", sql.BigInt, batchId);
  request.input("sourceFile", sql.NVarChar(500), provenance.sourceFile || null);
  request.input("sourceSheet", sql.NVarChar(255), provenance.sourceSheet || null);
  request.input("sourceRow", sql.Int, Number(provenance.sourceRow) || null);
  request.input("sourceField", sql.NVarChar(100), provenance.sourceField || null);
  request.input("rawValue", sql.NVarChar(sql.MAX), provenance.rawValue === null || provenance.rawValue === undefined ? null : String(provenance.rawValue));
  request.input("parsedValue", sql.NVarChar(sql.MAX), provenance.parsedValue === null || provenance.parsedValue === undefined ? null : String(provenance.parsedValue));
  request.input("validationStatus", sql.NVarChar(30), "valid");
  request.input("anomalyReason", sql.NVarChar(500), null);
  request.input("excludedFromPi", sql.Bit, record.excludeFromAverages ? 1 : 0);
  await request.query(`
    MERGE dbo.performance_monthly AS target
    USING (
      SELECT @employeeId AS employee_id, @year AS year, @month AS month
    ) AS source
    ON target.employee_id = source.employee_id AND target.year = source.year AND target.month = source.month
    WHEN MATCHED THEN UPDATE SET
      attendance_hours = @attendanceHours,
      order_count = @orderCount,
      repair_hours = @repairHours,
      repair_hours_source_value = @repairHoursSourceValue,
      repair_hours_quality_threshold = @repairHoursQualityThreshold,
      repair_hours_quality_percentile = @repairHoursQualityPercentile,
      repair_hours_quality_reason = @repairHoursQualityReason,
      record_exclude_from_averages = @recordExcludeFromAverages,
      record_average_exclusion_reason = @recordAverageExclusionReason,
      overtime_15_hours = @overtime15,
      overtime_20_hours = @overtime20,
      overtime_30_hours = @overtime30,
      annual_leave_hours = @annualLeave,
      sick_leave_hours = @sickLeave,
      pm01_hours = @pm01,
      pm03_hours = @pm03,
      transfer_hours = @transfer,
      repair_time_hours = @repairTime,
      mttr_minutes = @mttr,
      fault_response_minutes = @faultResponse,
      import_batch_id = @batchId,
      source_file = @sourceFile,
      source_sheet = @sourceSheet,
      source_row = @sourceRow,
      source_field = @sourceField,
      raw_value = @rawValue,
      parsed_value = @parsedValue,
      validation_status = @validationStatus,
      anomaly_reason = @anomalyReason,
      excluded_from_pi = @excludedFromPi,
      updated_at = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT
      (
        employee_id, year, month, attendance_hours, order_count, repair_hours,
        repair_hours_source_value, repair_hours_quality_threshold,
        repair_hours_quality_percentile, repair_hours_quality_reason,
        record_exclude_from_averages, record_average_exclusion_reason,
        overtime_15_hours, overtime_20_hours, overtime_30_hours,
        annual_leave_hours, sick_leave_hours,
        pm01_hours, pm03_hours, transfer_hours, repair_time_hours,
        mttr_minutes, fault_response_minutes, import_batch_id,
        source_file, source_sheet, source_row, source_field, raw_value,
        parsed_value, validation_status, anomaly_reason, excluded_from_pi
      )
      VALUES
      (
        @employeeId, @year, @month, @attendanceHours, @orderCount, @repairHours,
        @repairHoursSourceValue, @repairHoursQualityThreshold,
        @repairHoursQualityPercentile, @repairHoursQualityReason,
        @recordExcludeFromAverages, @recordAverageExclusionReason,
        @overtime15, @overtime20, @overtime30,
        @annualLeave, @sickLeave,
        @pm01, @pm03, @transfer, @repairTime,
        @mttr, @faultResponse, @batchId,
        @sourceFile, @sourceSheet, @sourceRow, @sourceField, @rawValue,
        @parsedValue, @validationStatus, @anomalyReason, @excludedFromPi
      );
  `);
}

async function insertDataQualityAnomaly(transaction, sql, anomaly, employeeId, batchId) {
  const period = parseMonthLabel(anomaly.month);
  const request = new sql.Request(transaction);
  request.input("batchId", sql.BigInt, batchId);
  request.input("sourceRecordId", sql.NVarChar(120), anomaly.id || null);
  request.input("employeeId", sql.BigInt, employeeId || null);
  request.input("year", sql.Int, Number(period?.year || anomaly.year) || null);
  request.input("month", sql.TinyInt, Number(period?.month) || null);
  request.input("anomalyType", sql.NVarChar(100), anomaly.type || "data_quality");
  request.input("severity", sql.NVarChar(30), anomaly.severity || "critical");
  request.input("status", sql.NVarChar(30), anomaly.status || "quarantined");
  request.input("reason", sql.NVarChar(500), anomaly.reason || "数据真实性异常");
  request.input("sourceFile", sql.NVarChar(500), anomaly.sourceFile || anomaly.provenance?.sourceFile || null);
  request.input("sourceSheet", sql.NVarChar(255), anomaly.sourceSheet || anomaly.provenance?.sourceSheet || null);
  request.input("sourceRow", sql.Int, Number(anomaly.sourceRow || anomaly.provenance?.sourceRow) || null);
  request.input("sourceField", sql.NVarChar(100), anomaly.sourceField || anomaly.provenance?.sourceField || anomaly.metric || null);
  request.input("rawValue", sql.NVarChar(sql.MAX), anomaly.rawValue === null || anomaly.rawValue === undefined ? null : String(anomaly.rawValue));
  request.input("parsedValue", sql.NVarChar(sql.MAX), anomaly.parsedValue === null || anomaly.parsedValue === undefined ? null : String(anomaly.parsedValue));
  request.input("excludedFromPi", sql.Bit, anomaly.excludedFromPi === false ? 0 : 1);
  await request.query(`
    INSERT INTO dbo.data_quality_anomalies (
      import_batch_id, source_record_id, employee_id, year, month,
      anomaly_type, severity, status, reason, source_file, source_sheet,
      source_row, source_field, raw_value, parsed_value, excluded_from_pi
    )
    VALUES (
      @batchId, @sourceRecordId, @employeeId, @year, @month,
      @anomalyType, @severity, @status, @reason, @sourceFile, @sourceSheet,
      @sourceRow, @sourceField, @rawValue, @parsedValue, @excludedFromPi
    )
  `);
}

async function updateImportBatchStatus(transaction, sql, batchId, { status, recordCount, validRecordCount, quarantinedRecordCount, remark }) {
  const request = new sql.Request(transaction);
  request.input("batchId", sql.BigInt, batchId);
  request.input("status", sql.NVarChar(30), status);
  request.input("recordCount", sql.Int, recordCount);
  request.input("validRecordCount", sql.Int, validRecordCount);
  request.input("quarantinedRecordCount", sql.Int, quarantinedRecordCount);
  request.input("remark", sql.NVarChar(sql.MAX), remark || null);
  await request.query(`
    UPDATE dbo.import_batches
    SET status = @status,
        record_count = @recordCount,
        valid_record_count = @validRecordCount,
        quarantined_record_count = @quarantinedRecordCount,
        remark = COALESCE(@remark, remark)
    WHERE id = @batchId
  `);
}

function parseIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

async function findEmployeeId(transaction, sql, record) {
  const employeeNo = normalizeEmployeeNo(record.employeeNo || record.operatorNo);
  const employeeName = normalizeEmployeeName(record.employeeName || record.operatorName);
  if (employeeNo) {
    const request = new sql.Request(transaction);
    request.input("employeeNo", sql.NVarChar(50), employeeNo);
    const result = await request.query(`
      SELECT TOP 1 id
      FROM dbo.employees
      WHERE employee_no = @employeeNo OR source_employee_no = @employeeNo
      ORDER BY id
    `);
    const id = result.recordset[0]?.id;
    if (id) {
      return id;
    }
  }

  if (employeeName) {
    const request = new sql.Request(transaction);
    request.input("employeeName", sql.NVarChar(100), employeeName);
    const result = await request.query(`
      SELECT TOP 1 id
      FROM dbo.employees
      WHERE employee_name = @employeeName
      ORDER BY id
    `);
    return result.recordset[0]?.id || null;
  }

  return null;
}

async function getOrCreateImprovementWorkshopId(transaction, sql, record) {
  const plant = inferPlantCode(record);
  if (!plant) {
    return null;
  }
  return getOrCreateWorkshopId(transaction, sql, {
    plant,
    workshop: record.workshop || `${plant}车间`,
  });
}

async function getOrCreateImprovementEmployeeId(transaction, sql, workshopId, teamId, record) {
  const existingEmployeeId = await findEmployeeId(transaction, sql, record);
  if (existingEmployeeId) {
    return existingEmployeeId;
  }
  if (!record.employeeName && !record.operatorName && !record.employeeNo && !record.operatorNo) {
    return null;
  }
  return getOrCreateEmployeeId(transaction, sql, workshopId, teamId, {
    employeeNo: record.employeeNo || record.operatorNo,
    employeeName: record.employeeName || record.operatorName,
    businessArea: record.businessArea,
    plant: inferPlantCode(record),
    department: record.department || record.sourceDepartment || "",
    workshop: record.workshop,
    shift: record.shift,
  });
}

async function upsertImprovement(transaction, sql, record, batchId) {
  const improvementType = String(record.improvementType || "").trim();
  if (!["near_miss", "pdca", "kaizen"].includes(improvementType)) {
    return false;
  }

  const improvementDate = parseIsoDate(record.createdDate);
  if (!improvementDate) {
    return false;
  }

  const workshopId = await getOrCreateImprovementWorkshopId(transaction, sql, record);
  const teamId = workshopId && record.shift ? await getOrCreateTeamId(transaction, sql, workshopId, record.shift) : null;
  const employeeId = await getOrCreateImprovementEmployeeId(transaction, sql, workshopId, teamId, record);
  const sourceProjectId = String(record.projectId || record.id || "").trim();
  if (!sourceProjectId) {
    return false;
  }

  const request = new sql.Request(transaction);
  request.input("workshopId", sql.BigInt, workshopId);
  request.input("teamId", sql.BigInt, teamId);
  request.input("employeeId", sql.BigInt, employeeId);
  request.input("improvementDate", sql.Date, improvementDate);
  request.input("improvementType", sql.NVarChar(20), improvementType);
  request.input("quantity", sql.Int, Number(record.quantity) || 1);
  request.input("benefitAmount", sql.Decimal(14, 2), Number(record.benefitAmount) || 0);
  request.input("description", sql.NVarChar(sql.MAX), record.projectTitle || null);
  request.input("sourceProjectId", sql.NVarChar(100), sourceProjectId || null);
  request.input("sourceProjectTitle", sql.NVarChar(500), record.projectTitle || null);
  request.input("projectType", sql.NVarChar(50), record.projectType || null);
  request.input("sourceDepartment", sql.NVarChar(100), record.sourceDepartment || null);
  request.input("lineArea", sql.NVarChar(100), record.lineArea || null);
  request.input("station", sql.NVarChar(100), record.station || null);
  request.input("operatorNo", sql.NVarChar(50), record.operatorNo || null);
  request.input("operatorName", sql.NVarChar(100), record.operatorName || null);
  request.input("executeOperatorNo", sql.NVarChar(50), record.executeOperatorNo || null);
  request.input("executeOperatorName", sql.NVarChar(100), record.executeOperatorName || null);
  request.input("approved", sql.Bit, record.approved ? 1 : 0);
  request.input("approvalStep", sql.NVarChar(100), record.approvalStep || null);
  request.input("sourceFile", sql.NVarChar(255), record.sourceFile || null);
  request.input("sourceRow", sql.Int, Number(record.sourceRow) || null);
  request.input("batchId", sql.BigInt, batchId);
  await request.query(`
    MERGE dbo.factory_improvements AS target
    USING (SELECT @sourceProjectId AS source_project_id) AS source
    ON target.source_project_id = source.source_project_id
    WHEN MATCHED THEN UPDATE SET
      workshop_id = @workshopId,
      team_id = @teamId,
      employee_id = @employeeId,
      improvement_date = @improvementDate,
      improvement_type = @improvementType,
      quantity = @quantity,
      benefit_amount = @benefitAmount,
      description = @description,
      source_project_title = @sourceProjectTitle,
      project_type = @projectType,
      source_department = @sourceDepartment,
      line_area = @lineArea,
      station = @station,
      operator_no = @operatorNo,
      operator_name = @operatorName,
      execute_operator_no = @executeOperatorNo,
      execute_operator_name = @executeOperatorName,
      approved = @approved,
      approval_step = @approvalStep,
      source_file = @sourceFile,
      source_row = @sourceRow,
      import_batch_id = @batchId
    WHEN NOT MATCHED THEN INSERT
      (
        workshop_id, team_id, employee_id, improvement_date, improvement_type,
        quantity, benefit_amount, description, source_project_id, source_project_title,
        project_type, source_department, line_area, station, operator_no, operator_name,
        execute_operator_no, execute_operator_name, approved, approval_step, source_file,
        source_row, import_batch_id
      )
      VALUES
      (
        @workshopId, @teamId, @employeeId, @improvementDate, @improvementType,
        @quantity, @benefitAmount, @description, @sourceProjectId, @sourceProjectTitle,
        @projectType, @sourceDepartment, @lineArea, @station, @operatorNo, @operatorName,
        @executeOperatorNo, @executeOperatorName, @approved, @approvalStep, @sourceFile,
        @sourceRow, @batchId
      );
  `);
  return true;
}

async function readImprovementRecords() {
  try {
    const raw = await fs.readFile(IMPROVEMENTS_FILE, "utf8");
    const payload = JSON.parse(raw);
    return Array.isArray(payload.records) ? payload.records : [];
  } catch (error) {
    return [];
  }
}

async function main() {
  const pool = await getMssqlPool();
  if (!pool) {
    throw new Error("SQL Server 未配置或 mssql 未安装。请先配置 DB_HOST、DB_USER、DB_NAME，并运行 npm install。");
  }

  const sql = require("mssql");
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const payload = JSON.parse(raw);
  const improvementRecords = await readImprovementRecords();
  const sourceRecords = (payload.records || []).filter((record) => !record.isTotal && record.employeeName !== "Total");
  const aggregation = aggregatePerformanceRecords(sourceRecords);
  const records = aggregation.records;
  const performanceAudit = auditPerformanceRecords(records);
  const validRecords = performanceAudit.validRecords;
  const criticalAnomalies = performanceAudit.anomalies.filter((anomaly) => anomaly.severity === "critical");
  const batchStatus = criticalAnomalies.length ? "blocked" : "published";
  const transaction = new sql.Transaction(pool);

  await transaction.begin();
  try {
    let request = new sql.Request(transaction);
    request.input("sourceName", sql.NVarChar(255), "data/worker-performance-monthly.json");
    request.input("sourceType", sql.NVarChar(50), "json");
    request.input("status", sql.NVarChar(30), batchStatus);
    request.input("importedBy", sql.NVarChar(100), process.env.USER || "local");
    request.input("recordCount", sql.Int, records.length);
    request.input("validRecordCount", sql.Int, validRecords.length);
    request.input("quarantinedRecordCount", sql.Int, performanceAudit.anomalies.length);
    request.input("remark", sql.NVarChar(sql.MAX), criticalAnomalies.length
      ? "Blocked by data authenticity audit. Official performance tables were not overwritten."
      : "Import from generated monthly JSON and PDCA improvements JSON"
    );
    const batchId = await scalar(
      request,
      `
        INSERT INTO dbo.import_batches (
          source_name, source_type, status, imported_by, remark,
          record_count, valid_record_count, quarantined_record_count
        )
        OUTPUT INSERTED.id
        VALUES (
          @sourceName, @sourceType, @status, @importedBy, @remark,
          @recordCount, @validRecordCount, @quarantinedRecordCount
        )
      `
    );

    for (const anomaly of performanceAudit.anomalies) {
      await insertDataQualityAnomaly(transaction, sql, anomaly, null, batchId);
    }

    if (criticalAnomalies.length) {
      await transaction.commit();
      console.log(JSON.stringify({
        imported: 0,
        skipped: records.length,
        importedImprovements: 0,
        skippedImprovements: improvementRecords.length,
        sourceRecords: sourceRecords.length,
        sourceImprovementRecords: improvementRecords.length,
        duplicateRecordsAggregated: aggregation.duplicateRecords,
        validRecords: validRecords.length,
        quarantinedRecords: performanceAudit.anomalies.length,
        criticalAnomalies: criticalAnomalies.length,
        batchStatus,
        batchId,
      }, null, 2));
      return;
    }

    await seedCertificates(transaction, sql);

    request = new sql.Request(transaction);
    await request.query("DELETE FROM dbo.performance_monthly");
    request = new sql.Request(transaction);
    await request.query("DELETE FROM dbo.factory_improvements WHERE source_file IS NOT NULL AND source_file LIKE N'快改平台数据%'");

    let imported = 0;
    let skipped = 0;
    let importedImprovements = 0;
    let skippedImprovements = 0;

    for (const record of validRecords) {
      const period = parseMonthLabel(record.month);
      if (!period) {
        skipped += 1;
        continue;
      }
      const workshopId = await getOrCreateWorkshopId(transaction, sql, record);
      const teamId = await getOrCreateTeamId(transaction, sql, workshopId, record.shift);
      const employeeId = await getOrCreateEmployeeId(transaction, sql, workshopId, teamId, record);
      await upsertPerformance(transaction, sql, employeeId, period, record, batchId);
      imported += 1;
    }

    for (const record of improvementRecords) {
      if (await upsertImprovement(transaction, sql, record, batchId)) {
        importedImprovements += 1;
      } else {
        skippedImprovements += 1;
      }
    }

    await updateImportBatchStatus(transaction, sql, batchId, {
      status: "published",
      recordCount: records.length,
      validRecordCount: imported,
      quarantinedRecordCount: performanceAudit.anomalies.length,
      remark: "Published valid records after data authenticity audit. Quarantined records were not imported into performance_monthly.",
    });

    await transaction.commit();
    console.log(JSON.stringify({
      imported,
      skipped,
      importedImprovements,
      skippedImprovements,
      sourceRecords: sourceRecords.length,
      sourceImprovementRecords: improvementRecords.length,
      duplicateRecordsAggregated: aggregation.duplicateRecords,
      validRecords: validRecords.length,
      quarantinedRecords: performanceAudit.anomalies.length,
      criticalAnomalies: criticalAnomalies.length,
      batchStatus: "published",
      batchId,
    }, null, 2));
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    throw error;
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
