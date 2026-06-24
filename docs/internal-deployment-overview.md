# 员工绩效系统内部部署

当前数据源位于公司内部共享目录，例如：

```text
\\bosch.com\dfsr\dscn\loc\hz\
```

这类路径一般是 Bosch 内部 DFS / Windows 网络共享目录。它不是普通本地文件夹，而是公司文件服务器上的共享数据目录。

## 一、项目结构与组成

### 1. 系统定位

员工绩效系统是一个内部 Web 系统，用于展示员工绩效、PI、工时、证书能力和异常情况。

```text
Vue 前端 + Node.js 后端 + Microsoft SQL Server 数据库 + 数据导入脚本
```

系统运行后，用户通过浏览器访问内部网址查看数据。

### 2. 整体数据流

当前推荐的数据流是：

```text
公司共享文件夹中的 Excel / CSV / zip
        ↓
复制到服务器本地导入目录
        ↓
数据整理脚本
        ↓
中间 JSON 数据文件
        ↓
数据导入脚本
        ↓
SQL Server 数据库
        ↓
Node.js 后端 API
        ↓
Vue 前端页面
        ↓
用户浏览器
```

网页运行时不建议直接读取共享文件夹，而是读取 SQL Server 中已经导入、校验过的数据。

### 3. 技术组成

| 层级 | 技术 | 作用 |
|---|---|---|
| 前端 | Vue 3 | 页面结构、交互、筛选 |
| 前端构建 | Vite | 本地开发和生产构建 |
| 图表 | ECharts | PI、趋势、散点图、柱状图 |
| 后端 | Node.js + Express | API、数据筛选、指标计算 |
| 数据库 | Microsoft SQL Server | 存储员工绩效、证书、导入记录 |
| 数据导入 | Python / Node.js 脚本 | 清洗原始文件并写入 SQL Server |

### 4. 目录结构

```text
Bosch/
├── frontend/                         前端 Vue 项目
│   ├── src/
│   │   ├── views/                    页面入口
│   │   ├── components/               图表和业务组件
│   │   ├── services/                 API 调用
│   │   └── styles/                   样式
│   └── dist/                         构建后的静态文件
│
├── backend/                          Node.js + Express 后端
│   ├── server.js                     服务启动入口
│   ├── app.js                        Express 应用配置
│   ├── routes/                       API 路由
│   ├── controllers/                  接口控制层
│   ├── services/                     业务计算逻辑
│   └── repositories/                 数据库 / 文件读取层
│
├── db/
│   ├── schema.sqlserver.sql          SQL Server 表结构
│   └── migrations/                   数据库迁移
│
├── scripts/
│   ├── run_migrations.js             初始化 / 更新数据库结构
│   ├── generate_worker_performance_monthly.py
│   │                                 整理原始绩效数据
│   └── import_worker_performance_sqlserver.js
│                                     导入绩效数据到 SQL Server
│
├── data/
│   ├── worker-performance-monthly.json
│                                     整理后的中间数据
│   └── raw/employee-performance-system/
│                                     原始 Excel / zip 数据归档
│
├── legacy/                           旧版静态原型回退入口
├── artifacts/                        PPT、截图、LaTeX 等交付和生成产物
├── archive/                          本地工具、虚拟环境、历史包
├── docs/                             文档
├── package.json                      npm 命令和依赖
└── .env                              环境变量
```

### 5. 前端组成

前端主要负责展示界面。

核心页面和组件：

```text
frontend/src/views/PerformanceDashboard.vue
frontend/src/components/BossOverview.vue
frontend/src/components/PiIndicatorView.vue
frontend/src/components/CompetenceWorkspace.vue
frontend/src/components/ExceptionWorkspace.vue
frontend/src/components/EmployeeDetailPanel.vue
frontend/src/components/FilterBar.vue
frontend/src/services/performanceApi.js
```

### 6. 后端组成

后端主要负责提供 API 和计算指标。

主要文件：

