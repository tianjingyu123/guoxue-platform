<script setup lang="ts">
/** 即时排盘（实时时钟四柱）——从原型 instant-bazi.tsx 迁移 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

const shiChen = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
// 五行颜色（指向 wuxing 令牌）
const wx: Record<string,string> = {
  甲:'wood',乙:'wood',寅:'wood',卯:'wood',
  丙:'fire',丁:'fire',巳:'fire',午:'fire',
  戊:'earth',己:'earth',辰:'earth',戌:'earth',丑:'earth',未:'earth',
  庚:'metal',辛:'metal',申:'metal',酉:'metal',
  壬:'water',癸:'water',亥:'water',子:'water',
}
function wxColor(c: string) {
  const k = wx[c]
  return k ? `var(--wuxing-${k})` : 'var(--text-ink)'
}

const pillars = [
  { label: '年', gan: '丙', zhi: '午' },
  { label: '月', gan: '癸', zhi: '巳' },
  { label: '日', gan: '庚', zhi: '寅' },
  { label: '时', gan: '丙', zhi: '戌' },
]

const now = ref<Date | null>(null)
let timer: any = null
onMounted(() => { now.value = new Date(); timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => timer && clearInterval(timer))

const currentShiChen = computed(() => {
  const h = now.value?.getHours() ?? 12
  return shiChen[Math.floor((h + 1) % 24 / 2)]
})
function pad(n: number) { return String(n).padStart(2, '0') }
const timeStr = computed(() => {
  const d = now.value
  if (!d) return '--:--:--'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})
const dateStr = computed(() => {
  const d = now.value
  return d ? `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日` : '--'
})
</script>

<template>
  <view class="ib-card">
    <view class="ib-head">
      <view class="ib-head-l">
        <view class="ib-bar" /><text class="ib-title">即时排盘</text>
      </view>
      <view class="ib-head-r">
        <view class="ib-dot" /><text class="ib-live">实时更新</text>
      </view>
    </view>
    <view class="ib-body">
      <view class="ib-left">
        <view class="ib-pillars">
          <view v-for="(p, i) in pillars" :key="i" class="ib-pillar">
            <text class="ib-plabel">{{ p.label }}</text>
            <view class="ib-pbox">
              <text class="ib-pchar" :style="{ color: wxColor(p.gan) }">{{ p.gan }}</text>
              <text class="ib-pchar" :style="{ color: wxColor(p.zhi) }">{{ p.zhi }}</text>
            </view>
          </view>
        </view>
        <view class="ib-info">
          <text class="ib-info-line">农历：2026年四月初一 {{ currentShiChen }}时</text>
          <text class="ib-info-line">公历：{{ dateStr }} {{ timeStr }}</text>
        </view>
      </view>
      <view class="ib-right">
        <text class="ib-shichen">{{ currentShiChen }}时</text>
        <text class="ib-clock">{{ timeStr }}</text>
        <view class="ib-btn">
          <app-icon name="zap" :size="28" color="#ffffff" />
          <text class="ib-btn-text">即时排盘</text>
        </view>
      </view>
    </view>
</template>

<style scoped lang="scss">
.ib-card { background: var(--card); border-radius: 32rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); border: 2rpx solid rgba(0,0,0,0.06); overflow: hidden; }
.ib-head { padding: 20rpx 32rpx; background: var(--bg-paper); border-bottom: 2rpx solid rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: space-between; }
.ib-head-l { display: flex; align-items: center; gap: 16rpx; }
.ib-bar { width: 8rpx; height: 32rpx; background: var(--indigo); border-radius: 999rpx; }
.ib-title { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.ib-head-r { display: flex; align-items: center; gap: 12rpx; }
.ib-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: #22c55e; }
.ib-live { font-size: 22rpx; color: var(--text-soft); }
.ib-body { padding: 32rpx; display: flex; align-items: center; gap: 40rpx; }
.ib-left { flex: 1; }
.ib-pillars { display: flex; align-items: center; gap: 28rpx; margin-bottom: 24rpx; }
.ib-pillar { text-align: center; }
.ib-plabel { font-size: 20rpx; color: #9ca3af; margin-bottom: 8rpx; display: block; }
.ib-pbox { background: rgba(0,0,0,0.04); border-radius: 16rpx; padding: 12rpx 20rpx; border: 2rpx solid rgba(0,0,0,0.06); }
.ib-pchar { font-size: 36rpx; font-weight: 700; line-height: 1.2; display: block; }
.ib-info { display: flex; flex-direction: column; gap: 4rpx; }
.ib-info-line { font-size: 22rpx; color: var(--text-soft); }
.ib-right { text-align: center; display: flex; flex-direction: column; align-items: center; }
.ib-shichen { font-size: 52rpx; font-weight: 700; color: var(--text-ink); }
.ib-clock { font-size: 32rpx; font-weight: 500; color: var(--indigo); margin-bottom: 20rpx; }
.ib-btn { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 40rpx; background: var(--brand); border-radius: 999rpx; box-shadow: 0 4rpx 12rpx rgba(196,30,58,0.2); }
.ib-btn-text { font-size: 26rpx; font-weight: 500; color: #fff; }
</style>
