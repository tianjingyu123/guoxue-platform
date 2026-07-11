<script setup lang="ts">
/** 课程卡 · 封面 4:3 · 左上「课程」金标 · ¥价格或免费 · xx人学 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, ratioPadding, formatCount, payloadNum, payloadBool } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const pad = computed(() => ratioPadding(props.item.coverRatio || '4:3'))
const isFree = computed(() => payloadBool(props.item, 'free') || payloadNum(props.item, 'price') === 0)
const price = computed(() => payloadNum(props.item, 'price'))
const originalPrice = computed(() => payloadNum(props.item, 'originalPrice'))
const students = computed(() => {
  const m = props.item.metric
  if (m && m.kind === 'students') return formatCount(m.value as number)
  const s = payloadNum(props.item, 'students')
  return s != null ? formatCount(s) : ''
})
</script>

<template>
  <view class="fcard">
    <view class="cov" :style="{ paddingTop: pad }">
      <smart-cover :src="item.cover" :title="item.title" type="course" class="cov-img" />
      <text class="seal gold">课程</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="foot">
        <view class="price-row">
          <text v-if="isFree" class="free">免费</text>
          <template v-else>
            <text class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
            <text v-if="originalPrice" class="origin">¥{{ formatPrice(originalPrice) }}</text>
          </template>
        </view>
        <text v-if="students" class="meta">{{ students }}人学</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; overflow: hidden; background: #f2efea; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.seal {
  position: absolute; top: 16rpx; left: 16rpx;
  font-size: 20rpx; color: #fff; font-weight: 500; padding: 4rpx 14rpx; border-radius: 999rpx;
}
.seal.gold { background: rgba(201,169,110,.95); }
.body { padding: 20rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.foot { margin-top: 16rpx; display: flex; align-items: baseline; justify-content: space-between; gap: 12rpx; }
.price-row { display: flex; align-items: baseline; gap: 10rpx; min-width: 0; }
.price { font-size: 30rpx; font-weight: 700; color: #c41e3a; }
.yuan { font-size: 22rpx; font-weight: 400; }
.free { font-size: 26rpx; font-weight: 700; color: #c9a96e; }
.origin { font-size: 22rpx; color: #999; text-decoration: line-through; }
.meta { flex-shrink: 0; font-size: 22rpx; color: #999; }
</style>
