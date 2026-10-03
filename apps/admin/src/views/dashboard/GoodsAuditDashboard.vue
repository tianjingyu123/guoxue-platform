<script setup lang="ts">
import { ref, shallowRef, onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import {
  Goods, ShoppingCart, Box, Tickets, List, Van, WarningFilled, DataLine,
  Star, Discount,
} from '@element-plus/icons-vue'
import GreetingHeader from '@/components/GreetingHeader.vue'
import AnimatedCounter from '@/components/AnimatedCounter.vue'
import AnomalyAlert from '@/components/AnomalyAlert.vue'
import ChartCard from '@/components/ChartCard.vue'
import { firstChartTooltipDatum, type ChartOption } from '@/utils/chart'

interface AlertItem { text: string; count: number; level: 'critical' | 'warning' | 'info' }
interface CardItem { label: string; value: number; icon: Component; highlight?: boolean; suffix?: string; route?: string }
// option 为 echarts 配置对象，结构复杂，保留 any（框架类型）
interface ChartItem { title: string; option: ChartOption }
interface QuickAction { label: string; path: string; icon: Component; badge?: number }
/** 订单状态分布项 */
interface OrderStat { name: string; count: number }

const username = ref('商品审核员')
const router = useRouter()

// 角色专属快捷操作（仅指向 GOODS_AUDITOR 有权访问的管理页）
const quickActions = shallowRef<QuickAction[]>([])

function onCardClick(card: CardItem) {
  if (card.route) router.push(card.route)
}

const alerts = ref<AlertItem[]>([])
const cards = shallowRef<CardItem[]>([])
const charts = ref<ChartItem[]>([])
const loading = ref(true)
const loadError = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [statsRes] = await Promise.all([
      api.get('/dashboard/stats'),
    ])
    const st = statsRes.data ?? {}

    const pendingProductReviews = st.pendingProductReviews ?? 0
    const outOfStockCount = st.outOfStockCount ?? 0

    // 告警
    const aList: AlertItem[] = []
    if (outOfStockCount > 0) aList.push({ text: '缺货商品', count: outOfStockCount, level: 'critical' })
    if (pendingProductReviews > 0) aList.push({ text: '待巡检商品', count: pendingProductReviews, level: 'warning' })
    alerts.value = aList

    // 角色专属 KPI（商品品控=待巡检/在售商品/缺货等），/dashboard/stats 无日粒度历史，诚实不展示环比
    const returnRate = st.returnRate ?? 0
    cards.value = [
      { label: '待巡检商品', value: pendingProductReviews, icon: Goods, highlight: pendingProductReviews > 0, route: '/shop/product-audit' },
      { label: '在售商品数', value: st.activeProductCount ?? 0, icon: ShoppingCart, route: '/products' },
      { label: '缺货商品', value: outOfStockCount, icon: WarningFilled, highlight: outOfStockCount > 0, route: '/products' },
      { label: '退货率', value: returnRate, icon: DataLine, suffix: '%', highlight: returnRate > 10 },
      { label: '商品总数', value: st.productCount ?? 0, icon: Box, route: '/products' },
      { label: '总SKU数', value: st.totalSkuCount ?? 0, icon: Tickets, route: '/products' },
      { label: '总订单数', value: st.orderCount ?? 0, icon: List, route: '/orders' },
      { label: '待发货订单', value: st.pendingShipOrders ?? 0, icon: Van, route: '/orders' },
    ]

    // 快捷操作 + 待办徽标
    quickActions.value = [
      { label: '商品品控', path: '/shop/product-audit', icon: Goods, badge: pendingProductReviews },
      { label: '商品管理', path: '/products', icon: Box, badge: outOfStockCount },
      { label: '评价管理', path: '/reviews', icon: Star },
      { label: '优惠券管理', path: '/coupons', icon: Discount },
      { label: '订单管理', path: '/orders', icon: List },
    ]

    // 柱状图 — 订单状态分布（真连后端，无数据则空态）
    const orderStats: OrderStat[] = Array.isArray(st.orderStatusDistribution) ? st.orderStatusDistribution : []
    charts.value = orderStats.length === 0 ? [] : [{
      title: '订单状态分布',
      option: {
        grid: { top: 30, right: 20, bottom: 30, left: 50 },
        xAxis: {
          type: 'category',
          data: orderStats.map((d) => d.name),
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
          data: orderStats.map((d, i) => ({
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
          formatter: (params: unknown) => {
            const p = firstChartTooltipDatum(params)
            return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                    <div>订单数：<span style="color:#FF6B6B;font-weight:600">${p.value}</span></div>`
          },
        },
      },
    }]
  } catch (e) {
    console.error('商品审核仪表盘数据加载失败', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    v-loading="loading"
    class="dashboard"
  >
    <GreetingHeader :username="username" />

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取仪表盘数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="load"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 角色专属快捷操作 -->
      <div class="quick-actions">
        <div class="quick-actions__title">
          快捷操作
        </div>
        <div class="quick-actions__grid">
          <div
            v-for="qa in quickActions"
            :key="qa.path"
            class="qa-card"
            @click="router.push(qa.path)"
          >
            <el-badge
              :value="qa.badge ?? 0"
              :hidden="!qa.badge"
              :max="99"
              class="qa-badge"
            >
              <div class="qa-icon">
                <el-icon :size="22">
                  <component :is="qa.icon" />
                </el-icon>
              </div>
            </el-badge>
            <span class="qa-label">{{ qa.label }}</span>
          </div>
        </div>
      </div>
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
            :class="{ 'stat-card--link': card.route }"
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
              <span
                v-if="card.suffix"
                class="stat-card__suffix"
              >{{ card.suffix }}</span>
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
        <el-col
          v-if="!loading && charts.length === 0"
          :span="24"
        >
          <el-empty description="暂无订单状态分布数据" />
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }

/* 快捷操作 */
.quick-actions {
  background: #FFFFFF; border-radius: 16px; padding: 18px 22px 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); margin-bottom: 20px;
}
.quick-actions__title { font-size: 14px; font-weight: 600; color: var(--color-text-title, #1A1A1A); margin-bottom: 14px; }
.quick-actions__grid { display: flex; flex-wrap: wrap; gap: 8px; }
.qa-card {
  flex: 1 1 92px; min-width: 92px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 14px 8px; border-radius: 12px; cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}
.qa-card:hover { background: rgba(255, 107, 107, 0.06); transform: translateY(-2px); }
.qa-badge :deep(.el-badge__content) { border: none; }
.qa-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(255, 107, 107, 0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.qa-label { font-size: 13px; color: var(--color-text-secondary); }

.alerts-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: #FFFFFF; border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 20px;
}
.stat-card--link { cursor: pointer; }
.stat-card--link:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
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
.stat-card__suffix { font-size: 16px; font-weight: 600; margin-left: 2px; color: var(--color-text-secondary); }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
