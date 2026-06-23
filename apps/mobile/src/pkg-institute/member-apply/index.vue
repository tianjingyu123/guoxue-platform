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
            :class="{
              'step-done': step > i + 1,
              'step-current': step === i + 1,
            }"
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
        <!-- Step 1: 资格检查 -->
        <block v-if="step === 1">
          <view class="card">
            <view class="card-title-row">
              <app-icon name="shield" :size="16" color="#c41e3a" />
              <text class="card-title">加入门槛检查</text>
            </view>
            <view class="req-list">
              <view v-for="item in requirements" :key="item.id" class="req-item">
                <view class="req-icon"><app-icon :name="item.icon" :size="16" color="#c41e3a" /></view>
                <view class="req-info">
                  <text class="req-label">{{ item.label }}</text>
                  <text class="req-desc">{{ item.desc }}</text>
                </view>
                <app-icon name="check-circle" :size="20" color="#22c55e" />
              </view>
            </view>
          </view>

          <view class="card">
            <view class="card-title-row">
              <app-icon name="file-text" :size="16" color="#c41e3a" />
              <text class="card-title">任务要求承诺</text>
            </view>
            <text class="card-sub">加入研究院后，需完成以下任务方可退还保证金：</text>
            <view class="task-list">
              <view v-for="(task, i) in tasks" :key="i" class="task-item">
                <view class="task-icon"><app-icon :name="task.icon" :size="16" color="#3b82f6" /></view>
                <text class="task-label">{{ task.label }}</text>
                <view class="period-badge"><text class="period-text">{{ task.period }}</text></view>
              </view>
            </view>
            <view class="agree-list">
              <view class="agree-item" @tap="toggleAgree('tasks')">
                <view class="checkbox" :class="{ 'checkbox-checked': agreements.tasks }">
                  <app-icon v-if="agreements.tasks" name="check" :size="12" color="#fff" />
                </view>
                <text class="agree-text">我承诺按时完成研究院规定的任务要求，积极参与分享交流</text>
              </view>
              <view class="agree-item" @tap="toggleAgree('refund')">
                <view class="checkbox" :class="{ 'checkbox-checked': agreements.refund }">
                  <app-icon v-if="agreements.refund" name="check" :size="12" color="#fff" />
                </view>
                <text class="agree-text">我理解：完成任务可全额退还保证金；仅学习不分享则保证金不予退还</text>
              </view>
              <view class="agree-item" @tap="toggleAgree('rules')">
                <view class="checkbox" :class="{ 'checkbox-checked': agreements.rules }">
                  <app-icon v-if="agreements.rules" name="check" :size="12" color="#fff" />
                </view>
                <text class="agree-text">我已阅读并同意《研究院管理规则》和《保证金退还规则》</text>
              </view>
            </view>
          </view>

          <view class="info-box">
            <app-icon name="info" :size="16" color="#f59e0b" />
            <text class="info-text">研究院鼓励成员相互交流分享，本身不收取费用。保证金是为了确保成员积极参与，完成任务要求后可全额退还。</text>
          </view>

          <view class="primary-btn" :class="{ 'btn-disabled': !canNext1 }" @tap="canNext1 && (step = 2)">
            <text class="primary-btn-text">下一步：填写申请资料</text>
          </view>
        </block>

        <!-- Step 2: 填写资料 -->
        <block v-if="step === 2">
          <view class="card">
            <view class="card-title-row">
              <app-icon name="crown" :size="16" color="#c41e3a" />
              <text class="card-title">选择关联圈子</text>
            </view>
            <view class="circle-list">
              <view
                v-for="c in userCircles"
                :key="c.id"
                class="circle-item"
                :class="{ 'circle-active': selectedCircle === c.id }"
                @tap="selectedCircle = c.id"
              >
                <view class="circle-cover"><app-icon name="users" :size="20" color="#9ca3af" /></view>
                <view class="circle-info">
                  <text class="circle-name">{{ c.name }}</text>
                  <text class="circle-meta">{{ c.members }}名成员 · 运营{{ c.days }}天</text>
                </view>
                <app-icon v-if="selectedCircle === c.id" name="check-circle" :size="20" color="#c41e3a" />
              </view>
            </view>
          </view>

          <view class="card">
            <view class="card-title-row">
              <app-icon name="file-text" :size="16" color="#c41e3a" />
              <text class="card-title">个人信息</text>
            </view>
            <view class="field"><text class="field-label">真实姓名 *</text><input class="field-input" v-model="form.realName" placeholder="请输入真实姓名" placeholder-class="ph" /></view>
            <view class="field"><text class="field-label">专业领域 *</text><input class="field-input" v-model="form.expertise" placeholder="如：八字命理、紫微斗数、风水堪舆" placeholder-class="ph" /></view>
            <view class="field"><text class="field-label">个人简介 *</text><textarea class="field-textarea" v-model="form.introduction" placeholder="请简要介绍您的从业经历和专业背景（100-500字）" placeholder-class="ph" /></view>
            <view class="field"><text class="field-label">申请理由</text><textarea class="field-textarea sm" v-model="form.reason" placeholder="您希望加入研究院的原因和期望（选填）" placeholder-class="ph" /></view>
          </view>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 1"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" :class="{ 'btn-disabled': !canNext2 }" @tap="canNext2 && (step = 3)">
              <text class="primary-btn-text">下一步：支付保证金</text>
            </view>
          </view>
        </block>

        <!-- Step 3: 支付保证金 -->
        <block v-if="step === 3">
          <view class="deposit-card">
            <app-icon name="graduation-cap" :size="48" color="#c41e3a" />
            <text class="deposit-title">研究院保证金</text>
            <text class="deposit-amount">¥10,000</text>
            <text class="deposit-sub">完成任务要求后可全额退还</text>
          </view>

          <view class="card">
            <text class="card-title plain">保证金说明</text>
            <view class="desc-list">
              <text class="desc-line">1. 保证金为您加入研究院的诚意金，用于确保成员积极参与交流分享。</text>
              <text class="desc-line">2. 成功完成全部任务要求后，保证金将在年度周期结束后全额退还。</text>
              <text class="desc-line">3. 如仅参与学习而不进行分享，保证金将不予退还。</text>
              <text class="desc-line">4. 保证金有效期为1年，到期后需续费或完成任务申请退还。</text>
            </view>
          </view>

          <view class="card">
            <text class="card-title plain">申请信息确认</text>
            <view class="confirm-row"><text class="confirm-label">申请人</text><text class="confirm-value">{{ form.realName }}</text></view>
            <view class="confirm-row"><text class="confirm-label">专业领域</text><text class="confirm-value">{{ form.expertise }}</text></view>
            <view class="confirm-row"><text class="confirm-label">关联圈子</text><text class="confirm-value">{{ selectedCircleName }}</text></view>
          </view>

          <view class="btn-row">
            <view class="ghost-btn" @tap="step = 2"><text class="ghost-btn-text">上一步</text></view>
            <view class="primary-btn flex1" @tap="showPayDialog = true">
              <app-icon name="credit-card" :size="16" color="#fff" />
              <text class="primary-btn-text">支付保证金</text>
            </view>
          </view>
        </block>

        <!-- Step 4: 完成 -->
        <block v-if="step === 4">
          <view class="success-wrap">
            <view class="success-icon"><app-icon name="check-circle" :size="40" color="#22c55e" /></view>
            <text class="success-title">申请提交成功</text>
            <text class="success-sub">您的申请已提交，研究院管理层将在3个工作日内审核</text>
            <view class="card next-card">
              <text class="card-title plain">接下来...</text>
              <view class="desc-list">
                <text class="desc-line">1. 审核通过后，您将收到系统通知</text>
                <text class="desc-line">2. 正式成为研究院成员，可参与内部交流活动</text>
                <text class="desc-line">3. 请按时完成任务要求，以便退还保证金</text>
              </view>
            </view>
            <view class="btn-row">
              <view class="ghost-btn flex1" @tap="goInstitute"><text class="ghost-btn-text">返回研究院</text></view>
              <view class="primary-btn flex1" @tap="goInstitute"><text class="primary-btn-text">查看我的申请</text></view>
            </view>
          </view>
        </block>
      </view>
    </scroll-view>

    <!-- 支付确认弹窗 -->
    <view v-if="showPayDialog" class="dialog-mask" @tap="showPayDialog = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">确认支付</text>
        <text class="dialog-desc">您即将支付研究院保证金</text>
        <view class="dialog-amount-wrap">
          <text class="dialog-amount">¥10,000</text>
          <text class="dialog-amount-sub">完成任务可全额退还</text>
        </view>
        <view class="dialog-btns">
          <view class="ghost-btn flex1" @tap="showPayDialog = false"><text class="ghost-btn-text">取消</text></view>
          <view class="primary-btn flex1" :class="{ 'btn-disabled': paying }" @tap="handlePay">
            <text class="primary-btn-text">{{ paying ? '支付中...' : '确认支付' }}</text>
          </view>
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
  instituteApi,
  memberApplyRequirements as requirements,
  memberApplyTasks as tasks,
  memberApplyUserCircles as userCircles,
  memberApplySteps as steps,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44 - 64
} catch (e) {}

