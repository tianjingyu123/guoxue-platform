<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import ProductCard from '@/components/cards/product-card.vue'
import CourseCard from '@/components/cards/course-card.vue'
import LiveCard from '@/components/cards/live-card.vue'
import AgentCard from '@/components/cards/agent-card.vue'
import ClassicCard from '@/components/cards/classic-card.vue'
import VideoCard from '@/components/cards/video-card.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import {
  discoverApi, coreEntries, columns, serviceGroups,
  type FeedItem,
} from '@/lib/discover-data'

const activeCategory = ref('all')
const isLoading = ref(true)
const error = ref('')
const feedItems = ref<FeedItem[]>([])
const allCats = ref<{ id: string; label: string }[]>([])
const hotWords = ref<string[]>([])

// —— 发现页瘦身（董事长拍板）——
// ① 更多玩法：剔除与首页金刚区（课程/圈子/古籍馆/商城/直播/运势/排盘/智能体/诗词）重复的入口，
//    只保留发现页特有的玩法（赛事/视频/榜单）
const HOME_GRID_DUP_IDS = ['course', 'mall', 'classics', 'agent', 'circles', 'live']
const morePlays = coreEntries.filter((e) => !HOME_GRID_DUP_IDS.includes(e.id))
// ② B/C 分层：C 端「学习互动」组保留原位；B 端「经营变现」组下沉为页面底部折叠区「事业与合作」
const cServiceGroups = serviceGroups.filter((g) => g.title !== '经营变现')
const bizGroup = serviceGroups.find((g) => g.title === '经营变现')
const bizExpanded = ref(false)
function toggleBiz() { bizExpanded.value = !bizExpanded.value }

// 瀑布流：按索引奇偶分两列
const colLeft = computed(() => feedItems.value.filter((_, i) => i % 2 === 0))
const colRight = computed(() => feedItems.value.filter((_, i) => i % 2 === 1))

async function fetchFeed() {
  isLoading.value = true
  error.value = ''
  try {
    feedItems.value = await discoverApi.getFeed(activeCategory.value)
  } catch {
    error.value = '加载失败'
  } finally {
    isLoading.value = false
  }
}

// 品类导航与热搜词（与 feed 并行加载，失败各自走 data 层兜底）
async function loadMeta() {
  const [cats, hot] = await Promise.all([
    discoverApi.getCategories(),
    discoverApi.getHotWords(),
  ])
  allCats.value = cats
  hotWords.value = hot
}

onMounted(() => { loadMeta(); fetchFeed() })

function retry() { fetchFeed() }

// 统一走 navigateTo：内部含 ROUTE_MAP 解析 + 主 tab reLaunch 兜底；未注册路径才 toast
function goEntry(href: string) {
  navigateTo(href)
}
function goSearchWord(w: string) { navigateTo(`/pkg-search/search/index?keyword=${encodeURIComponent(w)}`) }
function goCategory(cat: { id: string; label: string }) {
  if (activeCategory.value === cat.id) return
  activeCategory.value = cat.id
  fetchFeed()
}
function goColumn(_href: string) { toastComingSoon() }
</script>

