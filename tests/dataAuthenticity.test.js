const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { auditPerformanceRecords, buildDataAuthenticityAudit } = require("../backend/services/dataAuthenticityService");
const performanceService = require("../backend/services/performanceService");
const { isPiExcludedEmployee, piExclusionReasonFor } = require("../backend/services/piExclusionRules");
const { applyUserScopeToFilters } = require("../backend/services/userScopeService");

function testPiExclusionRules() {
  assert.equal(isPiExcludedEmployee({ employeeNo: "88153019", employeeName: "刘斌" }), true);
  assert.equal(isPiExcludedEmployee({ employeeName: "邱国亮" }), true);
  assert.equal(isPiExcludedEmployee({ employeeNo: "88163080", employeeName: "蒋卫强" }), false);
  assert.equal(isPiExcludedEmployee({ employeeNo: "88160181", employeeName: "何彪" }), false);
  assert.equal(isPiExcludedEmployee({ employeeNo: "85651398", employeeName: "周永顶" }), false);
  assert.equal(piExclusionReasonFor({ employeeName: "刘涛" }), "不计入计算");
}

function testAnomalyQuarantine() {
  const records = [
    {
      id: "ok-1",
      employeeKey: "A::张三",
      employeeName: "张三",
      month: "2026 Jan",
      attendanceHours: 160,
      orderCount: 10,
      repairHours: 20,
      pm01Hours: 18,
      pm03Hours: 2,
      transferHours: 0,
    },
    {
      id: "bad-1",
      employeeKey: "B::李四",
      employeeName: "李四",
      month: "2026 Jan",
      attendanceHours: 0,
      orderCount: 1,
      repairHours: 2,
      pm01Hours: 2,
      pm03Hours: 0,
      transferHours: 0,
    },
    {
      id: "bad-2",
      employeeKey: "C::王五",
      employeeName: "王五",
      month: "2026 Jan",
      attendanceHours: 100,
      repairHours: 120,
      pm01Hours: 120,
      pm03Hours: 0,
      transferHours: 0,
    },
  ];

  const audit = auditPerformanceRecords(records);
  assert.equal(audit.validRecords.length, 1);
  assert.deepEqual(audit.validRecords.map((record) => record.id), ["ok-1"]);
  assert.equal(audit.anomalies.some((anomaly) => anomaly.type === "zero_attendance_with_work"), true);
  assert.equal(audit.anomalies.some((anomaly) => anomaly.type === "repair_hours_exceed_attendance"), true);
  assert.equal(audit.anomalies.every((anomaly) => anomaly.excludedFromPi), true);
}

async function testAuditSummaryUsesPerformanceDenominator() {
  const records = [
    {
      id: "ok-1",
      employeeKey: "A::张三",
      employeeName: "张三",
      month: "2026 Jan",
      attendanceHours: 160,
      repairHours: 20,
      pm01Hours: 20,
    },
  ];

  const audit = await buildDataAuthenticityAudit({ source: "unit", records });
  assert.equal(audit.summary.totalRecords, 1);
  assert.equal(audit.summary.validRecords, 1);
  assert.equal(audit.summary.quarantinedRecords, 0);
  assert.equal(audit.importBatches[0].quarantinedRecordCount, 0);
  assert.equal(audit.summary.totalAnomalies, audit.anomalies.length);
  assert.equal(audit.importBatches[0].totalAnomalyCount, audit.anomalies.length);
}

async function testTrendsGroupByShift() {
  process.env.DB_TYPE = "json";
  process.env.WORKER_DATA_SOURCE = "json";
  const trends = await performanceService.getTrends({ year: "2025" });
  const shiftNames = new Set(trends.byShift.map((row) => row.shift));
  assert.equal(shiftNames.has("TEF31"), false);
  assert.equal([...shiftNames].some((shift) => /班|A|B|C|D|维护/.test(shift)), true);
}

async function testRecordExclusionsArePreserved() {
  process.env.DB_TYPE = "json";
  process.env.WORKER_DATA_SOURCE = "json";
  const summary = await performanceService.getBossSummary({});
  assert.equal(summary.dataQuality.byType.some((row) => row.key === "repair_hours_quality" && row.count > 0), true);
}

