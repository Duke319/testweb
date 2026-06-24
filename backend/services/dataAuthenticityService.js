const {
  readEmployeeCertificateData,
  readMonthlyWorkerData,
  readNearMissRecords,
  readPdcaImprovements,
  readRepairTimeAnomalies,
} = require("../repositories/fileRepository");

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SOURCE_LEDGER = [
  {
    id: "raw-performance-workbooks",
    name: "原始绩效 Excel/ZIP",
    layer: "raw",
    status: "部分来源",
    source: "data/raw/employee-performance-system",
    modules: ["出勤", "维修工时", "接单", "维修效率", "PM01/PM03", "转移工时", "MTTR", "响应时间"],
    note: "多个来源已接入；HR 主数据、正式工单 PM 类型和员工级响应时间仍待源系统补齐。",
  },
  {
    id: "worker-performance-monthly-json",
    name: "月度绩效生成结果",
    layer: "generated",
    status: "部分来源",
    source: "data/worker-performance-monthly.json",
    modules: ["月度绩效", "质量标记", "来源文件清单"],
    note: "当前 JSON 是解析结果，不是最终真实来源；正式 KPI 仍需保留回源定位。",
  },
  {
    id: "employee-certificates-json",
    name: "员工证书登记",
    layer: "generated",
    status: "部分来源",
    source: "data/employee-certificates.json",
    modules: ["证书持有状态", "员工名单"],
    note: "证书持有状态有来源行号；证书编号和到期日缺真实来源。",
  },
  {
    id: "pdca-improvements-json",
    name: "PDCA/快改平台",
    layer: "generated",
    status: "部分来源",
    source: "data/pdca-improvements.json",
    modules: ["PDCA", "Kaizen", "改善收益"],
    note: "仅 approved 记录进入指标；收益核算口径仍需业务签字。",
  },
  {
    id: "near-miss-records-json",
    name: "Near miss 台账",
    layer: "generated",
    status: "真实来源",
    source: "data/raw/employee-performance-system/TEF3 Near Miss.xlsx",
    modules: ["Near miss", "关闭状态", "事故描述"],
    note: "仅 type = Near Miss 的记录进入指标；Fire Accident 等非 Near Miss 类型已排除。",
  },
  {
    id: "repair-time-anomalies-json",
    name: "维修时间异常抽取",
    layer: "generated",
    status: "异常隔离",
    source: "data/repair-time-anomalies.json",
    modules: ["维修时间 > 300 min"],
    note: "用于异常栏目和回源复核，不参与正式 PI。",
  },
  {
    id: "sqlserver-serving",
    name: "SQL Server 服务库",
    layer: "serving",
    status: "部分来源",
    source: "dbo.performance_monthly / dbo.import_batches",
    modules: ["正式服务数据", "批次追溯"],
    note: "已有批次级追溯；本次补充字段级追溯和异常隔离模型。",
  },
  {
    id: "frontend-api",
    name: "前端 API",
    layer: "api",
    status: "部分来源",
    source: "/api/performance/*",
    modules: ["总览", "PI", "异常", "能力矩阵"],
    note: "统计接口必须只返回有效数据，异常接口返回隔离记录。",
  },
];

const BASE_GAP_ROWS = [
  {
    category: "缺失",
    module: "员工与组织",
    item: "HR 正式员工主数据",
    method: "以 HR/考勤正式工号作为员工身份主键，禁止仅按姓名合并",
    need: "补充正式工号、正式部门、岗位、员工状态",
    impact: "导入去重；员工详情；能力矩阵；PI 归属",
    sourceStatus: "当前仅有绩效、证书、PDCA 中的部分工号和姓名",
    severity: "critical",
  },
  {
    category: "待确认",
    module: "工单结构",
    item: "AC PM01/PM03 拆分",
    method: "从正式工单 PM 类型拆分 PM01 与 PM03",
    need: "补齐 AC 与历史月份正式工单 PM 类型",
    impact: "PI；工时结构；员工详情",
    sourceStatus: "当前 AC 多数以 repair_hours_as_pm01 或 PM03=0 兜底",
    severity: "critical",
  },
  {
    category: "待确认",
    module: "工单结构",
    item: "转移工时归属",
    method: "从转移工时确认表按提出者、责任人、员工月份匹配",
    need: "补齐提出者和责任人确认，未确认不得进入个人 KPI",
    impact: "PI；异常；明细",
    sourceStatus: "当前存在 noEmployeeMonthRecord 和 unconfirmedRequester",
    severity: "critical",
  },
  {
    category: "已接入",
    module: "工厂改善",
    item: "Near miss 正式来源",
    method: "从 TEF3 Near Miss.xlsx 读取 type = Near Miss 的记录",
    need: "后续可补充责任部门签字和收益金额口径",
    impact: "改善趋势；总览",
    sourceStatus: "已接入 data/near-miss-records.json，非 Near Miss 类型不计入",
    severity: "info",
  },
  {
    category: "缺失",
    module: "能力证书",
    item: "证书编号和到期日",
    method: "从证书台账读取 certificate_no、issue_date、expire_date",
    need: "补充真实证书编号、签发日期、到期日期",
    impact: "能力矩阵；排班风险；审计",
    sourceStatus: "当前只可靠记录持证布尔值",
    severity: "major",
  },
];

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

