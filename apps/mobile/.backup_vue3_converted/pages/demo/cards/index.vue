<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack">
            <text>←</text>
          </view>
          <text class="font-bold text-lg">卡片组件演示</text>
        </view>
      </view>
    </view>

    <view class="pb-20">
      <!-- 文章/帖子卡片演示 -->
      <view class="px-4 py-4">
        <text class="text-lg font-bold mb-3 block">文章/帖子卡片</text>
        <text class="text-sm text-muted-foreground mb-4 block">
          支持无图、单图(横/竖/方)、多图(2-9张)等多种素材情况，自动适配展示
        </text>

        <!-- 变体切换 -->
        <scroll-view scroll-x class="flex gap-2 mb-4 pb-2">
          <view
            v-for="v in contentVariants"
            :key="v.value"
            class="shrink-0 px-3 py-1.5 text-xs rounded-lg border"
            :class="contentVariant === v.value ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'"
            @click="contentVariant = v.value"
          >
            <text>{{ getVariantIcon(v.value) }} {{ v.label }}</text>
          </view>
        </scroll-view>

        <!-- 卡片展示 - Feed瀑布流 -->
        <view v-if="contentVariant === 'feed'" class="grid grid-cols-2 gap-2">
          <view v-for="item in allContentItems" :key="item.id" class="bg-white rounded-xl border border-border overflow-hidden">
            <view v-if="item.images && item.images.length > 0" class="aspect-video bg-secondary flex items-center justify-center">
              <text></text>
            </view>
            <view class="p-3">
              <text class="text-sm font-medium line-clamp-2 block">{{ item.title }}</text>
              <view class="flex items-center gap-2 mt-2">
                <text class="text-xs text-muted-foreground">{{ item.author?.name }}</text>
                <text class="text-xs text-muted-foreground">{{ item.views }}次</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 卡片展示 - List列表 -->
        <view v-if="contentVariant === 'list'" class="space-y-2">
          <view v-for="item in allContentItems" :key="item.id" class="flex gap-3 bg-white rounded-xl border border-border p-3">
            <view v-if="item.images && item.images.length > 0" class="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <text></text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium line-clamp-2 block">{{ item.title }}</text>
              <text v-if="item.content" class="text-xs text-muted-foreground line-clamp-1 mt-1 block">{{ item.content }}</text>
              <view class="flex items-center gap-2 mt-2">
                <text class="text-xs text-muted-foreground">{{ item.author?.name }}</text>
                <text class="text-xs text-muted-foreground">❤ {{ item.likes }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 卡片展示 - Compact紧凑 -->
        <view v-if="contentVariant === 'compact'" class="divide-y divide-border">
          <view v-for="item in allContentItems" :key="item.id" class="flex items-center justify-between py-3 px-1">
            <view class="flex-1 min-w-0">
              <text class="text-sm line-clamp-1 block">{{ item.title }}</text>
              <text class="text-xs text-muted-foreground">{{ item.author?.name }} · {{ item.views }}次</text>
            </view>
            <view v-if="item.images && item.images.length > 0" class="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0 ml-3">
              <text class="text-xs"></text>
            </view>
          </view>
        </view>

        <!-- 卡片展示 - Text-only纯文字 -->
        <view v-if="contentVariant === 'text-only'" class="space-y-2">
          <view v-for="item in allContentItems" :key="item.id" class="bg-white rounded-xl border border-border p-4">
            <text class="text-sm font-medium line-clamp-2 block">{{ item.title }}</text>
            <text v-if="item.content" class="text-xs text-muted-foreground line-clamp-2 mt-2 block">{{ item.content }}</text>
            <view class="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <text>{{ item.author?.name }}</text>
              <text>❤ {{ item.likes }}</text>
              <text> {{ item.comments }}</text>
            </view>
          </view>
        </view>

        <!-- 卡片展示 - Featured精选大图 -->
        <view v-if="contentVariant === 'featured'" class="space-y-3">
          <view v-for="item in featuredItems" :key="item.id" class="bg-white rounded-xl border border-border overflow-hidden">
            <view class="aspect-video bg-secondary flex items-center justify-center relative">
              <text class="text-4xl"></text>
              <view class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <text class="text-white text-base font-bold line-clamp-2 block">{{ item.title }}</text>
              </view>
            </view>
            <view class="p-3">
              <view class="flex items-center gap-3 text-xs text-muted-foreground">
                <text>{{ item.author?.name }}</text>
                <text>❤ {{ item.likes }}</text>
                <text> {{ item.comments }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 视频卡片演示 -->
      <view class="px-4 py-4 border-t border-border mt-4">
        <text class="text-lg font-bold mb-3 block">视频卡片</text>
        <text class="text-sm text-muted-foreground mb-4 block">
          支持横版(16:9)、竖版(9:16)、方形(1:1)三种视频比例自动适配
        </text>

        <!-- 变体切换 -->
        <scroll-view scroll-x class="flex gap-2 mb-4 pb-2">
          <view
            v-for="v in videoVariants"
            :key="v.value"
            class="shrink-0 px-3 py-1.5 text-xs rounded-lg border"
            :class="videoVariant === v.value ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'"
            @click="videoVariant = v.value"
          >
            <text>{{ getVariantIcon(v.value) }} {{ v.label }}</text>
          </view>
        </scroll-view>

        <!-- 视频Feed -->
        <view v-if="videoVariant === 'feed'" class="grid grid-cols-2 gap-2">
          <view v-for="item in mockVideos" :key="item.id" class="bg-white rounded-xl border border-border overflow-hidden">
            <view class="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative">
              <text class="text-white text-2xl">▶</text>
              <text class="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">{{ item.duration }}</text>
            </view>
            <view class="p-2">
              <text class="text-xs font-medium line-clamp-2 block">{{ item.title }}</text>
              <view class="flex items-center gap-2 mt-1">
                <text class="text-[10px] text-muted-foreground">{{ item.author?.name }}</text>
                <text class="text-[10px] text-muted-foreground">{{ formatCount(item.plays) }}次</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 视频List -->
        <view v-if="videoVariant === 'list'" class="space-y-2">
          <view v-for="item in mockVideos" :key="item.id" class="flex gap-3 bg-white rounded-xl border border-border p-3">
            <view class="w-28 h-16 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0 relative">
              <text class="text-white">▶</text>
              <text class="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">{{ item.duration }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium line-clamp-2 block">{{ item.title }}</text>
              <view class="flex items-center gap-2 mt-1">
                <text class="text-xs text-muted-foreground">{{ item.author?.name }}</text>
                <text class="text-xs text-muted-foreground">❤ {{ item.likes }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 视频Rail横滑 -->
        <view v-if="videoVariant === 'rail'" class="flex gap-2 overflow-x-auto pb-2">
          <view v-for="item in mockVideos" :key="item.id" class="w-36 shrink-0 bg-white rounded-xl border border-border overflow-hidden">
            <view class="aspect-[9/16] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative">
              <text class="text-white">▶</text>
              <text class="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">{{ item.duration }}</text>
            </view>
            <view class="p-2">
              <text class="text-xs font-medium line-clamp-1 block">{{ item.title }}</text>
              <text class="text-[10px] text-muted-foreground">{{ formatCount(item.plays) }}次</text>
            </view>
          </view>
        </view>

        <!-- 视频Fullscreen全屏竖版 -->
        <view v-if="videoVariant === 'fullscreen'" class="space-y-3">
          <view v-for="item in verticalVideos" :key="item.id" class="bg-white rounded-xl border border-border overflow-hidden">
            <view class="aspect-[9/16] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative">
              <text class="text-white text-3xl">▶</text>
              <view class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <text class="text-white text-sm font-bold block">{{ item.title }}</text>
                <view class="flex items-center gap-2 mt-1">
                  <text class="text-white/80 text-xs">{{ item.author?.name }}</text>
                  <text class="text-white/80 text-xs">{{ formatCount(item.plays) }}次</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 素材适配说明 -->
      <view class="px-4 py-4 border-t border-border mt-4">
        <text class="text-lg font-bold mb-3 block">素材适配规则</text>
        <view class="space-y-4 text-sm">
          <view class="p-3 bg-secondary rounded-lg">
            <text class="font-medium mb-2 block">图片适配</text>
            <view class="space-y-1 text-muted-foreground">
              <text class="block">• 无图：显示文字摘要或渐变背景</text>
              <text class="block">• 单图横版(16:9/4:3)：保持比例，aspect-video</text>
              <text class="block">• 单图竖版(9:16/3:4)：保持比例，限制最大宽度70%</text>
              <text class="block">• 单图方形(1:1)：保持比例，限制最大宽度80%</text>
              <text class="block">• 2张图：2列并排，各占50%</text>
              <text class="block">• 3张图：1大+2小布局</text>
              <text class="block">• 4张图：2x2网格</text>
              <text class="block">• 5-9张图：3列网格，超出显示+N</text>
            </view>
          </view>
          <view class="p-3 bg-secondary rounded-lg">
            <text class="font-medium mb-2 block">视频适配</text>
            <view class="space-y-1 text-muted-foreground">
              <text class="block">• 横版视频(16:9)：标准视频比例</text>
              <text class="block">• 竖版视频(9:16)：短视频/全屏模式</text>
              <text class="block">• 方形视频(1:1)：社交媒体常见</text>
              <text class="block">• 自动根据封面/视频比例检测</text>
            </view>
          </view>
          <view class="p-3 bg-secondary rounded-lg">
            <text class="font-medium mb-2 block">卡片变体</text>
            <view class="space-y-1 text-muted-foreground">
              <text class="block">• feed：瀑布流/网格竖卡，首页/发现页</text>
              <text class="block">• list：横向列表卡，搜索结果/收藏</text>
              <text class="block">• compact：紧凑卡片，侧边栏/相关推荐</text>
              <text class="block">• rail：横滑小卡，推荐栏</text>
              <text class="block">• featured：精选大图，首页Banner</text>
              <text class="block">• text-only：纯文字卡片</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }

interface ContentItem {
  id: string
  type?: string
  title: string
  content?: string
  images?: { url: string; ratio?: string }[]
  author?: { name: string }
  circle?: { id: string; name: string }
  views?: number
  likes?: number
  comments?: number
  isFeatured?: boolean
}

interface VideoItem {
  id: string
  title: string
  cover?: string
  videoRatio?: string
  author?: { name: string }
  plays: number
  likes: number
  comments?: number
  duration: string
}

const contentVariants = [
  { value: 'feed', label: '瀑布流' },
  { value: 'list', label: '列表' },
  { value: 'compact', label: '紧凑' },
  { value: 'text-only', label: '纯文字' },
  { value: 'featured', label: '精选大图' },
]

const videoVariants = [
  { value: 'feed', label: '瀑布流' },
  { value: 'list', label: '列表' },
  { value: 'rail', label: '横滑' },
  { value: 'fullscreen', label: '全屏竖版' },
]

const mockArticles: ContentItem[] = [
  { id: 'a1', type: 'article', title: '八字命理入门：如何理解天干地支的基本概念与应用', content: '八字命理，又称四柱命理，是中国传统命理学的重要分支...', author: { name: '周易大师' }, views: 8560, likes: 1280, comments: 128 },
  { id: 'a2', type: 'article', title: '风水布局的五大禁忌，你家中了几条？', images: [{ url: '', ratio: 'horizontal' }], author: { name: '陈风水' }, views: 12800, likes: 2560, comments: 256, isFeatured: true },
  { id: 'a3', type: 'article', title: '紫微斗数详解：十四主星的性格特征', images: [{ url: '', ratio: 'vertical' }], author: { name: '紫微先生' }, views: 6800, likes: 980, comments: 86 },
  { id: 'a4', type: 'article', title: '易经六十四卦图解：乾卦与坤卦的深度解读', images: [{ url: '' }, { url: '' }], author: { name: '易学研究' }, views: 5600, likes: 780, comments: 64 },
  { id: 'a5', type: 'article', title: '2024甲辰年运势解析：十二生肖全年运程', images: [{ url: '' }, { url: '' }, { url: '' }], author: { name: '运势分析师' }, views: 28600, likes: 5680, comments: 568, isFeatured: true },
  { id: 'a6', type: 'article', title: '线下活动回顾：第三届国学文化交流会精彩瞬间', images: [{ url: '' }, { url: '' }, { url: '' }, { url: '' }, { url: '' }, { url: '' }], author: { name: '活动组委会' }, views: 18600, likes: 3280, comments: 286 },
]

const mockPosts: ContentItem[] = [
  { id: 'p1', type: 'post', title: '请问各位老师，八字中食神制杀格局应该如何理解？', content: '最近在学习八字，看到一个命盘是食神制杀格局...', author: { name: '学习中的小白' }, views: 560, likes: 45, comments: 28 },
  { id: 'p2', type: 'post', title: '今日排盘分享，请大家帮忙看看这个八字格局', images: [{ url: '', ratio: 'square' }], author: { name: '命理爱好者' }, views: 1280, likes: 86, comments: 45 },
  { id: 'p3', type: 'post', title: '家里新装修，请各位风水老师帮忙看看布局有什么问题', images: [{ url: '' }, { url: '' }, { url: '' }, { url: '' }], author: { name: '新房业主' }, views: 2560, likes: 168, comments: 86 },
]

const mockVideos: VideoItem[] = [
  { id: 'v1', title: '八字入门第一课：什么是天干地支', videoRatio: 'horizontal', author: { name: '周易大师' }, plays: 28600, likes: 1860, duration: '15:32' },
  { id: 'v2', title: '一分钟看懂你的本命年运势', videoRatio: 'vertical', author: { name: '运势小助手' }, plays: 168000, likes: 28600, comments: 1860, duration: '00:58' },
  { id: 'v3', title: '易经智慧：如何用卦象指导人生选择', videoRatio: 'square', author: { name: '易学教授' }, plays: 8600, likes: 986, duration: '08:45' },
]

const contentVariant = ref('feed')
const videoVariant = ref('feed')

const allContentItems = computed(() => [...mockArticles, ...mockPosts])
const featuredItems = computed(() => mockArticles.filter((a) => a.isFeatured))
const verticalVideos = computed(() => mockVideos.filter((v) => v.videoRatio === 'vertical'))

function formatCount(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

function getVariantIcon(v: string): string {
  const icons: Record<string, string> = { feed: '🧩', list: '', compact: '', 'text-only': '', featured: '' }
  return icons[v] || ''
}
</script>

<style scoped>
/* 卡片过渡动画 */
.card-enter-active,
.card-leave-active {
  transition: all 0.3s ease;
}
.card-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

/* 变体切换按钮过渡 */
.scroll-view view {
  transition: all 0.2s ease;
}

/* 卡片悬停/点击效果 */
.bg-white.rounded-xl {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.bg-white.rounded-xl:active {
  transform: scale(0.98);
}
</style>
