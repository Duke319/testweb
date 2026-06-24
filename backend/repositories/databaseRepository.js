const { getMssqlPool, shouldUseDatabase } = require("../../src/database");

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(year, month) {
  return `${year} ${MONTH_NAMES[Number(month) - 1] || "Jan"}`;
}

function displayEmployeeNo(row) {
  const sourceEmployeeNo = row.source_employee_no || "";
  if (sourceEmployeeNo) {
    return sourceEmployeeNo;
  }
  const employeeNo = row.employee_no || "";
  return String(employeeNo).startsWith("NOID_") ? "" : employeeNo;
}

function toMonthlyRecord(row) {
  const shift = row.team_name || row.shift_name || "";
  const employeeName = row.employee_name || "";
  const employeeKey = row.employee_no || `${shift}::${employeeName}`;
  const plant = String(row.workshop_code || "");
  const businessArea = row.business_area || (["103", "104"].includes(plant) ? "AC" : "Tools");
  const attendanceHours = Number(row.attendance_hours) || 0;
  const repairHours = Number(row.repair_hours) || 0;
  const orderCount = Number(row.order_count) || 0;
  const pm01Hours = Number(row.pm01_hours) || 0;
  const pm03Hours = Number(row.pm03_hours) || 0;
  const transferHours = Number(row.transfer_hours) || 0;
  const piNumerator = pm01Hours + pm03Hours + transferHours;
  const annualLeaveHours = Number(row.annual_leave_hours) || 0;
  const sickLeaveHours = Number(row.sick_leave_hours) || 0;

  return {
    id: `${employeeKey}::${monthLabel(row.year, row.month)}`,
    sourceId: row.id,
    employeeId: row.employee_id || "",
    employeeNo: displayEmployeeNo(row),
    businessArea,
    plant,
    department: row.department || "",
    positionTitle: row.position_name || "",
    excludeFromAverages: Boolean(row.record_exclude_from_averages || row.exclude_from_averages),
    averageExclusionReason: [row.record_average_exclusion_reason, row.average_exclusion_reason].map((reason) => String(reason || "").trim()).filter(Boolean).join("；"),
    piTargetRate: row.pi_target_rate === null || row.pi_target_rate === undefined ? null : Number(row.pi_target_rate),
    piTargetLabel: row.pi_target_label || "",
    workshop: row.workshop_name || "101车间",
    shift,
    employeeKey,
    employeeName,
    month: monthLabel(row.year, row.month),
    year: String(row.year),
    monthNumber: Number(row.month),
    isTotal: false,
    attendanceHours,
    orderCount,
    repairHours,
    repairHoursSourceValue: row.repair_hours_source_value === null || row.repair_hours_source_value === undefined ? null : Number(row.repair_hours_source_value),
    repairHoursQualityThreshold: row.repair_hours_quality_threshold === null || row.repair_hours_quality_threshold === undefined ? null : Number(row.repair_hours_quality_threshold),
    repairHoursQualityPercentile: row.repair_hours_quality_percentile === null || row.repair_hours_quality_percentile === undefined ? null : Number(row.repair_hours_quality_percentile),
    repairHoursQualityReason: row.repair_hours_quality_reason || null,
    repairEfficiency: attendanceHours > 0 ? piNumerator / attendanceHours : 0,
    orderEfficiency: attendanceHours > 0 ? orderCount / attendanceHours : 0,
    overtime15Hours: Number(row.overtime_15_hours) || 0,
    overtime20Hours: Number(row.overtime_20_hours) || 0,
    overtime30Hours: Number(row.overtime_30_hours) || 0,
    leaveHours: annualLeaveHours + sickLeaveHours,
    annualLeaveHours,
    sickLeaveHours,
    compositeHours: Number(row.composite_hours) || 0,
    pm01Hours,
    pm03Hours,
    transferHours,
    repairTimeHours: Number(row.repair_time_hours) || repairHours,
    mttrMinutes: row.mttr_minutes === null || row.mttr_minutes === undefined ? null : Number(row.mttr_minutes),
    faultResponseMinutes: row.fault_response_minutes === null || row.fault_response_minutes === undefined ? null : Number(row.fault_response_minutes),
    importBatchId: row.import_batch_id || null,
    sourceFile: row.source_file || "",
    sourceSheet: row.source_sheet || "",
    sourceRow: row.source_row || null,
    sourceField: row.source_field || "",
    rawValue: row.raw_value || null,
    parsedValue: row.parsed_value || null,
    validationStatus: row.validation_status || "valid",
    anomalyReason: row.anomaly_reason || "",
    excludedFromPi: Boolean(row.excluded_from_pi),
  };
}

