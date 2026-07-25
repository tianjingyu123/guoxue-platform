<script setup lang="ts">
/**
 * 课程卡 · 瀑布流统一 3:4 封面容器（2026-07-17 董事长拍板：首页/发现页卡片容器统一 3:4）
 * 16:9 素材适配：容器上部为完整 16:9 图区（不裁切），下部 ~58% 高度做宣纸色信息填充带——
 * 推荐理由 / 简介两行 / 讲师行 / 底行价格(免费绿标·付费朱红)+人数或 hook，
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
        <view class="cov-fade" />
      </view>
      <view class="band">
        <view class="band-pattern" />
        <view class="band-spine"><view class="spine-node" /></view>
        <view v-if="item.reason" class="band-top">
          <text class="reason">{{ item.reason }}</text>
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
      <view class="body-spine" />
      <text class="title">{{ item.title }}</text>
    </view>
  </view>
</template>

<style scoped>
.fcard {
  overflow: hidden;
  background: #f8f2e8;
  border-radius: 24rpx;
  box-shadow:
    0 8rpx 24rpx rgba(61,43,29,.08),
    inset 0 0 0 1rpx rgba(144,105,60,.12);
}
/* 3:4 容器（瀑布流统一比例·X5 padding 法） */
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; }
/* 上部 16:9 图区：42.19% 容器高 = 56.25% 宽，素材完整显示不裁切 */
.cov-media { position: absolute; top: 0; left: 0; right: 0; height: 42.19%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.cov-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  height: 42rpx;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(248,242,232,0), rgba(248,242,232,.84));
}
/* 下部信息填充带：宣纸色柔和渐变从图底延伸 */
.band {
  position: absolute;
  left: 0;
  right: 0;
  top: 39.5%;
  bottom: 0;
  z-index: 3;
  box-sizing: border-box;
  padding: 24rpx 20rpx 18rpx 36rpx;
  border-radius: 22rpx 22rpx 0 0;
  background: linear-gradient(180deg, rgba(251,247,239,.98) 0%, #f5eddf 40%, #f0e6d5 100%);
  box-shadow: 0 -10rpx 24rpx rgba(49,34,24,.07);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
/* 柔和光晕底纹：与封面色温衔接，不制造第二块独立面板 */
.band-pattern {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    radial-gradient(circle at 86% 10%, rgba(255,255,255,.76) 0%, transparent 44%),
    linear-gradient(105deg, rgba(154,109,54,.035) 0 1rpx, transparent 1rpx 18rpx);
}
/* 贯穿信息区和标题区的“装帧书脊”，把原来的三段视觉串成一张课程签 */
.band-spine {
  position: absolute;
  top: 28rpx;
  bottom: 0;
  left: 20rpx;
  width: 2rpx;
  background: linear-gradient(180deg, rgba(196,30,58,.72), rgba(201,169,110,.48));
}
.spine-node {
  position: absolute;
  top: 0;
  left: -4rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  box-shadow: 0 0 0 4rpx rgba(196,30,58,.10);
}
.band-top { position: relative; display: flex; align-items: center; gap: 10rpx; min-width: 0; }
.reason { flex: 1; min-width: 0; font-size: 20rpx; color: #8d7958; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.intro {
  position: relative;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
  font-size: 22rpx; line-height: 1.55; color: #5f5547;
}
.author { position: relative; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 40rpx; height: 40rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #7a6f5d; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.meta {
  position: relative;
  margin-top: auto;
  padding-top: 10rpx;
  border-top: 1rpx solid rgba(128,91,47,.14);
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.price { flex-shrink: 0; font-size: 30rpx; font-weight: 700; color: #c41e3a; }
.yuan { font-size: 20rpx; font-weight: 400; }
/* 免费绿标（董事长拍板：免费绿标·付费朱红突出） */
.free {
  flex-shrink: 0; font-size: 22rpx; font-weight: 700; color: #3e9b4f;
  background: rgba(82,196,26,.12); border-radius: 8rpx; padding: 2rpx 14rpx;
}
.students { margin-left: auto; flex-shrink: 0; font-size: 22rpx; color: #9a9184; }
.hook { margin-left: auto; flex-shrink: 0; font-size: 22rpx; color: #8a6420; }
.body {
  position: relative;
  margin-top: -1rpx;
  padding: 18rpx 20rpx 22rpx 36rpx;
  background: linear-gradient(180deg, #f0e6d5 0%, #fbf8f2 100%);
}
.body-spine {
  position: absolute;
  top: 0;
  bottom: 24rpx;
  left: 20rpx;
  width: 2rpx;
  background: linear-gradient(180deg, rgba(201,169,110,.48), rgba(201,169,110,.16));
}
.title {
  position: relative;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-family: var(--font-serif, 'STSong', serif);
  font-size: 28rpx;
  line-height: 1.45;
  font-weight: 600;
  color: #2f2a24;
}
</style>
