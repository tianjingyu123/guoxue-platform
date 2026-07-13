<template>
  <view class="c4-page">
    <!-- 顶部导航 -->
    <view class="c4-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="c4-nav">
        <view class="c4-icon-btn" @tap="onBack">
          <app-icon name="chevron-left" :size="22" color="#2C2C2C" />
        </view>
        <text class="c4-nav-title">{{ view === 'list' ? '我的报名' : '到店凭证' }}</text>
        <view class="c4-nav-placeholder" />
      </view>
      <!-- 态①：状态 Tab -->
      <view v-if="view === 'list'" class="c4-tabs">
        <view v-for="t in tabs" :key="t.key" class="c4-tab" :class="{ on: tab === t.key }" @tap="tab = t.key">
          <text class="c4-tab-text">{{ t.label }}{{ t.key === 'pending' && pendingList.length ? ` (${pendingList.length})` : '' }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="c4-body">
      <!-- 三态 -->
      <view v-if="loading" class="c4-state">
        <view class="spinner" />
        <text class="c4-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="c4-state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
        <text class="c4-state-text">{{ errMsg }}</text>
        <view class="c4-retry" @tap="load"><text class="c4-retry-text">重试</text></view>
      </view>

      <!-- ============ 态①：报名列表 ============ -->
      <template v-else-if="view === 'list'">
        <view v-if="currentList.length === 0" class="c4-state">
          <app-icon name="ticket" :size="48" color="#d8cfc0" />
          <text class="c4-state-text">{{ emptyText }}</text>
          <view class="c4-retry" @tap="goDiscover"><text class="c4-retry-text">去发现线下课</text></view>
        </view>

        <view v-else class="c4-list">
          <view v-for="r in currentList" :key="r.id" class="c4-card">
            <view class="c4-card-top">
              <view class="c4-badge" :class="badgeClass(r)">{{ statusLabel(r) }}</view>
              <text class="c4-order-no">报名号 {{ shortId(r.id) }}</text>
            </view>
            <view class="c4-card-main">
              <view class="c4-cover">
                <image v-if="r.course.cover" :src="r.course.cover" class="c4-cover-img" mode="aspectFill" />
                <view v-else class="c4-cover-ph"><app-icon name="graduation-cap" :size="26" color="#cbb892" /></view>
              </view>
              <view class="c4-card-info">
                <text class="c4-course-title">{{ r.course.title }}</text>
                <text class="c4-course-time">{{ sessionTime(r.course) }}</text>
                <text class="c4-course-loc">{{ locText(r) }}</text>
              </view>
            </view>

            <!-- 待到店：出示凭证 + 取消 -->
            <template v-if="r.status === 'REGISTERED'">
              <view class="c4-card-actions">
                <view class="c4-btn c4-btn-primary" @tap="showTicket(r)"><text class="c4-btn-text">出示到店凭证</text></view>
                <view class="c4-btn c4-btn-o" @tap="onCancel(r)"><text class="c4-btn-o-text">取消报名</text></view>
              </view>
              <text class="c4-refund-hint">{{ refundHint(r.course) }}</text>
            </template>
            <!-- 已完成：写评价 -->
            <template v-else-if="r.status === 'SIGNED_IN'">
              <view class="c4-card-actions">
                <view class="c4-btn c4-btn-o" @tap="showTicket(r)"><text class="c4-btn-o-text">查看核销回执</text></view>
                <view class="c4-btn c4-btn-primary" @tap="goReview(r)"><text class="c4-btn-text">写评价</text></view>
              </view>
            </template>
            <!-- 已取消 -->
            <template v-else>
              <text class="c4-cancelled-hint">报名已取消{{ '' }}</text>
            </template>
          </view>

          <view class="c4-list-foot">
            <text>退改规则：距开课 ≥24h 可取消全额退款或改期1次；&lt;24h 仅可改期1次、不退款；已核销不退；缺席视为已消费不退。</text>
          </view>
        </view>
      </template>

      <!-- ============ 态②/③：凭证 / 回执 ============ -->
      <template v-else-if="active">
        <view class="c4-ticket-wrap">
          <view class="c4-ticket" :class="{ done: activeSigned }">
            <!-- 票头 -->
            <view class="c4-ticket-head" :class="activeSigned ? 'head-gold' : 'head-red'">
              <text class="c4-ticket-course">{{ active.course.title }}</text>
              <text class="c4-ticket-time">{{ sessionTime(active.course) }}</text>
              <text v-if="!activeSigned" class="c4-ticket-addr">{{ locText(active) }}</text>
              <view class="c4-ticket-meta">
                <view class="c4-ticket-chip">{{ activeSigned ? '✓ 已到店' : '待到店' }}</view>
                <text class="c4-ticket-user">{{ activeSigned ? ('核销时间 ' + fmtCourseTime(active.signedAt)) : ('学员：' + userName) }}</text>
              </view>
            </view>
            <!-- 撕线打孔 -->
            <view class="c4-perf"><view class="c4-perf-hole left" /><view class="c4-perf-hole right" /></view>
            <!-- 票体 -->
            <view class="c4-ticket-body">
              <view class="c4-qr-box" :class="{ dim: activeSigned }">
                <canvas canvas-id="c4-qr" class="c4-qr-canvas" />
                <view v-if="activeSigned" class="c4-stamp">已核销</view>
              </view>
              <template v-if="!activeSigned">
                <text v-if="active.verifyCode" class="c4-code-tip">扫码不便？向驿站工作人员报 6 位核销码</text>
                <view v-if="active.verifyCode" class="c4-code6">
                  <view v-for="(d, i) in codeDigits" :key="i" class="c4-code-cell">{{ d }}</view>
                </view>
                <text class="c4-ticket-note">凭证长按二维码可保存 · 核销后自动更新为「已到店」</text>
              </template>
              <template v-else>
                <text class="c4-done-title">签到成功，请入座</text>
                <text class="c4-done-sub">核销驿站：{{ active.course.station?.name || '驿站前台' }}</text>
              </template>
            </view>
          </view>

          <!-- 待到店：导航 / 联系 -->
          <template v-if="!activeSigned">
            <view class="c4-ticket-actions">
              <view class="c4-btn c4-btn-o" @tap="goNav"><app-icon name="map-pin" :size="14" color="#C41E3A" /><text class="c4-btn-o-text">导航到店</text></view>
              <view class="c4-btn c4-btn-o" @tap="callStation"><app-icon name="phone" :size="14" color="#C41E3A" /><text class="c4-btn-o-text">联系驿站</text></view>
            </view>
            <text class="c4-ticket-foot">到店后请出示本凭证给驿站工作人员</text>
          </template>
          <!-- 已核销：同学圈 / 评价 -->
          <template v-else>
            <view v-if="active.course.circleId" class="c4-btn c4-btn-primary c4-full" @tap="goCircle"><app-icon name="users" :size="15" color="#fff" /><text class="c4-btn-text">加入课程同学圈</text></view>
            <view class="c4-btn c4-btn-o c4-full" @tap="goReview(active)"><text class="c4-btn-o-text">课程结束后来写个评价</text></view>
          </template>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, getCurrentInstance } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getUserInfo } from '@/utils/storage'
