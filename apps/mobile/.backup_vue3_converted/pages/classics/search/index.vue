<template>
  <view class="min-h-screen bg-background">
    <!-- 搜索头部 -->
    <header class="sticky top-0 z-50 bg-background border-b border-border/60">
      <view class="flex items-center gap-3 px-4 h-14">
        <view @click="goBack" class="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground">
          <text class="text-base">←</text>
        </view>
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></text>
          <input
            ref="searchInputRef"
            :value="searchValue"
            @input="onInputChange"
            @confirm="handleSearch()"
            placeholder="搜索古籍、作者、内容..."
            class="w-full pl-9 pr-16 h-10 bg-secondary border-0 rounded-full text-sm"
          />
          <view class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <text v-if="searchValue" @click="handleClear" class="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground">✕</text>
            <text class="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground"></text>
          </view>
        </view>
        <view @click="goTo('/pages/classics/ai-assistant')" class="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <text class="text-white text-sm"></text>
        </view>
      </view>
    </header>

    <view class="p-4">
      <!-- 初始状态 - 历史+热门 -->
      <view v-if="searchState === 'initial'" class="space-y-6">
        <section v-if="searchHistory.length > 0">
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-2">
              <text class="text-muted-foreground">🕐</text>
              <text class="text-sm font-medium">搜索历史</text>
            </view>
            <text @click="handleClearHistory" class="text-xs text-muted-foreground">清空</text>
          </view>
          <view class="flex flex-wrap gap-2">
            <view v-for="(keyword, i) in searchHistory" :key="i" class="group flex items-center">
              <text @click="handleSearch(keyword)" class="px-3 py-1.5 bg-secondary rounded-full text-sm">{{ keyword }}</text>
              <text @click="handleDeleteHistory(keyword)" class="w-5 h-5 -ml-1.5 rounded-full flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100">✕</text>
            </view>
          </view>
        </section>

        <section>
          <view class="flex items-center gap-2 mb-3">
            <text class="text-primary">📈</text>
            <text class="text-sm font-medium">热门搜索</text>
          </view>
          <view class="flex flex-wrap gap-2">
            <text v-for="(item, i) in hotSearchData" :key="i" @click="handleSearch(item.keyword)"
              :class="['px-3 py-1.5 rounded-full text-sm', item.isHot ? 'bg-primary/10 text-primary' : 'bg-secondary']">
              {{ item.keyword }}
              <text v-if="item.isHot" class="ml-1 text-[10px] text-primary">HOT</text>
            </text>
          </view>
        </section>

        <!-- 推荐古籍 -->
        <section>
          <view class="flex items-center justify-between mb-3">
            <text class="text-sm font-medium">为你推荐</text>
            <view @click="goTo('/pages/classics/home')" class="text-xs text-muted-foreground flex items-center">
              <text>更多</text><text class="text-xs">›</text>
            </view>
          </view>
          <view class="space-y-3">
            <view v-for="(book, i) in searchResultsData.slice(0, 3)" :key="book.id" @click="goTo('/pages/classics/' + book.id + '/id-detail')" class="flex gap-3 p-3 bg-white rounded-xl border border-border/50">
              <view class="w-14 h-[72px] rounded-[2px] overflow-hidden relative flex-shrink-0 bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] border border-[#d0c0a0]/40 shadow-sm">
                <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#d4c4a8]" />
                <view class="absolute inset-0 left-1.5 flex items-center justify-center">
                  <text class="text-[8px] font-serif font-bold text-[#3d3225]">{{ book.title.slice(0, 2) }}</text>
                </view>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2">
                  <text class="font-medium text-sm">{{ book.title }}</text>
                  <text class="bg-secondary text-[10px] px-1.5 py-0.5 rounded">{{ book.dynasty }}</text>
                  <text v-if="book.isFree" class="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">免费</text>
                </view>
                <text class="text-xs text-muted-foreground block">{{ book.author }}</text>
                <text class="text-xs text-muted-foreground/70 block mt-0.5 line-clamp-1">{{ book.description }}</text>
                <view class="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <text><text class="text-amber-400"></text>{{ book.rating }}</text>
                  <text><text></text>{{ (book.reads/10000).toFixed(1) }}万</text>
                </view>
              </view>
            </view>
          </view>
        </section>
      </view>

      <!-- 搜索建议 -->
      <view v-if="searchState === 'suggesting' && suggestions.length > 0" class="space-y-1">
        <view v-for="(suggestion, i) in suggestions" :key="i" @click="handleSearch(suggestion.text)" class="flex items-center gap-3 px-3 py-3 rounded-lg">
          <text class="text-muted-foreground flex-shrink-0"></text>
          <text class="flex-1 text-sm">{{ suggestion.text }}</text>
          <text class="bg-secondary text-[10px] px-2 py-0.5 rounded">古籍</text>
        </view>
      </view>

      <!-- 搜索结果 -->
      <view v-if="searchState === 'results'" class="space-y-4">
        <view class="flex items-center justify-between">
          <text class="text-sm text-muted-foreground">共找到 <text class="text-foreground font-medium">{{ results.length }}</text> 部古籍</text>
          <text class="text-xs text-muted-foreground flex items-center gap-1">
            <text>🔽</text>筛选
          </text>
        </view>
        <view class="space-y-3">
          <view v-for="(book, i) in results" :key="book.id" @click="goTo('/pages/classics/' + book.id + '/id-detail')" class="flex gap-3 p-3 bg-white rounded-xl border border-border/50">
            <view class="w-14 h-[72px] rounded-[2px] overflow-hidden relative flex-shrink-0 bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] border border-[#d0c0a0]/40 shadow-sm">
              <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#d4c4a8]" />
              <view class="absolute inset-0 left-1.5 flex items-center justify-center">
                <text class="text-[8px] font-serif font-bold text-[#3d3225]">{{ book.title.slice(0, 2) }}</text>
              </view>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-medium text-sm">{{ book.title }}</text>
                <text class="bg-secondary text-[10px] px-1.5 py-0.5 rounded">{{ book.dynasty }}</text>
                <text v-if="book.isFree" class="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">免费</text>
              </view>
              <text class="text-xs text-muted-foreground block">{{ book.author }}</text>
              <text class="text-xs text-muted-foreground/70 block mt-0.5 line-clamp-1">{{ book.description }}</text>
              <view class="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <text><text class="text-amber-400"></text>{{ book.rating }}</text>
                <text><text></text>{{ (book.reads/10000).toFixed(1) }}万</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空结果 -->
      <view v-if="searchState === 'empty'" class="flex flex-col items-center justify-center py-16 text-center">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <text class="text-3xl text-muted-foreground"></text>
        </view>
        <text class="font-medium mb-1">未找到相关古籍</text>
        <text class="text-sm text-muted-foreground mb-4">换个关键词试试，或者使用AI助手帮你找</text>
        <view @click="goTo('/pages/classics/ai-assistant')" class="px-6 py-2 bg-primary text-white rounded-full text-sm flex items-center gap-2">
          <text></text>询问AI助手
        </view>
      </view>

      <!-- 搜索中 -->
      <view v-if="isSearching" class="flex items-center justify-center py-16">
        <view class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const searchHistoryData = ["周易", "道德经", "黄帝内经", "论语", "孙子兵法"]
