# 前端界面设计交接文档

## 1. 文档目的

这份文档用于支持当前项目前端界面的重新设计，重点说明：

- 当前页面结构和信息架构
- 管理员与员工两类角色的界面差异
- 关键组件、容器和交互规则
- 前端样式可自由调整的范围
- 与 JavaScript 逻辑强绑定、不要随意改动的 DOM 标识

这份文档主要服务于“重做样式”工作，不讨论后端实现细节。

## 2. 当前前端文件

- 页面结构：[legacy/index.html](/Users/yuyu/Desktop/Bosch/legacy/index.html)
- 样式文件：[legacy/styles.css](/Users/yuyu/Desktop/Bosch/legacy/styles.css)
- 前端交互逻辑：[legacy/app.js](/Users/yuyu/Desktop/Bosch/legacy/app.js)

## 3. 当前界面总结构

当前界面可以分为三层：

1. 未登录状态  
显示登录弹层，要求选择角色并输入账号密码。

2. 已登录公共头部  
顶部始终展示品牌区、页面标题、当前账号信息和退出按钮。

3. 已登录工作区  
采用`左侧边栏 + 右侧内容区`结构，点击左侧菜单后，右侧只显示当前选中的内容模块。

## 4. 角色与界面模式

### 4.1 管理员模式

管理员登录后进入“驾驶舱 + 审核”工作台。

左侧边栏菜单：

- 数据提交
- 生命周期
- 趋势分析
- 设备看板
- 布局示意
- 风险规则

右侧内容区一次只显示一个模块。

### 4.2 员工模式

员工登录后进入“数据提报”工作台。

左侧边栏菜单：

- 数据提交
- 我的记录

右侧内容区一次只显示一个模块。

## 5. 页面区块说明

### 5.1 登录界面

作用：

- 选择角色：管理员 / 员工
- 输入账号与密码
- 展示登录提示和错误信息

主要结构：

- `#auth-screen`
- `#auth-role-switch`
- `#login-form`
- `#login-username`
- `#login-password`
- `#auth-hint`
- `#auth-error`

设计建议：

- 可以重做成居中卡片、左右分栏、品牌大图等形式
- 可以增加插画、背景、玻璃态、深色模式等视觉层
- 但登录表单字段 ID 不要改

### 5.2 顶部公共头部

作用：

- 显示 Bosch 标识
- 显示页面标题
- 显示当前角色、当前用户
- 提供退出登录入口

主要结构：

- `#page-title`
- `#role-pill`
- `#account-name`
- `#logout-btn`
- `#hero-heading`
- `#hero-primary-action`

设计建议：

- 可以改成更强的企业门户感
- 可以加入 breadcrumb、搜索、通知位、头像位
- 但按钮 ID 和账号信息容器建议保留

### 5.3 左侧边栏

作用：

- 作为主导航
- 控制右侧内容区切换

管理员边栏：

- `#admin-sidebar`
- 每个按钮为 `.sidebar-item`
- 通过 `data-section` 指向右侧内容块

员工边栏：

- `#employee-sidebar`
- 每个按钮为 `.sidebar-item`
- 同样使用 `data-section`

强绑定规则：

- `data-section="submission-center"` 对应 `#section-submission-center`
- `data-section="lifecycle"` 对应 `#section-lifecycle`
- `data-section="analytics"` 对应 `#section-analytics`
- `data-section="operations"` 对应 `#section-operations`
- `data-section="layout"` 对应 `#section-layout`
- `data-section="rules"` 对应 `#section-rules`
- `data-section="employee-submit"` 对应 `#section-employee-submit`
- `data-section="employee-history"` 对应 `#section-employee-history`

如果你要重做样式，按钮外观、图标、激活态、层级结构都可以变，但：

- `data-section` 值不要改
- `.sidebar-item` 选择器最好保留
- 右侧 `content-section` 的 `id` 规则不要改

### 5.4 管理员右侧内容模块

#### A. 数据提交

内容：

- KPI 区：`#kpi-grid`
- 最新员工提交：`#submission-feed`
- 提交概览：`#submission-stats`

作用：

- 让管理员第一时间看到最近的员工提交
- 在同一屏完成审核入口

#### B. 生命周期

内容：

- 生命周期列表：`#lifecycle-rail`
- 阶段占比：`#stage-ring`

#### C. 趋势分析

内容：

- OEE 趋势图：`#trend-chart`
- 趋势摘要卡片：`#trend-highlights`
- 停机原因堆叠条：`#cause-stack`
- 停机原因明细：`#cause-list`

#### D. 设备看板

内容：

- 生命周期筛选：`#stage-filters`
- 设备卡片网格：`#equipment-grid`
- TOP 问题设备：`#risk-list`
- 关键备件：`#spare-list`