import { drawQrToCanvas } from '@/utils/qrcode'
import { offlineApi, fmtCourseTime, type MyRegistration, type OfflineCourse } from '@/lib/offline-data'

const instance = getCurrentInstance()
const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const userName = computed(() => {
  const u = getUserInfo<{ nickname?: string }>()
  return u?.nickname || '本人'
})

const loading = ref(true)
const errMsg = ref('')
const list = ref<MyRegistration[]>([])
const view = ref<'list' | 'ticket'>('list')
const active = ref<MyRegistration | null>(null)
const initCourseId = ref('')

const tabs = [
  { key: 'pending', label: '待到店' },
  { key: 'done', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
] as const
const tab = ref<'pending' | 'done' | 'cancelled'>('pending')

const pendingList = computed(() => list.value.filter((r) => r.status === 'REGISTERED'))
const doneList = computed(() => list.value.filter((r) => r.status === 'SIGNED_IN'))
const cancelledList = computed(() => list.value.filter((r) => r.status === 'CANCELLED'))
const currentList = computed(() =>
  tab.value === 'pending' ? pendingList.value : tab.value === 'done' ? doneList.value : cancelledList.value,
)
const emptyText = computed(() =>
  tab.value === 'pending' ? '暂无待到店的报名' : tab.value === 'done' ? '还没有已完成的课程' : '没有已取消的报名',
)

const activeSigned = computed(() => active.value?.status === 'SIGNED_IN')
const codeDigits = computed(() => (active.value?.verifyCode || '').padEnd(6, ' ').slice(0, 6).split(''))

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    list.value = await offlineApi.getMyCourseRegistrations()
    // 从课程详情「出示凭证」进入：自动定位该报名的凭证态
    if (initCourseId.value) {
      const hit = list.value.find((r) => r.courseId === initCourseId.value)
      if (hit) { showTicket(hit); initCourseId.value = '' }
    }
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录后查看我的报名' : (msg || '加载失败')
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  initCourseId.value = q && (q.courseId || q.id) ? String(q.courseId || q.id) : ''
  load()
})

