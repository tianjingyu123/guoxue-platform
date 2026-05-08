<template>
  <view class="page">
    <view v-if="loading" class="center"><text class="loading-text">加载中...</text></view>

    <view v-else-if="order" class="detail">
      <!-- 状态 -->
      <view class="status-bar" :class="'status-' + (order.status || '').toLowerCase()">
        <text class="status-text">{{ statusLabel(order.status) }}</text>
      </view>

      <!-- 订单信息 -->
      <view class="info-card">
        <view class="info-row">
          <text class="label">订单编号</text>
          <text class="value">{{ order.id }}</text>
        </view>
        <view class="info-row">
          <text class="label">订单金额</text>
          <text class="value amount">¥{{ Number(order.totalAmount).toFixed(2) }}</text>
        </view>
        <view class="info-row">
          <text class="label">创建时间</text>
          <text class="value">{{ formatTime(order.createdAt) }}</text>
        </view>
        <view v-if="order.productId" class="info-row">
          <text class="label">商品ID</text>
          <text class="value">{{ order.productId }}</text>
        </view>
      </view>

      <!-- 操作 -->
      <view v-if="order.status === 'PENDING'" class="actions">
        <button class="btn-primary" @click="handlePay">去支付</button>
        <button class="btn-cancel" @click="handleCancel">取消订单</button>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-text">订单不存在</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { shopApi } from "../../api";

const loading = ref(true);
const order = ref<any>(null);

onMounted(() => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as any;
  const id = current?.options?.id;
  if (id) fetchOrder(id);
  else loading.value = false;
});

async function fetchOrder(id: string) {
  try {
    order.value = await shopApi.orderDetail(id);
  } catch {
    uni.showToast({ title: "加载订单详情失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    PENDING: "待付款", PAID: "已支付", SHIPPED: "已发货",
    COMPLETED: "已完成", CANCELLED: "已取消",
  };
  return map[s] || s;
}

function formatTime(t: string): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

async function handlePay() {
  try {
    await shopApi.payOrder(order.value.id);
    uni.showToast({ title: "支付成功", icon: "success" });
    await fetchOrder(order.value.id);
  } catch {
    uni.showToast({ title: "支付失败", icon: "none" });
  }
}

async function handleCancel() {
  try {
    const { confirm } = await uni.showModal({ title: "确认取消", content: "确定要取消此订单吗？" });
    if (!confirm) return;
    await shopApi.cancelOrder(order.value.id);
    uni.showToast({ title: "订单已取消", icon: "success" });
    await fetchOrder(order.value.id);
  } catch {
    // 用户取消操作不作处理
  }
}
</script>

<style>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }

.center { display: flex; justify-content: center; padding: 60px 0; }
.loading-text { color: #999; font-size: 14px; }

.status-bar {
  background: #ebf5fb; border-radius: 10px 10px 0 0; padding: 20px; text-align: center;
}
.status-pending { background: #fef5e7; }
.status-completed { background: #eafaf1; }
.status-cancelled { background: #f5f5f5; }
.status-text { font-size: 20px; font-weight: bold; color: #3498db; }
.status-pending .status-text { color: #e67e22; }
.status-completed .status-text { color: #27ae60; }
.status-cancelled .status-text { color: #bbb; }

.info-card {
  background: #fff; border-radius: 0 0 10px 10px; padding: 16px; margin-bottom: 16px;
}
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-bottom: 1px solid #F5F0E8;
}
.info-row:last-child { border-bottom: none; }
.label { font-size: 14px; color: #999; }
.value { font-size: 14px; color: #333; max-width: 60%; text-align: right; word-break: break-all; }
.amount { color: #e74c3c; font-weight: bold; font-size: 16px; }

.actions { display: flex; gap: 12px; margin-top: 8px; }
.btn-primary {
  flex: 1; background: #C41E3A; color: #fff; border-radius: 8px;
  font-size: 15px; padding: 12px; border: none; text-align: center;
}
.btn-cancel {
  flex: 1; background: #fff; color: #999; border-radius: 8px;
  font-size: 15px; padding: 12px; border: 1px solid #e0d5c1; text-align: center;
}

.empty { display: flex; justify-content: center; padding: 80px 0; }
.empty-text { font-size: 16px; color: #999; }
</style>
