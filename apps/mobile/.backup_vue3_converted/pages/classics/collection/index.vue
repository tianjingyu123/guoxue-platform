<template>
  <view class="min-h-screen bg-background">
    <!-- 骨架屏 -->
    <template v-if="loading">
      <header class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <view class="w-7 h-7 bg-gray-200 rounded" />
        <view class="w-24 h-4 bg-gray-200 rounded" />
      </header>
      <view class="px-4 pt-4 space-y-3">
        <view v-for="i in 4" :key="i" class="h-28 bg-gray-200 rounded-xl" />
      </view>
    </template>

    <template v-else>
      <!-- 顶部导航 -->
      <header class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <view @click="goBack">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="text-base font-semibold text-foreground flex-1"> 我的收藏</text>
        <view v-if="!isEditing" @click="isEditing = true" class="text-xs text-primary font-medium px-2 py-1">
          管理
        </view>
        <view v-else @click="exitEdit" class="text-xs text-primary font-medium px-2 py-1">
          完成
        </view>
      </header>

      <!-- 分类筛选 -->
      <view class="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto bg-background border-b border-border">
        <view v-for="cat in filterCats" :key="cat.id" @click="activeCat = cat.id"
          class="px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-colors"
          :class="activeCat === cat.id ? 'bg-primary text-white' : 'bg-muted text-foreground'">
          {{ cat.icon }} {{ cat.label }} ({{ cat.count }})
        </view>
      </view>

      <!-- 批量操作栏 -->
      <view v-if="isEditing && selectedIds.length > 0"
        class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-border">
        <text class="text-xs text-primary font-medium">已选 {{ selectedIds.length }} 项</text>
        <view class="flex gap-2">
          <view @click="selectAll" class="px-3 py-1 bg-background rounded-lg text-xs text-muted-foreground">
            {{ selectedIds.length === filteredCollections.length ? '取消全选' : '全选' }}
          </view>
          <view @click="batchDelete" class="px-3 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-500">
            删除
          </view>
        </view>
      </view>

      <!-- 收藏列表 -->
      <scroll-view scroll-y class="pb-20" style="height: calc(100vh - 120px);">
        <template v-if="filteredCollections.length > 0">
          <view class="px-4 pt-3 space-y-3">
            <view v-for="item in filteredCollections" :key="item.id"
              class="bg-white border border-border rounded-xl overflow-hidden">
              <!-- 编辑模式选择框 -->
              <view v-if="isEditing" class="flex items-center px-3 pt-3 pb-0">
                <view @click.stop="toggleSelect(item.id)"
                  class="w-5 h-5 rounded border-2 flex items-center justify-center"
                  :class="selectedIds.includes(item.id) ? 'border-primary bg-primary' : 'border-[#CCC]'">
                  <text v-if="selectedIds.includes(item.id)" class="text-white text-[10px]">✓</text>
                </view>
              </view>
              <view class="flex gap-3 p-3.5" @click="isEditing ? toggleSelect(item.id) : goDetail(item.id)">
                <view class="w-16 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 text-2xl">
                  <text>{{ item.icon }}</text>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-semibold text-foreground block">{{ item.title }}</text>
                  <text class="text-xs text-muted-foreground block mt-0.5">{{ item.author }} · {{ item.dynasty }}</text>
                  <text class="text-xs text-muted-foreground block mt-0.5">{{ item.category }} · {{ item.type }}</text>
                  <text class="text-[10px] text-[#BBB] block mt-1">收藏于 {{ item.collectedAt }}</text>
                  <view class="flex items-center gap-2 mt-1.5">
                    <text class="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{{ item.typeLabel }}</text>
                    <text class="text-[10px] text-muted-foreground"> 读到{{ item.readProgress }}</text>
                  </view>
                </view>
              </view>
              <!-- 底部操作 -->
              <view v-if="!isEditing" class="flex border-t border-[#F5F1EB] divide-x divide-[#F5F1EB]">
                <view @click="goDetail(item.id)" class="flex-1 py-2 text-center text-xs text-primary font-medium">阅读</view>
                <view @click="removeItem(item.id)" class="flex-1 py-2 text-center text-xs text-muted-foreground">取消收藏</view>
              </view>
            </view>
          </view>
        </template>

        <!-- 空状态 -->
        <template v-else>
          <view class="flex flex-col items-center justify-center py-20">
            <text class="text-5xl text-[#E8E0D5] block mb-4"></text>
            <text class="text-base text-muted-foreground font-medium mb-1">暂无收藏</text>
            <text class="text-xs text-[#BBB] mb-4">去古籍分类页面收藏你感兴趣的书籍吧</text>
            <view @click="goBrowse"
              class="px-5 py-2 bg-primary text-white rounded-lg text-xs font-medium">去浏览古籍</view>
          </view>
        </template>

        <!-- 收藏统计 -->
        <view v-if="collections.length > 0" class="px-4 py-4 text-center">
          <text class="text-xs text-muted-foreground">共收藏 {{ collections.length }} 部古籍 · 阅读进度 {{ avgProgress }}%</text>
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
const isEditing = ref(false)
const selectedIds = ref<string[]>([])

