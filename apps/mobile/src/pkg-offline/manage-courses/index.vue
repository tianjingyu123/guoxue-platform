<template>
  <view class="b3-page">
    <!-- 自定义 navbar -->
    <view class="b3-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="b3-nav-row">
        <view class="b3-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="b3-nav-title">课程排期</text>
        <text class="b3-nav-action" @tap="openCreate">＋ 新建</text>
      </view>
      <!-- Tab -->
      <view class="b3-tabs">
        <view class="b3-tab" :class="{ on: tab === 'calendar' }" @tap="tab = 'calendar'">
          <text class="b3-tab-text">排期日历</text>
        </view>
        <view class="b3-tab" :class="{ on: tab === 'list' }" @tap="tab = 'list'">
          <text class="b3-tab-text">课程列表</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="b3-body">
      <!-- ========== 态①：排期日历 ========== -->
      <template v-if="tab === 'calendar'">
        <!-- 月历卡 -->
        <view class="b3-cal-card">
          <view class="b3-cal-head">
            <text class="b3-cal-nav" @tap="shiftMonth(-1)">‹ 上月</text>
            <text class="b3-cal-title serif">{{ monthTitle }}</text>
            <text class="b3-cal-nav" @tap="shiftMonth(1)">下月 ›</text>
          </view>
          <view class="b3-week">
            <text v-for="w in weekdays" :key="w" class="b3-week-cell">{{ w }}</text>
          </view>
          <view class="b3-grid">
            <view
              v-for="(cell, i) in cells"
              :key="i"
              class="b3-day"
              :class="{ on: cell && cell.key === selectedKey, dot: cell && cell.hasItems, empty: !cell }"
              @tap="cell && (selectedKey = cell.key)"
            >
              <text v-if="cell" class="b3-day-num">{{ cell.day }}</text>
            </view>
          </view>
        </view>

        <!-- 日历三态 -->
        <view v-if="calLoading" class="b3-state small"><view class="spinner" /><text class="b3-state-text">加载中…</text></view>
        <view v-else-if="calErr" class="b3-state small">
          <app-icon name="alert-circle" :size="36" color="#d3c9b6" /><text class="b3-state-text">{{ calErr }}</text>
          <view class="b3-retry" @tap="loadCalendar"><text class="b3-retry-text">重试</text></view>
        </view>

        <template v-else>
          <!-- 空态：本月无排课 -->
          <view v-if="monthEmpty" class="b3-empty">
            <app-icon name="calendar-check" :size="64" color="#d3c9b6" />
            <text class="b3-empty-title serif">本月还没有排课</text>
            <text class="b3-empty-sub">排课是经营的第一步：新建课程并设置时间后{{ '\n' }}学员即可在驿站页看到并报名</text>
            <view class="b3-empty-btn" @tap="openCreate"><text class="b3-empty-btn-text">＋ 新建第一节课</text></view>
          </view>

          <!-- 当日安排 -->
          <template v-else>
            <view class="b3-day-head">
              <text class="b3-day-title serif">{{ selectedTitle }} · {{ selectedItems.length }} 项安排</text>
            </view>
            <view v-if="selectedItems.length === 0" class="b3-day-empty">
              <app-icon name="calendar" :size="32" color="#d3c9b6" />
              <text class="b3-state-text">当日暂无安排</text>
              <view class="b3-retry" @tap="openCreateOn(selectedKey)"><text class="b3-retry-text">在这天排一节课</text></view>
            </view>
            <view v-else class="b3-day-list">
              <view v-for="(it, i) in selectedItems" :key="it.kind + '-' + it.id + '-' + i" class="b3-item-card">
                <view class="b3-item-top">
                  <view class="b3-item-titleRow">
                    <text class="b3-item-title serif">{{ it.title }}</text>
                    <text class="b3-tag" :class="itemTagClass(it)">{{ itemTagText(it) }}</text>
                  </view>
                  <view class="b3-item-icon" :class="it.kind"><app-icon :name="kindIcon(it.kind)" :size="14" :color="kindColor(it.kind)" /></view>
                </view>
                <text class="b3-item-sub">{{ kindLabel(it.kind) }} · {{ timeSpan(it) }}</text>
              </view>
            </view>
          </template>
        </template>
        <view class="b3-safe" />
      </template>

      <!-- ========== 态②：课程列表 ========== -->
      <template v-else>
        <view v-if="loading" class="b3-state"><view class="spinner" /><text class="b3-state-text">加载中…</text></view>
        <view v-else-if="errMsg" class="b3-state">
          <app-icon name="alert-circle" :size="40" color="#d3c9b6" /><text class="b3-state-text">{{ errMsg }}</text>
          <view class="b3-retry" @tap="loadCourses"><text class="b3-retry-text">重试</text></view>
        </view>

        <!-- 态④空态：无任何课程 -->
        <view v-else-if="courses.length === 0" class="b3-empty">
          <app-icon name="calendar-check" :size="64" color="#d3c9b6" />
          <text class="b3-empty-title serif">还没有课程</text>
          <text class="b3-empty-sub">排课是经营的第一步：新建课程并设置时间后{{ '\n' }}学员即可在驿站页看到并报名</text>
          <view class="b3-empty-btn" @tap="openCreate"><text class="b3-empty-btn-text">＋ 新建第一节课</text></view>
        </view>

        <template v-else>
          <!-- 状态筛选 chips -->
          <scroll-view scroll-x class="b3-filter-bar">
            <view class="b3-filter-inner">
              <view v-for="f in filters" :key="f.value" class="b3-chip" :class="{ on: filter === f.value }" @tap="filter = f.value">
                <text class="b3-chip-text">{{ f.label }} {{ f.count }}</text>
              </view>
            </view>
          </scroll-view>

          <view class="b3-list">
            <view v-for="c in filteredCourses" :key="c.id" class="b3-course-card">
              <view class="b3-course-top">
                <view class="b3-cover">
                  <image v-if="c.cover" :src="c.cover" class="b3-cover-img" mode="aspectFill" />
                  <app-icon v-else name="image" :size="22" color="#c5bba9" />
                </view>
                <view class="b3-course-main">
                  <view class="b3-course-titleRow">
                    <text class="b3-course-title serif">{{ c.title }}</text>
                    <text class="b3-tag" :class="auditTagClass(c.auditStatus)">{{ auditLabel(c.auditStatus) }}</text>
                  </view>
                  <text v-if="c.auditStatus === 'REJECTED' && c.auditReason" class="b3-reject">驳回原因：{{ c.auditReason }}</text>
                  <template v-else>
                    <text class="b3-course-meta">{{ priceText(c) }} · 限{{ c.maxStudents }}人 · {{ fmtCourseTime(c.startTime) }}</text>
                    <text class="b3-course-meta2">{{ c.teacher?.name || '未指定讲师' }} · 报名 <text class="b3-hl">{{ c._count?.registrations ?? 0 }}</text>/{{ c.maxStudents }}</text>
                  </template>
                </view>
              </view>
              <!-- 操作行 -->
              <view class="b3-course-actions">
                <template v-if="c.auditStatus === 'REJECTED'">
                  <view class="b3-abtn" @tap="onEdit(c)"><text class="b3-abtn-text">修改并重新提交</text></view>
                </template>
                <template v-else>
                  <view class="b3-abtn" @tap="onEdit(c)"><text class="b3-abtn-text">编辑</text></view>
                  <view class="b3-abtn" @tap="goRoster(c.id)"><text class="b3-abtn-text">名单</text></view>
                  <view v-if="c.circleId" class="b3-abtn" @tap="goCircle(c.circleId)"><text class="b3-abtn-text">同学圈</text></view>
                  <view v-else class="b3-abtn" :class="{ disabled: circleSubmittingId === c.id }" @tap="onCreateCircle(c)">
                    <text class="b3-abtn-text">{{ circleSubmittingId === c.id ? '创建中…' : '建同学圈' }}</text>
                  </view>
                </template>
              </view>
            </view>
          </view>
        </template>
        <view class="b3-safe" />
      </template>
    </scroll-view>

    <!-- 悬浮新建（日历态） -->
    <view v-if="tab === 'calendar' && !calLoading && !calErr" class="b3-fab" @tap="openCreate">
      <app-icon name="plus" :size="26" color="#fff" />
    </view>

    <!-- ========== 态③：新建/编辑课程弹层 ========== -->
    <view v-if="createOpen" class="b3-mask" @tap="closeSheet">
      <view class="b3-sheet" @tap.stop>
        <view class="b3-sheet-head">
          <text class="b3-sheet-title serif">{{ editingCourseId ? '编辑线下课' : '新建线下课' }}</text>
          <view @tap="closeSheet"><app-icon name="x" :size="20" color="#2C2C2C" /></view>
        </view>
        <scroll-view scroll-y class="b3-sheet-body">
          <view class="b3-field">
            <text class="b3-label">课程名称 <text class="req">*</text></text>
            <input v-model="form.title" class="b3-input" placeholder="如：八字命理入门班" placeholder-class="ph" />
          </view>
          <view class="b3-field">
            <text class="b3-label">课程简介</text>
            <textarea v-model="form.intro" class="b3-textarea" placeholder="课程内容简介" placeholder-class="ph" />
          </view>
          <view class="b3-field">
            <text class="b3-label">授课讲师</text>
            <picker mode="selector" :range="teacherNames" @change="onPickTeacher">
              <view class="b3-picker">
                <text class="b3-picker-text" :class="{ ph: !form.teacherId }">{{ form.teacherId ? selectedTeacherName : '从驿站师资选择（可选）' }}</text>
                <app-icon name="chevron-down" :size="16" color="#9ca3af" />
              </view>
            </picker>
          </view>
          <view class="b3-field-row">
            <view class="b3-field flex1">
              <text class="b3-label">价格（元）</text>
              <input v-model="form.price" type="number" class="b3-input" placeholder="0=免费" placeholder-class="ph" />
            </view>
            <view class="b3-field flex1">
              <text class="b3-label">名额 <text class="req">*</text></text>
              <input v-model="form.maxStudents" type="number" class="b3-input" placeholder="如 30" placeholder-class="ph" />
            </view>
          </view>
          <view class="b3-field">
            <text class="b3-label">上课日期 <text class="req">*</text></text>
            <picker mode="date" :value="form.date" :start="todayStr" @change="onDateChange">
              <view class="b3-picker"><text class="b3-picker-text" :class="{ ph: !form.date }">{{ form.date || '选择日期' }}</text><app-icon name="calendar" :size="16" color="#9ca3af" /></view>
            </picker>
          </view>
          <view class="b3-field-row">
            <view class="b3-field flex1">
              <text class="b3-label">开始时间 <text class="req">*</text></text>
              <picker mode="time" :value="form.startTime" @change="onStartChange">
                <view class="b3-picker"><text class="b3-picker-text">{{ form.startTime || '--:--' }}</text></view>
              </picker>
            </view>
            <view class="b3-field flex1">
              <text class="b3-label">结束时间 <text class="req">*</text></text>
              <picker mode="time" :value="form.endTime" @change="onEndChange">
                <view class="b3-picker"><text class="b3-picker-text">{{ form.endTime || '--:--' }}</text></view>
              </picker>
            </view>
          </view>
          <view class="b3-field">
            <text class="b3-label">上课地点 <text class="req">*</text></text>
            <input v-model="form.location" class="b3-input" placeholder="教室A / 大厅 · 详细上课地址" placeholder-class="ph" />
          </view>
          <view class="b3-tip"><app-icon name="info" :size="13" color="#C41E3A" /><text class="b3-tip-text">{{ editingCourseId ? '修改后将重新进入平台审核，审核通过后恢复上架' : '提交后进入平台审核，审核通过自动上架至学员端' }}</text></view>
          <view class="b3-submit" :class="{ disabled: !canSubmit || submitting }" @tap="submit">
            <text class="b3-submit-text">{{ submitting ? '提交中…' : editingCourseId ? '保存并重新审核' : '提交审核' }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineManageApi, fmtCourseTime, num,
  type OfflineCourse, type StationTeacherLite,
  type CalendarDays, type CalendarItem, type CalendarItemKind,
} from '@/lib/offline-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const pad = (n: number) => String(n).padStart(2, '0')
const nowDate = new Date()
const todayKey = `${nowDate.getFullYear()}-${pad(nowDate.getMonth() + 1)}-${pad(nowDate.getDate())}`
const todayStr = computed(() => todayKey)

