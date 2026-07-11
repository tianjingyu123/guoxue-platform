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
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'
import type { FeedEnvelope } from '@/lib/feed-data'

import VideoCard from './cards/video-card.vue'
import ArticleCard from './cards/article-card.vue'
import PostCard from './cards/post-card.vue'
import CourseCard from './cards/course-card.vue'
import ProductCard from './cards/product-card.vue'
import ClassicCard from './cards/classic-card.vue'
import LiveCard from './cards/live-card.vue'
import PaipanCard from './cards/paipan-card.vue'
import AgentCard from './cards/agent-card.vue'

const props = defineProps<{ item: FeedEnvelope }>()

const t = computed(() => props.item.type)

/** 类型 → 详情/落地路由（用真实动态路由前缀，与全站 router 映射对齐） */
function targetUrl(it: FeedEnvelope): string {
  const id = it.id
  switch (it.type) {
    case 'video':
      return `/video/${id}`
    case 'article':
      return `/articles/${id}`
    case 'post':
      return `/pkg-circle/circles/post?id=${id}`
    case 'course':
      return `/course/${id}`
    case 'product':
      return `/mall/product/${id}`
    case 'classic':
      return `/pkg-classics/detail/index?id=${id}`
    case 'live':
      return `/live/${id}`
    case 'paipan':
      // 排盘钩子 → 排盘工具首页（战略转化位）
      return `/pkg-paipan/index/index`
    case 'agent':
      return `/pkg-agent/agent/chat?id=${id}`
    default:
      return `/articles/${id}`
  }
}

function go() {
  const it = props.item
  track.click('feed_card', { type: it.type, id: it.id })
  navigateTo(targetUrl(it))
}
</script>

<template>
  <view class="feed-card-wrap" hover-class="feed-card-press" @tap="go">
    <video-card v-if="t === 'video'" :item="item" />
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
.feed-card-wrap { display: block; }
.feed-card-press { opacity: 0.88; transition: opacity 0.1s; }
</style>
