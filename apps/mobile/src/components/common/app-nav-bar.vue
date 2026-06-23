<template>
  <view class="app-nav-bar" :class="{ 'no-border': noBorder, 'align-left': titleAlign === 'left' }" :style="barStyle">
    <!-- 状态栏安全区占位（H5下为0，真机为状态栏高度） -->
    <view class="nav-status" />
    <view class="nav-content" :style="{ height: barHeight + 'rpx' }">
      <!-- 左侧：返回 -->
      <view class="nav-side nav-left">
        <view v-if="showBack" class="nav-back" @tap="onBack">
          <app-icon :name="backIcon" :size="backSize" :color="color" />
        </view>
        <slot name="left" />
      </view>
      <!-- 标题（或自定义中间内容，如 tabs） -->
      <slot name="center">
        <text class="nav-title" :style="{ color, fontSize: titleSize + 'rpx', fontWeight: titleWeight, fontFamily: serifTitle ? 'var(--font-serif)' : '' }">{{ title }}</text>
      </slot>
      <!-- 右侧：操作插槽 -->
      <view class="nav-side nav-right">
        <slot name="right" />
      </view>
    </view>

  </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const props = withDefaults(
  defineProps<{
    title?: string
    showBack?: boolean
    color?: string
    /** 返回图标，原型各页不同：chevron-left(默认) 或 arrow-left */
    backIcon?: string
    /** 返回图标尺寸(rpx)，chevron 默认 44(=22px)，arrow 建议 40(=20px) */
    backSize?: number
    /** 标题字号(rpx)，默认 32(=16px text-base)，部分页用 36(=18px text-lg) */
    titleSize?: number
    /** 导航栏内容区高度(rpx)，默认 112(=56px h-14)，py-3类页用 106(=53px) */
    barHeight?: number
    /** 标题对齐，默认 center(居中)，settings类页用 left(紧挨返回按钮) */
    titleAlign?: 'center' | 'left'
    /** 标题字重，默认 600(font-semibold)，部分页用 500(font-medium) */
    titleWeight?: number
    /** 标题是否用衬线字体(原型部分页 font-serif) */
    serifTitle?: boolean
    /** 背景色，默认白色半透明 */
    background?: string
    noBorder?: boolean
    /** 自定义返回：传入则点击只触发 @back，不走默认 goBack(用于多步返回) */
    customBack?: boolean
  }>(),
  {
    title: '',
    showBack: true,
    color: '#2C2C2C',
    backIcon: 'chevron-left',
    backSize: 44,
    titleSize: 32,
    barHeight: 112,
    titleAlign: 'center',
    titleWeight: 600,
    serifTitle: false,
    background: 'rgba(255, 255, 255, 0.95)',
    noBorder: false,
    customBack: false,
  },
)

const emit = defineEmits<{ (e: 'back'): void }>()

const barStyle = computed(() => ({ background: props.background }))

function onBack() {
  emit('back')
  if (!props.customBack) goBack()
}
</script>

<style lang="scss" scoped>
.app-nav-bar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  /* 顶部安全区：H5 下为 0，匹配原型；真机自动撑开状态栏 */
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  border-bottom: 2rpx solid #e8e3db;
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);

  &.no-border {
    border-bottom: none;
  }
}

.nav-status {
  width: 100%;
}

.nav-content {
  display: flex;
  align-items: center;
  padding: 0 32rpx; /* px-4 = 16px */
}

.nav-side {
  min-width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-left {
  justify-content: flex-start;
}

.nav-right {
  justify-content: flex-end;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  margin-left: -12rpx; /* -ml-2，与原型一致 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx; /* 16px，对齐原型 text-base */
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 左对齐标题（如 settings 类页面：返回紧挨标题，gap-3） */
.align-left .nav-side {
  min-width: 0;
}
.align-left .nav-title {
  text-align: left;
  margin-left: 12rpx; /* gap-3 视觉间距 */
}
</style>
