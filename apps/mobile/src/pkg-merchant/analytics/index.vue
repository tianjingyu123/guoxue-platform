<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">数据分析</text>
        <view class="nav-back" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- Loading -->
      <view v-if="loading" class="state">
        <text class="state-txt">加载中…</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="48" color="#dc2626" />
        <text class="state-title">加载失败</text>
        <text class="state-txt">{{ error }}</text>
        <view class="retry" @tap="load"><text>重试</text></view>
      </view>

      <template v-else>
        <!-- 关键指标 -->
        <view class="section">
          <text class="section-title">经营概览</text>
          <view class="metric-grid">
            <view v-for="(m, i) in metrics" :key="i" class="card metric-card">
              <text class="metric-title">{{ m.title }}</text>
              <view class="metric-value-row">
                <text class="metric-value">{{ m.value }}</text>
                <text class="metric-unit">{{ m.unit }}</text>
              </view>
              <text class="metric-desc">{{ m.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 深度分析占位 -->
        <view class="section">
          <view class="card placeholder-card">
            <app-icon name="bar-chart-2" :size="28" color="#c9a96e" />
            <text class="ph-title">更多深度分析即将开放</text>
            <text class="ph-desc">销售趋势、分类销售占比、热销商品排行、客户留存等多维分析正在建设中。</text>
          </view>
        </view>
        <view style="height: 24px" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  merchantBackendApi,
  type MerchantDashboard,
  type RevenueOverview,
  type MerchantContentStats,
} from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const loading = ref(true)
const error = ref('')

const dashboard = ref<MerchantDashboard>({ todayOrders: 0, todaySales: 0, totalProducts: 0, pendingReviews: 0, totalSales: 0, totalOrders: 0, rating: 0 })
const revenue = ref<RevenueOverview>({ totalSales: 0, totalOrders: 0, merchantShare: 0, platformShare: 0, commissionRate: 0 })
const content = ref<MerchantContentStats>({ totalProducts: 0, publishedProducts: 0, draftProducts: 0, publishedArticles: 0, totalViews: 0, totalLikes: 0 })

function money(v: number | string | null | undefined) {
  return (Number(v) || 0).toFixed(2)
}
function n(v: number | string | null | undefined) {
  return String(Number(v) || 0)
}

// 聚合 dashboard + revenue + content-stats 的真实指标，无趋势/排行等后端不存在的数据
const metrics = computed(() => {
  const r = revenue.value
  const d = dashboard.value
  const c = content.value
  return [
    { title: '累计销售额', value: money(r.totalSales), unit: '元', desc: '店铺历史累计成交' },
    { title: '累计订单', value: n(r.totalOrders ?? d.totalOrders), unit: '单', desc: '历史累计订单数' },
    { title: '商家分成', value: money(r.merchantShare), unit: '元', desc: '扣除平台抽成后所得' },
    { title: '今日订单', value: n(d.todayOrders), unit: '单', desc: '今日新增订单' },
    { title: '今日销售', value: money(d.todaySales), unit: '元', desc: '今日成交金额' },
    { title: '店铺评分', value: (Number(d.rating) || 0).toFixed(1), unit: '分', desc: '买家综合评分' },
    { title: '商品总数', value: n(c.totalProducts), unit: '件', desc: '在库商品总数' },
    { title: '在售商品', value: n(c.publishedProducts), unit: '件', desc: '当前上架销售中' },
    { title: '草稿商品', value: n(c.draftProducts), unit: '件', desc: '未发布草稿' },
    { title: '待回复评价', value: n(d.pendingReviews), unit: '条', desc: '尚未回复的评价' },
    { title: '发布文章', value: n(c.publishedArticles), unit: '篇', desc: '已发布内容文章' },
    { title: '内容浏览', value: n(c.totalViews), unit: '次', desc: '内容累计浏览量' },
  ]
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, r, c] = await Promise.all([
      merchantBackendApi.getDashboard(),
      merchantBackendApi.getRevenue(),
      merchantBackendApi.getContentStats(),
    ])
    dashboard.value = d
    revenue.value = r
    content.value = c
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  navHeight.value = (sys.statusBarHeight || 0) + 44
  load()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 40px; }

.section { padding: 16px 16px 0; }
.section-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.card { background: #ffffff; border-radius: 12px; padding: 16px; }

.metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.metric-card { padding: 12px; }
.metric-title { font-size: 12px; color: #9ca3af; }
.metric-value-row { display: flex; align-items: baseline; gap: 2px; margin: 4px 0 8px; }
.metric-value { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.metric-unit { font-size: 12px; color: #9ca3af; }
.metric-desc { font-size: 12px; color: #9ca3af; }

.placeholder-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; }
.ph-title { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.ph-desc { font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5; }

/* 三态 */
.state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; gap: 12px; }
.state-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.state-txt { font-size: 14px; color: #9ca3af; text-align: center; }
.retry { margin-top: 8px; padding: 10px 32px; border: 1px solid var(--brand); border-radius: 8px; }
.retry text { font-size: 14px; color: var(--brand); }
</style>
