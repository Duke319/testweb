const fs = require("node:fs");
const path = require("node:path");

const outFile = path.resolve(__dirname, "../frontend/public/demo/static-demo-snapshot.js");
const realDataRoot = process.env.REAL_DATA_ROOT || "";
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const departments = ["TEF31", "TEF32", "TEF33"];
const fallbackCertificateTypes = [
  { code: "DQAQ", name: "低压电气安全操作证" },
  { code: "JXWX", name: "机械维修技能证" },
  { code: "PLCTS", name: "PLC调试与故障诊断证" },
  { code: "QZBZ", name: "起重搬运安全证" },
  { code: "GYZD", name: "工艺诊断能力证" },
  { code: "SBXJ", name: "设备巡检上岗证" },
];
const surnames = ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗", "梁", "宋", "郑", "谢", "韩"];
const givenNameFirstChars = ["梓", "宇", "俊", "思", "嘉", "明", "浩", "子", "亦", "文"];
const givenNameSecondChars = ["轩", "涵", "辰", "琪", "宁", "睿", "航", "然", "杰", "安"];

function readRealJson(relativePath) {
  if (!realDataRoot) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(path.join(realDataRoot, relativePath), "utf8"));
  } catch (error) {
    console.warn(`Skipping real data source ${relativePath}: ${error.message}`);
    return null;
  }
}

const realCertificateData = readRealJson("data/employee-certificates.json");
const realNearMissData = readRealJson("data/near-miss-records.json");
const certificateTypes = Array.isArray(realCertificateData?.certificateTypes) && realCertificateData.certificateTypes.length
  ? realCertificateData.certificateTypes.map((type) => ({ code: type.code, name: type.name, sourceColumn: type.sourceColumn || type.name }))
  : fallbackCertificateTypes;

function monthsBetween(startYear, startMonthIndex, endYear, endMonthIndex) {
  const months = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const first = year === startYear ? startMonthIndex : 0;
    const last = year === endYear ? endMonthIndex : 11;
    for (let month = first; month <= last; month += 1) {
      months.push({ label: `${year} ${monthNames[month]}`, year: String(year), monthNumber: month + 1, index: year * 100 + month + 1 });
    }
  }
  return months;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function average(rows, field) {
  const values = rows.map((row) => Number(row[field])).filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length, 1) : null;
}

function uniqueCount(rows, field) {
  return new Set(rows.map((row) => row[field]).filter(Boolean)).size;
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))];
}

function makeChineseName(index) {
  const surname = surnames[index % surnames.length];
  const first = givenNameFirstChars[Math.floor(index / givenNameSecondChars.length) % givenNameFirstChars.length];
  const second = givenNameSecondChars[index % givenNameSecondChars.length];
  return `${surname}${first}${second}`;
}

function makeEmployeeProfile(index) {
  return {
    profileLabel: ["稳定高效", "技能提升", "加班支援", "响应偏慢", "改善活跃"][index % 5],
    piBaseRate: 0.758 + ((index * 17) % 82) / 1000,
    attendanceBase: 142 + ((index * 19) % 34),
    productivityFactor: 0.43 + ((index * 31) % 46) / 100,
    overtimeBias: (index * 7) % 6,
    leaveBias: (index * 13) % 5,
    mttrBase: 38 + ((index * 29) % 62),
    responseBias: (index * 11) % 9,
    improvementBias: (index * 5) % 4,
    riskBias: (index * 7) % 5,
  };
}

function certificateStatus(employeeIndex, certIndex) {
  const skillBand = (employeeIndex * 17) % 100;
  const missingThreshold = skillBand < 25 ? 4 : skillBand > 75 ? 1 : 2;
  const state = (employeeIndex * 7 + certIndex * 5 + Math.floor(employeeIndex / 10)) % 12;
  const hasCertificate = state >= missingThreshold;
  const expiryState = (employeeIndex * 3 + certIndex * 4) % 10;
  return {
    hasCertificate,
    status: !hasCertificate ? "missing" : expiryState === 0 ? "expired" : expiryState <= 2 ? "expiring" : "valid",
    stateLabel: !hasCertificate ? "未登记" : expiryState === 0 ? "已过期" : expiryState <= 2 ? "即将到期" : "有效",
  };
}

