<script setup lang="ts">
/**
 * 【小成图】六爻卦图（自 V0 app/xiaochengtu/result/page.tsx HexFigure 还原）
 * 阳爻朱红整条、阴爻墨色两段；动爻加红晕描边（V0 ring 改 box-shadow）。
 * lines 自下而上（lines[0]=初爻），展示用 column-reverse 上爻在顶。
 */
withDefaults(defineProps<{
  /** 六爻，自下而上，true=阳 */
  lines: boolean[]
  /** 动爻位 1~6（自下而上），0/不传=无动爻 */
  dong?: number
}>(), {
  dong: 0,
})
</script>

<template>
  <view class="xhf">
    <view
      v-for="(yang, i) in lines"
      :key="i"
      class="xhf-row"
    >
      <view
        v-if="yang"
        class="xhf-bar xhf-yang"
        :class="{ 'xhf-dong': dong === i + 1 }"
      />
      <view
        v-else
        class="xhf-split"
      >
        <view
          class="xhf-bar xhf-yin"
          :class="{ 'xhf-dong': dong === i + 1 }"
        />
        <view
          class="xhf-bar xhf-yin"
          :class="{ 'xhf-dong': dong === i + 1 }"
        />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.xhf {
  display: flex;
  flex-direction: column-reverse;
  gap: 12rpx;
  width: 128rpx;
}
.xhf-row { width: 100%; }
.xhf-bar { height: 16rpx; border-radius: 4rpx; }
.xhf-yang { width: 100%; background: rgba(185, 28, 28, 0.85); }
.xhf-split { display: flex; justify-content: space-between; width: 100%; }
.xhf-split .xhf-bar { width: 44%; }
.xhf-yin { background: rgba(43, 38, 32, 0.85); }
.xhf-dong { box-shadow: 0 0 0 4rpx rgba(252, 165, 165, 0.9); }
</style>
