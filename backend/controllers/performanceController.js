const performanceService = require("../services/performanceService");
const { applyUserScopeToFilters } = require("../services/userScopeService");

function getFilters(request) {
  const filters = {
    year: request.query.year || "",
    month: request.query.month || "",
    monthFrom: request.query.monthFrom || "",
    monthTo: request.query.monthTo || "",
    businessArea: request.query.businessArea || "",
    plant: request.query.plant || "",
    department: request.query.department || "",
    workshop: request.query.workshop || "",
    shift: request.query.shift || "",
    employeeKey: request.query.employeeKey || "",
  };
  return applyUserScopeToFilters(filters, request.user);
}

async function getBossSummary(request, response, next) {
  try {
    response.json(await performanceService.getBossSummary(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getTrends(request, response, next) {
  try {
    response.json(await performanceService.getTrends(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getAdminEmployees(request, response, next) {
  try {
    response.json(await performanceService.getAdminEmployees(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getCompetenceMatrix(request, response, next) {
  try {
    response.json(await performanceService.getCompetenceMatrix(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getRepairTimeAnomalies(request, response, next) {
  try {
    response.json(await performanceService.getRepairTimeAnomalies(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getSafetyIncidents(request, response, next) {
  try {
    response.json(await performanceService.getSafetyIncidents(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getDataAuthenticity(request, response, next) {
  try {
    response.json(await performanceService.getDataAuthenticity(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getDataSourceCoverage(request, response, next) {
  try {
    response.json(await performanceService.getDataSourceCoverage(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getDataGapChecklist(request, response, next) {
  try {
    response.json(await performanceService.getDataGapChecklist(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getImportBatches(request, response, next) {
  try {
    response.json(await performanceService.getImportBatches(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getRecordProvenance(request, response, next) {
  try {
    response.json(await performanceService.getRecordProvenance(decodeURIComponent(request.params.recordId), getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getEmployeeDetail(request, response, next) {
  try {
    response.json(await performanceService.getEmployeeDetail(decodeURIComponent(request.params.employeeKey), getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getLegacyMonthly(request, response, next) {
  try {
    response.json(await performanceService.getLegacyMonthly(getFilters(request)));
  } catch (error) {
    next(error);
  }
}

async function getLegacyMonthlyDetail(request, response, next) {
  try {
    const employeeKey = decodeURIComponent(request.params.employeeKey);
    const detail = await performanceService.getEmployeeDetail(employeeKey, getFilters(request));
    response.json(detail);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminEmployees,
  getBossSummary,
  getCompetenceMatrix,
  getDataAuthenticity,
  getDataGapChecklist,
  getDataSourceCoverage,
  getEmployeeDetail,
  getImportBatches,
  getLegacyMonthly,
  getLegacyMonthlyDetail,
  getRecordProvenance,
  getRepairTimeAnomalies,
  getSafetyIncidents,
  getTrends,
};
