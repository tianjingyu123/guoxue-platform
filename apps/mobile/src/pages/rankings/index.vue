<!-- 榜单页 - 100% 对照 app/rankings/page.tsx，纯Tailwind+SVG，无emoji/BEM/style -->
<template>
  <view class="min-h-screen pb-20" style="background: var(--color-background);">

    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50" style="background: linear-gradient(to right, #D4A017, #B8860B);">
      <view class="flex items-center px-4 h-12">
        <view class="p-1 mr-3" @click="goBack">
          <!-- ArrowLeft -->
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </view>
        <view class="flex items-center gap-2">
          <!-- Trophy -->
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="8 21 12 21 16 21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
            <path d="M5 3H19M5 3C5 3 4 12 12 12C20 12 19 3 19 3"/>
            <path d="M5 3C3 3 2 5 2 7C2 9 3 11 5 11"/>
            <path d="M19 3C21 3 22 5 22 7C22 9 21 11 19 11"/>
          </svg>
          <text class="font-medium text-white">热卜榜单</text>
        </view>
      </view>
    </header>

    <!-- 分类 Tab -->
    <view class="sticky top-12 z-40 bg-background border-b border-border">
      <scroll-view scroll-x style="white-space: nowrap;">
        <view class="flex" style="display: inline-flex;">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            :style="activeCategory === cat.id
              ? 'color: #B8860B; border-color: #D4A017;'
              : 'color: var(--color-muted-foreground); border-color: transparent;'"
            @click="activeCategory = cat.id"
          >
            <component-svg :name="cat.icon" class="w-4 h-4" />
            {{ cat.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 时间筛选 -->
    <view class="px-4 py-3 flex justify-end">
      <view class="flex items-center gap-1 rounded-full p-0.5 bg-secondary">
        <view
          v-for="t in timeOptions"
          :key="t.id"
          class="px-3 py-1 text-xs rounded-full transition-colors"
          :style="timeRange === t.id
            ? 'background: #D4A017; color: white;'
            : 'color: var(--color-muted-foreground);'"
          @click="timeRange = t.id"
        >
          {{ t.label }}
        </view>
      </view>
    </view>

    <!-- 榜单内容 -->
    <view class="px-4 flex flex-col gap-3">

      <!-- 圈子榜 -->
      <template v-if="activeCategory === 'circles'">
        <view
          v-for="(item, index) in circleRanks"
          :key="item.id"
          class="bg-card rounded-xl p-4"
          :style="index < 3
            ? 'border: 1px solid #FDEFC0; background: rgba(253,239,192,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.06);'
            : 'box-shadow: 0 2px 8px rgba(0,0,0,0.06);'"
        >
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" :style="getRankStyle(index + 1)">
              {{ index + 1 }}
            </view>
            <view class="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10">
              <text class="text-base font-bold text-primary">{{ item.name.slice(0, 1) }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-foreground truncate block">{{ item.name }}</text>
              <text class="text-xs text-muted-foreground">圈主：{{ item.owner }}</text>
            </view>
            <view class="text-right">
              <text class="font-bold block" style="color: #B8860B;">{{ (item.members / 1000).toFixed(1) }}k</text>
              <text class="text-xs" style="color: var(--color-chart-4);">+{{ item.growth }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 创作者榜 -->
      <template v-if="activeCategory === 'creators'">
        <view
          v-for="(item, index) in creatorRanks"
          :key="item.id"
          class="bg-card rounded-xl p-4"
          :style="index < 3
            ? 'border: 1px solid #FDEFC0; background: rgba(253,239,192,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.06);'
            : 'box-shadow: 0 2px 8px rgba(0,0,0,0.06);'"
        >
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" :style="getRankStyle(index + 1)">
              {{ index + 1 }}
            </view>
            <view class="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
              <text class="font-bold text-primary">{{ item.name.slice(0, 1) }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-foreground block">{{ item.name }}</text>
              <text class="text-xs text-muted-foreground block">{{ item.title }}</text>
              <view class="flex items-center gap-3 mt-1">
                <view class="flex items-center gap-0.5">
                  <!-- Users -->
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ (item.followers / 1000).toFixed(1) }}k</text>
                </view>
                <view class="flex items-center gap-0.5">
                  <!-- Heart -->
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ (item.likes / 1000).toFixed(1) }}k</text>
                </view>
                <view class="flex items-center gap-0.5">
                  <!-- BookOpen -->
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ item.articles }}篇</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 课程榜 -->
      <template v-if="activeCategory === 'courses'">
        <view
          v-for="(item, index) in courseRanks"
          :key="item.id"
          class="bg-card rounded-xl p-4"
          :style="index < 3
            ? 'border: 1px solid #FDEFC0; background: rgba(253,239,192,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.06);'
            : 'box-shadow: 0 2px 8px rgba(0,0,0,0.06);'"
        >
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" :style="getRankStyle(index + 1)">
              {{ index + 1 }}
            </view>
            <view class="w-16 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <!-- BookOpen -->
              <svg class="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-sm text-foreground truncate block">{{ item.name }}</text>
              <text class="text-xs text-muted-foreground block">{{ item.teacher }}</text>
              <view class="flex items-center gap-2 mt-1">
                <text class="text-xs text-muted-foreground">{{ item.students }}人学习</text>
                <view class="flex items-center gap-0.5">
                  <!-- Star filled -->
                  <svg class="w-3 h-3" style="color: var(--color-accent); fill: var(--color-accent);" viewBox="0 0 24 24" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ item.rating }}</text>
                </view>
              </view>
            </view>
            <text class="font-bold text-primary">¥{{ item.price }}</text>
          </view>
        </view>
      </template>

      <!-- 商品榜 -->
      <template v-if="activeCategory === 'products'">
        <view
          v-for="(item, index) in productRanks"
          :key="item.id"
          class="bg-card rounded-xl p-4"
          :style="index < 3
            ? 'border: 1px solid #FDEFC0; background: rgba(253,239,192,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.06);'
            : 'box-shadow: 0 2px 8px rgba(0,0,0,0.06);'"
        >
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" :style="getRankStyle(index + 1)">
              {{ index + 1 }}
            </view>
            <view class="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <!-- ShoppingBag -->
              <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-sm text-foreground truncate block">{{ item.name }}</text>
              <view class="flex items-center gap-2 mt-1">
                <text class="text-xs text-muted-foreground">{{ item.sales }}人购买</text>
                <view class="flex items-center gap-0.5">
                  <svg class="w-3 h-3" style="color: var(--color-accent); fill: var(--color-accent);" viewBox="0 0 24 24" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ item.rating }}</text>
                </view>
              </view>
            </view>
            <text class="font-bold text-primary">¥{{ item.price }}</text>
          </view>
        </view>
      </template>

      <!-- 新星榜 -->
      <template v-if="activeCategory === 'rising'">
        <view
          v-for="(item, index) in risingRanks"
          :key="item.id"
          class="bg-card rounded-xl p-4"
          :style="index < 3
            ? 'border: 1px solid #FDEFC0; background: rgba(253,239,192,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.06);'
            : 'box-shadow: 0 2px 8px rgba(0,0,0,0.06);'"
        >
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" :style="getRankStyle(index + 1)">
              {{ index + 1 }}
            </view>
            <view class="w-12 h-12 rounded-full flex items-center justify-center" style="background: rgba(82,196,26,0.1);">
              <text class="font-bold" style="color: var(--color-chart-4);">{{ item.name.slice(0, 1) }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2 mb-0.5">
                <text class="font-medium text-foreground">{{ item.name }}</text>
                <!-- 新星 badge -->
                <view class="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style="background: rgba(82,196,26,0.1);">
                  <!-- Flame -->
                  <svg class="w-3 h-3" style="color: var(--color-chart-4);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                  <text class="text-xs" style="color: var(--color-chart-4);">新星</text>
                </view>
              </view>
              <text class="text-xs text-muted-foreground">入驻{{ item.joinDays }}天</text>
            </view>
            <view class="text-right">
              <text class="font-bold block" style="color: var(--color-chart-4);">+{{ item.growth }}</text>
              <text class="text-xs text-muted-foreground">{{ item.followers }}粉丝</text>
            </view>
          </view>
        </view>
      </template>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeCategory = ref('circles')
const timeRange = ref<'week' | 'month' | 'total'>('week')

const categories = [
  { id: 'circles', label: '圈子榜' },
  { id: 'creators', label: '创作者榜' },
  { id: 'courses', label: '课程榜' },
  { id: 'products', label: '商品榜' },
  { id: 'rising', label: '新星榜' },
]

const timeOptions = [
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'total', label: '总榜' },
]

