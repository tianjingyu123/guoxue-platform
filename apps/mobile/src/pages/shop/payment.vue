<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">{{ isSuccess ? '支付成功' : '支付失败' }}</text>
      <view class="nav-placeholder" />
    </view>

    <view class="main-content">
      <!-- 结果状态 -->
      <view class="status-area" :class="{ visible: showContent }">
        <!-- 状态图标 -->
        <view
          class="status-icon-wrap"
          :class="isSuccess ? 'success' : 'fail'"
        >
          <text class="status-icon">{{ isSuccess ? '✓' : '✕' }}</text>
        </view>

        <!-- 状态文字 -->
        <text
          class="status-title"
          :class="isSuccess ? 'success' : 'fail'"
        >
          {{ isSuccess ? '支付成功' : '支付失败' }}
        </text>

        <!-- 金额/失败原因 -->
        <view
          v-if="isSuccess"
          class="status-amount-area"
        >
          <text class="status-amount">¥{{ amount }}</text>
          <text class="status-order-id">订单号：{{ orderId }}</text>
        </view>
        <view
          v-else
          class="status-fail-area"
        >
          <text class="status-fail-reason">{{ reason }}</text>
          <text class="status-order-id">订单号：{{ orderId }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons" :class="{ visible: showContent }">
        <template v-if="isSuccess">
          <view class="btn-primary-action" @click="goOrderDetail">
            <text>查看订单</text>
          </view>
          <view class="btn-secondary-action" @click="goHome">
            <text>继续逛逛</text>
          </view>
        </template>
        <template v-else>
          <view class="btn-primary-action" @click="retryPay">
            <text>重新支付</text>
          </view>
          <view class="btn-secondary-action" @click="changePayment">
            <text>更换支付方式</text>
          </view>
        </template>
      </view>

      <!-- 订单详情（成功） -->
      <view
        v-if="isSuccess"
        class="order-card-area"
        :class="{ visible: showContent }"
      >
        <view class="order-card">
          <view class="oc-left">
            <view class="oc-icon-wrap">
              <text class="oc-icon">🛒</text>
            </view>
            <view class="oc-info">
              <text class="oc-status">订单已提交</text>
              <text class="oc-hint">预计3-5个工作日内发货</text>
            </view>
          </view>
          <view
            class="oc-detail"
            @click="goOrderDetail"
          >
            <text>详情</text>
            <text class="oc-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 推荐区 -->
      <view class="recommend-area" :class="{ visible: showContent }">
        <view class="recommend-header">
          <text class="recommend-title">
            {{ isSuccess ? '购买了此商品的人也买了' : '热门内容推荐' }}
          </text>
          <view class="recommend-more" @click="goDiscover">
            <text>更多</text>
            <text class="more-arrow">›</text>
          </view>
        </view>

        <view class="recommend-grid">
          <view
            v-for="item in recommendations"
            :key="item.id"
            class="recommend-item"
            @click="goRecommend(item)"
          >
            <view class="ri-image">
              <text class="ri-placeholder">{{ item.type === 'course' ? '📺' : '📦' }}</text>
              <view
                class="ri-badge"
                :class="item.type === 'course' ? 'badge-course' : 'badge-product'"
              >
                <text>{{ item.type === 'course' ? '课程' : '商品' }}</text>
              </view>
            </view>
            <view class="ri-info">
              <text class="ri-name">{{ item.title }}</text>
              <view class="ri-price-row">
                <text class="ri-price">¥{{ item.price }}</text>
                <text class="ri-original">¥{{ item.originalPrice }}</text>
              </view>
              <text class="ri-sales">{{ item.sales }}人已购</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部 -->
      <view class="bottom-tip">
        <text>如有疑问请联系客服：400-888-8888</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface RecommendItem {
  id: number
  type: 'course' | 'product'
  title: string
  price: number
  originalPrice: number
  image: string
  sales: number
}

const recommendations: RecommendItem[] = [
  { id: 1, type: 'course', title: '六爻预测实战班', price: 299, originalPrice: 599, image: '', sales: 1280 },
  { id: 2, type: 'product', title: '开光貔貅手链', price: 168, originalPrice: 268, image: '', sales: 856 },
  { id: 3, type: 'course', title: '风水布局入门', price: 99, originalPrice: 199, image: '', sales: 2100 },
  { id: 4, type: 'product', title: '紫檀木手串', price: 388, originalPrice: 588, image: '', sales: 432 },
]

const showContent = ref(false)
const isSuccess = ref(true)
const orderId = ref('RB20240315001234')
const amount = ref('299.00')
const reason = ref('余额不足')

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const options = page?.options || {}

  isSuccess.value = options.status !== 'fail'
  orderId.value = options.orderId || 'RB20240315001234'
  amount.value = options.amount || '0.00'
  reason.value = options.reason || '余额不足'

  // 延迟动画
  setTimeout(() => { showContent.value = true }, 200)
})

