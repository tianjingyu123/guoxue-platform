<template>
  <div class="page">
    <div class="page-header">
      <h3>分站权益中心</h3>
      <span class="subtitle">分站数据概览与管理</span>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="分站数据加载失败"
      style="margin-bottom:16px"
    >
      <el-button
        size="small"
        type="primary"
        @click="load"
      >
        重试
      </el-button>
    </el-alert>

    <el-row v-loading="loading" :gutter="16">
      <el-col v-for="card in cards" :key="card.label" :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon" :style="{ background: card.bg }">
            <el-icon :size="24"><component :is="card.icon" /></el-icon>
          </div>
          <div class="stat-body">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top:20px">
      <template #header>
        <span>近30天趋势</span>
      </template>
      <div class="chart-placeholder">
        <el-icon :size="48"><TrendCharts /></el-icon>
        <p>接入后端统计图表组件后可展示分站注册/活跃/收益趋势</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { UserFilled, Coin, DataAnalysis, Connection, TrendCharts } from "@element-plus/icons-vue";
import { stationDashboardApi } from "@/api";

const loading = ref(false);
const loadError = ref(false);
const dashboard = ref<any>({});

const cards = computed(() => [
  { label: "入驻商家", value: dashboard.value.merchantCount ?? "-", icon: UserFilled, bg: "#ecf5ff" },
  { label: "本月分润", value: "¥" + (Number(dashboard.value.monthlyRevenue) || 0).toFixed(2), icon: Coin, bg: "#f0f9eb" },
  { label: "活跃用户", value: dashboard.value.activeUsers ?? "-", icon: DataAnalysis, bg: "#fdf6ec" },
  { label: "API 调用量", value: dashboard.value.apiCalls ?? "-", icon: Connection, bg: "#f5f0e8" },
]);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const res = await stationDashboardApi.overview();
    dashboard.value = (res as any)?.data ?? res ?? {};
  } catch {
    loadError.value = true;
  } finally { loading.value = false; }
}

onMounted(load);
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 20px; }
.page-header h3 { margin: 0; }
.subtitle { color: var(--color-text-secondary); font-size: 14px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 12px; padding: 0; width: 100%; }
.stat-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8B4513; flex-shrink: 0; }
.stat-value { font-size: 22px; font-weight: bold; color: var(--color-text-title); }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.chart-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; color: var(--color-text-secondary); }
.chart-placeholder p { margin-top: 12px; font-size: 14px; }
</style>
