<template>
  <view class="page">
    <!-- 状态：冷静期 -->
    <template v-if="status === 'pending'">
      <view class="header">
        <view class="header-inner">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <text class="header-title">
            注销申请
          </text>
          <view class="header-right" />
        </view>
      </view>

      <view class="pending-content">
        <!-- 图标 -->
        <view class="result-icon-wrap">
          <text class="result-icon pending-icon">
            ⏳
          </text>
        </view>

        <text class="result-main-title">
          注销申请已提交
        </text>
        <text class="result-sub-desc">
          您的账号将在7天冷静期后正式注销
        </text>

        <!-- 倒计时 -->
        <view class="countdown-card">
          <text class="countdown-label">
            冷静期剩余时间
          </text>
          <view class="countdown-grid">
            <view class="countdown-item">
              <view class="countdown-value">
                {{ countdown.days }}
              </view>
              <text class="countdown-unit">
                天
              </text>
            </view>
            <text class="countdown-colon">
              :
            </text>
            <view class="countdown-item">
              <view class="countdown-value">
                {{ padZero(countdown.hours) }}
              </view>
              <text class="countdown-unit">
                时
              </text>
            </view>
            <text class="countdown-colon">
              :
            </text>
            <view class="countdown-item">
              <view class="countdown-value">
                {{ padZero(countdown.minutes) }}
              </view>
              <text class="countdown-unit">
                分
              </text>
            </view>
            <text class="countdown-colon">
              :
            </text>
            <view class="countdown-item">
              <view class="countdown-value">
                {{ padZero(countdown.seconds) }}
              </view>
              <text class="countdown-unit">
                秒
              </text>
            </view>
          </view>
        </view>

        <!-- 冷静期内提示 -->
        <view class="cooling-tip">
          <text class="cooling-tip-icon">
            ℹ️
          </text>
          <view class="cooling-tip-body">
            <text class="cooling-tip-title">
              冷静期内您可以：
            </text>
            <text class="cooling-tip-item">
              • 重新登录账号撤销注销申请
            </text>
            <text class="cooling-tip-item">
              • 正常使用所有功能
            </text>
            <text class="cooling-tip-item">
              • 冷静期结束后账号将被永久注销
            </text>
          </view>
        </view>

        <!-- 注销后结果 -->
        <view class="aftermath-card">
          <text class="aftermath-title">
            注销后将发生
          </text>
          <view
            v-for="item in aftermathItems"
            :key="item.text"
            class="aftermath-item"
          >
            <text class="aftermath-icon">
              {{ item.icon }}
            </text>
            <text class="aftermath-text">
              {{ item.text }}
            </text>
          </view>
        </view>

        <!-- 按钮 -->
        <view class="pending-buttons">
          <view
            class="btn-cancel-delete"
            @click="showCancelDialog = true"
          >
            撤销注销申请
          </view>
          <view
            class="btn-home"
            @click="goHome"
          >
            🏠 返回首页
          </view>
          <text
            class="btn-help"
            @click="showHelp"
          >
            📄 了解注销详情
          </text>
        </view>
      </view>

      <!-- 撤销确认弹窗 -->
      <view
        v-if="showCancelDialog"
        class="dialog-overlay"
        @click="showCancelDialog = false"
      >
        <view
          class="dialog-content"
          @click.stop
        >
          <view class="dialog-icon-wrap">
            <text class="dialog-check-icon">
              ✅
            </text>
          </view>
          <text class="dialog-title">
            撤销注销申请
          </text>
          <text class="dialog-desc">
            确定要撤销注销申请吗？撤销后账号将恢复正常状态。
          </text>
          <view class="dialog-actions">
            <view
              class="dialog-btn dialog-btn-cancel"
              @click="showCancelDialog = false"
            >
              取消
            </view>
            <view
              class="dialog-btn dialog-btn-confirm-green"
              :class="{ disabled: cancelling }"
              @click="handleCancel"
            >
              {{ cancelling ? '处理中...' : '确定撤销' }}
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 状态：已注销 -->
    <template v-else>
      <view class="header">
        <view class="header-inner center">
          <text class="header-title">
            账号注销
          </text>
        </view>
      </view>

      <view class="completed-content">
        <view class="result-icon-wrap">
          <view class="completed-icon-outer">
            <text class="completed-icon">
              ✕
            </text>
          </view>
        </view>

        <text class="result-main-title">
          账号已注销
        </text>
        <text class="result-sub-desc">
          所有数据将按隐私政策处理，感谢您一直以来的使用与支持
        </text>

        <view class="completed-details">
          <text class="completed-details-title">
            注销完成说明
          </text>
          <view
            v-for="item in completedItems"
            :key="item"
            class="completed-detail-item"
          >
            <text class="completed-detail-check">
              ✓
            </text>
            <text class="completed-detail-text">
              {{ item }}
            </text>
          </view>
        </view>

        <view class="feedback-card">
          <text class="feedback-text">
            如果您愿意告诉我们离开的原因，可以
            <text
              class="feedback-link"
              @click="fillFeedback"
            >
              填写反馈问卷
            </text>
            帮助我们改进服务
          </text>
        </view>

        <view class="completed-buttons">
          <view
            class="btn-register"
            @click="reRegister"
          >
            👤 重新注册账号
          </view>
          <view
            class="btn-close"
            @click="closeApp"
          >
            关闭应用
          </view>
        </view>

        <text class="contact-footer">
          如有问题请联系客服：400-xxx-xxxx
        </text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { authApi } from '../../api'

const status = ref<'pending' | 'completed'>('pending')
const showCancelDialog = ref(false)
const cancelling = ref(false)

const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
let countdownTimer: ReturnType<typeof setInterval> | null = null

