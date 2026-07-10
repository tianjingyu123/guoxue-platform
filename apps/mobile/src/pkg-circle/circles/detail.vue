<script setup lang="ts">
/**
 * 圈子详情页 — V0 门控骨架重构（2026-07-10）
 * 结构：导航 → 身份区 → 公告 → AI助理入口 → 增值内容带(直播/课堂/橱窗·门控点亮) → Tab(动态/精华/文章/成员) → 动态流(帖子/课程/短视频/文章穿插) → 4角色底部操作栏
 * 门控：增值模块 v-if="xxx.length" 天然实现——未开通(无数据)=不存在，开通=融入。核心互动(帖子)恒为主体。
 * 底部操作栏：游客=加入 / 成员=发帖+更多(分享/退出) / 创作者=发帖+创作+更多 / 圈主=发帖+创作+管理(无退出)
 * 数据层沿用原实现（circleDetailApi 全套 + 角色/加入/审批/付费/弹窗逻辑），不改后端契约。
 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useShare } from '@/composables/useShare'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import PostCard from '@/components/circle/post-card.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import PurchaseSheet from '@/components/common/purchase-sheet.vue'
import {
  circleDetailApi, memberBenefits,
  type CircleDetail, type CirclePost, type CircleMember, type CircleArticle, type CircleCourse, type CircleLive, type CircleProduct,
} from '@/lib/circle-detail-data'
import { track } from '@/composables/useTrack'
import { formatPrice } from '@/utils/format'

const circleId = ref('1')
const circle = ref<CircleDetail | null>(null)
const posts = ref<CirclePost[]>([])
const members = ref<CircleMember[]>([])
const circleArticles = ref<CircleArticle[]>([])
const courses = ref<CircleCourse[]>([])
const lives = ref<CircleLive[]>([])
const circleProducts = ref<CircleProduct[]>([])
const postedArticles = ref<CircleArticle[]>([])
const isLoading = ref(true)
const error = ref('')
const activeTab = ref<'home' | 'essence' | 'articles' | 'members'>('home')
const showAnnouncement = ref(false)
const isJoined = ref(false)
const applied = ref(false)
// 角色权限
const isOwner = computed(() => circle.value?.myRole === 'OWNER')
const canCreate = computed(() => ['OWNER', 'PARTNER', 'ADMIN'].includes(circle.value?.myRole || ''))
const canManage = computed(() => ['OWNER', 'ADMIN'].includes(circle.value?.myRole || ''))
const isLoggedIn = () => !!getToken()
const likedPosts = ref<Set<string>>(new Set())
const showBenefits = ref(false)
const showPurchase = ref(false)
// 进行中的直播（增值带优先浮出）
const liveNow = computed(() => lives.value.find((l) => l.status === 'live'))

/** 底部加入按钮文案 */
const joinButtonText = computed(() => {
  const c = circle.value
  if (!c) return '加入圈子'
  if (isJoined.value) return '已加入'
  if (applied.value) return '审核中 · 查看进度'
  if (c.type === 'FREE') return c.needApproval ? '申请加入' : '免费加入'
  if (c.type === 'YEARLY') return `¥${c.price}/年 加入`
  return `¥${c.price} 加入圈子`
})

const tabs = [
  { id: 'home', label: '动态' },
  { id: 'essence', label: '精华' },
  { id: 'articles', label: '文章' },
  { id: 'members', label: '成员' },
] as const

const essencePosts = computed(() => posts.value.filter((p) => p.isEssence))

onLoad((q) => {
  if (q?.id) circleId.value = q.id
  loadData()
})

const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => toAppMessage({
  title: circle.value?.name || '国学圈子',
  path: `/circles/${circle.value?.id || circleId.value}`,
  cover: circle.value?.cover,
}))
onShareTimeline(() => toTimeline({
  title: circle.value?.name || '国学圈子',
  path: `/circles/${circle.value?.id || circleId.value}`,
  cover: circle.value?.cover,
}))

