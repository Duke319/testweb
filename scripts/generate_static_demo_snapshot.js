const fs = require("node:fs/promises");
const path = require("node:path");

process.env.DB_TYPE = "json";
process.env.WORKER_DATA_SOURCE = "json";

const performanceService = require("../backend/services/performanceService");

async function main() {
  const filters = {};
  const [boss, admin, competence, repairTimeAnomalies, dataAuthenticity] = await Promise.all([
    performanceService.getBossSummary(filters),
    performanceService.getAdminEmployees(filters),
    performanceService.getCompetenceMatrix({}),
    performanceService.getRepairTimeAnomalies(filters),
    performanceService.getDataAuthenticity(filters),
  ]);

  const employeeDetails = {};
  for (const employee of admin.employees || []) {
    if (!employee.employeeKey) {
      continue;
    }
    employeeDetails[employee.employeeKey] = await performanceService.getEmployeeDetail(employee.employeeKey, filters);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    note: "Static offline demo snapshot. Filters reuse the bundled all-data snapshot.",
    boss,
    admin,
    competence,
    repairTimeAnomalies,
    dataAuthenticity,
    employeeDetails,
  };

  const outputDir = path.resolve(__dirname, "..", "frontend", "public", "demo");
  await fs.mkdir(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, "static-demo-snapshot.js");
  await fs.writeFile(outputFile, `window.__BOSCH_STATIC_DEMO__ = ${JSON.stringify(payload)};\n`, "utf8");

  const sizeMb = Buffer.byteLength(JSON.stringify(payload), "utf8") / 1024 / 1024;
  console.log(`Wrote ${outputFile} (${sizeMb.toFixed(1)} MB JSON payload)`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
