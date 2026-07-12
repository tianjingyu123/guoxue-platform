<script setup lang="ts">
/**
 * H1 首页 · 千人千面内容消费流（留客主场 · 强统一双列瀑布流）
 * 1:1 还原 V0 视觉稿 h1-home.html（A 类逐像素）+ 委托书 P1 首页段（2.5 页面结构 / 2.6 混排纪律）。
 *
 * 结构：品牌行 → 焦点区（编辑式·直播优先） → 顶部轻 Tab（吸顶胶囊条） → 双列瀑布流（feed-card 九类卡分发）。
 * 数据：getSmartFeed（真连 GET /recommend/smart-feed/feed），负反馈 sendFeedback（真连 POST /users/feedback）。
 * 瀑布流卡片一律用 <feed-card>，数据来自 getSmartFeed，不造假。
 * X5 合规：padding-top 撑比例不用 aspect-ratio；吸顶实色+透明度不用毛玻璃；负反馈浮层纯色。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import FeedCard from '@/components/feed/feed-card.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import { navigateTo } from '@/utils/router'
import { getSmartFeed, sendFeedback, ratioPadding, type FeedEnvelope } from '@/lib/feed-data'

// 自定义导航栏留白
const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

// ── 顶部轻 Tab（推荐/关注/直播广场/古籍/课程/商城）──
// 直播广场为胶囊入口（点击跳 H3 直播广场），其余为频道切换（推荐/关注驱动 feed，古籍/课程/商城跳板块）
type TabId = 'recommend' | 'follow' | 'classic' | 'course' | 'mall'
const tabs: { id: TabId; label: string }[] = [
  { id: 'recommend', label: '推荐' },
  { id: 'follow', label: '关注' },
  { id: 'classic', label: '古籍' },
  { id: 'course', label: '课程' },
  { id: 'mall', label: '商城' },
]
const activeTab = ref<TabId>('recommend')

// ── feed 数据 + 三态 ──
const feed = ref<FeedEnvelope[]>([])
const loading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const page = ref(1)
const PAGE_SIZE = 20

/** 拉取一页 feed。reset=true 时重置为第一页（下拉刷新/切频道换一批） */
async function loadFeed(reset = false) {
  if (reset) {
    page.value = 1
    noMore.value = false
  }
  const items = await getSmartFeed(page.value, PAGE_SIZE)
  if (reset) {
    feed.value = items
  } else {
    feed.value = feed.value.concat(items)
  }
  if (items.length < PAGE_SIZE) noMore.value = true
}

async function init() {
  loading.value = true
  try {
    await loadFeed(true)
  } finally {
    loading.value = false
  }
}

onMounted(() => { init() })

// 下拉刷新换一批
async function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await loadFeed(true)
  } finally {
    refreshing.value = false
  }
}

// 无限滚动加载下一页
async function onLoadMore() {
  if (loadingMore.value || noMore.value || loading.value) return
  loadingMore.value = true
  try {
    page.value += 1
    await loadFeed(false)
  } finally {
    loadingMore.value = false
  }
}

// ── 焦点区（编辑式·直播优先）：取 feed 中首个直播卡，无直播则取首卡兜底 ──
const focusItem = computed<FeedEnvelope | undefined>(() => {
  return feed.value.find((i) => i.type === 'live') || feed.value[0]
})
// 瀑布流卡池 = 全部 feed 去掉焦点卡（避免重复出现）
const flowItems = computed<FeedEnvelope[]>(() => {
  const fid = focusItem.value?.id
  return fid ? feed.value.filter((i) => i.id !== fid) : feed.value
})
const focusIsLive = computed(() => focusItem.value?.type === 'live')

function goFocus() {
  const it = focusItem.value
  if (!it) return
  if (it.type === 'live') navigateTo(`/live/${it.id}`)
  else navigateTo(`/articles/${it.id}`)
}

// ── 双列瀑布流：顺序分左右两列（按索引奇偶轮询，等权体量）──
const leftColumn = computed(() => flowItems.value.filter((_, i) => i % 2 === 0))
const rightColumn = computed(() => flowItems.value.filter((_, i) => i % 2 === 1))

