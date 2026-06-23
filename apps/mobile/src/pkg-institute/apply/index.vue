<template>
  <view class="apply-page">
    <!-- 头部 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="onBack">
          <app-icon name="chevron-left" :size="44" color="#1a1a1a" />
        </view>
        <text class="nav-title">{{ existingApplication ? '申请状态' : '申请成为讲师' }}</text>
      </view>
    </view>

    <!-- 申请状态卡 -->
    <scroll-view v-if="existingApplication" scroll-y class="scroll" :style="{ top: navHeight + 'px' }">
      <view class="status-wrap">
        <view class="status-card">
          <view class="status-icon" :style="{ background: statusColor.bg, color: statusColor.color }">
            <app-icon :name="statusIcon" :size="56" :color="statusColor.color" />
          </view>
          <text class="status-title">{{ statusLabel }}</text>
          <text v-if="existingApplication.status === 'submitted'" class="status-desc">您的申请已提交，预计3-5个工作日内完成审核</text>
          <text v-else-if="existingApplication.status === 'reviewing'" class="status-desc">审核人员正在审核您的资料，请耐心等待</text>
          <view v-else-if="existingApplication.status === 'approved'">
            <text class="status-desc ok">恭喜您通过审核，已成为研究院讲师！</text>
            <view class="btn-primary mt-4" @tap="goInstitute"><text class="btn-primary-text">进入讲师中心</text></view>
          </view>
        </view>

        <!-- 申请信息 -->
        <view class="info-card">
          <view class="info-head"><text class="info-head-text">申请信息</text></view>
          <view class="info-row"><text class="info-label">姓名</text><text class="info-val">{{ existingApplication.realName }}</text></view>
          <view class="info-row"><text class="info-label">手机</text><text class="info-val">{{ existingApplication.phone }}</text></view>
          <view class="info-col">
            <text class="info-label">擅长领域</text>
            <view class="tag-wrap">
              <text v-for="s in existingApplication.specialties" :key="s" class="tag">{{ s }}</text>
            </view>
          </view>
          <view class="info-row"><text class="info-label">提交时间</text><text class="info-val">{{ existingApplication.submittedAt }}</text></view>
        </view>

        <view class="btn-outline mt-4" @tap="refreshStatus">
          <app-icon name="refresh-cw" :size="32" color="#1a1a1a" />
          <text class="btn-outline-text">刷新状态</text>
        </view>
      </view>
    </scroll-view>

    <!-- 申请表单 -->
    <scroll-view v-else scroll-y class="scroll" :style="{ top: navHeight + 'px' }">
      <view class="form-wrap">
        <!-- 提示 -->
        <view class="tip-card">
          <app-icon name="award" :size="40" color="#9a2e25" />
          <view class="tip-text">
            <text class="tip-title">成为研究院讲师</text>
            <text class="tip-desc">加入研究院讲师团队，分享您的学识，传承国学文化</text>
          </view>
        </view>

        <!-- 基本信息 -->
        <view class="section">
          <view class="section-title">
            <app-icon name="user" :size="32" color="#9a2e25" />
            <text class="section-title-text">基本信息</text>
          </view>
          <view class="field">
            <text class="label">真实姓名 <text class="req">*</text></text>
            <input class="input" :class="{ err: errors.realName }" placeholder="请输入真实姓名" v-model="form.realName" />
            <text v-if="errors.realName" class="err-text">{{ errors.realName }}</text>
          </view>
          <view class="field">
            <text class="label">手机号码 <text class="req">*</text></text>
            <input class="input" :class="{ err: errors.phone }" placeholder="请输入手机号码" v-model="form.phone" />
            <text v-if="errors.phone" class="err-text">{{ errors.phone }}</text>
          </view>
          <view class="field">
            <text class="label">邮箱（选填）</text>
            <input class="input" placeholder="请输入邮箱" v-model="form.email" />
          </view>
        </view>

        <!-- 专业信息 -->
        <view class="section">
          <view class="section-title">
            <app-icon name="book-open" :size="32" color="#9a2e25" />
            <text class="section-title-text">专业信息</text>
          </view>
          <view class="field">
            <text class="label">擅长领域 <text class="req">*</text>（可多选）</text>
            <view class="chip-wrap">
              <text
                v-for="sp in specialtyOptions"
                :key="sp"
                class="chip"
                :class="{ active: form.specialties.includes(sp) }"
                @tap="toggleSpecialty(sp)"
              >{{ sp }}</text>
            </view>
            <text v-if="errors.specialties" class="err-text">{{ errors.specialties }}</text>
          </view>
          <view class="field">
            <text class="label">从业/学习经历 <text class="req">*</text></text>
            <textarea class="textarea" :class="{ err: errors.experience }" placeholder="请描述您的从业或学习经历，如师承、研究年限等" v-model="form.experience" />
            <text v-if="errors.experience" class="err-text">{{ errors.experience }}</text>
          </view>
          <view class="field">
            <text class="label">个人简介 <text class="req">*</text></text>
            <textarea class="textarea" :class="{ err: errors.introduction }" placeholder="请详细介绍您自己，包括专业背景、教学理念等（至少50字）" v-model="form.introduction" />
            <view class="count-row">
              <text v-if="errors.introduction" class="err-text">{{ errors.introduction }}</text>
              <text v-else></text>
              <text class="count">{{ form.introduction.length }}/50</text>
            </view>
          </view>
        </view>

        <!-- 资质证明 -->
        <view class="section">
          <view class="section-title">
            <app-icon name="award" :size="32" color="#9a2e25" />
            <text class="section-title-text">资质证明（选填）</text>
          </view>
          <text class="section-hint">上传相关资质证书、学历证明等，提高审核通过率</text>
          <view class="cert-grid">
            <view v-for="(cert, i) in form.certificates" :key="i" class="cert-item">
              <image :src="cert" mode="aspectFill" class="cert-img" />
              <view class="cert-del" @tap="removeCertificate(i)"><app-icon name="x" :size="24" color="#fff" /></view>
            </view>
            <view v-if="form.certificates.length < 6" class="cert-add" @tap="uploadCertificate">
              <app-icon name="camera" :size="48" color="#999" />
              <text class="cert-add-text">拍照上传</text>
            </view>
          </view>
        </view>

        <!-- 试讲视频 -->
        <view class="section">
          <view class="section-title">
            <app-icon name="video" :size="32" color="#9a2e25" />
            <text class="section-title-text">试讲视频（选填）</text>
          </view>
          <text class="section-hint">提供一段3-5分钟的试讲视频链接，展示您的授课风格</text>
          <input class="input" placeholder="请输入视频链接（如B站、抖音等）" v-model="form.trialVideoUrl" />
        </view>
      </view>
    </scroll-view>

    <!-- 底部提交 -->
    <view v-if="!existingApplication" class="footer">
      <view class="btn-primary" :class="{ disabled: submitting }" @tap="onSubmit">
        <text class="btn-primary-text">{{ submitting ? '提交中...' : '提交申请' }}</text>
      </view>
      <text class="footer-hint">提交即表示您同意《讲师入驻协议》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, applicationStatusLabel, applicationStatusColor, type InstituteApplication } from '@/lib/institute-data'

