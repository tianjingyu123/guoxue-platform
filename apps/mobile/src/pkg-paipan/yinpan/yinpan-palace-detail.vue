<script setup lang="ts">
/**
 * 阴盘奇门·宫位详解底部弹层（阴盘/命理两结果页共用）
 * 内容：先天宫/取数/地支 → 干支组合断语 → 门+干组合 → 天/地盘干单象。
 */
import { computed } from 'vue'
import { PALACE_NAMES } from '@/pkg-paipan/lib/qimen-engine'
import { PALACE_DIZHI } from '@/pkg-paipan/lib/qimen-engine'
import AppIcon from '@/components/common/app-icon.vue'
import {
  type PalaceData,
  XIANTIAN_GONG,
  PALACE_NUMS,
  GEJU_MEANINGS,
  MEN_COMBO,
  BAMEN_SHORT,
  GAN_XIANG,
} from './yinpan-core'

const props = defineProps<{
  palace: number
  data: PalaceData
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const title = computed(() => PALACE_NAMES[props.palace] || '')
const baseText = computed(() => {
  const zhis = (PALACE_DIZHI[props.palace] || []).join('，') || '无（中宫寄坤）'
  return `先天宫为${XIANTIAN_GONG[props.palace] || ''}宫。取数：${PALACE_NUMS[props.palace] || ''}。地支：${zhis}。`
})

/** 组合断语（干+干 / 门+干 / 门+开） */
const combos = computed(() => {
  const d = props.data
  const out: { label: string; text: string }[] = []
  if (d.tianGan && d.diGan) {
    const t = GEJU_MEANINGS[`${d.tianGan}+${d.diGan}`]
    if (t) out.push({ label: `${d.tianGan}+${d.diGan}`, text: t })
  }
  if (d.bamen) {
    const menShort = BAMEN_SHORT[d.bamen] || ''
    const menLabel = d.bamen.replace('门', '')
    const t1 = MEN_COMBO[`${menShort}+${d.tianGan}`]
    if (t1) out.push({ label: `${menLabel}+${d.tianGan}`, text: t1 })
    const t2 = MEN_COMBO[`${menShort}+开`]
    if (t2) out.push({ label: `${menLabel}+开`, text: t2 })
  }
  return out
})

/** 天/地盘干单象 */
const ganXiangs = computed(() => {
  const d = props.data
  const out: { gan: string; text: string }[] = []
  if (d.tianGan && GAN_XIANG[d.tianGan]) out.push({ gan: d.tianGan, text: GAN_XIANG[d.tianGan] || '' })
  if (d.diGan && d.diGan !== d.tianGan && GAN_XIANG[d.diGan]) out.push({ gan: d.diGan, text: GAN_XIANG[d.diGan] || '' })
  return out
})
</script>

<template>
  <view class="sheet">
    <view class="sheet-head">
      <text class="sheet-title">{{ title }} · 宫位详解</text>
      <view class="sheet-close" @tap="emit('close')">
        <app-icon name="x" :size="36" color="var(--text-soft)" />
      </view>
    </view>
    <scroll-view scroll-y class="sheet-body">
      <view class="sheet-inner">
        <view class="base-block">
          <text class="base-text"><text class="base-name">{{ title }}</text>：{{ baseText }}</text>
        </view>
        <view v-for="(c, i) in combos" :key="i" class="item">
          <text class="item-text"><text class="item-key">{{ c.label }}</text>：{{ c.text }}</text>
        </view>
        <view v-for="(g, i) in ganXiangs" :key="`g${i}`" class="item">
          <text class="item-text"><text class="item-key">{{ g.gan }}</text>：{{ g.text }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.sheet {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 40;
  background: var(--card);
  border-top: 2rpx solid var(--line);
  border-radius: 24rpx 24rpx 0 0;
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  max-height: 60vh;
}
.sheet-head {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
  border-bottom: 2rpx solid var(--line);
}
.sheet-title { font-family: $serif; font-size: 30rpx; font-weight: 700; color: var(--brand); }
.sheet-close { padding: 8rpx; margin-right: -8rpx; }
.sheet-body { flex: 1; min-height: 0; }
.sheet-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 20rpx; }
.base-block { background: rgba(0, 0, 0, 0.03); border-radius: 16rpx; padding: 20rpx 24rpx; }
.base-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.7; }
.base-name { color: var(--brand); font-weight: 600; }
.item { border-top: 2rpx solid var(--line); padding-top: 20rpx; }
.item-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.7; }
.item-key { color: #dc2626; font-weight: 600; }
</style>
