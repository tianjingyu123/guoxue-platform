<template>
  <view class="page">
    <!-- 头部 -->
    <view class="nav-header">
      <view class="nav-header-inner">
        <text
          class="nav-back"
          @click="goBack"
        >
          ←
        </text>
        <text class="nav-title">
          {{ existingApplication ? '申请状态' : '申请成为讲师' }}
        </text>
      </view>
    </view>

    <!-- 已有申请 - 状态展示 -->
    <template v-if="existingApplication">
      <view class="section-padding">
        <!-- 状态卡片 -->
        <view class="status-card">
          <view
            class="status-icon-wrap"
            :style="{ backgroundColor: statusColor }"
          >
            <text class="status-icon">
              {{ statusIcon }}
            </text>
          </view>
          <text class="status-title">
            {{ statusLabel }}
          </text>
          <text
            v-if="appStatus === 'submitted'"
            class="status-desc"
          >
            您的申请已提交，预计3-5个工作日内完成审核
          </text>
          <text
            v-if="appStatus === 'reviewing'"
            class="status-desc"
          >
            审核人员正在审核您的资料，请耐心等待
          </text>
          <view v-if="appStatus === 'approved'">
            <text class="status-desc status-success">
              恭喜您通过审核，已成为研究院讲师！
            </text>
            <view
              class="btn btn-primary mt-3"
              @click="goInstitute"
            >
              进入讲师中心
            </view>
          </view>
          <view v-if="appStatus === 'rejected'">
            <text class="status-desc status-fail">
              很抱歉，您的申请未通过审核
            </text>
            <text
              v-if="existingApplication.rejectReason"
              class="status-desc"
            >
              原因：{{ existingApplication.rejectReason }}
            </text>
            <view
              class="btn btn-outline mt-3"
              @click="existingApplication = null"
            >
              重新申请
            </view>
          </view>
        </view>

        <!-- 申请信息 -->
        <view class="card mt-3">
          <view class="card-header">
            <text class="section-title">
              申请信息
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              姓名
            </text><text>{{ existingApplication.realName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">
              手机
            </text><text>{{ existingApplication.phone }}</text>
          </view>
          <view class="info-block">
            <text class="info-label block mb-1">
              擅长领域
            </text>
            <view class="tag-group">
              <text
                v-for="s in existingApplication.specialties"
                :key="s"
                class="tag tag-primary"
              >
                {{ s }}
              </text>
            </view>
          </view>
          <view
            v-if="existingApplication.submittedAt"
            class="info-row"
          >
            <text class="info-label">
              提交时间
            </text><text>{{ existingApplication.submittedAt }}</text>
          </view>
        </view>

        <!-- 刷新按钮 -->
        <view
          v-if="appStatus === 'submitted' || appStatus === 'reviewing'"
          class="refresh-btn"
          @click="loadApplication"
        >
          <text>🔄 刷新状态</text>
        </view>
      </view>
    </template>

    <!-- 申请表单 -->
    <template v-else>
      <view class="content-wrap">
        <!-- 提示 -->
        <view class="tip-box">
          <text class="tip-icon">
            🏆
          </text>
          <view>
            <text class="tip-title">
              成为研究院讲师
            </text>
            <text class="tip-desc">
              加入研究院讲师团队，分享您的学识，传承国学文化
            </text>
          </view>
        </view>

        <!-- 基本信息 -->
        <view class="form-section">
          <text class="form-section-title">
            👤 基本信息
          </text>
          <!-- 姓名 -->
          <view class="form-group">
            <text class="form-label">
              真实姓名 <text class="required">
                *
              </text>
            </text>
            <input
              v-model="formData.realName"
              class="form-input"
              :class="{ 'input-error': errors.realName }"
              placeholder="请输入真实姓名"
              @input="clearError('realName')"
            >
            <text
              v-if="errors.realName"
              class="error-text"
            >
              {{ errors.realName }}
            </text>
          </view>
          <!-- 手机 -->
          <view class="form-group">
            <text class="form-label">
              手机号码 <text class="required">
                *
              </text>
            </text>
            <view class="input-with-icon">
              <text class="input-icon">
                📞
              </text>
              <input
                v-model="formData.phone"
                class="form-input pl-icon"
                :class="{ 'input-error': errors.phone }"
                placeholder="请输入手机号码"
                @input="clearError('phone')"
              >
            </view>
            <text
              v-if="errors.phone"
              class="error-text"
            >
              {{ errors.phone }}
            </text>
          </view>
          <!-- 邮箱 -->
          <view class="form-group">
            <text class="form-label">
              邮箱（选填）
            </text>
            <view class="input-with-icon">
              <text class="input-icon">
                ✉️
              </text>
              <input
                v-model="formData.email"
                class="form-input pl-icon"
                placeholder="请输入邮箱"
              >
            </view>
          </view>
        </view>

        <!-- 专业信息 -->
        <view class="form-section">
          <text class="form-section-title">
            📖 专业信息
          </text>
          <!-- 擅长领域 -->
          <view class="form-group">
            <text class="form-label">
              擅长领域 <text class="required">
                *
              </text>（可多选）
            </text>
            <view class="tag-group">
              <text
                v-for="s in specialtyOptions"
                :key="s"
                class="tag-select"
                :class="{ 'tag-selected': formData.specialties.includes(s) }"
                @click="toggleSpecialty(s)"
              >
                {{ s }}
              </text>
            </view>
            <text
              v-if="errors.specialties"
              class="error-text"
            >
              {{ errors.specialties }}
            </text>
          </view>
          <!-- 经历 -->
          <view class="form-group">
            <text class="form-label">
              从业/学习经历 <text class="required">
                *
              </text>
            </text>
            <textarea
              v-model="formData.experience"
              class="form-textarea"
              :class="{ 'input-error': errors.experience }"
              placeholder="请描述您的从业或学习经历，如师承、研究年限等"
              @input="clearError('experience')"
            />
            <text
              v-if="errors.experience"
              class="error-text"
            >
              {{ errors.experience }}
            </text>
          </view>
          <!-- 简介 -->
          <view class="form-group">
            <text class="form-label">
              个人简介 <text class="required">
                *
              </text>
            </text>
            <textarea
              v-model="formData.introduction"
              class="form-textarea"
              :class="{ 'input-error': errors.introduction }"
              placeholder="请详细介绍您自己，包括专业背景、教学理念等（至少50字）"
              @input="clearError('introduction')"
            />
            <view class="form-footer-text">
              <text
                v-if="errors.introduction"
                class="error-text"
              >
                {{ errors.introduction }}
              </text>
              <text class="char-count">
                {{ formData.introduction.length }}/50
              </text>
            </view>
          </view>
        </view>

        <!-- 资质证明 -->
        <view class="form-section">
          <text class="form-section-title">
            🏆 资质证明（选填）
          </text>
          <text class="form-tip">
            上传相关资质证书、学历证明等，提高审核通过率
          </text>
          <view class="cert-grid">
            <view
              v-for="(cert, idx) in formData.certificates"
              :key="idx"
              class="cert-item"
            >
              <image
                :src="cert"
                mode="aspectFill"
                class="cert-img"
              />
              <view
                class="cert-remove"
                @click="removeCertificate(idx)"
              >
                ✕
              </view>
            </view>
            <view
              v-if="(formData.certificates?.length || 0) < 6"
              class="cert-add"
              @click="handleUploadCertificate"
            >
              <text class="cert-add-icon">
                📷
              </text>
              <text class="cert-add-text">
                拍照上传
              </text>
            </view>
          </view>
        </view>

        <!-- 试讲视频 -->
        <view class="form-section">
          <text class="form-section-title">
            🎬 试讲视频（选填）
          </text>
          <text class="form-tip">
            提供一段3-5分钟的试讲视频链接，展示您的授课风格
          </text>
          <input
            v-model="formData.trialVideoUrl"
            class="form-input"
            placeholder="请输入视频链接（如B站、抖音等）"
          >
        </view>
      </view>

      <!-- 底部提交按钮 -->
      <view class="bottom-bar">
        <view class="bottom-bar-inner">
          <view
            class="btn btn-primary btn-block btn-lg"
            :class="{ 'btn-disabled': submitting }"
            @click="handleSubmit"
          >
            <text>{{ submitting ? '提交中...' : '提交申请' }}</text>
          </view>
          <text class="bottom-agreement">
            提交即表示您同意《讲师入驻协议》
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { instituteApi } from '../../api'

interface InstructorApplication {
  realName: string; phone: string; email?: string
  specialties: string[]; experience: string; introduction: string
  certificates?: string[]; trialVideoUrl?: string
  status?: string; submittedAt?: string; rejectReason?: string
}

const specialtyOptions = [
  '八字命理', '紫微斗数', '六爻占卜', '奇门遁甲',
  '风水堪舆', '面相手相', '姓名学', '周易研究',
  '道家文化', '佛学禅修', '中医养生', '茶道文化',
]

const existingApplication = ref<InstructorApplication | null>(null)
const submitting = ref(false)
const formData = ref<InstructorApplication>({
  realName: '', phone: '', email: '', specialties: [],
  experience: '', introduction: '', certificates: [], trialVideoUrl: '',
})
const errors = ref<Record<string, string>>({})

const appStatus = computed(() => existingApplication.value?.status || 'submitted')
const statusLabel = computed(() => {
  const map: Record<string, string> = { draft: '草稿', submitted: '已提交', reviewing: '审核中', approved: '已通过', rejected: '未通过' }
  return map[appStatus.value] || appStatus.value
})
const statusColor = computed(() => {
  const map: Record<string, string> = { draft: '#999', submitted: '#C9A96E', reviewing: '#C9A96E', approved: '#52c41a', rejected: '#ff4d4f' }
  return map[appStatus.value] || '#999'
})
const statusIcon = computed(() => {
  const map: Record<string, string> = { draft: '📄', submitted: '🕐', reviewing: '🔄', approved: '✅', rejected: '❌' }
  return map[appStatus.value] || '📄'
})

onMounted(() => loadApplication())

async function loadApplication() {
  try {
    const res = await instituteApi.myStatus()
    if (res) existingApplication.value = res
  } catch (e) { console.error(e) }
}

function validateForm(): boolean {
  const e: Record<string, string> = {}
  if (!formData.value.realName.trim()) e.realName = '请输入真实姓名'
  if (!formData.value.phone.trim()) e.phone = '请输入手机号码'
  else if (!/^1[3-9]\d{9}$/.test(formData.value.phone)) e.phone = '手机号码格式不正确'
  if (formData.value.specialties.length === 0) e.specialties = '请至少选择一个擅长领域'
  if (!formData.value.experience.trim()) e.experience = '请填写从业/学习经历'
  if (!formData.value.introduction.trim()) e.introduction = '请填写个人简介'
  else if (formData.value.introduction.length < 50) e.introduction = '个人简介至少50字'
  errors.value = e
  return Object.keys(e).length === 0
}

function clearError(key: string) {
  if (errors.value[key]) errors.value[key] = ''
}

function toggleSpecialty(s: string) {
  const idx = formData.value.specialties.indexOf(s)
  if (idx >= 0) formData.value.specialties.splice(idx, 1)
  else formData.value.specialties.push(s)
  if (errors.value.specialties) errors.value.specialties = ''
}

function handleUploadCertificate() {
  const url = `/placeholder.svg?cert=${(formData.value.certificates?.length || 0) + 1}`
  if (!formData.value.certificates) formData.value.certificates = []
  formData.value.certificates.push(url)
}

function removeCertificate(index: number) {
  formData.value.certificates?.splice(index, 1)
}

async function handleSubmit() {
  if (!validateForm() || submitting.value) return
  submitting.value = true
  try {
    await instituteApi.apply(formData.value)
    await loadApplication()
  } finally { submitting.value = false }
}

function goBack() { uni.navigateBack() }
function goInstitute() { uni.navigateTo({ url: '/pages/institute/index' }) }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 160rpx; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 10; background: rgba(245,240,232,0.95); border-bottom: 1rpx solid #E5E1DB; padding: 20rpx 24rpx; }
.nav-header-inner { display: flex; align-items: center; gap: 16rpx; }
.nav-back { font-size: 36rpx; color: #2C2C2C; padding: 4rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }

.section-padding, .content-wrap { padding: 24rpx; }

/* 状态卡片 */
.status-card { background: #fff; border-radius: 16rpx; border: 1rpx solid #E5E1DB; padding: 48rpx 32rpx; text-align: center; }
.status-icon-wrap { width: 96rpx; height: 96rpx; border-radius: 50%; margin: 0 auto 24rpx; display: flex; align-items: center; justify-content: center; }
.status-icon { font-size: 40rpx; }
.status-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 12rpx; display: block; }
.status-desc { display: block; font-size: 26rpx; color: #666; line-height: 1.6; }
.status-success { color: #52c41a; }
.status-fail { color: #ff4d4f; }

/* 卡片 */
.card { background: #fff; border-radius: 16rpx; border: 1rpx solid #E5E1DB; overflow: hidden; }
.card-header { padding: 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.info-row { display: flex; justify-content: space-between; padding: 20rpx 24rpx; border-bottom: 1rpx solid #E5E1DB; font-size: 26rpx; color: #2C2C2C; }
.info-label { color: #999; }
.info-block { padding: 20rpx 24rpx; }
.block { display: block; }
.mb-1 { margin-bottom: 8rpx; }
.mt-3 { margin-top: 24rpx; }

/* 标签 */
.tag-group { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag { font-size: 22rpx; padding: 6rpx 16rpx; background: #F5F0E8; border-radius: 6rpx; color: #666; }
.tag-primary { background: rgba(196,30,58,0.1); color: #C41E3A; }
.tag-select { font-size: 24rpx; padding: 10rpx 24rpx; border-radius: 32rpx; background: #F5F0E8; color: #666; border: 1rpx solid #E5E1DB; }
.tag-selected { background: #C41E3A; color: #fff; border-color: #C41E3A; }

/* 刷新 */
.refresh-btn { display: flex; justify-content: center; padding: 24rpx; }
.refresh-btn text { font-size: 26rpx; color: #666; }

/* 提示 */
.tip-box { display: flex; gap: 16rpx; background: rgba(196,30,58,0.05); border: 1rpx solid rgba(196,30,58,0.2); border-radius: 12rpx; padding: 24rpx; margin-bottom: 24rpx; }
.tip-icon { font-size: 36rpx; flex-shrink: 0; }
.tip-title { display: block; font-size: 26rpx; font-weight: 500; color: #C41E3A; margin-bottom: 4rpx; }
.tip-desc { display: block; font-size: 22rpx; color: #666; }

/* 表单 */
.form-section { margin-bottom: 32rpx; }
.form-section-title { display: block; font-size: 28rpx; font-weight: 500; margin-bottom: 20rpx; color: #2C2C2C; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: #666; margin-bottom: 12rpx; }
.required { color: #ff4d4f; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.form-textarea { width: 100%; padding: 20rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; min-height: 160rpx; box-sizing: border-box; }
.input-error { border-color: #ff4d4f; }
.error-text { color: #ff4d4f; font-size: 22rpx; margin-top: 8rpx; display: block; }
.input-with-icon { position: relative; }
.input-icon { position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; color: #999; }
.pl-icon { padding-left: 56rpx; }
.form-footer-text { display: flex; justify-content: space-between; margin-top: 8rpx; }
.char-count { font-size: 22rpx; color: #999; }
.form-tip { display: block; font-size: 22rpx; color: #999; margin-bottom: 16rpx; }

/* 证书 */
.cert-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cert-item { position: relative; aspect-ratio: 4/3; border-radius: 12rpx; overflow: hidden; border: 1rpx solid #E5E1DB; }
.cert-img { width: 100%; height: 100%; }
.cert-remove { position: absolute; top: 8rpx; right: 8rpx; width: 36rpx; height: 36rpx; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20rpx; }
.cert-add { aspect-ratio: 4/3; border-radius: 12rpx; border: 2rpx dashed #E5E1DB; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; color: #999; }
.cert-add-icon { font-size: 48rpx; }
.cert-add-text { font-size: 22rpx; }

/* 按钮 */
.btn { display: flex; align-items: center; justify-content: center; padding: 16rpx 40rpx; border-radius: 12rpx; font-size: 28rpx; font-weight: 500; }
.btn-primary { background: #C41E3A; color: #fff; }
.btn-outline { background: transparent; color: #C41E3A; border: 1rpx solid #C41E3A; }
.btn-block { width: 100%; }
.btn-lg { padding: 24rpx; font-size: 30rpx; }
.btn-disabled { opacity: 0.6; }

/* 底部 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #F5F0E8; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: env(safe-area-inset-bottom); }
.bottom-bar-inner { text-align: center; }
.bottom-agreement { display: block; font-size: 22rpx; color: #999; margin-top: 12rpx; }
</style>
