<template>
  <view class="mg-page">
    <view class="mg-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mg-nav">
        <view class="mg-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
        <text class="mg-nav-title">驿站经营后台</text>
        <view class="mg-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="mg-body">
      <!-- 三态 -->
      <view v-if="loading" class="mg-state">
        <view class="spinner" />
        <text class="mg-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="mg-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="mg-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="!station" class="mg-state">
        <app-icon name="store" :size="52" color="#d8b48a" />
        <text class="mg-state-text">你还不是驿站运营者</text>
        <text class="mg-state-sub">驿站以地级市为单位加盟经营，如需入驻请联系平台</text>
      </view>

      <template v-else>
        <!-- 门店卡 -->
        <view class="mg-store">
          <view class="mg-store-top">
            <view class="mg-store-logo">
              <image lazy-load v-if="station.cover" :src="station.cover" class="mg-store-logo-img" mode="aspectFill" />
              <app-icon v-else name="store" :size="28" color="#d8b48a" />
            </view>
            <view class="mg-store-info">
              <text class="mg-store-name">{{ station.name }}</text>
              <text class="mg-store-addr">{{ station.city }} · {{ station.address }}</text>
            </view>
            <text class="mg-store-status" :class="station.status === 'ACTIVE' ? 'on' : 'off'">{{ stationStatusLabel[station.status] || '筹备中' }}</text>
          </view>
        </view>

        <!-- 今日宜忌轻栏（自包含拉取，失败自动隐藏；本页留白为 px 体系，故显式传 margin） -->
        <almanac-bar margin="12px 16px 0" />

        <!-- 经营数据 -->
        <view class="mg-stats-card">
          <view class="mg-stats-title-row">
            <text class="mg-stats-title">经营概览</text>
            <text class="mg-stats-period">本月</text>
          </view>
          <view class="mg-stats-main">
            <view class="mg-stat-big">
              <text class="mg-stat-big-num">¥{{ num(stats?.monthRevenue).toLocaleString() }}</text>
              <text class="mg-stat-big-label">本月营收</text>
            </view>
            <view class="mg-stat-big">
              <text class="mg-stat-big-num">¥{{ num(stats?.monthStationIncome).toLocaleString() }}</text>
              <text class="mg-stat-big-label">本月驿站分成</text>
            </view>
          </view>
          <view class="mg-stats-grid">
            <view class="mg-stat-sm"><text class="mg-stat-sm-num">{{ stats?.monthOrders ?? 0 }}</text><text class="mg-stat-sm-label">本月订单</text></view>
            <view class="mg-stat-sm"><text class="mg-stat-sm-num">{{ station._count?.courses ?? 0 }}</text><text class="mg-stat-sm-label">课程</text></view>
            <view class="mg-stat-sm"><text class="mg-stat-sm-num">{{ station._count?.products ?? 0 }}</text><text class="mg-stat-sm-label">商品</text></view>
            <view class="mg-stat-sm"><text class="mg-stat-sm-num">{{ station._count?.teachers ?? 0 }}</text><text class="mg-stat-sm-label">讲师</text></view>
          </view>
        </view>

        <!-- 经营顾问建议（自包含拉取，空/失败自动隐藏） -->
        <advisor-card role-type="STATION_OFFLINE_OWNER" />

        <!-- 累计收益 -->
        <view class="mg-income-card">
          <view class="mg-income-row">
            <text class="mg-income-label">累计营收</text>
            <text class="mg-income-val">¥{{ num(stats?.totalRevenue).toLocaleString() }}</text>
          </view>
          <view class="mg-income-row">
            <text class="mg-income-label">累计驿站分成</text>
            <text class="mg-income-val">¥{{ num(stats?.totalStationIncome).toLocaleString() }}</text>
          </view>
          <view class="mg-income-row">
            <text class="mg-income-label">已结算</text>
            <text class="mg-income-val">¥{{ num(stats?.settledAmount).toLocaleString() }}</text>
          </view>
          <view class="mg-withdraw" @tap="onWithdraw"><text class="mg-withdraw-text">申请提现</text></view>
        </view>

        <!-- 待办与预警（三类待办均空则整块隐藏） -->
        <view v-if="todoCount > 0" class="mg-todo-card">
          <view class="mg-sec-head">
            <text class="mg-sec-title">待办与预警</text>
            <text class="mg-sec-badge">{{ todoCount }}</text>
          </view>
          <!-- 库存预警 → 商品管理 -->
          <view v-for="a in stockAlerts" :key="'stock-' + a.id" class="mg-todo-row" @tap="goProducts">
            <view class="mg-todo-dot warn"><app-icon name="alert-triangle" :size="14" color="#ea580c" /></view>
            <view class="mg-todo-main">
              <text class="mg-todo-text">「{{ a.name }}」库存告急</text>
              <text class="mg-todo-sub">仅剩 {{ a.stock }} 件 · 建议尽快补货</text>
            </view>
            <app-icon name="chevron-right" :size="16" color="#c9beb2" />
          </view>
          <!-- 待确认讲师预约 → 讲师预约管理 -->
          <view v-for="b in pendingBookings" :key="'booking-' + b.id" class="mg-todo-row" @tap="goTeachers">
            <view class="mg-todo-dot book"><app-icon name="users" :size="14" color="#9333ea" /></view>
            <view class="mg-todo-main">
              <text class="mg-todo-text">{{ b.teacher?.name || '讲师' }} 的预约待确认</text>
              <text class="mg-todo-sub">预约日期 {{ fmtDate(b.bookingDate) }}</text>
            </view>
            <app-icon name="chevron-right" :size="16" color="#c9beb2" />
          </view>
          <!-- 即将开课（7天内） → 课程管理 -->
          <view v-for="c in upcomingCourses" :key="'upcoming-' + c.id" class="mg-todo-row" @tap="goCourses">
            <view class="mg-todo-dot soon"><app-icon name="clock" :size="14" color="#16a34a" /></view>
            <view class="mg-todo-main">
              <text class="mg-todo-text">「{{ c.title }}」即将开课</text>
              <text class="mg-todo-sub">{{ fmtCourseTime(c.startTime) }} · {{ c.location }} · 已报名 {{ c._count?.registrations ?? 0 }} 人</text>
            </view>
            <app-icon name="chevron-right" :size="16" color="#c9beb2" />
          </view>
        </view>

        <!-- 热销排行（课程/商品均空则整块隐藏） -->
        <view v-if="courseRanking.length || productRanking.length" class="mg-rank-card">
          <view class="mg-sec-head">
            <text class="mg-sec-title">热销排行</text>
          </view>
          <view v-if="courseRanking.length" class="mg-rank-group">
            <text class="mg-rank-group-title">最受欢迎课程</text>
            <view v-for="(r, i) in courseRanking" :key="'crank-' + r.id" class="mg-rank-row">
              <text class="mg-rank-no" :class="{ top: i < 3 }">{{ i + 1 }}</text>
              <text class="mg-rank-name">{{ r.title }}</text>
              <text class="mg-rank-val">{{ r.registrations }} 人报名</text>
            </view>
          </view>
          <view v-if="productRanking.length" class="mg-rank-group">
            <text class="mg-rank-group-title">热销商品</text>
            <view v-for="(r, i) in productRanking" :key="'prank-' + r.id" class="mg-rank-row">
              <text class="mg-rank-no" :class="{ top: i < 3 }">{{ i + 1 }}</text>
              <text class="mg-rank-name">{{ r.name }}</text>
              <text class="mg-rank-val">售 {{ r.sales }} 单 · ¥{{ num(r.amount).toLocaleString() }}</text>
            </view>
          </view>
        </view>

        <!-- 功能宫格 -->
        <view class="mg-grid">
          <view v-for="m in modules" :key="m.key" class="mg-grid-item" @tap="onModule(m)">
            <view class="mg-grid-icon" :style="{ background: m.bg }"><app-icon :name="m.icon" :size="24" :color="m.color" /></view>
            <text class="mg-grid-label">{{ m.label }}</text>
          </view>
        </view>

        <!-- 高级运营商权益 -->
        <view class="mg-op-card" @tap="onOperator">
          <view class="mg-op-left">
            <app-icon name="trending-up" :size="20" color="#d4a017" />
            <view>
              <text class="mg-op-title">高级运营商推广权益</text>
              <text class="mg-op-sub">推广平台内容获取佣金 · 管理奖更高</text>
            </view>
          </view>
          <app-icon name="chevron-right" :size="18" color="#d4a017" />
        </view>

        <view class="mg-safe" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AdvisorCard from '@/components/workbench/advisor-card.vue'
