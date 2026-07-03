<template>
  <view class="ed-page">
    <!-- 顶部导航 -->
    <view class="ed-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ed-nav">
        <view class="ed-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="ed-nav-title">{{ event?.title || '活动详情' }}</text>
        <view class="ed-icon-btn" />
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="ed-state">
      <view class="spinner" />
      <text class="ed-state-text">加载中…</text>
    </view>
    <view v-else-if="!event" class="ed-state">
      <app-icon name="calendar" :size="44" color="#d1d5db" />
      <text class="ed-state-text">{{ errMsg || '活动不存在' }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="ed-body">
        <!-- 封面头图 -->
        <view class="ed-cover">
          <image lazy-load v-if="event.cover" :src="event.cover" class="ed-cover-img" mode="aspectFill" />
          <app-icon v-else name="sparkles" :size="48" color="#d8b48a" />
          <text class="ed-type-tag" :style="{ color: getEventTypeStyle(event.type).color, background: getEventTypeStyle(event.type).bg }">{{ getEventTypeLabel(event.type) }}</text>
          <text class="ed-cover-status" :style="{ color: courseStatusStyle[derivedStatus].color, background: courseStatusStyle[derivedStatus].bg }">{{ courseStatusLabel[derivedStatus] }}</text>
        </view>

        <view class="ed-main">
          <!-- 标题与价格 -->
          <view class="ed-block">
            <text class="ed-title">{{ event.title }}</text>
            <view class="ed-price-row">
              <text v-if="num(event.price) === 0" class="ed-price free">免费参加</text>
              <text v-else class="ed-price">¥{{ num(event.price) }}</text>
              <text v-if="num(event.price) > 0" class="ed-pay-hint">线上报名 · 到场支付</text>
            </view>
          </view>

          <!-- 时间地点卡 -->
          <view class="ed-card">
            <view class="ed-card-row">
              <app-icon name="clock" :size="20" color="#c41e3a" />
              <view class="ed-card-info">
                <text class="ed-card-label">活动时间</text>
                <text class="ed-card-value">{{ eventTimeRange(event.startTime, event.endTime) }}</text>
              </view>
            </view>
            <view class="ed-card-row">
              <app-icon name="map-pin" :size="20" color="#c41e3a" />
              <view class="ed-card-info">
                <text class="ed-card-label">{{ event.station?.name || '活动地点' }}</text>
                <text class="ed-card-value">{{ event.location || event.station?.address }}</text>
              </view>
            </view>
            <view class="ed-card-row">
              <app-icon name="users" :size="20" color="#c41e3a" />
              <view class="ed-card-info">
                <text class="ed-card-label">报名进度</text>
                <view class="ed-progress-row">
                  <view class="ed-progress-track"><view class="ed-progress-fill" :style="{ width: progressPercent + '%' }" /></view>
                  <text class="ed-progress-text">{{ enrolledCount }}/{{ event.maxAttendees }}<text v-if="isFull" class="ed-full">（已满）</text></text>
                </view>
              </view>
            </view>
          </view>

          <!-- 活动简介 -->
          <view v-if="event.intro" class="ed-card">
            <text class="ed-sec-title">活动简介</text>
            <text class="ed-intro-text">{{ event.intro }}</text>
          </view>

          <!-- 已报名 · 凭证区 -->
          <view v-if="isEnrolled && !isOver" class="ed-card ed-voucher-card" @tap="showQrCode = true">
            <view class="ed-voucher-icon"><app-icon name="ticket" :size="22" color="#16a34a" /></view>
            <view class="ed-voucher-info">
              <text class="ed-voucher-title">{{ signed ? '已签到' : '已报名 · 查看入场凭证' }}</text>
              <text class="ed-voucher-desc">{{ signed ? '欢迎参加，祝活动愉快' : '到场时向驿站工作人员出示凭证码核销' }}</text>
            </view>
            <app-icon name="chevron-right" :size="18" color="#9ca3af" />
          </view>

          <!-- 活动回顾照片墙（FINISHED 且有照片才渲染） -->
          <view v-if="event.status === 'FINISHED' && photos.length" class="ed-card">
            <text class="ed-sec-title">活动回顾</text>
            <view class="ed-photos">
              <view v-for="(p, i) in photos" :key="i" class="ed-photo" @tap="previewPhoto(i)">
                <image lazy-load :src="p" class="ed-photo-img" mode="aspectFill" />
              </view>
            </view>
          </view>
        </view>
        <view class="ed-safe" />
      </scroll-view>

      <!-- 底部操作栏：四态（立即报名 / 已报名·凭证 / 已满 / 已结束） -->
      <view class="ed-footer">
        <template v-if="isEnrolled && !isOver">
          <view class="ed-foot-btn ghost" @tap="showQrCode = true">
            <app-icon name="qr-code" :size="16" color="#1a1a1a" />
            <text class="ed-foot-btn-text">入场凭证</text>
          </view>
          <view v-if="!signed" class="ed-foot-cancel" @tap="showCancelConfirm = true">
            <text class="ed-foot-cancel-text">取消报名</text>
          </view>
        </template>
        <template v-else>
          <view class="ed-foot-price">
            <text v-if="num(event.price) === 0" class="ed-foot-price-text free">免费</text>
            <text v-else class="ed-foot-price-text">¥{{ num(event.price) }}</text>
          </view>
          <view class="ed-foot-btn primary" :class="{ disabled: !canEnroll || submitting }" @tap="onEnroll">
            <text class="ed-foot-btn-text primary">{{ footBtnText }}</text>
          </view>
        </template>
      </view>

      <!-- 入场凭证弹窗（凭证码展示范式与课程签到一致） -->
      <view v-if="showQrCode" class="ed-modal-mask" @tap="showQrCode = false">
        <view class="ed-modal" @tap.stop>
          <view class="ed-modal-head">
            <text class="ed-modal-title">活动报名凭证</text>
            <view @tap="showQrCode = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
          </view>
          <view class="ed-qr"><app-icon name="qr-code" :size="120" color="#1a1a1a" /></view>
          <text v-if="myReg?.qrCode" class="ed-qr-code">{{ myReg.qrCode }}</text>
          <text class="ed-qr-hint">请在入场时向驿站工作人员出示，由驿站扫码核销</text>
          <view class="ed-qr-info">
            <text class="ed-qr-info-row">活动: {{ event.title }}</text>
            <text class="ed-qr-info-row">时间: {{ eventTimeRange(event.startTime, event.endTime) }}</text>
            <text class="ed-qr-info-row">地点: {{ event.location || event.station?.address }}</text>
          </view>
          <view class="ed-modal-btn" @tap="showQrCode = false"><text class="ed-modal-btn-text">关闭</text></view>
        </view>
      </view>

      <!-- 取消报名确认 -->
      <view v-if="showCancelConfirm" class="ed-modal-mask" @tap="showCancelConfirm = false">
        <view class="ed-modal" @tap.stop>
          <view class="ed-confirm-icon"><app-icon name="alert-circle" :size="48" color="#f59e0b" /></view>
          <text class="ed-confirm-title">确认取消报名？</text>
          <text class="ed-confirm-text">取消后名额将释放，如需再次参加请重新报名。</text>
          <view class="ed-confirm-btns">
            <view class="ed-confirm-btn ghost" @tap="showCancelConfirm = false"><text class="ed-confirm-btn-text">再想想</text></view>
            <view class="ed-confirm-btn danger" :class="{ disabled: submitting }" @tap="onCancel"><text class="ed-confirm-btn-text danger">确认取消</text></view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import {
  offlineApi, getEventTypeLabel, getEventTypeStyle, deriveEventStatus,
  courseStatusLabel, courseStatusStyle, eventTimeRange, num,
  type StationEventDetail, type EventRegistration,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const eventId = ref('')
const event = ref<StationEventDetail | null>(null)
const myReg = ref<EventRegistration | null>(null)
const submitting = ref(false)
const showQrCode = ref(false)
const showCancelConfirm = ref(false)

const derivedStatus = computed(() => (event.value ? deriveEventStatus(event.value) : 'draft'))
const enrolledCount = computed(() => event.value?._count?.registrations ?? 0)
const isFull = computed(() => derivedStatus.value === 'full')
/** 已结束/已取消/进行中均视为报名窗口关闭 */
const isOver = computed(() => derivedStatus.value === 'ended' || derivedStatus.value === 'cancelled')
const isEnrolled = computed(() => !!myReg.value && myReg.value.status !== 'CANCELLED')
const signed = computed(() => myReg.value?.status === 'SIGNED_IN')
const canEnroll = computed(() => derivedStatus.value === 'enrolling' && !isEnrolled.value)
const photos = computed(() => (Array.isArray(event.value?.photos) ? event.value!.photos! : []))

const progressPercent = computed(() => {
  const max = event.value?.maxAttendees || 0
  if (!max) return 0
  return Math.min(100, Math.max(0, Math.round((enrolledCount.value / max) * 100)))
})

const footBtnText = computed(() => {
  if (submitting.value) return '提交中…'
  if (derivedStatus.value === 'ended') return '已结束'
  if (derivedStatus.value === 'cancelled') return '已取消'
  if (derivedStatus.value === 'ongoing') return '进行中'
  if (isFull.value) return '已满员'
  if (canEnroll.value) return '立即报名'
  return courseStatusLabel[derivedStatus.value]
})

async function load() {
  if (!eventId.value) { loading.value = false; errMsg.value = '缺少活动参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    const d = await offlineApi.getEvent(eventId.value)
    event.value = d
    myReg.value = d.myRegistration || null
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
    event.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  eventId.value = q && q.id ? String(q.id) : ''
  load()
})

async function onEnroll() {
  if (!canEnroll.value || submitting.value) return
  submitting.value = true
  try {
    const reg = await offlineApi.registerEvent(eventId.value)
    myReg.value = reg
    uni.showToast({ title: num(event.value?.price) > 0 ? '报名成功 · 请到场支付' : '报名成功', icon: 'success' })
    await load()
    showQrCode.value = true
  } catch (e) {
    // 业务异常（已报名/已满/未登录）message 直接 toast
    const msg = (e as Error)?.message || '报名失败'
    if (msg.includes('已报名') || msg.includes('已经')) {
      myReg.value = { id: '', eventId: eventId.value, userId: '', status: 'REGISTERED', qrCode: null, signedAt: null }
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
    await offlineApi.cancelEventRegistration(eventId.value)
    myReg.value = null
    showCancelConfirm.value = false
    uni.showToast({ title: '已取消报名', icon: 'none' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '取消失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function previewPhoto(index: number) {
  if (!photos.value.length) return
  uni.previewImage({ urls: photos.value, current: photos.value[index] })
}

// 微信原生分享（好友/朋友圈）—— 路径由 useShare 自动携带分享者 ref（推广归因）
const { toAppMessage, toTimeline } = useShare()
const shareTitle = () => (event.value ? `${getEventTypeLabel(event.value.type)} · ${event.value.title}` : '驿站线下活动')
const shareSummary = () => {
  const intro = event.value?.intro || ''
  return intro.length > 40 ? intro.slice(0, 40) + '…' : intro || undefined
}
onShareAppMessage(() => toAppMessage({
  title: shareTitle(),
  summary: shareSummary(),
  path: `/pkg-offline/events/detail?id=${eventId.value}`,
  cover: event.value?.cover || undefined,
}))
onShareTimeline(() => toTimeline({
  title: shareTitle(),
  summary: shareSummary(),
  path: `/pkg-offline/events/detail?id=${eventId.value}`,
  cover: event.value?.cover || undefined,
}))
</script>

<style scoped>
.ed-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.ed-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.ed-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.ed-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.ed-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 8px; }
.ed-body { flex: 1; }
.ed-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-top: 120px; }
.ed-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.ed-cover { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.ed-cover-img { width: 100%; height: 100%; }
.ed-type-tag { position: absolute; top: 12px; left: 12px; padding: 3px 10px; font-size: 12px; font-weight: 500; border-radius: 6px; }
.ed-cover-status { position: absolute; top: 12px; right: 12px; padding: 3px 10px; font-size: 12px; border-radius: 6px; }
.ed-main { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.ed-block { display: flex; flex-direction: column; }
.ed-title { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.ed-price-row { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; }
.ed-price { font-size: 22px; font-weight: 700; color: var(--brand); }
.ed-price.free { font-size: 16px; color: #16a34a; }
.ed-pay-hint { font-size: 11px; color: #9ca3af; }
.ed-card { background: #fff; border-radius: 12px; padding: 16px; }
.ed-card-row { display: flex; align-items: flex-start; gap: 12px; }
.ed-card-row + .ed-card-row { margin-top: 12px; }
.ed-card-info { flex: 1; }
.ed-card-label { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.ed-card-value { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.ed-progress-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.ed-progress-track { flex: 1; height: 6px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
.ed-progress-fill { height: 100%; background: linear-gradient(90deg, #d97706, #c41e3a); border-radius: 999px; }
.ed-progress-text { font-size: 12px; color: #6b7280; flex-shrink: 0; }
.ed-full { color: #ea580c; }
.ed-sec-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 10px; }
.ed-intro-text { font-size: 14px; color: #4b5563; line-height: 1.8; white-space: pre-line; }

.ed-voucher-card { display: flex; align-items: center; gap: 12px; }
.ed-voucher-icon { width: 44px; height: 44px; border-radius: 999px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ed-voucher-info { flex: 1; min-width: 0; }
.ed-voucher-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.ed-voucher-desc { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }

.ed-photos { display: flex; flex-wrap: wrap; gap: 6px; }
.ed-photo { width: calc((100% - 12px) / 3); aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #f3f0ea; }
.ed-photo-img { width: 100%; height: 100%; }

.ed-safe { height: 88px; }
.ed-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.ed-foot-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; }
.ed-foot-btn.ghost { border: 1px solid #e5e7eb; }
.ed-foot-btn.primary { background: var(--brand); }
.ed-foot-btn.primary.disabled { background: #d1a5ac; }
.ed-foot-btn-text { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.ed-foot-btn-text.primary { color: #fff; }
.ed-foot-cancel { padding: 0 12px; height: 44px; display: flex; align-items: center; }
.ed-foot-cancel-text { font-size: 14px; color: #dc2626; }
.ed-foot-price { flex: 1; }
.ed-foot-price-text { font-size: 18px; font-weight: 700; color: var(--brand); }
.ed-foot-price-text.free { color: #16a34a; }

.ed-modal-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ed-modal { width: 100%; max-width: 340px; background: #fff; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; }
.ed-modal-head { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.ed-modal-title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.ed-qr { width: 192px; height: 192px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.ed-qr-code { font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #1a1a1a; margin-bottom: 8px; }
.ed-qr-hint { font-size: 12px; color: #9ca3af; margin-bottom: 12px; text-align: center; line-height: 1.6; }
.ed-qr-info { width: 100%; background: #f3f4f6; border-radius: 8px; padding: 12px; }
.ed-qr-info-row { display: block; font-size: 13px; color: #4b5563; line-height: 1.8; }
.ed-modal-btn { width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 16px; }
.ed-modal-btn-text { font-size: 15px; color: #1a1a1a; }
.ed-confirm-icon { margin-bottom: 12px; }
.ed-confirm-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.ed-confirm-text { font-size: 13px; color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 20px; }
.ed-confirm-btns { display: flex; gap: 12px; width: 100%; }
.ed-confirm-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.ed-confirm-btn.ghost { border: 1px solid #e5e7eb; }
.ed-confirm-btn.danger { background: #dc2626; }
.ed-confirm-btn.disabled { opacity: 0.6; }
.ed-confirm-btn-text { font-size: 15px; color: #1a1a1a; }
.ed-confirm-btn-text.danger { color: #fff; }
</style>
