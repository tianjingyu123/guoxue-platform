<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import ProductCard from '@/components/cards/product-card.vue'
import CourseCard from '@/components/cards/course-card.vue'
import LiveCard from '@/components/cards/live-card.vue'
import AgentCard from '@/components/cards/agent-card.vue'
import ClassicCard from '@/components/cards/classic-card.vue'
import VideoCard from '@/components/cards/video-card.vue'
import { navigateTo } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import {
  discoverApi, discoverShowcaseApi, coreEntries, serviceGroups,
  type FeedItem, type ShowcaseCard, type ThemeBand,
} from '@/lib/discover-data'

// —— 金刚区 2×5：十大板块正门（真跳各板块，href/icon 均来自 coreEntries 真源）——
const kingGrid = coreEntries

// —— B 端「事业与合作」折叠区（董事长拍板：经营变现下沉，与 C 端分层）——
const bizGroup = serviceGroups.find((g) => g.title === '经营变现')
const bizExpanded = ref(false)
function toggleBiz() { bizExpanded.value = !bizExpanded.value }

// —— 主题策展带（后台运营位缺失 → 用真数据合成占位，见 data 层注释）——
const themeBand = ref<ThemeBand | null>(null)

// —— 四橱窗（各接各板块真实 list 接口，空则隐藏该节）——
const showNewCourses = ref<ShowcaseCard[]>([])
const showLivePreviews = ref<ShowcaseCard[]>([])
const showNewClassics = ref<ShowcaseCard[]>([])
const showNewProducts = ref<ShowcaseCard[]>([])

// —— 今日热榜（Top3 真数据）——
const hotBoard = ref<{ title: string; tail: string; href: string }[]>([])

// —— 底部「为你推荐」瀑布流（保留原真连能力，作为逛完的延伸）——
const activeCategory = ref('all')
const isLoading = ref(true)
const error = ref('')
const feedItems = ref<FeedItem[]>([])
const allCats = ref<{ id: string; label: string }[]>([])
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

// 策展带 + 四橱窗 + 热榜并行加载，各自失败静默降级（不阻塞页面）
async function loadShowcase() {
  const [theme, nc, lp, ncl, np, hb] = await Promise.all([
    discoverShowcaseApi.getThemeBand(),
    discoverShowcaseApi.newCourses(),
    discoverShowcaseApi.livePreviews(),
    discoverShowcaseApi.newClassics(),
    discoverShowcaseApi.newProducts(),
    discoverShowcaseApi.hotBoard(),
  ])
  themeBand.value = theme
  showNewCourses.value = nc
  showLivePreviews.value = lp
  showNewClassics.value = ncl
  showNewProducts.value = np
  hotBoard.value = hb
}

async function loadMeta() {
  allCats.value = await discoverApi.getCategories()
}

onMounted(() => { loadMeta(); loadShowcase(); fetchFeed() })

function retry() { fetchFeed() }
function goEntry(href: string) { navigateTo(href) }
function goCategory(cat: { id: string; label: string }) {
  if (activeCategory.value === cat.id) return
  activeCategory.value = cat.id
  fetchFeed()
}
function goCard(card: ShowcaseCard) { navigateTo(card.href) }
function goRankNo(idx: number): string { return idx === 0 ? 'no-1' : idx === 1 ? 'no-2' : 'no-3' }
</script>

