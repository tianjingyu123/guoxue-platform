<template>
  <view class="b5-page">
    <!-- 顶部导航 -->
    <view class="b5-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="b5-nav">
        <view class="b5-icon-btn" @tap="onBack"><app-icon name="chevron-left" :size="22" color="#2C2C2C" /></view>
        <text class="b5-nav-title">{{ view === 'schedule' && current ? current.name + ' · 排期' : '师资管理' }}</text>
        <view class="b5-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="b5-body">
      <view v-if="loading" class="b5-state"><view class="spinner" /><text class="b5-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="b5-state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" /><text class="b5-state-text">{{ errMsg }}</text>
        <view class="b5-retry" @tap="load"><text class="b5-retry-text">重试</text></view>
      </view>

      <!-- ============ 态①：师资列表 ============ -->
      <template v-else-if="view === 'list'">
        <view class="b5-main">
          <view class="b5-pick-btn" @tap="openPool">
            <app-icon name="plus" :size="17" color="#fff" />
            <text class="b5-pick-btn-text">从平台签约讲师库选用讲师</text>
          </view>
          <text class="b5-pick-tip">签约讲师由「书院研究院」考核签约后进入平台讲师库</text>

          <!-- 待确认预约提醒 -->
          <view v-if="pendingCount > 0" class="b5-pending-card" @tap="goFirstPending">
            <text class="b5-pending-text"><text class="b5-dot">●</text> {{ pendingCount }} 条讲师预约待确认</text>
            <text class="b5-pending-go">去处理 ›</text>
          </view>

          <view class="b5-sec-title">已入驻师资 <text class="b5-sec-sub">· {{ teachers.length }} 位</text></view>

          <view v-if="teachers.length === 0" class="b5-empty"><text>本站暂无讲师，点上方按钮从签约库选用</text></view>
          <view v-else>
            <view v-for="t in teachers" :key="t.id" class="b5-card" @tap="openSchedule(t)" @longpress="onLongPress">
              <image v-if="t.avatar" :src="t.avatar" class="b5-avatar-img" mode="aspectFill" />
              <view v-else class="b5-avatar">{{ firstChar(t.name) }}</view>
              <view class="b5-card-info">
                <view class="b5-name-row">
                  <text class="b5-name">{{ t.name }}</text>
                  <text class="b5-tag" :class="t.sourceUserId ? 'red' : 'plain'">{{ t.sourceUserId ? '签约讲师' : '驿站讲师' }}</text>
                </view>
                <text class="b5-card-sub">{{ specText(t) }}{{ bookingCountText(t.id) }}</text>
              </view>
              <text class="b5-card-arrow">排期 ›</text>
            </view>
            <text class="b5-list-foot">编辑对外资料 / 移出驿站需联系平台运营处理（讲师主数据归研究院统一维护）。</text>
          </view>
          <view class="b5-safe" />
        </view>
      </template>

      <!-- ============ 态③：讲师排期与预约 ============ -->
      <template v-else-if="view === 'schedule' && current">
        <view class="b5-main">
          <view class="b5-card static">
            <image v-if="current.avatar" :src="current.avatar" class="b5-avatar-img" mode="aspectFill" />
            <view v-else class="b5-avatar">{{ firstChar(current.name) }}</view>
            <view class="b5-card-info">
              <view class="b5-name-row">
                <text class="b5-name">{{ current.name }}</text>
                <text class="b5-tag" :class="current.sourceUserId ? 'red' : 'plain'">{{ current.sourceUserId ? '签约讲师' : '驿站讲师' }}</text>
              </view>
              <text class="b5-card-sub">{{ specText(current) }}</text>
            </view>
          </view>

          <view class="b5-sec-title">预约记录 <text class="b5-sec-sub">· {{ bookings.length }} 条</text></view>
          <view v-if="bookingsLoading" class="b5-empty"><text>加载预约中…</text></view>
          <view v-else-if="bookings.length === 0" class="b5-empty"><text>暂无预约记录</text></view>
          <view v-else>
            <view v-for="b in bookings" :key="b.id" class="b5-booking">
              <view class="b5-booking-top">
                <text class="b5-booking-date">{{ fmtBookingDate(b.bookingDate) }}</text>
                <text class="b5-booking-status" :style="statusStyle(b.status)">{{ statusLabel(b.status) }}</text>
              </view>
              <text v-if="b.remark" class="b5-booking-remark">{{ b.remark }}</text>
              <text v-else-if="b.courseId" class="b5-booking-remark">关联课程排期</text>
              <view v-if="b.status === 'PENDING'" class="b5-booking-actions">
                <view class="b5-btn b5-btn-primary" @tap="onConfirm(b)"><text class="b5-btn-text">确认预约</text></view>
                <view class="b5-btn b5-btn-o" @tap="onCancelBooking(b)"><text class="b5-btn-o-text">取消</text></view>
              </view>
            </view>
          </view>
          <text class="b5-list-foot">发起新预约请在「课程排期管理」中为课程指定授课讲师；可约时段由讲师本人维护。</text>
          <view class="b5-safe" />
        </view>
      </template>
    </scroll-view>

    <!-- 签约讲师库半屏弹窗 -->
    <view v-if="poolOpen" class="b5-mask" @tap="poolOpen = false">
      <view class="b5-sheet" @tap.stop>
        <view class="b5-sheet-handle" />
        <view class="b5-sheet-head">
          <text class="b5-sheet-title">平台签约讲师库</text>
          <view class="b5-sheet-close" @tap="poolOpen = false"><app-icon name="x" :size="20" color="#999" /></view>
        </view>
        <view class="b5-search">
          <app-icon name="search" :size="15" color="#bbb" />
          <input v-model="poolKeyword" class="b5-search-input" placeholder="搜索讲师姓名" placeholder-class="b5-ph" />
        </view>
        <scroll-view scroll-y class="b5-sheet-list">
          <view v-if="poolLoading" class="b5-empty"><text>加载签约讲师库…</text></view>
          <view v-else-if="filteredLecturers.length === 0" class="b5-empty"><text>没有匹配的签约讲师</text></view>
          <view v-for="l in filteredLecturers" :key="l.id" class="b5-card">
            <image v-if="l.user.avatar" :src="l.user.avatar" class="b5-avatar-img" mode="aspectFill" />
            <view v-else class="b5-avatar">{{ firstChar(l.user.nickname) }}</view>
            <view class="b5-card-info">
              <view class="b5-name-row">
                <text class="b5-name">{{ l.user.nickname || '签约讲师' }}</text>
                <text class="b5-tag gold">签约 · {{ levelLabel(l.lecturerLevel) }}</text>
              </view>
              <text class="b5-card-sub">已服务 {{ l.enrolledStations.length }} 家驿站{{ l.joinYear ? ' · ' + l.joinYear + '年入库' : '' }}</text>
            </view>
            <view v-if="isEnrolled(l)" class="b5-pick dis"><text>已入驻</text></view>
            <view v-else class="b5-pick" :class="{ dis: importingId === l.userId }" @tap="onImport(l)"><text>{{ importingId === l.userId ? '引入中' : '选用' }}</text></view>
          </view>
          <view style="height:20px" />
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  offlineManageApi, bookingStatusLabel, bookingStatusStyle,
  type StationTeacherLite, type SignedLecturer, type LecturerLevelStr, type TeacherBooking, type BookingStatus,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const teachers = ref<StationTeacherLite[]>([])
