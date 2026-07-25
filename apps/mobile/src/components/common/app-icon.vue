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
  /** arrow-left / chevron-left 默认按页面返回图标规范保底；非返回用途可开启紧凑模式。 */
  compact?: boolean
}>(), {
  size: 44,
  color: '#666666',
  strokeWidth: 2,
  fill: false,
  unit: 'rpx',
  compact: false,
})

const isBackGlyph = computed(() => props.name === 'arrow-left' || props.name === 'chevron-left')
const normalizedSize = computed(() => {
  if (!isBackGlyph.value || props.compact) return props.size
  return Math.max(props.size, props.unit === 'px' ? 24 : 44)
})
const normalizedStrokeWidth = computed(() => {
  if (!isBackGlyph.value || props.compact) return props.strokeWidth
  return Math.max(props.strokeWidth, 2.25)
})
const src = computed(() => iconDataUri(props.name, props.color, normalizedStrokeWidth.value, props.fill))
const dim = computed(() => normalizedSize.value + props.unit)
const hitPadding = computed(() => {
  if (!isBackGlyph.value || props.compact) return 0
  const targetSize = props.unit === 'px' ? 44 : 88
  return Math.max(0, (targetSize - normalizedSize.value) / 2)
})
const iconStyle = computed(() => ({
  width: dim.value,
  height: dim.value,
  ...(hitPadding.value > 0
    ? {
        padding: `${hitPadding.value}${props.unit}`,
        margin: `-${hitPadding.value}${props.unit}`,
      }
    : {}),
}))
</script>

<template>
  <image
    lazy-load
    :src="src"
    :style="iconStyle"
    class="app-icon"
    :class="{ 'app-icon--back': isBackGlyph && !props.compact }"
  />
</template>

<style scoped>
.app-icon { display: block; }
.app-icon--back { box-sizing: content-box; }
</style>
