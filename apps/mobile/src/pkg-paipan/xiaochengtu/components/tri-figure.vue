<script setup lang="ts">
/**
 * 【小成图】三爻卦图（自 V0 app/xiaochengtu/result/page.tsx TriFigure 还原）
 * 按卦名取 BAGUA_LINES（自下而上），展示用 column-reverse 上爻在顶；墨色爻画。
 */
import { computed } from 'vue'
import { BAGUA_LINES } from '@/pkg-paipan/lib/meihua-data'

const props = defineProps<{
  /** 卦名（乾兑离震巽坎艮坤） */
  gua: string
}>()

const lines = computed<boolean[]>(() => BAGUA_LINES[props.gua] ?? [false, false, false])
</script>

<template>
  <view class="xtf">
    <view
      v-for="(yang, i) in lines"
      :key="i"
      class="xtf-row"
    >
      <view
        v-if="yang"
        class="xtf-bar xtf-full"
      />
      <view
        v-else
        class="xtf-split"
      >
        <view class="xtf-bar" />
        <view class="xtf-bar" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.xtf {
  display: flex;
  flex-direction: column-reverse;
  gap: 8rpx;
  width: 80rpx;
}
.xtf-row { width: 100%; }
.xtf-bar { height: 12rpx; border-radius: 4rpx; background: var(--text-ink); width: 44%; }
.xtf-full { width: 100%; }
.xtf-split { display: flex; justify-content: space-between; width: 100%; }
</style>