const lecturers = ref<SignedLecturer[]>([])
const pendingCount = ref(0)
const importingId = ref('')

const view = ref<'list' | 'schedule'>('list')
const current = ref<StationTeacherLite | null>(null)
const bookings = ref<TeacherBooking[]>([])
const bookingsLoading = ref(false)
const allBookings = ref<TeacherBooking[]>([])

const poolOpen = ref(false)
const poolLoading = ref(false)
const poolKeyword = ref('')

const LEVEL: Record<LecturerLevelStr, string> = { NONE: '普通', PREPARATORY: '预备', JUNIOR: '初级', SENIOR: '高级', SIGNED: '签约讲师' }
function levelLabel(l: LecturerLevelStr): string { return LEVEL[l] || '签约' }
function firstChar(name?: string): string { return (name || '师').trim().charAt(0) }
function specText(t: StationTeacherLite): string { return t.specialties.length ? t.specialties.join(' · ') : '国学讲师' }
function bookingCountText(teacherId: string): string {
  const pend = allBookings.value.filter((b) => b.teacherId === teacherId && b.status === 'PENDING').length
  return pend > 0 ? ` · ${pend} 条预约待确认` : ''
}
function statusLabel(s: string): string { return bookingStatusLabel[s as BookingStatus] || s }
function statusStyle(s: string) {
  const st = bookingStatusStyle[s as BookingStatus] || { color: '#6b7280', bg: '#f3f4f6' }
  return { color: st.color, background: st.bg }
}
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
function fmtBookingDate(s: string): string {
  const d = new Date(s); if (isNaN(d.getTime())) return s
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`
}

const filteredLecturers = computed(() => {
  const kw = poolKeyword.value.trim()
  if (!kw) return lecturers.value
  return lecturers.value.filter((l) => (l.user.nickname || '').includes(kw))
})
function isEnrolled(l: SignedLecturer): boolean {
  return l.enrolledStations.some((s) => s.stationId === stationId.value) ||
    teachers.value.some((t) => t.sourceUserId === l.userId)
}

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    const [ts, pend] = await Promise.all([
      offlineManageApi.getStationTeachers(stationId.value),
      offlineManageApi.getTeacherBookings(stationId.value).catch(() => [] as TeacherBooking[]),
    ])
    teachers.value = ts
    allBookings.value = pend
    pendingCount.value = pend.filter((b) => b.status === 'PENDING').length
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad((q) => { stationId.value = q && q.stationId ? String(q.stationId) : ''; load() })

async function openPool() {
  poolOpen.value = true
  if (lecturers.value.length === 0) {
    poolLoading.value = true
    try { lecturers.value = await offlineManageApi.getSignedLecturers() } catch { lecturers.value = [] } finally { poolLoading.value = false }
  }
}
async function onImport(l: SignedLecturer) {
  if (importingId.value) return
  uni.showModal({
    title: '选用讲师',
    content: `确认将「${l.user.nickname || '该签约讲师'}」引入本驿站师资库？`,
    confirmText: '确认选用',
    success: async (res) => {
      if (!res.confirm) return
      importingId.value = l.userId
      try {
        await offlineManageApi.createTeacherFromSigned(stationId.value, l.userId)
        uni.showToast({ title: '已入驻本驿站', icon: 'success' })
        poolOpen.value = false
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '选用失败', icon: 'none' })
      } finally { importingId.value = '' }
    },
  })
}

async function openSchedule(t: StationTeacherLite) {
  current.value = t
  view.value = 'schedule'
  bookingsLoading.value = true
  try { bookings.value = await offlineManageApi.getTeacherBookings(stationId.value, t.id) } catch { bookings.value = [] } finally { bookingsLoading.value = false }
}
function goFirstPending() {
  const firstPend = allBookings.value.find((b) => b.status === 'PENDING')
  if (!firstPend) return
  const t = teachers.value.find((x) => x.id === firstPend.teacherId)
  if (t) openSchedule(t)
}
async function onConfirm(b: TeacherBooking) {
  try {
    await offlineManageApi.confirmBooking(b.id)
    uni.showToast({ title: '已确认', icon: 'success' })
    await refreshSchedule()
  } catch (e) { uni.showToast({ title: (e as Error)?.message || '确认失败', icon: 'none' }) }
}
function onCancelBooking(b: TeacherBooking) {
  uni.showModal({
    title: '取消预约', content: '确定取消该讲师预约？', confirmText: '确定取消',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await offlineManageApi.cancelBooking(b.id)
        uni.showToast({ title: '已取消', icon: 'success' })
        await refreshSchedule()
      } catch (e) { uni.showToast({ title: (e as Error)?.message || '取消失败', icon: 'none' }) }
    },
  })
}
async function refreshSchedule() {
  if (current.value) {
    try { bookings.value = await offlineManageApi.getTeacherBookings(stationId.value, current.value.id) } catch { /* keep */ }
  }
  try {
    allBookings.value = await offlineManageApi.getTeacherBookings(stationId.value)
    pendingCount.value = allBookings.value.filter((b) => b.status === 'PENDING').length
  } catch { /* keep */ }
}
function onLongPress() {
  uni.showToast({ title: '讲师资料由研究院统一维护，如需调整请联系平台', icon: 'none' })
}
function onBack() {
  if (view.value === 'schedule') { view.value = 'list'; current.value = null; return }
  goBack()
}
</script>

<style lang="scss" scoped>
.b5-page { height: 100vh; background: #F4F1EC; display: flex; flex-direction: column; }
.b5-header { background: #F4F1EC; }
.b5-nav { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.b5-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.b5-nav-title { font-size: 16px; font-weight: 600; color: #2C2C2C; }
.b5-body { flex: 1; height: 0; min-height: 0; }
.b5-main { padding: 14px 20px 40px; }

.b5-state { padding-top: 90px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.b5-state-text { font-size: 13px; color: #999; }
.spinner { width: 28px; height: 28px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.b5-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.b5-retry-text { font-size: 13px; color: #C41E3A; }
.b5-empty { padding: 36px 0; text-align: center; font-size: 13px; color: #b0a89c; }

.b5-pick-btn { height: 50px; background: #C41E3A; border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.b5-pick-btn-text { font-size: 15px; font-weight: 700; color: #fff; }
.b5-pick-tip { display: block; text-align: center; font-size: 11px; color: #999; margin: 8px 0 16px; }

.b5-pending-card { background: rgba(196,30,58,0.05); border-radius: 18px; padding: 14px; display: flex; align-items: center; justify-content: space-between; }
.b5-pending-text { font-size: 12.5px; color: #2C2C2C; }
.b5-dot { color: #C41E3A; }
.b5-pending-go { font-size: 11px; color: #C41E3A; }

.b5-sec-title { font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; margin: 14px 0 10px; }
.b5-sec-sub { font-size: 11px; color: #999; font-weight: 400; }

.b5-card { background: #fff; border-radius: 18px; padding: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b5-card.static { box-shadow: none; }
.b5-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #efe9e0, #e4ddd0); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #8a7b63; font-family: 'Songti SC', serif; flex-shrink: 0; }
.b5-avatar-img { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
.b5-card-info { flex: 1; min-width: 0; }
.b5-name-row { display: flex; align-items: center; gap: 6px; }
.b5-name { font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b5-tag { font-size: 10px; border-radius: 999px; padding: 2px 9px; }
.b5-tag.red { background: rgba(196,30,58,0.08); color: #C41E3A; }
.b5-tag.gold { border: 1px solid #C9A96E; color: #a5843f; }
.b5-tag.plain { border: 1px solid #EDE9E2; color: #6E6E73; }
.b5-card-sub { display: block; font-size: 11px; color: #999; margin-top: 4px; }
.b5-card-arrow { font-size: 11px; color: #C41E3A; flex-shrink: 0; }
.b5-list-foot { display: block; font-size: 11px; color: #b0a89c; line-height: 1.8; padding: 0 4px; margin-top: 4px; }

.b5-booking { background: #fff; border-radius: 18px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b5-booking-top { display: flex; align-items: center; justify-content: space-between; }
.b5-booking-date { font-size: 13px; font-weight: 600; color: #2C2C2C; }
.b5-booking-status { font-size: 11px; padding: 3px 10px; border-radius: 999px; }
.b5-booking-remark { display: block; font-size: 11px; color: #999; margin-top: 6px; }
.b5-booking-actions { display: flex; gap: 10px; margin-top: 12px; }
.b5-btn { flex: 1; height: 38px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.b5-btn-primary { background: #C41E3A; }
.b5-btn-text { font-size: 13px; font-weight: 600; color: #fff; }
.b5-btn-o { background: #fff; border: 1px solid #C41E3A; }
.b5-btn-o-text { font-size: 13px; font-weight: 600; color: #C41E3A; }
.b5-safe { height: 30px; }

/* 签约库弹窗 */
.b5-mask { position: fixed; inset: 0; background: rgba(20,15,10,0.45); z-index: 100; display: flex; align-items: flex-end; }
.b5-sheet { width: 100%; max-height: 84%; background: #F4F1EC; border-radius: 24px 24px 0 0; padding: 12px 20px 0; display: flex; flex-direction: column; }
.b5-sheet-handle { width: 40px; height: 4px; border-radius: 2px; background: #ddd; margin: 4px auto 12px; }
.b5-sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.b5-sheet-title { font-size: 18px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b5-sheet-close { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.b5-search { display: flex; align-items: center; gap: 8px; border: 1px solid #EDE9E2; border-radius: 999px; padding: 9px 14px; background: #fff; margin-bottom: 14px; }
.b5-search-input { flex: 1; font-size: 13px; color: #2C2C2C; }
.b5-ph { color: #999; }
.b5-sheet-list { flex: 1; }
.b5-pick { border: 1.5px solid #C41E3A; border-radius: 999px; padding: 6px 16px; font-size: 12px; font-weight: 700; color: #C41E3A; flex-shrink: 0; }
.b5-pick.dis { border-color: #EDE9E2; color: #c3bbab; }
</style>
