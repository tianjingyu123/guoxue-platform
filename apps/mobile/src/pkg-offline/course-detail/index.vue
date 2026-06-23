<template>
  <view class="cd-page">
    <!-- 头部 -->
    <view class="cd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cd-nav">
        <view class="cd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="cd-nav-title">{{ course?.title || '课程详情' }}</text>
        <view class="cd-nav-actions">
          <view class="cd-icon-btn" @tap="isFavorited = !isFavorited">
            <app-icon name="heart" :size="20" :color="isFavorited ? '#ef4444' : '#9ca3af'" :fill="isFavorited" />
          </view>
          <view class="cd-icon-btn" @tap="onShare">
            <app-icon name="share-2" :size="20" color="#9ca3af" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="cd-body">
      <!-- 加载骨架 -->
      <view v-if="loading" class="cd-skeleton">
        <view class="cd-sk-cover" />
        <view class="cd-sk-info">
          <view class="cd-sk-line w50" />
          <view class="cd-sk-line w30" />
          <view class="cd-sk-line w80" />
        </view>
      </view>

      <!-- 错误 -->
      <view v-else-if="error" class="cd-error">
        <app-icon name="alert-circle" :size="48" color="#ef4444" />
        <text class="cd-error-text">加载失败，请重试</text>
        <view class="cd-retry-btn" @tap="retryLoad"><text class="cd-retry-text">重试</text></view>
      </view>

      <!-- 正常内容 -->
      <template v-else-if="course">
      <!-- 封面 -->
      <view class="cd-cover">
        <app-icon name="graduation-cap" :size="48" color="#d8b48a" />
        <text class="cd-cover-status" :style="{ color: statusStyle.color, background: statusStyle.bg }">{{ getCourseStatusLabel(course.status) }}</text>
        <text v-if="course.price === 0" class="cd-cover-free">免费</text>
      </view>

      <view class="cd-main">
        <!-- 标题与简介 -->
        <view class="cd-block">
          <text class="cd-title">{{ course.title }}</text>
          <view v-if="course.tags && course.tags.length" class="cd-tags">
            <text v-for="(tag, i) in course.tags" :key="i" class="cd-tag">{{ tag }}</text>
          </view>
          <text class="cd-desc">{{ course.description }}</text>
        </view>

        <!-- 价格 -->
        <view class="cd-price-row">
          <text v-if="course.price === 0" class="cd-price free">免费</text>
          <template v-else>
            <text class="cd-price">¥{{ course.price }}</text>
            <text v-if="course.originalPrice && course.originalPrice > course.price" class="cd-origin">¥{{ course.originalPrice }}</text>
          </template>
        </view>

        <!-- 时间地点卡 -->
        <view class="cd-card">
          <view class="cd-card-row">
            <app-icon name="calendar" :size="20" color="#c41e3a" />
            <view class="cd-card-info">
              <text class="cd-card-label">课程时间</text>
              <text class="cd-card-value">{{ formatCourseDateTime(course.startTime) }} - {{ formatCourseDateTime(course.endTime) }}</text>
            </view>
          </view>
          <view class="cd-card-row">
            <app-icon name="map-pin" :size="20" color="#c41e3a" />
            <view class="cd-card-info">
              <text class="cd-card-label">{{ course.stationName }}</text>
              <text class="cd-card-value">{{ course.address }}</text>
            </view>
            <view class="cd-nav-link" @tap="onNavigate">
              <app-icon name="navigation" :size="16" color="#c41e3a" />
              <text class="cd-nav-link-text">导航</text>
            </view>
          </view>
          <view class="cd-card-row">
            <app-icon name="users" :size="20" color="#c41e3a" />
            <view class="cd-card-info">
              <text class="cd-card-label">报名人数</text>
              <text class="cd-card-value">
                {{ course.currentParticipants }}/{{ course.maxParticipants }}人
                <text v-if="isFull" class="cd-full">（已满）</text>
              </text>
            </view>
          </view>
        </view>

        <!-- 已报名学员 -->
        <view v-if="course.enrolledUsers.length" class="cd-enrolled">
          <view class="cd-avatars">
            <view v-for="(u, i) in course.enrolledUsers.slice(0, 5)" :key="u.id" class="cd-enroll-avatar" :style="{ marginLeft: i === 0 ? '0' : '-8px', zIndex: 5 - i }">
              <text class="cd-enroll-avatar-text">{{ u.name[0] }}</text>
            </view>
          </view>
          <text class="cd-enroll-count">{{ course.currentParticipants }}人已报名</text>
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
            <text class="cd-content-text">{{ course.content }}</text>
            <view class="cd-card cd-notice">
              <view class="cd-notice-head">
                <app-icon name="alert-circle" :size="16" color="#f59e0b" />
                <text class="cd-notice-title">报名须知</text>
              </view>
              <text class="cd-notice-text">{{ course.enrollNotice }}</text>
            </view>
            <view class="cd-card">
              <text class="cd-notice-title">退款规则</text>
              <text class="cd-notice-text">{{ course.refundPolicy }}</text>
            </view>
          </view>

          <!-- 大纲 -->
          <view v-else-if="activeTab === 'outline'" class="cd-outline">
            <view v-for="(item, i) in course.outline" :key="item.id" class="cd-card cd-outline-item">
              <view class="cd-outline-num"><text class="cd-outline-num-text">{{ i + 1 }}</text></view>
              <view class="cd-outline-info">
                <view class="cd-outline-top">
                  <text class="cd-outline-title">{{ item.title }}</text>
                  <text class="cd-outline-dur">{{ item.duration }}</text>
                </view>
                <text v-if="item.description" class="cd-outline-desc">{{ item.description }}</text>
              </view>
            </view>
          </view>

          <!-- 讲师 -->
          <view v-else class="cd-instructor">
            <view class="cd-card">
              <view class="cd-ins-head">
                <view class="cd-ins-avatar"><text class="cd-ins-avatar-text">{{ course.instructorDetail.name[0] }}</text></view>
                <view class="cd-ins-meta">
                  <text class="cd-ins-name">{{ course.instructorDetail.name }}</text>
                  <text class="cd-ins-title">{{ course.instructorDetail.title }}</text>
                  <view class="cd-ins-stats">
                    <view class="cd-ins-stat">
                      <app-icon name="book-open" :size="14" color="#9ca3af" />
                      <text class="cd-ins-stat-text">{{ course.instructorDetail.courseCount }}门课</text>
                    </view>
                    <view class="cd-ins-stat">
                      <app-icon name="graduation-cap" :size="14" color="#9ca3af" />
                      <text class="cd-ins-stat-text">{{ course.instructorDetail.studentCount }}学员</text>
                    </view>
                  </view>
                </view>
              </view>
              <view class="cd-ins-section">
                <text class="cd-ins-sec-title">讲师简介</text>
                <text class="cd-ins-sec-text">{{ course.instructorDetail.introduction }}</text>
              </view>
              <view class="cd-ins-section">
                <text class="cd-ins-sec-title">擅长领域</text>
                <view class="cd-tags">
                  <text v-for="(s, i) in course.instructorDetail.specialties" :key="i" class="cd-tag">{{ s }}</text>
                </view>
              </view>
              <view class="cd-ins-btn" @tap="goInstructor">
                <text class="cd-ins-btn-text">查看讲师主页</text>
                <app-icon name="chevron-right" :size="16" color="#1a1a1a" />
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="cd-safe" />
      </template>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="cd-footer">
      <template v-if="isEnrolled">
        <view class="cd-foot-btn ghost" @tap="showQrCode = true">
          <app-icon name="qr-code" :size="16" color="#1a1a1a" />
          <text class="cd-foot-btn-text">入场码</text>
        </view>
        <view class="cd-foot-icon-btn" @tap="onAddCalendar">
          <app-icon name="calendar-plus" :size="18" color="#1a1a1a" />
        </view>
        <view class="cd-foot-cancel" @tap="showCancelConfirm = true">
          <text class="cd-foot-cancel-text">取消报名</text>
        </view>
      </template>
      <template v-else>
        <view class="cd-foot-price">
          <text v-if="course?.price === 0" class="cd-foot-price-text free">免费</text>
          <text v-else class="cd-foot-price-text">¥{{ course?.price }}</text>
        </view>
        <view class="cd-foot-btn primary" :class="{ disabled: !canEnroll }" @tap="onEnroll">
          <text class="cd-foot-btn-text primary">{{ isFull ? '已满员' : canEnroll ? '立即报名' : getCourseStatusLabel(course.status) }}</text>
        </view>
      </template>
    </view>

    <!-- 入场二维码弹窗 -->
    <view v-if="showQrCode && course?.myEnrollment" class="cd-modal-mask" @tap="showQrCode = false">
      <view class="cd-modal" @tap.stop>
        <view class="cd-modal-head">
          <text class="cd-modal-title">入场二维码</text>
          <view @tap="showQrCode = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <view class="cd-qr"><app-icon name="qr-code" :size="120" color="#1a1a1a" /></view>
        <text class="cd-qr-hint">请在入场时向工作人员出示此二维码</text>
        <text v-if="course?.myEnrollment?.seatNo" class="cd-qr-seat">座位号: {{ course?.myEnrollment?.seatNo }}</text>
        <view class="cd-qr-info">
          <text class="cd-qr-info-row">课程: {{ course?.title }}</text>
          <text class="cd-qr-info-row">时间: {{ course?.startTime ? formatCourseDateTime(course.startTime) : '' }}</text>
          <text class="cd-qr-info-row">地点: {{ course?.address }}</text>
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
          <view class="cd-confirm-btn danger" @tap="onCancel"><text class="cd-confirm-btn-text danger">确认取消</text></view>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineApi,
  getCourseStatusLabel,
  getCourseStatusStyle,
  formatCourseDateTime,
  type OfflineCourseDetail,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const course = ref<OfflineCourseDetail | null>(null)
