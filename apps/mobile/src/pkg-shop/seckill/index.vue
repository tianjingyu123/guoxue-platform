<template>
  <view class="seckill-page">
    <!-- 顶部导航 + 倒计时 -->
    <view class="navbar">
      <view class="nav-row">
        <view class="nav-back" hover-class="nav-hover" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#fff" />
        </view>
        <view class="nav-title-wrap">
          <app-icon name="zap" :size="36" color="#ffe066" />
          <text class="nav-title">限时秒杀</text>
        </view>
        <view class="nav-placeholder" />
      </view>
      <view class="cd-bar">
        <text class="cd-tip">{{ isOngoing ? '距本场结束' : '距下场开始' }}</text>
        <view class="cd-timer">
          <text class="cd-num">{{ pad(cd.h) }}</text>
          <text class="cd-sep">:</text>
          <text class="cd-num">{{ pad(cd.m) }}</text>
          <text class="cd-sep">:</text>
          <text class="cd-num">{{ pad(cd.s) }}</text>
        </view>
      </view>
    </view>

    <!-- 场次选择 -->
    <scroll-view scroll-x class="sessions">
      <view class="sessions-row">
        <view
          v-for="s in sessions"
          :key="s.id"
          class="session"
          :class="{ 'session--on': activeSession === s.id }"
          @tap="activeSession = s.id"
        >
          <text class="session-time" :class="{ 'session-time--on': activeSession === s.id }">{{ s.time }}</text>
          <text
            class="session-state"
            :class="[
              s.status === 'ongoing' ? 'session-state--ongoing' : s.status === 'upcoming' ? 'session-state--upcoming' : 'session-state--ended',
            ]"
          >{{ s.label }}</text>
          <view v-if="activeSession === s.id" class="session-underline" />
        </view>
      </view>
    </scroll-view>

    <view class="content">
      <!-- 主推大卡 -->
      <view v-if="hero" class="hero" hover-class="hero-hover" @tap="goDetail(hero.id)">
        <view class="hero-badge">
          <app-icon name="flame" :size="24" color="#ffe066" />
          <text class="hero-badge-text">今日主推</text>
        </view>
        <image class="hero-img" :src="hero.image" mode="aspectFill" />
        <view class="hero-info">
          <text class="hero-name">{{ hero.name }}</text>
          <view class="hero-price-row">
            <view class="hero-price-left">
              <text class="hero-price-label">秒杀价</text>
              <text class="hero-price"><text class="hero-price-sym">¥</text>{{ hero.seckillPrice }}</text>
              <text class="hero-price-old">¥{{ hero.originalPrice }}</text>
            </view>
            <text class="hero-discount">{{ discountOf(hero.seckillPrice, hero.originalPrice) }}折</text>
          </view>
          <view class="hero-progress-head">
            <text class="hero-sold">已抢 {{ hero.soldPercent }}%</text>
            <text class="hero-stock">仅剩 {{ hero.stock }} 件</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: hero.soldPercent + '%' }" />
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view
        v-for="p in rest"
        :key="p.id"
        class="card"
      >
        <image class="card-img" :src="p.image" mode="aspectFill" @tap="goDetail(p.id)" />
        <view class="card-body">
          <text class="card-name" @tap="goDetail(p.id)">{{ p.name }}</text>
          <view class="card-price-row">
            <text class="card-price"><text class="card-price-sym">¥</text>{{ p.seckillPrice }}</text>
            <text class="card-price-old">¥{{ p.originalPrice }}</text>
          </view>
          <view class="card-bottom">
            <view class="card-progress">
              <view class="card-progress-head">
                <text class="card-sold">已抢{{ p.soldPercent }}%</text>
                <text class="card-stock" :class="{ 'card-stock--low': p.stock <= 10 }">{{ p.stock <= 10 ? '仅剩' + p.stock + '件' : '剩' + p.stock + '件' }}</text>
              </view>
              <view class="progress-track">
                <view class="progress-fill" :style="{ width: p.soldPercent + '%' }" />
              </view>
            </view>
            <view
              v-if="isOngoing"
              class="rush-btn"
              :class="{ 'rush-btn--done': p.soldPercent >= 100 }"
              @tap="rush(p)"
            >
              <text class="rush-text">{{ p.soldPercent >= 100 ? '已抢光' : '立即抢' }}</text>
            </view>
            <view v-else class="soon-btn">
              <text class="soon-text">即将开抢</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部规则栏 -->
    <view class="footer">
      <view class="footer-left">
        <app-icon name="shield-check" :size="28" color="#c9a063" />
        <text class="footer-text">正品保障 · 每人每件限购1件</text>
      </view>
      <view class="footer-rule" hover-class="footer-rule-hover" @tap="goRules">
        <text class="footer-rule-text">活动规则</text>
        <app-icon name="chevron-right" :size="24" color="#c41e3a" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { goBack, navigateTo } from '@/utils/router'

