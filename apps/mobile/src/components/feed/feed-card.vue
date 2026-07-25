<script setup lang="ts">
/**
 * 首页瀑布流 · 九类卡注册表分发器（统一信封 FeedEnvelope）
 *
 * 小程序无 `<component :is>`（X5/编译报错·排盘 rich-message 前车之鉴），
 * 故用显式 v-if/v-else-if 按 type 分发到对应卡组件；未知 type 兜底走文章卡（文摘态不留空白）。
 *
 * 卡骨架铁律统一在各卡内；本组件只负责：分发 + 点击导航 + 埋点。
 * 负反馈（不感兴趣）由页面在卡外承载（长按/更多按钮 → sendFeedback），本组件不介入。
 */
import { computed } from 'vue'
import { navigateTo, navigateToContent } from '@/utils/router'
import { track } from '@/composables/useTrack'
import { feedTargetUrl, type FeedEnvelope } from '@/lib/feed-data'

import VideoCard from './cards/video-card.vue'
import ArticleCard from './cards/article-card.vue'
import PostCard from './cards/post-card.vue'
import CourseCard from './cards/course-card.vue'
import ProductCard from './cards/product-card.vue'
import ClassicCard from './cards/classic-card.vue'
import LiveCard from './cards/live-card.vue'
import PaipanCard from './cards/paipan-card.vue'
import AgentCard from './cards/agent-card.vue'
import BigCard from './big-card.vue'

/**
 * big=true 时渲染 16:9 大卡（独占全宽，H1 按节奏插入时传入），
 * 否则走九类标准卡注册表分发。点击导航/埋点统一在本组件承载。
 */
const props = defineProps<{ item: FeedEnvelope; big?: boolean }>()

const t = computed(() => props.item.type)

/**
 * 大卡守卫（董事长 2026-07-17 拍板：2:1 废弃·16:9·仅 live/course 可升大卡）：
 * 只有 live/course 且有真实封面才走大卡；其余即使传了 big 也落回下方
 * v-else-if 普通卡注册表分发（守卫放本组件是因为回退需要这条分发链，
 * big-card 内做守卫只能空渲染留白）。
 */
const bigOk = computed(
  () => props.big === true && (t.value === 'live' || t.value === 'course') && !!props.item.cover
)

// 类型 → 路由映射统一收敛到 lib/feed-data.ts feedTargetUrl（首页焦点区共用，勿再本地另写分叉）
function go(event?: unknown) {
  const it = props.item
  track.click('feed_card', { type: it.type, id: it.id })
  const target = feedTargetUrl(it)
  if (it.type === 'paipan' || it.type === 'agent') navigateTo(target)
  else navigateToContent(target, event)
}
</script>

<template>
  <view class="feed-card-wrap" data-content-card hover-class="feed-card-press" @tap="go">
    <!-- 16:9 大卡（独占全宽·按节奏插入·仅 live/course 且有封面，否则落回普通卡） -->
    <big-card v-if="bigOk" :item="item" />
    <video-card v-else-if="t === 'video'" :item="item" />
    <article-card v-else-if="t === 'article'" :item="item" />
    <post-card v-else-if="t === 'post'" :item="item" />
    <course-card v-else-if="t === 'course'" :item="item" />
    <product-card v-else-if="t === 'product'" :item="item" />
    <classic-card v-else-if="t === 'classic'" :item="item" />
    <live-card v-else-if="t === 'live'" :item="item" />
    <paipan-card v-else-if="t === 'paipan'" :item="item" />
    <agent-card v-else-if="t === 'agent'" :item="item" />
    <!-- 未知 type 兜底：文章卡（文摘态·不留空白） -->
    <article-card v-else :item="item" />
  </view>
</template>

<style scoped>
/* 按压反馈：轻缩放 0.98 + 0.15s 过渡（X5 安全：仅动 opacity/transform） */
.feed-card-wrap { display: block; animation: card-arrive .36s cubic-bezier(.2,.75,.25,1) both; transition: transform 0.15s ease-out, opacity 0.15s ease-out; }
.feed-card-press { opacity: 0.88; transform: scale(0.98); }
@keyframes card-arrive {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .feed-card-wrap { animation: none; }
}
</style>
