<template>
  <view class="flash-page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-back" hover-class="nav-hover" @tap="goBack">
        <app-icon name="chevron-left" :size="40" color="#fff" />
      </view>
      <view class="nav-title-wrap">
        <app-icon name="zap" :size="36" color="#ffe066" />
        <text class="nav-title">限时秒杀</text>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="loading-zone">
      <view class="sk-slots" />
      <view class="sk-cd" />
      <view class="sk-grid-flash">
        <view v-for="i in 4" :key="i" class="sk-card" />
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error-zone">
      <text class="error-text">{{ error }}</text>
      <view class="error-retry" @tap="fetchFlashSaleData()"><text>重试</text></view>
    </view>

    <!-- 空态：当前无进行中秒杀 -->
    <view v-else-if="!data || !data.products || !data.products.length" class="error-zone">
      <app-icon name="zap" :size="72" color="rgba(255,255,255,0.6)" />
      <text class="error-text">当前暂无进行中的秒杀场次</text>
    </view>

    <template v-else>
    <!-- 时段切换 -->
    <scroll-view scroll-x class="slots">
      <view class="slots-row">
        <view
          v-for="slot in data.timeSlots"
          :key="slot.id"
          class="slot"
          :class="{ 'slot--on': activeSlot === slot.id }"
          @tap="activeSlot = slot.id"
        >
          <text class="slot-time" :class="{ 'slot-time--on': activeSlot === slot.id }">{{ slot.label }}</text>
          <text class="slot-state" :class="{ 'slot-state--on': activeSlot === slot.id }">{{ slotState(slot.id) }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 倒计时区 -->
    <view class="countdown-box">
      <view v-if="showNotice" class="notice">
        <app-icon name="volume-2" :size="28" color="#ffe066" />
        <view class="notice-scroll">
          <text class="notice-text">{{ noticeText }}</text>
        </view>
        <text class="notice-close" @tap="showNotice = false">关闭</text>
      </view>
      <view class="cd-row">
        <view class="cd-label">
          <app-icon name="flame" :size="36" color="#ff8c42" />
          <text class="cd-label-text">距离结束还剩</text>
        </view>
        <view class="cd-timer">
          <text class="cd-num">{{ cd.h }}</text>
          <text class="cd-sep">:</text>
          <text class="cd-num">{{ cd.m }}</text>
          <text class="cd-sep">:</text>
          <text class="cd-num">{{ cd.s }}</text>
        </view>
      </view>
    </view>

    <!-- 商品区 -->
    <view class="products">
      <view class="grid">
        <view
          v-for="p in data.products"
          :key="p.id"
          class="card"
          hover-class="card-hover"
          @tap="goDetail(p.id)"
        >
          <view class="card-img-wrap">
            <image lazy-load class="card-img" :src="p.cover" mode="aspectFill" />
            <view v-if="progress(p) >= 80" class="badge-soon">即将售罄</view>
            <view class="badge-flash">
              <app-icon name="zap" :size="20" color="#fff" />
              <text class="badge-flash-text">秒杀</text>
            </view>
          </view>
          <text class="card-name">{{ p.name }}</text>
          <view class="card-price">
            <text class="price-now">¥{{ p.price }}</text>
            <text class="price-old">¥{{ p.originalPrice }}</text>
          </view>
          <view class="progress">
            <view class="progress-bar" :style="{ width: progress(p) + '%' }" />
            <text class="progress-text">已抢{{ progress(p) }}%</text>
          </view>
          <view
            class="rush-btn"
            :class="{ 'rush-btn--done': progress(p) >= 100, 'rush-btn--ing': rushingId === p.id }"
            @tap.stop="rush(p.id)"
          >
            <text v-if="rushingId === p.id" class="rush-text">抢购中...</text>
            <text v-else-if="progress(p) >= 100" class="rush-text">已抢光</text>
            <text v-else class="rush-text">立即抢购</text>
          </view>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { goBack, navigateTo } from '@/utils/router'
import { shopApi, formatCountdown, type FlashProduct } from '@/lib/shop-data'

const loading = ref(true)
const error = ref('')
// 秒杀聚合数据(场次/商品/公告)：null 初值 + 模板 v-else 块裸访问 data.products 等，收敛会触发大量 possibly-null，保留 any
const data = ref<any>(null)
const activeSlot = ref('14')
const showNotice = ref(true)
const rushingId = ref<string | null>(null)
const submitting = ref(false)

const noticeText = computed(() => (data.value?.notices || []).join('  |  '))
const endTime = ref(0)
const cd = ref(formatCountdown(0))
let timer: ReturnType<typeof setInterval> | null = null

async function fetchFlashSaleData() {
  error.value = ''
  loading.value = true
  try {
    data.value = await shopApi.getFlashSaleFull()
    // 高亮真实场次时段（后端单场进行中）
    if (data.value?.timeSlots?.length) {
      activeSlot.value = data.value.timeSlots[0].id
    }
    endTime.value = data.value?.endOffsetMs ? Date.now() + data.value.endOffsetMs : 0
    cd.value = formatCountdown(endTime.value - Date.now())
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchFlashSaleData()
  timer = setInterval(() => {
    cd.value = formatCountdown(endTime.value - Date.now())
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function slotState(id: string): string {
  const hour = parseInt(id, 10)
  const now = new Date().getHours()
  if (hour <= now && hour + 2 > now) return '抢购中'
  if (hour < now) return '已结束'
  return '即将开始'
}

function progress(p: FlashProduct): number {
  return Math.round((p.sold / p.stock) * 100)
}

function rush(id: string) {
  if (submitting.value) return
  const p = (data.value?.products || []).find((x: FlashProduct) => x.id === id)
  if (!p || progress(p) >= 100) return
  submitting.value = true
  rushingId.value = id
  setTimeout(() => {
    rushingId.value = null
    submitting.value = false
    navigateTo(`/shop/checkout?productId=${id}&flashSale=true`)
  }, 1500)
}

function goDetail(id: string) {
  navigateTo(`/mall/product/${id.replace('p', '')}`)
}
</script>

<style lang="scss" scoped>
.flash-page {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--brand) 0%, #8b0000 100%);
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(24rpx + var(--status-bar-height, 0px));
  background: linear-gradient(90deg, var(--brand) 0%, #e85050 100%);
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}
.nav-hover {
  opacity: 0.6;
}
.nav-title-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.slots {
  white-space: nowrap;
  padding: 24rpx 32rpx;
}
.slots-row {
  display: inline-flex;
  gap: 16rpx;
}
.slot {
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  text-align: center;
}
.slot--on {
  background: #fff;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.2);
}
.slot-time {
  font-size: 28rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  display: block;
}
.slot-time--on {
  color: var(--brand);
}
.slot-state {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2rpx;
  display: block;
  white-space: nowrap;
}
.slot-state--on {
  color: var(--brand);
}

.countdown-box {
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(0, 0, 0, 0.3);
}
.notice {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding-bottom: 20rpx;
  margin-bottom: 20rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}
.notice-scroll {
  flex: 1;
  overflow: hidden;
}
.notice-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}
.notice-close {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
}
.cd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cd-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.cd-label-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}
.cd-timer {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.cd-num {
  min-width: 64rpx;
  padding: 8rpx 16rpx;
  background: #fff;
  color: var(--brand);
  font-size: 36rpx;
  font-weight: 700;
  border-radius: 8rpx;
  text-align: center;
  font-family: monospace;
}
.cd-sep {
  color: #fff;
  font-weight: 700;
}

.products {
  background: #faf8f5;
  border-radius: 48rpx 48rpx 0 0;
  min-height: 60vh;
  padding: 32rpx;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.card-hover {
  opacity: 0.9;
}
.card-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  margin-bottom: 16rpx;
}
.card-img {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
  background: #f0ece2;
}
.badge-soon {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 2rpx 12rpx;
  background: #ff8c42;
  color: #fff;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.badge-flash {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.badge-flash-text {
  color: #fff;
  font-size: 20rpx;
}
.card-name {
  font-size: 28rpx;
  color: #2c2c2c;
  line-height: 1.4;
  height: 80rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  display: block;
}
.card-price {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.price-now {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--brand);
}
.price-old {
  font-size: 22rpx;
  color: #999;
  text-decoration: line-through;
}
.progress {
  position: relative;
  height: 32rpx;
  background: #ffe4e4;
  border-radius: 999rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--brand), #ff6b6b);
  border-radius: 999rpx;
  transition: width 0.5s;
}
.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}
.rush-btn {
  padding: 20rpx 0;
  border-radius: 999rpx;
  text-align: center;
  background: linear-gradient(90deg, var(--brand), #e85050);
}
.rush-btn--done {
  background: #e5e5e5;
}
.rush-btn--ing {
  background: var(--brand);
}
.rush-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.rush-btn--done .rush-text {
  color: #999;
}

/* 加载态 */
.loading-zone { min-height: 100vh; background: linear-gradient(180deg, var(--brand) 0%, #8b0000 100%); padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.sk-slots { height: 80rpx; background: rgba(255,255,255,0.1); border-radius: 999rpx; }
.sk-cd { height: 120rpx; background: rgba(0,0,0,0.2); border-radius: 24rpx; }
.sk-grid-flash { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; margin-top: 32rpx; }
.sk-card { height: 360rpx; background: rgba(255,255,255,0.1); border-radius: 24rpx; }

/* 错误态 */
.error-zone { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; background: linear-gradient(180deg, var(--brand) 0%, #8b0000 100%); }
.error-text { font-size: 28rpx; color: rgba(255,255,255,0.8); }
.error-retry { padding: 16rpx 56rpx; background: #fff; border-radius: 40rpx; }
.error-retry text { color: var(--brand); font-size: 28rpx; }
</style>
