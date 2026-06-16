<template>
  <view class="app-nav-bar" :class="{ 'no-border': noBorder, 'align-left': titleAlign === 'left' }" :style="barStyle">
    <view class="nav-status" />
    <view class="nav-content" :style="{ height: barHeight + 'rpx' }">
      <view class="nav-side nav-left">
        <view v-if="showBack" class="nav-back" @tap="onBack">
          <app-icon :name="backIcon" :size="backSize" :color="color" />
        </view>
        <slot name="left" />
      </view>
      <slot name="center">
        <text class="nav-title" :style="{ color, fontSize: titleSize + 'rpx', fontWeight: titleWeight, fontFamily: serifTitle ? 'var(--font-serif)' : '' }">{{ title }}</text>
      </slot>
      <view class="nav-side nav-right">
        <slot name="right" />
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
    backIcon?: string
    backSize?: number
    titleSize?: number
    barHeight?: number
    titleAlign?: 'center' | 'left'
    titleWeight?: number
    serifTitle?: boolean
    background?: string
    noBorder?: boolean
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
  padding: 0 32rpx;
}

.nav-side {
  min-width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-left { justify-content: flex-start; }
.nav-right { justify-content: flex-end; }

.nav-back {
  width: 60rpx;
  height: 60rpx;
  margin-left: -12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.align-left .nav-side { min-width: 0; }
.align-left .nav-title {
  text-align: left;
  margin-left: 12rpx;
}
</style>