const hotSearchData = [{ keyword: "周易", isHot: true }, { keyword: "道德经", isHot: true }, { keyword: "滴天髓", isHot: false }, { keyword: "子平真诠", isHot: false }, { keyword: "黄帝内经", isHot: true }, { keyword: "伤寒论", isHot: false }, { keyword: "论语", isHot: true }, { keyword: "庄子", isHot: false }]

const searchResultsData = [
  { id: "1", title: "周易", author: "伏羲", dynasty: "周", description: "群经之首，大道之源", reads: 128600, rating: 4.9, hasAI: true, hasTranslation: true, isFree: true, isFinePrint: true },
  { id: "2", title: "周易正义", author: "孔颖达", dynasty: "唐", description: "疏解周易，阐明义理", reads: 45600, rating: 4.8, hasAI: true, hasTranslation: true, isFree: false, isFinePrint: true },
  { id: "3", title: "周易集解", author: "李鼎祚", dynasty: "唐", description: "汇集汉魏诸家易说", reads: 32100, rating: 4.7, hasAI: true, hasTranslation: false, isFree: false, isFinePrint: false },
  { id: "4", title: "周易本义", author: "朱熹", dynasty: "宋", description: "理学大师注解周易", reads: 58900, rating: 4.9, hasAI: true, hasTranslation: true, isFree: true, isFinePrint: true },
  { id: "5", title: "周易参同契", author: "魏伯阳", dynasty: "汉", description: "丹道修炼之祖书", reads: 28700, rating: 4.6, hasAI: true, hasTranslation: true, isFree: false, isFinePrint: false },
]

const searchSuggestionsData = [{ text: "周易", type: "book" }, { text: "周易正义", type: "book" }, { text: "周易本义", type: "book" }, { text: "周易集解", type: "book" }, { text: "周易参同契", type: "book" }]

type SearchState = "initial" | "suggesting" | "results" | "empty"

const searchInputRef = ref<any>(null)
const searchValue = ref("")
const searchState = ref<SearchState>("initial")
const searchHistory = ref<string[]>(searchHistoryData)
const suggestions = ref<{ text: string; type: string }[]>([])
const results = ref<typeof searchResultsData>([])
const isSearching = ref(false)

onMounted(() => {
  setTimeout(() => { searchInputRef.value?.focus() }, 300)
})

function onInputChange(e: any) {
  const value = e.detail.value
  searchValue.value = value
  if (value.trim()) {
    const filtered = searchSuggestionsData.filter(s => s.text.includes(value))
    suggestions.value = filtered
    searchState.value = "suggesting"
  } else {
    suggestions.value = []
    searchState.value = "initial"
  }
}

function handleSearch(keyword?: string) {
  const searchKeyword = keyword || searchValue.value.trim()
  if (!searchKeyword) return
  isSearching.value = true
  searchValue.value = searchKeyword
  searchHistory.value = [searchKeyword, ...searchHistory.value.filter(h => h !== searchKeyword)].slice(0, 10)
  setTimeout(() => {
    const filtered = searchResultsData.filter(r => r.title.includes(searchKeyword) || r.author.includes(searchKeyword) || r.description.includes(searchKeyword))
    results.value = filtered
    searchState.value = filtered.length > 0 ? "results" : "empty"
    isSearching.value = false
  }, 500)
}

function handleClear() {
  searchValue.value = ""
  suggestions.value = []
  results.value = []
  searchState.value = "initial"
  searchInputRef.value?.focus()
}

function handleClearHistory() { searchHistory.value = [] }
function handleDeleteHistory(keyword: string) { searchHistory.value = searchHistory.value.filter(h => h !== keyword) }

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
