<script setup lang="ts">
/**
 * 圈子详情页（从原型 app/circles/[id]/page.tsx 843 行高保真迁移）
 * 封面+导航 / 信息卡 / 公告 / 6Tab(首页/帖子/文章/精华/专栏/成员) / 底部操作栏 / 会员权益弹窗
 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useShare } from '@/composables/useShare'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import PostCard from '@/components/circle/post-card.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import { getToken } from '@/utils/storage'
import PurchaseSheet from '@/components/common/purchase-sheet.vue'
import {
  circleDetailApi, memberBenefits,
  type CircleDetail, type CirclePost, type CircleMember, type CircleColumn, type CircleArticle, type CircleActivity, type CircleCourse, type CircleLive, type CircleProduct,
} from '@/lib/circle-detail-data'
import { recommendApi } from '@/lib/recommend-data'
import type { RecommendItem } from '@/components/common/recommend-section.vue'
import { track } from '@/composables/useTrack'
import { formatPrice } from '@/utils/format'

const circleId = ref('1')
const circle = ref<CircleDetail | null>(null)
const posts = ref<CirclePost[]>([])
const members = ref<CircleMember[]>([])
const columns = ref<CircleColumn[]>([])
const circleArticles = ref<CircleArticle[]>([])
const activities = ref<CircleActivity[]>([])
const courses = ref<CircleCourse[]>([])
const lives = ref<CircleLive[]>([])
const circleProducts = ref<CircleProduct[]>([])
const isLoading = ref(true)
const error = ref('')
const activeTab = ref<'home' | 'posts' | 'essence' | 'members'>('home')
const showAnnouncement = ref(true)
const isJoined = ref(false)
const applied = ref(false) // 需审批圈：本次会话已提交申请，按钮转「审核中」
// 角色权限：按当前用户在该圈的真实角色判断
const isOwner = computed(() => circle.value?.myRole === 'OWNER')
// 可创作(文章/课程/直播)：圈主/合伙人/管理员。普通成员只发帖(最短路径)，创作入口按权限显示。
const canCreate = computed(() => ['OWNER', 'PARTNER', 'ADMIN'].includes(circle.value?.myRole || ''))
// 可管理(进圈主管理台)：圈主/管理员
const canManage = computed(() => ['OWNER', 'ADMIN'].includes(circle.value?.myRole || ''))
const isLoggedIn = () => !!getToken()
const likedPosts = ref<Set<string>>(new Set())
const showBenefits = ref(false)
const showPurchase = ref(false)
const recItems = ref<RecommendItem[]>([])

/** 底部加入按钮文案：按圈子类型/价格/加入态展示真实信息 */
const joinButtonText = computed(() => {
  const c = circle.value
  if (!c) return '加入圈子'
  if (isJoined.value) return '已加入'
  if (applied.value) return '审核中 · 查看进度'
  if (c.type === 'FREE') return c.needApproval ? '申请加入' : '免费加入'
  if (c.type === 'YEARLY') return `¥${c.price}/年 加入`
  return `¥${c.price} 加入圈子`
})

// Tab 收敛：只保留有真实数据源的（文章/专栏后端未接入·空壳先删，接真数据后再恢复）
const tabs = [
  { id: 'home', label: '首页' },
  { id: 'posts', label: '帖子' },
  { id: 'essence', label: '精华' },
  { id: 'members', label: '成员' },
] as const

const pinnedPosts = computed(() => posts.value.filter(p => p.isPinned))
const essencePosts = computed(() => posts.value.filter(p => p.isEssence))

onLoad((q) => {
  if (q?.id) circleId.value = q.id
  loadData()
})

// 微信原生分享（好友 / 朋友圈）
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
    const [c, p, m, cols, arts, acts, crs, lvs, prds] = await Promise.all([
      circleDetailApi.detail(circleId.value),
      circleDetailApi.posts(circleId.value),
      circleDetailApi.listMembers(circleId.value),
      circleDetailApi.columns(circleId.value),
      circleDetailApi.articles(circleId.value),
      circleDetailApi.activities(circleId.value),
      circleDetailApi.courses(circleId.value),
      circleDetailApi.lives(circleId.value),
      circleDetailApi.products(circleId.value),
    ])
    circle.value = c
    posts.value = p.data
    members.value = m.data
    columns.value = cols
    circleArticles.value = arts
    activities.value = acts
    courses.value = crs
    lives.value = lvs
    circleProducts.value = prds
    isJoined.value = c.isJoined
    // 详情端点无鉴权守卫→membership 恒空(isJoined/myRole 恒 false)，登录态下用鉴权的 join/status 覆盖权威加入态
    if (isLoggedIn()) {
      const st = await circleDetailApi.getJoinStatus(circleId.value)
      isJoined.value = st.joined
      if (circle.value) circle.value.myRole = st.role
    }
    likedPosts.value = new Set(p.data.filter(x => x.isLiked).map(x => x.id))
    // 相关圈子推荐（getForScene 已内置降级，无需 try/catch）
    recItems.value = await recommendApi.getForScene('guess_like', String(circleId.value))
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

