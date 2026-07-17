<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import {
  profileApi, getGreeting, roleHref, type UserRole,
} from '@/lib/profile-data'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { mineApi } from '@/lib/mine-data'
import { recommendApi } from '@/lib/recommend-data'
import { growthApi } from '@/lib/growth-data'
import type { RecommendItem } from '@/components/common/recommend-section.vue'

const loading = ref(true)
const error = ref('')
const greeting = getGreeting()

// 状态栏高度（自定义导航顶栏 paddingTop）
const statusBarHeight = ref(20)

// 从 API 获取的数据（响应式）
const userData = ref({
  name: '',
  avatar: '',
  bio: '',
  isVip: false,
  vipLevel: '',
  vipExpiry: '',
  vipDaysLeft: 0,
  isVerified: false,
  roles: [] as import('@/lib/profile-data').RoleEntry[],
  messages: { system: 0, interaction: 0, transaction: 0 },
  checkIn: { todayChecked: false, continuousDays: 0, totalPoints: 0 },
  stats: { following: 0, followers: 0, likes: 0 },
  coins: 0,
  coupons: 0,
  points: 0,
  orders: { pending: 0, shipped: 0, received: 0, refund: 0 },
  continueLearning: null as { id: number; title: string; progress: number; lastLesson: string } | null,
})
const recItems = ref<RecommendItem[]>([])

// 铃铛未读数：旁路 profile-data 的占位常量（messages 无聚合端点恒 0），
// 直接用真实聚合端点 GET /notifications/unread-count 驱动红点（内部已 try/catch 降级 0）
const unreadNotify = ref(0)
async function fetchUnreadNotify() {
  unreadNotify.value = await mineApi.getUnreadNotifyCount()
}

/* ===== 身份成长区（§六）：六角色统一模型（图章单字 + 一句权益 + 申请页路由）
   六类均可查已加入态：后端 /auth/me 原样返回全部 roleType（含 OPERATOR/
   STATION_OFFLINE_OWNER/INSTITUTE_MEMBER），profile-data _roleTypeMap 已补齐映射，
   已开通者点入对应工作台，未开通者走「申请加入」引导。 ===== */
interface RoleSpec {
  applyType: string       // 申请页 role 参数
  ownType?: UserRole      // 后端已有身份类型（用于查已加入态/进工作台），无则纯申请引导
  seal: string            // 图章衍生单字
  name: string            // 角色名
  benefit: string         // 一句话权益（未加入态副行）
}
// 六角色定位顺序（讲师/商家/分站站长/运营商/线下驿站/研究院）
const ROLE_SPECS: RoleSpec[] = [
  { applyType: 'teacher', ownType: 'teacher', seal: '讲', name: '讲师', benefit: '把你的学问变成课程，触达百万学友' },
  { applyType: 'merchant', ownType: 'merchant', seal: '商', name: '商家', benefit: '开店卖国学好物，平台代运营' },
  { applyType: 'station_owner', ownType: 'station_owner', seal: '站', name: '分站站长', benefit: '承包一城，独享分站收益' },
  { applyType: 'operator', ownType: 'operator', seal: '运', name: '运营商', benefit: '区域推广合伙，两级分润' },
  { applyType: 'offline_station', ownType: 'offline_station', seal: '驿', name: '线下驿站', benefit: '门店挂牌，线上线下互导' },
  { applyType: 'institute', ownType: 'institute', seal: '研', name: '研究院', benefit: '学术共建，内容首发权益' },
]
// 已加入身份集合（后端 roles → type）
const ownedRoleMap = computed(() => {
  const m = new Map<string, import('@/lib/profile-data').RoleEntry>()
  for (const r of userData.value.roles) m.set(r.type, r)
  return m
})
// 身份成长区渲染项（合并加入态/申请态）
const roleRows = computed(() =>
  ROLE_SPECS.map((spec) => {
    const owned = spec.ownType ? ownedRoleMap.value.get(spec.ownType) : undefined
    return {
      ...spec,
      joined: !!owned,
      // 已加入：进入工作台（后端未返回待办数 → 中性引导「进入工作台」，诚实降级不造假待办数）
      href: owned && spec.ownType ? roleHref(spec.ownType, owned.id) : '',
      roleName: owned?.name || '',
    }
  }),
)
// 身份区展开态（默认露出前 3 行）
const rolesExpanded = ref(false)
const visibleRoleRows = computed(() =>
  rolesExpanded.value ? roleRows.value : roleRows.value.slice(0, 3),
)
const hasMoreRoles = computed(() => roleRows.value.length > 3)

