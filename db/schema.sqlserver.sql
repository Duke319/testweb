IF DB_ID(N'bosch_worker_performance') IS NULL
BEGIN
  CREATE DATABASE bosch_worker_performance;
END;
GO

USE bosch_worker_performance;
GO

CREATE TABLE dbo.schema_migrations (
  version NVARCHAR(120) NOT NULL PRIMARY KEY,
  applied_at DATETIME2 NOT NULL CONSTRAINT df_schema_migrations_applied_at DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.workshops (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  workshop_code NVARCHAR(50) NOT NULL,
  workshop_name NVARCHAR(100) NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT df_workshops_status DEFAULT N'active',
  created_at DATETIME2 NOT NULL CONSTRAINT df_workshops_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT df_workshops_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_workshops_status CHECK (status IN (N'active', N'inactive')),
  CONSTRAINT uq_workshops_code UNIQUE (workshop_code),
  CONSTRAINT uq_workshops_name UNIQUE (workshop_name)
);
GO

CREATE TABLE dbo.teams (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  workshop_id BIGINT NULL,
  team_code NVARCHAR(50) NOT NULL,
  team_name NVARCHAR(100) NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT df_teams_status DEFAULT N'active',
  created_at DATETIME2 NOT NULL CONSTRAINT df_teams_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT df_teams_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_teams_status CHECK (status IN (N'active', N'inactive')),
  CONSTRAINT uq_teams_code UNIQUE (team_code),
  CONSTRAINT fk_teams_workshop FOREIGN KEY (workshop_id) REFERENCES dbo.workshops(id)
);
GO
CREATE INDEX idx_teams_workshop ON dbo.teams(workshop_id);
CREATE INDEX idx_teams_name ON dbo.teams(team_name);
GO

CREATE TABLE dbo.employees (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  employee_no NVARCHAR(50) NOT NULL,
  source_employee_no NVARCHAR(50) NULL,
  employee_name NVARCHAR(100) NOT NULL,
  department NVARCHAR(50) NULL,
  workshop_id BIGINT NULL,
  team_id BIGINT NULL,
  position_name NVARCHAR(100) NULL,
  exclude_from_averages BIT NOT NULL CONSTRAINT df_employees_exclude_from_averages DEFAULT 0,
  average_exclusion_reason NVARCHAR(255) NULL,
  pi_target_rate DECIMAL(5,4) NULL,
  pi_target_label NVARCHAR(100) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT df_employees_status DEFAULT N'active',
  created_at DATETIME2 NOT NULL CONSTRAINT df_employees_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT df_employees_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_employees_status CHECK (status IN (N'active', N'inactive')),
  CONSTRAINT uq_employees_no UNIQUE (employee_no),
  CONSTRAINT fk_employees_workshop FOREIGN KEY (workshop_id) REFERENCES dbo.workshops(id),
  CONSTRAINT fk_employees_team FOREIGN KEY (team_id) REFERENCES dbo.teams(id)
);
GO
CREATE INDEX idx_employees_name ON dbo.employees(employee_name);
CREATE INDEX idx_employees_department ON dbo.employees(department);
CREATE INDEX idx_employees_workshop ON dbo.employees(workshop_id);
CREATE INDEX idx_employees_team ON dbo.employees(team_id);
GO

CREATE TABLE dbo.import_batches (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  source_name NVARCHAR(255) NOT NULL,
  source_type NVARCHAR(50) NOT NULL CONSTRAINT df_import_batches_source_type DEFAULT N'json',
  status NVARCHAR(30) NOT NULL CONSTRAINT df_import_batches_status DEFAULT N'created',
  imported_by NVARCHAR(100) NULL,
  remark NVARCHAR(MAX) NULL,
  record_count INT NOT NULL CONSTRAINT df_import_batches_record_count DEFAULT 0,
  valid_record_count INT NOT NULL CONSTRAINT df_import_batches_valid_record_count DEFAULT 0,
  quarantined_record_count INT NOT NULL CONSTRAINT df_import_batches_quarantined_record_count DEFAULT 0,
  imported_at DATETIME2 NOT NULL CONSTRAINT df_import_batches_imported_at DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.performance_monthly (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  year INT NOT NULL,
  month TINYINT NOT NULL,
  attendance_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_attendance DEFAULT 0,
  order_count DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_order_count DEFAULT 0,
  repair_hours DECIMAL(12,4) NOT NULL CONSTRAINT df_performance_repair_hours DEFAULT 0,
  repair_hours_source_value DECIMAL(12,4) NULL,
  repair_hours_quality_threshold DECIMAL(12,4) NULL,
  repair_hours_quality_percentile DECIMAL(5,4) NULL,
  repair_hours_quality_reason NVARCHAR(100) NULL,
  record_exclude_from_averages BIT NOT NULL CONSTRAINT df_performance_record_exclude_from_averages DEFAULT 0,
  record_average_exclusion_reason NVARCHAR(255) NULL,
  overtime_15_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_overtime15 DEFAULT 0,
  overtime_20_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_overtime20 DEFAULT 0,
  overtime_30_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_overtime30 DEFAULT 0,
  annual_leave_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_annual_leave DEFAULT 0,
  sick_leave_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_sick_leave DEFAULT 0,
  composite_hours AS (overtime_15_hours + overtime_20_hours - sick_leave_hours - annual_leave_hours) PERSISTED,
  pm01_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_pm01 DEFAULT 0,
  pm03_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_pm03 DEFAULT 0,
  transfer_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_transfer DEFAULT 0,
  repair_efficiency_pi AS (
    CASE
      WHEN attendance_hours > 0 THEN (pm01_hours + pm03_hours + transfer_hours) / attendance_hours
      ELSE CONVERT(DECIMAL(12,6), 0)
    END
  ) PERSISTED,
  repair_time_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_performance_repair_time DEFAULT 0,
  mttr_minutes DECIMAL(12,2) NULL,
  fault_response_minutes DECIMAL(12,2) NULL,
  import_batch_id BIGINT NULL,
  source_file NVARCHAR(500) NULL,
  source_sheet NVARCHAR(255) NULL,
  source_row INT NULL,
  source_field NVARCHAR(100) NULL,
  raw_value NVARCHAR(MAX) NULL,
  parsed_value NVARCHAR(MAX) NULL,
  validation_status NVARCHAR(30) NOT NULL CONSTRAINT df_performance_validation_status DEFAULT N'valid',
  anomaly_reason NVARCHAR(500) NULL,
  excluded_from_pi BIT NOT NULL CONSTRAINT df_performance_excluded_from_pi DEFAULT 0,
  created_at DATETIME2 NOT NULL CONSTRAINT df_performance_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT df_performance_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT uq_performance_employee_period UNIQUE (employee_id, year, month),
  CONSTRAINT fk_performance_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
  CONSTRAINT fk_performance_import_batch FOREIGN KEY (import_batch_id) REFERENCES dbo.import_batches(id)
);
GO
CREATE INDEX idx_performance_period ON dbo.performance_monthly(year, month);
CREATE INDEX idx_performance_import_batch ON dbo.performance_monthly(import_batch_id);
CREATE INDEX idx_performance_validation_status ON dbo.performance_monthly(validation_status, excluded_from_pi);
GO

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
);
GO
CREATE INDEX idx_anomalies_status ON dbo.data_quality_anomalies(status, severity);
CREATE INDEX idx_anomalies_employee_period ON dbo.data_quality_anomalies(employee_id, year, month);
CREATE INDEX idx_anomalies_import_batch ON dbo.data_quality_anomalies(import_batch_id);
GO

CREATE TABLE dbo.overtime_records (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  work_date DATE NOT NULL,
  overtime_type NVARCHAR(10) NOT NULL,
  hours DECIMAL(10,2) NOT NULL CONSTRAINT df_overtime_hours DEFAULT 0,
  import_batch_id BIGINT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_overtime_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_overtime_type CHECK (overtime_type IN (N'1.5x', N'2x', N'3x')),
  CONSTRAINT fk_overtime_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
  CONSTRAINT fk_overtime_import_batch FOREIGN KEY (import_batch_id) REFERENCES dbo.import_batches(id)
);
GO
CREATE INDEX idx_overtime_employee_date ON dbo.overtime_records(employee_id, work_date);
CREATE INDEX idx_overtime_type ON dbo.overtime_records(overtime_type);
GO

CREATE TABLE dbo.leave_records (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  leave_date DATE NOT NULL,
  leave_type NVARCHAR(20) NOT NULL,
  hours DECIMAL(10,2) NOT NULL CONSTRAINT df_leave_hours DEFAULT 0,
  import_batch_id BIGINT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_leave_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_leave_type CHECK (leave_type IN (N'annual', N'sick')),
  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
  CONSTRAINT fk_leave_import_batch FOREIGN KEY (import_batch_id) REFERENCES dbo.import_batches(id)
);
GO
CREATE INDEX idx_leave_employee_date ON dbo.leave_records(employee_id, leave_date);
CREATE INDEX idx_leave_type ON dbo.leave_records(leave_type);
GO

CREATE TABLE dbo.work_order_metrics (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  metric_date DATE NOT NULL,
  pm01_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_work_order_pm01 DEFAULT 0,
  pm03_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_work_order_pm03 DEFAULT 0,
  transfer_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_work_order_transfer DEFAULT 0,
  order_count DECIMAL(12,2) NOT NULL CONSTRAINT df_work_order_count DEFAULT 0,
  repair_time_hours DECIMAL(12,2) NOT NULL CONSTRAINT df_work_order_repair_time DEFAULT 0,
  mttr_minutes DECIMAL(12,2) NULL,
  fault_response_minutes DECIMAL(12,2) NULL,
  import_batch_id BIGINT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_work_order_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT fk_work_order_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
  CONSTRAINT fk_work_order_import_batch FOREIGN KEY (import_batch_id) REFERENCES dbo.import_batches(id)
);
GO
CREATE INDEX idx_work_order_employee_date ON dbo.work_order_metrics(employee_id, metric_date);
GO

CREATE TABLE dbo.factory_improvements (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  workshop_id BIGINT NULL,
  team_id BIGINT NULL,
  employee_id BIGINT NULL,
  improvement_date DATE NOT NULL,
  improvement_type NVARCHAR(20) NOT NULL,
  quantity INT NOT NULL CONSTRAINT df_improvements_quantity DEFAULT 1,
  benefit_amount DECIMAL(14,2) NOT NULL CONSTRAINT df_improvements_benefit DEFAULT 0,
  description NVARCHAR(MAX) NULL,
  source_project_id NVARCHAR(100) NULL,
  source_project_title NVARCHAR(500) NULL,
  project_type NVARCHAR(50) NULL,
  source_department NVARCHAR(100) NULL,
  line_area NVARCHAR(100) NULL,
  station NVARCHAR(100) NULL,
  operator_no NVARCHAR(50) NULL,
  operator_name NVARCHAR(100) NULL,
  execute_operator_no NVARCHAR(50) NULL,
  execute_operator_name NVARCHAR(100) NULL,
  approved BIT NOT NULL CONSTRAINT df_improvements_approved DEFAULT 1,
  approval_step NVARCHAR(100) NULL,
  source_file NVARCHAR(255) NULL,
  source_row INT NULL,
  import_batch_id BIGINT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_improvements_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_improvement_type CHECK (improvement_type IN (N'near_miss', N'pdca', N'kaizen')),
  CONSTRAINT fk_improvement_workshop FOREIGN KEY (workshop_id) REFERENCES dbo.workshops(id),
  CONSTRAINT fk_improvement_team FOREIGN KEY (team_id) REFERENCES dbo.teams(id),
  CONSTRAINT fk_improvement_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
  CONSTRAINT fk_improvement_import_batch FOREIGN KEY (import_batch_id) REFERENCES dbo.import_batches(id)
);
GO
CREATE INDEX idx_improvement_date_type ON dbo.factory_improvements(improvement_date, improvement_type);
CREATE INDEX idx_improvement_workshop ON dbo.factory_improvements(workshop_id);
CREATE INDEX idx_improvement_team ON dbo.factory_improvements(team_id);
CREATE UNIQUE INDEX uq_improvement_source_project ON dbo.factory_improvements(source_project_id) WHERE source_project_id IS NOT NULL;
GO

CREATE TABLE dbo.certificates (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  certificate_code NVARCHAR(50) NOT NULL,
  certificate_name NVARCHAR(100) NOT NULL,
  description NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_certificates_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT df_certificates_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT uq_certificates_code UNIQUE (certificate_code),
  CONSTRAINT uq_certificates_name UNIQUE (certificate_name)
);
GO

CREATE TABLE dbo.employee_certificates (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  certificate_id BIGINT NOT NULL,
  certificate_no NVARCHAR(100) NULL,
  issue_date DATE NULL,
  expire_date DATE NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT df_employee_certificates_status DEFAULT N'valid',
  import_batch_id BIGINT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_employee_certificates_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT df_employee_certificates_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_employee_certificates_status CHECK (status IN (N'valid', N'expiring', N'expired', N'missing')),
  CONSTRAINT uq_employee_certificate UNIQUE (employee_id, certificate_id),
  CONSTRAINT fk_employee_certificate_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
  CONSTRAINT fk_employee_certificate_certificate FOREIGN KEY (certificate_id) REFERENCES dbo.certificates(id),
  CONSTRAINT fk_employee_certificate_import_batch FOREIGN KEY (import_batch_id) REFERENCES dbo.import_batches(id)
);
GO
CREATE INDEX idx_employee_certificate_status ON dbo.employee_certificates(status);
CREATE INDEX idx_employee_certificate_expire ON dbo.employee_certificates(expire_date);
GO

CREATE TABLE dbo.roles (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  role_code NVARCHAR(50) NOT NULL,
  role_name NVARCHAR(100) NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_roles_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT uq_roles_code UNIQUE (role_code)
);
GO

CREATE TABLE dbo.users (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  username NVARCHAR(100) NOT NULL,
  display_name NVARCHAR(100) NOT NULL,
  password_hash NVARCHAR(255) NOT NULL,
  role_id BIGINT NOT NULL,
  employee_id BIGINT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT df_users_status DEFAULT N'active',
  created_at DATETIME2 NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT df_users_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_users_status CHECK (status IN (N'active', N'disabled')),
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id),
  CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id)
);
GO
CREATE INDEX idx_users_role ON dbo.users(role_id);
GO

