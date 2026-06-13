<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white/95 shadow-sm" style="backdrop-filter:blur(12px)">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
        <text class="text-[17px] font-semibold text-foreground">我的圈子</text>
        <view @click="goDiscover" class="text-[13px] text-primary">发现更多</view>
      </view>
    </view>

    <!-- 数据概览卡片 -->
    <view class="px-4 pt-4">
      <view class="p-4 text-white rounded-2xl" style="background:linear-gradient(135deg,#C41E3A,#A01530)">
        <view class="flex items-center justify-between mb-4">
          <text class="font-medium">我的圈子数据</text>
          <view @click="goStats" class="text-[12px] text-white/70 flex items-center">详情 ›</view>
        </view>
        <view class="grid grid-cols-4 gap-2 text-center">
          <view><text class="text-[22px] font-bold block">{{ stats.totalCircles }}</text><text class="text-[11px] text-white/70">已加入</text></view>
          <view><text class="text-[22px] font-bold block">{{ stats.totalPosts }}</text><text class="text-[11px] text-white/70">发帖数</text></view>
          <view><text class="text-[22px] font-bold block">{{ stats.totalLikes > 1000 ? (stats.totalLikes/1000).toFixed(1) + 'k' : stats.totalLikes }}</text><text class="text-[11px] text-white/70">获赞数</text></view>
          <view><text class="text-[22px] font-bold block">{{ stats.totalExp }}</text><text class="text-[11px] text-white/70">总经验</text></view>
        </view>
        <!-- 身份分布 -->
        <view class="mt-4 pt-3 flex items-center justify-around text-center" style="border-top:1px solid rgba(255,255,255,0.2)">
          <view>
            <view class="flex items-center justify-center gap-1">
              <text class="text-yellow-300 text-sm">👑</text>
              <text class="font-medium">{{ stats.asOwner }}</text>
            </view>
            <text class="text-[10px] text-white/60">圈主</text>
          </view>
          <view>
            <view class="flex items-center justify-center gap-1">
              <text class="text-blue-300 text-sm">🛡</text>
              <text class="font-medium">{{ stats.asAdmin }}</text>
            </view>
            <text class="text-[10px] text-white/60">管理员</text>
          </view>
          <view>
            <view class="flex items-center justify-center gap-1">
              <text class="text-green-300 text-sm"></text>
              <text class="font-medium">{{ stats.asMember }}</text>
            </view>
            <text class="text-[10px] text-white/60">成员</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索和筛选 -->
    <view class="px-4 pt-4">
      <view class="flex items-center gap-3 mb-3">
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input v-model="searchQuery" type="text" placeholder="搜索圈子"
            class="w-full h-9 pl-9 pr-4 bg-white rounded-full text-[13px]" style="border:1px solid rgba(232,227,219,0.6)" />
        </view>
      </view>

      <!-- 筛选Tab -->
      <scroll-view scroll-x class="flex overflow-x-auto pb-2" style="white-space:nowrap">
        <view v-for="tab in filterTabs" :key="tab.id" @click="activeFilter = tab.id"
          class="inline-flex items-center shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all mr-2 gap-1"
          :class="[activeFilter === tab.id ? 'bg-primary text-white' : 'bg-white text-ink-soft', activeFilter !== tab.id ? 'border border-border/60' : '']">
          {{ tab.label }}
          <text class="text-[10px] px-1.5 rounded-full"
            :class="activeFilter === tab.id ? 'bg-white/20' : 'bg-[#F5F0E8]'">{{ tab.count }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 圈子列表 -->
    <view class="px-4 pt-2 space-y-3">
      <template v-if="filteredCircles.length > 0">
        <view v-for="circle in filteredCircles" :key="circle.id" @click="goCircle(circle.id)"
          class="bg-white rounded-xl p-4 active:bg-[#F9F6F2] transition-colors" style="box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <view class="flex items-start gap-3">
            <!-- 圈子封面 -->
            <view class="relative">
              <image :src="circle.cover" mode="aspectFill" class="w-14 h-14 rounded-xl" />
              <view v-if="circle.unreadCount > 0"
                class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <text class="text-[10px] text-white font-medium">{{ circle.unreadCount > 99 ? '99+' : circle.unreadCount }}</text>
              </view>
            </view>
            <!-- 圈子信息 -->
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-medium text-[15px] text-foreground truncate">{{ circle.name }}</text>
                <text class="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap"
                  :class="roleConfig[circle.role as keyof typeof roleConfig]?.class">
                  {{ roleConfig[circle.role as keyof typeof roleConfig]?.icon }}
                  {{ roleConfig[circle.role as keyof typeof roleConfig]?.label }}
                </text>
              </view>
              <view class="flex items-center gap-3 mt-1 text-[12px] text-muted-foreground">
                <text class="flex items-center gap-1"> {{ circle.memberCount }}人</text>
                <text v-if="circle.todayActive > 0" class="flex items-center gap-1 text-[#FF6B35]">
                   今日{{ circle.todayActive }}动态
                </text>
              </view>
              <text class="text-[12px] text-ink-soft mt-1.5 line-clamp-1 block">{{ circle.latestPost }}</text>
              <!-- 等级和经验 -->
              <view class="flex items-center gap-2 mt-2">
                <text class="text-[10px] px-1.5 py-0.5 rounded" style="background:rgba(196,30,58,0.1);color:#C41E3A">Lv.{{ circle.level }}</text>
                <view class="flex-1 h-1.5 rounded-full overflow-hidden" style="background:#F5F0E8">
                  <view class="h-full rounded-full" style="background:linear-gradient(90deg,#C41E3A,#FF6B35)" :style="{ width: ((circle.exp % 500) / 5) + '%' }" />
                </view>
                <text class="text-[10px] text-muted-foreground">{{ circle.exp }}exp</text>
              </view>
            </view>
            <!-- 右侧 -->
            <view class="flex flex-col items-end gap-2 shrink-0">
              <text class="text-[11px] text-[#BBB] whitespace-nowrap">{{ circle.lastActive }}</text>
              <text v-if="circle.role === 'owner'" class="p-1.5 rounded-lg text-ink-soft" style="background:#F5F0E8">⚙</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <view class="w-16 h-16 rounded-full flex items-center justify-center mb-4" style="background:#F5F0E8">
            <text class="text-3xl text-muted-foreground"></text>
          </view>
          <text class="text-muted-foreground text-[14px] block mb-2">暂无圈子</text>
          <view @click="goDiscover" class="text-primary text-[13px]">去发现圈子</view>
        </view>
      </template>
    </view>

    <!-- 快捷入口 -->
    <view class="px-4 pt-6 pb-4">
      <view class="grid grid-cols-3 gap-3">
        <view @click="goCreateCircle" class="bg-white rounded-xl p-4 text-center" style="box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <view class="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2" style="background:rgba(196,30,58,0.1)">
            <text class="text-lg text-primary">+</text>
          </view>
          <text class="text-[12px] text-foreground">创建圈子</text>
        </view>
        <view @click="goMyActivities" class="bg-white rounded-xl p-4 text-center" style="box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <view class="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2" style="background:rgba(255,107,53,0.1)">
            <text class="text-lg text-[#FF6B35]"></text>
          </view>
          <text class="text-[12px] text-foreground">我的活动</text>
        </view>
        <view @click="goMyBadges" class="bg-white rounded-xl p-4 text-center" style="box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <view class="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2" style="background:rgba(201,169,110,0.1)">
            <text class="text-lg text-accent"></text>
          </view>
          <text class="text-[12px] text-foreground">我的勋章</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Circle {
  id: string; name: string; cover: string; type: string; price: number; role: string
  memberCount: number; todayActive: number; latestPost: string; unreadCount: number
  lastActive: string; level: number; exp: number
}

const searchQuery = ref('')
const activeFilter = ref<string>('all')

const stats = {
  totalCircles: 4, asOwner: 1, asAdmin: 1, asMember: 2,
  totalPosts: 156, totalLikes: 2800, totalExp: 2870,
}

const myCircles: Circle[] = [
  { id: '1', name: '八字命理研习社', cover: 'https://picsum.photos/seed/circle1/200/200', type: 'paid', price: 199, role: 'owner', memberCount: 1280, todayActive: 56, latestPost: '周易大师发布了新文章《八字中的十神关系详解》', unreadCount: 5, lastActive: '10分钟前', level: 5, exp: 1280 },
  { id: '2', name: '紫微斗数学院', cover: 'https://picsum.photos/seed/circle2/200/200', type: 'paid', price: 299, role: 'admin', memberCount: 856, todayActive: 32, latestPost: '张玄风：今天的直播课程大家记得准时参加', unreadCount: 12, lastActive: '30分钟前', level: 4, exp: 960 },
  { id: '3', name: '风水堪舆交流群', cover: 'https://picsum.photos/seed/circle3/200/200', type: 'free', price: 0, role: 'member', memberCount: 2560, todayActive: 128, latestPost: '陈风水分享了一个案例《商铺选址的风水要点》', unreadCount: 0, lastActive: '1小时前', level: 3, exp: 450 },
  { id: '4', name: '易经六十四卦研习', cover: 'https://picsum.photos/seed/circle4/200/200', type: 'paid', price: 99, role: 'member', memberCount: 680, todayActive: 18, latestPost: '今日话题：乾卦与坤卦的关系', unreadCount: 3, lastActive: '2小时前', level: 2, exp: 180 },
]

const roleConfig: Record<string, { icon: string; label: string; class: string }> = {
  owner: { icon: '👑', label: '圈主', class: 'text-accent bg-accent/10' },
  admin: { icon: '🛡', label: '管理员', class: 'text-info bg-info/10' },
  member: { icon: '', label: '成员', class: 'text-success bg-success/10' },
}

const filterTabs = [
  { id: 'all', label: '全部', count: stats.totalCircles },
  { id: 'owner', label: '我创建的', count: stats.asOwner },
  { id: 'admin', label: '我管理的', count: stats.asAdmin },
  { id: 'member', label: '我加入的', count: stats.asMember },
]

const filteredCircles = computed(() => {
  return myCircles.filter(circle => {
    if (activeFilter.value !== 'all' && circle.role !== activeFilter.value) return false
    if (searchQuery.value && !circle.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
    return true
  })
})

function goBack() { uni.navigateBack() }
function goDiscover() { uni.navigateTo({ url: '/pages/circles/discover/index' }) }
function goStats() { uni.navigateTo({ url: '/pages/circles/stats/index' }) }
function goCircle(id: string) { uni.navigateTo({ url: `/pages/circles/id-detail/home/index?id=${id}` }) }
function goCreateCircle() { uni.navigateTo({ url: '/pages/circles/create/index' }) }
function goMyActivities() { uni.navigateTo({ url: '/pages/circles/activities/index' }) }
function goMyBadges() { uni.navigateTo({ url: '/pages/circles/badges/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
