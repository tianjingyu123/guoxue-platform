<script setup lang="ts">
/**
 * 课程卡 · 瀑布流统一 3:4 封面容器（2026-07-17 董事长拍板：首页/发现页卡片容器统一 3:4）
 * 16:9 素材适配：容器上部为完整 16:9 图区（不裁切），下部 ~58% 高度做宣纸色信息填充带——
 * 课程 chip / 推荐理由 / 简介两行 / 讲师行 / 底行价格(免费绿标·付费朱红)+人数或 hook，
 * 让 3:4 每一寸都有内容而非图+留白。body 区保持标题两行。
 * 数据全部来自信封真实字段（subtitle=intro、metric.students、payload.price/free、author、reason），不编数据。
 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, payloadNum, payloadBool, formatCount } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const isFree = computed(() => payloadBool(props.item, 'free') || payloadNum(props.item, 'price') === 0)
const price = computed(() => payloadNum(props.item, 'price'))
// 有效价格判定：payload 无 price / 脏数据（payloadNum 返回 undefined 或 NaN）时不渲染价格元素，
// 否则 formatPrice(undefined)→0 会把没报价的课显示成「¥0」（真实价格 0 已由 isFree 分支显示「免费」）
const hasPrice = computed(() => typeof price.value === 'number' && Number.isFinite(price.value))
const hook = computed(() => (isFree.value ? '第 1 课免费' : '去看看 ›'))
/** 学习人数：仅当 metric.kind=students 且 >0 才显示（无数据不造假） */
const students = computed(() => {
  const m = props.item.metric
  if (!m || m.kind !== 'students') return 0
  const v = typeof m.value === 'number' ? m.value : Number(m.value)
  return Number.isFinite(v) && v > 0 ? v : 0
})
</script>

<template>
  <view class="fcard">
    <!-- 3:4 封面容器 = 上部 16:9 图区 + 下部信息填充带 -->
    <view class="cov">
      <view class="cov-media">
        <smart-cover :src="item.cover" :title="item.title" type="course" deco class="cov-img" />
        <text class="seal serif">课</text>
      </view>
      <view class="band">
        <view class="band-pattern" />
        <view class="band-top">
          <text class="chip">课程</text>
          <text v-if="item.reason" class="reason">{{ item.reason }}</text>
        </view>
        <text v-if="item.subtitle" class="intro">{{ item.subtitle }}</text>
        <!-- 讲师行（信封 author 承载讲师·数据有则显） -->
        <view v-if="item.author?.name" class="author">
          <smart-avatar :src="item.author?.avatar" :name="item.author?.name || ''" class="ava" />
          <text class="name">{{ item.author?.name }}</text>
        </view>
        <view class="meta">
          <text v-if="isFree" class="free">免费</text>
          <text v-else-if="hasPrice" class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
          <text v-if="students" class="students">{{ formatCount(students) }}人在学</text>
          <text v-else class="hook">{{ hook }}</text>
        </view>
      </view>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
/* 3:4 容器（瀑布流统一比例·X5 padding 法） */
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; }
/* 上部 16:9 图区：42.19% 容器高 = 56.25% 宽，素材完整显示不裁切 */
.cov-media { position: absolute; top: 0; left: 0; right: 0; height: 42.19%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.seal {
  position: absolute; top: 16rpx; left: 16rpx; width: 44rpx; height: 44rpx; border-radius: 12rpx;
  background: rgba(196,30,58,.92); color: #fff; font-size: 24rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; z-index: 3;
  font-family: var(--font-serif, 'STSong', serif);
}
.serif { font-family: var(--font-serif, 'STSong', serif); }
/* 下部信息填充带：宣纸色柔和渐变从图底延伸 */
.band {
  position: absolute; left: 0; right: 0; top: 42.19%; bottom: 0;
  box-sizing: border-box; padding: 16rpx 20rpx 18rpx;
  background: linear-gradient(180deg, #f8f3e9 0%, #efe5d1 100%);
  display: flex; flex-direction: column; gap: 10rpx;
}
/* 柔和光晕底纹：填充带不显空 */
.band-pattern {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    radial-gradient(circle at 82% 12%, rgba(255,255,255,.6) 0%, transparent 45%),
    radial-gradient(circle at 12% 92%, rgba(196,30,58,.05) 0%, transparent 40%);
}
.band-top { position: relative; display: flex; align-items: center; gap: 10rpx; min-width: 0; }
.chip {
  flex-shrink: 0; font-size: 20rpx; font-weight: 600; color: #c41e3a;
  background: rgba(196,30,58,.07); border: 2rpx solid rgba(196,30,58,.3);
  border-radius: 8rpx; padding: 2rpx 12rpx;
}
.reason { flex: 1; min-width: 0; font-size: 20rpx; color: #a08d6d; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.intro {
  position: relative;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
  font-size: 22rpx; line-height: 1.55; color: #6b5f4d;
}
.author { position: relative; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 40rpx; height: 40rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #7a6f5d; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.meta { position: relative; margin-top: auto; display: flex; align-items: center; gap: 10rpx; }
.price { flex-shrink: 0; font-size: 30rpx; font-weight: 700; color: #c41e3a; }
.yuan { font-size: 20rpx; font-weight: 400; }
/* 免费绿标（董事长拍板：免费绿标·付费朱红突出） */
.free {
  flex-shrink: 0; font-size: 22rpx; font-weight: 700; color: #3e9b4f;
  background: rgba(82,196,26,.12); border-radius: 8rpx; padding: 2rpx 14rpx;
}
.students { margin-left: auto; flex-shrink: 0; font-size: 22rpx; color: #9a9184; }
.hook { margin-left: auto; flex-shrink: 0; font-size: 22rpx; color: #8a6420; }
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
</style>
