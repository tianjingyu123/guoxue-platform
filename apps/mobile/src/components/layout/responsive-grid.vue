<script setup lang="ts">
/**
 * V0 响应式网格组件
 * Mobile(<768px): 2列 → Tablet(768-1024px): 3列 → Desktop(≥1024px): 4列 → Wide(≥1440px): 5列
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  mobileCols?: number
  tabletCols?: number
  desktopCols?: number
  wideCols?: number
  gap?: number
}>(), {
  mobileCols: 2,
  tabletCols: 3,
  desktopCols: 4,
  wideCols: 5,
  gap: 12,
})

const cols = ref(props.mobileCols)
let timer: ReturnType<typeof setTimeout> | null = null

function updateCols() {
  // uni-app H5 环境
  const w = window.innerWidth
  if (w >= 1440) cols.value = props.wideCols
  else if (w >= 1024) cols.value = props.desktopCols
  else if (w >= 768) cols.value = props.tabletCols
  else cols.value = props.mobileCols
}

// 具名防抖处理器：addEventListener 与 removeEventListener 必须引用同一函数才能正确解绑
function onResize() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(updateCols, 100)
}

onMounted(() => {
  updateCols()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <view
    class="responsive-grid"
    :style="{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: `${gap}px`,
      padding: `${gap}px`,
    }"
  >
    <slot />
  </view>
</template>
