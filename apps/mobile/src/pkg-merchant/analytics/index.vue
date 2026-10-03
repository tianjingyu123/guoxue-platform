<template>
  <view class="an-page">
    <view class="an-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="an-nav__inner">
        <view class="an-nav__btn" role="button" aria-label="返回" @tap="goBack">
          <AppIcon name="arrow-left" :size="22" color="#18324a" />
        </view>
        <view class="an-nav__title">
          <text>经营分析</text>
          <text class="an-nav__sub">用真实数据决定下一步</text>
        </view>
        <view class="an-nav__btn" role="button" aria-label="刷新数据" @tap="load">
          <AppIcon name="refresh-cw" :size="19" color="#18324a" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="an-scroll" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="an-state">
        <view class="an-loader" />
        <text>正在汇总经营数据…</text>
      </view>

      <view v-else-if="error" class="an-state">
        <AppIcon name="alert-circle" :size="44" color="#c72e4b" />
        <text class="an-state__title">经营数据暂时没有加载出来</text>
        <text class="an-state__desc">{{ error }}</text>
        <view class="an-retry" role="button" @tap="load">重新加载</view>
      </view>

      <view v-else class="an-shell">
        <view class="an-hero">
          <view class="an-hero__top">
            <view>
              <text class="an-eyebrow">BUSINESS COMPASS</text>
              <text class="an-hero__title">经营罗盘</text>
              <text class="an-hero__desc">成交、履约、内容和口碑放在一张图里看。</text>
            </view>
            <view class="an-period" role="tablist" aria-label="分析时间范围">
              <view
                v-for="option in periodOptions"
                :key="option.value"
                class="an-period__item"
                :class="{ active: days === option.value }"
                role="tab"
                :aria-selected="days === option.value"
                @tap="setPeriod(option.value)"
              >
                {{ option.label }}
              </view>
            </view>
          </view>
          <view class="an-hero__amount">
            <text class="an-hero__amount-label">{{ days }} 日有效成交</text>
            <text class="an-hero__amount-value">¥{{ money(periodSales) }}</text>
            <text class="an-hero__amount-note">
              {{ periodOrders }} 笔 · 客单价 ¥{{ money(avgOrderValue) }}
            </text>
          </view>
          <view class="an-hero__pulse">
            <view class="an-pulse-dot" />
            <text>{{ insightHeadline }}</text>
          </view>
        </view>

        <view class="an-kpis" aria-label="关键经营指标">
          <view class="an-kpi" role="link" @tap="go('/merchant/orders')">
            <text class="an-kpi__label">累计有效成交</text>
            <text class="an-kpi__value">¥{{ shortMoney(revenue.totalSales) }}</text>
            <text class="an-kpi__hint">{{ n(revenue.totalOrders || dashboard.totalOrders) }} 笔订单 ›</text>
          </view>
          <view class="an-kpi" role="link" @tap="go('/merchant/revenue')">
            <text class="an-kpi__label">累计应得分成</text>
            <text class="an-kpi__value">¥{{ shortMoney(revenue.merchantShare) }}</text>
            <text class="an-kpi__hint">去核对结算 ›</text>
          </view>
          <view class="an-kpi" role="link" @tap="go('/merchant/reviews')">
            <text class="an-kpi__label">店铺口碑</text>
            <text class="an-kpi__value">{{ ratingText }}</text>
            <text class="an-kpi__hint">{{ dashboard.pendingReviews || 0 }} 条待回复 ›</text>
          </view>
          <view class="an-kpi" role="link" @tap="go('/merchant/products')">
            <text class="an-kpi__label">在售商品</text>
            <text class="an-kpi__value">{{ n(content.publishedProducts) }}</text>
            <text class="an-kpi__hint">{{ n(content.draftProducts) }} 个草稿 ›</text>
          </view>
        </view>

        <view class="an-grid">
          <view class="an-card an-trend">
            <view class="an-card__head">
              <view>
                <text class="an-card__eyebrow">SALES TREND</text>
                <text class="an-card__title">近 7 日成交走势</text>
              </view>
              <text class="an-card__meta">最近 {{ orderSampleSize }} 笔订单样本</text>
            </view>
            <view class="an-bars" aria-label="近七日每日成交金额">
              <view v-for="item in dailyTrend" :key="item.key" class="an-bar">
                <text class="an-bar__value">{{ item.amount ? shortMoney(item.amount) : '—' }}</text>
                <view class="an-bar__track">
                  <view class="an-bar__fill" :style="{ height: `${item.percent}%` }" />
                </view>
                <text class="an-bar__label">{{ item.label }}</text>
              </view>
            </view>
            <view v-if="orderSampleLimited" class="an-sample-note">
              <AppIcon name="info" :size="14" color="#8a6b2c" />
              <text>趋势基于最近 100 笔订单，完整汇总金额以上方指标为准。</text>
            </view>
          </view>

          <view class="an-card an-structure">
            <view class="an-card__head">
              <view>
                <text class="an-card__eyebrow">ORDER HEALTH</text>
                <text class="an-card__title">订单履约结构</text>
              </view>
              <view class="an-card__link" role="link" @tap="go('/merchant/orders')">查看订单 ›</view>
            </view>
            <view class="an-status-list">
              <view v-for="item in orderStructure" :key="item.key" class="an-status">
                <view class="an-status__line">
                  <view class="an-status__name">
                    <view class="an-status__dot" :style="{ background: item.color }" />
                    <text>{{ item.label }}</text>
                  </view>
                  <text class="an-status__count">{{ item.count }} 笔</text>
                </view>
                <view class="an-status__track">
                  <view class="an-status__fill" :style="{ width: `${item.percent}%`, background: item.color }" />
                </view>
              </view>
            </view>
          </view>

          <view class="an-card an-assets">
            <view class="an-card__head">
              <view>
                <text class="an-card__eyebrow">CONTENT ASSETS</text>
                <text class="an-card__title">内容与商品资产</text>
              </view>
              <view class="an-card__link" role="link" @tap="go('/merchant/content-stats')">内容数据 ›</view>
            </view>
            <view class="an-assets__grid">
              <view>
                <text>{{ n(content.totalProducts) }}</text>
                <text>商品总数</text>
              </view>
              <view>
                <text>{{ n(content.publishedArticles) }}</text>
                <text>已发文章</text>
              </view>
              <view>
                <text>{{ compact(content.totalViews) }}</text>
                <text>内容浏览</text>
              </view>
              <view>
                <text>{{ compact(content.totalLikes) }}</text>
                <text>内容互动</text>
              </view>
            </view>
            <view class="an-assets__message">{{ contentSuggestion }}</view>
          </view>

          <view class="an-card an-actions">
            <view class="an-card__head">
              <view>
                <text class="an-card__eyebrow">NEXT BEST ACTION</text>
                <text class="an-card__title">今天优先做什么</text>
              </view>
            </view>
            <view
              v-for="(item, index) in actionList"
              :key="item.title"
              class="an-action"
              role="link"
              @tap="go(item.path)"
            >
              <view class="an-action__index">0{{ index + 1 }}</view>
              <view class="an-action__body">
                <text class="an-action__title">{{ item.title }}</text>
                <text class="an-action__desc">{{ item.desc }}</text>
              </view>
              <text class="an-action__arrow">›</text>
            </view>
          </view>
        </view>

        <view class="an-footnote">
          <AppIcon name="shield-check" :size="15" color="#8f7748" />
          <text>经营分析仅使用店铺真实业务数据；没有足够样本时不伪造增长率和趋势。</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  type MerchantContentStats,
  type MerchantDashboard,
  type MerchantOrder,
  type MerchantOrderStatus,
  type RevenueOverview,
} from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const loading = ref(true)
const error = ref('')
const days = ref<7 | 30>(7)
const periodOptions = [{ label: '近 7 日', value: 7 as const }, { label: '近 30 日', value: 30 as const }]
const isVisualPreview = import.meta.env.DEV
  && typeof globalThis.location !== 'undefined'
  && new URLSearchParams(globalThis.location.search).has('__preview')

