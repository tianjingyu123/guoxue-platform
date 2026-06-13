<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50 bg-background border-b border-border/60">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
            <text class="text-base">←</text>
          </view>
          <text class="font-medium text-foreground">我的书签</text>
          <text v-if="!isSelectMode && bookmarks.length > 0" class="text-xs text-muted-foreground ml-1">共 {{ bookmarks.length }} 个</text>
        </view>
        <view class="flex items-center gap-2">
          <template v-if="isSelectMode">
            <text @click="handleCancelSelect" class="text-sm text-muted-foreground px-2 py-1">取消</text>
            <text @click="handleBatchDelete" :class="['text-sm px-2 py-1 rounded', selectedIds.size === 0 ? 'text-muted-foreground' : 'text-danger']">
              删除 ({{ selectedIds.size }})
            </text>
          </template>
          <template v-else>
            <view class="relative">
              <text @click="showMenu = !showMenu" class="w-8 h-8 rounded-full flex items-center justify-center text-lg">⋯</text>
              <!-- 下拉菜单遮罩 -->
              <view v-if="showMenu" class="fixed inset-0 z-40" @click="showMenu = false" />
              <!-- 下拉菜单 -->
              <view v-if="showMenu" class="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-border z-50 overflow-hidden">
                <view @click="handleEnterBatchMode" class="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary">
                  <text></text>
                  <text>批量管理</text>
                </view>
              </view>
            </view>
          </template>
        </view>
      </view>
      <!-- 搜索和视图切换 -->
      <view class="px-4 pb-3 flex items-center gap-3">
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2" style="transform:translateY(-50%);color:#999;font-size:14px;"></text>
          <input v-model="searchValue" placeholder="搜索书签内容..." class="w-full pl-9 h-9 bg-secondary border-0 rounded-full text-sm outline-none" style="color:#2C2C2C;" />
        </view>
        <view class="flex bg-secondary rounded-lg p-0.5">
          <text @click="viewMode = 'timeline'" :class="['px-3 py-1 text-xs rounded-md transition-colors', viewMode === 'timeline' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground']">时间线</text>
          <text @click="viewMode = 'book'" :class="['px-3 py-1 text-xs rounded-md transition-colors', viewMode === 'book' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground']">按书籍</text>
        </view>
      </view>
    </header>

    <!-- 搜索结果计数 -->
    <view v-if="searchValue && filteredBookmarks.length > 0" class="px-4 pb-2">
      <text class="text-xs text-muted-foreground">搜索到 {{ filteredBookmarks.length }} 个相关书签</text>
    </view>
    <!-- 书签列表 -->
    <view class="p-4">
      <!-- 空状态 -->
      <view v-if="filteredBookmarks.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <text class="text-3xl text-muted-foreground">🔖</text>
        </view>
        <template v-if="searchValue">
          <text class="font-medium text-foreground mb-1">未找到相关书签</text>
          <text class="text-sm text-muted-foreground mb-4">试试其他关键词搜索</text>
        </template>
        <template v-else>
          <text class="font-medium text-foreground mb-1">暂无书签</text>
          <text class="text-sm text-muted-foreground mb-4">阅读时长按文字可添加书签</text>
          <view @click="goTo('/pages/classics/home/index')" class="inline-block px-6 py-2 bg-white border border-border rounded-full text-sm text-foreground">去阅读</view>
        </template>
      </view>

      <!-- 时间线视图 -->
      <view v-else-if="viewMode === 'timeline'" class="space-y-3">
        <view v-for="bm in filteredBookmarks" :key="bm.id"
          @click="isSelectMode && handleToggleSelect(bm.id)"
          :class="['p-4 rounded-xl border-l-4 transition-all bg-white', getColorBorder(bm.color), isSelectMode ? 'cursor-pointer' : '', selectedIds.has(bm.id) ? 'ring-2 ring-primary' : '']">
          <view class="flex items-start justify-between gap-3">
            <view class="flex-1 min-w-0">
              <!-- 书籍信息 -->
              <view class="flex items-center gap-2 mb-2">
                <text @click.stop="!isSelectMode && goTo('/pages/classics/' + bm.bookId + '/id-detail')" class="text-sm font-medium text-foreground hover:text-primary">
                  《{{ bm.bookTitle }}》
                </text>
                <text class="text-xs text-muted-foreground">{{ bm.chapter }} · 第{{ bm.page }}页</text>
              </view>
              <!-- 书签内容 -->
              <text class="text-sm leading-relaxed mb-2 font-serif block text-foreground">{{ bm.content }}</text>
              <!-- 时间 -->
              <view class="flex items-center gap-1 text-xs text-muted-foreground">
                <text>🕐</text>
                <text>{{ bm.createdAt }}</text>
              </view>
            </view>
            <!-- 操作按钮 -->
            <view v-if="!isSelectMode" class="flex-shrink-0">
              <text @click.stop="selectedBookmark = bm" class="w-8 h-8 flex items-center justify-center text-lg text-muted-foreground">⋯</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 按书籍分组视图 -->
      <view v-else class="space-y-4">
        <view v-for="group in groupedBookmarks" :key="group.bookId">
          <!-- 书籍标题 -->
          <view @click="goTo('/pages/classics/' + group.bookId + '/id-detail')" class="flex items-center justify-between p-3 bg-secondary/50 rounded-lg mb-2 hover:bg-secondary transition-colors">
            <view class="flex items-center gap-3">
              <view class="w-8 h-11 rounded bg-gradient-to-b from-amber-100 to-amber-50 flex items-center justify-center shadow-sm">
                <text class="text-[8px] font-serif font-bold text-amber-800">{{ group.bookTitle.slice(0, 2) }}</text>
              </view>
              <view>
                <text class="font-medium text-sm text-foreground">《{{ group.bookTitle }}》</text>
                <text class="text-xs text-muted-foreground block">[{{ group.dynasty }}] {{ group.bookAuthor }}</text>
              </view>
            </view>
            <view class="flex items-center gap-1 text-muted-foreground">
              <text class="text-xs">{{ group.count }}个书签</text>
              <text class="text-lg text-muted-foreground">›</text>
            </view>
          </view>
          <!-- 书签列表 -->
          <view class="space-y-2 pl-4 border-l-2 border-border/60 ml-4">
            <view v-for="bm in group.items" :key="bm.id"
              @click="isSelectMode && handleToggleSelect(bm.id)"
              :class="['p-3 rounded-xl border-l-2 bg-white/50 border border-border/50', getColorBorder(bm.color), isSelectMode ? 'cursor-pointer' : '', selectedIds.has(bm.id) ? 'ring-2 ring-primary' : '']">
              <text class="text-xs text-muted-foreground block mb-1">{{ bm.chapter }} · 第{{ bm.page }}页</text>
              <text class="text-sm font-serif line-clamp-2 block text-foreground">{{ bm.content }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 书签操作底部弹出菜单 -->
    <view v-if="selectedBookmark && !isSelectMode" class="fixed inset-0 z-50" @click="selectedBookmark = null">
      <view class="absolute inset-0 bg-black/30" />
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl overflow-hidden" style="padding-bottom:env(safe-area-inset-bottom);" @click.stop>
        <view class="flex items-center justify-center pt-3 pb-2">
          <view class="w-8 h-1 rounded-full bg-[#E8E0D5]" />
        </view>
        <view class="px-4 pb-4">
          <text class="text-sm font-medium text-foreground block mb-3 px-2">书签操作</text>
          <view @click="handleShareBookmark(selectedBookmark)" class="flex items-center gap-3 px-4 py-3.5 rounded-xl active:bg-secondary">
            <text class="text-lg text-muted-foreground"></text>
            <text class="text-sm text-foreground">分享</text>
          </view>
          <view @click="handleJumpToReading(selectedBookmark)" class="flex items-center gap-3 px-4 py-3.5 rounded-xl active:bg-secondary">
            <text class="text-lg text-muted-foreground"></text>
            <text class="text-sm text-foreground">跳转阅读</text>
          </view>
          <view class="h-px bg-[#E8E0D5] my-1" />
          <view @click="handleDeleteBookmark(selectedBookmark)" class="flex items-center gap-3 px-4 py-3.5 rounded-xl active:bg-secondary">
            <text class="text-lg text-danger">🗑️</text>
            <text class="text-sm text-danger">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Bookmark {
  id: string; bookId: string; bookTitle: string; bookAuthor: string; dynasty: string
  chapter: string; content: string; page: number; createdAt: string; color: string
}

// 模拟数据 - 用户书签列表
const bookmarksData: Bookmark[] = [
  { id: "1", bookId: "1", bookTitle: "周易", bookAuthor: "伏羲", dynasty: "周", chapter: "乾卦", content: "天行健，君子以自强不息。", page: 12, createdAt: "2024-01-15 14:30", color: "amber" },
  { id: "2", bookId: "1", bookTitle: "周易", bookAuthor: "伏羲", dynasty: "周", chapter: "坤卦", content: "地势坤，君子以厚德载物。", page: 28, createdAt: "2024-01-15 15:20", color: "blue" },
  { id: "3", bookId: "2", bookTitle: "道德经", bookAuthor: "老子", dynasty: "春秋", chapter: "第一章", content: "道可道，非常道。名可名，非常名。", page: 1, createdAt: "2024-01-14 10:15", color: "green" },
  { id: "4", bookId: "3", bookTitle: "论语", bookAuthor: "孔子门人", dynasty: "春秋", chapter: "学而篇", content: "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？", page: 5, createdAt: "2024-01-13 09:00", color: "purple" },
  { id: "5", bookId: "1", bookTitle: "周易", bookAuthor: "伏羲", dynasty: "周", chapter: "蒙卦", content: "蒙以养正，圣功也。", page: 45, createdAt: "2024-01-12 14:20", color: "amber" },
  { id: "6", bookId: "4", bookTitle: "庄子", bookAuthor: "庄周", dynasty: "战国", chapter: "逍遥游", content: "北冥有鱼，其名为鲲。鲲之大，不知其几千里也。", page: 1, createdAt: "2024-01-11 11:00", color: "green" },
]

const searchValue = ref("")
const selectedIds = ref<Set<string>>(new Set())
const isSelectMode = ref(false)
const bookmarks = ref<Bookmark[]>(bookmarksData)
const viewMode = ref<"timeline" | "book">("timeline")
const showMenu = ref(false)
const selectedBookmark = ref<Bookmark | null>(null)

const colorBorders: Record<string, string> = {
  amber: "border-amber-300 bg-amber-50/30",
  blue: "border-blue-300 bg-blue-50/30",
  green: "border-green-300 bg-green-50/30",
  purple: "border-purple-300 bg-purple-50/30",
}

function getColorBorder(color: string): string {
  return colorBorders[color] || colorBorders.amber
}

const filteredBookmarks = computed(() => {
  return bookmarks.value.filter(bm =>
    bm.content.includes(searchValue.value) ||
    bm.bookTitle.includes(searchValue.value) ||
    bm.chapter.includes(searchValue.value)
  )
})

const groupedBookmarks = computed(() => {
  const groups: Record<string, Bookmark[]> = {}
  filteredBookmarks.value.forEach(bm => {
    if (!groups[bm.bookId]) groups[bm.bookId] = []
    groups[bm.bookId].push(bm)
  })
  return Object.entries(groups).map(([bookId, items]) => ({
    bookId, bookTitle: items[0].bookTitle, bookAuthor: items[0].bookAuthor,
    dynasty: items[0].dynasty, count: items.length, items,
  }))
})

function handleCancelSelect() {
  isSelectMode.value = false
  selectedIds.value = new Set()
}

function handleEnterBatchMode() {
  showMenu.value = false
  isSelectMode.value = true
}

function handleDeleteBookmark(bm: Bookmark) {
  selectedBookmark.value = null
  uni.showModal({
    title: '删除书签',
    content: '确定要删除此书签吗？',
    success: (res) => {
      if (res.confirm) {
        bookmarks.value = bookmarks.value.filter(b => b.id !== bm.id)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}

function handleBatchDelete() {
  uni.showModal({
    title: '批量删除',
    content: `确定要删除选中的 ${selectedIds.value.size} 个书签吗？`,
    success: (res) => {
      if (res.confirm) {
        bookmarks.value = bookmarks.value.filter(bm => !selectedIds.value.has(bm.id))
        selectedIds.value = new Set()
        isSelectMode.value = false
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}

function handleToggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function handleShareBookmark(bm: Bookmark) {
  selectedBookmark.value = null
  uni.showShareMenu({ withShareTicket: true })
}

function handleJumpToReading(bm: Bookmark) {
  selectedBookmark.value = null
  uni.navigateTo({ url: '/pages/classics/' + bm.bookId + '/id-detail' })
}

// 页面关闭时清理选中状态
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 书签卡片颜色标识和选中态高亮效果 */
/* 四种颜色标识：琥珀/蓝色/绿色/紫色 */
/* 书签卡片支持多颜色区分不同书籍来源 */
</style>
