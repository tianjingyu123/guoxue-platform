<script setup lang="ts">
/**
 * 圈子首页（圈子广场）— V0「两段式一屏」重构（2026-07-10）
 * 结构：我的圈子(横滑·回访) + 发现圈子(分类+推荐列表) + 动态(已加入圈子聚合)
 * 顶栏：标题 + 搜索 + 创建 + 「圈子·我的」头像入口（板块门户 4.3）
 * 数据层沿用原实现：circleApi.list/my/getHotPosts/getMyStats/join + joinedIds 标记 + onShow 刷新
 */
import { computed, ref, onMounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import {
  circleApi, circleCategories, formatMembers,
  type Circle, type HotPost, type MyCircleStats,
} from '@/lib/circle-data'
import { circleDetailApi } from '@/lib/circle-detail-data'
import { growthApi } from '@/lib/circle-growth-data'

const category = ref('')
const circles = ref<Circle[]>([])
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
  if (!silent) {
    loading.value = true
    error.value = false
  }
  try {
    const res = await circleApi.list({ category: category.value })
    if (seq !== circlesReqSeq) return // 过期响应：丢弃，由更新的请求负责上屏
    circles.value = res.data
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
  const hasSession = !!getToken()
  const [myRes, statsRes, jrRes] = await Promise.allSettled([
    hasSession ? circleApi.my(true) : Promise.resolve([]),
    hasSession ? circleApi.getMyStats(true) : Promise.resolve(myStats.value),
    // 我的入圈申请（真连 GET /circles/my-join-requests）：待审核圈子回填「审核中」标；未登录不发请求
    hasSession ? growthApi.myJoinRequests(true) : Promise.resolve([]),
  ])
  myCircles.value = myRes.status === 'fulfilled' ? myRes.value : []
  joinedIds.value = new Set(myCircles.value.map((c) => String(c.id)))
  discoverBatch.value = 0
  markJoined()
  if (hasSession && myCircles.value.length) {
    const postResults = await Promise.allSettled(
      myCircles.value.slice(0, MINE_PREVIEW_LIMIT).map(async (circle) => {
        const result = await circleDetailApi.posts(String(circle.id))
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
    hotPosts.value = postResults
      .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 8)
  } else {
    hotPosts.value = []
  }
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

function formatPostTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function nextDiscoverBatch() {
  discoverBatch.value = (discoverBatch.value + 1) % discoverBatchCount.value
}

function go(url: string) { navigateTo(url) }
// 未加入 → 购买/加入引导页 preview（转化关键·付费圈走确认支付）；已加入 → 圈子详情
function openCircle(c: Circle) {
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

    <!-- 顶栏：标题 + 搜索 + 创建 + 圈子·我的入口 -->
    <view class="topbar">
      <text class="title">圈子</text>
      <view class="actions">
        <view class="icon-btn" @tap="go('/pkg-circle/circles/search')">
          <app-icon name="search" :size="36" color="#2C2C2C" />
        </view>
        <view class="create-btn" @tap="go('/pkg-circle/circles/create')">
          <app-icon name="plus" :size="28" color="#ffffff" />
          <text class="create-btn-txt">创建</text>
        </view>
        <!-- 「圈子·我的」板块门户入口（非全局个人中心） -->
        <view class="me-entry" @tap="go('/pkg-circle/circles/me')">
          <app-icon name="user" :size="34" color="#666666" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- ════ 区① 我的圈子 · 私域书斋 ════ -->
      <view v-if="myCircles.length" class="section mine-section">
        <view class="mine-shell">
          <view class="mine-shell-head">
            <view class="mine-heading">
              <view class="mine-title-row">
                <text class="mine-title">我的圈子</text>
                <text class="mine-count">{{ myCircles.length }} 个已加入</text>
              </view>
                <text class="mine-subtitle">常逛的圈子，轻点即可进入</text>
            </view>
            <view class="mine-more" @tap="go('/pkg-circle/circles/me')">
              <text class="mine-more-txt">全部</text>
              <app-icon name="chevron-right" :size="22" color="#64766E" />
            </view>
          </view>
          <scroll-view scroll-x class="mine-scroll">
            <view class="mine-row">
              <view
                v-for="c in minePreview" :key="c.id"
                class="mine-card tap-press" @tap="go(`/pkg-circle/circles/detail?id=${c.id}`)"
              >
                <smart-cover :src="c.cover" :title="c.name" type="circle" deco :deco-size="44" class="mine-cover" />
                <view class="mine-shade" />
                <view v-if="c.todayActive && c.todayActive > 0" class="mine-badge">
                  <view class="mine-badge-dot" />
                  <text class="mine-badge-txt">今日 {{ c.todayActive }} 条</text>
                </view>
                <view class="mine-card-copy">
                  <text class="mine-name">{{ c.name }}</text>
                  <view class="mine-card-foot">
                    <text class="mine-members">{{ formatMembers(c.members) }} 圈友</text>
                    <view class="mine-enter">
                      <text class="mine-enter-txt">进入</text>
                      <app-icon name="chevron-right" :size="20" color="#FFFFFF" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- ════ 区② 发现圈子 ════ -->
      <view class="section">
        <view class="sec-head"><text class="sec-title">发现圈子</text></view>
        <!-- 分类筛选 -->
        <scroll-view scroll-x class="cat-scroll">
          <view class="cat-row">
            <!-- 分类含首项 { id:'', name:'推荐' } 作为「全部/推荐」，勿再额外硬编码一枚，否则重复两个「推荐」 -->
            <view
              v-for="cat in circleCategories" :key="cat.id"
              class="cat-chip" :class="{ on: category === cat.id }"
              @tap="selectCategory(cat.id)"
            ><text class="cat-text" :class="{ on: category === cat.id }">{{ cat.name }}</text></view>
          </view>
        </scroll-view>

        <!-- 加载态：骨架 -->
        <view v-if="loading" class="discover-list">
          <view v-for="i in 4" :key="i" class="sk-card">
            <view class="sk-cover" />
            <view class="sk-body"><view class="sk-line w3" /><view class="sk-line w2" /></view>
          </view>
        </view>
        <!-- 错误态 -->
        <app-error v-else-if="error" title="圈子加载失败" desc="网络异常，请稍后重试" @retry="loadCircles" />
        <!-- 列表 -->
        <!-- animate-fade-in 挂列表容器：进入渐入；不挂卡片（forwards 动画会压掉卡片 :active 缩放） -->
        <view v-else-if="visibleDiscoverCircles.length" class="discover-list animate-fade-in">
          <!-- 整卡点击进详情页（像商品/课程卡）：未加入→加入引导页，已加入→圈子详情。
               卡上不再「无感即加入」，加入/购买动作在详情页完成（董事长 #24） -->
          <view
            v-for="c in visibleDiscoverCircles" :key="c.id"
            class="circle-card" @tap="openCircle(c)"
          >
            <!-- 圈子封面统一按 4:3 横向裁剪：兼容既有竖图，也更适合圈子发现卡与动态流复用 -->
            <view class="card-cover">
              <smart-cover :src="c.cover" :title="c.name" type="circle" deco :deco-size="52" class="card-cover-img" />
              <view class="card-cover-shade" />
              <text class="card-category">{{ c.category || '同好圈' }}</text>
              <view v-if="c.rank" class="card-rank"><text class="card-rank-txt">热门 {{ c.rank }}</text></view>
            </view>
            <view class="card-body">
              <text class="card-kicker">{{ c.todayActive && c.todayActive > 0 ? '今日正在发生' : `${c.category || '国学'} · 圈子门帖` }}</text>
              <view class="card-head">
                <text class="card-title">{{ c.name }}</text>
                <view v-if="pendingIds.has(String(c.id))" class="tag-pending"><text class="tag-pending-txt">审核中</text></view>
              </view>
              <text class="card-desc">{{ c.description }}</text>
              <view class="card-signals">
                <view class="card-signal">
                  <app-icon name="users" :size="20" color="#7C6852" />
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
                  <text class="card-cta-txt">{{ pendingIds.has(String(c.id)) ? '查看申请' : '看看圈里' }}</text>
                  <app-icon name="chevron-right" :size="21" color="#FFFFFF" />
                </view>
              </view>
            </view>
          </view>
          <view v-if="discoverBatchCount > 1" class="discover-pager">
            <text class="discover-pager-count">{{ discoverBatch + 1 }} / {{ discoverBatchCount }}</text>
            <view class="discover-pager-btn" @tap="nextDiscoverBatch">
              <app-icon name="refresh-cw" :size="24" color="#7A5634" />
              <text class="discover-pager-txt">换一批</text>
            </view>
          </view>
        </view>
        <!-- 空态 -->
        <view v-else class="empty">
          <view class="empty-icon"><app-icon name="users" :size="56" color="#999999" /></view>
          <text class="empty-text">没找到相关圈子，换个分类看看吧</text>
        </view>
      </view>

      <!-- ════ 区③ 动态 · 已加入圈子聚合 ════ -->
      <view v-if="hotPosts.length" class="section activity-section">
        <view class="sec-head activity-head">
          <view class="sec-title-wrap">
            <text class="sec-title">圈内新鲜事</text>
            <text class="sec-sub">来自你加入的圈子</text>
          </view>
          <view class="activity-mark"><view class="activity-mark-dot" /><text class="activity-mark-txt">持续更新</text></view>
        </view>
        <view class="feed-list activity-shell">
          <view
            v-for="post in hotPosts" :key="post.id"
            class="feed-item list-press" @tap="go(`/pkg-circle/circles/post?id=${post.id}&circleId=${post.circleId}`)"
          >
            <view class="feed-author-col">
              <smart-avatar :src="post.author.avatar" :name="post.author.name" class="feed-avatar" />
              <view class="feed-rail" />
            </view>
            <view class="feed-body">
              <view class="feed-source">
                <text class="feed-circle" @tap.stop="go(`/pkg-circle/circles/detail?id=${post.circleId}`)">{{ post.circleName }}</text>
                <text class="feed-author">{{ post.author.name }}</text>
                <text class="feed-time">{{ post.time }}</text>
                <text v-if="post.isPinned" class="tag-featured">置顶</text>
              </view>
              <text class="feed-text">{{ post.content }}</text>
              <view class="feed-foot">
                <view class="feed-stat"><app-icon name="heart" :size="20" color="#A18D79" /><text>{{ post.likes || 0 }}</text></view>
                <view class="feed-stat"><app-icon name="message-circle" :size="20" color="#A18D79" /><text>{{ post.comments || 0 }}</text></view>
                <text class="feed-open">展开阅读</text>
              </view>
            </view>
            <!-- 帖子缩略图：smart-cover 兜底（URL 失效不再破图；plain=纯底纹，缩略图上不出水印文字） -->
            <smart-cover v-if="post.images.length" :src="post.images[0]" type="circle" plain class="feed-thumb" />
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <bottom-nav active="circle" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 32rpx 12rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 20rpx);
  background: rgba(250, 248, 245, 0.92);
  backdrop-filter: blur(20rpx);
}
.title { font-size: 44rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); letter-spacing: 1rpx; }
.actions { display: flex; align-items: center; gap: 14rpx; }
/* 搜索入口：常显浅底衬+88rpx 触达区 */
.icon-btn { position: relative; width: 88rpx; height: 88rpx; border-radius: 999rpx; background: rgba(0, 0, 0, 0.04); display: flex; align-items: center; justify-content: center; }
.icon-btn:active { background: var(--separator, #ede7dd); }
/* 创建=关键动作·朱红实底 */
.create-btn {
  display: flex; align-items: center; gap: 6rpx;
  height: 60rpx; padding: 0 24rpx; border-radius: 30rpx;
  background: var(--brand, #c41e3a);
}
.create-btn-txt { font-size: 26rpx; color: #fff; font-weight: 500; }
.create-btn:active { opacity: 0.85; }
/* 圈子·我的入口 */
.me-entry {
  width: 88rpx; height: 88rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: #fff; box-shadow: 0 0 0 2rpx var(--separator, #ede7dd);
}
.me-entry:active { opacity: 0.8; }

.body { flex: 1; }
.section { margin-top: 40rpx; }
.bottom-spacer { height: 180rpx; }

/* 分区标题 */
.sec-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 32rpx; margin-bottom: 20rpx; }
.sec-title { font-size: 34rpx; font-weight: 650; color: var(--text-primary, #2c2c2c); }
.sec-title-wrap { display: flex; align-items: baseline; gap: 14rpx; }
.sec-sub { font-size: 22rpx; color: var(--text-tertiary, #999); }
.sec-more { display: flex; align-items: center; gap: 2rpx; }
.sec-more-txt { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }

/* 区① 我的圈子：浅色册页。背景退后，让每张圈子封面成为视觉主体。 */
.mine-section { margin-top: 20rpx; }
.mine-shell {
  position: relative;
  margin: 0 24rpx;
  overflow: hidden;
  border: 1rpx solid #dbe4df;
  border-radius: 36rpx;
  background:
    radial-gradient(circle at 92% 4%, rgba(111, 143, 129, 0.12), transparent 34%),
    linear-gradient(125deg, #f1f5f2 0%, #faf8f3 100%);
  box-shadow: 0 12rpx 28rpx rgba(52, 72, 63, 0.08);
}
.mine-shell::before {
  content: '';
  position: absolute;
  top: 18rpx;
  right: 26rpx;
  width: 90rpx;
  height: 90rpx;
  border: 1rpx solid rgba(88, 117, 103, 0.12);
  border-radius: 999rpx;
  box-shadow: inset 0 0 0 12rpx rgba(88, 117, 103, 0.025);
  pointer-events: none;
}
.mine-shell-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 26rpx 26rpx 20rpx;
}
.mine-heading { min-width: 0; }
.mine-title-row { display: flex; align-items: center; gap: 14rpx; }
.mine-title { font-size: 34rpx; font-weight: 650; color: #263a32; letter-spacing: 1rpx; }
.mine-count {
  padding: 4rpx 12rpx;
  border: 1rpx solid rgba(84, 117, 102, 0.18);
  border-radius: 999rpx;
  font-size: 19rpx;
  color: #60766c;
  background: rgba(255, 255, 255, 0.72);
}
.mine-subtitle { display: block; margin-top: 7rpx; font-size: 22rpx; color: #7c8c85; }
.mine-more { position: relative; z-index: 1; display: flex; align-items: center; padding-top: 6rpx; }
.mine-more-txt { font-size: 22rpx; color: #64766e; }
.mine-scroll { position: relative; z-index: 1; width: 100%; white-space: nowrap; }
.mine-row { display: inline-flex; gap: 16rpx; padding: 0 24rpx 28rpx; }
.mine-card {
  position: relative;
  width: 232rpx;
  height: 174rpx;
  box-sizing: border-box;
  display: inline-flex;
  overflow: hidden;
  border: 1rpx solid rgba(78, 101, 91, 0.18);
  border-radius: 24rpx;
  background: #5b493a;
  box-shadow: 0 10rpx 22rpx rgba(38, 58, 49, 0.14);
  vertical-align: top;
}
.mine-cover { position: absolute; inset: 0; width: 100%; height: 100%; }
.mine-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(19, 15, 12, 0.02) 10%, rgba(19, 15, 12, 0.16) 48%, rgba(19, 15, 12, 0.82) 100%);
}
.mine-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 5rpx 10rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  background: rgba(28, 23, 19, 0.62);
  backdrop-filter: blur(8rpx);
}
.mine-badge-dot { width: 8rpx; height: 8rpx; border-radius: 999rpx; background: #e9c477; }
.mine-badge-txt { font-size: 18rpx; font-weight: 600; color: #fff4da; line-height: 1.2; }
.mine-card-copy {
  position: absolute;
  z-index: 1;
  right: 14rpx;
  bottom: 12rpx;
  left: 14rpx;
}
.mine-name {
  display: -webkit-box;
  overflow: hidden;
  font-size: 27rpx;
  font-weight: 650;
  color: #ffffff;
  line-height: 1.3;
  white-space: normal;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.36);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.mine-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; margin-top: 8rpx; }
.mine-members {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 19rpx;
  color: rgba(255, 255, 255, 0.68);
}
.mine-enter { display: flex; align-items: center; flex: 0 0 auto; }
.mine-enter-txt { font-size: 20rpx; font-weight: 600; color: #ffffff; }

/* 区② 发现圈子 */
.cat-scroll { width: 100%; white-space: nowrap; }
.cat-row { display: inline-flex; gap: 16rpx; padding: 0 32rpx 24rpx; }
.cat-chip {
  flex-shrink: 0; height: 60rpx; padding: 0 30rpx; border-radius: 30rpx;
  display: flex; align-items: center;
  background: var(--bg-card, #fff); border: 1rpx solid var(--separator, #ede7dd);
}
.cat-chip.on { background: var(--text-primary, #2c2c2c); border-color: var(--text-primary, #2c2c2c); }
.cat-text { font-size: 26rpx; color: var(--text-secondary, #6e6e73); white-space: nowrap; }
.cat-text.on { color: #fff; font-weight: 500; }

.discover-list { display: flex; flex-direction: column; gap: 18rpx; padding: 0 32rpx; }
.circle-card {
  position: relative;
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
  padding: 18rpx;
  overflow: hidden;
  border: 1rpx solid #e7ddce;
  border-radius: 30rpx;
  background:
    linear-gradient(90deg, rgba(249, 245, 238, 0.78) 0, rgba(255, 255, 255, 0) 45%),
    #fff;
  box-shadow: 0 9rpx 28rpx rgba(77, 57, 35, 0.07);
  transition: transform 0.15s ease-out;
}
.circle-card::after {
  content: '';
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  bottom: 14rpx;
  left: 14rpx;
  border: 1rpx solid rgba(167, 124, 71, 0.08);
  border-radius: 22rpx;
  pointer-events: none;
}
.circle-card:active { transform: scale(0.99); }
/* 圈子封面统一 4:3：信息密度更适合广场列表，也能兼容照片、插画与品牌图。 */
.card-cover {
  position: relative;
  z-index: 1;
  width: 216rpx;
  height: 162rpx;
  overflow: hidden;
  flex: 0 0 216rpx;
  border: 1rpx solid rgba(112, 80, 46, 0.2);
  border-radius: 22rpx;
  background: #f2efea;
  box-shadow: 0 8rpx 18rpx rgba(61, 43, 27, 0.12);
}
.card-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.card-cover-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(29, 22, 17, 0.04), transparent 52%, rgba(29, 22, 17, 0.38)); }
.card-category {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  max-width: 118rpx;
  padding: 5rpx 10rpx;
  overflow: hidden;
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  border-radius: 8rpx;
  background: rgba(35, 27, 21, 0.66);
  font-size: 18rpx;
  color: #fff7e8;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card-rank { position: absolute; right: 10rpx; bottom: 10rpx; padding: 5rpx 9rpx; border-radius: 8rpx; background: #c41e3a; }
.card-rank-txt { font-size: 18rpx; font-weight: 650; color: #fff; }
.card-body { position: relative; z-index: 1; flex: 1; min-width: 0; min-height: 212rpx; align-self: stretch; display: flex; flex-direction: column; }
.card-kicker { font-size: 19rpx; font-weight: 650; color: #9b6a2f; letter-spacing: 2rpx; }
.card-head { display: flex; align-items: center; gap: 10rpx; margin-top: 5rpx; }
.card-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 31rpx;
  font-weight: 650;
  color: var(--text-primary, #2c2c2c);
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 已加入·轻标签 */
.tag-joined { flex-shrink: 0; padding: 4rpx 13rpx; border-radius: 999rpx; background: #efe9df; }
.tag-joined-txt { font-size: 19rpx; color: #7e6c58; }
/* 审核中·轻标签（待圈主审批的入圈申请） */
.tag-pending { flex-shrink: 0; padding: 4rpx 13rpx; border-radius: 999rpx; background: rgba(201, 169, 110, 0.16); }
.tag-pending-txt { font-size: 19rpx; color: #9b6a2f; }
.card-desc {
  display: -webkit-box;
  margin-top: 9rpx;
  overflow: hidden;
  font-size: 27rpx;
  color: #68615a;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-signals { display: flex; align-items: center; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.card-signal {
  display: flex;
  align-items: center;
  gap: 5rpx;
  padding: 5rpx 9rpx;
  border-radius: 8rpx;
  background: #f4f0e9;
}
.card-signal.active { background: rgba(196, 30, 58, 0.08); }
.card-signal-txt { font-size: 19rpx; color: #766a5d; line-height: 1.2; }
.signal-live-dot { width: 8rpx; height: 8rpx; border-radius: 999rpx; background: #c41e3a; }
.card-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: auto;
  padding-top: 13rpx;
  border-top: 1rpx solid rgba(143, 111, 74, 0.12);
}
.card-price-wrap { min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.card-price-label { font-size: 17rpx; color: #aaa095; }
.card-price { font-size: 25rpx; font-weight: 700; color: #a66a24; line-height: 1.2; }
.card-price-unit { font-size: 19rpx; font-weight: 500; }
.card-price.free { font-size: 23rpx; color: #9a6324; }
.card-price.joined { font-size: 22rpx; color: #756451; }
.card-cta {
  height: 52rpx;
  padding: 0 16rpx 0 20rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  background: #c41e3a;
  box-shadow: 0 6rpx 12rpx rgba(196, 30, 58, 0.18);
}
.card-cta.joined { background: #eee7dd; box-shadow: none; }
.card-cta.pending { background: #9b7a4c; }
.card-cta-txt { font-size: 21rpx; font-weight: 650; color: #fff; }
.card-cta.joined .card-cta-txt { color: #705a43; }

.discover-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  padding: 6rpx 0 2rpx;
}
.discover-pager-count {
  min-width: 54rpx;
  font-size: 20rpx;
  color: #a09588;
  text-align: right;
}
.discover-pager-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 58rpx;
  padding: 0 24rpx;
  border: 1rpx solid #dfd3c3;
  border-radius: 999rpx;
  background: #fffdf9;
  box-shadow: 0 5rpx 14rpx rgba(90, 67, 43, 0.06);
}
.discover-pager-txt { font-size: 23rpx; font-weight: 600; color: #7a5634; }

/* 骨架 */
.sk-card { display: flex; gap: 24rpx; background: var(--bg-card, #fff); border-radius: 32rpx; padding: 24rpx; }
.sk-cover { width: 216rpx; height: 162rpx; border-radius: 22rpx; background: #f2efea; flex-shrink: 0; }
.sk-body { flex: 1; padding-top: 12rpx; }
.sk-line { height: 28rpx; background: #f2efea; border-radius: 8rpx; margin-bottom: 16rpx; }
.sk-line.w3 { width: 70%; }
.sk-line.w2 { width: 45%; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: var(--separator, #f5f0e8); display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.empty-text { font-size: 28rpx; color: var(--text-tertiary, #999); }

/* 区③ 圈内新鲜事：用“动态手账”卡片承接内容，和上方获客卡形成明显层级。 */
.activity-section { margin-top: 44rpx; }
.activity-head { align-items: center; margin-bottom: 16rpx; }
.activity-mark { display: flex; align-items: center; gap: 7rpx; }
.activity-mark-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: #c41e3a; box-shadow: 0 0 0 7rpx rgba(196, 30, 58, 0.08); }
.activity-mark-txt { font-size: 20rpx; color: #9b8170; }
.activity-shell {
  margin: 0 24rpx;
  padding: 4rpx 18rpx;
  overflow: hidden;
  border: 1rpx solid #e6ddd2;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10rpx 28rpx rgba(76, 55, 35, 0.06);
}
.feed-item { position: relative; display: flex; gap: 16rpx; padding: 24rpx 4rpx; border-bottom: 1rpx solid #eee7de; }
.feed-item:last-child { border-bottom: none; }
.feed-author-col { position: relative; display: flex; flex: 0 0 68rpx; justify-content: center; }
.feed-avatar { position: relative; z-index: 1; width: 64rpx; height: 64rpx; border-radius: 20rpx; flex-shrink: 0; box-shadow: 0 4rpx 10rpx rgba(72, 48, 26, 0.12); }
.feed-rail { position: absolute; top: 68rpx; bottom: -26rpx; left: 50%; width: 1rpx; background: #eadfd3; }
.feed-item:last-child .feed-rail { display: none; }
.feed-body { flex: 1; min-width: 0; }
.feed-source { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.feed-circle {
  max-width: 220rpx;
  padding: 4rpx 10rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #f1eee8;
  font-size: 21rpx;
  color: #6e5843;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.feed-author, .feed-time { font-size: 21rpx; color: #9b9187; }
.tag-featured { font-size: 18rpx; color: #a87432; font-weight: 600; border: 1rpx solid #d7b57f; border-radius: 6rpx; padding: 0 8rpx; line-height: 28rpx; }
.feed-text { display: -webkit-box; margin-top: 12rpx; overflow: hidden; font-size: 28rpx; color: #302b27; line-height: 1.55; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.feed-foot { display: flex; align-items: center; gap: 20rpx; margin-top: 13rpx; }
.feed-stat { display: flex; align-items: center; gap: 5rpx; font-size: 20rpx; color: #a18d79; }
.feed-open { margin-left: auto; font-size: 21rpx; font-weight: 600; color: #8a5f35; }
.feed-thumb { width: 116rpx; height: 87rpx; border-radius: 18rpx; flex-shrink: 0; align-self: center; box-shadow: 0 4rpx 10rpx rgba(72, 48, 26, 0.08); }
</style>
