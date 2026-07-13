<script setup lang="ts">
/**
 * 发现页 · 双列瀑布流 · 按类别分区（董事长拍板：便于维护，与首页一致但按类别分区）
 *
 * 结构（自上而下）：
 *  ① 大搜索框 → ② 运营楼层（block-renderer·discoverBlocks） → ③ 金刚区 2×5（十大板块正门）
 *  → ④ 按类别分区（7 类·每区= 标题 + 更多› + 双列瀑布流 6 张 + 查看更多加载）
 *  → ⑤ 事业与合作（B 端折叠区·董事长拍板保留·放最下）
 *
 * 数据真连：getCategoryFeed(type, page, size=6) → 该类别一页 FeedEnvelope[]，
 * 卡片统一走 <feed-card>（九类通用卡·自带点击/角标/去数字化）。空则隐藏该分区，
 * 追加返回空则隐藏「查看更多」（到底）。
 */
import { ref, reactive, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import FeedCard from '@/components/feed/feed-card.vue'
import { navigateTo } from '@/utils/router'
import { getPublishedLayout, type LayoutBlock } from '@/lib/page-layout-data'
import BlockRenderer from '@/components/layout/block-renderer.vue'
import { getCategoryFeed, type FeedEnvelope } from '@/lib/feed-data'
import { coreEntries, serviceGroups } from '@/lib/discover-data'

// 平台微页面运营楼层（后台「平台页面布局」搭 route='discover' 发布 → 此处渲染；无则不显示）
const discoverBlocks = ref<LayoutBlock[]>([])

// —— 金刚区 2×5：十大板块正门（真跳各板块，href/icon 均来自 coreEntries 真源）——
const kingGrid = coreEntries

// —— B 端「事业与合作」折叠区（董事长拍板：经营变现下沉，与 C 端分层）——
const bizGroup = serviceGroups.find((g) => g.title === '经营变现')
const bizExpanded = ref(false)
function toggleBiz() { bizExpanded.value = !bizExpanded.value }

// ============================================
// 按类别分区（7 类）
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
  { type: 'post',    title: '圈内精华',   more: '/pages/circles/index' },
]

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

/** 首屏加载：各分区并行拉第一页 6 张，返回空则该区不渲染 */
async function loadFirstPages() {
  await Promise.all(
    CATEGORIES.map(async (c) => {
      const s = sections[c.type]
      const list = await getCategoryFeed(c.type, 1, 6)
      s.items = list
      s.loaded = true
      s.noMore = list.length < 6  // 不足一页即到底
    }),
  )
}

/** 「查看更多」：该类别 page++ 再拉 6 张追加；返回空/不足则到底 */
async function loadMore(type: string) {
  const s = sections[type]
  if (s.loadingMore || s.noMore) return
  s.loadingMore = true
  try {
    const next = s.page + 1
    const list = await getCategoryFeed(type, next, 6)
    if (list.length) {
      s.items = s.items.concat(list)
      s.page = next
    }
    if (list.length < 6) s.noMore = true
  } finally {
    s.loadingMore = false
  }
}

onMounted(() => {
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

    <!-- ① 大搜索框：全局搜索主场（框内热词跑马灯 + 点击跳 /search） -->
    <view class="search-row">
      <search-bar default-tab="all" placeholder="搜古籍 · 课程 · 直播 · 掌柜好物" />
    </view>

    <!-- ② 运营楼层（后台平台页面布局·route='discover'·有已发布则渲染，无则不显示） -->
    <view v-if="discoverBlocks.length" class="disc-blocks"><block-renderer :blocks="discoverBlocks" /></view>

    <!-- ③ 金刚区 2×5：十大板块正门 -->
    <view class="kong">
      <view
        v-for="k in kingGrid" :key="k.id"
        class="k" hover-class="k-press" @tap="goEntry(k.href)"
      >
        <view class="k-ic"><AppIcon :name="k.icon" :size="44" color="#C41E3A" /></view>
        <text class="k-label">{{ k.label }}</text>
      </view>
    </view>

    <!-- ④ 按类别分区：每区= 标题 + 更多› + 双列瀑布流 + 查看更多 -->
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

        <!-- 查看更多：加载该类别再 6 张（到底则隐藏） -->
        <view v-if="!sections[cat.type].noMore" class="more-wrap">
          <view class="more-btn" hover-class="more-btn-press" @tap="loadMore(cat.type)">
            <text class="more-btn-txt">{{ sections[cat.type].loadingMore ? '加载中…' : '查看更多' }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- ⑤ 事业与合作（B 端入口折叠区，与 C 端分层，董事长拍板保留） -->
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
/* ② 运营楼层（微页面区块） */
.disc-blocks { padding: 8rpx 0 4rpx; }

/* ③ 金刚区 2×5 */
.kong { display: flex; flex-wrap: wrap; padding: 28rpx 24rpx 8rpx; }
.k { width: 20%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin-bottom: 28rpx; }
.k-press { opacity: 0.6; }
.k-ic { width: 92rpx; height: 92rpx; border-radius: 28rpx; background: $wash; display: flex; align-items: center; justify-content: center; }
.k-label { font-size: 22rpx; color: #6B655B; line-height: 1.2; }

/* ④ 类别分区 */
.cat-section { padding-top: 16rpx; }
.sec { display: flex; align-items: baseline; justify-content: space-between; padding: 16rpx 40rpx 12rpx; }
.sec-title { font-size: 34rpx; font-weight: 700; color: $ink; font-family: var(--font-serif); }
.sec-more { display: flex; align-items: center; }
.sec-more-press { opacity: 0.6; }
.sec-more-txt { font-size: 24rpx; color: $faint; }

/* 双列瀑布流（与首页一致：奇偶分列） */
.flow { display: flex; gap: 12rpx; padding: 0 32rpx; align-items: flex-start; }
.col { flex: 1; display: flex; flex-direction: column; gap: 12rpx; min-width: 0; }

/* 查看更多 */
.more-wrap { display: flex; justify-content: center; padding: 24rpx 0 8rpx; }
.more-btn { padding: 14rpx 56rpx; border-radius: 999rpx; background: $card; border: 2rpx solid $line; box-shadow: 0 2rpx 12rpx rgba(60,50,40,0.06); }
.more-btn-press { opacity: 0.7; }
.more-btn-txt { font-size: 26rpx; color: $sub; }

/* ⑤ 事业与合作（B 端折叠） */
.biz-section { margin: 32rpx 40rpx 0; border-radius: 24rpx; background: $card; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,0.06); }
.biz-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx; }
.biz-head-press { background: $wash; }
.biz-head-left { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.biz-title { font-size: 28rpx; font-weight: 600; color: #555; flex-shrink: 0; }
.biz-sub { font-size: 22rpx; color: $faint; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.biz-grid { display: flex; flex-wrap: wrap; padding: 24rpx 16rpx 0; border-top: 2rpx solid $line; }
.biz-ic { background: rgba(138,131,120,0.10); }
</style>
