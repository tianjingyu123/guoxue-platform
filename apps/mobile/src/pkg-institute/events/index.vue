<!--
  I4 · 活动排期（书院研究院 V0 重构版）
  还原 V0 视觉稿 I4-events.html 态A：周历导航 + 按日期分组的实色日期块排期卡片。
  只重构模板与样式，数据接线（instituteApi.getEvents / 类型筛选 / 月历计算）保留原逻辑。
  报名后端缺口：仅「查看 / 即将开始」态，不做在线报名/付费。
-->
<template>
  <view class="page">
    <!-- 自绘导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="18" color="#2C2C2C" />
        </view>
        <text class="nav-title serif">活动排期</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <view class="wrap">
        <!-- 类型筛选 Tab -->
        <view class="tabs">
          <view
            v-for="t in eventTypes"
            :key="t.value"
            class="tab"
            :class="{ 'tab-on': selectedType === t.value }"
            @tap="selectedType = t.value"
          >
            <text class="tab-text" :class="{ 'tab-text-on': selectedType === t.value }">{{ t.label }}</text>
          </view>
        </view>

        <!-- 月份导航 -->
        <view class="month">
          <view class="month-nav" @tap="prevMonth"><text class="month-nav-t">‹ 上月</text></view>
          <text class="month-title serif">{{ calYear }} 年 {{ calMonth + 1 }} 月</text>
          <view class="month-nav" @tap="nextMonth"><text class="month-nav-t">下月 ›</text></view>
        </view>

        <!-- 周历行（当前周 · 有活动的日期显示圆点） -->
        <view class="week">
          <view
            v-for="d in weekDays"
            :key="d.key"
            class="day"
            :class="{ 'day-on': d.isToday }"
          >
            <text class="day-w" :class="{ 'day-w-on': d.isToday }">{{ d.weekLabel }}</text>
            <text class="day-n serif" :class="{ 'day-n-on': d.isToday }">{{ d.date }}</text>
            <view v-if="d.hasEvent" class="day-dot" :class="{ 'day-dot-on': d.isToday }" />
          </view>
        </view>

        <!-- 状态态 -->
        <view v-if="loading" class="state-box">
          <view class="spinner" />
          <text class="state-text">加载中…</text>
        </view>
        <view v-else-if="errMsg" class="state-box">
          <app-icon name="alert-circle" :size="40" color="#D3CCBF" />
          <text class="state-text">{{ errMsg }}</text>
          <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
        </view>
        <view v-else-if="filteredEvents.length === 0" class="empty">
          <app-icon name="calendar" :size="48" color="#D3CCBF" />
          <text class="empty-text">本月暂无相关活动排期</text>
        </view>

        <!-- 按日期分组的排期列表 -->
        <template v-else>
          <view v-for="g in groupedEvents" :key="g.key" class="group">
            <view class="daylabel">
              <text class="daylabel-d serif">{{ g.label }}</text>
              <text class="daylabel-c">· {{ g.events.length }} 场</text>
            </view>
            <view
              v-for="e in g.events"
              :key="e.id"
              class="ecard"
              @tap="goDetail(e.id)"
            >
              <!-- 实色日期块（按活动类型区分色） -->
              <view class="dateb" :class="'db-' + e.type.toLowerCase()">
                <text class="dateb-d serif">{{ dayOf(e.scheduleAt) }}</text>
                <text class="dateb-w">{{ weekOf(e.scheduleAt) }}</text>
              </view>
              <view class="ebody">
                <view class="etags">
                  <text class="etag" :class="'et-' + e.type.toLowerCase()">{{ eventTypeLabel[e.type] }}</text>
                  <text
                    class="estatus"
                    :style="{ color: eventStatusColor[e.status].color, background: eventStatusColor[e.status].bg }"
                  >{{ eventStatusLabel[e.status] }}</text>
                </view>
                <text class="etitle">{{ e.title }}</text>
                <text class="emeta">{{ timeOf(e.scheduleAt) }} · {{ placeOf(e) }}{{ e.lecturer ? (' · 主讲 ' + memberName(e.lecturer)) : '' }}</text>
                <text class="emeta">名额 {{ e.maxAttendees }} 人</text>
              </view>
              <app-icon name="chevron-right" :size="16" color="#C9C2B6" class="earrow" />
            </view>
          </view>
          <view class="loadmore"><text class="loadmore-t">—— 按日期排期展示 ——</text></view>
        </template>

        <view class="bottom-safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, eventTypeLabel, eventStatusLabel, eventStatusColor, memberName, fmtDate, type EventType, type InstituteEvent } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(52)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 52