const dashboard = ref<MerchantDashboard>({
  todayOrders: 0, todaySales: 0, totalProducts: 0, pendingReviews: 0,
  totalSales: 0, totalOrders: 0, rating: 0,
})
const revenue = ref<RevenueOverview>({
  totalSales: 0, totalOrders: 0, merchantShare: 0, platformShare: 0, commissionRate: 0,
})
const content = ref<MerchantContentStats>({
  totalProducts: 0, publishedProducts: 0, draftProducts: 0,
  publishedArticles: 0, totalViews: 0, totalLikes: 0,
})
const orders = ref<MerchantOrder[]>([])
const orderTotal = ref(0)

const startDate = computed(() => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days.value + 1)
  return date.toISOString()
})
const validOrders = computed(() => orders.value.filter((item) =>
  ['PAID', 'SHIPPED', 'COMPLETED'].includes(item.status),
))
const periodOrders = computed(() => validOrders.value.length)
const periodSales = computed(() => validOrders.value.reduce((sum, item) =>
  sum + Number(item.payAmount ?? item.amount ?? 0), 0,
))
const avgOrderValue = computed(() => periodOrders.value ? periodSales.value / periodOrders.value : 0)
const orderSampleSize = computed(() => orders.value.length)
const orderSampleLimited = computed(() => orderTotal.value > orders.value.length)
const ratingText = computed(() => (Number(dashboard.value.rating) || 0).toFixed(1))

