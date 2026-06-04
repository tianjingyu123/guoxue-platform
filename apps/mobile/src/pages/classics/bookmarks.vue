<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-header-inner">
        <text class="nav-back" @click="goBack">←</text>
        <text class="nav-title">我的收藏</text>
        <text class="nav-action" @click="toggleEdit">{{ isEditMode ? '完成' : '管理' }}</text>
      </view>
      <!-- 分类Tab -->
      <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
        <view class="tabs-inner">
          <text
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ 'tab-active': activeTab === tab.id }"
            @click="switchTab(tab.id)"
          >{{ tab.name }} {{ tab.count }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 刷新 -->
    <view class="refresh-row" @click="handleRefresh">
      <text :class="['refresh-icon', refreshing ? 'spinning' : '']">🔄</text>
      <text class="refresh-text">{{ refreshing ? '刷新中...' : '下拉刷新' }}</text>
    </view>

    <!-- 收藏列表 -->
    <DataState
      :is-loading="isLoading"
      :error="loadError"
      :is-empty="!isLoading && favorites.length === 0"
      empty-icon="❤️"
      empty-title="暂无收藏内容"
      empty-action-text="去发现"
      :empty-show-action="true"
      @retry="loadFavorites(true)"
      @empty-action="goDiscover"
    >
      <view class="fav-list">
        <view v-for="item in favorites" :key="item.id" class="fav-row">
          <!-- 选择框（编辑模式） -->
          <view v-if="isEditMode" class="checkbox" :class="{ 'checked': selectedIds.includes(item.id) }" @click="toggleSelect(item.id)">
            <text v-if="selectedIds.includes(item.id)" class="check-mark">✓</text>
          </view>

          <view class="fav-card" :class="{ 'fav-invalid': item.isInvalid }" @click="goDetail(item)">
            <!-- 封面 -->
            <view class="fav-cover-wrap">
              <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="fav-cover" />
              <view v-else class="fav-cover-placeholder">
                <text class="fav-placeholder-icon">{{ typeIcon(item.type) }}</text>
              </view>
            </view>
            <!-- 信息 -->
            <view class="fav-info">
              <view class="fav-tags">
                <text class="fav-type-tag" :style="{ backgroundColor: getTypeColor(item.type) + '20', color: getTypeColor(item.type) }">{{ getTypeName(item.type) }}</text>
                <text v-if="item.isInvalid" class="fav-type-tag" style="background:#F5F0E8;color:#999;">已失效</text>
                <text class="fav-time">{{ item.collectedAt?.split(' ')[0] }}</text>
              </view>
              <text class="fav-title">{{ item.title }}</text>
              <text class="fav-subtitle">{{ item.subtitle }}</text>
              <view class="fav-price-row">
                <text v-if="item.price > 0" class="fav-price">¥{{ item.price }}</text>
                <text v-if="item.originalPrice && item.originalPrice > item.price" class="fav-original">¥{{ item.originalPrice }}</text>
                <text v-else-if="!item.price" class="fav-free">免费</text>
              </view>
            </view>
          </view>

          <!-- 删除按钮（非编辑模式） -->
          <text v-if="!isEditMode" class="fav-delete" @click="handleRemove(item.id)">🗑</text>
        </view>

        <!-- 加载更多 -->
        <view v-if="hasMore" class="load-more" @click="loadFavorites(false)">
          <text>加载更多</text>
        </view>
      </view>
    </DataState>

    <!-- 底部操作栏（编辑模式） -->
    <view v-if="isEditMode && selectedIds.length > 0" class="bottom-bar">
      <view class="bottom-bar-inner">
        <text class="select-all" @click="handleSelectAll">{{ selectedIds.length === favorites.length ? '取消全选' : '全选' }}</text>
        <view class="btn-delete" @click="handleBatchRemove">
          <text>🗑 删除 ({{ selectedIds.length }})</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { interactApi } from '../../api'

interface FavoriteItem {
  id: number; type: string; title: string; subtitle?: string
  cover?: string; price?: number; originalPrice?: number
  collectedAt?: string; isInvalid?: boolean
}

interface FavoriteTab { id: string; name: string; count: number }

const activeTab = ref<string>('all')
const isEditMode = ref(false)
const selectedIds = ref<number[]>([])
const favorites = ref<FavoriteItem[]>([])
const tabs = ref<FavoriteTab[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const refreshing = ref(false)
const hasMore = ref(false)
const page = ref(1)

onMounted(() => {
  loadStats()
  loadFavorites(true)
})

async function loadStats() {
  try {
    const res = await interactApi.myCollects()
    if (res) {
      const data = res as any
      tabs.value = [
        { id: 'all', name: '全部', count: data.total || 0 },
        { id: 'course', name: '课程', count: data.courseCount || 0 },
        { id: 'article', name: '文章', count: data.articleCount || 0 },
        { id: 'live', name: '直播', count: data.liveCount || 0 },
        { id: 'product', name: '商品', count: data.productCount || 0 },
      ]
    }
  } catch (e) { console.error(e) }
}

async function loadFavorites(reset: boolean = true) {
  if (reset) isLoading.value = true
  loadError.value = null
  try {
    const res = await interactApi.myCollects()
    if (res) {
      const list = (res as any).list || []
      if (reset) favorites.value = list
      else favorites.value.push(...list)
      hasMore.value = list.length >= 10
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally { isLoading.value = false; refreshing.value = false }
}

watch(activeTab, () => { page.value = 1; loadFavorites(true) })

function switchTab(id: string) { activeTab.value = id }
function toggleEdit() { isEditMode.value = !isEditMode.value; selectedIds.value = [] }

async function handleRefresh() {
  refreshing.value = true
  page.value = 1
  await Promise.all([loadStats(), loadFavorites(true)])
}

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function handleSelectAll() {
  if (selectedIds.value.length === favorites.value.length) selectedIds.value = []
  else selectedIds.value = favorites.value.map(f => f.id)
}

async function handleRemove(id: number) {
  try {
    await interactApi.toggleCollect('favorite', String(id))
    favorites.value = favorites.value.filter(f => f.id !== id)
    uni.showToast({ title: '已取消收藏', icon: 'none' })
    loadStats()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

async function handleBatchRemove() {
  if (selectedIds.value.length === 0) return
  try {
    for (const id of selectedIds.value) {
      await interactApi.toggleCollect('favorite', String(id))
    }
    favorites.value = favorites.value.filter(f => !selectedIds.value.includes(f.id))
    selectedIds.value = []
    isEditMode.value = false
    loadStats()
    uni.showToast({ title: '操作成功', icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

function typeIcon(type: string): string {
  const map: Record<string, string> = { course: '▶️', circle: '👥', article: '📄', product: '🛍', live: '📡', teacher: '🎓' }
  return map[type] || '📄'
}
function getTypeName(type: string): string {
  const map: Record<string, string> = { course: '课程', circle: '圈子', article: '文章', product: '商品', live: '直播', teacher: '讲师' }
  return map[type] || type
}
function getTypeColor(type: string): string {
  const map: Record<string, string> = { course: '#C41E3A', circle: '#C9A96E', article: '#1890ff', product: '#52c41a', live: '#722ed1', teacher: '#fa8c16' }
  return map[type] || '#999'
}

function goBack() { uni.navigateBack() }
function goDiscover() { uni.navigateTo({ url: '/pages/discover/index' }) }
function goDetail(item: FavoriteItem) {
  const urlMap: Record<string, string> = {
    course: '/pages/course/detail',
    article: '/pages/article/detail',
    live: '/pages/live/live-room',
    product: '/pages/mall/product',
    circle: '/pages/circle/detail',
    teacher: '/pages/user/profile',
  }
  const base = urlMap[item.type] || '/pages/article/detail'
  uni.navigateTo({ url: `${base}?id=${item.id}` })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 30rpx; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 20; background: rgba(245,240,232,0.95); border-bottom: 1rpx solid #E5E1DB; }
.nav-header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.nav-back { font-size: 36rpx; color: #2C2C2C; padding: 4rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-action { font-size: 26rpx; color: #C41E3A; }

/* Tabs */
.tabs-scroll { white-space: nowrap; padding: 0 24rpx 16rpx; }
.tabs-inner { display: inline-flex; gap: 12rpx; }
.tab { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #fff; color: #666; }
.tab-active { background: #C41E3A; color: #fff; }

/* 刷新 */
.refresh-row { display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 16rpx; }
.refresh-icon { font-size: 24rpx; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.refresh-text { font-size: 24rpx; color: #999; }

/* 收藏列表 */
.fav-list { padding: 0 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.fav-row { display: flex; align-items: center; gap: 12rpx; }
.checkbox { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid rgba(153,153,153,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.checked { background: #C41E3A; border-color: #C41E3A; }
.check-mark { color: #fff; font-size: 24rpx; font-weight: bold; }
.fav-card { flex: 1; display: flex; gap: 16rpx; padding: 20rpx; background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.fav-invalid { opacity: 0.6; }
.fav-cover-wrap { width: 128rpx; height: 128rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; background: #F5F0E8; }
.fav-cover { width: 100%; height: 100%; }
.fav-cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.fav-placeholder-icon { font-size: 48rpx; color: rgba(153,153,153,0.6); }
.fav-info { flex: 1; min-width: 0; }
.fav-tags { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.fav-type-tag { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.fav-time { font-size: 18rpx; color: #999; margin-left: auto; }
.fav-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-subtitle { display: block; font-size: 22rpx; color: #999; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-price-row { display: flex; align-items: center; gap: 12rpx; }
.fav-price { font-size: 26rpx; font-weight: bold; color: #C41E3A; }
.fav-original { font-size: 22rpx; color: #999; text-decoration: line-through; }
.fav-free { font-size: 22rpx; color: #52c41a; }
.fav-delete { font-size: 36rpx; color: #999; padding: 8rpx; }

/* 加载更多 */
.load-more { text-align: center; padding: 24rpx; font-size: 24rpx; color: #999; }

/* 底部 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: env(safe-area-inset-bottom); z-index: 30; }
.bottom-bar-inner { display: flex; align-items: center; justify-content: space-between; }
.select-all { font-size: 26rpx; color: #C41E3A; }
.btn-delete { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 32rpx; background: #ff4d4f; color: #fff; border-radius: 32rpx; font-size: 26rpx; }
</style>