// ── 时间/文案 ──
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
function sessionTime(c: OfflineCourse): string {
  const s = new Date(c.startTime)
  const e = new Date(c.endTime)
  if (isNaN(s.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const wd = WEEK[s.getDay()]
  return `${s.getMonth() + 1}月${s.getDate()}日(${wd}) ${p(s.getHours())}:${p(s.getMinutes())}–${p(e.getHours())}:${p(e.getMinutes())}`
}
function locText(r: MyRegistration): string {
  const st = r.course.station
  return [st?.name, r.course.location || st?.address].filter(Boolean).join(' · ')
}
function shortId(id: string): string {
  return 'R' + id.replace(/-/g, '').slice(0, 10).toUpperCase()
}
function hoursToStart(startTime: string): number {
  return (new Date(startTime).getTime() - Date.now()) / 3600000
}
function refundHint(c: OfflineCourse): string {
  return hoursToStart(c.startTime) >= 24 ? '距开课 >24h · 可全额退款或改期' : '距开课 <24h · 仅可改期1次、恕不退款'
}
function statusLabel(r: MyRegistration): string {
  return r.status === 'SIGNED_IN' ? '已到店' : r.status === 'CANCELLED' ? '已取消' : '待到店'
}
function badgeClass(r: MyRegistration): string {
  return r.status === 'SIGNED_IN' ? 'badge-gold' : r.status === 'CANCELLED' ? 'badge-grey' : 'badge-red'
}

// ── 二维码渲染 ──
function renderQr() {
  const text = active.value?.qrCode
  if (!text) return
  try {
    const ctx = uni.createCanvasContext('c4-qr', instance)
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, 190, 190)
    drawQrToCanvas(ctx, text, 12, 12, 166, { padding: 0, radius: 0, foreground: '#1a1a1a' })
    ctx.draw()
  } catch { /* 画布不可用则留白，不阻断凭证展示 */ }
}
function showTicket(r: MyRegistration) {
  active.value = r
  view.value = 'ticket'
  nextTick(() => setTimeout(renderQr, 60))
}

// ── 操作 ──
function onBack() {
  if (view.value === 'ticket') { view.value = 'list'; active.value = null; return }
  goBack()
}
function onCancel(r: MyRegistration) {
  if (hoursToStart(r.course.startTime) < 24) {
    uni.showModal({ title: '不足24小时', content: '距开课不足24小时，恕不支持取消退款；如需改期请联系驿站', showCancel: false })
    return
  }
  uni.showModal({
    title: '取消报名',
    content: '确定取消本次报名？取消后名额释放，退款将原路返还（到账以平台处理为准）。',
    confirmText: '确定取消',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await offlineApi.cancelRegistration(r.courseId)
        uni.showToast({ title: '已取消', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '取消失败', icon: 'none' })
      }
    },
  })
}
function goDiscover() { navigateTo('/pkg-offline/courses/index') }
function goReview(r: MyRegistration) { navigateTo(`/pkg-offline/course-detail/index?id=${r.courseId}`) }
function goNav() {
  const st = active.value?.course.station
  if (!st?.name) return
  uni.showToast({ title: '正在打开地图导航', icon: 'none' })
}
function callStation() {
  const phone = active.value?.course.station?.phone
  if (phone) uni.makePhoneCall({ phoneNumber: phone }).catch(() => {})
  else uni.showToast({ title: '驿站未留电话', icon: 'none' })
}
function goCircle() {
  const cid = active.value?.course.circleId
  if (cid) navigateTo(`/pkg-circle/circles/detail?id=${cid}`)
}
</script>

