<template>
  <view>
    <!-- 遮罩 -->
    <view class="ds-mask" :class="{ 'ds-mask-on': open }" @tap="emit('close')" />
    <!-- 弹层主体 -->
    <view class="ds-sheet" :class="{ 'ds-sheet-on': open }">
      <view class="ds-grab-wrap">
        <view class="ds-grab" />
        <view class="ds-close" @tap="emit('close')">
          <app-icon name="x" :size="40" color="#999999" />
        </view>
      </view>
      <discussion-panel
        :config="config"
        :items="items"
        :inline="true"
        :enable-a-i-assist="enableAIAssist"
        :controlled="controlled"
        class="ds-panel"
        @submit-comment="(p: any) => emit('submit-comment', p)"
        @like-comment="(id: any) => emit('like-comment', id)"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import DiscussionPanel from '@/components/common/discussion-panel.vue'
import type { DiscussionConfig, DiscussionItem } from '@/lib/discussion-types'

defineProps<{
  open: boolean
  config: DiscussionConfig
  items: DiscussionItem[]
  enableAIAssist?: boolean
  controlled?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit-comment', payload: { content: string; parentId?: string | number; rating?: number }): void
  (e: 'like-comment', id: string | number): void
}>()
</script>

<style scoped>
.ds-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}
.ds-mask-on {
  opacity: 1;
  pointer-events: auto;
}
.ds-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  height: 80vh;
  border-radius: 32rpx 32rpx 0 0;
  background: var(--card);
  transform: translateY(100%);
  transition: transform 0.3s;
}
.ds-sheet-on {
  transform: translateY(0);
}
.ds-grab-wrap {
  position: relative;
  flex-shrink: 0;
  padding: 16rpx 32rpx 0;
}
.ds-grab {
  width: 80rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(150, 150, 150, 0.3);
  margin: 0 auto;
}
.ds-close {
  position: absolute;
  right: 32rpx;
  top: 12rpx;
}
.ds-panel {
  min-height: 0;
  flex: 1;
}
</style>
