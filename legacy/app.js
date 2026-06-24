const STORAGE_KEY = "bosch-api-auth-v1";
const LANGUAGE_STORAGE_KEY = "bosch-ui-language-v1";
const WORKER_ONLY_MODE = true;
const BOSCH_I18N = window.BoschI18n || { defaultLanguage: "zh", languages: {} };
const SUPPORTED_LANGUAGES = Object.keys(BOSCH_I18N.languages || {});
const stageOrder = ["引入", "安装", "量产", "维护", "升级", "退役"];

const stageDescriptions = {
  引入: "设备选型、预算与资料准备阶段，关注导入节奏与基础资料完备度。",
  安装: "设备安装调试与 layout 校核阶段，关注交付进度与上线准备度。",
  量产: "设备稳定生产阶段，关注 OEE、停机损失与节拍兑现。",
  维护: "设备保养与异常修复阶段，关注 PM 执行与恢复效率。",
  升级: "设备改造与能力提升阶段，关注实施进度与收益窗口。",
  退役: "设备替换或淘汰评估阶段，关注替换优先级与风险控制。",
};

const changeTypeLabels = {
  equipment_quantity: "设备数量变化",
  status_update: "设备状态更新",
  spare_update: "备件库存变化",
  document_update: "图纸 / Layout 更新",
  issue_note: "异常备注",
};

const roleLabels = {
  admin: "管理员",
  editor: "编辑账号",
  viewer: "只读账号",
};

const heroConfigs = {
  admin: {
    "submission-center": {
      kicker: "Admin Console",
      title: "Plant Overview",
      subtitle: "Real-time metrics for Hangzhou drill assembly and test line.",
      primaryLabel: "查看问题设备",
      primaryAction: "goto-operations",
      secondaryLabel: "导出概览",
      secondaryAction: "export-submission-center",
      pageTitle: "设备管理系统",
    },
    "worker-performance": {
      kicker: "Worker Performance",
      title: "月度员工绩效汇总",
      subtitle: "基于 Excel 汇总数据展示出勤、接单、维修工时、平均维修效率和班组对比。",
      primaryLabel: "查看班组对比",
      primaryAction: "focus-worker-shifts",
      secondaryLabel: "导出绩效数据",
      secondaryAction: "export-worker-performance",
      pageTitle: "员工绩效管理",
    },
    lifecycle: {
      kicker: "Lifecycle",
      title: "设备生命周期总览",
      subtitle: "统一查看设备从引入到退役的阶段分布与资料准备度。",
      primaryLabel: "前往布局示意",
      primaryAction: "goto-layout",
      secondaryLabel: "导出阶段数据",
      secondaryAction: "export-lifecycle",
      pageTitle: "设备生命周期总览",
    },
    analytics: {
      kicker: "Analytics",
      title: "Trend Analytics & Performance Deep-dive",
      subtitle: "Real-time efficiency metrics and historical trend analysis.",
      primaryLabel: "导出趋势",
      primaryAction: "export-analytics",
      secondaryLabel: "查看问题设备",
      secondaryAction: "goto-operations",
      pageTitle: "趋势分析",
    },
    operations: {
      kicker: "Assets",
      title: "Equipment Status",
      subtitle: "Real-time monitoring and asset health overview.",
      primaryLabel: "聚焦维护设备",
      primaryAction: "filter-maintenance",
      secondaryLabel: "导出设备清单",
      secondaryAction: "export-operations",
      pageTitle: "设备看板",
    },
    layout: {
      kicker: "Layout",
      title: "产线布局与资料完备性",
      subtitle: "同步查看工位流向、资料缺口与 layout 绑定状态。",
      primaryLabel: "查看风险规则",
      primaryAction: "goto-rules",
      secondaryLabel: "导出布局",
      secondaryAction: "export-layout",
      pageTitle: "布局示意",
    },
    rules: {
      kicker: "Rules",
      title: "红黄绿风险规则",
      subtitle: "通过 OEE、资料、备件与保养窗口统一判定设备风险级别。",
      primaryLabel: "返回设备看板",
      primaryAction: "goto-operations",
      secondaryLabel: "导出规则",
      secondaryAction: "export-rules",
      pageTitle: "风险规则",
    },
    predictive: {
      kicker: "Predictive Maintenance",
      title: "预测性维护建议",
      subtitle: "结合关键指标、故障趋势与阈值规则，提前识别维护优先级。",
      primaryLabel: "返回设备看板",
      primaryAction: "goto-operations",
      secondaryLabel: "导出建议",
      secondaryAction: "export-predictive",
      pageTitle: "预测性维护",
    },
    accounts: {
      kicker: "Access Control",
      title: "账户与权限管理",
      subtitle: "管理员可创建普通账号，并在编辑 / 只读权限之间切换。",
      primaryLabel: "查看审计日志",
      primaryAction: "goto-audit",
      secondaryLabel: "",
      secondaryAction: "",
      pageTitle: "账户与权限管理",
    },
    audit: {
      kicker: "Audit Trail",
      title: "提交与修改审计日志",
      subtitle: "记录建号、改权限、提交、审核与落库修改，形成完整留痕链路。",
      primaryLabel: "返回账户管理",
      primaryAction: "goto-accounts",
      secondaryLabel: "",
      secondaryAction: "",
      pageTitle: "审计日志",
    },
  },
  employee: {
    "employee-overview": {
      kicker: "Workspace",
      title: "普通账号设备总览",
      subtitle: "查看设备状态、资料完备性与当前风险分布。",
      primaryLabel: "返回总览",
      primaryAction: "goto-overview",
      secondaryLabel: "",
      secondaryAction: "",
      pageTitle: "普通账号设备总览",
    },
    "employee-submit": {
      kicker: "Editor Workspace",
      title: "编辑账号数据提报工作台",
      subtitle: "提交设备、备件、图纸与现场异常变化，进入管理员审核队列。",
      primaryLabel: "查看我的记录",
      primaryAction: "goto-history",
      secondaryLabel: "",
      secondaryAction: "",
      pageTitle: "编辑账号数据提报工作台",
    },
    "employee-history": {
      kicker: "Workspace",
      title: "我的提交记录",
      subtitle: "查看当前账号的历史提交、审核状态与变更明细。",
      primaryLabel: "继续提交",
      primaryAction: "goto-submit",
      secondaryLabel: "",
      secondaryAction: "",
      pageTitle: "我的提交记录",
    },
  },
};

const ORDINARY_SECTIONS = {
  editor: ["employee-overview", "employee-submit", "employee-history"],
  viewer: ["employee-overview"],
};

const CLIENT_DEFAULT_RISK_RULES = [
  {
    level: "high",
    title: "红色",
    summary: "需要立即关注的设备与风险项",
    thresholds: {
      oeeMax: 70,
      tLossMin: 16,
      mtbfMin: 150,
      mttrMax: 6,
      responseHoursMax: 2.5,
    },
  },
  {
    level: "medium",
    title: "黄色",
    summary: "需要持续跟踪和提前处理的风险项",
    thresholds: {
      oeeMax: 85,
      tLossMin: 10,
      mtbfMin: 220,
      mttrMax: 4,
      responseHoursMax: 1.5,
    },
  },
  {
    level: "low",
    title: "绿色",
    summary: "运行与资料状态整体稳定",
    thresholds: {},
  },
];

const state = {
  auth: loadStoredAuth(),
  language: loadStoredLanguage(),
  activeStage: "全部",
  activeAdminSection: "submission-center",
  activeEmployeeSection: "employee-overview",
  dashboard: {
    equipment: [],
    spareParts: [],
    trendSeries: [],
    downtimeCauses: [],
    layoutLanes: [],
    riskRules: [],
  },
  submissions: [],
  equipmentOptions: [],
  users: [],
  auditLogs: [],
  workerPerformance: {
    summary: {},
    workers: [],
    topLists: {},
    shiftComparison: [],
    filterOptions: {
      years: [],
      months: [],
      shifts: [],
      employees: [],
      defaultMonth: "",
    },
    detail: null,
    selectedEmployeeKey: "",
    selectedQualityIssue: "",
    tableSort: {
      key: "performanceScore",
      direction: "desc",
    },
    filters: {
      year: "",
      month: "",
      shift: "",
      employeeKey: "",
    },
  },
  ruleFeedback: {
    message: "",
    isError: false,
  },
  search: {
    query: "",
    results: [],
    activeIndex: -1,
    open: false,
  },
};

const $ = (selector) => document.querySelector(selector);
const API_BASE = resolveApiBase();

function resolveApiBase() {
  const configuredBase =
    typeof window !== "undefined" && typeof window.BOSCH_API_BASE === "string"
      ? window.BOSCH_API_BASE.trim()
      : "";

  if (configuredBase) {
    return configuredBase.replace(/\/+$/, "");
  }

  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname || "localhost";
  const port = window.location.port;

  if ((protocol === "http:" || protocol === "https:") && port === "3000") {
    return "";
  }

  if (protocol === "http:" || protocol === "https:") {
    return `${protocol}//${hostname}:3000`;
  }

  return "http://localhost:3000";
}

function getApiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function getLanguageBundle() {
  const fallbackLanguage = BOSCH_I18N.defaultLanguage || "zh";
  return BOSCH_I18N.languages[state.language] || BOSCH_I18N.languages[fallbackLanguage] || {};
}

function getLanguageMeta() {
  const bundle = getLanguageBundle();
  return {
    locale: bundle.locale || "zh-CN",
    htmlLang: bundle.htmlLang || "zh-CN",
  };
}

function getNestedValue(source, path) {
  return path.split(".").reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), source);
}

function t(path, params = {}, fallback = "") {
  const template = getNestedValue(getLanguageBundle(), path);
  const resolved = typeof template === "string" ? template : fallback || path;
  return resolved.replace(/\{(\w+)\}/g, (match, key) => (params[key] !== undefined ? params[key] : ""));
}

function loadStoredLanguage() {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw && SUPPORTED_LANGUAGES.includes(raw)) {
      return raw;
    }
  } catch {
    return BOSCH_I18N.defaultLanguage || "zh";
  }
  return BOSCH_I18N.defaultLanguage || "zh";
}

function saveStoredLanguage(language) {
  state.language = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures in privacy-restricted environments.
  }
}

function stageKey(stage) {
  return {
    引入: "introduction",
    安装: "installation",
    量产: "massProduction",
    维护: "maintenance",
    升级: "upgrade",
    退役: "retirement",
  }[stage] || "introduction";
}

function getStageLabel(stage) {
  return t(`stages.${stageKey(stage)}`, {}, stage);
}

function getStageDescription(stage) {
  return t(`stageDescriptions.${stageKey(stage)}`, {}, stageDescriptions[stage] || stage);
}

function getChangeTypeLabel(type) {
  return t(`changeTypes.${type}`, {}, changeTypeLabels[type] || type);
}

function getRoleLabel(role) {
  return t(`roles.${role}`, {}, roleLabels[role] || role);
}

function getReviewStatusLabel(status) {
  const key = (BOSCH_I18N.reviewStatusKeys || {})[status];
  return key ? t(`reviewStatus.${key}`, {}, status) : status;
}

function localizeMappedValue(rawValue, path, keyMap) {
  const mappedKey = keyMap ? keyMap[rawValue] : null;
  return mappedKey ? t(`${path}.${mappedKey}`, {}, rawValue) : rawValue;
}

function getRiskLabel(level) {
  return t(`risk.${level}`, {}, level);
}

function getStatusTagLabel(status) {
  return t(`statusTags.${status}`, {}, status);
}

function getDrawingStatusLabel(status) {
  return localizeMappedValue(status, "drawingStatus", BOSCH_I18N.drawingStatusKeys || {});
}

function getLayoutStatusLabel(status) {
  return localizeMappedValue(status, "layoutStatus", BOSCH_I18N.layoutStatusKeys || {});
}

function getLocalizedDataValue(group, key, fallback = "") {
  const value = getNestedValue(getLanguageBundle(), `data.${group}.${key}`);
  return typeof value === "string" ? value : fallback || key;
}

function getEquipmentName(item) {
  return getLocalizedDataValue("equipmentNames", item.id, item.name);
}

function getSubmissionEquipmentName(item) {
  if (item.equipmentId) {
    return getLocalizedDataValue("equipmentNames", item.equipmentId, item.equipmentName);
  }
  return item.equipmentName;
}

function getStationName(value) {
  return getLocalizedDataValue("stationNames", value, value);
}

function getSparePartName(value) {
  return getLocalizedDataValue("sparePartNames", value, value);
}

function getDowntimeCauseName(value) {
  return getLocalizedDataValue("downtimeCauses", value, value);
}

function getLaneName(value) {
  return getLocalizedDataValue("laneNames", value, value);
}

function getLayoutStationName(value) {
  return getLocalizedDataValue("layoutStationNames", value, value);
}

function getLayoutMetaLabel(value) {
  return getLocalizedDataValue("layoutMeta", value, value);
}

function getRiskHitLabel(value) {
  return getLocalizedDataValue("riskHits", value, value);
}

function getCurrentHeroConfig(role, section) {
  const fallback = role === "admin" ? heroConfigs.admin[section] || {} : heroConfigs.employee[section] || {};
  const translated = getNestedValue(getLanguageBundle(), `hero.${role}.${section}`) || {};
  return {
    ...fallback,
    ...translated,
  };
}

function normalizeRiskRuleForUI(rule, fallback) {
  const source = rule && typeof rule === "object" ? rule : {};
  const thresholds = source.thresholds && typeof source.thresholds === "object" ? source.thresholds : {};

  return {
    level: fallback.level,
    title: typeof source.title === "string" && source.title.trim() ? source.title : fallback.title,
    summary: typeof source.summary === "string" && source.summary.trim() ? source.summary : fallback.summary,
    thresholds:
      fallback.level === "low"
        ? {}
        : {
            oeeMax: Number.isFinite(Number(thresholds.oeeMax)) ? Number(thresholds.oeeMax) : fallback.thresholds.oeeMax,
            tLossMin: Number.isFinite(Number(thresholds.tLossMin)) ? Number(thresholds.tLossMin) : fallback.thresholds.tLossMin,
            mtbfMin: Number.isFinite(Number(thresholds.mtbfMin)) ? Number(thresholds.mtbfMin) : fallback.thresholds.mtbfMin,
            mttrMax: Number.isFinite(Number(thresholds.mttrMax)) ? Number(thresholds.mttrMax) : fallback.thresholds.mttrMax,
            responseHoursMax: Number.isFinite(Number(thresholds.responseHoursMax))
              ? Number(thresholds.responseHoursMax)
              : fallback.thresholds.responseHoursMax,
          },
  };
}

function getNormalizedRiskRules() {
  const currentRules = Array.isArray(state.dashboard.riskRules) ? state.dashboard.riskRules : [];
  return CLIENT_DEFAULT_RISK_RULES.map((fallback) =>
    normalizeRiskRuleForUI(currentRules.find((item) => item.level === fallback.level), fallback)
  );
}

function getRiskRuleByLevel(level) {
  return getNormalizedRiskRules().find((item) => item.level === level) || null;
}

function getRuleThreshold(level, field) {
  const rule = getRiskRuleByLevel(level);
  if (rule && rule.thresholds && Number.isFinite(Number(rule.thresholds[field]))) {
    return Number(rule.thresholds[field]);
  }

  const fallback = CLIENT_DEFAULT_RISK_RULES.find((item) => item.level === level);
  if (fallback && fallback.thresholds && Number.isFinite(Number(fallback.thresholds[field]))) {
    return Number(fallback.thresholds[field]);
  }

  return "";
}

function getRiskLevelCount(level) {
  return getEquipment().filter((item) => item.riskLevel === level).length;
}

function getRuleDescriptionLines(rule) {
  if (!rule) {
    return [];
  }

  if (rule.level === "high") {
    return [
      `OEE <= ${rule.thresholds.oeeMax}%`,
      `T-loss >= ${rule.thresholds.tLossMin} h`,
      `MTBF <= ${rule.thresholds.mtbfMin} h`,
      `MTTR >= ${rule.thresholds.mttrMax} h`,
      `维修响应时间 >= ${rule.thresholds.responseHoursMax} h`,
      "关键备件高风险或设备状态严重",
    ];
  }

  if (rule.level === "medium") {
    return [
      `OEE <= ${rule.thresholds.oeeMax}%`,
      `T-loss >= ${rule.thresholds.tLossMin} h`,
      `MTBF <= ${rule.thresholds.mtbfMin} h`,
      `MTTR >= ${rule.thresholds.mttrMax} h`,
      `维修响应时间 >= ${rule.thresholds.responseHoursMax} h`,
      "图纸 / Layout 不完整或设备状态预警",
    ];
  }

  const mediumRule = getRiskRuleByLevel("medium");
  return [
    mediumRule ? `OEE > ${mediumRule.thresholds.oeeMax}%` : "OEE 达标",
    mediumRule ? `T-loss < ${mediumRule.thresholds.tLossMin} h` : "T-loss 受控",
    mediumRule ? `MTBF > ${mediumRule.thresholds.mtbfMin} h` : "MTBF 良好",
    mediumRule ? `MTTR < ${mediumRule.thresholds.mttrMax} h` : "MTTR 可控",
    mediumRule ? `维修响应时间 < ${mediumRule.thresholds.responseHoursMax} h` : "维修响应时间正常",
    "资料、Layout 与备件状态整体稳定",
  ];
}

function getAuditActionLabel(action) {
  return t(`auditActions.${action}`, {}, action);
}

function getTargetTypeLabel(type) {
  return t(`targetTypes.${type}`, {}, type);
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function setTextAll(selector, values) {
  const nodes = [...document.querySelectorAll(selector)];
  nodes.forEach((node, index) => {
    if (Array.isArray(values)) {
      node.textContent = values[index] !== undefined ? values[index] : values[values.length - 1] || "";
    } else {
      node.textContent = values;
    }
  });
}

function setPlaceholder(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.placeholder = value;
  }
}

function setAriaLabel(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute("aria-label", value);
  }
}

function updateLanguageSwitchButtons() {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.language);
  });
}

function applyStaticTranslations() {
  document.title = t("meta.title");
  document.documentElement.lang = getLanguageMeta().htmlLang;

  setText(".auth-brand-copy strong", t("auth.brandTitle"));
  setText(".auth-brand-copy p", t("auth.brandSubtitle"));
  setText(".auth-copy h1", t("auth.loginTitle"));
  setText(".auth-copy p", t("auth.loginSubtitle"));
  setText("#login-form .form-field:nth-of-type(1) > span", t("auth.usernameLabel"));
  setText("#login-form .form-field:nth-of-type(2) > span", t("auth.passwordLabel"));
  setPlaceholder("#login-username", t("auth.usernamePlaceholder"));
  setPlaceholder("#login-password", t("auth.passwordPlaceholder"));
  setText(".checkbox-field span", t("auth.rememberDevice"));
  setText("#login-form .link-btn", t("auth.forgotPassword"));
  setText(".auth-submit", t("auth.loginButton"));
  setText(".auth-footer", t("auth.footer"));
  setText(".auth-status-row strong", t("auth.systemStatus"));
  setText(".auth-status-card p", t("auth.systemStatusDetail"));
  setText(".brand-kicker", t("common.siteKicker"));
  setText("#page-title", t("meta.title"));
  setPlaceholder("#global-search-input", t("common.searchPlaceholder"));
  setAriaLabel("#global-search-input", t("common.searchAria"));
  setAriaLabel("#topbar-notifications-btn", t("common.notifications"));
  setAriaLabel("#topbar-settings-btn", t("common.settings"));
  setAriaLabel("#topbar-help-btn", t("common.help"));
  setAriaLabel("#logout-btn", t("common.logout"));

  setText('#admin-sidebar [data-section="submission-center"] span', t("nav.submissionCenter"));
  setText('#admin-sidebar [data-section="lifecycle"] span', t("nav.lifecycle"));
  setText('#admin-sidebar [data-section="analytics"] span', t("nav.analytics"));
  setText('#admin-sidebar [data-section="operations"] span', t("nav.operations"));
  setText('#admin-sidebar [data-section="layout"] span', t("nav.layout"));
  setText('#admin-sidebar [data-section="rules"] span', t("nav.rules"));
  setText('#admin-sidebar [data-section="predictive"] span', t("nav.predictive"));
  setText('#admin-sidebar [data-section="accounts"] span', t("nav.accounts"));
  setText('#admin-sidebar [data-section="audit"] span', t("nav.audit"));
  setText('#employee-sidebar [data-section="employee-overview"] span', t("nav.overview"));
  setText('#employee-sidebar [data-section="employee-submit"] span', t("nav.submit"));
  setText('#employee-sidebar [data-section="employee-history"] span', t("nav.history"));
  setTextAll("#admin-view .sidebar-brand-copy span", t("nav.managementSystem"));
  setTextAll("#employee-view .sidebar-brand-copy span", t("nav.workspaceConsole"));
  setTextAll(".sidebar-utility span", t("common.support"));
  document.querySelector("#kpi-grid") && document.querySelector("#kpi-grid").setAttribute("aria-label", t("sections.kpisAria"));

  setText("#section-submission-center .table-panel .section-head h2", t("sections.latestSubmissions"));
  setText("#section-submission-center .table-panel .section-head p", t("sections.latestSubmissionsSubtitle"));
  setText("#section-submission-center .table-panel .section-link", t("sections.viewAll"));
  setText("#section-submission-center .summary-panel .section-head h2", t("sections.submissionOverview"));
  setText("#section-lifecycle .section-head h2", t("sections.lifecycleOverview"));
  setText("#section-lifecycle .section-head p", t("sections.lifecycleOverviewSubtitle"));
  setText("#section-lifecycle .mini-title", t("sections.stageDistribution"));
  setText("#section-analytics .chart-panel-primary .section-head h2", t("sections.trendAnalysis"));
  setTextAll("#section-analytics .chart-panel-primary .chart-legend-inline span", [t("sections.actualOEE"), t("sections.target90")]);
  setText("#section-analytics .analytics-main-grid article:nth-of-type(2) .section-head h2", t("sections.downtimeBreakdown"));
  setText("#section-analytics > article.panel .section-head h2", t("sections.shiftComparison"));
  setText("#section-analytics .table-panel .section-head h2", t("sections.efficiencyLossLog"));
  setText("#section-analytics .table-panel .section-link", t("sections.viewFullLog"));
  setText("#section-operations .equipment-panel .section-head h2", t("sections.activeMachinery"));
  setText("#section-operations .equipment-panel .section-head p", t("sections.activeMachinerySubtitle"));
  setText("#section-operations .side-stack article:nth-of-type(1) .section-head h2", t("sections.highRiskItems"));
  setText("#section-operations .side-stack article:nth-of-type(2) .section-head h2", t("sections.criticalSpares"));
  setText("#section-layout article:nth-of-type(1) .section-head h2", t("sections.layoutTitle"));
  setText("#section-layout article:nth-of-type(1) .section-head p", t("sections.layoutSubtitle"));
  setText("#section-layout article:nth-of-type(2) .section-head h2", t("sections.readinessTitle"));
  setText("#section-rules .section-head h2", t("sections.rulesTitle"));
  setText("#section-rules .section-head p", t("sections.rulesSubtitle"));
  setText("#section-predictive > .predictive-layout > article .section-head h2", t("sections.predictiveTitle"));
  setText("#section-predictive > .predictive-layout > article .section-head p", t("sections.predictiveSubtitle"));
  setText("#section-predictive .side-stack article:nth-of-type(1) .section-head h2", t("sections.predictiveMethodTitle"));
  setText("#section-predictive .side-stack article:nth-of-type(2) .section-head h2", t("sections.predictivePreparationTitle"));
  setText("#section-predictive > .table-panel .section-head h2", t("sections.predictiveTableTitle"));
  setText("#section-predictive > .table-panel .section-head p", t("sections.predictiveTableSubtitle"));
  setText("#section-accounts article:nth-of-type(1) .section-head h2", t("sections.createAccountTitle"));
  setText("#section-accounts article:nth-of-type(1) .section-head p", t("sections.createAccountSubtitle"));
  setText("#section-accounts article:nth-of-type(2) .section-head h2", t("sections.accountListTitle"));
  setText("#section-accounts article:nth-of-type(2) .section-head p", t("sections.accountListSubtitle"));
  setText("#section-audit .section-head h2", t("sections.auditTitle"));
  setText("#section-audit .section-head p", t("sections.auditSubtitle"));
  setText("#section-employee-overview .section-head h2", t("sections.overviewTitle"));
  setText("#section-employee-overview .section-head p", t("sections.overviewSubtitle"));
  setText("#section-employee-submit .section-head h2", t("sections.submitTitle"));
  setText("#section-employee-submit .section-head p", t("sections.submitSubtitle"));
  setText("#section-employee-history .section-head h2", t("sections.historyTitle"));

  setText('#user-create-form label[for="account-display-name"] span', t("sections.nameLabel"));
  setText('#user-create-form label[for="account-username"] span', t("sections.usernameLabel"));
  setText('#user-create-form label[for="account-password"] span', t("sections.initialPasswordLabel"));
  setText('#user-create-form label[for="account-role"] span', t("sections.accountRoleLabel"));
  setPlaceholder("#account-display-name", t("sections.namePlaceholder"));
  setPlaceholder("#account-username", t("sections.usernamePlaceholder"));
  setPlaceholder("#account-password", t("sections.initialPasswordPlaceholder"));
  setText("#section-accounts .form-actions .primary-btn", t("sections.createAccountButton"));

  setText('#section-employee-submit label[for="submission-equipment"] span', t("sections.equipmentStationLabel"));
  setText('#section-employee-submit label[for="change-type"] span', t("sections.submissionTypeLabel"));
  setText('#section-employee-submit label[for="quantity-delta"] span', t("sections.quantityLabel"));
  setText('#section-employee-submit label[for="new-status"] span', t("sections.newStatusLabel"));
  setText('#section-employee-submit label[for="submission-note"] span', t("sections.noteLabel"));
  setPlaceholder("#quantity-delta", t("sections.quantityPlaceholder"));
  setPlaceholder("#submission-note", t("sections.notePlaceholder"));
  setText("#submission-form .form-actions .primary-btn", t("sections.submitButton"));

  setText('#change-type option[value="equipment_quantity"]', getChangeTypeLabel("equipment_quantity"));
  setText('#change-type option[value="status_update"]', getChangeTypeLabel("status_update"));
  setText('#change-type option[value="spare_update"]', getChangeTypeLabel("spare_update"));
  setText('#change-type option[value="document_update"]', getChangeTypeLabel("document_update"));
  setText('#change-type option[value="issue_note"]', getChangeTypeLabel("issue_note"));
  setText('#new-status option[value=""]', state.language === "zh" ? "请选择" : state.language === "de" ? "Bitte wählen" : "Please select");
  setText('#new-status option[value="stable"]', t("statuses.stable"));
  setText('#new-status option[value="warning"]', t("statuses.warning"));
  setText('#new-status option[value="critical"]', t("statuses.critical"));
  setText('#new-status option[value="upgrade"]', t("statuses.upgrade"));
  setText('#account-role option[value="editor"]', getRoleLabel("editor"));
  setText('#account-role option[value="viewer"]', getRoleLabel("viewer"));
}