import AlmanacBar from '@/components/workbench/almanac-bar.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineManageApi, stationStatusLabel, num, fmtDate, fmtCourseTime,
  type MyStation, type DashboardStats,
  type StockAlertItem, type PendingBookingItem, type UpcomingCourseItem, type CourseRankItem, type ProductRankItem,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const station = ref<MyStation | null>(null)
const stats = ref<DashboardStats | null>(null)

// 待办与预警（三类）+ 热销排行（课程/商品 TOP5）
const stockAlerts = ref<StockAlertItem[]>([])
const pendingBookings = ref<PendingBookingItem[]>([])
const upcomingCourses = ref<UpcomingCourseItem[]>([])
const courseRanking = ref<CourseRankItem[]>([])
const productRanking = ref<ProductRankItem[]>([])
const todoCount = computed(() => stockAlerts.value.length + pendingBookings.value.length + upcomingCourses.value.length)

const modules = [
  { key: 'courses', label: '课程管理', icon: 'graduation-cap', color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
  { key: 'checkin', label: '签到核销', icon: 'qr-code', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'products', label: '商品管理', icon: 'shopping-bag', color: '#2563eb', bg: '#eff6ff' },
  { key: 'teachers', label: '讲师预约', icon: 'users', color: '#9333ea', bg: '#faf5ff' },
  { key: 'students', label: '学员洞察', icon: 'user-check', color: '#d4a017', bg: '#fff8e6' },
  { key: 'marketing', label: '营销工具', icon: 'megaphone', color: '#ea580c', bg: '#fff7ed' },
  { key: 'income', label: '收益管理', icon: 'wallet', color: '#0891b2', bg: '#ecfeff' },
]

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const s = await offlineManageApi.getMyStation()
    station.value = s
    if (s) {
      // 主数据 + 待办预警/排行并行拉取；后 5 项用 allSettled 分项容错，单项失败置空态不拖垮整页
      const [dashboard, ...extras] = await Promise.allSettled([
        offlineManageApi.getDashboard(s.id),
        offlineManageApi.getStockAlerts(),
        offlineManageApi.getPendingBookings(),
        offlineManageApi.getUpcomingCourses(),
        offlineManageApi.getCourseRanking(),
        offlineManageApi.getProductRanking(),
      ])
      // 经营概览是页面主体：失败仍走整页错误态（保持既有机制）
      if (dashboard.status === 'rejected') throw dashboard.reason
      stats.value = dashboard.value as DashboardStats
      const pick = <T>(r: PromiseSettledResult<unknown>): T[] => (r.status === 'fulfilled' && Array.isArray(r.value) ? (r.value as T[]) : [])
      stockAlerts.value = pick<StockAlertItem>(extras[0])
      pendingBookings.value = pick<PendingBookingItem>(extras[1])
      upcomingCourses.value = pick<UpcomingCourseItem>(extras[2])
      courseRanking.value = pick<CourseRankItem>(extras[3]).slice(0, 5)
      productRanking.value = pick<ProductRankItem>(extras[4]).slice(0, 5)
    }
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败')
  } finally {
    loading.value = false
  }
}
onLoad(() => load())
onShow(() => { if (station.value) load() })

