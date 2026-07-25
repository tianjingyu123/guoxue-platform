<script setup lang="ts">
/**
 * 发现页 · 双列瀑布流 · 按类别分区（董事长拍板：便于维护，与首页一致但按类别分区）
 *
 * 结构（自上而下）：
 *  ① 大搜索框 → ② 运营楼层（block-renderer·discoverBlocks） → ③ 事业生态五入口
 *  → ④ 按类别分区（6 类·每区= 标题 + 更多› + 双列瀑布流 4 张 + 查看更多渐进加载）
 *  → ⑤ 底部导航
 *
 * 数据真连：getCategoryFeed(type, page, size=4) → 该类别一页 FeedEnvelope[]，
 * 卡片统一走 <feed-card>（九类通用卡·自带点击/角标/去数字化）。空则隐藏该分区；
 * 追加「有返回但不足一页」才判到底（空返回可能是网络失败，保留按钮可重试）。
 * 首屏三态：骨架（.skeleton 微光）→ 六类全空视为整页错误给重试 → 正常分区。
 */
import { ref, reactive, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import PlatformSupportActions from '@/components/common/platform-support-actions.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import FeedCard from '@/components/feed/feed-card.vue'
import { navigateTo } from '@/utils/router'
import { getPublishedLayout, type LayoutBlock } from '@/lib/page-layout-data'
import BlockRenderer from '@/components/layout/block-renderer.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import BusinessEntryGrid from '@/components/navigation/business-entry-grid.vue'
import { getCategoryFeed, isRenderablePublicFeedItem, type FeedEnvelope } from '@/lib/feed-data'

// 状态栏适配：照首页模式动态取 statusBarHeight（原来写死 padding-top:96rpx，
// 刘海屏会顶进状态栏、H5 无状态栏又留大白），搜索行 padding-top = 状态栏高 + 8px 呼吸位
const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

// 平台微页面运营楼层（后台「平台页面布局」搭 route='discover' 发布 → 此处渲染；无则不显示）
const discoverBlocks = ref<LayoutBlock[]>([])

// ============================================
// 按类别分区（6 类公开内容；圈帖只在所属圈子内展示）
// ============================================
interface CategoryDef {
  type: string   // 后端 category type
  title: string  // 分区标题
  more: string   // 「更多›」跳转板块首页
}
const CATEGORIES: CategoryDef[] = [
  { type: 'course',  title: '精选课程',   more: '/pkg-course/home/index' },
  { type: 'classic', title: '经典古籍',   more: '/pkg-classics/home/index' },
  { type: 'video',   title: '热门短视频', more: '/videos' },
  { type: 'live',    title: '正在直播',   more: '/pkg-live/plaza/index' },
  { type: 'article', title: '热门文章',   more: '/pkg-circle/articles/index' },
  { type: 'product', title: '掌柜好物',   more: '/pkg-mall/home/index' },
]
const SECTION_PAGE_SIZE = 4

/** 每个分区独立维护：items + page + loading + 是否到底 */
interface SectionState {
  items: FeedEnvelope[]
  page: number
  loadingMore: boolean
  noMore: boolean
  loaded: boolean  // 首屏是否已加载（loaded 且空 → 整区不渲染）
}
const sections = reactive<Record<string, SectionState>>({})
CATEGORIES.forEach((c) => {
  sections[c.type] = { items: [], page: 1, loadingMore: false, noMore: false, loaded: false }
})

/** 按索引奇偶拆左右两列（与首页双列写法一致） */
function leftCol(type: string): FeedEnvelope[] {
  return sections[type].items.filter((_, i) => i % 2 === 0)
}
function rightCol(type: string): FeedEnvelope[] {
  return sections[type].items.filter((_, i) => i % 2 === 1)
}

// 首屏三态：骨架加载中 / 整页错误重试 / 正常分区
const firstLoading = ref(true)
const loadError = ref(false)

// SWR 首屏缓存（照首页 FEED_CACHE_KEY 模式）：只存六分区各自的第一页（4 张）——
// 再次进入 tab 先渲染缓存跳过骨架屏，后台 loadFirstPages 静默刷新替换
const DISCOVER_CACHE_KEY = 'discover:home:cache'

/** 缓存写入：各分区首页快照（只截第一页 4 张控制体积；全空不写） */
function writeSectionsCache() {
  try {
    const snap: Record<string, FeedEnvelope[]> = {}
    let hasAny = false
    CATEGORIES.forEach((c) => {
      const first = sections[c.type].items.slice(0, SECTION_PAGE_SIZE)
      if (first.length) hasAny = true
      snap[c.type] = first
    })
    if (hasAny) uni.setStorageSync(DISCOVER_CACHE_KEY, snap)
  } catch { /* 存储满等异常不影响主流程 */ }
}

/** 缓存恢复：命中任一分区即返回 true（骨架屏跳过）。结构校验：对象 + 每类 Array.isArray 兜底 */
function restoreSectionsCache(): boolean {
  let hit = false
  try {
    const raw = uni.getStorageSync(DISCOVER_CACHE_KEY) as unknown
    if (raw && typeof raw === 'object') {
      CATEGORIES.forEach((c) => {
        const list = (raw as Record<string, unknown>)[c.type]
        if (Array.isArray(list) && list.length) {
          const s = sections[c.type]
          s.items = (list as FeedEnvelope[]).filter(isRenderablePublicFeedItem)
          if (!s.items.length) return
          s.page = 1
          s.loaded = true
          s.noMore = s.items.length < SECTION_PAGE_SIZE
          hit = true
        }
      })
    }
  } catch { /* 读缓存失败按未命中处理 */ }
  return hit
}

/** 首屏加载：各分区并行拉第一页 4 张，返回空则该区不渲染 */
async function loadFirstPages() {
  // 已有内容时（下拉刷新）不回骨架，静默重拉
  const hadAny = CATEGORIES.some((c) => sections[c.type].items.length > 0)
  if (!hadAny) firstLoading.value = true
  await Promise.all(
    CATEGORIES.map(async (c) => {
      const s = sections[c.type]
      const list = await getCategoryFeed(c.type, 1, SECTION_PAGE_SIZE)
      // 刷新失败（lib 层吞错返回 []）时保留已有内容，不把整区清空
      if (!list.length && s.items.length) return
      s.items = list
      s.page = 1
      s.loaded = true
      // 只有「有返回但不足一页」才判到底；空返回可能是网络失败，不据此锁死
      s.noMore = list.length > 0 && list.length < SECTION_PAGE_SIZE
    }),
  )
  firstLoading.value = false
  // lib 层 getCategoryFeed 吞错返回 []，页面区分不了「全失败」与「六类真的全空」；
  // 生产上六类同时为空几乎只可能是断网/接口挂 → 视为加载失败给整页重试（部分成功则正常显示成功分区）
  loadError.value = CATEGORIES.every((c) => sections[c.type].items.length === 0)
  // SWR：刷新成功（非全空）后落盘各分区首页快照，供下次进 tab 秒开
  if (!loadError.value) writeSectionsCache()
}

/** 整页错误态重试 */
function retryFirst() {
  loadError.value = false
  loadFirstPages()
}

/** 「查看更多」：该类别 page++ 再拉 4 张追加；有返回但不足一页才判到底 */
async function loadMore(type: string) {
  const s = sections[type]
  if (s.loadingMore || s.noMore) return
  s.loadingMore = true
  try {
    const next = s.page + 1
    const list = await getCategoryFeed(type, next, SECTION_PAGE_SIZE)
    if (list.length) {
      s.items = s.items.concat(list)
      s.page = next
      if (list.length < SECTION_PAGE_SIZE) s.noMore = true
    } else {
      // 空返回无法区分「到底」与「请求失败」（lib 层吞错返回 []）：
      // 不设 noMore、保留按钮让用户可重试，避免把一次网络失败当成永久到底
      uni.showToast({ title: '暂时没有更多，稍后再试', icon: 'none' })
    }
  } finally {
    s.loadingMore = false
  }
}

onMounted(() => {
  // SWR：先恢复上次七分区首屏缓存——命中则立即上屏（跳过骨架屏），
  // 随后 loadFirstPages 静默刷新（hadAny=true 不回骨架，失败保留已上屏内容）；未命中走原骨架流程
  if (restoreSectionsCache()) firstLoading.value = false
  loadFirstPages()
  getPublishedLayout('discover').then((l) => { discoverBlocks.value = l.blocks }).catch(() => {})
})

// 下拉刷新：重拉各分区首屏 + 运营楼层，完成后收起刷新态
onPullDownRefresh(async () => {
  try {
    await loadFirstPages()
    await getPublishedLayout('discover').then((l) => { discoverBlocks.value = l.blocks }).catch(() => {})
  } finally {
    uni.stopPullDownRefresh()
  }
})

function goEntry(href: string) { navigateTo(href) }
</script>

<template>
  <view class="page">
    <app-network-bar />
    <customer-service-fab />

    <!-- ① 大搜索框：全局搜索主场（框内热词跑马灯 + 点击跳 /search）·padding-top 动态适配状态栏 -->
    <view class="search-row" :style="{ paddingTop: statusBarHeight + 8 + 'px' }">
      <view class="discover-search">
        <search-bar default-tab="all" placeholder="搜古籍 · 课程 · 直播 · 掌柜好物" />
      </view>
      <platform-support-actions />
    </view>

    <!-- ② 运营楼层（后台平台页面布局·route='discover'·有已发布则渲染，无则不显示） -->
    <view v-if="discoverBlocks.length" class="disc-blocks"><block-renderer :blocks="discoverBlocks" /></view>

    <!-- ③ 事业生态入口；十大核心功能只保留在首页顶部，避免发现页与首页职责重叠 -->
    <business-entry-grid />

    <station-pinned-rail board="home" />

    <!-- ④a 首屏骨架：分区占位（复用全局 .skeleton 微光，2 个假分区各 3 张骨架卡） -->
    <template v-if="firstLoading">
      <view v-for="n in 2" :key="'sk-' + n" class="cat-section">
        <view class="sec"><view class="skeleton sk-title" /></view>
        <view class="flow">
          <view class="col">
            <view class="skeleton sk-card-a" />
            <view class="skeleton sk-card-b" />
          </view>
          <view class="col">
            <view class="skeleton sk-card-b" />
          </view>
        </view>
      </view>
    </template>

    <!-- ④b 整页错误态：七分区全空视为加载失败（lib 层吞错无法逐类分辨），给重试 -->
    <view v-else-if="loadError" class="disc-error">
      <AppIcon name="wifi-off" :size="120" color="#D8D0C4" />
      <text class="disc-error-msg">加载失败，请检查网络后重试</text>
      <view class="disc-error-btn" hover-class="disc-error-btn-press" @tap="retryFirst">
        <text class="disc-error-btn-txt">重新加载</text>
      </view>
    </view>

    <!-- ④ 按类别分区：每区= 标题 + 更多› + 双列瀑布流 + 查看更多 -->
    <template v-else>
    <template v-for="cat in CATEGORIES" :key="cat.type">
      <view v-if="sections[cat.type].loaded && sections[cat.type].items.length" class="cat-section">
        <view class="sec">
          <text class="sec-title">{{ cat.title }}</text>
          <view class="sec-more" hover-class="sec-more-press" @tap="goEntry(cat.more)">
            <text class="sec-more-txt">更多</text>
            <AppIcon name="chevron-right" :size="24" color="#B0A99A" />
          </view>
        </view>

        <view class="flow">
          <view class="col">
            <view v-for="item in leftCol(cat.type)" :key="item.id"><feed-card :item="item" /></view>
          </view>
          <view class="col">
            <view v-for="item in rightCol(cat.type)" :key="item.id"><feed-card :item="item" /></view>
          </view>
        </view>

        <!-- 查看更多：加载该类别再 4 张（到底则隐藏） -->
        <view v-if="!sections[cat.type].noMore" class="more-wrap">
          <view class="more-btn" hover-class="more-btn-press" @tap="loadMore(cat.type)">
            <text class="more-btn-txt">{{ sections[cat.type].loadingMore ? '加载中…' : '查看更多' }}</text>
          </view>
        </view>
      </view>
    </template>
    </template>

    <bottom-nav active="discover" />
  </view>
</template>

<style scoped lang="scss">
/* —— token —— */
$paper: #FAF8F5; $card: #FFFFFF; $red: #C41E3A; $gold: #C9A96E;
$ink: #2C2C2C; $sub: #6E6E73; $faint: #999999; $wash: #F6F1E7; $line: #F2EDE4;

.page { min-height: 100vh; background: $paper; padding-bottom: 140rpx; }

/* ① 搜索：padding-top 由内联 style 按 statusBarHeight 动态计算（此处仅兜底） */
.search-row { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx 8rpx; }
.discover-search { flex: 1; min-width: 0; }
/* ② 运营楼层（微页面区块） */
.disc-blocks { padding: 8rpx 0 4rpx; }

/* ④ 类别分区 */
.cat-section { margin-top: 12rpx; padding-top: 20rpx; border-top: 2rpx solid $line; }
.sec { display: flex; align-items: baseline; justify-content: space-between; padding: 12rpx 32rpx 16rpx; }
.sec-title { font-size: 34rpx; font-weight: 700; color: $ink; font-family: var(--font-serif); }
.sec-more { display: flex; align-items: center; }
.sec-more-press { opacity: 0.6; }
.sec-more-txt { font-size: 24rpx; color: $faint; }

/* 双列瀑布流（与首页一致：奇偶分列） */
.flow { display: flex; gap: 16rpx; padding: 0 24rpx; align-items: flex-start; }
.col { flex: 1; display: flex; flex-direction: column; gap: 12rpx; min-width: 0; }

/* 查看更多 */
.more-wrap { display: flex; justify-content: center; padding: 24rpx 0 8rpx; }
.more-btn { padding: 14rpx 56rpx; border-radius: 999rpx; background: $card; border: 2rpx solid $line; box-shadow: 0 2rpx 12rpx rgba(60,50,40,0.06); }
.more-btn-press { opacity: 0.7; }
.more-btn-txt { font-size: 26rpx; color: $sub; }

/* ④a 首屏骨架（微光动画来自全局 .skeleton·animations.scss） */
.sk-title { width: 200rpx; height: 36rpx; }
.sk-card-a { width: 100%; height: 0; padding-top: 133%; border-radius: 20rpx; }
.sk-card-b { width: 100%; height: 0; padding-top: 90%; border-radius: 20rpx; }

/* ④b 整页错误态 */
.disc-error { padding: 120rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.disc-error-msg { font-size: 28rpx; color: $sub; }
.disc-error-btn { margin-top: 8rpx; padding: 16rpx 64rpx; border-radius: 999rpx; background: $red; }
.disc-error-btn-press { opacity: 0.8; }
.disc-error-btn-txt { font-size: 28rpx; color: #FFFFFF; }

</style>