interface CollectionItem {
  id: string
  title: string
  author: string
  dynasty: string
  category: string
  type: string
  typeLabel: string
  icon: string
  collectedAt: string
  readProgress: string
}

const collections = ref<CollectionItem[]>([
  { id: '1', title: '周易', author: '伏羲、周文王', dynasty: '先秦', category: '经部', type: '哲学', typeLabel: '经典', icon: '️', collectedAt: '2024-05-20', readProgress: '乾卦' },
  { id: '2', title: '道德经', author: '老子', dynasty: '先秦', category: '子部', type: '道家', typeLabel: '经典', icon: '🌀', collectedAt: '2024-05-15', readProgress: '第42章' },
  { id: '3', title: '史记', author: '司马迁', dynasty: '西汉', category: '史部', type: '正史', typeLabel: '史书', icon: '📜', collectedAt: '2024-04-28', readProgress: '项羽本纪' },
  { id: '4', title: '诗经', author: '佚名', dynasty: '周', category: '经部', type: '诗歌', typeLabel: '经典', icon: '🌸', collectedAt: '2024-04-10', readProgress: '关雎' },
  { id: '5', title: '孙子兵法', author: '孙武', dynasty: '先秦', category: '子部', type: '兵家', typeLabel: '兵书', icon: '⚔️', collectedAt: '2024-03-22', readProgress: '始计篇' },
  { id: '6', title: '楚辞', author: '屈原', dynasty: '先秦', category: '集部', type: '诗歌', typeLabel: '文集', icon: '🌀', collectedAt: '2024-03-15', readProgress: '离骚' },
  { id: '7', title: '黄帝内经', author: '佚名', dynasty: '先秦', category: '子部', type: '医家', typeLabel: '医书', icon: '🏥', collectedAt: '2024-03-01', readProgress: '素问第3篇' },
])

const filterCats = computed(() => {
  const counts: Record<string, number> = { all: collections.value.length }
  collections.value.forEach(c => {
    counts[c.category] = (counts[c.category] || 0) + 1
  })
  return [
    { id: 'all', label: '全部', icon: '', count: counts.all || 0 },
    { id: '经部', label: '经部', icon: '', count: counts['经部'] || 0 },
    { id: '史部', label: '史部', icon: '📜', count: counts['史部'] || 0 },
    { id: '子部', label: '子部', icon: '🌀', count: counts['子部'] || 0 },
    { id: '集部', label: '集部', icon: '', count: counts['集部'] || 0 },
  ]
})

const filteredCollections = computed(() => {
  if (activeCat.value === 'all') return collections.value
  return collections.value.filter(c => c.category === activeCat.value)
})

const avgProgress = computed(() => {
  return Math.floor(Math.random() * 40 + 30)
})

onMounted(() => {
  setTimeout(() => { loading.value = false }, 400)
})

function goBack() { uni.navigateBack() }
function goBrowse() { uni.navigateTo({ url: '/pages/classics/lists/index' }) }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/classics/detail/index?id=${id}` }) }

function exitEdit() {
  isEditing.value = false
  selectedIds.value = []
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function selectAll() {
  if (selectedIds.value.length === filteredCollections.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredCollections.value.map(c => c.id)
  }
}

function removeItem(id: string) {
  collections.value = collections.value.filter(c => c.id !== id)
  uni.showToast({ title: '已取消收藏', icon: 'success' })
}

function batchDelete() {
  if (selectedIds.value.length === 0) {
    uni.showToast({ title: '请选择要删除的项', icon: 'none' })
    return
  }
  collections.value = collections.value.filter(c => !selectedIds.value.includes(c.id))
  uni.showToast({ title: `已删除 ${selectedIds.value.length} 项`, icon: 'success' })
  selectedIds.value = []
  if (collections.value.length === 0) isEditing.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
