<template>
  <view class="b4-page">
    <!-- 顶部导航 -->
    <view class="b4-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="b4-nav">
        <view class="b4-icon-btn" @tap="onBack"><app-icon name="chevron-left" :size="22" color="#2C2C2C" /></view>
        <text class="b4-nav-title">{{ navTitle }}</text>
        <text
          v-if="view === 'list' && selectedCourse"
          class="b4-nav-action"
          :class="{ disabled: exporting || roster.length === 0 }"
          @tap="onExport"
        >{{ exporting ? '导出中…' : '导出名单' }}</text>
        <view v-else class="b4-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="b4-body">
      <!-- 三态 -->
      <view v-if="loading" class="b4-state"><view class="spinner" /><text class="b4-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="b4-state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" /><text class="b4-state-text">{{ errMsg }}</text>
        <view class="b4-retry" @tap="load"><text class="b4-retry-text">重试</text></view>
      </view>

      <!-- ============ 态①：报名名单 ============ -->
      <template v-else-if="view === 'list'">
        <view class="b4-main">
          <!-- 场次卡 -->
          <picker v-if="courses.length" mode="selector" :range="courseTitles" @change="onPickCourse">
            <view class="b4-session-card">
              <view class="b4-session-info">
                <text class="b4-session-title">{{ selectedCourse ? selectedCourse.title : '请选择核销课程' }}</text>
                <text v-if="selectedCourse" class="b4-session-time">{{ sessionTime(selectedCourse) }} · {{ selectedCourse.location || '本驿站' }}</text>
              </view>
              <text class="b4-session-switch">切换场次 ▾</text>
            </view>
          </picker>

          <template v-if="selectedCourse">
            <!-- 进度条 -->
            <view class="b4-progress-row">
              <view class="b4-progress-track"><view class="b4-progress-fill" :style="{ width: progressPct + '%' }" /></view>
              <text class="b4-progress-text"><text class="b4-progress-num">{{ signedCount }}</text>/{{ activeTotal }} 已到店</text>
            </view>

            <!-- 扫码核销 -->
            <view class="b4-scan-btn" @tap="onScan">
              <app-icon name="qr-code" :size="18" color="#fff" />
              <text class="b4-scan-text">扫码核销</text>
            </view>

            <!-- 筛选 -->
            <view class="b4-filters">
              <view v-for="f in filterDefs" :key="f.key" class="b4-filter" :class="{ on: filter === f.key }" @tap="filter = f.key">
                {{ f.label }} {{ f.count }}
              </view>
            </view>

            <!-- 名单 -->
            <view v-if="filteredRoster.length === 0" class="b4-empty"><text>该筛选下暂无学员</text></view>
            <view v-else class="b4-roster">
              <view v-for="r in filteredRoster" :key="r.id" class="b4-reg" :class="{ off: r.status === 'CANCELLED' }">
                <view class="b4-avatar">{{ firstChar(r.user.nickname) }}</view>
                <view class="b4-reg-info">
                  <text class="b4-reg-name">{{ r.user.nickname }}</text>
                  <text class="b4-reg-sub">{{ regSubText(r) }}</text>
                </view>
                <view v-if="r.status === 'SIGNED_IN'" class="b4-reg-badge done">✓ 已到店{{ r.signedAt ? ' ' + hhmm(r.signedAt) : '' }}</view>
                <view v-else-if="r.status === 'CANCELLED'" class="b4-reg-badge grey">已取消</view>
                <view v-else class="b4-reg-code-btn" @tap="openCodePanel">输码核销</view>
              </view>
            </view>
          </template>
          <view v-else class="b4-empty"><text>本驿站暂无可核销的课程</text></view>
          <view class="b4-safe" />
        </view>
      </template>

      <!-- ============ 态③：核销成功 ============ -->
      <template v-else-if="view === 'success' && lastVerified">
        <view class="b4-feedback">
          <view class="b4-fb-icon success"><app-icon name="check" :size="46" color="#fff" /></view>
          <text class="b4-fb-title">核销成功</text>
          <text class="b4-fb-time">{{ lastVerified.at }}</text>
          <view class="b4-fb-card">
            <view class="b4-avatar lg">{{ firstChar(lastVerified.name) }}</view>
            <view class="b4-reg-info">
              <text class="b4-reg-name lg">{{ lastVerified.name }}</text>
              <text class="b4-reg-sub">{{ lastVerified.course }}</text>
            </view>
            <view class="b4-reg-badge done">✓ 已到店</view>
          </view>
          <view class="b4-fb-progress">
            <text class="b4-fb-prog-label">本场到店进度</text>
            <text class="b4-fb-prog-num">{{ signedCount }} / {{ activeTotal }}</text>
          </view>
          <view class="b4-fb-actions">
            <view class="b4-btn b4-btn-primary" @tap="backToList(true)"><text class="b4-btn-text">继续核销</text></view>
            <view class="b4-btn b4-btn-o" @tap="backToList(false)"><text class="b4-btn-o-text">查看名单</text></view>
          </view>
          <text class="b4-fb-hint">支持连续核销</text>
        </view>
      </template>

      <!-- ============ 态④：异常拦截 ============ -->
      <template v-else-if="view === 'blocked'">
        <view class="b4-feedback">
          <view class="b4-fb-icon warn"><app-icon name="alert-triangle" :size="42" color="#a5843f" /></view>
          <text class="b4-fb-title">无法核销</text>
          <text class="b4-fb-reason">{{ blockReason }}</text>
          <view class="b4-fb-card note">
            <text class="b4-note-text">常见拦截原因：{{ '\n' }}· 已核销：该学员本场已到店，不可重复{{ '\n' }}· 已过期：核销码非当天有效，已失效{{ '\n' }}· 非本场次：该码属其他驿站/场次，不匹配{{ '\n' }}· 已取消：该报名已取消，不可核销</text>
          </view>
          <view class="b4-fb-actions">
            <view class="b4-btn b4-btn-primary" @tap="onScan"><text class="b4-btn-text">重新扫码</text></view>
            <view class="b4-btn b4-btn-o" @tap="() => { backToList(false); openCodePanel() }"><text class="b4-btn-o-text">改用输码</text></view>
          </view>
        </view>
      </template>
    </scroll-view>

    <!-- 输码核销面板 -->
    <view v-if="codePanel" class="b4-mask" @tap="closeCodePanel">
      <view class="b4-code-panel" @tap.stop>
        <view class="b4-code-head">
          <text class="b4-code-title">扫码不便？输入核销码</text>
          <text class="b4-code-sub">学员报 6 位数字</text>
        </view>
        <view class="b4-code-warn">核销码每场唯一 · 当天有效 · 一次性作废 · 仅限本驿站本场次；重复/过期/跨场次将被拦截</view>
        <text v-if="codeErr" class="b4-code-err" :class="{ shake: shakeFlag }">{{ codeErr }}</text>
        <view class="b4-code6" @tap="focusCode">
          <view v-for="(d, i) in codeCells" :key="i" class="b4-code-cell" :class="{ f: d !== ' ' }">{{ d === ' ' ? '' : d }}</view>
          <input
            class="b4-code-hidden"
            type="number"
            :maxlength="6"
            :focus="codeFocus"
            v-model="codeInput"
            @input="onCodeInput"
            @blur="codeFocus = false"
          />
        </view>
        <view class="b4-btn b4-btn-primary b4-code-confirm" :class="{ disabled: codeInput.length !== 6 || verifying }" @tap="doCodeSignIn">
          <text class="b4-btn-text">{{ verifying ? '核销中…' : '确认核销' }}</text>
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
import { offlineManageApi, type OfflineCourse, type RegistrationRow } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const preCourseId = ref('')
const courses = ref<OfflineCourse[]>([])
const selectedCourse = ref<OfflineCourse | null>(null)
const roster = ref<RegistrationRow[]>([])
const verifying = ref(false)
const exporting = ref(false)