async function loadData() {
  isLoading.value = true
  error.value = ''
  try {
    // 主请求（圈子本体）失败才整页报错；子模块各自降级为空——防单个子接口抖动拖垮整页（董事长 2026-07-11 真机反馈修复）
    const c = await circleDetailApi.detail(circleId.value)
    circle.value = c
    isJoined.value = c.isJoined

    const [p, m, arts, crs, lvs, prds, pas, st] = await Promise.allSettled([
      circleDetailApi.posts(circleId.value),
      circleDetailApi.listMembers(circleId.value),
      circleDetailApi.articles(circleId.value),
      circleDetailApi.courses(circleId.value),
      circleDetailApi.lives(circleId.value),
      circleDetailApi.products(circleId.value),
      circleDetailApi.postedArticles(circleId.value),
      isLoggedIn() ? circleDetailApi.getJoinStatus(circleId.value) : Promise.reject(new Error('未登录')),
    ])
    posts.value = p.status === 'fulfilled' ? p.value.data : []
    members.value = m.status === 'fulfilled' ? m.value.data : []
    circleArticles.value = arts.status === 'fulfilled' ? arts.value : []
    courses.value = crs.status === 'fulfilled' ? crs.value : []
    lives.value = lvs.status === 'fulfilled' ? lvs.value : []
    circleProducts.value = prds.status === 'fulfilled' ? prds.value : []
    postedArticles.value = pas.status === 'fulfilled' ? pas.value : []
    if (st.status === 'fulfilled') {
      isJoined.value = st.value.joined
      if (circle.value) circle.value.myRole = st.value.role
    }
    likedPosts.value = new Set((p.status === 'fulfilled' ? p.value.data : []).filter((x) => x.isLiked).map((x) => x.id))
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

function handleJoin() {
  if (applied.value) { navigateTo('/pkg-circle/circles/my-join-requests'); return }
  if (isJoined.value) return
  if (!isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => navigateTo('/pkg-auth/login/index'), 600)
    return
  }
  const c = circle.value
  if (!c) return
  if (c.type === 'FREE') doJoin()
  else showBenefits.value = true
}
const joining = ref(false)
async function doJoin() {
  const c = circle.value
  if (!c || joining.value) return
  if (c.needApproval) {
    joining.value = true
    try {
      const r = await circleDetailApi.join(circleId.value)
      applied.value = true
      uni.showToast({ title: r?.message || '申请已提交，等待圈主审核', icon: 'none' })
    } catch {
      uni.showToast({ title: '申请提交失败，请重试', icon: 'none' })
    } finally { joining.value = false }
    return
  }
  isJoined.value = true
  circleDetailApi.join(circleId.value).catch(() => {
    isJoined.value = false
    uni.showToast({ title: '加入失败，请重试', icon: 'none' })
  })
}
function confirmJoin() { showBenefits.value = false; showPurchase.value = true }
async function onPurchased() {
  showPurchase.value = false
  track.purchase({ type: 'circle', id: circle.value?.id, amount: circle.value?.price })
  const st = await circleDetailApi.getJoinStatus(circleId.value)
  isJoined.value = st.joined
  if (circle.value) circle.value.myRole = st.role
  if (st.joined) uni.showToast({ title: '加入成功', icon: 'success' })
  else uni.showToast({ title: '订单已提交，支付完成后自动加入', icon: 'none' })
}
function handleLikePost(postId: string) {
  const next = new Set(likedPosts.value)
  const wasLiked = next.has(postId)
  wasLiked ? next.delete(postId) : next.add(postId)
  likedPosts.value = next
  posts.value = posts.value.map((p) => (p.id === postId ? { ...p, likes: p.likes + (wasLiked ? -1 : 1) } : p))
}

function fmt(n: number) { return n.toLocaleString() }
function openShare() { navigateTo(`/pkg-circle/common/share-poster?type=circle&targetId=${circleId.value}`) }
function openPost(id: string) { navigateTo(`/pkg-circle/circles/post?circleId=${circleId.value}&id=${id}`) }
function openQuickPost() { navigateTo(`/pkg-circle/circles/editor?circleId=${circleId.value}`) }
/**
 * 统一发布入口（V0 渐进披露 sheet）：发动态永远置顶最轻，创作形式随权限展开。
 * 颗粒化授权（谁能发什么）后端待建，本版 canCreate 为真即列全部创作形式。
 * 文章/课程走 publish 表单页，短视频/直播走各自独立发布页。
 */
function openCreate() {
  const items = [
    { label: '发动态（图文/文件/语音）', act: openQuickPost },
    { label: '写文章', act: () => navigateTo(`/pkg-circle/circles/publish?circleId=${circleId.value}&type=article`) },
    { label: '发短视频', act: () => navigateTo(`/pkg-video/publish/index?circleId=${circleId.value}`) },
    { label: '发课程', act: () => navigateTo(`/pkg-circle/circles/publish?circleId=${circleId.value}&type=course`) },
    { label: '发直播', act: () => navigateTo(`/pkg-live/create/index?circleId=${circleId.value}`) },
  ]
  uni.showActionSheet({ itemList: items.map((i) => i.label), success: (r) => items[r.tapIndex]?.act() })
}
function openManage() { navigateTo(`/pkg-circle/circles/dashboard?id=${circleId.value}`) }
function openMore() {
  // 董事长 2026-07-11 真机反馈：①分享去重（右上角已有分享按钮）②退出弱化——不再直弹确认框，改走退出引导页（挽留+后果说明+退款衔接）
  const items: { label: string; act: () => void }[] = []
  if (isJoined.value && !isOwner.value) {
    items.push({ label: '退出与退款', act: () => navigateTo(`/pkg-circle/circles/exit?id=${circleId.value}`) })
  }
  if (!items.length) return
  uni.showActionSheet({ itemList: items.map((i) => i.label), success: (r) => items[r.tapIndex]?.act() })
}
function doLeave() {
  const c = circle.value
  if (c && c.type !== 'FREE') {
    navigateTo(`/pkg-circle/circles/exit?id=${circleId.value}`)
  } else {
    uni.showModal({
      title: '退出圈子', content: '确定退出该圈子吗？退出后将失去成员身份。', confirmColor: '#C41E3A',
      success: (r) => {
        if (!r.confirm) return
        isJoined.value = false
        circleDetailApi.leave(circleId.value).catch(() => { isJoined.value = true; uni.showToast({ title: '退出失败', icon: 'none' }) })
      },
    })
  }
}
function openAnnouncement() { navigateTo(`/pkg-circle/circles/announcements?id=1&circleId=${circleId.value}`) }
function openUser(id: string) { navigateTo(`/pkg-circle/user/profile?id=${id}`) }
function openAssistant() { navigateTo(`/pkg-circle/circles/assistant?circleId=${circleId.value}&name=${encodeURIComponent(circle.value?.name || '')}`) }
function openConsult() { navigateTo(`/pkg-circle/circles/consult-experts?circleId=${circleId.value}`) }
// 增值带跳转：直播广场 / 课堂列表 / 橱窗（复用活动广场式聚合，暂跳各内容页）
function openLive(id: string) { navigateTo(`/live/${id}`) }
function openCourses() { navigateTo('/pkg-circle/circles/activities') }
function openShowcase() { navigateTo('/pkg-circle/circles/activities') }
</script>

<template>
  <view class="cd-page" v-if="!isLoading && !error && circle">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="nav-title">{{ circle.name }}</text>
      <view class="nav-action" @tap="openShare"><app-icon name="share-2" :size="34" color="#6E6E73" /></view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- A. 头部·身份区 -->
      <view class="header">
        <view class="identity">
          <view class="identity-top">
            <smart-cover :src="circle.cover" :title="circle.name" type="circle" class="identity-cover" />
            <view class="identity-info">
              <text class="identity-name">{{ circle.name }}</text>
              <text class="identity-desc">{{ circle.description }}</text>
            </view>
          </view>
          <view class="identity-meta">
            <text class="meta-stat"><text class="meta-num">{{ fmt(circle.members) }}</text>成员</text>
            <text v-if="circle.todayActive" class="meta-stat"><text class="meta-num">{{ circle.todayActive }}</text>今日新帖</text>
            <view class="meta-owner" @tap="openUser(circle.owner.id)">
              <image lazy-load :src="circle.owner.avatar" class="meta-owner-avatar" mode="aspectFill" />
              <text class="meta-owner-txt">{{ circle.owner.name }} · 圈主</text>
            </view>
          </view>
          <!-- 置顶公告（收起态可展开） -->
          <view v-if="circle.announcement" class="announce" @tap="showAnnouncement = !showAnnouncement">
            <text class="announce-tag">公告</text>
            <text class="announce-text" :class="{ open: showAnnouncement }">{{ circle.announcement }}</text>
            <app-icon :name="showAnnouncement ? 'chevron-up' : 'chevron-down'" :size="24" color="#999999" />
          </view>
          <view v-if="showAnnouncement && circle.announcement" class="announce-more" @tap="openAnnouncement">
            <text class="announce-more-txt">查看完整公告</text>
            <app-icon name="chevron-right" :size="22" color="#C41E3A" />
          </view>

          <!-- 圈主 AI 助理入口（金色·科技感）：圈子特色能力 -->
          <view class="ai-entry" @tap="openAssistant">
            <view class="ai-orb"><app-icon name="sparkles" :size="30" color="#C9A96E" /></view>
            <view class="ai-text">
              <text class="ai-title">圈主助理</text>
              <text class="ai-sub">圈子专属 AI，学习本圈内容，随时答疑</text>
            </view>
            <text class="ai-go">对话</text>
          </view>

          <!-- 达人咨询入口（图文提问 / 连麦·董事长 2026-07-11 反馈补·与 AI 助理同级并排） -->
          <view class="ai-entry consult-entry" @tap="openConsult">
            <view class="ai-orb"><app-icon name="headphones" :size="30" color="#C9A96E" /></view>
            <view class="ai-text">
              <text class="ai-title">达人咨询</text>
              <text class="ai-sub">向圈内达人图文提问、悬赏或连麦一对一</text>
            </view>
            <text class="ai-go">去咨询</text>
          </view>
        </view>
      </view>

      <!-- 增值内容带（门控点亮：有直播/课程/好物才出现，无则整条不存在） -->
      <scroll-view
        v-if="liveNow || courses.length || circleProducts.length"
        scroll-x class="value-strip"
      >
        <view class="value-row">
          <!-- 直播中卡：优先浮出 -->
          <view v-if="liveNow" class="live-card" @tap="openLive(liveNow.id)">
            <image lazy-load :src="liveNow.cover" class="live-thumb" mode="aspectFill" />
            <view class="live-info">
              <view class="live-badge"><view class="live-dot" /><text class="live-badge-txt">直播中</text></view>
              <text class="live-name">{{ liveNow.title }}</text>
              <text class="live-count">{{ liveNow.hostName }}</text>
            </view>
          </view>
          <!-- 课堂入口 -->
          <view v-if="courses.length" class="mini-entry" @tap="openCourses">
            <view class="mini-head"><text class="mini-title">课堂</text><app-icon name="chevron-right" :size="22" color="#999999" /></view>
            <text class="mini-sub">{{ courses.length }} 门圈内课程</text>
            <view class="mini-thumbs">
              <image v-for="crs in courses.slice(0, 3)" :key="crs.id" lazy-load :src="crs.cover" class="mini-thumb" mode="aspectFill" />
            </view>
          </view>
          <!-- 橱窗入口 -->
          <view v-if="circleProducts.length" class="mini-entry" @tap="openShowcase">
            <view class="mini-head"><text class="mini-title">橱窗</text><app-icon name="chevron-right" :size="22" color="#999999" /></view>
            <text class="mini-sub">{{ circleProducts.length }} 件圈内好物</text>
            <view class="mini-thumbs">
              <image v-for="pr in circleProducts.slice(0, 3)" :key="pr.id" lazy-load :src="pr.cover" class="mini-thumb" mode="aspectFill" />
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- B. 内容区 Tab -->
      <view class="tabs">
        <view v-for="tab in tabs" :key="tab.id" class="tab" @tap="activeTab = tab.id">
          <text class="tab-txt" :class="{ on: activeTab === tab.id }">{{ tab.label }}</text>
          <view v-if="activeTab === tab.id" class="tab-line" />
        </view>
        <view class="tab-search" @tap="navigateTo('/pkg-circle/circles/search')"><app-icon name="search" :size="32" color="#999999" /></view>
      </view>

      <!-- 动态 Tab：核心互动为主体，增值内容(课程/短视频/文章)以同一卡片语言穿插 -->
      <view v-if="activeTab === 'home'" class="feed">
        <post-card
          v-for="post in posts" :key="post.id"
          :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)"
          @like="handleLikePost"
        />

        <!-- 圈内课程卡（门控·融入流） -->
        <view v-if="courses.length" class="inline-card course-card" @tap="openCourses">
          <image lazy-load :src="courses[0].cover" class="course-cover" mode="aspectFill" />
          <view class="course-main">
            <text class="course-kind">课程</text>
            <text class="course-title">{{ courses[0].title }}</text>
            <view class="course-meta">
              <text v-if="courses[0].price > 0" class="course-price">¥{{ formatPrice(courses[0].price) }}</text>
              <text v-else class="course-price">免费</text>
              <text class="course-teacher">{{ courses[0].teacher }}</text>
            </view>
          </view>
        </view>

        <!-- 圈内文章卡（展示层默认·对外窗口） -->
        <view v-if="postedArticles.length" class="inline-card article-card" @tap="navigateTo(`/pkg-circle/articles/detail?id=${postedArticles[0].id}`)">
          <view class="article-main">
            <text class="article-kind">文章</text>
            <text class="article-title">{{ postedArticles[0].title }}</text>
            <text class="article-byline">{{ postedArticles[0].author }}<text v-if="postedArticles[0].views"> · 阅读 {{ postedArticles[0].views }}</text></text>
          </view>
          <image v-if="postedArticles[0].cover" lazy-load :src="postedArticles[0].cover" class="article-cover" mode="aspectFill" />
        </view>

        <view class="feed-end"><text class="feed-end-txt">上拉加载更多</text></view>
      </view>

      <!-- 精华 Tab -->
      <view v-else-if="activeTab === 'essence'" class="feed">
        <template v-if="essencePosts.length">
          <post-card
            v-for="post in essencePosts" :key="post.id"
            :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)" :show-essence="true"
            @like="handleLikePost"
          />
        </template>
        <view v-else class="empty">
          <app-icon name="star" :size="88" color="#E8E3DB" />
          <text class="empty-txt">暂无精华内容</text>
        </view>
      </view>

      <!-- 文章 Tab -->
      <view v-else-if="activeTab === 'articles'" class="feed">
        <template v-if="postedArticles.length">
          <view
            v-for="a in postedArticles" :key="a.id"
            class="inline-card article-card" @tap="navigateTo(`/pkg-circle/articles/detail?id=${a.id}`)"
          >
            <view class="article-main">
              <text class="article-kind">文章</text>
              <text class="article-title">{{ a.title }}</text>
              <text class="article-byline">{{ a.author }}<text v-if="a.views"> · 阅读 {{ a.views }}</text></text>
            </view>
            <image v-if="a.cover" lazy-load :src="a.cover" class="article-cover" mode="aspectFill" />
          </view>
        </template>
        <view v-else class="empty">
          <app-icon name="file-text" :size="88" color="#E8E3DB" />
          <text class="empty-txt">暂无文章</text>
        </view>
      </view>

      <!-- 成员 Tab -->
      <view v-else class="member-list">
        <view v-for="m in members" :key="m.id" class="member" @tap="openUser(m.id)">
          <image lazy-load :src="m.avatar" class="member-avatar" mode="aspectFill" />
          <view class="member-main">
            <view class="member-name-row">
              <text class="member-name">{{ m.name }}</text>
              <view v-if="m.role === 'owner'" class="role-badge owner"><app-icon name="crown" :size="20" color="#C9A96E" /><text class="role-txt owner">圈主</text></view>
              <view v-else-if="m.role === 'admin'" class="role-badge admin"><app-icon name="shield" :size="20" color="#D4B87D" /><text class="role-txt admin">管理员</text></view>
            </view>
            <view class="member-meta">
              <text v-if="m.title" class="member-meta-txt">{{ m.title }}</text>
              <text class="member-meta-txt">发帖 {{ m.posts }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- C. 底部操作栏（4 角色态） -->
    <view class="bottombar">
      <!-- 游客/未加入：通栏加入 -->
      <view v-if="!isJoined" class="btn-join" @tap="handleJoin"><text class="btn-join-txt">{{ joinButtonText }}</text></view>
      <!-- 已加入 -->
      <template v-else>
        <view class="btn-post" @tap="openQuickPost">
          <app-icon name="plus" :size="28" color="#ffffff" /><text class="btn-post-txt">发帖</text>
        </view>
        <view v-if="canCreate" class="btn-bar" @tap="openCreate">
          <app-icon name="edit-3" :size="26" color="#6E6E73" /><text class="btn-bar-txt">创作</text>
        </view>
        <view v-if="canManage" class="btn-bar manage" @tap="openManage">
          <text class="btn-bar-txt manage">管理</text>
        </view>
        <view class="btn-more" @tap="openMore"><app-icon name="more-horizontal" :size="34" color="#6E6E73" /></view>
      </template>
    </view>

    <!-- 购买弹窗 -->
    <purchase-sheet
      :open="showPurchase"
      :product="circle ? { id: circle.id, name: circle.name, cover: circle.cover, price: circle.price } : null"
      biz-type="CIRCLE" :allow-qty="false"
      @close="showPurchase = false" @paid="onPurchased"
    />

    <!-- 会员权益弹窗 -->
    <view v-if="showBenefits" class="mask" @tap="showBenefits = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <view class="sheet-icon"><app-icon name="sparkles" :size="44" color="#ffffff" /></view>
          <text class="sheet-title">加入「{{ circle.name }}」</text>
          <text class="sheet-sub">{{ circle.type === 'YEARLY' ? '¥' + formatPrice(circle.price) + '/年' : '¥' + formatPrice(circle.price) }}，解锁以下专属权益</text>
        </view>
        <view class="benefits">
          <view v-for="(b, i) in memberBenefits" :key="i" class="benefit">
            <view class="benefit-icon"><app-icon :name="b.icon" :size="28" color="#C41E3A" /></view>
            <view class="benefit-main">
              <text class="benefit-title">{{ b.title }}</text>
              <text class="benefit-desc">{{ b.desc }}</text>
            </view>
          </view>
        </view>
        <view class="sheet-actions">
          <view class="sheet-btn cancel" @tap="showBenefits = false"><text class="sheet-btn-txt cancel">再想想</text></view>
          <view class="sheet-btn confirm" @tap="confirmJoin"><text class="sheet-btn-txt confirm">立即加入</text></view>
        </view>
      </view>
    </view>
  </view>

  <!-- 骨架屏 -->
  <view v-else-if="isLoading" class="cd-skeleton">
    <view class="sk-header" />
    <view class="sk-card" /><view class="sk-card" />
  </view>

  <!-- 错误态 -->
  <view v-else class="cd-skeleton cd-err">
    <text class="cd-err-txt">{{ error || '加载失败' }}</text>
    <view class="cd-err-retry" @tap="loadData"><text class="cd-err-retry-t">重试</text></view>
  </view>
</template>

<style scoped lang="scss">
.cd-page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 顶部导航 */
.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(20rpx);
}
.nav-back { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; margin-left: -8rpx; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-action { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }

.body { flex: 1; }

/* A. 身份区 */
.header { padding: 8rpx 32rpx 0; }
.identity { background: var(--bg-card, #fff); border-radius: 32rpx; padding: 32rpx; box-shadow: 0 2rpx 4rpx rgba(44, 44, 44, 0.04); }
.identity-top { display: flex; gap: 24rpx; align-items: flex-start; }
.identity-cover { width: 112rpx; height: 112rpx; border-radius: 28rpx; flex-shrink: 0; }
.identity-info { flex: 1; min-width: 0; }
.identity-name { display: block; font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.identity-desc { display: -webkit-box; font-size: 25rpx; color: var(--text-secondary, #6e6e73); margin-top: 6rpx; line-height: 1.5; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.identity-meta { display: flex; align-items: center; gap: 24rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.meta-stat { font-size: 24rpx; color: var(--text-tertiary, #999); }
.meta-num { font-size: 26rpx; color: var(--text-primary, #2c2c2c); font-weight: 600; margin-right: 4rpx; }
.meta-owner { display: flex; align-items: center; gap: 10rpx; margin-left: auto; }
.meta-owner-avatar { width: 40rpx; height: 40rpx; border-radius: 999rpx; box-shadow: 0 0 0 2rpx var(--gold, #c9a96e); }
.meta-owner-txt { font-size: 24rpx; color: var(--gold, #c9a96e); }

/* 公告 */
.announce { display: flex; align-items: center; gap: 16rpx; margin-top: 20rpx; padding: 20rpx 24rpx; background: var(--bg-warm, #f8f4ec); border-radius: 28rpx; }
.announce-tag { flex-shrink: 0; font-size: 22rpx; color: var(--brand, #c41e3a); font-weight: 600; }
.announce-text { flex: 1; font-size: 25rpx; color: var(--text-secondary, #6e6e73); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.announce-text.open { white-space: normal; }
.announce-more { display: flex; align-items: center; gap: 4rpx; margin-top: 12rpx; padding-left: 24rpx; }
.announce-more-txt { font-size: 24rpx; color: var(--brand, #c41e3a); }

/* AI 助理入口·金色描边 */
.ai-entry {
  display: flex; align-items: center; gap: 20rpx; margin-top: 20rpx; padding: 22rpx 24rpx;
  border-radius: 28rpx; background: var(--bg-card, #fff);
  border: 1rpx solid rgba(201, 169, 110, 0.5);
}
.consult-entry { margin-top: 16rpx; }
.ai-entry:active { opacity: 0.9; }
.ai-orb { width: 60rpx; height: 60rpx; border-radius: 999rpx; flex-shrink: 0; background: var(--gold-soft, rgba(201, 169, 110, 0.14)); display: flex; align-items: center; justify-content: center; }
.ai-text { flex: 1; min-width: 0; }
.ai-title { display: block; font-size: 27rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ai-sub { display: block; font-size: 23rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-go { flex-shrink: 0; font-size: 24rpx; color: var(--gold, #c9a96e); font-weight: 500; }

/* 增值内容带 */
.value-strip { width: 100%; white-space: nowrap; margin-top: 24rpx; }
.value-row { display: inline-flex; gap: 20rpx; padding: 0 32rpx; }
.live-card { flex-shrink: 0; width: 400rpx; display: inline-flex; gap: 20rpx; align-items: center; background: var(--bg-card, #fff); border-radius: 28rpx; padding: 20rpx; box-shadow: 0 2rpx 4rpx rgba(44, 44, 44, 0.04); }
.live-thumb { width: 128rpx; height: 96rpx; border-radius: 16rpx; flex-shrink: 0; }
.live-info { min-width: 0; flex: 1; }
.live-badge { display: flex; align-items: center; gap: 8rpx; }
.live-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.live-badge-txt { font-size: 21rpx; color: var(--brand, #c41e3a); font-weight: 600; }
.live-name { display: block; font-size: 25rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-count { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.mini-entry { flex-shrink: 0; width: 256rpx; background: var(--bg-card, #fff); border-radius: 28rpx; padding: 20rpx 24rpx; box-shadow: 0 2rpx 4rpx rgba(44, 44, 44, 0.04); }
.mini-head { display: flex; align-items: center; justify-content: space-between; }
.mini-title { font-size: 25rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.mini-sub { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.mini-thumbs { display: flex; gap: 8rpx; margin-top: 16rpx; }
.mini-thumb { width: 60rpx; height: 60rpx; border-radius: 12rpx; }

/* B. Tab */
.tabs {
  position: sticky; top: 88rpx; z-index: 19;
  display: flex; align-items: center; gap: 48rpx; padding: 0 40rpx; height: 88rpx; margin-top: 12rpx;
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.tab { position: relative; height: 100%; display: flex; align-items: center; }
.tab-txt { font-size: 30rpx; color: var(--text-secondary, #6e6e73); }
.tab-txt.on { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.tab-line { position: absolute; left: 50%; bottom: 12rpx; transform: translateX(-50%); width: 36rpx; height: 6rpx; border-radius: 3rpx; background: var(--brand, #c41e3a); }
.tab-search { margin-left: auto; display: flex; align-items: center; }

/* 动态流 */
.feed { padding: 24rpx 32rpx 0; display: flex; flex-direction: column; gap: 24rpx; }
.feed-end { text-align: center; padding: 36rpx 0 12rpx; }
.feed-end-txt { font-size: 24rpx; color: var(--text-tertiary, #999); }

/* 内联卡片（课程/文章） */
.inline-card { background: var(--bg-card, #fff); border-radius: 32rpx; padding: 28rpx 32rpx; box-shadow: 0 2rpx 4rpx rgba(44, 44, 44, 0.04); }
.course-card { display: flex; gap: 24rpx; }
.course-cover { width: 232rpx; height: 148rpx; border-radius: 20rpx; flex-shrink: 0; }
.course-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.course-kind { font-size: 22rpx; color: var(--text-tertiary, #999); letter-spacing: 2rpx; }
.course-title { font-size: 29rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); margin-top: 6rpx; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.course-meta { display: flex; align-items: center; gap: 16rpx; margin-top: auto; padding-top: 12rpx; }
.course-price { font-size: 26rpx; font-weight: 600; color: var(--gold, #c9a96e); }
.course-teacher { font-size: 23rpx; color: var(--text-tertiary, #999); }
.article-card { display: flex; gap: 24rpx; align-items: stretch; }
.article-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.article-kind { font-size: 22rpx; color: var(--text-tertiary, #999); letter-spacing: 2rpx; }
.article-title { font-size: 30rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); margin-top: 8rpx; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.article-byline { margin-top: auto; padding-top: 12rpx; font-size: 22rpx; color: var(--text-tertiary, #999); }
.article-cover { width: 176rpx; height: 176rpx; border-radius: 20rpx; flex-shrink: 0; align-self: center; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 120rpx 0; }
.empty-txt { font-size: 27rpx; color: var(--text-tertiary, #999); }

/* 成员 */
.member-list { padding: 24rpx 32rpx 0; display: flex; flex-direction: column; gap: 8rpx; }
.member { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; background: var(--bg-card, #fff); border-radius: 24rpx; }
.member:active { background: var(--bg-warm, #f8f4ec); }
.member-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; flex-shrink: 0; }
.member-main { flex: 1; min-width: 0; }
.member-name-row { display: flex; align-items: center; gap: 12rpx; }
.member-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.role-badge { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: var(--gold-soft, rgba(201, 169, 110, 0.14)); }
.role-txt { font-size: 20rpx; }
.role-txt.owner { color: var(--gold, #c9a96e); }
.role-txt.admin { color: var(--gold-2, #d4b87d); }
.member-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.member-meta-txt { font-size: 23rpx; color: var(--text-tertiary, #999); }

.bottom-spacer { height: 180rpx; }

/* C. 底部操作栏 */
.bottombar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  display: flex; align-items: center; gap: 20rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.btn-join { flex: 1; height: 88rpx; border-radius: 44rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.btn-join-txt { font-size: 30rpx; color: #fff; font-weight: 600; }
.btn-post { flex: 1; height: 84rpx; border-radius: 42rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.btn-post-txt { font-size: 29rpx; color: #fff; font-weight: 600; }
.btn-bar { height: 84rpx; padding: 0 30rpx; border-radius: 42rpx; background: var(--bg-page, #faf8f5); box-shadow: inset 0 0 0 1rpx var(--separator, #ede7dd); display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.btn-bar-txt { font-size: 27rpx; color: var(--text-secondary, #6e6e73); }
.btn-bar.manage { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); box-shadow: none; }
.btn-bar-txt.manage { color: var(--brand, #c41e3a); font-weight: 600; }
.btn-more { width: 84rpx; height: 84rpx; border-radius: 999rpx; background: var(--bg-page, #faf8f5); box-shadow: inset 0 0 0 1rpx var(--separator, #ede7dd); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* 弹窗 */
.mask { position: fixed; inset: 0; z-index: 100; background: rgba(0, 0, 0, 0.5); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: var(--bg-card, #fff); border-radius: 40rpx 40rpx 0 0; padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom)); }
.sheet-head { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.sheet-icon { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: linear-gradient(135deg, var(--brand, #c41e3a), #a01530); display: flex; align-items: center; justify-content: center; }
.sheet-title { font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); margin-top: 8rpx; }
.sheet-sub { font-size: 24rpx; color: var(--text-secondary, #6e6e73); text-align: center; }
.benefits { display: flex; flex-direction: column; gap: 20rpx; margin: 32rpx 0; }
.benefit { display: flex; align-items: center; gap: 20rpx; }
.benefit-icon { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: var(--brand-soft, rgba(196, 30, 58, 0.08)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.benefit-title { display: block; font-size: 27rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.benefit-desc { display: block; font-size: 23rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.sheet-actions { display: flex; gap: 20rpx; }
.sheet-btn { flex: 1; height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center; }
.sheet-btn.cancel { background: var(--bg-page, #faf8f5); }
.sheet-btn.confirm { background: var(--brand, #c41e3a); }
.sheet-btn-txt { font-size: 29rpx; font-weight: 600; }
.sheet-btn-txt.cancel { color: var(--text-secondary, #6e6e73); }
.sheet-btn-txt.confirm { color: #fff; }

/* 骨架/错误 */
.cd-skeleton { min-height: 100vh; background: var(--bg-page, #faf8f5); padding: 120rpx 32rpx; }
.sk-header { height: 200rpx; background: #f2efea; border-radius: 32rpx; margin-bottom: 24rpx; }
.sk-card { height: 180rpx; background: #f2efea; border-radius: 32rpx; margin-bottom: 24rpx; }
.cd-err { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.cd-err-txt { font-size: 28rpx; color: var(--text-tertiary, #999); }
.cd-err-retry { padding: 20rpx 64rpx; background: var(--brand, #c41e3a); border-radius: 24rpx; }
.cd-err-retry-t { font-size: 28rpx; color: #fff; }
</style>
