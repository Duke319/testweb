const { createImportBatch } = require("../repositories/databaseRepository");
const { getDbType } = require("../../src/database");

async function createPerformanceImport(request, response, next) {
  try {
    const payload = request.body || {};
    const importBatchId = await createImportBatch({
      sourceName: payload.sourceName || "manual-performance-import",
      sourceType: payload.sourceType || "json",
      importedBy: payload.importedBy || "system",
      remark: payload.remark || "Created from API placeholder. File parsing is handled by dedicated import scripts.",
    });
    response.status(201).json({
      ok: true,
      importBatchId,
      mode: importBatchId ? getDbType() : "no-database-configured",
      message: importBatchId
        ? "导入批次已创建。"
        : "当前未配置数据库，接口已保留；请配置 DB_TYPE/DB_HOST/DB_USER/DB_NAME 后写入导入批次。",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createPerformanceImport };