function assertOnlyDepartment(rows, department, label) {
  for (const row of rows || []) {
    const departments = [row.department, row.sourceDepartment, row.performanceDepartment].filter(Boolean);
    assert.equal(departments.length > 0, true, `${label} returned unscoped row ${row.id || row.employeeKey || row.employeeName || ""}`);
    assert.equal(departments.includes(department), true, `${label} returned non-${department} row ${row.id || row.employeeKey || row.employeeName || ""}`);
  }
}

async function testEditorDepartmentScopeAcrossPerformanceEndpoints() {
  process.env.DB_TYPE = "json";
  process.env.WORKER_DATA_SOURCE = "json";

  const users = [
    { username: "editor01", role: "editor", departmentScope: "TEF31" },
    { username: "editor02", role: "editor", departmentScope: "TEF32" },
    { username: "editor03", role: "editor", departmentScope: "TEF33" },
  ];

  for (const user of users) {
    const department = user.departmentScope;
    const filters = applyUserScopeToFilters({}, user);
    const [boss, admin, competence, repairTime, authenticity] = await Promise.all([
      performanceService.getBossSummary(filters),
      performanceService.getAdminEmployees(filters),
      performanceService.getCompetenceMatrix(filters),
      performanceService.getRepairTimeAnomalies(filters),
      performanceService.getDataAuthenticity(filters),
    ]);

    assertOnlyDepartment(boss.topEmployees, department, `${user.username} boss topEmployees`);
    assertOnlyDepartment(boss.attentionEmployees, department, `${user.username} boss attentionEmployees`);
    assertOnlyDepartment(admin.employees, department, `${user.username} admin employees`);
    assertOnlyDepartment(admin.rawRecords, department, `${user.username} admin rawRecords`);
    assertOnlyDepartment(admin.quarantinedRecords, department, `${user.username} quarantinedRecords`);
    assertOnlyDepartment(competence.employees, department, `${user.username} competence employees`);
    assertOnlyDepartment(repairTime.records, department, `${user.username} repairTime records`);
    assertOnlyDepartment(authenticity.anomalies, department, `${user.username} authenticity anomalies`);

    assert.deepEqual(admin.filterOptions.departments, [department]);
    assert.equal((authenticity.summary.totalRecords || 0) <= 4477, true);

    const ownEmployee = admin.employees[0];
    assert.ok(ownEmployee?.employeeKey, `${user.username} should have scoped employees`);
    const detail = await performanceService.getEmployeeDetail(ownEmployee.employeeKey, filters);
    assert.equal(detail.profile?.department, department);
    assertOnlyDepartment(detail.records, department, `${user.username} employee detail records`);

    const foreignDepartment = users.find((item) => item.departmentScope !== department).departmentScope;
    const foreignAdmin = await performanceService.getAdminEmployees({ department: foreignDepartment });
    const foreignEmployee = foreignAdmin.employees[0];
    const foreignDetail = await performanceService.getEmployeeDetail(foreignEmployee.employeeKey, filters);
    assert.equal(foreignDetail.profile, null);

    const foreignRecord = foreignAdmin.rawRecords[0];
    const foreignProvenance = await performanceService.getRecordProvenance(foreignRecord.id, filters);
    assert.equal(foreignProvenance.record, null);
    assert.deepEqual(foreignProvenance.anomalies, []);

    const ownRecord = admin.rawRecords[0];
    const ownProvenance = await performanceService.getRecordProvenance(ownRecord.id, filters);
    assert.equal(ownProvenance.record?.department, department);
  }
}

function testMigrationVersionsAreUnique() {
  const migrationScript = fs.readFileSync(path.join(__dirname, "..", "scripts", "run_migrations.js"), "utf8");
  const versions = [...migrationScript.matchAll(/version:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(versions).size, versions.length);
}

testPiExclusionRules();
testAnomalyQuarantine();
testMigrationVersionsAreUnique();

(async () => {
  await testAuditSummaryUsesPerformanceDenominator();
  await testTrendsGroupByShift();
  await testRecordExclusionsArePreserved();
  await testEditorDepartmentScopeAcrossPerformanceEndpoints();
  console.log("data authenticity tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
