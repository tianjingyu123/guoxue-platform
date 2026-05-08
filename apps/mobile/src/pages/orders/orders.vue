<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="loading" class="center">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="orders.length === 0" class="empty">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无订单</text>
      <text class="empty-sub">去商城逛逛吧</text>
    </view>

    <!-- 订单列表 -->
    <view v-else class="order-list">
      <view v-for="order in orders" :key="order.id" class="order-card" @click="viewDetail(order.id)">
        <view class="order-header">
          <text class="order-no">订单号：{{ order.id.slice(0, 8) }}...</text>
          <text :class="['order-status', statusClass(order.status)]">{{ statusLabel(order.status) }}</text>
        </view>
        <view class="order-body">
          <text class="order-amount">¥{{ Number(order.totalAmount).toFixed(2) }}</text>
          <text class="order-time">{{ formatTime(order.createdAt) }}</text>
        </view>
      </view>
    </view>

    <!-- 分页加载更多 -->
    <view v-if="hasMore && orders.length > 0" class="load-more" @click="fetchOrders">
      <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { shopApi } from "../../api";

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const loading = ref(true);
const loadingMore = ref(false);
const orders = ref<Order[]>([]);
const page = ref(1);
const hasMore = ref(true);
const PAGE_SIZE = 20;

onMounted(() => {
  fetchOrders();
});

async function fetchOrders() {
  if (loadingMore.value) return;
  if (page.value === 1) loading.value = true;
  else loadingMore.value = true;

  try {
    const res = (await shopApi.myOrders({ page: page.value, pageSize: PAGE_SIZE })) as any;
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

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    PENDING: "待付款",
    PAID: "已支付",
    SHIPPED: "已发货",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
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
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }

.center { display: flex; justify-content: center; align-items: center; padding: 60px 0; }
.loading-text { color: #999; font-size: 14px; }

.empty {
  display: flex; flex-direction: column; align-items: center; padding: 80px 0;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-text { font-size: 16px; color: #666; margin-bottom: 8px; }
.empty-sub { font-size: 13px; color: #bbb; }

.order-list { display: flex; flex-direction: column; gap: 10px; }

.order-card {
  background: #fff; border-radius: 10px; padding: 14px 16px; cursor: pointer;
}
.order-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}
.order-no { font-size: 13px; color: #999; }
.order-status { font-size: 12px; padding: 2px 10px; border-radius: 10px; }
.status-pending { color: #e67e22; background: #fef5e7; }
.status-progress { color: #3498db; background: #ebf5fb; }
.status-done { color: #27ae60; background: #eafaf1; }
.status-cancel { color: #bbb; background: #f5f5f5; }

.order-body {
  display: flex; justify-content: space-between; align-items: center;
}
.order-amount { font-size: 18px; font-weight: bold; color: #e74c3c; }
.order-time { font-size: 12px; color: #bbb; }

.load-more { text-align: center; padding: 20px; color: #C41E3A; font-size: 14px; cursor: pointer; }
</style>