const sysInfo = uni.getSystemInfoSync()
const statusBarHeight = ref(sysInfo.statusBarHeight || 20)
const navHeight = computed(() => statusBarHeight.value + 44)

const specialtyOptions = [
  '八字命理', '紫微斗数', '六爻占卜', '奇门遁甲',
  '风水堪舆', '面相手相', '姓名学', '周易研究',
  '道家文化', '佛学禅修', '中医养生', '茶道文化',
]

const submitting = ref(false)
const existingApplication = ref<InstituteApplication | null>(null)

const form = ref({
  realName: '',
  phone: '',
  email: '',
  specialties: [] as string[],
  experience: '',
  introduction: '',
  certificates: [] as string[],
  trialVideoUrl: '',
})
const errors = ref<Record<string, string>>({})

const statusLabel = computed(() => existingApplication.value ? applicationStatusLabel(existingApplication.value.status) : '')
const statusColor = computed(() => existingApplication.value ? applicationStatusColor(existingApplication.value.status) : { color: '#9a2e25', bg: 'rgba(154,46,37,0.1)' })
const statusIcon = computed(() => {
  const map: Record<string, string> = { draft: 'file-text', submitted: 'clock', reviewing: 'refresh-cw', approved: 'check-circle', rejected: 'x-circle' }
  return existingApplication.value ? (map[existingApplication.value.status] || 'clock') : 'clock'
})

