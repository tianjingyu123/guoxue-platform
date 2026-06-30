<template>
  <view class="cd-page">
    <!-- 头部 -->
    <view class="cd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cd-nav">
        <view class="cd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="cd-nav-title">{{ course?.title || '课程详情' }}</text>
        <view class="cd-icon-btn" />
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="cd-state">
      <view class="spinner" />
      <text class="cd-state-text">加载中…</text>
    </view>
    <view v-else-if="!course" class="cd-state">
      <app-icon name="graduation-cap" :size="44" color="#d1d5db" />
      <text class="cd-state-text">{{ errMsg || '课程不存在' }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-text">返回重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="cd-body">
        <!-- 封面 -->
        <view class="cd-cover">
          <image lazy-load v-if="course.cover" :src="course.cover" class="cd-cover-img" mode="aspectFill" />
          <app-icon v-else name="graduation-cap" :size="48" color="#d8b48a" />
          <text class="cd-cover-status" :style="{ color: courseStatusStyle[derivedStatus].color, background: courseStatusStyle[derivedStatus].bg }">{{ courseStatusLabel[derivedStatus] }}</text>
          <text v-if="num(course.price) === 0" class="cd-cover-free">免费</text>
        </view>

        <view class="cd-main">
          <!-- 标题与简介 -->
          <view class="cd-block">
            <text class="cd-title">{{ course.title }}</text>
            <text v-if="course.intro" class="cd-desc">{{ course.intro }}</text>
          </view>

          <!-- 价格 -->
          <view class="cd-price-row">
            <text v-if="num(course.price) === 0" class="cd-price free">免费</text>
            <text v-else class="cd-price">¥{{ num(course.price) }}</text>
            <text v-if="num(course.price) > 0" class="cd-pay-hint">线下报名 · 在线支付即将开放</text>
          </view>

          <!-- 时间地点卡 -->
          <view class="cd-card">
            <view class="cd-card-row">
              <app-icon name="calendar" :size="20" color="#c41e3a" />
              <view class="cd-card-info">
                <text class="cd-card-label">课程时间</text>
                <text class="cd-card-value">{{ fmtCourseTime(course.startTime) }} - {{ fmtCourseTime(course.endTime) }}</text>
              </view>
            </view>
            <view class="cd-card-row">
              <app-icon name="map-pin" :size="20" color="#c41e3a" />
              <view class="cd-card-info">
                <text class="cd-card-label">{{ course.station?.name || '上课地点' }}</text>
                <text class="cd-card-value">{{ course.location || course.station?.address }}</text>
              </view>
            </view>
            <view class="cd-card-row">
              <app-icon name="users" :size="20" color="#c41e3a" />
              <view class="cd-card-info">
                <text class="cd-card-label">报名人数</text>
                <text class="cd-card-value">
                  {{ enrolledCount }}/{{ course.maxStudents }}人
                  <text v-if="isFull" class="cd-full">（已满）</text>
                </text>
              </view>
            </view>
          </view>

          <!-- Tab -->
          <view class="cd-tabs">
            <view v-for="t in tabs" :key="t.value" class="cd-tab" :class="{ active: activeTab === t.value }" @tap="activeTab = t.value">
              <text class="cd-tab-text" :class="{ active: activeTab === t.value }">{{ t.label }}</text>
            </view>
          </view>

          <!-- Tab 内容 -->
          <view class="cd-tab-content">
            <!-- 介绍 -->
            <view v-if="activeTab === 'intro'" class="cd-intro">
              <text v-if="course.intro" class="cd-content-text">{{ course.intro }}</text>
              <view class="cd-card cd-notice">
                <view class="cd-notice-head">
                  <app-icon name="alert-circle" :size="16" color="#f59e0b" />
                  <text class="cd-notice-title">报名须知</text>
                </view>
                <text class="cd-notice-text">{{ ENROLL_NOTICE }}</text>
              </view>
              <view class="cd-card">
                <text class="cd-notice-title">退款规则（参考）</text>
                <text class="cd-notice-text">{{ REFUND_POLICY }}</text>
              </view>
            </view>

            <!-- 讲师 -->
            <view v-else class="cd-instructor">
              <view v-if="!course.teacher" class="cd-card"><text class="cd-state-text">讲师待定</text></view>
              <view v-else class="cd-card">
                <view class="cd-ins-head">
                  <image lazy-load v-if="course.teacher.avatar" :src="course.teacher.avatar" class="cd-ins-avatar-img" mode="aspectFill" />
                  <view v-else class="cd-ins-avatar"><text class="cd-ins-avatar-text">{{ course.teacher.name[0] }}</text></view>
                  <view class="cd-ins-meta">
                    <view class="cd-ins-name-row">
                      <text class="cd-ins-name">{{ course.teacher.name }}</text>
                      <text v-if="course.teacher.sourceUserId" class="cd-signed-badge">研究院签约</text>
                    </view>
                    <text class="cd-ins-title">驿站授课讲师</text>
                  </view>
                </view>
                <view v-if="course.teacher.bio" class="cd-ins-section">
                  <text class="cd-ins-sec-title">讲师简介</text>
                  <text class="cd-ins-sec-text">{{ course.teacher.bio }}</text>
                </view>
                <view v-if="course.teacher.specialties.length" class="cd-ins-section">
                  <text class="cd-ins-sec-title">擅长领域</text>
                  <view class="cd-tags">
                    <text v-for="(s, i) in course.teacher.specialties" :key="i" class="cd-tag">{{ s }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="cd-safe" />
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="cd-footer">
        <template v-if="isEnrolled">
          <view class="cd-foot-btn ghost" @tap="showQrCode = true">
            <app-icon name="qr-code" :size="16" color="#1a1a1a" />
            <text class="cd-foot-btn-text">入场码</text>
          </view>
          <view class="cd-foot-cancel" @tap="showCancelConfirm = true">
            <text class="cd-foot-cancel-text">取消报名</text>
          </view>
        </template>
        <template v-else>
          <view class="cd-foot-price">
            <text v-if="num(course.price) === 0" class="cd-foot-price-text free">免费</text>
            <text v-else class="cd-foot-price-text">¥{{ num(course.price) }}</text>
          </view>
          <view class="cd-foot-btn primary" :class="{ disabled: !canEnroll || submitting }" @tap="onEnroll">
            <text class="cd-foot-btn-text primary">{{ submitting ? '提交中…' : (isFull ? '已满员' : canEnroll ? '立即报名' : courseStatusLabel[derivedStatus]) }}</text>
          </view>
        </template>
      </view>

      <!-- 入场码弹窗 -->
      <view v-if="showQrCode" class="cd-modal-mask" @tap="showQrCode = false">
        <view class="cd-modal" @tap.stop>
          <view class="cd-modal-head">
            <text class="cd-modal-title">报名凭证</text>
            <view @tap="showQrCode = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
          </view>
          <view class="cd-qr"><app-icon name="qr-code" :size="120" color="#1a1a1a" /></view>
          <text class="cd-qr-hint">请在入场时向工作人员出示</text>
          <text v-if="myReg?.qrCode" class="cd-qr-code">凭证码: {{ myReg.qrCode }}</text>
          <view class="cd-qr-info">
            <text class="cd-qr-info-row">课程: {{ course.title }}</text>
            <text class="cd-qr-info-row">时间: {{ fmtCourseTime(course.startTime) }}</text>
            <text class="cd-qr-info-row">地点: {{ course.location || course.station?.address }}</text>
          </view>
          <view class="cd-modal-btn" @tap="showQrCode = false"><text class="cd-modal-btn-text">关闭</text></view>
        </view>
      </view>

      <!-- 取消报名确认 -->
      <view v-if="showCancelConfirm" class="cd-modal-mask" @tap="showCancelConfirm = false">
        <view class="cd-modal" @tap.stop>
          <view class="cd-confirm-icon"><app-icon name="alert-circle" :size="48" color="#f59e0b" /></view>
          <text class="cd-confirm-title">确认取消报名？</text>
          <text class="cd-confirm-text">取消后名额将释放，退款规则按课程政策执行。</text>
          <view class="cd-confirm-btns">
            <view class="cd-confirm-btn ghost" @tap="showCancelConfirm = false"><text class="cd-confirm-btn-text">再想想</text></view>
            <view class="cd-confirm-btn danger" :class="{ disabled: submitting }" @tap="onCancel"><text class="cd-confirm-btn-text danger">确认取消</text></view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  offlineApi, deriveCourseStatus, courseStatusLabel, courseStatusStyle, fmtCourseTime, num,
  type OfflineCourseDetail, type CourseRegistration,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const ENROLL_NOTICE = '1. 请提前 15 分钟到场签到\n2. 自备笔记本和文具\n3. 课程期间请将手机调至静音\n4. 如有特殊需求请提前联系驿站'
const REFUND_POLICY = '开课前 7 天可全额退款，开课前 3-7 天退款 50%，开课前 3 天内不予退款。最终以驿站政策为准。'

const loading = ref(true)
const errMsg = ref('')
const courseId = ref('')
const course = ref<OfflineCourseDetail | null>(null)
const myReg = ref<CourseRegistration | null>(null)
const submitting = ref(false)
const showQrCode = ref(false)
const showCancelConfirm = ref(false)

type TabType = 'intro' | 'instructor'
const tabs: { value: TabType; label: string }[] = [
  { value: 'intro', label: '课程介绍' },
  { value: 'instructor', label: '讲师介绍' },
]
const activeTab = ref<TabType>('intro')

const derivedStatus = computed(() => (course.value ? deriveCourseStatus(course.value) : 'draft'))
const enrolledCount = computed(() => course.value?.registrations?.filter((r) => r.status !== 'CANCELLED').length ?? 0)
const isFull = computed(() => derivedStatus.value === 'full')
const isEnrolled = computed(() => !!myReg.value && myReg.value.status !== 'CANCELLED')
const canEnroll = computed(() => derivedStatus.value === 'enrolling' && !isEnrolled.value)

async function load() {
  if (!courseId.value) { loading.value = false; errMsg.value = '缺少课程参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    course.value = await offlineApi.getCourse(courseId.value)
  } catch (e: any) {
    errMsg.value = e?.message || '加载失败'
    course.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  courseId.value = q && q.id ? String(q.id) : ''
  load()
})

async function onEnroll() {
  if (!canEnroll.value || submitting.value) return
  submitting.value = true
  try {
    const reg = await offlineApi.register(courseId.value)
    myReg.value = reg
    uni.showToast({ title: num(course.value?.price) > 0 ? '报名成功 · 请到店支付' : '报名成功', icon: 'success' })
    await load()
    showQrCode.value = true
  } catch (e: any) {
    const msg = e?.message || '报名失败'
    if (msg.includes('已报名') || msg.includes('已经')) {
      myReg.value = { id: '', courseId: courseId.value, userId: '', status: 'REGISTERED', qrCode: null, signedAt: null }
    }
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function onCancel() {
  if (submitting.value) return
  submitting.value = true
  try {
    await offlineApi.cancelRegistration(courseId.value)
    myReg.value = null
    showCancelConfirm.value = false
    uni.showToast({ title: '已取消报名', icon: 'none' })
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cd-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.cd-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.cd-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.cd-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.cd-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 8px; }
.cd-body { flex: 1; }
.cd-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-top: 120px; }
.cd-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.cd-cover { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.cd-cover-img { width: 100%; height: 100%; }
.cd-cover-status { position: absolute; top: 12px; left: 12px; padding: 3px 10px; font-size: 12px; border-radius: 6px; }
.cd-cover-free { position: absolute; top: 12px; right: 12px; padding: 3px 10px; font-size: 12px; color: #fff; background: #22c55e; border-radius: 6px; }
.cd-main { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.cd-block { display: flex; flex-direction: column; }
.cd-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.cd-desc { font-size: 13px; color: #6b7280; line-height: 1.6; }
.cd-price-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.cd-price { font-size: 24px; font-weight: 700; color: var(--brand); }
.cd-price.free { color: #16a34a; }
.cd-pay-hint { font-size: 11px; color: #9ca3af; }
.cd-card { background: #fff; border-radius: 12px; padding: 16px; }
.cd-card-row { display: flex; align-items: flex-start; gap: 12px; }
.cd-card-row + .cd-card-row { margin-top: 12px; }
.cd-card-info { flex: 1; }
.cd-card-label { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.cd-card-value { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.cd-full { color: #ea580c; }
.cd-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; }
.cd-tab { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px 0; border-radius: 6px; }
.cd-tab.active { background: #fff; }
.cd-tab-text { font-size: 14px; color: #6b7280; }
.cd-tab-text.active { color: #1a1a1a; font-weight: 500; }
.cd-intro { display: flex; flex-direction: column; gap: 16px; }
.cd-content-text { font-size: 14px; color: #4b5563; line-height: 1.8; white-space: pre-line; }
.cd-notice-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.cd-notice-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.cd-notice-head .cd-notice-title { margin-bottom: 0; }
.cd-notice-text { font-size: 13px; color: #6b7280; line-height: 1.7; white-space: pre-line; }
.cd-ins-head { display: flex; align-items: flex-start; gap: 16px; }
.cd-ins-avatar { width: 64px; height: 64px; border-radius: 999px; background: var(--brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-ins-avatar-img { width: 64px; height: 64px; border-radius: 999px; flex-shrink: 0; }
.cd-ins-avatar-text { font-size: 24px; color: #fff; font-weight: 600; }
.cd-ins-meta { flex: 1; }
.cd-ins-name-row { display: flex; align-items: center; gap: 6px; }
.cd-ins-name { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.cd-signed-badge { font-size: 10px; padding: 1px 6px; color: var(--brand); background: rgba(196,30,58,0.1); border-radius: 4px; }
.cd-ins-title { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.cd-ins-section { margin-top: 16px; }
.cd-ins-sec-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.cd-ins-sec-text { font-size: 13px; color: #6b7280; line-height: 1.7; }
.cd-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.cd-tag { padding: 3px 10px; font-size: 12px; color: #6b7280; background: #f3f4f6; border-radius: 6px; }
.cd-safe { height: 88px; }
.cd-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.cd-foot-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; }
.cd-foot-btn.ghost { border: 1px solid #e5e7eb; }
.cd-foot-btn.primary { background: var(--brand); }
.cd-foot-btn.primary.disabled { background: #d1a5ac; }
.cd-foot-btn-text { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.cd-foot-btn-text.primary { color: #fff; }
.cd-foot-cancel { padding: 0 12px; height: 44px; display: flex; align-items: center; }
.cd-foot-cancel-text { font-size: 14px; color: #dc2626; }
.cd-foot-price { flex: 1; }
.cd-foot-price-text { font-size: 18px; font-weight: 700; color: var(--brand); }
.cd-foot-price-text.free { color: #16a34a; }
.cd-modal-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.cd-modal { width: 100%; max-width: 340px; background: #fff; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; }
.cd-modal-head { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.cd-modal-title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.cd-qr { width: 192px; height: 192px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.cd-qr-hint { font-size: 13px; color: #9ca3af; margin-bottom: 8px; text-align: center; }
.cd-qr-code { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; }
.cd-qr-info { width: 100%; background: #f3f4f6; border-radius: 8px; padding: 12px; }
.cd-qr-info-row { display: block; font-size: 13px; color: #4b5563; line-height: 1.8; }
.cd-modal-btn { width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 16px; }
.cd-modal-btn-text { font-size: 15px; color: #1a1a1a; }
.cd-confirm-icon { margin-bottom: 12px; }
.cd-confirm-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.cd-confirm-text { font-size: 13px; color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 20px; }
.cd-confirm-btns { display: flex; gap: 12px; width: 100%; }
.cd-confirm-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.cd-confirm-btn.ghost { border: 1px solid #e5e7eb; }
.cd-confirm-btn.danger { background: #dc2626; }
.cd-confirm-btn.disabled { opacity: 0.6; }
.cd-confirm-btn-text { font-size: 15px; color: #1a1a1a; }
.cd-confirm-btn-text.danger { color: #fff; }
</style>