interface SeckillProduct {
  id: number
  name: string
  seckillPrice: number
  originalPrice: number
  soldPercent: number
  stock: number
  image: string
}

const sessions = [
  { id: 1, time: '10:00', status: 'ended', label: '已结束' },
  { id: 2, time: '14:00', status: 'ongoing', label: '抢购中' },
  { id: 3, time: '20:00', status: 'upcoming', label: '即将开始' },
  { id: 4, time: '22:00', status: 'upcoming', label: '即将开始' },
]

const products: SeckillProduct[] = [
  { id: 1, name: '开光貔貅摆件·招财进宝', seckillPrice: 99, originalPrice: 299, soldPercent: 85, stock: 15, image: '/static/marketing/pixiu.png' },
  { id: 2, name: '八字命理精讲课程·名师亲授', seckillPrice: 49, originalPrice: 199, soldPercent: 72, stock: 28, image: '/static/marketing/course.png' },
  { id: 3, name: '天然紫水晶七星阵', seckillPrice: 168, originalPrice: 399, soldPercent: 45, stock: 55, image: '/static/marketing/crystal.png' },
  { id: 4, name: '风水罗盘专业版·铜制', seckillPrice: 188, originalPrice: 468, soldPercent: 38, stock: 62, image: '/static/marketing/luopan.png' },
  { id: 5, name: '六爻预测入门课·零基础', seckillPrice: 29, originalPrice: 99, soldPercent: 92, stock: 8, image: '/static/marketing/course.png' },
  { id: 6, name: '转运葫芦挂件套装', seckillPrice: 58, originalPrice: 128, soldPercent: 65, stock: 35, image: '/static/marketing/hulu.png' },
]

const activeSession = ref(2)
const hero = computed(() => products[0])
const rest = computed(() => products.slice(1))
const isOngoing = computed(() => sessions.find((s) => s.id === activeSession.value)?.status === 'ongoing')

const pad = (n: number) => n.toString().padStart(2, '0')
const discountOf = (s: number, o: number) => ((s / o) * 10).toFixed(1)

const endTime = Date.now() + 2 * 60 * 60 * 1000
const cd = ref({ h: 0, m: 0, s: 0 })
let timer: ReturnType<typeof setInterval> | null = null

function calc() {
  const diff = endTime - Date.now()
  if (diff <= 0) return { h: 0, m: 0, s: 0 }
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  }
}

