<template>
  <view class="me-page">
    <view class="me-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="me-nav">
        <view class="me-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="me-nav-title">活动管理</text>
        <view class="me-icon-btn" @tap="openCreate"><app-icon name="plus" :size="22" color="#9a2e25" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="me-body">
      <!-- 三态 -->
      <view v-if="loading" class="me-state"><view class="spinner" /><text class="me-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="me-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" /><text class="me-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="events.length === 0" class="me-state">
        <app-icon name="calendar-plus" :size="48" color="#d1d5db" />
        <text class="me-state-text">还没有活动</text>
        <text class="me-state-sub">雅集、沙龙、读书会、节气活动是驿站获客引流的灵魂业态</text>
        <view class="retry-btn" @tap="openCreate"><text class="retry-text">创建第一场活动</text></view>
      </view>

      <view v-else class="me-list">
        <view v-for="e in events" :key="e.id" class="me-card">
          <view class="me-card-top">
            <view class="me-card-head">
              <text class="me-type" :style="{ color: getEventTypeStyle(e.type).color, background: getEventTypeStyle(e.type).bg }">{{ getEventTypeLabel(e.type) }}</text>
              <text class="me-card-title">{{ e.title }}</text>
            </view>
            <text class="me-status" :style="statusStyle(e.status)">{{ eventStatusLabel[e.status] || e.status }}</text>
          </view>
          <view class="me-card-meta">
            <text class="me-meta-item">{{ eventTimeRange(e.startTime, e.endTime) }}</text>
            <text class="me-meta-item">{{ e.location }}</text>
          </view>
          <view class="me-card-foot">
            <view class="me-foot-stat">
              <text class="me-price">{{ num(e.price) === 0 ? '免费' : '¥' + num(e.price) }}</text>
              <text class="me-reg">报名 {{ e._count?.registrations ?? 0 }}/{{ e.maxAttendees }}</text>
            </view>
          </view>
          <!-- 操作行（按状态） -->
          <view class="me-actions">
            <template v-if="e.status === 'DRAFT'">
              <view class="me-btn primary" :class="{ disabled: statusSubmittingId === e.id }" @tap="onStatusAction(e, 'publish')">
                <text class="me-btn-text primary">{{ statusSubmittingId === e.id ? '发布中…' : '发布' }}</text>
              </view>
              <view class="me-btn" @tap="openEdit(e)"><text class="me-btn-text">编辑</text></view>
            </template>
            <template v-else-if="e.status === 'PUBLISHED'">
              <view class="me-btn primary" @tap="openSignIn(e)"><text class="me-btn-text primary">核销</text></view>
              <view class="me-btn" @tap="openEdit(e)"><text class="me-btn-text">编辑</text></view>
              <view class="me-btn" :class="{ disabled: statusSubmittingId === e.id }" @tap="onStatusAction(e, 'finish')"><text class="me-btn-text">结束</text></view>
              <view class="me-btn danger" :class="{ disabled: statusSubmittingId === e.id }" @tap="onStatusAction(e, 'cancel')"><text class="me-btn-text danger">取消</text></view>
            </template>
            <template v-else-if="e.status === 'FINISHED'">
              <view class="me-btn primary" :class="{ disabled: photosSubmittingId === e.id }" @tap="onUploadPhotos(e)">
                <text class="me-btn-text primary">{{ photosSubmittingId === e.id ? '上传中…' : `上传回顾照片 ${photoCount(e)}/30` }}</text>
              </view>
              <view v-if="photoCount(e) > 0" class="me-btn" @tap="previewPhotos(e)"><text class="me-btn-text">查看照片</text></view>
            </template>
            <text v-else class="me-cancelled-hint">活动已取消</text>
          </view>
        </view>
      </view>
      <view class="me-safe" />
    </scroll-view>

    <!-- 创建/编辑活动弹层 -->
    <view v-if="formOpen" class="me-mask" @tap="closeForm">
      <view class="me-sheet" @tap.stop>
        <view class="me-sheet-head">
          <text class="me-sheet-title">{{ editingId ? '编辑活动' : '创建活动' }}</text>
          <view @tap="closeForm"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <scroll-view scroll-y class="me-sheet-body">
          <view class="me-field">
            <text class="me-label">活动标题 <text class="req">*</text></text>
            <input v-model="form.title" class="me-input" placeholder="如：谷雨茶会·围炉煮茶雅集" placeholder-class="ph" />
          </view>
          <view class="me-field">
            <text class="me-label">活动类型 <text class="req">*</text></text>
            <picker mode="selector" :range="typeNames" @change="onPickType">
              <view class="me-picker">
                <text class="me-picker-text">{{ form.type ? eventTypeLabel[form.type] : '选择活动类型' }}</text>
                <app-icon name="chevron-down" :size="16" color="#9ca3af" />
              </view>
            </picker>
          </view>
          <view class="me-field">
            <text class="me-label">活动封面</text>
            <view class="me-cover-box" @tap="onPickCover">
              <image lazy-load v-if="form.cover" :src="form.cover" class="me-cover-img" mode="aspectFill" />
              <view v-else class="me-cover-empty">
                <app-icon name="camera" :size="24" color="#9ca3af" />
                <text class="me-cover-hint">{{ coverUploading ? '上传中…' : '上传封面图' }}</text>
              </view>
            </view>
          </view>
          <view class="me-field">
            <text class="me-label">活动日期 <text class="req">*</text></text>
            <picker mode="date" :value="form.date" :start="editingId ? '' : todayStr" @change="onDateChange">
              <view class="me-picker"><text class="me-picker-text">{{ form.date || '选择日期' }}</text><app-icon name="calendar" :size="16" color="#9ca3af" /></view>
            </picker>
          </view>
          <view class="me-field-row">
            <view class="me-field flex1">
              <text class="me-label">开始时间 <text class="req">*</text></text>
              <picker mode="time" :value="form.startTime" @change="onStartChange">
                <view class="me-picker"><text class="me-picker-text">{{ form.startTime || '--:--' }}</text></view>
              </picker>
            </view>
            <view class="me-field flex1">
              <text class="me-label">结束时间 <text class="req">*</text></text>
              <picker mode="time" :value="form.endTime" @change="onEndChange">
                <view class="me-picker"><text class="me-picker-text">{{ form.endTime || '--:--' }}</text></view>
              </picker>
            </view>
          </view>
          <view class="me-field-row">
            <view class="me-field flex1">
              <text class="me-label">价格（元）</text>
              <input v-model="form.price" type="number" class="me-input" placeholder="0=免费" placeholder-class="ph" />
            </view>
            <view class="me-field flex1">
              <text class="me-label">名额 <text class="req">*</text></text>
              <input v-model="form.maxAttendees" type="number" class="me-input" placeholder="如 20" placeholder-class="ph" />
            </view>
          </view>
          <view class="me-field">
            <text class="me-label">活动地点 <text class="req">*</text></text>
            <input v-model="form.location" class="me-input" placeholder="详细活动地址" placeholder-class="ph" />
          </view>
          <view class="me-field">
            <text class="me-label">活动简介</text>
            <textarea v-model="form.intro" class="me-textarea" placeholder="活动内容、流程、参加须知" placeholder-class="ph" />
          </view>
          <view class="me-tip"><app-icon name="info" :size="13" color="#9a2e25" /><text class="me-tip-text">活动创建后为草稿，点「发布」后学员可见并报名</text></view>
          <view class="me-submit" :class="{ disabled: !canSubmit || submitting }" @tap="submitForm">
            <text class="me-submit-text">{{ submitting ? '提交中…' : (editingId ? '保存修改' : '创建活动') }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 核销弹层（活动凭证码·扫码或手动输入） -->
    <view v-if="signInOpen" class="me-mask center" @tap="closeSignIn">
      <view class="me-modal" @tap.stop>
        <view class="me-sheet-head">
          <text class="me-sheet-title">活动签到核销</text>
          <view @tap="closeSignIn"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <text v-if="signInEvent" class="me-signin-event">{{ signInEvent.title }}</text>
        <view class="me-scan-btn" @tap="onScan">
          <app-icon name="qr-code" :size="20" color="#fff" />
          <text class="me-scan-text">扫码核销学员凭证</text>
        </view>
        <view class="me-code-row">
          <input v-model="codeInput" class="me-code-input" placeholder="或手动输入凭证码" placeholder-class="ph" />
          <view class="me-code-btn" :class="{ disabled: !codeInput.trim() || verifying }" @tap="doSignIn(codeInput.trim())">
            <text class="me-code-btn-text">{{ verifying ? '核销中' : '核销' }}</text>
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
import { goBack } from '@/utils/router'
import { uploadImage, chooseAndUploadImage } from '@/utils/request'
import {
  offlineManageApi, eventTypeLabel, getEventTypeLabel, getEventTypeStyle,
  eventStatusLabel, eventStatusStyle, eventTimeRange, num,
  type StationEvent, type StationEventType,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const events = ref<StationEvent[]>([])

const TYPE_VALUES: StationEventType[] = ['YAJI', 'SALON', 'READING', 'SOLAR_TERM', 'EXPERIENCE']
const typeNames = TYPE_VALUES.map((t) => eventTypeLabel[t])

function statusStyle(s: string) {
  const st = eventStatusStyle[s] || { color: '#6b7280', bg: '#f3f4f6' }
  return { color: st.color, background: st.bg }
}
function photoCount(e: StationEvent) { return Array.isArray(e.photos) ? e.photos.length : 0 }

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    // dashboard 端点由后端从 JWT 反查驿站；stationId 仅用于创建载荷
    if (!stationId.value) {
      const s = await offlineManageApi.getMyStation()
      if (!s) { errMsg.value = '你还不是驿站运营者'; loading.value = false; return }
      stationId.value = s.id
    }
    const d = await offlineManageApi.getManageEvents(1, 100)
    events.value = d.items
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败')
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  stationId.value = q && q.stationId ? String(q.stationId) : ''
  load()
})

