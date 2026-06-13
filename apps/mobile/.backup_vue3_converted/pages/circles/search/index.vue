<template>
  <view class="min-h-screen bg-background">
    <!-- Search bar -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center gap-2 px-4 py-3">
        <view @click="goBack" class="flex-shrink-0">
          <text class="text-foreground text-lg">←</text>
        </view>
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></text>
          <input
            :value="keyword"
            @input="onInput"
            @confirm="doSearch(keyword)"
            placeholder="搜索圈子名称、分类..."
            class="w-full pl-9 pr-8 py-2 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground"
            :focus="true"
          />
          <text
            v-if="keyword"
            @click="clearKeyword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >✕</text>
        </view>
        <text @click="goBack" class="text-sm text-muted-foreground flex-shrink-0">取消</text>
      </view>
    </view>

    <view class="pb-20">
      <!-- Not searched yet -->
      <view v-if="!hasSearched" class="px-4 pt-5 space-y-6">
        <!-- History -->
        <view v-if="history.length > 0">
          <view class="flex items-center justify-between mb-3">
            <text class="font-semibold text-foreground">搜索历史</text>
            <text @click="clearHistory" class="text-xs text-muted-foreground">清空</text>
          </view>
          <view class="flex flex-wrap gap-2">
            <text
              v-for="(kw, i) in history"
              :key="i"
              @click="doSearch(kw)"
              hover-class="bg-[#E8E0D5]"
              class="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground"
            >{{ kw }}</text>
          </view>
        </view>

        <!-- Hot searches -->
        <view>
          <view class="flex items-center gap-2 mb-3">
            <text class="text-primary">📈</text>
            <text class="font-semibold text-foreground">热门搜索</text>
          </view>
          <view class="flex flex-wrap gap-2">
            <view
              v-for="(kw, i) in hotSearches"
              :key="i"
              @click="doSearch(kw)"
              hover-class="bg-[#E8E0D5]"
              class="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground flex items-center gap-1"
            >
              <text v-if="i < 3" class="text-primary font-bold text-xs">{{ i + 1 }}</text>
              <text>{{ kw }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Searching skeleton -->
      <view v-else-if="searching" class="px-4 pt-5 space-y-3">
        <view v-for="i in 3" :key="i" class="flex gap-3">
          <view class="w-16 h-16 rounded-xl bg-muted flex-shrink-0 animate-pulse" />
          <view class="flex-1 space-y-2 pt-1">
            <view class="h-4 bg-muted rounded animate-pulse" style="width: 75%;" />
            <view class="h-3 bg-muted rounded animate-pulse" style="width: 50%;" />
            <view class="h-3 bg-muted rounded animate-pulse" style="width: 66%;" />
          </view>
        </view>
      </view>

      <!-- No results -->
      <view v-else-if="results.length === 0" class="flex flex-col items-center justify-center pt-24 px-4 text-center">
        <view class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <text class="text-muted-foreground text-lg"></text>
        </view>
        <text class="text-foreground font-medium mb-1">没有找到相关圈子</text>
        <text class="text-muted-foreground text-sm">换个关键词试试？</text>
      </view>

      <!-- Search results -->
      <view v-else class="px-4 pt-4 space-y-3">
        <text class="text-sm text-muted-foreground">
          找到 <text class="text-primary font-medium">{{ results.length }}</text> 个相关圈子
        </text>
        <view
          v-for="circle in results"
          :key="circle.id"
          @click="goCircle(circle.id)"
          hover-class="bg-muted/50"
          class="w-full flex gap-3 p-3 rounded-xl border border-border bg-white"
        >
          <view class="w-16 h-16 rounded-xl flex-shrink-0 relative overflow-hidden">
            <view class="absolute inset-0 bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
              <text>{{ circle.name.slice(0, 2) }}</text>
            </view>
            <image :src="circle.cover" mode="aspectFill" class="w-full h-full relative z-10" />
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2 mb-0.5">
              <text class="font-semibold text-foreground truncate">{{ circle.name }}</text>
              <text v-if="circle.isPaid" class="text-[10px] px-1.5 bg-amber-100 text-amber-800 rounded-full flex-shrink-0">付费</text>
            </view>
            <text class="text-xs text-muted-foreground mb-2 block truncate">{{ circle.description }}</text>
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-1 text-xs text-muted-foreground">
                <text></text>
                <text>{{ formatCount(circle.members) }} 成员</text>
              </view>
              <text v-if="circle.isJoined" class="text-xs text-muted-foreground">已加入</text>
              <text v-else class="text-xs text-primary font-medium">
                {{ circle.isPaid ? '¥' + circle.price + '/年' : '免费加入' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface SearchResult {
  id: string; name: string; cover: string; members: number
  category: string; isJoined: boolean; isPaid: boolean; price: number
  description: string; tags: string[]
}

const hotSearches = ['八字命理', '紫微斗数', '风水堪舆', '易经', '六爻', '奇门遁甲', '四柱', '风水']
const defaultHistory = ['命理研习', '八字', '风水大师']

const COVER_1 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
const COVER_2 = "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop"
const COVER_3 = "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop"
const COVER_4 = "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop"
const COVER_5 = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop"

const mockResults: SearchResult[] = [
  { id: '1', name: '八字命理研习社', cover: COVER_1, members: 12580, category: '命理', isJoined: false, isPaid: true, price: 99, description: '专业八字命理学习圈子，汇聚众多命理爱好者', tags: ['八字', '命理'] },
  { id: '2', name: '紫微斗数学院', cover: COVER_2, members: 8960, category: '命理', isJoined: true, isPaid: true, price: 199, description: '紫微斗数爱好者的学习交流平台', tags: ['紫微斗数', '斗数'] },
  { id: '3', name: '风水堪舆交流', cover: COVER_3, members: 6320, category: '风水', isJoined: false, isPaid: false, price: 0, description: '风水堪舆爱好者的交流分享圈子', tags: ['风水', '堪舆'] },
  { id: '4', name: '易经研究会', cover: COVER_4, members: 15200, category: '易学', isJoined: false, isPaid: false, price: 0, description: '专注易经文化研究与传播', tags: ['易经', '国学'] },
  { id: '5', name: '奇门遁甲精研', cover: COVER_5, members: 4580, category: '命理', isJoined: false, isPaid: true, price: 299, description: '奇门遁甲高阶学习与实战交流', tags: ['奇门遁甲', '命理'] },
]

const keyword = ref('')
const hasSearched = ref(false)
const searching = ref(false)
const history = ref<string[]>([...defaultHistory])
const results = ref<SearchResult[]>(mockResults)

function onInput(e: any) {
  keyword.value = e.detail.value
}

function doSearch(kw: string) {
  if (!kw.trim()) return
  keyword.value = kw
  searching.value = true
  // Add to history
  history.value = [kw, ...history.value.filter(h => h !== kw)].slice(0, 10)
  // Simulate search
  setTimeout(() => {
    results.value = mockResults.filter(r =>
      r.name.includes(kw) || r.description.includes(kw) || r.tags.some(t => t.includes(kw))
    )
    hasSearched.value = true
    searching.value = false
  }, 400)
}

function clearKeyword() {
  keyword.value = ''
  hasSearched.value = false
}

function clearHistory() {
  history.value = []
}

function formatCount(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toString()
}

function goBack() {
  uni.navigateBack()
}

function goCircle(id: string) {
  uni.navigateTo({ url: `/pages/circle/id-detail/home/index?id=${id}` })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
