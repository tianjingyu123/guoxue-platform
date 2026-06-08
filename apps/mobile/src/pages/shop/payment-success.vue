<template>
  <view class="page">
    <!-- 绿色成功头部 -->
    <view class="success-header-bg">
      <!-- 对勾动画 -->
      <view class="check-animation" :class="{ visible: showAnimation }">
        <view class="check-circle">
          <view class="check-inner" :class="{ visible: showAnimation }">
            <text class="check-icon">✓</text>
          </view>
          <view class="check-ring" :class="{ visible: showAnimation }" />
        </view>
      </view>

      <text class="success-title" :class="{ visible: showAnimation }">支付成功</text>

      <view
        v-if="orderInfo"
        class="success-amount-area"
        :class="{ visible: showAnimation }"
      >
        <text class="success-amount">¥{{ orderInfo.amount.toFixed(2) }}</text>
        <text class="success-pay-info">{{ orderInfo.payMethod }} · {{ orderInfo.itemCount }}件商品</text>
      </view>
    </view>

    <!-- 白色卡片 -->
    <view class="content-cards">
      <!-- 订单信息 -->
      <view class="card order-card" :class="{ visible: showAnimation }">
        <view class="card-row">
          <text class="card-label">订单编号</text>
          <view class="card-value-row">
            <text class="card-value">{{ orderInfo?.orderId }}</text>
            <text
              class="copy-btn"
              @click="handleCopy"
            >
              {{ copied ? '已复制' : '📋' }}
            </text>
          </view>
        </view>
        <view class="card-row">
          <text class="card-label">支付方式</text>
          <text class="card-value">{{ orderInfo?.payMethod }}</text>
        </view>
        <view class="card-row no-border">
          <text class="card-label">支付时间</text>
          <text class="card-value">{{ formatTime(orderInfo?.paidAt) }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons" :class="{ visible: showAnimation }">
        <view class="btn-primary-action" @click="goOrder">
          <text class="action-icon">🛒</text>
          <text>查看订单</text>
        </view>
        <view class="btn-secondary-action" @click="goHome">
          <text class="action-icon">🏠</text>
          <text>返回首页</text>
        </view>
      </view>

      <!-- 推荐入口 -->
      <view class="recommend-card" :class="{ visible: showAnimation }">
        <text class="recommend-label">猜你喜欢</text>
        <view class="recommend-item" @click="goShop">
          <view class="recommend-icon-wrap">
            <text class="recommend-icon">🎁</text>
          </view>
          <view class="recommend-info">
            <text class="recommend-title">更多好物</text>
            <text class="recommend-desc">发现更多国学精品</text>
          </view>
          <text class="recommend-arrow">›</text>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="bottom-tip">
        <text>如有问题请联系客服</text>
        <text class="bottom-tip-sub">感谢您的支持，祝您学习愉快！</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { shopApi } from '../../api'

interface OrderInfo {
  orderId: string
  amount: number
  payMethod: string
  paidAt: string
  itemCount: number
}

const orderId = ref('')
const orderInfo = ref<OrderInfo | null>(null)
const copied = ref(false)
const showAnimation = ref(false)

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  orderId.value = page?.options?.orderId || ''

  if (orderId.value) {
    try {
      const detail: any = await shopApi.orderDetail(orderId.value)
      orderInfo.value = {
        orderId: detail.id || detail.orderId || orderId.value,
        amount: detail.actualAmount || detail.amount || 0,
        payMethod: detail.payMethod || detail.paymentMethod || '微信支付',
        paidAt: detail.paidAt || detail.payTime || new Date().toISOString(),
        itemCount: detail.items?.length || detail.itemCount || 0,
      }
    } catch {
      orderInfo.value = {
        orderId: orderId.value,
        amount: 0,
        payMethod: '微信支付',
        paidAt: new Date().toISOString(),
        itemCount: 0,
      }
    }
  } else {
    // 模拟数据
    orderInfo.value = {
      orderId: 'RB' + Date.now(),
      amount: 199.00,
      payMethod: '微信支付',
      paidAt: new Date().toISOString(),
      itemCount: 1,
    }
  }

  await nextTick()
  setTimeout(() => { showAnimation.value = true }, 100)
})

