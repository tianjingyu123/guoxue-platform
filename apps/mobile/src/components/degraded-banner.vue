<template>
  <view v-if="degraded" class="degraded-banner">
    <text class="db-icon">⚠️</text>
    <text class="db-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { degradeApi, type DegradeStatus } from '@/lib/degrade-data'

const props = withDefaults(defineProps<{
  /** 依赖键：live / im / vod / ai / pay */
  dep: keyof DegradeStatus
  text?: string
}>(), {
  text: '该服务临时维护中，部分功能暂不可用，请稍后再试',
})

const degraded = ref(false)

onMounted(async () => {
  const status = await degradeApi.getStatus()
  degraded.value = status[props.dep] === true
})
</script>

<style lang="scss" scoped>
.degraded-banner {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #fff7e6;
  border-bottom: 1rpx solid #ffe7ba;

  .db-icon { font-size: 28rpx; }
  .db-text {
    flex: 1;
    font-size: 24rpx;
    color: #ad6800;
    line-height: 1.5;
  }
}
</style>
