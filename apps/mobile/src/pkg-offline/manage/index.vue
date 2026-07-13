<template>
  <view class="b1-page">
    <scroll-view scroll-y class="b1-body">
      <!-- 三态 -->
      <view v-if="loading" class="b1-state" :style="{ paddingTop: statusBarHeight + 60 + 'px' }">
        <view class="spinner" /><text class="b1-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="b1-state" :style="{ paddingTop: statusBarHeight + 60 + 'px' }">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" /><text class="b1-state-text">{{ errMsg }}</text>
        <view class="b1-retry" @tap="load"><text class="b1-retry-text">重试</text></view>
      </view>
      <view v-else-if="!station" class="b1-state" :style="{ paddingTop: statusBarHeight + 60 + 'px' }">
        <app-icon name="store" :size="52" color="#C9A96E" />
        <text class="b1-state-text">你还不是驿站运营者</text>
        <text class="b1-state-sub">驿站以地级市为单位加盟经营，如需入驻请联系平台</text>
      </view>

      <template v-else>
        <!-- 朱红品牌头 -->
        <view class="b1-topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
          <view class="b1-topbar-row">
            <view class="b1-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
            <text class="b1-topbar-title">驿站工作台</text>
            <view class="b1-icon-btn" />
          </view>
          <!-- 驿站头卡 -->
          <view class="b1-store">
            <view class="b1-store-logo">
              <image v-if="station.cover" :src="station.cover" class="b1-store-logo-img" mode="aspectFill" />
              <app-icon v-else name="store" :size="24" color="#C9A96E" />
            </view>
            <view class="b1-store-info">
              <view class="b1-store-name-row">
                <text class="b1-store-name">{{ station.name }}</text>
                <text class="b1-store-status" :class="station.status === 'ACTIVE' ? 'on' : 'off'">{{ stationStatusLabel[station.status] || '筹备中' }}</text>
              </view>
              <text class="b1-store-addr">{{ station.city }} · {{ station.address }}</text>
            </view>
            <text class="b1-store-preview" @tap="goBrandHome">预览主页 ›</text>
          </view>
        </view>

        <view class="b1-main">
          <!-- 今日待办 -->
          <view class="b1-sec"><text class="b1-sec-title">今日待办</text></view>
          <view v-if="todoCount > 0" class="b1-todo">
            <view v-if="todayCourses.length" class="b1-todo-row" @tap="goCheckin()">
              <view class="b1-badge">{{ todayCourses.length }}</view>
              <text class="b1-todo-text">今日 {{ todayCourses.length }} 场课待核销 · {{ todayCourses[0].title }}</text>
              <text class="b1-todo-go">去核销 ›</text>
            </view>
            <view v-if="pendingBookings.length" class="b1-todo-row" @tap="goTeachers">
              <view class="b1-badge">{{ pendingBookings.length }}</view>
              <text class="b1-todo-text">讲师预约待确认</text>
              <text class="b1-todo-go">去确认 ›</text>
            </view>
            <view v-if="stockAlerts.length" class="b1-todo-row" @tap="goProducts">
              <view class="b1-badge">{{ stockAlerts.length }}</view>
              <text class="b1-todo-text">商品库存预警</text>
              <text class="b1-todo-go">去处理 ›</text>
            </view>
          </view>
          <view v-else class="b1-todo-empty"><text>今日暂无待办，经营顺利</text></view>

          <!-- 今日宜忌轻栏（自包含·失败自动隐藏） -->
          <almanac-bar margin="12px 0 0" />

          <!-- 经营数据 -->
          <view class="b1-sec"><text class="b1-sec-title">经营数据</text><text class="b1-sec-link" @tap="showIncome = !showIncome">营收看板 ›</text></view>
          <view class="b1-grid3">
            <view class="b1-gitem"><text class="b1-num">{{ stats?.activeCourses ?? 0 }}</text><text class="b1-gitem-label">在售课程</text></view>
            <view class="b1-gitem"><text class="b1-num">{{ stats?.monthOrders ?? 0 }}</text><text class="b1-gitem-label">本月招生</text></view>
            <view class="b1-gitem"><text class="b1-num gold">{{ revenueDisplay }}</text><text class="b1-gitem-label">本月营收(元)</text></view>
          </view>

          <!-- 营收看板（展开·累计收益真连） -->
          <view v-if="showIncome" class="b1-income">
            <view class="b1-income-row"><text class="b1-income-label">累计营收</text><text class="b1-income-val">¥{{ num(stats?.totalRevenue).toLocaleString() }}</text></view>
            <view class="b1-income-row"><text class="b1-income-label">累计驿站分成</text><text class="b1-income-val">¥{{ num(stats?.totalStationIncome).toLocaleString() }}</text></view>
            <view class="b1-income-row"><text class="b1-income-label">已结算</text><text class="b1-income-val">¥{{ num(stats?.settledAmount).toLocaleString() }}</text></view>
            <text class="b1-income-tip">结算由平台按自然月核算发起，明细见「订单与结算」</text>
          </view>

          <!-- 经营顾问建议（自包含·空/失败自动隐藏） -->
          <advisor-card role-type="STATION_OFFLINE_OWNER" />

          <!-- 经营功能 -->
          <view class="b1-sec"><text class="b1-sec-title">经营功能</text></view>
          <view class="b1-grid-fn">
            <view v-for="m in modules" :key="m.key" class="b1-fn" @tap="onModule(m)">
              <view class="b1-fn-icon"><app-icon :name="m.icon" :size="20" color="#C41E3A" /></view>
              <text class="b1-fn-label">{{ m.label }}</text>
            </view>
          </view>

          <!-- 今日排课 -->
          <template v-if="todayCourses.length">
            <view class="b1-sec"><text class="b1-sec-title">今日排课</text></view>
            <view v-for="c in todayCourses" :key="c.id" class="b1-course" @tap="goCheckin(c.id)">
              <view class="b1-course-info">
                <text class="b1-course-title">{{ c.title }}</text>
                <text class="b1-course-sub">{{ fmtCourseTime(c.startTime) }} · {{ c.location || '本驿站' }}</text>
              </view>
              <view class="b1-course-right">
                <text class="b1-course-count">已报名 <text class="b1-course-num">{{ c._count?.registrations ?? 0 }}</text> 人</text>
                <text class="b1-course-link">名单 ›</text>
              </view>
            </view>
          </template>

          <view class="b1-safe" />
        </view>
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
  offlineManageApi, stationStatusLabel, num, fmtCourseTime,
  type MyStation, type DashboardStats,
  type StockAlertItem, type PendingBookingItem, type UpcomingCourseItem,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const station = ref<MyStation | null>(null)
