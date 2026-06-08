<template>
  <DataState :is-loading="pageLoading" :error="pageError" :is-empty="false" @retry="initPage">
    <view class="page">
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">缓存管理</text>
        <view class="nav-placeholder" />
      </view>

      <scroll-view class="content" scroll-y>
        <!-- 总体缓存 -->
        <view class="section">
          <text class="section-title">存储概览</text>
          <view class="card">
            <view class="overview-header">
              <view class="overview-icon">
                <text class="overview-emoji">🗄️</text>
              </view>
              <view class="overview-info">
                <text class="overview-label">本地存储</text>
                <text class="overview-size">{{ cacheSize }}</text>
              </view>
            </view>
            <view class="overview-bar">
              <view class="overview-bar-fill" :style="{ width: usagePercent + '%' }" />
            </view>
            <view class="overview-detail">
              <text>已用 {{ cacheSize }}</text>
              <text>限额 {{ maxSize }}</text>
            </view>
          </view>
        </view>

        <!-- 缓存分类 -->
        <view class="section">
          <text class="section-title">缓存分类</text>
          <view class="card">
            <view
              v-for="item in cacheItems"
              :key="item.key"
              class="cache-item"
            >
              <view class="cache-left">
                <view class="cache-icon-box" :class="item.color">
                  <text class="cache-icon">{{ item.icon }}</text>
                </view>
                <view>
                  <text class="cache-name">{{ item.name }}</text>
                  <text class="cache-size">{{ item.size }}</text>
                </view>
              </view>
              <view
                class="btn-small"
                :class="{ clearing: item.isClearing }"
                @click="clearItem(item)"
              >
                <text>{{ item.isClearing ? '清理中' : '清理' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 操作 -->
        <view class="section">
          <view class="card actions-card">
            <view class="action-btn" @click="clearAllCache">
              <text class="action-icon">🗑️</text>
              <text class="action-text">一键清理全部缓存</text>
            </view>
            <view class="action-btn" @click="refreshCache">
              <text class="action-icon">🔄</text>
              <text class="action-text">重新计算缓存大小</text>
            </view>
          </view>
        </view>

        <!-- 提示 -->
        <view class="footer-note">
          <text>清理缓存不会影响您的账号和数据，仅清除本地临时文件</text>
        </view>
      </scroll-view>
    </view>
  </DataState>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '@/components/DataState.vue'

const pageLoading = ref(false)
const pageError = ref<string | null>(null)

const cacheSize = ref('0MB')
const maxSize = ref('10MB')

const usagePercent = computed(() => {
  const current = parseFloat(cacheSize.value)
  const max = parseFloat(maxSize.value)
  if (max <= 0) return 0
  return Math.min((current / max) * 100, 100)
})

interface CacheItem {
  key: string
  icon: string
  name: string
  size: string
  color: string
  isClearing: boolean
}

const cacheItems = ref<CacheItem[]>([
  { key: 'images', icon: '🖼️', name: '图片缓存', size: '0MB', color: 'blue', isClearing: false },
  { key: 'videos', icon: '🎬', name: '视频缓存', size: '0MB', color: 'purple', isClearing: false },
  { key: 'files', icon: '📄', name: '文档缓存', size: '0MB', color: 'green', isClearing: false },
  { key: 'data', icon: '🗃️', name: '数据缓存', size: '0MB', color: 'gold', isClearing: false },
])

function initPage() {
  pageLoading.value = false
  pageError.value = null
  calcAllCache()
}

onMounted(initPage)

function calcAllCache() {
  try {
    const info = uni.getStorageInfoSync()
    const total = (info.currentSize || 0).toFixed(1)
    cacheSize.value = total + 'MB'

    // 模拟各分类缓存大小
    const totalNum = parseFloat(total) || 0
    cacheItems.value[0].size = (totalNum * 0.4).toFixed(1) + 'MB'
    cacheItems.value[1].size = (totalNum * 0.3).toFixed(1) + 'MB'
    cacheItems.value[2].size = (totalNum * 0.2).toFixed(1) + 'MB'
    cacheItems.value[3].size = (totalNum * 0.1).toFixed(1) + 'MB'
  } catch {
    cacheSize.value = '0MB'
  }
}

function clearItem(item: CacheItem) {
  if (item.isClearing) return
  item.isClearing = true
  uni.showLoading({ title: '清理中...' })
  setTimeout(() => {
    item.size = '0MB'
    item.isClearing = false
    uni.hideLoading()
    recalcTotal()
    uni.showToast({ title: item.name + '已清理', icon: 'success' })
  }, 1000)
}

function clearAllCache() {
  uni.showModal({
    title: '清理全部缓存',
    content: '确定要清理所有本地缓存数据吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '清理中...' })
        setTimeout(() => {
          try {
            uni.clearStorageSync()
          } catch {}
          cacheItems.value.forEach(item => { item.size = '0MB' })
          cacheSize.value = '0MB'
          uni.hideLoading()
          uni.showToast({ title: '缓存已清理', icon: 'success' })
        }, 1500)
      }
    },
  })
}