const dailyTrend = computed(() => {
  const result: Array<{ key: string; label: string; amount: number; percent: number }> = []
  const amountByDay = new Map<string, number>()
  validOrders.value.forEach((item) => {
    const key = String(item.paidAt || item.createdAt).slice(0, 10)
    amountByDay.set(key, (amountByDay.get(key) || 0) + Number(item.payAmount ?? item.amount ?? 0))
  })
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = localDateKey(date)
    result.push({
      key,
      label: offset === 0 ? '今天' : `${date.getMonth() + 1}/${date.getDate()}`,
      amount: amountByDay.get(key) || 0,
      percent: 0,
    })
  }
  const max = Math.max(...result.map((item) => item.amount), 1)
  return result.map((item) => ({
    ...item,
    percent: item.amount ? Math.max(8, Math.round((item.amount / max) * 100)) : 3,
  }))
})

const statusMeta: Array<{ key: MerchantOrderStatus; label: string; color: string }> = [
  { key: 'PAID', label: '待发货', color: '#d9a441' },
  { key: 'SHIPPED', label: '运输中', color: '#3c7c9e' },
  { key: 'COMPLETED', label: '已完成', color: '#27866d' },
  { key: 'REFUNDED', label: '已退款', color: '#b44d5f' },
  { key: 'CANCELLED', label: '已取消', color: '#9a9ba3' },
]
const orderStructure = computed(() => {
  const total = Math.max(orders.value.length, 1)
  return statusMeta.map((meta) => {
    const count = orders.value.filter((item) => item.status === meta.key).length
    return { ...meta, count, percent: count ? Math.max(3, Math.round((count / total) * 100)) : 0 }
  })
})

const insightHeadline = computed(() => {
  if (!periodOrders.value) return '当前时间段暂无有效成交，先从商品内容和曝光入口开始检查。'
  if (orders.value.filter((item) => item.status === 'PAID').length > 0) return '存在待发货订单，优先保障履约时效。'
  if (dashboard.value.pendingReviews > 0) return '有评价等待回复，及时回应能沉淀店铺口碑。'
  return '当前履约状态平稳，可以继续优化内容曝光和复购承接。'
})
const contentSuggestion = computed(() => {
  if (!content.value.publishedProducts) return '先完善并上架核心商品，再用文章、短视频或直播解释真实使用场景。'
  if (content.value.draftProducts > content.value.publishedProducts) return '草稿多于在售商品，建议优先补齐素材与卖点后分批上架。'
  if (!content.value.publishedArticles) return '商品已经就绪，可以补充专业文章，让用户先理解价值再自然转化。'
  return '内容与商品已经形成基础组合，下一步关注高浏览、低成交内容的承接路径。'
})
const actionList = computed(() => {
  const list: Array<{ title: string; desc: string; path: string }> = []
  const pendingShip = orders.value.filter((item) => item.status === 'PAID').length
  if (pendingShip) list.push({ title: `处理 ${pendingShip} 笔待发货订单`, desc: '先守住履约体验，再谈增长。', path: '/merchant/batch-ship' })
  if (dashboard.value.pendingReviews) list.push({
    title: `回复 ${dashboard.value.pendingReviews} 条买家评价`,
    desc: '具体回应比统一话术更能建立信任。',
    path: '/merchant/reviews',
  })
  if (content.value.draftProducts) list.push({
    title: `整理 ${content.value.draftProducts} 个商品草稿`,
    desc: '补齐主图、简介、规格和库存后再发布。',
    path: '/merchant/products',
  })
  if (list.length < 3) list.push({
    title: '核对本期结算账单',
    desc: '确认成交、服务费和实际到账金额一致。',
    path: '/merchant/revenue',
  })
  if (list.length < 3) list.push({
    title: '检查库存预警与采购计划',
    desc: '避免活动或内容曝光后出现缺货。',
    path: '/merchant/inventory',
  })
  return list.slice(0, 3)
})

function localDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function previewOrders(): MerchantOrder[] {
  const samples = [
    { offset: 0, amount: 1280, status: 'PAID' },
    { offset: 0, amount: 699, status: 'COMPLETED' },
    { offset: 1, amount: 2280, status: 'SHIPPED' },
    { offset: 1, amount: 399, status: 'COMPLETED' },
    { offset: 2, amount: 1599, status: 'COMPLETED' },
    { offset: 3, amount: 899, status: 'REFUNDED' },
    { offset: 3, amount: 1380, status: 'COMPLETED' },
    { offset: 4, amount: 758, status: 'SHIPPED' },
    { offset: 5, amount: 1899, status: 'COMPLETED' },
    { offset: 6, amount: 998, status: 'CANCELLED' },
    { offset: 6, amount: 2180, status: 'COMPLETED' },
  ] as const
  return samples.map((sample, index) => {
    const date = new Date()
    date.setDate(date.getDate() - sample.offset)
    const createdAt = date.toISOString()
    return {
      id: `QA-ORDER-${index + 1}`,
      userId: `QA-USER-${index + 1}`,
      type: 'PRODUCT',
      targetId: `QA-PRODUCT-${index + 1}`,
      amount: sample.amount,
      payAmount: sample.amount,
      status: sample.status,
      createdAt,
      paidAt: createdAt,
    }
  })
}
function money(value: number | string | null | undefined) {
  return (Number(value) || 0).toFixed(2)
}
function shortMoney(value: number | string | null | undefined) {
  const amount = Number(value) || 0
  if (amount >= 10000) return `${Number((amount / 10000).toFixed(2))}万`
  return Number(amount.toFixed(2)).toLocaleString()
}
function compact(value: number | string | null | undefined) {
  const amount = Number(value) || 0
  if (amount >= 10000) return `${Number((amount / 10000).toFixed(1))}万`
  return String(amount)
}
function n(value: number | string | null | undefined) {
  return String(Number(value) || 0)
}
function go(path: string) {
  navigateTo(path)
}
function setPeriod(value: 7 | 30) {
  if (days.value === value) return
  days.value = value
  loadOrders()
}
async function loadOrders() {
  if (isVisualPreview) {
    orders.value = previewOrders()
    orderTotal.value = 146
    return
  }
  const result = await merchantBackendApi.getOrders({
    startDate: startDate.value,
    page: 1,
    pageSize: 100,
  })
  orders.value = result.items
  orderTotal.value = result.total
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    if (isVisualPreview) {
      dashboard.value = {
        todayOrders: 12,
        todaySales: 8640.8,
        totalProducts: 18,
        pendingReviews: 3,
        totalSales: 286430.8,
        totalOrders: 742,
        rating: 4.9,
      }
      revenue.value = {
        totalSales: 286430.8,
        totalOrders: 742,
        merchantShare: 243466.18,
        platformShare: 42964.62,
        commissionRate: 0.85,
        merchantShareRate: 0.85,
        pendingSettlement: 18420.6,
        settledAmount: 225045.58,
      }
      content.value = {
        totalProducts: 18,
        publishedProducts: 12,
        draftProducts: 6,
        publishedArticles: 9,
        totalViews: 48260,
        totalLikes: 3268,
      }
      await loadOrders()
      return
    }
    const [dashboardData, revenueData, contentData] = await Promise.all([
      merchantBackendApi.getDashboard(),
      merchantBackendApi.getRevenue(),
      merchantBackendApi.getContentStats(),
    ])
    dashboard.value = dashboardData
    revenue.value = revenueData
    content.value = contentData
    await loadOrders()
  } catch (cause) {
    error.value = (cause as Error)?.message || '请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  navHeight.value = statusBarHeight.value + 54
  load()
})
</script>

