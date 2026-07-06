<template>
  <view class="ck-page">
    <!-- 顶部导航 -->
    <view class="ck-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ck-nav">
        <view class="ck-icon-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="ck-nav-title">课程签到</text>
        <view class="ck-nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="ck-body">
      <!-- 三态 -->
      <view v-if="loading" class="ck-state">
        <view class="spinner" />
        <text class="ck-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="ck-state">
        <app-icon name="alert-circle" :size="44" color="#d1d5db" />
        <text class="ck-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="!reg" class="ck-state">
        <app-icon name="ticket" :size="48" color="#d1d5db" />
        <text class="ck-state-text">你还没有报名该课程</text>
        <view class="retry-btn" @tap="goCourse"><text class="retry-text">去报名</text></view>
      </view>

      <template v-else>
        <!-- 课程信息卡 -->
        <view class="ck-card ck-course">
          <view class="ck-cover">
            <image lazy-load v-if="reg.course.cover" :src="reg.course.cover" class="ck-cover-img" mode="aspectFill" />
            <app-icon v-else name="graduation-cap" :size="44" color="#d8b48a" />
          </view>
          <view class="ck-course-info">
            <text class="ck-course-title">{{ reg.course.title }}</text>
            <view v-if="reg.course.teacher" class="ck-instructor">
              <view class="ck-avatar"><app-icon name="user" :size="16" color="#9ca3af" /></view>
              <text class="ck-ins-name">{{ reg.course.teacher.name }}</text>
            </view>
            <view class="ck-detail">
              <view class="ck-detail-row">
                <app-icon name="calendar" :size="16" color="#9ca3af" />
                <text class="ck-detail-main">{{ fmtCourseTime(reg.course.startTime) }} - {{ fmtCourseTime(reg.course.endTime) }}</text>
              </view>
              <view class="ck-detail-row">
                <app-icon name="map-pin" :size="16" color="#9ca3af" />
                <view>
                  <text class="ck-detail-main">{{ reg.course.station?.name || '上课地点' }}</text>
                  <text class="ck-detail-sub">{{ reg.course.location || reg.course.station?.address }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 报名状态 -->
        <view class="ck-card ck-status-card">
          <view class="ck-status-row">
            <view class="ck-status-icon" :style="{ background: signed ? '#dcfce7' : '#fff7ed' }">
              <app-icon :name="signed ? 'check-circle-2' : 'clock'" :size="22" :color="signed ? '#16a34a' : '#ea580c'" />
            </view>
            <view>
              <text class="ck-status-title">{{ signed ? '已签到' : '待签到' }}</text>
              <text class="ck-status-sub">{{ signed ? (reg.signedAt ? '签到时间 ' + fmtCourseTime(reg.signedAt) : '已完成现场核销') : '请到场出示下方凭证码核销' }}</text>
            </view>
          </view>
        </view>

        <!-- 凭证码 -->
        <view v-if="!signed" class="ck-card ck-voucher">
          <text class="ck-voucher-title">我的报名凭证</text>
          <view class="ck-qr"><app-icon name="qr-code" :size="120" color="#1a1a1a" /></view>
          <text v-if="reg.qrCode" class="ck-voucher-code">{{ reg.qrCode }}</text>
          <text class="ck-voucher-hint">到场时向驿站工作人员出示，由驿站扫码核销签到</text>
        </view>

        <view v-else class="ck-card ck-done">
          <app-icon name="check-circle-2" :size="48" color="#16a34a" />
          <text class="ck-done-text">签到完成，祝学习愉快</text>
          <!-- 课程同学圈引导（课程有 circleId 才显示） -->
          <view v-if="reg.course.circleId" class="ck-circle-btn" @tap="goCircle">
            <app-icon name="users" :size="16" color="#fff" />
            <text class="ck-circle-btn-text">加入课程同学圈</text>
          </view>
          <text v-if="reg.course.circleId" class="ck-circle-hint">和同学继续交流学习心得</text>
        </view>

        <!-- 联系驿站 -->
        <view v-if="reg.course.station?.phone" class="ck-call-btn" @tap="onCall">
          <app-icon name="phone" :size="16" color="#4b5563" />
          <text class="ck-call-text">联系驿站</text>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { offlineApi, fmtCourseTime, type MyRegistration } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const courseId = ref('')
const reg = ref<MyRegistration | null>(null)

const signed = computed(() => reg.value?.status === 'SIGNED_IN')

async function load() {
  if (!courseId.value) { loading.value = false; errMsg.value = '缺少课程参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    reg.value = await offlineApi.getMyRegistration(courseId.value)
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录后查看签到' : (msg || '加载失败')
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  courseId.value = q && (q.courseId || q.id) ? String(q.courseId || q.id) : ''
  load()
})

function goCourse() {
  if (courseId.value) navigateTo(`/offline/courses/${courseId.value}`)
}
function onCall() {
  if (reg.value?.course.station?.phone) uni.makePhoneCall({ phoneNumber: reg.value.course.station.phone }).catch(() => {})
}
function goCircle() {
  const circleId = reg.value?.course.circleId
  if (circleId) navigateTo(`/pkg-circle/circles/detail?id=${circleId}`)
}
</script>

<style lang="scss" scoped>
/* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
.ck-page { height: 100vh; background: #f7f8fa; display: flex; flex-direction: column; }
.ck-header { position: sticky; top: 0; z-index: 40; background: rgba(255,255,255,0.95); border-bottom: 1px solid #f0f0f0; }
.ck-nav { display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; }
.ck-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.ck-nav-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.ck-nav-placeholder { width: 32px; }
.ck-body { flex: 1; height: 0; min-height: 0; padding: 16px; }

.ck-state { padding-top: 100px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ck-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.ck-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
.ck-cover { position: relative; height: 150px; background: linear-gradient(135deg, #f5ede0, #ece0cd); display: flex; align-items: center; justify-content: center; }
.ck-cover-img { width: 100%; height: 100%; }
.ck-course-info { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.ck-course-title { font-size: 18px; font-weight: 600; color: #1a1a1a; line-height: 1.3; }
.ck-instructor { display: flex; align-items: center; gap: 8px; }
.ck-avatar { width: 28px; height: 28px; border-radius: 999px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.ck-ins-name { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.ck-detail { display: flex; flex-direction: column; gap: 8px; }
.ck-detail-row { display: flex; align-items: flex-start; gap: 8px; }
.ck-detail-main { font-size: 14px; color: #1a1a1a; display: block; }
.ck-detail-sub { font-size: 12px; color: #9ca3af; }

.ck-status-card { padding: 16px; }
.ck-status-row { display: flex; align-items: center; gap: 12px; }
.ck-status-icon { width: 44px; height: 44px; border-radius: 999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ck-status-title { font-size: 15px; font-weight: 600; color: #1a1a1a; display: block; }
.ck-status-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }

.ck-voucher { padding: 24px 16px; display: flex; flex-direction: column; align-items: center; }
.ck-voucher-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.ck-qr { width: 180px; height: 180px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.ck-voucher-code { font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #1a1a1a; margin-top: 16px; }
.ck-voucher-hint { font-size: 12px; color: #9ca3af; margin-top: 8px; text-align: center; line-height: 1.6; }

.ck-done { padding: 32px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ck-done-text { font-size: 14px; color: #16a34a; }
.ck-circle-btn { margin-top: 4px; height: 42px; padding: 0 28px; background: var(--brand); border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ck-circle-btn-text { font-size: 14px; color: #fff; font-weight: 500; }
.ck-circle-hint { font-size: 12px; color: #9ca3af; }

.ck-call-btn { height: 44px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ck-call-text { font-size: 14px; color: #4b5563; }
</style>
