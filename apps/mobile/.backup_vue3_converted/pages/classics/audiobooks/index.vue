<template>
  <view class="min-h-screen bg-background">
    <!-- 骨架屏 -->
    <template v-if="loading">
      <view class="sticky top-0 z-10 bg-background border-b border-border">
        <view class="flex items-center justify-between px-4 py-3">
          <view class="w-7 h-7 bg-gray-200 rounded" />
          <view class="w-16 h-5 bg-gray-200 rounded" />
          <view class="w-8" />
        </view>
      </view>
      <view class="mx-4 mt-4 space-y-3">
        <view v-for="i in 4" :key="i" class="h-32 bg-gray-200 rounded-xl" />
      </view>
    </template>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-background border-b border-border">
        <view class="flex items-center justify-between px-4 py-3">
          <view @click="goBack" class="p-1">
            <text class="text-foreground text-xl">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground"> 有声书</text>
          <view @click="goHistory" class="p-1">
            <text class="text-lg text-primary">🕐</text>
          </view>
        </view>
      </view>

      <!-- 分类筛选 -->
      <view class="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto bg-background border-b border-border">
        <view v-for="cat in filterCats" :key="cat.id" @click="activeCat = cat.id"
          class="px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-colors"
          :class="activeCat === cat.id ? 'bg-primary text-white' : 'bg-muted text-foreground'">
          {{ cat.icon }} {{ cat.label }}
        </view>
      </view>

      <scroll-view scroll-y class="pb-24" style="height: calc(100vh - 100px);">
        <!-- 正在播放 -->
        <view v-if="currentPlaying"
          class="sticky top-0 z-10 mx-4 mt-3 bg-white rounded-xl p-3 border border-primary/20 shadow-sm">
          <view class="flex items-center gap-3">
            <view class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
              
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-xs font-semibold text-foreground block truncate">{{ currentPlaying.title }}</text>
              <text class="text-[10px] text-muted-foreground block">{{ currentPlaying.narrator }}</text>
              <view class="w-full h-1 bg-gray-200 rounded-full mt-1.5">
                <view class="w-1/3 h-1 bg-primary rounded-full" />
              </view>
            </view>
            <view @click="pausePlay" class="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <text class="text-white text-lg">⏸</text>
            </view>
          </view>
        </view>

        <!-- 有声书列表 -->
        <view class="mx-4 mt-3">
          <view class="space-y-3">
            <view v-for="book in filteredBooks" :key="book.id"
              class="p-3.5 rounded-xl border border-border bg-white hover:border-primary/30 transition-all"
              @click="goPlay(book.id)">
              <view class="flex items-start gap-3 mb-3">
                <view class="w-16 h-22 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 text-2xl">
                  <text>{{ book.icon }}</text>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="font-semibold text-foreground text-sm block">{{ book.title }}</text>
                  <view class="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <text class="block">作者：{{ book.author }}</text>
                    <text class="block">播讲：{{ book.narrator }}</text>
                    <text class="block">时长：{{ book.duration }}</text>
                  </view>
                </view>
                <view @click.stop="toggleFavorite(book.id)" class="p-1 flex-shrink-0">
                  <text :class="book.isFav ? 'text-red-500' : 'text-[#CCC]'" class="text-lg">
                    {{ book.isFav ? '' : '🤍' }}
                  </text>
                </view>
              </view>

              <!-- 标签和信息 -->
              <view class="flex items-center gap-2 mb-3 flex-wrap">
                <text class="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary">{{ book.quality }}</text>
                <text class="text-[10px] text-muted-foreground">{{ book.episodes }}集</text>
                <text class="text-[10px] text-muted-foreground"> {{ book.plays.toLocaleString() }} 次播放</text>
                <text class="text-[10px] text-muted-foreground"> {{ book.rating }}</text>
              </view>

              <!-- 进度条 -->
              <view class="w-full h-1.5 bg-gray-100 rounded-full mb-2.5">
                <view class="h-1.5 bg-primary/30 rounded-full" :style="{ width: book.progress + '%' }" />
              </view>

              <!-- 操作按钮 -->
              <view class="flex gap-2">
                <view @click.stop="playBook(book)"
                  class="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-medium text-center">
                  <text>{{ currentPlaying?.id === book.id ? '⏸ 暂停' : '▶ 播放' }}</text>
                </view>
                <view @click.stop="downloadBook(book.id)"
                  class="py-2 px-4 rounded-lg bg-background text-muted-foreground text-xs text-center border border-border">
                  
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="filteredBooks.length === 0" class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl mb-3"></text>
          <text class="text-muted-foreground text-sm">该分类暂无有声书</text>
        </view>

        <view class="h-6" />
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const activeCat = ref('all')
const currentPlaying = ref<any>(null)