/* ===== 资产四宫格 ===== */
// 钱包余额（可提现·真接口）：失败/未登录显示 —，不造假
const walletBalance = ref<number | null>(null)
async function loadWalletBalance() {
  try {
    const info = await mineApi.getWithdrawInfo()
    walletBalance.value = info.availableBalance
  } catch { walletBalance.value = null }
}
const assetCells = computed(() => [
  { key: 'wallet', label: '钱包余额', value: walletBalance.value == null ? '—' : `¥${walletBalance.value.toFixed(walletBalance.value % 1 ? 2 : 0)}`, href: '/pkg-mine/wallet/index' },
  { key: 'coins', label: '国学币', value: String(userData.value.coins), href: '/pkg-mine/wallet/index' },
  { key: 'coupons', label: '优惠券', value: String(userData.value.coupons), href: '/pkg-shop/coupons/index' },
  { key: 'points', label: '积分', value: String(userData.value.points), href: '/pkg-mine/points/index' },
])

/* ===== 订单条 ===== */
const orderStatus = computed(() => [
  { key: 'pending' as const, label: '待付款', icon: 'wallet', count: userData.value.orders.pending },
  { key: 'shipped' as const, label: '待发货', icon: 'package', count: userData.value.orders.shipped },
  { key: 'received' as const, label: '待收货', icon: 'truck', count: userData.value.orders.received },
  { key: 'refund' as const, label: '售后', icon: 'refresh-cw', count: userData.value.orders.refund },
])

/* ===== 内容矩阵 4 列（排盘记录=战略位轻强调 star） =====
   🔴 2026-07-14 补齐：此前只有 8 格，个人中心根本进不去自己的
   笔记 / 直播 / 申请 / 收货地址 / 创作中心 / 讲师工作台 / 资质 ——
   这些页面全是"做完了但没人跳得进去"的孤岛，用户体感就是"这个没做"。
   （lib/profile-data 里那份 quickFunctions 是死常量、没人读，已删。） */
const matrixItems: { icon: string; label: string; href?: string; star?: boolean; comingSoon?: boolean }[] = [
  { icon: 'compass', label: '我的排盘记录', href: '/paipan', star: true },
  { icon: 'book-open', label: '我的课程', href: '/courses/my-learning' },
  // 我的圈子 → 圈子板块「我的」门户 /pkg-circle/circles/me（与圈子页右上角头像入口指向同一页）
  { icon: 'users', label: '我的圈子', href: '/pkg-circle/circles/me' },
  // 我的书架 → 古籍板块「我的书房」书架（真连收藏/进度），与古籍馆书架对齐
  { icon: 'book-open', label: '我的书架', href: '/pkg-classics/bookshelf/index' },
  { icon: 'bookmark', label: '收藏', href: '/favorites' },
  { icon: 'history', label: '足迹', href: '/history' },
  // 统一笔记页（古籍+电子书聚合），原 /ebook/notes 只有电子书
  { icon: 'sticky-note', label: '我的笔记', href: '/mine/notes' },
  // 「我的发布」价值有限（多数用户不发布·发布走圈子/创作者流各自管理）→ 董事长拍板换为「我的评价」（真实页·更有用）
  { icon: 'message-circle', label: '我的评价', href: '/mine/my-comments' },
  // 创作不需要角色（人人可发短视频），所以不走 roleHref 角色映射——后端 RoleType 枚举里压根没有 CREATOR
  { icon: 'video', label: '创作中心', href: '/videos/creator' },
  { icon: 'radio', label: '我的直播', href: '/pkg-live/manage/index' },
  { icon: 'award', label: '讲师工作台', href: '/pkg-creator/teacher-dashboard/index' },
  { icon: 'shield-check', label: '我的资质', href: '/pkg-creator/my-qualifications/index' },
  { icon: 'clipboard-list', label: '我的申请', href: '/mine/applications' },
  // 收货地址此前全项目零入口：买了实体商品的用户只能在结算时被动选，改不了地址
  { icon: 'map-pin', label: '收货地址', href: '/shop/addresses' },
]

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await profileApi.getProfile()
    userData.value = data
    // 猜你喜欢（getForScene 已内置降级，无需 try/catch）
    recItems.value = await recommendApi.getForScene('guess_like')
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// 佩戴中的称号（成长中心平台级称号体系·独立请求与主档案并行）
const equippedTitle = ref<{ code: string; name: string } | null>(null)

