# 部署文件夹结构

本项目根目录现在按“可部署运行”和“资料归档”分层。生产部署优先关注根目录的应用、数据、配置和数据库脚本；交付物、历史原型和本地工具不参与服务启动。

## 运行部署目录

```text
backend/          Express 后端、API 路由、服务启动入口
frontend/         Vue 3 前端源码，构建产物输出到 frontend/dist
db/               SQL Server schema 和 migration
scripts/          数据迁移、数据生成、导入和辅助脚本
data/             运行数据、中间 JSON、样例 CSV、原始资料
assets/           应用运行需要的图片和品牌资源
src/              后端共享环境变量与数据库工具
package.json      npm 脚本和 Node 依赖声明
.env.example      环境变量模板
```

## 资料与历史目录

```text
legacy/           旧版静态原型和旧版 Node 服务，可用 npm run legacy:start 启动
docs/             PRD、部署说明、接口设计、会议纪要和参考资料
artifacts/        PPT、截图、LaTeX、Stitch 原型等生成物和交付物
archive/          本地工具、虚拟环境、技能包等非部署内容
```

## 常用命令

```bash
npm install
npm run build
npm start
```

开发模式：

```bash
npm run dev:backend
npm run dev:frontend
```

原始绩效数据重新生成：

```bash
python3 scripts/generate_worker_performance_monthly.py
```

SQL Server 初始化：

```bash
sqlcmd -S <server> -U <user> -P <password> -i db/schema.sqlserver.sql
```

SQL Server 导入：

```bash
npm run import:worker-performance
```

## 部署打包建议

部署服务器通常需要包含：

```text
backend/
frontend/
db/
scripts/
data/
assets/
src/
package.json
package-lock.json
.env.example
README.md
```

`node_modules/` 可由 `npm ci` 或 `npm install` 在服务器生成；`.env` 应由部署环境单独配置，不建议打包共享。
