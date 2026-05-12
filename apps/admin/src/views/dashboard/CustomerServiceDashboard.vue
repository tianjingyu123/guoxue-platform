<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import { WarningFilled, Timer, User, ChatLineSquare, Medal } from '@element-plus/icons-vue'
import GreetingHeader from '@/components/GreetingHeader.vue'
import AnimatedCounter from '@/components/AnimatedCounter.vue'
import AnomalyAlert from '@/components/AnomalyAlert.vue'
import ChartCard from '@/components/ChartCard.vue'

interface AlertItem { text: string; count: number; level: 'critical' | 'warning' | 'info' }
interface CardItem { label: string; value: number; icon: any; highlight?: boolean }
interface ChartItem { title: string; option: any }

const username = ref('客服专员')
const alerts = ref<AlertItem[]>([])
const cards = ref<CardItem[]>([])
const charts = ref<ChartItem[]>([])

onMounted(async () => {
  try {
    const [overviewRes, statsRes, trendsRes] = await Promise.all([
      api.get('/dashboard/today-overview'),
      api.get('/dashboard/stats'),
      api.get('/dashboard/trends'),
    ])
    const ov = overviewRes.data ?? {}
    const st = statsRes.data ?? {}
    const tr = trendsRes.data ?? {}

    // 告警
    const aList: AlertItem[] = []
    if ((ov.pendingReports ?? 0) > 0) aList.push({ text: '待处理举报', count: ov.pendingReports, level: 'critical' })
    if ((ov.pendingAppeals ?? 0) > 0) aList.push({ text: '待处理申诉', count: ov.pendingAppeals, level: 'warning' })
    alerts.value = aList

    // 统计卡片
    cards.value = [
      { label: '待处理举报', value: ov.pendingReports ?? 0, icon: WarningFilled, highlight: (ov.pendingReports ?? 0) > 0 },
      { label: '待处理申诉', value: ov.pendingAppeals ?? 0, icon: ChatLineSquare, highlight: (ov.pendingAppeals ?? 0) > 0 },
      { label: '今日工单量', value: ov.todayNewOrders ?? 0, icon: Timer },
      { label: '已处理工单', value: st.processedOrders ?? 0, icon: Medal },
      { label: '总用户数', value: st.userCount ?? 0, icon: User },
      { label: '今日新增用户', value: ov.todayNewUsers ?? 0, icon: User },
      { label: '平均响应时长(分)', value: st.avgResponseTime ?? 0, icon: Timer },
      { label: '满意度', value: st.satisfaction ?? 0, icon: Medal },
    ]

    // 折线图 — 工单/举报趋势
    const dates = tr.dates ?? []
    const dataset = tr.userTrend ?? []
    charts.value = [{
      title: '工单处理趋势',
      option: {
        grid: { top: 30, right: 20, bottom: 30, left: 50 },
        xAxis: {
          type: 'category', data: dates,
          axisLine: { lineStyle: { color: '#F0F0F0' } },
          axisTick: { show: false },
          axisLabel: { color: '#999', fontSize: 12 },
        },
        yAxis: {
          type: 'value', minInterval: 1,
          splitLine: { lineStyle: { color: '#F0F0F0' } },
          axisLabel: { color: '#999', fontSize: 12 },
          axisLine: { show: false }, axisTick: { show: false },
        },
        series: [{
          type: 'line', data: dataset, smooth: true,
          symbol: 'circle', symbolSize: 6,
          lineStyle: { color: '#FF6B6B', width: 3 },
          itemStyle: { color: '#FF6B6B', borderWidth: 2, borderColor: '#fff' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
              { offset: 0, color: 'rgba(255,107,107,0.15)' },
              { offset: 1, color: 'rgba(255,107,107,0)' },
            ]},
          },
        }],
        tooltip: {
          trigger: 'axis', backgroundColor: '#fff',
          borderColor: '#F0F0F0', borderWidth: 1,
          textStyle: { color: '#1A1A1A', fontSize: 13 },
        },
      },
    }]
  } catch (e) {
    console.error('客服仪表盘数据加载失败', e)
  }
})
</script>

<template>
  <div class="dashboard">
    <GreetingHeader :username="username" />
    <div class="alerts-row" v-if="alerts.length">
      <AnomalyAlert v-for="a in alerts" :key="a.text" v-bind="a" />
    </div>
    <el-row :gutter="20" class="stats-row">
      <el-col v-for="card in cards" :key="card.label" :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon"><el-icon :size="18"><component :is="card.icon" /></el-icon></div>
          </div>
          <div class="stat-card__value"><AnimatedCounter :value="card.value" :highlight="card.highlight" /></div>
        </div>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="charts-row">
      <el-col v-for="ch in charts" :key="ch.title" :xs="24" :md="24">
        <ChartCard :title="ch.title" :option="ch.option" :height="320" />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }
.alerts-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: #FFFFFF; border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default; margin-bottom: 20px;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: #999; }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255, 107, 107, 0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value {
  font-size: 28px; font-weight: 700; color: #1A1A1A;
  font-feature-settings: "tnum"; line-height: 1.2;
}
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
