<template>
  <view class="tc-page">
    <!-- 头部 -->
    <view class="tc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tc-back" @tap="back">
        <AppIcon name="arrow-left" :size="22" color="#2c2c2c" />
      </view>
      <text class="tc-title">讲师认证</text>
    </view>

    <!-- 已通过 / 审核中 状态页 -->
    <view v-if="status === 'approved'" class="tc-status-page">
      <AppIcon name="check-circle" :size="80" color="#22c55e" />
      <text class="tc-status-title">认证已通过</text>
      <text class="tc-status-desc">您已是平台认证讲师，享有专属权益。</text>
    </view>

    <view v-else-if="status === 'pending'" class="tc-status-page">
      <AppIcon name="clock" :size="80" color="#f97316" />
      <text class="tc-status-title">审核中</text>
      <text class="tc-status-desc">您的认证申请正在审核中，预计 3-5 个工作日完成。</text>
    </view>

    <template v-else>
      <!-- 步骤进度 -->
      <view class="tc-progress">
        <view v-for="s in 3" :key="s" class="tc-progress-seg">
          <view class="tc-step-dot" :class="{ 'tc-step-active': step >= s }">{{ s }}</view>
          <view v-if="s < 3" class="tc-step-line" :class="{ 'tc-step-line-active': step > s }" />
        </view>
      </view>
      <view class="tc-progress-labels">
        <text class="tc-progress-label">基本信息</text>
        <text class="tc-progress-label">资质证明</text>
        <text class="tc-progress-label">完成</text>
      </view>

      <!-- 步骤1 基本信息 -->
      <view v-if="step === 1" class="tc-form">
        <view v-for="f in baseFields" :key="f.key" class="tc-field">
          <text class="tc-label">{{ f.label }}</text>
          <input
            class="tc-input"
            :placeholder="f.placeholder"
            placeholder-class="tc-ph"
            :value="form[f.key]"
            @input="updateForm(f.key, $event)"
          />
        </view>
        <view class="tc-field">
          <text class="tc-label">个人简介</text>
          <textarea
            class="tc-textarea"
            placeholder="请介绍您的专业背景、教学经验和研究成果"
            placeholder-class="tc-ph"
            :value="form.bio"
            @input="updateForm('bio', $event)"
          />
        </view>
        <view class="tc-footer">
          <button class="tc-btn" :class="{ 'tc-btn-disabled': !canNext }" :disabled="!canNext" @tap="step = 2">
            下一步
          </button>
        </view>
      </view>

      <!-- 步骤2 资质证明 -->
      <view v-else-if="step === 2" class="tc-form">
        <text class="tc-hint">请上传专业资质证书，支持 JPG、PNG 格式，单张不超过 5MB。</text>
        <view v-for="f in certFields" :key="f.key" class="tc-field">
          <text class="tc-label">{{ f.label }}</text>
          <view class="tc-upload" :class="{ 'tc-upload-done': form[f.key] }" @tap="chooseImage(f.key)">
            <AppIcon :name="form[f.key] ? 'file-text' : 'upload'" :size="32" :color="form[f.key] ? '#c41e3a' : '#bbb'" />
            <text class="tc-upload-text" :class="{ 'tc-upload-text-done': form[f.key] }">
              {{ form[f.key] ? '已上传' : '点击上传证书图片' }}
            </text>
          </view>
        </view>
        <view class="tc-footer tc-footer-row">
          <button class="tc-btn tc-btn-outline" @tap="step = 1">上一步</button>
          <button class="tc-btn" :class="{ 'tc-btn-disabled': loading || !form.cert1 }" :disabled="loading || !form.cert1" @tap="handleSubmit">
            {{ loading ? '提交中…' : '提交申请' }}
          </button>
        </view>
      </view>

      <!-- 步骤3 完成 -->
      <view v-else class="tc-done">
        <AppIcon name="check-circle" :size="80" color="#22c55e" />
        <text class="tc-status-title">申请已提交</text>
        <text class="tc-status-desc">
          您的讲师认证申请已收到，我们将在 3-5 个工作日内完成审核，结果将通过站内通知告知您。
        </text>
        <button class="tc-btn tc-btn-full" @tap="goHome">返回首页</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { reLaunch, goBack } from '@/utils/router'

type CertStatus = 'none' | 'pending' | 'approved' | 'rejected'

