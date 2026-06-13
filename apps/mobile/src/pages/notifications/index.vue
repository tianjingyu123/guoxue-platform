<template>
  <view class="min-h-screen bg-background">

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view class="flex items-center gap-3">
          <view
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
            @tap="goBack"
          >
            <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </view>
          <text class="text-lg font-semibold text-foreground">通知</text>
          <view v-if="unreadTotal > 0" class="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
            <text>{{ unreadTotal > 99 ? '99+' : unreadTotal }}</text>
          </view>
        </view>

        <view class="flex items-center gap-2">
          <!-- 刷新 -->
          <view
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
            :class="refreshing ? 'opacity-50' : ''"
            @tap="loadNotifications(true)"
          >
            <svg
              class="w-5 h-5 text-foreground"
              :class="refreshing ? 'animate-spin' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </view>

          <!-- 全部已读 -->
          <view
            class="flex items-center gap-1 px-3 py-2 rounded-full hover:bg-muted transition-colors"
            :class="unreadTotal === 0 ? 'opacity-40 pointer-events-none' : ''"
            @tap="markAllRead"
          >
            <svg class="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg class="w-4 h-4 text-foreground -ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <text class="text-sm text-foreground">全部已读</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view v-for="i in 5" :key="i" class="flex gap-3">
        <view class="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
        <view class="flex-1 space-y-2">
          <view class="h-4 w-1/3 bg-muted rounded animate-pulse" />
          <view class="h-4 w-full bg-muted rounded animate-pulse" />
          <view class="h-4 w-16 bg-muted rounded animate-pulse" />
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="notifications.length === 0" class="flex flex-col items-center justify-center py-20">
      <svg class="w-12 h-12 text-muted-foreground/30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <text class="text-muted-foreground text-sm">暂无通知</text>
    </view>

    <!-- 通知列表 -->
    <scroll-view v-else scroll-y class="divide-y divide-border">
      <view
        v-for="n in notifications"
        :key="n.id"
        :class="[
          'flex gap-3 p-4 transition-colors',
          !n.isRead ? 'bg-primary/5' : ''
        ]"
        @tap="handleTap(n)"
      >
        <!-- 图标 -->
        <view
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            typeColors[n.type]
          ]"
        >
          <view v-html="typeIcons[n.type]" class="w-5 h-5" />
        </view>

        <!-- 内容 -->
        <view class="flex-1 min-w-0">
          <view class="flex items-start justify-between gap-2">
            <view class="flex items-center gap-2">
              <text :class="['font-medium text-sm', !n.isRead ? 'text-foreground' : 'text-muted-foreground']">
                {{ n.title }}
              </text>
              <view v-if="!n.isRead" class="w-2 h-2 bg-destructive rounded-full flex-shrink-0" />
            </view>
            <text class="text-xs text-muted-foreground flex-shrink-0">{{ n.time }}</text>
          </view>
          <text
            :class="[
              'text-sm mt-1 line-clamp-2',
              !n.isRead ? 'text-foreground' : 'text-muted-foreground'
            ]"
          >
            {{ n.content }}
          </text>
          <view class="mt-2 inline-block px-2 py-0.5 text-xs bg-muted rounded text-muted-foreground">
            <text>{{ n.category }}</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="py-8 text-center">
        <text class="text-sm text-muted-foreground">已显示全部通知</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type NotifType = 'interaction' | 'system' | 'income' | 'transaction' | 'service'

interface Notification {
  id: string
  type: NotifType
  category: string
  title: string
  content: string
  time: string
  isRead: boolean
  link?: string
}

const typeColors: Record<NotifType, string> = {
  interaction: 'bg-blue-100 text-blue-600',
  system: 'bg-amber-100 text-amber-600',
  income: 'bg-green-100 text-green-600',
  transaction: 'bg-purple-100 text-purple-600',
  service: 'bg-rose-100 text-rose-600',
}

const typeIcons: Record<NotifType, string> = {
  interaction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  income: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  transaction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  service: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
}

const loading = ref(true)
const refreshing = ref(false)
const notifications = ref<Notification[]>([])
const unreadTotal = ref(0)

const mockData: Notification[] = [
  { id: '1', type: 'interaction', category: '点赞', title: '李明远 赞了你的文章', content: '《八字入门：天干地支详解》获得了点赞', time: '5分钟前', isRead: false },
  { id: '2', type: 'interaction', category: '评论', title: '王易山 评论了你', content: '这篇分析写得很好，建议加上实际案例对比', time: '10分钟前', isRead: false },
  { id: '3', type: 'system', category: '活动通知', title: '限时秒杀即将开始', content: '《紫微斗数入门》今晚8点限时5折，仅限前100名', time: '1小时前', isRead: false },
  { id: '4', type: 'income', category: '课程收益', title: '收到课程收益', content: '课程《奇门遁甲初级》新增3名学员，收益 +¥179.40', time: '2小时前', isRead: true },
  { id: '5', type: 'transaction', category: '订单', title: '订单发货通知', content: '您购买的《渊海子平》已由顺丰速运发货，单号SF1234567890', time: '昨天 14:30', isRead: true },
  { id: '6', type: 'interaction', category: '关注', title: '紫微居士 关注了你', content: '你们现在互相关注，可以互发私信了', time: '昨天 10:15', isRead: true },
  { id: '7', type: 'system', category: '会员到期', title: 'VIP会员即将到期', content: '您的VIP会员将于7天后到期，续费享8折优惠', time: '2天前', isRead: true },
  { id: '8', type: 'income', category: '打赏收入', title: '收到粉丝打赏', content: '粉丝"命理小白"给你的直播打赏了 ¥66', time: '3天前', isRead: true },
  { id: '9', type: 'service', category: '客服', title: '客服回复了你', content: '关于退款申请，已为您处理完毕，款项将在3个工作日内到账', time: '3天前', isRead: true },
  { id: '10', type: 'transaction', category: '退款', title: '退款成功通知', content: '退款 ¥128 已到账你的钱包余额', time: '4天前', isRead: true },
]

async function loadNotifications(isRefresh = false) {
  if (isRefresh) refreshing.value = true
  else loading.value = true
  await new Promise(r => setTimeout(r, 600))
  notifications.value = mockData
  unreadTotal.value = mockData.filter(n => !n.isRead).length
  loading.value = false
  refreshing.value = false
}

function handleTap(n: Notification) {
  if (!n.isRead) {
    n.isRead = true
    unreadTotal.value = Math.max(0, unreadTotal.value - 1)
  }
  if (n.link) uni.navigateTo({ url: n.link })
}

function markAllRead() {
  if (unreadTotal.value === 0) return
  notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
  unreadTotal.value = 0
  uni.showToast({ title: '已全部标记为已读', icon: 'none' })
}

function goBack() { uni.navigateBack() }
onMounted(() => loadNotifications())
</script>
