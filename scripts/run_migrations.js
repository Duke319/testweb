const fs = require("node:fs/promises");
const path = require("node:path");

const { loadEnv } = require("../src/env");

const ROOT_DIR = path.resolve(__dirname, "..");
const SCHEMA_FILE = path.join(ROOT_DIR, "db", "schema.sqlserver.sql");
const MIGRATION_VERSION = "001_initial_performance_platform_sqlserver";
const POST_MIGRATIONS = [
  {
    version: "002_employee_profile_fields_sqlserver",
    statements: [
      `
        IF COL_LENGTH('dbo.employees', 'exclude_from_averages') IS NULL
        BEGIN
          ALTER TABLE dbo.employees
          ADD exclude_from_averages BIT NOT NULL
            CONSTRAINT df_employees_exclude_from_averages DEFAULT 0
        END
      `,
      `
        IF COL_LENGTH('dbo.employees', 'average_exclusion_reason') IS NULL
        BEGIN
          ALTER TABLE dbo.employees
          ADD average_exclusion_reason NVARCHAR(255) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.employees', 'pi_target_rate') IS NULL
        BEGIN
          ALTER TABLE dbo.employees
          ADD pi_target_rate DECIMAL(5,4) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.employees', 'pi_target_label') IS NULL
        BEGIN
          ALTER TABLE dbo.employees
          ADD pi_target_label NVARCHAR(100) NULL
        END
      `,
    ],
  },
  {
    version: "003_factory_improvement_source_fields_sqlserver",
    statements: [
      `
        IF COL_LENGTH('dbo.factory_improvements', 'source_project_id') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD source_project_id NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'source_project_title') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD source_project_title NVARCHAR(500) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'project_type') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD project_type NVARCHAR(50) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'source_department') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD source_department NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'line_area') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD line_area NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'station') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD station NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'operator_no') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD operator_no NVARCHAR(50) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'operator_name') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD operator_name NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'execute_operator_no') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD execute_operator_no NVARCHAR(50) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'execute_operator_name') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD execute_operator_name NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'approved') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements
          ADD approved BIT NOT NULL CONSTRAINT df_improvements_approved DEFAULT 1
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'approval_step') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD approval_step NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'source_file') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD source_file NVARCHAR(255) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.factory_improvements', 'source_row') IS NULL
        BEGIN
          ALTER TABLE dbo.factory_improvements ADD source_row INT NULL
        END
      `,
      `
        IF NOT EXISTS (
          SELECT 1 FROM sys.indexes
          WHERE name = N'uq_improvement_source_project'
            AND object_id = OBJECT_ID(N'dbo.factory_improvements')
        )
        BEGIN
          CREATE UNIQUE INDEX uq_improvement_source_project
          ON dbo.factory_improvements(source_project_id)
          WHERE source_project_id IS NOT NULL
        END
      `,
    ],
  },
  {
    version: "004_performance_monthly_record_quality_fields_sqlserver",
    statements: [
      `
        IF COL_LENGTH('dbo.performance_monthly', 'repair_hours_source_value') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD repair_hours_source_value DECIMAL(12,4) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'repair_hours_quality_threshold') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD repair_hours_quality_threshold DECIMAL(12,4) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'repair_hours_quality_percentile') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD repair_hours_quality_percentile DECIMAL(5,4) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'repair_hours_quality_reason') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD repair_hours_quality_reason NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'record_exclude_from_averages') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly
          ADD record_exclude_from_averages BIT NOT NULL
            CONSTRAINT df_performance_record_exclude_from_averages DEFAULT 0
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'record_average_exclusion_reason') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD record_average_exclusion_reason NVARCHAR(255) NULL
        END
      `,
    ],
  },
  {
    version: "005_data_authenticity_audit_fields_sqlserver",
    statements: [
      `
        IF COL_LENGTH('dbo.import_batches', 'status') IS NULL
        BEGIN
          ALTER TABLE dbo.import_batches
          ADD status NVARCHAR(30) NOT NULL CONSTRAINT df_import_batches_status DEFAULT N'created'
        END
      `,
      `
        IF COL_LENGTH('dbo.import_batches', 'record_count') IS NULL
        BEGIN
          ALTER TABLE dbo.import_batches
          ADD record_count INT NOT NULL CONSTRAINT df_import_batches_record_count DEFAULT 0
        END
      `,
      `
        IF COL_LENGTH('dbo.import_batches', 'valid_record_count') IS NULL
        BEGIN
          ALTER TABLE dbo.import_batches
          ADD valid_record_count INT NOT NULL CONSTRAINT df_import_batches_valid_record_count DEFAULT 0
        END
      `,
      `
        IF COL_LENGTH('dbo.import_batches', 'quarantined_record_count') IS NULL
        BEGIN
          ALTER TABLE dbo.import_batches
          ADD quarantined_record_count INT NOT NULL CONSTRAINT df_import_batches_quarantined_record_count DEFAULT 0
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'source_file') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD source_file NVARCHAR(500) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'source_sheet') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD source_sheet NVARCHAR(255) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'source_row') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD source_row INT NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'source_field') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD source_field NVARCHAR(100) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'raw_value') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD raw_value NVARCHAR(MAX) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'parsed_value') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD parsed_value NVARCHAR(MAX) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'validation_status') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly
          ADD validation_status NVARCHAR(30) NOT NULL CONSTRAINT df_performance_validation_status DEFAULT N'valid'
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'anomaly_reason') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly ADD anomaly_reason NVARCHAR(500) NULL
        END
      `,
      `
        IF COL_LENGTH('dbo.performance_monthly', 'excluded_from_pi') IS NULL
        BEGIN
          ALTER TABLE dbo.performance_monthly
          ADD excluded_from_pi BIT NOT NULL CONSTRAINT df_performance_excluded_from_pi DEFAULT 0
        END
      `,
      `
        IF OBJECT_ID(N'dbo.data_quality_anomalies', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.data_quality_anomalies (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            import_batch_id BIGINT NULL,
            source_record_id NVARCHAR(120) NULL,
            employee_id BIGINT NULL,
            year INT NULL,
            month TINYINT NULL,
            anomaly_type NVARCHAR(100) NOT NULL,
            severity NVARCHAR(30) NOT NULL CONSTRAINT df_anomalies_severity DEFAULT N'critical',
            status NVARCHAR(30) NOT NULL CONSTRAINT df_anomalies_status DEFAULT N'quarantined',
            reason NVARCHAR(500) NOT NULL,
            source_file NVARCHAR(500) NULL,
            source_sheet NVARCHAR(255) NULL,
            source_row INT NULL,
            source_field NVARCHAR(100) NULL,
            raw_value NVARCHAR(MAX) NULL,
            parsed_value NVARCHAR(MAX) NULL,
            excluded_from_pi BIT NOT NULL CONSTRAINT df_anomalies_excluded_from_pi DEFAULT 1,
            created_at DATETIME2 NOT NULL CONSTRAINT df_anomalies_created_at DEFAULT SYSUTCDATETIME(),
            reviewed_at DATETIME2 NULL,
            reviewed_by NVARCHAR(100) NULL,
            review_note NVARCHAR(MAX) NULL,
            CONSTRAINT ck_anomalies_severity CHECK (severity IN (N'critical', N'major', N'warning', N'info')),
            CONSTRAINT ck_anomalies_status CHECK (status IN (N'quarantined', N'confirmed', N'dismissed')),
            CONSTRAINT fk_anomalies_import_batch FOREIGN KEY (import_batch_id) REFERENCES dbo.import_batches(id),
            CONSTRAINT fk_anomalies_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id)
          )
        END
      `,
      `
        IF NOT EXISTS (
          SELECT 1 FROM sys.indexes
          WHERE name = N'idx_anomalies_status'
            AND object_id = OBJECT_ID(N'dbo.data_quality_anomalies')
        )
        BEGIN
          CREATE INDEX idx_anomalies_status ON dbo.data_quality_anomalies(status, severity)
        END
      `,
      `
        IF NOT EXISTS (
          SELECT 1 FROM sys.indexes
          WHERE name = N'idx_anomalies_employee_period'
            AND object_id = OBJECT_ID(N'dbo.data_quality_anomalies')
        )
        BEGIN
          CREATE INDEX idx_anomalies_employee_period ON dbo.data_quality_anomalies(employee_id, year, month)
        END
      `,
      `
        IF NOT EXISTS (
          SELECT 1 FROM sys.indexes
          WHERE name = N'idx_performance_validation_status'
            AND object_id = OBJECT_ID(N'dbo.performance_monthly')
        )
        BEGIN
          CREATE INDEX idx_performance_validation_status ON dbo.performance_monthly(validation_status, excluded_from_pi)
        END
      `,
    ],
  },
];

