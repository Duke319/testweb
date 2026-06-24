const express = require("express");
const authRoutes = require("./authRoutes");
const performanceRoutes = require("./performanceRoutes");
const auditRoutes = require("./auditRoutes");
const importRoutes = require("./importRoutes");
const performanceController = require("../controllers/performanceController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/health", (request, response) => {
  response.json({
    ok: true,
    service: "bosch-performance-platform",
    time: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/performance", performanceRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/import", importRoutes);

// Compatibility endpoint for the existing prototype URL.
router.get("/worker-performance/monthly", requireAuth, performanceController.getLegacyMonthly);
router.get("/worker-performance/monthly/:employeeKey", requireAuth, performanceController.getLegacyMonthlyDetail);

module.exports = router;
