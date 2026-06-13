<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { Goods, ShoppingCart, Box, Tickets, List, Van, WarningFilled, DataLine } from '@element-plus/icons-vue'
import GreetingHeader from '@/components/GreetingHeader.vue'
import AnimatedCounter from '@/components/AnimatedCounter.vue'
import AnomalyAlert from '@/components/AnomalyAlert.vue'
import ChartCard from '@/components/ChartCard.vue'

interface AlertItem { text: string; count: number; level: 'critical' | 'warning' | 'info' }
interface CardItem { label: string; value: number; icon: any; highlight?: boolean }
interface ChartItem { title: string; option: any }

const username = ref('商品审核员')
const router = useRouter()

const cardRoutes: Record<string, string> = {
  "待审核商品": "/products",
  "商品总数":   "/products",
  "在售商品数": "/products",
  "总SKU数":   "/products",
  "总订单数":   "/orders",
  "待发货订单": "/orders",
  "缺货商品":   "/products",
  "退货率":     "/orders/refund",
}
function onCardClick(card: CardItem) {
  const path = cardRoutes[card.label]
  if (path) router.push(path)
}

const alerts = ref<AlertItem[]>([])
const cards = ref<CardItem[]>([])
const charts = ref<ChartItem[]>([])

onMounted(async () => {
  try {
    const [statsRes] = await Promise.all([
      api.get('/dashboard/stats'),
    ])
    const st = statsRes.data ?? {}

    // 告警
    const aList: AlertItem[] = []
    if ((st.outOfStockCount ?? 0) > 0) aList.push({ text: '缺货商品', count: st.outOfStockCount, level: 'critical' })
    if ((st.pendingProductReviews ?? 0) > 0) aList.push({ text: '待审核商品', count: st.pendingProductReviews, level: 'warning' })
    alerts.value = aList

    // 统计卡片
    const returnRate = st.returnRate ?? 0
    cards.value = [
      { label: '待审核商品', value: st.pendingProductReviews ?? 0, icon: Goods, highlight: (st.pendingProductReviews ?? 0) > 0 },
      { label: '商品总数', value: st.productCount ?? 0, icon: Box },
      { label: '在售商品数', value: st.activeProductCount ?? 0, icon: ShoppingCart },
      { label: '总SKU数', value: st.totalSkuCount ?? 0, icon: Tickets },
      { label: '总订单数', value: st.orderCount ?? 0, icon: List },
      { label: '待发货订单', value: st.pendingShipOrders ?? 0, icon: Van },
      { label: '缺货商品', value: st.outOfStockCount ?? 0, icon: WarningFilled, highlight: (st.outOfStockCount ?? 0) > 0 },
      { label: '退货率', value: returnRate, icon: DataLine },
    ]

    // 柱状图 — 订单状态分布（静态配置兜底）
    const orderStats = st.orderStatusDistribution ?? [
      { name: '待付款', count: 120 },
      { name: '已付款', count: 85 },
      { name: '已发货', count: 200 },
      { name: '已完成', count: 450 },
      { name: '已退款', count: 18 },
    ]
    charts.value = [{
      title: '订单状态分布',
      option: {
        grid: { top: 30, right: 20, bottom: 30, left: 50 },
        xAxis: {
          type: 'category',
          data: orderStats.map((d: any) => d.name),
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
          type: 'bar', barWidth: 32, borderRadius: [6, 6, 0, 0],
          data: orderStats.map((d: any, i: number) => ({
            value: d.count,
            itemStyle: {
              color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#A8E6CF'][i % 5],
            },
          })),
          itemStyle: { borderRadius: [6, 6, 0, 0] },
        }],
        tooltip: {
          trigger: 'axis', backgroundColor: '#fff',
          borderColor: '#F0F0F0', borderWidth: 1,
          textStyle: { color: '#1A1A1A', fontSize: 13 },
          formatter: (params: any) => {
            const p = params[0]
            return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                    <div>订单数：<span style="color:#FF6B6B;font-weight:600">${p.value}</span></div>`
          },
        },
      },
    }]
  } catch (e) {
    console.error('商品审核仪表盘数据加载失败', e)
  }
})
</script>

<template>
  <div class="dashboard">
    <GreetingHeader :username="username" />
    <div
      v-if="alerts.length"
      class="alerts-row"
    >
      <AnomalyAlert
        v-for="a in alerts"
        :key="a.text"
        v-bind="a"
      />
    </div>
    <el-row
      :gutter="20"
      class="stats-row"
    >
      <el-col
        v-for="card in cards"
        :key="card.label"
        :xs="24"
        :sm="12"
        :md="6"
      >
        <div
          class="stat-card"
          @click="onCardClick(card)"
        >
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon">
              <el-icon :size="18">
                <component :is="card.icon" />
              </el-icon>
            </div>
          </div>
          <div class="stat-card__value">
            <AnimatedCounter
              :value="card.value"
              :highlight="card.highlight"
            />
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row
      :gutter="20"
      class="charts-row"
    >
      <el-col
        v-for="ch in charts"
        :key="ch.title"
        :xs="24"
        :md="24"
      >
        <ChartCard
          :title="ch.title"
          :option="ch.option"
          :height="320"
        />
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
  cursor: pointer; margin-bottom: 20px;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: var(--color-text-secondary); }
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