loadEnv(ROOT_DIR);

function quoteName(name) {
  return `[${String(name).replace(/]/g, "]]")}]`;
}

function splitBatches(sqlText) {
  return sqlText
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function migrationAlreadyApplied(pool) {
  const result = await pool.request().query(`
    IF OBJECT_ID(N'dbo.schema_migrations', N'U') IS NULL
      SELECT CAST(0 AS bit) AS applied
    ELSE IF EXISTS (SELECT 1 FROM dbo.schema_migrations WHERE version = N'${MIGRATION_VERSION}')
      SELECT CAST(1 AS bit) AS applied
    ELSE
      SELECT CAST(0 AS bit) AS applied
  `);
  return Boolean(result.recordset[0]?.applied);
}

async function postMigrationAlreadyApplied(pool, version) {
  const sql = require("mssql");
  const request = pool.request();
  request.input("version", sql.NVarChar(120), version);
  const result = await request.query(`
    IF OBJECT_ID(N'dbo.schema_migrations', N'U') IS NULL
      SELECT CAST(0 AS bit) AS applied
    ELSE IF EXISTS (SELECT 1 FROM dbo.schema_migrations WHERE version = @version)
      SELECT CAST(1 AS bit) AS applied
    ELSE
      SELECT CAST(0 AS bit) AS applied
  `);
  return Boolean(result.recordset[0]?.applied);
}

async function applyPostMigrations(pool) {
  const sql = require("mssql");
  let applied = 0;
  for (const migration of POST_MIGRATIONS) {
    if (await postMigrationAlreadyApplied(pool, migration.version)) {
      continue;
    }
    for (const statement of migration.statements) {
      await pool.request().query(statement);
    }
    const request = pool.request();
    request.input("version", sql.NVarChar(120), migration.version);
    await request.query(`
      MERGE dbo.schema_migrations AS target
      USING (SELECT @version AS version) AS source
      ON target.version = source.version
      WHEN NOT MATCHED THEN INSERT (version) VALUES (source.version);
    `);
    applied += 1;
  }
  return applied;
}

async function main() {
  const sql = require("mssql");
  const database = process.env.DB_NAME || "bosch_worker_performance";
  const baseConfig = {
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    pool: {
      max: Number(process.env.DB_CONNECTION_LIMIT || 10),
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
  };

  if (!baseConfig.server || !baseConfig.user || !database) {
    throw new Error("Missing SQL Server config. Please set DB_HOST, DB_USER and DB_NAME.");
  }

  const masterPool = await new sql.ConnectionPool({ ...baseConfig, database: "master" }).connect();
  try {
    await masterPool.request().query(`
      IF DB_ID(N'${database.replace(/'/g, "''")}') IS NULL
      BEGIN
        CREATE DATABASE ${quoteName(database)};
      END
    `);
  } finally {
    await masterPool.close();
  }

  const pool = await new sql.ConnectionPool({ ...baseConfig, database }).connect();
  try {
    if (await migrationAlreadyApplied(pool)) {
      const postMigrationsApplied = await applyPostMigrations(pool);
      console.log(JSON.stringify({ ok: true, database, migration: MIGRATION_VERSION, skipped: true, postMigrationsApplied }, null, 2));
      return;
    }

    const schemaSql = await fs.readFile(SCHEMA_FILE, "utf8");
    const batches = splitBatches(schemaSql)
      .filter((batch) => !/\bCREATE\s+DATABASE\b/i.test(batch))
      .filter((batch) => !/^\s*USE\s+/i.test(batch));

    for (const batch of batches) {
      await pool.request().query(batch);
    }

    const postMigrationsApplied = await applyPostMigrations(pool);
    console.log(JSON.stringify({ ok: true, database, migration: MIGRATION_VERSION, skipped: false, postMigrationsApplied }, null, 2));
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
