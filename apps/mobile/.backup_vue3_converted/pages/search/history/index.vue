<template>
  <view class="min-h-screen bg-background relative">
    <!-- 顶部搜索栏 -->
    <view class="sticky top-0 z-20 bg-white border-b border-border px-4 py-3">
      <view class="flex items-center gap-3">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input
            ref="inputRef"
            type="text"
            v-model="keyword"
            @confirm="handleSearch(keyword)"
            placeholder="搜索课程、圈子、商品、用户..."
            class="w-full h-10 pl-10 pr-10 bg-[#F5F5F5] rounded-full text-sm text-foreground placeholder:text-muted-foreground"
          />
          <text v-if="keyword" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" @click="keyword = ''">✕</text>
        </view>
        <text class="text-primary font-medium text-sm" @click="handleSearch(keyword)">搜索</text>
      </view>
    </view>

    <!-- 实时联想 -->
    <view v-if="showSuggestions && suggestions.length > 0" class="absolute top-[60px] left-0 right-0 bg-white border-b border-border z-30">
      <view v-for="(item, index) in suggestions" :key="index" class="flex items-center gap-3 px-4 py-3 border-b border-[#F5F5F5] last:border-b-0" @click="handleSearch(item.keyword)">
        <text class="text-sm text-muted-foreground">{{ item.type === 'history' ? '🕐' : item.type === 'hot' ? '' : '' }}</text>
        <text class="flex-1 text-left text-sm text-[#333]">
          <text v-for="(seg, si) in getHighlightSegments(item.keyword, keyword)" :key="si" :class="seg.highlight ? 'text-primary' : ''">{{ seg.text }}</text>
        </text>
        <text v-if="item.count" class="text-xs text-muted-foreground">{{ formatHeat(item.count) }}次搜索</text>
      </view>
    </view>

    <!-- 主内容 -->
    <view v-if="!showSuggestions" class="p-4 space-y-6">
      <!-- 搜索历史 -->
      <view v-if="history.length > 0">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-sm text-ink-soft">🕐</text>
            <text class="text-sm font-medium text-[#333]">搜索历史</text>
          </view>
          <text class="text-xs text-muted-foreground" @click="showClearConfirm = true">清除全部</text>
        </view>
        <view class="flex flex-wrap gap-2">
          <view v-for="(item, index) in history" :key="index" class="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full border border-border">
            <text class="text-sm text-ink-soft" @click="handleSearch(item.keyword)">{{ item.keyword }}</text>
            <text class="text-xs text-muted-foreground" @click.stop="removeHistoryItem(item.keyword)">✕</text>
          </view>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view>
        <view class="flex items-center gap-2 mb-3">
          <text class="text-base text-[#FF6B35]"></text>
          <text class="text-sm font-medium text-[#333]">热门搜索</text>
          <text class="text-xs text-accent"></text>
        </view>

        <view v-if="isLoading" class="space-y-3">
          <view v-for="i in 5" :key="i" class="flex items-center gap-3 animate-pulse">
            <view class="w-6 h-6 bg-[#E8E0D5] rounded" />
            <view class="flex-1 h-4 bg-[#E8E0D5] rounded" />
          </view>
        </view>

        <view v-else class="bg-white rounded-2xl overflow-hidden shadow-sm">
          <view v-for="(item, index) in hotList" :key="item.id" class="flex items-center gap-3 px-4 py-3 border-b border-[#F5F5F5] last:border-b-0" @click="handleSearch(item.keyword)">
            <view :class="['w-6 h-6 rounded flex items-center justify-center text-sm font-bold', index < 3 ? 'bg-gradient-to-br from-primary to-[#E85A71] text-white' : 'bg-[#F5F5F5] text-muted-foreground']">{{ index + 1 }}</view>
            <text class="flex-1 text-left text-sm text-[#333] truncate">{{ item.keyword }}</text>
            <text v-if="item.isNew" class="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-600 rounded">新</text>
            <text v-if="item.isHot" class="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-500 rounded">热</text>
            <text v-if="item.trend === 'up'" class="text-xs text-primary">📈</text>
            <text class="text-xs text-muted-foreground">{{ formatHeat(item.heat) }}</text>
          </view>
        </view>
      </view>

      <!-- 猜你想搜 -->
      <view>
        <view class="flex items-center gap-2 mb-3">
          <text class="text-xs text-accent"></text>
          <text class="text-sm font-medium text-[#333]">猜你想搜</text>
        </view>
        <view class="flex flex-wrap gap-2">
          <text v-for="(kw, index) in ['八字入门', '风水学', '梅花易数', '紫微斗数', '面相学', '手相学']" :key="index" class="px-4 py-2 bg-gradient-to-r from-[#FAF8F5] to-white rounded-full text-sm text-ink-soft border border-border" @click="handleSearch(kw)">{{ kw }}</text>
        </view>
      </view>
    </view>

    <!-- 清除历史确认弹窗 -->
    <view v-if="showClearConfirm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <view class="bg-white rounded-2xl p-6 w-full max-w-[280px] text-center">
        <view class="w-12 h-12 bg-[#FFF2F0] rounded-full flex items-center justify-center mx-auto mb-4">
          <text class="text-lg text-primary">🕐</text>
        </view>
        <text class="text-lg font-medium text-[#333] block mb-2">清除搜索历史</text>
        <text class="text-sm text-ink-soft block mb-6">确定要清除全部搜索历史吗？</text>
        <view class="flex gap-3">
          <view class="flex-1 py-2.5 rounded-full border border-border text-sm text-ink-soft text-center" @click="showClearConfirm = false">取消</view>
          <view class="flex-1 py-2.5 rounded-full bg-primary text-white text-sm text-center" @click="handleClearHistory">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface HistoryItem { keyword: string; time: string }
