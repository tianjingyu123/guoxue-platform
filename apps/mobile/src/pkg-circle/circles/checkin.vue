<template>
  <view class="ck-page">
    <!-- 顶部 -->
    <view class="ck-head" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="ck-nav">
        <view class="ck-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="36" color="#ffffff" /></view>
        <text class="ck-nav-title">共读签到</text>
        <view style="width: 72rpx" />
      </view>
      <!-- 统计 -->
      <view class="ck-stats">
        <view class="ck-stat"><text class="ck-stat-num">{{ streak }}</text><text class="ck-stat-label">连续签到</text></view>
        <view class="ck-stat"><text class="ck-stat-num">{{ totalCheckins }}</text><text class="ck-stat-label">累计签到</text></view>
        <view class="ck-stat"><text class="ck-stat-num">{{ checkinExp }}</text><text class="ck-stat-label">签到经验</text></view>
        <view class="ck-stat"><text class="ck-stat-num">#{{ rank || '-' }}</text><text class="ck-stat-label">圈内排名</text></view>
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="isLoading" class="ck-state"><text class="ck-state-t">加载中...</text></view>
    <view v-else-if="loadError" class="ck-state">
      <app-icon name="alert-circle" :size="72" color="#CCCCCC" />
      <text class="ck-state-t">加载失败</text>
      <view class="ck-retry" @tap="loadAll">重试</view>
    </view>

    <template v-else>
      <!-- 签到日历 -->
      <view class="ck-section">
        <view class="ck-cal">
          <view class="ck-cal-head">
            <text class="ck-cal-title">签到日历</text>
            <text class="ck-cal-range">{{ monthLabel }}</text>
          </view>
          <view class="ck-week">
            <text v-for="w in weekLabels" :key="w" class="ck-week-t">{{ w }}</text>
          </view>
          <view class="ck-cal-grid">
            <view v-for="(d, i) in calendarCells" :key="i" class="ck-cal-cell" :class="cellClass(d)">
              <app-icon v-if="d.signed" name="check" :size="24" color="#ffffff" />
              <text v-else-if="d.day">{{ d.day }}</text>
            </view>
          </view>
          <view class="ck-cal-legend">
            <view class="ck-legend-item"><view class="ck-dot" style="background:#52C41A" /><text class="ck-legend-t">已签到</text></view>
            <view class="ck-legend-item"><view class="ck-dot" style="background:#C41E3A" /><text class="ck-legend-t">今天</text></view>
            <view class="ck-legend-item"><view class="ck-dot" style="background:#F5F0E8" /><text class="ck-legend-t">未签到</text></view>
          </view>
        </view>
      </view>

      <!-- Tab -->
      <view class="ck-tabs-wrap">
        <view class="ck-tabs">
          <view v-for="t in tabs" :key="t.id" class="ck-tab" :class="{ on: activeTab === t.id }" @tap="activeTab = t.id">{{ t.label }}</view>
        </view>
      </view>

      <!-- 排行榜 -->
      <view v-if="activeTab === 'rank'" class="ck-section">
        <view v-if="rankList.length" class="ck-rank-card">
          <view v-for="(item, idx) in rankList" :key="item.userId" class="ck-rank-row" :class="{ noborder: idx === rankList.length - 1 }">
            <view class="ck-rank-no" :class="rankClass(idx + 1)">{{ idx + 1 }}</view>
            <image lazy-load class="ck-avatar" :src="item.avatar" mode="aspectFill" />
            <view class="ck-rank-info"><text class="ck-rank-name">{{ item.nickname }}</text><text class="ck-rank-total">Lv.{{ item.level }} {{ item.levelName }}</text></view>
            <view class="ck-rank-streak">
              <view class="ck-rank-flame"><app-icon name="flame" :size="28" color="#FF6B35" /><text class="ck-rank-num">{{ item.checkinStreak }}</text></view>
              <text class="ck-rank-lbl">连续天数</text>
            </view>
          </view>
        </view>
        <view v-else class="ck-empty"><app-icon name="trophy" :size="72" color="#E8E3DB" /><text class="ck-empty-t">暂无排行数据</text></view>
      </view>

      <!-- 我的签到记录 -->
      <view v-else class="ck-section">
        <view v-if="myDays.length" class="ck-col">
          <view v-for="(item, idx) in myDays" :key="idx" class="ck-rec">
            <view class="ck-rec-l"><app-icon name="check-circle" :size="28" color="#52C41A" /><text class="ck-rec-date">{{ item.date }}</text></view>
            <text class="ck-rec-exp">+{{ item.expGained }} 经验</text>
          </view>
        </view>
        <view v-else class="ck-empty"><app-icon name="calendar" :size="72" color="#E8E3DB" /><text class="ck-empty-t">本月还没有签到记录</text></view>
      </view>
    </template>

    <!-- 底部签到按钮 -->
    <view v-if="!isLoading && !loadError" class="ck-footer">
      <view v-if="checkedToday" class="ck-done-bar"><app-icon name="check-circle" :size="36" color="#52C41A" /><text class="ck-done-t">今日已签到</text></view>
      <view v-else class="ck-checkin-btn" :class="{ disabled: submitting }" @tap="doCheckin">
        <app-icon name="check-circle" :size="36" color="#ffffff" /><text class="ck-checkin-t">{{ submitting ? '签到中...' : '立即签到 (+10经验)' }}</text>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="showSuccess" class="ck-success-mask" @tap="showSuccess = false">
      <view class="ck-success" @tap.stop>
        <view class="ck-success-icon"><app-icon name="check-circle" :size="56" color="#ffffff" /></view>
        <text class="ck-success-title">签到成功!</text>
        <text class="ck-success-sub">连续签到 <text class="c-orange ck-bold">{{ streak }}</text> 天</text>
        <view class="ck-success-reward"><app-icon name="sparkles" :size="28" color="#C9A96E" /><text class="ck-sr-t">+{{ lastGain }} 经验</text></view>
        <view class="ck-success-btn" @tap="showSuccess = false">太棒了</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 圈子共读签到页 —— 真连 growth 后端
 * 顶部统计(连续/累计/经验/排名) + 本月签到日历 + 排行榜/我的记录Tab + 底部签到按钮(防重复)
 * 数据：GET /circles/:id/growth + GET /circles/:id/checkin/calendar；签到 POST /circles/:id/checkin
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { growthApi, type RankItem } from '@/lib/circle-growth-data'

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20
const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

