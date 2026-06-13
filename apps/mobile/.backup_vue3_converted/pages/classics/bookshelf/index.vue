<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background border-b border-border/60">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="w-8 h-8 rounded-full flex items-center justify-center">
            <text class="text-base text-muted-foreground">←</text>
          </view>
          <text class="font-medium text-foreground">我的书房</text>
        </view>
        <view class="flex items-center gap-2">
          <template v-if="isSelectMode">
            <text @click="cancelSelect" class="text-sm text-muted-foreground px-2 py-1">取消</text>
            <text
              @click="handleBatchRemove"
              :class="['text-sm px-2 py-1 rounded', selectedIds.size === 0 ? 'text-muted-foreground' : 'text-danger font-medium']"
            >移除 ({{ selectedIds.size }})</text>
          </template>
          <template v-else>
            <text @click="goTo('/pages/classics/search/index')" class="w-8 h-8 rounded-full flex items-center justify-center text-base"></text>
            <text @click="showMenu = !showMenu" class="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground font-bold">⋯</text>
          </template>
        </view>
      </view>
      <!-- 更多菜单 -->
      <view v-if="showMenu" class="absolute right-4 top-14 bg-white rounded-xl shadow-lg border border-border z-50 min-w-[140px] py-1">
        <view class="px-4 py-2.5 text-sm text-foreground flex items-center gap-2" @click="showMenu = false; isSelectMode = true">
          <text></text>
          <text>批量管理</text>
        </view>
        <view class="px-4 py-2.5 text-sm text-foreground flex items-center gap-2 border-t border-border/50" @click="showMenu = false; createGroup()">
          <text>📁</text>
          <text>新建分组</text>
        </view>
      </view>
    </view>

    <!-- Tab: 书架 / 浏览历史 -->
    <view class="px-4 pt-3 pb-2 border-b border-border/60">
      <view class="flex bg-secondary/50 rounded-lg p-0.5">
        <text
          @click="activeTab = 'shelf'"
          :class="['flex-1 text-center py-1.5 text-xs rounded-md transition-all', activeTab === 'shelf' ? 'bg-white shadow-sm font-medium text-foreground' : 'text-muted-foreground']"
        >书架</text>
        <text
          @click="activeTab = 'history'"
          :class="['flex-1 text-center py-1.5 text-xs rounded-md transition-all', activeTab === 'history' ? 'bg-white shadow-sm font-medium text-foreground' : 'text-muted-foreground']"
        >浏览历史</text>
      </view>
    </view>

    <!-- ====== 书架 Tab ====== -->
    <view v-if="activeTab === 'shelf'">
      <!-- 分组筛选 -->
      <view class="px-4 py-3 flex items-center gap-2 overflow-x-auto" style="scrollbar-width: none;">
        <text
          @click="activeGroup = null"
          :class="['px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors', activeGroup === null ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']"
        >全部</text>
        <text
          v-for="group in groupsData"
          :key="group.id"
          @click="activeGroup = group.id"
          :class="['px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex items-center gap-1 transition-colors', activeGroup === group.id ? colorClasses[group.color] : 'bg-secondary text-muted-foreground']"
        >
          {{ group.name }}
          <text class="bg-white/60 text-[9px] px-1 py-0 rounded-full ml-0.5">{{ group.count }}</text>
        </text>
        <text @click="createGroup" class="p-1.5 rounded-full bg-secondary text-muted-foreground text-sm flex-shrink-0">+</text>
      </view>

      <!-- 视图切换 -->
      <view class="px-4 pb-3 flex items-center justify-between">
        <text class="text-xs text-muted-foreground">共 <text class="text-foreground font-medium">{{ filteredBooks.length }}</text> 本</text>
        <view class="flex items-center gap-1">
          <text @click="viewMode = 'grid'" :class="['p-1.5 rounded text-base transition-colors', viewMode === 'grid' ? 'bg-secondary' : '']">⊞</text>
          <text @click="viewMode = 'list'" :class="['p-1.5 rounded text-base transition-colors', viewMode === 'list' ? 'bg-secondary' : '']">☰</text>
        </view>
      </view>

      <view class="px-4">
        <!-- 空状态 -->
        <view v-if="filteredBooks.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <text class="text-3xl text-muted-foreground"></text>
          </view>
          <text class="font-medium text-foreground mb-1">书架是空的</text>
          <text class="text-sm text-muted-foreground mb-4">去古籍馆探索感兴趣的古籍吧</text>
          <view @click="goTo('/pages/classics/home/index')" class="px-6 py-2 bg-primary text-white rounded-full text-sm">探索古籍</view>
        </view>

        <!-- 网格模式 -->
        <view v-else-if="viewMode === 'grid'" class="grid grid-cols-3 gap-3">
          <view
            v-for="book in filteredBooks"
            :key="book.id"
            @click="isSelectMode ? handleToggleSelect(book.id) : goTo('/pages/reader/' + book.id)"
            :class="['relative', isSelectMode ? 'cursor-pointer' : '', selectedIds.has(book.id) ? 'ring-2 ring-primary rounded-lg' : '']"
          >
            <!-- 古籍封面 -->
            <view :class="['aspect-[3/4] rounded-lg overflow-hidden relative shadow-md', getCoverBg(book.coverColor)]">
              <view class="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/10 to-transparent" />
              <view class="absolute inset-0 flex flex-col items-center justify-center p-3">
                <text class="text-sm font-serif font-bold text-amber-900 text-center leading-snug">{{ book.title }}</text>
                <text class="text-[10px] text-amber-800/70 mt-1">[{{ book.dynasty }}]</text>
              </view>
              <!-- 阅读进度 -->
              <view class="absolute bottom-2 left-2 right-2">
                <view class="h-1 bg-white/30 rounded-full overflow-hidden">
                  <view class="h-full bg-amber-500 rounded-full" :style="{ width: book.progress + '%' }" />
                </view>
              </view>
              <!-- AI/翻译标识 -->
              <view class="absolute top-2 left-2 flex gap-1">
                <text v-if="book.hasAI" class="px-1 py-0.5 bg-primary/80 text-white text-[8px] rounded">AI</text>
                <text v-if="book.hasTranslation" class="px-1 py-0.5 bg-accent/80 text-white text-[8px] rounded">译</text>
              </view>
            </view>
            <!-- 选中标识 -->
            <view v-if="isSelectMode && selectedIds.has(book.id)" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow z-10">
              <text class="text-[10px] text-white font-bold">✓</text>
            </view>
          </view>

          <!-- 添加更多 -->
          <view @click="goTo('/pages/classics/home/index')" class="aspect-[3/4.2] rounded-sm border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <text class="text-lg">+</text>
            <text class="text-xs">添加</text>
          </view>
        </view>

        <!-- 列表模式 -->
        <view v-else class="space-y-3">
          <view
            v-for="book in filteredBooks"
            :key="book.id"
            @click="isSelectMode ? handleToggleSelect(book.id) : goTo('/pages/reader/' + book.id)"
            :class="['p-3 flex items-center gap-3 bg-white rounded-xl border border-border/50 transition-all', isSelectMode ? 'cursor-pointer' : '', selectedIds.has(book.id) ? 'ring-2 ring-primary' : '']"
          >
            <!-- 小封面 -->
            <view class="w-12 h-16 rounded-sm flex-shrink-0 flex items-center justify-center relative bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm">
              <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#d4c4a8] rounded-l-sm" />
              <text class="text-[9px] font-serif font-bold text-[#4a3f2f] leading-none">{{ book.title.slice(0, 3) }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-sm text-foreground block">{{ book.title }}</text>
              <text class="text-xs text-muted-foreground block">[{{ book.dynasty }}] {{ book.author }}</text>
              <view class="flex items-center gap-2 mt-1">
                <view class="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                  <view class="h-full bg-primary/70 rounded-full transition-all" :style="{ width: book.progress + '%' }" />
                </view>
                <text class="text-[10px] text-muted-foreground flex-shrink-0">{{ book.progress }}%</text>
              </view>
            </view>
            <!-- 操作 -->
            <view v-if="!isSelectMode" @click.stop="showBookActions(book)" class="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <text class="text-lg text-muted-foreground">⋯</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ====== 浏览历史 Tab ====== -->
    <view v-if="activeTab === 'history'" class="p-4 space-y-3">
      <view
        v-for="item in readingHistoryData"
        :key="item.id"
        @click="goTo('/pages/reader/' + item.id)"
        class="flex items-center gap-3 p-3 bg-white rounded-xl border border-border/50"
      >
        <view class="w-10 h-14 rounded-sm flex-shrink-0 flex items-center justify-center relative bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm">
          <view class="absolute left-0 top-0 bottom-0 w-1 bg-[#d4c4a8] rounded-l-sm" />
          <text class="text-[8px] font-serif font-bold text-[#4a3f2f]">{{ item.title.slice(0, 2) }}</text>
        </view>
        <view class="flex-1 min-w-0">
          <text class="font-medium text-sm text-foreground block">{{ item.title }}</text>
          <text class="text-xs text-muted-foreground block">{{ item.chapter }}</text>
        </view>
        <view class="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <text class="text-xs">🕐</text>
          <text>{{ item.readAt }}</text>
        </view>
      </view>
      <view v-if="readingHistoryData.length > 0" @click="clearHistory" class="w-full py-2.5 text-center text-xs text-muted-foreground bg-white rounded-xl border border-border/50">
        清空历史记录
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface ShelfBook {
  id: string; title: string; author: string; dynasty: string
  progress: number; hasAI: boolean; hasTranslation: boolean
  lastReadAt: string; coverColor: string
}

interface HistoryItem {
  id: string; title: string; author: string; dynasty: string
  chapter: string; readAt: string
}

interface Group {
  id: string; name: string; count: number; color: string
}

const bookshelfData: ShelfBook[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', progress: 32, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-15', coverColor: 'cream' },
  { id: '2', title: '道德经', author: '老子', dynasty: '春秋', progress: 68, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-14', coverColor: 'brown' },
  { id: '3', title: '黄帝内经', author: '佚名', dynasty: '战国', progress: 15, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-13', coverColor: 'blue' },
  { id: '4', title: '论语', author: '孔子门人', dynasty: '春秋', progress: 45, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-12', coverColor: 'green' },
  { id: '5', title: '滴天髓', author: '刘基', dynasty: '明', progress: 8, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-10', coverColor: 'gray' },
]

const readingHistoryData: HistoryItem[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', chapter: '乾卦', readAt: '今天 14:30' },
  { id: '2', title: '道德经', author: '老子', dynasty: '春秋', chapter: '第四十二章', readAt: '昨天 20:15' },
  { id: '3', title: '论语', author: '孔子门人', dynasty: '春秋', chapter: '学而篇', readAt: '3天前' },
]

const groupsData: Group[] = [
  { id: '1', name: '命理研究', count: 5, color: 'amber' },
  { id: '2', name: '道家经典', count: 3, color: 'emerald' },
  { id: '3', name: '养生必读', count: 4, color: 'blue' },
]

const colorClasses: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
}

const viewMode = ref<'grid' | 'list'>('grid')
const selectedIds = ref<Set<string>>(new Set())
const isSelectMode = ref(false)
const books = ref<ShelfBook[]>([...bookshelfData])
const activeGroup = ref<string | null>(null)
const activeTab = ref<'shelf' | 'history'>('shelf')
const showMenu = ref(false)

const filteredBooks = computed(() => books.value.filter(book =>
  book.title.includes('') || book.author.includes('')
))

function getCoverBg(color: string): string {
  const map: Record<string, string> = {
    cream: 'bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100',
    brown: 'bg-gradient-to-b from-stone-200 via-stone-100 to-stone-200',
    blue: 'bg-gradient-to-b from-blue-100 via-blue-50 to-blue-100',
    green: 'bg-gradient-to-b from-emerald-100 via-emerald-50 to-emerald-100',
    gray: 'bg-gradient-to-b from-gray-200 via-gray-100 to-gray-200',
  }
  return map[color] || map.cream
}

function handleRemoveFromShelf(id: string) {
  books.value = books.value.filter(book => book.id !== id)
}

function handleBatchRemove() {
  books.value = books.value.filter(book => !selectedIds.value.has(book.id))
  selectedIds.value = new Set()
  isSelectMode.value = false
  uni.showToast({ title: '已移除', icon: 'none' })
}

function cancelSelect() {
  isSelectMode.value = false
  selectedIds.value = new Set()
}

function handleToggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function showBookActions(book: ShelfBook) {
  uni.showActionSheet({
    itemList: ['继续阅读', '移动分组', '移出书架'],
    success: (e) => {
      if (e.tapIndex === 0) goTo('/pages/reader/' + book.id)
      else if (e.tapIndex === 2) handleRemoveFromShelf(book.id)
    },
  })
}

function clearHistory() {
  uni.showToast({ title: '已清空', icon: 'none' })
}

function createGroup() {
  uni.showToast({ title: '新建分组功能即将开放', icon: 'none' })
}

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
</style>
