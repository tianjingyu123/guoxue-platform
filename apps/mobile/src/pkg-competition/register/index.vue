<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">{{ step === 2 ? '报名成功' : '赛事报名' }}</text>
        <view class="nav-btn" />
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="info" :size="44" color="#d1d5db" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @click="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <!-- 步骤1：报名确认 -->
    <template v-else-if="comp && step === 1">
      <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
        <!-- 赛事摘要卡 -->
        <view class="summary-card">
          <view class="sum-head">
            <view class="sum-ico"><app-icon name="trophy" :size="24" color="#c41e3a" /></view>
            <view class="sum-info">
              <text class="sum-title">{{ comp.title }}</text>
              <text class="sum-sub">已有 {{ participants }} 人报名</text>
            </view>
          </view>
          <view class="sum-meta">
            <view class="sum-fee">
              <text class="fee-cap">报名费</text>
              <text class="fee-val">{{ comp.entryFee > 0 ? '¥' + yuan(comp.entryFee) : '免费报名' }}</text>
            </view>
            <text v-if="comp.entryFee > 0" class="fee-note">报名费在线支付即将开放，当前可免费报名参与</text>
          </view>
        </view>

        <!-- 报名须知 -->
        <view v-if="plainRules" class="card">
          <text class="card-title">报名须知</text>
          <text class="rules-text">{{ plainRules }}</text>
        </view>

        <!-- 实名提示 -->
        <view v-if="comp.requireIdentity" class="notice">
          <app-icon name="info" :size="16" color="#c2790a" />
          <text class="notice-txt">本赛事需实名认证，请确保已完成实名后再报名。</text>
        </view>

        <!-- 邀请码 -->
        <view v-if="comp.isInviteOnly" class="card">
          <text class="card-title">邀请码 <text class="req">*</text></text>
          <input v-model="inviteCode" class="field-input" placeholder="本赛事为定向邀请赛，请输入邀请码" placeholder-class="ph" />
        </view>

        <!-- 同意规则 -->
        <view class="agree" @click="agreeRules = !agreeRules">
          <view class="checkbox" :class="{ checked: agreeRules }"><app-icon v-if="agreeRules" name="check" :size="12" color="#fff" /></view>
          <text class="agree-txt">我已阅读并同意<text class="agree-link">《赛事规则》</text>，承诺遵守比赛纪律</text>
        </view>
        <view class="safe-bottom" />
      </scroll-view>

      <!-- 底部提交 -->
      <view class="foot-bar" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
        <view class="foot-fee">
          <text class="fee-cap">报名费</text>
          <text class="fee-val">{{ comp.entryFee > 0 ? '¥' + yuan(comp.entryFee) : '免费' }}</text>
        </view>
        <view class="foot-btn" :class="{ disabled: !canSubmit || submitting }" @click="onSubmit">
          <text class="foot-btn-txt">{{ submitting ? '提交中...' : '确认报名' }}</text>
        </view>
      </view>
    </template>

    <!-- 步骤2：报名成功 -->
    <view v-else-if="step === 2" class="success">
      <view class="succ-ico"><app-icon name="check-circle" :size="40" color="#16a34a" /></view>
      <text class="succ-title">报名成功</text>
      <text class="succ-sub">您已成功报名参赛</text>
      <view class="succ-card">
        <view class="succ-row"><text class="succ-label">参赛编号</text><text class="succ-val mono">{{ participantNo }}</text></view>
        <view class="succ-row"><text class="succ-label">报名时间</text><text class="succ-val">{{ registrationTime }}</text></view>
      </view>
      <view class="tip">
        <app-icon name="info" :size="16" color="#d97706" />
        <view class="tip-body">
          <text class="tip-title">温馨提示</text>
          <text class="tip-txt">请关注赛事详情页的赛程公告，届时准时参加线上答题。</text>
        </view>
      </view>
      <view class="succ-actions">
        <view class="succ-btn primary" @click="go('/competition/' + compId)"><text class="succ-btn-txt">查看赛事详情</text></view>
        <view class="succ-btn" @click="go('/competition/home')"><text class="succ-btn-txt outline">返回赛事中心</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { competitionApi, yuan, fmtDate, type Competition } from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44 - 70)

const compId = ref('')
const loading = ref(true)
const error = ref('')
const comp = ref<Competition | null>(null)

const step = ref<1 | 2>(1)
const submitting = ref(false)
const agreeRules = ref(false)
const inviteCode = ref('')
const participantNo = ref('')
const registrationTime = ref('')

