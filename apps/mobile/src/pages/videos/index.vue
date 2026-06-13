<!-- 视频列表页 - 100% 对照 app/videos/page.tsx，纯Tailwind+SVG，无emoji/BEM/style -->
<template>
  <view class="min-h-screen pb-20" style="background: var(--color-background);">

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95" style="backdrop-filter: blur(8px);">
      <!-- 搜索栏 -->
      <view class="px-4 pt-3 pb-2">
        <view class="flex items-center gap-3">
          <view
            class="flex-1 flex items-center gap-2 h-10 px-4 rounded-full bg-secondary"
            @click="navigateTo('/pages/videos/search')"
          >
            <!-- Search -->
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <text class="text-muted-foreground text-sm">搜索视频、创作者</text>
          </view>
          <view
            class="w-10 h-10 rounded-full flex items-center justify-center bg-primary"
            @click="navigateTo('/pages/videos/publish')"
          >
            <!-- Plus -->
            <svg class="w-5 h-5" style="color: var(--color-primary-foreground);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="flex items-center justify-center gap-6 py-2 border-b border-border">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="relative pb-2 text-sm font-medium transition-colors"
          :style="activeTab === tab.id ? 'color: var(--color-foreground);' : 'color: var(--color-muted-foreground);'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <view
            v-if="activeTab === tab.id"
            class="absolute bottom-0 w-5 h-0.5 rounded-full"
            style="left: 50%; transform: translateX(-50%); background: var(--color-primary);"
          />
        </view>
      </view>
    </view>

    <!-- 热门话题横栏 -->
    <scroll-view scroll-x class="px-4 py-3" style="white-space: nowrap;">
      <view class="flex gap-2" style="display: inline-flex;">
        <view
          v-for="topic in hotTopics"
          :key="topic.id"
          class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style="background: rgba(196,30,58,0.1);"
          @click="navigateTo(`/pages/videos/topic?id=${topic.id}`)"
        >
          <!-- Flame -->
          <svg class="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
          <text class="text-primary text-xs font-medium">#{{ topic.name }}</text>
          <text class="text-xs" style="color: rgba(196,30,58,0.6);">{{ topic.count }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 双列瀑布流视频列表 -->
    <view class="px-2">
      <view class="flex gap-2">
        <!-- 左列 -->
        <view class="flex-1 flex flex-col gap-2">
          <view
            v-for="video in leftCol"
            :key="video.id"
            class="bg-card rounded-xl overflow-hidden"
            style="box-shadow: 0 2px 8px rgba(0,0,0,0.06);"
            @click="navigateTo(`/pages/videos/detail?id=${video.id}`)"
          >
            <!-- 封面 -->
            <view class="relative" :style="{ aspectRatio: video.aspectRatio }">
              <image
                :src="video.coverUrl"
                :alt="video.title"
                mode="aspectFill"
                class="w-full h-full"
              />
              <!-- 渐变遮罩 -->
              <view class="absolute inset-0" style="background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);" />
              <!-- 热门标签 -->
              <view v-if="video.isHot" class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded" style="background: #FF6B35;">
                <!-- TrendingUp -->
                <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
                <text class="text-white text-xs font-medium">热门</text>
              </view>
              <!-- 带货标签 -->
              <view v-if="video.hasProduct" class="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded" style="background: linear-gradient(to right, #FF6B35, #FF9F43);">
                <!-- ShoppingBag -->
                <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <text class="text-white text-xs font-medium">带货</text>
              </view>
              <!-- 时长 -->
              <view class="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded" style="background: rgba(0,0,0,0.5);">
                <!-- Play -->
                <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="white" stroke="none">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <text class="text-white text-xs">{{ formatDuration(video.duration) }}</text>
              </view>
              <!-- 播放量 -->
              <view class="absolute bottom-2 left-2 flex items-center gap-1">
                <!-- Video -->
                <svg class="w-3 h-3" style="color: rgba(255,255,255,0.8);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <text class="text-xs" style="color: rgba(255,255,255,0.8);">{{ formatNumber(video.plays) }}</text>
              </view>
            </view>
            <!-- 信息区 -->
            <view class="p-2.5">
              <text class="text-foreground text-sm font-medium line-clamp-2 leading-tight mb-2 block">{{ video.title }}</text>
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-1.5 min-w-0">
                  <image :src="video.author.avatar" class="w-5 h-5 rounded-full flex-shrink-0" />
                  <text class="text-muted-foreground text-xs truncate">{{ video.author.name }}</text>
                </view>
                <view class="flex items-center gap-1 flex-shrink-0">
                  <!-- Heart -->
                  <svg class="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <text class="text-muted-foreground text-xs">{{ formatNumber(video.likes) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 右列 -->
        <view class="flex-1 flex flex-col gap-2">
          <view
            v-for="video in rightCol"
            :key="video.id"
            class="bg-card rounded-xl overflow-hidden"
            style="box-shadow: 0 2px 8px rgba(0,0,0,0.06);"
            @click="navigateTo(`/pages/videos/detail?id=${video.id}`)"
          >
            <!-- 封面 -->
            <view class="relative" :style="{ aspectRatio: video.aspectRatio }">
              <image
                :src="video.coverUrl"
                :alt="video.title"
                mode="aspectFill"
                class="w-full h-full"
              />
              <view class="absolute inset-0" style="background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);" />
              <view v-if="video.isHot" class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded" style="background: #FF6B35;">
                <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
                <text class="text-white text-xs font-medium">热门</text>
              </view>
              <view v-if="video.hasProduct" class="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded" style="background: linear-gradient(to right, #FF6B35, #FF9F43);">
                <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <text class="text-white text-xs font-medium">带货</text>
              </view>
              <view class="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded" style="background: rgba(0,0,0,0.5);">
                <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="white" stroke="none">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <text class="text-white text-xs">{{ formatDuration(video.duration) }}</text>
              </view>
              <view class="absolute bottom-2 left-2 flex items-center gap-1">
                <svg class="w-3 h-3" style="color: rgba(255,255,255,0.8);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <text class="text-xs" style="color: rgba(255,255,255,0.8);">{{ formatNumber(video.plays) }}</text>
              </view>
            </view>
            <!-- 信息区 -->
            <view class="p-2.5">
              <text class="text-foreground text-sm font-medium line-clamp-2 leading-tight mb-2 block">{{ video.title }}</text>
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-1.5 min-w-0">
                  <image :src="video.author.avatar" class="w-5 h-5 rounded-full flex-shrink-0" />
                  <text class="text-muted-foreground text-xs truncate">{{ video.author.name }}</text>
                </view>
                <view class="flex items-center gap-1 flex-shrink-0">
                  <svg class="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <text class="text-muted-foreground text-xs">{{ formatNumber(video.likes) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 发布视频悬浮按钮 -->
    <view
      class="fixed right-4 bottom-24 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30"
      style="background: linear-gradient(135deg, var(--color-primary), #E74C3C);"
      @click="navigateTo('/pages/videos/publish')"
    >
      <!-- Video icon -->
      <svg class="w-6 h-6" style="color: var(--color-primary-foreground);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    </view>

    <bottom-tab-bar active-tab="discover" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BottomTabBar from '@/components/base/BottomTabBar.vue'

const activeTab = ref<'follow' | 'recommend' | 'hot'>('recommend')

const tabs = [
  { id: 'follow', label: '关注' },
  { id: 'recommend', label: '推荐' },
  { id: 'hot', label: '热门' },
]

const hotTopics = [
  { id: '1', name: '八字入门', count: '128万' },
  { id: '2', name: '风水布局', count: '89万' },
  { id: '3', name: '取名改名', count: '56万' },
  { id: '4', name: '面相手相', count: '45万' },
]

const allVideos = [
  { id: '1', title: '八字命理入门：教你看懂自己的命盘 #八字 #命理入门', coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop', duration: 68, author: { name: '易学张老师', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=teacher1' }, likes: 12680, plays: 89000, hasProduct: true, isHot: true, aspectRatio: '3/4' },
  { id: '2', title: '紫微斗数：你的命宫主星是什么？', coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop', duration: 95, author: { name: '紫微林师傅', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=teacher2' }, likes: 8920, plays: 56000, hasProduct: false, isHot: false, aspectRatio: '2/3' },
  { id: '3', title: '风水布局：客厅财位怎么找？这几点必须注意', coverUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=450&fit=crop', duration: 120, author: { name: '风水大师王', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=master1' }, likes: 23500, plays: 156000, hasProduct: true, isHot: true, aspectRatio: '4/5' },
  { id: '4', title: '姓名学：名字里这几个字最旺运势！', coverUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=550&fit=crop', duration: 85, author: { name: '姓名学专家陈', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=expert1' }, likes: 45600, plays: 289000, hasProduct: true, isHot: true, aspectRatio: '3/4' },
  { id: '5', title: '奇门遁甲入门：什么是九宫八门？', coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=480&fit=crop', duration: 156, author: { name: '奇门张师傅', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=qimen' }, likes: 6780, plays: 42000, hasProduct: false, isHot: false, aspectRatio: '5/6' },
  { id: '6', title: '面相学：从眉毛看一个人的性格和运势', coverUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=520&fit=crop', duration: 78, author: { name: '面相大师李', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=face' }, likes: 18900, plays: 123000, hasProduct: true, isHot: false, aspectRatio: '3/4' },
  { id: '7', title: '六爻预测：如何起卦？新手必看教程', coverUrl: 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=400&h=600&fit=crop', duration: 145, author: { name: '六爻王老师', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuyao' }, likes: 5600, plays: 34000, hasProduct: false, isHot: false, aspectRatio: '2/3' },
  { id: '8', title: '手相入门：生命线、智慧线、感情线怎么看', coverUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=480&fit=crop', duration: 92, author: { name: '手相师小周', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=palm' }, likes: 28900, plays: 198000, hasProduct: true, isHot: true, aspectRatio: '4/5' },
]

const leftCol = computed(() => allVideos.filter((_, i) => i % 2 === 0))
const rightCol = computed(() => allVideos.filter((_, i) => i % 2 === 1))

function formatNumber(n: number): string {
  return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n)
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function navigateTo(url: string) {
  uni.navigateTo({ url })
}
</script>