// ── Tab 切换 ──
function switchTab(id: TabId) {
  // 直播广场胶囊在模板内单独走 goPlaza，此处只处理频道 Tab
  if (id === 'classic') { navigateTo('/pkg-classics/home/index'); return }
  if (id === 'course') { navigateTo('/pkg-course/home/index'); return }
  if (id === 'mall') { navigateTo('/pkg-mall/home/index'); return }
  if (id === activeTab.value) return
  activeTab.value = id
  // 推荐/关注：换一批（后端 feed 已按登录用户个性化，前端照单渲染）
  loading.value = true
  loadFeed(true).finally(() => { loading.value = false })
}
function goPlaza() {
  navigateTo('/pkg-live/plaza/index')
}
function goSearch() {
  navigateTo('/search')
}

// ── 卡片长按 → 负反馈轻浮层 ──
// 自定义长按：原生 @longpress 阈值太短（滑动中手指稍停就误触），改 touch 计时 700ms，
// 且滑动（touchmove 超过阈值）立即取消，避免上下滑时误弹负反馈。
const fbOpen = ref(false)
const fbItem = ref<FeedEnvelope | null>(null)
let lpTimer: ReturnType<typeof setTimeout> | null = null
let lpStartY = 0
let lpStartX = 0
const LONGPRESS_MS = 700
const LONGPRESS_MOVE_TOL = 10 // px：移动超过此值判定为滑动，取消长按
function clearLp() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null } }
function onCardTouchStart(item: FeedEnvelope, e: any) {
  const t = e?.touches?.[0] || e?.changedTouches?.[0]
  lpStartX = t?.clientX ?? 0
  lpStartY = t?.clientY ?? 0
  clearLp()
  lpTimer = setTimeout(() => {
    lpTimer = null
    fbItem.value = item
    fbOpen.value = true
  }, LONGPRESS_MS)
}
function onCardTouchMove(e: any) {
  if (!lpTimer) return
  const t = e?.touches?.[0] || e?.changedTouches?.[0]
  const dx = Math.abs((t?.clientX ?? 0) - lpStartX)
  const dy = Math.abs((t?.clientY ?? 0) - lpStartY)
  if (dx > LONGPRESS_MOVE_TOL || dy > LONGPRESS_MOVE_TOL) clearLp()
}
function onCardTouchEnd() { clearLp() }
function closeFb() {
  fbOpen.value = false
  fbItem.value = null
}
async function doFeedback(reason: string) {
  const it = fbItem.value
  closeFb()
  if (!it) return
  await sendFeedback(it, reason)
  // 本地即时移除被反馈卡片，不打断浏览
  feed.value = feed.value.filter((i) => i.id !== it.id)
  uni.showToast({ title: '将减少此类内容', icon: 'none' })
}

// 回到顶部
const scrollTopVal = ref(0)
const showBackTop = ref(false)
function onScroll(e: { detail: { scrollTop: number } }) {
  showBackTop.value = e.detail.scrollTop > 900
}
function backToTop() {
  scrollTopVal.value = scrollTopVal.value === 0 ? 1 : 0
  setTimeout(() => (scrollTopVal.value = 0), 30)
}
</script>