function handleJoin() {
  // 已提交申请：点击进「我的入圈申请」查看审核进度
  if (applied.value) {
    navigateTo('/pkg-circle/circles/my-join-requests')
    return
  }
  if (isJoined.value) {
    const c = circle.value
    if (c && c.type !== 'FREE') {
      // 付费圈退出 → 退款引导流程（引导页强调虚拟产品不退款，引导继续使用 / 申诉退款）
      navigateTo(`/pkg-circle/circles/exit?id=${circleId.value}`)
    } else {
      // 免费圈退出 → 二次确认后直接退出
      uni.showModal({
        title: '退出圈子',
        content: '确定退出该圈子吗？退出后将失去成员身份。',
        confirmColor: '#C41E3A',
        success: (r) => {
          if (!r.confirm) return
          isJoined.value = false
          circleDetailApi.leave(circleId.value).catch(() => { isJoined.value = true; uni.showToast({ title: '退出失败', icon: 'none' }) })
        },
      })
    }
    return
  }
  if (!isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => navigateTo('/pkg-auth/login/index'), 600)
    return
  }
  const c = circle.value
  if (!c) return
  if (c.type === 'FREE') {
    doJoin() // 免费圈直接加入
  } else {
    showBenefits.value = true // 付费圈先展示权益，确认后走购买
  }
}
const joining = ref(false)
/** 免费圈加入：需审批圈→提交申请等审核（不直接进）；普通免费圈→乐观更新+失败回滚 */
async function doJoin() {
  const c = circle.value
  if (!c || joining.value) return
  // 需审批的免费圈：提交申请，不直接成为成员
  if (c.needApproval) {
    joining.value = true
    try {
      const r = await circleDetailApi.join(circleId.value)
      applied.value = true
      uni.showToast({ title: r?.message || '申请已提交，等待圈主审核', icon: 'none' })
    } catch {
      uni.showToast({ title: '申请提交失败，请重试', icon: 'none' })
    } finally {
      joining.value = false
    }
    return
  }
  // 普通免费圈：乐观加入
  isJoined.value = true
  circleDetailApi.join(circleId.value).catch(() => {
    isJoined.value = false
    uni.showToast({ title: '加入失败，请重试', icon: 'none' })
  })
}
function confirmJoin() {
  showBenefits.value = false
  showPurchase.value = true // 打开购买弹窗（现金支付，统一下单 POST /shop/orders type=CIRCLE）
}
/** 购买/下单完成 → 以后端真实入圈态为准（付费圈成员由支付回调创建，不做乐观置真，避免"显示已加入但重进仍要支付"的不一致） */
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
  posts.value = posts.value.map(p => p.id === postId ? { ...p, likes: p.likes + (wasLiked ? -1 : 1) } : p)
}

