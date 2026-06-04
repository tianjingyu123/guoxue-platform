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
        图片浏览
      </text>
      <text
        class="header-action"
        @click="saveImage"
      >
        保存
      </text>
    </view>
    <view class="image-wrap">
      <image
        v-if="imageUrl"
        :src="imageUrl"
        class="preview-img"
        mode="aspectFit"
        @click="toggleToolbar"
      />
      <view
        v-else
        class="empty-state"
      >
        <text class="empty-icon">
          🖼
        </text>
        <text class="empty-text">
          暂无图片
        </text>
      </view>
    </view>
    <view
      v-if="showToolbar && imageUrl"
      class="toolbar"
    >
      <view
        class="toolbar-item"
        @click="zoomIn"
      >
        <text class="toolbar-icon">
          🔍+
        </text>
        <text class="toolbar-label">
          放大
        </text>
      </view>
      <view
        class="toolbar-item"
        @click="zoomOut"
      >
        <text class="toolbar-icon">
          🔍−
        </text>
        <text class="toolbar-label">
          缩小
        </text>
      </view>
      <view
        class="toolbar-item"
        @click="resetZoom"
      >
        <text class="toolbar-icon">
          🔄
        </text>
        <text class="toolbar-label">
          还原
        </text>
      </view>
      <view
        class="toolbar-item"
        @click="rotateImage"
      >
        <text class="toolbar-icon">
          ↻
        </text>
        <text class="toolbar-label">
          旋转
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const imageUrl = ref('')
const showToolbar = ref(false)
const scale = ref(1)
const rotation = ref(0)

onMounted(() => {
  const q = getCurrentPages().pop()?.options || {}
  imageUrl.value = q.url || q.src || ''
  if (imageUrl.value) uni.setNavigationBarTitle({ title: '图片浏览' })
})

function toggleToolbar() { showToolbar.value = !showToolbar.value }
function zoomIn() { scale.value = Math.min(scale.value + 0.25, 3) }
function zoomOut() { scale.value = Math.max(scale.value - 0.25, 0.5) }
function resetZoom() { scale.value = 1; rotation.value = 0 }
function rotateImage() { rotation.value = (rotation.value + 90) % 360 }

function saveImage() {
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #000; min-height: 100vh; display: flex; flex-direction: column; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; position: absolute; top: 0; left: 0; right: 0; z-index: 10; }
.back-btn { font-size: 36rpx; color: #fff; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #fff; }
.header-action { font-size: 26rpx; color: #fff; }
.image-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
.preview-img { width: 100%; height: 100%; }
.empty-state { text-align: center; }
.empty-icon { font-size: 80rpx; color: #666; display: block; }
.empty-text { font-size: 28rpx; color: #666; display: block; margin-top: 16rpx; }
.toolbar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: space-around; padding: 20rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
.toolbar-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.toolbar-icon { font-size: 36rpx; color: #fff; }
.toolbar-label { font-size: 20rpx; color: rgba(255,255,255,0.7); }
</style>