onMounted(() => {
  cd.value = calc()
  timer = setInterval(() => {
    cd.value = calc()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function goDetail(id: number) {
  navigateTo(`/mall/product/${id}`)
}
function rush(p: SeckillProduct) {
  if (p.soldPercent >= 100) return
  navigateTo(`/mall/product/${p.id}`)
}
function goRules() {
  navigateTo('/seckill/rules')
}
</script>

<style lang="scss" scoped>
.seckill-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 120rpx;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: linear-gradient(135deg, #a01830 0%, #c41e3a 60%, #e85a71 100%);
  padding-top: var(--status-bar-height, 0px);
}
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.nav-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}
.nav-placeholder {
  width: 64rpx;
}
.cd-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 0 24rpx 28rpx;
}
.cd-tip {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}
.cd-timer {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.cd-num {
  min-width: 56rpx;
  padding: 8rpx 12rpx;
  background: #2c2419;
  color: #ffe066;
  font-size: 34rpx;
  font-weight: 700;
  border-radius: 8rpx;
  text-align: center;
  font-family: monospace;
}
.cd-sep {
  color: #ffe066;
  font-weight: 700;
}

.sessions {
  position: sticky;
  top: calc(116rpx + var(--status-bar-height, 0px));
  z-index: 40;
  background: #fff;
  border-bottom: 1rpx solid #f0ece2;
  white-space: nowrap;
}
.sessions-row {
  display: inline-flex;
}
.session {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 18rpx 48rpx;
}
.session-time {
  font-size: 36rpx;
  font-weight: 700;
  color: #999;
}
.session-time--on {
  color: #c41e3a;
}
.session-state {
  margin-top: 4rpx;
  font-size: 20rpx;
  padding: 0 12rpx;
  line-height: 32rpx;
  border-radius: 999rpx;
  font-weight: 500;
}
.session-state--ongoing {
  background: #c41e3a;
  color: #fff;
}
.session-state--upcoming {
  background: rgba(196, 30, 58, 0.1);
  color: #c41e3a;
}
.session-state--ended {
  background: #f0f0f0;
  color: #999;
}
.session-underline {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}

.content {
  padding: 24rpx;
}
.hero {
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  background: #fff;
  border: 1rpx solid rgba(201, 160, 99, 0.3);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 24rpx;
}
.hero-hover {
  opacity: 0.95;
}
.hero-badge {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 28rpx 8rpx 16rpx;
  background: linear-gradient(90deg, #a01830, #c41e3a);
  border-bottom-right-radius: 24rpx;
}
.hero-badge-text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}
.hero-img {
  width: 100%;
  height: 360rpx;
  background: #f0ece2;
}
.hero-info {
  padding: 24rpx;
}
.hero-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
  display: block;
}
.hero-price-row {
  margin-top: 16rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.hero-price-left {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.hero-price-label {
  font-size: 26rpx;
  color: #c41e3a;
  font-weight: 500;
}
.hero-price {
  font-size: 56rpx;
  color: #c41e3a;
  font-weight: 700;
  line-height: 1;
}
.hero-price-sym {
  font-size: 32rpx;
}
.hero-price-old {
  font-size: 26rpx;
  color: #999;
  text-decoration: line-through;
}
.hero-discount {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(201, 160, 99, 0.15);
  font-size: 22rpx;
  font-weight: 700;
  color: #c9a063;
  border: 1rpx solid rgba(201, 160, 99, 0.3);
}
.hero-progress-head {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero-sold {
  font-size: 24rpx;
  color: #c41e3a;
  font-weight: 500;
}
.hero-stock {
  font-size: 24rpx;
  color: #999;
}

.card {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 20rpx;
}
.card-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  background: #f0ece2;
  flex-shrink: 0;
}
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}
.card-name {
  font-size: 28rpx;
  color: #2c2c2c;
  line-height: 1.4;
  display: block;
}
.card-price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 12rpx 0;
}
.card-price {
  font-size: 44rpx;
  color: #c41e3a;
  font-weight: 700;
  line-height: 1;
}
.card-price-sym {
  font-size: 26rpx;
}
.card-price-old {
  font-size: 22rpx;
  color: #999;
  text-decoration: line-through;
}
.card-bottom {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
}
.card-progress {
  flex: 1;
  min-width: 0;
}
.card-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.card-sold {
  font-size: 20rpx;
  color: #c41e3a;
  font-weight: 500;
}
.card-stock {
  font-size: 20rpx;
  color: #999;
}
.card-stock--low {
  color: #e03e3e;
  font-weight: 500;
}
.progress-track {
  height: 16rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 999rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #c41e3a, #e85a71);
  border-radius: 999rpx;
  transition: width 0.5s;
}
.rush-btn {
  height: 64rpx;
  padding: 0 32rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #c41e3a, #e85a71);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.rush-btn--done {
  background: #e5e5e5;
}
.rush-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
}
.rush-btn--done .rush-text {
  color: #999;
}
.soon-btn {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: rgba(201, 160, 99, 0.15);
  border: 1rpx solid rgba(201, 160, 99, 0.3);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.soon-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #c9a063;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #f0ece2;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.footer-text {
  font-size: 22rpx;
  color: #999;
}
.footer-rule {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.footer-rule-hover {
  opacity: 0.6;
}
.footer-rule-text {
  font-size: 24rpx;
  color: #c41e3a;
  font-weight: 500;
}
</style>
