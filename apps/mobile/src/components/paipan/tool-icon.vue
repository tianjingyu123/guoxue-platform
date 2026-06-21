<script setup lang="ts">
/**
 * 工具图标容器（对应原型 components/paipan/tool-icon.tsx）
 * 圆形 + bg-primary/5 + border-2 border-primary/20，内层图标 text-primary（故宫红）。
 * 内层图标尺寸为容器的 0.55（与原型一致）。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

const props = withDefaults(defineProps<{ iconId: string; size?: number }>(), {
  size: 88, // rpx（原型 44px）
})

const innerSize = computed(() => Math.round(props.size * 0.55))
</script>

<template>
  <view class="tool-icon" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <app-icon :name="iconId" :size="innerSize" color="#c41e3a" />
  </view>
</template>

<style scoped lang="scss">
.tool-icon {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(196, 30, 58, 0.05);
  border: 2rpx solid rgba(196, 30, 58, 0.2);
}
</style>
