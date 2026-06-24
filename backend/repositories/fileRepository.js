const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");
const dbFile = path.join(rootDir, "data", "db.json");
const monthlyFile = path.join(rootDir, "data", "worker-performance-monthly.json");
const employeeCertificatesFile = path.join(rootDir, "data", "employee-certificates.json");
const repairTimeAnomaliesFile = path.join(rootDir, "data", "repair-time-anomalies.json");
const pdcaImprovementsFile = path.join(rootDir, "data", "pdca-improvements.json");
const nearMissRecordsFile = path.join(rootDir, "data", "near-miss-records.json");
const mockImprovementSupplementsFile = path.join(rootDir, "data", "mock-near-miss-awards.json");

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

async function readAppDb() {
  return readJson(dbFile, {
    users: [],
    auditLogs: [],
  });
}

async function readMonthlyWorkerData() {
  return readJson(monthlyFile, {
    monthOrder: [],
    records: [],
    filterOptions: {
      years: [],
      months: [],
      shifts: [],
      employees: [],
    },
  });
}

async function readEmployeeCertificateData() {
  return readJson(employeeCertificatesFile, {
    source: {},
    certificateTypes: [],
    employees: [],
  });
}

async function readRepairTimeAnomalies() {
  return readJson(repairTimeAnomaliesFile, {
    source: {},
    summary: {
      workbookCount: 0,
      rowsScanned: 0,
      anomalyCount: 0,
      anomalyRate: 0,
      yearly: [],
      monthly: [],
    },
    records: [],
  });
}

async function readPdcaImprovements() {
  return readJson(pdcaImprovementsFile, {
    source: {},
    summary: {
      rowCount: 0,
      approvedRowCount: 0,
      pdcaCount: 0,
      kaizenCount: 0,
      matchedEmployeeCount: 0,
    },
    records: [],
  });
}

async function readNearMissRecords() {
  return readJson(nearMissRecordsFile, {
    source: {},
    summary: {
      rowCount: 0,
      nearMissCount: 0,
      matchedEmployeeCount: 0,
    },
    records: [],
  });
}

async function readMockImprovementSupplements() {
  return readJson(mockImprovementSupplementsFile, {
    source: {},
    records: [],
  });
}

module.exports = {
  readAppDb,
  readEmployeeCertificateData,
  readMockImprovementSupplements,
  readNearMissRecords,
  readMonthlyWorkerData,
  readPdcaImprovements,
  readRepairTimeAnomalies,
};
