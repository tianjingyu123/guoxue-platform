<script setup lang="ts">
/**
 * 【万年历子组件】干支柱（自 V0 components/common/ganzhi-pillar.tsx 还原）
 * 展示单柱：天干 / 地支（按五行着色）+ 可选十神、藏干、纳音。
 */
import type { GanZhiPillar } from '@/lib/paipan/types'

withDefaults(defineProps<{
  pillar: GanZhiPillar
  /** 是否显示十神/藏干/纳音等扩展信息 */
  detailed?: boolean
  /** 是否高亮此柱（如日柱） */
  highlight?: boolean
}>(), {
  detailed: false,
  highlight: false,
})
</script>

<template>
  <view class="gz" :class="{ 'gz-hl': highlight }">
    <text class="gz-label">{{ pillar.label }}</text>
    <text v-if="detailed && pillar.ganShiShen" class="gz-sub">{{ pillar.ganShiShen }}</text>
    <view class="gz-chars">
      <text class="gz-char" :class="`wx-${pillar.ganWuxing}`">{{ pillar.gan }}</text>
      <text class="gz-char" :class="`wx-${pillar.zhiWuxing}`">{{ pillar.zhi }}</text>
    </view>
    <text v-if="detailed && pillar.cangGan && pillar.cangGan.length" class="gz-sub">藏 {{ pillar.cangGan.join(' ') }}</text>
    <text v-if="detailed && pillar.naYin" class="gz-sub">{{ pillar.naYin }}</text>
  </view>
</template>

<style scoped lang="scss">
.gz {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  background: rgba(240, 235, 229, 0.4);
}
.gz-hl {
  background: rgba(196, 30, 58, 0.05);
  box-shadow: inset 0 0 0 2rpx rgba(196, 30, 58, 0.25);
}
.gz-label { font-size: 24rpx; color: var(--text-soft); }
.gz-sub { font-size: 22rpx; color: var(--text-soft); line-height: 1.4; }
.gz-chars { display: flex; flex-direction: column; align-items: center; }
.gz-char {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.25;
}
</style>
