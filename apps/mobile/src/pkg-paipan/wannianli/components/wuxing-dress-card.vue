<script setup lang="ts">
/**
 * 【万年历子组件】五行穿衣 · 今日吉色（自 V0 components/common/wuxing-dress-card.tsx 还原）
 * 大吉/次吉/小吉/不宜/忌 的衣色建议。
 * 取舍：图标库无 shirt 图标，改用按五行着色的圆形色板表达"颜色系"，信息不丢。
 */
import type { WuxingDress } from '@/lib/paipan/types'

defineProps<{
  items: WuxingDress[]
}>()
</script>

<template>
  <view class="wd">
    <view v-for="item in items" :key="item.level" class="wd-item">
      <view class="wd-swatch" :class="`wd-swatch-${item.wuxing}`" />
      <text class="wd-level" :class="`wd-level-${item.luck}`">{{ item.level }}</text>
      <text class="wd-color">{{ item.color }}</text>
      <text v-if="item.note" class="wd-note">{{ item.note }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.wd {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.wd-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  border-radius: 20rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  padding: 24rpx 8rpx;
  text-align: center;
}
.wd-swatch {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2rpx rgba(0, 0, 0, 0.06);
}
.wd-swatch-wood { background: var(--wuxing-wood); }
.wd-swatch-fire { background: var(--wuxing-fire); }
.wd-swatch-earth { background: var(--wuxing-earth); }
.wd-swatch-metal { background: var(--wuxing-metal); }
.wd-swatch-water { background: var(--wuxing-water); }
.wd-level {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
}
.wd-level-good { color: #2f9d6a; }
.wd-level-bad { color: var(--brand); }
.wd-level-neutral { color: var(--text-soft); }
.wd-color { font-size: 24rpx; color: var(--text); }
.wd-note { font-size: 22rpx; line-height: 1.4; color: var(--text-soft); }
</style>
