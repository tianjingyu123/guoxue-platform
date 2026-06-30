<template>
  <div class="page">
    <div class="page-header">
      <h3>数据概览</h3>
      <span
        v-if="shopName"
        class="shop-name"
      >{{ shopName }}</span>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="数据概览加载失败，请稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="loadDashboard"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-row
      v-else
      v-loading="loading"
      :gutter="16"
    >
      <el-col
        v-for="card in cards"
        :key="card.label"
        :span="4"
      >
        <el-card
          class="stat-card"
          shadow="hover"
        >
          <div
            class="stat-icon"
            :style="{ background: card.bg }"
          >
            <el-icon :size="24">
              <component :is="card.icon" />
            </el-icon>
          </div>
          <div class="stat-body">
            <div class="stat-value">
              {{ card.value }}
            </div>
            <div class="stat-label">
              {{ card.label }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ShoppingCart, Money, Goods, Warning, Star } from "@element-plus/icons-vue";
import { merchantBackendApi } from "@/api";

const loading = ref(false);
const error = ref(false);
const dashboard = ref<any>({});
const shopName = ref("");

const cards = computed(() => [
  { label: "今日订单", value: dashboard.value.todayOrders ?? "-", icon: ShoppingCart, bg: "#ecf5ff" },
  { label: "今日收入", value: "¥" + (Number(dashboard.value.todayRevenue) || 0).toFixed(2), icon: Money, bg: "#f0f9eb" },
  { label: "商品总数", value: dashboard.value.totalProducts ?? "-", icon: Goods, bg: "#fdf6ec" },
  { label: "待处理退款", value: dashboard.value.pendingRefunds ?? "-", icon: Warning, bg: "#fef0f0" },
  { label: "店铺评分", value: Number(dashboard.value.shopRating || 0).toFixed(1), icon: Star, bg: "#f5f0e8" },
]);

async function loadDashboard() {
  loading.value = true;
  error.value = false;
  try {
    const res = await merchantBackendApi.getDashboard();
    dashboard.value = (res as any).data ?? res;
  } catch (e: any) {
    error.value = true;
  } finally {
    loading.value = false;
  }
  // 获取店铺名
  try {
    const p = await merchantBackendApi.getProfile();
    shopName.value = (p as any).data?.shopName ?? (p as any).shopName ?? "";
  } catch { /* */ }
}

onMounted(() => loadDashboard());
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 20px; }
.page-header h3 { margin: 0; }
.shop-name { color: var(--color-text-secondary); font-size: 14px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 12px; padding: 0; width: 100%; }
.stat-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8B4513; flex-shrink: 0; }
.stat-value { font-size: 22px; font-weight: bold; color: var(--color-text-title); }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
</style>
