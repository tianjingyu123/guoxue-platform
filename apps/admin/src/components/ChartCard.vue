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
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import echarts from '../utils/echarts'
import type { EChartsType } from 'echarts/core'

const props = withDefaults(defineProps<{
  title: string
  option?: any
  height?: number
}>(), { height: 300 })

const chartRef = ref<HTMLElement>()
let chart: EChartsType | null = null
const hasData = ref(false)

function render() {
  if (!chartRef.value || !props.option) return
  if (!chart) chart = echarts.init(chartRef.value, 'guoxue')
  chart.setOption(props.option, true)
  hasData.value = (props.option.series?.[0]?.data?.length > 0) || (props.option.series?.length > 0)
}

function resize() { chart?.resize() }

watch(() => props.option, () => nextTick(render), { deep: true })

onMounted(() => { nextTick(render); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); chart?.dispose() })
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