function rerenderLocalizedViews() {
  applyStaticTranslations();
  updateLanguageSwitchButtons();
  updateAuthHint();

  if (!state.auth || !state.auth.user) {
    renderSearchResults();
    return;
  }

  if ($("#role-pill")) {
    $("#role-pill").textContent = getRoleLabel(state.auth.user.role);
  }

  syncChrome();
  renderSearchAwareViews();
  renderSearchResults();
}

function applyLanguage(language, persist = true) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return;
  }

  if (persist) {
    saveStoredLanguage(language);
  } else {
    state.language = language;
  }

  refreshSearchResults(false);
  rerenderLocalizedViews();
}

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredAuth(auth) {
  state.auth = auth;
  try {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures in privacy-restricted environments.
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.auth && state.auth.token) {
    headers.Authorization = `Bearer ${state.auth.token}`;
  }

  let response;
  try {
    response = await fetch(getApiUrl(path), {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(t("messages.connectBackend"));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || t("messages.requestFailed"));
  }

  return payload;
}

function percent(value) {
  return `${value.toFixed(1)}%`;
}

function average(items, key) {
  const validItems = items.filter((item) => item[key] > 0);
  if (!validItems.length) {
    return 0;
  }
  return validItems.reduce((sum, item) => sum + item[key], 0) / validItems.length;
}

function sum(items, key) {
  return items.reduce((total, item) => total + (item[key] || 0), 0);
}

function totalAssetCount(items) {
  return items.reduce((total, item) => total + (item.assetCount || 1), 0);
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value));
}

function riskLabel(risk) {
  return getRiskLabel(risk);
}

function statusTagLabel(status) {
  return getStatusTagLabel(status);
}

function reviewClass(status) {
  return {
    待审核: "review-pending",
    已通过: "review-approved",
    已驳回: "review-rejected",
  }[status] || "review-pending";
}

function formatDelta(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleString(getLanguageMeta().locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateTimeText(dateString) {
  if (!dateString) {
    return "--";
  }
  const parsed = new Date(dateString.includes("T") ? dateString : dateString.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }
  return parsed.toLocaleString(getLanguageMeta().locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) {
    return "--";
  }
  if (minutes >= 1440) {
    return `${(minutes / 1440).toFixed(1)} d`;
  }
  if (minutes >= 60) {
    return `${(minutes / 60).toFixed(1)} h`;
  }
  return `${Math.round(minutes)} min`;
}

function formatWorkerNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "0";
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(digits);
}

function formatWorkerRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "0.0%";
  }
  return `${(number * 100).toFixed(1)}%`;
}

function isWorkerRepairExempt(record) {
  return String(record?.shift || "").trim() === "维护组";
}

function getWorkerQualityStats(records) {
  const items = Array.isArray(records) ? records : [];
  return {
    missingAttendanceWithActivity: items.filter(
      (record) =>
        (Number(record.attendanceHours) || 0) <= 0 &&
        ((Number(record.orderCount) || 0) > 0 || (Number(record.repairHours) || 0) > 0)
    ).length,
    activeNoRepair: items.filter(
      (record) =>
        !isWorkerRepairExempt(record) &&
        (Number(record.attendanceHours) || 0) > 0 &&
        (Number(record.orderCount) || 0) <= 0 &&
        (Number(record.repairHours) || 0) <= 0
    ).length,
    highEfficiency: items.filter((record) => (Number(record.repairEfficiency) || 0) > 1).length,
    zeroEfficiencyWithRepair: items.filter(
      (record) => (Number(record.repairHours) || 0) > 0 && (Number(record.repairEfficiency) || 0) <= 0
    ).length,
  };
}

function readinessTone(value) {
  if (value >= 80) return "good";
  if (value >= 60) return "medium";
  return "bad";
}

function submissionDetailSummary(item) {
  const details = [];
  const note = item.note && typeof item.note === "string" ? item.note.trim() : "";

  if (item.quantityDelta !== null && item.quantityDelta !== undefined) {
    details.push(`${t("sections.quantityLabel")} ${item.quantityDelta > 0 ? "+" : ""}${item.quantityDelta}`);
  }

  if (item.newStatus) {
    details.push(`${t("sections.newStatusLabel")} ${t(`statuses.${item.newStatus}`, {}, item.newStatus)}`);
  }

  if (note) {
    details.push(note.length > 24 ? `${note.slice(0, 24)}...` : note);
  }

  return details.join(" · ");
}

function equipmentHealthValue(item) {
  const stageFallback = {
    引入: 22,
    安装: 46,
    量产: 78,
    维护: 64,
    升级: 52,
    退役: 28,
  };
  return item.oee || stageFallback[item.stage] || 0;
}

function getEquipment() {
  return state.dashboard.equipment || state.equipmentOptions || [];
}

function normalizeSearchValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().toLocaleLowerCase();
}

function getSearchQuery() {
  return normalizeSearchValue(state.search.query);
}

function getSearchScore(parts, query) {
  if (!query) {
    return 0;
  }

  return parts
    .map(normalizeSearchValue)
    .filter(Boolean)
    .reduce((maxScore, part) => {
      if (part === query) {
        return Math.max(maxScore, 400);
      }
      if (part.indexOf(query) === 0) {
        return Math.max(maxScore, 300);
      }
      if (part.indexOf(query) >= 0) {
        return Math.max(maxScore, 200);
      }
      return maxScore;
    }, 0);
}

function equipmentSearchParts(item) {
  return [
    item.id,
    item.name,
    getEquipmentName(item),
    item.station,
    getStationName(item.station),
    item.owner,
    item.stage,
    getStageLabel(item.stage),
    item.type,
    item.line,
    item.plant,
    item.status,
    getStatusTagLabel(item.status),
    item.drawingStatus,
    getDrawingStatusLabel(item.drawingStatus),
    item.layoutStatus,
    getLayoutStatusLabel(item.layoutStatus),
    item.riskLevel,
    getRiskLabel(item.riskLevel),
    (item.riskHits || []).join(" "),
    (item.riskHits || []).map(getRiskHitLabel).join(" "),
  ];
}

function submissionSearchParts(item) {
  return [
    item.id,
    item.submitter,
    getSubmissionEquipmentName(item),
    getStationName(item.station),
    item.note,
    item.status,
    getChangeTypeLabel(item.changeType),
  ];
}

function userSearchParts(item) {
  return [item.id, item.username, item.displayName, getRoleLabel(item.role), item.role];
}

function auditSearchParts(item) {
  return [
    item.id,
    item.summary,
    item.action,
    item.actorName,
    item.actorRole,
    item.targetType,
    item.targetId,
  ];
}

function workerSearchParts(item) {
  return [
    item.employeeKey,
    item.employeeName,
    item.shift,
    item.month,
    item.orderCount,
    item.repairHours,
    item.repairEfficiency,
  ];
}

function sparePartSearchParts(item) {
  return [item.name, getSparePartName(item.name), riskLabel(item.riskLevel)];
}

function layoutLaneMatchesQuery(lane, query) {
  if (getSearchScore([lane.name, lane.note], query) > 0) {
    return true;
  }
  return lane.stations.some((station) =>
    getSearchScore([station.code, station.name, station.meta, station.status], query) > 0
  );
}

function filterEquipmentBySearch(items) {
  const query = getSearchQuery();
  if (!query) {
    return items;
  }
  return items.filter((item) => getSearchScore(equipmentSearchParts(item), query) > 0);
}

function getFilteredSubmissions(items) {
  const query = getSearchQuery();
  if (!query) {
    return items;
  }
  return items.filter((item) => getSearchScore(submissionSearchParts(item), query) > 0);
}

function getFilteredUsers(items) {
  const query = getSearchQuery();
  if (!query) {
    return items;
  }
  return items.filter((item) => getSearchScore(userSearchParts(item), query) > 0);
}

function getFilteredAuditLogs(items) {
  const query = getSearchQuery();
  if (!query) {
    return items;
  }
  return items.filter((item) => getSearchScore(auditSearchParts(item), query) > 0);
}

function getFilteredSpareParts(items) {
  const query = getSearchQuery();
  if (!query) {
    return items;
  }
  return items.filter((item) => getSearchScore(sparePartSearchParts(item), query) > 0);
}

function getFilteredLayoutLanes(items) {
  const query = getSearchQuery();
  if (!query) {
    return items;
  }

  return items
    .map((lane) => {
      const laneMatches = getSearchScore([lane.name, lane.note], query) > 0;
      const stations = laneMatches
        ? lane.stations
        : lane.stations.filter(
            (station) => getSearchScore([station.code, station.name, station.meta, station.status], query) > 0
          );

      if (!stations.length && !laneMatches) {
        return null;
      }

      return {
        ...lane,
        stations,
      };
    })
    .filter(Boolean);
}

function buildSearchResults() {
  const query = getSearchQuery();
  if (!query || !state.auth || !state.auth.user) {
    return [];
  }

  const results = [];
  const ordinaryRole = getOrdinaryRole();

  filterEquipmentBySearch(getEquipment())
    .slice(0, 5)
    .forEach((item) => {
      results.push({
        key: `equipment-${item.id}`,
        typeLabel: t("search.types.equipment"),
        title: getEquipmentName(item),
        detail: `${getStationName(item.station)} · ${item.id}`,
        meta: `${getStageLabel(item.stage)} · ${t("labels.ownerPrefix")} ${item.owner}`,
        score: getSearchScore(equipmentSearchParts(item), query),
        action: ordinaryRole ? "employee-overview" : "operations",
      });
    });

  getFilteredSubmissions(state.submissions)
    .slice(0, 5)
    .forEach((item) => {
      results.push({
        key: `submission-${item.id}`,
        typeLabel: t("search.types.submission"),
        title: `${getChangeTypeLabel(item.changeType)} · ${item.id}`,
        detail: `${getSubmissionEquipmentName(item)} · ${getStationName(item.station)}`,
        meta: `${item.submitter} · ${getReviewStatusLabel(item.status)}`,
        score: getSearchScore(submissionSearchParts(item), query),
        action: ordinaryRole ? "employee-history" : "submission-center",
      });
    });

  if (!ordinaryRole) {
    (state.workerPerformance.workers || [])
      .filter((item) => getSearchScore(workerSearchParts(item), query) > 0)
      .slice(0, 3)
      .forEach((item) => {
        results.push({
          key: `worker-${item.employeeKey}`,
          typeLabel: "员工绩效",
          title: item.employeeName,
          detail: `${item.shift} · ${formatWorkerNumber(item.orderCount)} 单 · ${formatWorkerNumber(item.repairHours)} h`,
          meta: `维修效率 ${formatWorkerRate(item.repairEfficiency)} · 接单效率 ${formatWorkerNumber(item.orderEfficiency, 2)} 单/h`,
          score: getSearchScore(workerSearchParts(item), query),
          action: "worker-performance",
        });
      });

    getFilteredUsers(state.users)
      .slice(0, 3)
      .forEach((item) => {
        results.push({
          key: `user-${item.id}`,
          typeLabel: t("search.types.user"),
          title: item.displayName,
          detail: `${item.username} · ${getRoleLabel(item.role)}`,
          meta: t("common.createdAt", { time: formatTime(item.createdAt) }),
          score: getSearchScore(userSearchParts(item), query),
          action: "accounts",
        });
      });

    getFilteredAuditLogs(state.auditLogs)
      .slice(0, 3)
      .forEach((item) => {
        results.push({
          key: `audit-${item.id}`,
          typeLabel: t("search.types.audit"),
          title: item.summary,
          detail: `${getTargetTypeLabel(item.targetType)} · ${item.targetId}`,
          meta: `${item.actorName} · ${formatTime(item.createdAt)}`,
          score: getSearchScore(auditSearchParts(item), query),
          action: "audit",
        });
      });
  }

  return results.sort((left, right) => right.score - left.score).slice(0, 8);
}