<style scoped>
.an-page{min-height:100vh;background:#f3f5f7;color:#18324a}
.an-nav{position:fixed;inset:0 0 auto;z-index:50;background:rgba(250,251,252,.94);border-bottom:1px solid rgba(24,50,74,.08);backdrop-filter:blur(18px)}
.an-nav__inner{height:54px;display:flex;align-items:center;padding:0 10px}
.an-nav__btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:14px}
.an-nav__title{flex:1;display:flex;flex-direction:column;align-items:center;font-size:17px;font-weight:750;letter-spacing:.02em}
.an-nav__sub{font-size:9px;font-weight:500;color:#8b98a4;margin-top:2px;letter-spacing:.08em}
.an-scroll{height:100vh;box-sizing:border-box}
.an-shell{width:min(100%,980px);margin:0 auto;padding:14px 14px calc(30px + env(safe-area-inset-bottom));box-sizing:border-box}
.an-hero{position:relative;overflow:hidden;padding:22px;border-radius:24px;color:#fff;background:linear-gradient(135deg,#102e47 0%,#174e68 54%,#7d704f 130%);box-shadow:0 14px 34px rgba(16,46,71,.18)}
.an-hero:before{content:"";position:absolute;width:220px;height:220px;right:-75px;top:-95px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 38px rgba(255,255,255,.035),0 0 0 76px rgba(255,255,255,.025)}
.an-hero__top{position:relative;z-index:1;display:flex;justify-content:space-between;gap:14px}
.an-eyebrow,.an-card__eyebrow{display:block;font-size:9px;font-weight:800;letter-spacing:.16em;color:#d9be77}
.an-hero__title{display:block;font-family:STSong,"Songti SC",serif;font-size:26px;font-weight:800;margin-top:6px}
.an-hero__desc{display:block;max-width:220px;font-size:12px;line-height:1.55;color:rgba(255,255,255,.72);margin-top:5px}
.an-period{display:flex;align-self:flex-start;padding:3px;border-radius:12px;background:rgba(255,255,255,.11)}
.an-period__item{padding:7px 10px;border-radius:9px;font-size:11px;color:rgba(255,255,255,.7);white-space:nowrap}
.an-period__item.active{background:#fff;color:#173b52;font-weight:700}
.an-hero__amount{position:relative;z-index:1;display:flex;flex-direction:column;margin-top:24px}
.an-hero__amount-label{font-size:11px;color:rgba(255,255,255,.64)}
.an-hero__amount-value{font-family:Georgia,"Times New Roman",serif;font-size:35px;font-weight:700;color:#f5dfa3;margin:4px 0}
.an-hero__amount-note{font-size:11px;color:rgba(255,255,255,.66)}
.an-hero__pulse{position:relative;z-index:1;display:flex;align-items:center;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);font-size:11px;line-height:1.5;color:rgba(255,255,255,.82)}
.an-pulse-dot{width:7px;height:7px;border-radius:50%;background:#e8c973;box-shadow:0 0 0 6px rgba(232,201,115,.13);animation:an-pulse 2.4s ease-in-out infinite}
.an-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.an-kpi{position:relative;overflow:hidden;padding:15px;background:#fff;border:1px solid rgba(24,50,74,.07);border-radius:17px;box-shadow:0 7px 18px rgba(24,50,74,.05)}
.an-kpi:after{content:"";position:absolute;width:58px;height:58px;border-radius:50%;right:-26px;top:-27px;background:#edf3f6}
.an-kpi__label,.an-kpi__hint{display:block;font-size:10px;color:#88959f}
.an-kpi__value{display:block;font-family:Georgia,"Times New Roman",serif;font-size:clamp(17px,4.4vw,22px);font-weight:700;color:#173b52;margin:6px 0;white-space:nowrap}
.an-kpi__hint{color:#9a7840}
.an-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}
.an-card{padding:18px;background:#fff;border:1px solid rgba(24,50,74,.07);border-radius:20px;box-shadow:0 8px 24px rgba(24,50,74,.05)}
.an-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.an-card__title{display:block;font-family:STSong,"Songti SC",serif;font-size:18px;font-weight:800;color:#18324a;margin-top:4px}
.an-card__meta,.an-card__link{font-size:10px;color:#8d99a3}
.an-card__link{color:#a07532;padding:5px 0}
.an-bars{height:174px;display:flex;align-items:flex-end;gap:7px;margin-top:18px}
.an-bar{flex:1;height:100%;min-width:0;display:flex;flex-direction:column;align-items:center}
.an-bar__value{height:16px;max-width:100%;font-size:8px;color:#8f9ba4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.an-bar__track{position:relative;flex:1;width:100%;max-width:28px;border-radius:9px 9px 3px 3px;background:#eef2f4;overflow:hidden}
.an-bar__fill{position:absolute;left:0;right:0;bottom:0;border-radius:9px 9px 3px 3px;background:linear-gradient(180deg,#e6c56d,#2b718a);transition:height .45s ease}
.an-bar__label{font-size:9px;color:#8e99a3;margin-top:7px;white-space:nowrap}
.an-sample-note{display:flex;align-items:flex-start;gap:6px;margin-top:13px;padding:9px 10px;border-radius:10px;background:#fbf7ea;font-size:10px;line-height:1.45;color:#7d6b49}
.an-status-list{display:flex;flex-direction:column;gap:14px;margin-top:18px}
.an-status__line{display:flex;align-items:center;justify-content:space-between;font-size:12px}
.an-status__name{display:flex;align-items:center;gap:8px;color:#3e5364}
.an-status__dot{width:7px;height:7px;border-radius:50%}
.an-status__count{font-family:Georgia,serif;font-weight:700;color:#18324a}
.an-status__track{height:5px;margin-top:7px;border-radius:10px;background:#eef1f3;overflow:hidden}
.an-status__fill{height:100%;border-radius:10px;transition:width .45s ease}
.an-assets__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}
.an-assets__grid view{display:flex;flex-direction:column;align-items:center;padding:13px 4px;border-radius:13px;background:#f5f7f8}
.an-assets__grid text:first-child{font-family:Georgia,serif;font-size:18px;font-weight:700;color:#173b52}
.an-assets__grid text:last-child{font-size:9px;color:#89959e;margin-top:5px}
.an-assets__message{margin-top:13px;padding:12px;border-left:3px solid #d6b663;border-radius:3px 11px 11px 3px;background:#fbf8ef;font-size:11px;line-height:1.65;color:#655d4f}
.an-action{display:flex;align-items:center;gap:11px;padding:14px 0;border-bottom:1px solid #edf0f2}
.an-action:last-child{padding-bottom:0;border-bottom:0}
.an-action__index{font-family:Georgia,serif;font-size:11px;color:#b28a3f}
.an-action__body{flex:1;min-width:0;display:flex;flex-direction:column}
.an-action__title{font-size:13px;font-weight:700;color:#243e51}
.an-action__desc{font-size:10px;line-height:1.5;color:#8d98a1;margin-top:3px}
.an-action__arrow{font-size:24px;color:#b9c0c5}
.an-footnote{display:flex;align-items:flex-start;justify-content:center;gap:6px;padding:16px 8px 0;font-size:9px;line-height:1.55;color:#91999e}
.an-state{height:66vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;color:#8b97a0;font-size:13px}
.an-loader{width:28px;height:28px;border:2px solid #dfe6ea;border-top-color:#1c607b;border-radius:50%;animation:an-spin .8s linear infinite}
.an-state__title{font-size:15px;font-weight:700;color:#294457}
.an-state__desc{max-width:280px;text-align:center;font-size:11px;line-height:1.6}
.an-retry{padding:10px 22px;border-radius:12px;color:#fff;background:#1b5872}
@media (min-width:700px){
  .an-shell{padding:22px}
  .an-hero{padding:28px}
  .an-grid{grid-template-columns:1.35fr 1fr}
  .an-assets,.an-actions{min-height:245px}
}
@media (prefers-reduced-motion:reduce){
  .an-pulse-dot,.an-loader{animation:none}
  .an-bar__fill,.an-status__fill{transition:none}
}
@keyframes an-pulse{0%,100%{opacity:.55;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
@keyframes an-spin{to{transform:rotate(360deg)}}
</style>