const view = ref<'list' | 'success' | 'blocked'>('list')
const blockReason = ref('')
const lastVerified = ref<{ name: string; course: string; at: string } | null>(null)

// 输码面板
const codePanel = ref(false)
const codeInput = ref('')
const codeFocus = ref(false)
const codeErr = ref('')
const shakeFlag = ref(false)

const navTitle = computed(() => (view.value === 'list' ? '招生与核销' : '扫码核销'))
const courseTitles = computed(() => courses.value.map((c) => c.title))
const activeRoster = computed(() => roster.value.filter((r) => r.status !== 'CANCELLED'))
const activeTotal = computed(() => activeRoster.value.length)
const signedCount = computed(() => roster.value.filter((r) => r.status === 'SIGNED_IN').length)
const progressPct = computed(() => (activeTotal.value ? Math.round((signedCount.value / activeTotal.value) * 100) : 0))

const filter = ref<'all' | 'wait' | 'signed' | 'cancelled'>('all')
const filterDefs = computed(() => [
  { key: 'all' as const, label: '全部', count: roster.value.length },
  { key: 'wait' as const, label: '未到店', count: roster.value.filter((r) => r.status === 'REGISTERED').length },
  { key: 'signed' as const, label: '已到店', count: signedCount.value },
  { key: 'cancelled' as const, label: '已取消', count: roster.value.filter((r) => r.status === 'CANCELLED').length },
])
const filteredRoster = computed(() => {
  if (filter.value === 'all') return roster.value
  const map = { wait: 'REGISTERED', signed: 'SIGNED_IN', cancelled: 'CANCELLED' } as const
  return roster.value.filter((r) => r.status === map[filter.value as 'wait' | 'signed' | 'cancelled'])
})

