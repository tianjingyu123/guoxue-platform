<template>
  <view class="cd-page">
    <!-- 导航 -->
    <view class="navbar">
      <view
        class="nav-back"
        hover-class="nav-hover"
        @tap="goBack"
      >
        <app-icon
          name="chevron-left"
          :size="44"
          color="#2c2c2c"
        />
      </view>
      <text class="nav-title">
        优惠券详情
      </text>
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="loading"
      class="body"
    >
      <view class="sk-big-card">
        <view class="sk-bc-val" /><view class="sk-bc-right">
          <view class="sk-line sk-w6" /><view class="sk-line sk-w4" />
        </view>
      </view>
      <view class="sk-card">
        <view class="sk-line sk-w3" /><view class="sk-line sk-w8" />
      </view>
      <view class="sk-card">
        <view class="sk-line sk-w4" />
        <view
          v-for="i in 4"
          :key="i"
          class="sk-rule"
        >
          <view class="sk-dot" /><view class="sk-line sk-w8" />
        </view>
      </view>
      <view class="sk-card">
        <view class="sk-line sk-w4" />
        <view
          v-for="i in 3"
          :key="i"
          class="sk-item"
        >
          <view class="sk-img" /><view class="sk-info">
            <view class="sk-line" /><view class="sk-line sk-w6" />
          </view>
        </view>
      </view>
    </view>

    <error-state
      v-else-if="error"
      :message="error"
      @retry="loadCoupon(coupon.id)"
    />

    <view
      v-else-if="!coupon.id"
      class="empty-body"
    >
      <view class="empty-icon">
        <app-icon
          name="ticket"
          :size="80"
          color="#CCCCCC"
        />
      </view>
      <text class="empty-text">
        优惠券不存在或已过期
      </text>
      <view
        class="empty-btn"
        @tap="goBack"
      >
        <text class="empty-btn-text">
          返回
        </text>
      </view>
    </view>

    <view
      v-else
      class="body"
    >
      <!-- 大卡片 -->
      <view class="big-card">
        <view class="bc-head">
          <view class="bc-value">
            <text class="bc-num">
              {{ coupon.value }}
            </text>
            <text class="bc-unit">
              元
            </text>
          </view>
          <view class="bc-right">
            <text class="bc-min">
              满{{ coupon.minAmount }}元可用
            </text>
            <text class="bc-expire">
              至 {{ coupon.expireAt }}
            </text>
          </view>
        </view>
        <view class="bc-divider" />
        <text class="bc-desc">
          {{ coupon.description }}
        </text>
      </view>

      <!-- 券码 -->
      <view class="code-card">
        <view class="code-info">
          <text class="code-label">
            优惠券代码
          </text>
          <text class="code-value">
            {{ coupon.id }}
          </text>
        </view>
        <view
          class="code-btn"
          @tap="copy"
        >
          <app-icon
            :name="copied ? 'check-circle' : 'copy'"
            :size="30"
            color="#fff"
          />
          <text class="code-btn-text">
            {{ copied ? '已复制' : '复制' }}
          </text>
        </view>
      </view>

      <!-- 使用说明 -->
      <view class="rules-card">
        <text class="rules-title">
          使用说明
        </text>
        <view class="rules">
          <view
            v-for="(r, i) in coupon.rules"
            :key="i"
            class="rule"
          >
            <text class="rule-dot">
              •
            </text>
            <text class="rule-text">
              {{ r }}
            </text>
          </view>
        </view>
      </view>

      <!-- 适用商品 -->
      <view class="apply-card">
        <view class="apply-head">
          <text class="apply-title">
            适用商品/课程
          </text>
        </view>
        <view
          v-for="item in coupon.applicableItems"
          :key="item.id"
          class="apply-item"
          hover-class="item-hover"
          @tap="goItem(item)"
        >
          <image
            class="apply-img"
            :src="item.image"
            mode="aspectFill"
          />
          <view class="apply-info">
            <view class="apply-type">
              <app-icon
                :name="item.type === 'product' ? 'shopping-bag' : 'book-open'"
                :size="24"
                :color="item.type === 'product' ? '#999' : '#c9a96e'"
              />
              <text class="apply-type-text">
                {{ item.type === 'product' ? '商品' : '课程' }}
              </text>
            </view>
            <text class="apply-name">
              {{ item.name }}
            </text>
            <text class="apply-price">
              ￥{{ item.price }}
            </text>
          </view>
        </view>
      </view>

      <!-- 立即使用 -->
      <view
        class="use-btn"
        hover-class="btn-hover"
        @tap="goUse"
      >
        <text class="use-btn-text">
          立即使用
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'
import { shopApi, type CouponApplicableItem } from '@/lib/shop-data'

const coupon = ref<any>({})
const loading = ref(true)
const error = ref('')
const copied = ref(false)

async function loadCoupon(id: string) {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getCouponDetail(id)
    coupon.value = (res as any) || {}
  } catch (e: any) { error.value = e?.message || '加载失败' } finally { loading.value = false }
}

onLoad((q: any) => {
  loadCoupon(q?.id || '1')
})

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
  navigateTo('/shop')
}
</script>

<style lang="scss" scoped>
.cd-page {
  min-height: 100vh;
  background: #faf8f5;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.5;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.body {
  padding: 24rpx;
}
.big-card {
  background: linear-gradient(90deg, #c41e3a, #e74c57);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.2);
}
.bc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.bc-value {
  display: flex;
  flex-direction: column;
}
.bc-num {
  font-size: 72rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}
.bc-unit {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
}
.bc-right {
  text-align: right;
}
.bc-min {
  font-size: 26rpx;
  color: #fff;
  display: block;
}
.bc-expire {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
  display: block;
}
.bc-divider {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.3);
  margin: 24rpx 0;
}
.bc-desc {
  font-size: 26rpx;
  color: #fff;
}
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
  background: #c41e3a;
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
  color: #c41e3a;
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
  color: #c41e3a;
}
.use-btn {
  padding: 28rpx 0;
  background: linear-gradient(90deg, #c41e3a, #e74c57);
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

/* 骨架屏 */
.sk-big-card { background: #e8e0d5; border-radius: 24rpx; padding: 48rpx; margin-bottom: 24rpx; display: flex; justify-content: space-between; }
.sk-bc-val { width: 120rpx; height: 80rpx; background: #d5cbb8; border-radius: 12rpx; }
.sk-bc-right { display: flex; flex-direction: column; gap: 16rpx; align-items: flex-end; }
.sk-card { background: #fff; border-radius: 24rpx; padding: 24rpx; margin-bottom: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-rule { display: flex; gap: 12rpx; align-items: center; }
.sk-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #e8e0d5; flex-shrink: 0; }
.sk-item { display: flex; gap: 16rpx; }
.sk-item .sk-img { width: 112rpx; height: 112rpx; border-radius: 12rpx; background: #e8e0d5; flex-shrink: 0; }
.sk-info { flex: 1; display: flex; flex-direction: column; gap: 12rpx; justify-content: center; }

.sk-line { height: 24rpx; background: #e8e0d5; border-radius: 8rpx; }
.sk-w3 { width: 30%; }
.sk-w4 { width: 40%; }
.sk-w6 { width: 60%; }
.sk-w8 { width: 80%; }
.sk-img { background: #e8e0d5; border-radius: 12rpx; }

/* 空态 */
.empty-body { display: flex; flex-direction: column; align-items: center; padding: 128rpx 48rpx; }
.empty-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-text { font-size: 28rpx; color: #CCCCCC; margin-bottom: 32rpx; }
.empty-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.empty-btn-text { font-size: 28rpx; color: #fff; }
</style>
