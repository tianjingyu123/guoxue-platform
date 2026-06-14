<template>
  <div class="page">
    <div class="page-header">
      <h3>运营商权益中心</h3>
      <span class="subtitle">平台运营数据与资源管理</span>
    </div>

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

    <el-row :gutter="16" style="margin-top:20px">
      <el-col :span="12">
        <el-card>
          <template #header><span>分站收入排行</span></template>
          <el-table v-loading="loading" :data="topStations" size="small">
            <el-table-column prop="name" label="分站名称" />
            <el-table-column prop="revenue" label="月收入">
              <template #default="{ row }">¥{{ Number(row.revenue || 0).toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>资源消耗概览</span></template>
          <div class="chart-placeholder">
            <el-icon :size="48"><Odometer /></el-icon>
            <p>API / 存储 / 带宽 资源配额使用情况</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { UserFilled, Coin, Monitor, Odometer } from "@element-plus/icons-vue";
import { operatorDashboardApi } from "@/api";

const loading = ref(false);
const dashboard = ref<any>({});
const topStations = ref<any[]>([]);

const cards = computed(() => [
  { label: "分站总数", value: dashboard.value.stationCount ?? "-", icon: Monitor, bg: "#ecf5ff" },
  { label: "平台总收入", value: "¥" + (Number(dashboard.value.totalRevenue) || 0).toFixed(2), icon: Coin, bg: "#f0f9eb" },
  { label: "活跃用户", value: dashboard.value.activeUsers ?? "-", icon: UserFilled, bg: "#fdf6ec" },
  { label: "API配额", value: dashboard.value.apiQuota ?? "-", icon: Odometer, bg: "#f5f0e8" },
]);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await operatorDashboardApi.overview();
    dashboard.value = (res as any)?.data ?? res ?? {};
    topStations.value = (dashboard.value as any)?.topStations ?? [];
  } finally { loading.value = false; }
});
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 20px; }
.page-header h3 { margin: 0; }
.subtitle { color: var(--color-text-secondary); font-size: 14px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 12px; padding: 0; width: 100%; }
.stat-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8B4513; flex-shrink: 0; }
.stat-value { font-size: 22px; font-weight: bold; color: #333; }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.chart-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; color: var(--color-text-secondary); }
.chart-placeholder p { margin-top: 12px; font-size: 14px; }
</style>
