<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">←</text>
        <text class="header-title">修改密码</text>
        <view class="header-right" />
      </view>
    </view>

    <view class="tip-card">
      <text class="tip-text">为保护账号安全，修改密码后所有设备将重新登录。请妥善保管新密码。</text>
    </view>

    <view class="form-card">
      <!-- 当前密码 -->
      <view class="form-group">
        <text class="form-label">当前密码</text>
        <view class="form-input-wrap">
          <text class="form-input-icon">🔒</text>
          <input
            v-model="oldPwd"
            :type="showOld ? 'text' : 'password'"
            class="form-input"
            placeholder="请输入当前登录密码"
          />
          <text class="form-toggle" @click="showOld = !showOld">{{ showOld ? '🙈' : '👁' }}</text>
        </view>
        <text v-if="errors.oldPwd" class="form-error">{{ errors.oldPwd }}</text>
      </view>

      <!-- 新密码 -->
      <view class="form-group">
        <text class="form-label">新密码</text>
        <view class="form-input-wrap">
          <text class="form-input-icon">🔒</text>
          <input
            v-model="newPwd"
            :type="showNew ? 'text' : 'password'"
            class="form-input"
            placeholder="请设置新密码"
          />
          <text class="form-toggle" @click="showNew = !showNew">{{ showNew ? '🙈' : '👁' }}</text>
        </view>
        <text v-if="errors.newPwd" class="form-error">{{ errors.newPwd }}</text>
      </view>

      <!-- 密码强度 -->
      <view v-if="newPwd.length > 0" class="strength-bar">
        <view class="strength-header">
          <text class="strength-label">密码强度</text>
          <text class="strength-value" :style="{ color: strength.color }">{{ strength.label }}</text>
        </view>
        <view class="strength-track">
          <view
            v-for="i in 5"
            :key="i"
            class="strength-seg"
            :class="{ active: i <= strength.score }"
            :style="{ backgroundColor: i <= strength.score ? strength.bgColor : '#E8E3DB' }"
          />
        </view>
      </view>

      <!-- 确认新密码 -->
      <view class="form-group">
        <text class="form-label">确认新密码</text>
        <view class="form-input-wrap">
          <text class="form-input-icon">🔒</text>
          <input
            v-model="confirmPwd"
            :type="showConfirm ? 'text' : 'password'"
            class="form-input"
            placeholder="请再次输入新密码"
          />
          <text class="form-toggle" @click="showConfirm = !showConfirm">{{ showConfirm ? '🙈' : '👁' }}</text>
        </view>
        <text v-if="errors.confirmPwd" class="form-error">{{ errors.confirmPwd }}</text>
      </view>
    </view>

    <!-- 密码要求 -->
    <view class="rules-card">
      <text class="rules-title">密码要求</text>
      <view v-for="rule in rules" :key="rule.label" class="rule-item">
        <text v-if="newPwd.length > 0 && rule.pass(newPwd)" class="rule-icon rule-pass">✓</text>
        <text v-else class="rule-icon rule-pending">○</text>
        <text class="rule-text" :class="{ 'rule-text-pass': newPwd.length > 0 && rule.pass(newPwd) }">{{ rule.label }}</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="bottom-bar">
      <view
        class="submit-btn"
        :class="{ disabled: submitting }"
        @click="handleSubmit"
      >
        {{ submitting ? '提交中...' : '确认修改' }}
      </view>
    </view>

    <!-- Toast -->
    <view v-if="toast" class="toast" :class="'toast-' + toast.type">
      <text>{{ toast.msg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')
const showOld = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const toast = ref<{ msg: string; type: 'success' | 'error' } | null>(null)

const rules = [
  { label: '长度至少 8 位', pass: (p: string) => p.length >= 8 },
  { label: '包含大写字母', pass: (p: string) => /[A-Z]/.test(p) },
  { label: '包含数字', pass: (p: string) => /[0-9]/.test(p) },
  { label: '包含特殊符号', pass: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const strength = computed(() => {
  const pwd = newPwd.value
  if (!pwd) return { score: 0, label: '', color: '#999', bgColor: '#E8E3DB' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score: 1, label: '弱', color: '#EF4444', bgColor: '#EF4444' }
  if (score <= 2) return { score: 2, label: '较弱', color: '#F59E0B', bgColor: '#F59E0B' }
  if (score <= 3) return { score: 3, label: '中', color: '#F59E0B', bgColor: '#F59E0B' }
  if (score <= 4) return { score: 4, label: '强', color: '#22C55E', bgColor: '#22C55E' }
  return { score: 5, label: '极强', color: '#16A34A', bgColor: '#16A34A' }
})

function validate() {
  const errs: Record<string, string> = {}
  if (!oldPwd.value) errs.oldPwd = '请输入当前密码'
  if (!newPwd.value) errs.newPwd = '请输入新密码'
  else if (newPwd.value.length < 8) errs.newPwd = '密码长度至少 8 位'
  else if (newPwd.value === oldPwd.value) errs.newPwd = '新密码不能与当前密码相同'
  if (!confirmPwd.value) errs.confirmPwd = '请确认新密码'
  else if (confirmPwd.value !== newPwd.value) errs.confirmPwd = '两次输入的密码不一致'
  errors.value = errs
  return Object.keys(errs).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  try {
    await new Promise((r) => setTimeout(r, 1200))
    showToast('密码修改成功', 'success')
    setTimeout(() => uni.navigateBack(), 1000)
  } catch {
    showToast('修改失败，请稍后重试', 'error')
  } finally {
    submitting.value = false
  }
}

function showToast(msg: string, type: 'success' | 'error') {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 2500)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 160rpx;
}
.header {
  background: #F5F0E8;
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

.tip-card {
  margin: 24rpx;
  background: #FFF8E1;
  border: 1rpx solid #FFE082;
  border-radius: 20rpx;
  padding: 24rpx;
}
.tip-text { font-size: 24rpx; color: #856404; line-height: 1.6; }

.form-card {
  margin: 0 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 10rpx; }
.form-input-wrap {
  display: flex; align-items: center; gap: 12rpx;
  padding: 0 24rpx; height: 88rpx;
  border-radius: 16rpx; border: 1rpx solid #E8E3DB;
  background: #F5F0E8;
}
.form-input-icon { font-size: 24rpx; }
.form-input { flex: 1; height: 100%; font-size: 26rpx; color: #2C2C2C; background: transparent; border: none; outline: none; }
.form-toggle { font-size: 28rpx; padding: 8rpx; }
.form-error { font-size: 22rpx; color: #EF4444; margin-top: 6rpx; display: block; }

/* 密码强度 */
.strength-bar { margin-bottom: 24rpx; }
.strength-header { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.strength-label { font-size: 22rpx; color: #999; }
.strength-value { font-size: 22rpx; font-weight: 500; }
.strength-track { display: flex; gap: 8rpx; }
.strength-seg { flex: 1; height: 10rpx; border-radius: 10rpx; background: #E8E3DB; transition: all 0.3s; }

.rules-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}
.rules-title { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.rule-item { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.rule-icon { font-size: 20rpx; width: 32rpx; text-align: center; }
.rule-pass { color: #22C55E; }
.rule-pending { color: #ccc; }
.rule-text { font-size: 24rpx; color: #999; }
.rule-text-pass { color: #22C55E; }

/* 底部提交 */
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 24rpx; background: #F5F0E8;
  border-top: 1rpx solid #E8E3DB;
}
.submit-btn {
  width: 100%; height: 88rpx; border-radius: 44rpx;
  background: #C41E3A; color: #fff;
  font-size: 28rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.submit-btn.disabled { opacity: 0.6; }

/* Toast */
.toast {
  position: fixed; top: 100rpx; left: 50%; transform: translateX(-50%);
  z-index: 1000; padding: 16rpx 40rpx; border-radius: 20rpx;
  font-size: 24rpx; color: #fff; font-weight: 500;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.15);
}
.toast-success { background: #22C55E; }
.toast-error { background: #EF4444; }
</style>
