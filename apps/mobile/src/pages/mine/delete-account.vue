<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="onBack">←</text>
        <text class="header-title">账号注销</text>
        <view class="header-right" />
      </view>

      <!-- 步骤指示器 -->
      <view class="step-indicator">
        <view v-for="(s, idx) in stepList" :key="s.num" class="step-wrap">
          <view class="step-dot" :class="{ active: step >= s.num, done: step > s.num }">
            <text v-if="step > s.num">✓</text>
            <text v-else>{{ s.num }}</text>
          </view>
          <view v-if="idx < stepList.length - 1" class="step-line" :class="{ done: step > s.num }" />
        </view>
      </view>
    </view>

    <view class="content">
      <!-- 步骤1：须知 -->
      <view v-if="step === 1" class="step1-content">
        <view class="warn-card">
          <view class="warn-icon-wrap">
            <text class="warn-icon">⚠</text>
          </view>
          <view>
            <text class="warn-title">注销账号前请仔细阅读</text>
            <text class="warn-desc">账号注销后，以下数据将被永久删除且无法恢复</text>
          </view>
        </view>

        <!-- 将被删除的数据 -->
        <view class="section-card">
          <text class="section-title">将被删除的数据</text>
          <view v-for="item in dataToDelete" :key="item.label" class="data-item">
            <view class="data-item-icon-wrap">
              <text class="data-item-icon">{{ item.icon }}</text>
            </view>
            <text class="data-item-label">{{ item.label }}</text>
            <text class="data-item-x">✕</text>
          </view>
        </view>

        <!-- 当前资产 -->
        <view class="section-card">
          <text class="section-title">您当前的资产</text>
          <view class="asset-grid">
            <view class="asset-item bg-orange">
              <text class="asset-label">钱包余额</text>
              <text class="asset-value orange">¥{{ userData.balance }}</text>
            </view>
            <view class="asset-item bg-purple">
              <text class="asset-label">积分</text>
              <text class="asset-value purple">{{ userData.points }}</text>
            </view>
            <view class="asset-item bg-green">
              <text class="asset-label">优惠券</text>
              <text class="asset-value green">{{ userData.coupons }}张</text>
            </view>
            <view class="asset-item bg-blue">
              <text class="asset-label">会员剩余</text>
              <text class="asset-value blue">{{ userData.memberDays }}天</text>
            </view>
          </view>
          <text v-if="userData.balance > 0" class="asset-warn">
            * 您的钱包余额尚有 ¥{{ userData.balance }}，建议先提现后再注销
          </text>
        </view>

        <!-- 冷静期 -->
        <view class="cooldown-card">
          <text class="cooldown-title">🧊 7天冷静期</text>
          <text class="cooldown-desc">提交注销申请后，账号将进入7天冷静期。期间登录即可撤销注销。</text>
        </view>

        <!-- 同意确认 -->
        <view class="agree-row" @click="agreed = !agreed">
          <view class="agree-check" :class="{ checked: agreed }">
            <text v-if="agreed" class="agree-check-mark">✓</text>
          </view>
          <text class="agree-text">
            我已阅读并理解上述内容，确认要注销账号，并同意
            <text class="agree-link">《账号注销协议》</text>
          </text>
        </view>
      </view>

      <!-- 步骤2：选择原因 -->
      <view v-if="step === 2" class="step2-content">
        <view class="section-card">
          <text class="section-title">请告诉我们您注销的原因</text>
          <text class="section-subtitle">您的反馈将帮助我们改进服务</text>

          <view
            v-for="reason in deleteReasons"
            :key="reason.id"
            class="reason-item"
            :class="{ selected: selectedReason === reason.id }"
            @click="selectedReason = reason.id"
          >
            <view class="reason-radio" :class="{ checked: selectedReason === reason.id }">
              <view v-if="selectedReason === reason.id" class="reason-radio-dot" />
            </view>
            <text class="reason-label">{{ reason.label }}</text>
          </view>
        </view>

        <view v-if="selectedReason === 'other'" class="section-card">
          <text class="section-title">其他原因（选填）</text>
          <textarea
            v-model="otherReason"
            class="reason-textarea"
            placeholder="请输入您的原因..."
            maxlength="200"
          />
          <text class="reason-count">{{ otherReason.length }}/200</text>
        </view>
      </view>

      <!-- 步骤3：验证身份 -->
      <view v-if="step === 3" class="step3-content">
        <view class="section-card">
          <text class="section-title">验证身份</text>

          <view class="method-tabs">
            <view
              class="method-tab"
              :class="{ active: verifyMethod === 'password' }"
              @click="verifyMethod = 'password'"
            >密码验证</view>
            <view
              class="method-tab"
              :class="{ active: verifyMethod === 'code' }"
              @click="verifyMethod = 'code'"
            >短信验证</view>
          </view>

          <!-- 密码验证 -->
          <view v-if="verifyMethod === 'password'" class="verify-group">
            <text class="verify-label">请输入登录密码</text>
            <view class="pwd-input-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="输入当前登录密码"
              />
              <text class="pwd-toggle" @click="showPassword = !showPassword">
                {{ showPassword ? '🙈' : '👁' }}
              </text>
            </view>
          </view>

          <!-- 短信验证 -->
          <view v-if="verifyMethod === 'code'" class="verify-group">
            <text class="verify-label">验证码将发送至 {{ phone }}</text>
            <view class="code-row">
              <input
                v-model="code"
                type="text"
                maxlength="6"
                class="form-input code-input"
                placeholder="输入6位验证码"
                @input="onCodeInput"
              />
              <view
                class="btn-send"
                :class="{ disabled: countdown > 0 }"
                @click="sendCode"
              >
                {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
              </view>
            </view>
          </view>
        </view>

        <view class="verify-hint">
          <text class="verify-hint-text">验证通过后，将进入最终确认步骤</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view
        class="btn-next"
        :class="{ disabled: !canNext }"
        @click="handleNextStep"
      >
        {{ step === 3 ? '确认注销' : '下一步' }}
      </view>
    </view>

    <!-- 最终确认弹窗 -->
    <view v-if="showConfirmDialog" class="dialog-overlay" @click="closeConfirmDialog">
      <view class="dialog-content" @click.stop>
        <view class="dialog-icon-wrap">
          <text class="dialog-icon">🗑</text>
        </view>
        <text class="dialog-title">最终确认</text>
        <text class="dialog-desc">
          请输入 <text class="dialog-desc-highlight">"确认注销"</text> 以继续
        </text>
        <input
          v-model="confirmText"
          class="dialog-input"
          placeholder='请输入"确认注销"'
          @input="onConfirmInput"
        />
        <text v-if="confirmText && confirmText !== '确认注销'" class="dialog-error">请输入正确的确认文字</text>

        <view class="dialog-actions">
          <view class="dialog-btn dialog-btn-cancel" @click="closeConfirmDialog">取消</view>
          <view class="dialog-btn dialog-btn-confirm" :class="{ disabled: confirmText !== '确认注销' || deleting }" @click="handleDelete">
            {{ deleting ? '处理中...' : '确认注销' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(1)
const selectedReason = ref('')
const otherReason = ref('')
const verifyMethod = ref<'password' | 'code'>('password')
const password = ref('')
const showPassword = ref(false)
const phone = ref('138****8888')
const code = ref('')
const countdown = ref(0)
const confirmText = ref('')
const showConfirmDialog = ref(false)
const deleting = ref(false)
const agreed = ref(false)

let countdownTimer: ReturnType<typeof setInterval> | null = null

const stepList = [
  { num: 1, label: '阅读须知' },
  { num: 2, label: '选择原因' },
  { num: 3, label: '验证身份' },
]

const userData = {
  balance: 128.5,
  points: 2680,
  coupons: 5,
  memberDays: 180,
}

const deleteReasons = [
  { id: 'not_useful', label: '不再使用该服务' },
  { id: 'privacy', label: '隐私安全考虑' },
  { id: 'found_better', label: '找到了更好的替代品' },
  { id: 'too_many_notifications', label: '通知太多' },
  { id: 'poor_experience', label: '使用体验不好' },
  { id: 'other', label: '其他原因' },
]

const dataToDelete = [
  { icon: '💬', label: '帖子、评论、消息等内容' },
  { icon: '👥', label: '圈子、关注、粉丝关系' },
  { icon: '🛍', label: '订单记录和购买历史' },
  { icon: '🎁', label: '积分、优惠券和会员权益' },
  { icon: '💳', label: '钱包余额（需先提现）' },
]

const canNext = computed(() => {
  if (step.value === 1) return agreed.value
  if (step.value === 2) return !!selectedReason.value
  if (step.value === 3) {
    if (verifyMethod.value === 'password') return password.value.length >= 6
    return code.value.length === 6
  }
  return false
})

function onCodeInput(e: any) {
  code.value = e.detail.value.replace(/\D/g, '').slice(0, 6)
}

function onConfirmInput(e: any) {
  confirmText.value = e.detail.value
}

function sendCode() {
  if (countdown.value > 0) return
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
  uni.showToast({ title: '验证码已发送', icon: 'none' })
}

function handleNextStep() {
  if (!canNext.value) return
  if (step.value === 3) {
    showConfirmDialog.value = true
    return
  }
  step.value++
}

function closeConfirmDialog() {
  showConfirmDialog.value = false
  confirmText.value = ''
}

async function handleDelete() {
  if (confirmText.value !== '确认注销') return
  deleting.value = true
  await new Promise((r) => setTimeout(r, 2000))
  deleting.value = false
  uni.navigateTo({ url: '/pages/mine/delete-account-result?status=pending&expire=' + encodeURIComponent(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) })
}

function onBack() {
  if (step.value > 1) {
    step.value--
  } else {
    uni.navigateBack()
  }
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 160rpx;
}

/* 顶部导航 */
.header {
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 80rpx;
  gap: 0;
}
.step-wrap {
  display: flex;
  align-items: center;
  flex: 1;
}
.step-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #E8E3DB;
  color: #999;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s;
}
.step-dot.active {
  background: #C41E3A;
  color: #fff;
}
.step-dot.done {
  background: #22C55E;
  color: #fff;
}
.step-line {
  flex: 1;
  height: 4rpx;
  background: #E8E3DB;
  transition: all 0.3s;
}
.step-line.done {
  background: #22C55E;
}

/* 内容 */
.content { padding: 24rpx; }

/* 步骤1 */
.warn-card {
  display: flex;
  gap: 16rpx;
  background: #FFF0F0;
  border: 1rpx solid #FFCDD2;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.warn-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #FFEBEE;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.warn-icon { font-size: 32rpx; color: #C41E3A; }
.warn-title { font-size: 26rpx; font-weight: 600; color: #C62828; display: block; }
.warn-desc { font-size: 22rpx; color: #E53935; margin-top: 6rpx; display: block; }

.section-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.section-subtitle { font-size: 22rpx; color: #999; display: block; margin-bottom: 20rpx; margin-top: -8rpx; }

.data-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}
.data-item:last-child { border-bottom: none; }
.data-item-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.data-item-icon { font-size: 24rpx; }
.data-item-label { flex: 1; font-size: 24rpx; color: #2C2C2C; }
.data-item-x { font-size: 24rpx; color: #EF4444; }

.asset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.asset-item {
  border-radius: 16rpx;
  padding: 20rpx;
}
.asset-item.bg-orange { background: #FFF3E0; }
.asset-item.bg-purple { background: #F3E5F5; }
.asset-item.bg-green { background: #E8F5E9; }
.asset-item.bg-blue { background: #E3F2FD; }
.asset-label { font-size: 20rpx; display: block; margin-bottom: 6rpx; }
.asset-item.bg-orange .asset-label { color: #E65100; }
.asset-item.bg-purple .asset-label { color: #7B1FA2; }
.asset-item.bg-green .asset-label { color: #2E7D32; }
.asset-item.bg-blue .asset-label { color: #1565C0; }
.asset-value { font-size: 36rpx; font-weight: 700; display: block; }
.asset-value.orange { color: #E65100; }
.asset-value.purple { color: #7B1FA2; }
.asset-value.green { color: #2E7D32; }
.asset-value.blue { color: #1565C0; }
.asset-warn { font-size: 20rpx; color: #EF4444; display: block; margin-top: 12rpx; }

.cooldown-card {
  background: #E3F2FD;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.cooldown-title { font-size: 26rpx; font-weight: 600; color: #1565C0; display: block; }
.cooldown-desc { font-size: 22rpx; color: #1976D2; margin-top: 8rpx; display: block; line-height: 1.5; }

.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.agree-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #D0C8B8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
  transition: all 0.2s;
}
.agree-check.checked { background: #C41E3A; border-color: #C41E3A; }
.agree-check-mark { font-size: 22rpx; color: #fff; font-weight: bold; }
.agree-text { font-size: 24rpx; color: #999; line-height: 1.6; flex: 1; }
.agree-link { color: #C41E3A; }

/* 步骤2：原因 */
.reason-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3DB;
  margin-bottom: 12rpx;
  transition: all 0.2s;
}
.reason-item.selected {
  border-color: #C41E3A;
  background: #FFF5F5;
}
.reason-radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #D0C8B8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.reason-radio.checked { border-color: #C41E3A; }
.reason-radio-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #C41E3A;
}
.reason-label { font-size: 26rpx; color: #2C2C2C; }

.reason-textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3D7;
  font-size: 24rpx;
  color: #2C2C2C;
  box-sizing: border-box;
  line-height: 1.5;
}
.reason-count { font-size: 20rpx; color: #B8B0A4; display: block; text-align: right; margin-top: 8rpx; }

/* 步骤3：验证 */
.method-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.method-tab {
  flex: 1;
  height: 72rpx;
  border-radius: 16rpx;
  background: #F5F0E8;
  color: #666;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.method-tab.active {
  background: #C41E3A;
  color: #fff;
}

.verify-group { margin-bottom: 8rpx; }
.verify-label { font-size: 22rpx; color: #666; display: block; margin-bottom: 12rpx; }

.pwd-input-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx;
  height: 88rpx;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3DB;
  background: #FAF8F5;
}
.form-input {
  flex: 1;
  height: 100%;
  font-size: 26rpx;
  color: #2C2C2C;
  background: transparent;
  border: none;
  outline: none;
}
.pwd-toggle { font-size: 28rpx; padding: 8rpx; }

.code-row { display: flex; gap: 16rpx; }
.code-input { flex: 1; }
.btn-send {
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: 16rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-send.disabled { background: #E8E3DB; color: #999; }

.verify-hint {
  background: #FFF8E1;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 8rpx;
}
.verify-hint-text { font-size: 22rpx; color: #856404; display: block; }

/* 底部按钮 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  background: #F5F0E8;
  border-top: 1rpx solid #E8E3DB;
}
.btn-next {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-next.disabled { opacity: 0.5; }

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.dialog-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  width: 100%;
  max-width: 560rpx;
  text-align: center;
}
.dialog-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #FFEBEE;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20rpx;
}
.dialog-icon { font-size: 56rpx; }
.dialog-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; display: block; }
.dialog-desc { font-size: 24rpx; color: #666; margin-top: 12rpx; display: block; }
.dialog-desc-highlight { color: #EF4444; font-weight: 500; }
.dialog-input {
  width: 100%;
  height: 80rpx;
  margin-top: 24rpx;
  padding: 0 24rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #2C2C2C;
  text-align: center;
  border: 1rpx solid #E8E3D7;
  box-sizing: border-box;
}
.dialog-error { font-size: 20rpx; color: #EF4444; display: block; margin-top: 8rpx; }

.dialog-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}
.dialog-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 500;
}
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-confirm { background: #EF4444; color: #fff; }
.dialog-btn-confirm.disabled { opacity: 0.5; }
</style>