const codeCells = computed(() => codeInput.value.padEnd(6, ' ').slice(0, 6).split(''))

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    courses.value = await offlineManageApi.getManageCourses(stationId.value)
    const target = preCourseId.value
      ? courses.value.find((c) => c.id === preCourseId.value)
      : courses.value[0]
    if (target) { selectedCourse.value = target; await loadRoster(target.id) }
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  stationId.value = q && q.stationId ? String(q.stationId) : ''
  preCourseId.value = q && q.courseId ? String(q.courseId) : ''
  load()
})

async function loadRoster(courseId: string) {
  try { roster.value = await offlineManageApi.getRegistrations(courseId) } catch { roster.value = [] }
}
function onPickCourse(e: { detail: { value: number } }) {
  const c = courses.value[Number(e.detail.value)]
  if (c) { selectedCourse.value = c; filter.value = 'all'; loadRoster(c.id) }
}

// ── 工具 ──
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
function sessionTime(c: OfflineCourse): string {
  const s = new Date(c.startTime); const e = new Date(c.endTime)
  if (isNaN(s.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${s.getMonth() + 1}月${s.getDate()}日(${WEEK[s.getDay()]}) ${p(s.getHours())}:${p(s.getMinutes())}–${p(e.getHours())}:${p(e.getMinutes())}`
}
function hhmm(s: string): string {
  const d = new Date(s); if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}
function nowClock(): string {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
function firstChar(name?: string): string { return (name || '学').trim().charAt(0) }
function regSubText(r: RegistrationRow): string {
  const dt = new Date(r.createdAt)
  if (isNaN(dt.getTime())) return r.status === 'CANCELLED' ? '已取消' : '已报名'
  return `${dt.getMonth() + 1}月${dt.getDate()}日报名`
}

// ── 核销 ──
function handleVerified(result: unknown) {
  const userId = (result as { userId?: string })?.userId || ''
  const cid = selectedCourse.value?.id
  const finish = () => {
    const row = roster.value.find((r) => r.userId === userId)
    lastVerified.value = {
      name: row?.user.nickname || '学员',
      course: `${selectedCourse.value?.title || ''} · ${selectedCourse.value ? sessionTime(selectedCourse.value) : ''}`,
      at: nowClock(),
    }
    view.value = 'success'
  }
  if (cid) loadRoster(cid).then(finish); else finish()
}
function onScan() {
  uni.scanCode({
    success: (res) => { if (res.result) doScanSignIn(res.result) },
    fail: () => {
      // H5 等无扫码能力：降级引导输码
      view.value = 'list'
      uni.showToast({ title: '当前环境不支持扫码，请用输码核销', icon: 'none' })
      openCodePanel()
    },
  })
}
async function doScanSignIn(qrCode: string) {
  if (verifying.value) return
  verifying.value = true
  try {
    const result = await offlineManageApi.signIn(stationId.value, qrCode)
    handleVerified(result)
  } catch (e) {
    blockReason.value = (e as Error)?.message || '核销失败，请重试'
    view.value = 'blocked'
  } finally { verifying.value = false }
}
async function doCodeSignIn() {
  const code = codeInput.value.trim()
  const cid = selectedCourse.value?.id
  if (code.length !== 6 || !cid || verifying.value) return
  verifying.value = true
  codeErr.value = ''
  try {
    const result = await offlineManageApi.signInByCode(cid, code)
    codePanel.value = false
    codeInput.value = ''
    handleVerified(result)
  } catch (e) {
    // 输码失败：面板内红字 + 抖动，不跳转（连续核销体验）
    codeErr.value = (e as Error)?.message || '核销码无效，请核对'
    shakeFlag.value = false
    setTimeout(() => { shakeFlag.value = true }, 0)
  } finally { verifying.value = false }
}

// ── 输码面板 ──
function openCodePanel() {
  codeInput.value = ''
  codeErr.value = ''
  codePanel.value = true
  setTimeout(() => { codeFocus.value = true }, 120)
}
function closeCodePanel() { codePanel.value = false; codeFocus.value = false }
function focusCode() { codeFocus.value = true }
function onCodeInput() {
  codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6)
  if (codeErr.value) codeErr.value = ''
}

// ── 导航 ──
function onBack() {
  if (view.value !== 'list') { view.value = 'list'; return }
  goBack()
}
function backToList(reScan: boolean) {
  view.value = 'list'
  if (reScan) openCodePanel()
}
const STATUS_LABEL: Record<string, string> = {
  REGISTERED: '未到店',
  SIGNED_IN: '已到店',
  CANCELLED: '已取消',
}

function exportDateTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function csvCell(value: unknown): string {
  let text = String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
  // 防止昵称等用户输入被 Excel/表格软件当成公式执行。
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 60) || '课程'
}

function compactLocalDate(value = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}${p(value.getMonth() + 1)}${p(value.getDate())}`
}

async function onExport() {
  if (exporting.value) return
  if (!selectedCourse.value || roster.value.length === 0) {
    uni.showToast({ title: '当前没有可导出的学员', icon: 'none' })
    return
  }

  exporting.value = true
  try {
    // 导出前重新拉取，确保包含刚完成的核销及全部分页记录。
    const rows = await offlineManageApi.getRegistrations(selectedCourse.value.id)
    roster.value = rows
    if (rows.length === 0) {
      uni.showToast({ title: '当前没有可导出的学员', icon: 'none' })
      return
    }

    const headers = ['序号', '学员昵称', '报名状态', '报名时间', '到店时间', '课程', '场次', '地点']
    const course = selectedCourse.value
    const csvRows = rows.map((r, index) => [
      index + 1,
      r.user.nickname || '学员',
      STATUS_LABEL[r.status] || r.status,
      exportDateTime(r.createdAt),
      exportDateTime(r.signedAt),
      course.title,
      sessionTime(course),
      course.location || '本驿站',
    ])
    const csv = [headers, ...csvRows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const day = compactLocalDate()
    const fileName = `${safeFileName(course.title)}-报名名单-${day}.csv`

    // #ifdef H5
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    uni.showToast({ title: `已导出 ${rows.length} 人`, icon: 'success' })
    // #endif

    // #ifndef H5
    await new Promise<void>((resolve, reject) => {
      uni.setClipboardData({ data: csv, success: () => resolve(), fail: () => reject(new Error('复制失败')) })
    })
    uni.showModal({
      title: '名单已复制',
      content: `共 ${rows.length} 人。当前设备不支持直接下载文件，请粘贴到表格应用后保存。`,
      showCancel: false,
    })
    // #endif
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '导出失败，请重试', icon: 'none' })
  } finally {
    exporting.value = false
  }
}
</script>

<style lang="scss" scoped>
/* B端视觉 token（mockup）：宣纸底 #F4F1EC / 卡片白 / 朱红 #C41E3A / 金 #C9A96E / 描边 #EDE9E2 */
.b4-page { height: 100vh; background: #F4F1EC; display: flex; flex-direction: column; }
.b4-header { background: #F4F1EC; }
.b4-nav { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.b4-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.b4-nav-title { font-size: 16px; font-weight: 600; color: #2C2C2C; }
.b4-nav-action { min-width: 64px; min-height: 44px; margin-right: -8px; display: flex; align-items: center; justify-content: flex-end; font-size: 13px; color: #C41E3A; font-weight: 600; }
.b4-nav-action.disabled { color: #b8b1a7; }
.b4-body { flex: 1; height: 0; min-height: 0; }

.b4-state { padding-top: 90px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.b4-state-text { font-size: 13px; color: #999; }
.spinner { width: 28px; height: 28px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.b4-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.b4-retry-text { font-size: 13px; color: #C41E3A; }

.b4-main { padding: 14px 20px 40px; }
.b4-session-card { background: #fbf3f4; border-radius: 18px; padding: 14px; display: flex; align-items: center; justify-content: space-between; }
.b4-session-info { flex: 1; min-width: 0; }
.b4-session-title { display: block; font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b4-session-time { display: block; font-size: 11px; color: #999; margin-top: 4px; }
.b4-session-switch { font-size: 11px; color: #C41E3A; flex-shrink: 0; margin-left: 8px; }

.b4-progress-row { display: flex; align-items: center; gap: 10px; margin: 12px 2px; }
.b4-progress-track { flex: 1; height: 8px; border-radius: 999px; background: #ecdfe1; overflow: hidden; }
.b4-progress-fill { height: 100%; background: #C41E3A; border-radius: 999px; }
.b4-progress-text { font-size: 12px; color: #2C2C2C; }
.b4-progress-num { color: #C41E3A; font-weight: 700; }

.b4-scan-btn { height: 48px; background: #C41E3A; border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px; }
.b4-scan-text { font-size: 15px; color: #fff; font-weight: 700; }

.b4-filters { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
.b4-filter { font-size: 11px; color: #6E6E73; border: 1px solid #EDE9E2; border-radius: 999px; padding: 4px 11px; background: #fff; }
.b4-filter.on { background: #C41E3A; color: #fff; border-color: #C41E3A; }

.b4-empty { padding: 40px 0; text-align: center; font-size: 13px; color: #b0a89c; }
.b4-roster { background: #fff; border-radius: 18px; overflow: hidden; }
.b4-reg { display: flex; align-items: center; gap: 10px; padding: 13px 14px; border-bottom: 1px solid #EDE9E2; }
.b4-reg:last-child { border-bottom: none; }
.b4-reg.off { opacity: 0.6; }
.b4-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #efe9e0, #e4ddd0); display: flex; align-items: center; justify-content: center; font-size: 15px; color: #8a7b63; font-family: 'Songti SC', serif; flex-shrink: 0; }
.b4-avatar.lg { width: 48px; height: 48px; font-size: 18px; }
.b4-reg-info { flex: 1; min-width: 0; }
.b4-reg-name { display: block; font-size: 13px; font-weight: 600; color: #2C2C2C; }
.b4-reg-name.lg { font-size: 16px; font-family: 'Songti SC', serif; }
.b4-reg-sub { display: block; font-size: 11px; color: #999; margin-top: 3px; }
.b4-reg-badge { font-size: 11px; padding: 4px 10px; border-radius: 999px; flex-shrink: 0; }
.b4-reg-badge.done { background: #C9A96E; color: #fff; }
.b4-reg-badge.grey { background: #f0ece5; color: #999; }
.b4-reg-code-btn { font-size: 11.5px; color: #C41E3A; font-weight: 600; border: 1px solid #C41E3A; border-radius: 999px; padding: 5px 12px; flex-shrink: 0; }
.b4-safe { height: 30px; }

/* 反馈态 ③/④ */
.b4-feedback { padding: 60px 20px 40px; display: flex; flex-direction: column; align-items: center; }
.b4-fb-icon { width: 96px; height: 96px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 22px; }
.b4-fb-icon.success { background: #C41E3A; box-shadow: 0 10px 30px rgba(196,30,58,0.35); }
.b4-fb-icon.warn { background: #f4ebe0; border: 2px solid #C9A96E; }
.b4-fb-title { font-size: 22px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b4-fb-time { font-size: 12.5px; color: #6E6E73; margin-top: 8px; }
.b4-fb-reason { font-size: 13px; color: #6E6E73; margin-top: 8px; text-align: center; line-height: 1.7; }
.b4-fb-card { width: 100%; background: #fff; border-radius: 18px; padding: 14px; display: flex; align-items: center; gap: 10px; margin-top: 24px; }
.b4-fb-card.note { display: block; background: #fbf3f4; }
.b4-note-text { font-size: 11.5px; color: #8a6b6f; line-height: 1.9; white-space: pre-line; }
.b4-fb-progress { width: 100%; background: rgba(201,169,110,0.1); border-radius: 18px; padding: 14px; display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.b4-fb-prog-label { font-size: 12.5px; color: #6E6E73; }
.b4-fb-prog-num { font-size: 18px; font-weight: 700; color: #C9A96E; font-family: 'Songti SC', serif; }
.b4-fb-actions { display: flex; gap: 12px; width: 100%; margin-top: 18px; }
.b4-fb-hint { font-size: 11px; color: #b0a89c; margin-top: 12px; }

.b4-btn { flex: 1; height: 46px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.b4-btn-primary { background: #C41E3A; }
.b4-btn-primary.disabled { opacity: 0.5; }
.b4-btn-text { font-size: 15px; font-weight: 700; color: #fff; }
.b4-btn-o { background: #fff; border: 1px solid #C41E3A; }
.b4-btn-o-text { font-size: 15px; font-weight: 600; color: #C41E3A; }

/* 输码面板 */
.b4-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.b4-code-panel { width: 100%; background: #F4F1EC; border-radius: 24px 24px 0 0; padding: 20px 20px 30px; }
.b4-code-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.b4-code-title { font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b4-code-sub { font-size: 11px; color: #999; }
.b4-code-warn { background: rgba(196,30,58,0.05); border-radius: 12px; padding: 10px 12px; font-size: 11px; color: #8a6b6f; line-height: 1.7; margin-bottom: 12px; }
.b4-code-err { display: block; text-align: center; font-size: 12px; color: #C41E3A; font-weight: 600; margin-bottom: 10px; }
.b4-code-err.shake { animation: shake 0.4s; }
@keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
.b4-code6 { position: relative; display: flex; gap: 9px; justify-content: center; margin-bottom: 16px; }
.b4-code-cell { width: 42px; height: 52px; border-radius: 10px; background: #fff; border: 1.5px solid #EDE9E2; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.b4-code-cell.f { border-color: #C41E3A; color: #C41E3A; }
.b4-code-hidden { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; }
.b4-code-confirm { width: 100%; }
</style>
