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
      <!-- 搜索 -->
      <view class="ol-toolbar">
        <view class="ol-search-row">
          <view class="ol-search">
            <AppIcon name="search" :size="16" color="#9ca3af" />
            <input class="ol-search-input" v-model="searchQuery" placeholder="搜索订单号/商品名称" placeholder-class="ol-ph" />
          </view>
          <view class="ol-icon-btn">
            <AppIcon name="filter" :size="16" color="#1a1a1a" />
          </view>
        </view>
        <view class="ol-tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="ol-tab"
            :class="{ active: activeTab === t.key }"
            @tap="activeTab = t.key"
          >
            {{ t.label }}({{ stats[t.key] }})
          </view>
        </view>
      </view>

      <!-- 订单列表 -->
      <view class="ol-list">
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
            <view class="ol-thumb">
              <AppIcon name="package" :size="24" color="#c4b59a" />
            </view>
            <view class="ol-product-info">
              <text class="ol-product-name">{{ o.productTitle }}</text>
              <view class="ol-product-meta">
                <text class="ol-qty">x{{ o.quantity }}</text>
                <text class="ol-price">¥{{ o.price }}</text>
              </view>
            </view>
          </view>
          <!-- 金额 -->
          <view class="ol-amount">
            <text class="ol-date">{{ o.createdAt.split(' ')[0] }}</text>
            <view class="ol-amount-right">
              <text class="ol-amount-txt">共{{ o.quantity }}件，实付: <text class="ol-amount-val">¥{{ o.totalAmount }}</text></text>
              <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
            </view>
          </view>
          <!-- 操作按钮 -->
          <view v-if="o.status === 'pending'" class="ol-actions">
            <view class="ol-act-btn outline" @tap.stop="toast">修改价格</view>
            <view class="ol-act-btn primary" @tap.stop="goDetail(o.id)">立即发货</view>
          </view>
          <view v-if="o.status === 'refunding'" class="ol-actions">
            <view class="ol-act-btn outline" @tap.stop="toast">拒绝退款</view>
            <view class="ol-act-btn danger" @tap.stop="toast">同意退款</view>
          </view>
        </view>

        <view v-if="filteredOrders.length === 0" class="ol-empty">
          <text class="ol-empty-txt">暂无订单</text>
        </view>
      </view>
      <view style="height: 24px" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantOrders, orderStatusConfig } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const statusCfg = orderStatusConfig
const orders = merchantOrders
const activeTab = ref('all')
const searchQuery = ref('')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待发货' },
  { key: 'shipped', label: '已发货' },
  { key: 'refunding', label: '退款' },
]

onLoad((opts: any) => {
  if (opts?.status) activeTab.value = String(opts.status)
})

const stats = computed<Record<string, number>>(() => ({
  all: orders.length,
  pending: orders.filter((o) => o.status === 'pending').length,
  shipped: orders.filter((o) => o.status === 'shipped').length,
  refunding: orders.filter((o) => o.status === 'refunding').length,
}))

const filteredOrders = computed(() =>
  orders.filter((o) => {
    if (activeTab.value !== 'all' && o.status !== activeTab.value) return false
    if (searchQuery.value && !o.id.includes(searchQuery.value) && !o.productTitle.includes(searchQuery.value)) return false
    return true
  }),
)

function goDetail(id: string) {
  navigateTo(`/merchant/order-detail?id=${id}`)
}
function toast() {
  uni.showToast({ title: '演示功能', icon: 'none' })
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
.ol-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; }
.ol-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; }
.ol-tab { flex: 1; text-align: center; font-size: 12px; color: #6b7280; padding: 6px 0; border-radius: 6px; }
.ol-tab.active { background: #fff; color: #1a1a1a; font-weight: 500; }

.ol-list { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.ol-card { background: #fff; border-radius: 12px; padding: 16px; }
.ol-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ol-order-no { font-size: 12px; color: #9ca3af; }
.ol-status { display: flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 6px; }
.ol-product { display: flex; gap: 12px; }
.ol-thumb { width: 64px; height: 64px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ol-product-info { flex: 1; min-width: 0; }
.ol-product-name { font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.ol-product-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.ol-qty { font-size: 12px; color: #9ca3af; }
.ol-price { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.ol-amount { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6; }
.ol-date { font-size: 12px; color: #9ca3af; }
.ol-amount-right { display: flex; align-items: center; gap: 8px; }
.ol-amount-txt { font-size: 13px; color: #1a1a1a; }
.ol-amount-val { font-weight: 700; color: #c41e3a; }
.ol-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6; }
.ol-act-btn { font-size: 13px; padding: 7px 14px; border-radius: 6px; }
.ol-act-btn.outline { border: 1px solid #d1d5db; color: #1a1a1a; }
.ol-act-btn.primary { background: #c41e3a; color: #fff; }
.ol-act-btn.danger { background: #ef4444; color: #fff; }

.ol-empty { padding: 80px 0; text-align: center; }
.ol-empty-txt { font-size: 14px; color: #9ca3af; }
</style>
