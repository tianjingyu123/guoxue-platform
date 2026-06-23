<script setup lang="ts">
/**
 * 统一免责声明 / 风险提示组件（从原型 components/compliance/disclaimer.tsx 1:1 迁移）
 * 全平台合规文案的唯一出口，确保样式、措辞、位置统一。
 * 命理/AI/中医养生/保健品/直播等敏感场景必须展示。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

type Variant = 'fortune' | 'ai' | 'medical' | 'product' | 'entertainment' | 'custom'
type Tone = 'subtle' | 'card' | 'inline'

const props = withDefaults(defineProps<{ variant?: Variant; text?: string; tone?: Tone }>(), {
  variant: 'fortune',
  tone: 'subtle',
})

const PRESETS: Record<Exclude<Variant, 'custom'>, { icon: string; text: string }> = {
  fortune: { icon: 'sparkles', text: '以上内容由 AI 生成，仅供传统文化研习参考，不构成任何预测或建议。' },
  ai: { icon: 'sparkles', text: 'AI 生成内容仅供参考，请理性看待，重要决策请咨询专业人士。' },
  medical: { icon: 'heart-pulse', text: '本内容为健康科普，不替代专业医疗诊断与治疗，如有不适请及时就医。' },
  product: { icon: 'shield-alert', text: '保健食品不能替代药品，不具有疾病预防或治疗功能，请理性选购。' },
  entertainment: { icon: 'info', text: '直播内容仅供娱乐参考，请勿盲信，理性消费。' },
}

const iconName = computed(() => (props.variant === 'custom' ? 'info' : PRESETS[props.variant].icon))
const content = computed(() => (props.variant === 'custom' ? props.text ?? '' : PRESETS[props.variant].text))
</script>

<template>
  <text v-if="!content" />
  <!-- 行内徽标 -->
  <view v-else-if="tone === 'inline'" class="dc-inline">
    <app-icon :name="iconName" :size="24" color="#ffffff" />
    <text class="dc-inline-text">{{ content }}</text>
  </view>
  <!-- 卡片式 -->
  <view v-else-if="tone === 'card'" class="dc-card">
    <app-icon :name="iconName" :size="28" color="#f59e0b" />
    <text class="dc-card-text">{{ content }}</text>
  </view>
  <!-- 极弱化（默认） -->
  <view v-else class="dc-subtle">
    <app-icon :name="iconName" :size="24" color="#999999" />
    <text class="dc-subtle-text">{{ content }}</text>
</template>

<style scoped lang="scss">
.dc-inline {
  display: inline-flex; align-items: center; gap: 8rpx;
  padding: 4rpx 16rpx; border-radius: 999rpx;
  background: rgba(0,0,0,0.4);
}
.dc-inline-text { font-size: 20rpx; font-weight: 500; color: #fff; }

.dc-card {
  display: flex; align-items: flex-start; gap: 16rpx;
  padding: 20rpx 24rpx; border-radius: 16rpx;
  border: 2rpx solid rgba(251,191,36,0.5);
  background: #fffbeb;
}
.dc-card-text { flex: 1; font-size: 22rpx; line-height: 1.6; color: #b45309; }

.dc-subtle {
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
  padding: 24rpx 32rpx;
}
.dc-subtle-text { font-size: 20rpx; line-height: 1.6; color: rgba(153,153,153,0.8); text-align: center; }
</style>
