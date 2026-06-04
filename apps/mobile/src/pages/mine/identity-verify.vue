<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        实名认证
      </text>
      <view style="width:60rpx" />
    </view>

    <scroll-view
      scroll-y
      class="content-scroll"
    >
      <!-- 认证状态 -->
      <view
        v-if="verifyStatus === 'verified'"
        class="status-card success"
      >
        <text class="status-icon">
          ✅
        </text>
        <text class="status-text">
          已实名认证
        </text>
        <text class="status-name">
          {{ profile.name }} {{ maskIdCard(profile.idCard) }}
        </text>
        <view class="verify-badge">
          已认证
        </view>
      </view>
      <view
        v-if="verifyStatus === 'pending'"
        class="status-card pending"
      >
        <text class="status-icon">
          ⏳
        </text>
        <text class="status-text">
          审核中
        </text>
        <text class="status-desc">
          您的认证资料已提交，预计1-3个工作日完成审核
        </text>
      </view>
      <view
        v-if="verifyStatus === 'rejected'"
        class="status-card rejected"
      >
        <text class="status-icon">
          ❌
        </text>
        <text class="status-text">
          审核未通过
        </text>
        <text class="status-desc">
          {{ rejectReason || '资料不符合要求，请重新提交' }}
        </text>
        <view
          class="retry-btn"
          @click="retryVerify"
        >
          重新认证
        </view>
      </view>

      <!-- 认证表单 -->
      <view
        v-if="verifyStatus === 'none' || showForm"
        class="form-section"
      >
        <view class="form-card">
          <text class="form-title">
            身份信息
          </text>
          <view class="form-item">
            <text class="form-label">
              真实姓名
            </text>
            <input
              v-model="name"
              class="form-input"
              placeholder="请输入真实姓名"
              maxlength="20"
            >
          </view>
          <view class="form-item">
            <text class="form-label">
              身份证号
            </text>
            <input
              v-model="idCard"
              class="form-input"
              placeholder="请输入18位身份证号码"
              maxlength="18"
              type="idcard"
            >
          </view>
        </view>

        <!-- 人脸识别 -->
        <view
          class="face-card"
          @click="faceVerify"
        >
          <view class="face-left">
            <text class="face-icon">
              😀
            </text>
            <view>
              <text class="face-title">
                人脸识别验证
              </text>
              <text class="face-desc">
                需保持面部清晰，光线充足
              </text>
            </view>
          </view>
          <text class="face-arrow">
            ›
          </text>
        </view>

        <!-- 提示信息 -->
        <view class="tip-card">
          <text class="tip-icon">
            ℹ️
          </text>
          <text class="tip-text">
            信息仅用于实名认证，平台严格保护您的个人隐私安全
          </text>
        </view>

        <!-- 提交按钮 -->
        <view
          class="submit-btn"
          :class="{ disabled: !canSubmit || submitting }"
          @click="submit"
        >
          <text>{{ submitting ? '提交中...' : '提交认证' }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { identityApi } from '../../api'

const name = ref('')
const idCard = ref('')
const verifyStatus = ref<'none' | 'pending' | 'verified' | 'rejected'>('none')
const showForm = ref(false)
const submitting = ref(false)
const rejectReason = ref('')
const profile = ref<any>({})

const canSubmit = computed(() => name.value.length >= 2 && idCard.value.length === 18)

onMounted(async () => {
  try {
    const res: any = await identityApi.getStatus()
    verifyStatus.value = res?.status || 'none'
    profile.value = res || {}
    if (res?.rejectReason) rejectReason.value = res.rejectReason
    if (verifyStatus.value === 'rejected') showForm.value = true
  } catch { verifyStatus.value = 'none' }
})

function maskIdCard(card: string): string {
  if (!card || card.length < 10) return ''
  return card.slice(0, 3) + '***********' + card.slice(-4)
}

async function faceVerify() {
  try {
    await identityApi.faceVerify()
    uni.showToast({ title: '人脸识别成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '人脸识别失败，请重试', icon: 'none' })
  }
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    await identityApi.verify({ name: name.value, idCard: idCard.value })
    verifyStatus.value = 'pending'
    uni.showToast({ title: '认证资料已提交', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败，请重试', icon: 'none' })
  } finally { submitting.value = false }
}

function retryVerify() { showForm.value = true; verifyStatus.value = 'none' }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 24rpx; }
.status-card { background: #fff; border-radius: 20rpx; padding: 40rpx 32rpx; text-align: center; margin-bottom: 24rpx; }
.status-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.status-text { font-size: 36rpx; font-weight: bold; color: #2C2C2C; display: block; }
.status-name { font-size: 28rpx; color: #666; display: block; margin-top: 12rpx; }
.status-desc { font-size: 26rpx; color: #666; display: block; margin-top: 12rpx; line-height: 1.6; }
.verify-badge { display: inline-block; padding: 6rpx 24rpx; background: #e8f5e9; color: #2e7d32; border-radius: 20rpx; font-size: 22rpx; margin-top: 16rpx; }
.retry-btn { display: inline-block; padding: 12rpx 40rpx; background: #C41E3A; color: #fff; border-radius: 28rpx; font-size: 26rpx; margin-top: 20rpx; }
.form-section { }
.form-card { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 20rpx; }
.form-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 24rpx; }
.form-item { margin-bottom: 20rpx; }
.form-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 8rpx; }
.form-input { width: 100%; padding: 16rpx 20rpx; background: #F5F0E8; border-radius: 12rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.face-card { background: #fff; border-radius: 20rpx; padding: 28rpx 32rpx; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.face-left { display: flex; align-items: center; gap: 16rpx; }
.face-icon { font-size: 40rpx; }
.face-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.face-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.face-arrow { font-size: 32rpx; color: #ccc; }
.tip-card { display: flex; align-items: flex-start; gap: 12rpx; background: #fff8e1; border-radius: 16rpx; padding: 20rpx; margin-bottom: 32rpx; }
.tip-icon { font-size: 28rpx; flex-shrink: 0; }
.tip-text { font-size: 24rpx; color: #8d6e00; line-height: 1.6; }
.submit-btn { width: 100%; padding: 22rpx; background: #C41E3A; color: #fff; border-radius: 48rpx; text-align: center; font-size: 30rpx; font-weight: 500; }
.submit-btn.disabled { background: #ccc; }
</style>