function countCertificateGaps(employeeCount) {
  let count = 0;
  for (let employeeIndex = 0; employeeIndex < employeeCount; employeeIndex += 1) {
    for (let certIndex = 0; certIndex < certificateTypes.length; certIndex += 1) {
      if (!certificateStatus(employeeIndex, certIndex).hasCertificate) {
        count += 1;
      }
    }
  }
  return count;
}

function certificateStateLabel(status) {
  if (status === "expired") return "已过期";
  if (status === "expiring") return "即将到期";
  if (status === "missing") return "未登记";
  return "有效";
}

function certificateStatusFromExpiry(hasCertificate, expireDate) {
  if (!hasCertificate) {
    return "missing";
  }
  if (!expireDate) {
    return "valid";
  }
  const expiry = new Date(`${expireDate}T00:00:00.000Z`);
  if (Number.isNaN(expiry.getTime())) {
    return "valid";
  }
  const reference = new Date("2026-06-24T00:00:00.000Z");
  const daysUntilExpiry = (expiry.getTime() - reference.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilExpiry < 0) {
    return "expired";
  }
  return daysUntilExpiry <= 90 ? "expiring" : "valid";
}

function countRealCertificateGaps(certificateData) {
  if (!Array.isArray(certificateData?.employees)) {
    return null;
  }
  return certificateData.employees.reduce((total, employee) => (
    total + certificateTypes.filter((type) => !employee.certificates?.[type.code]).length
  ), 0);
}

function makeEmployee(index) {
  const department = departments[index % departments.length];
  const no = `MOC-${String(index + 1).padStart(3, "0")}`;
  const profile = makeEmployeeProfile(index);
  return {
    employeeKey: `MOCK::${department}::${String(index + 1).padStart(3, "0")}`,
    employeeNo: no,
    employeeName: makeChineseName(index),
    department,
    businessArea: "模拟业务区",
    plant: "杭州模拟工厂",
    workshop: `${department}维修班组`,
    shift: `${department}-${(index % 2) + 1}`,
    positionTitle: index % 3 === 0 ? "高级维修技师" : "维修技师",
    jobTitle: "设备维修技师",
    role: "设备维修",
    piTargetRate: round(clamp(profile.piBaseRate + 0.015, 0.76, 0.85), 3),
    piTargetLabel: `${department} PI目标`,
    profileLabel: profile.profileLabel,
    piBaseRate: profile.piBaseRate,
    attendanceBase: profile.attendanceBase,
    productivityFactor: profile.productivityFactor,
    overtimeBias: profile.overtimeBias,
    leaveBias: profile.leaveBias,
    mttrBase: profile.mttrBase,
    responseBias: profile.responseBias,
    improvementBias: profile.improvementBias,
    riskBias: profile.riskBias,
  };
}

const months = monthsBetween(2024, 0, 2026, 3);
const employeesBase = Array.from({ length: 100 }, (_, index) => makeEmployee(index));
const rawRecords = [];
const improvementRecords = [];

