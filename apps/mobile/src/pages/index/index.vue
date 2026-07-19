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
import SmartCover from '@/components/common/smart-cover.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import DailyStudy from '@/components/home/daily-study.vue'
import { navigateTo } from '@/utils/router'
import { VOICE } from '@/lib/voice'
import { getSmartFeed, sendFeedback, ratioPadding, feedTargetUrl, type FeedEnvelope } from '@/lib/feed-data'
import { getPublishedLayout, type LayoutBlock } from '@/lib/page-layout-data'
import BlockRenderer from '@/components/layout/block-renderer.vue'

// 自定义导航栏留白
const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

// ── 顶部轻 Tab（推荐/关注/直播广场/古籍/课程/商城）──
// 直播广场为胶囊入口（点击跳 H3 直播广场），其余为频道切换（推荐/关注驱动 feed，古籍/课程/商城跳板块）
type TabId = 'recommend' | 'follow' | 'classic' | 'course' | 'mall'
// 注：「关注」Tab 已在模板中暂下线（假功能：与推荐同请求同参数），此处配置与 switchTab
// 的 follow 分支防御性保留，待后端 channel 参数上线后随模板一并恢复。
const tabs: { id: TabId; label: string }[] = [
  { id: 'recommend', label: '推荐' },
  { id: 'follow', label: '关注' },
  { id: 'classic', label: '古籍' },
  { id: 'course', label: '课程' },
  { id: 'mall', label: '商城' },
]
const activeTab = ref<TabId>('recommend')

// ── feed 数据 + 三态（+ 错误态）──
const feed = ref<FeedEnvelope[]>([])
const loading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
// 首屏加载失败（服务器错误/断网）标志：与"真的没内容"（空态）区分，展示错误态+重试
const loadError = ref(false)
// 加载更多失败标志：列表尾巴显示「加载失败 · 点击重试」（不再静默吞掉）
const loadMoreError = ref(false)
const page = ref(1)
const PAGE_SIZE = 20
// 首页 feed 首屏缓存 key（SWR：秒开旧内容 + 后台静默刷新替换）
const FEED_CACHE_KEY = 'feed:home:cache'

// 请求序号守卫：静默刷新（init 命中缓存后的后台刷新）与下拉刷新/切频道/加载更多可能并发，
// 慢的旧响应晚到会覆盖新结果（乱序写 feed）。每次 loadFeed 领取自增序号，
// 响应回来时序号已不是最新则整体丢弃（不写 feed/缓存/状态）。
let feedReqSeq = 0

/** 拉取一页 feed。reset=true 时重置为第一页（下拉刷新/切频道换一批）。
 *  失败时（getSmartFeed 抛错）仅在首屏加载（reset）时置 loadError，交页面显示重试，不误当空态。
 *  返回：true=成功；false=失败（供加载更多回滚页码用）；'stale'=响应过期被更新请求取代（
 *  调用方不回滚不报错，结果由新请求负责）。 */
async function loadFeed(reset = false): Promise<boolean | 'stale'> {
  const seq = ++feedReqSeq
  if (reset) {
    page.value = 1
    noMore.value = false
    loadMoreError.value = false
  }
  let items: FeedEnvelope[]
  try {
    items = await getSmartFeed(page.value, PAGE_SIZE)
  } catch {
    // 过期响应：期间已有更新请求发出，本次结果作废，不碰任何状态
    if (seq !== feedReqSeq) return 'stale'
    // 服务器错误/断网：首屏失败标记错误态（重试），加载更多失败由调用方回滚页码+尾巴重试
    if (reset) loadError.value = true
    return false
  }
  // 过期响应：丢弃，避免慢的旧请求覆盖新请求已上屏的结果
  if (seq !== feedReqSeq) return 'stale'
  loadError.value = false
  // 过滤后端仍在塞的智能体卡：其 targetId 为占位 id（如 hook-agent），点进对话页查真实
  // agent → "智能体不存在"死链。智能体入口改由金刚区真实入口承载，首页 feed 只排真实内容。
  const real = items.filter((i) => i.type !== 'agent')
  if (reset) {
    feed.value = real
    // SWR 缓存：只存推荐频道的首页第一页（控制体积），后续页不写
    if (activeTab.value === 'recommend') {
      if (real.length > 0) {
        try { uni.setStorageSync(FEED_CACHE_KEY, real) } catch { /* 存储满等异常不影响主流程 */ }
      } else {
        // feed 真空：同步清掉旧缓存——否则 SWR 下次进页永远先闪一屏已不存在的旧内容再消失
        try { uni.removeStorageSync(FEED_CACHE_KEY) } catch { /* 清缓存失败不影响主流程 */ }
      }
    }
  } else {
    feed.value = feed.value.concat(real)
  }
  // 到底判定用后端原始返回条数（不含被过滤的智能体卡），避免因过滤而误判到底
  if (items.length < PAGE_SIZE) noMore.value = true
  return true
}