// 类型筛选：只用真枚举 SALON/LIVE/COURSE
const eventTypes: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'SALON', label: '沙龙' },
  { value: 'LIVE', label: '直播' },
  { value: 'COURSE', label: '课程' },
]

const loading = ref(true)
const errMsg = ref('')
const events = ref<InstituteEvent[]>([])
const selectedType = ref<EventType | 'all'>('all')
const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth())

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    events.value = await instituteApi.getEvents()
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

// 类型筛选
const typeFiltered = computed(() =>
  events.value.filter((e) => selectedType.value === 'all' || e.type === selectedType.value),
)

// 当前月内的筛选结果
const filteredEvents = computed(() =>
  typeFiltered.value.filter((e) => {
    const d = new Date(e.scheduleAt)
    return !isNaN(d.getTime()) && d.getFullYear() === calYear.value && d.getMonth() === calMonth.value
  }),
)

// 按日期分组（升序）
const groupedEvents = computed(() => {
  const map = new Map<string, InstituteEvent[]>()
  for (const e of filteredEvents.value) {
    const key = fmtDate(e.scheduleAt)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, evs]) => {
      const d = new Date(key)
      return {
        key,
        label: `${d.getMonth() + 1} 月 ${d.getDate()} 日`,
        events: evs.sort((x, y) => new Date(x.scheduleAt).getTime() - new Date(y.scheduleAt).getTime()),
      }
    })
})

// 周历：以今天所在周（周一起）展示 7 天，有活动的日期标点
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const weekDays = computed(() => {
  const base = new Date(calYear.value, calMonth.value, 1)
  // 若为当前月，以今天为锚，否则以 1 号所在周为锚
  const anchor = (calYear.value === now.getFullYear() && calMonth.value === now.getMonth()) ? new Date(now) : base
  const day = anchor.getDay()
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - ((day + 6) % 7)) // 回退到本周一
  const eventDates = new Set(filteredEvents.value.map((e) => fmtDate(e.scheduleAt)))
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const key = fmtDate(d.toISOString())
    days.push({
      key,
      date: d.getDate(),
      weekLabel: WEEK_LABELS[d.getDay()],
      hasEvent: eventDates.has(key),
      isToday: d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(),
    })
  }
  return days
})

function prevMonth() {
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- } else calMonth.value--
}
function nextMonth() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ } else calMonth.value++
}

// 日期块 / 元信息辅助（均基于真实 scheduleAt）
function dayOf(s: string) {
  const d = new Date(s)
  return isNaN(d.getTime()) ? '--' : String(d.getDate())
}
function weekOf(s: string) {
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : '周' + WEEK_LABELS[d.getDay()]
}
function timeOf(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return '时间待定'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}
function placeOf(e: InstituteEvent) {
  if (e.type === 'LIVE') return e.location || '线上直播'
  return e.location || '地点待定'
}

function goDetail(id: string) {
  navigateTo('/institute/events/' + id)
}
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$gold: #C9A96E;
$ink: #2C2C2C;
$sub: #6E6E73;
$faint: #999999;
$line: #EDEAE4;

.page { min-height: 100vh; background: $paper; }
.serif { font-family: 'Songti SC', 'STSong', 'SimSun', serif; }