const stats = ref<DashboardStats | null>(null)
const showIncome = ref(false)

const stockAlerts = ref<StockAlertItem[]>([])
const pendingBookings = ref<PendingBookingItem[]>([])
const upcomingCourses = ref<UpcomingCourseItem[]>([])
const todoCount = computed(() => (todayCourses.value.length ? 1 : 0) + (pendingBookings.value.length ? 1 : 0) + (stockAlerts.value.length ? 1 : 0))

const todayCourses = computed(() => {
  const t = new Date()
  return upcomingCourses.value.filter((c) => {
    const d = new Date(c.startTime)
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  })
})
// 本月营收：≥1万折算「X.Xw」，否则整数（金色强调）
const revenueDisplay = computed(() => {
  const v = num(stats.value?.monthRevenue)
  return v >= 10000 ? (v / 10000).toFixed(1) + 'w' : String(Math.round(v))
})

// 经营功能宫格（已退役：开业指南 / 学员洞察 → 不再入口）
const modules = [
  { key: 'checkin', label: '扫码核销', icon: 'qr-code' },
  { key: 'courses', label: '课程排期', icon: 'calendar' },
  { key: 'roster', label: '招生名单', icon: 'users' },
  { key: 'teachers', label: '师资管理', icon: 'graduation-cap' },
  { key: 'products', label: '驿站商品', icon: 'shopping-bag' },
  { key: 'settlement', label: '订单结算', icon: 'wallet' },
  { key: 'brand', label: '品牌资料', icon: 'edit' },
  { key: 'events', label: '活动管理', icon: 'calendar-plus' },
  { key: 'calendar', label: '经营日历', icon: 'calendar-days' },
]

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const s = await offlineManageApi.getMyStation()
    station.value = s
    if (s) {
      const [dashboard, ...extras] = await Promise.allSettled([
        offlineManageApi.getDashboard(s.id),
        offlineManageApi.getStockAlerts(),
        offlineManageApi.getPendingBookings(),
        offlineManageApi.getUpcomingCourses(),
      ])
      if (dashboard.status === 'rejected') throw dashboard.reason
      stats.value = dashboard.value as DashboardStats
      const pick = <T,>(r: PromiseSettledResult<unknown>): T[] => (r.status === 'fulfilled' && Array.isArray(r.value) ? (r.value as T[]) : [])
      stockAlerts.value = pick<StockAlertItem>(extras[0])
      pendingBookings.value = pick<PendingBookingItem>(extras[1])
      upcomingCourses.value = pick<UpcomingCourseItem>(extras[2])
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

const sid = () => station.value?.id || ''
function onModule(m: { key: string }) {
  if (!station.value) return
  const id = sid()
  switch (m.key) {
    case 'checkin': navigateTo(`/offline/manage/checkin?stationId=${id}`); break
    case 'courses': navigateTo(`/offline/manage/courses?stationId=${id}`); break
    case 'roster': navigateTo(`/offline/manage/checkin?stationId=${id}`); break
    case 'teachers': navigateTo(`/offline/manage/teachers?stationId=${id}`); break
    case 'products': navigateTo(`/offline/manage/products?stationId=${id}`); break
    case 'brand': navigateTo('/pkg-offline/manage-brand/index'); break
    case 'settlement': navigateTo(`/pkg-offline/manage-settlement/index?stationId=${id}`); break
  }
}
function goCheckin(courseId?: string) {
  if (!station.value) return
  navigateTo(`/offline/manage/checkin?stationId=${sid()}${courseId ? '&courseId=' + courseId : ''}`)
}
function goTeachers() { if (station.value) navigateTo(`/offline/manage/teachers?stationId=${sid()}`) }
function goProducts() { if (station.value) navigateTo(`/offline/manage/products?stationId=${sid()}`) }
function goBrandHome() { if (station.value) navigateTo(`/pkg-offline/station-detail/index?id=${sid()}`) }
</script>

<style lang="scss" scoped>
.b1-page { height: 100vh; background: #F4F1EC; display: flex; flex-direction: column; }
.b1-body { flex: 1; height: 0; min-height: 0; }

.b1-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding-left: 40px; padding-right: 40px; }
.b1-state-text { font-size: 14px; color: #6b5d4f; }
.b1-state-sub { font-size: 12px; color: #999; text-align: center; line-height: 1.6; }
.spinner { width: 28px; height: 28px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.b1-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.b1-retry-text { font-size: 13px; color: #C41E3A; }

/* 朱红品牌头 */
.b1-topbar { background: linear-gradient(135deg, #C41E3A, #a5162e); padding-bottom: 20px; }
.b1-topbar-row { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.b1-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.b1-topbar-title { font-size: 18px; font-weight: 700; color: #fff; font-family: 'Songti SC', serif; }
.b1-store { margin: 8px 20px 0; padding: 13px; background: #fff; border-radius: 18px; display: flex; align-items: center; gap: 10px; box-shadow: 0 6px 20px rgba(140,20,40,0.18); }
.b1-store-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #efe9e0, #e4ddd0); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.b1-store-logo-img { width: 100%; height: 100%; }
.b1-store-info { flex: 1; min-width: 0; }
.b1-store-name-row { display: flex; align-items: center; gap: 6px; }
.b1-store-name { font-size: 16px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b1-store-status { font-size: 10px; font-weight: 600; border-radius: 6px; padding: 2px 7px; flex-shrink: 0; }
.b1-store-status.on { background: rgba(201,169,110,0.16); color: #a5843f; }
.b1-store-status.off { background: #f0ece5; color: #999; }
.b1-store-addr { display: block; font-size: 11px; color: #999; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.b1-store-preview { font-size: 11px; color: #C41E3A; flex-shrink: 0; }

.b1-main { padding: 6px 20px 40px; }
.b1-sec { display: flex; align-items: center; justify-content: space-between; margin: 18px 0 10px; }
.b1-sec-title { font-size: 16px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b1-sec-link { font-size: 11px; color: #C41E3A; }

.b1-todo { background: #fff; border-radius: 18px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); overflow: hidden; }
.b1-todo-row { display: flex; align-items: center; gap: 10px; padding: 14px; border-bottom: 1px solid #EDE9E2; }
.b1-todo-row:last-child { border-bottom: none; }
.b1-badge { min-width: 20px; height: 20px; padding: 0 6px; background: #C41E3A; color: #fff; border-radius: 999px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.b1-todo-text { flex: 1; min-width: 0; font-size: 12.5px; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.b1-todo-go { font-size: 11px; color: #C41E3A; flex-shrink: 0; }
.b1-todo-empty { background: #fff; border-radius: 18px; padding: 20px; text-align: center; font-size: 12.5px; color: #b0a89c; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }

.b1-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.b1-gitem { background: #fff; border-radius: 16px; padding: 16px 8px; text-align: center; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b1-num { display: block; font-size: 24px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b1-num.gold { color: #C9A96E; }
.b1-gitem-label { display: block; font-size: 11px; color: #999; margin-top: 3px; }

.b1-income { background: #fff; border-radius: 18px; padding: 14px 16px; margin-top: 12px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b1-income-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }
.b1-income-label { font-size: 13px; color: #6E6E73; }
.b1-income-val { font-size: 15px; font-weight: 700; color: #2C2C2C; }
.b1-income-tip { display: block; font-size: 11px; color: #b0a89c; margin-top: 6px; line-height: 1.6; }

.b1-grid-fn { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.b1-fn { background: #fff; border-radius: 16px; padding: 16px 6px; text-align: center; box-shadow: 0 2px 10px rgba(60,40,20,0.05); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.b1-fn-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(196,30,58,0.07); display: flex; align-items: center; justify-content: center; }
.b1-fn-label { font-size: 12.5px; color: #2C2C2C; font-weight: 600; }

.b1-course { background: #fff; border-radius: 18px; padding: 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b1-course-info { flex: 1; min-width: 0; }
.b1-course-title { display: block; font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b1-course-sub { display: block; font-size: 11px; color: #999; margin-top: 4px; }
.b1-course-right { text-align: right; flex-shrink: 0; }
.b1-course-count { font-size: 12px; color: #2C2C2C; }
.b1-course-num { color: #C41E3A; font-weight: 700; }
.b1-course-link { display: block; font-size: 11px; color: #C41E3A; margin-top: 2px; }
.b1-safe { height: 30px; }
</style>
