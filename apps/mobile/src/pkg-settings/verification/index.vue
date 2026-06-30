<template>
  <view class="verify-page">
    <!-- 顶栏 -->
    <view class="nav">
      <view class="nav-back" @click="goBack">
        <AppIcon name="arrow-left" :size="22" color="#1A1A1A" />
      </view>
      <text class="nav-title">实名认证</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 已认证 -->
    <view v-if="status === 'approved'" class="result">
      <view class="result-icon result-icon--green">
        <AppIcon name="check-circle-2" :size="40" color="#22C55E" />
      </view>
      <text class="result-title">已完成实名认证</text>
      <text class="result-sub">你已通过平台实名认证</text>
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">认证姓名</text>
          <text class="info-value">{{ info.approved.realName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">认证时间</text>
          <text class="info-value">{{ info.approved.verifyTime }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">认证状态</text>
          <text class="badge badge--green">已认证</text>
        </view>
      </view>
      <view class="safe-box">
        <AppIcon name="shield" :size="20" color="#C9A96E" />
        <view class="safe-text">
          <text class="safe-title">信息安全保障</text>
          <text class="safe-desc">你的实名信息已加密存储，仅用于身份验证，不会泄露给第三方。</text>
        </view>
      </view>
    </view>

    <!-- 审核中 -->
    <view v-else-if="status === 'pending'" class="result">
      <view class="result-icon result-icon--amber">
        <AppIcon name="clock" :size="40" color="#F59E0B" />
      </view>
      <text class="result-title">审核中</text>
      <text class="result-sub">你的实名认证申请正在审核中</text>
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">提交时间</text>
          <text class="info-value">{{ info.pending.submitTime }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预计审核</text>
          <text class="info-value">{{ info.pending.expectedTime }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">当前状态</text>
          <text class="badge badge--amber">审核中</text>
        </view>
      </view>
      <view class="tip-box">
        <text class="tip-box-text">审核结果将通过消息通知你，请耐心等待</text>
      </view>
    </view>

    <!-- 认证失败 -->
    <view v-else-if="status === 'rejected'" class="result">
      <view class="result-icon result-icon--red">
        <AppIcon name="x-circle" :size="40" color="#EF4444" />
      </view>
      <text class="result-title">认证失败</text>
      <text class="result-sub">很抱歉，你的实名认证未通过</text>
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">审核时间</text>
          <text class="info-value">{{ info.rejected.rejectTime }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">当前状态</text>
          <text class="badge badge--red">未通过</text>
        </view>
        <view class="reject-reason">
          <text class="reject-label">失败原因：</text>
          <text class="reject-text">{{ info.rejected.reason }}</text>
        </view>
      </view>
      <view class="primary-btn" @click="status = 'none'">
        <text class="primary-btn-text">重新认证</text>
      </view>
    </view>

    <!-- 未认证 - 表单 -->
    <view v-else class="form">
      <!-- 认证须知 -->
      <view class="notice-card">
        <AppIcon name="shield" :size="20" color="#F59E0B" />
        <view class="notice-body">
          <text class="notice-title">认证须知</text>
          <text class="notice-desc">根据相关法律法规及平台规则，部分功能（成为圈主、站长提现等）需实名认证后才可使用。</text>
          <view class="notice-lock">
            <AppIcon name="lock" :size="14" color="#C9A96E" />
            <text class="notice-lock-text">你的个人信息仅用于身份验证，我们将严格加密保护</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="section">
        <text class="section-title">基本信息</text>
        <view class="field">
          <text class="field-label">真实姓名</text>
          <input
            v-model="realName"
            class="field-input"
            placeholder="请输入身份证上的姓名"
            placeholder-class="field-ph"
          />
        </view>
        <view class="field">
          <text class="field-label">身份证号</text>
          <input
            :value="idNumber"
            class="field-input"
            placeholder="请输入18位身份证号码"
            placeholder-class="field-ph"
            @input="onIdInput"
          />
          <text v-if="idNumber && idNumber.length !== 18" class="field-err">请输入正确的18位身份证号</text>
        </view>
      </view>

      <!-- 证件照片 -->
      <view class="section">
        <text class="section-title">证件照片</text>
        <text class="section-sub">请确保证件照片清晰、完整，四角齐全</text>
        <view class="upload-grid">
          <view class="upload-col">
            <text class="upload-label">身份证人像面</text>
            <view v-if="frontImage" class="upload-done">
              <view class="upload-done-inner">
                <AppIcon name="check-circle-2" :size="32" color="#22C55E" />
                <text class="upload-done-text">已上传</text>
              </view>
              <view class="upload-remove" @click="frontImage = null">
                <AppIcon name="x" :size="16" color="#FFFFFF" />
              </view>
            </view>
            <view v-else class="upload-box" @click="uploadImage('front')">
              <view class="upload-cam">
                <AppIcon name="camera" :size="20" color="#9A9A9A" />
              </view>
              <text class="upload-hint">点击上传</text>
            </view>
          </view>
          <view class="upload-col">
            <text class="upload-label">身份证国徽面</text>
            <view v-if="backImage" class="upload-done">
              <view class="upload-done-inner">
                <AppIcon name="check-circle-2" :size="32" color="#22C55E" />
                <text class="upload-done-text">已上传</text>
              </view>
              <view class="upload-remove" @click="backImage = null">
                <AppIcon name="x" :size="16" color="#FFFFFF" />
              </view>
            </view>
            <view v-else class="upload-box" @click="uploadImage('back')">
              <view class="upload-cam">
                <AppIcon name="camera" :size="20" color="#9A9A9A" />
              </view>
              <text class="upload-hint">点击上传</text>
            </view>
          </view>
        </view>

        <view class="shoot-tip">
          <AppIcon name="upload" :size="16" color="#9A9A9A" />
          <view class="shoot-tip-body">
            <text class="shoot-tip-title">拍摄提示：</text>
            <text class="shoot-tip-item">· 请确保证件边框完整，字迹清晰可辨</text>
            <text class="shoot-tip-item">· 避免反光、遮挡或模糊</text>
            <text class="shoot-tip-item">· 支持JPG、PNG格式，单张不超过5MB</text>
          </view>
        </view>
      </view>

      <!-- 隐私声明 -->
      <view class="privacy">
        <text class="privacy-text">提交即表示你同意</text>
        <text class="privacy-link" @click="navTo('/privacy')">《隐私政策》</text>
        <text class="privacy-text">和</text>
        <text class="privacy-link" @click="navTo('/terms')">《用户协议》</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="status === 'none'" class="footer">
      <view
        class="submit-btn"
        :class="{ 'submit-btn--active': canSubmit && !isSubmitting }"
        @click="handleSubmit"
      >
        <view v-if="isSubmitting" class="submit-loading">
          <view class="spinner" />
          <text class="submit-text">提交中...</text>
        </view>
        <text v-else class="submit-text">提交审核</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, navigateTo } from '@/utils/router'

type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'

const status = ref<VerificationStatus>('none')
const realName = ref('')
const idNumber = ref('')
const frontImage = ref<string | null>(null)
const backImage = ref<string | null>(null)
const isSubmitting = ref(false)

const info = {
  pending: { submitTime: '2024-01-15 14:30', expectedTime: '1-3个工作日' },
  approved: { verifyTime: '2024-01-16 10:00', realName: '张**' },
  rejected: { reason: '身份证照片模糊，请重新上传清晰照片', rejectTime: '2024-01-16 09:00' },
}

const canSubmit = computed(
  () => realName.value.length >= 2 && idNumber.value.length === 18 && !!frontImage.value && !!backImage.value,
)

function onIdInput(e: any) {
  const v = String(e.detail.value || '').replace(/[^0-9Xx]/g, '').slice(0, 18)
  idNumber.value = v
}

function uploadImage(type: 'front' | 'back') {
  // mock 上传
  if (type === 'front') frontImage.value = '/images/id-front.jpg'
  else backImage.value = '/images/id-back.jpg'
}

function handleSubmit() {
  if (!canSubmit.value || isSubmitting.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    status.value = 'pending'
  }, 1500)
}

function navTo(path: string) {
  navigateTo(path)
}

function goBack() {
  navigateBack()
}
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 180rpx;
}

/* 顶栏 */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1rpx solid #EFE9E1;
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.nav-placeholder {
  width: 56rpx;
}

/* 结果态通用 */
.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 32rpx 64rpx;
}
.result-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.result-icon--green { background: rgba(34, 197, 94, 0.1); }
.result-icon--amber { background: rgba(245, 158, 11, 0.1); }
.result-icon--red { background: rgba(239, 68, 68, 0.1); }
.result-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 16rpx;
}
.result-sub {
  font-size: 28rpx;
  color: #9A9A9A;
  margin-bottom: 48rpx;
}

.info-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}
.info-label {
  font-size: 28rpx;
  color: #9A9A9A;
}
.info-value {
  font-size: 28rpx;
  color: #1A1A1A;
}
.badge {
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
}
.badge--green { background: rgba(34, 197, 94, 0.1); color: #22C55E; }
.badge--amber { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
.badge--red { background: rgba(239, 68, 68, 0.1); color: #EF4444; }

.reject-reason {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #EFE9E1;
}
.reject-label {
  font-size: 28rpx;
  color: #9A9A9A;
  display: block;
}
.reject-text {
  font-size: 28rpx;
  color: #EF4444;
  margin-top: 8rpx;
  display: block;
}

.safe-box {
  margin-top: 64rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background: rgba(201, 169, 110, 0.08);
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.safe-text { flex: 1; }
.safe-title {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 500;
  display: block;
}
.safe-desc {
  font-size: 24rpx;
  color: #9A9A9A;
  margin-top: 8rpx;
  line-height: 1.6;
  display: block;
}

.tip-box {
  margin-top: 64rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background: rgba(201, 169, 110, 0.08);
  width: 100%;
}
.tip-box-text {
  font-size: 28rpx;
  color: #9A9A9A;
  text-align: center;
  display: block;
}

.primary-btn {
  margin-top: 64rpx;
  width: 100%;
  height: 92rpx;
  background: var(--brand);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.primary-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

/* 表单态 */
.form {
  padding: 24rpx 32rpx;
}
.notice-card {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx;
  background: rgba(245, 158, 11, 0.05);
  border: 1rpx solid rgba(245, 158, 11, 0.2);
  border-radius: 24rpx;
  margin-bottom: 48rpx;
}
.notice-body { flex: 1; }
.notice-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 16rpx;
  display: block;
}
.notice-desc {
  font-size: 24rpx;
  color: #9A9A9A;
  line-height: 1.7;
  display: block;
}
.notice-lock {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 24rpx;
}
.notice-lock-text {
  font-size: 24rpx;
  color: #C9A96E;
}

.section {
  margin-bottom: 48rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  display: block;
  margin-bottom: 24rpx;
}
.section-sub {
  font-size: 24rpx;
  color: #9A9A9A;
  display: block;
  margin-bottom: 24rpx;
  margin-top: -12rpx;
}
.field {
  margin-bottom: 28rpx;
}
.field-label {
  font-size: 24rpx;
  color: #9A9A9A;
  margin-bottom: 12rpx;
  display: block;
}
.field-input {
  width: 100%;
  height: 96rpx;
  padding: 0 32rpx;
  background: #F2EEE8;
  border-radius: 24rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  box-sizing: border-box;
}
.field-ph {
  color: rgba(154, 154, 154, 0.5);
}
.field-err {
  font-size: 24rpx;
  color: #EF4444;
  margin-top: 8rpx;
  display: block;
}

.upload-grid {
  display: flex;
  gap: 32rpx;
}
.upload-col {
  flex: 1;
}
.upload-label {
  font-size: 24rpx;
  color: #9A9A9A;
  text-align: center;
  display: block;
  margin-bottom: 16rpx;
}
.upload-box {
  width: 100%;
  height: 200rpx;
  border: 2rpx dashed #D8D0C5;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.upload-cam {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #F2EEE8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-hint {
  font-size: 24rpx;
  color: #9A9A9A;
}
.upload-done {
  position: relative;
  width: 100%;
  height: 200rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #F2EEE8;
}
.upload-done-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.upload-done-text {
  font-size: 24rpx;
  color: #9A9A9A;
  margin-top: 8rpx;
}
.upload-remove {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shoot-tip {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(201, 169, 110, 0.06);
  border-radius: 20rpx;
  margin-top: 32rpx;
}
.shoot-tip-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.shoot-tip-title {
  font-size: 24rpx;
  color: #9A9A9A;
}
.shoot-tip-item {
  font-size: 24rpx;
  color: #9A9A9A;
  line-height: 1.5;
}

.privacy {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.privacy-text {
  font-size: 24rpx;
  color: #9A9A9A;
}
.privacy-link {
  font-size: 24rpx;
  color: var(--brand);
  margin: 0 8rpx;
}

/* 底部 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1rpx solid #EFE9E1;
}
.submit-btn {
  width: 100%;
  height: 100rpx;
  border-radius: 24rpx;
  background: #F2EEE8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-btn--active {
  background: var(--brand);
}
.submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #9A9A9A;
}
.submit-btn--active .submit-text {
  color: #FFFFFF;
}
.submit-loading {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
