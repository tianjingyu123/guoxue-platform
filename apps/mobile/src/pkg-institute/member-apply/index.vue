<!--
  I7 · 加入研究院（V0 视觉稿 1:1 还原版）
  设计源：D:\V0书院研究院文件\_ext\public\visual\mockup\I7-join.html
  ─ 保留现有全部数据接线与向导：memberApplySteps 5 步 / 席位选择 seatOptions / 门槛自检 checkEligibility
    / applyMember 真提交。
  ─ 当前仅开放资格申请与管理层审核，不创建支付订单、不扣款；收费能力上线后必须以真实订单与服务协议为准。
-->
<template>
  <view class="page">
    <!-- 自绘导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="20" color="#2C2C2C" />
        </view>
        <text class="nav-title serif">加入研究院</text>
        <view class="nav-spacer" />
      </view>
      <!-- 步骤指示器（保留 memberApplySteps 5 步） -->
      <view class="stepper">
        <view v-for="(label, i) in steps" :key="i" class="step-item">
          <view class="step-dot" :class="{ 'step-done': step > i + 1, 'step-current': step === i + 1 }">
            <app-icon v-if="step > i + 1" name="check" :size="14" color="#fff" />
            <text v-else class="step-num" :class="{ 'step-num-active': step === i + 1 }">{{ i + 1 }}</text>
          </view>
          <text class="step-label" :class="{ 'step-label-active': step === i + 1 }">{{ label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="wrap">
        <!-- ══════ Step 1：了解机制（机制说明主态·V0 态A） ══════ -->
        <block v-if="step === 1">
          <!-- 申请主卡 -->
          <view class="pricecard">
            <view class="seal" />
            <text class="pc-lbl">研究院成员申请</text>
            <view class="pc-num-row">
              <text class="pc-num serif">资格自检</text>
              <text class="pc-unit"> · 免费提交</text>
            </view>
            <view class="pc-chips">
              <view class="chip"><text class="chip-t">先申请 · 后审核</text></view>
              <view class="chip"><text class="chip-t">当前申请不扣款</text></view>
            </view>
          </view>

          <!-- 真实生效流程 -->
          <text class="sec-t">申请如何生效？两步确认</text>
          <view class="split">
            <view class="half go">
              <text class="half-b">平台数据自检</text>
              <text class="half-p">核对所选席位对应的准入条件</text>
              <view class="rtag on"><text class="rtag-t">满足条件 → 可提交</text></view>
            </view>
            <view class="half">
              <text class="half-b">管理层审核</text>
              <text class="half-p">核对申请身份与席位意向</text>
              <view class="rtag off"><text class="rtag-t off-t">通过后会籍生效</text></view>
            </view>
          </view>

          <!-- 加入须知（memberApplyNotices） -->
          <text class="sec-t">加入须知</text>
          <view class="card notice-card">
            <view v-for="item in notices" :key="item.title" class="notice-li">
              <view class="notice-ic"><app-icon :name="item.icon" :size="16" color="#C41E3A" /></view>
              <view class="notice-info">
                <text class="notice-title">{{ item.title }}</text>
                <text class="notice-desc">{{ item.desc }}</text>
              </view>
            </view>
          </view>

          <!-- 分享任务要求（shareTaskRules） -->
          <text class="sec-t">分享任务要求</text>
          <view class="card task-card">
            <text class="task-hint">讲席成员加入后，通过以下任务积累研究与分享成果：</text>
            <view v-for="(task, i) in shareTasks" :key="i" class="task-li">
              <view class="task-ic"><app-icon :name="task.icon" :size="15" color="#C9A96E" /></view>
              <view class="task-info">
                <text class="task-label">{{ task.label }}</text>
                <text class="task-proof">{{ task.proof }}</text>
              </view>
              <view class="period-badge"><text class="period-t">{{ task.period }}</text></view>
            </view>
          </view>

          <!-- 当前费用能力说明 -->
          <text class="sec-t">费用说明</text>
          <view class="card fund">
            <text class="fund-t">研究院线上会费收款与退款尚未开放。当前页面只提交成员申请，<text class="fund-em">不会创建订单，也不会扣款</text>；后续如开放，以正式支付页、订单记录和服务协议为准。</text>
          </view>

          <!-- 申请提示 -->
          <view class="risk">
            <view class="risk-head">
              <app-icon name="alert-triangle" :size="16" color="#C41E3A" />
              <text class="risk-title">申请提示（请务必阅读）</text>
            </view>
            <text class="risk-p">· 提交申请后仍需管理层审核，不代表自动成为研究院成员。</text>
            <text class="risk-p">· 加入研究院不构成任何收益承诺；能否签约为讲师由平台评估决定。</text>
          </view>

          <!-- 同意勾选 -->
          <view class="check" @tap="toggleAgreeAll">
            <view class="cb" :class="{ 'cb-on': agreeAll }">
              <app-icon v-if="agreeAll" name="check" :size="12" color="#fff" />
            </view>
            <text class="check-txt">我已阅读并同意<text class="check-link">《研究院会籍服务协议》</text>及上述申请提示，理解申请须经资格校验与管理层审核，当前提交不会扣款</text>
          </view>

          <view class="primary-btn" :class="{ 'btn-disabled': !canNext1 }" @tap="canNext1 && (step = 2)">
            <text class="primary-btn-text">下一步：选择席位</text>
          </view>
        </block>

        <!-- ══════ Step 2：选择席位（双轨席位制 + 门槛自检） ══════ -->
        <block v-if="step === 2">
          <text class="sec-t">选择席位</text>
          <text class="sec-sub">研究院实行双轨席位制：讲席承担年度分享考核，研修席专注研学、不承担分享任务。</text>
          <view class="seat-list">
            <view
              v-for="s in seatOptions"
              :key="s.value"
              class="seat-card"
              :class="{ 'seat-active': seatType === s.value }"
              :style="seatType === s.value ? { borderColor: s.value === 'LECTURE' ? '#C41E3A' : '#C9A96E' } : {}"
              @tap="selectSeat(s.value)"
            >
              <view class="seat-head">
                <view class="seat-name-row">
                  <text class="seat-name serif" :style="{ color: s.value === 'LECTURE' ? '#C41E3A' : '#B8892E' }">{{ s.name }}</text>
                  <text class="seat-tagline">{{ s.tagline }}</text>
                </view>
                <app-icon v-if="seatType === s.value" name="check-circle" :size="20" :color="s.value === 'LECTURE' ? '#C41E3A' : '#C9A96E'" />
              </view>
              <!-- 可退/不退标签 -->
              <view class="seat-rtag" :class="s.value === 'LECTURE' ? 'seat-rtag-on' : 'seat-rtag-off'">
                <text class="seat-rtag-t">{{ s.value === 'LECTURE' ? '承担分享考核' : '专注研学成长' }}</text>
              </view>
              <view class="seat-points">
                <view v-for="(p, i) in s.points" :key="i" class="seat-point">
                  <app-icon :name="p.icon" :size="13" :color="s.value === 'LECTURE' ? '#C41E3A' : '#C9A96E'" />
                  <text class="seat-point-text">{{ p.text }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 门槛自检 -->
          <block v-if="seatType">
            <text class="sec-t">{{ seatTypeLabel[seatType] }}门槛自检</text>
            <view class="card elig-card">
              <view v-if="eligLoading" class="elig-state">
                <view class="mini-spinner" />
                <text class="elig-state-text">正在核对平台数据…</text>
              </view>

              <view v-else-if="eligError" class="elig-state">
                <app-icon name="alert-circle" :size="28" color="#C9C4BB" />
                <text class="elig-state-text">{{ eligError }}</text>
                <view class="elig-retry" @tap="loadEligibility"><text class="elig-retry-text">重试</text></view>
              </view>

              <view v-else-if="eligDegraded" class="note-box">
                <app-icon name="info" :size="15" color="#B8892E" />
                <text class="note-box-t">门槛自检暂未开放，可先继续申请——提交时平台将自动校验准入条件。</text>
              </view>

              <template v-else-if="eligibility">
                <view class="check-list">
                  <view v-for="c in eligibility.checks" :key="c.key" class="elig-item">
                    <view class="elig-row">
                      <view class="elig-icon" :class="c.pass ? 'elig-pass' : 'elig-fail'">
                        <app-icon :name="c.pass ? 'check' : 'x'" :size="12" color="#fff" />
                      </view>
                      <text class="elig-label">{{ c.label }}</text>
                      <text class="elig-num" :class="c.pass ? 'num-pass' : 'num-fail'">{{ c.current }}/{{ c.required }}</text>
                    </view>
                    <text v-if="!c.pass" class="elig-guide">{{ eligibilityGuidance(c) }}</text>
                  </view>
                </view>
                <view v-if="!eligibility.eligible" class="gap-box">
                  <app-icon name="target" :size="15" color="#C41E3A" />
                  <text class="gap-text">还差 {{ failedCount }} 项未达标。门槛不是拒绝，而是方向——达标之路本身就是成长。</text>
                </view>
                <view v-else class="pass-box">
                  <app-icon name="badge-check" :size="15" color="#B8892E" />
                  <text class="pass-text">恭喜，你已满足{{ seatTypeLabel[seatType] }}全部准入门槛！</text>
                </view>
              </template>
            </view>
          </block>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 1"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" :class="{ 'btn-disabled': !canNext2 }" @tap="canNext2 && (step = 3)">
              <text class="primary-btn-text">{{ seatNextText }}</text>
            </view>
          </view>
        </block>

        <!-- ══════ Step 3：填写资料（成员身份） ══════ -->
        <block v-if="step === 3">
          <text class="sec-t">选择成员身份</text>
          <text class="sec-sub">加入后所有成员身份统一，此选择仅用于标注你的加入意向。</text>
          <view class="role-list">
            <view
              v-for="r in roles"
              :key="r.value"
              class="role-item"
              :class="{ 'role-active': selectedRole === r.value }"
              @tap="selectedRole = r.value"
            >
              <view class="role-info">
                <text class="role-name">{{ r.label }}</text>
                <text class="role-meta">{{ r.desc }}</text>
              </view>
              <app-icon v-if="selectedRole === r.value" name="check-circle" :size="20" color="#C41E3A" />
            </view>
          </view>

          <text class="sec-t">会籍年度</text>
          <view class="card kv-card">
            <view class="kv"><text class="kv-k">已选席位</text><text class="kv-v">{{ seatType ? seatTypeLabel[seatType] : '' }}</text></view>
            <view class="kv"><text class="kv-k">加入年份</text><text class="kv-v">{{ joinYear }} 年</text></view>
            <view class="kv last"><text class="kv-k">会籍有效期</text><text class="kv-v">1 年（至 {{ joinYear }}-12-31）</text></view>
          </view>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 2"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" :class="{ 'btn-disabled': !canNext3 }" @tap="canNext3 && (step = 4)">
              <text class="primary-btn-text">下一步：确认申请</text>
            </view>
          </view>
        </block>

        <!-- ══════ Step 4：确认并提交 ══════ -->
        <block v-if="step === 4">
          <view class="pricecard small">
            <view class="seal" />
            <text class="pc-lbl">本次成员申请</text>
            <view class="pc-num-row">
              <text class="pc-num serif">¥0</text>
              <text class="pc-unit"> · 不扣款</text>
            </view>
            <text class="pc-sub">{{ applicationSubText }}</text>
          </view>

          <text class="sec-t">提交说明</text>
          <view class="card fund">
            <view class="desc-list">
              <text v-for="(line, i) in applicationDescLines" :key="i" class="desc-line">{{ i + 1 }}. {{ line }}</text>
            </view>
          </view>

          <text class="sec-t">申请信息确认</text>
          <view class="card kv-card">
            <view class="kv"><text class="kv-k">席位类型</text><text class="kv-v">{{ seatType ? seatTypeLabel[seatType] : '' }}</text></view>
            <view class="kv"><text class="kv-k">成员身份</text><text class="kv-v">{{ selectedRoleName }}</text></view>
            <view class="kv"><text class="kv-k">申请年度</text><text class="kv-v">{{ joinYear }} 年</text></view>
            <view class="kv last"><text class="kv-k">本次支付</text><text class="kv-v red">¥0（不扣款）</text></view>
          </view>

          <view class="note-box">
            <app-icon name="info" :size="15" color="#B8892E" />
            <text class="note-box-t">提交后将创建待审核申请，不会创建支付订单。审核通过后会籍生效；未来如开放会费，将另行展示正式订单与协议。</text>
          </view>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 3"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" @tap="showConfirmDialog = true">
              <app-icon name="send" :size="16" color="#fff" />
              <text class="primary-btn-text">核对并提交</text>
            </view>
          </view>
        </block>

        <!-- ══════ Step 5：提交完成 ══════ -->
        <block v-if="step === 5">
          <view class="center">
            <view class="bigcheck"><app-icon name="check" :size="38" color="#fff" /></view>
            <text class="center-h serif">申请已提交，等待审核</text>
            <text class="center-p">平台已收到你的席位与身份申请。管理层审核通过后，会籍状态将变为 ACTIVE；本次提交未创建订单、未发生扣款。</text>
          </view>
          <view class="card kv-card">
            <view class="kv"><text class="kv-k">当前状态</text><text class="kv-v gold">PENDING · 待审核</text></view>
            <view class="kv"><text class="kv-k">席位类型</text><text class="kv-v">{{ seatType ? seatTypeLabel[seatType] : '' }}</text></view>
            <view class="kv last"><text class="kv-k">提交时间</text><text class="kv-v">{{ submittedAt }}</text></view>
          </view>
          <view class="card fund next-fund">
            <view class="desc-list">
              <text class="desc-line">1. 审核通过后，你将正式成为研究院{{ seatType ? seatTypeLabel[seatType] : '' }}成员</text>
              <text class="desc-line">2. 可在「我的会籍」查看状态、任务与年度考核</text>
              <text class="desc-line">3. {{ seatType === 'LECTURE' ? '通过分享任务积累成果，进入讲师签约观察通道' : '参与研学、活动与圈层交流，持续沉淀专业能力' }}</text>
            </view>
          </view>
          <view class="ghost-btn full" @tap="goInstitute"><text class="ghost-btn-text">先去逛逛研究院首页</text></view>
          <view class="primary-btn full mt10" @tap="goMy"><text class="primary-btn-text">查看我的会籍中心</text></view>
        </block>

        <view style="height: 40rpx" />
      </view>
    </scroll-view>

    <!-- ══════ 提交申请确认弹层（底部 sheet） ══════ -->
    <view v-if="showConfirmDialog" class="mask" @tap="showConfirmDialog = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-h serif">确认提交申请</text>
        <view class="card kv-card">
          <view class="kv"><text class="kv-k">项目</text><text class="kv-v">研究院成员申请</text></view>
          <view class="kv"><text class="kv-k">申请费用</text><text class="kv-v red">¥0（不扣款）</text></view>
          <view class="kv"><text class="kv-k">处理方式</text><text class="kv-v">资格校验后进入管理层审核</text></view>
          <view class="kv last"><text class="kv-k">生效时间</text><text class="kv-v">审核通过后</text></view>
        </view>
        <view class="sheet-note">
          <text class="sheet-note-t">提交后不会创建支付订单，也不会扣款。请确认席位与身份信息无误。</text>
        </view>
        <view class="btn-pri" :class="{ 'btn-disabled': joining }" @tap="doApply">
          <text class="btn-pri-t">{{ joining ? '提交中…' : '确认提交' }}</text>
        </view>
        <view class="btn-ghost" @tap="showConfirmDialog = false"><text class="btn-ghost-t">返回检查</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import {
  memberApplyNotices as notices,
  shareTaskRules as shareTasks,
  memberApplySteps as steps,
  memberApplyRoles as roles,
  seatOptions,
  seatTypeLabel,
  eligibilityGuidance,
  instituteApi,
  type SeatType,
  type EligibilityResult,
} from '@/pkg-institute/lib/institute-data'

const statusBarH = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarH.value = info.statusBarHeight || 0
  // 窗口高度 - 状态栏 - 导航条(44) - 步骤器(约 74)
  scrollHeight.value = (info.windowHeight || 700) - statusBarH.value - 44 - 74
} catch (e) {}

const joinYear = new Date().getFullYear()
const step = ref(1)
const selectedRole = ref('')
const agreeAll = ref(false)
const showConfirmDialog = ref(false)
const joining = ref(false)
const submittedAt = ref('')

// ───── 席位选择 + 门槛自检 ─────
const seatType = ref<SeatType | ''>('')
const eligLoading = ref(false)
const eligError = ref('')
/** 自检接口未开放（404）→ 诚实降级：允许继续，提交时由后端校验 */
const eligDegraded = ref(false)
const eligibility = ref<EligibilityResult | null>(null)

const canNext1 = computed(() => agreeAll.value)
const canNext2 = computed(() =>
  !!seatType.value && !eligLoading.value && !eligError.value && (eligDegraded.value || !!eligibility.value?.eligible),
)
const canNext3 = computed(() => !!selectedRole.value)
const selectedRoleName = computed(() => roles.find(r => r.value === selectedRole.value)?.label || '')
const failedCount = computed(() => eligibility.value?.checks.filter(c => !c.pass).length || 0)
const seatNextText = computed(() => {
  if (!seatType.value) return '请先选择席位'
  if (eligLoading.value) return '门槛核对中…'
  if (eligibility.value && !eligibility.value.eligible) return `还差 ${failedCount.value} 项门槛`
  return '下一步：选择成员身份'
})
const applicationSubText = computed(() =>
  seatType.value === 'LECTURE' ? '讲席申请 · 分享考核与讲师成长通道' : '研修席申请 · 专注研学与圈层交流',
)
const applicationDescLines = computed(() =>
  seatType.value === 'LECTURE'
    ? [
        '本次只提交讲席申请，不创建订单、不扣款。',
        '平台将再次校验讲席准入条件，管理层审核通过后会籍生效。',
        '讲席成员按年度任务积累分享成果，并进入讲师签约观察通道。',
        '线上会费功能尚未开放；未来如开放，以正式订单与协议为准。',
      ]
    : [
        '本次只提交研修席申请，不创建订单、不扣款。',
        '平台将再次校验研修席准入条件，管理层审核通过后会籍生效。',
        '研修席专注研学与圈层交流，不承担年度分享任务。',
        '线上会费功能尚未开放；未来如开放，以正式订单与协议为准。',
      ],
)

/** 单勾选确认申请规则 */
function toggleAgreeAll() {
  agreeAll.value = !agreeAll.value
}

async function selectSeat(v: SeatType) {
  if (!getToken()) {
    promptLoginForEligibility()
    return
  }
  if (seatType.value === v) return
  seatType.value = v
  await loadEligibility()
}

function promptLoginForEligibility() {
  uni.showModal({
    title: '登录后继续申请',
    content: '席位自检需要读取你的平台成长数据。登录后可继续选择席位，当前不会产生扣款。',
    confirmText: '去登录',
    cancelText: '稍后再说',
    confirmColor: '#C41E3A',
    success: (res) => {
      if (!res.confirm) return
      try { uni.setStorageSync('login:redirect', '/institute/member-apply') } catch { /* 回跳记录失败不阻断登录 */ }
      navigateTo('/login')
    },
  })
}

async function loadEligibility() {
  if (!seatType.value) return
  eligLoading.value = true
  eligError.value = ''
  eligDegraded.value = false
  eligibility.value = null
  try {
    eligibility.value = await instituteApi.checkEligibility(seatType.value)
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 接口未部署/未开放（404）→ 诚实降级不拦人；其余错误给重试
    if (/404|Cannot GET/i.test(msg)) eligDegraded.value = true
    else eligError.value = msg || '自检失败'
  } finally {
    eligLoading.value = false
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

async function doApply() {
  if (joining.value) return
  joining.value = true
  try {
    await instituteApi.applyMember({
      role: selectedRole.value,
      joinYear,
      seatType: (seatType.value || 'STUDY') as SeatType,
    })
    const d = new Date()
    submittedAt.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    showConfirmDialog.value = false
    step.value = 5
  } catch (e) {
    // 门槛不合格时后端 400 message 带未通过项，直接 toast 呈现
    showConfirmDialog.value = false
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    joining.value = false
  }
}

function goInstitute() {
  navigateTo('/institute')
}
function goMy() {
  navigateTo('/institute/my-tasks')
}
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$red-deep: #9e1730;
$gold: #c9a96e;
$ink: #2c2c2c;
$sub: #6e6e73;
$faint: #999999;
$line: #edeae4;

.serif {
  font-family: 'Songti SC', 'STSong', 'SimSun', serif;
}

.page {
  min-height: 100vh;
  background: $paper;
  display: flex;
  flex-direction: column;
}

/* ───── 导航栏 ───── */
.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  background: $paper;
  border-bottom: 1rpx solid $line;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #fff;
  border: 1rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
}
.nav-spacer {
  width: 60rpx;
}
.stepper {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16rpx 32rpx 22rpx;
}
.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.step-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #f0ece4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-done {
  background: #2fa84f;
}
.step-current {
  background: $red;
}
.step-num {
  font-size: 22rpx;
  font-weight: 600;
  color: $faint;
}
.step-num-active {
  color: #fff;
}
.step-label {
  font-size: 18rpx;
  color: $faint;
}
.step-label-active {
  color: $red;
  font-weight: 600;
}

.scroll {
  width: 100%;
}
.wrap {
  padding: 32rpx 40rpx;
}

/* ───── 区块标题 ───── */
.sec-t {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: $ink;
  margin: 32rpx 0 20rpx;
}
.sec-sub {
  display: block;
  font-size: 24rpx;
  color: $sub;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

/* ───── 价格卡 ───── */
.pricecard {
  position: relative;
  overflow: hidden;
  background: linear-gradient(150deg, $red, $red-deep);
  border-radius: 36rpx;
  padding: 44rpx 36rpx;
  text-align: center;
  margin-bottom: 8rpx;
}
.pricecard.small {
  padding: 40rpx 36rpx;
}
.seal {
  position: absolute;
  left: -40rpx;
  bottom: -40rpx;
  width: 220rpx;
  height: 220rpx;
  border: 1rpx solid rgba(201, 169, 110, 0.4);
  border-radius: 50%;
}
.pc-lbl {
  display: block;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: $gold;
}
.pc-num-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8rpx;
  margin: 12rpx 0;
}
.pc-num {
  font-size: 78rpx;
  font-weight: 800;
  color: #fff;
}
.pc-unit {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}
.pc-sub {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.6;
  margin-top: 8rpx;
}
.pc-chips {
  display: flex;
  justify-content: center;
  gap: 12rpx;
  margin-top: 8rpx;
}
.chip {
  border: 1rpx solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  padding: 6rpx 20rpx;
}
.chip-t {
  font-size: 20rpx;
  color: #fff;
}

/* ───── 两条退费路径 ───── */
.split {
  display: flex;
  gap: 20rpx;
}
.half {
  flex: 1;
  border-radius: 28rpx;
  padding: 26rpx 22rpx;
  border: 1rpx solid $line;
  background: $card;
}
.half.go {
  border-color: $gold;
  background: linear-gradient(180deg, #fffdf8, #fff8ec);
}
.half-b {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: $ink;
}
.half-p {
  display: block;
  font-size: 22rpx;
  color: $sub;
  line-height: 1.6;
  margin: 12rpx 0 20rpx;
}
.rtag {
  display: inline-block;
  border-radius: 14rpx;
  padding: 10rpx 16rpx;
}
.rtag.on {
  background: $gold;
}
.rtag.off {
  background: $line;
}
.rtag-t {
  font-size: 20rpx;
  font-weight: 700;
  color: #3a2c10;
  line-height: 1.4;
}
.rtag-t.off-t {
  color: $sub;
}

/* ───── 通用卡片 ───── */
.card {
  background: $card;
  border: 1rpx solid $line;
  border-radius: 36rpx;
  box-shadow: 0 8rpx 32rpx rgba(140, 120, 90, 0.06);
}

/* 加入须知 */
.notice-card {
  padding: 20rpx 24rpx;
}
.notice-li {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $line;
}
.notice-li:last-child {
  border-bottom: none;
}
.notice-ic {
  width: 60rpx;
  height: 60rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.notice-info {
  flex: 1;
}
.notice-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
}
.notice-desc {
  display: block;
  font-size: 22rpx;
  color: $sub;
  line-height: 1.5;
  margin-top: 6rpx;
}

/* 分享任务 */
.task-card {
  padding: 20rpx 24rpx;
}
.task-hint {
  display: block;
  font-size: 22rpx;
  color: $sub;
  line-height: 1.6;
  margin-bottom: 16rpx;
}
.task-li {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 16rpx;
  background: #faf7f1;
  border-radius: 16rpx;
  margin-bottom: 14rpx;
}
.task-li:last-child {
  margin-bottom: 0;
}
.task-ic {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: rgba(201, 169, 110, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.task-info {
  flex: 1;
}
.task-label {
  display: block;
  font-size: 25rpx;
  color: $ink;
}
.task-proof {
  display: block;
  font-size: 20rpx;
  color: $faint;
  margin-top: 4rpx;
}
.period-badge {
  padding: 4rpx 16rpx;
  border: 1rpx solid $gold;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.period-t {
  font-size: 20rpx;
  color: #b8892e;
}

/* 资金机制 */
.fund {
  padding: 24rpx 26rpx;
}
.fund-t {
  font-size: 25rpx;
  color: $ink;
  line-height: 1.8;
}
.fund-em {
  color: $red;
  font-weight: 700;
}
.next-fund {
  margin-top: 20rpx;
}

/* 风险提示（实色醒目） */
.risk {
  background: #fbf0f1;
  border: 3rpx solid $red;
  border-radius: 36rpx;
  padding: 28rpx 26rpx;
  margin-top: 32rpx;
}
.risk-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}
.risk-title {
  font-size: 26rpx;
  font-weight: 700;
  color: $red;
}
.risk-p {
  display: block;
  font-size: 23rpx;
  color: #7a2531;
  line-height: 1.7;
  margin-bottom: 8rpx;
}
.risk-p:last-child {
  margin-bottom: 0;
}

/* 同意勾选 */
.check {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin: 32rpx 4rpx;
}
.cb {
  width: 36rpx;
  height: 36rpx;
  border-radius: 10rpx;
  border: 3rpx solid $red;
  background: #fff;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cb-on {
  background: $red;
}
.check-txt {
  flex: 1;
  font-size: 22rpx;
  color: $sub;
  line-height: 1.6;
}
.check-link {
  color: $red;
}

/* note 提示（宣纸金） */
.note-box {
  display: flex;
  gap: 14rpx;
  align-items: flex-start;
  background: #f5efe6;
  border: 1rpx solid #ece0cd;
  border-radius: 24rpx;
  padding: 22rpx 24rpx;
  margin-top: 20rpx;
}
.note-box-t {
  flex: 1;
  font-size: 22rpx;
  color: #9c8656;
  line-height: 1.6;
}

/* ───── 席位选择 ───── */
.seat-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.seat-card {
  padding: 28rpx 26rpx;
  border-radius: 36rpx;
  border: 3rpx solid $line;
  background: $card;
}
.seat-active {
  box-shadow: 0 8rpx 24rpx rgba(140, 120, 90, 0.1);
}
.seat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.seat-name-row {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
}
.seat-name {
  font-size: 34rpx;
  font-weight: 700;
}
.seat-tagline {
  font-size: 21rpx;
  color: $faint;
}
.seat-rtag {
  display: inline-block;
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
  margin-bottom: 18rpx;
}
.seat-rtag-on {
  background: rgba(201, 169, 110, 0.18);
}
.seat-rtag-off {
  background: #f2efe9;
}
.seat-rtag-t {
  font-size: 21rpx;
  font-weight: 700;
  color: #b8892e;
}
.seat-rtag-off .seat-rtag-t {
  color: $sub;
}
.seat-points {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.seat-point {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.seat-point-text {
  flex: 1;
  font-size: 23rpx;
  color: #4b4642;
  line-height: 1.55;
}

/* ───── 门槛自检 ───── */
.elig-card {
  padding: 24rpx;
}
.elig-state {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.elig-state-text {
  font-size: 23rpx;
  color: $faint;
}
.mini-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 5rpx solid #f0ece4;
  border-top-color: $red;
  border-radius: 50%;
  animation: elig-spin 0.8s linear infinite;
}
@keyframes elig-spin {
  to {
    transform: rotate(360deg);
  }
}
.elig-retry {
  padding: 10rpx 36rpx;
  border: 1rpx solid $red;
  border-radius: 999px;
}
.elig-retry-text {
  font-size: 23rpx;
  color: $red;
}
.check-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.elig-item {
  padding: 18rpx 20rpx;
  background: #faf7f1;
  border-radius: 20rpx;
}
.elig-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.elig-icon {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.elig-pass {
  background: #2fa84f;
}
.elig-fail {
  background: #ef4444;
}
.elig-label {
  flex: 1;
  font-size: 25rpx;
  color: $ink;
}
.elig-num {
  font-size: 25rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.num-pass {
  color: #1f8a3e;
}
.num-fail {
  color: $red;
}
.elig-guide {
  display: block;
  font-size: 21rpx;
  color: #b8892e;
  line-height: 1.5;
  margin-top: 12rpx;
  padding-left: 50rpx;
}
.gap-box {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-top: 20rpx;
  padding: 18rpx 20rpx;
  background: #fbf0f1;
  border-radius: 20rpx;
}
.gap-text {
  flex: 1;
  font-size: 22rpx;
  color: #9e1730;
  line-height: 1.6;
}
.pass-box {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 20rpx;
  padding: 18rpx 20rpx;
  background: linear-gradient(180deg, #fffdf8, #fff8ec);
  border: 1rpx solid rgba(201, 169, 110, 0.5);
  border-radius: 20rpx;
}
.pass-text {
  flex: 1;
  font-size: 22rpx;
  color: #b8892e;
  line-height: 1.6;
}

/* ───── 成员身份 ───── */
.role-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.role-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx;
  border-radius: 28rpx;
  border: 3rpx solid $line;
  background: $card;
}
.role-active {
  border-color: $red;
  background: rgba(196, 30, 58, 0.04);
}
.role-info {
  flex: 1;
}
.role-name {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  color: $ink;
}
.role-meta {
  display: block;
  font-size: 21rpx;
  color: $faint;
  margin-top: 6rpx;
  line-height: 1.5;
}

/* ───── kv 卡片 ───── */
.kv-card {
  padding: 6rpx 24rpx;
}
.kv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 0;
  border-bottom: 1rpx solid $line;
}
.kv.last {
  border-bottom: none;
}
.kv-k {
  font-size: 24rpx;
  color: $faint;
}
.kv-v {
  font-size: 24rpx;
  font-weight: 600;
  color: $ink;
}
.kv-v.red {
  color: $red;
}
.kv-v.gold {
  color: #b8892e;
}

/* 会费说明列表 */
.desc-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.desc-line {
  font-size: 24rpx;
  color: $sub;
  line-height: 1.6;
}

/* ───── 完成态 ───── */
.center {
  text-align: center;
  padding: 72rpx 24rpx 24rpx;
}
.bigcheck {
  width: 148rpx;
  height: 148rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #2fa84f, #1f8a3e);
  margin: 0 auto 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 40rpx rgba(47, 168, 79, 0.3);
}
.center-h {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
  color: $ink;
}
.center-p {
  display: block;
  font-size: 24rpx;
  color: $sub;
  margin-top: 16rpx;
  line-height: 1.7;
}

/* ───── 按钮 ───── */
.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 92rpx;
  background: $red;
  border-radius: 999px;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28);
  margin-top: 32rpx;
}
.primary-btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 700;
}
.btn-disabled {
  background: #d6d0c7;
  box-shadow: none;
}
.ghost-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  padding: 0 40rpx;
  background: #fff;
  border: 1rpx solid $line;
  border-radius: 999px;
  margin-top: 32rpx;
}
.ghost-btn-text {
  font-size: 28rpx;
  color: $sub;
  font-weight: 700;
}
.btn-row {
  display: flex;
  gap: 20rpx;
}
.flex1 {
  flex: 1;
}
.full {
  width: 100%;
}
.mt10 {
  margin-top: 20rpx;
}

/* ───── 支付弹层（底部 sheet） ───── */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(30, 20, 15, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}
.sheet {
  background: $paper;
  width: 100%;
  border-radius: 44rpx 44rpx 0 0;
  padding: 40rpx 40rpx 52rpx;
}
.sheet-h {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: $ink;
  margin-bottom: 24rpx;
}
.sheet-note {
  background: #f5efe6;
  border: 1rpx solid #ece0cd;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  margin: 24rpx 0;
}
.sheet-note-t {
  font-size: 22rpx;
  color: #9c8656;
  line-height: 1.6;
}
.btn-pri {
  height: 96rpx;
  border-radius: 999px;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28);
}
.btn-pri-t {
  font-size: 28rpx;
  color: #fff;
  font-weight: 700;
}
.btn-ghost {
  height: 88rpx;
  border-radius: 999px;
  border: 1rpx solid $line;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 18rpx;
}
.btn-ghost-t {
  font-size: 26rpx;
  color: $sub;
  font-weight: 700;
}
</style>