const step = ref(1)
const selectedCircle = ref('')
const form = ref({ realName: '', expertise: '', introduction: '', reason: '' })
const agreements = ref({ tasks: false, refund: false, rules: false })
const showPayDialog = ref(false)
const paying = ref(false)

const canNext1 = computed(() => agreements.value.tasks && agreements.value.refund && agreements.value.rules)
const canNext2 = computed(() => !!selectedCircle.value && !!form.value.realName && !!form.value.expertise && !!form.value.introduction)
const selectedCircleName = computed(() => userCircles.find(c => c.id === selectedCircle.value)?.name || '')

function toggleAgree(key: 'tasks' | 'refund' | 'rules') {
  agreements.value[key] = !agreements.value[key]
}
async function handlePay() {
  if (paying.value) return
  paying.value = true
  try {
    await instituteApi.applyMember({
      realName: form.value.realName,
      phone: '',
      specialties: [form.value.expertise],
      experience: form.value.introduction,
      introduction: form.value.reason || '',
      certificates: [],
      status: 'submitted',
    })
    showPayDialog.value = false
    step.value = 4
  } catch {
    uni.showToast({ title: '支付失败，请重试', icon: 'none' })
  } finally {
    paying.value = false
  }
}
function goInstitute() {
  navigateTo('/institute')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,0.95); border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.nav-spacer { width: 32px; }
