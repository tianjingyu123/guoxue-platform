<script setup lang="ts">
/**
 * 閫氱敤绌虹姸鎬侊紙鍏ㄥ钩鍙扮┖鎬佹爣鍑嗙粍浠讹級銆?
 * 鐢ㄦ硶锛?AppEmpty icon="inbox" title="鏆傛棤鏁版嵁" desc="..." actionText="鍘婚€涢€? @action="..." />
 */
import AppIcon from '@/components/common/app-icon.vue'

withDefaults(defineProps<{
  icon?: string
  title?: string
  desc?: string
  actionText?: string
}>(), {
  icon: 'inbox',
  title: '鏆傛棤鏁版嵁',
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
  background: linear-gradient(135deg, var(--brand), var(--gugong-red-soft, #d94452));
  @include flex-center;
}
.app-empty__action-text {
  font-size: $font-md;
  color: #fff;
  font-weight: 600;
}
</style>
