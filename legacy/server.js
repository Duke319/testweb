const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { loadEnv } = require("../src/env");

const LEGACY_DIR = __dirname;
const ROOT_DIR = path.resolve(__dirname, "..");
loadEnv(ROOT_DIR);
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(ROOT_DIR, "data", "db.json");
const MONTHLY_WORKER_DATA_FILE = path.join(ROOT_DIR, "data", "worker-performance-monthly.json");
const WORKER_ONLY_MODE = true;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const CORS_METHODS = "GET, POST, PATCH, OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization";
const USER_ROLES = new Set(["admin", "editor", "viewer"]);
const MANAGED_USER_ROLES = new Set(["editor", "viewer"]);
const CHANGE_TYPE_LABELS = {
  equipment_quantity: "设备数量变化",
  status_update: "设备状态更新",
  spare_update: "备件库存变化",
  document_update: "图纸 / Layout 更新",
  issue_note: "异常备注",
};
const DEFAULT_RISK_RULES = [
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

const sessions = new Map();
let dbCache = null;
let monthlyWorkerCache = null;
let writeQueue = Promise.resolve();

function createDbDefaults() {
  return {
    users: [],
    equipment: [],
    spareParts: [],
    trendSeries: [],
    downtimeCauses: [],
    layoutLanes: [],
    riskRules: [],
    workerPerformanceRecords: [],
    submissions: [],
    auditLogs: [],
  };
}

function normalizeRole(role) {
  if (role === "employee") {
    return "editor";
  }
  return role;
}

function normalizeUser(user) {
  const createdAt = user.createdAt || new Date().toISOString();
  return {
    ...user,
    role: normalizeRole(user.role),
    createdAt,
    updatedAt: user.updatedAt || createdAt,
  };
}

function normalizeSubmission(record) {
  return {
    ...record,
    reviewedAt: record.reviewedAt || "",
    reviewedBy: record.reviewedBy || "",
    reviewedById: record.reviewedById || "",
  };
}

function normalizeEquipment(item) {
  const source = item && typeof item === "object" ? item : {};
  const mttr = Number.isFinite(Number(source.mttr)) ? Number(source.mttr) : 0;
  const responseHours =
    Number.isFinite(Number(source.responseHours))
      ? Number(source.responseHours)
      : Number.isFinite(Number(source.responseTimeHours))
        ? Number(source.responseTimeHours)
        : mttr > 0
          ? Number(Math.max(0.5, Math.min(mttr, mttr * 0.4)).toFixed(1))
          : 1.2;

  return {
    ...source,
    responseHours,
  };
}

function parseDateTime(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function minutesBetween(startTime, endTime) {
  const start = parseDateTime(startTime);
  const end = parseDateTime(endTime);
  if (!start || !end) {
    return 0;
  }
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function normalizeWorkerPerformanceRecord(record) {
  const source = record && typeof record === "object" ? record : {};
  const startTime = typeof source.startTime === "string" ? source.startTime : "";
  const endTime = typeof source.endTime === "string" ? source.endTime : "";
  const computedMttr = minutesBetween(startTime, endTime);
  const fallbackMttr = Number.isFinite(Number(source.mttrMinutes)) ? Number(source.mttrMinutes) : 0;
  const mttrMinutes = computedMttr || fallbackMttr;
  const isAbnormal = mttrMinutes > 1440;

  return {
    id: source.id || `WPR-${randomUUID().slice(0, 8)}`,
    employeeId: source.employeeId || "",
    employeeName: source.employeeName || "",
    plant: source.plant || "101厂房",
    team: source.team || "",
    date: source.date || (startTime ? startTime.slice(0, 10) : ""),
    workOrderId: source.workOrderId || "",
    pmType: source.pmType || "PM01",
    workHours: Number.isFinite(Number(source.workHours)) ? Number(source.workHours) : 0,
    startTime,
    endTime,
    mttrMinutes,
    equipmentId: source.equipmentId || "",
    equipmentName: source.equipmentName || "",
    line: source.line || "",
    station: source.station || "",
    owner: source.owner || "",
    abnormal: isAbnormal,
    abnormalReason: source.abnormalReason || (isAbnormal ? "疑似日期填写错误" : ""),
    handlingStatus: source.handlingStatus || (isAbnormal ? "待处理" : "正常"),
  };
}

function normalizeRiskRule(rule, fallback) {
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
            oeeMax: Number.isFinite(Number(thresholds.oeeMax))
              ? Number(thresholds.oeeMax)
              : fallback.thresholds.oeeMax,
            tLossMin: Number.isFinite(Number(thresholds.tLossMin))
              ? Number(thresholds.tLossMin)
              : Number.isFinite(Number(thresholds.downtimeMin))
                ? Number(thresholds.downtimeMin)
                : fallback.thresholds.tLossMin,
            mtbfMin: Number.isFinite(Number(thresholds.mtbfMin))
              ? Number(thresholds.mtbfMin)
              : fallback.thresholds.mtbfMin,
            mttrMax: Number.isFinite(Number(thresholds.mttrMax))
              ? Number(thresholds.mttrMax)
              : fallback.thresholds.mttrMax,
            responseHoursMax: Number.isFinite(Number(thresholds.responseHoursMax))
              ? Number(thresholds.responseHoursMax)
              : fallback.thresholds.responseHoursMax,
          },
  };
}

function normalizeRiskRules(rules) {
  const items = Array.isArray(rules) ? rules : [];
  return DEFAULT_RISK_RULES.map((fallback) =>
    normalizeRiskRule(items.find((item) => item.level === fallback.level), fallback)
  );
}

function normalizeDb(rawDb) {
  const db = {
    ...createDbDefaults(),
    ...rawDb,
  };

  db.users = Array.isArray(db.users) ? db.users.map(normalizeUser) : [];
  db.equipment = Array.isArray(db.equipment) ? db.equipment.map(normalizeEquipment) : [];
  db.spareParts = Array.isArray(db.spareParts) ? db.spareParts : [];
  db.trendSeries = Array.isArray(db.trendSeries) ? db.trendSeries : [];
  db.downtimeCauses = Array.isArray(db.downtimeCauses) ? db.downtimeCauses : [];
  db.layoutLanes = Array.isArray(db.layoutLanes) ? db.layoutLanes : [];
  db.riskRules = normalizeRiskRules(db.riskRules);
  db.workerPerformanceRecords = Array.isArray(db.workerPerformanceRecords)
    ? db.workerPerformanceRecords.map(normalizeWorkerPerformanceRecord)
    : [];
  db.submissions = Array.isArray(db.submissions) ? db.submissions.map(normalizeSubmission) : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  recalculateAllEquipmentRisks(db);

  return db;
}

async function readDb() {
  if (dbCache) {
    return dbCache;
  }

  const raw = await fs.readFile(DATA_FILE, "utf8");
  dbCache = normalizeDb(JSON.parse(raw));
  return dbCache;
}

async function writeDb(nextDb) {
  dbCache = normalizeDb(nextDb);
  writeQueue = writeQueue.then(() =>
    fs.writeFile(DATA_FILE, `${JSON.stringify(dbCache, null, 2)}\n`, "utf8")
  );
  return writeQueue;
}

function getCorsHeaders(request) {
  const origin = request.headers.origin || "";

  if (!origin) {
    return {};
  }

  if (origin === "null") {
    return {
      "Access-Control-Allow-Origin": "null",
      "Access-Control-Allow-Methods": CORS_METHODS,
      "Access-Control-Allow-Headers": CORS_HEADERS,
      Vary: "Origin",
    };
  }

  try {
    const { protocol, hostname } = new URL(origin);
    const isLocalProtocol = protocol === "http:" || protocol === "https:";
    const isAllowedHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalProtocol && isAllowedHost) {
      return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": CORS_METHODS,
        "Access-Control-Allow-Headers": CORS_HEADERS,
        Vary: "Origin",
      };
    }
  } catch {
    return {};
  }

  return {};
}

