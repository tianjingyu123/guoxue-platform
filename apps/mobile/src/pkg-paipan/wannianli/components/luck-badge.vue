<script setup lang="ts">
/**
 * 【万年历子组件】吉凶三态徽记（自 V0 components/common/luck-badge.tsx 还原）
 * 统一吉/凶/平的语义配色，用于宜忌、时辰、冲煞等。
 */
import { computed } from 'vue'
import type { LuckLevel } from '@/lib/paipan/types'

const props = withDefaults(defineProps<{
  luck: LuckLevel
  /** 自定义显示文字，默认吉/凶/平 */
  label?: string
  size?: 'sm' | 'md'
  /** 实心/柔底 */
  variant?: 'solid' | 'soft'
}>(), {
  size: 'md',
  variant: 'soft',
})

const LUCK_TEXT: Record<LuckLevel, string> = { good: '吉', bad: '凶', neutral: '平' }
const text = computed(() => props.label ?? LUCK_TEXT[props.luck])
</script>

<template>
  <view class="lb" :class="[`lb-${size}`, `lb-${variant}-${luck}`]">
    <text class="lb-text" :class="[`lb-text-${size}`, `lb-t-${variant}-${luck}`]">{{ text }}</text>
  </view>
</template>

<style scoped lang="scss">
$good: #2f9d6a;
$good-soft: rgba(47, 157, 106, 0.12);
$bad-soft: rgba(196, 30, 58, 0.1);

.lb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}
.lb-sm { min-width: 40rpx; padding: 4rpx 12rpx; }
.lb-md { min-width: 56rpx; padding: 8rpx 16rpx; }
.lb-text {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-weight: 600;
  line-height: 1.3;
}
.lb-text-sm { font-size: 24rpx; }
.lb-text-md { font-size: 28rpx; }

/* 实心 */
.lb-solid-good { background: $good; }
.lb-solid-bad { background: var(--brand); }
.lb-solid-neutral { background: var(--text-soft); }
.lb-t-solid-good, .lb-t-solid-bad, .lb-t-solid-neutral { color: #ffffff; }

/* 柔底 */
.lb-soft-good { background: $good-soft; }
.lb-soft-bad { background: $bad-soft; }
.lb-soft-neutral { background: var(--muted); }
.lb-t-soft-good { color: $good; }
.lb-t-soft-bad { color: var(--brand); }
.lb-t-soft-neutral { color: var(--text-soft); }
</style>