.stepper { display: flex; align-items: flex-start; justify-content: space-between; padding: 10px 28px 14px; }
.step-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.step-dot { width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.step-done { background: #22c55e; }
.step-current { background: #c41e3a; }
.step-num { font-size: 12px; font-weight: 500; color: #9ca3af; }
.step-num-active { color: #fff; }
.step-label { font-size: 10px; color: #9ca3af; }
.step-label-active { color: #c41e3a; font-weight: 500; }

.scroll { width: 100%; }
.main { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #ededed; }
.card-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.card-title.plain { display: block; margin-bottom: 12px; }
.card-sub { display: block; font-size: 12px; color: #6b7280; margin-bottom: 12px; }

.req-list { display: flex; flex-direction: column; gap: 12px; }
.req-item { display: flex; align-items: center; gap: 12px; padding: 8px; background: #f9fafb; border-radius: 8px; }
.req-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.req-info { flex: 1; }
.req-label { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.req-desc { display: block; font-size: 10px; color: #9ca3af; margin-top: 1px; }

.task-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.task-item { display: flex; align-items: center; gap: 12px; padding: 8px; background: #f9fafb; border-radius: 8px; }
.task-icon { width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.task-label { flex: 1; font-size: 13px; color: #1a1a1a; }
.period-badge { padding: 2px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.period-text { font-size: 10px; color: #6b7280; }

.agree-list { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #ededed; padding-top: 14px; }
.agree-item { display: flex; align-items: flex-start; gap: 8px; }
.checkbox { width: 16px; height: 16px; border-radius: 4px; border: 1px solid #d1d5db; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
.checkbox-checked { background: #c41e3a; border-color: #c41e3a; }
.agree-text { flex: 1; font-size: 12px; color: #6b7280; line-height: 1.5; }

.info-box { display: flex; gap: 8px; padding: 12px; background: #fffbeb; border-radius: 12px; }
.info-text { flex: 1; font-size: 12px; color: #b45309; line-height: 1.5; }

.circle-list { display: flex; flex-direction: column; gap: 8px; }
.circle-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; border: 2px solid #ededed; }
.circle-active { border-color: #c41e3a; background: rgba(196,30,58,0.04); }
.circle-cover { width: 48px; height: 48px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.circle-info { flex: 1; }
.circle-name { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.circle-meta { display: block; font-size: 10px; color: #9ca3af; margin-top: 2px; }

.field { margin-bottom: 14px; }
.field-label { display: block; font-size: 12px; color: #6b7280; margin-bottom: 6px; }
.field-input { height: 40px; padding: 0 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; color: #1a1a1a; }
.field-textarea { width: 100%; min-height: 90px; padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; color: #1a1a1a; box-sizing: border-box; }
.field-textarea.sm { min-height: 70px; }
.ph { color: #9ca3af; }

.deposit-card { display: flex; flex-direction: column; align-items: center; padding: 24px; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(196,30,58,0.04)); border-radius: 12px; }
.deposit-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-top: 12px; }
.deposit-amount { font-size: 32px; font-weight: 700; color: #c41e3a; margin: 14px 0; }
.deposit-sub { font-size: 12px; color: #6b7280; }

.desc-list { display: flex; flex-direction: column; gap: 8px; }
.desc-line { font-size: 13px; color: #6b7280; line-height: 1.5; }
.confirm-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
.confirm-label { font-size: 13px; color: #9ca3af; }
.confirm-value { font-size: 13px; color: #1a1a1a; }

.success-wrap { display: flex; flex-direction: column; align-items: center; padding-top: 20px; }
.success-icon { width: 80px; height: 80px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.success-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.success-sub { font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 24px; line-height: 1.5; }
.next-card { width: 100%; text-align: left; margin-bottom: 16px; }

.primary-btn { display: flex; align-items: center; justify-content: center; gap: 6px; height: 44px; background: #c41e3a; border-radius: 8px; }
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
.dialog-amount { font-size: 28px; font-weight: 700; color: #c41e3a; }
.dialog-amount-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }
.dialog-btns { display: flex; gap: 8px; }
</style>