const circleId = ref('')
const isLoading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const showSuccess = ref(false)
const lastGain = ref(0)

const streak = ref(0)
const totalCheckins = ref(0)
const checkinExp = ref(0)
const rank = ref(0)
const checkedToday = ref(false)
const month = ref('')          // YYYY-MM
const signedDates = ref<Set<string>>(new Set())
const todayStr = ref('')
const myDays = ref<{ date: string; expGained: number }[]>([])
const rankList = ref<RankItem[]>([])

const tabs = [
  { id: 'rank', label: '签到排行' },
  { id: 'my', label: '我的记录' },
] as const
const activeTab = ref<'rank' | 'my'>('rank')

const monthLabel = computed(() => {
  if (!month.value) return ''
  const [y, m] = month.value.split('-')
  return `${y}年${Number(m)}月`
})

// 日历格子（含月初空白补位）
const calendarCells = computed(() => {
  if (!month.value) return [] as { day: number | null; signed: boolean; isToday: boolean }[]
  const [y, m] = month.value.split('-').map(Number)
  const firstWeekday = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells: { day: number | null; signed: boolean; isToday: boolean }[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, signed: false, isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, signed: signedDates.value.has(ds), isToday: ds === todayStr.value })
  }
  return cells
})

function cellClass(d: { day: number | null; signed: boolean; isToday: boolean }) {
  if (!d.day) return 'empty'
  if (d.signed) return 'done'
  if (d.isToday) return 'today'
  return 'normal'
}
function rankClass(r: number) { return r === 1 ? 'r1' : r === 2 ? 'r2' : r === 3 ? 'r3' : 'rn' }

onLoad((query) => {
  circleId.value = (query?.id as string) || ''
  loadAll()
})