/** 拉取佩戴称号（失败静默不显示，绝不影响主档案加载） */
async function fetchEquippedTitle() {
  try {
    const growth = await growthApi.me()
    equippedTitle.value = growth.equippedTitle
  } catch {
    equippedTitle.value = null // 静默降级：称号非关键信息
  }
}

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync()
    if (sys?.statusBarHeight) statusBarHeight.value = sys.statusBarHeight
  } catch { /* 降级默认 20 */ }
  fetchData()
  fetchEquippedTitle()
  loadWalletBalance()
})

// 每次显示都刷新铃铛未读（从通知中心读完返回即时消红点）；onShow 首屏也会触发
onShow(() => {
  fetchUnreadNotify()
})

// 下拉刷新：重拉个人资料与装备称号 + 铃铛未读
onPullDownRefresh(async () => {
  try {
    await Promise.all([fetchData(), fetchEquippedTitle(), loadWalletBalance(), fetchUnreadNotify()])
  } finally {
    uni.stopPullDownRefresh()
  }
})

function go(href?: string) {
  if (href) navigateTo(href)
}
/** 我的页订单状态 key → 订单列表页 tab key */
function orderTabOf(key: 'pending' | 'shipped' | 'received' | 'refund'): string {
  return { pending: 'pending_pay', shipped: 'pending_ship', received: 'pending_receive', refund: 'after_sale' }[key]
}
/** 点击已有身份卡 → 进入对应工作台 */
function openRole(href: string) {
  if (href) navigateTo(href)
}
/** 点击「申请加入」→ 角色申请页（六角色共用模板，role 驱动） */
function applyRole(role: string) {
  navigateTo(`/pkg-mine/role-apply/index?role=${role}`)
}
</script>

