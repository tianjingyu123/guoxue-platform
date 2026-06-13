<template>
  <view class="fs-page">
    <view class="fs-header">
      <view class="fsh-row">
        <text class="fsh-back" @click="uni.navigateBack()">‹</text>
        <text class="fsh-title">⚡ 限时秒杀</text>
        <view class="fsh-countdown">
          <text class="fsh-cd-label">距本场结束</text>
          <view class="fsh-cd-nums">
            <text class="cd-num">{{ h }}</text>
            <text>:</text>
            <text class="cd-num">{{ m }}</text>
            <text>:</text>
            <text class="cd-num">{{ s }}</text>
          </view>
        </view>
      </view>
      <view class="fsh-sessions">
        <view v-for="se in sessions" :key="se.id" class="fsh-se" :class="{ active: activeSession === se.id }" @click="activeSession = se.id">
          <text class="fsh-se-time">{{ se.time }}</text>
          <text class="fsh-se-label">{{ se.label }}</text>
        </view>
      </view>
    </view>

    <view class="fs-products">
      <view v-for="p in flashProducts" :key="p.id" class="fs-product" @click="goPage('/pages/product/' + p.id)">
        <view class="fsp-img">
          <text class="fsp-img-icon">📦</text>
        </view>
        <view class="fsp-info">
          <text class="fsp-name">{{ p.title }}</text>
          <view class="fsp-progress">
            <view class="fsp-progress-bar">
              <view class="fsp-progress-fill" :style="{ width: percent(p) + '%' }" />
              <text class="fsp-progress-text">已抢 {{ percent(p) }}%</text>
            </view>
          </view>
          <view class="fsp-bottom">
            <view class="fsp-price-row">
              <text class="fsp-price">¥{{ p.price }}</text>
              <text class="fsp-orig">¥{{ p.originalPrice }}</text>
            </view>
            <view class="fsp-btn">马上抢</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const activeSession = ref('s1')

const sessions = [
  { id: 's1', time: '10:00', label: '已开抢', status: 'active' },
  { id: 's2', time: '14:00', label: '即将开始', status: 'upcoming' },
  { id: 's3', time: '18:00', label: '即将开始', status: 'upcoming' },
  { id: 's4', time: '20:00', label: '即将开始', status: 'upcoming' },
]

const flashProducts = [
  { id: 'f1', title: '天然黑曜石貔貅手链 招财转运', price: 68, originalPrice: 268, stock: 100, sold: 78 },
  { id: 'f2', title: '专业风水罗盘 纯铜精工', price: 158, originalPrice: 598, stock: 50, sold: 42 },
  { id: 'f3', title: '开光五帝钱挂件 镇宅化煞', price: 28, originalPrice: 128, stock: 200, sold: 156 },
  { id: 'f4', title: '天然水晶七星阵摆件', price: 99, originalPrice: 358, stock: 80, sold: 61 },
]

let timer: any = null
let totalSeconds = 125 * 60

const h = ref('02')
const m = ref('05')
const s = ref('00')

function updateCountdown() {
  if (totalSeconds > 0) totalSeconds--
  h.value = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  m.value = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  s.value = String(totalSeconds % 60).padStart(2, '0')
}

onMounted(() => { updateCountdown(); timer = setInterval(updateCountdown, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

function percent(p: typeof flashProducts[0]) { return Math.round((p.sold / p.stock) * 100) }

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.fs-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.fs-header { background: linear-gradient(135deg, #C41E3A, #C9A96E); }
.fsh-row { display: flex; align-items: center; padding: 0 16rpx; height: 88rpx; }
.fsh-back { font-size: 48rpx; color: #fff; width: 56rpx; }
.fsh-title { font-size: 30rpx; font-weight: 700; color: #fff; margin-right: 16rpx; }
.fsh-countdown { display: flex; align-items: center; gap: 6rpx; margin-left: auto; }
.fsh-cd-label { font-size: 20rpx; color: rgba(255,255,255,0.75); }
.fsh-cd-nums { display: flex; align-items: center; gap: 2rpx; font-size: 20rpx; color: #fff; }
.cd-num { padding: 4rpx 8rpx; background: rgba(255,255,255,0.2); border-radius: 4rpx; font-weight: 600; }

.fsh-sessions { display: flex; gap: 8rpx; padding: 0 24rpx 16rpx; }
.fsh-se { display: flex; flex-direction: column; align-items: center; padding: 8rpx 24rpx; border-radius: 10rpx; background: rgba(255,255,255,0.1); }
.fsh-se.active { background: #fff; }
.fsh-se-time { font-size: 26rpx; font-weight: 600; color: #fff; }
.fsh-se.active .fsh-se-time { color: #C41E3A; }
.fsh-se-label { font-size: 18rpx; color: rgba(255,255,255,0.7); }
.fsh-se.active .fsh-se-label { color: #C9A96E; }

.fs-products { padding: 16rpx 24rpx; }
.fs-product { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.fsp-img { width: 180rpx; height: 180rpx; background: #F5F1EB; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fsp-img-icon { font-size: 56rpx; opacity: 0.3; }

.fsp-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.fsp-name { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; }

.fsp-progress { margin-top: auto; }
.fsp-progress-bar { height: 32rpx; background: #FFF0F0; border-radius: 16rpx; position: relative; overflow: hidden; }
.fsp-progress-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #C9A96E); border-radius: 16rpx; }
.fsp-progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #333; font-weight: 500; }

.fsp-bottom { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 12rpx; }
.fsp-price-row { display: flex; align-items: baseline; gap: 6rpx; }
.fsp-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.fsp-orig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.fsp-btn { padding: 8rpx 28rpx; border-radius: 24rpx; background: #C41E3A; color: #fff; font-size: 24rpx; font-weight: 500; }
</style>
