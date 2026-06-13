<script setup lang="ts">
import { ref, onMounted } from 'vue'

const mockOverview = {
  contents: 28, totalViews: 125600, totalRevenue: 3680.50, followers: 1256,
  contentsGrowth: 12, viewsGrowth: 8.5, revenueGrowth: 15.2, followersGrowth: 5.8,
}
const mockContents = [
  { id: '1', type: 'article', title: '八字命理入门：天干地支的基础知识', hasCover: true, status: 'published', publishedAt: '2024-01-15', views: 3280, likes: 156, comments: 42, revenue: 128.5 },
  { id: '2', type: 'post', title: '今日分享：如何看流年运势', hasCover: false, status: 'published', publishedAt: '2024-01-14', views: 1560, likes: 89, comments: 23, revenue: 45.0 },
  { id: '3', type: 'article', title: '紫微斗数与八字的区别', hasCover: true, status: 'reviewing', views: 0, likes: 0, comments: 0, revenue: 0 },
  { id: '4', type: 'article', title: '风水布局的基本原则', hasCover: true, status: 'draft', views: 0, likes: 0, comments: 0, revenue: 0 },
]
const mockFollowers = [
  { id: '1', name: '命理爱好者', followedAt: '2024-01-15', hasInteracted: true },
  { id: '2', name: '易学新人', followedAt: '2024-01-14', hasInteracted: false },
  { id: '3', name: '周易研习', followedAt: '2024-01-13', hasInteracted: true },
]
const mockRevenueTrends = Array.from({ length: 30 }, (_, i) => ({
  date: i, revenue: [120,95,140,88,175,130,160,110,90,200,145,115,185,95,130,170,125,155,105,180,140,95,165,120,190,145,110,175,130,210][i] || 100,
}))
const maxRevenue = Math.max(...mockRevenueTrends.map(t => t.revenue))

type Tab = 'content' | 'analytics' | 'revenue' | 'interaction'
const activeTab = ref<Tab>('content')
const loading = ref(true)
const refreshing = ref(false)
const showMenu = ref<string | null>(null)

const tabs: { key: Tab; label: string }[] = [
  { key: 'content', label: '内容' },
  { key: 'analytics', label: '数据' },
  { key: 'revenue', label: '收益' },
  { key: 'interaction', label: '互动' },
]

function statusConfig(status: string) {
  const map: Record<string, { text: string; cls: string }> = {
    published: { text: '已发布', cls: 'bg-green-100 text-green-700' },
    draft:     { text: '草稿',   cls: 'bg-secondary text-muted-foreground' },
    reviewing: { text: '审核中', cls: 'bg-orange-100 text-orange-700' },
    rejected:  { text: '未通过', cls: 'bg-red-100 text-red-600' },
  }
  return map[status] || { text: status, cls: 'bg-secondary text-muted-foreground' }
}

onMounted(() => { setTimeout(() => { loading.value = false }, 800) })

function goBack() { uni.navigateBack() }
function handleRefresh() { refreshing.value = true; setTimeout(() => { refreshing.value = false }, 1000) }
function toggleMenu(id: string) { showMenu.value = showMenu.value === id ? null : id }
function goEdit(id: string) { uni.navigateTo({ url: `/pages/editor/index?id=${id}` }); showMenu.value = null }
function goCreate() { uni.navigateTo({ url: '/pages/editor/index' }) }
</script>