<style lang="scss" scoped>
/* 视觉 token：宣纸白 #FAF8F5 / 卡片白 / 朱红 #C41E3A / 金 #C9A96E / 圆角18px / 页边距20px */
.c4-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.c4-header { background: #FAF8F5; }
.c4-nav { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.c4-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.c4-nav-title { font-size: 16px; font-weight: 600; color: #2C2C2C; }
.c4-nav-placeholder { width: 32px; }

.c4-tabs { display: flex; border-bottom: 1px solid #EFEAE3; }
.c4-tab { flex: 1; text-align: center; padding: 12px 0; position: relative; }
.c4-tab-text { font-size: 13px; color: #6E6E73; }
.c4-tab.on .c4-tab-text { color: #C41E3A; font-weight: 700; }
.c4-tab.on::after { content: ''; position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: 22px; height: 2.5px; border-radius: 2px; background: #C41E3A; }

.c4-body { flex: 1; height: 0; min-height: 0; }

.c4-state { padding-top: 90px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.c4-state-text { font-size: 13px; color: #999; }
.spinner { width: 28px; height: 28px; border: 3px solid #EFEAE3; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.c4-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.c4-retry-text { font-size: 13px; color: #C41E3A; }

/* 态①列表 */
.c4-list { padding: 14px 20px 40px; }
.c4-card { background: #fff; border-radius: 18px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.c4-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.c4-badge { font-size: 10px; font-weight: 600; color: #fff; border-radius: 6px; padding: 3px 9px; }
.badge-red { background: #C41E3A; }
.badge-gold { background: #C9A96E; }
.badge-grey { background: #b8b0a4; }
.c4-order-no { font-size: 11px; color: #999; }
.c4-card-main { display: flex; align-items: flex-start; gap: 11px; }
.c4-cover { width: 104px; flex-shrink: 0; border-radius: 12px; overflow: hidden; position: relative; }
.c4-cover::before { content: ''; display: block; padding-top: 62.5%; } /* 16:10 */
.c4-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.c4-cover-ph { position: absolute; inset: 0; background: linear-gradient(135deg, #f5ede0, #ece0cd); display: flex; align-items: center; justify-content: center; }
.c4-card-info { flex: 1; display: flex; flex-direction: column; }
.c4-course-title { font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; line-height: 1.3; }
.c4-course-time { font-size: 11px; color: #999; margin: 5px 0 3px; }
.c4-course-loc { font-size: 11px; color: #999; }
.c4-card-actions { display: flex; gap: 10px; margin-top: 12px; }
.c4-refund-hint { display: block; text-align: center; font-size: 11px; color: #999; margin-top: 8px; }
.c4-cancelled-hint { display: block; text-align: center; font-size: 12px; color: #b8b0a4; margin-top: 10px; }
.c4-list-foot { padding: 8px 4px 0; font-size: 11px; color: #b0a89c; line-height: 1.7; }

.c4-btn { flex: 1; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.c4-btn-primary { background: #C41E3A; }
.c4-btn-text { font-size: 13px; font-weight: 600; color: #fff; }
.c4-btn-o { background: #fff; border: 1px solid #C41E3A; }
.c4-btn-o-text { font-size: 13px; font-weight: 600; color: #C41E3A; }
.c4-full { width: 100%; flex: none; margin-top: 12px; }

/* 态②/③票券 */
.c4-ticket-wrap { padding: 22px 20px 40px; }
.c4-ticket { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(60,40,20,0.12); }
.c4-ticket-head { padding: 20px; }
.head-red { background: linear-gradient(135deg, #C41E3A, #a5162e); }
.head-gold { background: linear-gradient(135deg, #C9A96E, #b8964f); }
.c4-ticket-course { display: block; font-size: 19px; font-weight: 700; color: #fff; font-family: 'Songti SC', serif; }
.c4-ticket-time { display: block; font-size: 12.5px; color: rgba(255,255,255,0.92); margin-top: 8px; }
.c4-ticket-addr { display: block; font-size: 11px; color: rgba(255,255,255,0.82); margin-top: 3px; }
.c4-ticket-meta { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.c4-ticket-chip { background: rgba(255,255,255,0.22); border-radius: 6px; padding: 3px 9px; font-size: 10px; font-weight: 600; color: #fff; }
.c4-ticket-user { font-size: 11px; color: rgba(255,255,255,0.9); }

.c4-perf { position: relative; height: 0; border-top: 2px dashed #e4ddd0; }
.c4-perf-hole { position: absolute; top: -11px; width: 22px; height: 22px; border-radius: 50%; background: #FAF8F5; }
.c4-perf-hole.left { left: -11px; }
.c4-perf-hole.right { right: -11px; }

.c4-ticket-body { padding: 24px 20px; display: flex; flex-direction: column; align-items: center; }
.c4-qr-box { position: relative; width: 190px; height: 190px; border-radius: 16px; background: #fff; display: flex; align-items: center; justify-content: center; }
.c4-qr-box.dim { opacity: 0.9; }
.c4-qr-canvas { width: 190px; height: 190px; }
.c4-stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-14deg); border: 3px solid #C9A96E; color: #C9A96E; border-radius: 12px; padding: 8px 18px; font-size: 20px; font-weight: 800; font-family: 'Songti SC', serif; opacity: 0.9; background: rgba(250,248,245,0.55); }
.c4-code-tip { font-size: 11px; color: #999; margin: 16px 0 10px; }
.c4-code6 { display: flex; gap: 9px; justify-content: center; }
.c4-code-cell { width: 40px; height: 50px; border-radius: 10px; background: #FAF8F5; border: 1px solid #EFEAE3; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #C41E3A; font-family: 'Songti SC', serif; }
.c4-ticket-note { font-size: 11px; color: #999; margin-top: 16px; text-align: center; line-height: 1.6; }
.c4-done-title { font-size: 19px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; margin-top: 18px; }
.c4-done-sub { font-size: 11px; color: #999; margin-top: 8px; }

.c4-ticket-actions { display: flex; gap: 12px; margin-top: 14px; }
.c4-ticket-foot { display: block; text-align: center; font-size: 11px; color: #999; margin-top: 14px; line-height: 1.8; }
</style>