function fmt(n: number) { return n.toLocaleString() }
function openShare() { navigateTo(`/pkg-circle/common/share-poster?type=circle&targetId=${circleId.value}`) }
function openPost(id: string) { navigateTo(`/pkg-circle/circles/post?circleId=${circleId.value}&id=${id}`) }
// 发帖=人人最短路径：直接进发帖编辑器(默认发帖·文本/图片/视频)
function openQuickPost() { navigateTo(`/pkg-circle/circles/editor?circleId=${circleId.value}`) }
// 创作=有权限者专属：文章/课程/直播 菜单
function openCreate() { navigateTo(`/pkg-circle/circles/publish?circleId=${circleId.value}`) }
// 更多操作(退出/圈主管理)：从这里进，不占底部主操作位
function openMore() {
  const items: { label: string; act: () => void }[] = []
  if (canManage.value) items.push({ label: '圈主管理', act: () => navigateTo(`/pkg-circle/circles/manage?id=${circleId.value}`) })
  items.push({ label: '分享圈子', act: openShare })
  if (isJoined.value && !isOwner.value) items.push({ label: '退出圈子', act: doLeave })
  uni.showActionSheet({
    itemList: items.map((i) => i.label),
    success: (r) => items[r.tapIndex]?.act(),
  })
}
function doLeave() {
  const c = circle.value
  if (c && c.type !== 'FREE') {
    // 付费圈退出 → 退款引导流程
    navigateTo(`/pkg-circle/circles/exit?id=${circleId.value}`)
  } else {
    // 免费圈退出 → 二次确认后直接退出
    uni.showModal({
      title: '退出圈子',
      content: '确定退出该圈子吗？退出后将失去成员身份。',
      confirmColor: '#C41E3A',
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
function openRecommendEbook() { navigateTo(`/pkg-circle/circles/recommend-ebook?id=${circleId.value}`) }
function openAssistant() { navigateTo(`/pkg-circle/circles/assistant?circleId=${circleId.value}&name=${encodeURIComponent(circle.value?.name || '')}`) }
</script>

<template>
  <customer-service-fab />
  <view class="cd" v-if="!isLoading && !error && circle">
    <!-- 顶部封面 -->
    <view class="cd-cover">
      <smart-cover :src="circle.cover" :title="circle.name" type="circle" class="cd-cover-img" />
      <view class="cd-cover-mask" />
      <view class="cd-nav">
        <view class="cd-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#ffffff" /></view>
        <view class="cd-nav-right">
          <!-- 死入口大扫除：铃铛 → 圈子公告页（真实已注册页，复用 openAnnouncement） -->
          <view class="cd-nav-btn" @tap="openAnnouncement"><app-icon name="bell" :size="40" color="#ffffff" /></view>
          <view class="cd-nav-btn" @tap="openShare"><app-icon name="share-2" :size="40" color="#ffffff" /></view>
        </view>
      </view>
      <view class="cd-level"><app-icon name="star" :size="26" color="#ffffff" :fill="true" /><text class="cd-level-txt">优质圈子</text></view>
    </view>

    <!-- 圈子信息卡 -->
    <view class="cd-info-wrap">
      <view class="cd-info">
        <view class="cd-info-top">
          <view class="cd-avatar"><image lazy-load :src="circle.owner.avatar" class="cd-avatar-img" mode="aspectFill" /></view>
          <view class="cd-info-main">
            <view class="cd-name-row">
              <text class="cd-name">{{ circle.name }}</text>
              <text v-if="circle.type !== 'FREE'" class="cd-paid">{{ circle.type === 'YEARLY' ? '年费' : '付费' }}</text>
            </view>
            <view class="cd-stats">
              <view class="cd-stat"><app-icon name="users" :size="26" color="#999999" /><text class="cd-stat-txt">{{ fmt(circle.members) }} 成员</text></view>
              <view class="cd-stat"><app-icon name="file-text" :size="26" color="#999999" /><text class="cd-stat-txt">{{ fmt(circle.posts) }} 帖子</text></view>
              <view v-if="circle.todayActive" class="cd-stat"><app-icon name="flame" :size="26" color="#f97316" /><text class="cd-stat-txt">今日{{ circle.todayActive }}</text></view>
            </view>
          </view>
        </view>
        <text class="cd-desc">{{ circle.description }}</text>
        <view v-if="circle.tags && circle.tags.length" class="cd-tags">
          <text v-for="tag in circle.tags" :key="tag" class="cd-tag">#{{ tag }}</text>
        </view>
        <view class="cd-owner" @tap="openUser(circle.owner.id)">
          <image lazy-load :src="circle.owner.avatar" class="cd-owner-avatar" mode="aspectFill" />
          <view class="cd-owner-info">
            <view class="cd-owner-name-row">
              <text class="cd-owner-name">{{ circle.owner.name }}</text>
              <app-icon name="crown" :size="26" color="#C9A96E" />
            </view>
            <text class="cd-owner-role">圈主</text>
          </view>
          <app-icon name="chevron-right" :size="28" color="#cccccc" />
        </view>
      </view>
    </view>

    <!-- 公告栏 -->
    <view v-if="circle.announcement" class="cd-ann">
      <view class="cd-ann-box">
        <view class="cd-ann-head" @tap="showAnnouncement = !showAnnouncement">
          <view class="cd-ann-title">
            <view class="cd-ann-icon"><app-icon name="bell" :size="20" color="#ffffff" /></view>
            <text class="cd-ann-label">圈子公告</text>
          </view>
          <app-icon :name="showAnnouncement ? 'chevron-up' : 'chevron-down'" :size="28" color="#999999" />
        </view>
        <view v-if="showAnnouncement" class="cd-ann-body">
          <text class="cd-ann-text">{{ circle.announcement }}</text>
          <view class="cd-ann-more" @tap="openAnnouncement">
            <text class="cd-ann-more-t">查看完整公告</text>
            <app-icon name="chevron-right" :size="24" color="#C41E3A" />
          </view>
        </view>
      </view>
    </view>

    <!-- 圈主助理入口 -->
    <view class="cd-assistant" @tap="openAssistant">
      <view class="cd-assistant-icon"><app-icon name="sparkles" :size="32" color="#ffffff" /></view>
      <view class="cd-assistant-main">
        <text class="cd-assistant-title">圈主助理</text>
        <text class="cd-assistant-sub">圈子专属 AI 助手，有问题随时问</text>
      </view>
      <app-icon name="chevron-right" :size="28" color="#C9A96E" />
    </view>

    <!-- Tab 切换 -->
    <view class="cd-tabs">
      <scroll-view scroll-x class="cd-tabs-scroll">
        <view class="cd-tabs-row">
          <view v-for="tab in tabs" :key="tab.id" class="cd-tab" @tap="activeTab = tab.id">
            <text class="cd-tab-txt" :class="{ on: activeTab === tab.id }">{{ tab.label }}<text v-if="tab.id === 'members'">({{ circle.members }})</text></text>
            <view v-if="activeTab === tab.id" class="cd-tab-line" />
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区 -->
    <view class="cd-content">
      <!-- 首页 Tab -->
      <view v-if="activeTab === 'home'" class="cd-home">
        <!-- 近期活动 -->
        <view v-if="activities.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title"><app-icon name="zap" :size="28" color="#FF6B35" /><text class="cd-sec-label">近期活动</text></view>
            <!-- 死入口大扫除：全部/条目 → 活动广场页（真实已注册页，聚合圈子活动） -->
            <view class="cd-sec-more" @tap="navigateTo('/pkg-circle/circles/activities')"><text class="cd-more-txt">全部</text><app-icon name="chevron-right" :size="26" color="#999999" /></view>
          </view>
          <view class="cd-acts">
            <view v-for="act in activities.slice(0, 2)" :key="act.id" class="cd-act" @tap="navigateTo('/pkg-circle/circles/activities')">
              <view class="cd-act-icon" :class="act.type">
                <app-icon :name="act.type === 'live' ? 'play' : act.type === 'checkin' ? 'check-circle' : 'book-open'" :size="32" :color="act.type === 'live' ? '#ef4444' : act.type === 'checkin' ? '#22c55e' : '#f97316'" />
              </view>
              <view class="cd-act-main">
                <text class="cd-act-title">{{ act.title }}</text>
                <view class="cd-act-meta"><text class="cd-act-time">{{ act.time }}</text><text v-if="act.participants" class="cd-act-time">{{ act.participants }}人参与</text></view>
              </view>
              <view v-if="act.status === 'upcoming'" class="cd-act-btn red"><text class="cd-act-btn-txt">预约</text></view>
              <view v-else class="cd-act-btn green"><text class="cd-act-btn-txt">参与</text></view>
            </view>
          </view>
        </view>

        <!-- 置顶内容 -->
        <view v-if="pinnedPosts.length" class="cd-sec">
          <view class="cd-sec-title mb"><app-icon name="pin" :size="28" color="#C41E3A" /><text class="cd-sec-label">置顶内容</text></view>
          <view class="cd-pinned-list">
            <view v-for="post in pinnedPosts" :key="post.id" class="cd-pinned" @tap="openPost(post.id)">
              <image lazy-load :src="post.author.avatar" class="cd-pinned-avatar" mode="aspectFill" />
              <view class="cd-pinned-main">
                <view class="cd-pinned-tags">
                  <app-icon name="pin" :size="24" color="#C41E3A" /><text class="cd-pinned-pin">置顶</text>
                  <text v-if="post.isEssence" class="pc-essence">精华</text>
                </view>
                <text class="cd-pinned-content">{{ post.content }}</text>
                <view class="cd-pinned-meta">
                  <text class="cd-pinned-meta-txt">{{ post.author.name }}</text>
                  <view class="cd-pinned-stat"><app-icon name="heart" :size="22" color="#999999" /><text class="cd-pinned-meta-txt">{{ post.likes }}</text></view>
                  <view class="cd-pinned-stat"><app-icon name="message-circle" :size="22" color="#999999" /><text class="cd-pinned-meta-txt">{{ post.comments }}</text></view>
                </view>
              </view>
              <image lazy-load v-if="post.images && post.images.length" :src="post.images[0]" class="cd-pinned-img" mode="aspectFill" />
            </view>
          </view>
        </view>

        <!-- 圈内课程（真连 /courses?circleId=·圈子变现展示） -->
        <view v-if="courses.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title"><app-icon name="graduation-cap" :size="28" color="#4A90D9" /><text class="cd-sec-label">圈内课程</text></view>
          </view>
          <scroll-view scroll-x class="cd-cols-scroll">
            <view class="cd-cols-row">
              <view v-for="crs in courses" :key="crs.id" class="cd-col" @tap="navigateTo(`/courses/${crs.id}`)">
                <view class="cd-col-cover">
                  <image lazy-load :src="crs.cover" class="cd-col-img" mode="aspectFill" />
                </view>
                <view class="cd-col-body">
                  <text class="cd-col-title">{{ crs.title }}</text>
                  <text class="cd-col-meta">{{ crs.teacher }}<text v-if="crs.price > 0" class="cd-col-price"> · ¥{{ formatPrice(crs.price) }}</text><text v-else class="cd-col-price"> · 免费</text></text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 圈内直播（真连 /live/rooms?circleId=·往期/进行/预告） -->
        <view v-if="lives.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title"><app-icon name="radio" :size="28" color="#C41E3A" /><text class="cd-sec-label">圈内直播</text></view>
          </view>
          <scroll-view scroll-x class="cd-cols-scroll">
            <view class="cd-cols-row">
              <view v-for="lv in lives" :key="lv.id" class="cd-col" @tap="navigateTo(`/live/${lv.id}`)">
                <view class="cd-col-cover">
                  <image lazy-load :src="lv.cover" class="cd-col-img" mode="aspectFill" />
                  <text class="cd-live-badge" :class="lv.status">{{ lv.status === 'live' ? '直播中' : lv.status === 'upcoming' ? '预告' : '回放' }}</text>
                </view>
                <view class="cd-col-body">
                  <text class="cd-col-title">{{ lv.title }}</text>
                  <text class="cd-col-meta">{{ lv.hostName }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 圈内好物（真连 /shop/products?circleId=·圈主选品） -->
        <view v-if="circleProducts.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title"><app-icon name="shopping-bag" :size="28" color="#FA8C16" /><text class="cd-sec-label">圈内好物</text></view>
          </view>
          <scroll-view scroll-x class="cd-cols-scroll">
            <view class="cd-cols-row">
              <view v-for="pr in circleProducts" :key="pr.id" class="cd-col" @tap="navigateTo(`/mall/product/${pr.id}`)">
                <view class="cd-col-cover">
                  <image lazy-load :src="pr.cover" class="cd-col-img" mode="aspectFill" />
                </view>
                <view class="cd-col-body">
                  <text class="cd-col-title">{{ pr.title }}</text>
                  <text class="cd-col-meta"><text class="cd-col-price">¥{{ formatPrice(pr.price) }}</text></text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 专栏推荐 -->
        <view v-if="columns.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title"><app-icon name="book-open" :size="28" color="#C9A96E" /><text class="cd-sec-label">专栏推荐</text></view>
            <view class="cd-sec-more" @tap="toastComingSoon"><text class="cd-more-txt">全部</text><app-icon name="chevron-right" :size="26" color="#999999" /></view>
          </view>
          <scroll-view scroll-x class="cd-cols-scroll">
            <view class="cd-cols-row">
              <view v-for="col in columns" :key="col.id" class="cd-col" @tap="toastComingSoon">
                <view class="cd-col-cover">
                  <image lazy-load :src="col.cover" class="cd-col-img" mode="aspectFill" />
                  <view v-if="col.isPremium" class="cd-col-lock"><app-icon name="lock" :size="20" color="#ffffff" /></view>
                </view>
                <view class="cd-col-body">
                  <text class="cd-col-title">{{ col.title }}</text>
                  <text class="cd-col-meta">{{ col.articles }}篇 · {{ col.views }}阅读</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 圈主推荐电子书（仅圈主可见管理入口；无数据时隐藏，不展示空壳） -->
        <view v-if="isOwner && circleArticles.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title">
              <app-icon name="book-open" :size="28" color="#2563eb" />
              <text class="cd-sec-label">推荐电子书</text>
              <text class="cd-ebook-hint">（仅圈主可见管理入口）</text>
            </view>
            <view class="cd-sec-more" @tap="openRecommendEbook">
              <text class="cd-ebook-manage">管理</text>
              <app-icon name="chevron-right" :size="26" color="#2563eb" />
            </view>
          </view>
          <scroll-view scroll-x class="cd-ebook-scroll">
            <view class="cd-ebook-row">
              <view v-for="a in circleArticles.slice(0, 3)" :key="a.id" class="cd-ebook" @tap="openRecommendEbook">
                <view class="cd-ebook-cover"><app-icon name="book-open" :size="48" color="rgba(255,255,255,0.4)" /></view>
                <text class="cd-ebook-title">{{ a.title }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 最新动态 -->
        <view class="cd-sec">
          <text class="cd-sec-label mb">最新动态</text>
          <view class="cd-post-list">
            <post-card v-for="post in posts.slice(0, 3)" :key="post.id" :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)" @like="handleLikePost" />
          </view>
        </view>
      </view>

      <!-- 帖子 Tab -->
      <view v-else-if="activeTab === 'posts'" class="cd-post-list">
        <post-card v-for="post in posts" :key="post.id" :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)" @like="handleLikePost" />
      </view>

      <!-- 精华 Tab -->
      <view v-else-if="activeTab === 'essence'" class="cd-post-list">
        <template v-if="essencePosts.length">
          <post-card v-for="post in essencePosts" :key="post.id" :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)" :show-essence="true" @like="handleLikePost" />
        </template>
        <view v-else class="cd-empty">
          <app-icon name="star" :size="96" color="#E8E3DB" />
          <text class="cd-empty-txt">暂无精华内容</text>
        </view>
      </view>

      <!-- 成员 Tab -->
      <view v-else-if="activeTab === 'members'" class="cd-member-list">
        <view v-for="m in members" :key="m.id" class="cd-member" @tap="openUser(m.id)">
          <image lazy-load :src="m.avatar" class="cd-member-avatar" mode="aspectFill" />
          <view class="cd-member-main">
            <view class="cd-member-name-row">
              <text class="cd-member-name">{{ m.name }}</text>
              <view v-if="m.role === 'owner'" class="cd-role owner"><app-icon name="crown" :size="22" color="#C9A96E" /><text class="cd-role-txt owner">圈主</text></view>
              <view v-else-if="m.role === 'admin'" class="cd-role admin"><app-icon name="shield" :size="22" color="#4A90D9" /><text class="cd-role-txt admin">管理员</text></view>
            </view>
            <view class="cd-member-meta">
              <text v-if="m.title" class="cd-member-meta-txt">{{ m.title }}</text>
              <text class="cd-member-meta-txt">发帖 {{ m.posts }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 相关圈子推荐 -->
    <recommend-section title="相关圈子" :items="recItems" />

    <!-- 底部操作栏：未加入=加入/购买；已加入=发帖(人人最短路径)，创作(仅管理员)，更多(退出/管理) -->
    <view class="cd-foot">
      <!-- 未加入 -->
      <view v-if="!isJoined" class="cd-join" @tap="handleJoin">
        <text class="cd-join-txt">{{ joinButtonText }}</text>
      </view>
      <!-- 已加入 -->
      <template v-else>
        <view class="cd-foot-more" @tap="openMore">
          <app-icon name="more-horizontal" :size="36" color="#666666" />
        </view>
        <view v-if="canCreate" class="cd-create-btn" @tap="openCreate">
          <app-icon name="edit-3" :size="26" color="var(--brand, #C41E3A)" /><text class="cd-create-txt">创作</text>
        </view>
        <view class="cd-post-btn" @tap="openQuickPost">
          <app-icon name="plus" :size="28" color="#ffffff" /><text class="cd-post-btn-txt">发帖</text>
        </view>
      </template>
    </view>

    <!-- 购买弹窗（圈子付费入圈，统一下单 type=CIRCLE） -->
    <purchase-sheet
      :open="showPurchase"
      :product="circle ? { id: circle.id, name: circle.name, cover: circle.cover, price: circle.price } : null"
      biz-type="CIRCLE"
      :allow-qty="false"
      @close="showPurchase = false"
      @paid="onPurchased"
    />

    <!-- 会员权益弹窗 -->
    <view v-if="showBenefits" class="cd-mask" @tap="showBenefits = false">
      <view class="cd-sheet" @tap.stop>
        <view class="cd-sheet-body">
          <view class="cd-sheet-head">
            <view class="cd-sheet-icon"><app-icon name="sparkles" :size="44" color="#ffffff" /></view>
            <text class="cd-sheet-title">加入「{{ circle.name }}」</text>
            <text class="cd-sheet-sub">{{ circle.type === 'YEARLY' ? '¥' + formatPrice(circle.price) + '/年' : '¥' + formatPrice(circle.price) }}，解锁以下专属权益</text>
          </view>
          <view class="cd-benefits">
            <view v-for="(b, i) in memberBenefits" :key="i" class="cd-benefit">
              <view class="cd-benefit-icon"><app-icon :name="b.icon" :size="28" color="#C41E3A" /></view>
              <view class="cd-benefit-main">
                <text class="cd-benefit-title">{{ b.title }}</text>
                <text class="cd-benefit-desc">{{ b.desc }}</text>
              </view>
            </view>
          </view>
          <view class="cd-sheet-actions">
            <view class="cd-sheet-btn cancel" @tap="showBenefits = false"><text class="cd-sheet-btn-txt cancel">再想想</text></view>
            <view class="cd-sheet-btn confirm" @tap="confirmJoin"><text class="cd-sheet-btn-txt confirm">立即加入</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 骨架屏 -->
  <view v-else-if="isLoading" class="cd-skeleton">
    <view class="sk-cover" />
    <view class="sk-info"><view class="sk-card" /></view>
  </view>

  <!-- 错误态 -->
  <view v-else-if="error" class="cd-skeleton cd-err">
    <text class="cd-err-txt">{{ error }}</text>
    <view class="cd-err-retry" @tap="loadData"><text class="cd-err-retry-t">重试</text></view>
  </view>

  <!-- 兜底骨架 -->
  <view v-else class="cd-skeleton">
    <view class="sk-cover" />
    <view class="sk-info"><view class="sk-card" /></view>
  </view>
</template>

<style scoped lang="scss">
.cd { min-height: 100vh; background: var(--bg-paper, #FAF8F5); padding-bottom: 180rpx; }
/* 封面 */
.cd-cover { position: relative; height: 384rpx; }
.cd-cover-img { width: 100%; height: 100%; }
.cd-cover-mask { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); }
.cd-nav { position: absolute; top: 0; left: 0; right: 0; padding: 32rpx; padding-top: calc(32rpx + var(--status-bar-height, 0px)); display: flex; align-items: center; justify-content: space-between; }
.cd-nav-right { display: flex; gap: 16rpx; }
.cd-nav-btn { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.cd-level { position: absolute; bottom: 24rpx; right: 24rpx; padding: 8rpx 20rpx; background: linear-gradient(to right, #C9A96E, #E8D5B5); border-radius: 999rpx; display: flex; align-items: center; gap: 8rpx; }
.cd-level-txt { font-size: 22rpx; color: #fff; font-weight: 500; }
/* 信息卡 */
.cd-info-wrap { padding: 0 32rpx; margin-top: -96rpx; position: relative; z-index: 10; }
.cd-info { background: var(--card, #fff); border-radius: 32rpx; padding: 32rpx; box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.08); }
.cd-info-top { display: flex; align-items: flex-start; gap: 24rpx; }
.cd-avatar { width: 128rpx; height: 128rpx; border-radius: 999rpx; border: 8rpx solid #fff; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1); overflow: hidden; flex-shrink: 0; background: #FAF8F5; }
.cd-avatar-img { width: 100%; height: 100%; }
.cd-info-main { flex: 1; min-width: 0; }
.cd-name-row { display: flex; align-items: center; gap: 16rpx; }
.cd-name { font-size: 36rpx; font-weight: 700; color: var(--text-ink, #2C2C2C); }
.cd-paid { font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(196,30,58,0.1); color: var(--brand, var(--brand)); border-radius: 6rpx; }
.cd-stats { display: flex; align-items: center; gap: 24rpx; margin-top: 8rpx; }
.cd-stat { display: flex; align-items: center; gap: 6rpx; flex-shrink: 0; }
.cd-stat-txt { font-size: 24rpx; color: #999; white-space: nowrap; }
.cd-desc { display: block; font-size: 26rpx; color: #666; line-height: 1.7; margin-top: 24rpx; }
.cd-tags { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.cd-tag { font-size: 22rpx; padding: 4rpx 16rpx; background: #F5F0E8; color: #999; border-radius: 999rpx; }
.cd-owner { display: flex; align-items: center; gap: 16rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #F5F0E8; }
.cd-owner-avatar { width: 64rpx; height: 64rpx; border-radius: 999rpx; }
.cd-owner-info { flex: 1; }
.cd-owner-name-row { display: flex; align-items: center; gap: 8rpx; }
.cd-owner-name { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-owner-role { font-size: 22rpx; color: #999; }
/* 公告 */
.cd-ann { margin: 24rpx 32rpx 0; }
.cd-ann-box { background: linear-gradient(to right, #FFF8E7, #FFFBF0); border-radius: 24rpx; border: 2rpx solid #F0E6D3; overflow: hidden; }
.cd-ann-head { padding: 24rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.cd-ann-title { display: flex; align-items: center; gap: 16rpx; }
.cd-ann-icon { width: 40rpx; height: 40rpx; border-radius: 8rpx; background: #C9A96E; display: flex; align-items: center; justify-content: center; }
.cd-ann-label { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-ann-body { padding: 0 32rpx 24rpx; }
.cd-ann-text { font-size: 24rpx; color: #666; line-height: 1.7; }
.cd-ann-more { display: flex; align-items: center; gap: 4rpx; margin-top: 16rpx; }
.cd-ann-more-t { font-size: 24rpx; color: var(--brand); font-weight: 500; }
/* 圈主助理入口 */
.cd-assistant { display: flex; align-items: center; gap: 20rpx; margin: 24rpx 32rpx 0; padding: 24rpx 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #FFF8E7, #FFFBF0); border: 2rpx solid #F0E6D3; }
.cd-assistant-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: linear-gradient(135deg, #C9A96E, #B8935A); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-assistant-main { flex: 1; min-width: 0; }
.cd-assistant-title { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.cd-assistant-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }

/* Tabs */
.cd-tabs { margin-top: 32rpx; padding: 0 32rpx; border-bottom: 2rpx solid #E8E3DB; }
.cd-tabs-scroll { white-space: nowrap; }
.cd-tabs-row { display: inline-flex; gap: 8rpx; }
  .cd-tab { padding: 0 32rpx 24rpx; position: relative; flex-shrink: 0; }
  .cd-tab-txt { font-size: 28rpx; font-weight: 500; color: #999; white-space: nowrap; }
.cd-tab-txt.on { color: var(--brand, var(--brand)); }
.cd-tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: var(--brand, var(--brand)); border-radius: 999rpx; }
/* 内容 */
.cd-content { padding: 32rpx; }
.cd-home { display: flex; flex-direction: column; gap: 32rpx; }
.cd-sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.cd-sec-title { display: flex; align-items: center; gap: 16rpx; }
.cd-sec-title.mb { margin-bottom: 24rpx; }
.cd-sec-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-sec-label.mb { display: block; margin-bottom: 24rpx; }
.cd-sec-more { display: flex; align-items: center; gap: 4rpx; }
.cd-more-txt { font-size: 24rpx; color: #999; }
/* 活动 */
.cd-acts { display: flex; flex-direction: column; gap: 16rpx; }
.cd-act { display: flex; align-items: center; gap: 24rpx; background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-act-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-act-icon.live { background: rgba(239,68,68,0.1); }
.cd-act-icon.checkin { background: rgba(34,197,94,0.1); }
.cd-act-icon.homework { background: rgba(249,115,22,0.1); }
.cd-act-main { flex: 1; min-width: 0; }
.cd-act-title { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-act-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.cd-act-time { font-size: 22rpx; color: #999; }
.cd-act-btn { padding: 12rpx 24rpx; border-radius: 999rpx; flex-shrink: 0; }
.cd-act-btn.red { background: var(--brand, var(--brand)); }
.cd-act-btn.green { background: #52C41A; }
.cd-act-btn-txt { font-size: 22rpx; color: #fff; }
/* 置顶 */
.cd-pinned-list { display: flex; flex-direction: column; gap: 16rpx; }
.cd-pinned { display: flex; align-items: flex-start; gap: 24rpx; background: linear-gradient(to right, #FFF8E7, #FFFBF0); border-radius: 24rpx; padding: 24rpx; border: 2rpx solid #F0E6D3; }
.cd-pinned-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; flex-shrink: 0; }
.cd-pinned-main { flex: 1; min-width: 0; }
.cd-pinned-tags { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.cd-pinned-pin { font-size: 22rpx; color: var(--brand, var(--brand)); font-weight: 500; }
.cd-pinned-content { display: block; font-size: 24rpx; color: var(--text-ink, #2C2C2C); line-height: 1.6; }
.cd-pinned-meta { display: flex; align-items: center; gap: 24rpx; margin-top: 12rpx; }
.cd-pinned-stat { display: flex; align-items: center; gap: 6rpx; }
.cd-pinned-meta-txt { font-size: 22rpx; color: #999; }
.cd-pinned-img { width: 96rpx; height: 96rpx; border-radius: 16rpx; flex-shrink: 0; }
.pc-essence { font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(201,169,110,0.1); color: #C9A96E; border-radius: 6rpx; }
/* 专栏横滚 */
.cd-cols-scroll { white-space: nowrap; }
.cd-cols-row { display: inline-flex; gap: 24rpx; }
.cd-col { width: 320rpx; background: var(--card, #fff); border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-col-cover { position: relative; }
.cd-col-img { width: 100%; height: 160rpx; }
.cd-col-lock { position: absolute; top: 16rpx; right: 16rpx; width: 40rpx; height: 40rpx; background: #C9A96E; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.cd-col-body { padding: 20rpx; }
.cd-col-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cd-col-meta { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }
.cd-col-price { color: var(--brand, #C41E3A); font-weight: 500; }
.cd-live-badge { position: absolute; top: 8rpx; left: 8rpx; font-size: 18rpx; color: #fff; padding: 2rpx 10rpx; border-radius: 6rpx; background: rgba(0,0,0,0.5); }
.cd-live-badge.live { background: var(--brand, #C41E3A); }
.cd-live-badge.upcoming { background: #FA8C16; }
/* 圈主推荐电子书 */
.cd-ebook-hint { font-size: 22rpx; color: #999; }
.cd-ebook-manage { font-size: 24rpx; color: #2563eb; }
.cd-ebook-scroll { white-space: nowrap; }
.cd-ebook-row { display: inline-flex; gap: 24rpx; padding-bottom: 8rpx; }
.cd-ebook { width: 160rpx; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.cd-ebook-cover { width: 128rpx; height: 176rpx; border-radius: 16rpx; background: #1e3a5f; display: flex; align-items: center; justify-content: center; }
.cd-ebook-title { width: 100%; font-size: 20rpx; text-align: center; color: #555; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* 专栏网格 */
.cd-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.cd-col-card { background: var(--card, #fff); border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-col-card-img { width: 100%; height: 192rpx; }
/* 文章列表 */
.cd-post-list { display: flex; flex-direction: column; gap: 24rpx; }
.cd-article { display: flex; gap: 24rpx; background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-article-cover { width: 192rpx; height: 192rpx; border-radius: 16rpx; flex-shrink: 0; background: #F5F0E8; }
.cd-article-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cd-article-title-row { display: flex; align-items: flex-start; gap: 12rpx; }
.cd-article-feat { margin-top: 4rpx; flex-shrink: 0; font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(196,30,58,0.1); color: var(--brand, var(--brand)); border-radius: 6rpx; }
.cd-article-title { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); line-height: 1.4; }
.cd-article-meta { margin-top: auto; display: flex; align-items: center; gap: 24rpx; padding-top: 16rpx; }
.cd-article-stat { display: flex; align-items: center; gap: 6rpx; }
.cd-article-meta-txt { font-size: 22rpx; color: #999; }
/* 成员 */
.cd-member-list { display: flex; flex-direction: column; gap: 16rpx; }
.cd-member { display: flex; align-items: center; gap: 24rpx; background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-member-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; }
.cd-member-main { flex: 1; min-width: 0; }
.cd-member-name-row { display: flex; align-items: center; gap: 16rpx; }
.cd-member-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-role { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.cd-role.owner { background: rgba(201,169,110,0.1); }
.cd-role.admin { background: rgba(74,144,217,0.1); }
.cd-role-txt { font-size: 20rpx; }
.cd-role-txt.owner { color: #C9A96E; }
.cd-role-txt.admin { color: #4A90D9; }
.cd-member-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.cd-member-meta-txt { font-size: 22rpx; color: #999; }
/* 空态 */
.cd-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 128rpx 0; gap: 24rpx; }
.cd-empty-txt { font-size: 28rpx; color: #999; }
/* 底部操作栏 */
.cd-foot { position: fixed; bottom: 0; left: 0; right: 0; background: var(--card, #fff); border-top: 2rpx solid #E8E3DB; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 24rpx; z-index: 50; }
.cd-join { flex: 1; padding: 24rpx 0; border-radius: 999rpx; text-align: center; background: linear-gradient(to right, var(--brand), #E74C3C); box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.cd-join.joined { background: #F5F0E8; box-shadow: none; }
.cd-join-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
.cd-join-txt.joined { color: #666; }
.cd-post-btn { flex: 1; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(to right, var(--brand), #E74C3C); box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.cd-post-btn-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
/* 已加入：更多 + 创作(仅管理员) + 发帖 */
.cd-foot-more { width: 72rpx; height: 72rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; background: #F5F0E8; }
.cd-create-btn { flex-shrink: 0; padding: 20rpx 28rpx; border-radius: 999rpx; border: 2rpx solid var(--brand, #C41E3A); display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.cd-create-txt { font-size: 28rpx; font-weight: 500; color: var(--brand, #C41E3A); }
/* 会员弹窗 */
.cd-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.cd-sheet { width: 100%; background: var(--card, #fff); border-radius: 48rpx 48rpx 0 0; overflow: hidden; }
.cd-sheet-body { padding: 48rpx; }
.cd-sheet-head { text-align: center; margin-bottom: 48rpx; }
.cd-sheet-icon { width: 128rpx; height: 128rpx; margin: 0 auto 24rpx; border-radius: 999rpx; background: linear-gradient(135deg, #C9A96E, #E8D5B5); display: flex; align-items: center; justify-content: center; }
.cd-sheet-title { display: block; font-size: 36rpx; font-weight: 700; color: var(--text-ink, #2C2C2C); }
.cd-sheet-sub { display: block; font-size: 28rpx; color: #999; margin-top: 8rpx; }
.cd-benefits { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; margin-bottom: 48rpx; }
.cd-benefit { background: #FAF8F5; border-radius: 24rpx; padding: 24rpx; display: flex; align-items: flex-start; gap: 16rpx; }
.cd-benefit-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-benefit-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-benefit-desc { display: block; font-size: 22rpx; color: #999; }
.cd-sheet-actions { display: flex; gap: 24rpx; }
.cd-sheet-btn { flex: 1; padding: 24rpx 0; border-radius: 999rpx; text-align: center; }
.cd-sheet-btn.cancel { background: #F5F0E8; }
.cd-sheet-btn.confirm { background: linear-gradient(to right, var(--brand), #E74C3C); }
.cd-sheet-btn-txt { font-size: 28rpx; font-weight: 500; }
.cd-sheet-btn-txt.cancel { color: #666; }
.cd-sheet-btn-txt.confirm { color: #fff; }
/* 骨架 */
.cd-skeleton { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.sk-cover { height: 384rpx; background: #E8E3DB; }
.sk-info { padding: 0 32rpx; margin-top: -96rpx; }
.sk-card { height: 280rpx; background: #fff; border-radius: 32rpx; }
/* 错误态 */
.cd-err { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 128rpx 32rpx; }
.cd-err-txt { font-size: 28rpx; color: #999; margin-bottom: 24rpx; }
.cd-err-retry { padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.cd-err-retry-t { font-size: 26rpx; color: #fff; }
</style>