const tab = ref<'calendar' | 'list'>('calendar')
const stationId = ref('')

// ========== 态②：课程列表 ==========
const loading = ref(true)
const errMsg = ref('')
const courses = ref<OfflineCourse[]>([])
const teachers = ref<StationTeacherLite[]>([])
const filter = ref<'all' | 'APPROVED' | 'PENDING' | 'REJECTED'>('all')

const filters = computed(() => [
  { value: 'all' as const, label: '全部', count: courses.value.length },
  { value: 'APPROVED' as const, label: '已上架', count: countBy('APPROVED') },
  { value: 'PENDING' as const, label: '审核中', count: countBy('PENDING') },
  { value: 'REJECTED' as const, label: '已驳回', count: countBy('REJECTED') },
])
function countBy(s: string) { return courses.value.filter((c) => c.auditStatus === s).length }
const filteredCourses = computed(() =>
  filter.value === 'all' ? courses.value : courses.value.filter((c) => c.auditStatus === filter.value))

function auditLabel(s: string) { return s === 'APPROVED' ? '已上架' : s === 'REJECTED' ? '已驳回' : '审核中' }
function auditTagClass(s: string) { return s === 'APPROVED' ? 'up' : s === 'REJECTED' ? 'rej' : '' }
function priceText(c: OfflineCourse) { return num(c.price) === 0 ? '免费' : '¥' + formatPrice(c.price) }