employeesBase.forEach((employee, employeeIndex) => {
  months.forEach((month, monthIndex) => {
    const season = Math.sin((monthIndex + employeeIndex * 0.7) / 3.5);
    const monthlyLoad = ((employeeIndex * 5 + monthIndex * 7) % 13) - 6;
    const attendanceHours = round(employee.attendanceBase + monthlyLoad + season * (2 + employee.riskBias * 0.6) - employee.leaveBias * 0.7, 1);
    const piRate = round(clamp(
      employee.piBaseRate
        + season * 0.006
        + (((employeeIndex * 11 + monthIndex * 7) % 9) - 4) / 1000,
      0.752,
      0.848
    ), 4);
    const piHoursTarget = round(attendanceHours * piRate, 1);
    const transferHours = round(piHoursTarget * (0.07 + ((employeeIndex + monthIndex) % 4) * 0.01), 1);
    const pm01Hours = round(piHoursTarget * (0.54 + ((employeeIndex + monthIndex) % 5) * 0.015), 1);
    const pm03Hours = round(Math.max(0, piHoursTarget - pm01Hours - transferHours), 1);
    const piHours = pm01Hours + pm03Hours + transferHours;
    const repairHours = round(piHours * (0.84 + employee.riskBias * 0.018 + ((employeeIndex + monthIndex) % 5) * 0.012), 1);
    const orderCount = Math.round(attendanceHours * employee.productivityFactor + piRate * 48 + ((monthIndex * 3 + employeeIndex) % 17));
    const overtime15Hours = round(Math.max(0, employee.overtimeBias * 1.2 + ((employeeIndex + monthIndex) % 4) * 1.4 + (month.monthNumber % 6 === 0 ? 2 : 0)), 1);
    const overtime20Hours = round((employee.overtimeBias % 3) * 0.9 + ((employeeIndex * 2 + monthIndex) % 3) * 1.2, 1);
    const overtime30Hours = round(((employeeIndex * 3 + monthIndex + employee.overtimeBias) % 13 === 0) ? 4 + employee.overtimeBias * 0.8 : 0, 1);
    const annualLeaveHours = round(((monthIndex + employeeIndex + employee.leaveBias) % (7 + employee.leaveBias) === 0) ? 8 : 0, 1);
    const sickLeaveHours = round(((monthIndex * 2 + employeeIndex + employee.riskBias) % (15 - Math.min(employee.riskBias, 3)) === 0) ? 4 : 0, 1);
    const leaveHours = annualLeaveHours + sickLeaveHours;
    const overtimeTotalHours = overtime15Hours + overtime20Hours + overtime30Hours;
    const compositeHours = round(overtimeTotalHours - leaveHours, 1);
    const mttrMinutes = round(employee.mttrBase + ((employeeIndex * 3 + monthIndex * 7) % 24) + Math.max(season, 0) * (5 + employee.riskBias), 1);
    const nearMissCount = (employeeIndex + monthIndex + employee.riskBias) % (employee.riskBias >= 3 ? 7 : 13) === 0 ? 1 : 0;
    const pdcaCount = (employeeIndex + monthIndex + employee.improvementBias) % (employee.improvementBias >= 2 ? 8 : 15) === 0 ? 1 : 0;
    const kaizenModulo = Math.max(4, 8 - employee.improvementBias);
    const kaizenCount = (employeeIndex * 2 + monthIndex) % kaizenModulo === 0 ? 1 : 0;
    const pdcaBenefit = pdcaCount ? 9000 + employee.improvementBias * 2500 + ((employeeIndex + monthIndex) % 7) * 900 : 0;
    const kaizenBenefit = kaizenCount ? 1200 + employee.improvementBias * 650 + monthIndex * 40 : 0;
    const record = {
      id: `${employee.employeeKey}::${month.label}`,
      sourceId: `MOCK-${employeeIndex + 1}-${month.index}`,
      ...employee,
      month: month.label,
      year: month.year,
      monthNumber: month.monthNumber,
      attendanceHours,
      orderCount,
      repairHours,
      repairEfficiency: round(piHours / attendanceHours, 4),
      orderEfficiency: round(orderCount / attendanceHours, 3),
      overtime15Hours,
      overtime20Hours,
      overtime30Hours,
      overtimeTotalHours,
      holidayOvertimeHours: overtime30Hours,
      leaveHours,
      annualLeaveHours,
      sickLeaveHours,
      compositeHours,
      pm01Hours,
      pm03Hours,
      transferHours,
      piHours: round(piHours, 1),
      repairTimeHours: round(repairHours * 0.95, 1),
      mttrMinutes,
      faultResponseMinutes: round(8 + employee.responseBias + ((employeeIndex + monthIndex) % 8) * 1.1, 1),
      nearMissCount,
      nearMissBenefit: 0,
      pdcaCount,
      pdcaBenefit,
      pdcaAwardCount: pdcaCount && employeeIndex % 4 === 0 ? 1 : 0,
      kaizenCount,
      kaizenBenefit,
      kaizenAwardCount: kaizenCount && employeeIndex % 5 === 0 ? 1 : 0,
      validationStatus: "valid",
      anomalyReason: "",
      excludedFromPi: false,
      provenance: {
        importBatchId: "MOCK-BATCH-001",
        sourceFile: "mock-static-demo",
        sourceSheet: "模拟生成",
        sourceRow: employeeIndex * months.length + monthIndex + 2,
        sourceField: "",
        rawValue: null,
        parsedValue: null,
      },
    };
    rawRecords.push(record);

    if (pdcaCount || kaizenCount || nearMissCount) {
      improvementRecords.push({
        id: `IMP-${employeeIndex + 1}-${month.index}`,
        projectId: `IMP-${employeeIndex + 1}-${month.index}`,
        projectTitle: `${pdcaCount ? "PDCA" : kaizenCount ? "改善提案" : "安全隐患"}模拟项目 ${employeeIndex + 1}`,
        projectType: pdcaCount ? "PDCA" : kaizenCount ? "Kaizen" : "Near miss",
        improvementType: pdcaCount ? "pdca" : kaizenCount ? "kaizen" : "nearMiss",
        employeeNo: employee.employeeNo,
        employeeName: employee.employeeName,
        employeeKey: employee.employeeKey,
        businessArea: employee.businessArea,
        plant: employee.plant,
        department: employee.department,
        sourceDepartment: employee.department,
        workshop: employee.workshop,
        shift: employee.shift,
        createdDate: `${month.year}-${String(month.monthNumber).padStart(2, "0")}-15`,
        month: month.label,
        year: month.year,
        quantity: 1,
        benefitAmount: pdcaBenefit + kaizenBenefit,
        pdcaAwardCount: pdcaCount && employeeIndex % 4 === 0 ? 1 : 0,
        kaizenAwardCount: kaizenCount && employeeIndex % 5 === 0 ? 1 : 0,
        approvalStep: "9",
      });
    }
  });
});