function goBack() {
  uni.navigateBack()
}

function goOrderDetail() {
  uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderId.value}` })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function retryPay() {
  uni.navigateBack()
}

function changePayment() {
  uni.navigateBack({ delta: 2 })
}

function goDiscover() {
  uni.navigateTo({ url: '/pages/discover/discover' })
}

function goRecommend(item: RecommendItem) {
  if (item.type === 'course') {
    uni.navigateTo({ url: `/pages/course/detail?id=${item.id}` })
  } else {
    uni.navigateTo({ url: `/pages/shop/product-detail?id=${item.id}` })
  }
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
  border-bottom: 1rpx solid $border;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-back { width: 80rpx; }
.nav-back-icon { font-size: 48rpx; color: $text; font-weight: 300; }
.nav-title { font-size: 32rpx; font-weight: bold; color: $text; }
.nav-placeholder { width: 80rpx; }

.main-content { padding-bottom: 60rpx; }

/* 状态区域 */
.status-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 32rpx 40rpx;
  opacity: 0;
  transform: translateY(20rpx);
  transition: all 0.5s;
}
.status-area.visible { opacity: 1; transform: translateY(0); }

.status-icon-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.status-icon-wrap.success { background: #e8f5e9; }
.status-icon-wrap.fail { background: #fef0f0; }
.status-icon { font-size: 80rpx; font-weight: bold; }
.status-icon-wrap.success .status-icon { color: #4CAF50; }
.status-icon-wrap.fail .status-icon { color: $primary; }

.status-title { font-size: 36rpx; font-weight: bold; margin-bottom: 16rpx; }
.status-title.success { color: #4CAF50; }
.status-title.fail { color: $primary; }

.status-amount-area { text-align: center; }
.status-amount { font-size: 56rpx; font-weight: bold; color: $text; display: block; }
.status-order-id { font-size: 24rpx; color: $text-tertiary; margin-top: 8rpx; display: block; }
.status-fail-reason { font-size: 26rpx; color: $text-tertiary; display: block; }

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 20rpx;
  padding: 0 32rpx;
  opacity: 0;
  transform: translateY(20rpx);
  transition: all 0.5s 0.15s;
}
.action-buttons.visible { opacity: 1; transform: translateY(0); }
.btn-primary-action, .btn-secondary-action {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 500;
}
.btn-primary-action {
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
}
.btn-secondary-action {
  background: #fff;
  border: 2rpx solid $border;
  color: $text;
}
.btn-primary-action:active, .btn-secondary-action:active { opacity: 0.8; }

/* 订单卡片 */
.order-card-area {
  padding: 0 32rpx;
  margin-top: 24rpx;
  opacity: 0;
  transform: translateY(20rpx);
  transition: all 0.5s 0.25s;
}
.order-card-area.visible { opacity: 1; transform: translateY(0); }
.order-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.oc-left { display: flex; align-items: center; gap: 16rpx; }
.oc-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  background: $bg;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.oc-icon { font-size: 36rpx; }
.oc-status { font-size: 26rpx; font-weight: 500; color: $text; display: block; }
.oc-hint { font-size: 22rpx; color: $text-tertiary; margin-top: 4rpx; display: block; }
.oc-detail { display: flex; align-items: center; gap: 4rpx; color: $gold; font-size: 24rpx; }
.oc-arrow { font-size: 28rpx; }

/* 推荐区 */
.recommend-area {
  padding: 0 32rpx;
  margin-top: 48rpx;
  opacity: 0;
  transform: translateY(20rpx);
  transition: all 0.5s 0.35s;
}
.recommend-area.visible { opacity: 1; transform: translateY(0); }
.recommend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.recommend-title { font-size: 28rpx; font-weight: bold; color: $text; }
.recommend-more { display: flex; align-items: center; gap: 4rpx; font-size: 24rpx; color: $gold; }
.more-arrow { font-size: 28rpx; }

.recommend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.recommend-item {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.recommend-item:active { opacity: 0.8; }
.ri-image {
  aspect-ratio: 4/3;
  background: $bg;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.ri-placeholder { font-size: 64rpx; }
.ri-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 12rpx;
  color: #fff;
}
.badge-course { background: rgba($primary, 0.9); }
.badge-product { background: rgba($gold, 0.9); }
.ri-info { padding: 16rpx; }
.ri-name { font-size: 24rpx; font-weight: 500; color: $text; display: block; }
.ri-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 8rpx; }
.ri-price { font-size: 28rpx; font-weight: bold; color: $primary; }
.ri-original { font-size: 20rpx; color: $text-tertiary; text-decoration: line-through; }
.ri-sales { font-size: 20rpx; color: $text-tertiary; margin-top: 4rpx; display: block; }

/* 底部 */
.bottom-tip {
  text-align: center;
  padding: 64rpx 32rpx;
  font-size: 22rpx;
  color: $text-tertiary;
}
</style>