<template>
  <view class="min-h-screen bg-background pb-24">

    <!-- 导航栏 -->
    <view class="sticky top-0 z-40 bg-card border-b border-border pt-safe">
      <view class="flex items-center justify-between px-4 h-14">
        <view @tap="goBack" class="p-2 -ml-2 rounded-full active:bg-secondary">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </view>
        <text class="font-semibold text-foreground">创作者中心</text>
        <view @tap="handleRefresh" :class="['p-2 -mr-2 rounded-full active:bg-secondary', refreshing ? 'animate-spin' : '']">
          <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="h-24 bg-secondary rounded-2xl animate-pulse" />
      </view>
      <view class="h-12 bg-secondary rounded-2xl animate-pulse" />
      <view v-for="i in 3" :key="i" class="h-24 bg-secondary rounded-2xl animate-pulse" />
    </view>

    <view v-else>
      <!-- 概览4宫格 -->
      <view class="p-4 grid grid-cols-2 gap-3">
        <!-- 内容数 -->
        <view class="rounded-2xl p-4 border border-white/50 bg-gradient-to-br from-primary/10 to-primary/5">
          <view class="flex items-center justify-between mb-2">
            <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <text :class="['text-xs font-medium', mockOverview.contentsGrowth >= 0 ? 'text-green-600' : 'text-red-500']">{{ mockOverview.contentsGrowth >= 0 ? '+' : '' }}{{ mockOverview.contentsGrowth }}%</text>
          </view>
          <text class="text-xl font-bold text-foreground block">{{ mockOverview.contents }}</text>
          <text class="text-xs text-muted-foreground mt-1 block">内容数</text>
        </view>
        <!-- 总阅读 -->
        <view class="rounded-2xl p-4 border border-white/50 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <view class="flex items-center justify-between mb-2">
            <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <text :class="['text-xs font-medium', mockOverview.viewsGrowth >= 0 ? 'text-green-600' : 'text-red-500']">{{ mockOverview.viewsGrowth >= 0 ? '+' : '' }}{{ mockOverview.viewsGrowth }}%</text>
          </view>
          <text class="text-xl font-bold text-foreground block">{{ mockOverview.totalViews.toLocaleString() }}</text>
          <text class="text-xs text-muted-foreground mt-1 block">总阅读</text>
        </view>
        <!-- 总收益 -->
        <view class="rounded-2xl p-4 border border-white/50 bg-gradient-to-br from-accent/20 to-accent/5">
          <view class="flex items-center justify-between mb-2">
            <svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <text :class="['text-xs font-medium', mockOverview.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-500']">{{ mockOverview.revenueGrowth >= 0 ? '+' : '' }}{{ mockOverview.revenueGrowth }}%</text>
          </view>
          <text class="text-xl font-bold text-foreground block">¥{{ mockOverview.totalRevenue.toFixed(2) }}</text>
          <text class="text-xs text-muted-foreground mt-1 block">总收益</text>
        </view>
        <!-- 粉丝数 -->
        <view class="rounded-2xl p-4 border border-white/50 bg-gradient-to-br from-chart-4/10 to-chart-4/5">
          <view class="flex items-center justify-between mb-2">
            <svg class="w-5 h-5 text-chart-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <text :class="['text-xs font-medium', mockOverview.followersGrowth >= 0 ? 'text-green-600' : 'text-red-500']">{{ mockOverview.followersGrowth >= 0 ? '+' : '' }}{{ mockOverview.followersGrowth }}%</text>
          </view>
          <text class="text-xl font-bold text-foreground block">{{ mockOverview.followers.toLocaleString() }}</text>
          <text class="text-xs text-muted-foreground mt-1 block">粉丝数</text>
        </view>
      </view>

      <!-- Tab 导航 -->
      <view class="mx-4 mb-3 bg-card rounded-2xl p-1 flex">
        <view
          v-for="tab in tabs" :key="tab.key"
          @tap="activeTab = tab.key"
          :class="['flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-medium transition-all', activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground']"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- 内容 Tab -->
      <view v-if="activeTab === 'content'" class="px-4 flex flex-col gap-3">
        <view v-for="content in mockContents" :key="content.id" class="bg-card rounded-2xl p-4 relative">
          <view class="flex gap-3">
            <view v-if="content.hasCover" class="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 shrink-0" />
            <view class="flex-1 min-w-0">
              <view class="flex items-start justify-between">
                <text class="font-medium text-foreground text-sm leading-relaxed pr-6 line-clamp-2">{{ content.title }}</text>
                <view @tap="toggleMenu(content.id)" class="p-1 -mr-1 -mt-1 shrink-0">
                  <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </view>
              </view>
              <view class="flex items-center gap-2 mt-2">
                <text :class="['px-2 py-0.5 rounded-full text-xs', statusConfig(content.status).cls]">{{ statusConfig(content.status).text }}</text>
                <text class="text-xs text-muted-foreground">{{ content.type === 'article' ? '文章' : '帖子' }}</text>
              </view>
              <view v-if="content.status === 'published'" class="flex items-center gap-4 mt-2">
                <view class="flex items-center gap-1">
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <text class="text-xs text-muted-foreground">{{ content.views }}</text>
                </view>
                <view class="flex items-center gap-1">
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <text class="text-xs text-muted-foreground">{{ content.likes }}</text>
                </view>
                <view class="flex items-center gap-1">
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <text class="text-xs text-muted-foreground">{{ content.comments }}</text>
                </view>
                <text v-if="content.revenue > 0" class="text-xs text-accent font-medium">¥{{ content.revenue }}</text>
              </view>
            </view>
          </view>
          <!-- 操作菜单 -->
          <view v-if="showMenu === content.id" class="absolute right-4 top-12 bg-card rounded-xl shadow-lg border border-border py-1 z-10 min-w-24">
            <view @tap="goEdit(content.id)" class="flex items-center gap-2 px-4 py-2.5 active:bg-secondary">
              <svg class="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <text class="text-sm text-foreground">编辑</text>
            </view>
            <view @tap="showMenu = null" class="flex items-center gap-2 px-4 py-2.5 active:bg-red-50">
              <svg class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              <text class="text-sm text-red-500">删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 数据 Tab -->
      <view v-if="activeTab === 'analytics'" class="px-4 flex flex-col gap-4">
        <view class="bg-card rounded-2xl p-4">
          <text class="font-medium text-foreground block mb-4">近30天阅读趋势</text>
          <view class="h-40 flex items-end gap-0.5">
            <view v-for="(item, i) in mockRevenueTrends" :key="i" class="flex-1 flex flex-col justify-end h-full">
              <view :class="['w-full rounded-t', i === 29 ? 'bg-primary' : 'bg-primary/30']" :style="{ height: `${(item.revenue / maxRevenue) * 100}%` }" />
            </view>
          </view>
          <view class="flex justify-between mt-2">
            <text class="text-xs text-muted-foreground">30天前</text>
            <text class="text-xs text-muted-foreground">今天</text>
          </view>
        </view>
        <view class="bg-card rounded-2xl p-4">
          <text class="font-medium text-foreground block mb-4">内容表现 TOP5</text>
          <view class="flex flex-col gap-3">
            <view v-for="(content, idx) in mockContents.filter(c => c.status === 'published').slice(0, 5)" :key="content.id" class="flex items-center gap-3">
              <view :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', idx === 0 ? 'bg-accent' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-secondary text-muted-foreground']">
                <text>{{ idx + 1 }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm text-foreground truncate block">{{ content.title }}</text>
                <text class="text-xs text-muted-foreground">{{ content.views.toLocaleString() }} 阅读</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 收益 Tab -->
      <view v-if="activeTab === 'revenue'" class="px-4 flex flex-col gap-4">
        <view class="bg-gradient-to-br from-accent to-[#B8956A] rounded-2xl p-4 text-white">
          <text class="text-sm opacity-80 block">累计收益</text>
          <text class="text-3xl font-bold mt-1 block">¥{{ mockOverview.totalRevenue.toFixed(2) }}</text>
          <view class="flex items-center gap-8 mt-4 text-sm">
            <view>
              <text class="opacity-80 block">可提现</text>
              <text class="font-semibold block">¥2,180.00</text>
            </view>
            <view>
              <text class="opacity-80 block">待结算</text>
              <text class="font-semibold block">¥1,500.50</text>
            </view>
          </view>
          <view class="mt-4 bg-white/20 rounded-xl py-2.5 text-center active:bg-white/30">
            <text class="text-sm font-medium text-white">提现</text>
          </view>
        </view>
        <view class="bg-card rounded-2xl p-4">
          <text class="font-medium text-foreground block mb-4">收益趋势（近14天）</text>
          <view class="h-32 flex items-end gap-0.5">
            <view v-for="(item, i) in mockRevenueTrends.slice(-14)" :key="i" class="flex-1 flex flex-col justify-end h-full">
              <view class="w-full bg-accent rounded-t" :style="{ height: `${(item.revenue / maxRevenue) * 100}%` }" />
            </view>
          </view>
        </view>
        <view class="bg-card rounded-2xl p-4">
          <text class="font-medium text-foreground block mb-4">收益构成</text>
          <view class="flex flex-col gap-3">
            <view v-for="item in [{ name: '打赏收入', value: 1580, percent: 43, color: 'bg-primary' }, { name: '付费内容', value: 1200, percent: 33, color: 'bg-accent' }, { name: '课程分成', value: 900, percent: 24, color: 'bg-blue-500' }]" :key="item.name">
              <view class="flex justify-between text-sm mb-1">
                <text class="text-muted-foreground">{{ item.name }}</text>
                <text class="text-foreground font-medium">¥{{ item.value }}</text>
              </view>
              <view class="h-2 bg-secondary rounded-full overflow-hidden">
                <view :class="['h-full rounded-full', item.color]" :style="{ width: `${item.percent}%` }" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 互动 Tab -->
      <view v-if="activeTab === 'interaction'" class="px-4 flex flex-col gap-4">
        <view class="bg-card rounded-2xl p-4">
          <view class="flex items-center justify-between mb-4">
            <text class="font-medium text-foreground">新增粉丝</text>
            <text class="text-sm text-primary">+12 本周</text>
          </view>
          <view class="flex flex-col gap-3">
            <view v-for="follower in mockFollowers" :key="follower.id" class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 shrink-0" />
              <view class="flex-1">
                <text class="text-sm font-medium text-foreground block">{{ follower.name }}</text>
                <text class="text-xs text-muted-foreground">{{ follower.followedAt }} 关注</text>
              </view>
              <view v-if="follower.hasInteracted" class="px-2 py-0.5 bg-chart-4/10 rounded-full">
                <text class="text-xs text-chart-4">已互动</text>
              </view>
            </view>
          </view>
        </view>
        <view class="bg-card rounded-2xl p-4">
          <text class="font-medium text-foreground block mb-4">互动统计</text>
          <view class="grid grid-cols-3 gap-4 text-center">
            <view><text class="text-2xl font-bold text-foreground block">156</text><text class="text-xs text-muted-foreground mt-1 block">收到点赞</text></view>
            <view><text class="text-2xl font-bold text-foreground block">42</text><text class="text-xs text-muted-foreground mt-1 block">收到评论</text></view>
            <view><text class="text-2xl font-bold text-foreground block">18</text><text class="text-xs text-muted-foreground mt-1 block">被转发</text></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 浮动新建按钮 -->
    <view @tap="goCreate" class="fixed right-4 bottom-20 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center active:scale-95">
      <svg class="w-6 h-6 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </view>

    <view class="pb-safe" />
  </view>
</template>
