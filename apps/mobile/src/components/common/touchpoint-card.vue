<script setup lang="ts">
/**
 * 内容原生触点：像阅读旁注，不像商城货架。
 * 商业属性通过类型标签明确告知；标题与理由承担“为什么此刻出现”的解释。
 */
import { computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { reportTouchpoint, type TouchpointCard } from '@/lib/touchpoint-data'

const props = defineProps<{
  card: TouchpointCard
  scene: string
}>()

const meta = computed(() => {
  if (props.card.skuType === 'product') return { label: '相关商品', action: '查看详情', tone: 'commerce' }
  if (props.card.skuType === 'member') return { label: '会员权益', action: '了解权益', tone: 'member' }
  return { label: props.scene === 'classic_course' ? '延伸精讲' : '相关课程', action: '继续学习', tone: 'learning' }
})

onMounted(() => {
  reportTouchpoint(props.scene, 'view', { skuType: props.card.skuType, skuId: props.card.skuId })
})

function onTap() {
  reportTouchpoint(props.scene, 'click', { skuType: props.card.skuType, skuId: props.card.skuId })
  if (props.card.link) navigateTo(props.card.link)
}
</script>

<template>
  <view class="curation-note btn-press" :class="`curation-note--${meta.tone}`" @tap="onTap">
    <view class="note-spine">
      <view class="spine-dot" />
      <view class="spine-line" />
      <view class="spine-dot spine-dot--muted" />
    </view>
    <view v-if="card.cover" class="note-cover">
      <image :src="card.cover" mode="aspectFill" class="note-cover__img" lazy-load />
    </view>
    <view class="note-copy">
      <view class="note-eyebrow">
        <text class="note-label">{{ meta.label }}</text>
        <text class="note-context">此处相关</text>
      </view>
      <text class="note-title">{{ card.title }}</text>
      <text class="note-reason">{{ card.reason }}</text>
    </view>
    <view class="note-action">
      <text class="note-action__text">{{ meta.action }}</text>
      <text class="note-action__arrow">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.curation-note {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 18rpx;
  margin: 28rpx 24rpx;
  min-height: 150rpx;
  padding: 22rpx 22rpx 22rpx 18rpx;
  overflow: hidden;
  border: 1rpx solid rgba(45, 65, 86, 0.16);
  border-radius: 20rpx;
  background: #f5f7f8;
  box-shadow: 0 10rpx 28rpx rgba(30, 45, 60, 0.06);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.curation-note--commerce {
  border-color: rgba(146, 101, 54, 0.2);
  background: #faf7f1;
}

.curation-note--member {
  border-color: rgba(88, 78, 143, 0.18);
  background: #f7f6fb;
}

.note-spine {
  width: 10rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 7rpx 0;
}

.spine-dot {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: #31516d;
}

.curation-note--commerce .spine-dot { background: #9a6e3c; }
.curation-note--member .spine-dot { background: #655c9c; }
.spine-dot--muted { opacity: 0.35; }

.spine-line {
  width: 1rpx;
  flex: 1;
  min-height: 58rpx;
  background: rgba(49, 81, 109, 0.25);
}

.note-cover {
  width: 102rpx;
  min-height: 106rpx;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 14rpx;
  background: #e8ecef;
}

.note-cover__img {
  display: block;
  width: 100%;
  height: 100%;
}

.note-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6rpx;
}

.note-eyebrow {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.note-label {
  font-size: 20rpx;
  line-height: 1;
  letter-spacing: 1rpx;
  color: #31516d;
  font-weight: 700;
}

.curation-note--commerce .note-label { color: #8b6132; }
.curation-note--member .note-label { color: #655c9c; }

.note-context {
  font-size: 18rpx;
  color: #9ca4ab;
}

.note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 29rpx;
  line-height: 1.35;
  font-weight: 700;
  color: #27313b;
}

.note-reason {
  font-size: 22rpx;
  line-height: 1.45;
  color: #737e87;
  @include line-clamp(2);
}

.note-action {
  flex-shrink: 0;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 3rpx;
  color: #31516d;
}

.curation-note--commerce .note-action { color: #8b6132; }
.curation-note--member .note-action { color: #655c9c; }

.note-action__text {
  font-size: 21rpx;
  font-weight: 700;
}

.note-action__arrow {
  font-size: 34rpx;
  line-height: 1;
  transition: transform 180ms ease;
}

.curation-note:active {
  transform: translateY(2rpx);
  box-shadow: 0 5rpx 16rpx rgba(30, 45, 60, 0.05);
}

.curation-note:active .note-action__arrow {
  transform: translateX(4rpx);
}

@media (prefers-reduced-motion: reduce) {
  .curation-note,
  .note-action__arrow { transition: none; }
}
</style>
