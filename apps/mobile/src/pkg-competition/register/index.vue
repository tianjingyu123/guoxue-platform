<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#2C2C2C" /></view>
        <text class="nav-title">{{ step === 2 ? '报名成功' : '确认报名' }}</text>
        <view class="nav-btn" />
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中…</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="alert-circle" :size="44" color="#D8CFC0" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <!-- 步骤1：报名确认 -->
    <template v-else-if="comp && step === 1">
      <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
        <!-- 赛事信息卡 -->
        <view class="card">
          <text class="card-h3">赛事信息</text>
          <view class="cinfo">
            <view class="cinfo-cover">
              <image v-if="comp.coverImage" :src="comp.coverImage" class="cinfo-cover-img" mode="aspectFill" />
              <app-icon v-else name="trophy" :size="24" color="#C9A96E" />
            </view>
            <view class="cinfo-body">
              <text class="cinfo-title">{{ comp.title }}</text>
              <view class="chip-row">
                <text class="chip">{{ typeLabel(comp.type) }}</text>
                <text class="chip level">{{ levelInfo(comp.level, comp.organizerType).label }}</text>
              </view>
            </view>
          </view>
          <view class="kv-list">
            <view v-if="signUpRange" class="kv"><text class="kv-k">报名时间</text><text class="kv-v">{{ signUpRange }}</text></view>
            <view v-if="raceFlow" class="kv"><text class="kv-k">赛制</text><text class="kv-v">{{ raceFlow }}</text></view>
            <view class="kv">
              <text class="kv-k">报名费</text>
              <text class="kv-v" :class="isPaid ? 'pay' : 'free'">{{ isPaid ? '¥' + yuan(comp.entryFee) : '免费' }}</text>
            </view>
          </view>
        </view>

        <!-- 费用说明（需支付降级占位） -->
        <view v-if="isPaid" class="card">
          <text class="card-h3">费用说明</text>
          <text class="fee-desc">报名费用于赛事组织与奖金池。在线支付即将开放，当前可免费报名参与，后续开赛前补缴。</text>
        </view>

        <!-- 邀请码（邀请赛入口 / 邀请奖励入口） -->
        <view v-if="comp.isInviteOnly || inviteCode" class="card">
          <text class="card-h3">邀请码 <text v-if="comp.isInviteOnly" class="req">*</text></text>
          <input
            v-model="inviteCode"
            class="invite-input"
            :placeholder="comp.isInviteOnly ? '本赛为邀请制，请输入邀请码' : '有邀请码可填写，助力邀请奖励'"
            placeholder-class="ph"
          />
          <text class="invite-hint">{{ comp.isInviteOnly ? '本赛为邀请制，需填写有效邀请码方可报名' : '填写好友邀请码，报名后可为其助力邀请奖励' }}</text>
        </view>

        <!-- 实名提示 -->
        <view v-if="comp.requireIdentity" class="notice">
          <app-icon name="info" :size="16" color="#A5883F" />
          <text class="notice-txt">本赛事需实名认证，请确保已完成实名后再报名。</text>
        </view>

        <!-- 规则勾选（必勾） -->
        <view class="card">
          <view class="rule-line" @tap="agreeRules = !agreeRules">
            <view class="cbox" :class="{ checked: agreeRules }">
              <app-icon v-if="agreeRules" name="check" :size="13" color="#fff" />
            </view>
            <text class="rule-txt">我已阅读并同意<text class="rule-link">《赛事规则》</text>与<text class="rule-link">《答题诚信承诺》</text>，保证独立作答、不作弊。</text>
          </view>
        </view>

        <!-- 报名须知（后端 rules 纯文本） -->
        <view v-if="plainRules" class="card">
          <text class="card-h3">报名须知</text>
          <text class="rules-text">{{ plainRules }}</text>
        </view>

        <view class="safe-bottom" />
      </scroll-view>

      <!-- 底部 CTA -->
      <view class="cta-bar" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
        <view class="cta-info">
          <text class="cta-lbl">报名费</text>
          <text class="cta-amt">{{ isPaid ? '¥' + yuan(comp.entryFee) : '免费' }}</text>
        </view>
        <view class="btn-primary" :class="{ disabled: !canSubmit || submitting }" @tap="onSubmit">
          <text class="btn-primary-txt">{{ submitting ? '提交中…' : '确认报名' }}</text>
        </view>
      </view>
    </template>

    <!-- 步骤2：报名成功·参赛票据 -->
    <scroll-view v-else-if="step === 2" scroll-y class="scroll" :style="{ height: scrollHeight2 + 'px' }">
      <view class="succ">
        <view class="succ-badge"><app-icon name="check" :size="40" color="#fff" /></view>
        <text class="succ-title">报名成功</text>
        <text class="succ-sub">你已成为本届赛事参赛选手</text>
      </view>

      <!-- 金色票据 -->
      <view class="ticket">
        <view class="ticket-th">
          <text class="ticket-lbl">参赛编号 · COMPETITOR NO.</text>
          <text class="ticket-no">#{{ participantNo }}</text>
        </view>
        <view class="notch-l" /><view class="notch-r" />
        <view class="ticket-tb">
          <view class="tk"><text class="tk-k">赛事</text><text class="tk-v">{{ comp?.title }}</text></view>
          <view v-if="preliminaryTime" class="tk"><text class="tk-k">初赛时间</text><text class="tk-v">{{ preliminaryTime }}</text></view>
          <view class="tk"><text class="tk-k">报名时间</text><text class="tk-v">{{ registrationTime }}</text></view>
          <view class="tk"><text class="tk-k">赛程提醒</text><text class="tk-v red">开赛前推送通知</text></view>
        </view>
      </view>

      <view class="note">
        <app-icon name="info" :size="15" color="#C41E3A" />
        <text class="note-txt">请关注赛事详情页的赛程公告，届时准时参加线上答题；开赛前将向你推送通知。</text>
      </view>

      <view class="succ-actions">
        <view class="sa sa-primary" @tap="go('/competition/' + compId)"><text class="sa-primary-txt">查看赛事详情</text></view>
        <view class="sa sa-ghost" @tap="go('/competition/home')"><text class="sa-ghost-txt">返回赛事中心</text></view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  competitionApi,
  yuan,
  fmtDate,
  typeLabel,
  levelInfo,
  roundTypeLabel,
  type Competition,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