<template>
  <view class="page">
    <app-network-bar />
    <customer-service-fab />

    <!-- ① 大搜索框：全局搜索主场（框内热词跑马灯 + 点击跳 /search） -->
    <view class="search-row">
      <search-bar default-tab="all" placeholder="搜古籍 · 课程 · 直播 · 掌柜好物" />
    </view>

    <!-- ② 金刚区 2×5：十大板块正门 -->
    <view class="kong">
      <view
        v-for="k in kingGrid" :key="k.id"
        class="k" hover-class="k-press" @tap="goEntry(k.href)"
      >
        <view class="k-ic"><AppIcon :name="k.icon" :size="44" color="#C41E3A" /></view>
        <text class="k-label">{{ k.label }}</text>
      </view>
    </view>

    <!-- ③ 主题策展带：横滑大专题卡（运营位缺失时用真数据合成占位） -->
    <view v-if="themeBand" class="theme" hover-class="theme-press" @tap="goEntry(themeBand.href)">
      <view class="theme-ratio">
        <smart-cover class="theme-img" :src="themeBand.cover" :title="themeBand.title" type="course" />
        <view class="theme-shade" />
        <view class="theme-txt">
          <text class="theme-eyebrow">{{ themeBand.eyebrow }}</text>
          <text class="theme-title">{{ themeBand.title }}</text>
          <text class="theme-sub">{{ themeBand.subtitle }}</text>
        </view>
      </view>
    </view>

    <!-- ④ 分板块橱窗 · 本周新课（4:3 信息类模糊延展感 → smart-cover 承载） -->
    <view v-if="showNewCourses.length" class="showcase">
      <view class="sec">
        <text class="sec-title">本周新课</text>
        <view class="sec-more" @tap="goEntry('/courses-list')"><text class="sec-more-txt">更多</text><AppIcon name="chevron-right" :size="24" color="#B0A99A" /></view>
      </view>
      <scroll-view class="rail" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <view
            v-for="c in showNewCourses" :key="c.id"
            class="rcard" hover-class="rcard-press" @tap="goCard(c)"
          >
            <view class="rcov rcov-43"><smart-cover class="rcov-img" :src="c.cover" :title="c.title" type="course" /></view>
            <view class="rbody">
              <text class="rt">{{ c.title }}</text>
              <view class="rs">
                <view v-if="c.price !== undefined" class="price"><text class="price-cny">¥</text><text class="price-num">{{ formatPrice(c.price) }}</text></view>
                <text v-else class="rs-free">免费</text>
                <text class="rs-meta">{{ c.meta }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ④ 橱窗 · 直播预告（3:4 竖卡 + 时间角标） -->
    <view v-if="showLivePreviews.length" class="showcase">
      <view class="sec">
        <text class="sec-title">直播预告</text>
        <view class="sec-more" @tap="goEntry('/pkg-live/plaza/index')"><text class="sec-more-txt">全部</text><AppIcon name="chevron-right" :size="24" color="#B0A99A" /></view>
      </view>
      <scroll-view class="rail" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <view
            v-for="l in showLivePreviews" :key="l.id"
            class="rcard" hover-class="rcard-press" @tap="goCard(l)"
          >
            <view class="rcov rcov-34">
              <smart-cover class="rcov-img" :src="l.cover" :title="l.title" type="live" />
              <text v-if="l.badge" class="rbadge" :class="{ 'rbadge-red': l.badgeStrong }">{{ l.badge }}</text>
            </view>
            <view class="rbody">
              <text class="rt">{{ l.title }}</text>
              <view class="rs"><text class="rs-meta rs-meta-l">{{ l.meta }}</text></view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ④ 橱窗 · 新书上架（书封 3:4，无图走 smart-cover 宣纸兜底） -->
    <view v-if="showNewClassics.length" class="showcase">
      <view class="sec">
        <text class="sec-title">新书上架</text>
        <view class="sec-more" @tap="goEntry('/pkg-classics/home/index')"><text class="sec-more-txt">书库</text><AppIcon name="chevron-right" :size="24" color="#B0A99A" /></view>
      </view>
      <scroll-view class="rail" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <view
            v-for="b in showNewClassics" :key="b.id"
            class="rcard" hover-class="rcard-press" @tap="goCard(b)"
          >
            <view class="rcov rcov-34"><smart-cover class="rcov-img" :src="b.cover" :title="b.title" type="classic" /></view>
            <view class="rbody">
              <text class="rt">{{ b.title }}</text>
              <view class="rs"><text class="rs-meta rs-meta-l">{{ b.meta }}</text></view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ④ 橱窗 · 掌柜好物（商品 1:1 白底 contain） -->
    <view v-if="showNewProducts.length" class="showcase">
      <view class="sec">
        <text class="sec-title">掌柜好物</text>
        <view class="sec-more" @tap="goEntry('/mall')"><text class="sec-more-txt">商城</text><AppIcon name="chevron-right" :size="24" color="#B0A99A" /></view>
      </view>
      <scroll-view class="rail" scroll-x :show-scrollbar="false">
        <view class="rail-inner">
          <view
            v-for="p in showNewProducts" :key="p.id"
            class="rcard" hover-class="rcard-press" @tap="goCard(p)"
          >
            <view class="rcov rcov-11 rcov-white"><smart-cover class="rcov-img rcov-contain" :src="p.cover" :title="p.title" type="product" /></view>
            <view class="rbody">
              <text class="rt">{{ p.title }}</text>
              <view class="rs">
                <view v-if="p.price !== undefined" class="price"><text class="price-cny">¥</text><text class="price-num">{{ formatPrice(p.price) }}</text></view>
                <text class="rs-meta">{{ p.meta }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ⑤ 今日热榜：全站热度榜 Top3 -->
    <view v-if="hotBoard.length" class="showcase">
      <view class="sec">
        <text class="sec-title">今日热榜</text>
      </view>
      <view class="board">
        <view
          v-for="(row, idx) in hotBoard" :key="idx"
          class="brow" hover-class="brow-press" @tap="goEntry(row.href)"
        >
          <text class="bno" :class="goRankNo(idx)">{{ idx + 1 }}</text>
          <text class="bt">{{ row.title }}</text>
          <text class="bm">{{ row.tail }}</text>
        </view>
      </view>
    </view>

    <!-- 事业与合作（B 端入口折叠区，与 C 端分层，董事长拍板保留） -->
    <view v-if="bizGroup" class="biz-section">
      <view class="biz-head" hover-class="biz-head-press" @tap="toggleBiz">
        <view class="biz-head-left">
          <AppIcon name="briefcase" :size="30" color="#8A8578" />
          <text class="biz-title">事业与合作</text>
          <text class="biz-sub">{{ bizGroup.items.map((i) => i.label).join(' · ') }}</text>
        </view>
        <AppIcon :name="bizExpanded ? 'chevron-up' : 'chevron-down'" :size="28" color="#B0A99A" />
      </view>
      <view v-if="bizExpanded" class="biz-grid">
        <view
          v-for="item in bizGroup.items" :key="item.id"
          class="k" hover-class="k-press" @tap="goEntry(item.href)"
        >
          <view class="k-ic biz-ic"><AppIcon :name="item.icon" :size="44" color="#8A8578" /></view>
          <text class="k-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 逛完的延伸：为你推荐（保留原推荐流真连，品类可切） -->
    <view class="feed-section">
      <view class="feed-head">
        <AppIcon name="sparkles" :size="28" color="#C41E3A" />
        <text class="sec-title">为你推荐</text>
      </view>

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

      <!-- 骨架屏 -->
      <view v-if="isLoading" class="masonry">
        <view v-for="col in [0, 1]" :key="col" class="masonry-col">
          <view v-for="i in 3" :key="i" class="sk-card">
            <view :class="['sk-cover', i % 2 === 1 ? 'sk-34' : 'sk-11']" />
            <view class="sk-body"><view class="sk-line" /><view class="sk-line sk-line-short" /></view>
          </view>
        </view>
      </view>

      <view v-else-if="error" class="feed-state">
        <text class="state-txt">{{ error }}</text>
        <view class="state-btn" hover-class="btn-press" @tap="retry">重试</view>
      </view>

      <view v-else-if="!feedItems.length" class="feed-state">
        <text class="state-txt">该品类暂无内容，换个看看</text>
      </view>

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
    </view>

    <!-- 到底提示：逛完有底，回流首页 -->
    <view v-if="!isLoading && !error" class="end">
      <text class="end-txt">已经到底啦 · </text>
      <text class="end-link" @tap="goEntry('/pages/index/index')">去首页看看推荐 ›</text>
    </view>

    <bottom-nav active="discover" />
  </view>
</template>

<style scoped lang="scss">
/* —— token —— */
$paper: #FAF8F5; $card: #FFFFFF; $red: #C41E3A; $gold: #C9A96E;
$ink: #2C2C2C; $sub: #6E6E73; $faint: #999999; $wash: #F6F1E7; $line: #F2EDE4;

.page { min-height: 100vh; background: $paper; padding-bottom: 140rpx; }

/* ① 搜索 */
.search-row { padding: 96rpx 40rpx 8rpx; }

/* ② 金刚区 2×5 */
.kong { display: flex; flex-wrap: wrap; padding: 28rpx 24rpx 8rpx; }
.k { width: 20%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin-bottom: 28rpx; }
.k-press { opacity: 0.6; }
.k-ic { width: 92rpx; height: 92rpx; border-radius: 28rpx; background: $wash; display: flex; align-items: center; justify-content: center; }
.k-label { font-size: 22rpx; color: #6B655B; line-height: 1.2; }

/* ③ 主题策展带 */
.theme { margin: 20rpx 40rpx 8rpx; border-radius: 24rpx; overflow: hidden; box-shadow: 0 4rpx 24rpx rgba(50,40,30,0.10); }
.theme-press { opacity: 0.94; }
.theme-ratio { position: relative; width: 100%; padding-bottom: 50%; }
.theme-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.theme-shade { position: absolute; inset: 0; background:
  linear-gradient(to right, rgba(20,15,10,0.52), rgba(20,15,10,0) 65%),
  linear-gradient(to top, rgba(20,15,10,0.62), rgba(20,15,10,0) 55%); }
.theme-txt { position: absolute; left: 32rpx; bottom: 32rpx; right: 32rpx; }
.theme-eyebrow { display: block; font-size: 22rpx; letter-spacing: 4rpx; color: #E4C98B; font-weight: 700; }
.theme-title { display: block; font-size: 40rpx; font-weight: 900; color: #fff; margin-top: 8rpx; font-family: var(--font-serif); text-shadow: 0 2rpx 8rpx rgba(20,15,10,0.45); }
.theme-sub { display: block; font-size: 24rpx; color: rgba(255,255,255,0.85); margin-top: 6rpx; }

/* ④ 橱窗通用 */
.showcase { padding-top: 24rpx; }
.sec { display: flex; align-items: baseline; justify-content: space-between; padding: 12rpx 40rpx 16rpx; }
.sec-title { font-size: 34rpx; font-weight: 700; color: $ink; font-family: var(--font-serif); }
.sec-more { display: flex; align-items: center; }
.sec-more-txt { font-size: 24rpx; color: $faint; }

.rail { white-space: nowrap; padding: 0 40rpx; }
.rail-inner { display: inline-flex; gap: 18rpx; }
.rcard { flex-shrink: 0; width: 256rpx; background: $card; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,0.06); }
.rcard-press { transform: scale(0.98); }
.rcov { position: relative; width: 100%; overflow: hidden; background: $wash; }
.rcov-43 { padding-bottom: 75%; }
.rcov-34 { padding-bottom: 133.33%; }
.rcov-11 { padding-bottom: 100%; }
.rcov-white { background: #FFF; }
.rcov-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.rcov-contain { object-fit: contain; }
.rbadge { position: absolute; top: 12rpx; right: 12rpx; height: 36rpx; line-height: 36rpx; padding: 0 14rpx; border-radius: 18rpx; font-size: 20rpx; color: #fff; background: rgba(0,0,0,0.55); }
.rbadge-red { background: $red; font-weight: 700; }
.rbody { padding: 16rpx; }
.rt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; white-space: normal; font-size: 26rpx; line-height: 1.4; font-weight: 500; color: $ink; min-height: 72rpx; }
.rs { display: flex; align-items: baseline; justify-content: space-between; margin-top: 10rpx; }
.price { display: flex; align-items: baseline; flex-shrink: 0; }
.price-cny { color: $red; font-weight: 700; font-size: 22rpx; }
.price-num { color: $red; font-weight: 700; font-size: 30rpx; margin-left: 2rpx; }
.rs-free { font-size: 26rpx; font-weight: 700; color: #2E9E5B; flex-shrink: 0; }
.rs-meta { font-size: 20rpx; color: $sub; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-left: 12rpx; }
.rs-meta-l { margin-left: 0; }

/* ⑤ 今日热榜 */
.board { margin: 0 40rpx; background: $card; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(60,50,40,0.06); overflow: hidden; }
.brow { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 28rpx; }
.brow + .brow { border-top: 2rpx solid $line; }
.brow-press { background: $wash; }
.bno { flex-shrink: 0; width: 36rpx; text-align: center; font-size: 32rpx; font-weight: 700; font-family: var(--font-serif); color: $ink; }
.no-1 { color: $red; }
.no-2 { color: $gold; }
.no-3 { color: $ink; }
.bt { flex: 1; min-width: 0; font-size: 28rpx; color: $ink; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bm { flex-shrink: 0; font-size: 22rpx; color: $faint; }

/* 事业与合作（B 端折叠） */
.biz-section { margin: 32rpx 40rpx 0; border-radius: 24rpx; background: $card; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,0.06); }
.biz-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx; }
.biz-head-press { background: $wash; }
.biz-head-left { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.biz-title { font-size: 28rpx; font-weight: 600; color: #555; flex-shrink: 0; }
.biz-sub { font-size: 22rpx; color: $faint; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.biz-grid { display: flex; flex-wrap: wrap; padding: 24rpx 16rpx 0; border-top: 2rpx solid $line; }
.biz-ic { background: rgba(138,131,120,0.10); }

/* 为你推荐 */
.feed-section { padding-top: 40rpx; }
.feed-head { display: flex; align-items: center; gap: 12rpx; padding: 0 40rpx; margin-bottom: 8rpx; }
.cat-row { white-space: nowrap; padding: 8rpx 40rpx 16rpx; }
.cat-inner { display: inline-flex; align-items: center; gap: 8rpx; }
.cat-item { position: relative; flex-shrink: 0; padding: 10rpx 22rpx; }
.cat-txt { font-size: 27rpx; color: $ink; white-space: nowrap; }
.cat-txt-active { color: $red; font-weight: 600; }
.cat-underline { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 32rpx; height: 4rpx; border-radius: 999rpx; background: $red; }

.masonry { display: flex; gap: 12rpx; padding: 0 32rpx; }
.masonry-col { flex: 1; display: flex; flex-direction: column; gap: 12rpx; min-width: 0; }
.sk-card { border-radius: 24rpx; background: $card; overflow: hidden; }
.sk-cover { background: $wash; }
.sk-34 { aspect-ratio: 3 / 4; }
.sk-11 { aspect-ratio: 1 / 1; }
.sk-body { padding: 20rpx; display: flex; flex-direction: column; gap: 16rpx; }
.sk-line { height: 24rpx; background: $wash; border-radius: 8rpx; }
.sk-line-short { width: 66%; }
.feed-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 100rpx 0; }
.state-txt { font-size: 28rpx; color: $faint; }
.state-btn { padding: 12rpx 48rpx; border-radius: 999rpx; background: $red; color: #fff; font-size: 26rpx; }
.btn-press { opacity: 0.85; }

/* 到底 */
.end { display: flex; align-items: center; justify-content: center; padding: 40rpx 0 48rpx; }
.end-txt { font-size: 24rpx; color: $faint; }
.end-link { font-size: 24rpx; color: $red; }
</style>