<template>
  <view class="page">
    <app-network-bar />
    <customer-service-fab />
    <!-- 顶部固定区：搜索栏 + 品类导航 -->
    <view class="sticky-top">
      <view class="search-wrap">
        <search-bar default-tab="all" placeholder="搜索课程、商品、古籍..." />

        <!-- 热搜词 -->
        <scroll-view class="hot-row" scroll-x :show-scrollbar="false">
          <view class="hot-inner">
            <view class="hot-label">
              <AppIcon name="flame" :size="26" color="#c41e3a" />
              <text class="hot-label-txt">热搜</text>
            </view>
            <view
              v-for="(word, i) in hotWords" :key="word"
              :class="['hot-chip', i === 0 ? 'hot-chip-first' : '']"
              @tap="goSearchWord(word)"
            >
              <text class="hot-chip-txt">{{ word }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 品类导航 -->
      <scroll-view class="cat-row" scroll-x :show-scrollbar="false">
        <view class="cat-inner">
          <view
            v-for="cat in allCats" :key="cat.id"
            class="cat-item" @tap="goCategory(cat)"
          >
            <text :class="['cat-txt', activeCategory === cat.id ? 'cat-txt-active' : '']">{{ cat.label }}</text>
            <view v-if="activeCategory === cat.id" class="cat-underline" />
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 更多玩法（仅发现页特有入口，与首页金刚区去重） -->
    <view class="grid-section svc-section">
      <view class="svc-head">
        <view class="svc-bar" />
        <text class="svc-title">更多玩法</text>
      </view>
      <view class="grid">
        <view
          v-for="entry in morePlays" :key="entry.id"
          class="grid-item" @tap="goEntry(entry.href)"
        >
          <view class="grid-icon">
            <AppIcon :name="entry.icon" :size="44" color="#c41e3a" />
          </view>
          <text class="grid-label">{{ entry.label }}</text>
        </view>
      </view>
    </view>

    <!-- C 端服务矩阵（学习互动，B 端经营组已下沉页面底部折叠区） -->
    <view
      v-for="group in cServiceGroups" :key="group.title"
      class="grid-section svc-section"
    >
      <view class="svc-head">
        <view class="svc-bar" />
        <text class="svc-title">{{ group.title }}</text>
      </view>
      <view class="grid">
        <view
          v-for="item in group.items" :key="item.id"
          class="grid-item" @tap="goEntry(item.href)"
        >
          <view class="grid-icon">
            <AppIcon :name="item.icon" :size="44" color="#c41e3a" />
          </view>
          <text class="grid-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 运营专栏 -->
    <view class="col-section">
      <view class="sec-head">
        <text class="sec-title">精选专栏</text>
        <view class="sec-more" @tap="goColumn('/topic/全部专栏')">
          <text class="sec-more-txt">更多</text>
          <AppIcon name="chevron-right" :size="24" color="#999999" />
        </view>
      </view>
      <scroll-view class="col-row" scroll-x :show-scrollbar="false">
        <view class="col-inner">
          <view
            v-for="col in columns" :key="col.id"
            class="col-card" @tap="goColumn(col.href)"
          >
            <view class="col-cover">
              <image lazy-load class="col-img" :src="col.cover" mode="aspectFill" />
              <view class="col-mask" :style="{ background: `linear-gradient(180deg, transparent 40%, ${col.accent}E6 100%)` }" />
              <view class="col-cover-txt">
                <text class="col-title">{{ col.title }}</text>
                <text class="col-subtitle">{{ col.subtitle }}</text>
              </view>
            </view>
            <view class="col-foot">
              <text class="col-count">{{ col.count }} 个内容</text>
              <text class="col-view">查看 ›</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 推荐内容流 -->
    <view class="feed-section">
      <view class="feed-head">
        <AppIcon name="sparkles" :size="28" color="#c41e3a" />
        <text class="sec-title">为你推荐</text>
      </view>

      <!-- 骨架屏 -->
      <view v-if="isLoading" class="masonry">
        <view v-for="col in [0, 1]" :key="col" class="masonry-col">
          <view v-for="i in 3" :key="i" class="sk-card">
            <view :class="['sk-cover', i % 2 === 1 ? 'sk-34' : 'sk-11']" />
            <view class="sk-body">
              <view class="sk-line" />
              <view class="sk-line sk-line-short" />
            </view>
          </view>
        </view>
      </view>

      <!-- 错误态 -->
      <view v-else-if="error" class="feed-state">
        <text class="state-txt">{{ error }}</text>
        <view class="state-btn" @tap="retry">重试</view>
      </view>

      <!-- 空态 -->
      <view v-else-if="!feedItems.length" class="feed-state">
        <text class="state-txt">该品类暂无内容，换个看看</text>
      </view>

      <!-- 瀑布流 -->
      <view v-else class="masonry">
        <view class="masonry-col">
          <template v-for="item in colLeft" :key="item.data.id">
            <ProductCard v-if="item.kind === 'product'" :data="item.data" />
            <CourseCard v-else-if="item.kind === 'course'" :data="item.data" />
            <LiveCard v-else-if="item.kind === 'live'" :data="item.data" />
            <AgentCard v-else-if="item.kind === 'agent'" :data="item.data" context="discover" />
            <ClassicCard v-else-if="item.kind === 'classic'" :data="item.data" />
            <VideoCard v-else-if="item.kind === 'video'" :data="item.data" />
          </template>
        </view>
        <view class="masonry-col">
          <template v-for="item in colRight" :key="item.data.id">
            <ProductCard v-if="item.kind === 'product'" :data="item.data" />
            <CourseCard v-else-if="item.kind === 'course'" :data="item.data" />
            <LiveCard v-else-if="item.kind === 'live'" :data="item.data" />
            <AgentCard v-else-if="item.kind === 'agent'" :data="item.data" context="discover" />
            <ClassicCard v-else-if="item.kind === 'classic'" :data="item.data" />
            <VideoCard v-else-if="item.kind === 'video'" :data="item.data" />
          </template>
        </view>
      </view>

      <view v-if="!isLoading && !error && feedItems.length" class="feed-end">
        <view class="end-line" />
        <text class="end-txt">已经到底了</text>
        <view class="end-line" />
      </view>
    </view>

    <!-- 事业与合作（B 端入口折叠区：默认收起一行，与 C 端内容彻底分层） -->
    <view v-if="bizGroup" class="biz-section">
      <view class="biz-head" @tap="toggleBiz">
        <view class="biz-head-left">
          <AppIcon name="briefcase" :size="30" color="#8a8378" />
          <text class="biz-title">事业与合作</text>
          <text class="biz-sub">{{ bizGroup.items.map((i) => i.label).join(' · ') }}</text>
        </view>
        <AppIcon :name="bizExpanded ? 'chevron-up' : 'chevron-down'" :size="28" color="#999999" />
      </view>
      <view v-if="bizExpanded" class="grid biz-grid">
        <view
          v-for="item in bizGroup.items" :key="item.id"
          class="grid-item" @tap="goEntry(item.href)"
        >
          <view class="grid-icon biz-icon">
            <AppIcon :name="item.icon" :size="44" color="#8a8378" />
          </view>
          <text class="grid-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <bottom-nav active="discover" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--surface-base, #f5f1ea); padding-bottom: 140rpx; }

.sticky-top { position: sticky; top: 0; z-index: 30; background: var(--surface-base, #f5f1ea); }

.search-wrap { padding: 96rpx 32rpx 24rpx; }
.search-bar { display: flex; align-items: center; height: 80rpx; padding: 0 32rpx; border-radius: 999rpx; background: var(--surface-sunken, #ece6dc); border: 2rpx solid var(--line, #e4ddd0); }
.ai-badge { display: flex; align-items: center; gap: 4rpx; padding: 4rpx 12rpx; margin: 0 16rpx; border-radius: 999rpx; background: rgba(196, 30, 58, 0.15); }
.ai-txt { font-size: 18rpx; color: var(--brand); font-weight: 600; line-height: 1; }
.search-ph { font-size: 26rpx; color: var(--text-soft, #999); flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.hot-row { margin-top: 24rpx; white-space: nowrap; }
.hot-inner { display: flex; align-items: center; gap: 16rpx; }
.hot-label { display: flex; align-items: center; gap: 6rpx; flex-shrink: 0; }
.hot-label-txt { font-size: 24rpx; color: var(--text-soft, #999); }
.hot-chip { flex-shrink: 0; padding: 8rpx 24rpx; border-radius: 999rpx; background: var(--surface, #fff); }
.hot-chip-first { background: rgba(196, 30, 58, 0.1); }
.hot-chip-txt { font-size: 24rpx; color: var(--text, #444); }
.hot-chip-first .hot-chip-txt { color: var(--brand); font-weight: 500; }

.cat-row { white-space: nowrap; padding: 0 32rpx 20rpx; }
.cat-inner { display: flex; align-items: center; gap: 8rpx; }
.cat-item { position: relative; flex-shrink: 0; padding: 12rpx 24rpx; }
.cat-txt { font-size: 28rpx; color: var(--text, #444); white-space: nowrap; }
.cat-txt-active { color: var(--brand); font-weight: 600; }
.cat-underline { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 32rpx; height: 4rpx; border-radius: 999rpx; background: var(--brand); }

.grid-section { padding: 32rpx 32rpx 16rpx; }
.svc-section { padding-top: 8rpx; }
.svc-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.svc-bar { width: 6rpx; height: 28rpx; border-radius: 9999rpx; background: var(--brand); }
.svc-title { font-size: 30rpx; font-weight: 700; color: var(--text-strong, #2c2c2c); }
.grid { display: flex; flex-wrap: wrap; }
.grid-item { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin-bottom: 32rpx; }
.grid-icon { width: 96rpx; height: 96rpx; border-radius: 32rpx; background: rgba(196, 30, 58, 0.08); display: flex; align-items: center; justify-content: center; }
.grid-label { font-size: 22rpx; color: var(--text-strong, #2c2c2c); text-align: center; line-height: 1.2; }

.col-section { padding-top: 32rpx; }
.sec-head { display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; margin-bottom: 20rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--text-strong, #2c2c2c); }
.sec-more { display: flex; align-items: center; }
.sec-more-txt { font-size: 24rpx; color: var(--text-soft, #999); }
.col-row { white-space: nowrap; padding: 0 32rpx 8rpx; }
.col-inner { display: flex; gap: 24rpx; }
.col-card { flex-shrink: 0; width: 300rpx; border-radius: 24rpx; overflow: hidden; background: var(--surface, #fff); box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); }
.col-cover { position: relative; width: 100%; height: 200rpx; overflow: hidden; }
.col-img { width: 100%; height: 100%; }
.col-mask { position: absolute; inset: 0; }
.col-cover-txt { position: absolute; bottom: 16rpx; left: 20rpx; right: 20rpx; }
.col-title { display: block; color: #fff; font-weight: 700; font-size: 28rpx; }
.col-subtitle { display: block; color: rgba(255,255,255,0.85); font-size: 20rpx; margin-top: 4rpx; }
.col-foot { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; }
.col-count { font-size: 22rpx; color: var(--text-soft, #999); }
.col-view { font-size: 22rpx; color: var(--brand); font-weight: 500; }

.feed-section { padding-top: 40rpx; }
.feed-head { display: flex; align-items: center; gap: 12rpx; padding: 0 32rpx; margin-bottom: 16rpx; }

.masonry { display: flex; gap: 12rpx; padding: 0 10rpx; }
.masonry-col { flex: 1; display: flex; flex-direction: column; gap: 12rpx; min-width: 0; }

.sk-card { border-radius: 24rpx; background: var(--surface, #fff); overflow: hidden; }
.sk-cover { background: var(--surface-sunken, #ece6dc); }
.sk-34 { aspect-ratio: 3 / 4; }
.sk-11 { aspect-ratio: 1 / 1; }
.sk-body { padding: 20rpx; display: flex; flex-direction: column; gap: 16rpx; }
.sk-line { height: 24rpx; background: var(--surface-sunken, #ece6dc); border-radius: 8rpx; }
.sk-line-short { width: 66%; }

.feed-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 120rpx 0; }
.state-txt { font-size: 28rpx; color: var(--text-soft, #999); }
.state-btn { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 26rpx; }

.feed-end { display: flex; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx 0; }
.end-line { width: 80rpx; height: 2rpx; background: var(--line, #e4ddd0); }
.end-txt { font-size: 26rpx; color: var(--text-soft, #999); }

/* 事业与合作（B 端折叠区，低调灰调与 C 端区分） */
.biz-section { margin: 24rpx 32rpx 0; border-radius: 24rpx; background: var(--surface, #fff); overflow: hidden; }
.biz-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 28rpx; }
.biz-head-left { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.biz-title { font-size: 28rpx; font-weight: 600; color: var(--text, #555); flex-shrink: 0; }
.biz-sub { font-size: 22rpx; color: var(--text-soft, #999); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.biz-grid { padding: 28rpx 16rpx 0; border-top: 2rpx solid var(--line, #f0ece4); }
.biz-icon { background: rgba(138, 131, 120, 0.08); }
</style>