<template>
  <view class="page">
    <app-network-bar />
    <customer-service-fab />
    <!-- 骨架屏 -->
    <view v-if="loading" class="skeleton">
      <view class="skeleton-hero" />
      <view class="skeleton-sec" />
      <view class="skeleton-sec" />
      <view class="skeleton-sec" />
      <text class="skeleton-text">加载中...</text>
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="error-state">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="fetchData">
        <text>重试</text>
      </view>
    </view>
    <template v-else>
    <!-- ===== ① 头部身份区（白卡通栏） ===== -->
    <view class="id-area" :style="{ paddingTop: statusBarHeight + 14 + 'px' }">
      <!-- 右上角操作：消息（带未读红点）+ 设置 -->
      <view class="top-acts" :style="{ top: statusBarHeight + 6 + 'px' }">
        <view class="top-act tap-press" @tap="go('/notifications')">
          <AppIcon name="message-circle" :size="44" color="#2B2620" />
          <view v-if="unreadNotify > 0" class="dot" />
        </view>
        <view class="top-act tap-press" @tap="go('/pkg-mine/settings/index')">
          <AppIcon name="settings" :size="44" color="#2B2620" />
        </view>
      </view>

      <view class="id-row">
        <view class="id-avatar" @tap="go('/pages/profile/edit')">
          <!-- smart-avatar：头像 URL 失效自动翻昵称首字色块（原 image 裂图时是纯红空圈） -->
          <smart-avatar class="avatar-img" :src="userData.avatar" :name="userData.name || '国'" />
        </view>
        <view class="id-info">
          <view class="id-name-row">
            <text class="id-name">{{ userData.name }}</text>
            <AppIcon v-if="userData.isVerified" name="shield" :size="28" color="#4A90D9" />
            <view v-if="equippedTitle" class="title-chip" @tap="go('/pkg-mine/achievements/index')">
              <text class="title-chip-txt">{{ equippedTitle.name }}</text>
            </view>
          </view>
          <text class="id-sign">{{ userData.bio || greeting + '，欢迎回来' }}</text>
        </view>
      </view>

      <!-- 三数据：关注/粉丝/获赞 -->
      <view class="id-stats">
        <view class="st" @tap="go('/pkg-mine/follows/index')"><text class="st-b">{{ userData.stats.following }}</text><text class="st-l">关注</text></view>
        <view class="st" @tap="go('/pkg-mine/follows/index?tab=followers')"><text class="st-b">{{ userData.stats.followers }}</text><text class="st-l">粉丝</text></view>
        <view class="st" @tap="go('/pkg-mine/likes/index')"><text class="st-b">{{ userData.stats.likes }}</text><text class="st-l">获赞</text></view>
      </view>

      <!-- 会员金卡条：会员=暖金渐变金底深字 / 非会员=宣纸衬底金描边 -->
      <view v-if="userData.isVip" class="gold-bar gold-bar--member card-press" @tap="go('/vip')">
        <view class="gb-crown"><AppIcon name="crown" :size="34" color="#8A6B38" /></view>
        <view class="gb-txt">
          <text class="gb-title gb-title--member">书院会员 · {{ userData.vipLevel || '专属权益' }}</text>
          <text class="gb-sub gb-sub--member">{{ userData.vipExpiry ? userData.vipExpiry + ' 到期' : 'AI 伴读 · 古籍畅读 · 全场好课优惠' }}</text>
        </view>
        <view class="gb-cta gb-cta--member"><text class="gb-cta-txt gb-cta-txt--member">续费</text></view>
      </view>
      <view v-else class="gold-bar gold-bar--guest card-press" @tap="go('/vip')">
        <view class="gb-crown"><AppIcon name="crown" :size="34" color="#C9A96E" /></view>
        <view class="gb-txt">
          <text class="gb-title gb-title--guest">开通书院会员</text>
          <text class="gb-sub gb-sub--guest">AI 伴读 · 古籍畅读 · 全场好课优惠</text>
        </view>
        <view class="gb-cta gb-cta--guest"><text class="gb-cta-txt gb-cta-txt--guest">立即开通</text></view>
      </view>
    </view>

    <!-- ===== ② 继续区（复访钩子·横滑）：谁有进行中出谁，全无则推荐引导卡 ===== -->
    <template v-if="userData.continueLearning">
      <view class="sec-title"><text class="sec-h">继续</text><text class="sec-more" @tap="go('/courses/my-learning')">接着上次 ›</text></view>
      <scroll-view scroll-x class="cont-row" :show-scrollbar="false">
        <view class="cont-row-inner">
          <view class="cont-card tap-press" @tap="go(`/pkg-course/detail/index?id=${userData.continueLearning?.id}`)">
            <text class="cont-tag">继续学习</text>
            <view class="cont-main">
              <view class="cont-th"><AppIcon name="book-open" :size="34" color="#C9A96E" /></view>
              <view class="cont-txt">
                <text class="cont-t">{{ userData.continueLearning.title }}</text>
                <text class="cont-sub">{{ userData.continueLearning.lastLesson }}</text>
              </view>
            </view>
            <view class="prog"><view class="prog-i" :style="{ width: userData.continueLearning.progress + '%' }" /></view>
          </view>
        </view>
      </scroll-view>
    </template>
    <template v-else>
      <view class="sec-title"><text class="sec-h">继续</text></view>
      <view class="empty-lead card-press" @tap="go('/paipan')">
        <view class="empty-th"><AppIcon name="compass" :size="40" color="#C9A96E" /></view>
        <view class="el-txt">
          <text class="el-t">从一盘开始你的国学之旅</text>
          <text class="el-sub">排盘、听书、读经，挑一个感兴趣的</text>
        </view>
        <view class="el-go"><text class="el-go-txt">去看看 ›</text></view>
      </view>
    </template>

    <!-- ===== ③ 资产四宫格 ===== -->
    <view class="assets">
      <view v-for="c in assetCells" :key="c.key" class="asset tap-press" @tap="go(c.href)">
        <text class="asset-b">{{ c.value }}</text>
        <text class="asset-s">{{ c.label }}</text>
      </view>
    </view>

    <!-- ===== ④ 订单条 ===== -->
    <view class="orders">
      <view class="orders-head">
        <text class="orders-title">我的订单</text>
        <text class="orders-more" @tap="go('/pkg-order/list/index')">全部订单 ›</text>
      </view>
      <view class="orders-row">
        <view v-for="item in orderStatus" :key="item.key" class="o-item tap-press" @tap="go(`/pkg-order/list/index?tab=${orderTabOf(item.key)}`)">
          <view class="o-icon">
            <AppIcon :name="item.icon" :size="40" color="#2B2620" />
            <text v-if="item.count > 0" class="o-dot">{{ item.count }}</text>
          </view>
          <text class="o-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== ⑤ 我的内容矩阵（4 列 × 4 行·个人中心的入口集散地） ===== -->
    <view class="matrix">
      <view v-for="m in matrixItems" :key="m.label" class="m-item tap-press" :class="{ star: m.star }" @tap="m.comingSoon ? toastComingSoon() : go(m.href)">
        <view class="m-icon">
          <AppIcon :name="m.icon" :size="40" :color="m.star ? '#B4884A' : '#2B2620'" />
          <view v-if="m.star" class="m-star-dot" />
        </view>
        <text class="m-label">{{ m.label }}</text>
      </view>
    </view>

    <!-- ===== ⑥ 身份成长区（B端转化·六角色·默认露出 3 行） ===== -->
    <view class="roles">
      <view class="roles-head">
        <text class="roles-title">身份切换</text>
        <text class="roles-hint">加入平台生态，开启第二身份</text>
      </view>
      <view
        v-for="row in visibleRoleRows"
        :key="row.applyType"
        class="role-row list-press"
        :class="{ joined: row.joined, pending: !row.joined }"
        @tap="row.joined ? openRole(row.href) : applyRole(row.applyType)"
      >
        <text class="role-seal">{{ row.seal }}</text>
        <view class="role-txt">
          <text class="role-name">{{ row.name }}</text>
          <text class="role-sub">{{ row.joined ? (row.roleName || '身份已启用') : row.benefit }}</text>
        </view>
        <view v-if="row.joined" class="role-go">
          <text class="role-go-txt">进入{{ row.name }}工作台</text>
          <AppIcon name="chevron-right" :size="24" color="#C41E3A" />
        </view>
        <view v-else class="role-apply"><text class="role-apply-txt">申请加入</text></view>
      </view>
      <view v-if="hasMoreRoles" class="role-more list-press" @tap="rolesExpanded = !rolesExpanded">
        <text class="role-more-txt">{{ rolesExpanded ? '收起更多身份' : '更多身份' }}</text>
        <AppIcon :name="rolesExpanded ? 'chevron-up' : 'chevron-down'" :size="22" color="#B0A99A" />
      </view>
    </view>

    <!-- ===== ⑦ 服务与设置 ===== -->
    <view class="svc">
      <view class="svc-item tap-press" @tap="go('/agents/history')">
        <AppIcon name="message-circle" :size="40" color="#2B2620" /><text class="svc-label">AI会话</text>
      </view>
      <view class="svc-item tap-press" @tap="go('/agent/customer-service')">
        <AppIcon name="customer-service" :size="40" color="#2B2620" /><text class="svc-label">联系客服</text>
      </view>
      <view class="svc-item tap-press" @tap="go('/help')">
        <AppIcon name="help-circle" :size="40" color="#2B2620" /><text class="svc-label">帮助中心</text>
      </view>
    </view>

    <!-- ===== ⑧ 猜你喜欢（统一推荐区块·空时不渲染）===== -->
    <recommend-section title="猜你喜欢" :items="recItems" />

    </template>
    <bottom-nav active="profile" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

