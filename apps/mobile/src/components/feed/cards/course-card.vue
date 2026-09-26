<script setup lang="ts">
/** 首页课程卡：封面、课程说明与讲师信息共用一张内容面。 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, payloadNum, payloadBool, formatCount } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const price = computed(() => payloadNum(props.item, 'price'))
const isFree = computed(() => payloadBool(props.item, 'free') || price.value === 0)
const hasPrice = computed(() => typeof price.value === 'number' && Number.isFinite(price.value))
const students = computed(() => {
  const metric = props.item.metric
  if (metric?.kind !== 'students') return 0
  const value = typeof metric.value === 'number' ? metric.value : Number(metric.value)
  return Number.isFinite(value) && value > 0 ? value : 0
})
</script>

<template>
  <view class="course-card">
    <view class="cover">
      <smart-cover :src="item.cover" :title="item.title" type="course" deco class="cover-image" />
      <text v-if="item.reason" class="reason">{{ item.reason }}</text>
    </view>
    <view class="content">
      <text class="title">{{ item.title }}</text>
      <text v-if="item.subtitle" class="intro">{{ item.subtitle }}</text>
      <view class="footer">
        <view v-if="item.author?.name" class="teacher">
          <smart-avatar :src="item.author?.avatar" :name="item.author?.name || ''" class="avatar" />
          <text class="teacher-name">{{ item.author?.name }}</text>
        </view>
        <text v-else-if="students" class="students">{{ formatCount(students) }}人在学</text>
        <text v-if="isFree" class="free">免费</text>
        <text v-else-if="hasPrice" class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.course-card { overflow: hidden; border-radius: 22rpx; background: #fff; box-shadow: 0 4rpx 18rpx rgba(39,33,28,.08); }
.cover { position: relative; width: 100%; padding-top: 56.25%; overflow: hidden; background: #f3eee6; }
.cover-image { position: absolute; inset: 0; width: 100%; height: 100%; }
.reason { position: absolute; left: 12rpx; top: 12rpx; max-width: calc(100% - 24rpx); box-sizing: border-box; padding: 6rpx 10rpx; border-radius: 8rpx; background: rgba(29,29,31,.72); color: #fff; font-size: 18rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.content { padding: 16rpx 16rpx 18rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; color: #1d1d1f; font-size: 28rpx; line-height: 1.35; font-weight: 650; }
.intro { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 8rpx; color: #6e6e73; font-size: 21rpx; line-height: 1.4; }
.footer { display: flex; align-items: center; gap: 8rpx; min-height: 40rpx; margin-top: 14rpx; padding-top: 12rpx; border-top: 1rpx solid #ece9e5; }
.teacher { display: flex; align-items: center; gap: 7rpx; flex: 1; min-width: 0; }
.avatar { flex-shrink: 0; width: 36rpx; height: 36rpx; overflow: hidden; border-radius: 50%; }
.teacher-name, .students { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #6e6e73; font-size: 20rpx; }
.free, .price { flex-shrink: 0; margin-left: auto; font-weight: 700; }
.free { color: #27834d; font-size: 22rpx; }
.price { color: #a32035; font-size: 28rpx; }
.yuan { font-size: 19rpx; font-weight: 500; }
</style>
