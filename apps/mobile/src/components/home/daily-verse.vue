<script setup lang="ts">
/** 今日小语母版（峰值时刻 2.1，原型 components/common/daily-verse.tsx）
 *  每日首次进入首页淡入展示一句名句+节气，数秒后自动收起。uni storage 控制每日一次。 */
import { ref, onMounted } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'
import { getTodayVerse } from '@/lib/home-data'

const props = withDefaults(defineProps<{ duration?: number; storageKey?: string }>(), {
  duration: 4000,
  storageKey: 'daily-verse-shown',
})

const phase = ref<'hidden' | 'in' | 'out'>('hidden')
const verse = getTodayVerse()

onMounted(() => {
  const today = new Date().toDateString()
  if (getStorage(props.storageKey) === today) return
  setStorage(props.storageKey, today)
  setTimeout(() => (phase.value = 'in'), 200)
  setTimeout(() => (phase.value = 'out'), props.duration)
  setTimeout(() => (phase.value = 'hidden'), props.duration + 700)
})
</script>

<template>
  <view
    v-if="phase !== 'hidden'"
    class="verse-overlay"
    :class="phase === 'in' ? 'shown' : 'fading'"
  >
    <view class="card">
      <text v-if="verse.solarTerm" class="term">{{ verse.solarTerm }}</text>
      <text class="text">{{ verse.text }}</text>
      <text class="source">{{ verse.source }}</text>
    </view>

  </view>
</template>

<style scoped lang="scss">
.verse-overlay {
  position: fixed; left: 0; right: 0; top: 0; z-index: 55;
  display: flex; justify-content: center;
  padding: 160rpx 32rpx 0;
  pointer-events: none;
  transition: all 0.7s ease;
}
.verse-overlay.shown { transform: translateY(0); opacity: 1; }
.verse-overlay.fading { transform: translateY(-24rpx); opacity: 0; }
.card {
  max-width: 600rpx;
  border-radius: 32rpx;
  border: 2rpx solid var(--line, #e8e0d5);
  background: rgba(255, 255, 255, 0.95);
  padding: 32rpx 40rpx;
  text-align: center;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.12);
  display: flex; flex-direction: column; align-items: center;
}
.term { font-size: 24rpx; font-weight: 500; color: #c41e3a; margin-bottom: 12rpx; }
.text {
  font-family: var(--font-serif); font-size: 34rpx; line-height: 1.6;
  color: var(--text-ink, #2c2c2c);
}
.source { font-size: 24rpx; color: var(--text-soft, #666); margin-top: 12rpx; }
</style>