function renderSearchResults() {
  const container = $("#global-search-results");
  const shell = container ? container.closest(".search-shell") : null;
  const query = getSearchQuery();
  const isVisible = Boolean(query) && state.search.open;

  if (!container || !shell) {
    return;
  }

  shell.classList.toggle("active", isVisible);
  container.classList.toggle("hidden", !isVisible);

  if (!isVisible) {
    container.innerHTML = "";
    return;
  }

  if (!state.search.results.length) {
    container.innerHTML = `
      <div class="search-results-grid">
        <div class="search-result-empty">${t("common.noSearchResults", { query: state.search.query.trim() })}</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="search-results-grid">
      ${state.search.results
        .map(
          (item, index) => `
            <button
              class="search-result-item ${index === state.search.activeIndex ? "active" : ""}"
              type="button"
              data-search-index="${index}"
            >
              <div class="search-result-head">
                <strong class="search-result-title">${item.title}</strong>
                <span class="search-result-type">${item.typeLabel}</span>
              </div>
              <div class="search-result-detail">${item.detail}</div>
              <div class="search-result-meta">${item.meta}</div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function refreshSearchResults(resetActiveIndex = true) {
  state.search.results = buildSearchResults();
  if (resetActiveIndex) {
    state.search.activeIndex = state.search.results.length ? 0 : -1;
  } else if (state.search.activeIndex < 0 || state.search.activeIndex >= state.search.results.length) {
    state.search.activeIndex = state.search.results.length ? 0 : -1;
  }
  renderSearchResults();
}

function closeSearchResults() {
  state.search.open = false;
  state.search.activeIndex = -1;
  renderSearchResults();
}

function renderSearchAwareViews() {
  if (WORKER_ONLY_MODE) {
    renderWorkerPerformance();
    return;
  }

  if (!state.auth || !state.auth.user) {
    return;
  }

  if (state.auth.user.role === "admin") {
    renderAdminDashboard();
    return;
  }

  renderEmployeeOverview();
  renderEquipmentOptions();
  renderEmployeeSubmissions();
}

function getSearchEmptyMessage(defaultMessage, label) {
  const query = state.search.query.trim();
  if (!getSearchQuery()) {
    return defaultMessage;
  }
  return t("messages.searchNotFound", { query, label });
}

function getOrdinaryRole() {
  if (!state.auth || !state.auth.user || state.auth.user.role === "admin") {
    return null;
  }
  return state.auth.user.role;
}

function getAvailableEmployeeSections() {
  const ordinaryRole = getOrdinaryRole();
  return ORDINARY_SECTIONS[ordinaryRole] || ["employee-overview"];
}

function ensureEmployeeSectionAccess(section) {
  const availableSections = getAvailableEmployeeSections();
  if (availableSections.includes(section)) {
    return section;
  }
  return availableSections[0];
}

function renderKpiCards(containerSelector, items) {
  $(containerSelector).innerHTML = items
    .map(
      (kpi) => `
        <article class="kpi-card kpi-${kpi.accent}">
          <div class="kpi-card-head">
            <span>${kpi.label}</span>
            <strong class="kpi-badge">${kpi.badge}</strong>
          </div>
          <div class="kpi-value">${kpi.value}</div>
          <div class="kpi-foot">
            <div class="kpi-bar">
              <div class="kpi-fill" style="width: ${clampPercentage(kpi.progress)}%;"></div>
            </div>
            <small>${kpi.note}</small>
          </div>
        </article>
      `
    )
    .join("");
}

function buildEquipmentCards(items) {
  return items
    .map(
      (item) => `
        <article class="equipment-card equipment-card-${item.status}">
          <div class="equipment-head">
            <div>
              <div class="equipment-kicker">${item.stage} · ${item.station}</div>
              <div class="equipment-kicker">${getStageLabel(item.stage)} · ${getStationName(item.station)}</div>
              <div class="card-title">${getEquipmentName(item)}</div>
              <div class="equipment-meta">${item.id} · ${t("labels.ownerPrefix")} ${item.owner} · ${t("labels.quantityPrefix")} ${item.assetCount || 1}</div>
            </div>
            <span class="status-pill status-${item.status}">${statusTagLabel(item.status)}</span>
          </div>

          <div class="equipment-split">
            <div class="equipment-stat">
              <span>${t("labels.oee")}</span>
              <strong>${item.oee ? `${item.oee}%` : t("labels.notInProduction")}</strong>
            </div>
            <div class="equipment-stat">
              <span>${t("labels.tLoss")}</span>
              <strong>${Number.isFinite(item.downtimeHours) ? `${item.downtimeHours.toFixed(1)} h` : "--"}</strong>
            </div>
            <div class="equipment-stat">
              <span>${t("labels.mtbf")}</span>
              <strong>${item.mtbf ? `${item.mtbf} h` : "--"}</strong>
            </div>
            <div class="equipment-stat">
              <span>${t("labels.mttr")}</span>
              <strong>${item.mttr ? `${item.mttr} h` : "--"}</strong>
            </div>
            <div class="equipment-stat">
              <span>${t("labels.responseTime")}</span>
              <strong>${Number.isFinite(item.responseHours) ? `${item.responseHours.toFixed(1)} h` : "--"}</strong>
            </div>
          </div>

          <div class="equipment-alert">
            <strong>${t("labels.documentLayout")}</strong>
            <small>${getDrawingStatusLabel(item.drawingStatus)} · ${getLayoutStatusLabel(item.layoutStatus)}</small>
          </div>

          <div class="equipment-bar-head">
            <span>${t("labels.equipmentHealth")}</span>
            <strong>${equipmentHealthValue(item)}%</strong>
          </div>
          <div class="progress-track equipment-bar">
            <div class="progress-fill risk-${item.riskLevel}" style="width: ${clampPercentage(equipmentHealthValue(item))}%;"></div>
          </div>

          <div class="equipment-tag-row">
            <span class="risk-pill risk-${item.spareRisk}">${t("labels.spare")} ${riskLabel(item.spareRisk)}</span>
            ${(item.riskHits || [])
              .slice(0, 2)
              .map((tag) => `<span class="equipment-tag">${getRiskHitLabel(tag)}</span>`)
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function buildAdminKpis() {
  const equipment = getEquipment();
  const totalAssets = totalAssetCount(equipment);
  const onlineAssets = equipment.filter((item) => item.oee > 0).length;
  const avgOee = Math.round(average(equipment, "oee"));
  const completeness = equipment.length
    ? Math.round(
        (equipment.filter((item) => item.drawingStatus === "完整" && item.layoutStatus === "已绑定").length /
          equipment.length) *
          100
      )
    : 0;
  const redAssets = equipment.filter((item) => item.riskLevel === "high").length;

  return [
    {
      label: t("kpi.totalAssetsLabel"),
      value: String(totalAssets),
      badge: t("kpi.totalAssetsBadge", { rate: equipment.length ? Math.round((onlineAssets / equipment.length) * 100) : 0 }),
      note: t("kpi.totalAssetsNote", { count: onlineAssets }),
      progress: equipment.length ? (onlineAssets / equipment.length) * 100 : 0,
      accent: "blue",
    },
    {
      label: t("kpi.avgOeeLabel"),
      value: `${avgOee}%`,
      badge: t("kpi.avgOeeBadge"),
      note: t("kpi.avgOeeNote"),
      progress: avgOee,
      accent: avgOee >= 90 ? "blue" : "red",
    },
    {
      label: t("kpi.completenessLabel"),
      value: `${completeness}%`,
      badge: t("kpi.completenessBadge", { count: redAssets }),
      note: t("kpi.completenessNote"),
      progress: completeness,
      accent: redAssets > 0 ? "red" : "blue",
    },
  ];
}

function buildAnalyticsKpis() {
  const trend = state.dashboard.trendSeries || [];
  const equipment = getEquipment().filter((item) => item.oee > 0);
  const highRule = getRiskRuleByLevel("high");
  const mediumRule = getRiskRuleByLevel("medium");
  const latest = trend.length ? trend[trend.length - 1] : { oee: 0 };
  const avgTLoss = average(equipment, "downtimeHours");
  const avgMtbf = average(equipment, "mtbf");
  const avgMttr = average(equipment, "mttr");
  const avgResponse = average(equipment, "responseHours");

  const getMetricAccent = (value, medium, high, lowerIsWorse) => {
    if (!Number.isFinite(value)) {
      return "neutral";
    }

    if (lowerIsWorse) {
      if (value <= high) {
        return "red";
      }
      if (value <= medium) {
        return "neutral";
      }
      return "blue";
    }

    if (value >= high) {
      return "red";
    }
    if (value >= medium) {
      return "neutral";
    }
    return "blue";
  };

  const getMetricProgress = (accent) => {
    return accent === "red" ? 28 : accent === "neutral" ? 58 : 86;
  };

  return [
    {
      label: t("analytics.oee"),
      value: `${latest.oee.toFixed(1)}%`,
      badge: `${t("riskRules.medium.title")} <= ${mediumRule ? mediumRule.thresholds.oeeMax : 85}%`,
      note: t("analytics.oeeNote"),
      progress: latest.oee,
      accent: getMetricAccent(latest.oee, mediumRule ? mediumRule.thresholds.oeeMax : 85, highRule ? highRule.thresholds.oeeMax : 70, true),
    },
    {
      label: t("analytics.tLoss"),
      value: `${avgTLoss.toFixed(1)} h`,
      badge: `${t("riskRules.high.title")} >= ${highRule ? highRule.thresholds.tLossMin : 16} h`,
      note: t("analytics.tLossNote"),
      progress: getMetricProgress(getMetricAccent(avgTLoss, mediumRule ? mediumRule.thresholds.tLossMin : 10, highRule ? highRule.thresholds.tLossMin : 16, false)),
      accent: getMetricAccent(avgTLoss, mediumRule ? mediumRule.thresholds.tLossMin : 10, highRule ? highRule.thresholds.tLossMin : 16, false),
    },
    {
      label: t("analytics.mtbf"),
      value: `${avgMtbf.toFixed(0)} h`,
      badge: `${t("riskRules.medium.title")} <= ${mediumRule ? mediumRule.thresholds.mtbfMin : 220} h`,
      note: t("analytics.mtbfNote"),
      progress: getMetricProgress(getMetricAccent(avgMtbf, mediumRule ? mediumRule.thresholds.mtbfMin : 220, highRule ? highRule.thresholds.mtbfMin : 150, true)),
      accent: getMetricAccent(avgMtbf, mediumRule ? mediumRule.thresholds.mtbfMin : 220, highRule ? highRule.thresholds.mtbfMin : 150, true),
    },
    {
      label: t("analytics.mttr"),
      value: `${avgMttr.toFixed(1)} h`,
      badge: `${t("riskRules.high.title")} >= ${highRule ? highRule.thresholds.mttrMax : 6} h`,
      note: t("analytics.mttrNote"),
      progress: getMetricProgress(getMetricAccent(avgMttr, mediumRule ? mediumRule.thresholds.mttrMax : 4, highRule ? highRule.thresholds.mttrMax : 6, false)),
      accent: getMetricAccent(avgMttr, mediumRule ? mediumRule.thresholds.mttrMax : 4, highRule ? highRule.thresholds.mttrMax : 6, false),
    },
    {
      label: t("analytics.responseTime"),
      value: `${avgResponse.toFixed(1)} h`,
      badge: `${t("riskRules.high.title")} >= ${highRule ? highRule.thresholds.responseHoursMax : 2.5} h`,
      note: t("analytics.responseTimeNote"),
      progress: getMetricProgress(getMetricAccent(avgResponse, mediumRule ? mediumRule.thresholds.responseHoursMax : 1.5, highRule ? highRule.thresholds.responseHoursMax : 2.5, false)),
      accent: getMetricAccent(avgResponse, mediumRule ? mediumRule.thresholds.responseHoursMax : 1.5, highRule ? highRule.thresholds.responseHoursMax : 2.5, false),
    },
  ];
}

function buildReadinessMetrics() {
  const equipment = getEquipment();
  const total = equipment.length || 1;
  const drawingComplete = Math.round(
    (equipment.filter((item) => item.drawingStatus === "完整").length / total) * 100
  );
  const layoutBound = Math.round(
    (equipment.filter((item) => item.layoutStatus === "已绑定").length / total) * 100
  );
  const spareSafe = Math.round(
    (equipment.filter((item) => item.spareRisk === "low").length / total) * 100
  );

  return [
    {
      label: t("readiness.drawingCompletenessLabel"),
      value: drawingComplete,
      note: t("readiness.drawingCompletenessNote"),
    },
    {
      label: t("readiness.layoutBindingLabel"),
      value: layoutBound,
      note: t("readiness.layoutBindingNote"),
    },
    {
      label: t("readiness.spareSafetyLabel"),
      value: spareSafe,
      note: t("readiness.spareSafetyNote"),
    },
    {
      label: t("readiness.codingConsistencyLabel"),
      value: 88,
      note: t("readiness.codingConsistencyNote"),
    },
  ];
}

function buildGapItems() {
  return filterEquipmentBySearch(getEquipment())
    .filter(
      (item) =>
        item.drawingStatus !== "完整" || item.layoutStatus !== "已绑定" || item.spareRisk === "high"
    )
    .slice(0, 4);
}

function buildSubmissionStats() {
  const items = getFilteredSubmissions(state.submissions);
  return [
    {
      label: t("submissionStats.total"),
      value: items.length,
    },
    {
      label: getReviewStatusLabel("待审核"),
      value: items.filter((item) => item.status === "待审核").length,
    },
    {
      label: getChangeTypeLabel("equipment_quantity"),
      value: items.filter((item) => item.changeType === "equipment_quantity").length,
    },
    {
      label: getChangeTypeLabel("status_update"),
      value: items.filter((item) => item.changeType === "status_update").length,
    },
  ];
}

function buildComparisonData() {
  return getEquipment()
    .slice(0, 5)
    .map((item, index) => {
      const day = Math.max(28, Math.round((item.oee || equipmentHealthValue(item)) * 0.75));
      const night = Math.max(20, day - ((index % 3) + 2));
      return {
        label: t("labels.lineLabel", { letter: String.fromCharCode(65 + index) }),
        day,
        night,
      };
    });
}

function buildLossLog() {
  return getEquipment()
    .filter((item) => item.oee > 0)
    .sort((left, right) => right.downtimeHours - left.downtimeHours)
    .slice(0, 5)
    .map((item) => ({
      timestamp: `${item.nextPmDate} 08:00`,
      asset: `${getStationName(item.station)} · ${getEquipmentName(item)}`,
      category: item.riskHits && item.riskHits.length ? getRiskHitLabel(item.riskHits[0]) : getStageLabel(item.stage),
      duration: `${item.downtimeHours.toFixed(1)} h`,
      impact: item.riskLevel,
      action:
        item.riskLevel === "high"
          ? t("loss.actionHigh")
          : item.riskLevel === "medium"
            ? t("loss.actionMedium")
            : t("loss.actionLow"),
    }));
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

function scoreHigherWorse(value, medium, high) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0.18;
  }

  if (value >= high) {
    return 1;
  }

  if (value >= medium) {
    return 0.45 + 0.55 * ((value - medium) / Math.max(0.1, high - medium));
  }

  return Math.max(0.06, 0.45 * (value / Math.max(medium, 0.1)));
}

function scoreLowerWorse(value, medium, high) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0.22;
  }

  if (value <= high) {
    return 1;
  }

  if (value <= medium) {
    return 0.45 + 0.55 * ((medium - value) / Math.max(0.1, medium - high));
  }

  return Math.max(0.04, 0.45 * (1 - Math.min(1, (value - medium) / Math.max(medium, 1))));
}

function getTrendAdjustment() {
  const trend = state.dashboard.trendSeries || [];
  if (trend.length < 4) {
    return 0;
  }

  const latest = trend[trend.length - 1].oee || 0;
  const baseline = average(trend.slice(-4, -1), "oee");
  const delta = latest - baseline;

  if (delta < 0) {
    return Math.min(0.12, Math.abs(delta) / 45);
  }

  return -Math.min(0.04, delta / 70);
}

function getPredictiveDriverCatalog(item, thresholds, trendAdjustment) {
  const drivers = [
    {
      id: "oee",
      label: t("predictive.driverOee"),
      score: scoreLowerWorse(item.oee, thresholds.medium.oeeMax, thresholds.high.oeeMax),
    },
    {
      id: "tLoss",
      label: t("predictive.driverTLoss"),
      score: scoreHigherWorse(item.downtimeHours, thresholds.medium.tLossMin, thresholds.high.tLossMin),
    },
    {
      id: "mtbf",
      label: t("predictive.driverMtbf"),
      score: scoreLowerWorse(item.mtbf, thresholds.medium.mtbfMin, thresholds.high.mtbfMin),
    },
    {
      id: "mttr",
      label: t("predictive.driverMttr"),
      score: scoreHigherWorse(item.mttr, thresholds.medium.mttrMax, thresholds.high.mttrMax),
    },
    {
      id: "response",
      label: t("predictive.driverResponse"),
      score: scoreHigherWorse(item.responseHours, thresholds.medium.responseHoursMax, thresholds.high.responseHoursMax),
    },
  ];

  if (item.status === "critical" || item.status === "warning" || item.status === "upgrade") {
    drivers.push({
      id: "status",
      label: t("predictive.driverStatus"),
      score: item.status === "critical" ? 1 : item.status === "warning" ? 0.72 : 0.58,
    });
  }

  if (item.spareRisk === "high" || item.spareRisk === "medium") {
    drivers.push({
      id: "spares",
      label: t("predictive.driverSpares"),
      score: item.spareRisk === "high" ? 0.82 : 0.48,
    });
  }

  if (item.drawingStatus !== "完整" || item.layoutStatus !== "已绑定") {
    drivers.push({
      id: "docs",
      label: t("predictive.driverDocs"),
      score: item.drawingStatus !== "完整" && item.layoutStatus !== "已绑定" ? 0.76 : 0.46,
    });
  }

  if (trendAdjustment > 0) {
    drivers.push({
      id: "trend",
      label: t("sections.trendAnalysis"),
      score: Math.min(0.6, trendAdjustment * 3),
    });
  }

  return drivers;
}

function getPredictiveWindow(score) {
  if (score >= 82) {
    return { key: "immediate24h", leadDays: 1 };
  }
  if (score >= 68) {
    return { key: "within3d", leadDays: 3 };
  }
  if (score >= 52) {
    return { key: "within7d", leadDays: 7 };
  }
  if (score >= 38) {
    return { key: "within14d", leadDays: 14 };
  }
  return { key: "nextCycle", leadDays: 30 };
}

function getPredictiveActionMap() {
  return {
    oee: t("predictive.actionLoss"),
    tLoss: t("predictive.actionLoss"),
    mtbf: t("predictive.actionReliability"),
    mttr: t("predictive.actionRepair"),
    response: t("predictive.actionResponse"),
    spares: t("predictive.actionSpares"),
    docs: t("predictive.actionDocs"),
    status: t("predictive.actionRepair"),
    trend: t("predictive.actionLoss"),
  };
}

function buildPredictiveInsights() {
  const items = filterEquipmentBySearch(getEquipment());
  const highRule = getRiskRuleByLevel("high");
  const mediumRule = getRiskRuleByLevel("medium");

  if (!highRule || !mediumRule) {
    return [];
  }

  const trendAdjustment = getTrendAdjustment();
  const weights = {
    oee: 0.28,
    tLoss: 0.22,
    mtbf: 0.18,
    mttr: 0.16,
    response: 0.16,
  };
  const actionMap = getPredictiveActionMap();

  return items
    .map((item) => {
      const drivers = getPredictiveDriverCatalog(
        item,
        {
          high: highRule.thresholds,
          medium: mediumRule.thresholds,
        },
        trendAdjustment
      );

      const weightedScore =
        (drivers.find((itemDriver) => itemDriver.id === "oee")?.score || 0) * weights.oee +
        (drivers.find((itemDriver) => itemDriver.id === "tLoss")?.score || 0) * weights.tLoss +
        (drivers.find((itemDriver) => itemDriver.id === "mtbf")?.score || 0) * weights.mtbf +
        (drivers.find((itemDriver) => itemDriver.id === "mttr")?.score || 0) * weights.mttr +
        (drivers.find((itemDriver) => itemDriver.id === "response")?.score || 0) * weights.response;

      const modifierScore =
        (drivers.find((itemDriver) => itemDriver.id === "status")?.score || 0) * 0.08 +
        (drivers.find((itemDriver) => itemDriver.id === "spares")?.score || 0) * 0.06 +
        (drivers.find((itemDriver) => itemDriver.id === "docs")?.score || 0) * 0.05 +
        (drivers.find((itemDriver) => itemDriver.id === "trend")?.score || 0) * 0.04;

      const predictiveScore = Math.round(clampPercentage((weightedScore + modifierScore + trendAdjustment) * 100));
      const probability = Math.max(8, predictiveScore);
      const predictedDowntime = Number(
        Math.max(
          0.5,
          (item.downtimeHours || 0) * (1 + probability / 140) + (item.mttr || 0) * 0.55 + (item.responseHours || 0) * 0.35
        ).toFixed(1)
      );
      const window = getPredictiveWindow(probability);
      const topDrivers = [...drivers].sort((left, right) => right.score - left.score).filter((driver) => driver.score >= 0.28).slice(0, 3);
      const recommendations = [...new Set(topDrivers.map((driver) => actionMap[driver.id]).filter(Boolean))].slice(0, 2);
      const metricCoverage = [item.oee, item.downtimeHours, item.mtbf, item.mttr, item.responseHours].filter((value) => Number.isFinite(value) && value > 0).length;
      const confidence = Math.min(95, 48 + metricCoverage * 9 + topDrivers.length * 6);

      return {
        id: item.id,
        name: getEquipmentName(item),
        station: getStationName(item.station),
        probability,
        predictedDowntime,
        windowLabel: t(`predictive.${window.key}`),
        leadDays: window.leadDays,
        confidence,
        topDrivers,
        recommendation: recommendations.join(" "),
      };
    })
    .sort((left, right) => right.probability - left.probability);
}

function getPoint(index, value, count, min, max, width, height, padding) {
  const x = padding + ((width - padding * 2) / (count - 1 || 1)) * index;
  const y = height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);
  return { x, y };
}

function buildPolylinePoints(data, key, min, max, width, height, padding) {
  return data
    .map((item, index) => {
      const point = getPoint(index, item[key], data.length, min, max, width, height, padding);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function filteredEquipment() {
  let equipment = getEquipment();
  if (state.activeStage !== "全部") {
    equipment = equipment.filter((item) => item.stage === state.activeStage);
  }
  return filterEquipmentBySearch(equipment);
}

function syncChrome() {
  if (!state.auth) {
    return;
  }

  const isAdmin = state.auth.user.role === "admin";
  const config = isAdmin
    ? getCurrentHeroConfig("admin", state.activeAdminSection)
    : getCurrentHeroConfig("employee", state.activeEmployeeSection);

  $("#hero-kicker").textContent = config.kicker;
  $("#hero-heading").textContent = config.title;
  $("#hero-subheading").textContent = config.subtitle;
  $("#page-title").textContent = config.pageTitle;

  const primary = $("#hero-primary-action");
  primary.textContent = config.primaryLabel;
  primary.dataset.action = config.primaryAction || "";

  const secondary = $("#hero-secondary-action");
  if (config.secondaryLabel) {
    secondary.textContent = config.secondaryLabel;
    secondary.dataset.action = config.secondaryAction || "";
    secondary.classList.remove("hidden");
  } else {
    secondary.textContent = "";
    secondary.dataset.action = "";
    secondary.classList.add("hidden");
  }
}

function mountHeroInWorkspace(selector) {
  const hero = $("#workspace-hero");
  const target = $(selector);

  if (!hero || !target) {
    return;
  }

  if (hero.parentElement !== target) {
    target.prepend(hero);
  }
}

function switchAdminSection(section) {
  state.activeAdminSection = section;
  document.querySelectorAll("#admin-sidebar .sidebar-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
  });
  document.querySelectorAll("#admin-view .content-section").forEach((sectionNode) => {
    sectionNode.classList.toggle("active", sectionNode.id === `section-${section}`);
  });
  syncChrome();
}

function switchEmployeeSection(section) {
  state.activeEmployeeSection = ensureEmployeeSectionAccess(section);
  document.querySelectorAll("#employee-sidebar .sidebar-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === state.activeEmployeeSection);
  });
  document.querySelectorAll("#employee-view .content-section").forEach((sectionNode) => {
    sectionNode.classList.toggle("active", sectionNode.id === `section-${state.activeEmployeeSection}`);
  });
  syncChrome();
}

function renderKpis() {
  renderKpiCards("#kpi-grid", buildAdminKpis());
}

function renderSubmissionOverview() {
  $("#submission-stats").innerHTML = buildSubmissionStats()
    .map(
      (item) => `
        <article class="stat-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderSubmissionFeed() {
  const items = getFilteredSubmissions(state.submissions).slice(0, 6);

  if (!items.length) {
    $("#submission-feed").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptySubmissions"), t("search.entityLabels.submission"))}</div>`;
    return;
  }

  const rows = items
    .map(
      (item, index) => `
        <div class="record-row record-row-admin">
          <div class="record-cell">
            <strong>${String(index + 1).padStart(2, "0")}</strong>
          </div>
          <div class="record-cell">
            <strong>${item.submitter}</strong>
            <small>${item.id}</small>
          </div>
          <div class="record-cell">
            <strong>${getChangeTypeLabel(item.changeType)}</strong>
            <small>${submissionDetailSummary(item)}</small>
          </div>
          <div class="record-cell">
            <strong>${getStationName(item.station)}</strong>
            <small>${getSubmissionEquipmentName(item)}</small>
          </div>
          <div class="record-cell">
            <span class="status-tag ${reviewClass(item.status)}">${getReviewStatusLabel(item.status)}</span>
            ${
              item.status === "待审核"
                ? `
                  <small>
                    <button class="section-link" type="button" data-action="approve" data-id="${item.id}">${t("actions.approve")}</button>
                    &nbsp;/&nbsp;
                    <button class="section-link" type="button" data-action="reject" data-id="${item.id}">${t("actions.reject")}</button>
                  </small>
                `
                : `<small>${t("labels.reviewCompleted")}</small>`
            }
          </div>
          <div class="record-cell">
            <strong>${formatTime(item.createdAt)}</strong>
            <small>${item.id}</small>
          </div>
        </div>
      `
    )
    .join("");

  $("#submission-feed").innerHTML = `
    <div class="record-table">
      <div class="record-table-head record-table-head-admin">
        <span>${t("tables.index")}</span>
        <span>${t("tables.submitterId")}</span>
        <span>${t("tables.submissionType")}</span>
        <span>${t("tables.areaEquipment")}</span>
        <span>${t("tables.status")}</span>
        <span>${t("tables.timestamp")}</span>
      </div>
      <div class="record-table-body">
        ${rows}
      </div>
    </div>
  `;
}

function buildWorkerKpis() {
  const summary = state.workerPerformance.summary || {};
  return [
    {
      label: "当前期间",
      value: summary.selectedPeriod || summary.selectedMonth || "--",
      badge: "Excel 汇总",
      note: `${summary.employeeCount || 0} 名员工 · ${summary.shiftCount || 0} 个班次`,
      progress: Math.min(100, (summary.employeeCount || 0) * 3),
      accent: "blue",
    },
    {
      label: "总出勤小时",
      value: `${formatWorkerNumber(summary.totalAttendanceHours)} h`,
      badge: "Attendance",
      note: "来自员工出勤小时表",
      progress: Math.min(100, (summary.totalAttendanceHours || 0) / 100),
      accent: "neutral",
    },
    {
      label: "总接单数量",
      value: formatWorkerNumber(summary.totalOrderCount),
      badge: "Orders",
      note: `维修工时 ${formatWorkerNumber(summary.totalRepairHours)} h`,
      progress: Math.min(100, (summary.totalOrderCount || 0) / 50),
      accent: "blue",
    },
    {
      label: "平均维修效率",
      value: formatWorkerRate(summary.avgRepairEfficiency || 0),
      badge: "维修工时 / 出勤小时",
      note: summary.missingAttendanceCount
        ? `${summary.missingAttendanceCount} 条记录出勤为 0，效率需补出勤后计算`
        : "当前 Power BI 口径",
      progress: Math.min(100, (summary.avgRepairEfficiency || 0) * 100),
      accent: summary.missingAttendanceCount ? "red" : "neutral",
    },
  ];
}

function setSelectOptions(selector, options, selectedValue, allLabel, getValue, getLabel) {
  const select = $(selector);
  if (!select) {
    return;
  }
  select.innerHTML = [
    `<option value="">${allLabel}</option>`,
    ...options.map((item) => {
      const value = getValue(item);
      const label = getLabel(item);
      return `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${label}</option>`;
    }),
  ].join("");
}

const WORKER_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWorkerMonthParts(month) {
  const text = String(month || "");
  const match = text.match(/^(\d{4})\s+([A-Za-z]{3})$/);
  const monthName = match ? match[2] : text;
  const monthIndex = WORKER_MONTH_NAMES.indexOf(monthName);
  return {
    year: match ? match[1] : "",
    monthName,
    monthIndex,
  };
}

function getWorkerMonthYear(month) {
  return getWorkerMonthParts(month).year;
}

function getWorkerMonthLabel(month, selectedYear = "") {
  const parts = getWorkerMonthParts(month);
  return selectedYear && parts.year === selectedYear ? parts.monthName : String(month || "");
}

function getWorkerYearOptions(months) {
  return [...new Set((months || []).map(getWorkerMonthYear).filter(Boolean))].sort();
}

function renderWorkerFilters() {
  const options = state.workerPerformance.filterOptions || {};
  const filters = state.workerPerformance.filters || {};
  const yearOptions = options.years?.length ? options.years : getWorkerYearOptions(options.months || []);
  const selectedYear = filters.year || "";
  const monthOptions = selectedYear
    ? (options.months || []).filter((month) => getWorkerMonthYear(month) === selectedYear)
    : options.months || [];
  const selectedMonth = monthOptions.includes(filters.month) ? filters.month : selectedYear ? "" : filters.month || options.defaultMonth || "";

  setSelectOptions("#worker-year-filter", yearOptions, selectedYear, "全部年份", (item) => item, (item) => item);
  setSelectOptions(
    "#worker-month-filter",
    monthOptions,
    selectedMonth,
    selectedYear ? "全年" : "默认月份",
    (item) => item,
    (item) => getWorkerMonthLabel(item, selectedYear)
  );
  setSelectOptions("#worker-shift-filter", options.shifts || [], filters.shift, "全部班次", (item) => item, (item) => item);
  setSelectOptions(
    "#worker-employee-filter",
    options.employees || [],
    filters.employeeKey,
    "全部员工",
    (item) => item.id,
    (item) => `${item.name} · ${item.shift}`
  );
}

function renderWorkerQualityGrid() {
  const summary = state.workerPerformance.summary || {};
  const stats = summary.qualityStats || {};
  const qualityItems = [
    {
      id: "missingAttendanceWithActivity",
      label: "有维修/接单但出勤为 0",
      value: stats.missingAttendanceWithActivity || summary.missingAttendanceCount || 0,
      note: "会导致维修效率无法计算",
      level: (stats.missingAttendanceWithActivity || summary.missingAttendanceCount || 0) > 0 ? "review-rejected" : "review-approved",
    },
    {
      id: "activeNoRepair",
      label: "有出勤但无接单/维修",
      value: stats.activeNoRepair || 0,
      note: "维护组不参与维修，已按正常处理",
      level: (stats.activeNoRepair || 0) > 0 ? "review-pending" : "review-approved",
    },
    {
      id: "highEfficiency",
      label: "维修效率超过 100%",
      value: stats.highEfficiency || 0,
      note: "需要确认工时口径是否重复",
      level: (stats.highEfficiency || 0) > 0 ? "review-rejected" : "review-approved",
    },
    {
      id: "zeroEfficiencyWithRepair",
      label: "有维修工时但效率为 0",
      value: stats.zeroEfficiencyWithRepair || 0,
      note: "通常由出勤缺失或公式缺失造成",
      level: (stats.zeroEfficiencyWithRepair || 0) > 0 ? "review-pending" : "review-approved",
    },
  ];

  $("#worker-quality-grid").innerHTML = qualityItems
    .map(
      (item) => `
        <button class="worker-quality-card ${state.workerPerformance.selectedQualityIssue === item.id ? "is-active" : ""}" type="button" data-worker-quality="${item.id}" ${item.value ? "" : "disabled"}>
          <span class="status-tag ${item.level}">${formatWorkerNumber(item.value, 0)}</span>
          <strong>${item.label}</strong>
          <small>${item.value ? "点击查看具体数据" : item.note}</small>
        </button>
      `
    )
    .join("");
  renderWorkerQualityDetails(qualityItems);
}

function isWorkerQualityIssue(record, issueId) {
  const attendanceHours = Number(record.attendanceHours) || 0;
  const orderCount = Number(record.orderCount) || 0;
  const repairHours = Number(record.repairHours) || 0;
  const repairEfficiency = Number(record.repairEfficiency) || 0;

  if (issueId === "missingAttendanceWithActivity") {
    return attendanceHours <= 0 && (orderCount > 0 || repairHours > 0);
  }
  if (issueId === "activeNoRepair") {
    return !isWorkerRepairExempt(record) && attendanceHours > 0 && orderCount <= 0 && repairHours <= 0;
  }
  if (issueId === "highEfficiency") {
    return repairEfficiency > 1;
  }
  if (issueId === "zeroEfficiencyWithRepair") {
    return repairHours > 0 && repairEfficiency <= 0;
  }
  return false;
}

function getWorkerQualityIssueNote(record, issueId) {
  if (issueId === "missingAttendanceWithActivity") {
    return "有维修/接单，但出勤为 0";
  }
  if (issueId === "activeNoRepair") {
    return "有出勤，但无接单和维修";
  }
  if (issueId === "highEfficiency") {
    return "维修效率超过 100%";
  }
  if (issueId === "zeroEfficiencyWithRepair") {
    return "有维修工时，但效率为 0";
  }
  return "待复核";
}

function renderWorkerQualityDetails(qualityItems = []) {
  const selectedIssue = state.workerPerformance.selectedQualityIssue;
  const container = $("#worker-quality-detail");
  if (!container) {
    return;
  }

  if (!selectedIssue) {
    container.innerHTML = `<div class="empty-state">点击上方有问题的数据质量卡片后查看明细。</div>`;
    return;
  }

  const issue = qualityItems.find((item) => item.id === selectedIssue);
  const data = window.BOSCH_WORKER_MONTHLY_DATA || {};
  const defaultMonth = state.workerPerformance.filterOptions.defaultMonth || state.workerPerformance.summary?.selectedMonth || data.filterOptions?.defaultMonth || "";
  const records = applyLocalWorkerFilters(getLocalCompletedMonthlyEmployeeRecords(), state.workerPerformance.filters || {}, defaultMonth)
    .filter((record) => isWorkerQualityIssue(record, selectedIssue));

  if (!records.length) {
    state.workerPerformance.selectedQualityIssue = "";
    container.innerHTML = `<div class="empty-state">当前筛选下没有对应异常数据。</div>`;
    requestAnimationFrame(renderWorkerQualityGrid);
    return;
  }

  const rows = records
    .map(
      (item) => `
        <div class="record-row worker-quality-row">
          <div class="record-cell">
            <strong>${item.month}</strong>
            <small>${item.shift}</small>
          </div>
          <div class="record-cell">
            <strong>${item.employeeName}</strong>
            <small>${getWorkerQualityIssueNote(item, selectedIssue)}</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.attendanceHours)} h</strong>
            <small>出勤</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.orderCount)}</strong>
            <small>接单</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.repairHours)} h</strong>
            <small>维修工时</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerRate(item.repairEfficiency)}</strong>
            <small>维修效率</small>
          </div>
        </div>
      `
    )
    .join("");

  container.innerHTML = `
    <div class="worker-quality-detail-head">
      <strong>${issue?.label || "数据质量明细"}</strong>
      <span>${records.length} 条</span>
    </div>
    <div class="record-table">
      <div class="record-table-head worker-quality-head">
        <span>月份</span>
        <span>员工</span>
        <span>出勤</span>
        <span>接单</span>
        <span>维修工时</span>
        <span>维修效率</span>
      </div>
      <div class="record-table-body">${rows}</div>
    </div>
  `;
}

function renderWorkerFormulaGrid() {
  const formulaItems = [
    {
      title: "综合绩效排名",
      formula: "接单 40% + 维修工时 30% + 平均维修效率 20% + 数据质量 10%",
      note: "接单、维修工时、平均维修效率按当前月份归一化为 0-100 分；数据异常标记为复核。",
    },
    {
      title: "维修效率",
      formula: "维修工时 / 出勤小时",
      note: "个人按个人数据计算；班组和总览展示平均值。出勤为 0 不参与 Top 5。",
    },
    {
      title: "接单效率",
      formula: "接单数量 / 出勤小时",
      note: "用于观察单位出勤小时内的接单压力。",
    },
    {
      title: "维修工时占比",
      formula: "个人维修工时 / 当前筛选总维修工时",
      note: "随月份、班次、员工筛选实时变化。",
    },
  ];

  $("#worker-formula-grid").innerHTML = formulaItems
    .map(
      (item) => `
        <article class="worker-formula-card">
          <span>${item.title}</span>
          <strong>${item.formula}</strong>
          <small>${item.note}</small>
        </article>
      `
    )
    .join("");
}

function getSortedWorkerRows(workers) {
  const sort = state.workerPerformance.tableSort || {};
  const key = sort.key || "performanceScore";
  const direction = sort.direction === "asc" ? "asc" : "desc";
  const factor = direction === "asc" ? 1 : -1;

  return [...workers]
    .sort((left, right) => {
      const leftInvalid = Boolean(left.qualityFlag);
      const rightInvalid = Boolean(right.qualityFlag);
      if (leftInvalid !== rightInvalid) {
        return leftInvalid ? 1 : -1;
      }
      const leftValue = Number(left[key]) || 0;
      const rightValue = Number(right[key]) || 0;
      if (leftValue !== rightValue) {
        return (leftValue - rightValue) * factor;
      }
      if ((Number(left.rank) || 0) !== (Number(right.rank) || 0)) {
        return (Number(left.rank) || 0) - (Number(right.rank) || 0);
      }
      return String(left.employeeName).localeCompare(String(right.employeeName), "zh-CN");
    })
    .map((item) => ({
      ...item,
      displayRank: item.qualityFlag ? "复核" : item.rank || "--",
    }));
}

function renderWorkerSortHeader(key, label) {
  const sort = state.workerPerformance.tableSort || {};
  const isActive = sort.key === key;
  const arrow = isActive ? (sort.direction === "asc" ? "↑" : "↓") : "↕";
  return `
    <button class="worker-sort-btn ${isActive ? "is-active" : ""}" type="button" data-worker-sort="${key}" aria-label="按${label}排序">
      <span>${label}</span>
      <small>${arrow}</small>
    </button>
  `;
}

function renderWorkerTable() {
  const workers = state.workerPerformance.workers || [];
  const summary = state.workerPerformance.summary || {};

  if (summary.loadError) {
    $("#worker-table").innerHTML = `<div class="empty-state">${summary.loadError}</div>`;
    return;
  }

  if (!workers.length) {
    $("#worker-table").innerHTML = `<div class="empty-state">当前筛选下暂无员工绩效记录。</div>`;
    return;
  }

  const sortedWorkers = getSortedWorkerRows(workers);
  const rows = sortedWorkers
    .map(
      (item) => `
        <div class="record-row worker-row ${item.employeeKey === state.workerPerformance.selectedEmployeeKey ? "is-selected" : ""}" data-employee-key="${item.employeeKey}">
          <div class="record-cell">
            <strong>${item.displayRank}</strong>
            <small>${item.qualityFlag ? item.qualityReason || "数据需复核" : `${formatWorkerNumber(item.performanceScore, 1)} 分`}</small>
          </div>
          <div class="record-cell">
            <strong>${item.employeeName}</strong>
            <small>${item.shift}</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.attendanceHours)} h</strong>
            <small>出勤小时</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.orderCount)}</strong>
            <small>${formatWorkerNumber(item.orderEfficiency, 2)} 单/h</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.repairHours)} h</strong>
            <small>占比 ${formatWorkerNumber(item.repairHoursShare)}%</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerRate(item.repairEfficiency)}</strong>
            <small>${item.qualityFlag ? "出勤为 0，效率不可排" : "维修工时 / 出勤"}</small>
          </div>
        </div>
      `
    )
    .join("");

  $("#worker-table").innerHTML = `
    <div class="record-table">
      <div class="record-table-head worker-table-head">
        ${renderWorkerSortHeader("performanceScore", "综合排名")}
        <span class="worker-table-label">员工</span>
        ${renderWorkerSortHeader("attendanceHours", "出勤")}
        ${renderWorkerSortHeader("orderCount", "接单")}
        ${renderWorkerSortHeader("repairHours", "维修工时")}
        ${renderWorkerSortHeader("repairEfficiency", "维修效率")}
      </div>
      <div class="record-table-body">
        ${rows}
      </div>
    </div>
  `;
}

function renderWorkerRawTable() {
  const workers = state.workerPerformance.workers || [];
  const summary = state.workerPerformance.summary || {};

  if (summary.loadError) {
    $("#worker-raw-table").innerHTML = `<div class="empty-state">${summary.loadError}</div>`;
    return;
  }

  if (!workers.length) {
    $("#worker-raw-table").innerHTML = `<div class="empty-state">当前筛选下暂无月度原始数据。</div>`;
    return;
  }

  const rows = workers
    .map(
      (item) => `
        <div class="record-row worker-raw-row">
          <div class="record-cell">
            <strong>${item.month}</strong>
            <small>月份</small>
          </div>
          <div class="record-cell">
            <strong>${item.shift}</strong>
            <small>班次</small>
          </div>
          <div class="record-cell">
            <strong>${item.employeeName}</strong>
            <small>${item.shift}</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.attendanceHours)} h</strong>
            <small>出勤小时</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.orderCount)}</strong>
            <small>接单数量</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.repairHours)} h</strong>
            <small>维修工时</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerRate(item.repairEfficiency)}</strong>
            <small>维修效率</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerNumber(item.orderEfficiency, 2)}</strong>
            <small>单/h</small>
          </div>
        </div>
      `
    )
    .join("");

  $("#worker-raw-table").innerHTML = `
    <div class="record-table">
      <div class="record-table-head worker-raw-head">
        <span>月份</span>
        <span>班次</span>
        <span>员工</span>
        <span>出勤</span>
        <span>接单</span>
        <span>维修工时</span>
        <span>维修效率</span>
        <span>接单效率</span>
      </div>
      <div class="record-table-body">
        ${rows}
      </div>
    </div>
  `;
}

function buildWorkerTopList(title, items, valueBuilder, accentClass = "") {
  const rows = (items || [])
    .slice(0, 5)
    .map(
      (item, index) => `
        <div class="worker-top-row">
          <span>${index + 1}</span>
          <strong>${item.employeeName}</strong>
          <small>${valueBuilder(item)}</small>
        </div>
      `
    )
    .join("");

  return `
    <article class="worker-top-card ${accentClass}">
      <strong>${title}</strong>
      ${rows || `<div class="empty-state">暂无数据</div>`}
    </article>
  `;
}

function renderWorkerTopGrid() {
  const top = state.workerPerformance.topLists || {};
  $("#worker-top-grid").innerHTML = [
    buildWorkerTopList(
      "综合绩效最高",
      top.performanceHigh,
      (item) => `${formatWorkerNumber(item.performanceScore, 1)} 分 · ${item.shift}`,
      "worker-top-card-performance"
    ),
    buildWorkerTopList(
      "平均维修效率最高",
      top.repairEfficiencyHigh,
      (item) => `${formatWorkerRate(item.repairEfficiency)} · ${item.shift}`,
      "worker-top-card-efficiency"
    ),
    buildWorkerTopList(
      "接单数量最高",
      top.orderCountHigh,
      (item) => `${formatWorkerNumber(item.orderCount)} 单 · ${formatWorkerNumber(item.orderEfficiency, 2)} 单/h`,
      "worker-top-card-orders"
    ),
    buildWorkerTopList(
      "维修工时最高",
      top.repairHoursHigh,
      (item) => `${formatWorkerNumber(item.repairHours)} h · 占比 ${formatWorkerNumber(item.repairHoursShare)}%`,
      "worker-top-card-hours"
    ),
  ].join("");
}

function renderWorkerShiftComparison() {
  const shifts = state.workerPerformance.shiftComparison || [];

  if (!shifts.length) {
    $("#worker-shift-list").innerHTML = `<div class="empty-state">当前筛选下暂无班组对比数据。</div>`;
    return;
  }

  const maxOrderCount = Math.max(...shifts.map((item) => Number(item.orderCount) || 0), 1);
  const maxRepairHours = Math.max(...shifts.map((item) => Number(item.repairHours) || 0), 1);
  const maxRepairEfficiency = Math.max(...shifts.map((item) => Number(item.repairEfficiency) || 0), 0.01);
  const getPercent = (value, max) => Math.max(2, Math.min(100, ((Number(value) || 0) / max) * 100));

  $("#worker-shift-list").innerHTML = shifts
    .map(
      (item) => {
        const orderPercent = getPercent(item.orderCount, maxOrderCount);
        const repairPercent = getPercent(item.repairHours, maxRepairHours);
        const efficiencyPercent = getPercent(item.repairEfficiency, maxRepairEfficiency);
        return `
        <article class="worker-alert-card">
          <div class="worker-alert-head">
            <strong>${item.shift}</strong>
            <span class="status-tag review-approved">${item.employeeCount} 人</span>
          </div>
          <div class="worker-shift-bars" aria-label="${item.shift}班组指标图">
            <div class="worker-shift-bar-row">
              <div class="worker-shift-bar-label">
                <span>总接单</span>
                <strong>${formatWorkerNumber(item.orderCount)}</strong>
              </div>
              <div class="worker-shift-bar-track">
                <i class="worker-shift-bar worker-shift-bar-orders" style="width: ${orderPercent.toFixed(1)}%"></i>
              </div>
            </div>
            <div class="worker-shift-bar-row">
              <div class="worker-shift-bar-label">
                <span>维修工时</span>
                <strong>${formatWorkerNumber(item.repairHours)} h</strong>
              </div>
              <div class="worker-shift-bar-track">
                <i class="worker-shift-bar worker-shift-bar-hours" style="width: ${repairPercent.toFixed(1)}%"></i>
              </div>
            </div>
            <div class="worker-shift-bar-row">
              <div class="worker-shift-bar-label">
                <span>平均维修效率</span>
                <strong>${formatWorkerRate(item.repairEfficiency)}</strong>
              </div>
              <div class="worker-shift-bar-track">
                <i class="worker-shift-bar worker-shift-bar-efficiency" style="width: ${efficiencyPercent.toFixed(1)}%"></i>
              </div>
            </div>
          </div>
        </article>
      `;
      }
    )
    .join("");
}

function buildWorkerTrendChart(title, items, field, formatter, options = {}) {
  const records = items || [];
  const values = records.map((item) => Number(item[field]) || 0);
  const width = 320;
  const height = 104;
  const padding = { top: 12, right: 14, bottom: 24, left: 28 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...values, 0);
  const scaleMax = maxValue > 0 ? maxValue : 1;
  const points = values.map((value, index) => {
    const x = padding.left + (values.length <= 1 ? innerWidth / 2 : (index / (values.length - 1)) * innerWidth);
    const y = padding.top + innerHeight - (value / scaleMax) * innerHeight;
    return { x, y, value, month: records[index]?.month || "" };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x.toFixed(1)} ${padding.top + innerHeight} L ${points[0].x.toFixed(1)} ${padding.top + innerHeight} Z`
    : "";
  const lastValue = values.length ? values[values.length - 1] : 0;
  const lastMonth = records[records.length - 1]?.month || "当前月";
  const previousValue = values.length > 1 ? values[values.length - 2] : null;
  const delta = previousValue === null ? 0 : lastValue - previousValue;
  const deltaText = previousValue === null ? "暂无环比" : `环比 ${delta >= 0 ? "+" : ""}${formatter(delta)}`;
  const deltaClass = previousValue === null ? "is-flat" : delta > 0 ? "is-up" : delta < 0 ? "is-down" : "is-flat";
  const averageValue = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const peakValue = Math.max(...values, 0);
  const insight = options.note || `均值 ${formatter(averageValue)} · 峰值 ${formatter(peakValue)}`;

  return `
    <article class="worker-chart-card ${options.warning ? "worker-chart-card-warning" : ""}">
      <div class="worker-chart-head">
        <div>
          <span>${title}</span>
          <small>${lastMonth} 当前值</small>
        </div>
        <strong>${formatter(lastValue)}</strong>
      </div>
      <div class="worker-chart-meta">
        <span class="worker-chart-delta ${deltaClass}">${deltaText}</span>
        <small>${insight}</small>
      </div>
      <svg class="worker-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}月度趋势">
        <line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight}"></line>
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}"></line>
        <line class="worker-mini-hover-guide" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}"></line>
        ${areaPath ? `<path class="worker-chart-area" d="${areaPath}"></path>` : ""}
        ${path ? `<path class="worker-chart-line" d="${path}"></path>` : ""}
        ${points
          .map(
            (point, index) => `
              <g>
                <circle
                  class="worker-mini-point"
                  cx="${point.x.toFixed(1)}"
                  cy="${point.y.toFixed(1)}"
                  r="3.4"
                  data-worker-mini-index="${index}"
                  data-worker-mini-x="${point.x.toFixed(1)}"
                  data-worker-mini-month="${point.month}"
                  data-worker-mini-title="${title}"
                  data-worker-mini-value="${formatter(point.value)}"
                ></circle>
                <title>${point.month}: ${formatter(point.value)}</title>
              </g>
            `
          )
          .join("")}
        ${points
          .filter((_, index) => index === 0 || index === points.length - 1 || points.length <= 6)
          .map(
            (point) => `
              <text x="${point.x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${point.month}</text>
            `
          )
          .join("")}
        ${points
          .map((point, index) => {
            const left = index === 0 ? padding.left : (points[index - 1].x + point.x) / 2;
            const right = index === points.length - 1 ? padding.left + innerWidth : (point.x + points[index + 1].x) / 2;
            return `
              <rect
                class="worker-mini-hover-zone"
                x="${left.toFixed(1)}"
                y="${padding.top}"
                width="${(right - left).toFixed(1)}"
                height="${innerHeight}"
                data-worker-mini-index="${index}"
                data-worker-mini-x="${point.x.toFixed(1)}"
                data-worker-mini-month="${point.month}"
                data-worker-mini-title="${title}"
                data-worker-mini-value="${formatter(point.value)}"
              ></rect>
            `;
          })
          .join("")}
      </svg>
      <div class="worker-mini-tooltip" role="tooltip" aria-hidden="true">
        <strong data-worker-mini-tooltip-month>--</strong>
        <div><span data-worker-mini-tooltip-title>${title}</span><b data-worker-mini-tooltip-value>--</b></div>
      </div>
    </article>
  `;
}

function renderWorkerTrendCharts(monthlyTrends) {
  const trends = monthlyTrends || [];
  const latest = trends[trends.length - 1] || {};
  const hasActivityWithoutAttendance =
    (Number(latest.attendanceHours) || 0) <= 0 &&
    ((Number(latest.orderCount) || 0) > 0 || (Number(latest.repairHours) || 0) > 0);
  return `
    <section class="worker-chart-grid">
      ${buildWorkerTrendChart("出勤小时", trends, "attendanceHours", (value) => `${formatWorkerNumber(value)} h`, {
        warning: hasActivityWithoutAttendance,
        note: hasActivityWithoutAttendance ? "当前月有接单/维修，但出勤为 0，需复核" : "",
      })}
      ${buildWorkerTrendChart("接单数量", trends, "orderCount", (value) => `${formatWorkerNumber(value)} 单`)}
      ${buildWorkerTrendChart("维修工时", trends, "repairHours", (value) => `${formatWorkerNumber(value)} h`)}
      ${buildWorkerTrendChart("维修效率", trends, "repairEfficiency", formatWorkerRate, {
        warning: hasActivityWithoutAttendance,
        note: hasActivityWithoutAttendance ? "出勤小时为 0，维修效率暂不可用" : "",
      })}
    </section>
  `;
}

function buildWorkerMonthlyLineChart(monthlyTrends) {
  const trends = monthlyTrends || [];

  if (!trends.length) {
    return `<div class="empty-state">暂无趋势图数据</div>`;
  }

  const width = 520;
  const height = 178;
  const padding = { top: 14, right: 18, bottom: 28, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const series = [
    { key: "repairEfficiency", label: "个人维修效率", className: "worker-line-personal" },
    { key: "shiftAvgRepairEfficiency", label: "班组均值", className: "worker-line-shift" },
    { key: "overallAvgRepairEfficiency", label: "全员均值", className: "worker-line-overall" },
  ];
  const allValues = series.flatMap((line) => trends.map((item) => Number(item[line.key]) || 0));
  const maxValue = Math.max(...allValues, 0);
  const scaleMax = maxValue > 0 ? maxValue * 1.16 : 1;
  const getX = (index) =>
    padding.left + (trends.length <= 1 ? innerWidth / 2 : (index / (trends.length - 1)) * innerWidth);
  const getY = (value) => padding.top + innerHeight - ((Number(value) || 0) / scaleMax) * innerHeight;
  const yTicks = [0, 0.5, 1].map((ratio) => ratio * scaleMax);
  const latest = trends[trends.length - 1] || {};
  const latestPersonal = Number(latest.repairEfficiency) || 0;
  const latestShift = Number(latest.shiftAvgRepairEfficiency) || 0;
  const latestOverall = Number(latest.overallAvgRepairEfficiency) || 0;
  const latestGap = latestPersonal - latestShift;
  const lastMonth = latest.month || "--";
  const maxXAxisLabels = Math.max(3, Math.floor(innerWidth / 76));
  const xAxisStep = Math.max(1, Math.ceil(trends.length / maxXAxisLabels));
  const shouldShowXAxisLabel = (item, index) => {
    const currentYear = getWorkerMonthYear(item.month);
    const previousYear = index > 0 ? getWorkerMonthYear(trends[index - 1]?.month) : "";
    return index === 0 || index === trends.length - 1 || index % xAxisStep === 0 || (currentYear && currentYear !== previousYear);
  };
  const getXAxisLabel = (item, index) => {
    const parts = getWorkerMonthParts(item.month);
    if (!parts.year) {
      return item.month || "";
    }
    const previousYear = index > 0 ? getWorkerMonthYear(trends[index - 1]?.month) : "";
    return index === 0 || parts.year !== previousYear ? `${parts.year} ${parts.monthName}` : parts.monthName;
  };
  const getXAxisAnchor = (index) => {
    if (index === 0) return "start";
    if (index === trends.length - 1) return "end";
    return "middle";
  };
  const xAxisLabels = trends
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => shouldShowXAxisLabel(item, index));

  const buildLine = (line) => {
    const points = trends.map((item, index) => ({
      x: getX(index),
      y: getY(item[line.key]),
      value: Number(item[line.key]) || 0,
      month: item.month || "",
    }));
    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");

    return `
      <path class="worker-line-series ${line.className}" d="${path}"></path>
      ${points
        .map(
          (point, index) => `
            <g>
              <circle
                class="${line.className} worker-line-point"
                cx="${point.x.toFixed(1)}"
                cy="${point.y.toFixed(1)}"
                r="3.8"
                data-worker-line-point="${index}"
                data-worker-line-index="${index}"
                data-worker-line-x="${point.x.toFixed(1)}"
              ></circle>
              <title>${line.label} · ${point.month}: ${formatWorkerRate(point.value)}</title>
            </g>
          `
        )
        .join("")}
    `;
  };

  return `
    <article class="worker-line-card">
      <div class="worker-line-card-header">
        <div class="worker-line-title">
          <h4>维修效率变化曲线</h4>
          <small>个人、班组均值、全员均值按月对比</small>
        </div>
        <div class="worker-line-legend" aria-label="趋势图图例">
          ${series
            .map(
              (line) => `
                <span>
                  <i class="worker-line-dot ${line.className}"></i>
                  ${line.label}
                </span>
              `
            )
            .join("")}
        </div>
      </div>
      <div class="worker-line-stats">
        <div>
          <span data-worker-line-stat-month>${lastMonth} 个人</span>
          <strong data-worker-line-stat-personal>${formatWorkerRate(latestPersonal)}</strong>
        </div>
        <div>
          <span>较班组</span>
          <strong data-worker-line-stat-gap>${latestGap >= 0 ? "+" : ""}${formatWorkerRate(latestGap)}</strong>
        </div>
        <div>
          <span>全员均值</span>
          <strong data-worker-line-stat-overall>${formatWorkerRate(latestOverall)}</strong>
        </div>
      </div>
      <div class="worker-line-chart-wrap">
        <svg class="worker-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="员工维修效率月度变化折线图">
          ${yTicks
            .map((tick) => {
              const y = getY(tick);
              return `
                <line class="worker-line-grid" x1="${padding.left}" y1="${y.toFixed(1)}" x2="${padding.left + innerWidth}" y2="${y.toFixed(1)}"></line>
                <text class="worker-line-y-label" x="${padding.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end">${formatWorkerRate(tick)}</text>
              `;
            })
            .join("")}
          <line class="worker-line-axis" x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight}"></line>
          <line class="worker-line-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}"></line>
          <line class="worker-line-hover-guide" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}"></line>
          ${series.map(buildLine).join("")}
          ${xAxisLabels
            .map(
              ({ item, index }) => `
                <text class="worker-line-x-label" x="${getX(index).toFixed(1)}" y="${height - 12}" text-anchor="${getXAxisAnchor(index)}">${getXAxisLabel(item, index)}</text>
              `
            )
            .join("")}
          ${trends
            .map((_, index) => {
              const x = getX(index);
              const left = index === 0 ? padding.left : (getX(index - 1) + x) / 2;
              const right = index === trends.length - 1 ? padding.left + innerWidth : (x + getX(index + 1)) / 2;
              return `
                <rect
                  class="worker-line-hover-zone"
                  x="${left.toFixed(1)}"
                  y="${padding.top}"
                  width="${(right - left).toFixed(1)}"
                  height="${innerHeight}"
                  data-worker-line-index="${index}"
                  data-worker-line-x="${x.toFixed(1)}"
                ></rect>
              `;
            })
            .join("")}
        </svg>
      </div>
      <div class="worker-line-tooltip" role="tooltip" aria-hidden="true">
        <strong data-worker-tooltip-month>--</strong>
        <div><span>个人维修效率</span><b data-worker-tooltip-personal>--</b></div>
        <div><span>班组均值</span><b data-worker-tooltip-shift>--</b></div>
        <div><span>全员均值</span><b data-worker-tooltip-overall>--</b></div>
        <div><span>比班组</span><b data-worker-tooltip-gap>--</b></div>
      </div>
    </article>
  `;
}

function getWorkerTrendDelta(items, field) {
  const values = (items || []).map((item) => Number(item[field]) || 0);
  if (values.length < 2) {
    return 0;
  }
  return values[values.length - 1] - values[values.length - 2];
}

function getWorkerDetailTone(value, baseline) {
  const currentValue = Number(value) || 0;
  const baselineValue = Number(baseline) || 0;
  if (!baselineValue) {
    return { className: "review-pending", label: "待比较" };
  }
  if (currentValue >= baselineValue) {
    return { className: "review-approved", label: "高于班组" };
  }
  return { className: "review-pending", label: "低于班组" };
}

function renderWorkerDetail() {
  const detail = state.workerPerformance.detail;

  if (!detail || !detail.summary) {
    $("#worker-detail-subtitle").textContent = "从列表中选择员工后查看各月趋势和均值对比。";
    $("#worker-detail-content").innerHTML = `<div class="empty-state">尚未选择员工。</div>`;
    return;
  }

  const summary = detail.summary;
  const comparisons = detail.comparisons || {};
  const trends = detail.monthlyTrends || [];
  const selectedPeriod = summary.selectedPeriod || comparisons.selectedPeriod || summary.selectedMonth || comparisons.selectedMonth || "";
  const efficiencyTone = getWorkerDetailTone(summary.repairEfficiency, comparisons.shiftAvgRepairEfficiency);
  const orderTone = getWorkerDetailTone(summary.orderEfficiency, comparisons.shiftAvgOrderEfficiency);
  const repairEfficiencyGap = (Number(summary.repairEfficiency) || 0) - (Number(comparisons.shiftAvgRepairEfficiency) || 0);
  const overallRepairEfficiencyGap = (Number(summary.repairEfficiency) || 0) - (Number(comparisons.overallAvgRepairEfficiency) || 0);
  const orderEfficiencyGap = (Number(summary.orderEfficiency) || 0) - (Number(comparisons.shiftAvgOrderEfficiency) || 0);
  const repairEfficiencyDelta = getWorkerTrendDelta(trends, "repairEfficiency");
  const orderCountDelta = getWorkerTrendDelta(trends, "orderCount");
  const repairHoursDelta = getWorkerTrendDelta(trends, "repairHours");
  const lowRepairHourFlag =
    !isWorkerRepairExempt(summary) && (Number(summary.orderCount) || 0) > 0 && (Number(summary.repairHours) || 0) < 1;
  const qualityFlag = Boolean(summary.qualityFlag);
  $("#worker-detail-subtitle").textContent = `${summary.employeeName} · ${summary.shift} · 当前期间 ${selectedPeriod}`;

  const trendRows = [...trends]
    .reverse()
    .map(
      (item) => {
        const gap = (Number(item.repairEfficiency) || 0) - (Number(item.shiftAvgRepairEfficiency) || 0);
        const tone = getWorkerDetailTone(item.repairEfficiency, item.shiftAvgRepairEfficiency);
        return `
        <div class="worker-trend-row">
          <div class="worker-trend-main">
            <span>${item.month}</span>
            <strong>${formatWorkerNumber(item.orderCount)} 单 · ${formatWorkerNumber(item.repairHours)} h</strong>
            <small>出勤 ${formatWorkerNumber(item.attendanceHours)} h · 接单效率 ${formatWorkerNumber(item.orderEfficiency, 2)} 单/h</small>
          </div>
          <div class="worker-trend-side">
            <span class="status-tag ${tone.className}">${tone.label}</span>
            <strong>${formatWorkerRate(item.repairEfficiency)}</strong>
            <small>较班组 ${gap >= 0 ? "+" : ""}${formatWorkerRate(gap)}</small>
          </div>
        </div>
      `;
      }
    )
    .join("");
  const trendCharts = renderWorkerTrendCharts(trends);
  const monthlyLineChart = buildWorkerMonthlyLineChart(trends);

  const comparisonRows = trends
    .map(
      (item) => `
        <div class="record-row worker-order-row">
          <div class="record-cell">
            <strong>${item.month}</strong>
            <small>月份</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerRate(item.repairEfficiency)}</strong>
            <small>个人维修效率</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerRate(item.shiftAvgRepairEfficiency)}</strong>
            <small>班组均值</small>
          </div>
          <div class="record-cell">
            <strong>${formatWorkerRate(item.overallAvgRepairEfficiency)}</strong>
            <small>全员均值</small>
          </div>
          <div class="record-cell">
            <span class="status-tag ${item.repairEfficiency >= item.shiftAvgRepairEfficiency ? "review-approved" : "review-pending"}">
              ${item.repairEfficiency >= item.shiftAvgRepairEfficiency ? "高于班组" : "低于班组"}
            </span>
          </div>
        </div>
      `
    )
    .join("");

  $("#worker-detail-content").innerHTML = `
    <section class="worker-profile-card">
      <div class="worker-profile-main">
        <span>个人绩效档案</span>
        <strong>${summary.employeeName}</strong>
        <small>${summary.shift} · ${selectedPeriod}</small>
      </div>
      <div class="worker-profile-stats">
        <div>
          <span>${qualityFlag ? "排名状态" : "综合绩效排名"}</span>
          <strong>${qualityFlag ? "复核" : summary.rank || "--"}</strong>
        </div>
        <div>
          <span>综合绩效得分</span>
          <strong>${qualityFlag ? "--" : `${formatWorkerNumber(summary.performanceScore, 1)} 分`}</strong>
        </div>
        <div>
          <span>维修效率差值</span>
          <strong>${repairEfficiencyGap >= 0 ? "+" : ""}${formatWorkerRate(repairEfficiencyGap)}</strong>
        </div>
        <div>
          <span>接单效率差值</span>
          <strong>${orderEfficiencyGap >= 0 ? "+" : ""}${formatWorkerNumber(orderEfficiencyGap, 2)} 单/h</strong>
        </div>
        <div>
          <span>数据提示</span>
          <strong>${qualityFlag || lowRepairHourFlag ? "需复核" : "正常"}</strong>
        </div>
      </div>
    </section>

    <section class="worker-detail-grid">
      <article class="worker-detail-card">
        <span>当前接单</span>
        <strong>${formatWorkerNumber(summary.orderCount)}</strong>
        <small>较上月 ${orderCountDelta >= 0 ? "+" : ""}${formatWorkerNumber(orderCountDelta, 1)} 单</small>
      </article>
      <article class="worker-detail-card">
        <span>出勤小时</span>
        <strong>${formatWorkerNumber(summary.attendanceHours)} h</strong>
        <small>接单效率 ${formatWorkerNumber(summary.orderEfficiency, 2)} 单/h</small>
      </article>
      <article class="worker-detail-card">
        <span>维修工时</span>
        <strong>${formatWorkerNumber(summary.repairHours)} h</strong>
        <small>占比 ${formatWorkerNumber(summary.repairHoursShare)}% · 较上月 ${repairHoursDelta >= 0 ? "+" : ""}${formatWorkerNumber(repairHoursDelta, 1)} h</small>
      </article>
      <article class="worker-detail-card">
        <span>维修效率</span>
        <strong>${formatWorkerRate(summary.repairEfficiency)}</strong>
        <small>${qualityFlag ? "出勤为 0，效率不可参与排名" : `较上月 ${repairEfficiencyDelta >= 0 ? "+" : ""}${formatWorkerRate(repairEfficiencyDelta)} · ${efficiencyTone.label}`}</small>
      </article>
    </section>

    ${trendCharts}

    <section class="worker-current-section">
      <div class="worker-section-title">
        <h3>当前月对比</h3>
        <small>${selectedPeriod} · 维修效率 / 接单效率</small>
      </div>
      <div class="worker-current-grid">
        <div class="worker-compare-row">
          <span>${comparisons.shift || "--"} · ${comparisons.shiftEmployeeCount || 0} 人</span>
          <strong>比班组均值${repairEfficiencyGap >= 0 ? "高" : "低"} ${formatWorkerRate(Math.abs(repairEfficiencyGap))}</strong>
          <small>个人 ${formatWorkerRate(summary.repairEfficiency)} · 班组均值 ${formatWorkerRate(comparisons.shiftAvgRepairEfficiency)}</small>
        </div>
        <div class="worker-compare-row">
          <span>全员 · ${comparisons.overallEmployeeCount || 0} 人</span>
          <strong>比全员均值${overallRepairEfficiencyGap >= 0 ? "高" : "低"} ${formatWorkerRate(Math.abs(overallRepairEfficiencyGap))}</strong>
          <small>个人 ${formatWorkerRate(summary.repairEfficiency)} · 全员均值 ${formatWorkerRate(comparisons.overallAvgRepairEfficiency)}</small>
        </div>
        <div class="worker-compare-row worker-compare-row-highlight">
          <span>个人状态</span>
          <strong>${efficiencyTone.label}</strong>
          <small>${orderTone.label} · ${lowRepairHourFlag ? "维修工时偏低需复核" : "数据口径正常"}</small>
        </div>
      </div>
    </section>

    <section class="worker-trend-section">
      <div class="worker-section-title">
        <h3>月度趋势</h3>
        <small>按月份查看接单、维修工时和相对班组表现</small>
      </div>
      <div class="worker-trend-layout">
        ${monthlyLineChart}
        <div class="worker-trend-list">
          ${trendRows || `<div class="empty-state">暂无趋势数据</div>`}
        </div>
      </div>
    </section>

    <section class="worker-order-section">
      <h3>月度效率对比</h3>
      <div class="record-table">
        <div class="record-table-head worker-order-head">
          <span>月份</span>
          <span>个人</span>
          <span>班组</span>
          <span>全员</span>
          <span>状态</span>
        </div>
        <div class="record-table-body">${comparisonRows}</div>
      </div>
    </section>
  `;
}

function renderWorkerPerformance() {
  renderKpiCards("#worker-kpi-grid", buildWorkerKpis());
  renderWorkerFilters();
  renderWorkerQualityGrid();
  renderWorkerFormulaGrid();
  renderWorkerTable();
  renderWorkerRawTable();
  renderWorkerTopGrid();
  renderWorkerShiftComparison();
  renderWorkerDetail();
  syncWorkerTopSectionHeight();
}

function syncWorkerTopSectionHeight() {
  const layout = document.querySelector(".worker-layout");
  const topPanel = document.querySelector(".worker-top-panel");
  if (!layout || !topPanel) {
    return;
  }

  layout.style.removeProperty("--worker-top-section-height");
  if (window.matchMedia("(max-width: 1280px)").matches) {
    return;
  }

  layout.style.setProperty("--worker-top-section-height", "500px");
  requestAnimationFrame(() => {
    const topHeight = Math.ceil(topPanel.scrollHeight) + 12;
    layout.style.setProperty("--worker-top-section-height", `${Math.max(500, topHeight)}px`);
  });
}

function renderLifecycle() {
  const equipment = getEquipment();
  const total = totalAssetCount(equipment) || 1;
  const stageCounts = stageOrder.map((stage) => ({
    stage,
    count: equipment
      .filter((item) => item.stage === stage)
      .reduce((sumValue, item) => sumValue + (item.assetCount || 1), 0),
  }));

  $("#lifecycle-rail").innerHTML = stageCounts
    .map(
      ({ stage, count }, index) => `
        <article class="stage-card">
          <div class="stage-index">${index + 1}</div>
          <div>
            <strong>${getStageLabel(stage)}</strong>
            <div class="equipment-meta">${getStageDescription(stage)}</div>
          </div>
          <div class="stage-count">${count} 台</div>
        </article>
      `
    )
    .join("");

  $("#stage-ring").innerHTML = stageCounts
    .map(
      ({ stage, count }) => `
        <div class="ring-row">
          <div class="ring-head">
            <strong>${getStageLabel(stage)}</strong>
            <small>${count} / ${total}</small>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${(count / total) * 100}%;"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderAnalyticsKpis() {
  $("#analytics-kpi-grid").innerHTML = buildAnalyticsKpis()
    .map(
      (item) => `
        <article class="kpi-card kpi-${item.accent}">
          <div class="kpi-card-head">
            <span>${item.label}</span>
            <strong class="kpi-badge">${item.badge}</strong>
          </div>
          <div class="kpi-value">${item.value}</div>
          <div class="kpi-foot">
            <div class="kpi-bar">
              <div class="kpi-fill" style="width: ${clampPercentage(item.progress)}%;"></div>
            </div>
            <small>${item.note}</small>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTrendChart() {
  const data = state.dashboard.trendSeries || [];
  if (!data.length) {
    $("#trend-chart").innerHTML = `<div class="empty-state">${t("messages.emptyTrend")}</div>`;
    return;
  }

  const width = 760;
  const height = 320;
  const padding = 48;
  const min = 0;
  const max = 100;
  const yTicks = [100, 80, 60, 40, 20, 0];
  const points = buildPolylinePoints(data, "oee", min, max, width, height, padding);
  const targetY = getPoint(0, 90, data.length, min, max, width, height, padding).y;

  $("#trend-chart").innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("sections.trendAnalysis")}">
      ${yTicks
        .map((tick) => {
          const y = getPoint(0, tick, data.length, min, max, width, height, padding).y;
          return `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e7e7e7" stroke-width="1" />
            <text x="10" y="${y + 4}" fill="#6b7280" font-size="11">${tick}</text>
          `;
        })
        .join("")}
      <line x1="${padding}" y1="${targetY}" x2="${width - padding}" y2="${targetY}" stroke="#e20015" stroke-width="1.5" stroke-dasharray="5 5" />
      <polyline fill="none" stroke="#005691" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      ${data
        .map((item, index) => {
          const point = getPoint(index, item.oee, data.length, min, max, width, height, padding);
          return `
            <circle cx="${point.x}" cy="${point.y}" r="4" fill="#005691" />
            <text x="${point.x - 12}" y="${height - 12}" fill="#6b7280" font-size="11">${item.week}</text>
          `;
        })
        .join("")}
    </svg>
  `;
}

