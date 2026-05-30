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

      <!-- 物流信息 -->
      <view v-if="logistics" class="info-card">
        <view class="section-title">物流信息</view>
        <view class="info-row">
          <text class="label">快递公司</text>
          <text class="value">{{ logistics.company || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="label">快递单号</text>
          <text class="value">{{ logistics.trackingNo || '--' }}</text>
        </view>
        <view v-if="logistics.tracks?.length" class="logistics-timeline">
          <view v-for="(t, i) in logistics.tracks" :key="i" class="logistics-node">
            <view class="ln-dot" :class="{ active: i === 0 }" />
            <view class="ln-content">
              <text class="ln-text">{{ t.status || t.desc }}</text>
              <text class="ln-time">{{ t.time || t.datetime }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作 -->
      <view v-if="order.status === 'PENDING'" class="actions">
        <button class="btn-primary" @click="handlePay">去支付</button>
        <button class="btn-cancel" @click="handleCancel">取消订单</button>
      </view>
      <view v-else-if="order.status === 'PAID' || order.status === 'SHIPPED'" class="actions">
        <button class="btn-outline" @click="goAfterSale">申请售后</button>
      </view>
      <view v-else-if="order.status === 'COMPLETED'" class="actions">
        <button class="btn-outline" @click="goAfterSale">申请售后</button>
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
const logistics = ref<any>(null);

onMounted(() => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as any;
  const id = current?.options?.id;
  if (id) { fetchOrder(id); fetchLogistics(id); }
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
    uni.showLoading({ title: "拉起支付..." });
    // 尝试获取 openid（小程序环境）
    const openid = uni.getStorageSync("wx_openid") || "";
    if (openid) {
      // JSAPI 支付（小程序/公众号内）
      const payParams = await shopApi.jsapiPay(order.value.id, { openid });
      // 调起微信支付
      if (payParams && typeof payParams === "object") {
        uni.requestPayment({
          provider: "wxpay",
          timeStamp: payParams.timeStamp || "",
          nonceStr: payParams.nonceStr || "",
          package: payParams.package || "",
          signType: payParams.signType || "RSA",
          paySign: payParams.paySign || "",
          success: async () => {
            uni.hideLoading();
            uni.showToast({ title: "支付成功", icon: "success" });
            await fetchOrder(order.value.id);
          },
          fail: (err: any) => {
            uni.hideLoading();
            console.error("支付失败:", err);
            uni.showToast({ title: err.errMsg || "支付取消", icon: "none" });
          },
        });
      } else {
        // JSAPI 返回的不是调起参数，可能是预支付ID
        uni.hideLoading();
        await fetchOrder(order.value.id);
      }
    } else {
      // Native/H5 支付 - 生成二维码供扫码
      const result = await shopApi.nativePay(order.value.id);
      uni.hideLoading();
      if (result?.code_url) {
        uni.showModal({
          title: "请扫码支付",
          content: "请使用微信扫描二维码完成支付",
          confirmText: "已完成支付",
          success: async (res) => {
            if (res.confirm) {
              await fetchOrder(order.value.id);
            }
          },
        });
      } else {
        uni.showToast({ title: "支付参数获取失败，请重试", icon: "none" });
      }
    }
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || "支付失败，请重试", icon: "none" });
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

async function fetchLogistics(orderId: string) {
  try {
    logistics.value = await shopApi.getLogistics(orderId);
  } catch { /* skip */ }
}

function goAfterSale() {
  uni.navigateTo({ url: `/pages/shop/after-sale?orderId=${order.value.id}` });
}
</script>

<style>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }

.center { display: flex; justify-content: center; padding: 60px 0; }
.loading-text { color: #999; font-size: 14px; }

.status-bar {
  background: #F5F0E8; border-radius: 10px 10px 0 0; padding: 20px; text-align: center;
}
.status-pending { background: #fef5e7; }
.status-completed { background: #eafaf1; }
.status-cancelled { background: #F5F0E8; }
.status-text { font-size: 20px; font-weight: bold; color: #C41E3A; }
.status-pending .status-text { color: #C9A96E; }
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
.amount { color: #C41E3A; font-weight: bold; font-size: 16px; }

.actions { display: flex; gap: 12px; margin-top: 8px; }
.btn-primary {
  flex: 1; background: #C41E3A; color: #fff; border-radius: 8px;
  font-size: 15px; padding: 12px; border: none; text-align: center;
}
.btn-cancel {
  flex: 1; background: #fff; color: #999; border-radius: 8px;
  font-size: 15px; padding: 12px; border: 1px solid #E8E0D5; text-align: center;
}
.btn-outline {
  flex: 1; background: #fff; color: #C41E3A; border-radius: 8px;
  font-size: 14px; padding: 12px; border: 1px solid #C41E3A; text-align: center;
}

.section-title { font-size: 15px; font-weight: bold; color: #2C2C2C; margin-bottom: 10px; }

.logistics-timeline { margin-top: 8px; padding-left: 8px; }
.logistics-node { display: flex; gap: 10px; padding: 4px 0; }
.ln-dot { width: 8px; height: 8px; border-radius: 50%; background: #E8E0D5; margin-top: 6px; flex-shrink: 0; }
.ln-dot.active { background: #C41E3A; }
.ln-content { flex: 1; }
.ln-text { font-size: 13px; color: #333; display: block; }
.ln-time { font-size: 11px; color: #bbb; display: block; margin-top: 2px; }

.empty { display: flex; justify-content: center; padding: 80px 0; }
.empty-text { font-size: 16px; color: #999; }
</style>
