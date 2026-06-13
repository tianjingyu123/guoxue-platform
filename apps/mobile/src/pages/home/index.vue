<!-- 首页 - 100% 对照 React app/page.tsx | UniApp Vue3 + Tailwind 纯内联 | 无style块/无emoji/无BEM -->
<template>
  <view class="min-h-screen bg-background pb-20">

    <!-- 顶部 Header（固定）-->
    <view class="fixed top-0 left-0 right-0 z-40 bg-background/95 border-b border-border">
      <!-- 搜索栏 + 通知 -->
      <view class="flex items-center gap-3 px-4 pt-safe pb-0 h-14">
        <view @tap="navTo('/pages/search/index')"
          class="flex-1 flex items-center gap-2 h-9 px-3 rounded-full bg-secondary">
          <svg class="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <view class="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10">
            <svg class="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/>
            </svg>
            <text class="text-xs text-primary font-medium">AI</text>
          </view>
          <text class="text-sm text-muted-foreground">搜索内容...</text>
        </view>
        <view @tap="navTo('/pages/notifications/index')" class="relative p-2 rounded-full">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <view v-if="hasUnread" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        </view>
      </view>

      <!-- 内容 Tab -->
      <scroll-view scroll-x class="flex border-t border-border/50">
        <view class="flex px-2">
          <view v-for="tab in tabs" :key="tab.name"
            @tap="activeTab = tab.name"
            class="relative px-3 py-2.5 shrink-0">
            <text :class="activeTab === tab.name
              ? 'text-sm font-semibold text-foreground'
              : 'text-sm text-muted-foreground'">{{ tab.name }}</text>
            <view v-if="activeTab === tab.name"
              class="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
          </view>
          <view @tap="navTo('/pages/publish/index')"
            class="flex items-center justify-center px-3 py-2 ml-1">
            <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区（顶部偏移）-->
    <view class="pt-24">

      <!-- Banner 轮播 -->
      <view class="mx-4 mb-4">
        <swiper class="h-40 rounded-2xl overflow-hidden"
          :autoplay="true" :interval="4000" :circular="true"
          :indicator-dots="true"
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#ffffff">
          <swiper-item v-for="banner in banners" :key="banner.id">
            <view @tap="navTo(banner.link)" class="relative w-full h-full">
              <image class="w-full h-full" :src="banner.imageUrl" mode="aspectFill" />
              <view class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <view class="absolute bottom-3 left-4">
                <text class="text-white font-semibold text-sm block">{{ banner.title }}</text>
                <text v-if="banner.subtitle" class="text-white/80 text-xs">{{ banner.subtitle }}</text>
              </view>
            </view>
          </swiper-item>
        </swiper>
      </view>

      <!-- 10宫格快捷入口 -->
      <view class="mx-4 mb-4 p-3 rounded-2xl bg-card border border-border">
        <view class="grid grid-cols-5 gap-3">
          <view v-for="entry in quickEntries" :key="entry.id"
            @tap="navTo(entry.link)"
            class="flex flex-col items-center gap-1.5">
            <view class="relative w-11 h-11 rounded-xl flex items-center justify-center"
              :style="{ backgroundColor: entry.bgColor }">
              <!-- SVG 图标 -->
              <view :style="{ color: entry.color }" v-html="entry.svgIcon" />
              <!-- 角标 -->
              <view v-if="entry.badge"
                :class="entry.badgeType === 'hot'
                  ? 'absolute -top-1 -right-1 px-1 py-0 rounded-full bg-destructive text-white text-[9px] font-bold leading-4'
                  : 'absolute -top-1 -right-1 px-1 py-0 rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-4'">
                {{ entry.badge }}
              </view>
            </view>
            <text class="text-[11px] text-foreground/80 text-center leading-tight">{{ entry.name }}</text>
          </view>
        </view>
      </view>

      <!-- Feed 流区域 -->
      <view class="mx-4 mb-4">
        <view class="flex items-center justify-between mb-3">
          <text class="font-semibold text-foreground">为你推荐</text>
          <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </view>

        <!-- Skeleton loading -->
        <view v-if="feedLoading" class="flex flex-col gap-3">
          <view v-for="i in 4" :key="i" class="h-24 rounded-xl bg-muted animate-pulse" />
        </view>

        <!-- Feed 卡片 -->
        <view v-else class="flex flex-col gap-3">
          <view v-for="item in feedItems" :key="item.id"
            @tap="navTo(item.link)"
            class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-secondary">
            <image v-if="item.cover" class="w-20 h-16 rounded-lg shrink-0 object-cover"
              :src="item.cover" mode="aspectFill" />
            <view class="flex-1 min-w-0 flex flex-col justify-between">
              <text class="text-sm font-medium text-foreground line-clamp-2 leading-snug">{{ item.title }}</text>
              <view class="flex items-center gap-2 mt-1">
                <image class="w-4 h-4 rounded-full" :src="item.avatar" />
                <text class="text-xs text-muted-foreground truncate">{{ item.author }}</text>
                <text class="text-xs text-muted-foreground ml-auto">{{ item.time }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 悬浮 AI 助手 -->
    <view @tap="navTo('/pages/bots/index')"
      class="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center">
      <svg class="w-6 h-6 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <path d="M12 11V7M8 7h8M9 4h6M12 15v2"/>
      </svg>
    </view>

    <!-- 底部导航 -->
    <BottomTabBar active-tab="home" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BottomTabBar from '@/components/base/BottomTabBar.vue'

const hasUnread = ref(true)
const feedLoading = ref(false)
const activeTab = ref('推荐')

const tabs = [
  { name: '推荐' }, { name: '关注' }, { name: '热门' },
  { name: '直播' }, { name: '同城' },
]

// 10宫格入口 - 全部使用内联 SVG，无 emoji
const quickEntries = [
  {
    id: 'courses', name: '课程', link: '/pages/courses/list',
    color: '#4A90D9', bgColor: 'rgba(74,144,217,0.12)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  },
  {
    id: 'circles', name: '圈子', link: '/pages/circle/index',
    color: '#52C41A', bgColor: 'rgba(82,196,26,0.12)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    id: 'classics', name: '古籍馆', link: '/pages/classics/home',
    color: '#C9A96E', bgColor: 'rgba(201,169,110,0.12)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  },
  {
    id: 'mall', name: '商城', link: '/pages/mall/index',
    color: '#C41E3A', bgColor: 'rgba(196,30,58,0.12)', badge: '热', badgeType: 'hot',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  },
  {
    id: 'live', name: '直播', link: '/pages/live/list',
    color: '#E74C3C', bgColor: 'rgba(231,76,60,0.12)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
  },
  {
    id: 'fortune', name: '运势', link: '/pages/fortune/index',
    color: '#9B59B6', bgColor: 'rgba(155,89,182,0.12)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  },
  {
    id: 'paipan', name: '排盘', link: '/pages/paipan/index',
    color: '#1890FF', bgColor: 'rgba(24,144,255,0.12)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>',
  },
  {
    id: 'agents', name: '智能体', link: '/pages/agents/index',
    color: '#722ED1', bgColor: 'rgba(114,46,209,0.12)', badge: 'AI', badgeType: 'ai',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7"/><path d="M8 7h8"/><path d="M7 15h2"/><path d="M15 15h2"/></svg>',
  },
  {
    id: 'poetry', name: '诗词', link: '/pages/poetry/index',
    color: '#EB2F96', bgColor: 'rgba(235,47,150,0.12)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  },
  {
    id: 'more', name: '更多', link: '/pages/discover/index',
    color: '#666666', bgColor: 'rgba(102,102,102,0.10)',
    svgIcon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  },
]

const banners = ref([
  { id: '1', imageUrl: '/static/placeholder.svg', title: '八字命理精讲课程', subtitle: '限时优惠', link: '/pages/courses/detail?id=1' },
  { id: '2', imageUrl: '/static/placeholder.svg', title: '紫微斗数入门', subtitle: '免费学习', link: '/pages/courses/detail?id=2' },
  { id: '3', imageUrl: '/static/placeholder.svg', title: '风水堪舆实战班', subtitle: '名师主讲', link: '/pages/courses/detail?id=3' },
])

const feedItems = ref([
  { id: '1', title: '八字命理入门：什么是四柱排盘？', cover: '/static/placeholder.svg', author: '命理大师王先生', avatar: '/static/placeholder.svg', time: '2小时前', link: '/pages/article/detail?id=1' },
  { id: '2', title: '紫微斗数十二宫位详解，看懂你的命盘', cover: '/static/placeholder.svg', author: '星命学院', avatar: '/static/placeholder.svg', time: '4小时前', link: '/pages/article/detail?id=2' },
  { id: '3', title: '易经六十四卦速查手册（收藏版）', cover: '/static/placeholder.svg', author: '国学传播者', avatar: '/static/placeholder.svg', time: '昨天', link: '/pages/article/detail?id=3' },
  { id: '4', title: '2024甲辰年运势大解析，你的本命年如何应对', cover: '/static/placeholder.svg', author: '热卜官方', avatar: '/static/placeholder.svg', time: '2天前', link: '/pages/article/detail?id=4' },
])

function navTo(url: string) {
  uni.navigateTo({ url })
}
</script>