function renderDowntimeCauses() {
  const data = state.dashboard.downtimeCauses || [];
  const totalHours = sum(data, "hours");

  if (!data.length) {
    $("#cause-stack").innerHTML = `<div class="empty-state">${t("messages.emptyDowntime")}</div>`;
    $("#cause-list").innerHTML = "";
    return;
  }

  $("#cause-stack").innerHTML = `
    <div class="cause-stack-bar">
      ${data
        .map(
          (cause) => `
            <span
              class="cause-segment"
              style="width: ${(cause.hours / totalHours) * 100}%; background: ${cause.color};"
            ></span>
          `
        )
        .join("")}
    </div>
    <div class="cause-total">${t("sections.downtimeBreakdown")} ${totalHours.toFixed(1)} h</div>
  `;

  $("#cause-list").innerHTML = data
    .map((cause) => {
      const share = (cause.hours / totalHours) * 100;
      return `
        <div class="cause-row">
          <div class="cause-head">
            <strong>${getDowntimeCauseName(cause.name)}</strong>
            <span>${share.toFixed(0)}%</span>
          </div>
          <div class="cause-track">
            <div class="cause-fill" style="width: ${share}%; background: ${cause.color};"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderComparisonChart() {
  const data = buildComparisonData();
  const maxValue = Math.max(...data.flatMap((item) => [item.day, item.night]), 1);

  $("#comparison-chart").innerHTML = `
    <div class="comparison-legend">
      <span><i class="legend-dot availability"></i>${t("labels.dayShift")}</span>
      <span><i class="legend-dot oee" style="background:#1f2937;"></i>${t("labels.nightShift")}</span>
    </div>
    ${data
      .map(
        (item) => `
          <div class="comparison-column">
            <div class="comparison-bars">
              <div class="comparison-bar day" style="height: ${(item.day / maxValue) * 100}%;"></div>
              <div class="comparison-bar night" style="height: ${(item.night / maxValue) * 100}%;"></div>
            </div>
            <div class="comparison-label">${item.label}</div>
          </div>
        `
      )
      .join("")}
  `;
}

function renderLossLog() {
  const rows = buildLossLog();

  if (!rows.length) {
    $("#loss-log").innerHTML = `<div class="empty-state">${t("messages.emptyLossLog")}</div>`;
    return;
  }

  $("#loss-log").innerHTML = `
    <div class="record-table">
      <div class="record-table-head loss-table-head">
        <span>${t("tables.timestampLoss")}</span>
        <span>${t("tables.lineAsset")}</span>
        <span>${t("tables.lossCategory")}</span>
        <span>${t("tables.duration")}</span>
        <span>${t("tables.impact")}</span>
        <span>${t("tables.actionTaken")}</span>
      </div>
      <div class="record-table-body">
        ${rows
          .map(
            (row) => `
              <div class="record-row loss-row">
                <div class="record-cell"><strong>${row.timestamp}</strong></div>
                <div class="record-cell"><strong>${row.asset}</strong></div>
                <div class="record-cell"><strong>${row.category}</strong></div>
                <div class="record-cell"><strong>${row.duration}</strong></div>
                <div class="record-cell"><span class="risk-pill risk-${row.impact}">${riskLabel(row.impact)}</span></div>
                <div class="record-cell"><strong>${row.action}</strong></div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderFilters() {
  const stages = ["全部", ...stageOrder];
  $("#stage-filters").innerHTML = stages
    .map(
      (stage) => `
        <button class="filter-chip ${stage === state.activeStage ? "active" : ""}" data-stage="${stage}" type="button">
          ${stage === "全部" ? t("common.all") : getStageLabel(stage)}
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeStage = button.dataset.stage;
      renderFilters();
      renderEquipment();
    });
  });
}

