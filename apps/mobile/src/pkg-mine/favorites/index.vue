<template>
  <view class="favorites-page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="nav-title">我的收藏</text>
        <text class="nav-action" @tap="toggleEditMode">{{ isEditMode ? '完成' : '管理' }}</text>
      </view>

      <!-- 分类Tab -->
      <scroll-view scroll-x class="tabs" :show-scrollbar="false">
        <view class="tabs-inner">
          <view
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ 'tab-active': activeTab === tab.id }"
            @tap="switchTab(tab.id)"
          >
            <text class="tab-name">{{ tab.name }}</text>
            <text class="tab-count">{{ tab.count }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 刷新按钮 -->
    <view class="refresh-row">
      <view class="refresh-btn" @tap="handleRefresh">
        <app-icon name="refresh-cw" :size="12" color="#9ca3af" :class="{ spinning: isRefreshing }" />
        <text class="refresh-text">{{ isRefreshing ? '刷新中...' : '下拉刷新' }}</text>
      </view>
    </view>

    <!-- 收藏列表 -->
    <view class="list">
      <!-- 骨架屏 -->
      <template v-if="isLoading">
        <view v-for="i in 5" :key="i" class="skeleton-card">
          <view class="skeleton-cover" />
          <view class="skeleton-body">
            <view class="skeleton-line w20" />
            <view class="skeleton-line w100" />
            <view class="skeleton-line w66" />
          </view>
        </view>
      </template>

      <!-- 错误态 -->
      <view v-else-if="error" class="empty">
        <app-icon name="alert-circle" :size="64" color="#d1d5db" />
        <text class="empty-text">{{ error }}</text>
        <view class="empty-btn" @tap="fetchData">
          <text class="empty-btn-text">重试</text>
        </view>
      </view>

      <!-- 空态 -->
      <view v-else-if="displayList.length === 0" class="empty">
        <app-icon name="heart" :size="64" color="#d1d5db" />
        <text class="empty-text">暂无收藏内容</text>
        <view class="empty-btn" @tap="goDiscover">
          <text class="empty-btn-text">去发现</text>
        </view>
      </view>

      <!-- 列表 -->
      <template v-else>
        <view v-for="item in displayList" :key="item.id" class="fav-row">
          <!-- 选择框 -->
          <view
            v-if="isEditMode"
            class="checkbox"
            :class="{ 'checkbox-checked': selectedIds.includes(item.id) }"
            @tap="toggleSelect(item.id)"
          >
            <app-icon v-if="selectedIds.includes(item.id)" name="check" :size="16" color="#ffffff" />
          </view>

          <!-- 卡片 -->
          <view class="fav-card" :class="{ 'fav-invalid': item.isInvalid }" @tap="openItem(item)">
            <!-- 封面 -->
            <view class="fav-cover">
              <image lazy-load v-if="item.cover" :src="item.cover" class="fav-cover-img" mode="aspectFill" />
              <view v-else class="fav-cover-icon">
                <app-icon :name="typeIcons[item.type]" :size="24" color="#9ca3af" />
              </view>
            </view>

            <!-- 信息 -->
            <view class="fav-info">
              <view class="fav-meta">
                <text class="fav-badge" :style="{ background: typeColors[item.type].bg, color: typeColors[item.type].text }">{{ typeNames[item.type] }}</text>
                <text v-if="item.isInvalid" class="fav-invalid-badge">已失效</text>
                <text class="fav-date">{{ item.collectedAt.split(' ')[0] }}</text>
              </view>
              <text class="fav-title">{{ item.title }}</text>
              <text class="fav-subtitle">{{ item.subtitle }}</text>
            </view>
          </view>

          <!-- 单个删除（非编辑模式） -->
          <view v-if="!isEditMode" class="fav-del" @tap="handleRemove(item.id)">
            <app-icon name="trash-2" :size="16" color="#9ca3af" />
          </view>
        </view>
      </template>
    </view>

    <!-- 底部操作栏（编辑模式） -->
    <view v-if="isEditMode && selectedIds.length > 0" class="batch-bar">
      <text class="batch-all" @tap="handleSelectAll">{{ selectedIds.length === displayList.length ? '取消全选' : '全选' }}</text>
      <view class="batch-del" @tap="handleBatchRemove">
        <app-icon name="trash-2" :size="16" color="#ffffff" />
        <text class="batch-del-text">删除 ({{ selectedIds.length }})</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { mineApi, type FavItem, type FavType } from '@/lib/mine-data'

const typeIcons: Record<FavType, string> = {
  course: 'play',
  circle_post: 'users',
  article: 'file-text',
  product: 'shopping-bag',
  video: 'video',
  comment: 'message-square',
  poem: 'scroll-text',
  classic: 'book-marked',
  ebook: 'book-open',
}

const typeNames: Record<FavType, string> = {
  course: '课程',
  circle_post: '帖子',
  article: '文章',
  product: '商品',
  video: '视频',
  comment: '评论',
  poem: '诗词',
  classic: '古籍',
  ebook: '电子书',
}

const typeColors: Record<FavType, { bg: string; text: string }> = {
  course: { bg: 'rgba(37,99,235,0.1)', text: '#2563eb' },
  circle_post: { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6' },
  article: { bg: 'rgba(5,150,105,0.1)', text: '#059669' },
  product: { bg: 'rgba(234,88,12,0.1)', text: '#ea580c' },
  video: { bg: 'rgba(196,30,58,0.1)', text: '#C41E3A' },
  comment: { bg: 'rgba(79,70,229,0.1)', text: '#4f46e5' },
  poem: { bg: 'rgba(180,83,9,0.1)', text: '#b45309' },
  classic: { bg: 'rgba(146,64,14,0.1)', text: '#92400e' },
  ebook: { bg: 'rgba(13,148,136,0.1)', text: '#0d9488' },
}

const allFavorites = ref<FavItem[]>([])
const activeTab = ref<FavType | 'all'>('all')
const isEditMode = ref(false)
const selectedIds = ref<string[]>([])
const isLoading = ref(true)
const isRefreshing = ref(false)
const error = ref('')
const submitting = ref(false)

const tabs = computed(() => {
  const counts: Record<string, number> = { all: allFavorites.value.length }
  for (const f of allFavorites.value) counts[f.type] = (counts[f.type] || 0) + 1
  return [
    { id: 'all' as const, name: '全部', count: counts.all || 0 },
    { id: 'course' as const, name: '课程', count: counts.course || 0 },
    { id: 'poem' as const, name: '诗词', count: counts.poem || 0 },
    { id: 'classic' as const, name: '古籍', count: counts.classic || 0 },
    { id: 'ebook' as const, name: '电子书', count: counts.ebook || 0 },
    { id: 'article' as const, name: '文章', count: counts.article || 0 },
    { id: 'video' as const, name: '视频', count: counts.video || 0 },
    { id: 'product' as const, name: '商品', count: counts.product || 0 },
    { id: 'circle_post' as const, name: '帖子', count: counts.circle_post || 0 },
  ]
})

const displayList = computed(() =>
  activeTab.value === 'all'
    ? allFavorites.value
    : allFavorites.value.filter((f) => f.type === activeTab.value),
)

async function fetchData() {
  isLoading.value = true
  error.value = ''
  try {
    allFavorites.value = await mineApi.getFavorites()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

function goBack() {
  navigateBack()
}

function goDiscover() {
  navigateTo('/discover')
}

function toggleEditMode() {
  isEditMode.value = !isEditMode.value
  selectedIds.value = []
}

function switchTab(id: FavType | 'all') {
  activeTab.value = id
}

async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  try {
    allFavorites.value = await mineApi.getFavorites()
    uni.showToast({ title: '已刷新', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '刷新失败', icon: 'none' })
  } finally {
    isRefreshing.value = false
  }
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function handleSelectAll() {
  if (selectedIds.value.length === displayList.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = displayList.value.map((f) => f.id)
  }
}

async function removeByIds(ids: string[]) {
  if (submitting.value || ids.length === 0) return
  submitting.value = true
  try {
    const targets = allFavorites.value.filter((f) => ids.includes(f.id))
    await Promise.all(targets.map((t) => mineApi.removeFavorite(t.targetType, t.targetId)))
    allFavorites.value = allFavorites.value.filter((f) => !ids.includes(f.id))
    selectedIds.value = []
    isEditMode.value = false
    uni.showToast({ title: `已取消${targets.length}个收藏`, icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function handleRemove(id: string) {
  uni.showModal({
    title: '取消收藏',
    content: '确定要取消收藏吗？',
    confirmColor: '#C41E3A',
    success: (res) => {
      if (res.confirm) removeByIds([id])
    },
  })
}

function handleBatchRemove() {
  if (selectedIds.value.length === 0) return
  const ids = [...selectedIds.value]
  uni.showModal({
    title: '批量取消收藏',
    content: `确定要取消 ${ids.length} 个收藏吗？`,
    confirmColor: '#C41E3A',
    success: (res) => {
      if (res.confirm) removeByIds(ids)
    },
  })
}

const linkMap: Record<FavType, string> = {
  course: '/course',
  circle_post: '/post',
  article: '/article',
  product: '/shop/product',
  video: '/video',
  comment: '',
  poem: '/poetry',
  classic: '/classic',
  ebook: '/ebook',
}

function openItem(item: FavItem) {
  if (isEditMode.value) {
    toggleSelect(item.id)
    return
  }
  if (item.isInvalid) {
    uni.showToast({ title: '该内容已失效', icon: 'none' })
    return
  }
  const base = linkMap[item.type]
  if (!base) {
    uni.showToast({ title: '暂不支持查看该内容', icon: 'none' })
    return
  }
  navigateTo(`${base}/${item.targetId}`)
}
</script>

<style scoped>
.favorites-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 24rpx;
}

.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1rpx solid #ece8e1;
  padding-top: var(--status-bar-height, 0);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}

.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.nav-action {
  font-size: 28rpx;
  color: var(--brand);
  width: 56rpx;
  text-align: right;
}

.tabs {
  white-space: nowrap;
  padding: 16rpx 32rpx;
}

.tabs-inner {
  display: inline-flex;
  gap: 16rpx;
}

.tab {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 500;
  background: #f0ece5;
  color: #8a8378;
  display: inline-flex;
  align-items: center;
}

.tab-active {
  background: var(--brand);
  color: #ffffff;
}

.tab-count {
  margin-left: 8rpx;
  opacity: 0.7;
}

.refresh-row {
  display: flex;
  justify-content: center;
  padding: 16rpx 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.refresh-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.list {
  padding: 0 32rpx;
}

.skeleton-card {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.skeleton-cover {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #f0ece5;
  animation: pulse 1.5s ease-in-out infinite;
  flex-shrink: 0;
}

.skeleton-body {
  flex: 1;
}

.skeleton-line {
  height: 28rpx;
  background: #f0ece5;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  animation: pulse 1.5s ease-in-out infinite;
}

.w20 { width: 20%; }
.w100 { width: 100%; }
.w66 { width: 66%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #8a8378;
  margin: 32rpx 0;
}

.empty-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}

.empty-btn-text {
  font-size: 28rpx;
  color: #ffffff;
}

.fav-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.checkbox {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  border: 4rpx solid rgba(138, 131, 120, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox-checked {
  background: var(--brand);
  border-color: var(--brand);
}

.fav-card {
  flex: 1;
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  min-width: 0;
}

.fav-invalid {
  opacity: 0.6;
}

.fav-cover {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #f0ece5;
  overflow: hidden;
  flex-shrink: 0;
}

.fav-cover-img {
  width: 100%;
  height: 100%;
}

.fav-cover-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fav-info {
  flex: 1;
  min-width: 0;
}

.fav-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.fav-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.fav-invalid-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #f0ece5;
  color: #8a8378;
}

.fav-date {
  font-size: 20rpx;
  color: #9ca3af;
}

.fav-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.fav-subtitle {
  font-size: 24rpx;
  color: #8a8378;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.fav-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}

.fav-price-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.fav-price {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand);
}

.fav-original {
  font-size: 22rpx;
  color: #9ca3af;
  text-decoration: line-through;
}

.fav-free {
  font-size: 24rpx;
  color: #059669;
}

.fav-del {
  padding: 16rpx;
  flex-shrink: 0;
}

.load-more {
  width: 100%;
  padding: 24rpx 0;
  display: flex;
  justify-content: center;
}

.load-more-text {
  font-size: 28rpx;
  color: #8a8378;
}

.batch-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1rpx solid #ece8e1;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-all {
  font-size: 28rpx;
  color: var(--brand);
}

.batch-del {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}

.batch-del-text {
  font-size: 28rpx;
  color: #ffffff;
}
</style>
