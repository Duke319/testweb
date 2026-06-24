const express = require("express");
const importController = require("../controllers/importController");

const router = express.Router();

router.post("/performance", importController.createPerformanceImport);

module.exports = router;