function renderEquipment() {
  const items = filteredEquipment();

  if (!items.length) {
    $("#equipment-grid").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyEquipment"), t("search.entityLabels.equipment"))}</div>`;
    return;
  }

  $("#equipment-grid").innerHTML = buildEquipmentCards(items);
}

function renderRisks() {
  const riskWeight = { high: 3, medium: 2, low: 1 };
  const items = [...filterEquipmentBySearch(getEquipment())].sort((left, right) => {
    const leftScore = riskWeight[left.riskLevel] * 100 + (100 - (left.oee || 0));
    const rightScore = riskWeight[right.riskLevel] * 100 + (100 - (right.oee || 0));
    return rightScore - leftScore;
  });

  $("#risk-list").innerHTML = items
    .slice(0, 4)
    .map(
      (item) => `
        <article class="risk-card ${item.riskLevel}">
          <div class="risk-head">
            <strong>${getEquipmentName(item)}</strong>
            <span class="risk-pill risk-${item.riskLevel}">${riskLabel(item.riskLevel)}</span>
          </div>
          <p>${getStageLabel(item.stage)} · ${getStationName(item.station)}</p>
          <div class="metric-row">
            <span>${t("labels.coreRisk")}</span>
            <strong>${(item.riskHits || []).slice(0, 2).map(getRiskHitLabel).join(" / ")}</strong>
          </div>
          <div class="metric-row">
            <span>${t("labels.maintenance")}</span>
            <strong>${item.nextPmDate}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function renderSpareParts() {
  const data = getFilteredSpareParts(state.dashboard.spareParts || []);

  $("#spare-list").innerHTML = data
    .map((part) => {
      const fill = Math.min((part.onHand / part.safetyStock) * 100, 100);
      return `
        <article class="spare-card">
          <div class="spare-head">
            <strong>${getSparePartName(part.name)}</strong>
            <span class="risk-pill risk-${part.riskLevel}">${riskLabel(part.riskLevel)}</span>
          </div>
          <p>${part.onHand} / ${part.safetyStock} · ${part.leadTimeDays} ${state.language === "zh" ? "天" : "d"}</p>
          <div class="progress-track spare-bar">
            <div class="progress-fill risk-${part.riskLevel}" style="width: ${fill}%;"></div>
          </div>
        </article>
      `;
    })
    .join("");

  if (!data.length) {
    $("#spare-list").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptySpareParts"), t("search.entityLabels.spare"))}</div>`;
  }
}

