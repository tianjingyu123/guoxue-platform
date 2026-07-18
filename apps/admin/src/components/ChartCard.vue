<template>
  <div class="chart-card">
    <div class="chart-card__header">
      <span class="chart-card__title">{{ title }}</span>
      <slot name="extra" />
    </div>
    <div
      v-if="hasData"
      ref="chartRef"
      class="chart-card__body"
      :style="{ height: height + 'px' }"
    />
    <div
      v-else
      class="chart-card__empty"
    >
      <el-empty
        description="暂无数据"
        :image-size="48"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import echarts from '../utils/echarts'
import type { EChartsType } from 'echarts/core'

const props = withDefaults(defineProps<{
  title: string
  option?: any
  height?: number
}>(), { height: 300 })

const chartRef = ref<HTMLElement>()
let chart: EChartsType | null = null

/**
 * 是否有可绘数据：由 option 直接推导（computed），不依赖 render 副作用。
 * 修复历史死锁：hasData 初始 false → v-if 不渲染容器 → chartRef 空 → render 提前返回
 * → hasData 永远置不了 true → 后端有数图也永远"暂无数据"。
 */
const hasData = computed(() => {
  const series = props.option?.series
  if (!Array.isArray(series) || series.length === 0) return false
  // 任一系列有数据点即认为有数（pie/bar/line 通用；无 data 字段的系列如 dataset 驱动视为有数）
  return series.some((s: any) => (Array.isArray(s?.data) ? s.data.length > 0 : true))
})

function render() {
  if (!chartRef.value || !props.option) return
  if (!chart) chart = echarts.init(chartRef.value, 'guoxue')
  chart.setOption(props.option, true)
}

function resize() { chart?.resize() }

watch(() => props.option, () => nextTick(render), { deep: true })
// 容器随 hasData 卸载时同步销毁实例，避免持有已脱离文档的 DOM；重新有数后 nextTick 再 init
watch(hasData, (v) => {
  if (!v && chart) { chart.dispose(); chart = null }
})

onMounted(() => { nextTick(render); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); chart?.dispose(); chart = null })
</script>

<style scoped>
.chart-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--transition-base);
}
.chart-card:hover {
  box-shadow: var(--shadow-card-hover);
}
.chart-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}
.chart-card__title {
  font-size: var(--font-size-caption);
  font-weight: 500;
  color: var(--color-text-secondary);
}
.chart-card__body {
  width: 100%;
}
.chart-card__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>
