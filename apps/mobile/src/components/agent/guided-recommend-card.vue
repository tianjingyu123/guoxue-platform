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
  --guide-color: #35536f;
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
  padding: 18rpx;
  border: 1rpx solid rgba(53, 83, 111, 0.16);
  border-radius: 18rpx;
  background: #f7f9fa;
  box-shadow: 0 8rpx 22rpx rgba(33, 48, 63, 0.05);
}

.guide-card--classic { --guide-color: #775634; background: #faf7f1; border-color: rgba(119, 86, 52, 0.18); }
.guide-card--media { --guide-color: #4e5e83; background: #f6f7fb; border-color: rgba(78, 94, 131, 0.17); }
.guide-card--live { --guide-color: #ae2944; background: #fcf5f6; border-color: rgba(174, 41, 68, 0.16); }
.guide-card--agent { --guide-color: #5d62aa; background: #f5f6ff; border-color: rgba(93, 98, 170, 0.18); }
.guide-card--tool { --guide-color: #27776f; background: #f2f8f7; border-color: rgba(39, 119, 111, 0.17); }
.guide-card--course { --guide-color: #845331; background: #faf7f3; border-color: rgba(132, 83, 49, 0.16); }
.guide-card--circle { --guide-color: #39755f; background: #f4f8f6; border-color: rgba(57, 117, 95, 0.16); }
.guide-card--product { --guide-color: #925f2d; background: #fbf7f1; border-color: rgba(146, 95, 45, 0.17); }

.guide-visual {
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.72);
  color: var(--guide-color);
}

.guide-cover { width: 100%; height: 100%; display: block; }
.guide-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.guide-copy { flex: 1; min-width: 0; }
.guide-kicker { display: flex; align-items: center; gap: 10rpx; margin-bottom: 4rpx; }
.guide-label { font-size: 19rpx; font-weight: 700; letter-spacing: 1rpx; color: var(--guide-color); }
.guide-commerce { font-size: 18rpx; color: #8e8278; }
.guide-title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 27rpx; font-weight: 700; color: #252c32; }
.guide-description { display: block; margin-top: 5rpx; font-size: 21rpx; line-height: 1.4; color: #7c858d; @include line-clamp(2); }

.guide-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--guide-color);
}
.guide-action__text { max-width: 64rpx; font-size: 20rpx; line-height: 1.25; font-weight: 700; text-align: right; }
.guide-action__arrow { font-size: 34rpx; line-height: 1; transition: transform 180ms ease; }
.guide-card:active .guide-action__arrow { transform: translateX(4rpx); }

@media (prefers-reduced-motion: reduce) {
  .guide-action__arrow { transition: none; }
}
</style>
