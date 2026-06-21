<script setup lang="ts">
import { computed } from 'vue'
import { iconDataUri } from '@/lib/icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number       // rpx
  color?: string
  strokeWidth?: number
  fill?: boolean
}>(), {
  size: 44,
  color: '#666666',
  strokeWidth: 2,
  fill: false,
})

const src = computed(() => iconDataUri(props.name, props.color, props.strokeWidth, props.fill))
</script>

<template>
  <image
    :src="src"
    :style="{ width: size + 'rpx', height: size + 'rpx' }"
    class="app-icon"
  />
</template>

<style scoped>
.app-icon { display: block; }
</style>
