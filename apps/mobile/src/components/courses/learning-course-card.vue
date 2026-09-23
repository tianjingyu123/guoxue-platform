<script setup lang="ts">
/** 课程卡：封面与真实发布信息保持统一层级。 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateToContent } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { formatCount, type CourseCardData } from '@/lib/card-utils'

const props = withDefaults(defineProps<{
  data: CourseCardData
  variant?: 'grid' | 'list'
}>(), { variant: 'grid' })

const hasPrice = computed(() => props.data.price != null && Number.isFinite(Number(props.data.price)))
const originalPrice = computed(() => {
  const value = Number(props.data.originalPrice)
  return hasPrice.value && Number.isFinite(value) && value > Number(props.data.price) ? value : null
})
const intro = computed(() => String(props.data.intro || '').trim())
const accessibilityLabel = computed(() => [
  `查看课程：${props.data.title}`,
  props.data.teacher ? `讲师 ${props.data.teacher}` : '',
  props.data.lessons ? `${props.data.lessons} 节` : '',
  props.data.free ? '免费' : hasPrice.value ? `价格 ${formatPrice(props.data.price)} 元` : '详情查看价格',
].filter(Boolean).join('，'))

function open(event?: unknown) { navigateToContent(`/course/${props.data.id}`, event) }
function openOnKeyboard(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  open(event)
}
</script>

<template>
  <view
    class="learning-card"
    :class="`learning-card--${variant}`"
    data-content-card
    role="link"
    :aria-label="accessibilityLabel"
    tabindex="0"
    hover-class="card-press"
    @tap="open"
    @keydown="openOnKeyboard"
  >
    <view class="cover">
      <smart-cover class="cover-image" :src="data.cover" :title="data.title" type="course" />
    </view>
    <view class="content">
      <text v-if="data.category" class="category">{{ data.category }}</text>
      <text class="title">{{ data.title }}</text>
      <text v-if="intro" class="intro">{{ intro }}</text>
      <view v-if="data.teacher || data.lessons || data.students" class="meta">
        <text v-if="data.teacher" class="meta-item">{{ data.teacher }}</text>
        <text v-if="data.lessons" class="meta-item">{{ data.lessons }} 节</text>
        <text v-if="data.students" class="meta-item">{{ formatCount(data.students) }} 人在学</text>
      </view>
      <view class="foot">
        <text v-if="data.free" class="free">免费</text>
        <text v-else-if="hasPrice" class="price">¥{{ formatPrice(data.price) }}</text>
        <text v-else class="price-pending">查看价格</text>
        <text v-if="!data.free && originalPrice != null" class="original-price">¥{{ formatPrice(originalPrice) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.learning-card {
  min-width: 0; overflow: hidden; box-sizing: border-box;
  border: 1rpx solid rgba(63, 48, 36, .1); border-radius: 22rpx;
  background: #fff; box-shadow: 0 5rpx 18rpx rgba(45, 36, 27, .05);
}
.card-press { transform: scale(.985); opacity: .94; }
.cover { position: relative; overflow: hidden; background: #eee9e2; }
.cover-image { position: absolute; inset: 0; width: 100%; height: 100%; }
.content { min-width: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: 17rpx 18rpx 18rpx; }
.category { align-self: flex-start; margin-bottom: 7rpx; color: #2e7569; font-size: 20rpx; font-weight: 600; }
.title { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #262320; font-size: 27rpx; font-weight: 650; line-height: 1.38; }
.intro { display: -webkit-box; overflow: hidden; margin-top: 7rpx; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #766d64; font-size: 21rpx; line-height: 1.42; }
.meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0 12rpx; margin-top: 8rpx; overflow: hidden; }
.meta-item { overflow: hidden; max-width: 100%; color: #8a8178; font-size: 20rpx; white-space: nowrap; text-overflow: ellipsis; }
.foot { display: flex; align-items: baseline; gap: 8rpx; margin-top: auto; padding-top: 12rpx; }
.price { color: #b9283f; font-size: 29rpx; font-weight: 750; }
.free { color: #287650; font-size: 25rpx; font-weight: 650; }
.price-pending { color: #625a52; font-size: 23rpx; }
.original-price { color: #a69d94; font-size: 19rpx; text-decoration: line-through; }
.learning-card--grid .cover { width: 100%; padding-top: 63%; }
.learning-card--grid .content { min-height: 215rpx; }
.learning-card--grid .meta-item:nth-child(n+3) { display: none; }
.learning-card--list { display: flex; min-height: 198rpx; }
.learning-card--list .cover { width: 205rpx; flex-shrink: 0; }
.learning-card--list .content { flex: 1; }
.learning-card--list .intro { -webkit-line-clamp: 1; }
@media (max-width: 390px) {
  .learning-card--list .cover { width: 180rpx; }
  .learning-card--list .meta-item:nth-child(n+2) { display: none; }
}
</style>
