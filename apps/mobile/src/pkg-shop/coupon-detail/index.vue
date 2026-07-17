<template>
  <view class="cd-page">
    <!-- 导航 -->
    <app-nav-bar title="优惠券详情" />

    <view class="body">
      <!-- 加载中 -->
      <view v-if="loading" class="state-wrap">
        <AppLoading />
      </view>
      <!-- 错误 -->
      <view v-else-if="error" class="state-wrap">
        <app-icon name="alert-circle" :size="56" color="#E74C3C" />
        <text class="state-text">{{ error }}</text>
        <view class="retry-btn" hover-class="btn-hover" @tap="retry">
          <text class="retry-btn-text">重试</text>
        </view>
      </view>
      <!-- 券不存在/已失效 -->
      <view v-else-if="!coupon.id" class="state-wrap">
        <app-icon name="ticket" :size="56" color="#d1c9bb" />
        <text class="state-text">优惠券不存在或已失效</text>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 大卡片（面值/门槛/有效期，复用公共组件）-->
      <coupon-item mode="detail" :coupon="coupon" />

      <!-- 券码 -->
      <view class="code-card">
        <view class="code-info">
          <text class="code-label">优惠券代码</text>
          <text class="code-value">{{ coupon.id }}</text>
        </view>
        <view class="code-btn" @tap="copy">
          <app-icon :name="copied ? 'check-circle' : 'copy'" :size="30" color="#fff" />
          <text class="code-btn-text">{{ copied ? '已复制' : '复制' }}</text>
        </view>
      </view>

      <!-- 使用说明（后端无规则时诚实隐藏空壳）-->
      <view v-if="coupon.rules?.length" class="rules-card">
        <text class="rules-title">使用说明</text>
        <view class="rules">
          <view v-for="(r, i) in coupon.rules" :key="i" class="rule">
            <text class="rule-dot">•</text>
            <text class="rule-text">{{ r }}</text>
          </view>
        </view>
      </view>

      <!-- 适用商品（后端无适用清单时诚实隐藏空壳）-->
      <view v-if="coupon.applicableItems?.length" class="apply-card">
        <view class="apply-head">
          <text class="apply-title">适用商品/课程</text>
        </view>
        <view
          v-for="item in coupon.applicableItems"
          :key="item.id"
          class="apply-item"
          hover-class="item-hover"
          @tap="goItem(item)"
        >
          <image lazy-load class="apply-img" :src="item.image" mode="aspectFill" />
          <view class="apply-info">
            <view class="apply-type">
              <app-icon :name="item.type === 'product' ? 'shopping-bag' : 'book-open'" :size="24" :color="item.type === 'product' ? '#999' : '#c9a96e'" />
              <text class="apply-type-text">{{ item.type === 'product' ? '商品' : '课程' }}</text>
            </view>
            <text class="apply-name">{{ item.name }}</text>
            <text class="apply-price">￥{{ formatPrice(item.price) }}</text>
          </view>
        </view>
      </view>

      <!-- 立即使用 -->
      <view class="use-btn" hover-class="btn-hover" @tap="goUse">
        <text class="use-btn-text">立即使用</text>
      </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo } from '@/utils/router'
import CouponItem from '@/components/shop/coupon-item.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { shopApi, type CouponApplicableItem } from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

const couponId = ref('')
// 优惠券详情对象：{} 初值 + 模板 v-else 块裸访问 coupon.value/minAmount 等，收敛触发大量 possibly-undefined，保留 any
const coupon = ref<any>({})
const copied = ref(false)
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

onLoad((q) => {
  if (q?.id) couponId.value = q.id as string
})

onMounted(async () => {
  if (!couponId.value) { error.value = '缺少优惠券信息'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    coupon.value = await shopApi.getCouponDetail(couponId.value)
  } catch (_e) {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
})

function retry() {
  loading.value = true
  error.value = ''
  shopApi.getCouponDetail(couponId.value).then((data) => {
    coupon.value = data
  }).catch(() => {
    error.value = '加载失败，请重试'
  }).finally(() => {
    loading.value = false
  })
}

function copy() {
  uni.setClipboardData({
    data: coupon.value.id,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}
function goItem(item: CouponApplicableItem) {
  if (item.type === 'product') {
    navigateTo(`/mall/product/${item.id}`)
  } else {
    navigateTo(`/courses/${item.id}`)
  }
}
function goUse() {
  if (submitting.value) return
  submitting.value = true
  navigateTo('/mall')
  setTimeout(() => (submitting.value = false), 500)
}
</script>

<style lang="scss" scoped>
.cd-page {
  min-height: 100vh;
  background: #faf8f5;
}
.body {
  padding: 24rpx;
}
/* 大卡片样式已抽到 @/components/shop/coupon-item.vue（detail 模式）*/
.code-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.code-label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 12rpx;
  display: block;
}
.code-value {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
  font-family: monospace;
}
.code-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  background: var(--brand);
  border-radius: 12rpx;
}
.code-btn-text {
  font-size: 26rpx;
  color: #fff;
}
.rules-card,
.apply-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.rules-title,
.apply-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.rules {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.rule {
  display: flex;
  gap: 16rpx;
}
.rule-dot {
  color: var(--brand);
  font-weight: 700;
  flex-shrink: 0;
}
.rule-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}
.apply-card {
  padding: 0;
  overflow: hidden;
}
.apply-head {
  padding: 24rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.apply-item {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0ece2;
}
.apply-item:last-child {
  border-bottom: none;
}
.item-hover {
  background: #f5f5f5;
}
.apply-img {
  width: 112rpx;
  height: 112rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0ece2;
}
.apply-info {
  flex: 1;
  min-width: 0;
}
.apply-type {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 6rpx;
}
.apply-type-text {
  font-size: 22rpx;
  color: #999;
}
.apply-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  margin-bottom: 8rpx;
  display: block;
}
.apply-price {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--brand);
}
.use-btn {
  padding: 28rpx 0;
  background: linear-gradient(90deg, var(--brand), #e74c57);
  border-radius: 24rpx;
  text-align: center;
  margin-bottom: 32rpx;
}
.use-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.btn-hover {
  opacity: 0.9;
}

/* 加载/错误状态 */
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
}
.state-text {
  font-size: 28rpx;
  color: #999;
}
.retry-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.retry-btn-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