const circleRanks = [
  { id: 1, name: '八字命理研习社', members: 12680, growth: 1280, owner: '张道源' },
  { id: 2, name: '紫微斗数交流圈', members: 9856, growth: 856, owner: '李易卿' },
  { id: 3, name: '风水堪舆实战派', members: 8234, growth: 623, owner: '王文昌' },
  { id: 4, name: '易经智慧学堂', members: 7156, growth: 512, owner: '陈玄风' },
  { id: 5, name: '六爻预测研究会', members: 6023, growth: 389, owner: '周易安' },
]

const creatorRanks = [
  { id: 1, name: '张道源', title: '八字命理专家', followers: 28600, likes: 156800, articles: 326 },
  { id: 2, name: '李易卿', title: '紫微斗数研究员', followers: 21500, likes: 128600, articles: 245 },
  { id: 3, name: '王文昌', title: '风水堪舆大师', followers: 18900, likes: 98500, articles: 189 },
  { id: 4, name: '陈玄风', title: '易经学者', followers: 15600, likes: 86200, articles: 156 },
  { id: 5, name: '周易安', title: '六爻占卜师', followers: 12800, likes: 72300, articles: 128 },
]

const courseRanks = [
  { id: 1, name: '八字入门到精通', teacher: '张道源', students: 12680, rating: 4.9, price: 299 },
  { id: 2, name: '紫微斗数实战班', teacher: '李易卿', students: 8956, rating: 4.8, price: 399 },
  { id: 3, name: '阳宅风水精讲', teacher: '王文昌', students: 7234, rating: 4.9, price: 499 },
  { id: 4, name: '易经六十四卦详解', teacher: '陈玄风', students: 6156, rating: 4.7, price: 199 },
  { id: 5, name: '六爻预测从零开始', teacher: '周易安', students: 5023, rating: 4.8, price: 249 },
]

