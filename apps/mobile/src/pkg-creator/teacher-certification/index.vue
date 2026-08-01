<template>
  <view class="tc-page">
    <!-- 头部 -->
    <view class="tc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tc-back" @tap="back">
        <AppIcon name="arrow-left" :size="22" color="#2c2c2c" />
      </view>
      <text class="tc-title">讲师认证</text>
    </view>

    <!-- 加载中 -->
    <view v-if="pageLoading" class="tc-status-page">
      <AppIcon name="loader" :size="48" color="#c41e3a" />
      <text class="tc-status-desc">加载中…</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="pageError" class="tc-status-page">
      <AppIcon name="alert-circle" :size="64" color="#f97316" />
      <text class="tc-status-title">加载失败</text>
      <text class="tc-status-desc">认证状态获取失败，请重试。</text>
      <button class="tc-btn tc-btn-full" @tap="loadContext">重试</button>
    </view>

    <!-- 已通过 -->
    <view v-else-if="status === 'approved'" class="tc-status-page">
      <AppIcon name="check-circle" :size="80" color="#22c55e" />
      <text class="tc-status-title">认证已通过</text>
      <text class="tc-status-desc">您已是平台认证讲师，可在圈子内上传与管理线上课程。</text>
      <button class="tc-btn tc-btn-full" @tap="navigateTo('/pkg-creator/teacher-dashboard/index')">进入课程管理台</button>
    </view>

    <!-- 审核中 -->
    <view v-else-if="status === 'pending'" class="tc-status-page">
      <AppIcon name="clock" :size="80" color="#f97316" />
      <text class="tc-status-title">审核中</text>
      <text class="tc-status-desc">您的认证申请正在审核中，预计 3-5 个工作日完成。</text>
    </view>

    <!-- 已驳回（可重新提交） -->
    <view v-else-if="status === 'rejected' && step !== 3" class="tc-status-page">
      <AppIcon name="x-circle" :size="80" color="#ef4444" />
      <text class="tc-status-title">认证未通过</text>
      <text class="tc-status-desc">{{ rejectReason ? '原因：' + rejectReason : '很抱歉，您的申请未通过审核。' }}</text>
      <button class="tc-btn tc-btn-full" @tap="status = 'none'">修改资料并重新申请</button>
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
        <!-- 实名前置提示（线上讲师认证复用平台实名认证） -->
        <view v-if="!identityVerified" class="tc-verify-tip" @tap="goToVerify">
          <AppIcon name="shield-alert" :size="20" color="#f97316" />
          <text class="tc-verify-text">需先完成实名认证才能申请讲师认证，点此前往</text>
          <AppIcon name="chevron-right" :size="18" color="#f97316" />
        </view>
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
        <text class="tc-hint">可上传专业资质证书辅助审核（选填），支持 JPG、PNG 格式。</text>
        <view v-for="f in certFields" :key="f.key" class="tc-field">
          <text class="tc-label">{{ f.label }}</text>
          <view class="tc-upload" :class="{ 'tc-upload-done': form[f.key] }" @tap="chooseImage(f.key)">
            <image lazy-load v-if="form[f.key]" class="tc-upload-img" :src="form[f.key]" mode="aspectFill" />
            <template v-else>
              <AppIcon :name="uploadingKey === f.key ? 'loader' : 'upload'" :size="32" :color="uploadingKey === f.key ? '#c41e3a' : '#bbb'" />
              <text class="tc-upload-text">
                {{ uploadingKey === f.key ? '上传中…' : '点击选择证书图片' }}
              </text>
            </template>
          </view>
        </view>
        <view class="tc-footer tc-footer-row">
          <button class="tc-btn tc-btn-outline" @tap="step = 1">上一步</button>
          <button class="tc-btn" :class="{ 'tc-btn-disabled': submitting }" :disabled="submitting" @tap="handleSubmit">
            {{ submitting ? '提交中…' : '提交申请' }}
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
import { reLaunch, goBack, navigateTo } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import { teacherApi, type CertStatus } from '@/lib/teacher-data'

const statusBarHeight = ref(0)
const status = ref<CertStatus>('none')
const step = ref(1)

// 三态：页面初始加载认证状态
const pageLoading = ref(true)
const pageError = ref(false)
const submitting = ref(false)

// 实名前置（线上讲师认证复用平台实名认证，不重复采集身份证）
const identityVerified = ref(true)
const rejectReason = ref('')

const form = ref<Record<string, string>>({
  realName: '',
  title: '',
  experience: '',
  bio: '',
  cert1: '',
  cert2: '',
})

