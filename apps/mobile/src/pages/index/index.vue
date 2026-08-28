<script setup lang="ts">
/**
 * H1 首页 · 千人千面内容消费流（留客主场 · 强统一双列瀑布流）
 * 1:1 还原 V0 视觉稿 h1-home.html（A 类逐像素）+ 委托书 P1 首页段（2.5 页面结构 / 2.6 混排纪律）。
 *
 * 结构：搜索栏 → 顶部轻 Tab（吸顶胶囊条） → 2×5 功能分类导航 → 双列瀑布流（feed-card 九类卡分发）。
 * 数据：getSmartFeed（真连 GET /recommend/smart-feed/feed），负反馈 sendFeedback（真连 POST /users/feedback）。
 * 瀑布流卡片一律用 <feed-card>，数据来自 getSmartFeed，不造假。
 * X5 合规：padding-top 撑比例不用 aspect-ratio；吸顶实色+透明度不用毛玻璃；负反馈浮层纯色。
 */
import { ref, computed, onMounted, nextTick } from "vue";
import AppIcon from "@/components/common/app-icon.vue";
import PlatformSupportActions from "@/components/common/platform-support-actions.vue";
import FeedCard from "@/components/feed/feed-card.vue";
import BottomNav from "@/components/bottom-nav/bottom-nav.vue";
import CoreEntryGrid from "@/components/navigation/core-entry-grid.vue";
import StationPinnedRail from "@/components/station/station-pinned-rail.vue";
import { navigateTo } from "@/utils/router";
import { VOICE } from "@/lib/voice";
import {
  getSmartFeed,
  sendFeedback,
  ratioPadding,
  type FeedEnvelope,
  type SmartFeedChannel,
} from "@/lib/feed-data";
import { getPublishedLayout, type LayoutBlock } from "@/lib/page-layout-data";
import BlockRenderer from "@/components/layout/block-renderer.vue";
// #ifdef APP-PLUS
import { markIosStartupHomeReady } from "@/lib/ios-startup-recovery";
// #endif

// 自定义导航栏留白
const statusBarHeight = ref(0);
uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 0;
  },
});

// ── 顶部内容频道：同一套双列瀑布流，只切换数据策略 ──
type TabId = SmartFeedChannel | "local";
const tabs: Array<{ id: TabId; label: string; soon?: boolean }> = [
  { id: "recommend", label: "推荐" },
  { id: "following", label: "关注" },
  { id: "hot", label: "热门" },
  { id: "local", label: "同城", soon: true },
];
const activeTab = ref<TabId>("recommend");
const activeChannel = computed<SmartFeedChannel>(() =>
  activeTab.value === "local" ? "recommend" : activeTab.value,
);