const productRanks = [
  { id: 1, name: '滴天髓精解', sales: 3268, rating: 4.9, price: 68 },
  { id: 2, name: '子平真诠评注', sales: 2856, rating: 4.8, price: 88 },
  { id: 3, name: '专业排盘罗盘', sales: 2134, rating: 4.9, price: 298 },
  { id: 4, name: '穷通宝鉴白话解', sales: 1956, rating: 4.7, price: 58 },
  { id: 5, name: '三命通会全套', sales: 1623, rating: 4.8, price: 168 },
]

const risingRanks = [
  { id: 1, name: '小易说命理', joinDays: 30, followers: 3680, growth: 2800 },
  { id: 2, name: '玄学新视角', joinDays: 45, followers: 2856, growth: 2100 },
  { id: 3, name: '紫微探秘', joinDays: 28, followers: 2234, growth: 1800 },
  { id: 4, name: '易学入门君', joinDays: 35, followers: 1956, growth: 1500 },
  { id: 5, name: '风水小课堂', joinDays: 42, followers: 1623, growth: 1200 },
]

function getRankStyle(rank: number): string {
  if (rank === 1) return 'background: #D4A017; color: white;'
  if (rank === 2) return 'background: #9E9E9E; color: white;'
  if (rank === 3) return 'background: #A0522D; color: white;'
  return 'background: var(--color-secondary); color: var(--color-muted-foreground);'
}

function goBack() {
  uni.navigateBack()
}
</script>