function renderLayoutMap() {
  const lanes = getFilteredLayoutLanes(state.dashboard.layoutLanes || []);
  if (!lanes.length) {
    $("#layout-map").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyLayout"), t("search.entityLabels.layout"))}</div>`;
    return;
  }

  $("#layout-map").innerHTML = lanes
    .map(
      (lane) => `
        <div class="layout-lane">
          <div class="lane-head">
            <strong>${getLaneName(lane.name)}</strong>
            <small>${lane.note}</small>
          </div>
          <div class="lane-row">
            ${lane.stations
              .map(
                (station, index) => `
                  <div class="station-wrap">
                    <article class="station-node status-${station.status}">
                      <span>${station.code}</span>
                      <strong>${getLayoutStationName(station.name)}</strong>
                      <small>${getLayoutMetaLabel(station.meta)}</small>
                    </article>
                    ${index < lane.stations.length - 1 ? '<div class="lane-arrow">→</div>' : ""}
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function renderReadiness() {
  $("#readiness-grid").innerHTML = buildReadinessMetrics()
    .map((item) => {
      const tone = readinessTone(item.value);
      return `
        <article class="readiness-card">
          <div class="readiness-head">
            <div class="readiness-meta">
              <span>${t("labels.readiness")}</span>
              <strong>${item.label}</strong>
              <small>${item.note}</small>
            </div>
            <div class="readiness-ring ${tone}" style="--fill:${item.value}%;">
              <span>${item.value}%</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const gapItems = buildGapItems();
  $("#gap-list").innerHTML = gapItems
    .map(
      (item) => `
        <article class="gap-item">
          <div>
            <strong>${getEquipmentName(item)}</strong>
            <small>${getStationName(item.station)} · ${getDrawingStatusLabel(item.drawingStatus)} / ${getLayoutStatusLabel(item.layoutStatus)}</small>
          </div>
          <span class="risk-pill risk-${item.riskLevel}">${riskLabel(item.riskLevel)}</span>
        </article>
      `
    )
    .join("");

  if (!gapItems.length) {
    $("#gap-list").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyGaps"), t("search.entityLabels.gap"))}</div>`;
  }
}

function renderRules() {
  const rules = getNormalizedRiskRules();
  const highRule = getRiskRuleByLevel("high");
  const mediumRule = getRiskRuleByLevel("medium");
  const lowRule = getRiskRuleByLevel("low");

  $("#rule-grid").innerHTML = rules
    ? `
      <div class="rule-toolbar">
        <p class="rule-editor-note">管理员可调整五个主指标阈值：OEE、T-loss、MTBF、MTTR、维修响应时间。保存后将立即重算所有设备的风险等级与风险提示。</p>
        <div class="rule-editor-actions">
          <span class="form-feedback ${state.ruleFeedback.isError ? "error" : ""} ${state.ruleFeedback.message ? "" : "hidden"}" id="rule-feedback">${state.ruleFeedback.message}</span>
          <button class="primary-btn" type="button" data-action="save-risk-rules">保存并重算</button>
        </div>
      </div>

      <article class="rule-card high editable">
        <div class="rule-head">
          <strong>${highRule ? highRule.title : "红色"}</strong>
          <span class="risk-pill risk-high">当前 ${getRiskLevelCount("high")} 台</span>
        </div>
        <div class="rule-threshold-grid">
          <label class="rule-threshold-field">
            <span>OEE 阈值 (%)</span>
            <input type="number" min="1" max="100" step="1" data-rule-level="high" data-field="oeeMax" value="${getRuleThreshold("high", "oeeMax")}" />
          </label>
          <label class="rule-threshold-field">
            <span>T-loss 阈值 (h)</span>
            <input type="number" min="0" step="0.1" data-rule-level="high" data-field="tLossMin" value="${getRuleThreshold("high", "tLossMin")}" />
          </label>
          <label class="rule-threshold-field">
            <span>MTBF 阈值 (h)</span>
            <input type="number" min="1" step="1" data-rule-level="high" data-field="mtbfMin" value="${getRuleThreshold("high", "mtbfMin")}" />
          </label>
          <label class="rule-threshold-field">
            <span>MTTR 阈值 (h)</span>
            <input type="number" min="0.1" step="0.1" data-rule-level="high" data-field="mttrMax" value="${getRuleThreshold("high", "mttrMax")}" />
          </label>
          <label class="rule-threshold-field">
            <span>维修响应时间阈值 (h)</span>
            <input type="number" min="0.1" step="0.1" data-rule-level="high" data-field="responseHoursMax" value="${getRuleThreshold("high", "responseHoursMax")}" />
          </label>
        </div>
        <div class="rule-lines">
          ${getRuleDescriptionLines(highRule).map((line) => `<span>${line}</span>`).join("")}
        </div>
      </article>

      <article class="rule-card medium editable">
        <div class="rule-head">
          <strong>${mediumRule ? mediumRule.title : "黄色"}</strong>
          <span class="risk-pill risk-medium">当前 ${getRiskLevelCount("medium")} 台</span>
        </div>
        <div class="rule-threshold-grid">
          <label class="rule-threshold-field">
            <span>OEE 阈值 (%)</span>
            <input type="number" min="1" max="100" step="1" data-rule-level="medium" data-field="oeeMax" value="${getRuleThreshold("medium", "oeeMax")}" />
          </label>
          <label class="rule-threshold-field">
            <span>T-loss 阈值 (h)</span>
            <input type="number" min="0" step="0.1" data-rule-level="medium" data-field="tLossMin" value="${getRuleThreshold("medium", "tLossMin")}" />
          </label>
          <label class="rule-threshold-field">
            <span>MTBF 阈值 (h)</span>
            <input type="number" min="1" step="1" data-rule-level="medium" data-field="mtbfMin" value="${getRuleThreshold("medium", "mtbfMin")}" />
          </label>
          <label class="rule-threshold-field">
            <span>MTTR 阈值 (h)</span>
            <input type="number" min="0.1" step="0.1" data-rule-level="medium" data-field="mttrMax" value="${getRuleThreshold("medium", "mttrMax")}" />
          </label>
          <label class="rule-threshold-field">
            <span>维修响应时间阈值 (h)</span>
            <input type="number" min="0.1" step="0.1" data-rule-level="medium" data-field="responseHoursMax" value="${getRuleThreshold("medium", "responseHoursMax")}" />
          </label>
        </div>
        <div class="rule-lines">
          ${getRuleDescriptionLines(mediumRule).map((line) => `<span>${line}</span>`).join("")}
        </div>
      </article>

      <article class="rule-card low">
        <div class="rule-head">
          <strong>${lowRule ? lowRule.title : "绿色"}</strong>
          <span class="risk-pill risk-low">当前 ${getRiskLevelCount("low")} 台</span>
        </div>
        <div class="rule-lines">
          ${getRuleDescriptionLines(lowRule).map((line) => `<span>${line}</span>`).join("")}
        </div>
      </article>
    `
    : "";

  document.querySelectorAll("#rule-grid input[data-rule-level][data-field]").forEach((input) => {
    if (input.value === "") {
      input.value = String(getRuleThreshold(input.dataset.ruleLevel, input.dataset.field));
    }
  });
}

function renderPredictiveMaintenance() {
  const insights = buildPredictiveInsights();

  if (!insights.length) {
    $("#predictive-kpi-grid").innerHTML = "";
    $("#predictive-cards").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyEquipment"), t("search.entityLabels.equipment"))}</div>`;
    $("#predictive-methods").innerHTML = "";
    $("#predictive-actions").innerHTML = "";
    $("#predictive-table").innerHTML = "";
    return;
  }

  const urgentItems = insights.filter((item) => item.probability >= 70);
  const plannedItems = insights.filter((item) => item.probability >= 45);
  const projectedLossHours = insights.reduce((sumValue, item) => sumValue + item.predictedDowntime, 0);
  const avgLeadDays = Math.round(insights.reduce((sumValue, item) => sumValue + item.leadDays, 0) / insights.length);

  renderKpiCards("#predictive-kpi-grid", [
    {
      label: t("predictive.highPriority"),
      value: String(urgentItems.length),
      badge: `${t("predictive.probability")} ≥ 70%`,
      note: t("predictive.highPriorityNote"),
      progress: urgentItems.length ? (urgentItems.length / Math.max(insights.length, 1)) * 100 : 0,
      accent: urgentItems.length ? "red" : "blue",
    },
    {
      label: t("predictive.maintenanceLoad"),
      value: String(plannedItems.length),
      badge: t("predictive.next7Days"),
      note: t("predictive.maintenanceLoadNote"),
      progress: plannedItems.length ? (plannedItems.length / Math.max(insights.length, 1)) * 100 : 0,
      accent: "blue",
    },
    {
      label: t("predictive.projectedLossHours"),
      value: `${projectedLossHours.toFixed(1)} h`,
      badge: t("predictive.next7Days"),
      note: t("predictive.projectedLossNote"),
      progress: Math.min(100, projectedLossHours * 2),
      accent: projectedLossHours >= 45 ? "red" : "blue",
    },
    {
      label: t("predictive.avgLeadTime"),
      value: `${avgLeadDays} d`,
      badge: t("predictive.maintenanceWindow"),
      note: t("predictive.avgLeadTimeNote"),
      progress: Math.min(100, avgLeadDays * 4),
      accent: "neutral",
    },
  ]);

  $("#predictive-cards").innerHTML = insights
    .slice(0, 4)
    .map(
      (item) => `
        <article class="predictive-card">
          <div class="predictive-card-head">
            <div>
              <strong>${item.name}</strong>
              <small>${item.station} · ${item.id}</small>
            </div>
            <span class="risk-pill risk-${item.probability >= 70 ? "high" : item.probability >= 45 ? "medium" : "low"}">${item.probability}%</span>
          </div>
          <div class="predictive-metrics">
            <div class="predictive-metric">
              <span>${t("predictive.projectedLoss")}</span>
              <strong>${item.predictedDowntime.toFixed(1)} h</strong>
            </div>
            <div class="predictive-metric">
              <span>${t("predictive.maintenanceWindow")}</span>
              <strong>${item.windowLabel}</strong>
            </div>
            <div class="predictive-metric">
              <span>${t("predictive.confidence")}</span>
              <strong>${item.confidence}%</strong>
            </div>
          </div>
          <div class="predictive-driver-row">
            <span>${t("predictive.drivers")}</span>
            <strong>${item.topDrivers.map((driver) => driver.label).join(" / ") || "--"}</strong>
          </div>
          <p>${item.recommendation || "--"}</p>
        </article>
      `
    )
    .join("");

  $("#predictive-methods").innerHTML = [
    {
      title: t("predictive.methodRuleTitle"),
      body: t("predictive.methodRuleText"),
    },
    {
      title: t("predictive.methodTrendTitle"),
      body: t("predictive.methodTrendText"),
    },
    {
      title: t("predictive.methodActionTitle"),
      body: t("predictive.methodActionText"),
    },
  ]
    .map(
      (item) => `
        <article class="predictive-method-card">
          <strong>${item.title}</strong>
          <p>${item.body}</p>
        </article>
      `
    )
    .join("");

  const recommendationFrequency = new Map();
  insights
    .slice(0, 6)
    .forEach((item) => {
      if (item.recommendation) {
        recommendationFrequency.set(item.recommendation, (recommendationFrequency.get(item.recommendation) || 0) + 1);
      }
    });

  $("#predictive-actions").innerHTML = [...recommendationFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(
      ([text, count]) => `
        <div class="predictive-action-item">
          <strong>${count} 台设备</strong>
          <p>${text}</p>
        </div>
      `
    )
    .join("");

  $("#predictive-table").innerHTML = `
    <div class="record-table">
      <div class="record-table-head predictive-table-head">
        <span>${t("tables.equipmentStation")}</span>
        <span>${t("predictive.probability")}</span>
        <span>${t("predictive.projectedLoss")}</span>
        <span>${t("predictive.maintenanceWindow")}</span>
        <span>${t("predictive.drivers")}</span>
        <span>${t("predictive.recommendation")}</span>
      </div>
      <div class="record-table-body">
        ${insights
          .map(
            (item) => `
              <div class="record-row predictive-row">
                <div class="record-cell">
                  <strong>${item.name}</strong>
                  <small>${item.station} · ${item.id}</small>
                </div>
                <div class="record-cell">
                  <strong>${item.probability}%</strong>
                  <small>${t("predictive.confidence")} ${item.confidence}%</small>
                </div>
                <div class="record-cell">
                  <strong>${item.predictedDowntime.toFixed(1)} h</strong>
                  <small>${t("predictive.next7Days")}</small>
                </div>
                <div class="record-cell">
                  <strong>${item.windowLabel}</strong>
                  <small>${item.leadDays} d</small>
                </div>
                <div class="record-cell">
                  <strong>${item.topDrivers.map((driver) => driver.label).join(" / ") || "--"}</strong>
                </div>
                <div class="record-cell">
                  <strong>${item.recommendation || "--"}</strong>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderEquipmentOptions() {
  $("#submission-equipment").innerHTML = getEquipment()
    .map((item) => `<option value="${item.id}">${getEquipmentName(item)} · ${getStationName(item.station)}</option>`)
    .join("");
}

function renderEmployeeOverview() {
  renderKpiCards("#employee-overview-stats", buildAdminKpis());

  const items = filterEquipmentBySearch(getEquipment()).slice(0, 6);
  if (!items.length) {
    $("#employee-equipment-grid").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyEmployeeEquipment"), t("search.entityLabels.equipment"))}</div>`;
    return;
  }

  $("#employee-equipment-grid").innerHTML = buildEquipmentCards(items);
}

function renderEmployeeSubmissions() {
  const items = getFilteredSubmissions(state.submissions);

  if (!items.length) {
    $("#employee-submissions").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyEmployeeSubmissions"), t("search.entityLabels.submission"))}</div>`;
    return;
  }

  const rows = items
    .map(
      (item) => `
        <div class="record-row record-row-employee">
          <div class="record-cell">
            <strong>${getSubmissionEquipmentName(item)}</strong>
            <small>${getStationName(item.station)}</small>
          </div>
          <div class="record-cell">
            <strong>${getChangeTypeLabel(item.changeType)}</strong>
            <small>${submissionDetailSummary(item)}</small>
          </div>
          <div class="record-cell">
            <span class="status-tag ${reviewClass(item.status)}">${getReviewStatusLabel(item.status)}</span>
          </div>
          <div class="record-cell">
            <strong>${formatTime(item.createdAt)}</strong>
          </div>
        </div>
      `
    )
    .join("");

  $("#employee-submissions").innerHTML = `
    <div class="record-table">
      <div class="record-table-head record-table-head-employee">
        <span>${t("tables.equipmentStation")}</span>
        <span>${t("tables.submissionType")}</span>
        <span>${t("tables.status")}</span>
        <span>${t("tables.time")}</span>
      </div>
      <div class="record-table-body">
        ${rows}
      </div>
    </div>
  `;
}

function renderUserManagement() {
  const users = getFilteredUsers(state.users);

  if (!users.length) {
    $("#user-admin-table").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyUsers"), t("search.entityLabels.user"))}</div>`;
    return;
  }

  const rows = users
    .map(
      (item) => `
        <div class="record-row record-row-users">
          <div class="record-cell">
            <strong>${item.displayName}</strong>
            <small>${item.username} · ${item.id}</small>
          </div>
          <div class="record-cell">
            <span class="account-role-badge role-${item.role}">${getRoleLabel(item.role)}</span>
          </div>
          <div class="record-cell">
            <strong>${formatTime(item.createdAt)}</strong>
          </div>
          <div class="record-cell">
            <strong>${formatTime(item.updatedAt || item.createdAt)}</strong>
          </div>
          <div class="record-cell">
            ${
              item.role === "admin"
                ? `<span class="record-static">${t("actions.systemAdmin")}</span>`
                : `
                  <button
                    class="ghost-btn compact-btn"
                    type="button"
                    data-action="toggle-user-role"
                    data-id="${item.id}"
                    data-next-role="${item.role === "editor" ? "viewer" : "editor"}"
                  >
                    ${item.role === "editor" ? t("actions.switchToViewer") : t("actions.switchToEditor")}
                  </button>
                `
            }
          </div>
        </div>
      `
    )
    .join("");

  $("#user-admin-table").innerHTML = `
    <div class="record-table">
      <div class="record-table-head record-table-head-users">
        <span>${t("tables.nameAccount")}</span>
        <span>${t("tables.currentRole")}</span>
        <span>${t("tables.createdAt")}</span>
        <span>${t("tables.updatedAt")}</span>
        <span>${t("tables.action")}</span>
      </div>
      <div class="record-table-body">
        ${rows}
      </div>
    </div>
  `;
}

function renderAuditLogs() {
  const items = getFilteredAuditLogs(state.auditLogs).slice(0, 20);
  if (!items.length) {
    $("#audit-log-table").innerHTML = `<div class="empty-state">${getSearchEmptyMessage(t("messages.emptyAudit"), t("search.entityLabels.audit"))}</div>`;
    return;
  }

  const rows = items
    .map(
      (item) => `
        <div class="record-row record-row-audit">
          <div class="record-cell">
            <strong>${formatTime(item.createdAt)}</strong>
            <small>${item.id}</small>
          </div>
          <div class="record-cell">
            <strong>${item.summary}</strong>
            <small>${getAuditActionLabel(item.action)}</small>
          </div>
          <div class="record-cell">
            <span class="account-role-badge role-${item.actorRole}">${getRoleLabel(item.actorRole)}</span>
            <small>${item.actorName}</small>
          </div>
          <div class="record-cell">
            <strong>${getTargetTypeLabel(item.targetType)}</strong>
            <small>${item.targetId}</small>
          </div>
        </div>
      `
    )
    .join("");

  $("#audit-log-table").innerHTML = `
    <div class="record-table">
      <div class="record-table-head record-table-head-audit">
        <span>${t("tables.time")}</span>
        <span>${t("tables.event")}</span>
        <span>${t("tables.actor")}</span>
        <span>${t("tables.target")}</span>
      </div>
      <div class="record-table-body">
        ${rows}
      </div>
    </div>
  `;
}

function renderAdminDashboard() {
  renderKpis();
  renderSubmissionOverview();
  renderSubmissionFeed();
  renderWorkerPerformance();
  renderLifecycle();
  renderAnalyticsKpis();
  renderTrendChart();
  renderDowntimeCauses();
  renderComparisonChart();
  renderLossLog();
  renderFilters();
  renderEquipment();
  renderRisks();
  renderSpareParts();
  renderLayoutMap();
  renderReadiness();
  renderRules();
  renderPredictiveMaintenance();
  renderUserManagement();
  renderAuditLogs();
}

function setUserCreateFeedback(message, isError = false) {
  const feedback = $("#user-create-feedback");
  feedback.textContent = message;
  feedback.classList.remove("hidden", "error");
  if (isError) {
    feedback.classList.add("error");
  }
}

function clearUserCreateFeedback() {
  const feedback = $("#user-create-feedback");
  feedback.textContent = "";
  feedback.classList.add("hidden");
  feedback.classList.remove("error");
}

function setRuleFeedback(message, isError = false) {
  state.ruleFeedback = {
    message,
    isError,
  };

  const feedback = $("#rule-feedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.classList.toggle("hidden", !message);
  feedback.classList.toggle("error", isError);
}

function setFeedback(message, isError = false) {
  const feedback = $("#submission-feedback");
  feedback.textContent = message;
  feedback.classList.remove("hidden", "error");
  if (isError) {
    feedback.classList.add("error");
  }
}

function clearFeedback() {
  const feedback = $("#submission-feedback");
  feedback.textContent = "";
  feedback.classList.add("hidden");
  feedback.classList.remove("error");
}

function updateFormByChangeType() {
  const type = $("#change-type").value;
  const quantityField = $("#quantity-field");
  const quantityInput = $("#quantity-delta");
  const statusField = $("#status-field");
  const statusInput = $("#new-status");

  const needsQuantity = type === "equipment_quantity" || type === "spare_update";
  const needsStatus = type === "status_update";

  quantityField.classList.toggle("hidden", !needsQuantity);
  statusField.classList.toggle("hidden", !needsStatus);

  quantityInput.required = needsQuantity;
  statusInput.required = needsStatus;

  if (!needsQuantity) {
    quantityInput.value = "";
  }

  if (!needsStatus) {
    statusInput.value = "";
  }
}

function updateAuthHint() {
  $("#auth-hint").textContent = t("auth.hint");
}

function showAuthError(message) {
  const errorBox = $("#auth-error");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearAuthError() {
  $("#auth-error").textContent = "";
  $("#auth-error").classList.add("hidden");
}

function buildWorkerPerformanceQuery(extra = {}) {
  const filters = {
    ...(state.workerPerformance.filters || {}),
    ...extra,
  };
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function roundWorkerValue(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Number(number.toFixed(digits));
}

function getLocalMonthlyEmployeeRecords() {
  const records = window.BOSCH_WORKER_MONTHLY_DATA?.records || [];
  return records.filter((record) => !record.isTotal && record.employeeName !== "Total");
}

function getCurrentWorkerMonthLabel() {
  return new Date().toLocaleString("en-US", { month: "short" });
}

function isLocalCompletedWorkerMonth(month) {
  const parts = getWorkerMonthParts(month);
  const currentDate = new Date();
  if (parts.year) {
    const year = Number(parts.year);
    if (year < currentDate.getFullYear()) {
      return true;
    }
    if (year > currentDate.getFullYear()) {
      return false;
    }
    return parts.monthIndex >= 0 && parts.monthIndex < currentDate.getMonth();
  }
  if (parts.monthIndex < 0) {
    return true;
  }
  return parts.monthIndex < currentDate.getMonth();
}

function getLocalCompletedMonthOrder() {
  const data = window.BOSCH_WORKER_MONTHLY_DATA || {};
  return (data.monthOrder || []).filter(isLocalCompletedWorkerMonth);
}

function getLocalCompletedMonthlyEmployeeRecords() {
  const completedMonths = new Set(getLocalCompletedMonthOrder());
  return getLocalMonthlyEmployeeRecords().filter((record) => completedMonths.has(record.month));
}

function getRequestedLocalWorkerMonth(requestedMonth) {
  const completedMonths = new Set(getLocalCompletedMonthOrder());
  return requestedMonth && completedMonths.has(requestedMonth) ? requestedMonth : getLocalDefaultWorkerMonth();
}

function getValidLocalWorkerMonth(requestedMonth) {
  const completedMonths = new Set(getLocalCompletedMonthOrder());
  return requestedMonth && completedMonths.has(requestedMonth) ? requestedMonth : "";
}

function isWorkerRegularMonth(month) {
  const parts = getWorkerMonthParts(month);
  return Boolean(parts.year && parts.monthIndex >= 0) || WORKER_MONTH_NAMES.includes(month);
}

function getLocalDefaultWorkerMonth() {
  const records = getLocalCompletedMonthlyEmployeeRecords();
  const totals = new Map();

  records.forEach((record) => {
    const current = totals.get(record.month) || { attendanceHours: 0, activity: 0 };
    current.attendanceHours += Number(record.attendanceHours) || 0;
    current.activity += (Number(record.orderCount) || 0) + (Number(record.repairHours) || 0);
    totals.set(record.month, current);
  });

  return (
    [...getLocalCompletedMonthOrder()]
      .reverse()
      .find((month) => {
        const total = totals.get(month);
        return isWorkerRegularMonth(month) && total && total.attendanceHours > 0 && total.activity > 0;
      }) ||
    [...getLocalCompletedMonthOrder()]
      .reverse()
      .find((month) => {
        const total = totals.get(month);
        return isWorkerRegularMonth(month) && total && total.activity > 0;
      }) ||
    ""
  );
}

function applyLocalWorkerFilters(records, filters, defaultMonth) {
  const year = filters.year || "";
  const month = filters.month || (!year ? defaultMonth || "" : "");
  const shift = filters.shift || "";
  const employeeKey = filters.employeeKey || "";

  return records.filter((record) => {
    if (month && record.month !== month) return false;
    if (!month && year && getWorkerMonthYear(record.month) !== year) return false;
    if (shift && record.shift !== shift) return false;
    if (employeeKey && record.employeeKey !== employeeKey) return false;
    return true;
  });
}

function aggregateLocalWorkerRecordsByEmployee(records, periodLabel) {
  const grouped = new Map();
  (records || []).forEach((record) => {
    const key = record.employeeKey;
    const current = grouped.get(key) || {
      id: `${key}::${periodLabel}`,
      shift: record.shift,
      employeeKey: key,
      employeeName: record.employeeName,
      month: periodLabel,
      isTotal: false,
      attendanceHours: 0,
      orderCount: 0,
      repairHours: 0,
    };
    current.attendanceHours += Number(record.attendanceHours) || 0;
    current.orderCount += Number(record.orderCount) || 0;
    current.repairHours += Number(record.repairHours) || 0;
    grouped.set(key, current);
  });

  return [...grouped.values()].map((record) => ({
    ...record,
    attendanceHours: roundWorkerValue(record.attendanceHours, 1),
    orderCount: roundWorkerValue(record.orderCount, 4),
    repairHours: roundWorkerValue(record.repairHours, 4),
    repairEfficiency: record.attendanceHours ? roundWorkerValue(record.repairHours / record.attendanceHours, 4) : 0,
    orderEfficiency: record.attendanceHours ? roundWorkerValue(record.orderCount / record.attendanceHours, 4) : 0,
  }));
}

function isWorkerRankingQualityFlag(record) {
  return (
    (Number(record.attendanceHours) || 0) <= 0 &&
    ((Number(record.orderCount) || 0) > 0 || (Number(record.repairHours) || 0) > 0)
  );
}

function buildWorkerPerformanceScoredRecords(records, rounder = roundWorkerValue) {
  const items = Array.isArray(records) ? records : [];
  const rankableItems = items.filter((record) => !isWorkerRankingQualityFlag(record));
  const maxOrderCount = Math.max(...rankableItems.map((record) => Number(record.orderCount) || 0), 0);
  const maxRepairHours = Math.max(...rankableItems.map((record) => Number(record.repairHours) || 0), 0);
  const maxRepairEfficiency = Math.max(
    ...rankableItems.map((record) => Number(record.repairEfficiency) || 0),
    0
  );
  const scorePart = (value, maxValue) => (maxValue > 0 ? Math.min(100, Math.max(0, (value / maxValue) * 100)) : 0);

  return items.map((record) => {
    const qualityFlag = isWorkerRankingQualityFlag(record);
    const orderScore = scorePart(Number(record.orderCount) || 0, maxOrderCount);
    const repairHoursScore = scorePart(Number(record.repairHours) || 0, maxRepairHours);
    const efficiencyScore = qualityFlag ? 0 : scorePart(Number(record.repairEfficiency) || 0, maxRepairEfficiency);
    const qualityScore = qualityFlag ? 0 : 100;
    const performanceScore = qualityFlag ? 0 : orderScore * 0.4 + repairHoursScore * 0.3 + efficiencyScore * 0.2 + qualityScore * 0.1;

    return {
      ...record,
      qualityFlag,
      orderScore: rounder(orderScore, 1),
      repairHoursScore: rounder(repairHoursScore, 1),
      efficiencyScore: rounder(efficiencyScore, 1),
      qualityScore: rounder(qualityScore, 1),
      performanceScore: rounder(performanceScore, 1),
    };
  });
}

function rankLocalMonthlyWorkers(records) {
  const totalRepairHours = records.reduce((sum, record) => sum + (Number(record.repairHours) || 0), 0);

  return buildWorkerPerformanceScoredRecords(records)
    .sort((left, right) => {
      if (left.qualityFlag !== right.qualityFlag) {
        return left.qualityFlag ? 1 : -1;
      }
      if ((Number(right.performanceScore) || 0) !== (Number(left.performanceScore) || 0)) {
        return (Number(right.performanceScore) || 0) - (Number(left.performanceScore) || 0);
      }
      if ((Number(right.orderCount) || 0) !== (Number(left.orderCount) || 0)) {
        return (Number(right.orderCount) || 0) - (Number(left.orderCount) || 0);
      }
      return String(left.employeeName).localeCompare(String(right.employeeName), "zh-CN");
    })
    .map((record, index) => ({
      id: record.id,
      rank: index + 1,
      shift: record.shift,
      employeeKey: record.employeeKey,
      employeeName: record.employeeName,
      month: record.month,
      attendanceHours: roundWorkerValue(record.attendanceHours, 1),
      orderCount: roundWorkerValue(record.orderCount, 1),
      repairHours: roundWorkerValue(record.repairHours, 1),
      repairEfficiency: roundWorkerValue(record.repairEfficiency, 4),
      orderEfficiency: roundWorkerValue(record.orderEfficiency, 4),
      repairHoursShare: totalRepairHours ? roundWorkerValue(((Number(record.repairHours) || 0) / totalRepairHours) * 100, 1) : 0,
      performanceScore: roundWorkerValue(record.performanceScore, 1),
      orderScore: roundWorkerValue(record.orderScore, 1),
      repairHoursScore: roundWorkerValue(record.repairHoursScore, 1),
      efficiencyScore: roundWorkerValue(record.efficiencyScore, 1),
      qualityScore: roundWorkerValue(record.qualityScore, 1),
      qualityFlag: record.qualityFlag,
      qualityReason: "有接单/维修但出勤为 0",
    }));
}

function buildLocalShiftComparison(records) {
  const shiftMap = new Map();
  records.forEach((record) => {
    const current = shiftMap.get(record.shift) || {
      shift: record.shift,
      attendanceHours: 0,
      orderCount: 0,
      repairHours: 0,
      employeeKeys: new Set(),
    };
    current.attendanceHours += Number(record.attendanceHours) || 0;
    current.orderCount += Number(record.orderCount) || 0;
    current.repairHours += Number(record.repairHours) || 0;
    current.employeeKeys.add(record.employeeKey);
    shiftMap.set(record.shift, current);
  });

  return [...shiftMap.values()]
    .map((item) => ({
      shift: item.shift,
      attendanceHours: roundWorkerValue(item.attendanceHours, 1),
      orderCount: roundWorkerValue(item.orderCount, 1),
      repairHours: roundWorkerValue(item.repairHours, 1),
      repairEfficiency: item.attendanceHours ? roundWorkerValue(item.repairHours / item.attendanceHours, 4) : 0,
      orderEfficiency: item.attendanceHours ? roundWorkerValue(item.orderCount / item.attendanceHours, 4) : 0,
      employeeCount: item.employeeKeys.size,
    }))
    .sort((left, right) => right.repairHours - left.repairHours);
}

function buildLocalWorkerTopLists(workers) {
  const rankableWorkers = workers.filter((worker) => !worker.qualityFlag);
  const nonZeroEfficiency = rankableWorkers.filter((worker) => worker.repairEfficiency > 0);
  return {
    performanceHigh: [...rankableWorkers].sort((left, right) => right.performanceScore - left.performanceScore).slice(0, 5),
    repairEfficiencyHigh: [...nonZeroEfficiency].sort((left, right) => right.repairEfficiency - left.repairEfficiency).slice(0, 5),
    repairEfficiencyLow: [...nonZeroEfficiency].sort((left, right) => left.repairEfficiency - right.repairEfficiency).slice(0, 5),
    orderCountHigh: [...rankableWorkers].sort((left, right) => right.orderCount - left.orderCount).slice(0, 5),
    repairHoursHigh: [...rankableWorkers].sort((left, right) => right.repairHours - left.repairHours).slice(0, 5),
  };
}

function buildLocalWorkerPayload(filters = state.workerPerformance.filters) {
  const data = window.BOSCH_WORKER_MONTHLY_DATA || {};
  const defaultMonth = getLocalDefaultWorkerMonth();
  const requestedYear = filters.year || "";
  const validMonth = getValidLocalWorkerMonth(filters.month);
  const selectedYear = requestedYear && getLocalCompletedMonthOrder().some((month) => getWorkerMonthYear(month) === requestedYear) ? requestedYear : "";
  const selectedMonth = validMonth && (!selectedYear || getWorkerMonthYear(validMonth) === selectedYear) ? validMonth : selectedYear ? "" : defaultMonth;
  const selectedPeriod = selectedMonth || (selectedYear ? `${selectedYear} 全年` : defaultMonth);
  const effectiveFilters = { ...filters, year: selectedYear, month: selectedMonth };
  const allRecords = getLocalCompletedMonthlyEmployeeRecords();
  const completedMonthSet = new Set(getLocalCompletedMonthOrder());
  const records = applyLocalWorkerFilters(allRecords, effectiveFilters, defaultMonth);
  const workerRecords = aggregateLocalWorkerRecordsByEmployee(records, selectedPeriod);
  const workers = rankLocalMonthlyWorkers(workerRecords);
  const topRecords = applyLocalWorkerFilters(allRecords, selectedMonth ? { month: selectedMonth } : { year: selectedYear }, defaultMonth);
  const topWorkers = rankLocalMonthlyWorkers(aggregateLocalWorkerRecordsByEmployee(topRecords, selectedPeriod));
  const totalAttendanceHours = records.reduce((sum, record) => sum + (Number(record.attendanceHours) || 0), 0);
  const totalOrderCount = records.reduce((sum, record) => sum + (Number(record.orderCount) || 0), 0);
  const totalRepairHours = records.reduce((sum, record) => sum + (Number(record.repairHours) || 0), 0);
  const missingAttendanceCount = records.filter(
    (record) =>
      (Number(record.attendanceHours) || 0) <= 0 &&
      ((Number(record.orderCount) || 0) > 0 || (Number(record.repairHours) || 0) > 0)
  ).length;
  const qualityStats = getWorkerQualityStats(records);

  return {
    summary: {
      selectedMonth,
      selectedYear,
      selectedPeriod,
      totalAttendanceHours: roundWorkerValue(totalAttendanceHours, 1),
      totalOrderCount: roundWorkerValue(totalOrderCount, 1),
      totalRepairHours: roundWorkerValue(totalRepairHours, 1),
      avgRepairEfficiency: totalAttendanceHours ? roundWorkerValue(totalRepairHours / totalAttendanceHours, 4) : 0,
      employeeCount: new Set(records.map((record) => record.employeeKey)).size,
      shiftCount: new Set(records.map((record) => record.shift)).size,
      missingAttendanceCount,
      qualityStats,
    },
    workers,
    shiftComparison: buildLocalShiftComparison(records),
    topLists: buildLocalWorkerTopLists(topWorkers),
    filterOptions: {
      years: data.filterOptions?.years || getWorkerYearOptions(data.filterOptions?.months || data.monthOrder || []),
      months: (data.filterOptions?.months || data.monthOrder || []).filter((month) => completedMonthSet.has(month)),
      shifts: data.filterOptions?.shifts || [],
      employees: data.filterOptions?.employees || [],
      defaultMonth,
    },
  };
}

function averageLocalMonthlyRecords(records, month, field) {
  const values = records
    .filter((record) => record.month === month)
    .map((record) => Number(record[field]) || 0)
    .filter((value) => value > 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function averageLocalWorkerRecords(records, field) {
  const values = (records || [])
    .map((record) => Number(record[field]) || 0)
    .filter((value) => value > 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function buildLocalWorkerDetail(employeeKey, filters = state.workerPerformance.filters) {
  const allRecords = getLocalCompletedMonthlyEmployeeRecords();
  const defaultMonth = getLocalDefaultWorkerMonth();
  const requestedYear = filters.year || "";
  const validMonth = getValidLocalWorkerMonth(filters.month);
  const selectedYear = requestedYear && getLocalCompletedMonthOrder().some((month) => getWorkerMonthYear(month) === requestedYear) ? requestedYear : "";
  const selectedMonth = validMonth && (!selectedYear || getWorkerMonthYear(validMonth) === selectedYear) ? validMonth : selectedYear ? "" : defaultMonth;
  const selectedPeriod = selectedMonth || (selectedYear ? `${selectedYear} 全年` : defaultMonth);
  const employeeRecords = allRecords
    .filter((record) => record.employeeKey === employeeKey)
    .sort((left, right) => getLocalCompletedMonthOrder().indexOf(left.month) - getLocalCompletedMonthOrder().indexOf(right.month));
  const periodRecords = applyLocalWorkerFilters(allRecords, { ...filters, year: selectedYear, month: selectedMonth }, defaultMonth);
  const periodEmployeeRecords = periodRecords.filter((record) => record.employeeKey === employeeKey);
  const currentRecord =
    aggregateLocalWorkerRecordsByEmployee(periodEmployeeRecords, selectedPeriod)[0] ||
    employeeRecords.find((record) => record.month === selectedMonth) ||
    employeeRecords[employeeRecords.length - 1] ||
    null;

  if (!currentRecord) {
    return null;
  }

  const sameShiftRecords = allRecords.filter((record) => record.shift === currentRecord.shift);
  const periodShiftRecords = periodRecords.filter((record) => record.shift === currentRecord.shift);
  const rankingFilters = { ...filters, year: selectedYear, month: selectedMonth, employeeKey: "" };
  const rankingRecords = aggregateLocalWorkerRecordsByEmployee(applyLocalWorkerFilters(allRecords, rankingFilters, defaultMonth), selectedPeriod);
  const shiftComparisonRecords = aggregateLocalWorkerRecordsByEmployee(periodShiftRecords, selectedPeriod);
  const overallComparisonRecords = aggregateLocalWorkerRecordsByEmployee(periodRecords, selectedPeriod);
  const summary = rankLocalMonthlyWorkers(rankingRecords).find((record) => record.employeeKey === employeeKey) || rankLocalMonthlyWorkers([currentRecord])[0];
  const trendRecords = selectedYear ? employeeRecords.filter((record) => getWorkerMonthYear(record.month) === selectedYear) : employeeRecords;

  return {
    summary: {
      ...summary,
      selectedMonth,
      selectedYear,
      selectedPeriod,
    },
    monthlyTrends: trendRecords.map((record) => ({
      month: record.month,
      attendanceHours: roundWorkerValue(record.attendanceHours, 1),
      orderCount: roundWorkerValue(record.orderCount, 1),
      repairHours: roundWorkerValue(record.repairHours, 1),
      repairEfficiency: roundWorkerValue(record.repairEfficiency, 4),
      orderEfficiency: roundWorkerValue(record.orderEfficiency, 4),
      shiftAvgRepairEfficiency: roundWorkerValue(averageLocalMonthlyRecords(sameShiftRecords, record.month, "repairEfficiency"), 4),
      overallAvgRepairEfficiency: roundWorkerValue(averageLocalMonthlyRecords(allRecords, record.month, "repairEfficiency"), 4),
    })),
    comparisons: {
      shift: currentRecord.shift,
      selectedMonth,
      selectedYear,
      selectedPeriod,
      shiftAvgRepairEfficiency: roundWorkerValue(averageLocalWorkerRecords(shiftComparisonRecords, "repairEfficiency"), 4),
      overallAvgRepairEfficiency: roundWorkerValue(averageLocalWorkerRecords(overallComparisonRecords, "repairEfficiency"), 4),
      shiftAvgOrderEfficiency: roundWorkerValue(averageLocalWorkerRecords(shiftComparisonRecords, "orderEfficiency"), 4),
      overallAvgOrderEfficiency: roundWorkerValue(averageLocalWorkerRecords(overallComparisonRecords, "orderEfficiency"), 4),
      shiftEmployeeCount: new Set(periodShiftRecords.map((record) => record.employeeKey)).size,
      overallEmployeeCount: new Set(periodRecords.map((record) => record.employeeKey)).size,
    },
  };
}

async function refreshWorkerPerformanceData({ render = true, preserveDetail = true } = {}) {
  if (WORKER_ONLY_MODE && window.BOSCH_WORKER_MONTHLY_DATA) {
    await refreshWorkerOnlyData();
    return;
  }

  const payload = await apiFetch(`/api/worker-performance/monthly${buildWorkerPerformanceQuery()}`);
  state.workerPerformance.summary = payload.summary || {};
  state.workerPerformance.workers = payload.workers || [];
  state.workerPerformance.topLists = payload.topLists || {};
  state.workerPerformance.shiftComparison = payload.shiftComparison || [];
  state.workerPerformance.filterOptions = payload.filterOptions || {
    years: [],
    months: [],
    shifts: [],
    employees: [],
    defaultMonth: "",
  };
  if (!state.workerPerformance.filters.month && !state.workerPerformance.filters.year) {
    state.workerPerformance.filters.month =
      state.workerPerformance.filterOptions.defaultMonth || state.workerPerformance.summary.selectedMonth || "";
  }

  const stillHasSelectedWorker =
    preserveDetail &&
    state.workerPerformance.selectedEmployeeKey &&
    state.workerPerformance.workers.some((item) => item.employeeKey === state.workerPerformance.selectedEmployeeKey);

  if (!stillHasSelectedWorker) {
    state.workerPerformance.selectedEmployeeKey = "";
    state.workerPerformance.detail = null;
  }

  const detailEmployeeKey = state.workerPerformance.selectedEmployeeKey || state.workerPerformance.workers[0]?.employeeKey || "";
  if (detailEmployeeKey) {
    state.workerPerformance.selectedEmployeeKey = detailEmployeeKey;
    state.workerPerformance.detail = await apiFetch(
      `/api/worker-performance/monthly/${encodeURIComponent(detailEmployeeKey)}${buildWorkerPerformanceQuery()}`
    ).catch(() => null);
  }

  if (render) {
    renderWorkerPerformance();
    refreshSearchResults(false);
  }
}

async function refreshWorkerOnlyData() {
  if (!window.BOSCH_WORKER_MONTHLY_DATA) {
    state.workerPerformance.summary = {
      selectedMonth: "--",
      totalAttendanceHours: 0,
      totalOrderCount: 0,
      totalRepairHours: 0,
      avgRepairEfficiency: 0,
      employeeCount: 0,
      shiftCount: 0,
      missingAttendanceCount: 0,
      loadError: "本地数据文件 data/worker-performance-monthly.js 未加载",
    };
    state.workerPerformance.workers = [];
    state.workerPerformance.topLists = {};
    state.workerPerformance.shiftComparison = [];
    state.workerPerformance.detail = null;
    renderWorkerPerformance();
    return;
  }

  const workerPayload = window.BOSCH_WORKER_MONTHLY_DATA
    ? buildLocalWorkerPayload()
    : await apiFetch(`/api/worker-performance/monthly${buildWorkerPerformanceQuery()}`);
  state.workerPerformance.summary = workerPayload.summary || {};
  state.workerPerformance.workers = workerPayload.workers || [];
  state.workerPerformance.topLists = workerPayload.topLists || {};
  state.workerPerformance.shiftComparison = workerPayload.shiftComparison || [];
  state.workerPerformance.filterOptions = workerPayload.filterOptions || state.workerPerformance.filterOptions;
  if (!state.workerPerformance.filters.month && !state.workerPerformance.filters.year) {
    state.workerPerformance.filters.month =
      state.workerPerformance.filterOptions.defaultMonth || state.workerPerformance.summary.selectedMonth || "";
  }

  if (
    state.workerPerformance.selectedEmployeeKey &&
    !state.workerPerformance.workers.some((item) => item.employeeKey === state.workerPerformance.selectedEmployeeKey)
  ) {
    state.workerPerformance.selectedEmployeeKey = "";
    state.workerPerformance.detail = null;
  }

  const detailEmployeeKey = state.workerPerformance.selectedEmployeeKey || state.workerPerformance.workers[0]?.employeeKey || "";
  if (detailEmployeeKey) {
    state.workerPerformance.selectedEmployeeKey = detailEmployeeKey;
    state.workerPerformance.detail = window.BOSCH_WORKER_MONTHLY_DATA
      ? buildLocalWorkerDetail(detailEmployeeKey)
      : await apiFetch(`/api/worker-performance/monthly/${encodeURIComponent(detailEmployeeKey)}${buildWorkerPerformanceQuery()}`).catch(
          () => null
        );
  }

  renderWorkerPerformance();
}

async function refreshAdminData() {
  const [dashboardPayload, submissionPayload, userPayload, auditPayload, workerPayload] = await Promise.all([
    apiFetch("/api/dashboard"),
    apiFetch("/api/submissions"),
    apiFetch("/api/users"),
    apiFetch("/api/audit-logs"),
    apiFetch(`/api/worker-performance/monthly${buildWorkerPerformanceQuery()}`),
  ]);
  state.dashboard = {
    ...dashboardPayload,
    riskRules: Array.isArray(dashboardPayload.riskRules) ? dashboardPayload.riskRules : [],
  };
  state.submissions = submissionPayload.submissions;
  state.users = userPayload.users;
  state.auditLogs = auditPayload.auditLogs;
  state.workerPerformance.summary = workerPayload.summary || {};
  state.workerPerformance.workers = workerPayload.workers || [];
  state.workerPerformance.topLists = workerPayload.topLists || {};
  state.workerPerformance.shiftComparison = workerPayload.shiftComparison || [];
  state.workerPerformance.filterOptions = workerPayload.filterOptions || state.workerPerformance.filterOptions;
  if (!state.workerPerformance.filters.month && !state.workerPerformance.filters.year) {
    state.workerPerformance.filters.month =
      state.workerPerformance.filterOptions.defaultMonth || state.workerPerformance.summary.selectedMonth || "";
  }
  if (
    state.workerPerformance.selectedEmployeeKey &&
    !state.workerPerformance.workers.some((item) => item.employeeKey === state.workerPerformance.selectedEmployeeKey)
  ) {
    state.workerPerformance.selectedEmployeeKey = "";
    state.workerPerformance.detail = null;
  }
  const detailEmployeeKey = state.workerPerformance.selectedEmployeeKey || state.workerPerformance.workers[0]?.employeeKey || "";
  if (detailEmployeeKey) {
    state.workerPerformance.selectedEmployeeKey = detailEmployeeKey;
    state.workerPerformance.detail = await apiFetch(
      `/api/worker-performance/monthly/${encodeURIComponent(detailEmployeeKey)}${buildWorkerPerformanceQuery()}`
    ).catch(() => null);
  }
  state.activeStage = "全部";
  renderAdminDashboard();
  refreshSearchResults(false);
}

async function refreshEmployeeData() {
  const ordinaryRole = getOrdinaryRole();
  const requests = [apiFetch("/api/dashboard")];

  if (ordinaryRole === "editor") {
    requests.push(apiFetch("/api/submissions?scope=mine"));
  } else {
    requests.push(Promise.resolve({ submissions: [] }));
  }

  const [dashboardPayload, submissionPayload] = await Promise.all(requests);
  state.dashboard = {
    ...dashboardPayload,
    riskRules: Array.isArray(dashboardPayload.riskRules) ? dashboardPayload.riskRules : [],
  };
  state.equipmentOptions = dashboardPayload.equipment;
  state.submissions = submissionPayload.submissions || [];
  renderEmployeeOverview();
  renderEquipmentOptions();
  renderEmployeeSubmissions();
  refreshSearchResults(false);
}

function updateShellForRole() {
  const authScreen = $("#auth-screen");
  const adminView = $("#admin-view");
  const employeeView = $("#employee-view");
  const accountBox = $("#account-box");
  const rolePill = $("#role-pill");
  const accountName = $("#account-name");

  if (!state.auth) {
    authScreen.classList.remove("hidden");
    adminView.classList.add("hidden");
    employeeView.classList.add("hidden");
    accountBox.classList.add("hidden");
    document.body.classList.add("auth-open");
    return;
  }

  authScreen.classList.add("hidden");
  accountBox.classList.remove("hidden");
  rolePill.textContent = getRoleLabel(state.auth.user.role);
  accountName.textContent = state.auth.user.displayName;
  document.body.classList.remove("auth-open");

  if (state.auth.user.role === "admin") {
    mountHeroInWorkspace("#admin-view .content-area");
    adminView.classList.remove("hidden");
    employeeView.classList.add("hidden");
    switchAdminSection(state.activeAdminSection);
  } else {
    const availableSections = getAvailableEmployeeSections();
    mountHeroInWorkspace("#employee-view .content-area");
    adminView.classList.add("hidden");
    employeeView.classList.remove("hidden");
    document.querySelectorAll("#employee-sidebar .sidebar-item").forEach((item) => {
      item.classList.toggle("hidden", !availableSections.includes(item.dataset.section));
    });
    state.activeEmployeeSection =
      state.auth.user.role === "editor" && !availableSections.includes(state.activeEmployeeSection)
        ? "employee-submit"
        : ensureEmployeeSectionAccess(state.activeEmployeeSection);
    switchEmployeeSection(state.activeEmployeeSection);
  }
}

async function initWorkerOnlyMode() {
  state.auth = {
    token: "",
    user: {
      id: "worker-only",
      username: "worker-performance",
      displayName: "员工绩效模块",
      role: "admin",
    },
  };
  state.activeAdminSection = "worker-performance";

  document.body.classList.add("worker-only-mode");
  document.body.classList.remove("auth-open");
  $("#auth-screen")?.classList.add("hidden");
  $("#employee-view")?.classList.add("hidden");
  $("#admin-view")?.classList.remove("hidden");
  $("#account-box")?.classList.add("hidden");
  mountHeroInWorkspace("#admin-view .content-area");
  switchAdminSection("worker-performance");
  await refreshWorkerOnlyData();
}

function escapeExcelXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeWorksheetName(name, index) {
  const fallback = `Sheet${index + 1}`;
  const normalized = (name || fallback).replace(/[\\/:*?\[\]]/g, " ").trim();
  return (normalized || fallback).slice(0, 31);
}

function formatExcelValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return "";
    }

    if (value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))) {
      return value.join(" | ");
    }

    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return Object.entries(item)
            .map(([key, entryValue]) => `${key}: ${entryValue}`)
            .join(", ");
        }
        return String(item);
      })
      .join(" || ");
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function flattenExportRecord(record, prefix = "") {
  return Object.entries(record || {}).reduce((flatRecord, [key, value]) => {
    const nextKey = prefix ? `${prefix}_${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      return {
        ...flatRecord,
        ...flattenExportRecord(value, nextKey),
      };
    }

    return {
      ...flatRecord,
      [nextKey]: formatExcelValue(value),
    };
  }, {});
}

function buildWorksheetXml(name, rows, index) {
  const normalizedRows = rows.map((row) => flattenExportRecord(row));
  const headers = normalizedRows.length
    ? [...new Set(normalizedRows.flatMap((row) => Object.keys(row)))]
    : ["value"];

  const headerXml = `
    <Row>
      ${headers
        .map(
          (header) => `
            <Cell ss:StyleID="header"><Data ss:Type="String">${escapeExcelXml(header)}</Data></Cell>
          `
        )
        .join("")}
    </Row>
  `;

  const rowsXml = normalizedRows
    .map(
      (row) => `
        <Row>
          ${headers
            .map((header) => {
              const value = row[header] === undefined ? "" : row[header];
              const type = typeof value === "number" ? "Number" : "String";
              return `<Cell><Data ss:Type="${type}">${escapeExcelXml(value)}</Data></Cell>`;
            })
            .join("")}
        </Row>
      `
    )
    .join("");

  return `
    <Worksheet ss:Name="${escapeExcelXml(sanitizeWorksheetName(name, index))}">
      <Table>
        ${headerXml}
        ${rowsXml}
      </Table>
    </Worksheet>
  `;
}

function downloadExcelWorkbook(filename, sheets) {
  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" />
      <Interior ss:Color="#E8EEF5" ss:Pattern="Solid" />
    </Style>
  </Styles>
  ${sheets.map((sheet, index) => buildWorksheetXml(sheet.name, sheet.rows, index)).join("")}
</Workbook>`;

  const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildExportSheets(section) {
  const metaSheet = {
    name: "Meta",
    rows: [
      {
        section,
        generatedAt: new Date().toISOString(),
        label: t("common.generatedAt"),
      },
    ],
  };

  if (section === "submission-center") {
    return [
      metaSheet,
      { name: "Submissions", rows: state.submissions },
      { name: "Equipment", rows: getEquipment() },
    ];
  }

  if (section === "worker-performance") {
    return [
      metaSheet,
      { name: "Worker Summary", rows: [state.workerPerformance.summary || {}] },
      { name: "Workers", rows: state.workerPerformance.workers || [] },
      { name: "Shift Comparison", rows: state.workerPerformance.shiftComparison || [] },
      { name: "Worker Detail", rows: state.workerPerformance.detail ? state.workerPerformance.detail.monthlyTrends || [] : [] },
    ];
  }

  if (section === "analytics") {
    return [
      metaSheet,
      { name: "Risk Metrics", rows: buildAnalyticsKpis() },
      { name: "Trend Series", rows: state.dashboard.trendSeries },
      { name: "Downtime Causes", rows: state.dashboard.downtimeCauses },
    ];
  }

  if (section === "predictive") {
    return [
      metaSheet,
      { name: "Predictive Insights", rows: buildPredictiveInsights() },
      { name: "Equipment", rows: getEquipment() },
      { name: "Risk Rules", rows: state.dashboard.riskRules },
    ];
  }

  if (section === "operations") {
    return [
      metaSheet,
      { name: "Equipment", rows: filteredEquipment() },
      { name: "Spare Parts", rows: state.dashboard.spareParts },
    ];
  }

  if (section === "layout") {
    return [
      metaSheet,
      { name: "Layout Lanes", rows: state.dashboard.layoutLanes },
      { name: "Readiness", rows: buildReadinessMetrics() },
    ];
  }

  if (section === "lifecycle") {
    return [
      metaSheet,
      { name: "Equipment", rows: getEquipment() },
      {
        name: "Stages",
        rows: stageOrder.map((stage) => ({
          stage,
          description: getStageDescription(stage),
        })),
      },
    ];
  }

  if (section === "rules") {
    return [
      metaSheet,
      { name: "Risk Rules", rows: state.dashboard.riskRules },
    ];
  }

  return [metaSheet];
}

function exportBySection(section) {
  const sheets = buildExportSheets(section);
  downloadExcelWorkbook(`bosch-${section}.xls`, sheets);
}

function handleHeroAction(action) {
  switch (action) {
    case "goto-operations":
      state.activeAdminSection = "operations";
      switchAdminSection("operations");
      break;
    case "goto-layout":
      state.activeAdminSection = "layout";
      switchAdminSection("layout");
      break;
    case "goto-rules":
      state.activeAdminSection = "rules";
      switchAdminSection("rules");
      break;
    case "goto-predictive":
      state.activeAdminSection = "predictive";
      switchAdminSection("predictive");
      break;
    case "goto-accounts":
      state.activeAdminSection = "accounts";
      switchAdminSection("accounts");
      break;
    case "goto-audit":
      state.activeAdminSection = "audit";
      switchAdminSection("audit");
      break;
    case "focus-worker-shifts":
      switchAdminSection("worker-performance");
      $("#worker-shift-list")?.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    case "filter-maintenance":
      state.activeAdminSection = "operations";
      switchAdminSection("operations");
      state.activeStage = "维护";
      renderFilters();
      renderEquipment();
      break;
    case "export-submission-center":
      exportBySection("submission-center");
      break;
    case "export-worker-performance":
      exportBySection("worker-performance");
      break;
    case "export-lifecycle":
      exportBySection("lifecycle");
      break;
    case "export-analytics":
      exportBySection("analytics");
      break;
    case "export-operations":
      exportBySection("operations");
      break;
    case "export-layout":
      exportBySection("layout");
      break;
    case "export-rules":
      exportBySection("rules");
      break;
    case "export-predictive":
      exportBySection("predictive");
      break;
    case "goto-submit":
      switchEmployeeSection("employee-submit");
      break;
    case "goto-history":
      switchEmployeeSection("employee-history");
      break;
    case "goto-overview":
      switchEmployeeSection("employee-overview");
      break;
    default:
      break;
  }
}

function handlePrimaryAction(event) {
  handleHeroAction(event.currentTarget.dataset.action);
}

function handleSecondaryAction(event) {
  handleHeroAction(event.currentTarget.dataset.action);
}

function applySearchResult(result) {
  if (!result || !state.auth || !state.auth.user) {
    return;
  }

  if (state.auth.user.role === "admin") {
    switch (result.action) {
      case "operations":
        state.activeStage = "全部";
        switchAdminSection("operations");
        renderFilters();
        break;
      case "submission-center":
        switchAdminSection("submission-center");
        break;
      case "worker-performance":
        switchAdminSection("worker-performance");
        break;
      case "accounts":
        switchAdminSection("accounts");
        break;
      case "audit":
        switchAdminSection("audit");
        break;
      default:
        break;
    }
  } else {
    switchEmployeeSection(result.action || "employee-overview");
  }

  closeSearchResults();
  renderSearchAwareViews();
}

function handleGlobalSearchInput(event) {
  state.search.query = event.target.value;
  state.search.open = Boolean(getSearchQuery());
  refreshSearchResults(true);
  renderSearchAwareViews();
}

function handleGlobalSearchFocus() {
  if (!getSearchQuery()) {
    return;
  }
  state.search.open = true;
  refreshSearchResults(false);
}

function handleGlobalSearchKeydown(event) {
  if (!getSearchQuery()) {
    return;
  }

  if (event.key === "Escape") {
    closeSearchResults();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.search.open = true;
    if (!state.search.results.length) {
      renderSearchResults();
      return;
    }
    state.search.activeIndex = (state.search.activeIndex + 1 + state.search.results.length) % state.search.results.length;
    renderSearchResults();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.search.open = true;
    if (!state.search.results.length) {
      renderSearchResults();
      return;
    }
    state.search.activeIndex = (state.search.activeIndex - 1 + state.search.results.length) % state.search.results.length;
    renderSearchResults();
    return;
  }

  if (event.key === "Enter" && state.search.results.length) {
    event.preventDefault();
    const index = state.search.activeIndex >= 0 ? state.search.activeIndex : 0;
    applySearchResult(state.search.results[index]);
  }
}

function handleSearchResultsClick(event) {
  const button = event.target.closest("[data-search-index]");
  if (!button) {
    return;
  }

  const index = Number(button.dataset.searchIndex);
  if (!Number.isInteger(index) || !state.search.results[index]) {
    return;
  }

  applySearchResult(state.search.results[index]);
}

function handleDocumentClick(event) {
  if (event.target.closest(".search-shell")) {
    return;
  }
  closeSearchResults();
}

function handleLanguageSwitch(event) {
  const button = event.target.closest(".lang-btn");
  if (!button) {
    return;
  }

  const nextLanguage = button.dataset.lang;
  if (!nextLanguage || nextLanguage === state.language) {
    return;
  }

  applyLanguage(nextLanguage);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  clearAuthError();

  const username = $("#login-username").value.trim();
  const password = $("#login-password").value;

  try {
    const payload = await apiFetch("/api/auth/login", {
      method: "POST",
      body: {
        username,
        password,
      },
    });

    saveStoredAuth(payload);
    state.activeEmployeeSection = payload.user.role === "editor" ? "employee-submit" : "employee-overview";
    updateShellForRole();

    if (payload.user.role === "admin") {
      await refreshAdminData();
    } else {
      await refreshEmployeeData();
    }
  } catch (error) {
    showAuthError(error.message);
  }
}

async function handleLogout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout errors in the UI reset flow.
  }
  saveStoredAuth(null);
  state.activeEmployeeSection = "employee-overview";
  state.submissions = [];
  state.users = [];
  state.auditLogs = [];
  state.search.query = "";
  state.search.results = [];
  const searchInput = $("#global-search-input");
  if (searchInput) {
    searchInput.value = "";
  }
  closeSearchResults();
  updateShellForRole();
}

async function handleSubmissionFormSubmit(event) {
  event.preventDefault();
  clearFeedback();

  const equipmentId = $("#submission-equipment").value;
  const changeType = $("#change-type").value;
  const quantityDelta = $("#quantity-delta").value.trim();
  const newStatus = $("#new-status").value;
  const note = $("#submission-note").value.trim();

  if (!equipmentId || !note) {
    setFeedback(t("messages.completeEquipmentAndNote"), true);
    return;
  }

  if ((changeType === "equipment_quantity" || changeType === "spare_update") && !quantityDelta) {
    setFeedback(t("messages.completeQuantity"), true);
    return;
  }

  if (changeType === "status_update" && !newStatus) {
    setFeedback(t("messages.selectStatus"), true);
    return;
  }

  try {
    await apiFetch("/api/submissions", {
      method: "POST",
      body: {
        equipmentId,
        changeType,
        quantityDelta: quantityDelta === "" ? null : Number(quantityDelta),
        newStatus,
        note,
      },
    });

    event.target.reset();
    updateFormByChangeType();
    await refreshEmployeeData();
    setFeedback(t("messages.submitSuccess"));
  } catch (error) {
    setFeedback(error.message, true);
  }
}

async function handleAdminSubmissionActions(event) {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if (!action || !id) {
    return;
  }

  const status = action === "approve" ? "已通过" : "已驳回";
  try {
    await apiFetch(`/api/submissions/${id}`, {
      method: "PATCH",
      body: { status },
    });
    await refreshAdminData();
  } catch (error) {
    window.alert(error.message);
  }
}

async function handleUserCreateSubmit(event) {
  event.preventDefault();
  clearUserCreateFeedback();

  const displayName = $("#account-display-name").value.trim();
  const username = $("#account-username").value.trim();
  const password = $("#account-password").value;
  const role = $("#account-role").value;

  if (!displayName || !username || !password || !role) {
    setUserCreateFeedback(t("messages.completeAccountInfo"), true);
    return;
  }

  try {
    await apiFetch("/api/users", {
      method: "POST",
      body: {
        displayName,
        username,
        password,
        role,
      },
    });
    event.target.reset();
    await refreshAdminData();
    setUserCreateFeedback(t("messages.createAccountSuccess"));
  } catch (error) {
    setUserCreateFeedback(error.message, true);
  }
}

async function handleUserManagementActions(event) {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  const nextRole = event.target.dataset.nextRole;

  if (action !== "toggle-user-role" || !id || !nextRole) {
    return;
  }

  try {
    await apiFetch(`/api/users/${id}`, {
      method: "PATCH",
      body: { role: nextRole },
    });
    await refreshAdminData();
  } catch (error) {
    window.alert(error.message);
  }
}

function readRiskRulePayload() {
  const readValue = (level, field) => {
    const input = document.querySelector(`[data-rule-level="${level}"][data-field="${field}"]`);
    return input ? Number(input.value) : NaN;
  };

  return {
    high: {
      oeeMax: readValue("high", "oeeMax"),
      tLossMin: readValue("high", "tLossMin"),
      mtbfMin: readValue("high", "mtbfMin"),
      mttrMax: readValue("high", "mttrMax"),
      responseHoursMax: readValue("high", "responseHoursMax"),
    },
    medium: {
      oeeMax: readValue("medium", "oeeMax"),
      tLossMin: readValue("medium", "tLossMin"),
      mtbfMin: readValue("medium", "mtbfMin"),
      mttrMax: readValue("medium", "mttrMax"),
      responseHoursMax: readValue("medium", "responseHoursMax"),
    },
  };
}

async function handleRiskRuleActions(event) {
  const action = event.target.dataset.action;
  if (action !== "save-risk-rules") {
    return;
  }

  const payload = readRiskRulePayload();
  if (
    !Number.isFinite(payload.high.oeeMax) ||
    !Number.isFinite(payload.high.tLossMin) ||
    !Number.isFinite(payload.high.mtbfMin) ||
    !Number.isFinite(payload.high.mttrMax) ||
    !Number.isFinite(payload.high.responseHoursMax) ||
    !Number.isFinite(payload.medium.oeeMax) ||
    !Number.isFinite(payload.medium.tLossMin) ||
    !Number.isFinite(payload.medium.mtbfMin) ||
    !Number.isFinite(payload.medium.mttrMax) ||
    !Number.isFinite(payload.medium.responseHoursMax)
  ) {
    setRuleFeedback("请填写完整的风险阈值。", true);
    return;
  }

  try {
    const response = await apiFetch("/api/risk-rules", {
      method: "PATCH",
      body: payload,
    });

    state.dashboard.riskRules = response.riskRules;
    state.dashboard.equipment = response.equipment;
    state.equipmentOptions = response.equipment;
    renderAdminDashboard();
    refreshSearchResults(false);
    setRuleFeedback(`风险规则已更新，已重算 ${response.changedEquipmentCount} 台设备。`);
  } catch (error) {
    setRuleFeedback(error.message, true);
  }
}

function readWorkerFiltersFromForm() {
  const year = $("#worker-year-filter")?.value || "";
  let month = $("#worker-month-filter")?.value || "";
  if (year && month && getWorkerMonthYear(month) !== year) {
    month = "";
  }
  state.workerPerformance.filters = {
    year,
    month,
    shift: $("#worker-shift-filter")?.value || "",
    employeeKey: $("#worker-employee-filter")?.value || "",
  };
}

async function handleWorkerFilterSubmit(event) {
  event.preventDefault();
  readWorkerFiltersFromForm();
  await refreshWorkerPerformanceData({ render: true, preserveDetail: false });
}

async function handleWorkerFilterReset() {
  state.workerPerformance.filters = {
    year: "",
    month: state.workerPerformance.filterOptions.defaultMonth || "",
    shift: "",
    employeeKey: "",
  };
  await refreshWorkerPerformanceData({ render: true, preserveDetail: false });
}

function handleWorkerYearChange() {
  state.workerPerformance.filters = {
    ...(state.workerPerformance.filters || {}),
    year: $("#worker-year-filter")?.value || "",
    month: "",
  };
  renderWorkerFilters();
}

async function handleWorkerTableClick(event) {
  const sortButton = event.target.closest("[data-worker-sort]");
  if (sortButton) {
    const key = sortButton.dataset.workerSort;
    const current = state.workerPerformance.tableSort || {};
    state.workerPerformance.tableSort = {
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    };
    renderWorkerTable();
    return;
  }

  const row = event.target.closest("[data-employee-key]");
  if (!row) {
    return;
  }

  const employeeKey = row.dataset.employeeKey;
  if (!employeeKey) {
    return;
  }

  try {
    state.workerPerformance.selectedEmployeeKey = employeeKey;
    const payload = window.BOSCH_WORKER_MONTHLY_DATA
      ? buildLocalWorkerDetail(employeeKey)
      : await apiFetch(`/api/worker-performance/monthly/${encodeURIComponent(employeeKey)}${buildWorkerPerformanceQuery()}`);
    state.workerPerformance.detail = payload;
    renderWorkerDetail();
    $("#worker-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    window.alert(error.message);
  }
}

function handleWorkerQualityClick(event) {
  const button = event.target.closest("[data-worker-quality]");
  if (!button || button.disabled) {
    return;
  }

  const issueId = button.dataset.workerQuality;
  state.workerPerformance.selectedQualityIssue =
    state.workerPerformance.selectedQualityIssue === issueId ? "" : issueId;
  renderWorkerQualityGrid();
}

function setWorkerLineTooltipText(card, selector, value) {
  const node = card.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function setWorkerLineSummary(card, item, personal, shift, overall) {
  const gap = personal - shift;
  setWorkerLineTooltipText(card, "[data-worker-line-stat-month]", `${item.month || "--"} 个人`);
  setWorkerLineTooltipText(card, "[data-worker-line-stat-personal]", formatWorkerRate(personal));
  setWorkerLineTooltipText(card, "[data-worker-line-stat-gap]", `${gap >= 0 ? "+" : ""}${formatWorkerRate(gap)}`);
  setWorkerLineTooltipText(card, "[data-worker-line-stat-overall]", formatWorkerRate(overall));
}

function hideWorkerLineTooltip(card) {
  if (!card) {
    return;
  }
  const tooltip = card.querySelector(".worker-line-tooltip");
  const guide = card.querySelector(".worker-line-hover-guide");
  card.querySelectorAll(".worker-line-point.is-active").forEach((point) => point.classList.remove("is-active"));
  card.querySelectorAll(".worker-line-hover-zone.is-active").forEach((zone) => zone.classList.remove("is-active"));
  if (guide) {
    guide.classList.remove("is-visible");
  }
  if (tooltip) {
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
  }
}

function hideWorkerMiniTooltip(card) {
  if (!card) {
    return;
  }
  const tooltip = card.querySelector(".worker-mini-tooltip");
  const guide = card.querySelector(".worker-mini-hover-guide");
  card.querySelectorAll(".worker-mini-point.is-active").forEach((point) => point.classList.remove("is-active"));
  card.querySelectorAll(".worker-mini-hover-zone.is-active").forEach((zone) => zone.classList.remove("is-active"));
  if (guide) {
    guide.classList.remove("is-visible");
  }
  if (tooltip) {
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
  }
}

function updateWorkerMiniHover(card, trigger, event) {
  if (!card || !trigger) {
    return;
  }

  const index = trigger.dataset.workerMiniIndex;
  const tooltip = card.querySelector(".worker-mini-tooltip");
  const guide = card.querySelector(".worker-mini-hover-guide");
  if (!tooltip) {
    return;
  }

  const cardRect = card.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth || 168;
  const tooltipHeight = tooltip.offsetHeight || 76;
  const triggerRect = trigger.getBoundingClientRect();
  const clientX = event?.clientX || triggerRect.left + triggerRect.width / 2;
  const clientY = event?.clientY || triggerRect.top + triggerRect.height / 2;
  const maxLeft = Math.max(10, cardRect.width - tooltipWidth - 10);
  const maxTop = Math.max(10, cardRect.height - tooltipHeight - 10);
  const left = Math.min(Math.max(clientX - cardRect.left + 10, 10), maxLeft);
  const top = Math.min(Math.max(clientY - cardRect.top - tooltipHeight - 8, 10), maxTop);

  setWorkerLineTooltipText(card, "[data-worker-mini-tooltip-month]", trigger.dataset.workerMiniMonth || "--");
  setWorkerLineTooltipText(card, "[data-worker-mini-tooltip-title]", trigger.dataset.workerMiniTitle || "--");
  setWorkerLineTooltipText(card, "[data-worker-mini-tooltip-value]", trigger.dataset.workerMiniValue || "--");

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.add("is-visible");
  tooltip.setAttribute("aria-hidden", "false");

  if (guide) {
    const x = Number(trigger.dataset.workerMiniX) || 0;
    guide.setAttribute("x1", x.toFixed(1));
    guide.setAttribute("x2", x.toFixed(1));
    guide.classList.add("is-visible");
  }

  card.querySelectorAll(".worker-mini-point.is-active").forEach((point) => point.classList.remove("is-active"));
  card.querySelectorAll(`.worker-mini-point[data-worker-mini-index="${index}"]`).forEach((point) => {
    point.classList.add("is-active");
  });
  card.querySelectorAll(".worker-mini-hover-zone.is-active").forEach((zone) => zone.classList.remove("is-active"));
  card.querySelectorAll(`.worker-mini-hover-zone[data-worker-mini-index="${index}"]`).forEach((zone) => {
    zone.classList.add("is-active");
  });
}

function updateWorkerLineHover(card, trigger, event) {
  if (!card || !trigger) {
    return;
  }

  const index = Number(trigger.dataset.workerLineIndex);
  const trends = state.workerPerformance.detail?.monthlyTrends || [];
  const item = trends[index];
  const tooltip = card.querySelector(".worker-line-tooltip");
  const guide = card.querySelector(".worker-line-hover-guide");

  if (!item || !tooltip) {
    return;
  }

  const personal = Number(item.repairEfficiency) || 0;
  const shift = Number(item.shiftAvgRepairEfficiency) || 0;
  const overall = Number(item.overallAvgRepairEfficiency) || 0;
  const gap = personal - shift;
  const cardRect = card.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth || 210;
  const tooltipHeight = tooltip.offsetHeight || 150;
  const maxLeft = Math.max(12, cardRect.width - tooltipWidth - 12);
  const maxTop = Math.max(12, cardRect.height - tooltipHeight - 12);
  const triggerRect = trigger.getBoundingClientRect();
  const clientX = event?.clientX || triggerRect.left + triggerRect.width / 2;
  const clientY = event?.clientY || triggerRect.top + triggerRect.height / 2;
  const left = Math.min(Math.max(clientX - cardRect.left + 14, 12), maxLeft);
  const top = Math.min(Math.max(clientY - cardRect.top - tooltipHeight - 12, 12), maxTop);

  setWorkerLineSummary(card, item, personal, shift, overall);
  setWorkerLineTooltipText(card, "[data-worker-tooltip-month]", item.month || "--");
  setWorkerLineTooltipText(card, "[data-worker-tooltip-personal]", formatWorkerRate(personal));
  setWorkerLineTooltipText(card, "[data-worker-tooltip-shift]", formatWorkerRate(shift));
  setWorkerLineTooltipText(card, "[data-worker-tooltip-overall]", formatWorkerRate(overall));
  setWorkerLineTooltipText(card, "[data-worker-tooltip-gap]", `${gap >= 0 ? "+" : ""}${formatWorkerRate(gap)}`);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.add("is-visible");
  tooltip.setAttribute("aria-hidden", "false");

  if (guide) {
    const x = Number(trigger.dataset.workerLineX) || 0;
    guide.setAttribute("x1", x.toFixed(1));
    guide.setAttribute("x2", x.toFixed(1));
    guide.classList.add("is-visible");
  }

  card.querySelectorAll(".worker-line-point.is-active").forEach((point) => point.classList.remove("is-active"));
  card.querySelectorAll(`.worker-line-point[data-worker-line-point="${index}"]`).forEach((point) => {
    point.classList.add("is-active");
  });
  card.querySelectorAll(".worker-line-hover-zone.is-active").forEach((activeZone) => activeZone.classList.remove("is-active"));
  card.querySelectorAll(`.worker-line-hover-zone[data-worker-line-index="${index}"]`).forEach((zone) => {
    zone.classList.add("is-active");
  });
}

function handleWorkerLinePointerMove(event) {
  const miniCard = event.target.closest(".worker-chart-card");
  if (miniCard) {
    const miniTrigger = event.target.closest("[data-worker-mini-index]");
    if (miniTrigger && miniCard.contains(miniTrigger)) {
      updateWorkerMiniHover(miniCard, miniTrigger, event);
      return;
    }
    hideWorkerMiniTooltip(miniCard);
  }

  const card = event.target.closest(".worker-line-card");
  if (!card) {
    return;
  }

  const zone = event.target.closest("[data-worker-line-index]");
  if (!zone || !card.contains(zone)) {
    hideWorkerLineTooltip(card);
    return;
  }

  updateWorkerLineHover(card, zone, event);
}

function handleWorkerLineClick(event) {
  const miniTrigger = event.target.closest("[data-worker-mini-index]");
  const miniCard = event.target.closest(".worker-chart-card");
  if (miniTrigger && miniCard && miniCard.contains(miniTrigger)) {
    updateWorkerMiniHover(miniCard, miniTrigger, event);
    return;
  }

  const trigger = event.target.closest("[data-worker-line-index]");
  const card = event.target.closest(".worker-line-card");
  if (!trigger || !card || !card.contains(trigger)) {
    return;
  }
  updateWorkerLineHover(card, trigger, event);
}

function handleWorkerLinePointerLeave(event) {
  const card = event.target.closest(".worker-line-card");
  hideWorkerLineTooltip(card);
  const miniCard = event.target.closest(".worker-chart-card");
  hideWorkerMiniTooltip(miniCard);
}

function handleWorkerLinePointerOut(event) {
  const card = event.target.closest(".worker-line-card");
  if (card) {
    const nextTarget = event.relatedTarget;
    if (!nextTarget || !card.contains(nextTarget)) {
      hideWorkerLineTooltip(card);
    }
  }

  const miniCard = event.target.closest(".worker-chart-card");
  if (miniCard) {
    const nextTarget = event.relatedTarget;
    if (!nextTarget || !miniCard.contains(nextTarget)) {
      hideWorkerMiniTooltip(miniCard);
    }
  }
}

function bindSidebars() {
  $("#admin-sidebar").addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-item");
    if (!button) {
      return;
    }
    switchAdminSection(button.dataset.section);
  });

  $("#employee-sidebar").addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-item");
    if (!button) {
      return;
    }
    switchEmployeeSection(button.dataset.section);
  });
}

function bindEvents() {
  document.addEventListener("click", handleLanguageSwitch);
  window.addEventListener("resize", syncWorkerTopSectionHeight);
  $("#global-search-input").addEventListener("input", handleGlobalSearchInput);
  $("#global-search-input").addEventListener("focus", handleGlobalSearchFocus);
  $("#global-search-input").addEventListener("keydown", handleGlobalSearchKeydown);
  $("#global-search-results").addEventListener("click", handleSearchResultsClick);
  $("#login-form").addEventListener("submit", handleLoginSubmit);
  $("#logout-btn").addEventListener("click", handleLogout);
  $("#hero-primary-action").addEventListener("click", handlePrimaryAction);
  $("#hero-secondary-action").addEventListener("click", handleSecondaryAction);
  $("#change-type").addEventListener("change", updateFormByChangeType);
  $("#submission-form").addEventListener("submit", handleSubmissionFormSubmit);
  $("#user-create-form").addEventListener("submit", handleUserCreateSubmit);
  $("#worker-filter-form").addEventListener("submit", handleWorkerFilterSubmit);
  $("#worker-year-filter").addEventListener("change", handleWorkerYearChange);
  $("#worker-filter-reset").addEventListener("click", handleWorkerFilterReset);
  $("#worker-quality-grid").addEventListener("click", handleWorkerQualityClick);
  $("#worker-table").addEventListener("click", handleWorkerTableClick);
  $("#worker-detail-content").addEventListener("click", handleWorkerLineClick);
  $("#worker-detail-content").addEventListener("pointermove", handleWorkerLinePointerMove);
  $("#worker-detail-content").addEventListener("pointerout", handleWorkerLinePointerOut);
  $("#worker-detail-content").addEventListener("pointerleave", handleWorkerLinePointerLeave);
  $("#submission-feed").addEventListener("click", handleAdminSubmissionActions);
  $("#user-admin-table").addEventListener("click", handleUserManagementActions);
  $("#rule-grid").addEventListener("click", handleRiskRuleActions);
  document.addEventListener("click", handleDocumentClick);
  bindSidebars();
}

async function restoreSession() {
  if (!state.auth || !state.auth.token) {
    return;
  }

  try {
    const payload = await apiFetch("/api/auth/me");
    saveStoredAuth({
      token: state.auth.token,
      user: payload.user,
    });

    if (payload.user.role === "admin") {
      await refreshAdminData();
    } else {
      await refreshEmployeeData();
    }
  } catch {
    saveStoredAuth(null);
  }
}

async function init() {
  applyLanguage(state.language, false);
  updateFormByChangeType();
  bindEvents();
  if (WORKER_ONLY_MODE) {
    await initWorkerOnlyMode();
    return;
  }
  await restoreSession();
  updateShellForRole();
}

init();
