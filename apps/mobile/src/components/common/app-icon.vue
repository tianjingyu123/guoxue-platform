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
  /**
   * 明确声明该图标是纯装饰（含义已由相邻文字或宿主 aria-label 给出），渲染时对辅助技术隐藏。
   *
   * 默认 false：不默认隐藏。全仓 3698 处调用中有约 1086 处，图标位于无 aria-label、
   * 也无同级文字的可点元素内（返回、分享、发帖 FAB 等），图标是该控件唯一可能承载语义的东西。
   * 对这些位置，正确做法是给宿主补可读名称，而不是把图标一律标成装饰——
   * 一律隐藏只会让 axe 不再报 image-alt，并不等于语义正确，还会挡住后续补名。
   * 因此本属性按调用点逐处开启，只用于已核验含义不依赖图标的位置。
   */
  decorative?: boolean
}>(), {
  size: 44,
  color: '#666666',
  strokeWidth: 2,
  fill: false,
  unit: 'rpx',
  compact: false,
  decorative: false,
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
  <!-- decorative 由调用点显式声明，不在此处对全站图标一刀切（见 props 注释）。 -->
  <image
    lazy-load
    :aria-hidden="decorative ? 'true' : undefined"
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
