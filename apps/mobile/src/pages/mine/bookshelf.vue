<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        我的书架
      </text>
      <text
        class="header-action"
        @click="editMode = !editMode"
      >
        {{ editMode ? '完成' : '编辑' }}
      </text>
    </view>

    <!-- 分类筛选 -->
    <scroll-view
      scroll-x
      class="cat-scroll"
      show-scrollbar="false"
    >
      <view class="cat-inner">
        <text
          v-for="c in categories"
          :key="c.value"
          class="cat-tab"
          :class="{ active: currentCat === c.value }"
          @click="currentCat = c.value"
        >
          {{ c.label }}
        </text>
      </view>
    </scroll-view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <text class="search-icon">
        🔍
      </text>
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索书架书籍"
        @input="onSearch"
      >
      <text
        v-if="keyword"
        class="search-clear"
        @click="keyword = ''"
      >
        ✕
      </text>
    </view>

    <!-- 书籍网格 -->
    <LoadingSkeleton v-if="loading" />
    <view
      v-else-if="filteredBooks.length"
      class="book-grid"
    >
      <view
        v-for="b in filteredBooks"
        :key="b.id"
        class="book-item"
        @click="!editMode && goRead(b)"
      >
        <view class="book-cover-wrap">
          <image
            :src="b.cover || ''"
            class="book-cover"
            mode="aspectFill"
          />
          <view
            v-if="editMode"
            class="book-check"
            :class="{ checked: selectedIds.has(b.id) }"
            @click.stop="toggleSelect(b.id)"
          >
            <text>{{ selectedIds.has(b.id) ? '✓' : '' }}</text>
          </view>
          <text
            v-if="b.progress > 0 && !editMode"
            class="book-progress"
          >
            {{ b.progress }}%
          </text>
        </view>
        <text class="book-title">
          {{ b.title }}
        </text>
        <text class="book-author">
          {{ b.author || '' }}
        </text>
      </view>
    </view>
    <EmptyState
      v-else
      text="书架空空如也"
    />

    <!-- 批量操作 -->
    <view
      v-if="editMode && selectedIds.size"
      class="batch-bar"
    >
      <view class="batch-info">
        已选 {{ selectedIds.size }} 本
      </view>
      <view class="batch-actions">
        <text
          class="batch-btn"
          @click="batchDelete"
        >
          移除
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { ebookApi } from '../../api'

const loading = ref(true)
const books = ref<any[]>([])
const keyword = ref('')
const editMode = ref(false)
const selectedIds = ref(new Set<number>())
const currentCat = ref('all')

const categories = [
  { value: 'all', label: '全部' },
  { value: 'reading', label: '在读' },
  { value: 'finished', label: '已读完' },
  { value: 'favorite', label: '收藏' },
]

const filteredBooks = computed(() => {
  let list = books.value
  if (currentCat.value === 'reading') list = list.filter(b => b.progress > 0 && b.progress < 100)
  else if (currentCat.value === 'finished') list = list.filter(b => b.progress >= 100)
  else if (currentCat.value === 'favorite') list = list.filter(b => b.isFavorite)
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(b => (b.title || '').toLowerCase().includes(kw) || (b.author || '').toLowerCase().includes(kw))
  }
  return list
})

onMounted(async () => {
  try {
    const res: any = await ebookApi.getShelf()
    books.value = Array.isArray(res) ? res : res?.data || res?.list || []
  } catch {} finally { loading.value = false }
})

function onSearch() {}
function toggleSelect(id: number) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedIds.value = s
}
function batchDelete() {
  uni.showModal({ title: '提示', content: `确定移除选中的 ${selectedIds.value.size} 本书吗？`, success: (r) => { if (r.confirm) { books.value = books.value.filter(b => !selectedIds.value.has(b.id)); selectedIds.value = new Set(); uni.showToast({ title: '移除成功' }) } } })
}
function goRead(b: any) { uni.navigateTo({ url: `/pages/reader/reader?id=${b.id}` }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-action { font-size: 26rpx; color: #C41E3A; }
.cat-scroll { background: #fff; padding: 0 24rpx 16rpx; white-space: nowrap; }
.cat-inner { display: inline-flex; gap: 12rpx; }
.cat-tab { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #f5f0e8; color: #666; }
.cat-tab.active { background: #C41E3A; color: #fff; }
.search-bar { display: flex; align-items: center; gap: 12rpx; margin: 16rpx 24rpx; padding: 12rpx 20rpx; background: #fff; border-radius: 48rpx; }
.search-icon { font-size: 28rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.search-clear { font-size: 24rpx; color: #ccc; padding: 4rpx; }
.book-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; padding: 0 24rpx 120rpx; }
.book-item { text-align: center; }
.book-cover-wrap { position: relative; width: 100%; aspect-ratio: 3/4; border-radius: 12rpx; overflow: hidden; background: #fff; }
.book-cover { width: 100%; height: 100%; }
.book-check { position: absolute; top: 8rpx; right: 8rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.book-check.checked { background: #C41E3A; }
.book-check text { color: #fff; font-size: 20rpx; }
.book-progress { position: absolute; bottom: 8rpx; left: 8rpx; padding: 2rpx 10rpx; background: rgba(0,0,0,0.6); color: #fff; font-size: 18rpx; border-radius: 8rpx; }
.book-title { font-size: 24rpx; color: #2C2C2C; display: block; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-author { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.batch-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.08); }
.batch-info { font-size: 24rpx; color: #666; }
.batch-actions { display: flex; gap: 16rpx; }
.batch-btn { padding: 12rpx 32rpx; background: #C41E3A; color: #fff; border-radius: 28rpx; font-size: 24rpx; }
</style>
