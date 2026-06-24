const express = require("express");
const performanceController = require("../controllers/performanceController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/boss-summary", performanceController.getBossSummary);
router.get("/trends", performanceController.getTrends);
router.get("/admin/employees", performanceController.getAdminEmployees);
router.get("/competence-matrix", performanceController.getCompetenceMatrix);
router.get("/data-authenticity", performanceController.getDataAuthenticity);
router.get("/data-gaps", performanceController.getDataGapChecklist);
router.get("/data-source-coverage", performanceController.getDataSourceCoverage);
router.get("/import-batches", performanceController.getImportBatches);
router.get("/repair-time-anomalies", performanceController.getRepairTimeAnomalies);
router.get("/safety-incidents", performanceController.getSafetyIncidents);
router.get("/records/:recordId/provenance", performanceController.getRecordProvenance);
router.get("/employees/:employeeKey", performanceController.getEmployeeDetail);

module.exports = router;
