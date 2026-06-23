<template>
  <view
    class="viewer"
    @click="toggleControls"
    @touchstart="onContainerTouchStart"
    @touchmove.stop.prevent="onContainerTouchMove"
    @touchend="onContainerTouchEnd"
  >
    <!-- 顶部栏 -->
    <view class="topbar" :class="{ hidden: !showControls }" @click.stop>
      <view class="circle-btn" @click="onClose">
        <AppIcon name="x" :size="40" color="#ffffff" />
      </view>
      <text class="counter">{{ currentIndex + 1 }} / {{ images.length }}</text>
      <view class="spacer" />
    </view>

    <!-- 图片区域 -->
    <view class="image-wrap">
      <image
        v-if="images.length"
        class="viewer-img"
        :src="images[currentIndex]"
        mode="aspectFit"
        :style="imgStyle"
        @click.stop="onImageTap"
      />
    </view>

    <!-- 左右切换 -->
    <template v-if="images.length > 1">
      <view
        class="nav-btn nav-left"
        :class="{ disabled: currentIndex === 0, hidden: !showControls }"
        @click.stop="goToPrev"
      >
        <AppIcon name="chevron-left" :size="48" color="#ffffff" />
      </view>
      <view
        class="nav-btn nav-right"
        :class="{ disabled: currentIndex === images.length - 1, hidden: !showControls }"
        @click.stop="goToNext"
      >
        <AppIcon name="chevron-right" :size="48" color="#ffffff" />
      </view>
    </template>

    <!-- 底部 -->
    <view class="bottombar" :class="{ hidden: !showControls }" @click.stop>
      <!-- 圆点指示器 -->
      <view v-if="images.length > 1" class="dots">
        <view
          v-for="(_, index) in images"
          :key="index"
          class="dot"
          :class="{ active: index === currentIndex }"
          @click="currentIndex = index"
        />
      </view>

      <!-- 操作按钮 -->
      <view class="actions">
        <view class="action" :class="{ disabled: scale <= 0.5 }" @click="zoomOut">
          <view class="action-circle"><AppIcon name="zoom-out" :size="40" color="#ffffff" /></view>
          <text class="action-label">缩小</text>
        </view>
        <view class="action" :class="{ disabled: scale >= 5 }" @click="zoomIn">
          <view class="action-circle"><AppIcon name="zoom-in" :size="40" color="#ffffff" /></view>
          <text class="action-label">放大</text>
        </view>
        <view class="action" @click="rotate">
          <view class="action-circle"><AppIcon name="rotate-cw" :size="40" color="#ffffff" /></view>
          <text class="action-label">旋转</text>
        </view>
        <view class="action" @click="onSave">
          <view class="action-circle"><AppIcon name="download" :size="40" color="#ffffff" /></view>
          <text class="action-label">保存</text>
        </view>
        <view class="action" @click="onShare">
          <view class="action-circle"><AppIcon name="share-2" :size="40" color="#ffffff" /></view>
          <text class="action-label">分享</text>
        </view>
      </view>
    </view>

    <!-- 缩放比例提示 -->
    <view v-if="scale !== 1" class="scale-tip">
      <text class="scale-text">{{ Math.round(scale * 100) }}%</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1000&h=700&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=800&fit=crop',
]

const images = ref<string[]>([])
const currentIndex = ref(0)
const scale = ref(1)
const rotation = ref(0)
const position = ref({ x: 0, y: 0 })
const showControls = ref(true)

let hideTimer: ReturnType<typeof setTimeout> | null = null
let isDragging = false
const touchStart = { x: 0, y: 0, distance: 0 }
let lastTap = 0

const imgStyle = computed(() => {
  return `transform: translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value}) rotate(${rotation.value}deg);`
})

function resetTransform() {
  scale.value = 1
  rotation.value = 0
  position.value = { x: 0, y: 0 }
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer)
  if (showControls.value) {
    hideTimer = setTimeout(() => {
      showControls.value = false
    }, 3000)
  }
}

