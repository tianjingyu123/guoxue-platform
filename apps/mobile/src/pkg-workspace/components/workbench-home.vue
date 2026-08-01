<script setup lang="ts">
/**
 * 工作台首页（对应 V0 workbench-home.tsx）
 * 从业者概况 + 今日 KPI + 快捷入口 + 今日日程（可新增/确认/开始咨询）+ 今日提醒。
 *
 * 🔴 全部真数据（GET /practitioner/home）。V0 原稿是写死的「玄一先生 · 服务3742人 · 好评99%」，
 * 按「假数据直接删除」的规矩不搬——新老师进来就该是 0，那才是真的。
 */
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { wsApi, type Appointment } from '../lib/workspace-api'

const emit = defineEmits<{
  (e: 'navigate', tab: string): void
  (e: 'start-consult', a: Appointment): void
}>()

const loading = ref(true)
const failed = ref(false)
const stats = ref<{ key: string; label: string; value: string; hint?: string }[]>([])
const appts = ref<Appointment[]>([])
const reminders = ref<any[]>([])
const profile = ref<{ name: string; avatarText: string; title: string; joinDays: number; reportCount: number; clientCount: number }>({
  name: '', avatarText: '', title: '', joinDays: 0, reportCount: 0, clientCount: 0,
})
const isPro = ref(false)
const proLabel = ref('免费版')

/* 新增预约弹层 */
const addOpen = ref(false)
const fClient = ref('')
const fService = ref('八字精批')
const fChannel = ref('到店')
const fDate = ref('')
const fTime = ref('')
const fNote = ref('')
const saving = ref(false)

/* 预约详情弹层 */
const detail = ref<Appointment | null>(null)
useOverlayScrollLock(() => addOpen.value || Boolean(detail.value))

const SERVICES = ['八字精批', '流年运势', '八字合婚', '开业择日', '阳宅风水', '六爻问事', '宝宝起名']
const CHANNELS = ['到店', '线上语音', '线上视频', '线上文字', '上门堪舆']
const QUICK = [
  { key: 'paipan', label: '起盘', icon: 'compass' },
  { key: 'reports', label: '写报告', icon: 'scroll-text' },
  { key: 'clients', label: '加客户', icon: 'user-plus' },
  { key: 'ledger', label: '记一笔', icon: 'wallet' },
]
const STATUS_LABEL: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', done: '已完成', cancelled: '已取消',
}
const REMINDER_ICON: Record<string, string> = {
  BIRTHDAY: 'gift', LICHUN: 'sparkles', REPURCHASE: 'phone-outgoing', DAYUN: 'bell',
}

