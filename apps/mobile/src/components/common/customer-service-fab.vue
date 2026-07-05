<script setup lang="ts">
/**
 * 全局智能客服悬浮按钮（FAB）。
 * 病灶：客服只能从首页 Header 进，深层页面用户求助无门。
 * 注意：uni-app App.vue 无视图层，本组件需在各主要页面引入（建议封装进页面基础布局或逐页放）。
 *
 * 用法：<customer-service-fab />   放在页面根 view 内即可。
 */
import { navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'

withDefaults(defineProps<{
  /** 距底部距离（rpx），避开 tabBar/操作栏 */
  bottom?: number
}>(), {
  bottom: 180,
})

function onTap() {
  navigateTo('/customer-service')
}

// 应产品要求全局隐藏悬浮客服入口（真机上悬浮遮挡内容·碍事）。
// 保留组件与各页 <customer-service-fab /> 引用，便于后续改为非悬浮入口或一键恢复。
const visible = false
</script>

<template>
  <view
    v-if="visible"
    class="cs-fab btn-press"
    :style="{ bottom: bottom + 'rpx' }"
    @tap="onTap"
  >
    <AppIcon name="message-circle" :size="40" color="#FFFFFF" />
  </view>
</template>

<style scoped lang="scss">
.cs-fab {
  position: fixed;
  right: 24rpx;
  z-index: $z-overlay;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  @include flex-center;
  background: linear-gradient(135deg, var(--brand), var(--brand-soft));
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.35);
}
</style>