CREATE TABLE dbo.audit_logs (
  id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  actor_user_id BIGINT NULL,
  action NVARCHAR(100) NOT NULL,
  target_type NVARCHAR(100) NULL,
  target_id NVARCHAR(100) NULL,
  summary NVARCHAR(500) NOT NULL,
  details NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT df_audit_logs_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT ck_audit_logs_details_json CHECK (details IS NULL OR ISJSON(details) = 1),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES dbo.users(id)
);
GO
CREATE INDEX idx_audit_created_at ON dbo.audit_logs(created_at);
CREATE INDEX idx_audit_action ON dbo.audit_logs(action);
GO

CREATE OR ALTER VIEW dbo.worker_performance_monthly AS
SELECT
  pm.id,
  pm.employee_id,
  e.team_id AS shift_id,
  pm.year,
  pm.month,
  pm.attendance_hours,
  pm.order_count,
  pm.repair_hours,
  pm.repair_hours_source_value,
  pm.repair_hours_quality_threshold,
  pm.repair_hours_quality_percentile,
  pm.repair_hours_quality_reason,
  pm.record_exclude_from_averages,
  pm.record_average_exclusion_reason,
  pm.import_batch_id,
  pm.source_file,
  pm.source_sheet,
  pm.source_row,
  pm.source_field,
  pm.raw_value,
  pm.parsed_value,
  pm.validation_status,
  pm.anomaly_reason,
  pm.excluded_from_pi,
  pm.created_at,
  pm.updated_at