<template>
  <view class="home">
    <app-network-bar />
    <customer-service-fab />

    <!-- 品牌行（自定义导航顶栏，实色吸顶） -->
    <view class="brand-row" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="brand">热<text class="brand-em">卜</text>国学</view>
      <view class="search-btn" hover-class="btn-press" @tap="goSearch">
        <AppIcon name="search" :size="32" color="#8A8578" :stroke-width="2" />
      </view>
    </view>

    <!-- 顶部轻 Tab：推荐/关注 频道 + 直播广场胶囊 + 古籍/课程/商城 板块入口（吸顶） -->
    <scroll-view class="tabs" scroll-x :show-scrollbar="false">
      <view class="tabs-inner">
        <view class="tab" :class="{ on: activeTab === 'recommend' }" @tap="switchTab('recommend')">
          <text class="tab-label">推荐</text>
        </view>
        <view class="tab" :class="{ on: activeTab === 'follow' }" @tap="switchTab('follow')">
          <text class="tab-label">关注</text>
        </view>
        <!-- 直播广场胶囊：朱红 8% 底 + 朱红字 + 呼吸红点，点击跳 H3 直播广场 -->
        <view class="tab-live" hover-class="btn-press" @tap="goPlaza">
          <view class="tab-live-dot" />
          <text class="tab-live-txt">直播广场</text>
        </view>
        <view class="tab" @tap="switchTab('classic')"><text class="tab-label">古籍</text></view>
        <view class="tab" @tap="switchTab('course')"><text class="tab-label">课程</text></view>
        <view class="tab" @tap="switchTab('mall')"><text class="tab-label">商城</text></view>
      </view>
    </scroll-view>

    <!-- 首屏骨架屏（焦点区 + 双列瀑布流骨架态） -->
    <scroll-view v-if="loading" scroll-y class="content">
      <view class="sk-focus" />
      <view class="flow">
        <view class="col">
          <view class="sk-card" style="padding-top: 133.33%" />
          <view class="sk-card" style="padding-top: 75%" />
          <view class="sk-card" style="padding-top: 133.33%" />
        </view>
        <view class="col">
          <view class="sk-card" style="padding-top: 100%" />
          <view class="sk-card" style="padding-top: 133.33%" />
          <view class="sk-card" style="padding-top: 75%" />
        </view>
      </view>
    </scroll-view>

    <!-- 空态：feed 为空（未登录/无个性化数据），诚实降级不白屏 -->
    <view v-else-if="feed.length === 0" class="empty">
      <AppIcon name="inbox" :size="120" color="#D8D0C4" />
      <text class="empty-msg">这里还没有内容，去发现页逛逛</text>
      <view class="empty-btn" hover-class="btn-press" @tap="navigateTo('/discover')">
        <text class="empty-btn-txt">去发现</text>
      </view>
    </view>

    <!-- 正常内容：焦点区 + 双列瀑布流 -->
    <scroll-view
      v-else
      scroll-y
      class="content"
      :scroll-top="scrollTopVal"
      :scroll-with-animation="true"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scroll="onScroll"
      @scrolltolower="onLoadMore"
    >
      <!-- 焦点区（编辑式·直播优先）：16:10 大卡 + 底部渐变衬底 + 直播中动效 -->
      <view v-if="focusItem" class="focus" hover-class="focus-press" @tap="goFocus">
        <view class="focus-ratio">
          <image
            v-if="focusItem.cover"
            class="focus-cov"
            :class="{ live: focusIsLive }"
            :src="focusItem.cover"
            mode="aspectFill"
          />
          <view v-else class="focus-cov focus-cov-fallback" />
          <view class="focus-shade" />
          <!-- 直播中胶囊：呼吸点 + 音浪律动 -->
          <view v-if="focusIsLive" class="live-chip">
            <view class="live-chip-dot" />
            <text class="live-chip-txt">直播中</text>
            <view class="eq"><view class="eq-i eq1" /><view class="eq-i eq2" /><view class="eq-i eq3" /></view>
          </view>
          <view class="focus-txt">
            <text class="focus-title">{{ focusItem.title }}</text>
            <text v-if="focusItem.subtitle || focusItem.author" class="focus-sub">
              {{ focusItem.author?.name }}{{ focusItem.subtitle ? ' · ' + focusItem.subtitle : '' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 双列瀑布流：feed-card 九类卡分发（长按呼负反馈浮层） -->
      <view class="flow">
        <view class="col">
          <view
            v-for="item in leftColumn"
            :key="item.id"
            @touchstart="onCardTouchStart(item, $event)"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
            @touchcancel="onCardTouchEnd"
          >
            <feed-card :item="item" />
          </view>
        </view>
        <view class="col">
          <view
            v-for="item in rightColumn"
            :key="item.id"
            @touchstart="onCardTouchStart(item, $event)"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
            @touchcancel="onCardTouchEnd"
          >
            <feed-card :item="item" />
          </view>
        </view>
      </view>

      <!-- 加载更多 / 到底提示 -->
      <view v-if="loadingMore" class="more-tip"><text class="more-tip-txt">加载中…</text></view>
      <view v-else-if="noMore" class="end">
        <view class="end-line" /><text class="end-text">已经到底了</text><view class="end-line" />
      </view>
    </scroll-view>

    <!-- 回到顶部 -->
    <view v-if="showBackTop" class="back-top" hover-class="btn-press" @tap="backToTop">
      <AppIcon name="chevron-up" :size="36" color="#8A8578" :stroke-width="2.4" />
    </view>

    <!-- 卡片长按负反馈轻浮层（纯色·X5 合规） -->
    <view v-if="fbOpen" class="fb-mask" @tap="closeFb">
      <view class="fb-sheet" @tap.stop>
        <view class="fb-item" hover-class="fb-item-press" @tap="doFeedback('not_interested')">
          <AppIcon name="eye-off" :size="36" color="#6E6E73" :stroke-width="1.8" />
          <text class="fb-item-txt">不感兴趣</text>
        </view>
        <view class="fb-item" hover-class="fb-item-press" @tap="doFeedback('reduce_this_type')">
          <AppIcon name="x-circle" :size="36" color="#6E6E73" :stroke-width="1.8" />
          <text class="fb-item-txt">减少此类内容</text>
        </view>
        <view class="fb-cancel" hover-class="fb-item-press" @tap="closeFb">
          <text class="fb-cancel-txt">取消</text>
        </view>
      </view>
    </view>

    <bottom-nav active="home" />
  </view>
</template>

<style scoped>
/* 视觉 token：页底 #FAF8F5 / 卡片 #FFF / 朱红 #C41E3A / 金 #C9A96E / 文字 #2C2C2C·#6E6E73·#999 / 宣纸 #F6F1E7 */
.home { min-height: 100vh; background-color: #FAF8F5; }

/* ── 品牌行（吸顶实色） ── */
.brand-row {
  position: sticky;
  top: 0;
  z-index: 50;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 24rpx 8rpx;
  background-color: #FAF8F5;
}
.brand {
  font-size: 44rpx;
  font-weight: 900;
  letter-spacing: 6rpx;
  color: #2C2C2C;
  font-family: 'Noto Serif SC', serif;
}
.brand-em { color: #C41E3A; }
.search-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: #FFFFFF;
  box-shadow: 0 2rpx 6rpx rgba(60, 50, 40, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-press { opacity: 0.7; }

/* ── 顶部轻 Tab（吸顶胶囊条） ── */
.tabs {
  position: sticky;
  top: 0;
  z-index: 49;
  width: 100%;
  white-space: nowrap;
  background-color: #FAF8F5;
}
.tabs-inner { display: inline-flex; align-items: center; gap: 44rpx; padding: 8rpx 24rpx 16rpx; }
.tab { position: relative; padding-bottom: 8rpx; }
.tab-label { font-size: 30rpx; color: #8A8578; }
.tab.on .tab-label { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.tab.on::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 40rpx;
  height: 6rpx;
  border-radius: 4rpx;
  background-color: #C41E3A;
}
/* 直播广场胶囊 */
.tab-live {
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 28rpx;
  background-color: rgba(196, 30, 58, 0.08);
}
.tab-live-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #C41E3A;
  animation: breathe 1.6s ease-in-out infinite;
}
.tab-live-txt { font-size: 24rpx; font-weight: 500; color: #C41E3A; }

/* ── 内容滚动区 ── */
.content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 112rpx;
  top: calc(160rpx + var(--status-bar-height, 0px));
}

/* ── 焦点区（16:10 · 编辑式直播优先） ── */
.focus {
  margin: 8rpx 24rpx 24rpx;
  border-radius: 28rpx;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4rpx 20rpx rgba(60, 50, 40, 0.1);
}
.focus-press { opacity: 0.94; }
.focus-ratio { position: relative; width: 100%; height: 0; padding-top: 62.5%; overflow: hidden; }
.focus-cov { position: absolute; inset: 0; width: 100%; height: 100%; }
.focus-cov-fallback { background: linear-gradient(135deg, #E5DCC9 0%, #D8CDB5 100%); }
/* 封面呼吸变焦（直播态·缓慢 14s alternate·纯装饰） */
.focus-cov.live { animation: slowzoom 14s ease-in-out infinite alternate; }
.focus-shade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 192rpx;
  background: linear-gradient(to top, rgba(20, 15, 10, 0.72), rgba(20, 15, 10, 0));
}
.live-chip {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 44rpx;
  padding: 0 18rpx;
  border-radius: 22rpx;
  background-color: #C41E3A;
}
.live-chip-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #FFFFFF;
  animation: breathe 1.6s ease-in-out infinite;
}
.live-chip-txt { font-size: 22rpx; font-weight: 700; color: #FFFFFF; }
/* 音浪律动条（3 根错峰 1.1s） */
.eq { display: inline-flex; align-items: flex-end; gap: 4rpx; height: 20rpx; }
.eq-i { width: 4rpx; border-radius: 2rpx; background-color: #FFFFFF; animation: eq 1.1s ease-in-out infinite; }
.eq1 { height: 8rpx; animation-delay: 0s; }
.eq2 { height: 18rpx; animation-delay: 0.25s; }
.eq3 { height: 12rpx; animation-delay: 0.5s; }
.focus-txt { position: absolute; left: 28rpx; right: 28rpx; bottom: 24rpx; display: flex; flex-direction: column; gap: 8rpx; }
.focus-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #FFFFFF;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.focus-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 双列瀑布流 ── */
.flow { display: flex; gap: 18rpx; padding: 0 24rpx 24rpx; }
.col { flex: 1; display: flex; flex-direction: column; gap: 18rpx; min-width: 0; }

/* 加载更多 / 到底 */
.more-tip { display: flex; align-items: center; justify-content: center; padding: 32rpx 0; }
.more-tip-txt { font-size: 24rpx; color: #999999; }
.end { display: flex; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx 0 64rpx; }
.end-line { width: 60rpx; height: 1rpx; background-color: #E8E0D5; }
.end-text { font-size: 24rpx; color: #999999; }

/* ── 空态 ── */
.empty {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(160rpx + var(--status-bar-height, 0px));
  bottom: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
}
.empty-msg { font-size: 28rpx; color: #6E6E73; }
.empty-btn {
  padding: 20rpx 60rpx;
  border-radius: 999rpx;
  background-color: #C41E3A;
}
.empty-btn-txt { font-size: 28rpx; color: #FFFFFF; }

/* ── 骨架屏 ── */
.sk-focus {
  margin: 8rpx 24rpx 24rpx;
  height: 0;
  padding-top: 62.5%;
  border-radius: 28rpx;
  background: linear-gradient(90deg, #EFEBE4 25%, #F7F4EF 37%, #EFEBE4 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}
.sk-card {
  width: 100%;
  height: 0;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #EFEBE4 25%, #F7F4EF 37%, #EFEBE4 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

/* ── 回到顶部 ── */
.back-top {
  position: fixed;
  right: 32rpx;
  bottom: 176rpx;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(60, 50, 40, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

/* ── 负反馈轻浮层（纯色底部弹层） ── */
.fb-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.fb-sheet {
  background-color: #FFFFFF;
  border-radius: 28rpx 28rpx 0 0;
  padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
}
.fb-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  height: 104rpx;
  padding: 0 16rpx;
}
.fb-item-txt { font-size: 30rpx; color: #2C2C2C; }
.fb-item-press { background-color: #F6F1E7; border-radius: 16rpx; }
.fb-cancel {
  margin-top: 12rpx;
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background-color: #F6F1E7;
}
.fb-cancel-txt { font-size: 30rpx; font-weight: 500; color: #6E6E73; }

/* ── 动效（纯装饰·X5 合规） ── */
@keyframes breathe { 0%, 100% { transform: scale(0.75); opacity: 0.55; } 50% { transform: scale(1); opacity: 1; } }
@keyframes eq { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
@keyframes slowzoom { from { transform: scale(1); } to { transform: scale(1.05); } }
@keyframes sk-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
</style>
