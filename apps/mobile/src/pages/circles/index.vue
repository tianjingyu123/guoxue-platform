<script setup lang="ts">
/**
 * 圈子入口：回访、发现、动态三个分区，数据与既有路由复用。
 * 数据层沿用原实现：circleApi.list/my/getHotPosts/getMyStats/join + joinedIds 标记 + onShow 刷新
 */
import { computed, nextTick, ref, onMounted } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { navigateTo } from '@/utils/router'
import { getMiniProgramMenuSafeRight } from '@/utils/mini-program-menu'
import { getToken } from '@/utils/storage'
import {
  circleApi, circleCategories, formatMembers,
  type Circle, type HotPost, type MyCircleStats,
} from '@/lib/circle-data'
import { circleDetailApi } from '@/lib/circle-detail-data'
import { growthApi } from '@/lib/circle-growth-data'

// 微信原生胶囊覆盖顶栏时，按真实左边界给操作区留出可点击空间。
const menuSafeRight = getMiniProgramMenuSafeRight()

const hubTabs = [{ id: 'mine', label: '我的圈子' }, { id: 'discover', label: '发现圈子' }, { id: 'activity', label: '圈内动态' }] as const
type HubTab = typeof hubTabs[number]['id']
const activeHub = ref<HubTab>(getToken() ? 'mine' : 'discover')
const sessionReady = ref(!!getToken())
const extrasLoading = ref(true)
const extrasFailed = ref(false)
const activityFailed = ref(false)
let extrasSeq = 0
function selectHub(id: HubTab) { activeHub.value = id }
onLoad((query) => {
  if (query?.hub === 'activity' && getToken()) activeHub.value = 'activity'
})
const category = ref('')
const circles = ref<Circle[]>([])
const circleTotal = ref(0)
const circlePage = ref(1)
const discoverLoadingMore = ref(false)
const discoverMoreError = ref(false)
const discoverHasMore = computed(() => circles.value.length < circleTotal.value)
const myCircles = ref<Circle[]>([])
// 已加入圈子 id 集合（来自 my()）：给发现列表正确标「已加入」
const joinedIds = ref<Set<string>>(new Set())
function markJoined() {
  if (!joinedIds.value.size) return
  circles.value = circles.value.map((c) => (joinedIds.value.has(String(c.id)) ? { ...c, isJoined: true } : c))
}
const hotPosts = ref<HotPost[]>([])
// 我发起的待审核入圈申请（circleId 集合）：给发现列表卡片标「审核中」（此前申请后回广场毫无痕迹）
const pendingIds = ref<Set<string>>(new Set())
const loading = ref(true)
const error = ref(false)
const myStats = ref<MyCircleStats>({ joinedCount: 0, postCount: 0, likeReceived: 0 })
const MINE_PREVIEW_LIMIT = 6
const DISCOVER_BATCH_SIZE = 4
const discoverBatch = ref(0)
const minePreview = computed(() => myCircles.value.slice(0, MINE_PREVIEW_LIMIT))
const discoverCircles = computed(() => circles.value.filter((c) => !joinedIds.value.has(String(c.id))))
const discoverBatchCount = computed(() => Math.max(1, Math.ceil(discoverCircles.value.length / DISCOVER_BATCH_SIZE)))
const visibleDiscoverCircles = computed(() => {
  const safeBatch = discoverBatch.value % discoverBatchCount.value
  const start = safeBatch * DISCOVER_BATCH_SIZE
  return discoverCircles.value.slice(start, start + DISCOVER_BATCH_SIZE)
})
// 空态归因（发现列表为空时要分清是「筛选筛没了」「已全部加入」还是「本来就没有」）：
// 三种原因给三套文案与操作，不能都落到「换个分类看看吧」这一句没有出口的提示上。
const currentCategoryName = computed(
  () => circleCategories.find((item) => item.id === category.value)?.name || '',
)
const emptyReason = computed<'category' | 'all-joined' | 'none' | 'more'>(() => {
  if (discoverHasMore.value) return 'more'
  // 接口有返回、只是都被 joinedIds 过滤掉 → 已全部加入（不是「没找到」）
  if (circles.value.length > 0) return 'all-joined'
  if (category.value !== '') return 'category'
  return 'none'
})

/** 返回「推荐/全部」分类：分类筛空时的出口，已在全部分类则只做一次重新加载。 */
function resetCategory() {
  if (category.value === '') {
    loadCircles()
    return
  }
  selectCategory('')
}
/** 空态/失败态的重新加载（包成无参函数，避免 @tap 把事件对象当 silent 传进去静默失败）。 */
function reloadCircles() {
  loadCircles()
}

// SWR 首屏缓存（照首页 FEED_CACHE_KEY 模式）：只存默认「推荐」分类的首屏列表——
// 再次进入 tab 先渲染缓存跳过骨架屏，后台静默刷新整批替换
const CIRCLES_CACHE_KEY = 'circles:home:cache'
// 请求序号守卫（照首页 feedReqSeq 模式）：静默刷新与切分类/下拉刷新可能并发，
// 慢的旧响应晚到会覆盖新结果——响应回来时序号已不是最新则整体丢弃
let circlesReqSeq = 0