const statusBarHeight = ref(0)
const status = ref<CertStatus>('none')
const step = ref(1)
const loading = ref(false)

const form = ref<Record<string, string>>({
  realName: '',
  idCard: '',
  specialty: '',
  experience: '',
  bio: '',
  cert1: '',
  cert2: '',
})

const baseFields = [
  { key: 'realName', label: '真实姓名', placeholder: '请输入真实姓名' },
  { key: 'idCard', label: '身份证号', placeholder: '请输入18位身份证号' },
  { key: 'specialty', label: '专业领域', placeholder: '如：八字命理、风水堪舆' },
  { key: 'experience', label: '从业年限', placeholder: '如：5年' },
]

const certFields = [
  { key: 'cert1', label: '资质证书 1（必填）' },
  { key: 'cert2', label: '资质证书 2（选填）' },
]

const canNext = computed(() => !!form.value.realName && !!form.value.specialty)

function updateForm(key: string, e: any) {
  form.value[key] = e.detail.value
}

function chooseImage(key: string) {
  uni.chooseImage({
    count: 1,
    success: (res: any) => {
      const path = Array.isArray(res.tempFilePaths) ? res.tempFilePaths[0] : res.tempFilePaths
      form.value[key] = path || 'uploaded'
    },
  })
}

async function handleSubmit() {
  loading.value = true
  await new Promise((r) => setTimeout(r, 1500))
  loading.value = false
  step.value = 3
}

function goHome() {
  reLaunch('/')
}

function back() {
  goBack()
}

onLoad(() => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
})
</script>

<style scoped>
.tc-page {
  min-height: 100vh;
  background: #fff;
}

/* 头部 */
.tc-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
}
.tc-back {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 状态页 */
.tc-status-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 0 64rpx;
  text-align: center;
}
.tc-status-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-top: 32rpx;
}
.tc-status-desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 16rpx;
  line-height: 1.6;
}

/* 进度 */
.tc-progress {
  display: flex;
  align-items: center;
  padding: 40rpx 48rpx 24rpx;
}
.tc-progress-seg {
  display: flex;
  align-items: center;
  flex: 1;
}
.tc-progress-seg:last-child {
  flex: 0 0 auto;
}
.tc-step-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  background: #f0f0f0;
  color: #999;
  flex-shrink: 0;
}
.tc-step-active {
  background: #c41e3a;
  color: #fff;
}
.tc-step-line {
  flex: 1;
  height: 4rpx;
  margin: 0 12rpx;
  background: #f0f0f0;
}
.tc-step-line-active {
  background: #c41e3a;
}
.tc-progress-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 48rpx;
  margin-bottom: 40rpx;
}
.tc-progress-label {
  font-size: 22rpx;
  color: #999;
}

/* 表单 */
.tc-form {
  padding: 0 32rpx 200rpx;
}
.tc-field {
  margin-bottom: 32rpx;
}
.tc-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 14rpx;
}
.tc-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  background: #fff;
  border: 2rpx solid #e5e5e5;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.tc-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  background: #fff;
  border: 2rpx solid #e5e5e5;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.tc-ph {
  color: #bbb;
}
.tc-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 24rpx;
  line-height: 1.5;
}

/* 上传 */
.tc-upload {
  border: 4rpx dashed #e5e5e5;
  border-radius: 20rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.tc-upload-done {
  border-color: rgba(196, 30, 58, 0.5);
  background: rgba(196, 30, 58, 0.05);
}
.tc-upload-text {
  font-size: 26rpx;
  color: #999;
}
.tc-upload-text-done {
  color: #c41e3a;
  font-weight: 500;
}

/* 底部按钮 */
.tc-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 2rpx solid #f0f0f0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.tc-footer-row {
  display: flex;
  gap: 24rpx;
}
.tc-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
  background: #c41e3a;
  border-radius: 16rpx;
  text-align: center;
  border: none;
}
.tc-btn::after {
  border: none;
}
.tc-btn-disabled {
  opacity: 0.4;
}
.tc-btn-outline {
  background: #fff;
  color: #2c2c2c;
  border: 2rpx solid #e5e5e5;
}
.tc-btn-full {
  width: 100%;
  margin-top: 48rpx;
}

/* 完成 */
.tc-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 0 64rpx;
  text-align: center;
}
</style>