// ── feed 数据 + 三态（+ 错误态）──
const feed = ref<FeedEnvelope[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
// 首屏加载失败（服务器错误/断网）标志：与"真的没内容"（空态）区分，展示错误态+重试
const loadError = ref(false);
// 加载更多失败标志：列表尾巴显示「加载失败 · 点击重试」（不再静默吞掉）
const loadMoreError = ref(false);
const page = ref(1);
const PAGE_SIZE = 20;
// 首页 feed 首屏缓存 key（SWR：秒开旧内容 + 后台静默刷新替换）
const FEED_CACHE_KEY = "feed:home:cache";

// 请求序号守卫：静默刷新（init 命中缓存后的后台刷新）与下拉刷新/切频道/加载更多可能并发，
// 慢的旧响应晚到会覆盖新结果（乱序写 feed）。每次 loadFeed 领取自增序号，
// 响应回来时序号已不是最新则整体丢弃（不写 feed/缓存/状态）。
let feedReqSeq = 0;

/** 拉取一页 feed。reset=true 时重置为第一页（下拉刷新/切频道换一批）。
 *  失败时（getSmartFeed 抛错）仅在首屏加载（reset）时置 loadError，交页面显示重试，不误当空态。
 *  返回：true=成功；false=失败（供加载更多回滚页码用）；'stale'=响应过期被更新请求取代（
 *  调用方不回滚不报错，结果由新请求负责）。 */
async function loadFeed(reset = false): Promise<boolean | "stale"> {
  const seq = ++feedReqSeq;
  if (reset) {
    page.value = 1;
    noMore.value = false;
    loadMoreError.value = false;
  }
  let items: FeedEnvelope[];
  try {
    items = await getSmartFeed(page.value, PAGE_SIZE, activeChannel.value);
  } catch {
    // 过期响应：期间已有更新请求发出，本次结果作废，不碰任何状态
    if (seq !== feedReqSeq) return "stale";
    // 服务器错误/断网：首屏失败标记错误态（重试），加载更多失败由调用方回滚页码+尾巴重试
    if (reset) loadError.value = true;
    return false;
  }
  // 过期响应：丢弃，避免慢的旧请求覆盖新请求已上屏的结果
  if (seq !== feedReqSeq) return "stale";
  loadError.value = false;
  // 智能体钩子现已统一转换为真实 BotConfig id，可以与其他内容卡正常混排并直达对话。
  const real = items;
  if (reset) {
    feed.value = real;
    // SWR 缓存：只存推荐频道的首页第一页（控制体积），后续页不写
    if (activeTab.value === "recommend") {
      if (real.length > 0) {
        try {
          uni.setStorageSync(FEED_CACHE_KEY, real);
        } catch {
          /* 存储满等异常不影响主流程 */
        }
      } else {
        // feed 真空：同步清掉旧缓存——否则 SWR 下次进页永远先闪一屏已不存在的旧内容再消失
        try {
          uni.removeStorageSync(FEED_CACHE_KEY);
        } catch {
          /* 清缓存失败不影响主流程 */
        }
      }
    }
  } else {
    feed.value = feed.value.concat(real);
  }
  // 到底判定用后端原始返回条数（不含被过滤的智能体卡），避免因过滤而误判到底
  if (items.length < PAGE_SIZE) noMore.value = true;
  return true;
}

// 平台微页面：首页顶部运营楼层（后台「微页面编辑器」搭 route='home' 平台页发布 → 此处渲染；无则不显示）
const homeBlocks = ref<LayoutBlock[]>([]);

async function init() {
  // 运营楼层：拉已发布平台微页面（有则渲染在瀑布流之上·无则空）
  getPublishedLayout("home")
    .then((l) => {
      homeBlocks.value = l.blocks;
    })
    .catch(() => {});
  // SWR：先读上次首屏缓存——命中则立即上屏（不显示骨架屏），后台静默刷新整批替换（不闪跳）；
  // 无缓存走原有骨架屏流程。缓存读坏（非数组）按未命中处理。
  let cached: FeedEnvelope[] = [];
  try {
    const raw = uni.getStorageSync(FEED_CACHE_KEY);
    if (Array.isArray(raw)) cached = raw;
  } catch {
    /* 读缓存失败按未命中处理 */
  }
  if (cached.length > 0) {
    feed.value = cached;
    loading.value = false;
    // 后台静默刷新：loadFeed(true) 成功后整批替换 feed（一次性赋值不闪跳）；
    // 失败时 loadError 置位但 feed.length>0，错误态模板不触发，旧内容留存
    loadFeed(true);
    return;
  }
  loading.value = true;
  try {
    await loadFeed(true);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // #ifdef APP-PLUS
  // iOS 冷启动看门狗以页面真实挂载为准，避免首页正常显示后又被 reLaunch 成白屏。
  markIosStartupHomeReady();
  // #endif
  init();
});

// 加载失败后重试：清错误标志，重新首屏加载
function retry() {
  loadError.value = false;
  init();
}

// 下拉刷新换一批
async function onRefresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  // 记刷新前首条 id：刷新成功后比对新旧首条，变了才提示"新内容"，没变提示"暂无更新"
  const prevFirstId = feed.value[0]?.id;
  try {
    const ok = await loadFeed(true);
    if (ok === "stale") {
      // 本次刷新响应已被更新请求（如切频道）取代，结果与提示由新请求负责
    } else if (loadError.value && feed.value.length > 0) {
      // 刷新失败但已有旧内容时保留内容（不闪错误页），仅轻提示
      uni.showToast({ title: "刷新失败，请稍后重试", icon: "none" });
    } else if (ok === true) {
      const newFirstId = feed.value[0]?.id;
      uni.showToast({
        title:
          newFirstId !== undefined && newFirstId !== prevFirstId ? "已为你推荐新内容" : "暂无更新",
        icon: "none",
      });
    }
  } finally {
    refreshing.value = false;
  }
}

