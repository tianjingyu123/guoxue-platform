<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  /** 是否显示右侧搜索入口，默认 true */
  showSearch?: boolean
  /** 右侧操作类型：'search' | 'share' | 'none' */
  rightType?: 'search' | 'share' | 'none'
}>(), {
  showSearch: true,
  rightType: 'search',
})

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'right'): void
}>()

// AppIcon 把颜色嵌入 SVG data URI，CSS 变量在隔离 SVG 中无效，必须用具体色值。
const iconColor = '#2c2c2c'

function onBack() {
  emit('back')
  // 默认返回行为
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab?.({ url: '/pages/index/index' }).catch?.(() => {})
}

function goSearch() {
  uni.navigateTo({ url: '/pkg-classics/search/index' })
}
</script>

<template>
  <view class="ch-header">
    <!-- 状态栏占位 -->
    <view class="ch-statusbar" />
    <view class="ch-bar">
      <view class="ch-btn" @tap="onBack">
        <app-icon name="arrow-left" :size="44" :color="iconColor" />
      </view>
      <text class="ch-title">{{ title }}</text>
      <!-- 自定义右侧插槽优先（覆盖默认搜索/分享按钮，对齐原型 rightSlot） -->
      <view v-if="$slots.right" class="ch-right">
        <slot name="right" />
      </view>
      <view v-else-if="rightType === 'share'" class="ch-btn" @tap="emit('right')">
        <app-icon name="share-2" :size="40" :color="iconColor" />
      </view>
      <view v-else-if="rightType === 'search' && showSearch" class="ch-btn" @tap="goSearch">
        <app-icon name="search" :size="44" :color="iconColor" />
      </view>
      <view v-else class="ch-btn ch-btn--placeholder" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.ch-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--classics-bg) 80%, transparent);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}
.ch-statusbar {
  height: var(--status-bar-height, 0px);
}
.ch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12rpx;
  height: 96rpx;
}
.ch-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: transform 0.15s;
  &:active {
    transform: scale(0.9);
  }
}
.ch-btn--placeholder {
  &:active {
    transform: none;
  }
}
.ch-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 72rpx;
}
.ch-title {
  font-size: 34rpx;
  font-weight: 600;
  letter-spacing: -0.5rpx;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 16rpx;
}
</style>
