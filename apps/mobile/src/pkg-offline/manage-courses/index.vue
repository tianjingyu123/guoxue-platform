<template>
  <view class="mc-page">
    <view class="mc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mc-nav">
        <view class="mc-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="mc-nav-title">课程管理</text>
        <view class="mc-icon-btn" @tap="openCreate"><app-icon name="plus" :size="22" color="#9a2e25" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="mc-body">
      <view v-if="loading" class="mc-state"><view class="spinner" /><text class="mc-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="mc-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" /><text class="mc-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="courses.length === 0" class="mc-state">
        <app-icon name="graduation-cap" :size="48" color="#d1d5db" /><text class="mc-state-text">还没有课程</text>
        <view class="retry-btn" @tap="openCreate"><text class="retry-text">创建第一门课程</text></view>
      </view>

      <view v-else class="mc-list">
        <view v-for="c in courses" :key="c.id" class="mc-card">
          <view class="mc-card-top">
            <text class="mc-card-title">{{ c.title }}</text>
            <text class="mc-audit" :style="auditStyle(c.auditStatus)">{{ auditLabel(c.auditStatus) }}</text>
          </view>
          <view class="mc-card-meta">
            <text class="mc-meta-item">{{ c.teacher?.name || '未指定讲师' }}</text>
            <text class="mc-meta-item">{{ fmtCourseTime(c.startTime) }}</text>
          </view>
          <view class="mc-card-foot">
            <view class="mc-foot-stat">
              <text class="mc-price">{{ num(c.price) === 0 ? '免费' : '¥' + num(c.price) }}</text>
              <text class="mc-reg">报名 {{ c._count?.registrations ?? 0 }}/{{ c.maxStudents }}</text>
            </view>
            <view class="mc-foot-actions">
              <view v-if="c.circleId" class="mc-reg-btn" @tap="goCircle(c.circleId)"><text class="mc-reg-btn-text">查看同学圈</text></view>
              <view v-else class="mc-reg-btn" :class="{ disabled: circleSubmittingId === c.id }" @tap="onCreateCircle(c)">
                <text class="mc-reg-btn-text">{{ circleSubmittingId === c.id ? '创建中…' : '建同学圈' }}</text>
              </view>
              <view class="mc-reg-btn" @tap="goCheckin(c.id)"><text class="mc-reg-btn-text">报名核销</text></view>
            </view>
          </view>
          <text v-if="c.auditStatus === 'REJECTED' && c.auditReason" class="mc-reject">驳回原因：{{ c.auditReason }}</text>
        </view>
      </view>
      <view class="mc-safe" />
    </scroll-view>

    <!-- 创建课程弹层 -->
    <view v-if="createOpen" class="mc-mask" @tap="createOpen = false">
      <view class="mc-sheet" @tap.stop>
        <view class="mc-sheet-head">
          <text class="mc-sheet-title">创建课程</text>
          <view @tap="createOpen = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <scroll-view scroll-y class="mc-sheet-body">
          <view class="mc-field">
            <text class="mc-label">课程标题 <text class="req">*</text></text>
            <input v-model="form.title" class="mc-input" placeholder="如：八字命理入门班" placeholder-class="ph" />
          </view>
          <view class="mc-field">
            <text class="mc-label">课程简介</text>
            <textarea v-model="form.intro" class="mc-textarea" placeholder="课程内容简介" placeholder-class="ph" />
          </view>
          <view class="mc-field">
            <text class="mc-label">授课讲师</text>
            <picker mode="selector" :range="teacherNames" @change="onPickTeacher">
              <view class="mc-picker"><text class="mc-picker-text">{{ form.teacherId ? selectedTeacherName : '选择驿站讲师（可选）' }}</text><app-icon name="chevron-down" :size="16" color="#9ca3af" /></view>
            </picker>
          </view>
          <view class="mc-field-row">
            <view class="mc-field flex1">
              <text class="mc-label">价格（元）</text>
              <input v-model="form.price" type="number" class="mc-input" placeholder="0=免费" placeholder-class="ph" />
            </view>
            <view class="mc-field flex1">
              <text class="mc-label">名额 <text class="req">*</text></text>
              <input v-model="form.maxStudents" type="number" class="mc-input" placeholder="如 30" placeholder-class="ph" />
            </view>
          </view>
          <view class="mc-field">
            <text class="mc-label">上课日期 <text class="req">*</text></text>
            <picker mode="date" :value="form.date" :start="todayStr" @change="onDateChange">
              <view class="mc-picker"><text class="mc-picker-text">{{ form.date || '选择日期' }}</text><app-icon name="calendar" :size="16" color="#9ca3af" /></view>
            </picker>
          </view>
          <view class="mc-field-row">
            <view class="mc-field flex1">
              <text class="mc-label">开始时间 <text class="req">*</text></text>
              <picker mode="time" :value="form.startTime" @change="onStartChange">
                <view class="mc-picker"><text class="mc-picker-text">{{ form.startTime || '--:--' }}</text></view>
              </picker>
            </view>
            <view class="mc-field flex1">
              <text class="mc-label">结束时间 <text class="req">*</text></text>
              <picker mode="time" :value="form.endTime" @change="onEndChange">
                <view class="mc-picker"><text class="mc-picker-text">{{ form.endTime || '--:--' }}</text></view>
              </picker>
            </view>
          </view>
          <view class="mc-field">
            <text class="mc-label">上课地点 <text class="req">*</text></text>
            <input v-model="form.location" class="mc-input" placeholder="详细上课地址" placeholder-class="ph" />
          </view>
          <view class="mc-tip"><app-icon name="info" :size="13" color="#9a2e25" /><text class="mc-tip-text">课程创建后需平台审核通过方可对学员展示</text></view>
          <view class="mc-submit" :class="{ disabled: !canSubmit || submitting }" @tap="submit">
            <text class="mc-submit-text">{{ submitting ? '提交中…' : '创建课程' }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { offlineManageApi, fmtCourseTime, num, type OfflineCourse, type StationTeacherLite } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const courses = ref<OfflineCourse[]>([])
const teachers = ref<StationTeacherLite[]>([])

const createOpen = ref(false)
const submitting = ref(false)
const form = ref({ title: '', intro: '', teacherId: '', price: '', maxStudents: '', date: '', startTime: '09:00', endTime: '17:00', location: '' })

const todayStr = computed(() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})
const teacherNames = computed(() => teachers.value.map((t) => t.name))
const selectedTeacherName = computed(() => teachers.value.find((t) => t.id === form.value.teacherId)?.name || '')
const canSubmit = computed(() => !!form.value.title && !!form.value.maxStudents && !!form.value.date && !!form.value.startTime && !!form.value.endTime && !!form.value.location)