// ===== 创建 / 编辑表单 =====
const formOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const coverUploading = ref(false)
const emptyForm = () => ({
  title: '', type: '' as StationEventType | '', cover: '', intro: '',
  price: '', maxAttendees: '', date: '', startTime: '14:00', endTime: '16:00', location: '',
})
const form = ref(emptyForm())

const todayStr = computed(() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})
const canSubmit = computed(() =>
  !!form.value.title.trim() && !!form.value.type && !!form.value.maxAttendees &&
  !!form.value.date && !!form.value.startTime && !!form.value.endTime && !!form.value.location.trim())

function openCreate() {
  editingId.value = ''
  form.value = { ...emptyForm(), date: todayStr.value }
  formOpen.value = true
}
function openEdit(e: StationEvent) {
  editingId.value = e.id
  const s = new Date(e.startTime)
  const en = new Date(e.endTime)
  const p = (n: number) => String(n).padStart(2, '0')
  form.value = {
    title: e.title,
    type: (TYPE_VALUES.includes(e.type as StationEventType) ? e.type : '') as StationEventType | '',
    cover: e.cover || '',
    intro: e.intro || '',
    price: num(e.price) > 0 ? String(num(e.price)) : '',
    maxAttendees: String(e.maxAttendees || ''),
    date: isNaN(s.getTime()) ? todayStr.value : `${s.getFullYear()}-${p(s.getMonth() + 1)}-${p(s.getDate())}`,
    startTime: isNaN(s.getTime()) ? '14:00' : `${p(s.getHours())}:${p(s.getMinutes())}`,
    endTime: isNaN(en.getTime()) ? '16:00' : `${p(en.getHours())}:${p(en.getMinutes())}`,
    location: e.location || '',
  }
  formOpen.value = true
}
function closeForm() {
  if (submitting.value) return
  formOpen.value = false
}
function onPickType(e: { detail: { value: number } }) { form.value.type = TYPE_VALUES[Number(e.detail.value)] || '' }
function onDateChange(e: { detail: { value: string } }) { form.value.date = e.detail.value }
function onStartChange(e: { detail: { value: string } }) { form.value.startTime = e.detail.value }
function onEndChange(e: { detail: { value: string } }) { form.value.endTime = e.detail.value }