function handleCopy() {
  if (!orderInfo.value) return
  uni.setClipboardData({
    data: orderInfo.value.orderId,
    success: () => {
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    },
  })
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function goOrder() {
  if (orderInfo.value) {
    uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderInfo.value.orderId}` })
  }
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goShop() {
  uni.navigateTo({ url: '/pages/shop/shop' })
}
</script>

<style scoped>
.page {
  background: linear-gradient(to bottom, #4CAF50, #45a049);
  min-height: 100vh;
}

/* 成功头部 */
.success-header-bg {
  padding: 128rpx 32rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 对勾动画 */
.check-animation {
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.5s;
  margin-bottom: 48rpx;
}
.check-animation.visible { opacity: 1; transform: scale(1); }
.check-circle {
  position: relative;
  width: 192rpx;
  height: 192rpx;
}
.check-circle::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15);
}
.check-inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0);
  transition: all 0.7s 0.3s;
}
.check-inner.visible { opacity: 1; transform: scale(1); }
.check-icon { font-size: 128rpx; color: #4CAF50; font-weight: bold; }
.check-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 8rpx solid rgba(255,255,255,0.3);
  opacity: 1;
  transform: scale(1);
  transition: all 1s;
}
.check-ring.visible { transform: scale(1.5); opacity: 0; }

.success-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 24rpx;
  opacity: 0;
  transform: translateY(32rpx);
  transition: all 0.5s 0.2s;
}
.success-title.visible { opacity: 1; transform: translateY(0); }

.success-amount-area {
  text-align: center;
  opacity: 0;
  transform: translateY(32rpx);
  transition: all 0.5s 0.3s;
}
.success-amount-area.visible { opacity: 1; transform: translateY(0); }
.success-amount {
  font-size: 72rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
}
.success-pay-info { font-size: 26rpx; color: rgba(255,255,255,0.8); }

/* 白色卡片区域 */
.content-cards {
  background: #FAF8F5;
  border-radius: 48rpx 48rpx 0 0;
  min-height: 60vh;
  padding: 32rpx;
}

/* 订单信息卡片 */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  opacity: 0;
  transform: translateY(32rpx);
  transition: all 0.5s 0.4s;
}
.card.visible { opacity: 1; transform: translateY(0); }
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #E8E3DB;
}
.card-row.no-border { border-bottom: none; }
.card-label { font-size: 26rpx; color: #666; }
.card-value { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.card-value-row { display: flex; align-items: center; gap: 12rpx; }
.copy-btn { font-size: 24rpx; color: #C41E3A; }

/* 操作按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
  opacity: 0;
  transform: translateY(32rpx);
  transition: all 0.5s 0.5s;
}
.action-buttons.visible { opacity: 1; transform: translateY(0); }
.btn-primary-action {
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: #C41E3A;
  color: #fff;
  border-radius: 16rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
}
.btn-secondary-action {
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: #fff;
  border: 2rpx solid #E8E3DB;
  color: #2C2C2C;
  border-radius: 16rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
}
.action-icon { font-size: 36rpx; }

/* 推荐入口 */
.recommend-card {
  opacity: 0;
  transform: translateY(32rpx);
  transition: all 0.5s 0.6s;
}
.recommend-card.visible { opacity: 1; transform: translateY(0); }
.recommend-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 20rpx; }
.recommend-item {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.recommend-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #C41E3A, #e85a6b);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.recommend-icon { font-size: 36rpx; color: #fff; }
.recommend-info { flex: 1; }
.recommend-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  display: block;
  margin-bottom: 4rpx;
}
.recommend-desc { font-size: 24rpx; color: #999; }
.recommend-arrow { font-size: 40rpx; color: #999; }

.bottom-tip { margin-top: 64rpx; text-align: center; color: #999; font-size: 22rpx; }
.bottom-tip-sub { display: block; margin-top: 8rpx; }
</style>
