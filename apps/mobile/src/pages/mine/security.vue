<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">安全中心</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 安全评分 -->
    <view class="security-score">
      <view class="score-circle">
        <text class="score-num">{{ securityScore }}</text>
        <text class="score-label">安全分</text>
      </view>
      <view class="score-detail">
        <text class="score-title">账号安全状态</text>
        <text class="score-desc">{{ scoreDesc }}</text>
        <view class="score-bar">
          <view class="score-bar-fill" :style="{ width: securityScore + '%' }" />
        </view>
      </view>
    </view>

    <!-- ==================== 账号安全 ==================== -->
    <view class="section">
      <text class="section-title">账号安全</text>
      <view class="security-list">
        <view class="security-item" @click="goPage('/pages/mine/change-password')">
          <view class="si-left">
            <text class="si-icon">🔑</text>
            <view>
              <text class="si-label">登录密码</text>
              <text class="si-desc">定期更换密码可提高安全性</text>
            </view>
          </view>
          <view class="si-right">
            <text class="si-status safe">已设置</text>
            <text class="si-arrow">›</text>
          </view>
        </view>

        <view class="security-item" @click="goPage('/pages/mine/change-phone')">
          <view class="si-left">
            <text class="si-icon">📱</text>
            <view>
              <text class="si-label">绑定手机</text>
              <text class="si-desc">{{ maskedPhone || '未绑定' }}</text>
            </view>
          </view>
          <view class="si-right">
            <text class="si-status" :class="{ safe: !!maskedPhone }">
              {{ maskedPhone ? '已绑定' : '未绑定' }}
            </text>
            <text class="si-arrow">›</text>
          </view>
        </view>

        <view class="security-item" @click="goPage('/pages/mine/payment-password')">
          <view class="si-left">
            <text class="si-icon">💳</text>
            <view>
              <text class="si-label">支付密码</text>
              <text class="si-desc">用于支付和提现验证</text>
            </view>
          </view>
          <view class="si-right">
            <text class="si-status" :class="{ safe: hasPaymentPwd }">
              {{ hasPaymentPwd ? '已设置' : '未设置' }}
            </text>
            <text class="si-arrow">›</text>
          </view>
        </view>

        <view class="security-item" @click="goPage('/pages/mine/identity-verify')">
          <view class="si-left">
            <text class="si-icon">🪪</text>
            <view>
              <text class="si-label">实名认证</text>
              <text class="si-desc">认证后可使用更多功能</text>
            </view>
          </view>
          <view class="si-right">
            <text class="si-status" :class="{ verified: isVerified }">
              {{ isVerified ? '已认证' : '未认证' }}
            </text>
            <text class="si-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 设备管理 ==================== -->
    <view class="section">
      <text class="section-title">设备管理</text>
      <view class="security-list">
        <view class="security-item" v-for="(device, idx) in devices" :key="idx">
          <view class="si-left">
            <text class="si-icon">{{ device.icon }}</text>
            <view>
              <text class="si-label">{{ device.name }}</text>
              <text class="si-desc">{{ device.lastActive }}</text>
            </view>
          </view>
          <text v-if="device.current" class="device-current">当前设备</text>
        </view>
      </view>
    </view>

    <!-- ==================== 更多操作 ==================== -->
    <view class="section">
      <text class="section-title">更多操作</text>
      <view class="security-list">
        <view class="security-item" @click="goPage('/pages/mine/heritage-verify')">
          <view class="si-left">
            <text class="si-icon">📜</text>
            <view>
              <text class="si-label">传承人认证</text>
              <text class="si-desc">国学传承人身份认证</text>
            </view>
          </view>
          <text class="si-arrow">›</text>
        </view>
        <view class="security-item" @click="goPage('/pages/mine/delete-account')">
          <view class="si-left">
            <text class="si-icon">⚠️</text>
            <view>
              <text class="si-label" style="color: $primary">注销账号</text>
              <text class="si-desc">注销后数据将不可恢复</text>
            </view>
          </view>
          <text class="si-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 最近登录记录 -->
    <view class="login-history" v-if="loginHistory.length > 0">
      <text class="login-history-title">最近登录</text>
      <view class="login-history-list">
        <view class="login-history-item" v-for="(item, idx) in loginHistory" :key="idx">
          <text class="lh-icon">🔐</text>
          <view class="lh-info">
            <text class="lh-device">{{ item.device }}</text>
            <text class="lh-time">{{ item.time }}</text>
          </view>
          <text class="lh-location">{{ item.location }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

interface DeviceInfo {
  icon: string
  name: string
  lastActive: string
  current: boolean
}

interface LoginRecord {
  device: string
  time: string
  location: string
}

const devices = ref<DeviceInfo[]>([
  { icon: '📱', name: 'iPhone 15 Pro', lastActive: '当前在线', current: true },
  { icon: '💻', name: 'Windows Chrome', lastActive: '3天前', current: false },
])

const loginHistory = ref<LoginRecord[]>([
  { device: 'iPhone 15 Pro', time: '2025-06-03 14:32', location: '北京' },
  { device: 'Windows Chrome', time: '2025-05-30 09:15', location: '北京' },
  { device: 'Android Safari', time: '2025-05-25 22:08', location: '上海' },
])

const hasPaymentPwd = ref(false)
const isVerified = ref(false)

const maskedPhone = computed(() => {
  const phone = userStore.user?.phone
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

const securityScore = computed(() => {
  let score = 0
  if (userStore.user?.phone) score += 30
  if (hasPaymentPwd.value) score += 20
  if (isVerified.value) score += 30
  score += 20 // 基础分
  return score
})

const scoreDesc = computed(() => {
  if (securityScore.value >= 90) return '非常高'
  if (securityScore.value >= 70) return '较高'
  if (securityScore.value >= 50) return '一般'
  return '较低，建议完善'
})

onMounted(() => {
  loadSecurityStatus()
})

async function loadSecurityStatus() {
  try {
    // 检查支付密码
    const pwdRes: any = await uni.request({
      url: '/api/v1/users/me/payment-password/status',
      method: 'GET',
    })
    const pwdData = (pwdRes as any).data?.data || (pwdRes as any).data
    hasPaymentPwd.value = pwdData?.hasPassword ?? false
  } catch {
    hasPaymentPwd.value = false
  }

  try {
    // 检查实名认证
    const idRes: any = await uni.request({
      url: '/api/v1/identity/my',
      method: 'GET',
    })
    const idData = (idRes as any).data?.data || (idRes as any).data
    isVerified.value = idData?.verified ?? idData?.status === 'VERIFIED' ?? false
  } catch {
    isVerified.value = false
  }
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ── 导航栏 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
}
.nav-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: $text;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text;
}
.nav-placeholder {
  width: 80rpx;
}

/* ── 安全评分 ── */
.security-score {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}
.score-circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 6rpx solid $gold;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.score-num {
  font-size: 36rpx;
  font-weight: bold;
  color: $gold;
  display: block;
}
.score-label {
  font-size: 18rpx;
  color: $text-tertiary;
  display: block;
}
.score-detail {
  flex: 1;
}
.score-title {
  font-size: 26rpx;
  font-weight: bold;
  color: $text;
  display: block;
}
.score-desc {
  font-size: 22rpx;
  color: $text-secondary;
  display: block;
  margin-top: 4rpx;
}
.score-bar {
  height: 8rpx;
  background: $border;
  border-radius: 4rpx;
  margin-top: 12rpx;
  overflow: hidden;
}
.score-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, $gold, $gold-light);
  border-radius: 4rpx;
  transition: width 0.3s;
}

