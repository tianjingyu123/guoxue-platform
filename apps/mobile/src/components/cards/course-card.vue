<script setup lang="ts">
/** 课程卡(feed)- 从原型 components/cards/course-card.tsx 迁移 */
import { computed } from 'vue'
import { navigateTo } from '@/utils/router'
import { type CourseCardData, normalizeRatio, formatCount, courseHotKind } from '@/lib/card-utils'

const props = defineProps<{ data: CourseCardData }>()
const ratio = computed(() => normalizeRatio(props.data.coverRatio))
const kind = computed(() => courseHotKind(props.data.tag))
const hotText = computed(() => (kind.value === 'hot' ? '热销' : kind.value === 'new' ? '新品' : ''))
function open() { navigateTo(`/course/${props.data.id}`) }
</script>

<template>
  <view class="card" hover-class="card-press" @tap="open">
    <view class="cover" :class="ratio === '1:1' ? 'r-sq' : 'r-34'">
      <image v-if="data.cover" class="cover-img" :src="data.cover" mode="aspectFill" />
      <text class="type-badge">课程</text>
      <text v-if="kind" class="hot-badge" :class="kind === 'new' ? 'hot-new' : 'hot-red'">{{ hotText }}</text>
    </view>
    <view class="body">
      <text class="title">{{ data.title }}</text>
      <view class="price-row">
        <view v-if="data.free" class="price-free">免费</view>
        <view v-else class="price">
          <text class="price-cny">¥</text>
          <text class="price-num">{{ data.price }}</text>
          <text v-if="data.originalPrice" class="price-orig">¥{{ data.originalPrice }}</text>
        </view>
      </view>
      <!-- 作者行 -->
      <view v-if="data.teacher" class="author">
        <view class="avatar">
          <image v-if="data.teacherAvatar" class="avatar-img" :src="data.teacherAvatar" mode="aspectFill" />
          <text v-else class="avatar-ph">{{ data.teacher.charAt(0) }}</text>
        </view>
        <text class="author-name">{{ data.teacher }}</text>
        <text v-if="data.students" class="author-trail">{{ formatCount(data.students) }}人学</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card { overflow: hidden; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); margin-bottom: 12rpx; }
.card-press { transform: scale(0.98); }
.cover { position: relative; width: 100%; background: var(--surface-sunken); overflow: hidden; }
.r-34 { padding-bottom: 133.33%; }
.r-sq { padding-bottom: 100%; }
.cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.type-badge { position: absolute; top: 16rpx; left: 16rpx; z-index: 10; font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 999rpx; color: rgba(255,255,255,0.95); font-weight: 500; background: rgba(0,0,0,0.45); }
.hot-badge { position: absolute; top: 16rpx; right: 16rpx; z-index: 10; font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 999rpx; font-weight: 500; }
.hot-red { background: var(--brand); color: #fff; }
.hot-new { background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.95); }
.body { padding: 18rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; font-weight: 500; color: var(--text-strong); line-height: 1.5; margin-bottom: 12rpx; }
.price-row { margin-bottom: 12rpx; }
.price { display: flex; align-items: baseline; }
.price-cny { color: var(--brand); font-weight: 700; font-size: 22rpx; }
.price-num { color: var(--brand); font-weight: 700; font-size: 32rpx; margin-left: 2rpx; }
.price-orig { font-size: 22rpx; color: var(--text-soft); text-decoration: line-through; margin-left: 8rpx; }
.price-free { font-size: 26rpx; font-weight: 700; color: var(--success); }
.author { display: flex; align-items: center; gap: 10rpx; }
.avatar { width: 32rpx; height: 32rpx; border-radius: 999rpx; overflow: hidden; background: rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-ph { font-size: 16rpx; color: var(--text); }
.author-name { font-size: 22rpx; color: var(--text); flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.author-trail { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
</style>
