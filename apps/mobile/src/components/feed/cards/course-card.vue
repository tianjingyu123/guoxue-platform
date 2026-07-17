<script setup lang="ts">
/**
 * 课程卡 · 统一 3:4（16:9 封面 cover 填满）· 左上「课」朱红印章 · price（免费/¥价）+ hook
 * 去数字化：不显学习人数。hook = free ? "第1课免费" : "去看看 ›"
 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, payloadNum, payloadBool } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const isFree = computed(() => payloadBool(props.item, 'free') || payloadNum(props.item, 'price') === 0)
const price = computed(() => payloadNum(props.item, 'price'))
const hook = computed(() => (isFree.value ? '第 1 课免费' : '去看看 ›'))
</script>

<template>
  <view class="fcard">
    <view class="cov">
      <smart-cover :src="item.cover" :title="item.title" type="course" deco class="cov-img" />
      <text class="seal serif">课</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <!-- 讲师行（信封 author 承载讲师·同 video-card 作者行写法） -->
      <view v-if="item.author?.name" class="author">
        <smart-avatar :src="item.author?.avatar" :name="item.author?.name || ''" class="ava" />
        <text class="name">{{ item.author?.name }}</text>
      </view>
      <view class="meta">
        <text v-if="isFree" class="free">免费</text>
        <text v-else class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
        <text class="hook">{{ hook }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.seal {
  position: absolute; top: 16rpx; left: 16rpx; width: 44rpx; height: 44rpx; border-radius: 12rpx;
  background: rgba(196,30,58,.92); color: #fff; font-size: 24rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; z-index: 3;
  font-family: var(--font-serif, 'STSong', serif);
}
.serif { font-family: var(--font-serif, 'STSong', serif); }
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.author { margin-top: 12rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.meta { margin-top: 12rpx; display: flex; align-items: center; gap: 10rpx; }
.price { flex-shrink: 0; font-size: 30rpx; font-weight: 700; color: #c41e3a; }
.yuan { font-size: 20rpx; font-weight: 400; }
.free { flex-shrink: 0; font-size: 28rpx; font-weight: 700; color: #c9a96e; }
.hook { margin-left: auto; flex-shrink: 0; font-size: 22rpx; color: #8a6420; }
</style>
