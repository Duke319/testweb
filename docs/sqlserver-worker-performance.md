# 员工绩效 SQL Server 接入说明

## 目标

公司数据库为 Microsoft SQL Server。当前系统仍保留 `data/worker-performance-monthly.json` 回退能力；配置 SQL Server 后，后端会优先读取 SQL Server，连接失败时回退 JSON，保证演示页面可用。

## 1. 安装依赖

```bash
npm install
```

SQL Server 连接依赖为 Node.js `mssql` 包。

## 2. 建库建表

在空库或新建库中执行 SQL Server schema。SQL Server Management Studio 可直接打开 [db/schema.sqlserver.sql](/Users/yuyu/Desktop/Bosch/db/schema.sqlserver.sql) 后执行；如果使用 SQLCMD 模式，也可以执行：

```sql
:r db/schema.sqlserver.sql
```

命令行 `sqlcmd` 示例：

```bash
sqlcmd -S <server> -U <user> -P <password> -i db/schema.sqlserver.sql
```

默认数据库名为 `bosch_worker_performance`。如公司已有数据库，请先让 DBA 确认库名、schema 名和账号权限，再调整脚本中的 `USE bosch_worker_performance`。

## 3. 配置环境变量

`.env` 示例：

```env
DB_TYPE=mssql
DB_HOST=sqlserver.company.local
DB_PORT=1433
DB_USER=bosch_app
DB_PASSWORD=your_password
DB_NAME=bosch_worker_performance
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
WORKER_DATA_SOURCE=mssql
```

如果公司 SQL Server 强制 TLS，加密配置通常应改为：

```env
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

## 4. 数据表要求

后端读取以下核心表：

```text
dbo.performance_monthly
dbo.employees
dbo.workshops
dbo.teams
dbo.certificates
dbo.employee_certificates
dbo.import_batches
```

字段结构见 [db/schema.sqlserver.sql](/Users/yuyu/Desktop/Bosch/db/schema.sqlserver.sql)。

## 5. 启动服务

```bash
npm start
```

API 不变：

```text
GET /api/performance/boss-summary
GET /api/performance/admin/employees
GET /api/performance/competence-matrix
GET /api/performance/employees/:employeeKey
```

## 6. SQL Server 方言说明

- SQL Server 使用 `IDENTITY(1,1)` 自增主键。
- SQL Server 没有 `ENUM`，状态字段用 `NVARCHAR` + `CHECK` 约束。
- SQL Server upsert 使用 `MERGE` 或事务逻辑。
- `npm run migrate` 执行 SQL Server schema；`npm run import:worker-performance` 将中间 JSON 导入 SQL Server。