function toggleControls() {
  showControls.value = !showControls.value
  scheduleHide()
}

function goToPrev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    resetTransform()
  }
}

function goToNext() {
  if (currentIndex.value < images.value.length - 1) {
    currentIndex.value++
    resetTransform()
  }
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.5, 5)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.5, 0.5)
}

function rotate() {
  rotation.value = (rotation.value + 90) % 360
}

function onImageTap() {
  // 双击放大/还原
  const now = Date.now()
  if (now - lastTap < 300) {
    if (scale.value === 1) {
      scale.value = 2
    } else {
      resetTransform()
    }
  }
  lastTap = now
}

function onContainerTouchStart(e: any) {
  showControls.value = true
  scheduleHide()
  const touches = e.touches || []
  if (touches.length === 1) {
    touchStart.x = touches[0].clientX - position.value.x
    touchStart.y = touches[0].clientY - position.value.y
    if (scale.value > 1) isDragging = true
  } else if (touches.length === 2) {
    touchStart.distance = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    )
  }
}

function onContainerTouchMove(e: any) {
  const touches = e.touches || []
  if (touches.length === 1 && isDragging && scale.value > 1) {
    position.value = {
      x: touches[0].clientX - touchStart.x,
      y: touches[0].clientY - touchStart.y,
    }
  } else if (touches.length === 2 && touchStart.distance) {
    const distance = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    )
    const delta = distance / touchStart.distance
    scale.value = Math.min(Math.max(scale.value * delta, 0.5), 5)
    touchStart.distance = distance
  }
}

function onContainerTouchEnd(e: any) {
  isDragging = false
  // 未缩放时左右滑动切换
  if (scale.value === 1) {
    const changed = e.changedTouches || []
    if (changed.length === 1) {
      const deltaX = changed[0].clientX - touchStart.x
      if (Math.abs(deltaX) > 80) {
        if (deltaX > 0) goToPrev()
        else goToNext()
      }
    }
  }
}

function onClose() {
  navigateBack()
}

function onSave() {
  uni.showToast({ title: '图片已保存', icon: 'success' })
}

function onShare() {
  uni.showToast({ title: '图片链接已复制', icon: 'none' })
}

onMounted(() => {
  const pages = getCurrentPages()
  const cur: any = pages[pages.length - 1]
  const opts = cur?.options || {}
  const raw = opts.images || ''
  if (raw) {
    images.value = decodeURIComponent(raw).split(',').map((s: string) => s.trim()).filter(Boolean)
  }
  if (!images.value.length) images.value = DEFAULT_IMAGES
  const idx = Number(opts.index || 0)
  currentIndex.value = Number.isFinite(idx) ? Math.min(Math.max(idx, 0), images.value.length - 1) : 0
  scheduleHide()
})

onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style lang="scss" scoped>
.viewer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000000;
  z-index: 50;
  overflow: hidden;
}

.topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(24rpx + var(--status-bar-height, 0px));
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
  transition: opacity 0.3s;
}

.counter {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
}

.spacer {
  width: 80rpx;
}

.circle-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
}

.image-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.viewer-img {
  width: 100%;
  height: 100%;
  transition: transform 0.2s;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  transition: opacity 0.3s;
}

.nav-left {
  left: 32rpx;
}

.nav-right {
  right: 32rpx;
}

.nav-btn.disabled {
  opacity: 0.3;
}

.bottombar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  transition: opacity 0.3s;
}

.dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 0;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.2s;
}

.dot.active {
  background: #ffffff;
  width: 32rpx;
  border-radius: 8rpx;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  padding-bottom: calc(64rpx + env(safe-area-inset-bottom));
  padding-top: 16rpx;
}

.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.action.disabled {
  opacity: 0.5;
}

.action-circle {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
}

.action-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.scale-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.scale-text {
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
