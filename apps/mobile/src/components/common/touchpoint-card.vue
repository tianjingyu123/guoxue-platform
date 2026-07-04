<script setup lang="ts">
/**
 * 无痕商业化触点卡（触-P1 机制层·全平台唯一触点视觉，一处实现多处挂载）。
 * 设计：docs/design/无痕商业化触点体系-总方案-20260704.md §一
 * - 雅致小卡·暖金弱商业感·「为你准备」小字（永不像广告）
 * - 曝光埋点：卡实际渲染（onMounted）才报 view；点击报 click 后跳 link
 * - 用法（父层拿 touchpointApi.get 结果后 v-if 挂载·每页至多一个触点）：
 *     <touchpoint-card v-if="tp.card" :card="tp.card" scene="levelup_course" />
 */
import { onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { reportTouchpoint, type TouchpointCard } from '@/lib/touchpoint-data'

const props = defineProps<{
  /** 服务端裁决下发的触点卡 */
  card: TouchpointCard
  /** 触点场景 key（埋点归因用） */
  scene: string
}>()

onMounted(() => {
  // 卡实际渲染才算一次曝光（与服务端 24h 频控口径一致）
  reportTouchpoint(props.scene, 'view', { skuType: props.card.skuType, skuId: props.card.skuId })
})

function onTap() {
  reportTouchpoint(props.scene, 'click', { skuType: props.card.skuType, skuId: props.card.skuId })
  if (props.card.link) navigateTo(props.card.link)
}
</script>

<template>
  <view class="tp-card btn-press" @tap="onTap">
    <view v-if="card.cover" class="tp-card__cover">
      <image :src="card.cover" mode="aspectFill" class="tp-card__img" lazy-load />
    </view>
    <view class="tp-card__body">
      <text class="tp-card__hint">为你准备</text>
      <text class="tp-card__title">{{ card.title }}</text>
      <text class="tp-card__reason">{{ card.reason }}</text>
    </view>
    <text class="tp-card__arrow">›</text>
  </view>
</template>

<style scoped lang="scss">
/* 暖金·弱商业感：米金底 + 细金边，克制不抢内容 */
.tp-card {
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin: $space-md;
  padding: $space-sm $space-md;
  background: linear-gradient(135deg, #fbf7ee 0%, #f7f0e0 100%);
  border: 1rpx solid rgba(178, 143, 78, 0.28);
  border-radius: $radius-lg;
}
.tp-card__cover {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  border-radius: $radius-md;
  overflow: hidden;
}
.tp-card__img {
  display: block;
  width: 100%;
  height: 100%;
}
.tp-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.tp-card__hint {
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: #a8853b;
}
.tp-card__title {
  font-size: $font-md;
  font-weight: 600;
  color: var(--text-strong);
  @include ellipsis;
}
.tp-card__reason {
  font-size: $font-xs;
  color: var(--text-soft);
  @include line-clamp(2);
}
.tp-card__arrow {
  flex-shrink: 0;
  font-size: 40rpx;
  line-height: 1;
  color: rgba(168, 133, 59, 0.6);
}
</style>