// 步骤1 底部有固定 CTA 栏（约 70px）；步骤2 无 CTA 栏
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44 - 70)
const scrollHeight2 = computed(() => sysH.value - statusBarHeight.value - 44)

const compId = ref('')
const loading = ref(true)
const error = ref('')
const comp = ref<Competition | null>(null)

const step = ref<1 | 2>(1)
const submitting = ref(false)
const agreeRules = ref(false)
const inviteCode = ref('')
const inviterId = ref('') // 从邀请链接带入（邀请奖励归因）
const participantNo = ref('')
const registrationTime = ref('')

// 是否需支付（entryFee>0 → 降级占位，仍允许免费报名）
const isPaid = computed(() => (comp.value?.entryFee ?? 0) > 0)

// 报名时间区间（publishedAt ~ 首个非报名轮的 startAt）
const signUpRange = computed(() => {
  const c = comp.value
  if (!c) return ''
  const start = fmtDate(c.publishedAt) || fmtDate(c.createdAt)
  const regRound = c.rounds?.find((r) => r.type === 'REGISTRATION')
  const firstRace = c.rounds?.find((r) => r.type !== 'REGISTRATION')
  const end = fmtDate(regRound?.endAt) || fmtDate(firstRace?.startAt)
  if (start && end) return `${md(start)} ~ ${md(end)}`
  return start ? md(start) : ''
})

// 赛制流程（真实 rounds → 报名→初赛→复赛→决赛）
const raceFlow = computed(() => {
  const rs = (comp.value?.rounds || [])
    .filter((r) => r.type !== 'REGISTRATION')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
  if (!rs.length) return ''
  return rs.map((r) => roundTypeLabel[r.type] || r.title).join('→')
})

// 初赛时间（首个 PRELIMINARY 轮）
const preliminaryTime = computed(() => {
  const r = comp.value?.rounds?.find((x) => x.type === 'PRELIMINARY')
  const iso = r?.startAt
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} 开始`
})

// 报名须知：去除 markdown 符号的纯文本
const plainRules = computed(() =>
  (comp.value?.rules || '').replace(/[#*`>]/g, '').replace(/\n{2,}/g, '\n').trim(),
)

// 本地校验：必须勾选同意；若为邀请赛则邀请码必填
const canSubmit = computed(() => {
  if (!agreeRules.value) return false
  if (comp.value?.isInviteOnly && !inviteCode.value.trim()) return false
  return true
})