// 无限滚动加载下一页：失败时回滚页码 -1 + 尾巴亮出「加载失败 · 点击重试」（原为静默吞掉，
// 用户滑到底只看到转圈消失，还以为到底了——下次 scrolltolower 又用错页码跳页）
async function onLoadMore() {
  // refreshing 也要挡：下拉刷新进行中触底会与 reset 请求并发（页码被 reset 归 1 后再 +1 乱序）
  if (loadingMore.value || refreshing.value || noMore.value || loading.value) return;
  loadingMore.value = true;
  loadMoreError.value = false;
  try {
    page.value += 1;
    const ok = await loadFeed(false);
    if (ok === false) {
      page.value -= 1;
      loadMoreError.value = true;
    }
    // ok === 'stale'：响应期间有更新请求（刷新/切频道）已重置页码并接管状态，不回滚不报错
  } finally {
    loadingMore.value = false;
  }
}

// 尾巴「点击重试」：清失败标志重拉同一页
function retryLoadMore() {
  loadMoreError.value = false;
  onLoadMore();
}

// 首页大焦点卡下线后，全部真实 feed 均进入瀑布流，不再静默扣掉首条直播内容。
const flowItems = computed<FeedEnvelope[]>(() => feed.value);

/** 首页所有内容统一进入双列瀑布流，不再按内容类型提升为全宽大卡。 */
function colItems(items: FeedEnvelope[], side: 0 | 1): FeedEnvelope[] {
  return items.filter((_, i) => i % 2 === side);
}

// ── Tab 切换 ──
function switchTab(id: TabId) {
  if (id === "local") {
    uni.showToast({ title: "同城频道即将开放", icon: "none" });
    return;
  }
  if (id === activeTab.value) return;
  activeTab.value = id;
  loading.value = true;
  loadFeed(true).finally(() => {
    loading.value = false;
  });
}

const emptyMessage = computed(() => {
  if (activeTab.value === "following") return "关注的圈子、老师和商铺有新动态时会出现在这里";
  if (activeTab.value === "hot") return "热门榜单正在更新，请稍后再来看看";
  return "这里还没有内容，去发现页逛逛";
});
const emptyAction = computed(() => (activeTab.value === "following" ? "去发现关注" : "去发现"));

// ── 卡片长按 → 负反馈轻浮层 ──
// 自定义长按：原生 @longpress 阈值太短（滑动中手指稍停就误触），改 touch 计时 700ms，
// 且滑动（touchmove 超过阈值）立即取消，避免上下滑时误弹负反馈。
const fbOpen = ref(false);
const fbItem = ref<FeedEnvelope | null>(null);
let lpTimer: ReturnType<typeof setTimeout> | null = null;
let lpStartY = 0;
let lpStartX = 0;
const LONGPRESS_MS = 700;
const LONGPRESS_MOVE_TOL = 10; // px：移动超过此值判定为滑动，取消长按
function clearLp() {
  if (lpTimer) {
    clearTimeout(lpTimer);
    lpTimer = null;
  }
}
function onCardTouchStart(item: FeedEnvelope, e: any) {
  const t = e?.touches?.[0] || e?.changedTouches?.[0];
  lpStartX = t?.clientX ?? 0;
  lpStartY = t?.clientY ?? 0;
  clearLp();
  lpTimer = setTimeout(() => {
    lpTimer = null;
    fbItem.value = item;
    fbOpen.value = true;
  }, LONGPRESS_MS);
}
function onCardTouchMove(e: any) {
  if (!lpTimer) return;
  const t = e?.touches?.[0] || e?.changedTouches?.[0];
  const dx = Math.abs((t?.clientX ?? 0) - lpStartX);
  const dy = Math.abs((t?.clientY ?? 0) - lpStartY);
  if (dx > LONGPRESS_MOVE_TOL || dy > LONGPRESS_MOVE_TOL) clearLp();
}
function onCardTouchEnd() {
  clearLp();
}
function closeFb() {
  fbOpen.value = false;
  fbItem.value = null;
}
async function doFeedback(reason: string) {
  const it = fbItem.value;
  closeFb();
  if (!it) return;
  await sendFeedback(it, reason);
  // 本地即时移除被反馈卡片，不打断浏览
  feed.value = feed.value.filter((i) => i.id !== it.id);
  uni.showToast({ title: "将减少此类内容", icon: "none" });
}

