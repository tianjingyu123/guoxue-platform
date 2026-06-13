<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view
      class="sticky top-0 z-50 bg-[rgba(250,248,245,0.95)] backdrop-blur-sm border-b border-border"
    >
      <!-- 搜索栏 -->
      <view class="flex items-center gap-3 px-4 h-14">
        <view
          class="p-1.5 -ml-1.5 rounded-lg transition-all duration-200"
          hover-class="back-hover"
          @click="goBack"
        >
          <text class="text-xl text-foreground">◀</text>
        </view>

        <view class="flex-1 relative">
          <text
            class="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground z-[1]"
          ></text>
          <input
            v-model="searchQuery"
            placeholder="搜索电子书..."
            class="w-full h-9 pl-9 pr-4 bg-secondary/50 border-0 rounded-full text-sm box-border text-foreground"
          />
        </view>

        <view class="shrink-0 p-2" @click="onFilter">
          <text class="text-xl text-foreground">⚙</text>
        </view>
      </view>

      <!-- 分类标签 -->
      <view
        class="flex gap-2 px-4 py-2.5 overflow-x-auto flex-nowrap scrollbar-hide"
      >
        <view
          v-for="cat in categories"
          :key="cat.id"
          @click="activeCategory = cat.id"
          :class="[activeCategory === cat.id ? 'bg-primary text-white' : 'bg-secondary/60 text-muted-foreground', 'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200']"
        >
          <text>{{ cat.name }}</text>
          <text class="opacity-70 ml-1">{{ cat.count }}</text>
        </view>
      </view>

      <!-- 排序和视图切换 -->
      <view
        class="flex items-center justify-between px-4 py-2 border-t border-[rgba(232,224,213,0.5)]"
      >
        <view class="flex gap-1">
          <view
            v-for="opt in sortOptions"
            :key="opt.id"
            @click="activeSort = opt.id"
            :class="[activeSort === opt.id ? 'bg-[rgba(196,30,58,0.1)] text-primary' : 'bg-transparent text-muted-foreground', 'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200']"
          >
            <text class="text-sm">{{ opt.icon }}</text>
            <text>{{ opt.name }}</text>
          </view>
        </view>

        <view class="flex gap-1 p-0.5 bg-secondary/50 rounded-lg">
          <view
            @click="viewMode = 'grid'"
            :class="[viewMode === 'grid' ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'bg-transparent shadow-none', 'p-1.5 rounded-md transition-all duration-200']"
          >
            <text class="text-base text-foreground">⊞</text>
          </view>
          <view
            @click="viewMode = 'list'"
            :class="[viewMode === 'list' ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'bg-transparent shadow-none', 'p-1.5 rounded-md transition-all duration-200']"
          >
            <text class="text-base text-foreground">☰</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 书籍列表 -->
    <view class="p-4">
      <!-- 网格视图 -->
      <view v-if="viewMode === 'grid'" class="flex flex-wrap gap-3">
        <view
          v-for="book in ebooks"
          :key="book.id"
          @click="goToEbook(book.id)"
          class="w-[calc(50%-6px)] rounded-lg overflow-hidden border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-200"
          hover-class="card-press"
        >
          <!-- 封面 -->
          <view
            class="relative aspect-[3/4] bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] overflow-hidden"
          >
            <!-- 书脊装饰 -->
            <view
              class="absolute left-0 top-0 bottom-0 w-2 bg-[rgba(201,169,110,0.4)]"
            />

            <!-- 书名和作者 -->
            <view
              class="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"
            >
              <view
                class="writing-vertical-rl font-serif font-bold text-base text-[#3d3225] leading-tight"
              >
                {{ book.title.slice(0, 6) }}
              </view>
              <text class="mt-2 text-[10px] text-[#6b5b4b]">{{ book.author }}</text>
            </view>

            <!-- 标签 -->
            <view class="absolute top-1.5 right-1.5 flex flex-col gap-1">
              <view
                v-if="book.isHot"
                class="bg-red-500 text-white text-[10px] px-1.5 rounded leading-[18px] text-center"
              >
                热门
              </view>
              <view
                v-if="book.isNew"
                class="bg-green-500 text-white text-[10px] px-1.5 rounded leading-[18px] text-center"
              >
                新书
              </view>
              <view
                v-if="book.isFree"
                class="bg-accent text-white text-[10px] px-1.5 rounded leading-[18px] text-center"
              >
                免费
              </view>
            </view>
          </view>

          <!-- 信息 -->
          <view class="p-2.5 flex flex-col gap-1.5">
            <text class="line-clamp-1 font-medium text-sm text-foreground">{{ book.title }}</text>
            <text class="text-xs text-muted-foreground">{{ book.author }}</text>

            <!-- 评分 -->
            <view class="flex items-center gap-1">
              <text class="text-xs text-amber-400"></text>
              <text class="text-xs font-medium text-foreground">{{ book.rating }}</text>
              <text class="text-[10px] text-muted-foreground">({{ book.reviewCount }})</text>
            </view>

            <!-- 价格 -->
            <view class="flex items-center justify-between pt-1">
              <view v-if="book.isFree">
                <text class="text-accent font-bold text-sm">免费</text>
              </view>
              <view v-else class="flex items-baseline gap-1">
                <text class="text-primary font-bold text-sm">&yen;{{ book.price }}</text>
                <text
                  v-if="book.originalPrice > book.price"
                  class="text-[10px] text-muted-foreground line-through"
                >&yen;{{ book.originalPrice }}</text>
              </view>
              <text class="text-[10px] text-muted-foreground">{{ formatSalesShort(book.salesCount) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 列表视图 -->
      <view v-else class="flex flex-col gap-3">
        <view
          v-for="book in ebooks"
          :key="book.id"
          @click="goToEbook(book.id)"
          class="flex gap-3 p-3 rounded-lg border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-200"
          hover-class="list-card-press"
        >
          <!-- 封面 -->
          <view
            class="relative w-20 h-28 shrink-0 rounded-md bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] overflow-hidden"
          >
            <!-- 书脊装饰 -->
            <view
              class="absolute left-0 top-0 bottom-0 w-1.5 bg-[rgba(201,169,110,0.4)]"
            />
            <view class="absolute inset-0 flex items-center justify-center">
              <view
                class="writing-vertical-rl font-serif font-bold text-sm text-[#3d3225]"
              >
                {{ book.title.slice(0, 4) }}
              </view>
            </view>
            <view
              v-if="book.isFree"
              class="absolute top-1 right-1 bg-accent text-white text-[9px] px-1 rounded-sm leading-4"
            >
              免费
            </view>
          </view>

          <!-- 信息 -->
          <view class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <view>
              <!-- 标题行 + 热门标签 -->
              <view class="flex items-start justify-between gap-2">
                <text
                  class="line-clamp-1 flex-1 font-medium text-sm text-foreground"
                >{{ book.title }}</text>
                <view
                  v-if="book.isHot"
                  class="shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 rounded bg-red-100 text-red-600 leading-[18px]"
                >
                  <text class="text-xs"></text>
                  <text>热门</text>
                </view>
              </view>

              <!-- 作者 + 分类 -->
              <text class="text-xs text-muted-foreground block mt-0.5">
                {{ book.author }} · {{ book.category }}
              </text>

              <!-- 标签 + 销量 -->
              <view class="line-clamp-2 text-xs text-muted-foreground mt-1">
                <text>{{ book.tags.join(' · ') }} · {{ formatSalesLabel(book.salesCount) }}</text>
              </view>
            </view>

            <!-- 底部：评分 + 价格 + 按钮 -->
            <view class="flex items-center justify-between mt-2">
              <view class="flex items-center gap-2">
                <view class="flex items-center gap-0.5">
                  <text class="text-sm text-amber-400"></text>
                  <text class="text-sm font-medium text-foreground">{{ book.rating }}</text>
                </view>
                <view v-if="book.isFree">
                  <text class="text-accent font-bold text-sm">免费</text>
                </view>
                <view v-else class="flex items-baseline gap-1">
                  <text class="text-primary font-bold text-sm">&yen;{{ book.price }}</text>
                  <text
                    v-if="book.originalPrice > book.price"
                    class="text-[10px] text-muted-foreground line-through"
                  >&yen;{{ book.originalPrice }}</text>
                </view>
              </view>

              <view
                :class="[book.isFree ? 'bg-accent' : 'bg-primary', 'h-7 px-2.5 rounded-md text-xs flex items-center justify-center text-white font-medium']"
              >
                {{ book.isFree ? '免费阅读' : '立即购买' }}
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Ebook {
  id: string
  title: string
  author: string
  cover: string
  price: number
  originalPrice: number
  rating: number
  reviewCount: number
  salesCount: number
  category: string
  tags: string[]
  isHot: boolean
  isNew: boolean
  isFree: boolean
  hasPreview: boolean
}

interface Category {
  id: string
  name: string
  count: number
}

interface SortOption {
  id: string
  name: string
  icon: string
}

// 模拟电子书数据
const ebooks: Ebook[] = [
  {
    id: '1',
    title: '八字命理精解',
    author: '李明华',
    cover: '/images/ebook-cover-1.jpg',
    price: 68,
    originalPrice: 128,
    rating: 4.8,
    reviewCount: 2340,
    salesCount: 12800,
    category: '命理',
    tags: ['畅销', '精品'],
    isHot: true,
    isNew: false,
    isFree: false,
    hasPreview: true,
  },
  {
    id: '2',
    title: '易经入门与实践',
    author: '王道玄',
    cover: '/images/ebook-cover-2.jpg',
    price: 0,
    originalPrice: 0,
    rating: 4.9,
    reviewCount: 5680,
    salesCount: 45000,
    category: '经典',
    tags: ['免费', '入门'],
    isHot: true,
    isNew: false,
    isFree: true,
    hasPreview: true,
  },
  {
    id: '3',
    title: '风水学基础教程',
    author: '张天师',
    cover: '/images/ebook-cover-3.jpg',
    price: 88,
    originalPrice: 168,
    rating: 4.7,
    reviewCount: 1890,
    salesCount: 8900,
    category: '风水',
    tags: ['新书', '图文'],
    isHot: false,
    isNew: true,
    isFree: false,
    hasPreview: true,
  },
  {
    id: '4',
    title: '六爻预测学',
    author: '陈易卦',
    cover: '/images/ebook-cover-4.jpg',
    price: 58,
    originalPrice: 98,
    rating: 4.6,
    reviewCount: 1230,
    salesCount: 5600,
    category: '术数',
    tags: ['实战'],
    isHot: false,
    isNew: false,
    isFree: false,
    hasPreview: true,
  },
  {
    id: '5',
    title: '紫微斗数全书',
    author: '紫微居士',
    cover: '/images/ebook-cover-5.jpg',
    price: 128,
    originalPrice: 258,
    rating: 4.9,
    reviewCount: 3450,
    salesCount: 18900,
    category: '命理',
    tags: ['经典', '完整版'],
    isHot: true,
    isNew: false,
    isFree: false,
    hasPreview: true,
  },
  {
    id: '6',
    title: '道德经白话详解',
    author: '老庄书院',
    cover: '/images/ebook-cover-6.jpg',
    price: 0,
    originalPrice: 0,
    rating: 4.8,
    reviewCount: 8900,
    salesCount: 68000,
    category: '经典',
    tags: ['免费', '白话'],
    isHot: true,
    isNew: false,
    isFree: true,
    hasPreview: true,
  },
]

// 分类数据
const categories: Category[] = [
  { id: 'all', name: '全部', count: 128 },
  { id: 'classic', name: '经典', count: 45 },
  { id: 'mingli', name: '命理', count: 32 },
  { id: 'fengshui', name: '风水', count: 28 },
  { id: 'shushu', name: '术数', count: 23 },
]

// 排序选项
const sortOptions: SortOption[] = [
  { id: 'hot', name: '热门', icon: '\u{1F525}' },
  { id: 'new', name: '最新', icon: '\u{1F550}' },
  { id: 'price', name: '价格', icon: '\u{1F451}' },
]

const searchQuery = ref('')
const activeCategory = ref('all')
const activeSort = ref('hot')
const viewMode = ref<'grid' | 'list'>('grid')

function goBack() {
  uni.navigateBack()
}

function goToEbook(id: string) {
  uni.navigateTo({ url: `/pages/ebook/detail?id=${id}` })
}

function onFilter() {
  uni.showToast({ title: '筛选功能', icon: 'none' })
}

function formatSalesShort(count: number): string {
  return `${(count / 1000).toFixed(1)}k人购`
}

function formatSalesLabel(count: number): string {
  return `${(count / 1000).toFixed(1)}k人已购`
}
</script>
<style scoped>/* 样式由 Tailwind 处理 */</style>