function dateOnly(value) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function toImprovementRecord(row) {
  const improvementDate = row.improvement_date instanceof Date ? row.improvement_date : new Date(row.improvement_date);
  const year = Number.isNaN(improvementDate.getTime()) ? "" : String(improvementDate.getFullYear());
  const month = Number.isNaN(improvementDate.getTime()) ? 0 : improvementDate.getMonth() + 1;
  const plant = String(row.workshop_code || "");
  const businessArea = row.business_area || (["103", "104"].includes(plant) ? "AC" : plant === "101" ? "Tools" : "");
  const shift = row.team_name || "";
  const employeeName = row.employee_name || row.operator_name || "";
  const employeeNo = displayEmployeeNo(row);
  return {
    id: row.source_project_id || row.id,
    sourceId: row.id,
    projectId: row.source_project_id || "",
    projectTitle: row.source_project_title || row.description || "",
    projectType: row.project_type || "",
    improvementType: row.improvement_type || "",
    employeeNo,
    employeeName,
    employeeKey: employeeNo || (shift && employeeName ? `${shift}::${employeeName}` : ""),
    businessArea,
    plant,
    department: row.department || "",
    workshop: row.workshop_name || "",
    shift,
    sourceDepartment: row.source_department || "",
    lineArea: row.line_area || "",
    station: row.station || "",
    createdDate: dateOnly(row.improvement_date),
    approved: row.approved === null || row.approved === undefined ? true : Boolean(row.approved),
    approvalStep: row.approval_step || "",
    month: year && month ? monthLabel(year, month) : "",
    year,
    monthNumber: month,
    quantity: Number(row.quantity) || 0,
    benefitAmount: Number(row.benefit_amount) || 0,
    pdcaAwardCount: Number(row.pdca_award_count) || 0,
    kaizenAwardCount: Number(row.kaizen_award_count) || 0,
  };
}

async function queryMssql(sqlText, params = {}) {
  const pool = await getMssqlPool();
  if (!pool) {
    return null;
  }
  const request = pool.request();
  Object.entries(params).forEach(([name, value]) => {
    request.input(name, value);
  });
  const result = await request.query(sqlText);
  return result.recordset;
}

async function readPerformanceRecordsFromMssql() {
  return queryMssql(`
    SELECT
      pm.*,
      e.employee_no,
      e.source_employee_no,
      e.employee_name,
      e.department,
      e.position_name,
      e.exclude_from_averages,
      e.average_exclusion_reason,
      e.pi_target_rate,
      e.pi_target_label,
      CASE
        WHEN w.workshop_code IN ('103', '104') THEN 'AC'
        ELSE 'Tools'
      END AS business_area,
      w.workshop_code,
      w.workshop_name,
      t.team_name
    FROM dbo.performance_monthly pm
    INNER JOIN dbo.employees e ON e.id = pm.employee_id
    LEFT JOIN dbo.workshops w ON w.id = e.workshop_id
    LEFT JOIN dbo.teams t ON t.id = e.team_id
    ORDER BY pm.year, pm.month, w.workshop_name, t.team_name, e.employee_name
  `);
}

async function readPerformanceRecordsFromDatabase() {
  if (!shouldUseDatabase()) {
    return null;
  }

  try {
    const rows = await readPerformanceRecordsFromMssql();
    return rows ? rows.map(toMonthlyRecord) : null;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(`SQL Server performance read failed, falling back to JSON: ${error.message}`);
    }
    return null;
  }
}

