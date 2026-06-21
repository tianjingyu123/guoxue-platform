<script setup lang="ts">
/**
 * 申请退出圈子（从原型 app/circles/[id]/exit/page.tsx 高保真迁移）
 * 圈子信息 + 退出规则 + 退款金额预览(自动计算) + 申请原因 + 二次确认弹窗 + 提交成功态。
 * 退款计算复用 lib/circle-exit。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, toastComingSoon } from '@/utils/router'
import { calcRefund, mockMembership } from '@/lib/circle-exit'

const reason = ref('')
const showConfirm = ref(false)
const submitted = ref(false)

const membership = mockMembership
const today = new Date().toISOString().slice(0, 10)
const breakdown = computed(() => calcRefund({
  paidAmount: membership.paidAmount,
  joinDate: membership.joinDate,
  applyDate: today,
  totalDays: membership.totalDays,
}))

function handleSubmit() {
  showConfirm.value = false
  submitted.value = true
}
function backToCircle() {
  goBack()
}
</script>

<template>
  <!-- 提交成功页 -->
  <view
    v-if="submitted"
    class="ex-success"
  >
    <view class="ex-success-icon">
      <app-icon
        name="check-circle"
        :size="44"
        color="#3D7A5C"
      />
    </view>
    <text class="ex-success-title">
      退出申请已提交
    </text>
    <text class="ex-success-desc">
      你的申请将经过圈主审核与平台审核，双向通过后退款将原路退回。可在「我的申请」中查看进度。
    </text>
    <view class="ex-success-actions">
      <view
        class="ex-btn-primary"
        @tap="toastComingSoon"
      >
        <text class="ex-btn-primary-t">
          查看申请进度
        </text>
      </view>
      <view
        class="ex-btn-secondary"
        @tap="backToCircle"
      >
        <text class="ex-btn-secondary-t">
          返回圈子
        </text>
      </view>
    </view>
  </view>

  <!-- 申请表单页 -->
  <view
    v-else
    class="ex-page"
  >
    <view class="ex-nav">
      <view
        class="ex-nav-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="34"
          color="#2C2C2C"
        />
      </view>
      <text class="ex-nav-title">
        申请退出圈子
      </text>
    </view>

    <view class="ex-body">
      <!-- 圈子信息 -->
      <view class="ex-circle">
        <view class="ex-circle-avatar" />
        <view class="ex-circle-info">
          <text class="ex-circle-name">
            {{ membership.circleName }}
          </text>
          <text class="ex-circle-sub">
            加入于 {{ membership.joinDate }} · 已加入 {{ breakdown.usedDays }} 天
          </text>
        </view>
      </view>

      <!-- 退出规则 -->
      <view class="ex-rules">
        <view class="ex-rules-head">
          <app-icon
            name="info"
            :size="26"
            color="#C9A96E"
          /><text class="ex-rules-title">
            退出与退款规则
          </text>
        </view>
        <view class="ex-rules-list">
          <text class="ex-rule">
            · 按实际使用天数扣费，剩余部分原路退还
          </text>
          <text class="ex-rule">
            · 每天费用 = 已付费用 ÷ 总服务天数（年费按 365 天）
          </text>
          <text class="ex-rule">
            · 应退金额 = 已付费用 − 每天费用 × 已使用天数
          </text>
          <text class="ex-rule">
            · 退出需经「圈主审核 + 平台审核」双向通过
          </text>
          <text class="ex-rule">
            · 已购课程、电子书等不受退出影响，可继续使用
          </text>
        </view>
      </view>

      <!-- 退款金额预览 -->
      <view class="ex-refund">
        <view class="ex-refund-head">
          <app-icon
            name="coins"
            :size="26"
            color="#C41E3A"
          />
          <text class="ex-refund-title">
            退款金额预览
          </text>
          <text class="ex-refund-auto">
            系统自动计算
          </text>
        </view>
        <view class="ex-refund-body">
          <view class="ex-row">
            <text class="ex-row-label">
              已付费用
            </text><text class="ex-row-value">
              ¥{{ breakdown.paidAmount }}
            </text>
          </view>
          <view class="ex-row">
            <view class="ex-row-label-icon">
              <app-icon
                name="calendar"
                :size="24"
                color="#999999"
              /><text class="ex-row-label">
                已使用天数
              </text>
            </view><text class="ex-row-value">
              {{ breakdown.usedDays }} 天
            </text>
          </view>
          <view class="ex-row">
            <text class="ex-row-label">
              每天费用
            </text><text class="ex-row-value">
              ¥{{ breakdown.dailyRate }} / 天
            </text>
          </view>
          <view class="ex-row">
            <text class="ex-row-label">
              已扣除费用
            </text><text class="ex-row-value is-muted">
              − ¥{{ breakdown.deduction }}
            </text>
          </view>
          <view class="ex-refund-total">
            <text class="ex-refund-total-label">
              应退金额
            </text>
            <text class="ex-refund-total-value">
              ¥{{ breakdown.refundAmount }}
            </text>
          </view>
        </view>
      </view>

      <!-- 申请原因 -->
      <view class="ex-reason">
        <text class="ex-reason-label">
          申请原因 <text class="ex-reason-optional">
            （选填）
          </text>
        </text>
        <textarea
          v-model="reason"
          class="ex-textarea"
          placeholder="填写退出原因，有助于圈主更快审核（选填）"
          placeholder-class="ex-ph"
          maxlength="200"
        />
        <text class="ex-reason-count">
          {{ reason.length }}/200
        </text>
      </view>

      <view class="ex-flow-tip">
        <app-icon
          name="shield-check"
          :size="26"
          color="#3D7A5C"
        />
        <text class="ex-flow-tip-t">
          提交后进入「圈主审核 → 平台审核」流程，全程可追溯
        </text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="ex-footer">
      <view
        class="ex-submit"
        @tap="showConfirm = true"
      >
        <text class="ex-submit-t">
          提交退出申请
        </text>
      </view>
    </view>

    <!-- 二次确认弹窗 -->
    <view
      v-if="showConfirm"
      class="ex-mask"
      @tap="showConfirm = false"
    >
      <view
        class="ex-dialog"
        @tap.stop
      >
        <view class="ex-dialog-body">
          <view class="ex-dialog-icon">
            <app-icon
              name="alert-triangle"
              :size="32"
              color="#C41E3A"
            />
          </view>
          <text class="ex-dialog-title">
            确认申请退出？
          </text>
          <text class="ex-dialog-desc">
            退出后你将失去该圈子的成员身份，预计退款 <text class="ex-dialog-amount">
              ¥{{ breakdown.refundAmount }}
            </text>。已购课程、电子书不受影响。
          </text>
        </view>
        <view class="ex-dialog-actions">
          <view
            class="ex-dialog-cancel"
            @tap="showConfirm = false"
          >
            <text class="ex-dialog-cancel-t">
              再想想
            </text>
          </view>
          <view
            class="ex-dialog-confirm"
            @tap="handleSubmit"
          >
            <text class="ex-dialog-confirm-t">
              确认提交
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ex-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 160rpx; }
.ex-nav { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 16rpx; height: 96rpx; padding: 0 24rpx; background: rgba(245,241,232,0.95); border-bottom: 1rpx solid #E8E0D0; }
.ex-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ex-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ex-body { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.ex-circle { display: flex; align-items: center; gap: 16rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 24rpx; padding: 24rpx; }
.ex-circle-avatar { width: 88rpx; height: 88rpx; border-radius: 20rpx; background: linear-gradient(135deg, rgba(196,30,58,0.3), rgba(201,169,110,0.2)); flex-shrink: 0; }
.ex-circle-info { min-width: 0; }
.ex-circle-name { display: block; font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.ex-circle-sub { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; }
.ex-rules { background: rgba(201,169,110,0.1); border: 1rpx solid rgba(201,169,110,0.2); border-radius: 24rpx; padding: 24rpx; }
.ex-rules-head { display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; }
.ex-rules-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ex-rules-list { display: flex; flex-direction: column; gap: 10rpx; }
.ex-rule { font-size: 22rpx; color: #999; line-height: 1.6; }
.ex-refund { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 24rpx; overflow: hidden; }
.ex-refund-head { display: flex; align-items: center; gap: 10rpx; padding: 22rpx 24rpx; border-bottom: 1rpx solid #E8E0D0; }
.ex-refund-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ex-refund-auto { margin-left: auto; font-size: 20rpx; color: #999; }
.ex-refund-body { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.ex-row { display: flex; align-items: center; justify-content: space-between; }
.ex-row-label-icon { display: flex; align-items: center; gap: 8rpx; }
.ex-row-label { font-size: 28rpx; color: #999; }
.ex-row-value { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ex-row-value.is-muted { color: #999; }
.ex-refund-total { display: flex; align-items: center; justify-content: space-between; padding-top: 20rpx; border-top: 1rpx dashed #E8E0D0; }
.ex-refund-total-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ex-refund-total-value { font-size: 48rpx; font-weight: 700; color: #C41E3A; }
.ex-reason { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 24rpx; padding: 24rpx; }
.ex-reason-label { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 14rpx; }
.ex-reason-optional { font-size: 22rpx; color: #999; font-weight: 400; }
.ex-textarea { width: 100%; box-sizing: border-box; height: 160rpx; padding: 20rpx; border: 1rpx solid #E8E0D0; border-radius: 16rpx; background: rgba(245,241,232,0.5); font-size: 28rpx; color: #2C2C2C; }
.ex-ph { color: #b5aea3; }
.ex-reason-count { display: block; text-align: right; font-size: 20rpx; color: #999; margin-top: 8rpx; }
.ex-flow-tip { display: flex; align-items: center; gap: 10rpx; padding: 0 8rpx; }
.ex-flow-tip-t { font-size: 22rpx; color: #999; }
.ex-footer { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(245,241,232,0.95); border-top: 1rpx solid #E8E0D0; padding: 24rpx; }
.ex-submit { height: 92rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.25); }
.ex-submit-t { font-size: 30rpx; font-weight: 600; color: #fff; }
/* 弹窗 */
.ex-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 0 64rpx; }
.ex-dialog { width: 100%; max-width: 560rpx; background: #fff; border-radius: 24rpx; overflow: hidden; }
.ex-dialog-body { padding: 40rpx; text-align: center; }
.ex-dialog-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; background: rgba(196,30,58,0.1); margin: 0 auto 20rpx; display: flex; align-items: center; justify-content: center; }
.ex-dialog-title { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.ex-dialog-desc { display: block; font-size: 24rpx; color: #999; margin-top: 14rpx; line-height: 1.6; }
.ex-dialog-amount { color: #C41E3A; font-weight: 500; }
.ex-dialog-actions { display: flex; border-top: 1rpx solid #E8E0D0; }
.ex-dialog-cancel { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.ex-dialog-cancel-t { font-size: 28rpx; color: #999; }
.ex-dialog-confirm { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; background: #C41E3A; border-left: 1rpx solid #E8E0D0; }
.ex-dialog-confirm-t { font-size: 28rpx; font-weight: 500; color: #fff; }
/* 成功页 */
.ex-success { min-height: 100vh; background: #F5F1E8; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 64rpx; text-align: center; }
.ex-success-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: rgba(61,122,92,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.ex-success-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }
.ex-success-desc { font-size: 28rpx; color: #999; margin-top: 16rpx; line-height: 1.7; }
.ex-success-actions { display: flex; flex-direction: column; gap: 16rpx; width: 100%; max-width: 480rpx; margin-top: 64rpx; }
.ex-btn-primary { height: 88rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.ex-btn-primary-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.ex-btn-secondary { height: 88rpx; border-radius: 999rpx; background: #ECE6D8; display: flex; align-items: center; justify-content: center; }
.ex-btn-secondary-t { font-size: 28rpx; color: #2C2C2C; }
</style>