const participants = computed(() => comp.value?._count?.registrations ?? 0)
// 报名须知：去除 markdown 符号的纯文本
const plainRules = computed(() => (comp.value?.rules || '').replace(/[#*`>]/g, '').replace(/\n{2,}/g, '\n').trim())
// 本地校验：必须勾选同意；若为邀请赛则邀请码必填
const canSubmit = computed(() => {
  if (!agreeRules.value) return false
  if (comp.value?.isInviteOnly && !inviteCode.value.trim()) return false
  return true
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const c = await competitionApi.detail(compId.value)
    if (!c) throw new Error('赛事不存在')
    comp.value = c
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (!comp.value || !canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const reg = await competitionApi.register(compId.value, {
      inviteCode: comp.value.isInviteOnly ? inviteCode.value.trim() : undefined,
    })
    participantNo.value = (reg?.id || '').slice(-8).toUpperCase()
    registrationTime.value = fmtDate(reg?.createdAt) || fmtDate(new Date().toISOString())
    step.value = 2
  } catch (e: any) {
    uni.showToast({ title: e?.message || '报名失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function go(p: string) { navigateTo(p) }
function goBack() { navigateBack() }

onLoad((q) => {
  compId.value = (q?.id as string) || ''
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-bar { background: var(--brand); position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { color: #fff; font-size: 16px; font-weight: 500; }
.scroll { width: 100%; }

.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.summary-card { margin: 16px; background: #fff; border-radius: 14px; padding: 16px; }
.sum-head { display: flex; align-items: center; gap: 12px; }
.sum-ico { width: 48px; height: 48px; border-radius: 12px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sum-info { flex: 1; }
.sum-title { display: block; font-size: 15px; font-weight: 700; color: #1a1a1a; line-height: 1.4; }
.sum-sub { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
.sum-meta { margin-top: 12px; padding-top: 12px; border-top: 1rpx solid #eee; }
.sum-fee { display: flex; align-items: baseline; gap: 8px; }
.fee-cap { font-size: 12px; color: #9ca3af; }
.fee-val { font-size: 18px; font-weight: 700; color: var(--brand); }
.fee-note { display: block; font-size: 12px; color: #9ca3af; margin-top: 6px; line-height: 1.5; }

.card { margin: 0 16px 16px; background: #fff; border-radius: 14px; padding: 16px; }
.card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.req { color: #ef4444; }
.rules-text { font-size: 14px; color: #4b5563; line-height: 1.8; white-space: pre-wrap; }
.field-input { height: 44px; background: #f5f5f5; border-radius: 10px; padding: 0 12px; font-size: 14px; color: #1a1a1a; }
.ph { color: #9ca3af; }

.notice { margin: 0 16px 16px; background: #fffbeb; border-radius: 12px; padding: 12px; display: flex; gap: 8px; align-items: flex-start; }
.notice-txt { flex: 1; font-size: 13px; color: #92704a; line-height: 1.6; }

.agree { display: flex; align-items: flex-start; gap: 8px; padding: 0 16px; }
.checkbox { width: 18px; height: 18px; border-radius: 4px; border: 2rpx solid #d1d5db; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
.checkbox.checked { background: var(--brand); border-color: var(--brand); }
.agree-txt { flex: 1; font-size: 13px; color: #6b7280; line-height: 1.5; }
.agree-link { color: var(--brand); }

.foot-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #eee; padding: 12px 16px; display: flex; align-items: center; gap: 12px; z-index: 50; }
.foot-fee { flex: 1; }
.foot-fee .fee-cap { display: block; }
.foot-fee .fee-val { display: block; }
.foot-btn { flex: 1; height: 46px; background: linear-gradient(135deg, var(--brand), #a01830); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.foot-btn.disabled { background: #d1d5db; }
.foot-btn-txt { color: #fff; font-size: 16px; font-weight: 600; }

.success { padding: 60px 24px; display: flex; flex-direction: column; align-items: center; }
.succ-ico { width: 80px; height: 80px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.succ-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.succ-sub { font-size: 14px; color: #9ca3af; margin-bottom: 24px; }
.succ-card { width: 100%; max-width: 340px; background: #fff; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.succ-row { display: flex; align-items: center; justify-content: space-between; }
.succ-label { font-size: 14px; color: #9ca3af; }
.succ-val { font-size: 14px; color: #1a1a1a; }
.succ-val.mono { font-family: monospace; font-weight: 700; color: var(--brand); letter-spacing: 1px; }
.tip { width: 100%; max-width: 340px; background: #fffbeb; border-radius: 12px; padding: 12px; display: flex; gap: 8px; margin-bottom: 24px; }
.tip-body { flex: 1; }
.tip-title { display: block; font-size: 13px; font-weight: 500; color: #92400e; margin-bottom: 2px; }
.tip-txt { font-size: 13px; color: #b45309; line-height: 1.5; }
.succ-actions { width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 12px; }
.succ-btn { height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.succ-btn.primary { background: linear-gradient(135deg, var(--brand), #a01830); }
.succ-btn:not(.primary) { border: 1rpx solid #e5e7eb; }
.succ-btn-txt { font-size: 16px; font-weight: 600; color: #fff; }
.succ-btn-txt.outline { color: #1a1a1a; }
.safe-bottom { height: 24px; }
</style>