function aggregateEmployee(employee, rank) {
  const rows = rawRecords.filter((row) => row.employeeKey === employee.employeeKey);
  const attendanceHours = sum(rows, "attendanceHours");
  const repairHours = sum(rows, "repairHours");
  const pm01Hours = sum(rows, "pm01Hours");
  const pm03Hours = sum(rows, "pm03Hours");
  const transferHours = sum(rows, "transferHours");
  const orderCount = sum(rows, "orderCount");
  const overtimeTotalHours = sum(rows, "overtimeTotalHours");
  const compositeHours = sum(rows, "compositeHours");
  const piHours = pm01Hours + pm03Hours + transferHours;
  const annualCompositeHours = Math.max(0, compositeHours + 180 + (rank % 18) * 8);
  return {
    ...employee,
    month: "2026 Apr",
    year: "2026",
    selectedPeriod: "2024 Jan - 2026 Apr",
    attendanceHours: round(attendanceHours, 1),
    repairHours: round(repairHours, 1),
    pm01Hours: round(pm01Hours, 1),
    pm03Hours: round(pm03Hours, 1),
    transferHours: round(transferHours, 1),
    piHours: round(piHours, 1),
    orderCount,
    repairEfficiency: round(piHours / attendanceHours, 4),
    orderEfficiency: round(orderCount / attendanceHours, 3),
    overtime15Hours: round(sum(rows, "overtime15Hours"), 1),
    overtime20Hours: round(sum(rows, "overtime20Hours"), 1),
    overtime30Hours: round(sum(rows, "overtime30Hours"), 1),
    overtimeTotalHours: round(overtimeTotalHours, 1),
    annualLeaveHours: round(sum(rows, "annualLeaveHours"), 1),
    sickLeaveHours: round(sum(rows, "sickLeaveHours"), 1),
    leaveHours: round(sum(rows, "leaveHours"), 1),
    compositeHours: round(compositeHours, 1),
    annualCompositeHours: round(annualCompositeHours, 1),
    compositeRisk: annualCompositeHours > 432 ? "over" : annualCompositeHours > 360 ? "warning" : "ok",
    mttrMinutes: average(rows, "mttrMinutes"),
    faultResponseMinutes: average(rows, "faultResponseMinutes"),
    nearMissCount: sum(rows, "nearMissCount"),
    nearMissBenefit: 0,
    pdcaCount: sum(rows, "pdcaCount"),
    pdcaBenefit: sum(rows, "pdcaBenefit"),
    pdcaAwardCount: sum(rows, "pdcaAwardCount"),
    kaizenCount: sum(rows, "kaizenCount"),
    kaizenBenefit: sum(rows, "kaizenBenefit"),
    kaizenAwardCount: sum(rows, "kaizenAwardCount"),
    performanceScore: round(78 + (piHours / attendanceHours - 0.75) * 180 + Math.min(6, sum(rows, "pdcaCount") + sum(rows, "kaizenCount")) * 0.5, 1),
    rank,
    repairHoursShare: round((repairHours / sum(rawRecords, "repairHours")) * 100, 1),
    monthCount: rows.length,
  };
}

const employees = employeesBase
  .map((employee, index) => aggregateEmployee(employee, index + 1))
  .sort((left, right) => right.repairEfficiency - left.repairEfficiency)
  .map((employee, index) => ({ ...employee, rank: index + 1 }));