function onModule(m: { key: string }) {
  if (!station.value) return
  const sid = station.value.id
  if (m.key === 'courses') navigateTo(`/offline/manage/courses?stationId=${sid}`)
  else if (m.key === 'checkin') navigateTo(`/offline/manage/checkin?stationId=${sid}`)
  else if (m.key === 'products') navigateTo(`/offline/manage/products?stationId=${sid}`)
  else if (m.key === 'teachers') navigateTo(`/offline/manage/teachers?stationId=${sid}`)
  else if (m.key === 'students') navigateTo('/pkg-offline/students/index')
  else if (m.key === 'marketing') uni.showToast({ title: '营销工具即将开放', icon: 'none' })
  else if (m.key === 'income') uni.showToast({ title: '收益明细与提现即将开放', icon: 'none' })
}
// 待办条目跳转对应管理页（复用宫格既有路径）
function goProducts() { if (station.value) navigateTo(`/offline/manage/products?stationId=${station.value.id}`) }
function goTeachers() { if (station.value) navigateTo(`/offline/manage/teachers?stationId=${station.value.id}`) }
function goCourses() { if (station.value) navigateTo(`/offline/manage/courses?stationId=${station.value.id}`) }

function onWithdraw() { uni.showToast({ title: '提现功能即将开放', icon: 'none' }) }
function onOperator() { uni.showToast({ title: '高级运营商推广权益即将开放', icon: 'none' }) }
</script>

