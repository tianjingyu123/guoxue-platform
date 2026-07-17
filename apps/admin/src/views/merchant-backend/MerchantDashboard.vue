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
import { ShoppingCart, Money, Goods, Warning, Star, ChatDotRound } from "@element-plus/icons-vue";
import { merchantBackendApi } from "@/api";

/**
 * 数据概览——后端 getDashboard 真实返回：
 * todayOrders/todaySales/totalProducts/pendingReviews/totalSales/totalOrders/rating。
 * 注意：today* 按服务器时区零点起算（端点无时区参数·如服务器为 UTC 则口径偏差 8h·已记后端清单）；
 * totalProducts 为该店主全部商品数（含非商家供货商品），商品总数改用商品列表同口径 total。
 */
interface DashboardData {
  todayOrders?: number;
  todaySales?: number;
  totalProducts?: number;
  pendingReviews?: number;
  totalSales?: number;
  totalOrders?: number;
  rating?: number;
}

const loading = ref(false);
const error = ref(false);
const dashboard = ref<DashboardData>({});
const shopName = ref("");
/** 待处理售后数（真实来源：售后列表 PENDING total·后端 dashboard 不含该字段） */
const pendingAfterSales = ref<number | null>(null);
/** 商品总数（与商品管理页同口径：listProducts total·CERTIFIED_MERCHANT） */
const productTotal = ref<number | null>(null);

function fmtMoney(v?: number | string | null): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const cards = computed(() => [
  { label: "今日订单", value: dashboard.value.todayOrders ?? "—", icon: ShoppingCart, bg: "#ecf5ff" },
  { label: "今日销售额", value: fmtMoney(dashboard.value.todaySales), icon: Money, bg: "#f0f9eb" },
  { label: "商品总数", value: productTotal.value ?? dashboard.value.totalProducts ?? "—", icon: Goods, bg: "#fdf6ec" },
  { label: "待处理售后", value: pendingAfterSales.value ?? "—", icon: Warning, bg: "#fef0f0" },
  { label: "待回复评价", value: dashboard.value.pendingReviews ?? "—", icon: ChatDotRound, bg: "#ecf5ff" },
  { label: "店铺评分", value: dashboard.value.rating != null ? Number(dashboard.value.rating).toFixed(1) : "—", icon: Star, bg: "#f5f0e8" },
]);

async function loadDashboard() {
  loading.value = true;
  error.value = false;
  try {
    const res = await merchantBackendApi.getDashboard();
    dashboard.value = (res as { data?: DashboardData }).data ?? (res as DashboardData);
  } catch (e) {
    error.value = true;
  } finally {
    loading.value = false;
  }
  // 店铺名 / 待处理售后数 / 商品总数（口径与商品管理页一致）——失败各自降级为"—"，不阻塞主卡片
  merchantBackendApi.getProfile().then((p) => {
    const pd = p as { data?: { shopName?: string }; shopName?: string };
    shopName.value = pd.data?.shopName ?? pd.shopName ?? "";
  }).catch(() => { /* 店铺名缺省不展示 */ });
  merchantBackendApi.listAfterSales({ status: "PENDING", page: 1, pageSize: 1 }).then((r) => {
    const d = (r as { data?: { total?: number } }).data ?? (r as { total?: number });
    pendingAfterSales.value = d.total ?? 0;
  }).catch(() => { pendingAfterSales.value = null; });
  merchantBackendApi.listProducts({ page: 1, pageSize: 1 }).then((r) => {
    const d = (r as { data?: { total?: number } }).data ?? (r as { total?: number });
    productTotal.value = d.total ?? null;
  }).catch(() => { productTotal.value = null; });
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