function auditLabel(s: string) { return s === 'APPROVED' ? '已通过' : s === 'REJECTED' ? '已驳回' : '待审核' }
function auditStyle(s: string) {
  if (s === 'APPROVED') return { color: '#16a34a', background: '#f0fdf4' }
  if (s === 'REJECTED') return { color: '#dc2626', background: '#fef2f2' }
  return { color: '#ea580c', background: '#fff7ed' }
}

async function load() {
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
onLoad((q) => { stationId.value = q && q.stationId ? String(q.stationId) : ''; load() })

function openCreate() {
  form.value = { title: '', intro: '', teacherId: '', price: '', maxStudents: '', date: todayStr.value, startTime: '09:00', endTime: '17:00', location: '' }
  createOpen.value = true
}
function onPickTeacher(e: { detail: { value: number } }) {
  form.value.teacherId = teachers.value[Number(e.detail.value)]?.id || ''
}
function onDateChange(e: { detail: { value: string } }) { form.value.date = e.detail.value }
function onStartChange(e: { detail: { value: string } }) { form.value.startTime = e.detail.value }
function onEndChange(e: { detail: { value: string } }) { form.value.endTime = e.detail.value }
async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    await offlineManageApi.createCourse({
      stationId: stationId.value,
      title: form.value.title,
      intro: form.value.intro || undefined,
      teacherId: form.value.teacherId || undefined,
      price: Number(form.value.price) || 0,
      maxStudents: Number(form.value.maxStudents),
      startTime: `${form.value.date}T${form.value.startTime}:00`,
      endTime: `${form.value.date}T${form.value.endTime}:00`,
      location: form.value.location,
    })
    uni.showToast({ title: '已创建，待审核', icon: 'success' })
    createOpen.value = false
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
function goCheckin(courseId: string) {
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
    // 就地更新按钮态为「查看同学圈」
    const target = courses.value.find((x) => x.id === c.id)
    if (target) target.circleId = d.circleId
    uni.showToast({ title: '同学圈已创建', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '创建失败', icon: 'none' })
  } finally {
    circleSubmittingId.value = ''
  }
}
</script>

<style scoped>
.mc-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.mc-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.mc-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.mc-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.mc-nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.mc-body { flex: 1; }
.mc-state { padding: 90px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mc-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }
.mc-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.mc-card { background: #fff; border-radius: 12px; padding: 16px; }
.mc-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.mc-card-title { flex: 1; font-size: 15px; font-weight: 600; color: #2a1f1a; }
.mc-audit { font-size: 11px; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
.mc-card-meta { display: flex; gap: 12px; margin-top: 8px; }
.mc-meta-item { font-size: 12px; color: #9ca3af; }
.mc-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f0ea; }
.mc-foot-stat { display: flex; align-items: baseline; gap: 12px; }
.mc-price { font-size: 16px; font-weight: 700; color: #9a2e25; }
.mc-reg { font-size: 12px; color: #6b7280; }
.mc-foot-actions { display: flex; align-items: center; gap: 8px; }
.mc-reg-btn { padding: 6px 14px; background: rgba(154,46,37,0.08); border-radius: 8px; }
.mc-reg-btn.disabled { opacity: 0.6; }
.mc-reg-btn-text { font-size: 13px; color: #9a2e25; }
.mc-reject { display: block; font-size: 12px; color: #dc2626; margin-top: 8px; }
.mc-safe { height: 24px; }

.mc-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.mc-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; max-height: 86vh; display: flex; flex-direction: column; }
.mc-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #ededed; }
.mc-sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.mc-sheet-body { padding: 16px; }
.mc-field { margin-bottom: 14px; }
.mc-field-row { display: flex; gap: 12px; }
.flex1 { flex: 1; }
.mc-label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px; }
.req { color: #dc2626; }
.mc-input { height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.mc-textarea { width: 100%; box-sizing: border-box; min-height: 70px; padding: 10px 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.mc-picker { height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
.mc-picker-text { font-size: 14px; color: #1a1a1a; }
.ph { color: #9ca3af; }
.mc-tip { display: flex; align-items: center; gap: 6px; margin: 4px 0 16px; }
.mc-tip-text { font-size: 12px; color: #9a2e25; }
.mc-submit { height: 46px; background: #9a2e25; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.mc-submit.disabled { background: #d1b5b1; }
.mc-submit-text { font-size: 15px; color: #fff; font-weight: 500; }
</style>