async function readImprovementRecordsFromMssql() {
  return queryMssql(`
    SELECT
      fi.*,
      e.employee_no,
      e.source_employee_no,
      e.employee_name,
      e.department,
      w.workshop_code,
      w.workshop_name,
      t.team_name,
      CASE
        WHEN w.workshop_code IN ('103', '104') THEN 'AC'
        WHEN w.workshop_code = '101' THEN 'Tools'
        ELSE NULL
      END AS business_area
    FROM dbo.factory_improvements fi
    LEFT JOIN dbo.employees e ON e.id = fi.employee_id
    LEFT JOIN dbo.workshops w ON w.id = fi.workshop_id
    LEFT JOIN dbo.teams t ON t.id = fi.team_id
    ORDER BY fi.improvement_date, fi.improvement_type, fi.id
  `);
}

async function readImprovementRecordsFromDatabase() {
  if (!shouldUseDatabase()) {
    return null;
  }

  try {
    const rows = await readImprovementRecordsFromMssql();
    return rows ? rows.map(toImprovementRecord) : null;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(`SQL Server improvement read failed, falling back to file improvements: ${error.message}`);
    }
    return null;
  }
}

async function readCertificatesFromMssql() {
  return queryMssql(`
    SELECT
      e.employee_no,
      e.source_employee_no,
    e.employee_name,
    e.department,
    e.position_name,
    e.exclude_from_averages,
    e.average_exclusion_reason,
    e.pi_target_rate,
    e.pi_target_label,
    t.team_name,
    c.certificate_code,
    c.certificate_name,
      ec.status,
      ec.expire_date
    FROM dbo.employee_certificates ec
    INNER JOIN dbo.employees e ON e.id = ec.employee_id
    LEFT JOIN dbo.teams t ON t.id = e.team_id
    INNER JOIN dbo.certificates c ON c.id = ec.certificate_id
    ORDER BY e.department, t.team_name, e.employee_name, c.certificate_name
  `);
}

async function readCertificatesFromDatabase() {
  if (!shouldUseDatabase()) {
    return null;
  }

  try {
    return await readCertificatesFromMssql();
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(`SQL Server certificate read failed, falling back to file certificates: ${error.message}`);
    }
    return null;
  }
}

async function createMssqlImportBatch({ sourceName, sourceType, importedBy, remark, status = "created", recordCount = 0, validRecordCount = 0, quarantinedRecordCount = 0 }) {
  const pool = await getMssqlPool();
  if (!pool) {
    return null;
  }
  const sql = require("mssql");
  const request = pool.request();
  request.input("sourceName", sql.NVarChar(255), sourceName);
  request.input("sourceType", sql.NVarChar(50), sourceType);
  request.input("status", sql.NVarChar(30), status);
  request.input("importedBy", sql.NVarChar(100), importedBy);
  request.input("remark", sql.NVarChar(sql.MAX), remark);
  request.input("recordCount", sql.Int, recordCount);
  request.input("validRecordCount", sql.Int, validRecordCount);
  request.input("quarantinedRecordCount", sql.Int, quarantinedRecordCount);
  const result = await request.query(`
    INSERT INTO dbo.import_batches (
      source_name, source_type, status, imported_by, remark,
      record_count, valid_record_count, quarantined_record_count
    )
    OUTPUT INSERTED.id
    VALUES (
      @sourceName, @sourceType, @status, @importedBy, @remark,
      @recordCount, @validRecordCount, @quarantinedRecordCount
    )
  `);
  return result.recordset[0]?.id || null;
}

async function createImportBatch({ sourceName, sourceType = "manual", importedBy = "system", remark = "", status = "created", recordCount = 0, validRecordCount = 0, quarantinedRecordCount = 0 }) {
  if (!shouldUseDatabase()) {
    return null;
  }

  return createMssqlImportBatch({ sourceName, sourceType, importedBy, remark, status, recordCount, validRecordCount, quarantinedRecordCount });
}

module.exports = {
  createImportBatch,
  readCertificatesFromDatabase,
  readImprovementRecordsFromDatabase,
  readPerformanceRecordsFromDatabase,
};