/* ── 分区 ── */
.section {
  margin: 0 24rpx 24rpx;
}
.section-title {
  font-size: 24rpx;
  color: $text-tertiary;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

/* ── 安全列表 ── */
.security-list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid $border-light;
}
.security-item:last-child {
  border-bottom: none;
}
.security-item:active {
  background: #faf8f4;
}
.si-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}
.si-icon {
  font-size: 36rpx;
  width: 48rpx;
  text-align: center;
}
.si-label {
  font-size: 26rpx;
  color: $text;
  font-weight: 500;
  display: block;
}
.si-desc {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 2rpx;
}
.si-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.si-status {
  font-size: 22rpx;
  color: $text-tertiary;
}
.si-status.safe {
  color: #27ae60;
}
.si-status.verified {
  color: $gold;
}
.si-arrow {
  font-size: 32rpx;
  color: $border;
  font-weight: bold;
}
.device-current {
  font-size: 20rpx;
  color: $gold;
  background: #fdf8ee;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

/* ── 登录历史 ── */
.login-history {
  margin: 0 24rpx;
}
.login-history-title {
  font-size: 24rpx;
  color: $text-tertiary;
  display: block;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}
.login-history-list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.login-history-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid $border-light;
  gap: 12rpx;
}
.login-history-item:last-child {
  border-bottom: none;
}
.lh-icon {
  font-size: 28rpx;
}
.lh-info {
  flex: 1;
}
.lh-device {
  font-size: 24rpx;
  color: $text;
  display: block;
}
.lh-time {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 2rpx;
}
.lh-location {
  font-size: 22rpx;
  color: $text-secondary;
}
</style>