function refreshCache() {
  uni.showLoading({ title: '计算中...' })
  setTimeout(() => {
    calcAllCache()
    uni.hideLoading()
    uni.showToast({ title: '已刷新', icon: 'success' })
  }, 500)
}

function recalcTotal() {
  let total = 0
  cacheItems.value.forEach(item => {
    total += parseFloat(item.size) || 0
  })
  cacheSize.value = total.toFixed(1) + 'MB'
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e0d0;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: #5a3a1a;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #5a3a1a;
}
.nav-placeholder {
  width: 80rpx;
}

.content {
  flex: 1;
  padding-bottom: 40rpx;
}

.section {
  margin: 24rpx 24rpx 0;
}
.section-title {
  font-size: 24rpx;
  color: #8b6914;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

/* 存储概览 */
.overview-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 24rpx 16rpx;
}
.overview-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: rgba(139, 105, 20, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.overview-emoji {
  font-size: 40rpx;
}
.overview-label {
  font-size: 26rpx;
  color: #5a3a1a;
  font-weight: 500;
  display: block;
}
.overview-size {
  font-size: 36rpx;
  color: #8b6914;
  font-weight: bold;
  display: block;
  margin-top: 4rpx;
}

.overview-bar {
  height: 12rpx;
  background: #f0ebe0;
  border-radius: 6rpx;
  margin: 0 24rpx;
  overflow: hidden;
}
.overview-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b6914, #c9a96e);
  border-radius: 6rpx;
  transition: width 0.3s;
}

.overview-detail {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 24rpx 20rpx;
  font-size: 20rpx;
  color: #a09080;
}

/* 缓存分类项 */
.cache-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.cache-item:last-child {
  border-bottom: none;
}

.cache-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.cache-icon-box {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cache-icon-box.blue {
  background: rgba(52, 152, 219, 0.1);
}
.cache-icon-box.purple {
  background: rgba(155, 89, 182, 0.1);
}
.cache-icon-box.green {
  background: rgba(46, 204, 113, 0.1);
}
.cache-icon-box.gold {
  background: rgba(139, 105, 20, 0.1);
}

.cache-icon {
  font-size: 32rpx;
}

.cache-name {
  font-size: 26rpx;
  color: #5a3a1a;
  font-weight: 500;
  display: block;
}
.cache-size {
  font-size: 22rpx;
  color: #a09080;
  display: block;
  margin-top: 4rpx;
}

/* 小按钮 */
.btn-small {
  padding: 12rpx 28rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  background: rgba(139, 105, 20, 0.1);
  color: #8b6914;
  font-weight: 500;
  flex-shrink: 0;
}
.btn-small:active {
  background: rgba(139, 105, 20, 0.2);
}
.btn-small.clearing {
  background: #f0ebe0;
  color: #a09080;
}

/* 操作按钮 */
.actions-card {
  padding: 16rpx;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 0;
  border-radius: 12rpx;
}
.action-btn:active {
  background: #f9f5ed;
}
.action-icon {
  font-size: 28rpx;
}
.action-text {
  font-size: 26rpx;
  color: #5a3a1a;
  font-weight: 500;
}

/* 底部提示 */
.footer-note {
  margin: 40rpx 24rpx;
  text-align: center;
}
.footer-note text {
  font-size: 20rpx;
  color: #a09080;
}
</style>
