<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground flex items-center gap-2">
        <text class="text-primary">📈</text>热门搜索
      </text>
    </header>

    <view class="px-4 pb-20">
      <!-- 热门话题 -->
      <view class="mt-4 mb-6">
        <view class="flex items-center gap-1.5 mb-3">
          <text class="text-base text-orange-500"></text>
          <text class="text-sm font-semibold text-foreground">热门话题</text>
        </view>
        <view class="flex flex-wrap gap-2">
          <text
            v-for="kw in hotKeywords"
            :key="kw"
            @click="handleSearch(kw)"
            class="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full font-medium"
          >
            <text class="text-xs">#</text>{{ kw }}
          </text>
        </view>
      </view>

      <!-- 实时热搜 -->
      <view class="flex items-center gap-1.5 mb-3">
        <text class="text-primary">📈</text>
        <text class="text-sm font-semibold text-foreground">实时热搜</text>
      </view>
      <view class="bg-card border border-border rounded-xl overflow-hidden">
        <view
          v-for="item in trending"
          :key="item.rank"
          @click="handleSearch(item.keyword)"
          class="flex items-center gap-3 px-4 py-3 w-full border-b border-border last:border-b-0"
        >
          <text
            :class="['w-6 text-center font-bold text-sm shrink-0', item.rank <= 3 ? 'text-primary' : 'text-muted-foreground']"
          >
            {{ item.rank }}
          </text>
          <text class="text-muted-foreground shrink-0"></text>
          <text class="flex-1 text-sm font-medium text-foreground">{{ item.keyword }}</text>
          <view class="flex items-center gap-1.5 shrink-0">
            <text
              v-if="item.isHot"
              class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium"
            >热</text>
            <text
              v-if="item.isNew"
              class="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium"
            >新</text>
            <text class="text-xs text-muted-foreground">{{ item.heat }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface TrendingItem {
  rank: number
  keyword: string
  heat: string
  isHot?: boolean
  isNew?: boolean
}

const trending: TrendingItem[] = [
  { rank: 1,  keyword: '八字命盘解读',       heat: '98.6万', isHot: true },
  { rank: 2,  keyword: '2024甲辰年运势',      heat: '87.3万', isHot: true },
  { rank: 3,  keyword: '紫微斗数命主星',      heat: '76.1万', isHot: true },
  { rank: 4,  keyword: '风水招财布局',        heat: '65.4万' },
  { rank: 5,  keyword: '奇门遁甲入门',        heat: '54.8万', isNew: true },
  { rank: 6,  keyword: '周易六十四卦',        heat: '48.2万' },
  { rank: 7,  keyword: '梅花易数占卜',        heat: '43.6万', isNew: true },
  { rank: 8,  keyword: '生辰八字合婚',        heat: '38.9万' },
  { rank: 9,  keyword: '名字五行起名',        heat: '34.2万' },
  { rank: 10, keyword: '大运流年分析',        heat: '29.8万' },
  { rank: 11, keyword: '十二生肖2024运程',    heat: '26.5万' },
  { rank: 12, keyword: '阴阳宅风水知识',      heat: '22.1万' },
  { rank: 13, keyword: '四柱八字格局',        heat: '18.7万' },
  { rank: 14, keyword: '子平八字用神',        heat: '15.4万' },
  { rank: 15, keyword: '太乙神数推算',        heat: '12.8万', isNew: true },
]

const hotKeywords = ['命理','风水','八字','紫微','易经','生肖','奇门','起名','合婚','择日']

function handleSearch(kw: string) {
  uni.navigateTo({ url: `/pages/search/result?keyword=${encodeURIComponent(kw)}` })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
</style>
