<template>
  <view
    v-if="isOpen"
    class="modal-mask"
    @tap="$emit('close')"
  >
    <view
      class="modal-content"
      @tap.stop
    >
      <view class="modal-header">
        <text class="modal-title">
          AI 智能搜索
        </text>
        <view
          class="modal-close"
          @tap="$emit('close')"
        >
          <AppIcon
            name="x"
            :size="40"
            color="#666"
          />
        </view>
      </view>
      <view class="modal-body">
        <text class="modal-desc">
          输入关键词，AI 帮你精准查找
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'

defineProps<{ isOpen: boolean }>()
defineEmits<{ close: [] }>()
</script>

<style scoped>
.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-content {
  width: 640rpx; background: #fff; border-radius: 24rpx; padding: 40rpx;
}
.modal-header {
  flex-direction: row; justify-content: space-between; align-items: center;
}
.modal-title { font-size: 36rpx; font-weight: 600; }
.modal-desc { color: #999; margin-top: 24rpx; }
</style>
