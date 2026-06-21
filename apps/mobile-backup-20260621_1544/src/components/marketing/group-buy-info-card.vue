<script setup lang="ts">
/** 拼团信息卡 - 从原型 components/marketing/marketing-slot.tsx GroupBuyInfoCard 迁移 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  groupPrice: number
  originalPrice: number
  peopleNeeded: number
  currentPeople: number
  /** 距结束的毫秒数 */
  duration?: number
}>()

const emit = defineEmits<{ (e: 'join'): void }>()

const h = ref('00')
const m = ref('00')
const s = ref('00')
let timer: ReturnType<typeof setInterval> | null = null
const endTime = Date.now() + (props.duration ?? 24 * 60 * 60 * 1000)
const fmt = (n: number) => n.toString().padStart(2, '0')

function tick() {
  const diff = Math.max(0, endTime - Date.now())
  h.value = fmt(Math.floor(diff / 3600000))
  m.value = fmt(Math.floor((diff % 3600000) / 60000))
  s.value = fmt(Math.floor((diff % 60000) / 1000))
}

onMounted(() => { tick(); timer = setInterval(tick, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <view class="gb-card">
    <view class="gb-top">
      <view class="gb-info">
        <text class="gb-icon">
          拼
        </text>
        <view>
          <view class="gb-price-row">
            <text class="gb-price">
              ¥{{ groupPrice }}
            </text>
            <text class="gb-orig">
              ¥{{ originalPrice }}
            </text>
            <text class="gb-tag">
              {{ peopleNeeded }}人团
            </text>
          </view>
          <text class="gb-desc">
            已有{{ currentPeople }}人参团，还差{{ peopleNeeded - currentPeople }}人成团
          </text>
        </view>
      </view>
      <view class="gb-time">
        <text class="gb-time-label">
          剩余时间
        </text>
        <text class="gb-time-val">
          {{ h }}:{{ m }}:{{ s }}
        </text>
      </view>
    </view>
    <view
      class="gb-btn"
      hover-class="gb-btn-press"
      @tap="emit('join')"
    >
      <text class="gb-btn-text">
        立即参团，省¥{{ originalPrice - groupPrice }}
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.gb-card { border-radius: 24rpx; border: 1rpx solid #f9c6dd; background: linear-gradient(90deg, #fdf2f8, #faf5ff); padding: 20rpx; }
.gb-top { display: flex; align-items: center; justify-content: space-between; }
.gb-info { display: flex; align-items: center; gap: 18rpx; }
.gb-icon { width: 40rpx; height: 40rpx; border-radius: 50%; background: #ec4899; color: #fff; font-size: 22rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gb-price-row { display: flex; align-items: baseline; gap: 12rpx; }
.gb-price { font-size: 36rpx; font-weight: 700; color: #ec4899; }
.gb-orig { font-size: 22rpx; color: var(--text-soft); text-decoration: line-through; }
.gb-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: #ec4899; color: #fff; }
.gb-desc { font-size: 20rpx; color: var(--text-soft); margin-top: 4rpx; }
.gb-time { text-align: right; }
.gb-time-label { display: block; font-size: 20rpx; color: var(--text-soft); }
.gb-time-val { font-size: 24rpx; color: #ec4899; font-family: monospace; }
.gb-btn { margin-top: 16rpx; height: 64rpx; border-radius: 16rpx; background: #ec4899; display: flex; align-items: center; justify-content: center; }
.gb-btn-press { opacity: 0.85; }
.gb-btn-text { color: #fff; font-size: 24rpx; font-weight: 500; }
</style>