/* ① 头部身份区 */
.id-area { position: relative; background: #FFFFFF; padding: 20rpx 32rpx 32rpx; }
.top-acts { position: absolute; right: 16rpx; display: flex; }
.top-act { position: relative; width: 80rpx; height: 80rpx; display: flex; align-items: center; justify-content: center; }
.top-act .dot { position: absolute; top: 14rpx; right: 14rpx; width: 16rpx; height: 16rpx; border-radius: 50%; background: #C41E3A; border: 3rpx solid #fff; }

.id-row { display: flex; align-items: center; gap: 28rpx; }
.id-avatar { width: 120rpx; height: 120rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; border: 4rpx solid #fff; box-shadow: 0 4rpx 16rpx rgba(60,50,40,.15); flex-shrink: 0; overflow: hidden; }
.avatar-img { width: 100%; height: 100%; }
.avatar-fallback { font-family: var(--font-serif); font-size: 48rpx; font-weight: 700; color: #fff; }
.id-info { flex: 1; min-width: 0; }
.id-name-row { display: flex; align-items: center; gap: 12rpx; }
.id-name { font-size: 34rpx; font-weight: 700; color: #2B2620; }
.title-chip { padding: 2rpx 12rpx; border: 2rpx solid #C41E3A; border-radius: 8rpx; background: rgba(196,30,58,0.06); }
.title-chip-txt { font-family: var(--font-serif); font-size: 24rpx; font-weight: 600; color: #C41E3A; letter-spacing: 2rpx; }
.id-sign { display: block; font-size: 26rpx; color: #8A8578; margin-top: 10rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.id-stats { display: flex; gap: 56rpx; margin-top: 28rpx; padding-left: 4rpx; }
.st { display: flex; align-items: baseline; gap: 10rpx; }
.st-b { font-size: 30rpx; font-weight: 700; color: #2B2620; }
.st-l { font-size: 24rpx; color: #8A8578; }

/* 会员金卡条 */
.gold-bar { margin-top: 32rpx; height: 128rpx; border-radius: 24rpx; padding: 0 28rpx; display: flex; align-items: center; gap: 20rpx; }
.gold-bar--member { background: linear-gradient(105deg, #F3E3C3, #E8CE9C); box-shadow: 0 4rpx 16rpx rgba(180,140,70,.22); }
.gold-bar--guest { background: #F6F1E7; border: 2rpx solid #E0CFA8; }
.gb-crown { flex-shrink: 0; width: 44rpx; height: 44rpx; display: flex; align-items: center; justify-content: center; }
.gb-txt { flex: 1; min-width: 0; }
.gb-title { display: block; font-size: 26rpx; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gb-title--member { color: #5A431E; }
.gb-title--guest { color: #2B2620; }
.gb-sub { display: block; font-size: 24rpx; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gb-sub--member { color: #8A6B38; }
.gb-sub--guest { color: #8A8578; }
.gb-cta { flex-shrink: 0; height: 56rpx; padding: 0 28rpx; border-radius: 28rpx; display: flex; align-items: center; }
.gb-cta--member { background: #2B2620; }
.gb-cta--guest { background: linear-gradient(105deg, #F3E3C3, #E8CE9C); box-shadow: 0 2rpx 8rpx rgba(180,140,70,.25); }
.gb-cta-txt { font-size: 24rpx; }
.gb-cta-txt--member { color: #E8CE9C; font-weight: 500; }
.gb-cta-txt--guest { color: #5A431E; font-weight: 700; }

/* 通用区块标题 */
.sec-title { display: flex; align-items: baseline; padding: 36rpx 32rpx 20rpx; }
.sec-h { font-family: var(--font-serif); font-size: 32rpx; font-weight: 700; color: #2B2620; }
.sec-more { margin-left: auto; font-size: 24rpx; color: #B0A99A; }

/* ② 继续区 */
.cont-row { width: 100%; white-space: nowrap; }
.cont-row-inner { display: inline-flex; gap: 16rpx; padding: 0 32rpx; }
.cont-card { display: inline-block; width: 300rpx; vertical-align: top; background: #fff; border-radius: 20rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); white-space: normal; }
.cont-tag { display: inline-block; font-size: 22rpx; color: #C9A96E; border: 2rpx solid #C9A96E; border-radius: 6rpx; padding: 0 8rpx; }
.cont-main { display: flex; gap: 16rpx; align-items: center; margin-top: 14rpx; }
.cont-th { width: 80rpx; height: 104rpx; border-radius: 12rpx; background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(201,169,110,0.12)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cont-txt { flex: 1; min-width: 0; }
.cont-t { display: block; font-size: 24rpx; font-weight: 500; color: #2B2620; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cont-sub { display: block; font-size: 24rpx; color: #B0A99A; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prog { height: 8rpx; background: #F0EBE1; border-radius: 4rpx; margin-top: 16rpx; overflow: hidden; }
.prog-i { height: 100%; background: #C9A96E; border-radius: 4rpx; }

/* ② 继续区空态引导卡 */
.empty-lead { margin: 0 32rpx; background: #fff; border-radius: 24rpx; padding: 28rpx; display: flex; align-items: center; gap: 24rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.empty-th { width: 112rpx; height: 84rpx; border-radius: 16rpx; background: linear-gradient(135deg, rgba(196,30,58,0.06), rgba(201,169,110,0.12)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.el-txt { flex: 1; min-width: 0; }
.el-t { display: block; font-size: 26rpx; font-weight: 700; color: #2B2620; }
.el-sub { display: block; font-size: 24rpx; color: #8A8578; margin-top: 6rpx; }
.el-go { flex-shrink: 0; height: 52rpx; padding: 0 24rpx; border-radius: 26rpx; border: 2rpx solid #C41E3A; display: flex; align-items: center; }
.el-go-txt { font-size: 24rpx; color: #C41E3A; }

/* ③ 资产四宫格 */
.assets { display: flex; margin: 28rpx 32rpx 0; background: #fff; border-radius: 24rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.asset { flex: 1; text-align: center; padding: 30rpx 0 26rpx; position: relative; }
.asset + .asset::before { content: ''; position: absolute; left: 0; top: 28rpx; bottom: 28rpx; width: 2rpx; background: #F0EBE1; }
.asset-b { display: block; font-family: var(--font-serif); font-size: 34rpx; font-weight: 700; color: #2B2620; }
.asset-s { display: block; font-size: 24rpx; color: #8A8578; margin-top: 6rpx; }

/* ④ 订单条 */
.orders { margin: 20rpx 32rpx 0; background: #fff; border-radius: 24rpx; padding: 26rpx 28rpx 28rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.orders-head { display: flex; align-items: center; margin-bottom: 26rpx; }
.orders-title { font-size: 26rpx; font-weight: 700; color: #2B2620; }
.orders-more { margin-left: auto; font-size: 24rpx; color: #B0A99A; }
.orders-row { display: flex; }
.o-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.o-icon { position: relative; width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.o-dot { position: absolute; top: -10rpx; right: -14rpx; min-width: 28rpx; height: 28rpx; padding: 0 8rpx; border-radius: 14rpx; background: #C41E3A; color: #fff; font-size: 18rpx; line-height: 28rpx; text-align: center; }
.o-label { font-size: 24rpx; color: #8A8578; }

/* ⑤ 内容矩阵 */
.matrix { display: flex; flex-wrap: wrap; margin: 20rpx 32rpx 0; background: #fff; border-radius: 24rpx; padding: 12rpx 0 16rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.m-item { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 26rpx 0 18rpx; position: relative; }
.m-icon { position: relative; width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.m-label { font-size: 24rpx; color: #8A8578; }
.m-item.star .m-label { color: #8A6420; font-weight: 500; }
.m-star-dot { position: absolute; top: -2rpx; right: -6rpx; width: 10rpx; height: 10rpx; border-radius: 50%; background: #C9A96E; }

/* ⑥ 身份成长区 */
.roles { margin: 20rpx 32rpx 0; background: #fff; border-radius: 24rpx; padding: 8rpx 0; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); overflow: hidden; }
.roles-head { display: flex; align-items: baseline; padding: 24rpx 28rpx 12rpx; }
.roles-title { font-size: 26rpx; font-weight: 700; color: #2B2620; }
.roles-hint { margin-left: auto; font-size: 24rpx; color: #B0A99A; }
.role-row { display: flex; align-items: center; gap: 24rpx; height: 112rpx; padding: 0 28rpx; }
.role-row + .role-row { border-top: 2rpx solid #F5F1EA; }
.role-seal { width: 68rpx; height: 68rpx; border-radius: 16rpx; font-family: var(--font-serif); font-size: 30rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.role-row.joined .role-seal { background: rgba(180,140,70,.92); color: #fff; }
.role-row.pending .role-seal { background: #F6F1E7; color: #B4884A; border: 2rpx solid #DFCBA4; }
.role-txt { flex: 1; min-width: 0; }
.role-name { display: block; font-size: 26rpx; font-weight: 700; color: #2B2620; }
.role-sub { display: block; font-size: 24rpx; color: #8A8578; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role-row.joined .role-sub { color: #C41E3A; }
.role-go { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.role-go-txt { font-size: 24rpx; font-weight: 500; color: #2B2620; }
.role-apply { flex-shrink: 0; height: 52rpx; padding: 0 24rpx; border-radius: 26rpx; border: 2rpx solid #C9A96E; display: flex; align-items: center; }
.role-apply-txt { font-size: 24rpx; color: #8A6420; }
.role-more { display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 80rpx; border-top: 2rpx solid #F5F1EA; }
.role-more-txt { font-size: 24rpx; color: #B0A99A; }

/* ⑦ 服务行 */
.svc { display: flex; margin: 20rpx 32rpx 0; background: #fff; border-radius: 24rpx; padding: 12rpx 0 16rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.svc-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 26rpx 0 18rpx; }
.svc-label { font-size: 24rpx; color: #8A8578; }

/* 三态：骨架屏 / 错误态 */
.skeleton { padding-top: 120rpx; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.skeleton-hero { width: 686rpx; height: 320rpx; border-radius: 24rpx; background: linear-gradient(90deg, #f0ece4 25%, #e8e0d5 50%, #f0ece4 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-sec { width: 686rpx; height: 160rpx; border-radius: 24rpx; background: linear-gradient(90deg, #f0ece4 25%, #e8e0d5 50%, #f0ece4 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.error-state { padding: 200rpx 64rpx 0; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.error-text { font-size: 28rpx; color: #999; text-align: center; }
.retry-btn { padding: 16rpx 48rpx; border-radius: 999rpx; border: 2rpx solid #C41E3A; }
.retry-btn text { font-size: 28rpx; color: #C41E3A; }
</style>