function withCorsHeaders(request, headers) {
  return {
    ...headers,
    ...getCorsHeaders(request),
  };
}

function sendJson(request, response, statusCode, payload) {
  response.writeHead(
    statusCode,
    withCorsHeaders(request, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    })
  );
  response.end(JSON.stringify(payload));
}

function sendError(request, response, statusCode, message) {
  sendJson(request, response, statusCode, { error: message });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });

    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

function getToken(request) {
  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

function getSessionUser(request) {
  const token = getToken(request);
  if (!token) {
    return null;
  }
  return sessions.get(token) || null;
}

function requireAuth(request, response) {
  const user = getSessionUser(request);
  if (!user) {
    sendError(request, response, 401, "Unauthorized");
    return null;
  }
  return user;
}

function requireRoles(request, response, allowedRoles) {
  const user = requireAuth(request, response);
  if (!user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    sendError(request, response, 403, "Forbidden");
    return null;
  }

  return user;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function syncSessionUser(user) {
  const nextSessionUser = sanitizeUser(user);
  for (const [token, sessionUser] of sessions.entries()) {
    if (sessionUser.id === user.id) {
      sessions.set(token, nextSessionUser);
    }
  }
}

function getRiskRule(riskRules, level) {
  return riskRules.find((item) => item.level === level) || DEFAULT_RISK_RULES.find((item) => item.level === level);
}

function pushRiskHit(collection, level, message) {
  collection.push({ level, message });
}

function buildLowRiskHits(equipment, mediumRule) {
  const hits = [];

  if (equipment.oee > 0 && equipment.oee > mediumRule.thresholds.oeeMax) {
    hits.push(`OEE ${equipment.oee}% 达标`);
  }

  if (equipment.mtbf > 0 && equipment.mtbf > mediumRule.thresholds.mtbfMin) {
    hits.push(`MTBF ${equipment.mtbf} h 良好`);
  }

  if (equipment.mttr > 0 && equipment.mttr < mediumRule.thresholds.mttrMax) {
    hits.push(`MTTR ${equipment.mttr} h 可控`);
  }

  if (equipment.downtimeHours >= 0 && equipment.downtimeHours < mediumRule.thresholds.tLossMin) {
    hits.push(`T-loss ${equipment.downtimeHours.toFixed(1)} h 受控`);
  }

  if (equipment.responseHours >= 0 && equipment.responseHours < mediumRule.thresholds.responseHoursMax) {
    hits.push(`响应时间 ${equipment.responseHours.toFixed(1)} h 正常`);
  }

  if (equipment.drawingStatus === "完整" && equipment.layoutStatus === "已绑定") {
    hits.push("资料完整");
  }

  if (equipment.spareRisk === "low") {
    hits.push("备件状态稳定");
  }

  if (!hits.length) {
    hits.push("运行稳定");
  }

  return hits.slice(0, 3);
}

function calculateEquipmentRisk(equipment, riskRules) {
  const highRule = getRiskRule(riskRules, "high");
  const mediumRule = getRiskRule(riskRules, "medium");
  const hits = [];

  if (equipment.status === "critical") {
    pushRiskHit(hits, "high", "设备状态为严重");
  } else if (equipment.status === "warning") {
    pushRiskHit(hits, "medium", "设备状态预警");
  } else if (equipment.status === "upgrade") {
    pushRiskHit(hits, "medium", "设备处于升级中");
  }

  if (equipment.oee > 0) {
    if (equipment.oee <= highRule.thresholds.oeeMax) {
      pushRiskHit(hits, "high", `OEE ${equipment.oee}% 低于红色阈值 ${highRule.thresholds.oeeMax}%`);
    } else if (equipment.oee <= mediumRule.thresholds.oeeMax) {
      pushRiskHit(hits, "medium", `OEE ${equipment.oee}% 低于黄色阈值 ${mediumRule.thresholds.oeeMax}%`);
    }
  }

  if (Number.isFinite(equipment.downtimeHours)) {
    if (equipment.downtimeHours >= highRule.thresholds.tLossMin) {
      pushRiskHit(hits, "high", `本周停机 ${equipment.downtimeHours.toFixed(1)} h 超过红色阈值`);
    } else if (equipment.downtimeHours >= mediumRule.thresholds.tLossMin) {
      pushRiskHit(hits, "medium", `本周停机 ${equipment.downtimeHours.toFixed(1)} h 超过黄色阈值`);
    }
  }

  if (equipment.mtbf > 0) {
    if (equipment.mtbf <= highRule.thresholds.mtbfMin) {
      pushRiskHit(hits, "high", `MTBF ${equipment.mtbf} h 低于红色阈值 ${highRule.thresholds.mtbfMin} h`);
    } else if (equipment.mtbf <= mediumRule.thresholds.mtbfMin) {
      pushRiskHit(hits, "medium", `MTBF ${equipment.mtbf} h 低于黄色阈值 ${mediumRule.thresholds.mtbfMin} h`);
    }
  }

  if (equipment.mttr > 0) {
    if (equipment.mttr >= highRule.thresholds.mttrMax) {
      pushRiskHit(hits, "high", `MTTR ${equipment.mttr} h 超过红色阈值 ${highRule.thresholds.mttrMax} h`);
    } else if (equipment.mttr >= mediumRule.thresholds.mttrMax) {
      pushRiskHit(hits, "medium", `MTTR ${equipment.mttr} h 超过黄色阈值 ${mediumRule.thresholds.mttrMax} h`);
    }
  }

  if (equipment.responseHours >= 0) {
    if (equipment.responseHours >= highRule.thresholds.responseHoursMax) {
      pushRiskHit(hits, "high", `维修响应时间 ${equipment.responseHours.toFixed(1)} h 超过红色阈值 ${highRule.thresholds.responseHoursMax} h`);
    } else if (equipment.responseHours >= mediumRule.thresholds.responseHoursMax) {
      pushRiskHit(hits, "medium", `维修响应时间 ${equipment.responseHours.toFixed(1)} h 超过黄色阈值 ${mediumRule.thresholds.responseHoursMax} h`);
    }
  }

  if (equipment.spareRisk === "high") {
    pushRiskHit(hits, "high", "关键备件高风险");
  } else if (equipment.spareRisk === "medium") {
    pushRiskHit(hits, "medium", "关键备件需关注");
  }

  if (equipment.drawingStatus !== "完整") {
    pushRiskHit(hits, "medium", `图纸状态：${equipment.drawingStatus}`);
  }

  if (equipment.layoutStatus !== "已绑定") {
    pushRiskHit(hits, "medium", `Layout 状态：${equipment.layoutStatus}`);
  }

  const levelWeight = { high: 3, medium: 2 };
  const highestWeight = hits.reduce((max, item) => Math.max(max, levelWeight[item.level] || 0), 0);
  const riskLevel = highestWeight >= 3 ? "high" : highestWeight >= 2 ? "medium" : "low";

  return {
    riskLevel,
    riskHits: hits.length
      ? hits.sort((left, right) => (levelWeight[right.level] || 0) - (levelWeight[left.level] || 0)).slice(0, 3).map((item) => item.message)
      : buildLowRiskHits(equipment, mediumRule),
  };
}

function recalculateAllEquipmentRisks(db) {
  return db.equipment
    .map((equipment) => {
      const next = calculateEquipmentRisk(equipment, db.riskRules);
      const changes = [];

      if (equipment.riskLevel !== next.riskLevel) {
        changes.push(buildChangeRecord("riskLevel", equipment.riskLevel, next.riskLevel));
      }

      if (JSON.stringify(equipment.riskHits || []) !== JSON.stringify(next.riskHits)) {
        changes.push(buildChangeRecord("riskHits", equipment.riskHits || [], next.riskHits));
      }

      equipment.riskLevel = next.riskLevel;
      equipment.riskHits = next.riskHits;

      return changes.length
        ? {
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            changes,
          }
        : null;
    })
    .filter(Boolean);
}

function validateRiskRules(riskRules) {
  const highRule = getRiskRule(riskRules, "high");
  const mediumRule = getRiskRule(riskRules, "medium");

  if (
    highRule.thresholds.oeeMax <= 0 ||
    mediumRule.thresholds.oeeMax <= 0 ||
    mediumRule.thresholds.oeeMax > 100 ||
    highRule.thresholds.oeeMax >= mediumRule.thresholds.oeeMax
  ) {
    return "OEE 阈值设置无效";
  }

  if (
    highRule.thresholds.tLossMin < 0 ||
    mediumRule.thresholds.tLossMin < 0 ||
    highRule.thresholds.tLossMin <= mediumRule.thresholds.tLossMin
  ) {
    return "T-loss 阈值设置无效";
  }

  if (
    highRule.thresholds.mtbfMin <= 0 ||
    mediumRule.thresholds.mtbfMin <= 0 ||
    highRule.thresholds.mtbfMin >= mediumRule.thresholds.mtbfMin
  ) {
    return "MTBF 阈值设置无效";
  }

  if (
    highRule.thresholds.mttrMax <= 0 ||
    mediumRule.thresholds.mttrMax <= 0 ||
    highRule.thresholds.mttrMax <= mediumRule.thresholds.mttrMax
  ) {
    return "MTTR 阈值设置无效";
  }

  if (
    highRule.thresholds.responseHoursMax <= 0 ||
    mediumRule.thresholds.responseHoursMax <= 0 ||
    highRule.thresholds.responseHoursMax <= mediumRule.thresholds.responseHoursMax
  ) {
    return "维修响应时间阈值设置无效";
  }

  return "";
}

function buildDashboardPayload(db) {
  return {
    equipment: db.equipment,
    spareParts: db.spareParts,
    trendSeries: db.trendSeries,
    downtimeCauses: db.downtimeCauses,
    layoutLanes: db.layoutLanes,
    riskRules: db.riskRules,
  };
}

function roundNumber(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(digits));
}

function averageBy(items, getter) {
  const values = items.map(getter).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function applyWorkerPerformanceFilters(records, searchParams) {
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const team = searchParams.get("team") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const pmType = searchParams.get("pmType") || "";
  const equipmentId = searchParams.get("equipmentId") || "";

  return records.filter((record) => {
    if (dateFrom && record.date < dateFrom) return false;
    if (dateTo && record.date > dateTo) return false;
    if (team && record.team !== team) return false;
    if (employeeId && record.employeeId !== employeeId) return false;
    if (pmType && record.pmType !== pmType) return false;
    if (equipmentId && record.equipmentId !== equipmentId) return false;
    return true;
  });
}

function mapWorkerRecord(record) {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employeeName: record.employeeName,
    plant: record.plant,
    team: record.team,
    date: record.date,
    workOrderId: record.workOrderId,
    pmType: record.pmType,
    workHours: record.workHours,
    startTime: record.startTime,
    endTime: record.endTime,
    mttrMinutes: record.mttrMinutes,
    equipmentId: record.equipmentId,
    equipmentName: record.equipmentName,
    line: record.line,
    station: record.station,
    owner: record.owner,
    abnormal: record.abnormal,
    abnormalReason: record.abnormalReason,
    handlingStatus: record.handlingStatus,
  };
}

function aggregateWorkerPerformance(records) {
  const totalOrders = records.length;
  const employeeMap = new Map();

  records.forEach((record) => {
    const current = employeeMap.get(record.employeeId) || {
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      plant: record.plant,
      team: record.team,
      totalWorkHours: 0,
      totalOrders: 0,
      pm01Count: 0,
      pm03Count: 0,
      abnormalCount: 0,
      longRepairCount: 0,
      mttrTotal: 0,
      maxMttrMinutes: 0,
      equipmentSet: new Set(),
    };

    current.totalWorkHours += record.workHours || 0;
    current.totalOrders += 1;
    current.pm01Count += record.pmType === "PM01" ? 1 : 0;
    current.pm03Count += record.pmType === "PM03" ? 1 : 0;
    current.abnormalCount += record.abnormal ? 1 : 0;
    current.longRepairCount += record.mttrMinutes > 10 ? 1 : 0;
    current.mttrTotal += record.mttrMinutes || 0;
    current.maxMttrMinutes = Math.max(current.maxMttrMinutes, record.mttrMinutes || 0);
    if (record.equipmentId) {
      current.equipmentSet.add(record.equipmentId);
    }

    employeeMap.set(record.employeeId, current);
  });

  return [...employeeMap.values()].map((item) => {
    const avgMttrMinutes = item.totalOrders ? item.mttrTotal / item.totalOrders : 0;
    const efficiency = item.totalWorkHours > 0 ? item.totalOrders / item.totalWorkHours : 0;
    return {
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      plant: item.plant,
      team: item.team,
      totalWorkHours: roundNumber(item.totalWorkHours, 1),
      totalOrders: item.totalOrders,
      pm01Count: item.pm01Count,
      pm03Count: item.pm03Count,
      avgMttrMinutes: roundNumber(avgMttrMinutes, 1),
      efficiency: roundNumber(efficiency, 2),
      workloadShare: totalOrders ? roundNumber((item.totalOrders / totalOrders) * 100, 1) : 0,
      abnormalCount: item.abnormalCount,
      longRepairCount: item.longRepairCount,
      maxMttrMinutes: item.maxMttrMinutes,
      equipmentCount: item.equipmentSet.size,
    };
  });
}

function rankWorkers(workers) {
  return [...workers]
    .sort((left, right) => {
      if (right.efficiency !== left.efficiency) {
        return right.efficiency - left.efficiency;
      }
      return right.totalOrders - left.totalOrders;
    })
    .map((worker, index) => ({
      ...worker,
      rank: index + 1,
    }));
}

function buildWorkerFilterOptions(records) {
  const uniqueSorted = (items) => [...new Set(items.filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));

  return {
    teams: uniqueSorted(records.map((record) => record.team)),
    pmTypes: uniqueSorted(records.map((record) => record.pmType)),
    employees: uniqueSorted(records.map((record) => `${record.employeeId}::${record.employeeName}`)).map((value) => {
      const [id, name] = value.split("::");
      return { id, name };
    }),
    equipment: uniqueSorted(records.map((record) => `${record.equipmentId}::${record.equipmentName}`)).map((value) => {
      const [id, name] = value.split("::");
      return { id, name };
    }),
  };
}

function buildWorkerTopLists(workers, records) {
  const byOrdersDesc = [...workers].sort((left, right) => right.totalOrders - left.totalOrders).slice(0, 5);
  const byOrdersAsc = [...workers].sort((left, right) => left.totalOrders - right.totalOrders).slice(0, 5);
  const byEfficiencyDesc = [...workers].sort((left, right) => right.efficiency - left.efficiency).slice(0, 5);
  const byEfficiencyAsc = [...workers].sort((left, right) => left.efficiency - right.efficiency).slice(0, 5);
  const byAbnormalDesc = [...workers].sort((left, right) => right.abnormalCount - left.abnormalCount).slice(0, 5);
  const longestRepairs = [...records].sort((left, right) => right.mttrMinutes - left.mttrMinutes).slice(0, 5).map(mapWorkerRecord);

  return {
    workloadHigh: byOrdersDesc,
    workloadLow: byOrdersAsc,
    efficiencyHigh: byEfficiencyDesc,
    efficiencyLow: byEfficiencyAsc,
    abnormalHigh: byAbnormalDesc,
    longestRepairs,
  };
}

function buildWorkerPerformancePayload(db, url) {
  const allRecords = db.workerPerformanceRecords || [];
  const records = applyWorkerPerformanceFilters(allRecords, url.searchParams);
  const workers = rankWorkers(aggregateWorkerPerformance(records));
  const totalOrders = records.length;
  const totalWorkHours = records.reduce((total, record) => total + (record.workHours || 0), 0);
  const abnormalRecords = records.filter((record) => record.abnormal).map(mapWorkerRecord);
  const pm01Count = records.filter((record) => record.pmType === "PM01").length;
  const pm03Count = records.filter((record) => record.pmType === "PM03").length;

  return {
    summary: {
      totalWorkers: workers.length,
      totalOrders,
      totalWorkHours: roundNumber(totalWorkHours, 1),
      avgMttrMinutes: roundNumber(averageBy(records, (record) => record.mttrMinutes), 1),
      abnormalCount: abnormalRecords.length,
      pm01Count,
      pm03Count,
      pm01Share: totalOrders ? roundNumber((pm01Count / totalOrders) * 100, 1) : 0,
      pm03Share: totalOrders ? roundNumber((pm03Count / totalOrders) * 100, 1) : 0,
    },
    workers,
    topLists: buildWorkerTopLists(workers, records),
    abnormalRecords,
    filterOptions: buildWorkerFilterOptions(allRecords),
  };
}

function buildWorkerDetailPayload(db, employeeId, url) {
  const allFilteredRecords = applyWorkerPerformanceFilters(db.workerPerformanceRecords || [], url.searchParams);
  const filteredRecords = allFilteredRecords.filter((record) => record.employeeId === employeeId);
  const summary = rankWorkers(aggregateWorkerPerformance(allFilteredRecords)).find((worker) => worker.employeeId === employeeId) || null;
  const dailyMap = new Map();
  const equipmentMap = new Map();

  filteredRecords.forEach((record) => {
    const day = dailyMap.get(record.date) || {
      date: record.date,
      totalOrders: 0,
      totalWorkHours: 0,
      mttrTotal: 0,
      abnormalCount: 0,
    };
    day.totalOrders += 1;
    day.totalWorkHours += record.workHours || 0;
    day.mttrTotal += record.mttrMinutes || 0;
    day.abnormalCount += record.abnormal ? 1 : 0;
    dailyMap.set(record.date, day);

    if (record.equipmentId) {
      const equipment = equipmentMap.get(record.equipmentId) || {
        equipmentId: record.equipmentId,
        equipmentName: record.equipmentName,
        totalOrders: 0,
        abnormalCount: 0,
      };
      equipment.totalOrders += 1;
      equipment.abnormalCount += record.abnormal ? 1 : 0;
      equipmentMap.set(record.equipmentId, equipment);
    }
  });

  const dailyTrends = [...dailyMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((day) => ({
      ...day,
      totalWorkHours: roundNumber(day.totalWorkHours, 1),
      avgMttrMinutes: day.totalOrders ? roundNumber(day.mttrTotal / day.totalOrders, 1) : 0,
    }));

  return {
    summary,
    dailyTrends,
    equipment: [...equipmentMap.values()].sort((left, right) => right.totalOrders - left.totalOrders),
    workOrders: filteredRecords.map(mapWorkerRecord).sort((left, right) => right.date.localeCompare(left.date)),
    abnormalRecords: filteredRecords.filter((record) => record.abnormal).map(mapWorkerRecord),
  };
}

async function readMonthlyWorkerData() {
  if (monthlyWorkerCache) {
    return monthlyWorkerCache;
  }

  const raw = await fs.readFile(MONTHLY_WORKER_DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  monthlyWorkerCache = {
    monthOrder: Array.isArray(parsed.monthOrder) ? parsed.monthOrder : [],
    records: Array.isArray(parsed.records) ? parsed.records : [],
    filterOptions: parsed.filterOptions && typeof parsed.filterOptions === "object" ? parsed.filterOptions : {},
    sourceFiles: parsed.sourceFiles && typeof parsed.sourceFiles === "object" ? parsed.sourceFiles : {},
  };
  return monthlyWorkerCache;
}

function getMonthlyEmployeeRecords(monthlyData) {
  return (monthlyData.records || []).filter((record) => !record.isTotal && record.employeeName !== "Total");
}

function getCurrentMonthLabel() {
  return new Date().toLocaleString("en-US", { month: "short" });
}

const WORKER_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWorkerMonthParts(month) {
  const text = String(month || "");
  const match = text.match(/^(\d{4})\s+([A-Za-z]{3})$/);
  const monthName = match ? match[2] : text;
  return {
    year: match ? match[1] : "",
    monthName,
    monthIndex: WORKER_MONTH_NAMES.indexOf(monthName),
  };
}

function getWorkerMonthYear(month) {
  return getWorkerMonthParts(month).year;
}

function getWorkerYearOptions(months) {
  return [...new Set((months || []).map(getWorkerMonthYear).filter(Boolean))].sort();
}

function isCompletedWorkerMonth(month) {
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

function getCompletedMonthOrder(monthlyData) {
  return (monthlyData.monthOrder || []).filter(isCompletedWorkerMonth);
}

function getCompletedMonthlyEmployeeRecords(monthlyData) {
  const completedMonths = new Set(getCompletedMonthOrder(monthlyData));
  return getMonthlyEmployeeRecords(monthlyData).filter((record) => completedMonths.has(record.month));
}

function getRequestedCompletedWorkerMonth(monthlyData, requestedMonth) {
  const completedMonths = new Set(getCompletedMonthOrder(monthlyData));
  return requestedMonth && completedMonths.has(requestedMonth) ? requestedMonth : getDefaultWorkerMonth(monthlyData);
}

function getValidCompletedWorkerMonth(monthlyData, requestedMonth) {
  const completedMonths = new Set(getCompletedMonthOrder(monthlyData));
  return requestedMonth && completedMonths.has(requestedMonth) ? requestedMonth : "";
}

function isWorkerRegularMonth(month) {
  const parts = getWorkerMonthParts(month);
  return Boolean(parts.year && parts.monthIndex >= 0) || WORKER_MONTH_NAMES.includes(month);
}

function getDefaultWorkerMonth(monthlyData) {
  const employeeRecords = getCompletedMonthlyEmployeeRecords(monthlyData);
  const monthOrder = getCompletedMonthOrder(monthlyData);
  const monthTotals = new Map();

  employeeRecords.forEach((record) => {
    const current = monthTotals.get(record.month) || {
      attendanceHours: 0,
      activity: 0,
    };
    current.attendanceHours += Number(record.attendanceHours) || 0;
    current.activity += (Number(record.orderCount) || 0) + (Number(record.repairHours) || 0);
    monthTotals.set(record.month, current);
  });

  return (
    [...monthOrder]
      .reverse()
      .find((month) => {
        const total = monthTotals.get(month);
        return isWorkerRegularMonth(month) && total && total.attendanceHours > 0 && total.activity > 0;
      }) ||
    [...monthOrder]
      .reverse()
      .find((month) => {
        const total = monthTotals.get(month);
        return isWorkerRegularMonth(month) && total && total.activity > 0;
      }) ||
    ""
  );
}

function applyMonthlyWorkerFilters(records, searchParams, defaultMonth) {
  const year = searchParams.get("year") || "";
  const month = searchParams.get("month") || (!year ? defaultMonth || "" : "");
  const shift = searchParams.get("shift") || "";
  const employeeKey = searchParams.get("employeeKey") || "";

  return records.filter((record) => {
    if (month && record.month !== month) return false;
    if (!month && year && getWorkerMonthYear(record.month) !== year) return false;
    if (shift && record.shift !== shift) return false;
    if (employeeKey && record.employeeKey !== employeeKey) return false;
    return true;
  });
}

function aggregateMonthlyWorkerRecordsByEmployee(records, periodLabel) {
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
    attendanceHours: roundNumber(record.attendanceHours, 1),
    orderCount: roundNumber(record.orderCount, 4),
    repairHours: roundNumber(record.repairHours, 4),
    repairEfficiency: record.attendanceHours ? roundNumber(record.repairHours / record.attendanceHours, 4) : 0,
    orderEfficiency: record.attendanceHours ? roundNumber(record.orderCount / record.attendanceHours, 4) : 0,
  }));
}

function isMonthlyWorkerRankingQualityFlag(record) {
  return (
    (Number(record.attendanceHours) || 0) <= 0 &&
    ((Number(record.orderCount) || 0) > 0 || (Number(record.repairHours) || 0) > 0)
  );
}

function isWorkerRepairExempt(record) {
  return String(record?.shift || "").trim() === "维护组";
}

function buildMonthlyPerformanceScoredRecords(records) {
  const items = Array.isArray(records) ? records : [];
  const rankableItems = items.filter((record) => !isMonthlyWorkerRankingQualityFlag(record));
  const maxOrderCount = Math.max(...rankableItems.map((record) => Number(record.orderCount) || 0), 0);
  const maxRepairHours = Math.max(...rankableItems.map((record) => Number(record.repairHours) || 0), 0);
  const maxRepairEfficiency = Math.max(
    ...rankableItems.map((record) => Number(record.repairEfficiency) || 0),
    0
  );
  const scorePart = (value, maxValue) => (maxValue > 0 ? Math.min(100, Math.max(0, (value / maxValue) * 100)) : 0);

  return items.map((record) => {
    const qualityFlag = isMonthlyWorkerRankingQualityFlag(record);
    const orderScore = scorePart(Number(record.orderCount) || 0, maxOrderCount);
    const repairHoursScore = scorePart(Number(record.repairHours) || 0, maxRepairHours);
    const efficiencyScore = qualityFlag ? 0 : scorePart(Number(record.repairEfficiency) || 0, maxRepairEfficiency);
    const qualityScore = qualityFlag ? 0 : 100;
    const performanceScore = qualityFlag ? 0 : orderScore * 0.4 + repairHoursScore * 0.3 + efficiencyScore * 0.2 + qualityScore * 0.1;

    return {
      ...record,
      qualityFlag,
      orderScore: roundNumber(orderScore, 1),
      repairHoursScore: roundNumber(repairHoursScore, 1),
      efficiencyScore: roundNumber(efficiencyScore, 1),
      qualityScore: roundNumber(qualityScore, 1),
      performanceScore: roundNumber(performanceScore, 1),
    };
  });
}

function rankMonthlyWorkers(records) {
  const totalRepairHours = records.reduce((sum, record) => sum + (Number(record.repairHours) || 0), 0);

  return buildMonthlyPerformanceScoredRecords(records)
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
      attendanceHours: roundNumber(Number(record.attendanceHours) || 0, 1),
      orderCount: roundNumber(Number(record.orderCount) || 0, 1),
      repairHours: roundNumber(Number(record.repairHours) || 0, 1),
      repairEfficiency: roundNumber(Number(record.repairEfficiency) || 0, 4),
      orderEfficiency: roundNumber(Number(record.orderEfficiency) || 0, 4),
      repairHoursShare: totalRepairHours ? roundNumber(((Number(record.repairHours) || 0) / totalRepairHours) * 100, 1) : 0,
      performanceScore: roundNumber(record.performanceScore, 1),
      orderScore: roundNumber(record.orderScore, 1),
      repairHoursScore: roundNumber(record.repairHoursScore, 1),
      efficiencyScore: roundNumber(record.efficiencyScore, 1),
      qualityScore: roundNumber(record.qualityScore, 1),
      qualityFlag: record.qualityFlag,
      qualityReason: "有接单/维修但出勤为 0",
    }));
}

