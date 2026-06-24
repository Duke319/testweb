const { getAuditLogs } = require("../services/performanceService");

async function listAuditLogs(request, response, next) {
  try {
    response.json(await getAuditLogs());
  } catch (error) {
    next(error);
  }
}

module.exports = { listAuditLogs };
