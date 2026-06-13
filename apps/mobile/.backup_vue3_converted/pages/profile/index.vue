<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- ===== 第一层：个人信息区 ===== -->
    <view class="relative">
      <!-- 背景渐变 - 宣纸色系 -->
      <view class="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#F5F1EB] via-[#FAF8F5] to-[#FAF8F5]" />

      <!-- 顶部操作栏 -->
      <view class="relative flex items-center justify-between px-4 pt-12 pb-2">
        <view class="p-2 rounded-full bg-white/60" style="backdrop-filter: blur(8px);" @click="scanQR">
          <text class="text-foreground text-lg"></text>
        </view>
        <view class="flex items-center gap-2">
          <!-- 消息通知入口 -->
          <view class="relative p-2 rounded-full bg-white/60" style="backdrop-filter: blur(8px);" @click="navigateTo('/pages/messages/index')">
            <text class="text-foreground text-lg"></text>
            <view v-if="totalMessages > 0" class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              <text>{{ totalMessages }}</text>
            </view>
          </view>
          <view class="p-2 rounded-full bg-white/60" style="backdrop-filter: blur(8px);" @click="navigateTo('/pages/mine/settings/index')">
            <text class="text-foreground text-lg">⚙</text>
          </view>
        </view>
      </view>

      <!-- 用户信息 -->
      <view class="relative px-4 pb-4">
        <view class="flex items-start gap-4">
          <!-- 大头像 -->
          <view @click="navigateTo('/pages/mine/edit-profile/index')">
            <view class="w-20 h-20 rounded-full ring-4 ring-white shadow-lg bg-primary flex items-center justify-center">
              <text class="text-white text-2xl font-serif font-bold">{{ userData.name[0] }}</text>
            </view>
          </view>

          <view class="flex-1 pt-1">
            <!-- 问候语 -->
            <text class="text-xs text-muted-foreground mb-1 block">{{ greeting }}，{{ userData.name }}</text>

            <!-- 昵称 + 认证标识 -->
            <view class="flex items-center gap-2">
              <text class="font-serif text-xl font-bold text-foreground">{{ userData.name }}</text>
              <text v-if="userData.isVerified" class="text-[#4A90D9] text-base">🛡</text>
              <view v-if="userData.isVip" class="bg-gradient-to-r from-accent to-[#D4B87D] text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                <text class="text-xs mr-0.5">👑</text>
                <text>{{ userData.vipLevel }}</text>
              </view>
            </view>

            <!-- 数据行 -->
            <view class="flex items-center gap-4 mt-2">
              <view @click="navigateTo('/pages/follows/index?tab=following')" class="text-center">
                <text class="text-base font-bold text-foreground">{{ userData.stats.following }}</text>
                <text class="text-xs text-muted-foreground ml-1">关注</text>
              </view>
              <view class="w-px h-3 bg-[#E8E0D5]" />
              <view @click="navigateTo('/pages/follows/index?tab=followers')" class="text-center">
                <text class="text-base font-bold text-foreground">{{ userData.stats.followers }}</text>
                <text class="text-xs text-muted-foreground ml-1">粉丝</text>
              </view>
              <view class="w-px h-3 bg-[#E8E0D5]" />
              <view @click="navigateTo('/pages/likes/index')" class="text-center">
                <text class="text-base font-bold text-foreground">{{ userData.stats.likes }}</text>
                <text class="text-xs text-muted-foreground ml-1">获赞</text>
              </view>
            </view>

            <!-- 编辑资料按钮 -->
            <view class="mt-3 inline-block" @click="navigateTo('/pages/mine/edit-profile/index')">
              <view class="h-7 text-xs px-3 rounded-full border border-border bg-white flex items-center gap-1">
                <text class="text-xs">✏</text>
                <text class="text-foreground text-xs">编辑资料</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第二层：资产核心区 ===== -->
    <view class="px-4 mt-2">
      <view class="overflow-hidden bg-gradient-to-r from-[#FAF8F5] to-[#F8F4EC] border border-accent/20 rounded-xl shadow-sm">
        <view class="p-4">
          <view class="grid grid-cols-3" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));">
            <view class="flex flex-col items-center py-1 border-r border-accent/20" @click="navigateTo('/pages/mine/wallet/index')">
              <view class="flex items-center gap-1">
                <text class="text-accent text-lg"></text>
                <text class="text-2xl font-bold text-accent">{{ userData.coins }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">国学币</text>
            </view>
            <view class="flex flex-col items-center py-1 border-r border-accent/20" @click="navigateTo('/pages/coupons/index')">
              <view class="flex items-center gap-1">
                <text class="text-accent text-lg">🎫</text>
                <text class="text-2xl font-bold text-accent">{{ userData.coupons }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">优惠券</text>
            </view>
            <view class="flex flex-col items-center py-1" @click="navigateTo('/pages/mine/points/index')">
              <view class="flex items-center gap-1">
                <text class="text-accent text-lg"></text>
                <text class="text-2xl font-bold text-accent">{{ userData.points }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">积分</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第三层：订单与售后区 ===== -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-xl shadow-sm overflow-hidden">
        <!-- 标题行 -->
        <view class="flex items-center justify-between px-4 py-3 border-b border-border">
          <text class="font-medium text-foreground">我的订单</text>
          <view class="flex items-center text-xs text-muted-foreground" @click="navigateTo('/pages/orders/index')">
            <text>查看全部订单</text>
            <text class="ml-0.5 text-sm">›</text>
          </view>
        </view>

        <!-- 订单状态4宫格 -->
        <view class="grid grid-cols-4 py-4" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));">
          <view v-for="item in orderStatus" :key="item.key" class="flex flex-col items-center gap-1.5 relative" @click="navigateTo(item.href)">
            <view class="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
              <text class="text-muted-foreground text-base">{{ item.icon }}</text>
            </view>
            <text class="text-xs text-foreground">{{ item.label }}</text>
            <view v-if="item.count > 0" class="absolute top-0 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center" style="right: calc(25% + 8px);">
              <text>{{ item.count }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第四层：功能入口区 ===== -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-xl shadow-sm overflow-hidden">
        <view class="px-4 py-3 border-b border-border">
          <text class="font-medium text-foreground">常用功能</text>
        </view>
        <view class="grid grid-cols-4 gap-y-4 py-4" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));">
          <view v-for="item in quickFunctions" :key="item.label" class="flex flex-col items-center gap-1.5" @click="navigateTo(item.href)">
            <view class="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
              <text :class="['text-base', item.color]">{{ item.icon }}</text>
            </view>
            <text class="text-xs text-foreground">{{ item.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 第五层：身份切换区 ===== -->
    <view v-if="userData.roles.length > 0" class="px-4 mt-4">
      <view class="bg-white rounded-xl shadow-sm overflow-hidden">
        <view class="px-4 py-3 border-b border-border">
          <text class="font-medium text-foreground">身份切换</text>
        </view>
        <view class="p-3 grid grid-cols-2 gap-2" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));">
          <view v-for="role in userData.roles" :key="role.type + '-' + role.id" class="flex items-center gap-3 p-3 rounded-xl border border-border active:bg-secondary transition-colors" @click="navigateToRole(role)">
            <view :class="['w-10 h-10 rounded-xl flex items-center justify-center', roleConfig[role.type].bgColor]">
              <text :class="['text-base', roleConfig[role.type].color]">{{ roleConfig[role.type].icon }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground block truncate">{{ roleConfig[role.type].label }}</text>
              <text class="text-[10px] text-muted-foreground block truncate">{{ role.name }}</text>
            </view>
            <text class="text-muted-foreground text-sm flex-shrink-0">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 签到入口 ===== -->
    <view class="px-4 mt-4">
      <view class="overflow-hidden bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl shadow-sm" @click="navigateTo('/pages/check-in/index')">
        <view class="p-3 flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <text class="text-white text-base"></text>
            </view>
            <view>
              <view class="flex items-center gap-2">
                <text class="text-sm font-medium text-foreground">每日签到</text>
                <view v-if="userData.checkIn.todayChecked" class="bg-success/10 text-success text-[10px] px-1.5 py-0.5 rounded-full border-0">
                  <text>已签到</text>
                </view>
                <view v-else class="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full border-0 animate-pulse">
                  <text>待签到</text>
                </view>
              </view>
              <text class="text-xs text-muted-foreground block mt-0.5">
                已连续签到 <text class="text-primary font-medium">{{ userData.checkIn.continuousDays }}</text> 天，
                累计 <text class="text-accent font-medium">{{ userData.checkIn.totalPoints }}</text> 积分
              </text>
            </view>
          </view>
          <text class="text-muted-foreground text-lg">›</text>
        </view>
      </view>
    </view>

    <!-- ===== 继续学习卡片（有未完成课程时显示） ===== -->
    <view v-if="userData.continueLearning" class="px-4 mt-4">
      <view class="overflow-hidden bg-white rounded-xl shadow-sm" @click="navigateTo('/pages/learn/' + userData.continueLearning.id + '/index')">
        <view class="p-3 flex items-center gap-3">
          <!-- 课程封面 -->
          <view class="w-16 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
            <text class="text-primary text-xl">▶</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-xs text-muted-foreground block">继续学习</text>
            <text class="text-sm font-medium text-foreground block truncate">{{ userData.continueLearning.title }}</text>
            <text class="text-[10px] text-muted-foreground block truncate">{{ userData.continueLearning.lastLesson }}</text>
          </view>
          <!-- 进度 -->
          <view class="flex flex-col items-end">
            <text class="text-sm font-bold text-primary">{{ userData.continueLearning.progress }}%</text>
            <view class="w-12 h-1 bg-secondary rounded-full mt-1 overflow-hidden">
              <view
                class="h-full bg-primary rounded-full"
                :style="{ width: userData.continueLearning.progress + '%' }"
              />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 猜你喜欢 ===== -->
    <view class="px-4 mt-4 mb-6">
      <view class="flex items-center justify-between mb-3">
        <text class="font-medium text-foreground">猜你喜欢</text>
        <view class="text-xs text-muted-foreground flex items-center" @click="navigateTo('/pages/discover/index')">
          <text>更多</text>
          <text class="ml-0.5 text-sm">›</text>
        </view>
      </view>
      <scroll-view scroll-x class="flex gap-3 overflow-x-auto pb-1" style="white-space: nowrap;">
        <view v-for="item in recommendations" :key="item.id" class="inline-flex flex-col flex-shrink-0 w-32 mr-3" @click="navigateTo(item.type === 'course' ? '/pages/course/' + item.id + '/index' : '/pages/mall/product/' + item.id + '/index')">
          <view class="aspect-[3/4] rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 relative flex items-center justify-center shadow-sm" style="aspect-ratio: 3/4;">
            <text v-if="item.type === 'course'" class="text-2xl text-primary/30"></text>
            <text v-else class="text-2xl text-accent/30">📦</text>
            <view v-if="item.tag" class="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
              <text>{{ item.tag }}</text>
            </view>
          </view>
          <text class="text-xs font-medium mt-2 leading-relaxed text-foreground line-clamp-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{ item.title }}</text>
          <view class="flex items-baseline gap-1 mt-1">
            <text class="text-sm font-bold text-primary">¥{{ item.price }}</text>
            <text class="text-[10px] text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 会员到期提醒 -->
    <view v-if="userData.isVip && userData.vipDaysLeft <= 30" class="fixed bottom-24 left-4 right-4">
      <view class="bg-gradient-to-r from-accent to-[#D4B87D] text-white p-3 rounded-xl shadow-sm flex items-center justify-between">
        <view class="flex items-center gap-2">
          <text class="text-lg">👑</text>
          <text class="text-sm">会员还剩 {{ userData.vipDaysLeft }} 天到期</text>
        </view>
        <view class="px-3 py-1 bg-white text-accent rounded-full text-xs font-medium" @click="navigateTo('/pages/vip/index')">
          <text>立即续费</text>
        </view>
      </view>
    </view>

    <!-- ===== 底部导航栏 ===== -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-area-bottom">
      <view class="flex items-center justify-around py-2 px-2">
        <view v-for="tab in bottomNavItems" :key="tab.key" class="flex flex-col items-center gap-0.5" @click="navigateTo(tab.href)">
          <text :class="tab.key === 'profile' ? 'text-primary text-lg' : 'text-muted-foreground text-lg'">{{ tab.icon }}</text>
          <text :class="tab.key === 'profile' ? 'text-primary text-[10px]' : 'text-muted-foreground text-[10px]'">{{ tab.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ===== 类型定义 =====
type UserRole = 'user' | 'circle_owner' | 'teacher' | 'station_owner' | 'streamer' | 'creator'

// ===== 用户数据 =====
const userData = ref({
  name: '张三丰',
  avatar: '',
  bio: '易学爱好者 | 八字研习中',
  isVip: true,
  vipLevel: '黄金会员',
  vipExpiry: '2025-12-31',
  vipDaysLeft: 234,
  isVerified: true,
  roles: [
    { type: 'circle_owner' as UserRole, name: '张氏命理研习社', id: 1 },
    { type: 'teacher' as UserRole, name: '八字入门精讲', id: 1 },
    { type: 'streamer' as UserRole, name: '直播间', id: 1 },
  ],
  messages: {
    system: 2,
    interaction: 5,
    transaction: 1,
  },
  checkIn: {
    todayChecked: false,
    continuousDays: 7,
    totalPoints: 350,
  },
  stats: {
    following: 128,
    followers: 1024,
    likes: 3680,
  },
  coins: 520,
  coupons: 3,
  points: 1280,
  orders: {
    pending: 2,
    shipped: 1,
    received: 3,
    refund: 0,
  },
  continueLearning: {
    id: 1,
    title: '八字入门实战课',
    progress: 45,
    lastLesson: '第三章：天干地支详解',
  },
})

// ===== 问候语 =====
const greeting = ref('')

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

// ===== 消息总数 =====
const totalMessages = computed(() => {
  const m = userData.value.messages
  return m.system + m.interaction + m.transaction
})

// ===== 角色配置 =====
const roleConfig: Record<UserRole, { label: string; icon: string; color: string; bgColor: string }> = {
  user: { label: '普通用户', icon: '', color: 'text-muted-foreground', bgColor: 'bg-[#999]/10' },
  circle_owner: { label: '圈主后台', icon: '👑', color: 'text-accent', bgColor: 'bg-accent/10' },
  teacher: { label: '讲师后台', icon: '🎓', color: 'text-[#4A90D9]', bgColor: 'bg-[#4A90D9]/10' },
  station_owner: { label: '站长后台', icon: '', color: 'text-success', bgColor: 'bg-success/10' },
  streamer: { label: '主播中心', icon: '📡', color: 'text-primary', bgColor: 'bg-primary/10' },
  creator: { label: '创作中心', icon: '', color: 'text-operator', bgColor: 'bg-operator/10' },
}

// ===== 订单状态配置 =====
interface OrderStatusItem {
  key: string
  label: string
  icon: string
  count: number
  href: string
}

const orderStatus = computed<OrderStatusItem[]>(() => [
  { key: 'pending', label: '待付款', icon: '', count: userData.value.orders.pending, href: '/pages/orders/index?status=pending' },
  { key: 'shipped', label: '待发货', icon: '📦', count: userData.value.orders.shipped, href: '/pages/orders/index?status=shipped' },
  { key: 'received', label: '待收货', icon: '🚚', count: userData.value.orders.received, href: '/pages/orders/index?status=received' },
  { key: 'refund', label: '售后', icon: '', count: userData.value.orders.refund, href: '/pages/orders/index?status=refund' },
])

// ===== 常用功能入口 =====
interface QuickFunction {
  icon: string
  label: string
  href: string
  color: string
}

const quickFunctions: QuickFunction[] = [
  { icon: '🧭', label: '排盘记录', href: '/pages/paipan/bazi/history/index', color: 'text-primary' },
  { icon: '', label: '我的课程', href: '/pages/learning/index', color: 'text-[#4A90D9]' },
  { icon: '', label: '我的圈子', href: '/pages/my-circles/index', color: 'text-operator' },
  { icon: '', label: '我的笔记', href: '/pages/classics/notes/index', color: 'text-accent' },
  { icon: '❤', label: '我的收藏', href: '/pages/favorites/index', color: 'text-primary' },
  { icon: '', label: '我的电子书', href: '/pages/ebook/index', color: 'text-success' },
  { icon: '🕐', label: '浏览历史', href: '/pages/history/index', color: 'text-[#64748B]' },
  { icon: '❓', label: '帮助中心', href: '/pages/help/index', color: 'text-muted-foreground' },
]

// ===== 猜你喜欢推荐 =====
interface Recommendation {
  id: number
  type: 'course' | 'product'
  title: string
  price: number
  originalPrice: number
  tag: string
}

const recommendations: Recommendation[] = [
  { id: 1, type: 'course', title: '紫微斗数入门精讲', price: 199, originalPrice: 399, tag: '热门' },
  { id: 2, type: 'product', title: '专业罗盘套装', price: 298, originalPrice: 598, tag: '特惠' },
  { id: 3, type: 'course', title: '六爻预测实战班', price: 299, originalPrice: 499, tag: '新课' },
  { id: 4, type: 'product', title: '渊海子平精装版', price: 68, originalPrice: 128, tag: '' },
]

// ===== 底部导航 =====
const bottomNavItems = [
  { key: 'home', label: '首页', icon: '🏠', href: '/pages/index/index' },
  { key: 'discover', label: '发现', icon: '', href: '/pages/discover/index' },
  { key: 'learning', label: '学习', icon: '', href: '/pages/learning/index' },
  { key: 'messages', label: '消息', icon: '', href: '/pages/messages/index' },
  { key: 'profile', label: '我的', icon: '', href: '/pages/profile/index' },
]

// ===== 导航函数 =====
function navigateTo(url: string) {
  uni.navigateTo({ url })
}

function navigateToRole(role: { type: UserRole; name: string; id: number }) {
  let href = ''
  switch (role.type) {
    case 'circle_owner':
      href = `/pages/circle/${role.id}/settings/index`
      break
    case 'teacher':
      href = '/pages/manage/my-courses/index'
      break
    case 'streamer':
      href = '/pages/creator/live/console/index'
      break
    case 'creator':
      href = '/pages/videos/creator/index'
      break
    default:
      href = '/pages/profile/index'
  }
  uni.navigateTo({ url: href })
}

function scanQR() {
  uni.scanCode({
    success: (res) => {
      uni.showToast({ title: '扫码结果: ' + res.result, icon: 'none' })
    },
  })
}

// ===== 生命周期 =====
onMounted(() => {
  greeting.value = getGreeting()
})
</script>
