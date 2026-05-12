<template>
  <div class="page">
    <div class="toolbar"><h3>平台营收总览</h3></div>

    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6" v-for="card in overviewCards" :key="card.title">
        <el-card>
          <el-statistic :title="card.title" :value="card.value" :prefix="card.prefix" :precision="card.precision" />
        </el-card>
      </el-col>
    </el-row>

    <el-card title="营收趋势" style="margin-bottom:16px">
      <template #header>营收趋势（最近30天）</template>
      <div ref="trendChart" style="height:300px"></div>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card title="收入统计">
          <template #header>收入统计</template>
          <el-table :data="statsData" stripe>
            <el-table-column prop="label" label="项目" />
            <el-table-column label="金额">
              <template #default="{ row }">¥{{ Number(row.value).toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card title="分类明细">
          <template #header>分类明细</template>
          <el-table :data="breakdownData" stripe>
            <el-table-column prop="label" label="分类" />
            <el-table-column label="金额">
              <template #default="{ row }">¥{{ Number(row.value).toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { revenueApi } from '@/api'
import * as echarts from 'echarts'

const overviewCards = ref([
  { title: '平台总收入', value: 0, prefix: '¥', precision: 2 },
  { title: '用户收益', value: 0, prefix: '¥', precision: 2 },
  { title: '平台分佣', value: 0, prefix: '¥', precision: 2 },
  { title: '本月新增', value: 0, prefix: '¥', precision: 2 },
])

const trendChart = ref(null)
const statsData = ref<any[]>([])
const breakdownData = ref<any[]>([])

onMounted(async () => {
  try {
    const [overviewRes, statsRes, breakdownRes] = await Promise.all([
      revenueApi.platformOverview(),
      revenueApi.stats(),
      revenueApi.breakdown(),
    ])
    const overview = overviewRes.data as any
    if (overview) {
      overviewCards.value[0].value = Number(overview.totalRevenue || overview.total || 0)
      overviewCards.value[1].value = Number(overview.userEarnings || 0)
      overviewCards.value[2].value = Number(overview.platformCommission || 0)
      overviewCards.value[3].value = Number(overview.monthlyNew || 0)
    }
    const stats = statsRes.data as any
    if (stats) {
      statsData.value = Object.entries(stats).map(([k, v]) => ({ label: k, value: v }))
    }
    const breakdown = breakdownRes.data as any
    if (breakdown) {
      breakdownData.value = Object.entries(breakdown).map(([k, v]) => ({ label: k, value: v }))
    }
  } catch {}

  try {
    const trendsRes = await revenueApi.platformTrends({ days: 30 })
    const trends = trendsRes.data as any
    if (trendChart.value && trends) {
      const chart = echarts.init(trendChart.value)
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: (trends as any[]).map((t: any) => t.date) },
        yAxis: { type: 'value' },
        series: [{
          name: '营收', type: 'line', smooth: true,
          data: (trends as any[]).map((t: any) => t.amount || t.value || 0),
          areaStyle: { opacity: 0.1 }
        }],
        grid: { left: 40, right: 20, top: 20, bottom: 30 },
      })
    }
  } catch {}
})
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { margin-bottom: 16px; }
</style>
