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
          <view v-for="c in customers" :key="c.id" class="ccard">
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
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { merchantBackendApi, type MerchantCustomer } from '@/pkg-merchant/lib/merchant-data'

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

onLoad(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
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
.ccard { display: flex; gap: 12px; padding: 14px; margin-bottom: 12px; background: #fff; border-radius: 14px; box-shadow: 0 1px 6px rgba(150, 120, 80, 0.06); }
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
</style>
