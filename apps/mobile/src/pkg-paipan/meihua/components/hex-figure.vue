<script setup lang="ts">
/**
 * 【梅花易数】卦形组件（自 V0 app/meihua/result/page.tsx HexFigure 还原）
 * 爻画用 CSS view 绘制：阳爻整条 / 阴爻两段；动爻标红。
 * lines 自下而上（lines[0]=初爻），展示用 column-reverse 上爻在顶。
 */
withDefaults(defineProps<{
  /** 六爻，自下而上，true=阳 */
  lines: boolean[]
  /** 动爻位 1~6（自下而上），0/不传=无动爻 */
  moving?: number
  size?: 'sm' | 'md'
}>(), {
  moving: 0,
  size: 'md',
})
</script>

<template>
  <view class="hf" :class="`hf-${size}`">
    <view v-for="(yang, i) in lines" :key="i" class="hf-row">
      <view v-if="yang" class="hf-bar" :class="{ 'hf-moving': moving === i + 1 }" />
      <view v-else class="hf-split">
        <view class="hf-bar" :class="{ 'hf-moving': moving === i + 1 }" />
        <view class="hf-bar" :class="{ 'hf-moving': moving === i + 1 }" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.hf {
  display: flex;
  flex-direction: column-reverse;
  width: 100%;
}
.hf-row { width: 100%; }
.hf-bar {
  background: var(--text-ink);
  border-radius: 2rpx;
  width: 100%;
}
.hf-moving { background: #ef4444; }
.hf-split { display: flex; width: 100%; }
.hf-split .hf-bar { flex: 1; }

/* 小号（五卦并列） */
.hf-sm { gap: 10rpx; }
.hf-sm .hf-bar { height: 10rpx; }
.hf-sm .hf-split { gap: 8rpx; }

/* 中号（详解抽屉） */
.hf-md { gap: 14rpx; }
.hf-md .hf-bar { height: 14rpx; }
.hf-md .hf-split { gap: 12rpx; }
</style>
