<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">我的收藏</text>
        <text class="edit-btn" @click="toggleEdit">{{ isEditMode ? '完成' : '管理' }}</text>
      </view>
      <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
        <view class="tabs-inner">
          <text v-for="t in tabs" :key="t.id" class="tab" :class="{ active: activeTab === t.id }" @click="switchTab(t.id)">
            {{ t.name }}<text class="tab-count">{{ t.count }}</text>
          </text>
        </view>
      </scroll-view>
    </view>

    <DataState :is-loading="loading" :is-empty="!favorites.length" empty-icon="❤" empty-title="暂无收藏" empty-description="还没有收藏任何内容" empty-action-text="去发现" @empty-action="goDiscover">
      <view v-for="item in favorites" :key="item.id" class="fav-item">
        <view v-if="isEditMode" class="check-box" :class="{ checked: selectedIds.includes(item.id) }" @click="toggleSelect(item.id)">
          <text v-if="selectedIds.includes(item.id)">✓</text>
        </view>
        <view class="fav-card" @click="isEditMode ? toggleSelect(item.id) : goItem(item)">
          <view class="fc-cover">
            <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="fc-img" />
            <view v-else class="fc-placeholder"><text class="fc-placeholder-icon">{{ typeIcon(item.type) }}</text></view>
          </view>
          <view class="fc-info">
            <view class="fc-tags">
              <text class="fc-type-tag">{{ typeName(item.type) }}</text>
              <text v-if="item.isInvalid" class="fc-invalid">已失效</text>
              <text class="fc-date">{{ item.collectedAt?.split(' ')[0] }}</text>
            </view>
            <text class="fc-title">{{ item.title }}</text>
            <text class="fc-subtitle">{{ item.subtitle }}</text>
            <view class="fc-price-row">
              <text v-if="item.price > 0" class="fc-price">¥{{ item.price }}</text>
              <text v-if="item.originalPrice && item.originalPrice > item.price" class="fc-orig-price">¥{{ item.originalPrice }}</text>
              <text v-else-if="!item.price" class="fc-free">免费</text>
            </view>
          </view>
        </view>
        <text v-if="!isEditMode" class="fav-remove" @click="removeItem(item)">🗑</text>
      </view>

      <view v-if="hasMore" class="load-more-btn" @click="loadFavorites(false)"><text>加载更多</text></view>
    </DataState>

    <!-- 底部操作栏（编辑模式） -->
    <view v-if="isEditMode && selectedIds.length" class="bottom-edit-bar">
      <view class="bottom-edit-inner">
        <text class="select-all-btn" @click="selectAll">{{ selectedIds.length === favorites.length ? '取消全选' : '全选' }}</text>
        <view class="batch-remove-btn" @click="batchRemove"><text>🗑 删除 ({{ selectedIds.length }})</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { interactApi } from '../../api'

interface FavoriteItem {
  id: number; type: string; title: string; subtitle?: string; cover?: string
  price: number; originalPrice?: number; collectedAt: string; isInvalid?: boolean
}

const favorites = ref<FavoriteItem[]>([]); const loading = ref(true); const activeTab = ref('all'); const page = ref(1); const hasMore = ref(false)
const isEditMode = ref(false); const selectedIds = ref<number[]>([])
const tabs = ref<{ id: string; name: string; count: number }[]>([
  { id: 'all', name: '全部', count: 0 }, { id: 'course', name: '课程', count: 0 },
  { id: 'article', name: '文章', count: 0 }, { id: 'live', name: '直播', count: 0 },
  { id: 'product', name: '商品', count: 0 }, { id: 'teacher', name: '讲师', count: 0 },
])

onMounted(() => loadFavorites(true))

async function loadFavorites(reset = false) {
  if (reset) { loading.value = true; page.value = 1 }
  try {
    const res = await interactApi.myCollects() as any
    const items: FavoriteItem[] = Array.isArray(res) ? res : res?.list || res?.data || []
    if (reset) favorites.value = items; else favorites.value.push(...items)
    hasMore.value = items.length >= 10
    page.value++
  } catch {}
  loading.value = false
}

