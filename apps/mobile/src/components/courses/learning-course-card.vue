<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateToContent } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { formatCount, type CourseCardData } from '@/lib/card-utils'

const props = withDefaults(defineProps<{
  data: CourseCardData
  variant?: 'grid' | 'list'
}>(), {
  variant: 'grid',
})

const learningCopy = computed(() => {
  const intro = String(props.data.intro || '').trim()
  return intro || `围绕《${props.data.title}》建立清晰的学习框架`
})

const categoryText = computed(() => String(props.data.category || '精品课程'))

const accessibilityLabel = computed(() => {
  const priceText = props.data.free
    ? '免费'
    : `价格 ${formatPrice(props.data.price)} 元`
  const studentsText = props.data.students ? `，${formatCount(props.data.students)} 人在学` : ''
  return `查看课程：${props.data.title}，${learningCopy.value}${studentsText}，${priceText}`
})

function open(event?: unknown) {
  navigateToContent(`/course/${props.data.id}`, event)
}

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
      <smart-cover class="cover-image" :src="data.cover" :title="data.title" type="course" deco />
      <view class="cover-shade" />
      <view class="course-chip">
        <app-icon name="book-open" :size="20" color="#FFFFFF" />
        <text class="course-chip-text">{{ categoryText }}</text>
      </view>
    </view>

    <view class="content">
      <view class="content-spine"><view class="spine-node" /></view>
      <text class="title serif">{{ data.title }}</text>

      <view class="outcome">
        <text class="outcome-label">你将学到</text>
        <text class="outcome-text">{{ learningCopy }}</text>
      </view>

      <view class="course-meta">
        <view v-if="data.lessons" class="meta-item">
          <app-icon name="list" :size="22" color="#8B7B64" />
          <text class="meta-text">{{ data.lessons }} 节</text>
        </view>
        <view v-if="data.students" class="meta-item">
          <app-icon name="users" :size="22" color="#8B7B64" />
          <text class="meta-text">{{ formatCount(data.students) }} 人在学</text>
        </view>
      </view>

      <view class="foot">
        <view v-if="data.teacher" class="teacher">
          <smart-avatar :src="data.teacherAvatar" :name="data.teacher" class="avatar" />
          <text class="teacher-name">{{ data.teacher }}</text>
        </view>
        <text v-else class="teacher-name">平台精选</text>

        <view class="price-wrap">
          <text v-if="data.free" class="free">免费</text>
          <template v-else>
            <text class="price">¥{{ formatPrice(data.price) }}</text>
            <text v-if="data.originalPrice && data.originalPrice > (data.price || 0)" class="original-price">
              ¥{{ formatPrice(data.originalPrice) }}
            </text>
          </template>
        </view>
      </view>

      <view class="cta">
        <text class="cta-text">查看课程</text>
        <app-icon name="arrow-right" :size="22" color="#C41E3A" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.card-press { transform: scale(.985); opacity: .94; }
.learning-card {
  overflow: hidden;
  border: 1rpx solid rgba(155, 116, 66, .15);
  border-radius: 26rpx;
  background: #fffdfa;
  box-shadow: 0 10rpx 30rpx rgba(66, 45, 28, .07);
}
.cover {
  position: relative;
  overflow: hidden;
  background: #efe8dd;
}
.cover-image { position: absolute; inset: 0; width: 100%; height: 100%; }
.cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(29, 24, 20, .03), rgba(29, 24, 20, .2));
}
.course-chip {
  position: absolute;
  left: 16rpx;
  top: 16rpx;
  max-width: calc(100% - 32rpx);
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 12rpx;
  border: 1rpx solid rgba(255, 255, 255, .36);
  border-radius: 999rpx;
  background: rgba(38, 31, 27, .58);
  backdrop-filter: blur(10px);
}
.course-chip-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #fff;
  font-size: 19rpx;
}
.content {
  position: relative;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 92% 5%, rgba(199, 161, 102, .13), transparent 34%),
    linear-gradient(180deg, #fffdfa 0%, #f8f0e4 100%);
}
.content-spine {
  position: absolute;
  left: 20rpx;
  top: 26rpx;
  bottom: 24rpx;
  width: 2rpx;
  background: linear-gradient(180deg, rgba(196, 30, 58, .75), rgba(184, 138, 68, .16));
}
.spine-node {
  position: absolute;
  left: -4rpx;
  top: 0;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #c41e3a;
  box-shadow: 0 0 0 5rpx rgba(196, 30, 58, .08);
}
.title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #25211e;
  font-weight: 700;
  line-height: 1.4;
}
.outcome { display: flex; flex-direction: column; gap: 6rpx; }
.outcome-label {
  width: max-content;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(45, 124, 111, .1);
  color: #2d7c6f;
  font-size: 19rpx;
  font-weight: 600;
}
.outcome-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #695f53;
  line-height: 1.55;
}
.course-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 12rpx; }
.meta-item { display: flex; align-items: center; gap: 5rpx; }
.meta-text { color: #8b7b64; font-size: 21rpx; }
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  border-top: 1rpx solid rgba(147, 112, 70, .13);
}
.teacher { min-width: 0; display: flex; align-items: center; gap: 8rpx; }
.avatar { width: 34rpx; height: 34rpx; flex-shrink: 0; overflow: hidden; border-radius: 50%; }
.teacher-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #756b60;
  font-size: 21rpx;
}
.price-wrap { display: flex; align-items: baseline; gap: 6rpx; }
.price { color: #c41e3a; font-size: 29rpx; font-weight: 800; }
.free { color: #2d8b5d; font-size: 25rpx; font-weight: 700; }
.original-price { color: #aaa097; font-size: 18rpx; text-decoration: line-through; }
.cta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
}
.cta-text { color: #c41e3a; font-size: 21rpx; font-weight: 600; }

.learning-card--grid .cover { width: 100%; padding-top: 56.25%; }
.learning-card--grid .content { min-height: 330rpx; padding: 22rpx 18rpx 18rpx 34rpx; display: flex; flex-direction: column; gap: 13rpx; }
.learning-card--grid .title { min-height: 72rpx; font-size: 27rpx; }
.learning-card--grid .outcome-text { min-height: 66rpx; font-size: 21rpx; }
.learning-card--grid .foot { margin-top: auto; padding-top: 13rpx; }

.learning-card--list { display: flex; min-height: 264rpx; }
.learning-card--list .cover { width: 248rpx; flex-shrink: 0; }
.learning-card--list .content {
  min-width: 0;
  flex: 1;
  padding: 24rpx 22rpx 20rpx 38rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.learning-card--list .title { font-size: 30rpx; }
.learning-card--list .outcome-text { font-size: 23rpx; }
.learning-card--list .foot { margin-top: auto; padding-top: 14rpx; }

@media (max-width: 390px) {
  .learning-card--list .cover { width: 216rpx; }
  .learning-card--list .course-meta { display: none; }
}
</style>
