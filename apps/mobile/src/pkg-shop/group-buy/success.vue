<template>
  <view class="gs-page">
    <!-- 加载中 -->
    <view v-if="loading" class="state-box">
      <AppLoading />
    </view>
    <!-- 加载失败 -->
    <view v-else-if="error" class="state-box">
      <view class="state-icon">
        <app-icon name="alert-circle" :size="72" color="#b8ab94" />
      </view>
      <text class="state-text">{{ error }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新核对拼团结果" @tap="retryLoad" @keydown.enter="retryLoad" @keydown.space.prevent="retryLoad">
        <text class="state-retry-text">重试</text>
      </view>
      <view class="state-retry" role="button" tabindex="0" aria-label="返回上一页" @tap="onBack" @keydown.enter="onBack" @keydown.space.prevent="onBack">
        <text class="state-retry-text">返回</text>
      </view>
    </view>
    <template v-else-if="data">
      <!-- 成功头部 -->
      <view class="header">
        <view class="gs-nav">
          <view class="gs-nav-back" hover-class="nav-hover" @tap="onBack">
            <app-icon name="chevron-left" :size="40" color="#fff" />
          </view>
          <text class="gs-nav-title">拼团结果</text>
        </view>
        <view class="success-icon">
          <app-icon name="check-circle" :size="96" color="#22c55e" />
        </view>
        <text class="header-title">拼团成功</text>
        <text class="header-sub">恭喜您，已成功拼团！</text>
      </view>

      <view class="content">
      <!-- 商品卡片 -->
      <view class="card">
        <view class="prod">
          <smart-cover class="prod-cover" :src="data.productCover" :title="data.productName" type="product" deco :deco-size="44" />
          <view class="prod-info">
            <text class="prod-name">{{ data.productName }}</text>
            <view class="prod-price">
              <text class="price-now">¥{{ formatPrice(data.price) }}</text>
              <text v-if="data.originalPrice != null" class="price-old">¥{{ formatPrice(data.originalPrice) }}</text>
              <text v-if="data.savedAmount != null" class="save-tag">省¥{{ formatPrice(data.savedAmount) }}</text>
            </view>
          </view>
        </view>
        <view class="row">
          <text class="row-label">成团成员</text>
          <view class="members">
            <smart-avatar
              v-for="(m, i) in data.members"
              :key="i"
              class="member-avatar"
              :src="m.avatar"
            />
            <text class="member-count">共{{ data.members.length }}人</text>
          </view>
        </view>
        <view v-if="data.paidAt" class="row row--sub">
          <text class="row-label">付款时间</text>
          <text class="row-value">{{ data.paidAt }}</text>
        </view>
        <view v-if="data.orderId" class="row row--sub">
          <text class="row-label">订单编号</text>
          <view class="order-id">
            <text class="row-value">{{ data.orderId }}</text>
            <view class="copy-btn" @tap="copy(data.orderId)">
              <app-icon :name="copied ? 'check' : 'copy'" :size="28" color="#c41e3a" />
            </view>
          </view>
        </view>
      </view>

      <!-- 发货状态以订单页为准，不承诺接口未提供的时限。 -->
      <view class="ship-card">
        <view class="ship-icon">
          <app-icon name="package" :size="36" color="#4a90d9" />
        </view>
        <view class="ship-info">
          <text class="ship-title">发货进度</text>
          <text class="ship-sub">以订单详情中的最新状态为准</text>
        </view>
      </view>

      <!-- 操作 -->
      <view class="actions">
        <view v-if="data.orderId" class="btn-primary" role="link" tabindex="0" aria-label="查看拼团订单" hover-class="btn-hover" @tap="viewOrder" @keydown.enter="viewOrder" @keydown.space.prevent="viewOrder">
          <text class="btn-primary-text">查看订单</text>
          <app-icon name="chevron-right" :size="28" color="#fff" />
        </view>
        <view v-else class="order-pending">订单信息待同步，请稍后在订单中心核对</view>
        <view class="btn-ghost" role="link" tabindex="0" aria-label="返回商城" hover-class="btn-hover" @tap="goShop" @keydown.enter="goShop" @keydown.space.prevent="goShop">
          <text class="btn-ghost-text">继续逛逛</text>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { reLaunch } from '@/utils/router'
import SmartCover from '@/components/common/smart-cover.vue'
import AppLoading from '@/components/common/app-loading.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { shopApi } from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

interface GroupBuySuccessData {
  productCover: string
  productName: string
  price: number
  originalPrice: number | null
  savedAmount: number | null
  members: { avatar: string }[]
  paidAt: string
  orderId: string
}

const data = ref<GroupBuySuccessData | null>(null)
const loading = ref(true)
const error = ref('')
const copied = ref(false)

let pageId = ''
onLoad((q) => {
  if (q && q.id) pageId = String(q.id)
})
onMounted(async () => {
  try {
    data.value = await shopApi.getGroupBuySuccess(pageId || 'default')
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
})

function copy(text: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}
function viewOrder() {
  if (!data.value) return
  reLaunch(`/orders/${data.value.orderId}?paymentReturn=1`)
}
function goShop() {
  reLaunch('/mall')
}
function onBack() {
  reLaunch('/mall')
}
async function retryLoad() {
  loading.value = true
  error.value = ''
  try {
    data.value = await shopApi.getGroupBuySuccess(pageId || 'default')
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.gs-page {
  min-height: 100vh;
  background: #faf8f5;
}
.header {
  background: linear-gradient(to bottom right, #22c55e, #16a34a);
  padding: 0 32rpx 192rpx;
  text-align: center;
}
.gs-nav {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 88rpx;
  padding-top: var(--status-bar-height, 0px);
  text-align: left;
}
.gs-nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gs-nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}
.nav-hover {
  opacity: 0.6;
}
.success-icon {
  width: 160rpx;
  height: 160rpx;
  margin: 48rpx auto 32rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.15);
}
.header-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  margin-bottom: 16rpx;
}
.header-sub {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
.content {
  padding: 0 32rpx 64rpx;
  margin-top: -128rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.prod {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
}
.prod-cover {
  width: 144rpx;
  height: 144rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f0ece2;
}
.prod-info {
  flex: 1;
  min-width: 0;
}
.prod-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  margin-bottom: 16rpx;
  display: block;
}
.prod-price {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.price-now {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--brand);
}
.price-old {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}
.save-tag {
  padding: 2rpx 10rpx;
  background: #fff3e0;
  color: #e8830c;
  font-size: 20rpx;
  border-radius: 6rpx;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-top: 1rpx solid #efe8da;
}
.row--sub {
  padding: 16rpx 24rpx;
  background: rgba(250, 248, 245, 0.5);
}
.row-label {
  font-size: 26rpx;
  color: #999;
}
.row-value {
  font-size: 26rpx;
  color: #666;
}
.members {
  display: flex;
  align-items: center;
}
.member-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-left: -12rpx;
  background: #f0ece2;
}
.member-avatar:first-child {
  margin-left: 0;
}
.member-count {
  font-size: 26rpx;
  color: #666;
  margin-left: 16rpx;
}
.order-id {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.copy-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ship-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}
.ship-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #eaf2fb;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ship-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  display: block;
}
.ship-sub {
  font-size: 24rpx;
  color: #666;
  margin-top: 4rpx;
  display: block;
}
.order-pending { color: #666; font-size: 26rpx; text-align: center; line-height: 1.5; }
.actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 28rpx 0;
  background: var(--brand);
  border-radius: 20rpx;
}
.btn-primary-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.btn-ghost {
  padding: 28rpx 0;
  background: #fff;
  border: 1rpx solid #e8e3db;
  border-radius: 20rpx;
  text-align: center;
}
.btn-ghost-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #666;
}
.btn-hover {
  opacity: 0.85;
}

/* 三态UI */
.state-box {
  padding: 96rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.state-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0ece2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.state-text {
  font-size: 26rpx;
  color: #b8ab94;
}
.state-retry {
  padding: 12rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.state-retry-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