// 身份证已由实名认证体系核验，此处不再采集（避免 PII 重复 + 合规）
const baseFields = [
  { key: 'realName', label: '讲师署名', placeholder: '用于课程与证书展示的真实姓名' },
  { key: 'title', label: '专业领域 / 头衔', placeholder: '如：八字命理讲师、书法讲师' },
  { key: 'experience', label: '从业年限', placeholder: '如：5年（选填）' },
]

const certFields = [
  { key: 'cert1', label: '资质证书 1（选填）' },
  { key: 'cert2', label: '资质证书 2（选填）' },
]

const canNext = computed(() => !!form.value.realName && !!form.value.title)

// 模板 @input 传入的是 uni-app 输入事件对象，仅取 detail.value
function updateForm(key: string, e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  form.value[key] = e.detail.value
}

const uploadingKey = ref('')
async function chooseImage(key: string) {
  if (uploadingKey.value) return
  uploadingKey.value = key
  try {
    form.value[key] = await chooseAndUploadImage()
  } catch (e) {
    const err = e as Error
    if (err?.message && err.message !== '已取消') uni.showToast({ title: err.message, icon: 'none' })
  } finally {
    uploadingKey.value = ''
  }
}

/** 加载认证状态 + 实名状态（三态） */
async function loadContext() {
  pageLoading.value = true
  pageError.value = false
  try {
    const ctx = await teacherApi.getCertificationContext()
    status.value = ctx.status
    identityVerified.value = ctx.identityVerified
    rejectReason.value = ctx.cert?.rejectReason || ''
    // 已驳回：回填原资料，便于修改后重新提交
    if (ctx.cert && ctx.status === 'rejected') {
      form.value.realName = ctx.cert.realName || ''
      form.value.title = ctx.cert.title || ''
      form.value.bio = ctx.cert.intro || ''
    }
  } catch (e) {
    pageError.value = true
  } finally {
    pageLoading.value = false
  }
}

/** 跳转实名认证页（直达二要素核验，不再绕账号安全中心） */
function goToVerify() {
  navigateTo('/pkg-mine/verification/index')
}

async function handleSubmit() {
  if (submitting.value) return
  // 前置：未实名先引导
  if (!identityVerified.value) {
    uni.showModal({
      title: '需先完成实名认证',
      content: '线上讲师认证复用平台实名认证，请先在「账号安全」完成实名后再申请。',
      confirmText: '去实名',
      success: (r) => { if (r.confirm) goToVerify() },
    })
    return
  }
  submitting.value = true
  try {
    const intro = [
      form.value.experience ? `从业 ${form.value.experience}` : '',
      form.value.bio || '',
    ].filter(Boolean).join('。 ')
    const credentials = [form.value.cert1, form.value.cert2].filter(Boolean)
    await teacherApi.applyCertification({
      realName: form.value.realName,
      title: form.value.title,
      intro: intro || undefined,
      credentials: credentials.length ? credentials : undefined,
    })
    step.value = 3
    status.value = 'pending'
  } catch (e) {
    const err = e as { message?: string; errMsg?: string }
    const msg = err?.message || err?.errMsg || ''
    if (msg.includes('实名')) {
      uni.showModal({
        title: '需先完成实名认证',
        content: '请先在「账号安全」完成实名认证后再申请讲师认证。',
        confirmText: '去实名',
        success: (r) => { if (r.confirm) goToVerify() },
      })
    } else {
      uni.showToast({ title: msg || '提交失败，请重试', icon: 'none' })
    }
  } finally {
    submitting.value = false
  }
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
  loadContext()
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

/* 实名前置提示 */
.tc-verify-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  padding: 20rpx 24rpx;
  background: #fff7ed;
  border: 2rpx solid #fed7aa;
  border-radius: 16rpx;
}
.tc-verify-text {
  flex: 1;
  font-size: 26rpx;
  color: #c2410c;
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
  background: var(--brand);
  color: #fff;
}
.tc-step-line {
  flex: 1;
  height: 4rpx;
  margin: 0 12rpx;
  background: #f0f0f0;
}
.tc-step-line-active {
  background: var(--brand);
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
  padding: 0;
  overflow: hidden;
}
.tc-upload-img {
  width: 100%;
  height: 240rpx;
  border-radius: 16rpx;
}
.tc-upload-text {
  font-size: 26rpx;
  color: #999;
}
.tc-upload-text-done {
  color: var(--brand);
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
  background: var(--brand);
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
