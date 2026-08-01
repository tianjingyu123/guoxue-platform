<!--
  B · 客户管理（复购沉淀）— 在本店下过单的用户聚合画像
  真连 merchantBackendApi.getCustomers（后端 listCustomers·raw SQL 脱敏·昵称/手机号搜索）
  人性化：手机号脱敏 / 金额元 / 最近下单时间人性化 / 分页加载更多 / 三态 / 空态
-->
<template>
  <view class="page">
    <!-- 顶部导航（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#ffffff" />
        </view>
        <text class="nav-title">客户管理</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }" @scrolltolower="loadMore">
      <!-- 搜索 -->
      <view class="search">
        <view class="search-box">
          <app-icon name="search" :size="16" color="#B99A6B" />
          <input
            v-model="keyword"
            class="search-input"
            type="text"
            confirm-type="search"
            placeholder="搜索昵称 / 手机号"
            placeholder-class="search-ph"
            @confirm="onSearch"
          />
          <view v-if="keyword" class="search-clear" @tap="clearSearch">
            <app-icon name="x" :size="14" color="#B99A6B" />
          </view>
        </view>
      </view>

      <!-- 汇总条 -->
      <view v-if="!loading && !error" class="sum">
        <text class="sum-txt">共 <text class="sum-n">{{ total }}</text> 位下过单的客户</text>
      </view>

      <!-- 加载态 -->
      <view v-if="loading" class="state">
        <text class="state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="48" color="#C41E3A" />
        <text class="state-title">加载失败</text>
        <text class="state-txt">{{ error }}</text>
        <view class="retry" @tap="reload"><text class="retry-txt">重试</text></view>
      </view>

      <template v-else>
        <view class="list">
          <view
            v-for="c in customers"
            :key="c.id"
            class="ccard"
            role="button"
            tabindex="0"
            :aria-label="`查看${c.nickname || '客户'}的客户档案`"
            @tap="openCustomer(c)"
            @keydown.enter="openCustomer(c)"
          >
            <image v-if="c.avatar" class="c-avatar" :src="c.avatar" mode="aspectFill" />
            <view v-else class="c-avatar c-avatar-ph"><text class="c-avatar-txt">{{ (c.nickname || '客')[0] }}</text></view>
            <view class="c-main">
              <view class="c-top">
                <text class="c-name">{{ c.nickname || '国学用户' }}</text>
                <text v-if="c.phone" class="c-phone">{{ maskPhone(c.phone) }}</text>
              </view>
              <view class="c-stats">
                <view class="c-stat">
                  <text class="c-stat-n">{{ c.orderCount }}</text>
                  <text class="c-stat-l">笔订单</text>
                </view>
                <view class="c-stat">
                  <text class="c-stat-n">¥{{ formatPrice(Number(c.totalSpent) || 0) }}</text>
                  <text class="c-stat-l">累计消费</text>
                </view>
                <view class="c-stat">
                  <text class="c-stat-n">{{ lastOrderText(c.lastOrderAt) }}</text>
                  <text class="c-stat-l">最近下单</text>
                </view>
              </view>
            </view>
            <view class="c-enter">
              <app-icon name="chevron-right" :size="18" color="#B99A6B" />
            </view>
          </view>

          <!-- 空态 -->
          <view v-if="customers.length === 0" class="empty">
            <view class="empty-ic"><app-icon name="users" :size="40" color="#C9A96E" /></view>
            <text class="empty-title">{{ keyword ? '没有匹配的客户' : '还没有成交客户' }}</text>
            <text class="empty-txt">{{ keyword ? '换个昵称或完整手机号试试。' : '买家在你店铺完成下单后，会沉淀在这里。用心经营，回头客自然来。' }}</text>
          </view>

          <!-- 加载更多 -->
          <view v-if="customers.length > 0" class="more">
            <text v-if="loadingMore" class="more-txt">加载中…</text>
            <text v-else-if="customers.length >= total" class="more-txt">已经到底啦 · 共 {{ total }} 位</text>
            <text v-else class="more-txt" @tap="loadMore">点击加载更多</text>
          </view>
        </view>
      </template>
    </scroll-view>

    <!-- 客户详情：保留列表上下文，便于连续经营多个客户 -->
    <view v-if="detailOpen" class="detail-mask" @tap="closeDetail">
      <view class="detail-sheet" role="dialog" aria-label="客户详情" @tap.stop>
        <view class="detail-grip" />
        <view class="detail-head">
          <image v-if="detail?.avatar" class="detail-avatar" :src="detail.avatar" mode="aspectFill" />
          <view v-else class="detail-avatar detail-avatar-ph">
            <text>{{ (detail?.nickname || selectedCustomer?.nickname || '客')[0] }}</text>
          </view>
          <view class="detail-person">
            <text class="detail-kicker">客户档案</text>
            <text class="detail-name">{{ detail?.nickname || selectedCustomer?.nickname || '国学用户' }}</text>
            <text class="detail-phone">{{ detail?.phone || selectedCustomer?.phone || '未绑定手机号' }}</text>
          </view>
          <view class="detail-close" role="button" aria-label="关闭客户详情" @tap="closeDetail">
            <app-icon name="x" :size="20" color="#6F6154" />
          </view>
        </view>

        <view v-if="detailLoading" class="detail-state">
          <text>正在整理交易档案…</text>
        </view>
        <view v-else-if="detailError" class="detail-state detail-state-error">
          <text>{{ detailError }}</text>
          <view class="detail-retry" @tap="selectedCustomer && openCustomer(selectedCustomer, true)">重新加载</view>
        </view>
        <template v-else-if="detail">
          <view class="detail-hero">
            <view class="detail-hero-copy">
              <text class="detail-hero-label">累计有效消费</text>
              <text class="detail-hero-value">¥{{ formatPrice(Number(detail.totalSpent) || 0) }}</text>
              <text class="detail-hero-tip">{{ customerGrade(detail) }}</text>
            </view>
            <view class="detail-seal">
              <text>{{ detail.orderCount >= 3 ? '复' : '新' }}</text>
            </view>
          </view>

          <view class="detail-kpis">
            <view class="detail-kpi">
              <text class="detail-kpi-value">{{ detail.orderCount }}</text>
              <text class="detail-kpi-label">有效订单</text>
            </view>
            <view class="detail-kpi">
              <text class="detail-kpi-value">¥{{ formatPrice(Number(detail.averageOrderValue) || 0) }}</text>
              <text class="detail-kpi-label">平均客单</text>
            </view>
            <view class="detail-kpi">
              <text class="detail-kpi-value">{{ detail.refundedOrderCount }}</text>
              <text class="detail-kpi-label">退款订单</text>
            </view>
          </view>

          <view class="relation">
            <view class="relation-dot" />
            <view class="relation-copy">
              <text class="relation-title">交易关系</text>
              <text class="relation-text">
                首次成交 {{ formatDate(detail.firstOrderAt) }} · 最近成交 {{ lastOrderText(detail.lastOrderAt) }}
              </text>
            </view>
          </view>

          <view class="recent-head">
            <view>
              <text class="recent-title">最近订单</text>
              <text class="recent-sub">点击订单可继续处理履约与售后</text>
            </view>
            <text class="recent-all" @tap="goCustomerOrders">全部 ›</text>
          </view>
          <view v-if="detail.recentOrders.length" class="recent-list">
            <view
              v-for="order in detail.recentOrders.slice(0, 4)"
              :key="order.id"
              class="recent-order"
              role="button"
              :aria-label="`查看订单${order.id}`"
              @tap="goOrderDetail(order.id)"
            >
              <image v-if="order.productImage" class="recent-image" :src="order.productImage" mode="aspectFill" />
              <view v-else class="recent-image recent-image-ph">
                <app-icon name="package" :size="20" color="#A98957" />
              </view>
              <view class="recent-main">
                <text class="recent-name">{{ order.productTitle || '订单商品' }}</text>
                <text class="recent-meta">{{ formatDate(order.createdAt) }} · {{ statusText(order.status) }}</text>
              </view>
              <view class="recent-price">
                <text>¥{{ formatPrice(Number(order.amount) || 0) }}</text>
                <app-icon name="chevron-right" :size="16" color="#C9B99F" />
              </view>
            </view>
          </view>
          <view v-else class="recent-empty">暂无可展示订单</view>

          <view class="detail-actions">
            <view class="detail-action secondary" @tap="closeDetail">继续看客户</view>
            <view class="detail-action primary" @tap="goCustomerOrders">查看全部订单</view>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import {
  merchantBackendApi,
  type MerchantCustomer,
  type MerchantCustomerDetail,
  type MerchantOrderStatus,
} from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const customers = ref<MerchantCustomer[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const pageSize = 20
const previewMode = ref(false)
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<MerchantCustomerDetail | null>(null)
const selectedCustomer = ref<MerchantCustomer | null>(null)

/** 手机号脱敏：138****8888 */
function maskPhone(phone?: string | null) {
  const p = String(phone || '').replace(/\D/g, '')
  if (p.length !== 11) return phone || ''
  return `${p.slice(0, 3)}****${p.slice(7)}`
}

/** 最近下单时间人性化：今天/昨天/N天前/日期 */
function lastOrderText(v?: string | null) {
  if (!v) return '—'
  const d = new Date(String(v).replace(/-/g, '/'))
  if (isNaN(d.getTime())) return String(v).slice(0, 10)
  const now = new Date()
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((n0.getTime() - d0.getTime()) / 86400000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return String(v).slice(0, 10)
}

function formatDate(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusText(status: MerchantOrderStatus) {
  return {
    PENDING: '待付款',
    PAID: '待发货',
    SHIPPED: '运输中',
    COMPLETED: '已完成',
    REFUNDED: '已退款',
    CANCELLED: '已取消',
  }[status]
}

function customerGrade(item: MerchantCustomerDetail) {
  if (item.orderCount >= 5) return '稳定复购客户 · 建议持续维护'
  if (item.orderCount >= 2) return '已有复购 · 关注下一次需求'
  return '首单客户 · 做好履约是最好的复购邀请'
}

function previewDetail(c: MerchantCustomer): MerchantCustomerDetail {
  return {
    ...c,
    totalSpent: 2868,
    orderCount: 4,
    averageOrderValue: 717,
    refundedOrderCount: 1,
    firstOrderAt: '2026-05-18T09:30:00.000Z',
    lastOrderAt: '2026-07-27T15:20:00.000Z',
    recentOrders: [
      { id: 'order-preview-1', userId: c.id, type: 'PRODUCT', targetId: 'p1', amount: 899, status: 'COMPLETED', createdAt: '2026-07-27T15:20:00.000Z', productTitle: '文房四宝精品套装' },
      { id: 'order-preview-2', userId: c.id, type: 'PRODUCT', targetId: 'p2', amount: 1299, status: 'SHIPPED', createdAt: '2026-07-03T11:08:00.000Z', productTitle: '国学经典诵读机' },
      { id: 'order-preview-3', userId: c.id, type: 'PRODUCT', targetId: 'p3', amount: 670, status: 'COMPLETED', createdAt: '2026-05-18T09:30:00.000Z', productTitle: '宣纸研习组合' },
    ],
  }
}

async function openCustomer(customer: MerchantCustomer, force = false) {
  selectedCustomer.value = customer
  detailOpen.value = true
  if (!force && detail.value?.id === customer.id) return
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = previewMode.value ? previewDetail(customer) : await merchantBackendApi.getCustomerDetail(customer.id)
  } catch (e) {
    detailError.value = (e as Error)?.message || '客户档案加载失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}

function goCustomerOrders() {
  if (!detail.value) return
  navigateTo(`/merchant/orders?customerId=${encodeURIComponent(detail.value.id)}&customerName=${encodeURIComponent(detail.value.nickname || '客户')}`)
}

function goOrderDetail(id: string) {
  navigateTo(`/merchant/order-detail?id=${encodeURIComponent(id)}`)
}

async function fetchPage(reset: boolean) {
  const p = reset ? 1 : page.value + 1
  const res = await merchantBackendApi.getCustomers({ page: p, pageSize, keyword: keyword.value })
  const items = Array.isArray(res.items) ? res.items : []
  total.value = Number(res.total) || 0
  page.value = p
  customers.value = reset ? items : [...customers.value, ...items]
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    await fetchPage(true)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value) return
  if (customers.value.length >= total.value) return
  loadingMore.value = true
  try {
    await fetchPage(false)
  } catch {
    // 加载更多失败静默（不覆盖已有列表）
  } finally {
    loadingMore.value = false
  }
}

function onSearch() {
  reload()
}
function clearSearch() {
  keyword.value = ''
  reload()
}

onLoad((options) => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  previewMode.value = import.meta.env.DEV && options?.__preview === '1'
  if (previewMode.value) {
    const sample: MerchantCustomer[] = [
      { id: 'customer-preview-1', nickname: '林女士', phone: '138****6508', orderCount: 4, totalSpent: 2868, lastOrderAt: '2026-07-27T15:20:00.000Z' },
      { id: 'customer-preview-2', nickname: '陈先生', phone: '186****9032', orderCount: 2, totalSpent: 1298, lastOrderAt: '2026-07-22T10:15:00.000Z' },
    ]
    customers.value = sample
    total.value = sample.length
    loading.value = false
    return
  }
  reload()
})
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF7F2; }

/* 导航 */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: linear-gradient(135deg, #C41E3A, #A5162F); }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff; }
.nav-placeholder { width: 32px; }

.scroll { height: 100vh; box-sizing: border-box; }

/* 搜索 */
.search { padding: 12px 16px 4px; }
.search-box { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; background: #fff; border-radius: 20px; border: 1px solid #EFE7DA; }
.search-input { flex: 1; font-size: 14px; color: #2A2320; }
.search-ph { color: #B99A6B; }
.search-clear { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }

/* 汇总 */
.sum { padding: 8px 18px 4px; }
.sum-txt { font-size: 12px; color: #9B8B77; }
.sum-n { color: #C41E3A; font-weight: 600; }

/* 列表 */
.list { padding: 8px 16px 40px; }
.ccard { display: flex; align-items: center; gap: 12px; padding: 14px; margin-bottom: 12px; background: #fff; border: 1px solid rgba(201,169,110,.16); border-radius: 14px; box-shadow: 0 5px 18px rgba(91, 65, 35, 0.06); }
.c-avatar { width: 48px; height: 48px; border-radius: 24px; flex-shrink: 0; background: #F0E9DD; }
.c-avatar-ph { display: flex; align-items: center; justify-content: center; }
.c-avatar-txt { font-size: 20px; font-weight: 600; color: #C9A96E; }
.c-main { flex: 1; min-width: 0; }
.c-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.c-name { font-size: 15px; font-weight: 600; color: #2A2320; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; }
.c-phone { font-size: 12px; color: #9B8B77; }
.c-stats { display: flex; gap: 8px; }
.c-stat { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 6px 4px; background: #FAF7F2; border-radius: 8px; }
.c-stat-n { font-size: 14px; font-weight: 600; color: #2A2320; }
.c-stat-l { margin-top: 2px; font-size: 11px; color: #9B8B77; }
.c-enter { width: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* 状态 */
.state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 80px 32px; }
.state-title { font-size: 15px; font-weight: 600; color: #2A2320; }
.state-txt { font-size: 13px; color: #9B8B77; text-align: center; }
.retry { margin-top: 12px; padding: 8px 28px; background: #C41E3A; border-radius: 20px; }
.retry-txt { font-size: 14px; color: #fff; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 70px 40px; }
.empty-ic { width: 72px; height: 72px; border-radius: 36px; background: #F5EEE1; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.empty-title { font-size: 15px; font-weight: 600; color: #2A2320; }
.empty-txt { font-size: 13px; color: #9B8B77; text-align: center; line-height: 1.6; }

/* 加载更多 */
.more { padding: 12px 0 24px; text-align: center; }
.more-txt { font-size: 12px; color: #B0A18D; }

/* 客户档案详情 */
.detail-mask { position: fixed; inset: 0; z-index: 90; display: flex; align-items: flex-end; justify-content: center; background: rgba(25, 20, 16, .48); backdrop-filter: blur(3px); }
.detail-sheet { width: 100%; max-height: 88vh; overflow-y: auto; box-sizing: border-box; padding: 8px 16px calc(18px + env(safe-area-inset-bottom)); background: #FAF7F2; border-radius: 24px 24px 0 0; box-shadow: 0 -18px 50px rgba(26, 18, 11, .18); }
.detail-grip { width: 38px; height: 4px; margin: 2px auto 14px; border-radius: 4px; background: #D8CCBC; }
.detail-head { display: flex; align-items: center; gap: 12px; padding: 0 2px 14px; }
.detail-avatar { width: 52px; height: 52px; flex-shrink: 0; border-radius: 17px; background: #EEE4D5; }
.detail-avatar-ph { display: flex; align-items: center; justify-content: center; background: linear-gradient(145deg, #AF293F, #7E1D31); color: #fff; font-size: 20px; font-weight: 700; }
.detail-person { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.detail-kicker { font-size: 10px; letter-spacing: 2px; color: #A98957; }
.detail-name { margin-top: 2px; font-size: 19px; font-weight: 700; color: #271F1A; }
.detail-phone { margin-top: 3px; font-size: 12px; color: #8D7C68; }
.detail-close { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #F0E8DD; }
.detail-state { min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #8D7C68; font-size: 13px; }
.detail-state-error { color: #A33A43; }
.detail-retry { padding: 9px 18px; border-radius: 18px; background: #A9233B; color: #fff; }
.detail-hero { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; min-height: 112px; padding: 18px 20px; border-radius: 18px; background: linear-gradient(135deg, #282E42 0%, #324B55 56%, #316F6A 100%); box-shadow: 0 10px 24px rgba(39, 69, 73, .2); }
.detail-hero::before { content: ''; position: absolute; width: 150px; height: 150px; right: -50px; top: -70px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; box-shadow: 0 0 0 22px rgba(255,255,255,.035), 0 0 0 44px rgba(255,255,255,.025); }
.detail-hero-copy { position: relative; display: flex; flex-direction: column; z-index: 1; }
.detail-hero-label { font-size: 12px; color: rgba(255,255,255,.7); }
.detail-hero-value { margin-top: 3px; font-size: 28px; font-weight: 700; color: #fff; }
.detail-hero-tip { margin-top: 8px; font-size: 11px; color: #D9CDAE; }
.detail-seal { position: relative; z-index: 1; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(232,214,170,.65); border-radius: 50%; color: #F2DDA5; font-family: serif; font-size: 20px; }
.detail-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.detail-kpi { display: flex; flex-direction: column; align-items: center; padding: 12px 5px; border: 1px solid #EEE3D3; border-radius: 13px; background: #fff; }
.detail-kpi-value { max-width: 100%; overflow: hidden; text-overflow: ellipsis; font-size: 16px; font-weight: 700; color: #2B2520; }
.detail-kpi-label { margin-top: 3px; font-size: 10px; color: #9A8872; }
.relation { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 12px 14px; border-radius: 13px; background: #F0E8DC; }
.relation-dot { width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; background: #2C8A7F; box-shadow: 0 0 0 5px rgba(44,138,127,.12); }
.relation-copy { display: flex; flex-direction: column; min-width: 0; }
.relation-title { font-size: 12px; font-weight: 650; color: #4B4036; }
.relation-text { margin-top: 3px; font-size: 11px; color: #8D7C68; }
.recent-head { display: flex; align-items: flex-end; justify-content: space-between; margin: 20px 2px 10px; }
.recent-title { display: block; font-size: 16px; font-weight: 700; color: #2B2520; }
.recent-sub { display: block; margin-top: 2px; font-size: 10px; color: #A08F7C; }
.recent-all { min-height: 32px; display: flex; align-items: center; font-size: 12px; color: #A9233B; }
.recent-list { overflow: hidden; border: 1px solid #EEE3D3; border-radius: 15px; background: #fff; }
.recent-order { min-height: 64px; display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid #F1E9DF; }
.recent-order:last-child { border-bottom: 0; }
.recent-image { width: 46px; height: 46px; flex-shrink: 0; border-radius: 10px; background: #F1E9DE; }
.recent-image-ph { display: flex; align-items: center; justify-content: center; }
.recent-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.recent-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 650; color: #322A24; }
.recent-meta { margin-top: 5px; font-size: 10px; color: #9A8872; }
.recent-price { display: flex; align-items: center; gap: 3px; flex-shrink: 0; font-size: 12px; font-weight: 650; color: #A9233B; }
.recent-empty { padding: 26px; text-align: center; border-radius: 14px; background: #fff; color: #9A8872; font-size: 12px; }
.detail-actions { display: grid; grid-template-columns: .8fr 1.2fr; gap: 10px; margin-top: 14px; }
.detail-action { min-height: 46px; display: flex; align-items: center; justify-content: center; border-radius: 14px; font-size: 14px; font-weight: 650; }
.detail-action.secondary { border: 1px solid #DFCDB4; color: #765D3C; background: #fff; }
.detail-action.primary { color: #fff; background: linear-gradient(135deg, #C72344, #9C1831); box-shadow: 0 8px 18px rgba(169,35,59,.2); }

@media (min-width: 700px) {
  .detail-sheet { width: min(620px, 100%); border-radius: 24px 24px 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .detail-mask { backdrop-filter: none; }
}
</style>