// 平台微页面：首页顶部运营楼层（后台「微页面编辑器」搭 route='home' 平台页发布 → 此处渲染；无则不显示）
const homeBlocks = ref<LayoutBlock[]>([])

async function init() {
  // 运营楼层：拉已发布平台微页面（有则渲染在瀑布流之上·无则空）
  getPublishedLayout('home').then((l) => { homeBlocks.value = l.blocks }).catch(() => {})
  // SWR：先读上次首屏缓存——命中则立即上屏（不显示骨架屏），后台静默刷新整批替换（不闪跳）；
  // 无缓存走原有骨架屏流程。缓存读坏（非数组）按未命中处理。
  let cached: FeedEnvelope[] = []
  try {
    const raw = uni.getStorageSync(FEED_CACHE_KEY)
    if (Array.isArray(raw)) cached = raw
  } catch { /* 读缓存失败按未命中处理 */ }
  if (cached.length > 0) {
    feed.value = cached
    loading.value = false
    // 后台静默刷新：loadFeed(true) 成功后整批替换 feed（一次性赋值不闪跳）；
    // 失败时 loadError 置位但 feed.length>0，错误态模板不触发，旧内容留存
    loadFeed(true)
    return
  }
  loading.value = true
  try {
    await loadFeed(true)
  } finally {
    loading.value = false
  }
}

onMounted(() => { init() })

// 加载失败后重试：清错误标志，重新首屏加载
function retry() {
  loadError.value = false
  init()
}

// 下拉刷新换一批
async function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  // 记刷新前首条 id：刷新成功后比对新旧首条，变了才提示"新内容"，没变提示"暂无更新"
  const prevFirstId = feed.value[0]?.id
  try {
    const ok = await loadFeed(true)
    if (ok === 'stale') {
      // 本次刷新响应已被更新请求（如切频道）取代，结果与提示由新请求负责
    } else if (loadError.value && feed.value.length > 0) {
      // 刷新失败但已有旧内容时保留内容（不闪错误页），仅轻提示
      uni.showToast({ title: '刷新失败，请稍后重试', icon: 'none' })
    } else if (ok === true) {
      const newFirstId = feed.value[0]?.id
      uni.showToast({
        title: newFirstId !== undefined && newFirstId !== prevFirstId ? '已为你推荐新内容' : '暂无更新',
        icon: 'none',
      })
    }
  } finally {
    refreshing.value = false
  }
}

// 无限滚动加载下一页：失败时回滚页码 -1 + 尾巴亮出「加载失败 · 点击重试」（原为静默吞掉，
// 用户滑到底只看到转圈消失，还以为到底了——下次 scrolltolower 又用错页码跳页）
async function onLoadMore() {
  // refreshing 也要挡：下拉刷新进行中触底会与 reset 请求并发（页码被 reset 归 1 后再 +1 乱序）
  if (loadingMore.value || refreshing.value || noMore.value || loading.value) return
  loadingMore.value = true
  loadMoreError.value = false
  try {
    page.value += 1
    const ok = await loadFeed(false)
    if (ok === false) {
      page.value -= 1
      loadMoreError.value = true
    }
    // ok === 'stale'：响应期间有更新请求（刷新/切频道）已重置页码并接管状态，不回滚不报错
  } finally {
    loadingMore.value = false
  }
}

