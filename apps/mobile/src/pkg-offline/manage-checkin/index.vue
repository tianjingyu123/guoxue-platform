<template>
  <view class="ck-page">
    <view class="ck-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ck-nav">
        <view class="ck-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="ck-nav-title">签到核销</text>
        <view class="ck-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="ck-body">
      <view v-if="loading" class="ck-state"><view class="spinner" /><text class="ck-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="ck-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" /><text class="ck-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else>
        <!-- 课程选择 -->
        <view class="ck-course-sel">
          <text class="ck-sel-label">核销课程</text>
          <picker mode="selector" :range="courseTitles" @change="onPickCourse">
            <view class="ck-picker"><text class="ck-picker-text">{{ selectedCourse ? selectedCourse.title : '请选择课程' }}</text><app-icon name="chevron-down" :size="16" color="#9ca3af" /></view>
          </picker>
        </view>

        <template v-if="selectedCourse">
          <!-- 核销操作 -->
          <view class="ck-action-card">
            <view class="ck-stat-row">
              <view class="ck-stat"><text class="ck-stat-num">{{ signedCount }}</text><text class="ck-stat-label">已核销</text></view>
              <view class="ck-stat"><text class="ck-stat-num">{{ registrations.length }}</text><text class="ck-stat-label">报名总数</text></view>
            </view>
            <view class="ck-scan-btn" @tap="onScan">
              <app-icon name="qr-code" :size="20" color="#fff" />
              <text class="ck-scan-text">扫码核销学员凭证</text>
            </view>
            <view class="ck-code-row">
              <input v-model="codeInput" class="ck-code-input" placeholder="或手动输入凭证码" placeholder-class="ph" />
              <view class="ck-code-btn" :class="{ disabled: !codeInput.trim() || verifying }" @tap="doSignIn(codeInput.trim())">
                <text class="ck-code-btn-text">{{ verifying ? '核销中' : '核销' }}</text>
              </view>
            </view>
          </view>

          <!-- 报名列表 -->
          <view class="ck-list-head">
            <text class="ck-list-title">报名名单</text>
          </view>
          <view v-if="registrations.length === 0" class="ck-empty"><text class="ck-empty-text">暂无报名</text></view>
          <view v-else class="ck-list">
            <view v-for="(r, i) in registrations" :key="r.id" class="ck-reg">
              <view class="ck-reg-no">{{ i + 1 }}</view>
              <view class="ck-reg-info">
                <text class="ck-reg-code">凭证 {{ shortCode(r.qrCode) }}</text>
                <text class="ck-reg-time">{{ r.signedAt ? '核销于 ' + fmtCourseTime(r.signedAt) : '待核销' }}</text>
              </view>
              <text class="ck-reg-status" :class="r.status === 'SIGNED_IN' ? 'on' : (r.status === 'CANCELLED' ? 'off' : 'wait')">{{ regStatusLabel(r.status) }}</text>
            </view>
          </view>
        </template>
        <view class="ck-safe" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { offlineManageApi, fmtCourseTime, type OfflineCourse, type CourseRegistration } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const courses = ref<OfflineCourse[]>([])
const selectedCourse = ref<OfflineCourse | null>(null)
const registrations = ref<CourseRegistration[]>([])
const codeInput = ref('')
const verifying = ref(false)

const courseTitles = computed(() => courses.value.map((c) => c.title))
const signedCount = computed(() => registrations.value.filter((r) => r.status === 'SIGNED_IN').length)

function regStatusLabel(s: string) { return s === 'SIGNED_IN' ? '已核销' : s === 'CANCELLED' ? '已取消' : '待核销' }
function shortCode(qr: string | null) { return qr ? '…' + qr.slice(-6) : '—' }

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    courses.value = await offlineManageApi.getManageCourses(stationId.value)
    if (preCourseId.value) {
      const c = courses.value.find((x) => x.id === preCourseId.value)
      if (c) { selectedCourse.value = c; await loadRegs(c.id) }
    }
  } catch (e: any) {
    errMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
const preCourseId = ref('')
onLoad((q) => {
  stationId.value = q && q.stationId ? String(q.stationId) : ''
  preCourseId.value = q && q.courseId ? String(q.courseId) : ''
  load()
})

async function loadRegs(courseId: string) {
  try {
    registrations.value = await offlineManageApi.getRegistrations(courseId)
  } catch {
    registrations.value = []
  }
}
function onPickCourse(e: any) {
  selectedCourse.value = courses.value[Number(e.detail.value)] || null
  if (selectedCourse.value) loadRegs(selectedCourse.value.id)
}

async function doSignIn(qrCode: string) {
  if (!qrCode || verifying.value) return
  verifying.value = true
  try {
    await offlineManageApi.signIn(stationId.value, qrCode)
    uni.showToast({ title: '核销成功', icon: 'success' })
    codeInput.value = ''
    if (selectedCourse.value) await loadRegs(selectedCourse.value.id)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '核销失败', icon: 'none' })
  } finally {
    verifying.value = false
  }
}
function onScan() {
  uni.scanCode({
    success: (res) => { if (res.result) doSignIn(res.result) },
    fail: () => uni.showToast({ title: '扫码已取消', icon: 'none' }),
  })
}
</script>

<style scoped>
.ck-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.ck-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.ck-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.ck-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.ck-nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.ck-body { flex: 1; }
.ck-state { padding: 90px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ck-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }

.ck-course-sel { margin: 16px; padding: 14px 16px; background: #fff; border-radius: 12px; }
.ck-sel-label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 8px; }
.ck-picker { height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
.ck-picker-text { font-size: 14px; color: #1a1a1a; }

.ck-action-card { margin: 0 16px 16px; padding: 16px; background: #fff; border-radius: 12px; }
.ck-stat-row { display: flex; margin-bottom: 16px; }
.ck-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.ck-stat-num { font-size: 22px; font-weight: 700; color: #9a2e25; }
.ck-stat-label { font-size: 11px; color: #9ca3af; }
.ck-scan-btn { height: 48px; background: #9a2e25; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ck-scan-text { font-size: 15px; color: #fff; font-weight: 500; }
.ck-code-row { display: flex; gap: 8px; margin-top: 12px; }
.ck-code-input { flex: 1; height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.ck-code-btn { padding: 0 18px; height: 42px; background: rgba(154,46,37,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.ck-code-btn.disabled { opacity: 0.5; }
.ck-code-btn-text { font-size: 14px; color: #9a2e25; }
.ph { color: #9ca3af; }

.ck-list-head { padding: 0 16px 8px; }
.ck-list-title { font-size: 14px; font-weight: 600; color: #2a1f1a; }
.ck-empty { padding: 40px 0; display: flex; justify-content: center; }
.ck-empty-text { font-size: 13px; color: #9ca3af; }
.ck-list { padding: 0 16px; display: flex; flex-direction: column; gap: 8px; }
.ck-reg { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 10px; padding: 12px; }
.ck-reg-no { width: 24px; height: 24px; border-radius: 999px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #9a2e25; flex-shrink: 0; }
.ck-reg-info { flex: 1; min-width: 0; }
.ck-reg-code { display: block; font-size: 13px; color: #2a1f1a; }
.ck-reg-time { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.ck-reg-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
.ck-reg-status.on { color: #16a34a; background: #f0fdf4; }
.ck-reg-status.wait { color: #ea580c; background: #fff7ed; }
.ck-reg-status.off { color: #6b7280; background: #f3f4f6; }
.ck-safe { height: 24px; }
</style>