#### E. 布局示意

内容：

- 产线布局图：`#layout-map`
- 资料与布局完备性：`#readiness-grid`
- 缺口项列表：`#gap-list`

#### F. 风险规则

内容：

- 风险规则卡片：`#rule-grid`

### 5.5 员工右侧内容模块

#### A. 数据提交

内容：

- 设备选择：`#submission-equipment`
- 提交类型：`#change-type`
- 数量变化字段：`#quantity-field` / `#quantity-delta`
- 状态更新字段：`#status-field` / `#new-status`
- 备注：`#submission-note`
- 提交反馈：`#submission-feedback`
- 整体表单：`#submission-form`

#### B. 我的记录

内容：

- 提交记录列表：`#employee-submissions`

## 6. 当前交互逻辑

### 6.1 登录交互

相关逻辑：

- `handleLoginSubmit`
- `updateShellForRole`
- `restoreSession`

行为：

- 登录成功后根据角色切换管理员 / 员工界面
- 页面标题和主按钮文案随角色变化

### 6.2 侧边栏切换

相关逻辑：

- `switchAdminSection`
- `switchEmployeeSection`

行为：

- 点击左侧菜单项后，激活当前菜单
- 右侧只展示对应的 `.content-section`

### 6.3 员工提交流

相关逻辑：

- `updateFormByChangeType`
- `handleSubmissionFormSubmit`

行为：

- 根据提交类型动态显示不同字段
- 提交成功后刷新“我的记录”

### 6.4 管理员审核流

相关逻辑：

- `handleAdminSubmissionActions`

行为：

- 在“最新员工提交”区域点击通过 / 驳回
- 触发真实 API 调用
- 审核成功后刷新驾驶舱数据

## 7. 前端样式重设计时可自由调整的内容

以下内容可以放心重做：

- 色彩系统
- 字体和字号体系
- 间距和栅格
- 卡片样式
- 登录页视觉形式
- 顶栏高度和排版
- 侧边栏样式、图标、层级感
- 图表容器风格
- 空状态、错误态、反馈态
- 按钮、表单、标签、徽标的视觉风格

## 8. 不建议随意改动的内容

为了避免改样式时把交互打断，以下内容建议保留：

### 8.1 关键 ID

- 登录相关：
  `#auth-screen`
  `#login-form`
  `#login-username`
  `#login-password`
  `#auth-hint`
  `#auth-error`

- 账号与头部：
  `#page-title`
  `#role-pill`
  `#account-name`
  `#logout-btn`
  `#hero-heading`
  `#hero-primary-action`

- 管理员模块：
  `#submission-feed`
  `#submission-stats`
  `#kpi-grid`
  `#lifecycle-rail`
  `#stage-ring`
  `#trend-chart`
  `#trend-highlights`
  `#cause-stack`
  `#cause-list`
  `#stage-filters`
  `#equipment-grid`
  `#risk-list`
  `#spare-list`
  `#layout-map`
  `#readiness-grid`
  `#gap-list`
  `#rule-grid`

- 员工模块：
  `#submission-form`
  `#submission-equipment`
  `#change-type`
  `#quantity-field`
  `#quantity-delta`
  `#status-field`
  `#new-status`
  `#submission-note`
  `#submission-feedback`
  `#employee-submissions`

### 8.2 关键 class

- `.sidebar-item`
- `.content-section`
- `.hidden`

### 8.3 关键映射规则

- 左侧 `data-section` 和右侧 `#section-*` 必须一一对应
- 如果你重构 HTML 结构，至少要保留这套映射关系

## 9. API 依赖点

当前前端直接调用以下后端接口：

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/dashboard`
- `GET /api/equipment`
- `GET /api/submissions`
- `GET /api/submissions?scope=mine`
- `POST /api/submissions`
- `PATCH /api/submissions/:id`

样式重做时不需要改这些接口，但如果你改动了交互流程，需要同步检查：

- 登录入口是否还触发 `#login-form`
- 提交按钮是否还提交 `#submission-form`
- 审核按钮是否仍保留 `data-action` 和 `data-id`

## 10. 推荐的重设计方式

建议按下面的顺序做：

1. 先只改 `styles.css`，不改 DOM 结构
2. 如果必须调整 DOM，优先保留已有 `id`、`class` 和 `data-section`
3. 先验证登录
4. 再验证员工提交
5. 最后验证管理员审核和侧边栏切换

## 11. 如果需要进一步拆分

如果你后面想把界面做得更规范，建议进一步拆成：

- `auth-login`
- `app-header`
- `sidebar-nav`
- `dashboard-kpi`
- `submission-list`
- `chart-panel`
- `equipment-card-grid`
- `employee-form-panel`

也就是把当前单文件页面逐步组件化，但在当前阶段，不是必须。
