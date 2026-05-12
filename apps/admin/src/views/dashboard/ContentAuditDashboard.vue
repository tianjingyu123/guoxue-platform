<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import { Document, Checked, CircleCheck, CircleClose, Files, View, WarningFilled } from '@element-plus/icons-vue'
import GreetingHeader from '@/components/GreetingHeader.vue'
import AnimatedCounter from '@/components/AnimatedCounter.vue'
import AnomalyAlert from '@/components/AnomalyAlert.vue'
import ChartCard from '@/components/ChartCard.vue'

interface AlertItem { text: string; count: number; level: 'critical' | 'warning' | 'info' }
interface CardItem { label: string; value: number; icon: any; highlight?: boolean }
interface ChartItem { title: string; option: any }

const username = ref('内容审核员')
const alerts = ref<AlertItem[]>([])
const cards = ref<CardItem[]>([])
const charts = ref<ChartItem[]>([])

onMounted(async () => {
  try {
    const [overviewRes, statsRes, healthRes, chartsRes] = await Promise.all([
      api.get('/dashboard/today-overview'),
      api.get('/dashboard/stats'),
      api.get('/dashboard/content-health'),
      api.get('/dashboard/charts'),
    ])
    const ov = overviewRes.data ?? {}
    const st = statsRes.data ?? {}
    const health = healthRes.data ?? {}
    const ch = chartsRes.data ?? {}

    // 告警
    const aList: AlertItem[] = []
    if ((ov.pendingAudits ?? 0) > 20) aList.push({ text: '待审核内容超过20条', count: ov.pendingAudits, level: 'warning' })
    if ((health.lowQualityCount ?? 0) > 10) aList.push({ text: '低质内容数超过10条', count: health.lowQualityCount, level: 'warning' })
    alerts.value = aList

    // 统计卡片
    const passRate = health.passRate ?? 0
    const rejectRate = health.rejectRate ?? 0
    cards.value = [
      { label: '待审核内容', value: ov.pendingAudits ?? 0, icon: Document, highlight: (ov.pendingAudits ?? 0) > 0 },
      { label: '今日审核量', value: st.todayAudited ?? 0, icon: Checked },
      { label: '通过率', value: passRate, icon: CircleCheck },
      { label: '拒绝率', value: rejectRate, icon: CircleClose },
      { label: '总内容数', value: st.articleCount ?? 0, icon: Files },
      { label: '今日新增内容', value: st.todayNewContent ?? 0, icon: Document },
      { label: '低质内容数', value: health.lowQualityCount ?? 0, icon: WarningFilled, highlight: (health.lowQualityCount ?? 0) > 0 },
      { label: '总浏览量', value: st.totalViews ?? 0, icon: View },
    ]

    // 环形图 — 内容类型分布
    const distribution = (ch.contentDistribution ?? []).filter((d: any) => d.count > 0)
    const total = distribution.reduce((s: number, d: any) => s + d.count, 0)
    const palette = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#A8E6CF']
    charts.value = [{
      title: '内容类型分布',
      option: {
        tooltip: {
          trigger: 'item', backgroundColor: '#fff',
          borderColor: '#F0F0F0', borderWidth: 1,
          textStyle: { color: '#1A1A1A', fontSize: 13 },
          formatter: (p: any) => `${p.name}：${p.value}（${p.percent}%）`,
        },
        legend: {
          orient: 'vertical', right: 10, top: 'middle',
          itemWidth: 12, itemHeight: 12, itemGap: 16,
          textStyle: { color: '#666', fontSize: 13 },
          formatter: (name: string) => {
            const item = distribution.find((d: any) => d.name === name)
            const pct = item ? ((item.count / total) * 100).toFixed(1) : '0'
            return `${name}  ${pct}%`
          },
        },
        series: [{
          type: 'pie', radius: ['40%', '70%'], center: ['38%', '50%'],
          avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
          data: distribution.map((d: any, i: number) => ({
            name: d.name, value: d.count,
            itemStyle: { color: palette[i % palette.length] },
          })),
        }],
      },
    }]
  } catch (e) {
    console.error('内容审核仪表盘数据加载失败', e)
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