function switchTab(tab: string) { activeTab.value = tab; loadFavorites(true) }
function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  idx >= 0 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}
function selectAll() {
  selectedIds.value = selectedIds.value.length === favorites.value.length ? [] : favorites.value.map(f => f.id)
}
function toggleEdit() { isEditMode.value = !isEditMode.value; selectedIds.value = [] }
async function removeItem(item: FavoriteItem) {
  try { await interactApi.toggleCollect(item.type, String(item.id)); favorites.value = favorites.value.filter(f => f.id !== item.id); uni.showToast({ title: '已取消收藏' }) } catch {}
}
async function batchRemove() {
  for (const id of selectedIds.value) {
    const item = favorites.value.find(f => f.id === id)
    if (item) await interactApi.toggleCollect(item.type, String(item.id))
  }
  favorites.value = favorites.value.filter(f => !selectedIds.value.includes(f.id))
  selectedIds.value = []; isEditMode.value = false; uni.showToast({ title: '删除成功' })
}
function goItem(item: FavoriteItem) {
  const routes: Record<string, string> = { course: '/pages/courses/course-detail', article: '/pages/articles/article-detail', live: '/pages/live/live-room', product: '/pages/shop/product-detail', teacher: '/pages/user/user' }
  uni.navigateTo({ url: `${routes[item.type] || '/pages/detail/detail'}?id=${item.id}` })
}
function goDiscover() { uni.switchTab({ url: '/pages/discover/index' }) }
function typeIcon(type: string): string { return { course: '📖', article: '📄', live: '🔴', product: '🛍', teacher: '👤' }[type] || '❤' }
function typeName(type: string): string { return { course: '课程', article: '文章', live: '直播', product: '商品', teacher: '讲师' }[type] || type }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 100rpx; }
.header { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.edit-btn { font-size: 26rpx; color: #C41E3A; }
.tabs-scroll { padding: 0 24rpx 12rpx; white-space: nowrap; }
.tabs-inner { display: inline-flex; gap: 12rpx; }
.tab { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #f5f0e8; color: #666; }
.tab.active { background: #C41E3A; color: #fff; }
.tab-count { margin-left: 4rpx; opacity: 0.7; }
.fav-item { display: flex; align-items: center; gap: 8rpx; padding: 0 24rpx; margin-bottom: 12rpx; }
.check-box { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ccc; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.check-box.checked { background: #C41E3A; border-color: #C41E3A; color: #fff; font-size: 24rpx; }
.fav-card { flex: 1; display: flex; gap: 12rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; }
.fc-cover { width: 120rpx; height: 120rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; background: #f5f0e8; }
.fc-img { width: 100%; height: 100%; }
.fc-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.fc-placeholder-icon { font-size: 40rpx; opacity: 0.5; }
.fc-info { flex: 1; min-width: 0; }
.fc-tags { display: flex; align-items: center; gap: 8rpx; margin-bottom: 6rpx; }
.fc-type-tag { font-size: 20rpx; padding: 0 10rpx; background: #f5f0e8; color: #C9A96E; border-radius: 8rpx; }
.fc-invalid { font-size: 20rpx; padding: 0 10rpx; background: #f0f0f0; color: #999; border-radius: 8rpx; }
.fc-date { font-size: 20rpx; color: #ccc; }
.fc-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-subtitle { font-size: 22rpx; color: #999; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2rpx; }
.fc-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 6rpx; }
.fc-price { font-size: 26rpx; font-weight: bold; color: #C41E3A; }
.fc-orig-price { font-size: 20rpx; color: #999; text-decoration: line-through; }
.fc-free { font-size: 22rpx; color: #4CAF50; }
.fav-remove { font-size: 32rpx; color: #ccc; padding: 8rpx; }
.load-more-btn { text-align: center; padding: 24rpx; font-size: 26rpx; color: #999; }
.bottom-edit-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bottom-edit-inner { display: flex; align-items: center; justify-content: space-between; }
.select-all-btn { font-size: 26rpx; color: #C41E3A; }
.batch-remove-btn { padding: 14rpx 36rpx; background: #e53935; color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