```text
backend/server.js
backend/app.js
backend/routes/performanceRoutes.js
backend/controllers/performanceController.js
backend/services/performanceService.js
backend/repositories/databaseRepository.js
```

### 7. 数据库组成

公司环境数据库采用 Microsoft SQL Server。

当前数据库名：

```text
bosch_worker_performance
```

核心表：

| 表名 | 作用 |
|---|---|
| employees | 员工基础信息 |
| workshops | 厂房 / 区域，例如 101、103、104 |
| teams | 班组或分组 |
| performance_monthly | 员工月度绩效主表 |
| certificates | 证书类型 |
| employee_certificates | 员工证书有效期 |
| import_batches | 导入批次记录 |
| users | 用户表，目前不是正式权限体系 |
| roles | 角色表 |
| audit_logs | 审计日志 |

### 8. 当前 API

健康检查：

```text
GET /api/health
```

绩效接口：

```text
GET /api/performance/boss-summary
GET /api/performance/admin/employees
GET /api/performance/competence-matrix
GET /api/performance/employees/:employeeKey
```

接口用途：

| 接口 | 用途 |
|---|---|
| `/api/performance/boss-summary` | 总览页 |
| `/api/performance/admin/employees` | PI 页面、员工汇总、异常基础数据 |
| `/api/performance/competence-matrix` | 能力 / 证书页面 |
| `/api/performance/employees/:employeeKey` | 员工详情 |

### 9. 推荐部署方式

推荐采用“共享文件夹只作为原始数据源，网站只读 SQL Server”的方式。

```text
公司共享文件夹
  ↓
服务器定时复制源文件
  ↓
服务器本地导入目录
  ↓
数据清洗与校验
  ↓
写入 SQL Server
  ↓
网站读取 SQL Server
```

推荐架构：

```text
用户浏览器
  ↓
公司内部域名
  ↓
Nginx / IIS / 内部网关
  ↓
Node.js Express 服务
  ↓
SQL Server

公司共享文件夹
  ↓
定时复制任务
  ↓
服务器本地 import/raw 目录
  ↓
导入脚本
  ↓
SQL Server
```

### 10. 推荐服务器目录规划

建议在部署服务器上建立固定目录：

```text
bosch-performance/
├── app/                       项目代码
├── import/
│   ├── raw/                   从共享文件夹复制来的原始文件
│   ├── archive/               已导入文件归档
│   ├── failed/                导入失败文件
│   └── logs/                  导入日志
├── backup/
│   ├── sqlserver/             数据库备份
│   └── data/                  中间数据备份
└── logs/
    ├── app/                   Node 服务日志
    └── import/                导入任务日志
```

不要直接在共享文件夹内改文件、移动文件或写入系统生成文件。

### 11. 正式内部网站建议架构

建议最终形态：

```text
公司内部域名
  ↓
Nginx / IIS / 内部网关
  ↓
Node.js Express
  ↓
SQL Server
```

数据导入链路：

```text
\\bosch.com\dfsr\dscn\loc\hz\...
  ↓
只读复制
服务器本地 import/raw
  ↓
清洗 / 校验 / 导入
  ↓
SQL Server
```

待完成事项：

1. 在一台公司内网服务器，安装 Node.js 20+、npm，并确认可连接 SQL Server。
2. 创建或分配 SQL Server 数据库 bosch_worker_performance，并提供应用账号。
3. 配置服务器可访问数据源共享目录，例如 \\bosch.com\dfsr\dscn\loc\hz\...，建议使用服务账号只读访问。
4. 配置内部访问地址，如可先使用 http://服务器IP:3000，后续可配置内部域名和 HTTPS。
5. 配置 Node 服务长期运行方式，例如 PM2、Windows Service、IIS/Nginx 反向代理。
6. 配置 SQL Server 备份、应用日志、导入日志。
7. 如正式上线，需要接入公司内部账号权限。
8. 后续如要自动更新数据，需要配置定时任务，从共享文件夹复制数据并执行导入脚本。
