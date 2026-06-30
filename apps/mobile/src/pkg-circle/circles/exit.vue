<script setup lang="ts">
/**
 * 退出圈子（规则 V2.0，docs/circle-refund-rules-v2.md）
 * 引导说明页(强调虚拟产品不退款，引导继续使用) → 申诉退款申请页(真实金额预览+提交) → 成功页。
 * 真连 circle-refund 后端 preview/apply。退款到平台钱包余额，经圈主+平台双审核。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { refundApi, type RefundPreview } from '@/lib/circle-refund-data'

const circleId = ref('')
const step = ref<'guide' | 'apply'>('guide')
const submitted = ref(false)
const loading = ref(false)
const error = ref('')
const preview = ref<RefundPreview | null>(null)
const reason = ref('')
const submitting = ref(false)

async function goApply() {
  step.value = 'apply'
  loading.value = true
  error.value = ''
  preview.value = null
  try {
    preview.value = await refundApi.preview(circleId.value)
  } catch (e: any) {
    error.value = e?.message || e?.data?.message || '当前无法申请退款'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (submitting.value || !preview.value) return
  submitting.value = true
  try {
    await refundApi.apply(circleId.value, reason.value.trim() || undefined)
    submitted.value = true
  } catch (e: any) {
    uni.showToast({ title: e?.message || e?.data?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((opt) => { circleId.value = (opt?.id || opt?.circleId || '') as string })
</script>

<template>
  <!-- 提交成功页 -->
  <view v-if="submitted" class="ex-success">
    <view class="ex-success-icon"><app-icon name="check-circle" :size="44" color="#3D7A5C" /></view>
    <text class="ex-success-title">退款申请已提交</text>
    <text class="ex-success-desc">将经过「圈主审核 → 平台审核」双向通过后，退款到账你的平台钱包余额（可提现）。可在「我的退款」中查看进度。</text>
    <view class="ex-success-actions">
      <view class="ex-btn-primary" @tap="navigateTo('/pkg-circle/circles/my-refunds')"><text class="ex-btn-primary-t">查看我的退款</text></view>
      <view class="ex-btn-secondary" @tap="goBack"><text class="ex-btn-secondary-t">返回</text></view>
    </view>
  </view>

  <view v-else class="ex-page">
    <view class="ex-nav">
      <view class="ex-nav-btn" @tap="step === 'apply' ? (step = 'guide') : goBack()"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="ex-nav-title">{{ step === 'guide' ? '退出圈子' : '申诉退款申请' }}</text>
    </view>

    <!-- ════ 引导说明页 ════ -->
    <view v-if="step === 'guide'" class="ex-body">
      <view class="ex-rules">
        <view class="ex-rules-head"><app-icon name="info" :size="26" color="#C9A96E" /><text class="ex-rules-title">退出圈子须知</text></view>
        <text class="ex-guide-p">本圈子为虚拟数字产品，根据平台规则，虚拟产品一经使用，不支持无理由退款。</text>
        <text class="ex-guide-sub">你在圈子内已获得的以下权益将受到影响：</text>
        <view class="ex-rules-list">
          <text class="ex-rule">· 圈子成员身份将被取消</text>
          <text class="ex-rule">· 已发布的帖子和评论将保留</text>
          <text class="ex-rule">· 已购买的课程不受影响</text>
        </view>
      </view>

      <view class="ex-rules">
        <view class="ex-rules-head"><app-icon name="coins" :size="26" color="#C41E3A" /><text class="ex-rules-title">如确需退出，申诉退款规则</text></view>
        <view class="ex-rules-list">
          <text class="ex-rule">· 按实际使用天数扣除费用，剩余部分退还</text>
          <text class="ex-rule">· 收取 20% 手续费</text>
          <text class="ex-rule">· 退款金额将在圈主与平台双向审核通过后退还至钱包余额</text>
        </view>
      </view>
    </view>

    <!-- ════ 申诉退款申请页 ════ -->
    <view v-else class="ex-body">
      <!-- 加载 -->
      <view v-if="loading" class="ex-state"><text class="ex-state-t">计算退款金额…</text></view>
      <!-- 不可退/错误 -->
      <view v-else-if="error" class="ex-state">
        <app-icon name="info" :size="48" color="#C9A96E" />
        <text class="ex-state-t">{{ error }}</text>
        <view class="ex-state-btn" @tap="step = 'guide'"><text class="ex-state-btn-t">返回</text></view>
      </view>
      <!-- 金额预览 + 申请 -->
      <template v-else-if="preview">
        <view class="ex-refund">
          <view class="ex-refund-head">
            <app-icon name="coins" :size="26" color="#C41E3A" />
            <text class="ex-refund-title">退款金额预览</text>
            <text class="ex-refund-auto">系统自动计算</text>
          </view>
          <view class="ex-refund-body">
            <view class="ex-row"><text class="ex-row-label">已付费用</text><text class="ex-row-value">¥{{ preview.paidAmount }}</text></view>
            <view class="ex-row"><text class="ex-row-label">已使用天数</text><text class="ex-row-value">{{ preview.usedDays }} 天</text></view>
            <view class="ex-row"><text class="ex-row-label">每日费用</text><text class="ex-row-value">¥{{ preview.dailyCost }} / 天</text></view>
            <view class="ex-row"><text class="ex-row-label">应退金额</text><text class="ex-row-value">¥{{ preview.refundBase }}</text></view>
            <view class="ex-row"><text class="ex-row-label">手续费（{{ Math.round(preview.feeRate * 100) }}%）</text><text class="ex-row-value is-muted">− ¥{{ preview.feeAmount }}</text></view>
            <view class="ex-refund-total">
              <text class="ex-refund-total-label">实际到账</text>
              <text class="ex-refund-total-value">¥{{ preview.actualRefund }}</text>
            </view>
          </view>
        </view>

        <view class="ex-reason">
          <text class="ex-reason-label">申请原因 <text class="ex-reason-optional">（选填）</text></text>
          <textarea v-model="reason" class="ex-textarea" placeholder="填写退出原因，有助于审核（选填）" placeholder-class="ex-ph" maxlength="200" />
          <text class="ex-reason-count">{{ reason.length }}/200</text>
        </view>

        <view class="ex-flow-tip">
          <app-icon name="shield-check" :size="26" color="#3D7A5C" />
          <text class="ex-flow-tip-t">提交后进入「圈主审核 → 平台审核」流程，通过后退至钱包余额，1-3 个工作日</text>
        </view>
      </template>
    </view>

    <!-- 底部按钮 -->
    <view class="ex-footer">
      <template v-if="step === 'guide'">
        <view class="ex-submit" @tap="goBack"><text class="ex-submit-t">我已知晓，继续使用</text></view>
        <view class="ex-quit-link" @tap="goApply"><text class="ex-quit-link-t">仍要退出？申请申诉退款</text></view>
      </template>
      <template v-else>
        <view v-if="preview" class="ex-submit" :class="{ disabled: submitting }" @tap="submit"><text class="ex-submit-t">{{ submitting ? '提交中…' : '确认申请退款' }}</text></view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ex-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 220rpx; }
.ex-nav { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 16rpx; height: 96rpx; padding: 0 24rpx; background: rgba(245,241,232,0.95); border-bottom: 1rpx solid #E8E0D0; }
.ex-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ex-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ex-body { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.ex-rules { background: rgba(201,169,110,0.1); border: 1rpx solid rgba(201,169,110,0.2); border-radius: 24rpx; padding: 24rpx; }
.ex-rules-head { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.ex-rules-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.ex-guide-p { display: block; font-size: 26rpx; color: #5a5347; line-height: 1.7; margin-bottom: 16rpx; }
.ex-guide-sub { display: block; font-size: 24rpx; color: #999; margin-bottom: 10rpx; }
.ex-rules-list { display: flex; flex-direction: column; gap: 10rpx; }
.ex-rule { font-size: 24rpx; color: #888; line-height: 1.6; }
/* 三态 */
.ex-state { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 140rpx 0; }
.ex-state-t { font-size: 28rpx; color: #999; text-align: center; padding: 0 48rpx; line-height: 1.6; }
.ex-state-btn { padding: 16rpx 56rpx; border-radius: 999rpx; background: #ECE6D8; }
.ex-state-btn-t { font-size: 26rpx; color: #2C2C2C; }
/* 退款预览 */
.ex-refund { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 24rpx; overflow: hidden; }
.ex-refund-head { display: flex; align-items: center; gap: 10rpx; padding: 22rpx 24rpx; border-bottom: 1rpx solid #E8E0D0; }
.ex-refund-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ex-refund-auto { margin-left: auto; font-size: 20rpx; color: #999; }
.ex-refund-body { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.ex-row { display: flex; align-items: center; justify-content: space-between; }
.ex-row-label { font-size: 28rpx; color: #999; }
.ex-row-value { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ex-row-value.is-muted { color: #999; }
.ex-refund-total { display: flex; align-items: center; justify-content: space-between; padding-top: 20rpx; border-top: 1rpx dashed #E8E0D0; }
.ex-refund-total-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ex-refund-total-value { font-size: 48rpx; font-weight: 700; color: var(--brand); }
.ex-reason { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 24rpx; padding: 24rpx; }
.ex-reason-label { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 14rpx; }
.ex-reason-optional { font-size: 22rpx; color: #999; font-weight: 400; }
.ex-textarea { width: 100%; box-sizing: border-box; height: 160rpx; padding: 20rpx; border: 1rpx solid #E8E0D0; border-radius: 16rpx; background: rgba(245,241,232,0.5); font-size: 28rpx; color: #2C2C2C; }
.ex-ph { color: #b5aea3; }
.ex-reason-count { display: block; text-align: right; font-size: 20rpx; color: #999; margin-top: 8rpx; }
.ex-flow-tip { display: flex; align-items: flex-start; gap: 10rpx; padding: 0 8rpx; }
.ex-flow-tip-t { font-size: 22rpx; color: #999; line-height: 1.5; }
/* 底部 */
.ex-footer { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(245,241,232,0.95); border-top: 1rpx solid #E8E0D0; padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.ex-submit { height: 92rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.25); }
.ex-submit.disabled { opacity: 0.6; }
.ex-submit-t { font-size: 30rpx; font-weight: 600; color: #fff; }
.ex-quit-link { display: flex; align-items: center; justify-content: center; padding: 8rpx 0; }
.ex-quit-link-t { font-size: 24rpx; color: #b0a99c; }
/* 成功页 */
.ex-success { min-height: 100vh; background: #F5F1E8; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 64rpx; text-align: center; }
.ex-success-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: rgba(61,122,92,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.ex-success-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }
.ex-success-desc { font-size: 28rpx; color: #999; margin-top: 16rpx; line-height: 1.7; }
.ex-success-actions { display: flex; flex-direction: column; gap: 16rpx; width: 100%; max-width: 480rpx; margin-top: 64rpx; }
.ex-btn-primary { height: 88rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.ex-btn-primary-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.ex-btn-secondary { height: 88rpx; border-radius: 999rpx; background: #ECE6D8; display: flex; align-items: center; justify-content: center; }
.ex-btn-secondary-t { font-size: 28rpx; color: #2C2C2C; }
</style>
