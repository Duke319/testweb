<template>
  <header class="dashboard-header">
    <div class="brand-line" aria-hidden="true"></div>
    <section class="dashboard-toolbar">
      <div class="brand-lockup">
        <img class="bosch-logo" :src="boschLogo" alt="Bosch" />
        <div>
          <strong>员工绩效</strong>
        </div>
      </div>

      <div class="toolbar-scope">
        <span>当前范围</span>
        <strong>{{ scopeText }}</strong>
      </div>

      <nav class="module-tabs" aria-label="指标切换">
        <button
          v-for="item in views"
          :key="item.id"
          type="button"
          :class="{ active: activeView === item.id }"
          @click="$emit('update:activeView', item.id)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div v-if="currentUser" class="toolbar-account">
        <div>
          <span>当前账号</span>
          <strong>{{ currentUser.username }}</strong>
          <small>{{ roleLabel }} · {{ scopeLabel }}</small>
        </div>
        <button type="button" class="logout-btn" @click="$emit('logout')">退出</button>
      </div>
    </section>
  </header>
</template>

<script setup>
import { computed } from "vue";
import boschLogo from "../../../assets/bosch-logo.svg";

const props = defineProps({
  scopeText: { type: String, required: true },
  activeView: { type: String, default: "overview" },
  currentUser: { type: Object, default: null },
});

defineEmits(["update:activeView", "logout"]);

const roleLabel = computed(() => {
  const role = props.currentUser?.role;
  if (role === "admin") return "管理员";
  if (role === "editor") return "编辑账号";
  if (role === "viewer") return "只读账号";
  return "员工";
});

const scopeLabel = computed(() => props.currentUser?.departmentScope || "全部 TEF");

const views = [
  { id: "overview", label: "总览" },
  { id: "pi", label: "PI" },
  { id: "composite", label: "综合工时" },
  { id: "reliability", label: "MTTR" },
  { id: "improvement", label: "改善" },
  { id: "competence", label: "能力" },
  { id: "safety", label: "安全" },
  { id: "exception", label: "异常" },
];
</script>