const aftermathItems = [
  { icon: '📝', text: '个人资料、发布内容将被删除' },
  { icon: '💰', text: '账户余额将被清零且不可恢复' },
  { icon: '🎁', text: '会员权益、优惠券将作废' },
  { icon: '📱', text: '手机号可重新注册新账号' },
]

const completedItems = [
  '您的个人数据已按照隐私政策进行处理',
  '账户余额已按规定处理完毕',
  '该手机号可用于注册新账号',
  '原账号数据无法恢复',
]

onMounted(async () => {
  try {
    const res = await authApi.getDeleteAccountStatus()
    const data = res?.data || res
    status.value = data?.status || 'pending'
    if (data?.expireTime) {
      startCountdown(data.expireTime)
    } else if (status.value === 'pending') {
      const fallback = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      startCountdown(fallback)
    }
  } catch {
    status.value = 'pending'
    const fallback = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    startCountdown(fallback)
  }
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

function startCountdown(expireTime: string) {
  const targetTime = new Date(expireTime).getTime()

  function update() {
    const diff = targetTime - Date.now()
    if (diff <= 0) {
      status.value = 'completed'
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
      return
    }
    countdown.value = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    }
  }

  update()
  countdownTimer = setInterval(update, 1000)
}

function padZero(n: number): string {
  return String(n).padStart(2, '0')
}

async function handleCancel() {
  cancelling.value = true
  try {
    await authApi.cancelDeleteAccount()
    uni.showToast({ title: '已撤销注销申请', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '撤销失败', icon: 'none' })
  } finally {
    cancelling.value = false
  }
}

function fillFeedback() {
  uni.showToast({ title: '即将打开反馈问卷', icon: 'none' })
}

function reRegister() {
  uni.showToast({ title: '即将跳转注册页面', icon: 'none' })
}

function closeApp() {
  uni.showToast({ title: '感谢您的使用', icon: 'none' })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function showHelp() {
  uni.showToast({ title: '即将打开帮助页面', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40rpx;
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
.header-inner.center { justify-content: center; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

/* 公共结果区 */
.result-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 24rpx;
}
.result-icon {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80rpx;
}
.pending-icon {
  background: #E3F2FD;
  font-size: 72rpx;
}
.result-main-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; text-align: center; display: block; }
.result-sub-desc { font-size: 24rpx; color: #666; text-align: center; display: block; margin-top: 8rpx; max-width: 500rpx; margin-left: auto; margin-right: auto; }

/* 待处理内容 */
.pending-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx 0;
}

/* 倒计时 */
.countdown-card {
  width: 100%;
  background: #E3F2FD;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-top: 32rpx;
}
.countdown-label { font-size: 24rpx; color: #1565C0; text-align: center; display: block; margin-bottom: 24rpx; }
.countdown-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.countdown-item { display: flex; flex-direction: column; align-items: center; }
.countdown-value {
  width: 112rpx;
  height: 112rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 700;
  color: #1565C0;
}
.countdown-unit { font-size: 20rpx; color: #1976D2; margin-top: 8rpx; }
.countdown-colon { font-size: 36rpx; font-weight: 700; color: #1565C0; margin-bottom: 32rpx; }

/* 冷却期提示 */
.cooling-tip {
  width: 100%;
  display: flex;
  gap: 16rpx;
  background: #FFF8E1;
  border: 1rpx solid #FFE082;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 24rpx;
}
.cooling-tip-icon { font-size: 28rpx; flex-shrink: 0; margin-top: 2rpx; }
.cooling-tip-body { flex: 1; }
.cooling-tip-title { font-size: 24rpx; font-weight: 500; color: #856404; display: block; margin-bottom: 8rpx; }
.cooling-tip-item { font-size: 22rpx; color: #856404; display: block; line-height: 1.7; }

/* 注销后结果 */
.aftermath-card {
  width: 100%;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.aftermath-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.aftermath-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
}
.aftermath-icon { font-size: 28rpx; }
.aftermath-text { font-size: 24rpx; color: #666; }

/* 待处理按钮 */
.pending-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 32rpx;
}
.btn-cancel-delete {
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
.btn-home {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: #F5F0E8;
  color: #666;
  font-size: 28rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-help {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  padding: 16rpx;
}

/* 已注销内容 */
.completed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx 0;
}
.completed-icon-outer {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background: #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.completed-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #BDBDBD;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #757575;
}

.completed-details {
  width: 100%;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.completed-details-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.completed-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 10rpx 0;
}
.completed-detail-check { font-size: 22rpx; color: #22C55E; font-weight: bold; flex-shrink: 0; margin-top: 2rpx; }
.completed-detail-text { font-size: 24rpx; color: #666; flex: 1; }

.feedback-card {
  width: 100%;
  background: #E3F2FD;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 24rpx;
}
.feedback-text { font-size: 22rpx; color: #1565C0; text-align: center; display: block; line-height: 1.6; }
.feedback-link { color: #0D47A1; font-weight: 500; text-decoration: underline; }

.completed-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 32rpx;
}
.btn-register {
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
.btn-close {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: #F5F0E8;
  color: #666;
  font-size: 28rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-footer {
  font-size: 20rpx;
  color: #B8B0A4;
  text-align: center;
  display: block;
  margin-top: 48rpx;
}

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
.dialog-icon-wrap { margin-bottom: 20rpx; }
.dialog-check-icon { font-size: 64rpx; }
.dialog-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; display: block; }
.dialog-desc { font-size: 24rpx; color: #666; margin-top: 12rpx; display: block; line-height: 1.6; }
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
.dialog-btn-confirm-green { background: #22C55E; color: #fff; }
.dialog-btn-confirm-green.disabled { opacity: 0.5; }
</style>