function aggregateMonth(month) {
  const rows = rawRecords.filter((row) => row.month === month.label);
  const attendanceHours = sum(rows, "attendanceHours");
  const pm01Hours = sum(rows, "pm01Hours");
  const pm03Hours = sum(rows, "pm03Hours");
  const transferHours = sum(rows, "transferHours");
  const piHours = pm01Hours + pm03Hours + transferHours;
  return {
    month: month.label,
    year: month.year,
    attendanceHours: round(attendanceHours, 1),
    orderCount: sum(rows, "orderCount"),
    repairHours: round(sum(rows, "repairHours"), 1),
    repairEfficiency: round(piHours / attendanceHours, 4),
    allRecordRepairEfficiency: round(piHours / attendanceHours, 4),
    averageBasisAttendanceHours: round(attendanceHours, 1),
    averageBasisPiHours: round(piHours, 1),
    averageBasisRepairEfficiency: round(piHours / attendanceHours, 4),
    averageExcludedEmployeeCount: 0,
    overtime15Hours: round(sum(rows, "overtime15Hours"), 1),
    overtime20Hours: round(sum(rows, "overtime20Hours"), 1),
    overtime30Hours: round(sum(rows, "overtime30Hours"), 1),
    overtimeTotalHours: round(sum(rows, "overtimeTotalHours"), 1),
    leaveHours: round(sum(rows, "leaveHours"), 1),
    annualLeaveHours: round(sum(rows, "annualLeaveHours"), 1),
    sickLeaveHours: round(sum(rows, "sickLeaveHours"), 1),
    compositeHours: round(sum(rows, "compositeHours"), 1),
    pm01Hours: round(pm01Hours, 1),
    pm03Hours: round(pm03Hours, 1),
    transferHours: round(transferHours, 1),
    mttrMinutes: average(rows, "mttrMinutes"),
    faultResponseMinutes: average(rows, "faultResponseMinutes"),
    nearMissCount: sum(rows, "nearMissCount"),
    nearMissBenefit: 0,
    pdcaCount: sum(rows, "pdcaCount"),
    pdcaBenefit: sum(rows, "pdcaBenefit"),
    pdcaAwardCount: sum(rows, "pdcaAwardCount"),
    kaizenCount: sum(rows, "kaizenCount"),
    kaizenBenefit: sum(rows, "kaizenBenefit"),
    kaizenAwardCount: sum(rows, "kaizenAwardCount"),
  };
}

const trend = months.map(aggregateMonth);
const summary = {
  source: "mock",
  employeeCount: employees.length,
  departmentCount: uniqueCount(employees, "department"),
  businessAreaCount: uniqueCount(employees, "businessArea"),
  plantCount: uniqueCount(employees, "plant"),
  workshopCount: uniqueCount(employees, "workshop"),
  shiftCount: uniqueCount(employees, "shift"),
  totalAttendanceHours: round(sum(rawRecords, "attendanceHours"), 1),
  totalRepairHours: round(sum(rawRecords, "repairHours"), 1),
  totalOrderCount: sum(rawRecords, "orderCount"),
  avgRepairEfficiency: round((sum(rawRecords, "pm01Hours") + sum(rawRecords, "pm03Hours") + sum(rawRecords, "transferHours")) / sum(rawRecords, "attendanceHours"), 4),
  totalOvertimeHours: round(sum(rawRecords, "overtimeTotalHours"), 1),
  totalCompositeHours: round(sum(rawRecords, "compositeHours"), 1),
  compositeWarningCount: employees.filter((employee) => employee.compositeRisk !== "ok").length,
  certificateGapCount: countRealCertificateGaps(realCertificateData) ?? countCertificateGaps(employees.length),
  mttrMinutes: average(rawRecords, "mttrMinutes"),
  faultResponseMinutes: average(rawRecords, "faultResponseMinutes"),
  nearMissCount: sum(rawRecords, "nearMissCount"),
  nearMissBenefit: 0,
  pdcaCount: sum(rawRecords, "pdcaCount"),
  pdcaBenefit: sum(rawRecords, "pdcaBenefit"),
  pdcaAwardCount: sum(rawRecords, "pdcaAwardCount"),
  kaizenCount: sum(rawRecords, "kaizenCount"),
  kaizenBenefit: sum(rawRecords, "kaizenBenefit"),
  kaizenAwardCount: sum(rawRecords, "kaizenAwardCount"),
};

