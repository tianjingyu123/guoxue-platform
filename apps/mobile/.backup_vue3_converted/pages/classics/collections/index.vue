<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1"><text class="text-foreground text-xl">←</text></view>
        <text class="text-lg font-semibold text-foreground">我的收藏</text>
        <view class="w-8" />
      </view>
    </view>

    <view class="pb-20">
      <!-- 搜索和筛选 -->
      <view class="mx-4 mt-4 space-y-3">
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm z-10"></text>
          <input
            v-model="searchText"
            placeholder="搜索收藏"
            class="w-full h-10 pl-10 pr-3 rounded-lg bg-muted text-foreground text-sm border border-border placeholder:text-muted-foreground outline-none"
          />
        </view>

        <!-- 视图切换 -->
        <view class="flex gap-2">
          <view
            @click="viewMode = 'grid'"
            :class="['flex-1 py-2 rounded-lg text-sm font-medium text-center transition-all', viewMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary text-foreground border border-border']"
          >
            <text class="mr-1">⊞</text>网格
          </view>
          <view
            @click="viewMode = 'list'"
            :class="['flex-1 py-2 rounded-lg text-sm font-medium text-center transition-all', viewMode === 'list' ? 'bg-primary text-white' : 'bg-secondary text-foreground border border-border']"
          >
            <text class="mr-1">☰</text>列表
          </view>
        </view>
      </view>

      <!-- 收藏内容 -->
      <view class="mx-4 mt-4">
        <view v-if="filteredCollections.length > 0">
          <!-- 网格模式 -->
          <view v-if="viewMode === 'grid'" class="grid grid-cols-2 gap-3">
            <view
              v-for="item in filteredCollections"
              :key="item.id"
              class="group relative rounded-lg overflow-hidden bg-muted transition-all"
              @click="goDetail(item.id)"
            >
              <image :src="item.cover" mode="aspectFill" class="w-full h-48" />
              <view class="absolute inset-0 bg-black/40 flex flex-col items-end justify-between p-2">
                <view @click.stop="removeCollection(item.id)" class="p-1 bg-white/20 rounded-full">
                  <text class="text-white text-xs">🗑️</text>
                </view>
                <view class="text-left w-full">
                  <text class="text-sm font-semibold text-white line-clamp-2 block">{{ item.title }}</text>
                  <text class="text-xs text-white/80 mt-1 block">{{ getTypeLabel(item.type) }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 列表模式 -->
          <view v-else class="space-y-2">
            <view
              v-for="item in filteredCollections"
              :key="item.id"
              class="p-3 rounded-xl border border-border bg-white flex items-start gap-3 transition-all"
              @click="goDetail(item.id)"
            >
              <image :src="item.cover" mode="aspectFill" class="w-12 h-16 rounded object-cover flex-shrink-0" />
              <view class="flex-1 min-w-0">
                <text class="font-semibold text-foreground line-clamp-1 block">{{ item.title }}</text>
                <view class="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <text class="block">{{ item.author }}</text>
                  <text class="block">已播放 {{ item.plays }} 次</text>
                </view>
              </view>
              <view @click.stop="removeCollection(item.id)" class="p-1 text-muted-foreground mt-1">
                <text class="text-sm">🗑️</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="p-8 rounded-xl border border-border bg-white text-center">
          <text class="block mb-2 text-3xl">💖</text>
          <text class="text-muted-foreground text-sm block">还没有收藏任何内容</text>
          <view
            @click="goClassics"
            class="inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-lg border border-border text-sm text-foreground bg-secondary"
          >
            <text></text>
            <text>浏览古籍</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface CollectionItem {
  id: string
  title: string
  type: 'audiobook' | 'article' | 'video' | 'course'
  cover: string
  author: string
  addedDate: string
  plays: number
}

const mockCollections: CollectionItem[] = [
  { id: '1', title: '《道德经》完整版朗读', type: 'audiobook', cover: 'https://images.unsplash.com/photo-1507842217343-583faa270b1f?w=200', author: '王教授', addedDate: '2024-01-18', plays: 45 },
  { id: '2', title: '易经入门必读', type: 'article', cover: 'https://images.unsplash.com/photo-1516979187457-635ffe35ff15?w=200', author: '易学研究院', addedDate: '2024-01-17', plays: 0 },
  { id: '3', title: '四书五经核心讲座', type: 'video', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200', author: '孔子学堂', addedDate: '2024-01-16', plays: 28 },
  { id: '4', title: '黄帝内经养生秘诀', type: 'article', cover: 'https://images.unsplash.com/photo-1507842217343-583faa270b1f?w=200', author: '中医学院', addedDate: '2024-01-15', plays: 12 },
  { id: '5', title: '奇门遁甲应用指南', type: 'course', cover: 'https://images.unsplash.com/photo-1516979187457-635ffe35ff15?w=200', author: '命理大师', addedDate: '2024-01-14', plays: 0 },
]

const viewMode = ref<'grid' | 'list'>('grid')
const searchText = ref('')
const collections = ref<CollectionItem[]>([...mockCollections])

const filteredCollections = computed(() =>
  collections.value.filter(item =>
    item.title.includes(searchText.value) || item.author.includes(searchText.value)
  )
)

function goBack() { uni.navigateBack() }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/classics/books/${id}` }) }
function goClassics() { uni.navigateTo({ url: '/pages/classics/index' }) }

function removeCollection(id: string) {
  collections.value = collections.value.filter(item => item.id !== id)
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    audiobook: '有声书',
    article: '文章',
    video: '视频',
    course: '课程',
  }
  return labels[type] || type
}
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
