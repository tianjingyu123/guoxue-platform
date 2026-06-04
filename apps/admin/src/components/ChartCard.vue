<template>
  <div class="chart-card">
    <div class="chart-card__header">
      <span class="chart-card__title">{{ title }}</span>
      <slot name="extra" />
    </div>
    <div
      ref="chartRef"
      class="chart-card__body"
      :style="{ height: height + 'px' }"
    />
    <el-empty
      v-if="!hasData"
      description="暂无数据"
      :image-size="48"
    />
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
.chart-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.chart-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.chart-card__title { font-size: 14px; font-weight: 500; color: #999; }
.chart-card__body { width: 100%; }
</style>
