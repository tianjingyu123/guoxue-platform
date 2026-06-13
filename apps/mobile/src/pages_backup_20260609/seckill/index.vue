<template>
  <view class="sk-page">
    <view class="sk-header">
      <view class="skh-row">
        <text class="skh-back" @click="uni.navigateBack()">‹</text>
        <text class="skh-title">⚡ 限时秒杀</text>
        <view class="skh-spacer" />
      </view>
      <view class="skh-countdown">
        <text class="skh-cd-label">{{ currentSession?.status === 'ongoing' ? '距本场结束' : '距下场开始' }}</text>
        <view class="skh-cd-nums">
          <text class="cd-num">{{ padZero(hours) }}</text>
          <text class="cd-colon">:</text>
          <text class="cd-num">{{ padZero(minutes) }}</text>
          <text class="cd-colon">:</text>
          <text class="cd-num">{{ padZero(seconds) }}</text>
        </view>
      </view>
    </view>

    <!-- 场次选择 -->
    <view class="session-row">
      <view v-for="s in seckillSessions" :key="s.id" class="session-chip" :class="{ active: activeSession === s.id, ongoing: s.status === 'ongoing' }" @click="activeSession = s.id">
        <text class="sc-time">{{ s.time }}</text>
        <text class="sc-label">{{ s.label }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="sk-products">
      <view v-for="p in seckillProducts" :key="p.id" class="sk-product">
        <view class="skp-img">
          <text class="skp-img-placeholder">📦</text>
          <text class="skp-discount">{{ Math.round((1 - p.seckillPrice / p.originalPrice) * 100) }}% OFF</text>
        </view>
        <view class="skp-info">
          <text class="skp-name">{{ p.name }}</text>
          <view class="skp-price-row">
            <text class="skp-price">¥{{ p.seckillPrice }}</text>
            <text class="skp-orig">¥{{ p.originalPrice }}</text>
          </view>
          <view class="skp-progress">
            <view class="skp-progress-bar">
              <view class="skp-progress-fill" :style="{ width: p.soldPercent + '%' }" />
            </view>
            <view class="skp-progress-stats">
              <text>已抢{{ p.soldPercent }}%</text>
              <text>剩余{{ p.stock }}件</text>
            </view>
          </view>
          <view class="skp-action">
            <view v-if="currentSession?.status === 'ongoing'" class="skp-btn">立即抢</view>
            <view v-else class="skp-btn remind" :class="{ active: remindedIds.includes(p.id) }" @click="toggleRemind(p.id)">
              <text>{{ remindedIds.includes(p.id) ? '已提醒' : '🔔 提醒我' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部规则 -->
    <view class="sk-bottom">
      <text>每人每件商品限购1件</text>
      <text class="sk-rules">活动规则 ›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const activeSession = ref(2)
const remindedIds = ref<number[]>([])
let timer: any = null

const countdown = ref({ hours: 1, minutes: 45, seconds: 30 })

const seckillSessions = [
  { id: 1, time: '10:00', status: 'ended', label: '已结束' },
  { id: 2, time: '14:00', status: 'ongoing', label: '抢购中' },
  { id: 3, time: '20:00', status: 'upcoming', label: '即将开始' },
  { id: 4, time: '22:00', status: 'upcoming', label: '即将开始' },
]

const currentSession = ref(seckillSessions.find(s => s.id === activeSession.value))

const seckillProducts = [
  { id: 1, name: '开光貔貅摆件·招财进宝', seckillPrice: 99, originalPrice: 299, soldPercent: 85, stock: 15 },
  { id: 2, name: '八字命理精讲课程', seckillPrice: 49, originalPrice: 199, soldPercent: 72, stock: 28 },
  { id: 3, name: '紫水晶七星阵', seckillPrice: 168, originalPrice: 399, soldPercent: 45, stock: 55 },
  { id: 4, name: '风水罗盘专业版', seckillPrice: 188, originalPrice: 468, soldPercent: 38, stock: 62 },
  { id: 5, name: '六爻预测入门课', seckillPrice: 29, originalPrice: 99, soldPercent: 92, stock: 8 },
  { id: 6, name: '转运葫芦挂件套装', seckillPrice: 58, originalPrice: 128, soldPercent: 65, stock: 35 },
]

const hours = ref(1)
const minutes = ref(45)
const seconds = ref(30)

onMounted(() => {
  timer = setInterval(() => {
    if (seconds.value > 0) { seconds.value-- }
    else if (minutes.value > 0) { minutes.value--; seconds.value = 59 }
    else if (hours.value > 0) { hours.value--; minutes.value = 59; seconds.value = 59 }
  }, 1000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

function padZero(n: number) { return n.toString().padStart(2, '0') }

function toggleRemind(id: number) {
  const idx = remindedIds.value.indexOf(id)
  if (idx >= 0) { remindedIds.value.splice(idx, 1) }
  else { remindedIds.value.push(id) }
}
</script>

<style scoped>
.sk-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 80rpx; }
.sk-header { background: linear-gradient(135deg, #FF4D4F, #FF7A45); padding-top: 0; }
.skh-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.skh-back { font-size: 48rpx; color: #fff; width: 64rpx; }
.skh-title { font-size: 34rpx; font-weight: 700; color: #fff; flex: 1; }
.skh-spacer { width: 64rpx; }
.skh-countdown { display: flex; flex-direction: column; align-items: center; padding: 0 24rpx 24rpx; }
.skh-cd-label { font-size: 22rpx; color: rgba(255,255,255,0.75); margin-bottom: 10rpx; }
.skh-cd-nums { display: flex; align-items: center; gap: 4rpx; }
.cd-num { padding: 8rpx 18rpx; background: rgba(255,255,255,0.2); color: #fff; font-size: 36rpx; font-weight: 700; border-radius: 10rpx; }
.cd-colon { font-size: 36rpx; font-weight: 700; color: #fff; }

.session-row { display: flex; padding: 14rpx 24rpx; background: #fff; border-bottom: 1px solid #F0EDE5; overflow-x: auto; gap: 12rpx; position: sticky; top: 0; z-index: 20; }
.session-chip { display: flex; flex-direction: column; align-items: center; padding: 10rpx 28rpx; border-radius: 12rpx; flex-shrink: 0; }
.session-chip.active { background: #F5F1EB; }
.session-chip.active.ongoing { background: rgba(255,77,79,0.08); }
.sc-time { font-size: 32rpx; font-weight: 700; color: #333; }
.sc-label { font-size: 20rpx; color: #999; margin-top: 2rpx; }
.session-chip.ongoing .sc-label { color: #FF4D4F; }

.sk-products { padding: 16rpx 24rpx; }
.sk-product { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 18rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.skp-img { width: 180rpx; height: 180rpx; background: linear-gradient(135deg, rgba(255,77,79,0.05), rgba(255,122,69,0.03)); border-radius: 14rpx; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.skp-img-placeholder { font-size: 56rpx; opacity: 0.3; }
.skp-discount { position: absolute; top: 0; left: 0; font-size: 18rpx; color: #fff; background: #FF4D4F; padding: 4rpx 12rpx; border-radius: 14rpx 0 8rpx 0; font-weight: 600; }

.skp-info { flex: 1; min-width: 0; }
.skp-name { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.skp-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 8rpx; }
.skp-price { font-size: 36rpx; font-weight: 700; color: #FF4D4F; }
.skp-orig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }

.skp-progress { margin-top: 12rpx; }
.skp-progress-bar { height: 6rpx; background: #FFF0F0; border-radius: 3rpx; overflow: hidden; }
.skp-progress-fill { height: 100%; background: linear-gradient(90deg, #FF4D4F, #FF7A45); border-radius: 3rpx; }
.skp-progress-stats { display: flex; justify-content: space-between; font-size: 18rpx; color: #999; margin-top: 4rpx; }

.skp-action { margin-top: 12rpx; display: flex; justify-content: flex-end; }
.skp-btn { padding: 8rpx 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #FF4D4F, #FF7A45); color: #fff; font-size: 22rpx; font-weight: 500; }
.skp-btn.remind { background: #F5F1EB; color: #999; }
.skp-btn.remind.active { background: rgba(255,77,79,0.08); color: #FF4D4F; }

.sk-bottom { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 24rpx 24rpx; }
.sk-bottom text { font-size: 22rpx; color: #BBB; }
.sk-rules { color: #C41E3A; }
</style>