const filterOptions = {
  years: ["2024", "2025", "2026"],
  months: months.map((month) => month.label),
  businessAreas: uniqueValues(employees, "businessArea"),
  departments: uniqueValues(employees, "department"),
  workshops: uniqueValues(employees, "workshop"),
  shifts: uniqueValues(employees, "shift"),
  employees: employees.map((employee) => ({
    employeeKey: employee.employeeKey,
    employeeName: employee.employeeName,
    employeeNo: employee.employeeNo,
    department: employee.department,
  })),
};

function buildMockCompetenceEmployees() {
  return employees.map((employee, employeeIndex) => ({
    ...employee,
    certificates: certificateTypes.map((type, certIndex) => {
      const certificate = certificateStatus(employeeIndex, certIndex);
      return {
        code: type.code,
        name: type.name,
        hasCertificate: certificate.hasCertificate,
        status: certificate.status,
        stateLabel: certificate.stateLabel,
        expireDate: certificate.hasCertificate ? `202${6 + (certIndex % 2)}-0${(certIndex % 9) + 1}-28` : "",
        detail: certificate.hasCertificate ? "模拟证书记录" : "",
      };
    }),
  }));
}

function buildRealCompetenceEmployees(certificateData) {
  if (!Array.isArray(certificateData?.employees) || !certificateData.employees.length) {
    return null;
  }
  return certificateData.employees.map((realEmployee, index) => {
    const department = realEmployee.department || departments[index % departments.length];
    const employeeNo = `CAP-${String(index + 1).padStart(3, "0")}`;
    return {
      employeeKey: `CAPABILITY::${department}::${String(index + 1).padStart(3, "0")}`,
      employeeNo,
      employeeName: makeChineseName(index),
      department,
      businessArea: "能力台账",
      plant: "匿名工厂",
      workshop: `${department}能力班组`,
      shift: department,
      positionTitle: "设备维修技师",
      jobTitle: "设备维修技师",
      role: "设备维修",
      orgUnit: realEmployee.orgUnit || "",
      listNumber: realEmployee.listNumber || "",
      certificates: certificateTypes.map((type) => {
        const hasCertificate = Boolean(realEmployee.certificates?.[type.code]);
        const expireDate = hasCertificate ? realEmployee.expireDates?.[type.code] || "" : "";
        const status = certificateStatusFromExpiry(hasCertificate, expireDate);
        return {
          code: type.code,
          name: type.name,
          hasCertificate,
          status,
          stateLabel: certificateStateLabel(status),
          expireDate,
          detail: hasCertificate ? realEmployee.certificateDetails?.[type.code] || "真实能力台账登记" : "",
        };
      }),
    };
  });
}

const competenceEmployees = buildRealCompetenceEmployees(realCertificateData) || buildMockCompetenceEmployees();

const repairTimeAnomalies = rawRecords
  .filter((row, index) => index % 47 === 0)
  .map((row, index) => ({
    id: `RTA-${index + 1}`,
    employeeKey: row.employeeKey,
    employeeName: row.employeeName,
    employeeNo: row.employeeNo,
    department: row.department,
    businessArea: row.businessArea,
    month: row.month,
    year: row.year,
    recordDate: `${row.year}-${String(row.monthNumber).padStart(2, "0")}-18`,
    repairTimeMinutes: 320 + index * 45,
    valueStream: "Demo Line",
    productionLine: "Demo Cell",
    equipmentName: `Demo Asset ${index + 1}`,
  }));

const authenticityAnomalies = rawRecords
  .filter((row, index) => index % 61 === 0)
  .map((row, index) => ({
    id: `ANOM-${index + 1}`,
    employeeKey: row.employeeKey,
    employeeName: row.employeeName,
    employeeNo: row.employeeNo,
    department: row.department,
    businessArea: row.businessArea,
    month: row.month,
    year: row.year,
    category: index % 2 === 0 ? "数据真实性" : "维修响应",
    type: index % 2 === 0 ? "zero_attendance_with_work" : "repair_time_over_threshold",
    severity: index % 3 === 0 ? "critical" : "major",
    reason: "模拟异常，用于演示审核流程",
    sourceFile: "mock-static-demo",
    sourceRow: index + 2,
  }));

