# 设备周期管理可视化平台

> Clean private release: this repository intentionally excludes real business data, raw Excel/zip files, generated reports, and local build artifacts. The bundled static demo snapshot is an empty placeholder only.

一个面向博世杭州电动工具工厂电钻产线的设备全生命周期可视化原型项目，用于把设备引入、运行、维护、备件、图纸、 layout 与生产效率等数据放到同一张业务画布中，帮助团队围绕 OEE 提升建立管理驾驶舱。

## 当前内容

- `frontend/`：Vue 3 + Vite + ECharts 前端
- `backend/`：Express 分层后端
- `db/schema.sqlserver.sql`：Microsoft SQL Server 数据库结构
- `scripts/`：数据库迁移、员工绩效数据生成、导入和汇报素材生成脚本
- `data/`：仅保留占位说明；真实运行数据、中间 JSON、CSV、Excel、zip 不进入此仓库
- `assets/`：部署时需要的静态品牌和登录页资源
- `legacy/`：旧版静态原型和旧版 Node 服务
- `artifacts/`：PPT、截图、LaTeX、Stitch 原型等交付和生成产物
- `archive/`：本地工具、虚拟环境、技能包等非部署依赖归档
- `docs/mvp-blueprint.md`：MVP 蓝图摘要
- `docs/phase-1-prd.md`：一期正式规划文档
- `docs/backend-design.md`：后端表结构与接口清单
- `docs/frontend-ui-design-handoff.md`：前端界面与样式重设计交接文档

## 部署目录结构

```text
Bosch/
├── backend/                 Express API 和生产静态托管入口
├── frontend/                Vue 3 前端源码，构建输出到 frontend/dist
├── db/                      SQL Server schema 和 migrations
├── scripts/                 迁移、导入、数据生成和汇报生成脚本
├── data/                    仅保留占位说明；真实数据不纳入 Git
├── assets/                  应用运行所需图片和品牌资源
├── legacy/                  旧版原型回退入口
├── docs/                    需求、部署、接口、会议和参考文档
├── artifacts/               交付物与生成产物，不参与服务启动
└── archive/                 本地工具或历史包，不参与部署
```

## 当前原型聚焦

- 试点范围：杭州工厂电钻产线
- 设备范围：总装设备、测试设备
- 管理主目标：OEE 提升
- 生命周期阶段分布
- 红黄绿风险自动判定示意
- 图纸 / layout / 备件风险联动

## 本地运行

当前版本已经升级为 Vue 3 + Express + 数据库/JSON 双数据源的前后端分离雏形。公司环境建议使用 Microsoft SQL Server；未配置数据库时会回退 JSON 演示数据。安装依赖后可直接运行：

```bash
npm install
npm run dev:backend
```

然后打开 `http://localhost:3000`。如果已经运行过 `npm run build`，Express 会托管 Vue 构建产物；否则会回退到旧版原型页面。

前端开发模式：

```bash
npm run dev:backend
npm run dev:frontend
```

然后打开 `http://localhost:5173`。Vite 会把 `/api` 代理到 `http://localhost:3000`。

生产构建：

```bash
npm run build
npm start
```

旧版原型仍可通过以下命令启动：

```bash
npm run legacy:start
```

## Microsoft SQL Server 数据库

公司数据库为 Microsoft SQL Server。SQL Server schema 位于 [db/schema.sqlserver.sql](/Users/yuyu/Desktop/Bosch/db/schema.sqlserver.sql)，包含员工、车间、班组、月度绩效、加班、请假、PM01/PM03、改善、证书、权限和审计日志。

`.env` 核心配置：

```env
DB_TYPE=mssql
DB_HOST=sqlserver.company.local
DB_PORT=1433
DB_USER=bosch_app
DB_PASSWORD=your_password
DB_NAME=bosch_worker_performance
WORKER_DATA_SOURCE=mssql
```

未配置数据库时，新 Express API 会回退读取 `data/worker-performance-monthly.json`，并生成 OT、请假、综合工时、改善、证书等演示指标，保证界面可演示。

SQL Server 接入说明见 [docs/sqlserver-worker-performance.md](/Users/yuyu/Desktop/Bosch/docs/sqlserver-worker-performance.md)。

如需从原始 Excel/zip 重新生成中间数据，原始文件位于 `data/raw/employee-performance-system/`：

```bash
python3 scripts/generate_worker_performance_monthly.py
```

## 演示账号

演示账号：

- 管理员：`admin / admin123`
- TEF31 编辑账号：`editor01 / edit123`
- TEF32 编辑账号：`editor02 / edit123`
- TEF33 编辑账号：`editor03 / edit123`

## 当前权限模型

- 管理员：查看全部 TEF 数据、审核提交、创建普通账号、调整普通账号权限、查看审计日志
- 编辑账号：只能查看和提交自己绑定 TEF 的数据

## 审计留痕

- 每次创建账号、切换普通账号权限都会写入 `auditLogs`
- 每次提交、审核、落库修改都会写入 `auditLogs`
- 审计日志通过管理员界面的“审计日志”页面查看

## 建议的下一步

1. 把 `data/db.json` 中的演示数据替换成试点产线真实数据
2. 将旧版 `legacy/server.js` 中仍有价值的能力合并到正式 Express 后端
3. 将明文密码替换为加密存储和正式认证方案
4. 增加审核意见、审计日志和权限控制

更多设计说明见：

- [docs/phase-1-prd.md](/Users/yuyu/Desktop/Bosch/docs/phase-1-prd.md)
- [docs/mvp-blueprint.md](/Users/yuyu/Desktop/Bosch/docs/mvp-blueprint.md)
- [docs/backend-design.md](/Users/yuyu/Desktop/Bosch/docs/backend-design.md)
- [docs/frontend-ui-design-handoff.md](/Users/yuyu/Desktop/Bosch/docs/frontend-ui-design-handoff.md)