async function loadCourses() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    const [cs, ts] = await Promise.all([
      offlineManageApi.getManageCourses(stationId.value),
      offlineManageApi.getStationTeachers(stationId.value).catch(() => []),
    ])
    courses.value = cs
    teachers.value = ts
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// ========== 态①：排期日历 ==========
const calLoading = ref(true)
const calErr = ref('')
const calYear = ref(nowDate.getFullYear())
const calMonth = ref(nowDate.getMonth() + 1) // 1-12
const days = ref<CalendarDays>({})
const selectedKey = ref(todayKey)

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const monthKey = computed(() => `${calYear.value}-${pad(calMonth.value)}`)
const monthTitle = computed(() => `${calYear.value} 年 ${calMonth.value} 月`)

interface Cell { day: number; key: string; hasItems: boolean }
const cells = computed<(Cell | null)[]>(() => {
  const first = new Date(calYear.value, calMonth.value - 1, 1)
  // 周一为起始列：JS getDay 周日=0，转成周一=0…周日=6
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const out: (Cell | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${monthKey.value}-${pad(d)}`
    const items = days.value[key] || []
    out.push({ day: d, key, hasItems: items.length > 0 })
  }
  return out
})
const monthEmpty = computed(() => Object.keys(days.value).some((k) => k.startsWith(monthKey.value)) === false)

const selectedItems = computed<CalendarItem[]>(() => {
  const items = days.value[selectedKey.value] || []
  return [...items].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
})
const selectedTitle = computed(() => {
  const parts = selectedKey.value.split('-').map(Number)
  const dow = weekdays[(new Date(parts[0], parts[1] - 1, parts[2]).getDay() + 6) % 7]
  return `${parts[1]}月${parts[2]}日(${dow})${selectedKey.value === todayKey ? '·今天' : ''}`
})

async function loadCalendar() {
  calLoading.value = true
  calErr.value = ''
  try {
    days.value = await offlineManageApi.getCalendar(monthKey.value)
  } catch (e) {
    const msg = (e as Error)?.message
    calErr.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败')
    days.value = {}
  } finally {
    calLoading.value = false
  }
}
function shiftMonth(delta: number) {
  let m = calMonth.value + delta
  let y = calYear.value
  if (m < 1) { m = 12; y -= 1 }
  if (m > 12) { m = 1; y += 1 }
  calMonth.value = m
  calYear.value = y
  selectedKey.value = monthKey.value === todayKey.slice(0, 7) ? todayKey : `${monthKey.value}-01`
  loadCalendar()
}

function kindIcon(k: CalendarItemKind): string {
  return k === 'course' ? 'graduation-cap' : k === 'event' ? 'sparkles' : 'users'
}
function kindColor(k: CalendarItemKind): string {
  return k === 'course' ? '#C41E3A' : k === 'event' ? '#C9A96E' : '#6E6E73'
}
function kindLabel(k: CalendarItemKind): string {
  return k === 'course' ? '课程' : k === 'event' ? '活动' : '讲师预约'
}
function timeSpan(it: CalendarItem): string {
  const fmt = (s?: string | null) => {
    if (!s) return ''
    const d = new Date(s)
    return isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const a = fmt(it.startTime)
  const b = fmt(it.endTime)
  return a && b ? `${a}–${b}` : a || '全天'
}
const STATUS_TEXT: Record<string, string> = {
  DRAFT: '草稿', PUBLISHED: '已上架', CANCELLED: '已取消', FINISHED: '已结束',
  PENDING: '审核中', APPROVED: '已上架', REJECTED: '已驳回', CONFIRMED: '已确认',
}
function itemTagText(it: CalendarItem): string { return it.status ? STATUS_TEXT[it.status] || '' : '' }
function itemTagClass(it: CalendarItem): string {
  return it.status === 'PUBLISHED' || it.status === 'APPROVED' || it.status === 'CONFIRMED' ? 'up'
    : it.status === 'CANCELLED' || it.status === 'REJECTED' ? 'rej' : ''
}

// ========== 创建课程表单（沿用 createCourse·返回 PENDING） ==========
const createOpen = ref(false)
const editingCourseId = ref('')
const submitting = ref(false)
const form = ref({ title: '', intro: '', teacherId: '', price: '', maxStudents: '', date: '', startTime: '09:00', endTime: '17:00', location: '' })

const teacherNames = computed(() => teachers.value.map((t) => t.name))
const selectedTeacherName = computed(() => teachers.value.find((t) => t.id === form.value.teacherId)?.name || '')
const canSubmit = computed(() => !!form.value.title && !!form.value.maxStudents && !!form.value.date && !!form.value.startTime && !!form.value.endTime && !!form.value.location)

function openCreate() { openCreateOn(todayStr.value) }
function openCreateOn(dateKey: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : todayStr.value
  editingCourseId.value = ''
  form.value = { title: '', intro: '', teacherId: '', price: '', maxStudents: '', date: d, startTime: '09:00', endTime: '17:00', location: '' }
  createOpen.value = true
}
function closeSheet() { createOpen.value = false; editingCourseId.value = '' }
function onPickTeacher(e: { detail: { value: number } }) { form.value.teacherId = teachers.value[Number(e.detail.value)]?.id || '' }
function onDateChange(e: { detail: { value: string } }) { form.value.date = e.detail.value }
function onStartChange(e: { detail: { value: string } }) { form.value.startTime = e.detail.value }
function onEndChange(e: { detail: { value: string } }) { form.value.endTime = e.detail.value }

async function submit() {
  if (!canSubmit.value || submitting.value) return
  if (form.value.endTime <= form.value.startTime) {
    uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      title: form.value.title,
      intro: form.value.intro || undefined,
      teacherId: form.value.teacherId || undefined,
      price: Number(form.value.price) || 0,
      maxStudents: Number(form.value.maxStudents),
      startTime: `${form.value.date}T${form.value.startTime}:00`,
      endTime: `${form.value.date}T${form.value.endTime}:00`,
      location: form.value.location,
    }
    const isEdit = !!editingCourseId.value
    if (isEdit) await offlineManageApi.updateCourse(editingCourseId.value, payload)
    else await offlineManageApi.createCourse({ stationId: stationId.value, ...payload })
    uni.showToast({ title: isEdit ? '已修改，待重新审核' : '已提交，待审核', icon: 'success' })
    closeSheet()
    await Promise.all([loadCourses(), loadCalendar()])
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || (editingCourseId.value ? '修改失败' : '创建失败'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function onEdit(c: OfflineCourse) {
  if ((c._count?.registrations ?? 0) > 0) {
    uni.showToast({ title: '已有学员报名，为保护学员权益不可编辑', icon: 'none' })
    return
  }
  const start = new Date(c.startTime)
  const end = new Date(c.endTime)
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    uni.showToast({ title: '课程已开课或已结束，不可编辑', icon: 'none' })
    return
  }
  editingCourseId.value = c.id
  form.value = {
    title: c.title, intro: c.intro || '', teacherId: c.teacherId || '', price: String(num(c.price)),
    maxStudents: String(c.maxStudents),
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    location: c.location,
  }
  createOpen.value = true
}

function goRoster(courseId: string) {
  navigateTo(`/offline/manage/checkin?stationId=${stationId.value}&courseId=${courseId}`)
}

// ===== 课后同学圈（一键建圈·幂等） =====
const circleSubmittingId = ref('')
function goCircle(circleId?: string | null) {
  if (circleId) navigateTo(`/pkg-circle/circles/detail?id=${circleId}`)
}
function onCreateCircle(c: OfflineCourse) {
  if (circleSubmittingId.value) return
  uni.showModal({
    title: '创建课程同学圈',
    content: `将为《${c.title}》创建免费同学圈，报名学员可加入交流。确认创建？`,
    confirmText: '创建',
    cancelText: '再想想',
    success: (res) => { if (res.confirm) createCircle(c) },
  })
}
async function createCircle(c: OfflineCourse) {
  if (circleSubmittingId.value) return
  circleSubmittingId.value = c.id
  try {
    const d = await offlineManageApi.createStudyCircle(c.id)
    const target = courses.value.find((x) => x.id === c.id)
    if (target) target.circleId = d.circleId
    uni.showToast({ title: '同学圈已创建', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    circleSubmittingId.value = ''
  }
}

onLoad((q) => {
  stationId.value = q && q.stationId ? String(q.stationId) : ''
  loadCourses()
  loadCalendar()
})
onShow(() => { if (stationId.value) { loadCourses(); loadCalendar() } })
</script>

<style lang="scss" scoped>
.b3-page { height: 100vh; background: #F4F1EC; display: flex; flex-direction: column; }
.serif { font-family: 'Songti SC', 'STSong', serif; }

/* navbar + tabs */
.b3-nav { background: #F4F1EC; }
.b3-nav-row { height: 46px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; position: relative; }
.b3-nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -6px; }
.b3-nav-title { position: absolute; left: 0; right: 0; text-align: center; font-size: 16px; font-weight: 600; color: #2C2C2C; pointer-events: none; }
.b3-nav-action { font-size: 13px; font-weight: 600; color: #C41E3A; z-index: 1; }
.b3-tabs { display: flex; }
.b3-tab { flex: 1; text-align: center; padding: 12px 0; position: relative; }
.b3-tab-text { font-size: 14px; color: #6E6E73; }
.b3-tab.on .b3-tab-text { color: #C41E3A; font-weight: 700; }
.b3-tab.on::after { content: ''; position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: 26px; height: 2.5px; border-radius: 2px; background: #C41E3A; }

.b3-body { flex: 1; height: 0; min-height: 0; }

/* 通用态 */
.b3-state { padding: 90px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.b3-state.small { padding: 40px 40px; }
.b3-state-text { font-size: 13px; color: #999; }
.spinner { width: 28px; height: 28px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.b3-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.b3-retry-text { font-size: 13px; color: #C41E3A; }

/* 空态 */
.b3-empty { padding: 56px 30px 40px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.b3-empty-title { font-size: 18px; font-weight: 700; color: #2C2C2C; margin-top: 18px; }
.b3-empty-sub { font-size: 13px; color: #6E6E73; line-height: 1.7; margin-top: 10px; white-space: pre-line; }
.b3-empty-btn { margin-top: 22px; padding: 12px 26px; background: #C41E3A; border-radius: 999px; box-shadow: 0 8px 22px rgba(196,30,58,0.28); }
.b3-empty-btn-text { font-size: 14px; font-weight: 700; color: #fff; }

/* ===== 态①日历 ===== */
.b3-cal-card { margin: 14px 20px 0; background: #FFF; border-radius: 18px; padding: 14px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b3-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.b3-cal-nav { font-size: 11px; color: #999; padding: 4px 6px; }
.b3-cal-title { font-size: 15px; font-weight: 700; color: #2C2C2C; }
.b3-week { display: flex; }
.b3-week-cell { width: calc(100% / 7); text-align: center; font-size: 10px; color: #999; padding: 5px 0; }
.b3-grid { display: flex; flex-wrap: wrap; }
.b3-day { width: calc(100% / 7); height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; position: relative; }
.b3-day.empty { pointer-events: none; }
.b3-day-num { font-size: 13px; color: #2C2C2C; }
.b3-day.on { background: #C41E3A; }
.b3-day.on .b3-day-num { color: #fff; font-weight: 600; }
.b3-day.dot::after { content: ''; position: absolute; left: 50%; bottom: 4px; width: 4px; height: 4px; border-radius: 50%; background: #C9A96E; transform: translateX(-50%); }
.b3-day.on.dot::after { background: #fff; }

.b3-day-head { margin: 18px 20px 10px; }
.b3-day-title { font-size: 15px; font-weight: 700; color: #2C2C2C; }
.b3-day-empty { margin: 0 20px; padding: 36px 0; background: #FFF; border-radius: 18px; display: flex; flex-direction: column; align-items: center; gap: 10px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b3-day-list { margin: 0 20px; display: flex; flex-direction: column; gap: 12px; }
.b3-item-card { background: #FFF; border-radius: 18px; padding: 14px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b3-item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.b3-item-titleRow { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.b3-item-title { font-size: 15px; font-weight: 700; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.b3-item-icon { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.b3-item-icon.course { background: rgba(196,30,58,0.08); }
.b3-item-icon.event { background: rgba(201,169,110,0.14); }
.b3-item-icon.booking { background: #f0ece5; }
.b3-item-sub { display: block; font-size: 11px; color: #999; margin-top: 5px; }

/* ===== 态②列表 ===== */
.b3-filter-bar { margin: 14px 0 0; white-space: nowrap; }
.b3-filter-inner { display: inline-flex; align-items: center; gap: 7px; padding: 0 20px; }
.b3-chip { border: 1px solid #EDE9E2; border-radius: 999px; padding: 4px 12px; background: #FFF; }
.b3-chip.on { background: #C41E3A; border-color: #C41E3A; }
.b3-chip-text { font-size: 11px; color: #6E6E73; }
.b3-chip.on .b3-chip-text { color: #fff; }

.b3-list { padding: 14px 20px 0; display: flex; flex-direction: column; gap: 12px; }
.b3-course-card { background: #FFF; border-radius: 18px; padding: 14px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.b3-course-top { display: flex; align-items: flex-start; gap: 11px; }
.b3-cover { width: 112px; aspect-ratio: 16 / 10; flex-shrink: 0; background: #efe9e0; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.b3-cover-img { width: 100%; height: 100%; }
.b3-course-main { flex: 1; min-width: 0; }
.b3-course-titleRow { display: flex; align-items: center; gap: 8px; }
.b3-course-title { font-size: 15px; font-weight: 700; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.b3-course-meta { display: block; font-size: 11px; color: #999; margin-top: 5px; }
.b3-course-meta2 { display: block; font-size: 11px; color: #999; margin-top: 3px; }
.b3-hl { color: #C41E3A; font-weight: 700; }
.b3-reject { display: block; font-size: 11px; color: #C41E3A; line-height: 1.5; margin-top: 5px; }
.b3-course-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.b3-abtn { flex: 1; min-width: 64px; padding: 8px 0; border: 1px solid #C41E3A; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.b3-abtn.disabled { opacity: 0.5; }
.b3-abtn-text { font-size: 12px; color: #C41E3A; font-weight: 600; }

/* tag 通用 */
.b3-tag { flex-shrink: 0; font-size: 11px; border: 1px solid #EDE9E2; color: #6E6E73; border-radius: 999px; padding: 2px 10px; }
.b3-tag.up { background: rgba(201,169,110,0.14); color: #a5843f; border-color: transparent; }
.b3-tag.rej { background: rgba(196,30,58,0.08); color: #C41E3A; border-color: transparent; }

/* FAB */
.b3-fab { position: fixed; right: 20px; bottom: 34px; width: 54px; height: 54px; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 22px rgba(196,30,58,0.4); z-index: 40; }

.b3-safe { height: 30px; }

/* ===== 态③表单弹层 ===== */
.b3-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.b3-sheet { width: 100%; background: #FFF; border-radius: 22px 22px 0 0; max-height: 86vh; display: flex; flex-direction: column; }
.b3-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #EDE9E2; }
.b3-sheet-title { font-size: 16px; font-weight: 700; color: #2C2C2C; }
.b3-sheet-body { padding: 16px 20px 20px; }
.b3-field { margin-bottom: 14px; }
.b3-field-row { display: flex; gap: 12px; }
.flex1 { flex: 1; }
.b3-label { display: block; font-size: 13px; color: #6E6E73; margin-bottom: 6px; }
.req { color: #C41E3A; }
.b3-input { height: 44px; padding: 0 14px; background: #F4F1EC; border: 1.5px solid #EDE9E2; border-radius: 12px; font-size: 14px; color: #2C2C2C; }
.b3-textarea { width: 100%; box-sizing: border-box; min-height: 72px; padding: 12px 14px; background: #F4F1EC; border: 1.5px solid #EDE9E2; border-radius: 12px; font-size: 14px; color: #2C2C2C; }
.b3-picker { height: 44px; padding: 0 14px; background: #F4F1EC; border: 1.5px solid #EDE9E2; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; }
.b3-picker-text { font-size: 14px; color: #2C2C2C; }
.ph { color: #999; }
.b3-tip { display: flex; align-items: center; gap: 6px; margin: 4px 0 16px; }
.b3-tip-text { font-size: 12px; color: #C41E3A; }
.b3-submit { height: 48px; background: #C41E3A; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.b3-submit.disabled { background: #d9b3ba; }
.b3-submit-text { font-size: 15px; color: #fff; font-weight: 700; }
</style>