const gapChecklist = {
  rows: [
    { category: "缺失", module: "员工与组织", item: "HR 正式员工主数据", need: "接入正式 HR 主数据", sourceStatus: "模拟占位", severity: "critical" },
    { category: "待确认", module: "工单结构", item: "PM01/PM03 拆分", need: "补充正式工单 PM 类型", sourceStatus: "模拟占位", severity: "major" },
    { category: "缺失", module: "安全", item: "Near miss 正式来源", need: "接入 HSE 台账", sourceStatus: "模拟占位", severity: "major" },
  ],
};

const sourceCoverage = {
  servingSource: "mock",
  ledgers: [
    { id: "mock-performance", name: "月度绩效模拟数据", source: "生成的模拟数据", status: "Review", note: "绩效数据为合成模拟记录" },
    { id: "anonymous-certificate", name: "能力证书匿名数据", source: realCertificateData ? "真实证书台账匿名化" : "生成的模拟数据", status: "Review", note: "姓名和工号已替换" },
    { id: "anonymous-safety", name: "安全记录匿名数据", source: realNearMissData ? "真实 near miss 台账匿名化" : "生成的模拟数据", status: "Review", note: "人员字段已替换" },
  ],
  totals: { ledgers: 3, records: rawRecords.length },
};

function monthLabelFromDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  if (!match) {
    return "";
  }
  return `${match[1]} ${monthNames[Number(match[2]) - 1]}`;
}

function buildMockSafetyRecords() {
  return employees
    .filter((employee) => employee.riskBias >= 3)
    .slice(0, 9)
    .map((employee, index) => {
      const incidentMonth = months[(6 + index * 3) % months.length];
      return {
        id: `SAFE-${index + 1}`,
        employeeKey: employee.employeeKey,
        key: employee.employeeKey,
        employeeName: employee.employeeName,
        employeeNo: employee.employeeNo,
        department: employee.department,
        month: incidentMonth.label,
        year: incidentMonth.year,
        incidentType: "模拟安全事件",
        projectTitle: "模拟安全事件记录",
        station: `${employee.department}维修区域`,
        incidentDate: `${incidentMonth.year}-${String(incidentMonth.monthNumber).padStart(2, "0")}-15`,
        isClosed: index % 3 === 0 ? "否" : "是",
      };
    });
}

function buildRealSafetyRecords(nearMissData) {
  if (!Array.isArray(nearMissData?.records) || !nearMissData.records.length) {
    return null;
  }
  return nearMissData.records
    .filter((record) => String(record.projectType || "").toLowerCase().includes("near") || record.improvementType === "near_miss")
    .filter((record) => record.projectTitle && (record.incidentDate || record.createdDate))
    .slice(0, 12)
    .map((record, index) => {
      const employee = employees[(index * 9 + 3) % employees.length];
      const incidentDate = record.incidentDate || record.createdDate;
      const month = monthLabelFromDate(incidentDate) || employee.month || "2026 Mar";
      const year = String(record.year || incidentDate).slice(0, 4);
      return {
        id: `SAFE-REAL-${String(index + 1).padStart(3, "0")}`,
        sourceId: record.id || record.projectId || "",
        employeeKey: employee.employeeKey,
        key: employee.employeeKey,
        employeeName: employee.employeeName,
        employeeNo: employee.employeeNo,
        department: record.department || employee.department,
        businessArea: record.businessArea || employee.businessArea,
        plant: record.plant || employee.plant,
        workshop: record.workshop || employee.workshop,
        shift: record.shift || employee.shift,
        month,
        year,
        incidentType: "Near Miss",
        projectTitle: record.projectTitle,
        lineArea: record.lineArea || "",
        station: record.station || "",
        sourceDepartment: record.sourceDepartment || "",
        incidentDate,
        closedDate: record.closedDate || "",
        approved: Boolean(record.approved),
        approvalStep: record.approvalStep || "",
        isClosed: record.isClosed || (record.closedDate ? "是" : "否"),
      };
    });
}

function buildSafetyEmployees(records) {
  const grouped = new Map();
  records.forEach((record) => {
    const key = record.employeeKey;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        employeeKey: key,
        employeeName: record.employeeName,
        employeeNo: record.employeeNo,
        department: record.department,
        incidentCount: 0,
        incidentMonths: [],
      });
    }
    const employee = grouped.get(key);
    employee.incidentCount += 1;
    if (record.month && !employee.incidentMonths.includes(record.month)) {
      employee.incidentMonths.push(record.month);
    }
  });
  return [...grouped.values()];
}

const safetyRecords = buildRealSafetyRecords(realNearMissData) || buildMockSafetyRecords();
const safetyEmployees = buildSafetyEmployees(safetyRecords);

