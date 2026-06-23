<script setup lang="ts">
/**
 * 通用空状态
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
      <AppIcon :name="icon" :size="56" color="#D9CFC2" />
    </view>
    <text class="app-empty__title">{{ title }}</text>
    <text v-if="desc" class="app-empty__desc">{{ desc }}</text>
    <view v-if="actionText" class="app-empty__action btn-press" @tap="emit('action')">
      <text class="app-empty__action-text">{{ actionText }}</text>
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
  background: #F5F1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.app-empty__title {
  font-size: 30rpx;
  color: #2C2C2C;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.app-empty__desc {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.5;
}
.app-empty__action {
  margin-top: 40rpx;
  padding: 0 56rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #C41E3A, #E85A71);
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-empty__action-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}
</style>
