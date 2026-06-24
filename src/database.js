let mssqlPool = null;
let mssqlLoadError = null;

function getDbType() {
  const value = String(process.env.DB_TYPE || process.env.WORKER_DATA_SOURCE || "").toLowerCase();
  if (["mssql", "sqlserver", "sql_server", "microsoftsql", "microsoft_sql", "microsoft-sql-server", "microsoftqpl"].includes(value)) {
    return "mssql";
  }
  if (value === "json") {
    return "json";
  }
  return hasDatabaseConfig() ? "mssql" : "json";
}

function hasDatabaseConfig() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
}

function shouldUseDatabase() {
  return getDbType() !== "json" && hasDatabaseConfig();
}

function shouldUseMssql() {
  return getDbType() === "mssql" && hasDatabaseConfig();
}

async function getMssqlPool() {
  if (!shouldUseMssql()) {
    return null;
  }
  if (mssqlPool) {
    return mssqlPool;
  }
  let sql;
  try {
    sql = require("mssql");
  } catch (error) {
    mssqlLoadError = error;
    return null;
  }
  mssqlPool = await sql.connect({
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    pool: {
      max: Number(process.env.DB_CONNECTION_LIMIT || 10),
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
  });
  return mssqlPool;
}

function getDatabaseLoadError() {
  return mssqlLoadError;
}

function getMssqlLoadError() {
  return mssqlLoadError;
}

module.exports = {
  getDatabaseLoadError,
  getDbType,
  getMssqlLoadError,
  getMssqlPool,
  hasDatabaseConfig,
  shouldUseDatabase,
  shouldUseMssql,
};