FROM dbo.performance_monthly pm
INNER JOIN dbo.employees e ON e.id = pm.employee_id;
GO

CREATE OR ALTER VIEW dbo.shifts AS
SELECT
  id,
  team_name AS shift_name,
  created_at,
  updated_at
FROM dbo.teams;
GO

MERGE dbo.certificates AS target
USING (VALUES
  (N'ELECTRICIAN', N'电工证'),
  (N'HEIGHT', N'高空作业证'),
  (N'FORKLIFT', N'叉车证'),
  (N'WELDING', N'焊工证'),
  (N'SAFETY', N'安全员证')
) AS source(certificate_code, certificate_name)
ON target.certificate_code = source.certificate_code
WHEN MATCHED THEN UPDATE SET certificate_name = source.certificate_name, updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (certificate_code, certificate_name) VALUES (source.certificate_code, source.certificate_name);
GO

MERGE dbo.schema_migrations AS target
USING (VALUES (N'001_initial_performance_platform_sqlserver')) AS source(version)
ON target.version = source.version
WHEN NOT MATCHED THEN INSERT (version) VALUES (source.version);
GO

MERGE dbo.schema_migrations AS target
USING (VALUES (N'002_employee_profile_fields_sqlserver')) AS source(version)
ON target.version = source.version
WHEN NOT MATCHED THEN INSERT (version) VALUES (source.version);
GO