<style scoped>
.mg-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.mg-header { position: sticky; top: 0; z-index: 50; background: linear-gradient(135deg, #9a2e25, #b8453a); }
.mg-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.mg-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.mg-nav-title { font-size: 17px; font-weight: 600; color: #fff; }
.mg-body { flex: 1; }
.mg-state { padding: 90px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mg-state-text { font-size: 14px; color: #6b5d4f; }
.mg-state-sub { font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }

.mg-store { margin: -8px 16px 0; padding: 16px; background: #fff; border-radius: 14px; box-shadow: 0 4px 16px rgba(154,46,37,0.08); position: relative; z-index: 2; }
.mg-store-top { display: flex; align-items: center; gap: 12px; }
.mg-store-logo { width: 56px; height: 56px; border-radius: 12px; background: #f3ede2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.mg-store-logo-img { width: 100%; height: 100%; }
.mg-store-info { flex: 1; min-width: 0; }
.mg-store-name { display: block; font-size: 16px; font-weight: 700; color: #2a1f1a; }
.mg-store-addr { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mg-store-status { font-size: 11px; padding: 2px 10px; border-radius: 999px; flex-shrink: 0; }
.mg-store-status.on { color: #16a34a; background: #f0fdf4; }
.mg-store-status.off { color: #6b7280; background: #f3f4f6; }

.mg-stats-card { margin: 12px 16px; padding: 16px; background: linear-gradient(135deg, #9a2e25, #b8453a); border-radius: 14px; }
.mg-stats-title-row { display: flex; align-items: center; justify-content: space-between; }
.mg-stats-title { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 500; }
.mg-stats-period { font-size: 12px; color: rgba(255,255,255,0.7); }
.mg-stats-main { display: flex; gap: 12px; margin-top: 14px; }
.mg-stat-big { flex: 1; }
.mg-stat-big-num { display: block; font-size: 22px; font-weight: 700; color: #fff; }
.mg-stat-big-label { display: block; font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 4px; }
.mg-stats-grid { display: flex; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2); }
.mg-stat-sm { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.mg-stat-sm-num { font-size: 17px; font-weight: 700; color: #fff; }
.mg-stat-sm-label { font-size: 10px; color: rgba(255,255,255,0.75); }

.mg-income-card { margin: 12px 16px; padding: 16px; background: #fff; border-radius: 14px; }
.mg-income-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }
.mg-income-label { font-size: 13px; color: #6b7280; }
.mg-income-val { font-size: 15px; font-weight: 600; color: #2a1f1a; }
.mg-withdraw { margin-top: 10px; height: 40px; background: rgba(154,46,37,0.08); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.mg-withdraw-text { font-size: 14px; color: #9a2e25; font-weight: 500; }

/* 待办与预警 / 热销排行 通用区块头 */
.mg-sec-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.mg-sec-title { font-size: 15px; font-weight: 700; color: #2a1f1a; }
.mg-sec-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #9a2e25; color: #fff; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; }

.mg-todo-card { margin: 12px 16px; padding: 16px; background: #fff; border-radius: 14px; }
.mg-todo-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f3ede2; }
.mg-todo-row:last-child { border-bottom: none; padding-bottom: 2px; }
.mg-todo-dot { width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mg-todo-dot.warn { background: #fff7ed; }
.mg-todo-dot.book { background: #faf5ff; }
.mg-todo-dot.soon { background: #f0fdf4; }
.mg-todo-main { flex: 1; min-width: 0; }
.mg-todo-text { display: block; font-size: 13px; font-weight: 500; color: #2a1f1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mg-todo-sub { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mg-rank-card { margin: 12px 16px; padding: 16px; background: #fff; border-radius: 14px; }
.mg-rank-group { margin-top: 10px; }
.mg-rank-group-title { display: block; font-size: 12px; color: #6b5d4f; font-weight: 600; margin-bottom: 4px; }
.mg-rank-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
.mg-rank-no { width: 20px; height: 20px; border-radius: 6px; background: #f3ede2; color: #6b5d4f; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mg-rank-no.top { background: rgba(154,46,37,0.1); color: #9a2e25; }
.mg-rank-name { flex: 1; min-width: 0; font-size: 13px; color: #2a1f1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mg-rank-val { font-size: 11px; color: #9ca3af; flex-shrink: 0; }

.mg-grid { margin: 12px 16px; padding: 16px 8px; background: #fff; border-radius: 14px; display: flex; flex-wrap: wrap; }
.mg-grid-item { width: 33.33%; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 0; }
.mg-grid-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.mg-grid-label { font-size: 12px; color: #4b4039; }

.mg-op-card { margin: 12px 16px; padding: 14px 16px; background: linear-gradient(135deg, #fff8e6, #fdf0d0); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; }
.mg-op-left { display: flex; align-items: center; gap: 12px; }
.mg-op-title { display: block; font-size: 14px; font-weight: 600; color: #8a6d1a; }
.mg-op-sub { display: block; font-size: 11px; color: #b8923a; margin-top: 2px; }
.mg-safe { height: 24px; }
</style>