const filterCats = [
  { id: 'all', label: '全部', icon: '' },
  { id: 'jing', label: '经部', icon: '' },
  { id: 'shi', label: '史部', icon: '📜' },
  { id: 'zi', label: '子部', icon: '🌀' },
  { id: 'ji', label: '集部', icon: '' },
]

interface AudioBook {
  id: string
  title: string
  author: string
  duration: string
  narrator: string
  plays: number
  rating: number
  quality: string
  episodes: number
  icon: string
  progress: number
  isFav: boolean
  group: string
}

const books = ref<AudioBook[]>([
  { id: '1', title: '道德经全文朗读', author: '老子', duration: '4小时32分', narrator: '配音演员张三', plays: 12850, rating: 4.9, quality: '高保真', episodes: 81, icon: '️', progress: 65, isFav: true, group: 'zi' },
  { id: '2', title: '易经上下经讲解', author: '李明星', duration: '6小时15分', narrator: '配音演员李四', plays: 9850, rating: 4.8, quality: '高保真', episodes: 64, icon: '🔮', progress: 30, isFav: false, group: 'jing' },
  { id: '3', title: '论语精讲', author: '孔子研究院', duration: '5小时40分', narrator: '配音演员王五', plays: 8760, rating: 4.8, quality: '高保真', episodes: 20, icon: '', progress: 0, isFav: true, group: 'jing' },
  { id: '4', title: '史记精选', author: '司马迁', duration: '8小时20分', narrator: '配音演员赵六', plays: 7420, rating: 4.7, quality: '高保真', episodes: 30, icon: '📜', progress: 15, isFav: false, group: 'shi' },
  { id: '5', title: '黄帝内经诵读', author: '中医学院', duration: '5小时45分', narrator: '配音演员周七', plays: 5840, rating: 4.6, quality: '标清', episodes: 162, icon: '🏥', progress: 0, isFav: false, group: 'zi' },
  { id: '6', title: '庄子逍遥游解析', author: '道家文化院', duration: '3小时20分', narrator: '配音演员吴八', plays: 4560, rating: 4.7, quality: '高保真', episodes: 12, icon: '🦋', progress: 80, isFav: true, group: 'zi' },
  { id: '7', title: '唐诗三百首朗诵', author: '蘅塘退士编', duration: '10小时', narrator: '配音演员孙九', plays: 15200, rating: 4.9, quality: '高保真', episodes: 300, icon: '🌸', progress: 45, isFav: true, group: 'ji' },
  { id: '8', title: '资治通鉴选读', author: '司马光', duration: '12小时', narrator: '配音演员钱十', plays: 3250, rating: 4.5, quality: '标清', episodes: 50, icon: '', progress: 10, isFav: false, group: 'shi' },
])

const filteredBooks = computed(() => {
  if (activeCat.value === 'all') return books.value
  return books.value.filter(b => b.group === activeCat.value)
})

onMounted(() => {
  setTimeout(() => { loading.value = false }, 400)
})

function goBack() { uni.navigateBack() }
function goHistory() { uni.navigateTo({ url: '/pages/classics/audiobooks/history/index' }) }
function goPlay(id: string) { uni.navigateTo({ url: `/pages/classics/audiobooks/id-detail/index?id=${id}` }) }

function toggleFavorite(id: string) {
  const book = books.value.find(b => b.id === id)
  if (book) {
    book.isFav = !book.isFav
    uni.showToast({ title: book.isFav ? '已收藏' : '已取消收藏', icon: 'success' })
  }
}

function playBook(book: AudioBook) {
  if (currentPlaying.value?.id === book.id) {
    currentPlaying.value = null
  } else {
    currentPlaying.value = book
  }
}

function pausePlay() {
  currentPlaying.value = null
}

function downloadBook(id: string) {
  uni.showToast({ title: '开始下载...', icon: 'none' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