/** 发现圈子网格（随分类变化，单独重载）。
 *  silent=true 为 SWR 后台静默刷新：不回骨架屏；失败时保留已上屏的缓存内容（不切错误态）。 */
async function loadCircles(silent = false) {
  const seq = ++circlesReqSeq
  discoverLoadingMore.value = false
  discoverMoreError.value = false
  if (!silent) {
    loading.value = true
    error.value = false
  }
  try {
    const res = await circleApi.list({ category: category.value, page: 1, pageSize: 20 })
    if (seq !== circlesReqSeq) return // 过期响应：丢弃，由更新的请求负责上屏
    circles.value = res.data
    circleTotal.value = res.total
    circlePage.value = 1
    discoverMoreError.value = false
    discoverBatch.value = 0
    markJoined()
    error.value = false
    // SWR 缓存：只存「推荐」分类首屏。isJoined 属用户态，落盘前抹掉防换号后串显；
    // 上屏后由 loadExtras 拉到的 joinedIds 经 markJoined 重新回填
    if (category.value === '') {
      try {
        if (res.data.length > 0) {
          uni.setStorageSync(CIRCLES_CACHE_KEY, res.data.map((c) => ({ ...c, isJoined: false })))
        } else {
          // 列表真空：清掉旧缓存，否则下次进页永远先闪一屏已不存在的旧圈子
          uni.removeStorageSync(CIRCLES_CACHE_KEY)
        }
      } catch { /* 存储满等异常不影响主流程 */ }
    }
  } catch {
    if (seq !== circlesReqSeq) return
    if (silent) return // 静默刷新失败：旧内容留存，不闪错误页
    error.value = true
    circles.value = []
  } finally {
    if (seq === circlesReqSeq && !silent) loading.value = false
  }
}

/** 我的圈子 + 动态 + 统计（与分类无关，首屏加载一次；各自空数据走空态） */
async function loadExtras() {
  // 圈子广场是公共获客页：游客只拉公开动态，不能让可选“我的”接口 401 劫持整页去登录。
  const seq = ++extrasSeq
  const hasSession = !!getToken()
  sessionReady.value = hasSession
  extrasLoading.value = true
  extrasFailed.value = false
  activityFailed.value = false
  const [myRes, statsRes, jrRes] = await Promise.allSettled([
    hasSession ? circleApi.my(true, { throwOnError: true }) : Promise.resolve([]),
    hasSession ? circleApi.getMyStats(true) : Promise.resolve(myStats.value),
    // 我的入圈申请（真连 GET /circles/my-join-requests）：待审核圈子回填「审核中」标；未登录不发请求
    hasSession ? growthApi.myJoinRequests(true) : Promise.resolve([]),
  ])
  if (seq !== extrasSeq) return
  extrasFailed.value = myRes.status === 'rejected'
  myCircles.value = myRes.status === 'fulfilled' ? myRes.value : []
  joinedIds.value = new Set(myCircles.value.map((c) => String(c.id)))
  discoverBatch.value = 0
  markJoined()
  if (hasSession && myCircles.value.length) {
    const postResults = await Promise.allSettled(
      myCircles.value.slice(0, MINE_PREVIEW_LIMIT).map(async (circle) => {
        const result = await circleDetailApi.posts(String(circle.id), { throwOnError: true })
        return result.data.slice(0, 2).map((post): HotPost & { createdAt: string } => ({
          id: post.id,
          circleId: String(circle.id),
          circleName: circle.name,
          author: post.author,
          content: post.content,
          images: post.images || [],
          likes: post.likes,
          comments: post.comments,
          time: formatPostTime(post.createdAt),
          isPinned: !!post.isPinned,
          createdAt: post.createdAt,
        }))
      }),
    )
    if (seq !== extrasSeq) return
    activityFailed.value = postResults.some((result) => result.status === 'rejected')
    hotPosts.value = postResults
      .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 8)
  } else {
    hotPosts.value = []
  }
  extrasLoading.value = false
  if (statsRes.status === 'fulfilled') myStats.value = statsRes.value
  // 拉取失败保持上次结果（不误清标记）；成功则全量刷新
  if (jrRes.status === 'fulfilled') {
    pendingIds.value = new Set(jrRes.value.filter((r) => r.status === 'PENDING').map((r) => String(r.circleId)))
  }
}

function selectCategory(id: string) {
  if (category.value === id) return
  category.value = id
  discoverBatch.value = 0
  loadCircles()
}

function activateOnKeyboard(event: KeyboardEvent, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

async function onCategoryKeydown(event: KeyboardEvent, id: string) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const currentIndex = circleCategories.findIndex((item) => item.id === id)
  if (currentIndex < 0) return
  const direction = event.key === 'ArrowRight' ? 1 : -1
  const nextIndex = (currentIndex + direction + circleCategories.length) % circleCategories.length
  selectCategory(circleCategories[nextIndex].id)
  await nextTick()
  if (typeof document === 'undefined') return
  const tabs = document.querySelectorAll<HTMLElement>('.cat-chip[role="tab"]')
  tabs[nextIndex]?.focus()
}

function formatPostTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

async function nextDiscoverBatch() {
  if (discoverLoadingMore.value) return
  if (discoverBatch.value < discoverBatchCount.value - 1) {
    discoverBatch.value += 1
    return
  }
  if (!discoverHasMore.value) {
    discoverBatch.value = 0
    return
  }
  const seq = circlesReqSeq
  const previousBatches = discoverBatchCount.value
  discoverLoadingMore.value = true
  discoverMoreError.value = false
  try {
    const res = await circleApi.list({ category: category.value, page: circlePage.value + 1, pageSize: 20, throwOnError: true })
    if (seq !== circlesReqSeq) return
    circles.value = circles.value.concat(res.data.filter((item) => !circles.value.some((old) => old.id === item.id)))
    circlePage.value += 1
    circleTotal.value = res.data.length ? res.total : circles.value.length
    markJoined()
    if (discoverBatchCount.value > previousBatches) discoverBatch.value = previousBatches
    else if (discoverHasMore.value) uni.showToast({ title: '这一批暂无新圈子，继续换一批', icon: 'none' })
  } catch {
    if (seq === circlesReqSeq) discoverMoreError.value = true
  } finally {
    if (seq === circlesReqSeq) discoverLoadingMore.value = false
  }
}

function go(url: string) { navigateTo(url) }
// 未加入 → 购买/加入引导页 preview（转化关键·付费圈走确认支付）；已加入 → 圈子详情
function openCircle(c: Circle) {
  if (pendingIds.value.has(String(c.id))) { go('/pkg-circle/circles/my-join-requests'); return }
  if (c.isJoined) navigateTo(`/pkg-circle/circles/detail?id=${c.id}`)
  else navigateTo(`/pkg-circle/circles/preview?id=${c.id}`)
}

onMounted(() => {
  // SWR：先读上次「推荐」分类首屏缓存——命中则立即上屏（跳过骨架屏），后台静默刷新替换；
  // 无缓存走原骨架屏流程。缓存读坏（非数组）按未命中处理。
  let cached: Circle[] = []
  try {
    const raw = uni.getStorageSync(CIRCLES_CACHE_KEY)
    if (Array.isArray(raw)) cached = raw
  } catch { /* 读缓存失败按未命中处理 */ }
  if (cached.length > 0) {
    circles.value = cached
    circleTotal.value = cached.length
    loading.value = false
    loadCircles(true)
  } else {
    loadCircles()
  }
  loadExtras()
})
// 下拉刷新：重拉圈子列表与附加数据
onPullDownRefresh(async () => {
  try {
    await Promise.all([loadCircles(), loadExtras()])
  } finally {
    uni.stopPullDownRefresh()
  }
})
// 返回本页刷新「已加入」态（详情页加入/退出后回来即时反映）
let _firstShow = true
onShow(() => {
  if (_firstShow) { _firstShow = false; return }
  loadExtras()
})
</script>

