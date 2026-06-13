<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-1.5 -ml-1.5 rounded-lg" @click="goBack">
          <text class="text-lg">←</text>
        </view>
        <text class="font-medium text-base">书籍详情</text>
        <view class="p-1.5 -mr-1.5 rounded-lg" @click="handleShare">
          <text class="text-lg"></text>
        </view>
      </view>
    </view>

    <view>
      <!-- 书籍头部信息 -->
      <view class="px-4 py-5 bg-gradient-to-b from-primary/5 to-transparent">
        <view class="flex gap-4">
          <!-- 封面 -->
          <view class="relative w-28 h-40 flex-shrink-0 rounded-lg shadow-lg overflow-hidden bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0]">
            <view class="absolute left-0 top-0 bottom-0 w-2 bg-[#8B7355]/50" />
            <view class="absolute inset-0 flex items-center justify-center p-2">
              <text class="font-serif font-bold text-lg text-[#3d3225] leading-tight" style="writing-mode: vertical-rl">{{ bookDetail.title.slice(0, 6) }}</text>
            </view>
            <view v-if="bookDetail.isHot" class="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">热门</view>
          </view>

          <!-- 信息 -->
          <view class="flex-1 min-w-0 flex flex-col">
            <text class="font-bold text-lg line-clamp-2">{{ bookDetail.title }}</text>
            <text class="text-sm text-muted-foreground mt-0.5 line-clamp-1">{{ bookDetail.subtitle }}</text>

            <view class="flex items-center gap-2 mt-2" @click="goTo('#')">
              <view class="w-6 h-6 rounded-full bg-[#F2EFEA]" />
              <text class="text-sm text-muted-foreground">{{ bookDetail.author }}</text>
              <text class="text-muted-foreground">›</text>
            </view>

            <view class="flex items-center gap-3 mt-2 text-sm">
              <view class="flex items-center gap-1">
                <text class="text-amber-400"></text>
                <text class="font-medium">{{ bookDetail.rating }}</text>
              </view>
              <text class="text-muted-foreground">{{ bookDetail.reviewCount }}条评价</text>
            </view>

            <view class="flex items-center gap-2 mt-auto pt-2">
              <view v-for="tag in bookDetail.tags" :key="tag" class="px-2 py-0.5 bg-[#F2EFEA] text-xs rounded">{{ tag }}</view>
            </view>
          </view>
        </view>

        <!-- 统计数据 -->
        <view class="flex items-center justify-around mt-5 py-3 bg-white rounded-xl border border-border">
          <view class="text-center">
            <text class="text-lg font-bold">{{ (bookDetail.wordCount / 10000).toFixed(1) }}万</text>
            <text class="text-xs text-muted-foreground block">字数</text>
          </view>
          <view class="w-px h-8 bg-[#E8E0D5]" />
          <view class="text-center">
            <text class="text-lg font-bold">{{ bookDetail.pageCount }}</text>
            <text class="text-xs text-muted-foreground block">页数</text>
          </view>
          <view class="w-px h-8 bg-[#E8E0D5]" />
          <view class="text-center">
            <text class="text-lg font-bold">{{ (bookDetail.salesCount / 1000).toFixed(1) }}k</text>
            <text class="text-xs text-muted-foreground block">已购</text>
          </view>
          <view class="w-px h-8 bg-[#E8E0D5]" />
          <view class="text-center">
            <text class="text-lg font-bold">{{ bookDetail.chapters.length }}</text>
            <text class="text-xs text-muted-foreground block">章节</text>
          </view>
        </view>
      </view>

      <!-- Tab切换 -->
      <view class="mt-4">
        <view class="flex justify-start px-4 border-b border-border">
          <view
            v-for="tab in tabs"
            :key="tab.id"
            class="px-4 py-3 border-b-2"
            :class="activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent'"
            @click="activeTab = tab.id"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>

        <!-- 简介 -->
        <view v-if="activeTab === 'intro'" class="px-4 py-4 space-y-5">
          <view>
            <text class="font-medium mb-2 block">书籍简介</text>
            <text class="text-sm text-muted-foreground whitespace-pre-line leading-relaxed block">{{ bookDetail.description }}</text>
          </view>

          <!-- 作者信息 -->
          <view class="p-4 border border-border rounded-xl">
            <view class="flex items-center gap-3">
              <view class="w-12 h-12 rounded-full bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-xl"></text>
              </view>
              <view class="flex-1">
                <text class="font-medium block">{{ bookDetail.author }}</text>
                <text class="text-sm text-muted-foreground">{{ bookDetail.authorTitle }}</text>
              </view>
              <view class="px-4 py-1.5 border border-border rounded-full text-sm">关注</view>
            </view>
          </view>

          <!-- 相关推荐 -->
          <view>
            <view class="flex items-center justify-between mb-3">
              <text class="font-medium">相关推荐</text>
              <view class="text-sm text-muted-foreground flex items-center" @click="goTo('/pages/ebook/index')">
                更多 <text>›</text>
              </view>
            </view>
            <view class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              <view v-for="book in bookDetail.relatedBooks" :key="book.id" class="flex-shrink-0 w-24" @click="goTo('/pages/ebook/id-detail/index')">
                <view class="aspect-[3/4] rounded-md bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] mb-2 relative overflow-hidden">
                  <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#8B7355]/40" />
                  <view class="absolute inset-0 flex items-center justify-center">
                    <text class="font-serif font-bold text-xs text-[#3d3225]" style="writing-mode: vertical-rl">{{ book.title.slice(0, 4) }}</text>
                  </view>
                </view>
                <text class="text-xs font-medium line-clamp-1 block">{{ book.title }}</text>
                <text class="text-primary text-xs font-bold">¥{{ book.price }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 目录 -->
        <view v-if="activeTab === 'chapters'" class="px-4 py-4">
          <view class="space-y-1">
            <view
              v-for="(chapter, index) in bookDetail.chapters"
              :key="chapter.id"
              class="flex items-center justify-between p-3 rounded-lg"
              :class="chapter.isFree ? '' : 'opacity-60'"
              @click="chapter.isFree ? goTo('/pages/ebook/reader/id-detail/index') : ''"
            >
              <view class="flex items-center gap-3">
                <view class="w-6 h-6 rounded-full bg-[#F2EFEA] text-xs flex items-center justify-center text-muted-foreground">
                  <text>{{ index + 1 }}</text>
                </view>
                <text class="text-sm">{{ chapter.title }}</text>
              </view>
              <view class="flex items-center gap-2">
                <view v-if="chapter.isFree" class="px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] rounded">免费</view>
                <text class="text-xs text-muted-foreground">{{ chapter.pageCount }}页</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 评价 -->
        <view v-if="activeTab === 'reviews'" class="px-4 py-4 space-y-4">
          <view v-for="review in bookDetail.reviews" :key="review.id" class="p-4 border border-border rounded-xl">
            <view class="flex items-start gap-3">
              <view class="w-9 h-9 rounded-full bg-[#F2EFEA] flex-shrink-0 flex items-center justify-center">
                <text class="text-sm"></text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center justify-between">
                  <text class="font-medium text-sm">{{ review.user }}</text>
                  <text class="text-xs text-muted-foreground">{{ review.date }}</text>
                </view>
                <view class="flex items-center gap-0.5 mt-1">
                  <text v-for="i in 5" :key="i" class="text-xs" :class="i <= review.rating ? 'text-amber-400' : 'text-gray-200'"></text>
                </view>
                <text class="text-sm text-muted-foreground mt-2 block">{{ review.content }}</text>
                <view class="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <text></text>
                  <text>{{ review.likes }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="w-full py-3 border border-border rounded-full text-center text-sm">查看全部评价</view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 z-50">
      <view class="flex items-center gap-3 max-w-screen-lg mx-auto">
        <view @click="isFavorite = !isFavorite" class="flex flex-col items-center gap-0.5 px-2">
          <text :class="isFavorite ? 'text-red-500' : ''"></text>
          <text class="text-[10px] text-muted-foreground">收藏</text>
        </view>

        <view class="flex flex-col items-center gap-0.5 px-2">
          <text></text>
          <text class="text-[10px] text-muted-foreground">评论</text>
        </view>

        <view class="flex-1 flex gap-2">
          <view v-if="bookDetail.hasPreview" class="flex-1 h-11 border border-primary text-primary rounded-full flex items-center justify-center gap-1" @click="goTo('/pages/ebook/reader/id-detail/index?preview=true')">
            <text></text>
            <text>试读</text>
          </view>
          <view class="flex-1 h-11 bg-primary text-white rounded-full flex items-center justify-center gap-1" @click="goTo('/pages/ebook/reader/id-detail/index')">
            <text></text>
            <text>¥{{ bookDetail.price }} 购买</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
function handleShare() {
  uni.setClipboardData({ data: '书籍链接已复制', success() { uni.showToast({ title: '链接已复制', icon: 'none' }) } })
}

const isFavorite = ref(false)
const activeTab = ref('intro')

const tabs = [
  { id: 'intro', label: '简介' },
  { id: 'chapters', label: '目录' },
  { id: 'reviews', label: '评价(2340)' },
]

const bookDetail = {
  id: "1",
  title: "八字命理精解",
  subtitle: "从入门到精通的命理学习指南",
  author: "李明华",
  authorTitle: "资深命理师",
  authorAvatar: "/images/author-avatar.jpg",
  cover: "/images/ebook-cover-1.jpg",
  price: 68,
  originalPrice: 128,
  rating: 4.8,
  reviewCount: 2340,
  salesCount: 12800,
  wordCount: 186000,
  pageCount: 320,
  publishDate: "2024-01-15",
  category: "命理",
  tags: ["畅销", "精品", "图文并茂"],
  isHot: true,
  isFree: false,
  hasPreview: true,
  description: `《八字命理精解》是一本系统讲解八字命理学的专业书籍。本书从基础理论讲起，循序渐进地介绍了天干地支、五行生克、十神定位、大运流年等核心概念。

书中配有大量实例分析，帮助读者理解命理学的实际应用。无论是命理学入门者还是有一定基础的学习者，都能从本书中获得启发。

本书特点：
• 理论与实践相结合
• 大量真实案例分析
• 配套视频讲解
• 作者答疑互动`,
  chapters: [
    { id: "1", title: "第一章 八字基础概论", pageCount: 28, isFree: true },
    { id: "2", title: "第二章 天干地支详解", pageCount: 35, isFree: true },
    { id: "3", title: "第三章 五行生克制化", pageCount: 42, isFree: false },
    { id: "4", title: "第四章 十神定位与作用", pageCount: 48, isFree: false },
    { id: "5", title: "第五章 格局取用神", pageCount: 38, isFree: false },
    { id: "6", title: "第六章 大运流年断法", pageCount: 52, isFree: false },
    { id: "7", title: "第七章 实例精解", pageCount: 77, isFree: false },
  ],
  reviews: [
    {
      id: "1",
      user: "易学爱好者",
      avatar: "/images/user-1.jpg",
      rating: 5,
      content: "这本书讲解得非常清晰，案例丰富，对于入门者来说是非常好的学习资料。",
      date: "2024-03-15",
      likes: 128,
    },
    {
      id: "2",
      user: "命理研究生",
      avatar: "/images/user-2.jpg",
      rating: 5,
      content: "作者功底深厚，讲解深入浅出。特别是第七章的实例分析，非常有价值。",
      date: "2024-03-10",
      likes: 89,
    },
    {
      id: "3",
      user: "学习中的小白",
      avatar: "/images/user-3.jpg",
      rating: 4,
      content: "内容很好，就是有些地方稍显深奥，需要反复阅读理解。",
      date: "2024-03-05",
      likes: 45,
    },
  ],
  relatedBooks: [
    { id: "2", title: "紫微斗数入门", author: "紫微居士", price: 58 },
    { id: "3", title: "六爻预测实战", author: "陈易卦", price: 68 },
    { id: "4", title: "风水学基础", author: "张天师", price: 88 },
  ],
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
