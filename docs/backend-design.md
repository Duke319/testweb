# 后端设计说明

## 1. 目标

将当前原型升级为真实前后端版本，支持：

- 管理员 / 员工登录
- 员工提交设备相关数据变更
- 管理员查看并审核提交记录
- 审核通过后更新设备主数据或设备状态

## 2. 核心数据表

以下为推荐的关系型数据库设计，当前公司环境按 Microsoft SQL Server 落库。

### 2.1 `users`

```sql
CREATE TABLE users (
  id              VARCHAR(36) PRIMARY KEY,
  username        VARCHAR(64) NOT NULL UNIQUE,
  display_name    VARCHAR(128) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(32) NOT NULL,
  department      VARCHAR(128),
  status          VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

说明：

- `role` 推荐枚举：`admin` / `employee`
- 正式环境不要存明文密码，应使用哈希

### 2.2 `equipment_assets`

```sql
CREATE TABLE equipment_assets (
  id               VARCHAR(36) PRIMARY KEY,
  equipment_code   VARCHAR(64) NOT NULL UNIQUE,
  equipment_name   VARCHAR(255) NOT NULL,
  equipment_type   VARCHAR(64) NOT NULL,
  plant            VARCHAR(128) NOT NULL,
  line_name        VARCHAR(128) NOT NULL,
  station_name     VARCHAR(128) NOT NULL,
  owner_name       VARCHAR(128),
  lifecycle_stage  VARCHAR(32) NOT NULL,
  run_status       VARCHAR(32) NOT NULL,
  risk_level       VARCHAR(32) NOT NULL,
  asset_count      INT NOT NULL DEFAULT 1,
  oee              DECIMAL(5,2),
  availability     DECIMAL(5,2),
  downtime_hours   DECIMAL(10,2),
  mtbf             DECIMAL(10,2),
  mttr             DECIMAL(10,2),
  drawing_status   VARCHAR(64),
  layout_status    VARCHAR(64),
  spare_risk       VARCHAR(32),
  next_pm_date     DATE,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 `employee_submissions`

这是管理员审核的核心业务表。

```sql
CREATE TABLE employee_submissions (
  id                VARCHAR(36) PRIMARY KEY,
  submitter_id      VARCHAR(36) NOT NULL,
  equipment_id      VARCHAR(36) NOT NULL,
  change_type       VARCHAR(64) NOT NULL,
  quantity_delta    INT,
  new_status        VARCHAR(32),
  note              TEXT NOT NULL,
  review_status     VARCHAR(32) NOT NULL DEFAULT 'pending',
  reviewed_by       VARCHAR(36),
  reviewed_at       TIMESTAMP,
  review_comment    TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_submission_user FOREIGN KEY (submitter_id) REFERENCES users(id),
  CONSTRAINT fk_submission_equipment FOREIGN KEY (equipment_id) REFERENCES equipment_assets(id)
);
```

推荐 `change_type`：

- `equipment_quantity`
- `status_update`
- `spare_update`
- `document_update`
- `issue_note`

推荐 `review_status`：

- `pending`
- `approved`
- `rejected`

### 2.4 `submission_audit_logs`

```sql
CREATE TABLE submission_audit_logs (
  id               VARCHAR(36) PRIMARY KEY,
  submission_id    VARCHAR(36) NOT NULL,
  action_type      VARCHAR(32) NOT NULL,
  operator_id      VARCHAR(36) NOT NULL,
  action_comment   TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_submission FOREIGN KEY (submission_id) REFERENCES employee_submissions(id),
  CONSTRAINT fk_audit_operator FOREIGN KEY (operator_id) REFERENCES users(id)
);
```

用途：

- 记录提交、审核通过、审核驳回等动作
- 支撑审计追踪

### 2.5 `user_sessions`

```sql
CREATE TABLE user_sessions (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  access_token    VARCHAR(255) NOT NULL UNIQUE,
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

正式环境建议接入 JWT 或统一认证系统；原型阶段也可以用服务端 session 表。

## 3. 提交流程

### 3.1 员工提交流程

1. 员工登录
2. 选择设备 / 工位
3. 选择变更类型
4. 填写变化值或新状态
5. 填写备注
6. 提交后写入 `employee_submissions`

### 3.2 管理员审核流程

1. 管理员查看 `pending` 状态记录
2. 选择通过或驳回
3. 若通过：
   - 更新 `employee_submissions.review_status = approved`
   - 更新对应 `equipment_assets` 主数据
   - 记录 `submission_audit_logs`
4. 若驳回：
   - 更新 `employee_submissions.review_status = rejected`
   - 写入审核意见
   - 记录 `submission_audit_logs`

## 4. 接口清单

以下是推荐 REST API 清单；当前原型已经实现其中核心接口。

### 4.1 认证接口

#### `POST /api/auth/login`

请求：

```json
{
  "role": "admin",
  "username": "admin",
  "password": "<password>"
}
```

响应：

```json
{
  "token": "session-token",
  "user": {
    "id": "USR-ADMIN-001",
    "username": "admin",
    "displayName": "系统管理员",
    "role": "admin"
  }
}
```

#### `GET /api/auth/me`

说明：根据当前 token 返回当前用户

#### `POST /api/auth/logout`

说明：清理当前登录态

### 4.2 仪表盘接口

#### `GET /api/dashboard`

用途：管理员加载驾驶舱所需聚合数据

返回内容：

- `equipment`
- `spareParts`
- `trendSeries`
- `downtimeCauses`
- `layoutLanes`
- `riskRules`

#### `GET /api/equipment`

用途：员工提报时获取设备清单

### 4.3 员工提交接口

#### `GET /api/submissions?scope=mine`

用途：员工查看自己的提交记录

#### `POST /api/submissions`

请求示例：

```json
{
  "equipmentId": "HZ-DR-T01",
  "changeType": "equipment_quantity",
  "quantityDelta": 1,
  "newStatus": "",
  "note": "新增一套备用测试治具"
}
```

### 4.4 管理员审核接口

#### `GET /api/submissions`

用途：管理员查看所有提交记录

#### `PATCH /api/submissions/:id`

请求示例：

```json
{
  "status": "已通过"
}
```

说明：

- `已通过`：更新提交状态，并同步更新设备主数据
- `已驳回`：仅更新审核状态

## 5. 当前实现与正式方案差异

当前工作区已经实现一个无依赖 Node 原型后端：

- 使用 `legacy/server.js`
- 使用 `data/db.json` 作为持久化存储
- 使用内存 session 保存登录态

这适合本地演示，但正式环境建议升级为：

- 数据库：Microsoft SQL Server
- 会话：JWT 或统一认证
- 密码：哈希存储
- 审核日志：独立审计表
- 权限：细粒度 RBAC

## 6. 当前已落地的核心接口

当前代码中已经实现：

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/dashboard`
- `GET /api/equipment`
- `GET /api/submissions`
- `POST /api/submissions`
- `PATCH /api/submissions/:id`