// 回到顶部
const scrollTarget = ref("");
const showBackTop = ref(false);
// 滚动节流(~100ms)：原每帧读 scrollTop 高频触发，加节流壳减少滚动期主线程压力；判定逻辑(>900)不变
let scrollLockTs = 0;
let scrollTrailing: ReturnType<typeof setTimeout> | null = null;
function applyBackTop(top: number) {
  showBackTop.value = top > 900;
}
function onScroll(e: { detail: { scrollTop: number } }) {
  const top = e.detail.scrollTop;
  const now = Date.now();
  if (now - scrollLockTs >= 100) {
    scrollLockTs = now;
    applyBackTop(top);
  } else {
    // 节流窗口内只记尾值，窗口结束后补一次，避免最后一次滚动被丢导致按钮状态卡住
    if (scrollTrailing) clearTimeout(scrollTrailing);
    scrollTrailing = setTimeout(() => {
      scrollLockTs = Date.now();
      applyBackTop(top);
    }, 100);
  }
}
function backToTop() {
  scrollTarget.value = "";
  nextTick(() => {
    scrollTarget.value = "home-scroll-top";
  });
}
</script>

<template>
  <view class="home">
    <app-network-bar />
    <customer-service-fab />

    <!-- 顶栏（自定义导航·实色吸顶）：不回加品牌大字，以统一搜索入口承接首要任务 -->
    <view class="brand-row" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="home-search">
        <search-bar default-tab="all" placeholder="搜古籍 · 课程 · 排盘 · 智能体" />
      </view>
      <platform-support-actions />
    </view>

    <!-- 顶部内容频道：同一套双列瀑布流，仅检索策略不同 -->
    <scroll-view class="tabs" scroll-x :show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ on: activeTab === tab.id, disabled: tab.soon }"
          @tap="switchTab(tab.id)"
        >
          <text class="tab-label">{{ tab.label }}</text>
          <text v-if="tab.soon" class="tab-soon">即将开放</text>
        </view>
      </view>
    </scroll-view>

    <!-- 首屏骨架屏（功能导航 + 双列瀑布流骨架态） -->
    <view v-if="loading" class="content">
      <core-entry-grid />
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
    </view>

    <!-- 错误态：首屏加载失败（服务器错误/断网），提供重试——区别于"真的没内容"的空态 -->
    <view v-else-if="loadError && feed.length === 0" class="empty">
      <AppIcon name="wifi-off" :size="120" color="#D8D0C4" />
      <text class="empty-msg">加载失败，请检查网络后重试</text>
      <view class="empty-btn" hover-class="btn-press" @tap="retry">
        <text class="empty-btn-txt">重新加载</text>
      </view>
    </view>

    <!-- 空态：feed 为空（未登录/无个性化数据），诚实降级不白屏 -->
    <view v-else-if="feed.length === 0" class="empty">
      <AppIcon name="inbox" :size="120" color="#D8D0C4" />
      <text class="empty-msg">{{ emptyMessage }}</text>
      <view class="empty-btn" hover-class="btn-press" @tap="navigateTo('/discover')">
        <text class="empty-btn-txt">{{ emptyAction }}</text>
      </view>
    </view>

    <!-- 正常内容：功能分类导航 + 双列瀑布流 -->
    <scroll-view
      v-else
      scroll-y
      class="content"
      :scroll-into-view="scrollTarget"
      :scroll-with-animation="true"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scroll="onScroll"
      @scrolltolower="onLoadMore"
    >
      <view id="home-scroll-top" class="scroll-anchor" />
      <!-- 运营楼层（后台微页面编辑器·route='home'·有已发布则渲染在最上，无则不显示） -->
      <view v-if="homeBlocks.length" class="home-blocks"
        ><block-renderer :blocks="homeBlocks"
      /></view>

      <!-- 与发现页共用同一套 2×5 功能分类导航，替代原首页大幅焦点卡。 -->
      <core-entry-grid />

      <station-pinned-rail board="home" />

      <!-- 全类型统一双列瀑布流；横屏直播由卡片媒体层居中裁剪进 3:4 容器。 -->
      <view v-if="flowItems.length" class="flow">
        <view class="col">
          <view
            v-for="item in colItems(flowItems, 0)"
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
            v-for="item in colItems(flowItems, 1)"
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

      <!-- 加载更多 / 失败重试 / 到底提示 -->
      <view v-if="loadingMore" class="more-tip"><text class="more-tip-txt">加载中…</text></view>
      <view v-else-if="loadMoreError" class="more-tip" hover-class="btn-press" @tap="retryLoadMore">
        <text class="more-tip-txt more-tip-err">加载失败 · 点击重试</text>
      </view>
      <!-- 卷尾（品牌签名·两侧墨线由全局 .scroll-end 伪元素画，文案统一走 voice.ts） -->
      <view v-else-if="noMore" class="scroll-end"
        ><text>{{ VOICE.END }}</text></view
      >
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
.home {
  min-height: 100vh;
  background-color: #faf8f5;
}

