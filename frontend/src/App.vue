<template>
  <section v-if="authChecking" class="auth-screen auth-screen-loading" aria-live="polite">
    <div class="auth-loading-card">
      <img class="auth-logo" :src="boschLogo" alt="Bosch" />
      <strong>正在检查登录状态</strong>
    </div>
  </section>

  <section v-else-if="!auth" id="auth-screen" class="auth-screen" aria-label="登录界面">
    <div class="auth-shell">
      <article class="auth-card">
        <div class="auth-brand">
          <img class="auth-logo" :src="boschLogo" alt="Bosch" />
          <div class="auth-brand-copy">
            <p>Employee Performance Console</p>
          </div>
        </div>

        <div class="auth-copy">
          <span>统一入口</span>
          <h1>员工绩效平台</h1>
        </div>

        <div id="auth-role-switch" class="auth-role-switch" role="tablist" aria-label="登录角色">
          <button
            v-for="role in roleOptions"
            :key="role.id"
            type="button"
            class="auth-role-btn"
            :class="{ active: selectedRole === role.id }"
            role="tab"
            :aria-selected="selectedRole === role.id"
            @click="selectedRole = role.id"
          >
            {{ role.label }}
          </button>
        </div>

        <form id="login-form" class="auth-form" @submit.prevent="handleLoginSubmit">
          <label class="auth-field" for="login-username">
            <span>账号</span>
            <input
              id="login-username"
              v-model.trim="loginForm.username"
              name="username"
              autocomplete="username"
              type="text"
              placeholder="请输入账号"
              required
            />
          </label>

          <label class="auth-field" for="login-password">
            <span>密码</span>
            <input
              id="login-password"
              v-model="loginForm.password"
              name="password"
              autocomplete="current-password"
              type="password"
              placeholder="请输入密码"
              required
            />
          </label>

          <button class="auth-submit" type="submit" :disabled="loginPending">
            {{ loginPending ? "正在登录" : "登录" }}
          </button>
        </form>

        <p id="auth-hint" class="auth-hint">请使用已授权凭据登录。</p>
        <p id="auth-error" class="auth-error" :class="{ hidden: !authError }" role="alert">
          {{ authError }}
        </p>
        <p class="auth-footer">Secure local console · V 2.4.1</p>
      </article>

      <aside class="auth-visual" aria-label="Bosch 工业现场">
        <img class="auth-visual-image" :src="authVisual" alt="Bosch 工业现场" />
        <div class="auth-visual-overlay" aria-hidden="true"></div>
      </aside>
    </div>
  </section>

  <PerformanceDashboard v-else :key="auth.user.id" :current-user="auth.user" @logout="handleLogout" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import PerformanceDashboard from "./views/PerformanceDashboard.vue";
import { setPerformanceAuthToken } from "./services/performanceApi";
import authVisual from "../../assets/auth-visual-bosch-family.webp";
import boschLogo from "../../assets/bosch-logo.svg";

const STORAGE_KEY = "bosch-api-auth-v1";
const API_BASE = import.meta.env.VITE_API_BASE || "";
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";

const roleOptions = [
  { id: "admin", label: "管理员" },
  { id: "employee", label: "员工" },
];

const staticDemoUsers = {
  admin: { passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", user: { id: "USR-ADMIN-001", username: "admin", displayName: "系统管理员", role: "admin" } },
  editor01: { passwordHash: "84f3ee8f646c896e01ed7933bed50414ae8c8000e44880fa0e0d530e71f3b46e", user: { id: "USR-EDIT-001", username: "editor01", displayName: "editor01", role: "editor", departmentScope: "TEF31", scopeLabel: "TEF31" } },
  editor02: { passwordHash: "84f3ee8f646c896e01ed7933bed50414ae8c8000e44880fa0e0d530e71f3b46e", user: { id: "USR-EDIT-002", username: "editor02", displayName: "editor02", role: "editor", departmentScope: "TEF32", scopeLabel: "TEF32" } },
  editor03: { passwordHash: "84f3ee8f646c896e01ed7933bed50414ae8c8000e44880fa0e0d530e71f3b46e", user: { id: "USR-EDIT-003", username: "editor03", displayName: "editor03", role: "editor", departmentScope: "TEF33", scopeLabel: "TEF33" } },
};

const authChecking = ref(true);
const auth = ref(null);
const authError = ref("");
const loginPending = ref(false);
const selectedRole = ref("admin");
const loginForm = ref({ username: "", password: "" });

function readStoredAuth() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored?.token && stored?.user) {
      return stored;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

function saveStoredAuth(nextAuth) {
  auth.value = nextAuth;
  setPerformanceAuthToken(nextAuth?.token || "");
  if (nextAuth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function authRequest(path, options = {}) {
  const headers = { Accept: "application/json" };
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return payload;
}

async function loginStaticDemo() {
  const record = staticDemoUsers[loginForm.value.username];
  if (!record || record.passwordHash !== await sha256(loginForm.value.password)) {
    throw new Error("账号或密码不正确");
  }
  return { token: `static-demo-${record.user.username}`, user: record.user };
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function restoreSession() {
  const stored = readStoredAuth();
  if (!stored) {
    return;
  }
  if (STATIC_DEMO) {
    auth.value = stored;
    setPerformanceAuthToken(stored.token);
    return;
  }

  try {
    const payload = await authRequest("/api/auth/me", { token: stored.token });
    auth.value = { token: stored.token, user: payload.user };
    setPerformanceAuthToken(stored.token);
  } catch {
    saveStoredAuth(null);
  }
}

async function handleLoginSubmit() {
  authError.value = "";
  loginPending.value = true;
  try {
    const payload = STATIC_DEMO
      ? await loginStaticDemo()
      : await authRequest("/api/auth/login", {
          method: "POST",
          body: {
            username: loginForm.value.username,
            password: loginForm.value.password,
          },
        });
    saveStoredAuth(payload);
    loginForm.value.password = "";
  } catch (error) {
    authError.value = error.message || "登录失败";
  } finally {
    loginPending.value = false;
  }
}

async function handleLogout() {
  const token = auth.value?.token;
  try {
    if (!STATIC_DEMO && token) {
      await authRequest("/api/auth/logout", { method: "POST", token });
    }
  } catch {
    // UI reset should not depend on the logout request succeeding.
  }
  saveStoredAuth(null);
  loginForm.value = { username: "", password: "" };
  selectedRole.value = "admin";
}

watch([authChecking, auth], () => {
  document.body.classList.toggle("auth-open", !authChecking.value && !auth.value);
});

onMounted(async () => {
  await restoreSession();
  authChecking.value = false;
});

onBeforeUnmount(() => {
  document.body.classList.remove("auth-open");
});
</script>
