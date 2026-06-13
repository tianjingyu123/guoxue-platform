<template>
  <view class="min-h-screen bg-background pb-20">

    <!-- 顶部固定区 -->
    <view class="sticky top-0 z-30 bg-background">

      <!-- 搜索栏 -->
      <view class="px-4 pt-12 pb-3">
        <view
          :class="[
            'flex items-center gap-3 px-4 py-2.5 rounded-full transition-all',
            searchFocused
              ? 'bg-card shadow-lg ring-2 ring-primary/20'
              : 'bg-card/80 shadow-sm'
          ]"
        >
          <!-- 搜索图标 -->
          <view class="flex-shrink-0">
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </view>
          <input
            type="text"
            v-model="searchKeyword"
            placeholder="搜索商品、课程、智能体..."
            placeholder-class="text-muted-foreground"
            class="flex-1 bg-transparent text-sm outline-none text-foreground"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @confirm="goSearch"
          />
        </view>

        <!-- 热搜词 -->
        <scroll-view scroll-x class="mt-3" show-scrollbar="false">
          <view class="flex items-center gap-2 whitespace-nowrap">
            <view class="flex items-center gap-1 flex-shrink-0">
              <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
              <text class="text-xs text-muted-foreground">热搜</text>
            </view>
            <view
              v-for="(word, i) in hotWords"
              :key="word"
              :class="[
                'flex-shrink-0 px-3 py-1 rounded-full text-xs transition-colors',
                i === 0
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-card/60 text-foreground'
              ]"
              @tap="goSearchWord(word)"
            >
              <text>{{ word }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 分类入口 8宫格 -->
      <view class="px-4 pb-4">
        <view class="grid grid-cols-4 gap-x-2 gap-y-3">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="flex flex-col items-center gap-1.5"
            @tap="navigateTo(cat.href)"
          >
            <view class="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center">
              <view v-html="cat.svg" class="w-6 h-6 text-primary" />
            </view>
            <text class="text-xs text-foreground">{{ cat.label }}</text>
          </view>
        </view>
      </view>

      <!-- 分隔线 -->
      <view class="h-2 bg-muted" />
    </view>

    <!-- 瀑布流内容 -->
    <view class="flex gap-1.5 px-1.5 py-2">
      <!-- 左列 -->
      <view class="flex-1 flex flex-col gap-1.5">
        <view
          v-for="item in leftCol"
          :key="item.data.id"
          class="bg-card rounded-xl overflow-hidden"
          @tap="onCardTap(item)"
        >
          <image
            v-if="item.data.cover"
            :src="item.data.cover"
            mode="widthFix"
            class="w-full"
          />
          <!-- 无封面（古籍类）-->
          <view v-else class="h-24 bg-primary/5 flex items-center justify-center">
            <svg class="w-8 h-8 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </view>
          <view class="px-2.5 py-2">
            <!-- 直播徽标 -->
            <view v-if="item.kind === 'live'" class="flex items-center gap-1 mb-1">
              <view class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <text class="text-[10px] text-red-500 font-medium">直播中</text>
            </view>
            <text class="text-xs font-medium text-foreground leading-snug line-clamp-2">
              {{ item.data.title || item.data.name }}
            </text>
            <view class="flex items-center gap-1.5 mt-1.5">
              <text v-if="item.data.price" class="text-sm font-semibold text-primary">
                ¥{{ item.data.price }}
              </text>
              <text
                v-if="item.data.tag"
                class="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary"
              >
                {{ item.data.tag }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 右列 -->
      <view class="flex-1 flex flex-col gap-1.5">
        <view
          v-for="item in rightCol"
          :key="item.data.id"
          class="bg-card rounded-xl overflow-hidden"
          @tap="onCardTap(item)"
        >
          <image
            v-if="item.data.cover"
            :src="item.data.cover"
            mode="widthFix"
            class="w-full"
          />
          <view v-else class="h-24 bg-primary/5 flex items-center justify-center">
            <svg class="w-8 h-8 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </view>
          <view class="px-2.5 py-2">
            <view v-if="item.kind === 'live'" class="flex items-center gap-1 mb-1">
              <view class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <text class="text-[10px] text-red-500 font-medium">直播中</text>
            </view>
            <text class="text-xs font-medium text-foreground leading-snug line-clamp-2">
              {{ item.data.title || item.data.name }}
            </text>
            <view class="flex items-center gap-1.5 mt-1.5">
              <text v-if="item.data.price" class="text-sm font-semibold text-primary">
                ¥{{ item.data.price }}
              </text>
              <text
                v-if="item.data.tag"
                class="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary"
              >
                {{ item.data.tag }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <BottomTabBar active="discover" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BottomTabBar from '@/components/base/BottomTabBar.vue'

const searchFocused = ref(false)
const searchKeyword = ref('')
const hotWords = ['八字入门', '紫微斗数', '风水罗盘', '开运水晶', '六爻占卜']

const categories = [
  {
    id: 'mall', label: '商城', href: '/pages/mall/index',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
  },
  {
    id: 'course', label: '课程', href: '/pages/courses/list',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
  },
  {
    id: 'agent', label: '智能体', href: '/pages/agents/index',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V5"/><circle cx="12" cy="4" r="1"/><path d="M7 16h.01M12 16h.01M17 16h.01"/></svg>'
  },
  {
    id: 'classics', label: '古籍', href: '/pages/classics/home',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  },
  {
    id: 'video', label: '视频', href: '/pages/videos/index',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
  },
  {
    id: 'live', label: '直播', href: '/pages/live/list',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>'
  },
  {
    id: 'flash', label: '秒杀', href: '/pages/flash-sale/index',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  },
  {
    id: 'rank', label: '榜单', href: '/pages/rankings/index',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>'
  },
]

type FeedKind = 'product' | 'course' | 'live' | 'agent' | 'classic' | 'video'
interface FeedItem { kind: FeedKind; data: any }

const feedItems: FeedItem[] = [
  { kind: 'product', data: { id: 'p1', title: '天然黑曜石貔貅手链 招财转运', cover: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80', price: 128, originalPrice: 268, sales: 2600, tag: '热销' } },
  { kind: 'agent', data: { id: 'a1', name: '八字命理大师', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80', description: '精准分析四柱八字，解读事业财运婚姻', useCount: 128000, rating: 4.9, tag: 'HOT' } },
  { kind: 'course', data: { id: 'c1', title: '紫微斗数入门到精通', cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', teacher: '林道长', price: 199, originalPrice: 399, students: 3200, tag: '系统课' } },
  { kind: 'live', data: { id: 'l1', title: '八字实战：如何看婚姻宫', cover: 'https://images.unsplash.com/photo-1557425493-6f90ae4659fc?w=400&q=80', host: '易学张老师', viewers: 13000, status: 'live' } },
  { kind: 'classic', data: { id: 'b1', title: '渊海子平', cover: '', author: '徐子平', dynasty: '宋', description: '命理学开山之作', isFree: true, readers: 62000 } },
  { kind: 'video', data: { id: 'v1', title: '一分钟看懂你的命宫主星', cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80', author: '紫微门人', plays: 286000, duration: '01:23' } },
  { kind: 'product', data: { id: 'p2', title: '专业风水罗盘 纯铜精工', cover: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&q=80', price: 298, originalPrice: 598, sales: 890, tag: '秒杀' } },
  { kind: 'agent', data: { id: 'a2', name: '周易占卜师', cover: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80', description: '六爻起卦断事，趋吉避凶', useCount: 86000, rating: 4.8, tag: '精准' } },
  { kind: 'course', data: { id: 'c2', title: '风水堪舆实战班', cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', teacher: '王大师', price: 299, originalPrice: 599, students: 1800, tag: 'TOP3' } },
  { kind: 'classic', data: { id: 'b2', title: '滴天髓', cover: '', author: '刘伯温', dynasty: '明', description: '命理学巅峰之作', hasAudio: true, readers: 45000 } },
  { kind: 'live', data: { id: 'l2', title: '开运水晶专场 限量秒杀', cover: 'https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=400&q=80', host: '福缘阁主', reservations: 328, status: 'upcoming' } },
  { kind: 'video', data: { id: 'v2', title: '客厅财位怎么找？三步定位法', cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80', author: '风水王老师', plays: 563000, duration: '02:45' } },
  { kind: 'product', data: { id: 'p3', title: '开光五帝钱挂件 镇宅化煞', cover: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', price: 58, originalPrice: 128, sales: 4500, tag: '新品' } },
]

const leftCol = computed(() => feedItems.filter((_, i) => i % 2 === 0))
const rightCol = computed(() => feedItems.filter((_, i) => i % 2 === 1))

const routeMap: Record<FeedKind, (id: string) => string> = {
  product: id => `/pages/mall/product?id=${id}`,
  course: id => `/pages/courses/detail?id=${id}`,
  live: id => `/pages/live/room?id=${id}`,
  agent: id => `/pages/agents/chat?id=${id}`,
  classic: id => `/pages/classics/detail?id=${id}`,
  video: id => `/pages/videos/detail?id=${id}`,
}

function onCardTap(item: FeedItem) {
  uni.navigateTo({ url: routeMap[item.kind](item.data.id) })
}
function navigateTo(href: string) { uni.navigateTo({ url: href }) }
function goSearch() {
  if (searchKeyword.value.trim()) uni.navigateTo({ url: `/pages/search/index?q=${searchKeyword.value}` })
}
function goSearchWord(word: string) {
  uni.navigateTo({ url: `/pages/search/index?q=${word}` })
}
</script>
