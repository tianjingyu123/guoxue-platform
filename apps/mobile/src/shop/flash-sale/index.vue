<template>
  <view class="flash-page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view
        class="nav-back"
        hover-class="nav-hover"
        @tap="goBack"
      >
        <app-icon
          name="chevron-left"
          :size="40"
          color="#fff"
        />
      </view>
      <view class="nav-title-wrap">
        <app-icon
          name="zap"
          :size="36"
          color="#ffe066"
        />
        <text class="nav-title">
          限时秒杀
        </text>
      </view>
    </view>

    <!-- 时段切换 -->
    <scroll-view
      scroll-x
      class="slots"
    >
      <view class="slots-row">
        <view
          v-for="slot in flashTimeSlots"
          :key="slot.id"
          class="slot"
          :class="{ 'slot--on': activeSlot === slot.id }"
          @tap="activeSlot = slot.id"
        >
          <text
            class="slot-time"
            :class="{ 'slot-time--on': activeSlot === slot.id }"
          >
            {{ slot.label }}
          </text>
          <text
            class="slot-state"
            :class="{ 'slot-state--on': activeSlot === slot.id }"
          >
            {{ slotState(slot.id) }}
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 倒计时区 -->
    <view class="countdown-box">
      <view
        v-if="showNotice"
        class="notice"
      >
        <app-icon
          name="volume-2"
          :size="28"
          color="#ffe066"
        />
        <view class="notice-scroll">
          <text class="notice-text">
            {{ noticeText }}
          </text>
        </view>
        <text
          class="notice-close"
          @tap="showNotice = false"
        >
          关闭
        </text>
      </view>
      <view class="cd-row">
        <view class="cd-label">
          <app-icon
            name="flame"
            :size="36"
            color="#ff8c42"
          />
          <text class="cd-label-text">
            距离结束还剩
          </text>
        </view>
        <view class="cd-timer">
          <text class="cd-num">
            {{ cd.h }}
          </text>
          <text class="cd-sep">
            :
          </text>
          <text class="cd-num">
            {{ cd.m }}
          </text>
          <text class="cd-sep">
            :
          </text>
          <text class="cd-num">
            {{ cd.s }}
          </text>
        </view>
      </view>
    </view>

    <!-- 商品区 -->
    <view class="products">
      <!-- 加载骨架 -->
      <view
        v-if="loading"
        class="grid"
      >
        <view
          v-for="i in 4"
          :key="i"
          class="card sk-card"
        >
          <view class="card-img-wrap sk-img" />
          <view class="sk-line" />
          <view class="sk-line sk-short" />
          <view class="sk-bar" />
          <view class="sk-btn" />
        </view>
      </view>

      <error-state
        v-else-if="error"
        :message="error"
        @retry="loadFlashSale"
      />

      <view
        v-else
        class="grid"
      >
        <view
          v-for="p in products"
          :key="p.id"
          class="card"
          hover-class="card-hover"
          @tap="goDetail(p.id)"
        >
          <view class="card-img-wrap">
            <image
              class="card-img"
              :src="p.cover"
              mode="aspectFill"
            />
            <view
              v-if="progress(p) >= 80"
              class="badge-soon"
            >
              即将售罄
            </view>
            <view class="badge-flash">
              <app-icon
                name="zap"
                :size="20"
                color="#fff"
              />
              <text class="badge-flash-text">
                秒杀
              </text>
            </view>
          </view>
          <text class="card-name">
            {{ p.name }}
          </text>
          <view class="card-price">
            <text class="price-now">
              ¥{{ p.price }}
            </text>
            <text class="price-old">
              ¥{{ p.originalPrice }}
            </text>
          </view>
          <view class="progress">
            <view
              class="progress-bar"
              :style="{ width: progress(p) + '%' }"
            />
            <text class="progress-text">
              已抢{{ progress(p) }}%
            </text>
          </view>
          <view
            class="rush-btn"
            :class="{ 'rush-btn--done': progress(p) >= 100, 'rush-btn--ing': rushingId === p.id }"
            @tap.stop="rush(p.id)"
          >
            <text
              v-if="rushingId === p.id"
              class="rush-text"
            >
              抢购中...
            </text>
            <text
              v-else-if="progress(p) >= 100"
              class="rush-text"
            >
              已抢光
            </text>
            <text
              v-else
              class="rush-text"
            >
              立即抢购
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { goBack, navigateTo } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'
import { flashTimeSlots, flashNotices, flashEndOffsetMs, formatCountdown, shopApi, type ShopFlashProduct } from '@/lib/shop-data'

