<template>
  <view class="ol-page">
    <!-- 顶部导航 -->
    <view class="ol-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ol-header-inner">
        <view class="ol-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="ol-title">订单管理</text>
      </view>
    </view>

    <scroll-view scroll-y class="ol-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 搜索 + 筛选 -->
      <view class="ol-toolbar">
        <view class="ol-search-row">
          <view class="ol-search">
            <AppIcon name="search" :size="16" color="#9ca3af" />
            <input class="ol-search-input" v-model="searchQuery" placeholder="搜索订单号/商品名称" placeholder-class="ol-ph" />
          </view>
        </view>
        <view class="ol-tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="ol-tab"
            :class="{ active: activeTab === t.key }"
            @tap="switchTab(t.key)"
          >
            {{ t.label }}
          </view>
        </view>
      </view>

      <!-- Loading -->
      <view v-if="loading" class="ol-state">
        <text class="ol-state-txt">加载中…</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="ol-state">
        <AppIcon name="alert-circle" :size="44" color="#dc2626" />
        <text class="ol-state-title">加载失败</text>
        <text class="ol-state-txt">{{ error }}</text>
        <view class="ol-state-btn" @tap="load">
          <text>重试</text>
        </view>
      </view>
      <!-- Empty -->
      <view v-else-if="filteredOrders.length === 0" class="ol-state">
        <AppIcon name="package" :size="44" color="#ccc" />
        <text class="ol-state-txt">{{ searchQuery ? '没有匹配的订单' : '暂无订单' }}</text>
      </view>

      <!-- 订单列表 -->
      <view v-else class="ol-list">
        <view
          v-for="o in filteredOrders"
          :key="o.id"
          class="ol-card"
          @tap="goDetail(o.id)"
        >
          <!-- 头部 -->
          <view class="ol-card-head">
            <text class="ol-order-no">订单号: {{ o.id }}</text>
            <view class="ol-status" :style="{ color: statusCfg[o.status].color, background: statusCfg[o.status].bg }">
              <AppIcon :name="statusCfg[o.status].icon" :size="12" :color="statusCfg[o.status].color" />
              <text>{{ statusCfg[o.status].label }}</text>
            </view>
          </view>
          <!-- 商品 -->
          <view class="ol-product">
            <image lazy-load v-if="o.productImage" class="ol-thumb-img" :src="o.productImage" mode="aspectFill" />
            <view v-else class="ol-thumb">
              <AppIcon name="package" :size="24" color="#c4b59a" />
            </view>
            <view class="ol-product-info">
              <text class="ol-product-name">{{ o.productTitle || '商品' }}</text>
              <view class="ol-product-meta">
                <text class="ol-buyer">{{ o.buyerNickname || '匿名买家' }}</text>
                <text class="ol-price">¥{{ Number(o.amount).toFixed(2) }}</text>
              </view>
            </view>
          </view>
          <!-- 底部 -->
          <view class="ol-amount">
            <text class="ol-date">{{ formatDate(o.createdAt) }}</text>
            <view class="ol-amount-right">
              <text class="ol-amount-txt">实付: <text class="ol-amount-val">¥{{ Number(o.amount).toFixed(2) }}</text></text>
              <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
            </view>
          </view>
          <!-- 操作按钮：待发货可快捷进入发货 -->
          <view v-if="o.status === 'PAID'" class="ol-actions">
            <view class="ol-act-btn primary" @tap.stop="goDetail(o.id)">立即发货</view>
          </view>
          <view v-else-if="o.status === 'REFUNDED'" class="ol-actions">
            <view class="ol-act-btn outline" @tap.stop="goDetail(o.id)">处理退款</view>
          </view>
        </view>

        <view style="height: 24px" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  orderStatusConfig,
  type MerchantOrder,
  type MerchantOrderStatus,
} from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const statusCfg = orderStatusConfig

// tab key：'all' 不传 status，其余直接映射后端订单状态
type TabKey = 'all' | MerchantOrderStatus
const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'PAID', label: '待发货' },
  { key: 'SHIPPED', label: '已发货' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'REFUNDED', label: '已退款' },
]

const orders = ref<MerchantOrder[]>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref<TabKey>('all')
const searchQuery = ref('')

onLoad((opts: any) => {
  if (opts?.status && tabs.some((t) => t.key === opts.status)) activeTab.value = opts.status as TabKey
  load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantBackendApi.getOrders({
      status: activeTab.value === 'all' ? undefined : activeTab.value,
      page: 1,
      pageSize: 50,
    })
    orders.value = res.items
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(key: TabKey) {
  if (activeTab.value === key) return
  activeTab.value = key
  load()
}

// 搜索为已加载列表的客户端过滤
const filteredOrders = computed(() =>
  orders.value.filter((o) => {
    if (!searchQuery.value) return true
    const q = searchQuery.value
    return o.id.includes(q) || (o.productTitle || '').includes(q)
  }),
)

function formatDate(s?: string) {
  return s ? String(s).slice(0, 10) : ''
}
function goDetail(id: string) {
  navigateTo(`/merchant/order-detail?id=${id}`)
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style scoped>
.ol-page { min-height: 100vh; background: #f5f5f7; }
.ol-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.ol-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.ol-back { width: 32px; display: flex; align-items: center; }
.ol-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.ol-scroll { height: 100vh; box-sizing: border-box; }

.ol-toolbar { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.ol-search-row { display: flex; gap: 8px; }
.ol-search { flex: 1; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; height: 40px; }
.ol-search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.ol-ph { color: #9ca3af; }
.ol-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; }
.ol-tab { flex: 1; text-align: center; font-size: 12px; color: #6b7280; padding: 6px 0; border-radius: 6px; }
.ol-tab.active { background: #fff; color: #1a1a1a; font-weight: 500; }

.ol-list { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.ol-card { background: #fff; border-radius: 12px; padding: 16px; }
.ol-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ol-order-no { font-size: 12px; color: #9ca3af; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px; }
.ol-status { display: flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }
.ol-product { display: flex; gap: 12px; }
.ol-thumb { width: 64px; height: 64px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ol-thumb-img { width: 64px; height: 64px; border-radius: 8px; background: #f3f0ea; flex-shrink: 0; }
.ol-product-info { flex: 1; min-width: 0; }
.ol-product-name { font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.ol-product-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.ol-buyer { font-size: 12px; color: #9ca3af; }
.ol-price { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.ol-amount { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6; }
.ol-date { font-size: 12px; color: #9ca3af; }
.ol-amount-right { display: flex; align-items: center; gap: 8px; }
.ol-amount-txt { font-size: 13px; color: #1a1a1a; }
.ol-amount-val { font-weight: 700; color: var(--brand); }
.ol-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6; }
.ol-act-btn { font-size: 13px; padding: 7px 14px; border-radius: 6px; }
.ol-act-btn.outline { border: 1px solid #d1d5db; color: #1a1a1a; }
.ol-act-btn.primary { background: var(--brand); color: #fff; }

/* 三态 */
.ol-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 24px; gap: 12px; }
.ol-state-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
.ol-state-txt { font-size: 14px; color: #9ca3af; text-align: center; line-height: 1.5; }
.ol-state-btn { margin-top: 8px; padding: 8px 24px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
.ol-state-btn text { font-size: 14px; color: #1a1a1a; }
</style>