function parseMonthLabel(label) {
  const match = String(label || "").match(/^(\d{4})\s+([A-Za-z]{3})$/);
  if (!match) {
    return { year: "", monthNumber: 0, month: "" };
  }
  const monthNumber = MONTH_NAMES.indexOf(match[2]) + 1;
  return {
    year: match[1],
    monthNumber,
    month: monthNumber ? `${match[1]} ${match[2]}` : "",
  };
}

function getMonthIndex(label) {
  const parts = parseMonthLabel(label);
  return Number(parts.year || 0) * 100 + Number(parts.monthNumber || 0);
}

function piNumeratorForRecord(record = {}) {
  return Number(record.pm01Hours || 0) + Number(record.pm03Hours || 0) + Number(record.transferHours || 0);
}

function formatMonth(year, monthNumber) {
  return `${year} ${MONTH_NAMES[Number(monthNumber) - 1] || "Jan"}`;
}

function sourceList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }
  if (!value) {
    return [];
  }
  return [String(value)];
}

function recordSources(record = {}) {
  return [
    ...sourceList(record.sourceFile),
    ...sourceList(record.sourceFiles),
    ...sourceList(record.pmSourceFiles),
    ...sourceList(record.transferSupplementalSourceFiles),
    record.pmDataSource || "",
    record.mttrDataSource || "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function provenanceForRecord(record = {}) {
  const sources = recordSources(record);
  return {
    importBatchId: record.importBatchId || record.import_batch_id || null,
    sourceFile: sources[0] || "",
    sourceFiles: sources,
    sourceSheet: record.sourceSheet || record.source_sheet || "",
    sourceRow: record.sourceRow || record.source_row || null,
    sourceField: record.sourceField || record.source_field || "",
    rawValue: record.rawValue ?? record.raw_value ?? null,
    parsedValue: record.parsedValue ?? record.parsed_value ?? null,
  };
}

function buildAnomalyRecord(record, type, reason, options = {}) {
  return {
    id: `${type}-${record.id || record.sourceId || record.employeeKey || record.employeeName || "record"}-${record.month || options.month || ""}`,
    type,
    severity: options.severity || "critical",
    status: "quarantined",
    category: options.category || "数据真实性",
    reason,
    excludedFromPi: true,
    employeeKey: record.employeeKey || "",
    employeeNo: record.employeeNo || record.employee_no || "",
    employeeName: record.employeeName || record.employee_name || record.sourceName || "",
    department: record.department || "",
    sourceDepartment: record.sourceDepartment || record.source_department || "",
    businessArea: record.businessArea || "",
    plant: record.plant || "",
    workshop: record.workshop || "",
    shift: record.shift || "",
    month: record.month || options.month || "",
    year: record.year || parseMonthLabel(record.month).year || "",
    metric: options.metric || "",
    rawValue: options.rawValue ?? null,
    parsedValue: options.parsedValue ?? null,
    sourceFile: options.sourceFile || provenanceForRecord(record).sourceFile,
    sourceSheet: options.sourceSheet || provenanceForRecord(record).sourceSheet,
    sourceRow: options.sourceRow || provenanceForRecord(record).sourceRow,
    sourceField: options.sourceField || provenanceForRecord(record).sourceField,
    provenance: provenanceForRecord(record),
  };
}

function isRepairHoursQualityRecord(record = {}) {
  return Boolean(record.repairHoursQualityReason || record.repairHoursQualityIssue || hasMetricValue(record, "repairHoursSourceValue"));
}

function anomalyReasonsForPerformanceRecord(record = {}) {
  const reasons = [];
  const attendance = Number(record.attendanceHours || 0);
  const repairHours = Number(record.repairHours || 0);
  const pm01Hours = Number(record.pm01Hours || 0);
  const pm03Hours = Number(record.pm03Hours || 0);
  const transferHours = Number(record.transferHours || 0);
  const orderCount = Number(record.orderCount || 0);
  const mttrMinutes = Number(record.mttrMinutes || 0);
  const piHours = piNumeratorForRecord(record);

  if (attendance <= 0 && (orderCount > 0 || repairHours > 0 || piHours > 0 || mttrMinutes > 0)) {
    reasons.push({
      type: "zero_attendance_with_work",
      reason: "0 出勤但存在接单、维修、PM/转移或 MTTR 数据",
      metric: "attendanceHours",
      rawValue: attendance,
      severity: "critical",
    });
  }

  if (attendance > 0 && repairHours > attendance) {
    reasons.push({
      type: "repair_hours_exceed_attendance",
      reason: "维修工时超过出勤工时",
      metric: "repairHours",
      rawValue: repairHours,
      parsedValue: attendance,
      severity: "critical",
    });
  }

  if (record.repairHoursQualityReason || record.repairHoursQualityIssue) {
    reasons.push({
      type: "repair_hours_quality",
      reason: record.repairHoursQualityReason || record.repairHoursQualityIssue?.reason || "维修工时源记录异常",
      metric: "repairHours",
      rawValue: record.repairHoursSourceValue ?? repairHours,
      parsedValue: repairHours,
      severity: "critical",
    });
  }

  if (record.mttrQualityIssue) {
    reasons.push({
      type: "mttr_quality",
      reason: record.mttrQualityIssue?.reason || "MTTR 源记录异常",
      metric: "mttrMinutes",
      rawValue: record.mttrSourceValue ?? mttrMinutes,
      parsedValue: mttrMinutes || null,
      severity: "critical",
    });
  }

  if (record.transferSupplemental) {
    const reason = String(record.transferSupplementalReason || record.transferSupplementalReasons?.join(",") || "");
    if (reason.includes("unconfirmedRequester") || reason.includes("noEmployeeMonthRecord")) {
      reasons.push({
        type: "transfer_unconfirmed",
        reason: `转移工时归属未确认：${reason || "补录归属待确认"}`,
        metric: "transferHours",
        rawValue: record.transferSupplementalSourceHours ?? transferHours,
        parsedValue: transferHours,
        severity: "critical",
      });
    }
  }

  if (String(record.pmDataSource || "").includes("repair_hours_as_pm01") || String(record.pmDataSource || "").includes("ac_repair_hours_as_pm01")) {
    reasons.push({
      type: "pm_split_unconfirmed",
      reason: "PM01/PM03 未接入正式工单类型，当前为维修工时兜底口径",
      metric: "pm01Hours",
      rawValue: pm01Hours + pm03Hours,
      parsedValue: pm01Hours,
      severity: "critical",
    });
  }

  return reasons;
}

function auditPerformanceRecords(records = []) {
  const anomalies = [];
  const validRecords = [];

  records.forEach((record) => {
    const reasons = anomalyReasonsForPerformanceRecord(record);
    if (reasons.length) {
      reasons.forEach((item) => {
        anomalies.push(buildAnomalyRecord(record, item.type, item.reason, item));
      });
      return;
    }
    validRecords.push({
      ...record,
      validationStatus: "valid",
      anomalyReason: "",
      excludedFromPiByAnomaly: false,
      provenance: provenanceForRecord(record),
    });
  });

  return { validRecords, anomalies };
}

function buildCertificateAnomalies(certificateData = {}) {
  const certificateTypes = Array.isArray(certificateData.certificateTypes) ? certificateData.certificateTypes : [];
  const anomalies = [];

  (certificateData.employees || []).forEach((employee) => {
    const hasAnyCertificate = certificateTypes.some((type) => Boolean(employee.certificates?.[type.code]));
    if (hasAnyCertificate) {
      anomalies.push(buildAnomalyRecord(
        {
          employeeNo: employee.employeeNo,
          employeeName: employee.employeeName,
          department: employee.department,
          sourceName: employee.sourceName,
          sourceRow: employee.sourceRow,
          sourceFile: certificateData.source?.file || "",
        },
        "certificate_missing_expiry",
        "证书有持证状态，但缺少真实证书编号或到期日",
        {
          category: "能力证书",
          metric: "certificate_no/expire_date",
          sourceFile: certificateData.source?.file || "",
          sourceRow: employee.sourceRow || null,
          severity: "major",
        }
      ));
    }
    if (!employee.employeeNo) {
      anomalies.push(buildAnomalyRecord(
        {
          employeeName: employee.employeeName,
          department: employee.department,
          sourceName: employee.sourceName,
          sourceRow: employee.sourceRow,
          sourceFile: certificateData.source?.file || "",
        },
        "employee_identity_missing_no",
        "证书员工缺正式工号，仅能按姓名候选匹配",
        {
          category: "员工身份",
          metric: "employeeNo",
          sourceFile: certificateData.source?.file || "",
          sourceRow: employee.sourceRow || null,
          severity: "major",
        }
      ));
    }
  });

  return anomalies;
}

function buildImprovementAnomalies(improvementData = {}) {
  const anomalies = [];
  (improvementData.records || []).forEach((record) => {
    if (!record.approved) {
      anomalies.push(buildAnomalyRecord(record, "improvement_not_approved", "改善记录未审批，不计入正式改善指标", {
        category: "工厂改善",
        metric: "approved",
        rawValue: record.approvalStep || "",
        sourceFile: record.sourceFile || "",
        sourceRow: record.sourceRow || null,
        severity: "major",
      }));
    }
    if ((!record.employeeKey && !record.employeeNo && !record.employeeName) || (record.matchedBy !== undefined && !record.matchedBy && !record.employeeNo)) {
      anomalies.push(buildAnomalyRecord(record, "improvement_employee_unmatched", "改善记录缺少可确认员工归属", {
        category: "工厂改善",
        metric: "employee",
        sourceFile: record.sourceFile || "",
        sourceRow: record.sourceRow || null,
        severity: "critical",
      }));
    }
  });
  return anomalies;
}

function buildRepairTimeAnomalyRows(repairTimeData = {}) {
  return (repairTimeData.records || []).map((record) =>
    buildAnomalyRecord(record, "repair_time_over_threshold", "维修时间超过 300 min 阈值，需回源复核", {
      category: "维修响应",
      metric: "repairTimeMinutes",
      rawValue: record.repairTimeMinutes ?? null,
      parsedValue: record.repairTimeMinutes ?? null,
      sourceFile: record.sourceFile || "",
      sourceSheet: record.sourceSheet || "",
      sourceRow: record.sourceRow || null,
      sourceField: "维修时间(Min)",
      severity: Number(record.repairTimeMinutes || 0) > 1440 ? "critical" : "major",
    })
  );
}

function expectedMonthsFromRawSources(monthlyData = {}) {
  const months = new Set(monthlyData.monthOrder || []);
  const sourceFiles = monthlyData.sourceFiles || monthlyData.source?.sourceFiles || {};
  const text = JSON.stringify(sourceFiles);
  if (/2026/.test(text) && /05|May|5月/.test(text)) {
    months.add("2026 May");
  }
  return [...months].filter(Boolean).sort((left, right) => getMonthIndex(left) - getMonthIndex(right));
}

function buildMissingMonthAnomalies(monthlyData = {}, performanceRecords = []) {
  const actualMonths = new Set(performanceRecords.map((record) => record.month).filter(Boolean));
  return expectedMonthsFromRawSources(monthlyData)
    .filter((month) => !actualMonths.has(month))
    .map((month) => buildAnomalyRecord({ month, year: parseMonthLabel(month).year }, "missing_month_performance", "原始来源存在月份线索，但月度绩效主表缺失", {
      category: "数据完整性",
      metric: "month",
      rawValue: month,
      severity: "critical",
    }));
}

function summarizeBy(records = [], field) {
  const groups = new Map();
  records.forEach((record) => {
    const key = String(record[field] || "未分类");
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  return [...groups.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key, "zh-Hans-CN"));
}

function summarizeAudit({ source, totalRecords, validRecords, performanceAnomalies = [], anomalies = [] }) {
  const performanceCriticalCount = performanceAnomalies.filter((item) => item.severity === "critical").length;
  const totalCriticalCount = anomalies.filter((item) => item.severity === "critical").length;
  return {
    source,
    totalRecords,
    validRecords: validRecords.length,
    quarantinedRecords: performanceAnomalies.length,
    criticalCount: performanceCriticalCount,
    totalAnomalies: anomalies.length,
    totalCriticalCount,
    batchStatus: performanceCriticalCount ? "blocked" : "publishable",
    policy: "异常不修正、不计入计算、保留原值并显示在异常栏目",
    byType: summarizeBy(anomalies, "type"),
    byCategory: summarizeBy(anomalies, "category"),
  };
}

function sourceCoverageFromData({ monthlyData, certificateData, pdcaData, nearMissData, repairTimeData, source }) {
  const monthlyRecords = monthlyData.records || [];
  const nonTotalRecords = monthlyRecords.filter((record) => !record.isTotal && record.month);
  const sourceFiles = monthlyData.sourceFiles || monthlyData.source?.sourceFiles || {};
  return {
    servingSource: source,
    ledgers: SOURCE_LEDGER,
    totals: {
      monthlyRecords: nonTotalRecords.length,
      monthCount: (monthlyData.monthOrder || []).length,
      certificateEmployees: (certificateData.employees || []).length,
      pdcaRows: pdcaData.summary?.rowCount || (pdcaData.records || []).length,
      pdcaApprovedRows: pdcaData.summary?.approvedRowCount || (pdcaData.records || []).filter((record) => record.approved).length,
      nearMissRows: nearMissData.summary?.rowCount || (nearMissData.records || []).length,
      nearMissCount: nearMissData.summary?.nearMissCount || (nearMissData.records || []).filter((record) => record.improvementType === "near_miss").length,
      nearMissMatchedEmployees: nearMissData.summary?.matchedEmployeeCount || (nearMissData.records || []).filter((record) => record.matchedBy).length,
      repairTimeRowsScanned: repairTimeData.summary?.rowsScanned || 0,
      repairTimeAnomalies: repairTimeData.summary?.anomalyCount || (repairTimeData.records || []).length,
    },
    sourceFiles,
  };
}

function gapRowsFromAudit({ monthlyData, performanceAnomalies, certificateAnomalies, improvementAnomalies, repairTimeAnomalies, missingMonthAnomalies }) {
  const rows = [...BASE_GAP_ROWS];
  const countByType = new Map();
  [...performanceAnomalies, ...certificateAnomalies, ...improvementAnomalies, ...repairTimeAnomalies, ...missingMonthAnomalies].forEach((item) => {
    countByType.set(item.type, (countByType.get(item.type) || 0) + 1);
  });

  const addDynamic = (type, category, module, item, method, need, impact, sourceStatus, severity = "critical") => {
    const count = countByType.get(type) || 0;
    if (!count) return;
    rows.push({
      category,
      module,
      item,
      method,
      need,
      impact,
      sourceStatus: `${sourceStatus}；当前 ${count} 条`,
      severity,
    });
  };

  addDynamic("missing_month_performance", "缺失", "数据完整性", "月度绩效主表缺失月份", "原始来源月份与绩效主表月份比对", "补齐缺失月份主表并重新导入", "总览；PI；趋势", "原始来源存在月份线索但主表缺失");
  addDynamic("zero_attendance_with_work", "异常隔离", "生产绩效", "0 出勤但有工作量", "attendance_hours=0 且接单/维修/PM/MTTR>0", "回源确认考勤缺录或工单归属，确认前不进 KPI", "PI；明细；总览", "已隔离");
  addDynamic("repair_hours_exceed_attendance", "异常隔离", "生产绩效", "维修工时超过出勤", "repair_hours > attendance_hours", "回源确认维修工时或考勤录入", "PI；排名；员工详情", "已隔离");
  addDynamic("repair_hours_quality", "异常隔离", "生产绩效", "维修工时源记录异常", "生成脚本质量规则标记", "回源复核源工作簿", "PI；异常", "已隔离");
  addDynamic("mttr_quality", "异常隔离", "维修响应", "MTTR 源记录异常", "MTTR 质量规则标记", "确认单位、Total 列和日均回退规则", "MTTR；异常", "已隔离");
  addDynamic("transfer_unconfirmed", "异常隔离", "工单结构", "转移工时未确认", "transferSupplementalReason 检查", "补齐提出者、责任人和员工月份归属", "PI；异常", "已隔离");
  addDynamic("pm_split_unconfirmed", "异常隔离", "工单结构", "PM01/PM03 口径不明", "pmDataSource 包含 repair_hours_as_pm01", "接入正式工单 PM 类型", "PI；工时结构", "已隔离");
  addDynamic("certificate_missing_expiry", "缺失", "能力证书", "证书编号/到期日缺失", "持证状态存在但编号/到期日为空", "补充证书台账字段", "能力矩阵；排班风险", "待补齐", "major");
  addDynamic("repair_time_over_threshold", "异常隔离", "维修响应", "维修时间超过阈值", "维修时间(Min)>300", "回源确认录入是否真实", "异常；MTTR；PI", "已隔离", "major");
  addDynamic("improvement_not_approved", "异常隔离", "工厂改善", "改善记录未审批", "approved=false", "审批通过后新批次导入", "改善指标", "已隔离", "major");

  rows.push({
    category: "已有",
    module: "数据范围",
    item: "当前绩效月份范围",
    method: "从 monthOrder 读取",
    need: "每次导入后自动核对月份连续性",
    impact: "全局筛选；趋势",
    sourceStatus: `${(monthlyData.monthOrder || [])[0] || "-"} 至 ${(monthlyData.monthOrder || []).slice(-1)[0] || "-"}，共 ${(monthlyData.monthOrder || []).length || 0} 个月`,
    severity: "info",
  });

  return rows;
}

function toCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function gapRowsToCsv(rows = []) {
  const headers = ["分类", "数据模块", "数据项", "处理或计算方法", "后续需要", "影响界面", "当前来源/状态", "严重性"];
  const body = rows.map((row) => [
    row.category,
    row.module,
    row.item,
    row.method,
    row.need,
    row.impact,
    row.sourceStatus,
    row.severity,
  ]);
  return [headers, ...body].map((cells) => cells.map(toCsvCell).join(",")).join("\n");
}

async function buildDataAuthenticityAudit({ source = "json", records = [] } = {}) {
  const [monthlyData, certificateData, pdcaData, nearMissData, repairTimeData] = await Promise.all([
    readMonthlyWorkerData(),
    readEmployeeCertificateData(),
    readPdcaImprovements(),
    readNearMissRecords(),
    readRepairTimeAnomalies(),
  ]);
  const performanceRecords = records.length
    ? records
    : (monthlyData.records || []).filter((record) => !record.isTotal && record.month);
  const performanceAudit = auditPerformanceRecords(performanceRecords);
  const certificateAnomalies = buildCertificateAnomalies(certificateData);
  const improvementAnomalies = buildImprovementAnomalies({
    records: [...(pdcaData.records || []), ...(nearMissData.records || [])],
  });
  const repairTimeRows = buildRepairTimeAnomalyRows(repairTimeData);
  const missingMonthAnomalies = buildMissingMonthAnomalies(monthlyData, performanceRecords);
  const anomalies = [
    ...performanceAudit.anomalies,
    ...missingMonthAnomalies,
    ...certificateAnomalies,
    ...improvementAnomalies,
    ...repairTimeRows,
  ].sort((left, right) => {
    const severityOrder = { critical: 0, major: 1, warning: 2, info: 3 };
    return (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9) || getMonthIndex(right.month) - getMonthIndex(left.month);
  });

  const gapRows = gapRowsFromAudit({
    monthlyData,
    performanceAnomalies: performanceAudit.anomalies,
    certificateAnomalies,
    improvementAnomalies,
    repairTimeAnomalies: repairTimeRows,
    missingMonthAnomalies,
  });

  return {
	    summary: summarizeAudit({
	      source,
	      totalRecords: performanceRecords.length,
	      validRecords: performanceAudit.validRecords,
	      performanceAnomalies: performanceAudit.anomalies,
	      anomalies,
	    }),
    validPerformanceRecords: performanceAudit.validRecords,
    anomalies,
    sourceCoverage: sourceCoverageFromData({ monthlyData, certificateData, pdcaData, nearMissData, repairTimeData, source }),
    gapChecklist: {
      updatedAt: new Date().toISOString(),
      rows: gapRows,
      csv: gapRowsToCsv(gapRows),
    },
    importBatches: [
      {
        id: "current-file-audit",
        sourceName: source === "json" ? "data/worker-performance-monthly.json" : source,
        sourceType: source,
        status: anomalies.some((item) => item.severity === "critical") ? "blocked" : "publishable",
        importedAt: new Date().toISOString(),
	        recordCount: performanceRecords.length,
	        validRecordCount: performanceAudit.validRecords.length,
	        quarantinedRecordCount: performanceAudit.anomalies.length,
	        totalAnomalyCount: anomalies.length,
	        policy: "blocked 批次不覆盖正式结果；异常需人工复核后新批次导入",
	      },
    ],
  };
}

module.exports = {
  auditPerformanceRecords,
  buildDataAuthenticityAudit,
  gapRowsToCsv,
  isRepairHoursQualityRecord,
  provenanceForRecord,
};
