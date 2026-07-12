<script setup lang="ts">
/**
 * 2:1 大卡（card-system.html §2:1 大卡）· 独占全宽，每 5-10 条标准卡插入一次
 * 结构：2:1 cover（padding-top 50%）+ 底深顶浅渐变蒙层 + 左上类型角标
 *      （精品课=金「精品推荐」/ 直播=朱红「正在直播」+呼吸点）
 *      标题衬线白 + 投影；底部行：price 金黄 / subtitle / hook 胶囊
 * 去数字化：观看人数等一律替换为内容钩子。
 * X5 安全：无 aspect-ratio（padding-top）、无 backdrop-filter。
 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, payloadNum, payloadBool, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()

const isLive = computed(() => props.item.type === 'live' || payloadBool(props.item, 'isLive'))
const isCourse = computed(() => props.item.type === 'course')
// 类型角标文案
const tagText = computed(() => {
  if (isLive.value) return '正在直播'
  if (isCourse.value) return '精品推荐'
  return payloadStr(props.item, 'tag') || '专题推荐'
})
const price = computed(() => payloadNum(props.item, 'price'))
const isFree = computed(() => payloadBool(props.item, 'free') || price.value === 0)
const hasPrice = computed(() => isCourse.value || props.item.type === 'product')
const sub = computed(() => props.item.subtitle || '')
const hook = computed(() => payloadStr(props.item, 'action') || (isLive.value ? '进来正好 ›' : '去看看 ›'))

const coverType = computed(() => {
  switch (props.item.type) {
    case 'live': return 'live'
    case 'course': return 'course'
    case 'product': return 'product'
    case 'classic': return 'classic'
    default: return 'default'
  }
})
</script>

<template>
  <view class="bigcard">
    <view class="bc">
      <smart-cover :src="item.cover" :title="item.title" :type="coverType" class="bc-img" />
      <view class="shade" />
    </view>
    <!-- 左上类型角标 -->
    <view class="tag" :class="isLive ? 'live' : 'gold'">
      <view v-if="isLive" class="tag-dot" />
      <text class="tag-t">{{ tagText }}</text>
    </view>
    <!-- 底部文字区 -->
    <view class="txt">
      <text class="h3 serif">{{ item.title }}</text>
      <view class="row">
        <text v-if="hasPrice && isFree" class="price">免费</text>
        <text v-else-if="hasPrice" class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
        <text v-if="sub" class="sub">{{ sub }}</text>
        <text class="hk">{{ hook }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.bigcard { position: relative; border-radius: 28rpx; overflow: hidden; box-shadow: 0 4rpx 20rpx rgba(60,50,40,.1); }
.bc { position: relative; width: 100%; padding-top: 50%; overflow: hidden; background: #f6f1e7; }
.bc-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.shade {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(20,15,10,.72), rgba(20,15,10,.1) 60%, rgba(20,15,10,0));
}
.tag {
  position: absolute; top: 24rpx; left: 24rpx; z-index: 3;
  display: flex; align-items: center; gap: 10rpx;
  border-radius: 12rpx; padding: 6rpx 18rpx;
}
.tag.gold { background: rgba(180,140,70,.95); }
.tag.live { background: rgba(196,30,58,.92); }
.tag-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: #fff; animation: livePulse 1.6s ease-in-out infinite; }
.tag-t { font-size: 22rpx; font-weight: 700; color: #fff; }
.txt { position: absolute; left: 28rpx; right: 28rpx; bottom: 24rpx; z-index: 3; }
.h3 {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
  font-family: var(--font-serif, 'STSong', serif); font-size: 36rpx; font-weight: 700;
  color: #fff; line-height: 1.3; text-shadow: 0 2rpx 8rpx rgba(0,0,0,.3);
}
.serif { font-family: var(--font-serif, 'STSong', serif); }
.row { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.price { flex-shrink: 0; font-size: 34rpx; font-weight: 700; color: #ffd98a; }
.yuan { font-size: 22rpx; }
.sub { flex: 1; min-width: 0; font-size: 24rpx; color: rgba(255,255,255,.9); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hk {
  flex-shrink: 0; margin-left: auto; font-size: 22rpx; color: #fff;
  background: rgba(255,255,255,.16); border-radius: 22rpx; padding: 6rpx 20rpx;
}
@keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
</style>