function buildMonthlyShiftComparison(records) {
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
      attendanceHours: roundNumber(item.attendanceHours, 1),
      orderCount: roundNumber(item.orderCount, 1),
      repairHours: roundNumber(item.repairHours, 1),
      repairEfficiency: item.attendanceHours ? roundNumber(item.repairHours / item.attendanceHours, 4) : 0,
      orderEfficiency: item.attendanceHours ? roundNumber(item.orderCount / item.attendanceHours, 4) : 0,
      employeeCount: item.employeeKeys.size,
    }))
    .sort((left, right) => right.repairHours - left.repairHours);
}

function buildMonthlyTopLists(workers) {
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

function buildMonthlyQualityStats(records) {
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

function buildMonthlyWorkerFilterOptions(monthlyData, defaultMonth) {
  const options = monthlyData.filterOptions || {};
  const completedMonthSet = new Set(getCompletedMonthOrder(monthlyData));
  const months = (options.months || monthlyData.monthOrder || []).filter((month) => completedMonthSet.has(month));
  return {
    years: options.years || getWorkerYearOptions(months),
    months,
    shifts: options.shifts || [],
    employees: options.employees || [],
    defaultMonth,
  };
}

function buildMonthlyWorkerPerformancePayload(monthlyData, url) {
  const defaultMonth = getDefaultWorkerMonth(monthlyData);
  const requestedYear = url.searchParams.get("year") || "";
  const validMonth = getValidCompletedWorkerMonth(monthlyData, url.searchParams.get("month"));
  const selectedYear = requestedYear && getCompletedMonthOrder(monthlyData).some((month) => getWorkerMonthYear(month) === requestedYear) ? requestedYear : "";
  const selectedMonth = validMonth && (!selectedYear || getWorkerMonthYear(validMonth) === selectedYear) ? validMonth : selectedYear ? "" : defaultMonth;
  const selectedPeriod = selectedMonth || (selectedYear ? `${selectedYear} 全年` : defaultMonth);
  const allEmployeeRecords = getCompletedMonthlyEmployeeRecords(monthlyData);
  const searchParams = new URLSearchParams(url.searchParams);
  if (selectedYear) {
    searchParams.set("year", selectedYear);
  } else {
    searchParams.delete("year");
  }
  searchParams.set("month", selectedMonth);
  const records = applyMonthlyWorkerFilters(allEmployeeRecords, searchParams, defaultMonth);
  const workers = rankMonthlyWorkers(aggregateMonthlyWorkerRecordsByEmployee(records, selectedPeriod));
  const topSearchParams = new URLSearchParams();
  if (selectedMonth) {
    topSearchParams.set("month", selectedMonth);
  } else if (selectedYear) {
    topSearchParams.set("year", selectedYear);
  }
  const topRecords = applyMonthlyWorkerFilters(allEmployeeRecords, topSearchParams, defaultMonth);
  const topWorkers = rankMonthlyWorkers(aggregateMonthlyWorkerRecordsByEmployee(topRecords, selectedPeriod));
  const shiftComparison = buildMonthlyShiftComparison(records);
  const totalAttendanceHours = records.reduce((sum, record) => sum + (Number(record.attendanceHours) || 0), 0);
  const totalOrderCount = records.reduce((sum, record) => sum + (Number(record.orderCount) || 0), 0);
  const totalRepairHours = records.reduce((sum, record) => sum + (Number(record.repairHours) || 0), 0);
  const missingAttendanceCount = records.filter(
    (record) =>
      (Number(record.attendanceHours) || 0) <= 0 &&
      ((Number(record.orderCount) || 0) > 0 || (Number(record.repairHours) || 0) > 0)
  ).length;
  const qualityStats = buildMonthlyQualityStats(records);
  return {
    summary: {
      selectedMonth,
      selectedYear,
      selectedPeriod,
      totalAttendanceHours: roundNumber(totalAttendanceHours, 1),
      totalOrderCount: roundNumber(totalOrderCount, 1),
      totalRepairHours: roundNumber(totalRepairHours, 1),
      avgRepairEfficiency: totalAttendanceHours ? roundNumber(totalRepairHours / totalAttendanceHours, 4) : 0,
      employeeCount: new Set(records.map((record) => record.employeeKey)).size,
      shiftCount: new Set(records.map((record) => record.shift)).size,
      missingAttendanceCount,
      qualityStats,
    },
    workers,
    shiftComparison,
    topLists: buildMonthlyTopLists(topWorkers),
    filterOptions: buildMonthlyWorkerFilterOptions(monthlyData, defaultMonth),
    sourceFiles: monthlyData.sourceFiles || {},
  };
}

function averageMonthlyRecords(records, month, field) {
  const values = records
    .filter((record) => record.month === month)
    .map((record) => Number(record[field]) || 0)
    .filter((value) => value > 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function averageWorkerRecords(records, field) {
  const values = (records || [])
    .map((record) => Number(record[field]) || 0)
    .filter((value) => value > 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function buildMonthlyWorkerDetailPayload(monthlyData, employeeKey, url) {
  const allEmployeeRecords = getCompletedMonthlyEmployeeRecords(monthlyData);
  const defaultMonth = getDefaultWorkerMonth(monthlyData);
  const requestedYear = url.searchParams.get("year") || "";
  const validMonth = getValidCompletedWorkerMonth(monthlyData, url.searchParams.get("month"));
  const selectedYear = requestedYear && getCompletedMonthOrder(monthlyData).some((month) => getWorkerMonthYear(month) === requestedYear) ? requestedYear : "";
  const selectedMonth = validMonth && (!selectedYear || getWorkerMonthYear(validMonth) === selectedYear) ? validMonth : selectedYear ? "" : defaultMonth;
  const selectedPeriod = selectedMonth || (selectedYear ? `${selectedYear} 全年` : defaultMonth);
  const employeeRecords = allEmployeeRecords
    .filter((record) => record.employeeKey === employeeKey)
    .sort((left, right) => getCompletedMonthOrder(monthlyData).indexOf(left.month) - getCompletedMonthOrder(monthlyData).indexOf(right.month));
  const periodSearchParams = new URLSearchParams(url.searchParams);
  if (selectedYear) {
    periodSearchParams.set("year", selectedYear);
  } else {
    periodSearchParams.delete("year");
  }
  periodSearchParams.set("month", selectedMonth);
  const periodRecords = applyMonthlyWorkerFilters(allEmployeeRecords, periodSearchParams, defaultMonth);
  const periodEmployeeRecords = periodRecords.filter((record) => record.employeeKey === employeeKey);
  const currentRecord =
    aggregateMonthlyWorkerRecordsByEmployee(periodEmployeeRecords, selectedPeriod)[0] ||
    employeeRecords.find((record) => record.month === selectedMonth) ||
    employeeRecords[employeeRecords.length - 1] ||
    null;

  if (!currentRecord) {
    return { summary: null };
  }

  const sameShiftRecords = allEmployeeRecords.filter((record) => record.shift === currentRecord.shift);
  const periodShiftRecords = periodRecords.filter((record) => record.shift === currentRecord.shift);
  const rankingSearchParams = new URLSearchParams(url.searchParams);
  if (selectedYear) {
    rankingSearchParams.set("year", selectedYear);
  } else {
    rankingSearchParams.delete("year");
  }
  rankingSearchParams.set("month", selectedMonth);
  rankingSearchParams.delete("employeeKey");
  const rankingRecords = aggregateMonthlyWorkerRecordsByEmployee(applyMonthlyWorkerFilters(allEmployeeRecords, rankingSearchParams, defaultMonth), selectedPeriod);
  const shiftComparisonRecords = aggregateMonthlyWorkerRecordsByEmployee(periodShiftRecords, selectedPeriod);
  const overallComparisonRecords = aggregateMonthlyWorkerRecordsByEmployee(periodRecords, selectedPeriod);
  const trendRecords = selectedYear ? employeeRecords.filter((record) => getWorkerMonthYear(record.month) === selectedYear) : employeeRecords;
  const monthlyTrends = trendRecords.map((record) => ({
    month: record.month,
    attendanceHours: roundNumber(Number(record.attendanceHours) || 0, 1),
    orderCount: roundNumber(Number(record.orderCount) || 0, 1),
    repairHours: roundNumber(Number(record.repairHours) || 0, 1),
    repairEfficiency: roundNumber(Number(record.repairEfficiency) || 0, 4),
    orderEfficiency: roundNumber(Number(record.orderEfficiency) || 0, 4),
    shiftAvgRepairEfficiency: roundNumber(averageMonthlyRecords(sameShiftRecords, record.month, "repairEfficiency"), 4),
    overallAvgRepairEfficiency: roundNumber(averageMonthlyRecords(allEmployeeRecords, record.month, "repairEfficiency"), 4),
  }));

  const summaryRecord =
    rankMonthlyWorkers(rankingRecords).find((record) => record.employeeKey === employeeKey) || rankMonthlyWorkers([currentRecord])[0];
  return {
    summary: {
      ...summaryRecord,
      selectedMonth,
      selectedYear,
      selectedPeriod,
    },
    monthlyTrends,
    comparisons: {
      shift: currentRecord.shift,
      selectedMonth,
      selectedYear,
      selectedPeriod,
      shiftAvgRepairEfficiency: roundNumber(averageWorkerRecords(shiftComparisonRecords, "repairEfficiency"), 4),
      overallAvgRepairEfficiency: roundNumber(averageWorkerRecords(overallComparisonRecords, "repairEfficiency"), 4),
      shiftAvgOrderEfficiency: roundNumber(averageWorkerRecords(shiftComparisonRecords, "orderEfficiency"), 4),
      overallAvgOrderEfficiency: roundNumber(averageWorkerRecords(overallComparisonRecords, "orderEfficiency"), 4),
      shiftEmployeeCount: new Set(periodShiftRecords.map((record) => record.employeeKey)).size,
      overallEmployeeCount: new Set(periodRecords.map((record) => record.employeeKey)).size,
    },
  };
}

function mapSubmission(record) {
  return {
    id: record.id,
    submitterId: record.submitterId,
    submitter: record.submitter,
    equipmentId: record.equipmentId,
    equipmentName: record.equipmentName,
    station: record.station,
    changeType: record.changeType,
    quantityDelta: record.quantityDelta,
    newStatus: record.newStatus,
    note: record.note,
    status: record.status,
    createdAt: record.createdAt,
    reviewedAt: record.reviewedAt,
    reviewedBy: record.reviewedBy,
  };
}

function mapAuditLog(entry) {
  return {
    id: entry.id,
    action: entry.action,
    summary: entry.summary,
    actorId: entry.actorId,
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    targetType: entry.targetType,
    targetId: entry.targetId,
    details: entry.details,
    createdAt: entry.createdAt,
  };
}

function describeChangeType(changeType) {
  return CHANGE_TYPE_LABELS[changeType] || changeType;
}

function appendAuditLog(db, actor, action, targetType, targetId, summary, details = {}) {
  const entry = {
    id: `AUD-${Date.now()}-${randomUUID().slice(0, 8)}`,
    action,
    summary,
    actorId: actor ? actor.id : "SYSTEM",
    actorName: actor ? actor.displayName : "System",
    actorRole: actor ? actor.role : "system",
    targetType,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  };

  db.auditLogs.unshift(entry);
  return entry;
}

function buildSubmissionRecord(user, equipment, payload) {
  return {
    id: `SUB-${Date.now()}`,
    submitterId: user.id,
    submitter: user.displayName,
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    station: equipment.station,
    changeType: payload.changeType,
    quantityDelta:
      payload.quantityDelta === null ||
      payload.quantityDelta === undefined ||
      payload.quantityDelta === ""
        ? null
        : Number(payload.quantityDelta),
    newStatus: payload.newStatus || "",
    note: payload.note,
    status: "待审核",
    createdAt: new Date().toISOString(),
    reviewedAt: "",
    reviewedBy: "",
    reviewedById: "",
  };
}

function buildChangeRecord(field, before, after) {
  return { field, before, after };
}

function applyApprovedSubmission(db, submission) {
  const equipment = db.equipment.find((item) => item.id === submission.equipmentId);
  if (!equipment) {
    return null;
  }

  const changes = [];

  if (submission.changeType === "equipment_quantity" && Number.isFinite(submission.quantityDelta)) {
    const before = equipment.assetCount || 0;
    const after = Math.max(0, before + submission.quantityDelta);
    equipment.assetCount = after;
    changes.push(buildChangeRecord("assetCount", before, after));
  }

  if (submission.changeType === "status_update" && submission.newStatus) {
    changes.push(buildChangeRecord("status", equipment.status, submission.newStatus));
    equipment.status = submission.newStatus;
  }

  if (submission.changeType === "document_update") {
    changes.push(buildChangeRecord("drawingStatus", equipment.drawingStatus, "待更新"));
    changes.push(buildChangeRecord("layoutStatus", equipment.layoutStatus, "待核对"));

    equipment.drawingStatus = "待更新";
    equipment.layoutStatus = "待核对";
  }

  return {
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    changes,
  };
}

function createUserId(role) {
  const prefix = role === "viewer" ? "VIEW" : "EDIT";
  return `USR-${prefix}-${Date.now()}`;
}

async function handleLogin(request, response) {
  const { username, password } = await readBody(request);
  const db = await readDb();
  const user = db.users.find((item) => item.username === username && item.password === password);

  if (!user || !USER_ROLES.has(user.role)) {
    sendError(request, response, 401, "账号或密码不正确");
    return;
  }

  const token = randomUUID();
  sessions.set(token, sanitizeUser(user));
  sendJson(request, response, 200, {
    token,
    user: sanitizeUser(user),
  });
}

async function handleLogout(request, response) {
  const token = getToken(request);
  if (token) {
    sessions.delete(token);
  }
  sendJson(request, response, 200, { ok: true });
}

async function handleAuthMe(request, response) {
  const user = requireAuth(request, response);
  if (!user) {
    return;
  }
  sendJson(request, response, 200, { user });
}

async function handleDashboard(request, response) {
  const user = requireAuth(request, response);
  if (!user) {
    return;
  }

  const db = await readDb();
  sendJson(request, response, 200, buildDashboardPayload(db));
}

async function handleEquipment(request, response) {
  const user = requireAuth(request, response);
  if (!user) {
    return;
  }

  const db = await readDb();
  sendJson(request, response, 200, {
    equipment: db.equipment,
  });
}

async function handleWorkerPerformance(request, response, url) {
  const user = requireRoles(request, response, ["admin"]);
  if (!user) {
    return;
  }

  const db = await readDb();
  sendJson(request, response, 200, buildWorkerPerformancePayload(db, url));
}

async function handleWorkerPerformanceDetail(request, response, employeeId, url) {
  const user = requireRoles(request, response, ["admin"]);
  if (!user) {
    return;
  }

  const db = await readDb();
  const payload = buildWorkerDetailPayload(db, decodeURIComponent(employeeId), url);
  if (!payload.summary) {
    sendError(request, response, 404, "员工绩效记录不存在");
    return;
  }

  sendJson(request, response, 200, payload);
}

async function handleMonthlyWorkerPerformance(request, response, url) {
  if (!WORKER_ONLY_MODE) {
    const user = requireRoles(request, response, ["admin"]);
    if (!user) {
      return;
    }
  }

  const monthlyData = await readMonthlyWorkerData();
  sendJson(request, response, 200, buildMonthlyWorkerPerformancePayload(monthlyData, url));
}

async function handleMonthlyWorkerPerformanceDetail(request, response, employeeKey, url) {
  if (!WORKER_ONLY_MODE) {
    const user = requireRoles(request, response, ["admin"]);
    if (!user) {
      return;
    }
  }

  const monthlyData = await readMonthlyWorkerData();
  const payload = buildMonthlyWorkerDetailPayload(monthlyData, decodeURIComponent(employeeKey), url);
  if (!payload.summary) {
    sendError(request, response, 404, "员工月度绩效记录不存在");
    return;
  }

  sendJson(request, response, 200, payload);
}

async function handleUsersList(request, response) {
  const user = requireRoles(request, response, ["admin"]);
  if (!user) {
    return;
  }

  const db = await readDb();
  const users = [...db.users]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map(sanitizeUser);

  sendJson(request, response, 200, { users });
}

async function handleUserCreate(request, response) {
  const admin = requireRoles(request, response, ["admin"]);
  if (!admin) {
    return;
  }

  const payload = await readBody(request);
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const role = normalizeRole(payload.role);

  if (!username || !displayName || !password || !MANAGED_USER_ROLES.has(role)) {
    sendError(request, response, 400, "账号信息不完整");
    return;
  }

  const db = await readDb();
  const duplicate = db.users.find((item) => item.username === username);
  if (duplicate) {
    sendError(request, response, 409, "账号已存在，请更换用户名");
    return;
  }

  const now = new Date().toISOString();
  const user = normalizeUser({
    id: createUserId(role),
    username,
    displayName,
    password,
    role,
    createdAt: now,
    updatedAt: now,
  });

  db.users.unshift(user);
  appendAuditLog(
    db,
    admin,
    "user_created",
    "user",
    user.id,
    `${admin.displayName} 创建了${role === "viewer" ? "只读" : "编辑"}账号 ${user.username}`,
    {
      user: sanitizeUser(user),
    }
  );

  await writeDb(db);
  sendJson(request, response, 201, {
    user: sanitizeUser(user),
  });
}

async function handleUserUpdate(request, response, userId) {
  const admin = requireRoles(request, response, ["admin"]);
  if (!admin) {
    return;
  }

  const payload = await readBody(request);
  const role = normalizeRole(payload.role);

  if (!MANAGED_USER_ROLES.has(role)) {
    sendError(request, response, 400, "无效的账号权限");
    return;
  }

  const db = await readDb();
  const targetUser = db.users.find((item) => item.id === userId);
  if (!targetUser) {
    sendError(request, response, 404, "账号不存在");
    return;
  }

  if (targetUser.role === "admin") {
    sendError(request, response, 400, "管理员账号不能在此修改");
    return;
  }

  const previousRole = targetUser.role;
  targetUser.role = role;
  targetUser.updatedAt = new Date().toISOString();
  syncSessionUser(targetUser);

  appendAuditLog(
    db,
    admin,
    "user_role_updated",
    "user",
    targetUser.id,
    `${admin.displayName} 将 ${targetUser.username} 的权限从 ${previousRole} 调整为 ${role}`,
    {
      before: previousRole,
      after: role,
      user: sanitizeUser(targetUser),
    }
  );

  await writeDb(db);
  sendJson(request, response, 200, {
    user: sanitizeUser(targetUser),
  });
}

async function handleAuditLogs(request, response) {
  const user = requireRoles(request, response, ["admin"]);
  if (!user) {
    return;
  }

  const db = await readDb();
  const auditLogs = [...db.auditLogs].sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );

  sendJson(request, response, 200, {
    auditLogs: auditLogs.map(mapAuditLog),
  });
}

async function handleRiskRulesUpdate(request, response) {
  const admin = requireRoles(request, response, ["admin"]);
  if (!admin) {
    return;
  }

  const payload = await readBody(request);
  const db = await readDb();
  const previousRules = JSON.parse(JSON.stringify(db.riskRules));
  const currentHigh = getRiskRule(db.riskRules, "high");
  const currentMedium = getRiskRule(db.riskRules, "medium");

  db.riskRules = normalizeRiskRules([
    {
      ...currentHigh,
      thresholds: {
        ...currentHigh.thresholds,
        ...(payload.high || {}),
      },
    },
    {
      ...currentMedium,
      thresholds: {
        ...currentMedium.thresholds,
        ...(payload.medium || {}),
      },
    },
    getRiskRule(db.riskRules, "low"),
  ]);

  const validationError = validateRiskRules(db.riskRules);
  if (validationError) {
    sendError(request, response, 400, validationError);
    return;
  }

  const changedEquipment = recalculateAllEquipmentRisks(db);
  appendAuditLog(
    db,
    admin,
    "risk_rules_updated",
    "riskRules",
    "RISK-RULES",
    `${admin.displayName} 更新了风险阈值规则`,
    {
      before: previousRules,
      after: db.riskRules,
      changedEquipment,
    }
  );

  await writeDb(db);
  sendJson(request, response, 200, {
    riskRules: db.riskRules,
    changedEquipmentCount: changedEquipment.length,
    equipment: db.equipment,
  });
}

async function handleSubmissionsList(request, response, url) {
  const user = requireAuth(request, response);
  if (!user) {
    return;
  }

  const db = await readDb();
  let items = [...db.submissions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const scope = url.searchParams.get("scope");

  if (scope === "mine") {
    items = items.filter((item) => item.submitterId === user.id);
  } else if (user.role === "editor") {
    items = items.filter((item) => item.submitterId === user.id);
  } else if (user.role === "viewer") {
    items = items.filter((item) => item.status === "已通过");
  }

  sendJson(request, response, 200, {
    submissions: items.map(mapSubmission),
  });
}

async function handleSubmissionCreate(request, response) {
  const user = requireRoles(request, response, ["editor"]);
  if (!user) {
    return;
  }

  const payload = await readBody(request);
  const equipmentId = typeof payload.equipmentId === "string" ? payload.equipmentId : "";
  const changeType = typeof payload.changeType === "string" ? payload.changeType : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const quantityDelta = payload.quantityDelta;
  const newStatus = typeof payload.newStatus === "string" ? payload.newStatus : "";
  const db = await readDb();
  const equipment = db.equipment.find((item) => item.id === equipmentId);

  if (!equipment || !changeType || !note || !CHANGE_TYPE_LABELS[changeType]) {
    sendError(request, response, 400, "提交信息不完整");
    return;
  }

  if (
    (changeType === "equipment_quantity" || changeType === "spare_update") &&
    !Number.isFinite(Number(quantityDelta))
  ) {
    sendError(request, response, 400, "请填写有效的数量变化值");
    return;
  }

  if (
    changeType === "status_update" &&
    !["stable", "warning", "critical", "upgrade"].includes(newStatus)
  ) {
    sendError(request, response, 400, "请选择有效的设备状态");
    return;
  }

  const record = buildSubmissionRecord(user, equipment, {
    changeType,
    quantityDelta,
    newStatus,
    note,
  });

  db.submissions.unshift(record);
  appendAuditLog(
    db,
    user,
    "submission_created",
    "submission",
    record.id,
    `${user.displayName} 提交了${describeChangeType(record.changeType)}申请`,
    {
      submission: mapSubmission(record),
    }
  );

  await writeDb(db);
  sendJson(request, response, 201, {
    submission: mapSubmission(record),
  });
}

async function handleSubmissionReview(request, response, submissionId) {
  const admin = requireRoles(request, response, ["admin"]);
  if (!admin) {
    return;
  }

  const { status } = await readBody(request);
  if (!["已通过", "已驳回"].includes(status)) {
    sendError(request, response, 400, "无效的审核状态");
    return;
  }

  const db = await readDb();
  const submission = db.submissions.find((item) => item.id === submissionId);
  if (!submission) {
    sendError(request, response, 404, "提交记录不存在");
    return;
  }

  if (submission.status !== "待审核") {
    sendError(request, response, 400, "该提交已完成审核");
    return;
  }

  const previousStatus = submission.status;
  submission.status = status;
  submission.reviewedAt = new Date().toISOString();
  submission.reviewedBy = admin.displayName;
  submission.reviewedById = admin.id;

  appendAuditLog(
    db,
    admin,
    "submission_reviewed",
    "submission",
    submission.id,
    `${admin.displayName} ${status === "已通过" ? "通过" : "驳回"}了提交 ${submission.id}`,
    {
      before: previousStatus,
      after: status,
      submission: mapSubmission(submission),
    }
  );

  if (status === "已通过") {
    const appliedResult = applyApprovedSubmission(db, submission);
    const recalculatedEquipment = recalculateAllEquipmentRisks(db);
    const affectedEquipment = recalculatedEquipment.find((item) => item.equipmentId === submission.equipmentId);
    const mergedChanges = [
      ...((appliedResult && appliedResult.changes) || []),
      ...((affectedEquipment && affectedEquipment.changes) || []),
    ];

    if (appliedResult && mergedChanges.length) {
      appendAuditLog(
        db,
        admin,
        "data_modified",
        "equipment",
        appliedResult.equipmentId,
        `${admin.displayName} 根据提交 ${submission.id} 更新了设备 ${appliedResult.equipmentName}`,
        {
          submissionId: submission.id,
          equipmentId: appliedResult.equipmentId,
          equipmentName: appliedResult.equipmentName,
          changes: mergedChanges,
        }
      );
    }
  }

  await writeDb(db);
  sendJson(request, response, 200, {
    submission: mapSubmission(submission),
  });
}

async function serveStatic(request, response, url) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const legacyPath = path.join(LEGACY_DIR, pathname);
  const rootPath = path.join(ROOT_DIR, pathname);
  const filePath = legacyPath.startsWith(LEGACY_DIR) ? legacyPath : rootPath;

  if (!filePath.startsWith(LEGACY_DIR) && !filePath.startsWith(ROOT_DIR)) {
    sendError(request, response, 403, "Forbidden");
    return;
  }

  try {
    let resolvedPath = filePath;
    let stat;
    try {
      stat = await fs.stat(resolvedPath);
    } catch {
      resolvedPath = rootPath;
      stat = await fs.stat(resolvedPath);
    }
    if (!stat.isFile()) {
      sendError(request, response, 404, "Not found");
      return;
    }

    const ext = path.extname(resolvedPath);
    const content = await fs.readFile(resolvedPath);
    response.writeHead(
      200,
      withCorsHeaders(request, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      })
    );
    response.end(content);
  } catch {
    sendError(request, response, 404, "Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "OPTIONS") {
      response.writeHead(
        204,
        withCorsHeaders(request, {
          "Access-Control-Allow-Methods": CORS_METHODS,
          "Access-Control-Allow-Headers": CORS_HEADERS,
          "Access-Control-Max-Age": "86400",
          "Cache-Control": "no-store",
        })
      );
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      await handleLogin(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      await handleLogout(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      await handleAuthMe(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      await handleDashboard(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/equipment") {
      await handleEquipment(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/worker-performance/monthly") {
      await handleMonthlyWorkerPerformance(request, response, url);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/worker-performance/monthly/")) {
      const employeeKey = url.pathname.slice("/api/worker-performance/monthly/".length);
      await handleMonthlyWorkerPerformanceDetail(request, response, employeeKey, url);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/worker-performance") {
      await handleWorkerPerformance(request, response, url);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/worker-performance/")) {
      const employeeId = url.pathname.slice("/api/worker-performance/".length);
      await handleWorkerPerformanceDetail(request, response, employeeId, url);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/users") {
      await handleUsersList(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/users") {
      await handleUserCreate(request, response);
      return;
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/users/")) {
      const segments = url.pathname.split("/");
      const userId = segments[segments.length - 1];
      await handleUserUpdate(request, response, userId);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/audit-logs") {
      await handleAuditLogs(request, response);
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/risk-rules") {
      await handleRiskRulesUpdate(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/submissions") {
      await handleSubmissionsList(request, response, url);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/submissions") {
      await handleSubmissionCreate(request, response);
      return;
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/submissions/")) {
      const segments = url.pathname.split("/");
      const submissionId = segments[segments.length - 1];
      await handleSubmissionReview(request, response, submissionId);
      return;
    }

    await serveStatic(request, response, url);
  } catch (error) {
    sendError(request, response, 500, error.message || "Internal server error");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
