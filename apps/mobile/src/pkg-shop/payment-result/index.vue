<template>
  <view class="page">
    <app-nav-bar :title="navTitle" />

    <view class="content">
      <!-- 状态区 -->
      <view class="status-block">
        <view class="status-icon" :class="isSuccess ? 'status-icon--success' : 'status-icon--fail'">
          <app-icon :name="isSuccess ? 'check-circle' : 'x-circle'" :size="56" color="#ffffff" />
        </view>
        <text class="status-title">{{ isSuccess ? '支付成功' : '支付失败' }}</text>
        <text class="status-desc">{{ statusDesc }}</text>
      </view>

      <!-- 订单信息卡 -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">订单金额</text>
          <text class="info-amount">¥{{ amount }}</text>
        </view>
        <view class="info-divider" />
        <view class="info-row">
          <text class="info-label">订单编号</text>
          <text class="info-value">{{ orderId }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">支付方式</text>
          <text class="info-value">微信支付</text>
        </view>
        <view class="info-row">
          <text class="info-label">支付时间</text>
          <text class="info-value">{{ payTime }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="actions">
        <template v-if="isSuccess">
          <button class="btn btn--primary" @click="goOrderDetail">查看订单</button>
          <button class="btn btn--ghost" @click="goHome">返回首页</button>
        </template>
        <template v-else>
          <button class="btn btn--primary" @click="retryPay">重新支付</button>
          <button class="btn btn--ghost" @click="goOrders">查看订单</button>
        </template>
      </view>

      <!-- 成功推荐 -->
      <view v-if="isSuccess" class="recommend">
        <view class="recommend-head">
          <text class="recommend-title">为你推荐</text>
          <view class="recommend-more" @click="goMall">
            <text class="recommend-more-text">更多</text>
            <app-icon name="chevron-right" :size="14" color="#999999" />
          </view>
        </view>
        <view class="recommend-grid">
          <view
            v-for="item in recommends"
            :key="item.id"
            class="rec-card"
            @click="goProduct(item.id)"
          >
            <image lazy-load class="rec-img" :src="item.image" mode="aspectFill" />
            <text class="rec-name">{{ item.name }}</text>
            <text class="rec-price">¥{{ item.price }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'

const status = ref<'success' | 'fail'>('success')
const orderId = ref('OD202606200001')
const amount = ref('0.00')
const reason = ref('')

const isSuccess = computed(() => status.value === 'success')
const navTitle = computed(() => (isSuccess.value ? '支付成功' : '支付失败'))
const statusDesc = computed(() =>
  isSuccess.value ? '您的订单已支付成功，我们会尽快为您处理' : reason.value || '支付未完成，请重新尝试',
)

const payTime = ref('2026-06-20 14:30:25')
const submitting = ref(false)
const loadingRecommend = ref(false)

const recommends = ref<Array<{ id: string; name: string; price: string; image: string }>>([])

onLoad((options) => {
  if (options?.status) status.value = options.status === 'fail' ? 'fail' : 'success'
  if (options?.orderId) orderId.value = options.orderId
  if (options?.amount) amount.value = options.amount
  if (options?.reason) reason.value = decodeURIComponent(options.reason)
})

async function fetchRecommends() {
  loadingRecommend.value = true
  try {
    const data = await shopApi.getMallHome()
    recommends.value = (data.products || []).slice(0, 2).map((p: any) => ({
      id: String(p.id),
      name: p.title || p.name || '',
      price: String(p.price),
      image: p.cover || p.image || '/static/placeholder.png',
    }))
  } catch {
    // 推荐加载失败不影响主流程
  } finally {
    loadingRecommend.value = false
  }
}

onMounted(() => { fetchRecommends() })

function goOrderDetail() {
  navigateTo(`/orders/${orderId.value}`)
}
function goOrders() {
  navigateTo('/orders')
}
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
function retryPay() {
  if (submitting.value) return
  submitting.value = true
  goBack()
  setTimeout(() => { submitting.value = false }, 500)
}
function goMall() {
  navigateTo('/mall')
}
function goProduct(id: string) {
  navigateTo(`/mall/product/${id}`)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
}
.content {
  padding: 0 32rpx 48rpx;
}

/* 状态区 */
.status-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0 48rpx;
}
.status-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}
.status-icon--success {
  background-color: #34c759;
}
.status-icon--fail {
  background-color: #ff3b30;
}
.status-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}
.status-desc {
  font-size: 26rpx;
  color: #999999;
  text-align: center;
  line-height: 1.5;
  padding: 0 40rpx;
}

/* 订单信息卡 */
.info-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.info-label {
  font-size: 28rpx;
  color: #999999;
}
.info-value {
  font-size: 28rpx;
  color: #1a1a1a;
}
.info-amount {
  font-size: 40rpx;
  font-weight: 700;
  color: #ff3b30;
}
.info-divider {
  height: 1rpx;
  background-color: #f0f0f0;
  margin: 8rpx 0;
}

/* 操作按钮 */
.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.btn {
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}
.btn::after {
  border: none;
}
.btn--primary {
  background-color: #c4302b;
  color: #ffffff;
}
.btn--ghost {
  background-color: #ffffff;
  color: #1a1a1a;
  border: 1rpx solid #e0e0e0;
}

/* 推荐 */
.recommend {
  margin-top: 8rpx;
}
.recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.recommend-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.recommend-more {
  display: flex;
  align-items: center;
}
.recommend-more-text {
  font-size: 24rpx;
  color: #999999;
}
.recommend-grid {
  display: flex;
  gap: 24rpx;
}
.rec-card {
  flex: 1;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 16rpx;
  display: flex;
  flex-direction: column;
}
.rec-img {
  width: 100%;
  height: 280rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
  margin-bottom: 16rpx;
}
.rec-name {
  font-size: 26rpx;
  color: #1a1a1a;
  line-height: 1.4;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #ff3b30;
}
</style>