// 尾巴「点击重试」：清失败标志重拉同一页
function retryLoadMore() {
  loadMoreError.value = false
  onLoadMore()
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
/** 主推位兜底封面主题：按内容类型取 smart-cover 色系 */
const focusCoverType = computed(() => {
  const t = focusItem.value?.type || ''
  return ['live', 'course', 'classic', 'product', 'circle', 'paipan'].includes(t) ? t : 'default'
})

function goFocus() {
  const it = focusItem.value
  if (!it) return
  // 与 feed-card 共用 feedTargetUrl 唯一映射：焦点卡可能是 course/product/video 等九类之一，
  // 原本非 live 一律跳 /articles/:id → 课程/商品焦点卡点进文章详情必错页
  navigateTo(feedTargetUrl(it))
}

// ── 双列瀑布流 + 16:9 全宽大卡节奏（董事长 2026-07-17 拍板：仅 live/course 可升大卡）──
// 数据分段渲染：把 flowItems 切成若干段（段内普通卡走双列，段尾跟一张全宽大卡）。
// 节奏 = 每累积 ≥8 条普通卡后，遇到的下一条 live/course 且有封面的项升为大卡；
// feed 里此类项不足时自然没有大卡（不强凑）。段内仍按索引奇偶分左右两列。
interface FlowSection { items: FeedEnvelope[]; big: FeedEnvelope | null }
const BIG_INTERVAL = 8
function canBig(i: FeedEnvelope): boolean {
  return (i.type === 'live' || i.type === 'course') && !!i.cover
}
const flowSections = computed<FlowSection[]>(() => {
  const sections: FlowSection[] = []
  let buf: FeedEnvelope[] = []
  let sinceBig = 0
  for (const it of flowItems.value) {
    if (sinceBig >= BIG_INTERVAL && canBig(it)) {
      sections.push({ items: buf, big: it })
      buf = []
      sinceBig = 0
    } else {
      buf.push(it)
      sinceBig++
    }
  }
  if (buf.length) sections.push({ items: buf, big: null })
  return sections
})
/** 段内按索引奇偶分左右两列（等权体量，与原全局分列逻辑一致） */
function colItems(items: FeedEnvelope[], side: 0 | 1): FeedEnvelope[] {
  return items.filter((_, i) => i % 2 === side)
}

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
// 滚动节流(~100ms)：原每帧读 scrollTop 高频触发，加节流壳减少滚动期主线程压力；判定逻辑(>900)不变
let scrollLockTs = 0
let scrollTrailing: ReturnType<typeof setTimeout> | null = null
function applyBackTop(top: number) { showBackTop.value = top > 900 }
function onScroll(e: { detail: { scrollTop: number } }) {
  const top = e.detail.scrollTop
  const now = Date.now()
  if (now - scrollLockTs >= 100) {
    scrollLockTs = now
    applyBackTop(top)
  } else {
    // 节流窗口内只记尾值，窗口结束后补一次，避免最后一次滚动被丢导致按钮状态卡住
    if (scrollTrailing) clearTimeout(scrollTrailing)
    scrollTrailing = setTimeout(() => { scrollLockTs = Date.now(); applyBackTop(top) }, 100)
  }
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

    <!-- 顶栏（自定义导航·实色吸顶）：不回加品牌大字，以统一搜索入口承接首要任务 -->
    <view class="brand-row" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="home-search">
        <search-bar default-tab="all" placeholder="搜古籍 · 课程 · 排盘 · 智能体" />
      </view>
    </view>

    <!-- 顶部轻 Tab：推荐/关注 频道 + 直播广场胶囊 + 古籍/课程/商城 板块入口（吸顶） -->
    <scroll-view class="tabs" scroll-x :show-scrollbar="false">
      <view class="tabs-inner">
        <view class="tab" :class="{ on: activeTab === 'recommend' }" @tap="switchTab('recommend')">
          <text class="tab-label">推荐</text>
        </view>
        <!-- 「关注」Tab 暂下线：当前 getSmartFeed 无频道参数，切"关注"与"推荐"发同一请求同参数，
             属纯装饰假功能（用户以为在看关注流，实际还是推荐流）。
             待关注聚合 feed 后端 channel 参数上线后恢复下方节点（switchTab('follow') 逻辑已防御性保留）。
        <view class="tab" :class="{ on: activeTab === 'follow' }" @tap="switchTab('follow')">
          <text class="tab-label">关注</text>
        </view>
        -->

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
      <!-- 运营楼层（后台微页面编辑器·route='home'·有已发布则渲染在最上，无则不显示） -->
      <view v-if="homeBlocks.length" class="home-blocks"><block-renderer :blocks="homeBlocks" /></view>

      <!-- 焦点区（编辑式·直播优先）：16:10 大卡 + 底部渐变衬底 + 直播中动效 -->
      <!-- 直播态挂全局 live-card-glow（animations.scss·边框呼吸光晕） -->
      <view v-if="focusItem" class="focus" :class="{ 'live-card-glow': focusIsLive }" hover-class="focus-press" @tap="goFocus">
        <view class="focus-ratio">
          <!-- smart-cover：有图显图（404 自动翻兜底），无图出书法水印生成底——主推位不允许空 banner -->
          <smart-cover
            class="focus-cov"
            :class="{ live: focusIsLive }"
            :src="focusItem.cover"
            :title="focusItem.title"
            :type="focusCoverType"
            deco
          />
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

      <!-- 今日学一点：按用户兴趣主题每日推 3 条真实内容（自拉数据·空则整体隐藏，兴趣个性化产物上屏） -->
      <daily-study />

      <!-- 双列瀑布流 + 16:9 全宽大卡（董事长 2026-07-17 拍板：每 ~8 条升 1 条 live/course）。
           数据分段渲染：每段 = 双列区块 + 段尾全宽大卡；长按呼负反馈浮层（大卡同样支持） -->
      <template v-for="(sec, si) in flowSections" :key="'sec-' + si">
        <view v-if="sec.items.length" class="flow">
          <view class="col">
            <view
              v-for="item in colItems(sec.items, 0)"
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
              v-for="item in colItems(sec.items, 1)"
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
        <view
          v-if="sec.big"
          class="big-wrap"
          @touchstart="onCardTouchStart(sec.big!, $event)"
          @touchmove="onCardTouchMove"
          @touchend="onCardTouchEnd"
          @touchcancel="onCardTouchEnd"
        >
          <feed-card :item="sec.big!" big />
        </view>
      </template>

      <!-- 加载更多 / 失败重试 / 到底提示 -->
      <view v-if="loadingMore" class="more-tip"><text class="more-tip-txt">加载中…</text></view>
      <view v-else-if="loadMoreError" class="more-tip" hover-class="btn-press" @tap="retryLoadMore">
        <text class="more-tip-txt more-tip-err">加载失败 · 点击重试</text>
      </view>
      <!-- 卷尾（品牌签名·两侧墨线由全局 .scroll-end 伪元素画，文案统一走 voice.ts） -->
      <view v-else-if="noMore" class="scroll-end"><text>{{ VOICE.END }}</text></view>
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
  padding: 12rpx 24rpx 8rpx;
  background-color: #FAF8F5;
}
.home-search { width: 100%; }
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
  /* 底部导航高度 + iOS 全面屏安全区（不加 safe-area 时刘海屏底部内容被 home 条遮挡） */
  bottom: calc(112rpx + env(safe-area-inset-bottom));
  top: calc(184rpx + var(--status-bar-height, 0px));
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
.flow { display: flex; gap: 18rpx; padding: 0 24rpx 18rpx; }
.col { flex: 1; display: flex; flex-direction: column; gap: 18rpx; min-width: 0; }
/* 16:9 全宽大卡：独占一行，页边距与瀑布流一致 */
.big-wrap { padding: 0 24rpx 18rpx; }
/* 运营楼层（微页面区块） */
.home-blocks { padding: 8rpx 0 12rpx; }

/* 加载更多 / 到底 */
.more-tip { display: flex; align-items: center; justify-content: center; padding: 32rpx 0; }
.more-tip-txt { font-size: 24rpx; color: #999999; }
/* 加载更多失败重试（朱红提醒色，可点） */
.more-tip-err { color: #C41E3A; }
/* 到底提示改用全局 .scroll-end（signature.scss 卷尾墨线），此处只补页底留白 */
.scroll-end { padding-bottom: 64rpx; }

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
