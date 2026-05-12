<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">我的订单</text>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-bar">
      <text
        v-for="f in filters"
        :key="f.key"
        class="filter-item"
        :class="{ active: currentFilter === f.key }"
        @click="switchFilter(f.key)"
      >{{ f.label }}</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-icon">📦</text>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <EmptyState
      v-else-if="orders.length === 0"
      icon="📦"
      :text="currentFilter === 'all' ? '暂无订单' : '暂无该状态订单'"
    >
      <view class="empty-actions">
        <text class="empty-link" @click="goShop">去商城逛逛</text>
      </view>
    </EmptyState>

    <!-- 订单列表 -->
    <view v-else class="order-list">
      <view v-for="order in orders" :key="order.id" class="order-card" @click="viewDetail(order.id)">
        <!-- 订单头 -->
        <view class="order-header">
          <text class="order-no">订单号：{{ order.id.slice(0, 12) }}...</text>
          <text :class="['order-status', statusClass(order.status)]">{{ statusLabel(order.status) }}</text>
        </view>

        <!-- 订单商品 -->
        <view class="order-items" v-if="order.items?.length">
          <view v-for="item in order.items.slice(0, 3)" :key="item.id" class="order-item">
            <image v-if="item.image" :src="item.image" class="item-img" mode="aspectFill" />
            <view v-else class="item-img-plc">📦</view>
            <text class="item-name">{{ item.title || '商品' }}</text>
            <text class="item-qty">×{{ item.quantity || 1 }}</text>
          </view>
          <text v-if="order.items.length > 3" class="order-more">...共 {{ order.items.length }} 件</text>
        </view>

        <!-- 订单底部 -->
        <view class="order-footer">
          <text class="order-time">{{ formatTime(order.createdAt) }}</text>
          <view class="order-amount-row">
            <text class="amount-label">合计</text>
            <text class="order-amount">¥{{ Number(order.totalAmount || 0).toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && orders.length > 0" class="load-more" @click="fetchOrders">
      <text>{{ loadingMore ? '加载中...' : '— 加载更多 —' }}</text>
    </view>
    <view v-if="!hasMore && orders.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { shopApi } from "../../api";
import EmptyState from "../../components/EmptyState.vue";

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items?: { id: string; image?: string; title?: string; quantity?: number }[];
}

const filters = [
  { key: "all", label: "全部" },
  { key: "PENDING", label: "待付款" },
  { key: "PAID", label: "已支付" },
  { key: "COMPLETED", label: "已完成" },
];

const currentFilter = ref("all");
const loading = ref(true);
const loadingMore = ref(false);
const orders = ref<Order[]>([]);
const page = ref(1);
const hasMore = ref(true);
const PAGE_SIZE = 20;

onMounted(() => {
  fetchOrders();
});

function switchFilter(key: string) {
  if (currentFilter.value === key) return;
  currentFilter.value = key;
  page.value = 1;
  orders.value = [];
  hasMore.value = true;
  fetchOrders();
}

async function fetchOrders() {
  if (loadingMore.value) return;
  if (page.value === 1) loading.value = true;
  else loadingMore.value = true;

  try {
    const params: any = { page: page.value, pageSize: PAGE_SIZE };
    if (currentFilter.value !== "all") params.status = currentFilter.value;
    const res = (await shopApi.myOrders(params)) as any;
    const list = res?.data ?? res ?? [];
    if (page.value === 1) orders.value = list;
    else orders.value.push(...list);
    hasMore.value = list.length >= PAGE_SIZE;
    page.value++;
  } catch {
    uni.showToast({ title: "加载订单失败", icon: "none" });
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function viewDetail(id: string) {
  uni.navigateTo({ url: `/pages/orders/order-detail?id=${id}` });
}

function goShop() {
  uni.navigateTo({ url: '/pages/shop/shop' });
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    PENDING: "待付款", PAID: "已支付", SHIPPED: "已发货",
    COMPLETED: "已完成", CANCELLED: "已取消",
  };
  return map[s] || s;
}

function statusClass(s: string): string {
  return s === "PENDING" ? "status-pending"
    : s === "COMPLETED" ? "status-done"
    : s === "CANCELLED" ? "status-cancel"
    : "status-progress";
}

function formatTime(t: string): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
</script>

<style>
.page {
  padding: 12px;
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ===== 页头 ===== */
.page-header {
  margin-bottom: 12px;
}
.page-title {
  font-size: 22px;
  font-weight: bold;
  color: #C41E3A;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 2px;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.filter-item {
  padding: 7px 18px;
  border-radius: 18px;
  font-size: 13px;
  color: #888;
  background: #fff;
  border: 1px solid #E8E0D5;
}
.filter-item.active {
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  border-color: #C41E3A;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(196, 30, 58, 0.2);
}

/* ===== 加载 ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 8px;
}
.loading-icon {
  font-size: 40px;
}
.loading-text {
  color: #bbb;
  font-size: 14px;
}

/* ===== 空 ===== */
.empty-actions {
  margin-top: 8px;
}
.empty-link {
  font-size: 14px;
  color: #C41E3A;
  padding: 6px 20px;
  border: 1px solid #C41E3A;
  border-radius: 16px;
}

/* ===== 订单列表 ===== */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s;
}
.order-card:active {
  transform: scale(0.985);
}

/* 订单头 */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #F5F0E8;
}
.order-no {
  font-size: 12px;
  color: #bbb;
}
.order-status {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
}
.status-pending { color: #C9A96E; background: #fdf5e6; }
.status-progress { color: #1565c0; background: #e3f2fd; }
.status-done { color: #2e7d32; background: #e8f5e9; }
.status-cancel { color: #bbb; background: #F5F0E8; }

/* 订单商品 */
.order-items {
  margin-bottom: 10px;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.item-img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  flex-shrink: 0;
}
.item-img-plc {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.item-name {
  flex: 1;
  font-size: 14px;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-qty {
  font-size: 12px;
  color: #bbb;
  flex-shrink: 0;
}
.order-more {
  font-size: 11px;
  color: #C9A96E;
  display: block;
  margin-top: 4px;
}

/* 订单底部 */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #F5F0E8;
}
.order-time {
  font-size: 11px;
  color: #bbb;
}
.order-amount-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.amount-label {
  font-size: 12px;
  color: #999;
}
.order-amount {
  font-size: 18px;
  font-weight: bold;
  color: #C41E3A;
}

/* ===== 加载更多 ===== */
.load-more {
  text-align: center;
  padding: 20px 0;
  color: #C9A96E;
  font-size: 13px;
}
.no-more {
  text-align: center;
  padding: 20px 0;
  color: #ccc;
  font-size: 12px;
}
</style>
