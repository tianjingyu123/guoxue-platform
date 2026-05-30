<template>
  <div class="conn-status" :class="status">
    <span class="conn-dot" />
    <span class="conn-text">{{ statusText }}</span>
    <el-button
      v-if="status === 'offline'"
      size="small"
      text
      class="retry-btn"
      @click="check"
    >重试</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { api } from "@/api";

type Status = "checking" | "online" | "offline";
const status = ref<Status>("checking");
let timer: ReturnType<typeof setInterval> | null = null;

const STATUS_MAP: Record<Status, string> = {
  checking: "检测服务状态...",
  online: "服务正常",
  offline: "服务不可用 — 数据无法加载",
};

const statusText = ref(STATUS_MAP.checking);

async function check() {
  status.value = "checking";
  statusText.value = STATUS_MAP.checking;
  try {
    await api.get("/health", { timeout: 5000 });
    status.value = "online";
    statusText.value = STATUS_MAP.online;
  } catch {
    status.value = "offline";
    statusText.value = STATUS_MAP.offline;
  }
}

onMounted(() => {
  check();
  timer = setInterval(check, 15_000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.conn-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  font-size: 12px;
  transition: background 0.3s, color 0.3s;
}
.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.retry-btn {
  font-size: 11px;
  padding: 0 4px;
  height: 20px;
  margin-left: 4px;
}

/* 检测中 — 灰 */
.conn-status.checking {
  background: #f0f0f0;
  color: #999;
}
.conn-status.checking .conn-dot {
  background: #bbb;
  animation: pulse 1s infinite;
}

/* 在线 — 绿 */
.conn-status.online {
  background: rgba(82, 196, 26, 0.08);
  color: #3a8f3f;
}
.conn-status.online .conn-dot {
  background: var(--color-success);
}

/* 离线 — 红 */
.conn-status.offline {
  background: rgba(255, 77, 79, 0.08);
  color: var(--color-primary);
}
.conn-status.offline .conn-dot {
  background: var(--color-error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
