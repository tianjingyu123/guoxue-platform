<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="nav-title">申请加入研究院</text>
        <view class="nav-spacer" />
      </view>
      <!-- 步骤指示器 -->
      <view class="stepper">
        <view v-for="(label, i) in steps" :key="i" class="step-item">
          <view
            class="step-dot"
            :class="{ 'step-done': step > i + 1, 'step-current': step === i + 1 }"
          >
            <app-icon v-if="step > i + 1" name="check-circle" :size="16" color="#fff" />
            <text v-else class="step-num" :class="{ 'step-num-active': step === i + 1 }">{{ i + 1 }}</text>
          </view>
          <text class="step-label" :class="{ 'step-label-active': step === i + 1 }">{{ label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="main">
        <!-- Step 1: 了解机制 -->
        <block v-if="step === 1">
          <view class="card">
            <view class="card-title-row">
              <app-icon name="info" :size="16" color="#c41e3a" />
              <text class="card-title">加入须知</text>
            </view>
            <view class="req-list">
              <view v-for="item in notices" :key="item.title" class="req-item">
                <view class="req-icon"><app-icon :name="item.icon" :size="16" color="#c41e3a" /></view>
                <view class="req-info">
                  <text class="req-label">{{ item.title }}</text>
                  <text class="req-desc">{{ item.desc }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="card">
            <view class="card-title-row">
              <app-icon name="file-text" :size="16" color="#c41e3a" />
              <text class="card-title">分享任务要求</text>
            </view>
            <text class="card-sub">申请分享的成员，需完成以下任务方可年度退还会费：</text>
            <view class="task-list">
              <view v-for="(task, i) in shareTasks" :key="i" class="task-item">
                <view class="task-icon"><app-icon :name="task.icon" :size="16" color="#3b82f6" /></view>
                <view class="task-info">
                  <text class="task-label">{{ task.label }}</text>
                  <text class="task-proof">{{ task.proof }}</text>
                </view>
                <view class="period-badge"><text class="period-text">{{ task.period }}</text></view>
              </view>
            </view>
            <view class="agree-list">
              <view class="agree-item" @tap="toggleAgree('tasks')">
                <view class="checkbox" :class="{ 'checkbox-checked': agreements.tasks }">
                  <app-icon v-if="agreements.tasks" name="check" :size="12" color="#fff" />
                </view>
                <text class="agree-text">我承诺按时完成研究院规定的分享任务要求，积极参与交流</text>
              </view>
              <view class="agree-item" @tap="toggleAgree('refund')">
                <view class="checkbox" :class="{ 'checkbox-checked': agreements.refund }">
                  <app-icon v-if="agreements.refund" name="check" :size="12" color="#fff" />
                </view>
                <text class="agree-text">我理解：完成任务可全额退还会费；仅学习不分享则会费不予退还</text>
              </view>
              <view class="agree-item" @tap="toggleAgree('rules')">
                <view class="checkbox" :class="{ 'checkbox-checked': agreements.rules }">
                  <app-icon v-if="agreements.rules" name="check" :size="12" color="#fff" />
                </view>
                <text class="agree-text">我已阅读并同意《研究院管理规则》和《会费退还规则》</text>
              </view>
            </view>
          </view>

          <view class="info-box">
            <app-icon name="info" :size="16" color="#f59e0b" />
            <text class="info-text">研究院实行付费准入、不做事前资格筛选——交纳会费即可加入，加入后通过是否申请分享自然区分人才。</text>
          </view>

          <view class="primary-btn" :class="{ 'btn-disabled': !canNext1 }" @tap="canNext1 && (step = 2)">
            <text class="primary-btn-text">下一步：选择席位</text>
          </view>
        </block>

        <!-- Step 2: 选择席位（T9-P1 双轨席位制）-->
        <block v-if="step === 2">
          <view class="card">
            <view class="card-title-row">
              <app-icon name="layout-grid" :size="16" color="#c41e3a" />
              <text class="card-title">选择席位</text>
            </view>
            <text class="card-sub">研究院实行双轨席位制：讲席以分享考核换年费返还，研修席专注研学不担考核。</text>
            <view class="seat-list">
              <view
                v-for="s in seatOptions"
                :key="s.value"
                class="seat-card"
                :class="{ 'seat-active': seatType === s.value }"
                :style="seatType === s.value ? { borderColor: s.accent, background: s.accentBg } : {}"
                @tap="selectSeat(s.value)"
              >
                <view class="seat-head">
                  <view class="seat-name-row">
                    <text class="seat-name" :style="{ color: s.accent }">{{ s.name }}</text>
                    <text class="seat-tagline">{{ s.tagline }}</text>
                  </view>
                  <app-icon v-if="seatType === s.value" name="check-circle" :size="20" :color="s.accent" />
                </view>
                <view class="seat-points">
                  <view v-for="(p, i) in s.points" :key="i" class="seat-point">
                    <app-icon :name="p.icon" :size="13" :color="s.accent" />
                    <text class="seat-point-text">{{ p.text }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 门槛自检清单 -->
          <view v-if="seatType" class="card">
            <view class="card-title-row">
              <app-icon name="clipboard-list" :size="16" color="#c41e3a" />
              <text class="card-title">{{ seatTypeLabel[seatType] }}门槛自检</text>
            </view>

            <view v-if="eligLoading" class="elig-state">
              <view class="mini-spinner" />
              <text class="elig-state-text">正在核对平台数据…</text>
            </view>

            <view v-else-if="eligError" class="elig-state">
              <app-icon name="alert-circle" :size="28" color="#d1d5db" />
              <text class="elig-state-text">{{ eligError }}</text>
              <view class="elig-retry" @tap="loadEligibility"><text class="elig-retry-text">重试</text></view>
            </view>

            <view v-else-if="eligDegraded" class="info-box" style="margin: 0">
              <app-icon name="info" :size="16" color="#f59e0b" />
              <text class="info-text">门槛自检暂未开放，可先继续申请——提交时平台将自动校验准入条件。</text>
            </view>

            <template v-else-if="eligibility">
              <view class="check-list">
                <view v-for="c in eligibility.checks" :key="c.key" class="check-item">
                  <view class="check-row">
                    <view class="check-icon" :class="c.pass ? 'check-pass' : 'check-fail'">
                      <app-icon :name="c.pass ? 'check' : 'x'" :size="12" color="#fff" />
                    </view>
                    <text class="check-label">{{ c.label }}</text>
                    <text class="check-num" :class="c.pass ? 'num-pass' : 'num-fail'">{{ c.current }}/{{ c.required }}</text>
                  </view>
                  <text v-if="!c.pass" class="check-guide">{{ eligibilityGuidance(c) }}</text>
                </view>
              </view>
              <view v-if="!eligibility.eligible" class="gap-box">
                <app-icon name="target" :size="15" color="#dc2626" />
                <text class="gap-text">还差 {{ failedCount }} 项未达标。门槛不是拒绝，而是方向——达标之路本身就是成长。</text>
              </view>
              <view v-else class="pass-box">
                <app-icon name="badge-check" :size="15" color="#16a34a" />
                <text class="pass-text">恭喜，你已满足{{ seatTypeLabel[seatType] }}全部准入门槛！</text>
              </view>
            </template>
          </view>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 1"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" :class="{ 'btn-disabled': !canNext2 }" @tap="canNext2 && (step = 3)">
              <text class="primary-btn-text">{{ seatNextText }}</text>
            </view>
          </view>
        </block>

        <!-- Step 3: 填写资料（选择成员身份）-->
        <block v-if="step === 3">
          <view class="card">
            <view class="card-title-row">
              <app-icon name="user-check" :size="16" color="#c41e3a" />
              <text class="card-title">选择成员身份</text>
            </view>
            <text class="card-sub">加入后所有成员身份统一，此选择仅用于标注你的加入意向。</text>
            <view class="circle-list">
              <view
                v-for="r in roles"
                :key="r.value"
                class="circle-item"
                :class="{ 'circle-active': selectedRole === r.value }"
                @tap="selectedRole = r.value"
              >
                <view class="circle-info">
                  <text class="circle-name">{{ r.label }}</text>
                  <text class="circle-meta">{{ r.desc }}</text>
                </view>
                <app-icon v-if="selectedRole === r.value" name="check-circle" :size="20" color="#c41e3a" />
              </view>
            </view>
          </view>

          <view class="card">
            <view class="card-title-row">
              <app-icon name="calendar" :size="16" color="#c41e3a" />
              <text class="card-title">会籍年度</text>
            </view>
            <view class="confirm-row"><text class="confirm-label">已选席位</text><text class="confirm-value">{{ seatType ? seatTypeLabel[seatType] : '' }}</text></view>
            <view class="confirm-row"><text class="confirm-label">加入年份</text><text class="confirm-value">{{ joinYear }} 年</text></view>
            <view class="confirm-row"><text class="confirm-label">会籍有效期</text><text class="confirm-value">1 年（至 {{ joinYear }}-12-31）</text></view>
          </view>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 2"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" :class="{ 'btn-disabled': !canNext3 }" @tap="canNext3 && (step = 4)">
              <text class="primary-btn-text">下一步：缴纳会费</text>
            </view>
          </view>
        </block>

        <!-- Step 4: 缴纳会费 -->
        <block v-if="step === 4">
          <view class="deposit-card">
            <app-icon name="graduation-cap" :size="48" color="#c41e3a" />
            <text class="deposit-title">研究院年度会费</text>
            <text class="deposit-amount">¥10,000</text>
            <text class="deposit-sub">{{ feeSubText }}</text>
          </view>

          <view class="card">
            <text class="card-title plain">会费说明</text>
            <view class="desc-list">
              <text v-for="(line, i) in feeDescLines" :key="i" class="desc-line">{{ i + 1 }}. {{ line }}</text>
            </view>
          </view>

          <view class="card">
            <text class="card-title plain">申请信息确认</text>
            <view class="confirm-row"><text class="confirm-label">席位类型</text><text class="confirm-value">{{ seatType ? seatTypeLabel[seatType] : '' }}</text></view>
            <view class="confirm-row"><text class="confirm-label">成员身份</text><text class="confirm-value">{{ selectedRoleName }}</text></view>
            <view class="confirm-row"><text class="confirm-label">加入年份</text><text class="confirm-value">{{ joinYear }} 年</text></view>
            <view class="confirm-row"><text class="confirm-label">会费金额</text><text class="confirm-value">¥10,000</text></view>
          </view>

          <view class="info-box">
            <app-icon name="info" :size="16" color="#f59e0b" />
            <text class="info-text">演示环境下会费支付为模拟流程，真实在线支付链路即将开放。提交后申请进入管理层审核。</text>
          </view>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 3"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" @tap="showPayDialog = true">
              <app-icon name="credit-card" :size="16" color="#fff" />
              <text class="primary-btn-text">提交申请</text>
            </view>
          </view>
        </block>

        <!-- Step 5: 完成 -->
        <block v-if="step === 5">
          <view class="success-wrap">
            <view class="success-icon"><app-icon name="check-circle" :size="40" color="#22c55e" /></view>
            <text class="success-title">申请提交成功</text>
            <text class="success-sub">你的入会申请已提交，研究院管理层将尽快审核</text>
            <view class="card next-card">
              <text class="card-title plain">接下来…</text>
              <view class="desc-list">
                <text class="desc-line">1. 审核通过后，你将正式成为研究院{{ seatType ? seatTypeLabel[seatType] : '' }}成员</text>
                <text class="desc-line">2. 可在「我的会籍」查看会籍状态与年度考核</text>
                <text class="desc-line">3. {{ seatType === 'LECTURE' ? '完成积分与线下分享考核，年度结算可返还 50%–100% 会费' : '尊享全部分享内容与圈层网络，后续可申请转讲席' }}</text>
              </view>
            </view>
            <view class="btn-row">
              <view class="ghost-btn flex1" @tap="goInstitute"><text class="ghost-btn-text">返回研究院</text></view>
              <view class="primary-btn flex1" @tap="goMy"><text class="primary-btn-text">查看我的会籍</text></view>
            </view>
          </view>
        </block>
      </view>
    </scroll-view>

    <!-- 提交确认弹窗 -->
    <view v-if="showPayDialog" class="dialog-mask" @tap="showPayDialog = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">确认提交</text>
        <text class="dialog-desc">你即将提交研究院入会申请并缴纳会费</text>
        <view class="dialog-amount-wrap">
          <text class="dialog-amount">¥10,000</text>
          <text class="dialog-amount-sub">{{ feeSubText }}</text>
        </view>
        <view class="dialog-btns">
          <view class="ghost-btn flex1" @tap="showPayDialog = false"><text class="ghost-btn-text">取消</text></view>
          <view class="primary-btn flex1" :class="{ 'btn-disabled': joining }" @tap="doApply">
            <text class="primary-btn-text">{{ joining ? '提交中…' : '确认提交' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
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
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44 - 64
} catch (e) {}

const joinYear = new Date().getFullYear()
const step = ref(1)
const selectedRole = ref('')
const agreements = ref({ tasks: false, refund: false, rules: false })
const showPayDialog = ref(false)
const joining = ref(false)

// ───── 席位选择 + 门槛自检（T9-P1）─────
const seatType = ref<SeatType | ''>('')
const eligLoading = ref(false)
const eligError = ref('')
/** 自检接口未开放（404）→ 诚实降级：允许继续，提交时由后端校验 */
const eligDegraded = ref(false)
const eligibility = ref<EligibilityResult | null>(null)

const canNext1 = computed(() => agreements.value.tasks && agreements.value.refund && agreements.value.rules)
/** 席位步：已选席位 + 自检通过（或接口未开放降级放行）*/
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
const feeSubText = computed(() =>
  seatType.value === 'LECTURE' ? '考核达标返还 50%–100%（积分+线下双达标全额返还）' : '研修席年费不予返还 · 尊享全部分享内容与圈层网络',
)
const feeDescLines = computed(() =>
  seatType.value === 'LECTURE'
    ? [
        '讲席实行年度积分考核：100 分达标线 + 季度 15 分最低线。',
        '积分达标且线下分享达标（三选一），年度结算全额返还会费。',
        '积分达标但线下未达标（纯线上分享型），返还 50%。',
        '连续两季不足 15 分或年度不足 60 分，自动转研修席（籍在不驱逐）。',
      ]
    : [
        '研修席无分享考核，专注研学与圈层交流。',
        '年费为研究院收入池的主要来源，不予返还。',
        '尊享全部分享内容、活动与圈层社交网络，含优先咨询/约课权。',
        '后续可申请转讲席（需通过讲席准入门槛校验）。',
      ],
)

async function selectSeat(v: SeatType) {
  if (seatType.value === v) return
  seatType.value = v
  await loadEligibility()
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

function toggleAgree(key: 'tasks' | 'refund' | 'rules') {
  agreements.value[key] = !agreements.value[key]
}

async function doApply() {
  if (joining.value) return
  joining.value = true
  try {
    await instituteApi.applyMember({
      role: selectedRole.value,
      joinYear,
      deposit: 10000,
      seatType: (seatType.value || 'STUDY') as SeatType,
    })
    showPayDialog.value = false
    step.value = 5
  } catch (e) {
    // 门槛不合格时后端 400 message 带未通过项，直接 toast 呈现
    showPayDialog.value = false
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

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,0.95); border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.nav-spacer { width: 32px; }
.stepper { display: flex; align-items: flex-start; justify-content: space-between; padding: 10px 16px 14px; }
.step-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.step-dot { width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.step-done { background: #22c55e; }
.step-current { background: var(--brand); }
.step-num { font-size: 12px; font-weight: 500; color: #9ca3af; }
.step-num-active { color: #fff; }
.step-label { font-size: 10px; color: #9ca3af; }
.step-label-active { color: var(--brand); font-weight: 500; }

.scroll { width: 100%; }
.main { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #ededed; }
.card-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.card-title.plain { display: block; margin-bottom: 12px; }
.card-sub { display: block; font-size: 12px; color: #6b7280; margin-bottom: 12px; line-height: 1.5; }

.req-list { display: flex; flex-direction: column; gap: 12px; }
.req-item { display: flex; align-items: center; gap: 12px; padding: 8px; background: #f9fafb; border-radius: 8px; }
.req-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.req-info { flex: 1; }
.req-label { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.req-desc { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; line-height: 1.4; }

.task-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.task-item { display: flex; align-items: center; gap: 12px; padding: 8px; background: #f9fafb; border-radius: 8px; }
.task-icon { width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.task-info { flex: 1; }
.task-label { display: block; font-size: 13px; color: #1a1a1a; }
.task-proof { display: block; font-size: 10px; color: #9ca3af; margin-top: 1px; }
.period-badge { padding: 2px 8px; border: 1px solid #d1d5db; border-radius: 6px; flex-shrink: 0; }
.period-text { font-size: 10px; color: #6b7280; }

.agree-list { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #ededed; padding-top: 14px; }
.agree-item { display: flex; align-items: flex-start; gap: 8px; }
.checkbox { width: 16px; height: 16px; border-radius: 4px; border: 1px solid #d1d5db; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
.checkbox-checked { background: var(--brand); border-color: var(--brand); }
.agree-text { flex: 1; font-size: 12px; color: #6b7280; line-height: 1.5; }

.info-box { display: flex; gap: 8px; padding: 12px; background: #fffbeb; border-radius: 12px; }
.info-text { flex: 1; font-size: 12px; color: #b45309; line-height: 1.5; }

/* ───── 席位选择（T9-P1）───── */
.seat-list { display: flex; flex-direction: column; gap: 12px; }
.seat-card { padding: 14px; border-radius: 12px; border: 2px solid #ededed; }
.seat-active { box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.seat-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.seat-name-row { display: flex; align-items: baseline; gap: 8px; }
.seat-name { font-size: 16px; font-weight: 700; }
.seat-tagline { font-size: 11px; color: #9ca3af; }
.seat-points { display: flex; flex-direction: column; gap: 7px; }
.seat-point { display: flex; align-items: flex-start; gap: 6px; }
.seat-point-text { flex: 1; font-size: 12px; color: #4b5563; line-height: 1.5; }

/* ───── 门槛自检清单 ───── */
.elig-state { padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.elig-state-text { font-size: 12px; color: #9ca3af; }
.mini-spinner { width: 22px; height: 22px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: elig-spin 0.8s linear infinite; }
@keyframes elig-spin { to { transform: rotate(360deg); } }
.elig-retry { padding: 6px 18px; border: 1px solid var(--brand); border-radius: 999px; }
.elig-retry-text { font-size: 12px; color: var(--brand); }
.check-list { display: flex; flex-direction: column; gap: 10px; }
.check-item { padding: 10px 12px; background: #f9fafb; border-radius: 10px; }
.check-row { display: flex; align-items: center; gap: 10px; }
.check-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.check-pass { background: #22c55e; }
.check-fail { background: #ef4444; }
.check-label { flex: 1; font-size: 13px; color: #1a1a1a; }
.check-num { font-size: 13px; font-weight: 600; flex-shrink: 0; }
.num-pass { color: #16a34a; }
.num-fail { color: #dc2626; }
.check-guide { display: block; font-size: 11px; color: #b45309; line-height: 1.5; margin-top: 6px; padding-left: 28px; }
.gap-box { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px; background: #fef2f2; border-radius: 10px; }
.gap-text { flex: 1; font-size: 12px; color: #b91c1c; line-height: 1.5; }
.pass-box { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 10px 12px; background: #f0fdf4; border-radius: 10px; }
.pass-text { flex: 1; font-size: 12px; color: #15803d; line-height: 1.5; }

.circle-list { display: flex; flex-direction: column; gap: 8px; }
.circle-item { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 12px; border: 2px solid #ededed; }
.circle-active { border-color: var(--brand); background: rgba(196,30,58,0.04); }
.circle-info { flex: 1; }
.circle-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.circle-meta { display: block; font-size: 11px; color: #9ca3af; margin-top: 3px; line-height: 1.4; }

.confirm-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
.confirm-label { font-size: 13px; color: #9ca3af; }
.confirm-value { font-size: 13px; color: #1a1a1a; }

.deposit-card { display: flex; flex-direction: column; align-items: center; padding: 24px; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(196,30,58,0.04)); border-radius: 12px; }
.deposit-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-top: 12px; }
.deposit-amount { font-size: 32px; font-weight: 700; color: var(--brand); margin: 14px 0; }
.deposit-sub { font-size: 12px; color: #6b7280; }

.desc-list { display: flex; flex-direction: column; gap: 8px; }
.desc-line { font-size: 13px; color: #6b7280; line-height: 1.5; }

.success-wrap { display: flex; flex-direction: column; align-items: center; padding-top: 20px; }
.success-icon { width: 80px; height: 80px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.success-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.success-sub { font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 24px; line-height: 1.5; }
.next-card { width: 100%; text-align: left; margin-bottom: 16px; }

.primary-btn { display: flex; align-items: center; justify-content: center; gap: 6px; height: 44px; background: var(--brand); border-radius: 8px; }
.primary-btn-text { font-size: 14px; color: #fff; font-weight: 500; }
.btn-disabled { background: #d1d5db; }
.ghost-btn { display: flex; align-items: center; justify-content: center; height: 44px; padding: 0 20px; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; }
.ghost-btn-text { font-size: 14px; color: #4b5563; font-weight: 500; }
.btn-row { display: flex; gap: 12px; }
.flex1 { flex: 1; }

.dialog-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 0 40px; }
.dialog { width: 100%; max-width: 320px; background: #fff; border-radius: 16px; padding: 20px; }
.dialog-title { display: block; font-size: 16px; font-weight: 600; color: #1a1a1a; }
.dialog-desc { display: block; font-size: 13px; color: #9ca3af; margin-top: 4px; }
.dialog-amount-wrap { display: flex; flex-direction: column; align-items: center; padding: 16px 0; }
.dialog-amount { font-size: 28px; font-weight: 700; color: var(--brand); }
.dialog-amount-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }
.dialog-btns { display: flex; gap: 8px; }
</style>