async function loadAll() {
  if (!circleId.value) { isLoading.value = false; loadError.value = true; return }
  isLoading.value = true
  loadError.value = false
  try {
    const [growth, cal] = await Promise.all([
      growthApi.growth(circleId.value),
      growthApi.calendar(circleId.value),
    ])
    streak.value = growth.me.checkinStreak
    checkinExp.value = growth.me.checkinExp
    rank.value = growth.me.rank
    // 排行按连续签到天数降序（签到场景更贴切）
    rankList.value = [...growth.leaderboard].sort((a, b) => b.checkinStreak - a.checkinStreak).slice(0, 20)

    month.value = cal.month
    todayStr.value = cal.today
    checkedToday.value = cal.checkedToday
    totalCheckins.value = cal.totalCheckins
    signedDates.value = new Set(cal.days.map((d) => d.date))
    myDays.value = [...cal.days].sort((a, b) => (a.date < b.date ? 1 : -1))
  } catch (e: any) {
    loadError.value = true
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

async function doCheckin() {
  if (submitting.value || checkedToday.value) return // 防重复提交
  submitting.value = true
  try {
    const res = await growthApi.checkin(circleId.value)
    if (res.alreadyChecked) {
      uni.showToast({ title: '今日已签到', icon: 'none' })
      checkedToday.value = true
    } else {
      lastGain.value = res.expGained
      showSuccess.value = true
    }
    await loadAll()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '签到失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.ck-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 180rpx; }
.c-orange { color: #FF6B35; } .ck-bold { font-weight: 700; }

.ck-head { background: linear-gradient(135deg, var(--brand), #E74C3C); padding-bottom: 40rpx; }
.ck-nav { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 32rpx 24rpx; }
.ck-nav-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; }
.ck-nav-title { font-size: 32rpx; font-weight: 600; color: #fff; }
.ck-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; padding: 0 32rpx; }
.ck-stat { text-align: center; }
.ck-stat-num { display: block; font-size: 40rpx; font-weight: 700; color: #fff; }
.ck-stat-label { display: block; font-size: 20rpx; color: rgba(255,255,255,0.8); margin-top: 4rpx; }

.ck-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 140rpx 0; gap: 24rpx; }
.ck-state-t { font-size: 28rpx; color: #999; }
.ck-retry { padding: 14rpx 48rpx; background: var(--brand); color: #fff; font-size: 26rpx; border-radius: 999rpx; }

.ck-section { padding: 32rpx 32rpx 0; }
.ck-cal { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.ck-cal-title { font-weight: 600; color: #2C2C2C; } .ck-cal-range { font-size: 24rpx; color: #999; }
.ck-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12rpx; margin-bottom: 12rpx; }
.ck-week-t { text-align: center; font-size: 20rpx; color: #999; }
.ck-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12rpx; }
.ck-cal-cell { aspect-ratio: 1; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 500; }
.ck-cal-cell.empty { background: transparent; }
.ck-cal-cell.done { background: #52C41A; color: #fff; }
.ck-cal-cell.today { background: var(--brand); color: #fff; }
.ck-cal-cell.normal { background: #F5F0E8; color: #999; }
.ck-cal-legend { display: flex; align-items: center; justify-content: center; gap: 32rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #F5F0E8; }
.ck-legend-item { display: flex; align-items: center; gap: 8rpx; }
.ck-dot { width: 24rpx; height: 24rpx; border-radius: 6rpx; } .ck-legend-t { font-size: 22rpx; color: #999; }

.ck-tabs-wrap { padding: 32rpx 32rpx 0; }
.ck-tabs { display: flex; gap: 8rpx; background: #fff; border-radius: 24rpx; padding: 8rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 26rpx; font-weight: 500; border-radius: 16rpx; color: #666; }
.ck-tab.on { background: var(--brand); color: #fff; }

.ck-rank-card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-rank-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; border-bottom: 1rpx solid #F5F0E8; }
.ck-rank-row.noborder { border-bottom: none; }
.ck-rank-no { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; flex-shrink: 0; }
.ck-rank-no.r1 { background: linear-gradient(135deg, #FACC15, #F97316); color: #fff; }
.ck-rank-no.r2 { background: linear-gradient(135deg, #D1D5DB, #9CA3AF); color: #fff; }
.ck-rank-no.r3 { background: linear-gradient(135deg, #FDBA74, #FB923C); color: #fff; }
.ck-rank-no.rn { background: #F5F0E8; color: #999; }
.ck-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; background: #F5F0E8; }
.ck-rank-info { flex: 1; min-width: 0; } .ck-rank-name { display: block; font-weight: 500; font-size: 28rpx; color: #2C2C2C; } .ck-rank-total { display: block; font-size: 22rpx; color: #999; }
.ck-rank-streak { text-align: right; }
.ck-rank-flame { display: flex; align-items: center; gap: 8rpx; justify-content: flex-end; } .ck-rank-num { font-weight: 700; color: #FF6B35; }
.ck-rank-lbl { font-size: 20rpx; color: #999; }

.ck-col { display: flex; flex-direction: column; gap: 16rpx; }
.ck-rec { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 16rpx; padding: 24rpx 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-rec-l { display: flex; align-items: center; gap: 16rpx; } .ck-rec-date { font-size: 28rpx; color: #2C2C2C; }
.ck-rec-exp { font-size: 24rpx; font-weight: 600; color: #52C41A; }
.ck-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.ck-empty-t { color: #999; font-size: 28rpx; margin-top: 24rpx; }

.ck-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); z-index: 50; }
.ck-done-bar { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 24rpx; background: #F5F0E8; border-radius: 999rpx; } .ck-done-t { color: #52C41A; font-weight: 500; }
.ck-checkin-btn { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 28rpx; background: linear-gradient(to right, var(--brand), #E74C3C); border-radius: 999rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); } .ck-checkin-t { color: #fff; font-weight: 500; }
.ck-checkin-btn.disabled { opacity: 0.6; }

.ck-success-mask { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
.ck-success { width: 85%; max-width: 600rpx; background: #fff; border-radius: 32rpx; padding: 48rpx; text-align: center; }
.ck-success-icon { width: 160rpx; height: 160rpx; margin: 0 auto 32rpx; border-radius: 50%; background: linear-gradient(135deg, #52C41A, #95DE64); display: flex; align-items: center; justify-content: center; }
.ck-success-title { display: block; font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 16rpx; }
.ck-success-sub { display: block; color: #666; margin-bottom: 32rpx; }
.ck-success-reward { display: inline-flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #FFF8E7; border-radius: 999rpx; margin-bottom: 48rpx; } .ck-sr-t { font-size: 26rpx; color: #C9A96E; }
.ck-success-btn { padding: 24rpx; background: linear-gradient(to right, var(--brand), #E74C3C); color: #fff; font-weight: 500; border-radius: 999rpx; }
</style>
