<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import type { RecommendItem } from '@/lib/agent-data'

const props = defineProps<{ item: RecommendItem }>()
const emit = defineEmits<{ tap: [item: RecommendItem] }>()

const META = {
  article: { label: '延伸阅读', action: '阅读全文', icon: 'file-text', tone: 'ink' },
  classic: { label: '原典', action: '翻开古籍', icon: 'book-open', tone: 'classic' },
  video: { label: '视频讲解', action: '立即观看', icon: 'play', tone: 'media' },
  live: { label: '直播', action: '查看直播', icon: 'radio', tone: 'live' },
  agent: { label: '智能向导', action: '开始对话', icon: 'bot', tone: 'agent' },
  tool: { label: '实用工具', action: '打开工具', icon: 'compass', tone: 'tool' },
  course: { label: '系统课程', action: '查看课程', icon: 'book-open', tone: 'course' },
  circle: { label: '交流空间', action: '进入圈子', icon: 'users', tone: 'circle' },
  product: { label: '相关商品', action: '查看详情', icon: 'shopping-bag', tone: 'product' },
  paipan: { label: '排盘工具', action: '打开工具', icon: 'compass', tone: 'tool' },
} as const

const meta = computed(() => META[props.item.type])
const data = computed<Record<string, any>>(() => props.item.data || {})
const title = computed(() => data.value.title || data.value.name || '相关内容')
const cover = computed(() => data.value.cover || data.value.coverUrl || data.value.avatar || data.value.images?.[0] || '')
const description = computed(() => (
  data.value.reason || data.value.excerpt || data.value.intro || data.value.description || '与当前问题直接相关'
))
const commerceMeta = computed(() => {
  if (!['course', 'circle', 'product', 'agent'].includes(props.item.type)) return ''
  const price = Number(data.value.price || 0)
  if (props.item.type === 'circle' && data.value.type === 'FREE') return '免费加入'
  if (props.item.type === 'agent' && data.value.isFree) return '免费使用'
  return price > 0 ? `¥${price}` : '免费'
})
</script>

<template>
  <view class="guide-card" :class="`guide-card--${meta.tone}`" @tap="emit('tap', item)">
    <view class="guide-visual">
      <image v-if="cover" class="guide-cover" :src="cover" mode="aspectFill" lazy-load />
      <view v-else class="guide-icon">
        <AppIcon :name="meta.icon" :size="30" color="currentColor" />
      </view>
    </view>
    <view class="guide-copy">
      <view class="guide-kicker">
        <text class="guide-label">{{ meta.label }}</text>
        <text v-if="commerceMeta" class="guide-commerce">{{ commerceMeta }}</text>
      </view>
      <text class="guide-title">{{ title }}</text>
      <text class="guide-description">{{ description }}</text>
    </view>
    <view class="guide-action">
      <text class="guide-action__text">{{ meta.action }}</text>
      <text class="guide-action__arrow">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.guide-card {
  --guide-color: var(--agent-accent, #2b8a82);
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-width: 0;
  min-height: 112rpx;
  padding: 16rpx;
  border: 1rpx solid var(--agent-border-soft, rgba(60, 60, 67, 0.10));
  border-radius: var(--agent-radius-md, 18rpx);
  background: var(--agent-surface, #fff);
  box-shadow: var(--agent-shadow, 0 8rpx 28rpx rgba(31, 35, 41, .06));
  transition: transform 180ms var(--agent-ease, ease), box-shadow 180ms var(--agent-ease, ease);
}

.guide-card:active { transform: scale(.985); box-shadow: 0 4rpx 16rpx rgba(31, 35, 41, 0.04); }
.guide-card--classic { --guide-color: #7a5a36; }
.guide-card--media { --guide-color: #5868a4; }
.guide-card--live { --guide-color: #b3314d; }
.guide-card--agent { --guide-color: #5c63a9; }
.guide-card--tool { --guide-color: #2b8a82; }
.guide-card--course { --guide-color: #94633b; }
.guide-card--circle { --guide-color: #39755f; }
.guide-card--product { --guide-color: #986633; }

.guide-visual {
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--agent-radius-sm, 12rpx);
  background: var(--agent-accent-soft, rgba(43, 138, 130, .10));
  color: var(--guide-color);
}

.guide-cover { width: 100%; height: 100%; display: block; }
.guide-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.guide-copy { flex: 1; min-width: 0; }
.guide-kicker { display: flex; align-items: center; gap: 10rpx; margin-bottom: 4rpx; }
.guide-label { font-size: 20rpx; font-weight: 600; letter-spacing: .5rpx; color: var(--guide-color); }
.guide-commerce { font-size: 19rpx; color: var(--agent-secondary, #6e6e73); }
.guide-title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 28rpx; font-weight: 600; color: var(--agent-ink, #1d1d1f); }
.guide-description { display: block; margin-top: 5rpx; font-size: 22rpx; line-height: 1.45; color: var(--agent-secondary, #6e6e73); @include line-clamp(2); }

.guide-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--guide-color);
  min-height: 88rpx;
}
.guide-action__text { max-width: 76rpx; font-size: 21rpx; line-height: 1.25; font-weight: 600; text-align: right; }
.guide-action__arrow { margin-left: 4rpx; font-size: 34rpx; line-height: 1; transition: transform 180ms var(--agent-ease, ease); }
.guide-card:active .guide-action__arrow { transform: translateX(4rpx); }

@media (prefers-reduced-motion: reduce) {
  .guide-card, .guide-action__arrow { transition: none; }
}
</style>
