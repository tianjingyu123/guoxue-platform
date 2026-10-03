<script setup lang="ts">
/**
 * 【万年历子组件】五行比例条（自 V0 components/common/wuxing-bar.tsx 还原）
 * 以横向条形展示金木水火土占比（今日八字五行个数）。
 */
import { computed } from 'vue'
import type { WuXing, WuXingRatio } from '@/lib/paipan/types'

const props = defineProps<{
  data: WuXingRatio[]
}>()

const WUXING_LABEL: Record<WuXing, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
}

const max = computed(() => Math.max(...props.data.map((d) => d.value), 1))

function widthOf(item: WuXingRatio): string {
  return `${(item.value / max.value) * 100}%`
}
</script>

<template>
  <view class="wb">
    <view v-for="item in data" :key="item.wuxing" class="wb-row">
      <text class="wb-name" :class="`wx-${item.wuxing}`">{{ WUXING_LABEL[item.wuxing] }}</text>
      <view class="wb-track">
        <view class="wb-fill" :class="`wb-fill-${item.wuxing}`" :style="{ width: widthOf(item) }" />
      </view>
      <text class="wb-value">{{ item.label ?? String(item.value) }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.wb { display: flex; flex-direction: column; gap: 20rpx; }
.wb-row { display: flex; align-items: center; gap: 24rpx; }
.wb-name {
  width: 40rpx;
  flex-shrink: 0;
  text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
}
.wb-track {
  height: 20rpx;
  flex: 1;
  overflow: hidden;
  border-radius: 999rpx;
  background: var(--muted);
}
.wb-fill { height: 100%; border-radius: 999rpx; }
.wb-fill-wood { background: var(--wuxing-wood); }
.wb-fill-fire { background: var(--wuxing-fire); }
.wb-fill-earth { background: var(--wuxing-earth); }
.wb-fill-metal { background: var(--wuxing-metal); }
.wb-fill-water { background: var(--wuxing-water); }
.wb-value {
  width: 72rpx;
  flex-shrink: 0;
  text-align: right;
  font-size: 24rpx;
  color: var(--text-soft);
}
</style>