function timeOf(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const [home, prof] = await Promise.all([wsApi.home(), wsApi.profile()])
    stats.value = home.stats ?? []
    appts.value = home.appointments ?? []
    reminders.value = home.reminders ?? []
    isPro.value = !!home.pro?.isPro
    proLabel.value = home.pro?.isPro ? `专业版 · 剩 ${home.pro.daysLeft} 天` : '免费版'
    profile.value = {
      name: prof.name || '未设置昵称',
      avatarText: prof.brand?.avatarText || (prof.name || '易').slice(0, 1),
      title: prof.brand?.title || '尚未填写职称',
      joinDays: prof.stats?.joinDays ?? 0,
      reportCount: prof.stats?.reportCount ?? 0,
      clientCount: prof.stats?.clientCount ?? 0,
    }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
onShow(() => {
  if (!loading.value) load()
})

function onQuick(key: string) {
  if (key === 'ledger') {
    uni.navigateTo({ url: '/pkg-workspace/ledger/index' })
    return
  }
  emit('navigate', key)
}

function openAdd() {
  const now = new Date()
  fDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  fTime.value = '09:00'
  fClient.value = ''
  fNote.value = ''
  addOpen.value = true
}

async function saveAppt() {
  if (!fClient.value.trim() || !fDate.value || !fTime.value) {
    uni.showToast({ title: '请填客户与时间', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await wsApi.createAppointment({
      clientName: fClient.value.trim(),
      // 本地时间字符串 → 后端按 Date 解析（同为北京时区，不做额外换算）
      startAt: `${fDate.value}T${fTime.value}:00`,
      service: fService.value,
      channel: fChannel.value,
      note: fNote.value || undefined,
    })
    addOpen.value = false
    await load()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function confirmAppt(a: Appointment) {
  try {
    await wsApi.updateAppointment(a.id, { status: 'confirmed' })
    detail.value = null
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

async function finishAppt(a: Appointment) {
  try {
    await wsApi.updateAppointment(a.id, { status: 'done' })
    detail.value = null
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="wh">
    <!-- 从业者概况 -->
    <PaperCard gold padding="lg">
      <view class="wh-me">
        <view class="wh-avatar">{{ profile.avatarText }}</view>
        <view class="wh-me-info">
          <view class="wh-me-row">
            <text class="wh-me-name">{{ profile.name }}</text>
            <text class="wh-me-plan" :class="{ 'wh-me-plan--pro': isPro }">{{ proLabel }}</text>
          </view>
          <text class="wh-me-title">{{ profile.title }}</text>
        </view>
      </view>
      <view class="wh-me-stats">
        <view class="wh-me-stat">
          <text class="wh-me-stat-v">{{ profile.clientCount }}</text>
          <text class="wh-me-stat-l">客户档案</text>
        </view>
        <view class="wh-me-stat wh-me-stat--mid">
          <text class="wh-me-stat-v">{{ profile.reportCount }}</text>
          <text class="wh-me-stat-l">报告</text>
        </view>
        <view class="wh-me-stat">
          <text class="wh-me-stat-v">{{ profile.joinDays }}</text>
          <text class="wh-me-stat-l">从业天数</text>
        </view>
      </view>
    </PaperCard>

    <!-- 今日 KPI -->
    <view class="wh-kpi">
      <PaperCard v-for="s in stats" :key="s.key" padding="md">
        <view class="wh-kpi-box">
          <text class="wh-kpi-label">{{ s.label }}</text>
          <text class="wh-kpi-value">{{ s.value }}</text>
          <text v-if="s.hint" class="wh-kpi-hint">{{ s.hint }}</text>
        </view>
      </PaperCard>
    </view>

    <!-- 快捷入口 -->
    <PaperCard padding="lg">
      <SectionTitle title="快捷入口" />
      <view class="wh-quick">
        <view v-for="q in QUICK" :key="q.key" class="wh-quick-item" @tap="onQuick(q.key)">
          <view class="wh-quick-icon">
            <AppIcon :name="q.icon" :size="40" color="#C41E3A" />
          </view>
          <text class="wh-quick-label">{{ q.label }}</text>
        </view>
      </view>
    </PaperCard>

    <!-- 今日日程 -->
    <PaperCard padding="lg">
      <view class="wh-head">
        <SectionTitle title="今日日程" :subtitle="`共 ${appts.length} 个预约`" />
        <view class="wh-add-btn" @tap="openAdd">
          <AppIcon name="plus" :size="28" color="#C41E3A" />
          <text class="wh-add-txt">新增</text>
        </view>
      </view>

      <view v-if="loading" class="wh-skeleton" />
      <view v-else-if="!appts.length" class="wh-empty">
        <AppIcon name="calendar-days" :size="52" color="#D5C9B8" />
        <text class="wh-empty-txt">今日无预约</text>
        <text class="wh-empty-sub">点「新增」记下今天的客户</text>
      </view>
      <view v-else class="wh-appts">
        <view v-for="(a, i) in appts" :key="a.id" class="wh-appt" :class="{ 'wh-appt--line': i !== appts.length - 1 }">
          <view class="wh-appt-main" @tap="detail = a">
            <text class="wh-appt-time">{{ timeOf(a.startAt) }}</text>
            <view class="wh-appt-info">
              <view class="wh-appt-row">
                <text class="wh-appt-name">{{ a.clientName }}</text>
                <text class="wh-appt-service">{{ a.service }}</text>
              </view>
              <text class="wh-appt-channel">{{ a.channel }}</text>
            </view>
            <text class="wh-appt-status" :class="`wh-appt-status--${a.status}`">{{ STATUS_LABEL[a.status] }}</text>
          </view>
          <view v-if="a.status !== 'done' && a.status !== 'cancelled'" class="wh-appt-go" @tap="emit('start-consult', a)">
            <AppIcon name="play" :size="28" color="#fff" />
            <text class="wh-appt-go-txt">开始</text>
          </view>
        </view>
      </view>
    </PaperCard>

    <!-- 今日提醒（CRM 真提醒：生日/立春流年/复购） -->
    <PaperCard padding="lg">
      <SectionTitle title="今日提醒" subtitle="来自客户档案" />
      <view v-if="!reminders.length" class="wh-empty wh-empty--sm">
        <text class="wh-empty-txt">暂无待跟进的提醒</text>
      </view>
      <view v-else class="wh-reminders">
        <view v-for="r in reminders" :key="r.id" class="wh-reminder" @tap="emit('navigate', 'clients')">
          <view class="wh-reminder-icon">
            <AppIcon :name="REMINDER_ICON[r.kind] || 'bell'" :size="32" color="#C41E3A" />
          </view>
          <view class="wh-reminder-info">
            <text class="wh-reminder-title">{{ r.client?.name || '客户' }}</text>
            <text class="wh-reminder-desc">{{ r.aiDraft || r.kind }}</text>
          </view>
          <AppIcon name="chevron-right" :size="32" color="#B8AA9A" />
        </view>
      </view>
    </PaperCard>

    <view v-if="failed" class="wh-failed" @tap="load">
      <text class="wh-failed-txt">加载失败，点击重试</text>
    </view>

    <!-- 预约详情 -->
    <view v-if="detail" class="wh-mask" @tap="detail = null" @touchmove.self.prevent>
      <view class="wh-sheet" @tap.stop @touchmove.stop>
        <text class="wh-sheet-title">预约详情</text>
        <view class="wh-detail-head">
          <view>
            <text class="wh-detail-main">{{ timeOf(detail.startAt) }} · {{ detail.clientName }}</text>
            <text class="wh-detail-sub">{{ detail.service }} · {{ detail.channel }}</text>
          </view>
          <text class="wh-appt-status" :class="`wh-appt-status--${detail.status}`">{{ STATUS_LABEL[detail.status] }}</text>
        </view>
        <view v-if="detail.note" class="wh-detail-note">
          <text class="wh-detail-note-label">备注 / 备课要点</text>
          <text class="wh-detail-note-txt">{{ detail.note }}</text>
        </view>
        <view class="wh-sheet-actions">
          <view v-if="detail.status === 'pending'" class="wh-btn wh-btn--ghost" @tap="confirmAppt(detail)">
            <text class="wh-btn-txt wh-btn-txt--ghost">确认此预约</text>
          </view>
          <view v-if="detail.status !== 'done'" class="wh-btn wh-btn--ghost" @tap="detail = null; emit('navigate', 'paipan')">
            <text class="wh-btn-txt wh-btn-txt--ghost">排盘预习（咨询前备课）</text>
          </view>
          <view v-if="detail.status !== 'done'" class="wh-btn wh-btn--primary" @tap="emit('start-consult', detail!)">
            <text class="wh-btn-txt wh-btn-txt--primary">开始咨询</text>
          </view>
          <view v-if="detail.status === 'confirmed'" class="wh-btn wh-btn--ghost" @tap="finishAppt(detail)">
            <text class="wh-btn-txt wh-btn-txt--ghost">标记完成</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 新增预约 -->
    <view v-if="addOpen" class="wh-mask" @tap="addOpen = false" @touchmove.self.prevent>
      <view class="wh-sheet" @tap.stop @touchmove.stop>
        <text class="wh-sheet-title">新增预约</text>

        <text class="wh-field-label">客户</text>
        <input v-model="fClient" class="wh-input" placeholder="客户姓名" placeholder-class="wh-ph" />

        <text class="wh-field-label">服务类型</text>
        <view class="wh-chips">
          <view
            v-for="s in SERVICES"
            :key="s"
            class="wh-chip"
            :class="{ 'wh-chip--on': fService === s }"
            @tap="fService = s"
          >
            <text class="wh-chip-txt" :class="{ 'wh-chip-txt--on': fService === s }">{{ s }}</text>
          </view>
        </view>

        <text class="wh-field-label">咨询形式</text>
        <view class="wh-chips">
          <view
            v-for="c in CHANNELS"
            :key="c"
            class="wh-chip"
            :class="{ 'wh-chip--on': fChannel === c }"
            @tap="fChannel = c"
          >
            <text class="wh-chip-txt" :class="{ 'wh-chip-txt--on': fChannel === c }">{{ c }}</text>
          </view>
        </view>

        <text class="wh-field-label">预约时间</text>
        <view class="wh-datetime">
          <picker mode="date" :value="fDate" @change="(e: any) => (fDate = e.detail.value)">
            <view class="wh-picker">
              <text class="wh-picker-txt">{{ fDate || '选择日期' }}</text>
            </view>
          </picker>
          <picker mode="time" :value="fTime" @change="(e: any) => (fTime = e.detail.value)">
            <view class="wh-picker">
              <text class="wh-picker-txt">{{ fTime || '选择时间' }}</text>
            </view>
          </picker>
        </view>

        <text class="wh-field-label">备注（客户诉求 / 备课要点）</text>
        <textarea v-model="fNote" class="wh-textarea" placeholder="如：首次咨询，重点关注事业与流年……" placeholder-class="wh-ph" />

        <view class="wh-btn wh-btn--primary" @tap="saveAppt">
          <text class="wh-btn-txt wh-btn-txt--primary">{{ saving ? '保存中…' : '保存预约' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.wh {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

/* 概况 */
.wh-me {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.wh-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #C41E3A;
  color: #fff;
  font-size: 44rpx;
  font-weight: 700;
}

.wh-me-info {
  flex: 1;
  min-width: 0;
}

.wh-me-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.wh-me-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.wh-me-plan {
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: rgba(154, 140, 126, 0.14);
  font-size: 22rpx;
  color: #7A6C5E;
}

.wh-me-plan--pro {
  background: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
}

.wh-me-title {
  display: block;
  margin-top: 4rpx;
  font-size: 26rpx;
  color: #9A8C7E;
}

.wh-me-stats {
  display: flex;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(196, 30, 58, 0.15);
}

.wh-me-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.wh-me-stat--mid {
  border-left: 1rpx solid rgba(196, 30, 58, 0.12);
  border-right: 1rpx solid rgba(196, 30, 58, 0.12);
}

.wh-me-stat-v {
  font-size: 34rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.wh-me-stat-l {
  font-size: 24rpx;
  color: #9A8C7E;
}

/* KPI */
.wh-kpi {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.wh-kpi-box {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.wh-kpi-label {
  font-size: 24rpx;
  color: #9A8C7E;
}

.wh-kpi-value {
  font-size: 46rpx;
  font-weight: 700;
  color: #3A2A1E;
  line-height: 1.1;
}

.wh-kpi-hint {
  font-size: 22rpx;
  color: #B8860B;
}

/* 快捷入口 */
.wh-quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-top: 24rpx;
}

.wh-quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  min-height: 132rpx;
  padding: 16rpx 0;
  box-sizing: border-box;
}

.wh-quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
}

.wh-quick-label {
  font-size: 24rpx;
  color: #3A2A1E;
}

/* 日程 */
.wh-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.wh-add-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 64rpx;
  padding: 0 22rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.4);
  border-radius: 32rpx;
  flex-shrink: 0;
}

.wh-add-txt {
  font-size: 24rpx;
  font-weight: 600;
  color: #C41E3A;
}

.wh-appts {
  margin-top: 12rpx;
}

.wh-appt {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
}

.wh-appt--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.08);
}

.wh-appt-main {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.wh-appt-time {
  width: 88rpx;
  flex-shrink: 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #C41E3A;
}

.wh-appt-info {
  flex: 1;
  min-width: 0;
}

.wh-appt-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.wh-appt-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.wh-appt-service {
  font-size: 24rpx;
  color: #9A8C7E;
}

.wh-appt-channel {
  display: block;
  font-size: 22rpx;
  color: #B8AA9A;
}

.wh-appt-status {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.wh-appt-status--pending {
  background: rgba(184, 134, 11, 0.12);
  color: #B8860B;
}

.wh-appt-status--confirmed {
  background: rgba(45, 122, 78, 0.12);
  color: #2D7A4E;
}

.wh-appt-status--done,
.wh-appt-status--cancelled {
  background: rgba(154, 140, 126, 0.14);
  color: #9A8C7E;
}

.wh-appt-go {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 64rpx;
  padding: 0 22rpx;
  border-radius: 32rpx;
  background: #C41E3A;
  flex-shrink: 0;
}

.wh-appt-go-txt {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
}

/* 提醒 */
.wh-reminders {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 20rpx;
}

.wh-reminder {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.07);
}

.wh-reminder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
}

.wh-reminder-info {
  flex: 1;
  min-width: 0;
}

.wh-reminder-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.wh-reminder-desc {
  display: block;
  margin-top: 2rpx;
  font-size: 24rpx;
  color: #9A8C7E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 空态/骨架 */
.wh-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 0;
}

.wh-empty--sm {
  padding: 32rpx 0;
}

.wh-empty-txt {
  font-size: 28rpx;
  color: #9A8C7E;
}

.wh-empty-sub {
  font-size: 24rpx;
  color: #B8AA9A;
}

.wh-skeleton {
  height: 160rpx;
  margin-top: 16rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.1);
}

.wh-failed {
  padding: 24rpx;
  text-align: center;
}

.wh-failed-txt {
  font-size: 26rpx;
  color: #C41E3A;
}

/* 弹层 */
.wh-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}

.wh-sheet {
  width: 100%;
  max-height: 84vh;
  overflow-y: auto;
  padding: 32rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: #FDFAF4;
}

.wh-sheet-title {
  display: block;
  margin-bottom: 24rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
}

.wh-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  border-radius: 12rpx;
  background: rgba(196, 30, 58, 0.05);
}

.wh-detail-main {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.wh-detail-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #9A8C7E;
}

.wh-detail-note {
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.07);
}

.wh-detail-note-label {
  display: block;
  margin-bottom: 6rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.wh-detail-note-txt {
  font-size: 26rpx;
  line-height: 1.7;
  color: #3A2A1E;
}

.wh-sheet-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 28rpx;
}

.wh-field-label {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.wh-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3A2A1E;
}

.wh-textarea {
  width: 100%;
  height: 140rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  line-height: 1.6;
  color: #3A2A1E;
}

.wh-ph {
  color: #C4B8A8;
}

.wh-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.wh-chip {
  padding: 10rpx 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 30rpx;
}

.wh-chip--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

.wh-chip-txt {
  font-size: 24rpx;
  color: #3A2A1E;
}

.wh-chip-txt--on {
  color: #fff;
}

.wh-datetime {
  display: flex;
  gap: 16rpx;
}

.wh-picker {
  display: flex;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
}

.wh-picker-txt {
  font-size: 26rpx;
  color: #3A2A1E;
}

.wh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 12rpx;
}

.wh-btn--primary {
  margin-top: 32rpx;
  background: #C41E3A;
}

.wh-btn--ghost {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}

.wh-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
}

.wh-btn-txt--primary {
  color: #fff;
}

.wh-btn-txt--ghost {
  color: #C41E3A;
}
</style>
