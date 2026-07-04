<script setup lang="ts">
/** 今日小语母版（峰值时刻 2.1，原型 components/common/daily-verse.tsx）
 *  每日首次进入首页淡入展示一句名句+节气，数秒后自动收起；点击卡片可驻留并分享（V2 每日一签裂变）。 */
import { ref, onMounted } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'
import { getTodayVerse } from '@/lib/home-data'
import { withRef } from '@/utils/referral'
import { BRAND } from '@/lib/brand'
import { track } from '@/composables/useTrack'

const props = withDefaults(defineProps<{ duration?: number; storageKey?: string }>(), {
  duration: 5000,
  storageKey: 'daily-verse-shown',
})

const phase = ref<'hidden' | 'in' | 'out'>('hidden')
const pinned = ref(false) // 点击驻留：暂停自动收起，露出分享按钮
const verse = getTodayVerse()
let hideTimers: ReturnType<typeof setTimeout>[] = []

onMounted(() => {
  const today = new Date().toDateString()
  if (getStorage(props.storageKey) === today) return
  setStorage(props.storageKey, today)
  setTimeout(() => (phase.value = 'in'), 200)
  hideTimers = [
    setTimeout(() => { if (!pinned.value) phase.value = 'out' }, props.duration),
    setTimeout(() => { if (!pinned.value) phase.value = 'hidden' }, props.duration + 700),
  ]
})

function pin() {
  pinned.value = true
  hideTimers.forEach(clearTimeout)
}

function dismiss() {
  pinned.value = false
  phase.value = 'out'
  setTimeout(() => (phase.value = 'hidden'), 700)
}

/** V2 每日一签分享：复制签文+带 ref 的首页链接（好友点开自动记归因，见到自己的今日签） */
function shareVerse() {
  const link = withRef('https://api.rebugx.cn/h5/#/pages/index/index')
  const content = `【今日一签】${verse.text} ——《${verse.source}》\n来${BRAND.name}，看你的今日签：${link}`
  uni.setClipboardData({
    data: content,
    success: () => {
      uni.showToast({ title: '签文已复制，分享给好友吧', icon: 'none' })
      try { track.share('daily_verse', verse.source) } catch { /* 埋点失败忽略 */ }
    },
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}
</script>

<template>
  <view
    v-if="phase !== 'hidden'"
    class="verse-overlay"
    :class="[phase === 'in' ? 'shown' : 'fading', pinned ? 'interactive' : '']"
  >
    <view class="card" @tap="pin">
      <text v-if="verse.solarTerm" class="term">{{ verse.solarTerm }}</text>
      <text class="text">{{ verse.text }}</text>
      <text class="source">{{ verse.source }}</text>
      <view v-if="pinned" class="actions">
        <view class="btn share" @tap.stop="shareVerse"><text class="btn-txt light">分享此签</text></view>
        <view class="btn" @tap.stop="dismiss"><text class="btn-txt">收起</text></view>
      </view>
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
  pointer-events: auto; /* 浮层本体不拦截页面，卡片可点击驻留（V2 分享） */
}
.actions { display: flex; gap: 20rpx; margin-top: 24rpx; }
.btn {
  padding: 12rpx 36rpx; border-radius: 999rpx;
  border: 2rpx solid var(--line, #e8e0d5); background: #fff;
}
.btn.share { background: var(--brand, #c41e3a); border-color: var(--brand, #c41e3a); }
.btn-txt { font-size: 26rpx; color: var(--text-soft, #666); }
.btn-txt.light { color: #fff; }
.term { font-size: 24rpx; font-weight: 500; color: var(--brand); margin-bottom: 12rpx; }
.text {
  font-family: var(--font-serif); font-size: 34rpx; line-height: 1.6;
  color: var(--text-ink, #2c2c2c);
}
.source { font-size: 24rpx; color: var(--text-soft, #666); margin-top: 12rpx; }
</style>