<template>
  <view class="page">
    <app-network-bar />
    <customer-service-fab />

    <view class="topbar" :style="menuSafeRight ? { paddingRight: menuSafeRight + 'px' } : undefined">
      <text class="title" role="heading" aria-level="1">圈子</text>
      <view class="actions">
        <view class="me-entry" role="link" tabindex="0" aria-label="圈子个人中心"
          @tap="go('/pkg-circle/circles/me')" @keydown="activateOnKeyboard($event, () => go('/pkg-circle/circles/me'))">
          <app-icon name="user" :size="36" color="#1D1D1F" />
        </view>
      </view>
    </view>
    <view class="hub-nav" role="tablist" aria-label="圈子浏览区域">
      <view v-for="tab in hubTabs" :key="tab.id" class="hub-tab" :class="{ selected: activeHub === tab.id }"
        role="tab" :aria-selected="activeHub === tab.id" tabindex="0"
        @tap="selectHub(tab.id)" @keydown="activateOnKeyboard($event, () => selectHub(tab.id))">
        <text>{{ tab.label }}</text>
      </view>
    </view>
    <scroll-view scroll-y class="body" aria-label="圈子广场内容">
      <view class="search-entry" role="link" tabindex="0" aria-label="搜索圈子"
        @tap="go('/pkg-circle/circles/search')" @keydown="activateOnKeyboard($event, () => go('/pkg-circle/circles/search'))">
        <app-icon name="search" :size="32" color="#6E6E73" /><text>搜索圈子</text>
      </view>
      <view v-if="activeHub !== 'discover' && extrasLoading" class="state-panel" role="status">
        <text class="state-title">正在更新你的圈子</text>
      </view>
      <view v-else-if="activeHub !== 'discover' && extrasFailed" class="state-panel" role="alert">
        <text class="state-title">暂时无法加载你的圈子</text>
        <view class="empty-action" role="button" tabindex="0" @tap="loadExtras" @keydown="activateOnKeyboard($event, loadExtras)"><text class="empty-action-txt">重新加载</text></view>
      </view>
      <view v-else-if="activeHub !== 'discover' && !myCircles.length" class="state-panel" role="status">
        <app-icon name="users" :size="64" color="#2B6F68" />
        <text class="state-title">{{ sessionReady ? '从一个感兴趣的圈子开始' : '登录后，继续你的圈内交流' }}</text>
        <text class="state-desc">{{ sessionReady ? '先看看公开介绍，再决定是否加入。' : '已加入的圈子和圈内动态会展示在这里。' }}</text>
        <view class="empty-action" role="button" tabindex="0"
          @tap="sessionReady ? selectHub('discover') : go('/pkg-auth/login/index')"
          @keydown="activateOnKeyboard($event, () => sessionReady ? selectHub('discover') : go('/pkg-auth/login/index'))">
          <text class="empty-action-txt">{{ sessionReady ? '发现圈子' : '去登录' }}</text>
        </view>
      </view>
      <!-- ════ 区① 我的圈子 · 私域书斋 ════ -->
      <view v-if="activeHub === 'mine' && myCircles.length && !extrasFailed" class="section mine-section" aria-label="我的圈子">
        <view class="mine-shell">
          <view class="mine-shell-head">
            <view class="mine-heading">
              <view class="mine-title-row">
                <text class="mine-title">我的圈子</text>
                <text class="mine-count">{{ myCircles.length }} 个已加入</text>
              </view>
                <text class="mine-subtitle">选择一个圈子，继续交流</text>
            </view>
            <view
              class="mine-more"
              role="link"
              tabindex="0"
              aria-label="查看全部我的圈子"
              @tap="go('/pkg-circle/circles/me')"
              @keydown="activateOnKeyboard($event, () => go('/pkg-circle/circles/me'))"
            >
              <text class="mine-more-txt">全部</text>
              <app-icon name="chevron-right" :size="22" color="#2B6F68" />
            </view>
          </view>
          <scroll-view scroll-x class="mine-scroll">
            <view class="mine-row">
              <view
                v-for="c in minePreview" :key="c.id"
                class="mine-card tap-press"
                role="link"
                tabindex="0"
                :aria-label="`进入圈子：${c.name}，${formatMembers(c.members)}位圈友${c.todayActive ? `，今日${c.todayActive}条动态` : ''}`"
                @tap="go(`/pkg-circle/circles/detail?id=${c.id}`)"
                @keydown="activateOnKeyboard($event, () => go(`/pkg-circle/circles/detail?id=${c.id}`))"
              >
                <view class="mine-cover-wrap">
                  <smart-cover :src="c.cover" :title="c.name" type="circle" deco :deco-size="44" class="mine-cover" />
                  <view v-if="c.todayActive && c.todayActive > 0" class="mine-badge">
                    <view class="mine-badge-dot" />
                    <text class="mine-badge-txt">今日 {{ c.todayActive }} 条</text>
                  </view>
                </view>
                <view class="mine-card-copy">
                  <text class="mine-name">{{ c.name }}</text>
                  <view class="mine-card-foot">
                    <text class="mine-members">{{ formatMembers(c.members) }} 圈友</text>
                    <view class="mine-enter">
                      <text class="mine-enter-txt">进入</text>
                      <app-icon name="chevron-right" :size="20" color="#2B6F68" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- ════ 区② 发现圈子 ════ -->
      <view v-show="activeHub === 'discover'" class="section">
        <view class="sec-head"><view><text class="sec-title">找到你的同好</text><text class="section-desc">先了解内容与加入方式</text></view></view>
        <!-- 分类筛选 -->
        <scroll-view scroll-x class="cat-scroll">
          <view class="cat-row" role="tablist" aria-label="发现圈子分类">
            <!-- 分类含首项 { id:'', name:'推荐' } 作为「全部/推荐」，勿再额外硬编码一枚，否则重复两个「推荐」 -->
            <view
              v-for="cat in circleCategories" :key="cat.id"
              class="cat-chip" :class="{ on: category === cat.id }"
              role="tab"
              :aria-selected="category === cat.id"
              :tabindex="category === cat.id ? 0 : -1"
              @tap="selectCategory(cat.id)"
              @keydown="onCategoryKeydown($event, cat.id)"
            ><text class="cat-text" :class="{ on: category === cat.id }">{{ cat.name }}</text></view>
          </view>
        </scroll-view>

        <!-- 加载态：骨架 -->
        <view v-if="loading || (sessionReady && extrasLoading && joinedIds.size === 0)" class="discover-list" role="status" aria-live="polite" aria-label="圈子列表加载中">
          <view v-for="i in 4" :key="i" class="sk-card">
            <view class="sk-cover" />
            <view class="sk-body"><view class="sk-line w3" /><view class="sk-line w2" /></view>
          </view>
        </view>
        <!-- 错误态 -->
        <view v-else-if="error" role="alert" aria-live="assertive">
          <app-error title="圈子加载失败" desc="网络异常，请稍后重试" @retry="reloadCircles" />
        </view>
        <!-- 列表 -->
        <!-- animate-fade-in 挂列表容器：进入渐入；不挂卡片（forwards 动画会压掉卡片 :active 缩放） -->
        <view v-else-if="visibleDiscoverCircles.length" class="discover-list animate-fade-in">
          <!-- 整卡点击进详情页（像商品/课程卡）：未加入→加入引导页，已加入→圈子详情。
               卡上不再「无感即加入」，加入/购买动作在详情页完成（董事长 #24） -->
          <view
            v-for="c in visibleDiscoverCircles" :key="c.id"
            class="circle-card"
            role="link"
            tabindex="0"
            :aria-label="`${c.name}，${c.description}，${formatMembers(c.members)}位圈友，${c.type === 'YEARLY' ? `${c.price}元每年` : c.type === 'PAID' || (!c.type && c.isPaid) ? `${c.price}元` : '免费加入'}，查看圈子详情`"
            @tap="openCircle(c)"
            @keydown="activateOnKeyboard($event, () => openCircle(c))"
          >
            <!-- 圈子封面统一按 4:3 横向裁剪：兼容既有竖图，也更适合圈子发现卡与动态流复用 -->
            <view class="card-cover">
              <smart-cover :src="c.cover" :title="c.name" type="circle" deco :deco-size="52" class="card-cover-img" />
              <view class="card-cover-shade" />
              <text class="card-category">{{ c.category || '同好圈' }}</text>
              <view v-if="c.rank" class="card-rank"><text class="card-rank-txt">热门 {{ c.rank }}</text></view>
            </view>
            <view class="card-body">
              <view class="card-head">
                <text class="card-title">{{ c.name }}</text>
                <view v-if="pendingIds.has(String(c.id))" class="tag-pending"><text class="tag-pending-txt">审核中</text></view>
              </view>
              <text class="card-desc">{{ c.description }}</text>
              <view class="card-signals">
                <view class="card-signal">
                  <app-icon name="users" :size="20" color="#6E6E73" />
                  <text class="card-signal-txt">{{ formatMembers(c.members) }} 圈友</text>
                </view>
                <view v-if="c.posts > 0" class="card-signal">
                  <app-icon name="file-text" :size="20" color="#7C6852" />
                  <text class="card-signal-txt">{{ c.posts }} 篇内容</text>
                </view>
                <view v-if="c.todayActive && c.todayActive > 0" class="card-signal active">
                  <view class="signal-live-dot" />
                  <text class="card-signal-txt">今日 {{ c.todayActive }} 条</text>
                </view>
              </view>
              <view class="card-foot">
                <view class="card-price-wrap">
                  <text class="card-price-label">入圈方式</text>
                  <text v-if="c.type === 'YEARLY'" class="card-price">¥{{ c.price }}<text class="card-price-unit">/年</text></text>
                  <text v-else-if="c.type === 'PAID' || (!c.type && c.isPaid)" class="card-price">¥{{ c.price }}</text>
                  <text v-else class="card-price free">免费加入</text>
                </view>
                <view class="card-cta" :class="{ pending: pendingIds.has(String(c.id)) }">
                  <text class="card-cta-txt">{{ pendingIds.has(String(c.id)) ? '查看申请' : '了解圈子' }}</text>
                  <app-icon name="chevron-right" :size="21" color="#FFFFFF" />
                </view>
              </view>
            </view>
          </view>
          <view v-if="discoverBatchCount > 1 || discoverHasMore" class="discover-pager">
            <text class="discover-pager-count">{{ discoverBatch + 1 }} / {{ discoverBatchCount }}{{ discoverHasMore ? '+' : '' }}</text>
            <view
              class="discover-pager-btn"
              role="button"
              tabindex="0"
              :aria-label="discoverMoreError ? '重试加载更多圈子' : '换一批发现圈子'"
              @tap="nextDiscoverBatch"
              @keydown="activateOnKeyboard($event, nextDiscoverBatch)"
            >
              <app-icon name="refresh-cw" :size="24" color="#7A5634" />
              <text class="discover-pager-txt">{{ discoverLoadingMore ? '正在寻找…' : discoverMoreError ? '加载失败，重试' : '换一批' }}</text>
            </view>
          </view>
        </view>
        <!-- 空态：按归因分三种，每种都给出可直接点的出口（不再只留一句「换个分类看看吧」） -->
        <view v-else class="empty" role="status" aria-live="polite">
          <view class="empty-icon"><app-icon name="users" :size="56" color="#999999" decorative /></view>
          <text v-if="emptyReason === 'category'" class="empty-text">「{{ currentCategoryName }}」分类下暂时没有圈子</text>
          <text v-else-if="emptyReason === 'more'" class="empty-text">已展示的圈子都加入了，继续看看后面的圈子</text>
          <text v-else-if="emptyReason === 'all-joined'" class="empty-text">这里的圈子你都已经加入了</text>
          <text v-else class="empty-text">圈子还在筹备中，稍后再来看看</text>
          <view class="empty-actions">
            <view
              v-if="emptyReason === 'category'"
              class="empty-action"
              role="button"
              tabindex="0"
              aria-label="查看全部圈子"
              @tap="resetCategory"
              @keydown="activateOnKeyboard($event, resetCategory)"
            ><text class="empty-action-txt">查看全部圈子</text></view>
            <view
              v-else-if="emptyReason === 'more'"
              class="empty-action"
              role="button"
              tabindex="0"
              :aria-label="discoverMoreError ? '重试加载更多圈子' : '继续发现圈子'"
              @tap="nextDiscoverBatch"
              @keydown="activateOnKeyboard($event, nextDiscoverBatch)"
            ><text class="empty-action-txt">{{ discoverLoadingMore ? '正在寻找…' : discoverMoreError ? '加载失败，重试' : '继续发现' }}</text></view>
            <view
              v-else-if="emptyReason === 'all-joined'"
              class="empty-action"
              role="link"
              tabindex="0"
              aria-label="打开我的圈子"
              @tap="go('/pkg-circle/circles/me')"
              @keydown="activateOnKeyboard($event, () => go('/pkg-circle/circles/me'))"
            ><text class="empty-action-txt">去我的圈子</text></view>
            <view
              class="empty-action ghost"
              role="button"
              tabindex="0"
              aria-label="刷新圈子列表"
              @tap="reloadCircles"
              @keydown="activateOnKeyboard($event, reloadCircles)"
            ><text class="empty-action-txt ghost">刷新</text></view>
          </view>
        </view>
      </view>

      <!-- ════ 区③ 动态 · 已加入圈子聚合 ════ -->
      <view v-if="activeHub === 'activity' && hotPosts.length && !extrasFailed" class="section activity-section" aria-label="来自已加入圈子的最新动态">
        <view class="sec-head activity-head">
          <view class="sec-title-wrap">
            <text class="sec-title">圈内新鲜事</text>
            <text class="sec-sub">来自你加入的圈子</text>
          </view>
          <text class="sec-sub">最近动态</text>
        </view>
        <view class="feed-list activity-shell">
          <view
            v-for="post in hotPosts" :key="post.id"
            class="feed-item list-press"
            role="link"
            tabindex="0"
            :aria-label="`${post.circleName}，${post.author.name}发布：${post.content}，${post.likes || 0}次点赞，${post.comments || 0}条评论`"
            @tap="go(`/pkg-circle/circles/post?id=${post.id}&circleId=${post.circleId}`)"
            @keydown="activateOnKeyboard($event, () => go(`/pkg-circle/circles/post?id=${post.id}&circleId=${post.circleId}`))"
          >
            <view class="feed-author-col">
              <smart-avatar :src="post.author.avatar" :name="post.author.name" class="feed-avatar" />
              <view class="feed-rail" />
            </view>
            <view class="feed-body">
              <view class="feed-source">
                <text
                  class="feed-circle"
                  role="link"
                  tabindex="0"
                  :aria-label="`进入圈子：${post.circleName}`"
                  @tap.stop="go(`/pkg-circle/circles/detail?id=${post.circleId}`)"
                  @keydown.stop="activateOnKeyboard($event, () => go(`/pkg-circle/circles/detail?id=${post.circleId}`))"
                >{{ post.circleName }}</text>
                <text class="feed-author">{{ post.author.name }}</text>
                <text class="feed-time">{{ post.time }}</text>
                <text v-if="post.isPinned" class="tag-featured">置顶</text>
              </view>
              <text class="feed-text">{{ post.content }}</text>
              <view class="feed-foot">
                <view class="feed-stat"><app-icon name="heart" :size="20" color="#6E6E73" /><text>{{ post.likes || 0 }}</text></view>
                <view class="feed-stat"><app-icon name="message-circle" :size="20" color="#6E6E73" /><text>{{ post.comments || 0 }}</text></view>
                <text class="feed-open">展开阅读</text>
              </view>
            </view>
            <!-- 帖子缩略图：smart-cover 兜底（URL 失效不再破图；plain=纯底纹，缩略图上不出水印文字） -->
            <smart-cover v-if="post.images.length" :src="post.images[0]" type="circle" plain class="feed-thumb" />
          </view>
        </view>
      </view>

      <view v-if="activeHub === 'activity' && !extrasLoading && !extrasFailed && myCircles.length && (!hotPosts.length || activityFailed)" class="state-panel" :role="activityFailed ? 'alert' : 'status'">
        <text class="state-title">{{ activityFailed ? '部分圈内动态加载失败' : '最近还没有动态' }}</text>
        <text class="state-desc">当前展示前 {{ MINE_PREVIEW_LIMIT }} 个圈子的近期动态，更多内容可进入圈子查看。</text>
        <view class="empty-action" role="button" tabindex="0" @tap="activityFailed ? loadExtras() : selectHub('mine')" @keydown="activateOnKeyboard($event, () => activityFailed ? loadExtras() : selectHub('mine'))">
          <text class="empty-action-txt">{{ activityFailed ? '重新加载' : '去我的圈子' }}</text>
        </view>
      </view>
      <view v-if="activeHub === 'mine'" class="create-row" role="link" tabindex="0" @tap="go('/pkg-circle/circles/create')" @keydown="activateOnKeyboard($event, () => go('/pkg-circle/circles/create'))">
        <app-icon name="plus" :size="32" color="#2B6F68" /><text>创建圈子</text><app-icon name="chevron-right" :size="24" color="#6E6E73" />
      </view>
      <view class="bottom-spacer" />
    </scroll-view>

    <bottom-nav active="circle" />
  </view>