const loading = ref(true)
const error = ref(false)
let courseId = 1

onLoad(async (q) => {
  courseId = q && q.id ? Number(q.id) : 1
  try {
    course.value = await offlineApi.getCourse(courseId)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

type TabType = 'intro' | 'outline' | 'instructor'
const tabs: { value: TabType; label: string }[] = [
  { value: 'intro', label: '课程介绍' },
  { value: 'outline', label: '课程大纲' },
  { value: 'instructor', label: '讲师介绍' },
]
const activeTab = ref<TabType>('intro')
const isFavorited = ref(false)
const showQrCode = ref(false)
const showCancelConfirm = ref(false)

const submitting = ref(false)
const statusStyle = computed(() => course.value ? getCourseStatusStyle(course.value.status) : { color: '#6b7280', bg: '#f3f4f6' })
const isEnrolled = computed(() => !!course.value?.myEnrollment)
const isFull = computed(() => course.value?.status === 'full')
const canEnroll = computed(() => course.value?.status === 'enrolling' && !isEnrolled.value)

function onShare() { uni.showToast({ title: '链接已复制', icon: 'none' }) }
function onNavigate() { if (course.value) uni.showToast({ title: `导航到「${course.value.stationName}」`, icon: 'none' }) }
function goInstructor() { if (course.value) navigateTo(`/instructor/${course.value.instructor.id}`) }
function onAddCalendar() { uni.showToast({ title: '已添加到日历', icon: 'none' }) }
async function onEnroll() {
  if (!canEnroll.value || submitting.value) return
  submitting.value = true
  try {
    if (course.value!.price > 0) { uni.showToast({ title: '正在跳转支付...', icon: 'none' }); return }
    const res = await offlineApi.register(courseId)
    if (res.success) {
      course.value!.myEnrollment = { id: 10001, status: 'confirmed', enrollTime: new Date().toISOString(), seatNo: 'A-' + Math.floor(Math.random() * 30 + 1) }
      course.value!.currentParticipants += 1
      uni.showToast({ title: '报名成功', icon: 'success' })
      showQrCode.value = true
    } else {
      uni.showToast({ title: res.message || '报名失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '报名失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
async function onCancel() {
  if (submitting.value) return
  submitting.value = true
  try {
    const res = await offlineApi.cancelRegistration(courseId)
    if (res.success) {
      course.value!.myEnrollment = undefined
      course.value!.currentParticipants = Math.max(course.value!.currentParticipants - 1, 0)
      uni.showToast({ title: '取消成功', icon: 'none' })
    } else {
      uni.showToast({ title: res.message || '取消失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '取消失败', icon: 'none' })
  } finally {
    submitting.value = false
    showCancelConfirm.value = false
  }
}
async function retryLoad() {
  error.value = false
  loading.value = true
  try {
    course.value = await offlineApi.getCourse(courseId)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cd-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.cd-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.cd-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.cd-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.cd-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 8px; }
.cd-nav-actions { display: flex; align-items: center; }
.cd-body { flex: 1; }
.cd-cover { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.cd-cover-status { position: absolute; top: 12px; left: 12px; padding: 3px 10px; font-size: 12px; border-radius: 6px; }
.cd-cover-free { position: absolute; top: 12px; right: 12px; padding: 3px 10px; font-size: 12px; color: #fff; background: #22c55e; border-radius: 6px; }
.cd-main { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.cd-block { display: flex; flex-direction: column; }
.cd-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.cd-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.cd-tag { padding: 3px 10px; font-size: 12px; color: #6b7280; background: #f3f4f6; border-radius: 6px; }
.cd-desc { font-size: 13px; color: #6b7280; line-height: 1.6; }
.cd-price-row { display: flex; align-items: baseline; gap: 8px; }
.cd-price { font-size: 24px; font-weight: 700; color: #c41e3a; }
.cd-price.free { color: #16a34a; }
.cd-origin { font-size: 14px; color: #9ca3af; text-decoration: line-through; }
.cd-card { background: #fff; border-radius: 12px; padding: 16px; }
.cd-card-row { display: flex; align-items: flex-start; gap: 12px; }
.cd-card-row + .cd-card-row { margin-top: 12px; }
.cd-card-info { flex: 1; }
.cd-card-label { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.cd-card-value { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.cd-full { color: #ea580c; }
.cd-nav-link { display: flex; align-items: center; gap: 2px; }
.cd-nav-link-text { font-size: 13px; color: #c41e3a; }
.cd-enrolled { display: flex; align-items: center; gap: 8px; }
.cd-avatars { display: flex; }
.cd-enroll-avatar { width: 32px; height: 32px; border-radius: 999px; background: #c41e3a; border: 2px solid #f5f5f7; display: flex; align-items: center; justify-content: center; }
.cd-enroll-avatar-text { font-size: 12px; color: #fff; }
.cd-enroll-count { font-size: 13px; color: #9ca3af; }
.cd-tabs { display: flex; background: #ececef; border-radius: 8px; padding: 3px; }
.cd-tab { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px 0; border-radius: 6px; }
.cd-tab.active { background: #fff; }
.cd-tab-text { font-size: 14px; color: #6b7280; }
.cd-tab-text.active { color: #1a1a1a; font-weight: 500; }
.cd-tab-content { }
.cd-intro { display: flex; flex-direction: column; gap: 16px; }
.cd-content-text { font-size: 14px; color: #4b5563; line-height: 1.8; white-space: pre-line; }
.cd-notice-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.cd-notice-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.cd-notice-head .cd-notice-title { margin-bottom: 0; }
.cd-notice-text { font-size: 13px; color: #6b7280; line-height: 1.7; white-space: pre-line; }
.cd-outline { display: flex; flex-direction: column; gap: 12px; }
.cd-outline-item { display: flex; align-items: flex-start; gap: 12px; }
.cd-outline-num { width: 32px; height: 32px; border-radius: 999px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-outline-num-text { font-size: 14px; font-weight: 500; color: #c41e3a; }
.cd-outline-info { flex: 1; }
.cd-outline-top { display: flex; align-items: center; justify-content: space-between; }
.cd-outline-title { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.cd-outline-dur { font-size: 12px; color: #9ca3af; }
.cd-outline-desc { display: block; font-size: 13px; color: #6b7280; margin-top: 4px; line-height: 1.5; }
.cd-ins-head { display: flex; align-items: flex-start; gap: 16px; }
.cd-ins-avatar { width: 64px; height: 64px; border-radius: 999px; background: #c41e3a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-ins-avatar-text { font-size: 24px; color: #fff; font-weight: 600; }
.cd-ins-meta { flex: 1; }
.cd-ins-name { display: block; font-size: 18px; font-weight: 700; color: #1a1a1a; }
.cd-ins-title { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.cd-ins-stats { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
.cd-ins-stat { display: flex; align-items: center; gap: 4px; }
.cd-ins-stat-text { font-size: 13px; color: #9ca3af; }
.cd-ins-section { margin-top: 16px; }
.cd-ins-sec-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.cd-ins-sec-text { font-size: 13px; color: #6b7280; line-height: 1.7; }
.cd-ins-btn { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 16px; height: 40px; border: 1px solid #e5e7eb; border-radius: 8px; }
.cd-ins-btn-text { font-size: 14px; color: #1a1a1a; }
.cd-safe { height: 88px; }
.cd-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.cd-foot-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; }
.cd-foot-btn.ghost { border: 1px solid #e5e7eb; }
.cd-foot-btn.primary { background: #c41e3a; }
.cd-foot-btn.primary.disabled { background: #d1a5ac; }
.cd-foot-btn-text { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.cd-foot-btn-text.primary { color: #fff; }
.cd-foot-icon-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 8px; }
.cd-foot-cancel { padding: 0 12px; height: 44px; display: flex; align-items: center; }
.cd-foot-cancel-text { font-size: 14px; color: #dc2626; }
.cd-foot-price { flex: 1; }
.cd-foot-price-text { font-size: 18px; font-weight: 700; color: #c41e3a; }
.cd-foot-price-text.free { color: #16a34a; }
.cd-modal-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.cd-modal { width: 100%; max-width: 340px; background: #fff; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; }
.cd-modal-head { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.cd-modal-title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.cd-qr { width: 192px; height: 192px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.cd-qr-hint { font-size: 13px; color: #9ca3af; margin-bottom: 8px; text-align: center; }
.cd-qr-seat { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; }
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
.cd-confirm-btn-text { font-size: 15px; color: #1a1a1a; }
.cd-confirm-btn-text.danger { color: #fff; }
/* 骨架屏 */
.cd-skeleton { }
.cd-sk-cover { width: 100%; aspect-ratio: 16 / 9; background: #e5e7eb; animation: cd-sk-pulse 1.5s ease-in-out infinite; }
.cd-sk-info { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.cd-sk-line { height: 16px; background: #e5e7eb; border-radius: 4px; animation: cd-sk-pulse 1.5s ease-in-out infinite; }
.cd-sk-line.w50 { width: 50%; }
.cd-sk-line.w30 { width: 30%; }
.cd-sk-line.w80 { width: 80%; }
@keyframes cd-sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.cd-error { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.cd-error-text { font-size: 14px; color: #9ca3af; }
.cd-retry-btn { padding: 8px 24px; background: #c41e3a; border-radius: 8px; }
.cd-retry-text { font-size: 14px; color: #fff; }
</style>