function toggleSpecialty(sp: string) {
  const arr = form.value.specialties
  const idx = arr.indexOf(sp)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(sp)
  if (errors.value.specialties) errors.value.specialties = ''
}

function uploadCertificate() {
  form.value.certificates.push(`/placeholder.svg?height=200&width=300&text=证书${form.value.certificates.length + 1}`)
}
function removeCertificate(i: number) {
  form.value.certificates.splice(i, 1)
}

function validate(): boolean {
  const e: Record<string, string> = {}
  if (!form.value.realName.trim()) e.realName = '请输入真实姓名'
  if (!form.value.phone.trim()) e.phone = '请输入手机号码'
  else if (!/^1[3-9]\d{9}$/.test(form.value.phone)) e.phone = '手机号码格式不正确'
  if (form.value.specialties.length === 0) e.specialties = '请至少选择一个擅长领域'
  if (!form.value.experience.trim()) e.experience = '请填写从业/学习经历'
  if (!form.value.introduction.trim()) e.introduction = '请填写个人简介'
  else if (form.value.introduction.length < 50) e.introduction = '个人简介至少50字'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  if (submitting.value) return
  submitting.value = true
  try {
    const result = await instituteApi.applyMember({
      realName: form.value.realName,
      phone: form.value.phone,
      email: form.value.email,
      specialties: [...form.value.specialties],
      experience: form.value.experience,
      introduction: form.value.introduction,
      certificates: [...form.value.certificates],
      trialVideoUrl: form.value.trialVideoUrl,
      status: 'submitted',
    })
    if (result.success) {
      existingApplication.value = {
        realName: form.value.realName,
        phone: form.value.phone,
        email: form.value.email,
        specialties: [...form.value.specialties],
        experience: form.value.experience,
        introduction: form.value.introduction,
        certificates: [...form.value.certificates],
        trialVideoUrl: form.value.trialVideoUrl,
        status: 'submitted',
        submittedAt: new Date().toLocaleDateString('zh-CN').replace(/\//g, '-'),
      }
      uni.pageScrollTo({ scrollTop: 0, duration: 0 })
    } else {
      uni.showToast({ title: result.message || '申请失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '网络错误，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function refreshStatus() {
  uni.showToast({ title: '已是最新状态', icon: 'none' })
}
function goInstitute() {
  navigateTo('/institute')
}
function onBack() {
  goBack()
}
</script>

<style scoped>
.apply-page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; border-bottom: 1rpx solid #eee; }
.nav-inner { height: 88rpx; display: flex; align-items: center; padding: 0 16rpx; }
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #1a1a1a; margin-left: 8rpx; }
.scroll { position: fixed; left: 0; right: 0; bottom: 0; }

/* 状态卡 */
.status-wrap { padding: 32rpx; }
.status-card { background: #fff; border-radius: 24rpx; padding: 48rpx 32rpx; text-align: center; border: 1rpx solid #eee; }
.status-icon { width: 128rpx; height: 128rpx; border-radius: 50%; margin: 0 auto 32rpx; display: flex; align-items: center; justify-content: center; }
.status-title { font-size: 40rpx; font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 16rpx; }
.status-desc { font-size: 26rpx; color: #999; line-height: 1.5; display: block; }
.status-desc.ok { color: #16a34a; margin-bottom: 24rpx; }
.info-card { background: #fff; border-radius: 24rpx; margin-top: 32rpx; overflow: hidden; border: 1rpx solid #eee; }
.info-head { padding: 24rpx 28rpx; border-bottom: 1rpx solid #f0f0f0; }
.info-head-text { font-size: 30rpx; font-weight: 500; color: #1a1a1a; }
.info-row { padding: 24rpx 28rpx; display: flex; justify-content: space-between; align-items: center; border-bottom: 1rpx solid #f0f0f0; }
.info-col { padding: 24rpx 28rpx; border-bottom: 1rpx solid #f0f0f0; }
.info-label { font-size: 28rpx; color: #999; }
.info-val { font-size: 28rpx; color: #1a1a1a; }
.tag-wrap { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.tag { padding: 6rpx 16rpx; background: rgba(154,46,37,0.1); color: #9a2e25; border-radius: 8rpx; font-size: 24rpx; }

/* 表单 */
.form-wrap { padding: 32rpx; }
.tip-card { background: rgba(154,46,37,0.05); border: 1rpx solid rgba(154,46,37,0.2); border-radius: 16rpx; padding: 28rpx; display: flex; gap: 20rpx; }
.tip-text { flex: 1; }
.tip-title { font-size: 28rpx; font-weight: 500; color: #9a2e25; display: block; }
.tip-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; line-height: 1.5; }
.section { margin-top: 40rpx; }
.section-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.section-title-text { font-size: 30rpx; font-weight: 500; color: #1a1a1a; }
.section-hint { font-size: 24rpx; color: #999; margin-bottom: 24rpx; display: block; line-height: 1.5; }
.field { margin-bottom: 28rpx; }
.label { font-size: 26rpx; color: #999; margin-bottom: 12rpx; display: block; }
.req { color: #e11d48; }
.input { background: #fff; border: 1rpx solid #e5e5e5; border-radius: 12rpx; padding: 0 24rpx; height: 88rpx; font-size: 28rpx; color: #1a1a1a; }
.input.err { border-color: #e11d48; }
.textarea { background: #fff; border: 1rpx solid #e5e5e5; border-radius: 12rpx; padding: 24rpx; width: 100%; box-sizing: border-box; min-height: 180rpx; font-size: 28rpx; color: #1a1a1a; }
.textarea.err { border-color: #e11d48; }
.err-text { font-size: 22rpx; color: #e11d48; margin-top: 8rpx; display: block; }
.count-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.count { font-size: 22rpx; color: #999; }
.chip-wrap { display: flex; flex-wrap: wrap; gap: 16rpx; }
.chip { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 26rpx; border: 1rpx solid #e5e5e5; background: #fff; color: #1a1a1a; }
.chip.active { background: #9a2e25; color: #fff; border-color: #9a2e25; }
.cert-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.cert-item { position: relative; aspect-ratio: 4/3; border-radius: 12rpx; overflow: hidden; border: 1rpx solid #eee; }
.cert-img { width: 100%; height: 100%; }
.cert-del { position: absolute; top: 8rpx; right: 8rpx; width: 40rpx; height: 40rpx; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.cert-add { aspect-ratio: 4/3; border-radius: 12rpx; border: 2rpx dashed #ddd; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.cert-add-text { font-size: 22rpx; color: #999; }

/* 底部 */
.footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #eee; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); }
.btn-primary { background: #9a2e25; border-radius: 12rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.btn-primary.disabled { opacity: 0.6; }
.btn-primary-text { color: #fff; font-size: 30rpx; font-weight: 500; }
.btn-outline { background: #fff; border: 1rpx solid #e5e5e5; border-radius: 12rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.btn-outline-text { color: #1a1a1a; font-size: 28rpx; }
.footer-hint { font-size: 22rpx; color: #999; text-align: center; margin-top: 12rpx; display: block; }
.mt-4 { margin-top: 24rpx; }
</style>