function employeeDetail(employee) {
  const rows = rawRecords.filter((row) => row.employeeKey === employee.employeeKey);
  const employeeImprovements = improvementRecords.filter((row) => row.employeeKey === employee.employeeKey);
  return {
    source: "mock",
    profile: employee,
    comparisons: {
      selectedMonth: "2026 Apr",
      department: employee.department,
      departmentEmployeeCount: employees.filter((row) => row.department === employee.department).length,
      overallEmployeeCount: employees.length,
      departmentAvgRepairEfficiency: round(average(employees.filter((row) => row.department === employee.department), "repairEfficiency"), 4),
      overallAvgRepairEfficiency: round(average(employees, "repairEfficiency"), 4),
      repairEfficiencyDelta: round(employee.repairEfficiency - 0.62, 4),
      orderCountDelta: Math.round(employee.orderCount / rows.length - 70),
      repairHoursDelta: round(employee.repairHours / rows.length - 60, 1),
    },
    monthlyTrends: rows,
    records: rows,
    improvementSummary: {
      nearMissCount: sum(rows, "nearMissCount"),
      nearMissBenefit: 0,
      pdcaCount: sum(rows, "pdcaCount"),
      pdcaBenefit: sum(rows, "pdcaBenefit"),
      pdcaAwardCount: sum(rows, "pdcaAwardCount"),
      kaizenCount: sum(rows, "kaizenCount"),
      kaizenBenefit: sum(rows, "kaizenBenefit"),
      kaizenAwardCount: sum(rows, "kaizenAwardCount"),
    },
    improvementTrend: rows.filter((row) => row.nearMissCount || row.pdcaCount || row.kaizenCount),
    improvementRecords: employeeImprovements,
    provenance: rows.map((row) => ({ id: row.id, month: row.month, employeeKey: row.employeeKey, employeeName: row.employeeName, validationStatus: "valid", provenance: row.provenance })),
    dataQuality: { source: "mock", totalRecords: rows.length, validRecords: rows.length, quarantinedRecords: 0, criticalCount: 0 },
  };
}

const employeeDetails = Object.fromEntries(employees.map((employee) => [employee.employeeKey, employeeDetail(employee)]));

const snapshot = {
  generatedAt: new Date("2026-06-24T00:00:00.000Z").toISOString(),
  note: "Anonymized demo snapshot. Performance metrics use synthetic data; capability and safety ledgers may use real source structure with names and employee numbers replaced.",
  boss: {
    summary,
    trend,
    topEmployees: employees.slice(0, 5),
    attentionEmployees: employees.slice(-4).reverse(),
    filterOptions,
  },
  admin: {
    summary,
    employees,
    rawRecords,
    quarantinedRecords: authenticityAnomalies,
    filterOptions,
  },
  competence: {
    certificateTypes,
    employees: competenceEmployees,
  },
  repairTimeAnomalies: {
    source: { type: "mock" },
    summary: { totalRecords: repairTimeAnomalies.length },
    records: repairTimeAnomalies,
  },
  safetyIncidents: {
    source: { type: "mock" },
    summary: { incidentEmployeeCount: safetyEmployees.length, incidentCount: safetyRecords.length },
    employees: safetyEmployees,
    records: safetyRecords,
  },
  dataAuthenticity: {
    summary: {
      source: "mock",
      totalRecords: rawRecords.length,
      validRecords: rawRecords.length,
      quarantinedRecords: authenticityAnomalies.length,
      criticalCount: authenticityAnomalies.filter((row) => row.severity === "critical").length,
      totalAnomalies: authenticityAnomalies.length,
      totalCriticalCount: authenticityAnomalies.filter((row) => row.severity === "critical").length,
      filteredQuarantinedRecords: authenticityAnomalies.length,
      batchStatus: "publishable",
      policy: "Public demo snapshot uses anonymized personnel fields.",
    },
    anomalies: authenticityAnomalies,
    importBatches: [{ id: "MOCK-BATCH-001", status: "publishable", recordCount: rawRecords.length, validRecordCount: rawRecords.length, quarantinedRecordCount: authenticityAnomalies.length }],
    sourceCoverage,
    gapChecklist,
  },
  employeeDetails,
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `window.__BOSCH_STATIC_DEMO__ = ${JSON.stringify(snapshot, null, 2)};\n`);
console.log(`Wrote ${outFile}`);
