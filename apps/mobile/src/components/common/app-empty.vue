<script setup lang="ts">
/**
 * 通用空状态（全平台空态标准组件）。
 * 用法：<AppEmpty icon="inbox" title="暂无数据" desc="..." actionText="去逛逛" @action="..." />
 */
import AppIcon from '@/components/common/app-icon.vue'

withDefaults(defineProps<{
  icon?: string
  title?: string
  desc?: string
  actionText?: string
}>(), {
  icon: 'inbox',
  title: '暂无数据',
  desc: '',
  actionText: '',
})

const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <view class="app-empty content-fade-in">
    <view class="app-empty__icon">
      <AppIcon :name="icon" :size="56" color="#C9C2B6" />
    </view>
    <text class="app-empty__title">{{ title }}</text>
    <text v-if="desc" class="app-empty__desc">{{ desc }}</text>
    <view v-if="actionText" class="app-empty__action btn-press" @tap="emit('action')">
      <text class="app-empty__action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}
.app-empty__icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: var(--surface-sunken);
  @include flex-center;
  margin-bottom: $space-lg;
}
.app-empty__title {
  font-size: 30rpx;
  color: var(--text-strong);
  font-weight: 600;
  margin-bottom: 12rpx;
}
.app-empty__desc {
  font-size: $font-md;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.5;
}
.app-empty__action {
  margin-top: $space-xl;
  padding: 0 56rpx;
  height: 80rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, var(--brand), var(--brand-soft));
  @include flex-center;
}
.app-empty__action-text {
  font-size: $font-md;
  color: #fff;
  font-weight: 600;
}
</style>