function onPickCover() {
  if (coverUploading.value) return
  coverUploading.value = true
  chooseAndUploadImage()
    .then((url) => { form.value.cover = url })
    .catch((e) => {
      const msg = (e as Error)?.message || ''
      if (msg !== '已取消') uni.showToast({ title: msg || '上传失败', icon: 'none' })
    })
    .finally(() => { coverUploading.value = false })
}

async function submitForm() {
  if (!canSubmit.value || submitting.value) return
  if (form.value.endTime <= form.value.startTime) {
    uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      stationId: stationId.value || undefined,
      title: form.value.title.trim(),
      type: form.value.type as StationEventType,
      intro: form.value.intro.trim() || undefined,
      cover: form.value.cover || undefined,
      price: Number(form.value.price) || 0,
      maxAttendees: Number(form.value.maxAttendees),
      startTime: `${form.value.date}T${form.value.startTime}:00`,
      endTime: `${form.value.date}T${form.value.endTime}:00`,
      location: form.value.location.trim(),
    }
    if (editingId.value) {
      await offlineManageApi.updateEvent(editingId.value, payload)
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await offlineManageApi.createEvent(payload)
      uni.showToast({ title: '已创建，发布后学员可见', icon: 'success' })
    }
    formOpen.value = false
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// ===== 状态操作（发布 / 取消 / 结束） =====
const statusSubmittingId = ref('')

function onStatusAction(e: StationEvent, action: 'publish' | 'cancel' | 'finish') {
  if (statusSubmittingId.value) return
  if (action === 'publish') { doStatusAction(e, action); return }
  const tips = {
    cancel: { title: '取消活动', content: `确认取消《${e.title}》？已报名学员的名额将释放，此操作不可恢复。`, confirm: '确认取消' },
    finish: { title: '结束活动', content: `确认结束《${e.title}》？结束后可上传回顾照片，学员不可再报名。`, confirm: '确认结束' },
  }[action]
  uni.showModal({
    title: tips.title,
    content: tips.content,
    confirmText: tips.confirm,
    cancelText: '再想想',
    success: (res) => { if (res.confirm) doStatusAction(e, action) },
  })
}

async function doStatusAction(e: StationEvent, action: 'publish' | 'cancel' | 'finish') {
  if (statusSubmittingId.value) return
  statusSubmittingId.value = e.id
  try {
    await offlineManageApi.updateEventStatus(e.id, action)
    uni.showToast({ title: action === 'publish' ? '已发布' : action === 'cancel' ? '已取消' : '已结束', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: (err as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    statusSubmittingId.value = ''
  }
}

// ===== 回顾照片（FINISHED·多图 ≤30） =====
const photosSubmittingId = ref('')

function onUploadPhotos(e: StationEvent) {
  if (photosSubmittingId.value) return
  const existing = Array.isArray(e.photos) ? e.photos : []
  const remain = 30 - existing.length
  if (remain <= 0) { uni.showToast({ title: '回顾照片最多 30 张', icon: 'none' }); return }
  uni.chooseImage({
    count: Math.min(9, remain),
    sizeType: ['compressed'],
    success: (res) => {
      const paths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths]
      if (paths.length) uploadPhotos(e, existing, paths as string[])
    },
    fail: () => {},
  })
}

async function uploadPhotos(e: StationEvent, existing: string[], paths: string[]) {
  photosSubmittingId.value = e.id
  try {
    const urls: string[] = []
    for (let i = 0; i < paths.length; i++) {
      uni.showLoading({ title: `上传中 ${i + 1}/${paths.length}`, mask: true })
      urls.push(await uploadImage(paths[i]))
    }
    const merged = [...existing, ...urls].slice(0, 30)
    await offlineManageApi.updateEventPhotos(e.id, merged)
    const target = events.value.find((x) => x.id === e.id)
    if (target) target.photos = merged
    uni.showToast({ title: `已上传 ${urls.length} 张`, icon: 'success' })
  } catch (err) {
    uni.showToast({ title: (err as Error)?.message || '上传失败', icon: 'none' })
  } finally {
    uni.hideLoading()
    photosSubmittingId.value = ''
  }
}

function previewPhotos(e: StationEvent) {
  const photos = Array.isArray(e.photos) ? e.photos : []
  if (photos.length) uni.previewImage({ urls: photos, current: photos[0] })
}

// ===== 签到核销（扫码 / 手动输入凭证码） =====
const signInOpen = ref(false)
const signInEvent = ref<StationEvent | null>(null)
const codeInput = ref('')
const verifying = ref(false)

function openSignIn(e: StationEvent) {
  signInEvent.value = e
  codeInput.value = ''
  signInOpen.value = true
}
function closeSignIn() {
  if (verifying.value) return
  signInOpen.value = false
}
async function doSignIn(qrCode: string) {
  if (!qrCode || verifying.value) return
  verifying.value = true
  try {
    await offlineManageApi.eventSignIn(qrCode)
    uni.showToast({ title: '核销成功', icon: 'success' })
    codeInput.value = ''
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '核销失败', icon: 'none' })
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
.me-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.me-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.me-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.me-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.me-nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.me-body { flex: 1; }
.me-state { padding: 90px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.me-state-text { font-size: 13px; color: #9ca3af; }
.me-state-sub { font-size: 12px; color: #c9beb2; text-align: center; line-height: 1.6; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }

.me-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.me-card { background: #fff; border-radius: 12px; padding: 16px; }
.me-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.me-card-head { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.me-type { font-size: 11px; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
.me-card-title { flex: 1; font-size: 15px; font-weight: 600; color: #2a1f1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.me-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
.me-card-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
.me-meta-item { font-size: 12px; color: #9ca3af; }
.me-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.me-foot-stat { display: flex; align-items: baseline; gap: 12px; }
.me-price { font-size: 16px; font-weight: 700; color: #9a2e25; }
.me-reg { font-size: 12px; color: #6b7280; }
.me-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f0ea; }
.me-btn { padding: 6px 14px; background: #f3f0ea; border-radius: 8px; }
.me-btn.primary { background: #9a2e25; }
.me-btn.danger { background: #fef2f2; }
.me-btn.disabled { opacity: 0.6; }
.me-btn-text { font-size: 13px; color: #4b4039; }
.me-btn-text.primary { color: #fff; }
.me-btn-text.danger { color: #dc2626; }
.me-cancelled-hint { font-size: 12px; color: #9ca3af; }
.me-safe { height: 24px; }

.me-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.me-mask.center { align-items: center; justify-content: center; padding: 24px; }
.me-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; max-height: 86vh; display: flex; flex-direction: column; }
.me-modal { width: 100%; max-width: 340px; background: #fff; border-radius: 16px; padding: 20px; }
.me-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #ededed; }
.me-modal .me-sheet-head { padding: 0 0 14px; border-bottom: none; }
.me-sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.me-sheet-body { padding: 16px; }
.me-field { margin-bottom: 14px; }
.me-field-row { display: flex; gap: 12px; }
.flex1 { flex: 1; }
.me-label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px; }
.req { color: #dc2626; }
.me-input { height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.me-textarea { width: 100%; box-sizing: border-box; min-height: 70px; padding: 10px 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.me-picker { height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
.me-picker-text { font-size: 14px; color: #1a1a1a; }
.ph { color: #9ca3af; }
.me-cover-box { width: 100%; aspect-ratio: 2 / 1; background: #f9f7f3; border: 1px dashed #d8ccb8; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.me-cover-img { width: 100%; height: 100%; }
.me-cover-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.me-cover-hint { font-size: 12px; color: #9ca3af; }
.me-tip { display: flex; align-items: center; gap: 6px; margin: 4px 0 16px; }
.me-tip-text { font-size: 12px; color: #9a2e25; }
.me-submit { height: 46px; background: #9a2e25; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.me-submit.disabled { background: #d1b5b1; }
.me-submit-text { font-size: 15px; color: #fff; font-weight: 500; }

.me-signin-event { display: block; font-size: 13px; color: #6b7280; margin-bottom: 14px; }
.me-scan-btn { height: 48px; background: #9a2e25; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.me-scan-text { font-size: 15px; color: #fff; font-weight: 500; }
.me-code-row { display: flex; gap: 8px; margin-top: 12px; }
.me-code-input { flex: 1; height: 42px; padding: 0 12px; background: #f9f7f3; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.me-code-btn { padding: 0 18px; height: 42px; background: rgba(154,46,37,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.me-code-btn.disabled { opacity: 0.5; }
.me-code-btn-text { font-size: 14px; color: #9a2e25; }
</style>
