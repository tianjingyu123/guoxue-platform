<script setup lang="ts">
/**
 * 八字盘面卡（对话内富消息 · type = "bazi-card"）
 *
 * 载荷契约（后端 zhixuan.service.ts BaziCardPayload）：
 * { gender, year, month, day, hour, minute, shengXiao, lunarDate, kongWang?,
 *   siZhu: { nian|yue|ri|shi: { gan, zhi } }, wuXing?: { mu,huo,tu,jin,shui }, geJu? }
 *
 * 天干地支按五行着色（--wuxing-* token），底部「查看完整排盘」深链
 * /paipan/bazi/result?year=...（result 页 onLoad 支持 query 生辰参数）。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

interface Pillar { gan: string; zhi: string }
interface BaziPayload {
  name?: string
  gender?: string
  year?: number
  month?: number
  day?: number
  hour?: number
  minute?: number
  shengXiao?: string
  lunarDate?: string
  kongWang?: string
  siZhu?: { nian?: Pillar; yue?: Pillar; ri?: Pillar; shi?: Pillar }
  wuXing?: { mu?: number; huo?: number; tu?: number; jin?: number; shui?: number }
  geJu?: { name?: string; yongShen?: string }
}

const props = defineProps<{ payload: unknown }>()

const data = computed<BaziPayload>(() => (props.payload || {}) as BaziPayload)

// 干支 → 五行（着色用）
const GAN_WX: Record<string, string> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
  己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
}
const ZHI_WX: Record<string, string> = {
  寅: 'wood', 卯: 'wood', 巳: 'fire', 午: 'fire',
  辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
  申: 'metal', 酉: 'metal', 亥: 'water', 子: 'water',
}
function wxOfGan(g?: string): string { return GAN_WX[g || ''] || 'earth' }
function wxOfZhi(z?: string): string { return ZHI_WX[z || ''] || 'earth' }

const pillars = computed(() => {
  const sz = data.value.siZhu || {}
  return [
    { label: '年柱', p: sz.nian },
    { label: '月柱', p: sz.yue },
    { label: '日柱', p: sz.ri },
    { label: '时柱', p: sz.shi },
  ]
})

// 五行分布条（按能量占比）
const WX_META = [
  { key: 'mu', label: '木', cls: 'wood' },
  { key: 'huo', label: '火', cls: 'fire' },
  { key: 'tu', label: '土', cls: 'earth' },
  { key: 'jin', label: '金', cls: 'metal' },
  { key: 'shui', label: '水', cls: 'water' },
] as const
const wuxingBars = computed(() => {
  const wx = data.value.wuXing
  if (!wx) return []
  const vals = WX_META.map((m) => ({ ...m, value: Number(wx[m.key]) || 0 }))
  const max = Math.max(...vals.map((v) => v.value), 1)
  return vals.map((v) => ({ ...v, percent: Math.round((v.value / max) * 100) }))
})

const birthLine = computed(() => {
  const d = data.value
  if (!d.year) return ''
  const hm = `${String(d.hour ?? 0).padStart(2, '0')}:${String(d.minute ?? 0).padStart(2, '0')}`
  return `${d.gender || ''} · 公历 ${d.year}年${d.month}月${d.day}日 ${hm}`
})

function goFullResult() {
  const d = data.value
  if (!d.year) {
    navigateTo('/paipan/bazi/index')
    return
  }
  const q = [
    `year=${d.year}`,
    `month=${d.month}`,
    `day=${d.day}`,
    `hour=${d.hour ?? 0}`,
    `minute=${d.minute ?? 0}`,
    `gender=${encodeURIComponent(d.gender || '男')}`,
    ...(d.name ? [`name=${encodeURIComponent(d.name)}`] : []),
  ].join('&')
  navigateTo(`/paipan/bazi/result?${q}`)
}
</script>

<template>
  <view class="bazi-card">
    <!-- 卡头：金线描边宣纸质感 -->
    <view class="bc-head">
      <view class="bc-head-left">
        <view class="bc-seal"><text class="bc-seal-txt">盘</text></view>
        <view class="bc-head-info">
          <text class="bc-title">八字命盘</text>
          <text v-if="birthLine" class="bc-sub">{{ birthLine }}</text>
        </view>
      </view>
      <text v-if="data.shengXiao" class="bc-shengxiao">{{ data.shengXiao }}</text>
    </view>

    <text v-if="data.lunarDate" class="bc-lunar">农历 {{ data.lunarDate }}</text>

    <!-- 四柱盘面 -->
    <view class="bc-pillars">
      <view v-for="col in pillars" :key="col.label" class="bc-col">
        <text class="bc-col-label">{{ col.label }}</text>
        <view class="bc-char" :class="'wx-' + wxOfGan(col.p?.gan)">
          <text class="bc-char-txt">{{ col.p?.gan || '—' }}</text>
        </view>
        <view class="bc-char" :class="'wx-' + wxOfZhi(col.p?.zhi)">
          <text class="bc-char-txt">{{ col.p?.zhi || '—' }}</text>
        </view>
      </view>
    </view>

    <!-- 五行分布 -->
    <view v-if="wuxingBars.length" class="bc-wuxing">
      <view v-for="bar in wuxingBars" :key="bar.key" class="bc-wx-row">
        <text class="bc-wx-label" :class="'wxt-' + bar.cls">{{ bar.label }}</text>
        <view class="bc-wx-track">
          <view class="bc-wx-fill" :class="'wxf-' + bar.cls" :style="{ width: bar.percent + '%' }" />
        </view>
        <text class="bc-wx-val">{{ bar.value }}</text>
      </view>
    </view>

    <!-- 格局 -->
    <view v-if="data.geJu?.name" class="bc-geju">
      <text class="bc-geju-tag">{{ data.geJu.name }}</text>
      <text v-if="data.geJu.yongShen" class="bc-geju-yong">用神 · {{ data.geJu.yongShen }}</text>
    </view>

    <!-- 深链完整排盘 -->
    <view class="bc-footer" @tap="goFullResult">
      <text class="bc-footer-txt">查看完整排盘</text>
      <AppIcon name="chevron-right" :size="26" color="#c9a96e" />
    </view>
  </view>
</template>

<style scoped>
.bazi-card {
  width: 100%;
  box-sizing: border-box;
  background: var(--card, #ffffff);
  border: 2rpx solid rgba(201, 169, 110, 0.45);
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 6rpx 24rpx rgba(140, 108, 60, 0.08);
}

/* 卡头 */
.bc-head { display: flex; align-items: center; justify-content: space-between; }
.bc-head-left { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.bc-seal {
  width: 56rpx; height: 56rpx; border-radius: 12rpx; flex-shrink: 0;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 10rpx rgba(196, 30, 58, 0.25);
}
.bc-seal-txt { font-size: 30rpx; color: #fff; font-weight: 700; font-family: var(--font-serif, serif); }
.bc-head-info { display: flex; flex-direction: column; min-width: 0; }
.bc-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); font-family: var(--font-serif, serif); }
.bc-sub { font-size: 22rpx; color: var(--text-soft, #999); margin-top: 4rpx; }
.bc-shengxiao {
  flex-shrink: 0; font-size: 22rpx; color: #8b7355;
  background: rgba(201, 169, 110, 0.14); border-radius: 999rpx; padding: 6rpx 18rpx;
}
.bc-lunar { display: block; font-size: 22rpx; color: var(--text-soft, #999); margin-top: 12rpx; }

/* 四柱 */
.bc-pillars {
  display: flex; gap: 16rpx; margin-top: 24rpx;
  padding: 24rpx 16rpx;
  background: var(--bg-paper, #faf8f5);
  border-radius: 16rpx;
}
.bc-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.bc-col-label { font-size: 20rpx; color: var(--text-soft, #999); letter-spacing: 2rpx; }
.bc-char {
  width: 72rpx; height: 72rpx; border-radius: 14rpx;
  display: flex; align-items: center; justify-content: center;
}
.bc-char-txt { font-size: 40rpx; font-weight: 700; font-family: var(--font-serif, serif); color: inherit; }
/* 五行着色（字色+浅底衬，避免红底红字） */
.wx-wood { background: rgba(45, 138, 78, 0.10); color: var(--wuxing-wood, #2d8a4e); }
.wx-fire { background: rgba(196, 30, 58, 0.08); color: var(--wuxing-fire, #c41e3a); }
.wx-earth { background: rgba(184, 134, 11, 0.10); color: var(--wuxing-earth, #b8860b); }
.wx-metal { background: rgba(201, 169, 110, 0.14); color: #a8863d; }
.wx-water { background: rgba(26, 111, 199, 0.10); color: var(--wuxing-water, #1a6fc7); }

/* 五行分布条 */
.bc-wuxing { margin-top: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.bc-wx-row { display: flex; align-items: center; gap: 16rpx; }
.bc-wx-label { width: 32rpx; font-size: 24rpx; font-weight: 600; text-align: center; font-family: var(--font-serif, serif); }
.wxt-wood { color: var(--wuxing-wood, #2d8a4e); }
.wxt-fire { color: var(--wuxing-fire, #c41e3a); }
.wxt-earth { color: var(--wuxing-earth, #b8860b); }
.wxt-metal { color: #a8863d; }
.wxt-water { color: var(--wuxing-water, #1a6fc7); }
.bc-wx-track { flex: 1; height: 12rpx; border-radius: 999rpx; background: var(--surface-sunken, #f2efea); overflow: hidden; }
.bc-wx-fill { height: 100%; border-radius: 999rpx; min-width: 6rpx; transition: width 0.5s ease; }
.wxf-wood { background: var(--wuxing-wood, #2d8a4e); }
.wxf-fire { background: var(--wuxing-fire, #c41e3a); }
.wxf-earth { background: var(--wuxing-earth, #b8860b); }
.wxf-metal { background: var(--gold, #c9a96e); }
.wxf-water { background: var(--wuxing-water, #1a6fc7); }
.bc-wx-val { width: 56rpx; font-size: 22rpx; color: var(--text-soft, #999); text-align: right; }

/* 格局 */
.bc-geju { display: flex; align-items: center; gap: 16rpx; margin-top: 20rpx; }
.bc-geju-tag {
  font-size: 22rpx; color: var(--brand, #c41e3a);
  background: rgba(196, 30, 58, 0.08); border-radius: 8rpx; padding: 4rpx 14rpx;
}
.bc-geju-yong { font-size: 22rpx; color: var(--text-soft, #999); }

/* 底部深链 */
.bc-footer {
  margin-top: 24rpx; padding-top: 20rpx;
  border-top: 1rpx solid rgba(201, 169, 110, 0.25);
  display: flex; align-items: center; justify-content: center; gap: 4rpx;
}
.bc-footer-txt { font-size: 24rpx; color: #a8863d; }
</style>