/* 自绘导航栏 */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: $paper; border-bottom: 2rpx solid $line; }
.nav-bar { height: 52px; display: flex; align-items: center; gap: 20rpx; padding: 0 36rpx; }
.nav-back { width: 60rpx; height: 60rpx; border-radius: 50%; background: #fff; border: 2rpx solid $line; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 34rpx; font-weight: 700; color: $ink; }

.scroll { height: 100vh; box-sizing: border-box; }
.wrap { padding: 32rpx 40rpx; }

/* 类型筛选 Tab */
.tabs { display: flex; gap: 16rpx; margin-bottom: 28rpx; }
.tab { flex: 1; height: 64rpx; border-radius: 999rpx; border: 2rpx solid $line; background: #fff; display: flex; align-items: center; justify-content: center; }
.tab-on { background: $red; border-color: $red; }
.tab-text { font-size: 24rpx; color: $sub; }
.tab-text-on { color: #fff; font-weight: 700; }

/* 月份导航 */
.month { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 28rpx; background: #fff; border: 2rpx solid $line; border-radius: 24rpx; margin-bottom: 24rpx; }
.month-nav { padding: 4rpx 8rpx; }
.month-nav-t { font-size: 22rpx; color: $faint; }
.month-title { font-size: 28rpx; font-weight: 700; color: $ink; }

/* 周历 */
.week { display: flex; gap: 10rpx; margin-bottom: 32rpx; }
.day { flex: 1; background: #fff; border: 2rpx solid $line; border-radius: 20rpx; padding: 16rpx 0; display: flex; flex-direction: column; align-items: center; }
.day-on { background: $red; border-color: $red; }
.day-w { font-size: 18rpx; color: $faint; }
.day-w-on { color: #fff; }
.day-n { font-size: 26rpx; color: $ink; margin-top: 4rpx; }
.day-n-on { color: #fff; }
.day-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: $red; margin-top: 6rpx; }
.day-dot-on { background: #fff; }

/* 日期分组标签 */
.group { margin-bottom: 8rpx; }
.daylabel { display: flex; align-items: baseline; gap: 8rpx; margin: 12rpx 0 20rpx; }
.daylabel-d { font-size: 26rpx; font-weight: 700; color: $ink; }
.daylabel-c { font-size: 22rpx; color: $faint; }

/* 排期卡片 */
.ecard { display: flex; align-items: center; gap: 24rpx; padding: 28rpx; margin-bottom: 24rpx; background: $card; border: 2rpx solid $line; border-radius: 36rpx; box-shadow: 0 8rpx 32rpx rgba(140,120,90,0.06); }
/* 实色日期块 */
.dateb { width: 96rpx; flex-shrink: 0; border-radius: 24rpx; text-align: center; padding: 16rpx 0; display: flex; flex-direction: column; align-items: center; }
.db-salon { background: linear-gradient(135deg, #C41E3A, #8f1327); }
.db-live { background: linear-gradient(135deg, #3a6ea5, #274d78); }
.db-course { background: linear-gradient(135deg, #C9A96E, #a5854a); }
.dateb-d { font-size: 38rpx; font-weight: 700; color: #fff; line-height: 1; }
.dateb-w { font-size: 18rpx; color: rgba(255,255,255,0.85); margin-top: 6rpx; }

.ebody { flex: 1; min-width: 0; }
.etags { display: flex; align-items: center; gap: 10rpx; margin-bottom: 8rpx; }
.etag { font-size: 18rpx; letter-spacing: 1rpx; border-radius: 8rpx; padding: 2rpx 12rpx; color: #fff; }
.et-salon { background: $red; }
.et-live { background: #3a6ea5; }
.et-course { background: $gold; }
.estatus { font-size: 18rpx; border-radius: 8rpx; padding: 2rpx 12rpx; }
.etitle { display: block; font-size: 28rpx; font-weight: 700; color: $ink; line-height: 1.4; margin-bottom: 8rpx; }
.emeta { display: block; font-size: 22rpx; color: $faint; line-height: 1.6; }
.earrow { flex-shrink: 0; }

.loadmore { text-align: center; padding: 20rpx 0; }
.loadmore-t { font-size: 22rpx; color: $faint; }

/* 状态态 */
.empty { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.empty-text { font-size: 26rpx; color: $faint; }
.state-box { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 24rpx; color: $faint; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #f0ece5; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 12rpx 40rpx; border: 2rpx solid $red; border-radius: 999rpx; }
.retry-text { font-size: 24rpx; color: $red; }
.bottom-safe { height: 48rpx; }
</style>