/* ── 品牌行（吸顶实色） ── */
.brand-row {
  position: sticky;
  top: 0;
  z-index: 50;
  height: auto;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx 8rpx;
  background-color: #faf8f5;
}
.home-search {
  flex: 1;
  min-width: 0;
}
.btn-press {
  opacity: 0.7;
}

/* ── 顶部轻 Tab（吸顶胶囊条） ── */
.tabs {
  position: sticky;
  top: 0;
  z-index: 49;
  width: 100%;
  white-space: nowrap;
  background-color: #faf8f5;
}
.tabs-inner {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 750rpx;
  padding: 8rpx 18rpx 16rpx;
}
.tab {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-width: 0;
  padding-bottom: 8rpx;
}
.tab-label {
  font-size: 30rpx;
  color: #8a8578;
}
.tab.on .tab-label {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.tab.disabled .tab-label {
  color: #a9a397;
}
.tab-soon {
  padding: 3rpx 7rpx;
  border: 1rpx solid #ddd4c8;
  border-radius: 999rpx;
  font-size: 16rpx;
  line-height: 1.15;
  color: #9a9184;
  background-color: #f4f0ea;
}
.tab.on::after {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 40rpx;
  height: 6rpx;
  border-radius: 4rpx;
  background-color: #c41e3a;
}
/* ── 内容滚动区 ── */
.content {
  position: absolute;
  left: 0;
  right: 0;
  /* 底部导航高度 + iOS 全面屏安全区（不加 safe-area 时刘海屏底部内容被 home 条遮挡） */
  bottom: calc(112rpx + env(safe-area-inset-bottom));
  top: calc(184rpx + var(--status-bar-height, 0px));
}

/* ── 双列瀑布流 ── */
.flow {
  display: flex;
  gap: 18rpx;
  padding: 0 24rpx 18rpx;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  min-width: 0;
}
/* 运营楼层（微页面区块） */
.home-blocks {
  padding: 8rpx 0 12rpx;
}

/* 加载更多 / 到底 */
.more-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
}
.more-tip-txt {
  font-size: 24rpx;
  color: #999999;
}
/* 加载更多失败重试（朱红提醒色，可点） */
.more-tip-err {
  color: #c41e3a;
}
/* 到底提示改用全局 .scroll-end（signature.scss 卷尾墨线），此处只补页底留白 */
.scroll-end {
  padding-bottom: 64rpx;
}

/* ── 空态 ── */
.empty {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(184rpx + var(--status-bar-height, 0px));
  /* 与 .content 同口径：底部导航 + 安全区 */
  bottom: calc(112rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
}
.empty-msg {
  font-size: 28rpx;
  color: #6e6e73;
}
.empty-btn {
  padding: 20rpx 60rpx;
  border-radius: 999rpx;
  background-color: #c41e3a;
}
.empty-btn-txt {
  font-size: 28rpx;
  color: #ffffff;
}

/* ── 骨架屏 ── */
.sk-card {
  width: 100%;
  height: 0;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #efebe4 25%, #f7f4ef 37%, #efebe4 63%);
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
  background-color: #ffffff;
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
  background-color: #ffffff;
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
.fb-item-txt {
  font-size: 30rpx;
  color: #2c2c2c;
}
.fb-item-press {
  background-color: #f6f1e7;
  border-radius: 16rpx;
}
.fb-cancel {
  margin-top: 12rpx;
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background-color: #f6f1e7;
}
.fb-cancel-txt {
  font-size: 30rpx;
  font-weight: 500;
  color: #6e6e73;
}

/* ── 动效（纯装饰·X5 合规） ── */
@keyframes breathe {
  0%,
  100% {
    transform: scale(0.75);
    opacity: 0.55;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes eq {
  0%,
  100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
}
@keyframes slowzoom {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}
@keyframes sk-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
