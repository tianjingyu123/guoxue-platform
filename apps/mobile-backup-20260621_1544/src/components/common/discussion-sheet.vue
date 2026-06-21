<template>
  <view
    v-if="visible"
    class="ds-mask"
    @tap="$emit('close')"
  >
    <view
      class="ds-sheet"
      @tap.stop
    >
      <text class="ds-title">
        讨论区
      </text>
      <view class="ds-body">
        <text class="ds-empty">
          暂无讨论
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
defineEmits<{ close: [] }>()
</script>

<style scoped>
.ds-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: flex-end; z-index: 1000;
}
.ds-sheet {
  width: 100%; height: 60%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 40rpx;
}
.ds-title { font-size: 36rpx; font-weight: 600; }
.ds-empty { color: #999; margin-top: 40rpx; text-align: center; }
</style>