const activeSlot = ref('14')
const showNotice = ref(true)
const rushingId = ref<string | null>(null)
const products = ref<ShopFlashProduct[]>([])
const loading = ref(true)
const error = ref('')
const noticeText = flashNotices.join('  |  ')

const endTime = Date.now() + flashEndOffsetMs
const cd = ref(formatCountdown(flashEndOffsetMs))
let timer: ReturnType<typeof setInterval> | null = null

async function loadFlashSale() {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getFlashSales()
    products.value = res.items || []
  } catch (e: any) { error.value = e?.message || '加载失败' } finally { loading.value = false }
}

onMounted(() => {
  loadFlashSale()
  timer = setInterval(() => {
    cd.value = formatCountdown(endTime - Date.now())
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

function progress(p: ShopFlashProduct): number {
  return Math.round((p.sold / p.stock) * 100)
}

function rush(id: string) {
  if (progress(products.value.find((x) => x.id === id)!) >= 100) return
  rushingId.value = id
  setTimeout(() => {
    rushingId.value = null
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
  background: linear-gradient(180deg, #c41e3a 0%, #8b0000 100%);
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
  background: linear-gradient(90deg, #c41e3a 0%, #e85050 100%);
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
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
  gap: 8rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.slots {
  white-space: nowrap;
  padding: 24rpx;
}
.slots-row {
  display: inline-flex;
  gap: 16rpx;
}
.slot {
  padding: 12rpx 32rpx;
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
  color: #c41e3a;
}
.slot-state {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4rpx;
  display: block;
}
.slot-state--on {
  color: #c41e3a;
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
  min-width: 48rpx;
  padding: 6rpx 8rpx;
  background: #fff;
  color: #c41e3a;
  font-size: 32rpx;
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
  padding: 24rpx;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx;
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
  background: #c41e3a;
  border-radius: 999rpx;
}
.badge-flash-text {
  color: #fff;
  font-size: 20rpx;
}
.card-name {
  font-size: 26rpx;
  color: #2c2c2c;
  line-height: 1.4;
  height: 72rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
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
  color: #c41e3a;
}
.price-old {
  font-size: 22rpx;
  color: #999;
  text-decoration: line-through;
}
.progress {
  position: relative;
  height: 28rpx;
  background: #ffe4e4;
  border-radius: 999rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #c41e3a, #ff6b6b);
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
  padding: 18rpx 0;
  border-radius: 999rpx;
  text-align: center;
  background: linear-gradient(90deg, #c41e3a, #e85050);
}
.rush-btn--done {
  background: #e5e5e5;
}
.rush-btn--ing {
  background: #c41e3a;
}
.rush-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.rush-btn--done .rush-text {
  color: #999;
}

.sk-card { }
.sk-img { background: #f0ece2; border-radius: 16rpx; }
.sk-line { height: 24rpx; background: #f0ece4; border-radius: 8rpx; margin-bottom: 12rpx; }
.sk-short { width: 60%; }
.sk-bar { height: 28rpx; background: #f0ece4; border-radius: 999rpx; margin-bottom: 16rpx; }
.sk-btn { height: 72rpx; background: #f0ece4; border-radius: 999rpx; }
</style>