// YYYY-MM-DD → MM-DD
function md(s: string): string {
  return s.length >= 10 ? s.slice(5) : s
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const c = await competitionApi.detail(compId.value)
    if (!c) throw new Error('赛事不存在')
    comp.value = c
    // 已报名则直接进成功态（复用参赛编号/报名时间）
    try {
      const reg = await competitionApi.myRegistration(compId.value)
      if (reg?.id) {
        participantNo.value = reg.id.slice(-8).toUpperCase()
        registrationTime.value = fmtDate(reg.createdAt)
        step.value = 2
      }
    } catch {
      // 未登录或未报名，忽略，走正常报名流程
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (!comp.value || !canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    // 后端 body 仅 inviterId / inviteCode，不做任何臆想表单字段
    const reg = await competitionApi.register(compId.value, {
      inviteCode: inviteCode.value.trim() || undefined,
      inviterId: inviterId.value || undefined,
    })
    participantNo.value = (reg?.id || '').slice(-8).toUpperCase()
    registrationTime.value = fmtDate(reg?.createdAt) || fmtDate(new Date().toISOString())
    step.value = 2
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '报名失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function go(p: string) {
  navigateTo(p)
}
function goBack() {
  navigateBack()
}

onLoad((q) => {
  compId.value = (q?.id as string) || ''
  // 从邀请链接预填：inviteCode 直接填输入框；inviterId 作归因参数
  if (q?.inviteCode) inviteCode.value = String(q.inviteCode)
  if (q?.inviterId) inviterId.value = String(q.inviterId)
  uni.getSystemInfo({
    success: (e) => {
      statusBarHeight.value = e.statusBarHeight || 0
      sysH.value = e.windowHeight || 667
    },
  })
  load()
})
</script>

<style lang="scss" scoped>
/* ── token ── */
$paper: #faf8f5;
$card: #fff;
$red: #c41e3a;
$red-deep: #a5162e;
$gold: #c9a96e;
$gold-deep: #a5883f;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #999;
$line: #ece7df;

.page {
  min-height: 100vh;
  background: $paper;
}

/* 导航栏（宣纸白底·深色字） */
.navbar {
  background: $paper;
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid $line;
}
.nav-inner {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
}
.nav-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  color: $t1;
  font-family: "Songti SC", "STSong", serif;
}
.scroll {
  width: 100%;
}

/* 三态 */
.state {
  padding: 100px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.state-txt {
  color: $t3;
  font-size: 14px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0d0d4;
  border-top-color: $red;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.retry-btn {
  margin-top: 4px;
  padding: 8px 24px;
  background: $red;
  border-radius: 999px;
}
.retry-txt {
  color: #fff;
  font-size: 14px;
}

/* 卡片 */
.card {
  background: $card;
  border: 1px solid $line;
  border-radius: 18px;
  margin: 14px 20px;
  padding: 17px;
  box-shadow: 0 4px 14px rgba(60, 40, 20, 0.05);
}
.card-h3 {
  display: block;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: $t1;
  padding-left: 12px;
  position: relative;
  margin-bottom: 13px;
  font-family: "Songti SC", "STSong", serif;
}
.card-h3::before {
  content: "";
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  background: $gold;
  border-radius: 2px;
}
.req {
  color: $red;
}

/* 赛事信息 */
.cinfo {
  display: flex;
  gap: 13px;
}
.cinfo-cover {
  flex: 0 0 96px;
  width: 96px;
  height: 64px;
  border-radius: 11px;
  background: linear-gradient(150deg, #463c2c, #2b2519);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cinfo-cover-img {
  width: 100%;
  height: 100%;
}
.cinfo-body {
  flex: 1;
  min-width: 0;
}
.cinfo-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  color: $t1;
  margin-bottom: 8px;
}
.chip-row {
  display: flex;
  gap: 5px;
}
.chip {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 6px;
  background: #f1efec;
  color: $t2;
}
.chip.level {
  background: #f6efdf;
  color: $gold-deep;
}
.kv-list {
  margin-top: 12px;
}
.kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 11px 0;
  border-top: 1px dashed $line;
}
.kv:first-child {
  border-top: none;
}
.kv-k {
  color: $t3;
}
.kv-v {
  color: $t1;
}
.kv-v.free {
  color: $red;
  font-weight: 700;
}
.kv-v.pay {
  color: $red;
  font-weight: 700;
}

/* 费用说明 */
.fee-desc {
  font-size: 12.5px;
  color: $t2;
  line-height: 1.8;
}

/* 邀请码 */
.invite-input {
  height: 46px;
  line-height: 46px;
  border: 1px solid $line;
  border-radius: 11px;
  background: $paper;
  padding: 0 15px;
  font-size: 14px;
  color: $t1;
}
.ph {
  color: $t3;
}
.invite-hint {
  display: block;
  font-size: 11.5px;
  color: $gold-deep;
  margin-top: 10px;
  line-height: 1.6;
}

/* 实名提示 */
.notice {
  margin: 14px 20px;
  background: #fdf9ef;
  border: 1px solid #efe3c8;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.notice-txt {
  flex: 1;
  font-size: 13px;
  color: #92704a;
  line-height: 1.6;
}

/* 规则勾选 */
.rule-line {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}
.cbox {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border-radius: 7px;
  border: 1.5px solid $red;
  background: #f6e0e2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.cbox.checked {
  background: $red;
  border-color: $red;
}
.rule-txt {
  flex: 1;
  font-size: 13px;
  color: $t2;
  line-height: 1.7;
}
.rule-link {
  color: $red;
}

/* 报名须知 */
.rules-text {
  font-size: 13px;
  color: $t2;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* 底部 CTA */
.cta-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid $line;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 50;
}
.cta-info {
  flex: 0 0 auto;
}
.cta-lbl {
  display: block;
  font-size: 10px;
  color: $t3;
}
.cta-amt {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: $red;
}
.btn-primary {
  flex: 1;
  height: 48px;
  border-radius: 999px;
  background: linear-gradient(135deg, $red, $red-deep);
  box-shadow: 0 6px 18px rgba(196, 30, 58, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-primary.disabled {
  background: #d6cfc6;
  box-shadow: none;
}
.btn-primary-txt {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

/* ── 步骤2：成功票据 ── */
.succ {
  padding: 34px 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.succ-badge {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, $red, $red-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(196, 30, 58, 0.35);
}
.succ-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  color: $t1;
  margin-bottom: 7px;
  font-family: "Songti SC", "STSong", serif;
}
.succ-sub {
  font-size: 13px;
  color: $t2;
  margin-bottom: 22px;
}

/* 金色票据 */
.ticket {
  margin: 0 20px;
  background: linear-gradient(160deg, #fdfaf2, #f9f2e2);
  border: 1.5px solid #e3d5b0;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 26px rgba(165, 136, 63, 0.12);
}
.ticket-th {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 2px dashed #e0cf9f;
}
.ticket-lbl {
  font-size: 11px;
  color: $gold-deep;
  letter-spacing: 1px;
}
.ticket-no {
  font-size: 26px;
  font-weight: 800;
  color: $gold-deep;
  font-family: ui-monospace, monospace;
  letter-spacing: 2px;
  margin-top: 6px;
}
.notch-l,
.notch-r {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: $paper;
  top: 66px;
}
.notch-l {
  left: -11px;
}
.notch-r {
  right: -11px;
}
.ticket-tb {
  padding: 16px;
}
.tk {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 9px 0;
  gap: 12px;
}
.tk-k {
  color: $gold-deep;
  opacity: 0.85;
  flex: 0 0 auto;
}
.tk-v {
  font-weight: 600;
  color: $t1;
  text-align: right;
  flex: 1;
  min-width: 0;
}
.tk-v.red {
  color: $red;
}

/* 提示 */
.note {
  margin: 14px 20px 0;
  background: #fdf4f5;
  border: 1px solid #f2cdd3;
  border-radius: 11px;
  padding: 11px 13px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.note-txt {
  flex: 1;
  font-size: 11.5px;
  color: $t2;
  line-height: 1.7;
}

/* 成功页操作 */
.succ-actions {
  margin: 22px 20px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sa {
  height: 48px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sa-primary {
  background: linear-gradient(135deg, $red, $red-deep);
  box-shadow: 0 6px 18px rgba(196, 30, 58, 0.3);
}
.sa-primary-txt {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.sa-ghost {
  background: $card;
  border: 1px solid $line;
}
.sa-ghost-txt {
  color: $t2;
  font-size: 15px;
  font-weight: 600;
}

.safe-bottom {
  height: 28px;
}
</style>