interface HotItem { id: string; keyword: string; heat: number; isNew?: boolean; isHot?: boolean; trend?: string }
interface Suggestion { keyword: string; type: 'history' | 'hot' | 'suggest'; count?: number }

const keyword = ref('')
const inputRef = ref<any>(null)
const history = ref<HistoryItem[]>([])
const hotList = ref<HotItem[]>([])
const suggestions = ref<Suggestion[]>([])
const showSuggestions = ref(false)
const showClearConfirm = ref(false)
const isLoading = ref(true)
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  setTimeout(() => { inputRef.value?.focus() }, 100)
  loadData()
})

watch(keyword, (newVal) => {
  if (timer) clearTimeout(timer)
  if (newVal.trim()) {
    timer = setTimeout(() => { loadSuggestions(newVal) }, 300)
  } else {
    suggestions.value = []
    showSuggestions.value = false
  }
})

function loadData() {
  isLoading.value = true
  setTimeout(() => {
    history.value = [
      { keyword: '易经入门', time: '2024-01-15' },
      { keyword: '八字排盘', time: '2024-01-14' },
      { keyword: '梅花易数教程', time: '2024-01-13' },
      { keyword: '风水布局', time: '2024-01-12' },
      { keyword: '六爻预测', time: '2024-01-11' },
      { keyword: '奇门遁甲', time: '2024-01-10' },
    ]
    hotList.value = [
      { id: '1', keyword: '2024年运势解析', heat: 98532, isHot: true, trend: 'up' },
      { id: '2', keyword: '易经六十四卦详解', heat: 87421, isNew: true, trend: 'up' },
      { id: '3', keyword: '八字合婚', heat: 76543, isHot: true, trend: 'stable' },
      { id: '4', keyword: '家居风水禁忌', heat: 65432, trend: 'up' },
      { id: '5', keyword: '梅花易数起卦方法', heat: 54321, trend: 'down' },
      { id: '6', keyword: '紫微斗数入门', heat: 43210, isNew: true, trend: 'up' },
      { id: '7', keyword: '面相学基础', heat: 32109, trend: 'stable' },
      { id: '8', keyword: '六爻占卜实例', heat: 21098, trend: 'down' },
      { id: '9', keyword: '奇门遁甲排盘', heat: 19876, trend: 'up' },
      { id: '10', keyword: '风水罗盘使用', heat: 18765, trend: 'stable' },
    ]
    isLoading.value = false
  }, 500)
}

function loadSuggestions(kw: string) {
  setTimeout(() => {
    suggestions.value = [
      { keyword: `${kw}入门教程`, type: 'suggest', count: 12580 },
      { keyword: `${kw}视频课程`, type: 'suggest', count: 8932 },
      { keyword: `${kw}实战案例`, type: 'hot', count: 6543 },
      { keyword: `${kw}学习路径`, type: 'suggest', count: 4321 },
      { keyword: `${kw}名师讲解`, type: 'history' },
    ]
    showSuggestions.value = true
  }, 200)
}

function handleSearch(kw: string) {
  if (!kw.trim()) return
  uni.navigateTo({ url: `/pages/search/result/index?keyword=${encodeURIComponent(kw)}` })
}

function handleClearHistory() {
  history.value = []
  showClearConfirm.value = false
}

function removeHistoryItem(kw: string) {
  history.value = history.value.filter(item => item.keyword !== kw)
}

function formatHeat(heat: number) {
  if (heat >= 10000) return (heat / 10000).toFixed(1) + '万'
  return heat.toString()
}

function getHighlightSegments(text: string, kw: string): { text: string; highlight: boolean }[] {
  if (!kw) return [{ text, highlight: false }]
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((p) => ({ text: p, highlight: p.toLowerCase() === kw.toLowerCase() }))
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
