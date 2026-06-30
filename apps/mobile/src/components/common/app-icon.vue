<script setup lang="ts">
import { computed } from 'vue'
import { iconDataUri } from '@/lib/icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number       // 数值，单位由 unit 决定，默认 rpx
  color?: string
  strokeWidth?: number
  fill?: boolean
  unit?: 'rpx' | 'px' // 宽屏固定布局页（如横屏直播）传 'px'，避免 rpx 在宽屏被放大
}>(), {
  size: 44,
  color: '#666666',
  strokeWidth: 2,
  fill: false,
  unit: 'rpx',
})

const src = computed(() => iconDataUri(props.name, props.color, props.strokeWidth, props.fill))
const dim = computed(() => props.size + props.unit)
</script>

<template>
  <image lazy-load :src="src" :style="{ width: dim, height: dim }" class="app-icon" />
</template>

<style scoped>
.app-icon { display: block; }
</style>
