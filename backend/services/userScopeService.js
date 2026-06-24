const TEF_SCOPES = ["TEF31", "TEF32", "TEF33"];

const USERNAME_SCOPE_FALLBACKS = {
  root: "TEF31",
  editor01: "TEF31",
  editor02: "TEF32",
  editor03: "TEF33",
};

function normalizeDepartmentScope(value) {
  const scope = String(value || "").trim().toUpperCase();
  return TEF_SCOPES.includes(scope) ? scope : "";
}

function scopeForUser(user = {}) {
  if (!user || user.role === "admin") {
    return "";
  }
  return normalizeDepartmentScope(user.departmentScope || user.department || user.tefScope) || USERNAME_SCOPE_FALLBACKS[user.username] || "";
}

function sanitizeUserScope(user = {}) {
  const departmentScope = scopeForUser(user);
  return {
    departmentScope,
    scopeLabel: user.role === "admin" ? "全部 TEF" : departmentScope,
  };
}

function applyUserScopeToFilters(filters = {}, user = {}) {
  const departmentScope = scopeForUser(user);
  if (!departmentScope) {
    return { ...filters };
  }
  return {
    ...filters,
    businessArea: "",
    department: departmentScope,
    userDepartmentScope: departmentScope,
  };
}

module.exports = {
  TEF_SCOPES,
  applyUserScopeToFilters,
  normalizeDepartmentScope,
  sanitizeUserScope,
  scopeForUser,
};
