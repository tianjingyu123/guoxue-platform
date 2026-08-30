<script setup lang="ts">
/**
 * 平台级求助入口：客服 + 消息通知。
 *
 * 首页、发现、搜索等公共枢纽统一使用，避免用户在深层业务里找不到求助入口。
 * 未读数来自真实通知聚合接口；未登录或接口异常时自然降级为 0。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'
import { getToken } from '@/utils/storage'

withDefaults(defineProps<{
  compact?: boolean
  tone?: 'paper' | 'plain'
}>(), {
  compact: false,
  tone: 'paper',
})

const unreadCount = ref(0)

async function loadUnread() {
  if (!getToken()) { unreadCount.value = 0; return }
  unreadCount.value = await mineApi.getUnreadNotifyCount()
}

function activateOnKeyboard(event: KeyboardEvent, target: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  navigateTo(target)
}

onMounted(() => {
  loadUnread()
  uni.$on('notify:refresh', loadUnread)
})

onUnmounted(() => {
  uni.$off('notify:refresh', loadUnread)
})
</script>

<template>
  <view class="support-actions" :class="[`support-actions--${tone}`, { 'support-actions--compact': compact }]">
    <view
      class="support-action"
      role="button"
      aria-label="联系智能客服"
      tabindex="0"
      hover-class="support-action--pressed"
      @tap="navigateTo('/customer-service')"
      @keydown="activateOnKeyboard($event, '/customer-service')"
    >
      <AppIcon name="headphones" :size="compact ? 30 : 34" color="#5E5147" />
      <text class="support-action__label">客服</text>
    </view>
    <view
      class="support-action support-action--notice"
      role="button"
      aria-label="查看消息通知"
      tabindex="0"
      hover-class="support-action--pressed"
      @tap="navigateTo('/notifications')"
      @keydown="activateOnKeyboard($event, '/notifications')"
    >
      <AppIcon name="bell" :size="compact ? 30 : 34" color="#5E5147" />
      <text class="support-action__label">消息</text>
      <view v-if="unreadCount > 0" class="support-action__badge">
        <text class="support-action__badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.support-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-shrink: 0;
}

.support-action {
  position: relative;
  width: 76rpx;
  min-width: 76rpx;
  height: 76rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(126, 104, 82, 0.14);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 6rpx 20rpx rgba(76, 59, 43, 0.05);
}

.support-actions--plain .support-action {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.support-actions--compact {
  gap: 4rpx;
}

.support-actions--compact .support-action {
  width: 64rpx;
  min-width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
}

.support-action--pressed {
  opacity: 0.72;
  transform: scale(0.96);
}

.support-action__label {
  font-size: 18rpx;
  line-height: 1;
  color: #6e6258;
}

.support-action__badge {
  position: absolute;
  top: -5rpx;
  right: -5rpx;
  min-width: 26rpx;
  height: 26rpx;
  padding: 0 6rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  border: 2rpx solid #faf8f5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c41e3a;
}

.support-action__badge-text {
  font-size: 16rpx;
  line-height: 1;
  color: #ffffff;
}
</style>