</template>

<style scoped lang="scss">
.page { height: 100vh; display: flex; flex-direction: column; background: var(--circle-canvas); color: var(--circle-ink); }
.topbar { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: calc(var(--status-bar-height, 0px) + 16rpx) 32rpx 8rpx; background: var(--circle-canvas); }
.title { font-size: var(--fs-display); font-weight: 700; letter-spacing: -1rpx; }
.actions { display: flex; align-items: center; }
.me-entry { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: 50%; background: var(--circle-surface); }
.hub-nav { display: flex; flex-shrink: 0; margin: 8rpx 24rpx 16rpx; padding: 4rpx; background: #e9e9ed; border-radius: 20rpx; }
.hub-tab { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 16rpx; color: var(--circle-secondary); font-size: var(--fs-body-sm); }
.hub-tab.selected { color: var(--circle-ink); font-weight: 600; background: var(--circle-surface); box-shadow: 0 2rpx 6rpx rgba(0,0,0,.08); }
.body { flex: 1; height: 0; min-height: 0; }
.search-entry { margin: 0 24rpx; padding: 0 24rpx; min-height: 44px; display: flex; align-items: center; gap: 12rpx; background: #e9e9ed; border-radius: 18rpx; color: var(--circle-secondary); font-size: var(--fs-body-sm); }
.section { margin-top: 32rpx; }
.sec-head, .mine-shell-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; padding: 0 28rpx; gap: 16rpx; }
.sec-title, .mine-title { display: block; font-size: var(--fs-title); font-weight: 650; }
.section-desc, .mine-subtitle { display: block; font-size: var(--fs-body-sm); color: var(--circle-secondary); margin-top: 8rpx; }
.mine-title-row { display: flex; align-items: baseline; gap: 12rpx; flex-wrap: wrap; }
.mine-count, .sec-sub { font-size: var(--fs-caption); color: var(--circle-secondary); }
.mine-more { display: flex; align-items: center; min-height: 44px; flex-shrink: 0; }
.mine-more-txt { font-size: var(--fs-body-sm); color: var(--circle-accent); }
.mine-row { display: flex; flex-direction: column; padding: 0 24rpx; gap: 12rpx; }
.mine-card { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; background: var(--circle-surface); border-radius: var(--circle-radius-lg); white-space: normal; }
.mine-cover-wrap { position: relative; flex: 0 0 136rpx; height: 136rpx; border-radius: 20rpx; overflow: hidden; }
.mine-cover { width: 100%; height: 100%; }
.mine-badge { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; background: rgba(0,0,0,.7); padding: 4rpx; }
.mine-badge-txt { font-size: var(--fs-caption); color: #fff; }
.mine-card-copy { flex: 1; min-width: 0; }
.mine-name { display: block; font-size: var(--fs-title); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mine-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; gap: 8rpx; }
.mine-members { font-size: var(--fs-caption); color: var(--circle-secondary); }
.mine-enter { display: flex; align-items: center; min-height: 44px; }
.mine-enter-txt { font-size: var(--fs-body-sm); color: var(--circle-accent); }
.cat-scroll { white-space: nowrap; }
.cat-row { display: inline-flex; gap: 12rpx; padding: 0 24rpx 24rpx; }
.cat-chip { display: flex; align-items: center; flex-shrink: 0; min-height: 44px; padding: 0 28rpx; border-radius: 999rpx; background: var(--circle-surface); }
.cat-chip.on { background: var(--circle-ink); }
.cat-text { font-size: var(--fs-body-sm); color: var(--circle-secondary); }
.cat-text.on { color: #fff; font-weight: 600; }
.discover-list { display: flex; flex-direction: column; gap: 24rpx; padding: 0 24rpx; }
.circle-card { overflow: hidden; background: var(--circle-surface); border-radius: var(--circle-radius-lg); }
.card-cover { position: relative; height: 256rpx; overflow: hidden; background: #e9e9ed; }
.card-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.card-cover-shade { position: absolute; inset: 0; background: linear-gradient(transparent 35%, rgba(0,0,0,.45)); }
.card-category { position: absolute; bottom: 18rpx; left: 24rpx; color: #fff; font-size: var(--fs-caption); }
.card-rank { position: absolute; right: 20rpx; bottom: 18rpx; color: #fff; font-size: var(--fs-caption); }
.card-body { padding: 24rpx; }
.card-head { display: flex; align-items: center; gap: 12rpx; }
.card-title { flex: 1; font-size: var(--fs-title-lg); font-weight: 650; min-width: 0; }
.card-desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 12rpx; font-size: var(--fs-body); line-height: 1.6; color: var(--circle-secondary); }
.card-signals { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.card-signal { display: flex; align-items: center; gap: 6rpx; }
.card-signal-txt { font-size: var(--fs-caption); color: var(--circle-secondary); }
.signal-live-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: var(--circle-accent); }
.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding-top: 20rpx; margin-top: 20rpx; border-top: 1rpx solid var(--circle-border-soft); }
.card-price-wrap { display: flex; flex-direction: column; gap: 4rpx; }
.card-price-label { font-size: var(--fs-caption); color: var(--circle-secondary); }
.card-price { font-size: var(--fs-body); font-weight: 600; color: var(--circle-ink); }
.card-price-unit { font-size: var(--fs-caption); font-weight: 400; }
.card-cta { display: flex; align-items: center; gap: 8rpx; min-height: 44px; padding: 0 24rpx; border-radius: 999rpx; background: var(--circle-accent); flex-shrink: 0; }
.card-cta-txt { color: #fff; font-size: var(--fs-body-sm); font-weight: 600; }
.tag-pending { background: #fff4dd; padding: 6rpx 12rpx; border-radius: 12rpx; }
.tag-pending-txt { font-size: var(--fs-caption); color: #795510; }
.discover-pager { display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.discover-pager-count { font-size: var(--fs-caption); color: var(--circle-secondary); }
.discover-pager-btn { display: flex; align-items: center; gap: 10rpx; min-height: 44px; padding: 0 24rpx; }
.discover-pager-txt { font-size: var(--fs-body-sm); color: var(--circle-accent); }
.sk-card { background: var(--circle-surface); border-radius: 24rpx; overflow: hidden; }
.sk-cover { height: 256rpx; background: #e5e5ea; }
.sk-body { padding: 24rpx; }
.sk-line { background: #e5e5ea; height: 24rpx; margin-bottom: 16rpx; width: 70%; border-radius: 8rpx; }
.sk-line.w2 { width: 45%; }
.state-panel, .empty { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 72rpx 32rpx; text-align: center; }
.state-title { font-size: var(--fs-title); font-weight: 600; }
.state-desc, .empty-text { font-size: var(--fs-body-sm); color: var(--circle-secondary); line-height: 1.6; }
.empty-icon { margin-bottom: 12rpx; }
.empty-actions { display: flex; gap: 16rpx; margin-top: 16rpx; flex-wrap: wrap; justify-content: center; }
.empty-action { display: flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 32rpx; border-radius: 999rpx; background: var(--circle-accent); }
.empty-action-txt { font-size: var(--fs-body-sm); color: #fff; }
.empty-action.ghost { background: var(--circle-surface); border: 1rpx solid var(--circle-border); }
.empty-action-txt.ghost { color: var(--circle-accent); }
.activity-head { align-items: flex-start; }
.sec-title-wrap { display: flex; flex-direction: column; gap: 8rpx; }
.activity-shell { margin: 0 24rpx; background: var(--circle-surface); border-radius: 24rpx; padding: 0 24rpx; }
.feed-item { display: flex; gap: 16rpx; padding: 28rpx 0; border-bottom: 1rpx solid var(--circle-border-soft); }
.feed-item:last-child { border-bottom: 0; }
.feed-author-col { flex: 0 0 64rpx; }
.feed-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; }
.feed-body { flex: 1; min-width: 0; }
.feed-source { display: flex; align-items: center; flex-wrap: wrap; gap: 8rpx; }
.feed-circle { font-size: var(--fs-body-sm); font-weight: 600; color: var(--circle-accent); }
.feed-author, .feed-time { font-size: var(--fs-caption); color: var(--circle-secondary); }
.tag-featured { font-size: var(--fs-caption); color: var(--brand); }
.feed-text { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 10rpx; font-size: var(--fs-body); line-height: 1.6; }
.feed-foot { display: flex; gap: 16rpx; align-items: center; margin-top: 16rpx; }
.feed-stat { display: flex; align-items: center; gap: 6rpx; font-size: var(--fs-caption); color: var(--circle-secondary); }
.feed-open { margin-left: auto; font-size: var(--fs-caption); color: var(--circle-accent); }
.feed-thumb { width: 96rpx; height: 96rpx; border-radius: 12rpx; flex-shrink: 0; align-self: center; }
.create-row { margin: 24rpx; display: flex; align-items: center; gap: 12rpx; min-height: 44px; padding: 12rpx 24rpx; border-radius: 18rpx; background: var(--circle-surface); color: var(--circle-accent); font-size: var(--fs-body-sm); }
.create-row text { flex: 1; }
.bottom-spacer { height: calc(160rpx + env(safe-area-inset-bottom)); }
[role="button"]:focus-visible, [role="link"]:focus-visible, [role="tab"]:focus-visible { outline: 2px solid var(--circle-accent); outline-offset: 2px; }
.mine-card:active, .circle-card:active, .feed-item:active { opacity: .8; }
@media (min-width: 768px) { .body { width: 760px; align-self: center; } .topbar, .hub-nav { width: 712px; align-self: center; box-sizing: border-box; } }
</style>
