<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mineApi, pwdRules, calcPwdStrength } from '@/lib/mine-data'

const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')
const showOld = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const errors = ref<Record<string, string>>({})
const loading = ref(false)
const toast = ref<{ msg: string; type: 'success' | 'error' } | null>(null)

const strength = computed(() => calcPwdStrength(newPwd.value))
const strengthColorClass = computed(() => {
  const s = strength.value.score
  if (s <= 2) return '#f97316'
  if (s === 3) return '#ca8a04'
  return '#16a34a'
})

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.value = { msg, type }
  setTimeout(() => (toast.value = null), 2500)
}

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
  if (!validate() || loading.value) return
  loading.value = true
  try {
    await mineApi.changePassword(oldPwd.value, newPwd.value)
    showToast('密码修改成功', 'success')
    setTimeout(() => goBack(), 1000)
  } catch (e: any) {
    showToast(e?.message || '修改失败', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page">
    <!-- 导航 -->
    <app-nav-bar title="修改密码" title-align="left" serif-title />

    <scroll-view scroll-y class="scroll">
      <view class="container">
        <!-- 提示 -->
        <view class="tip">
          <text class="tip-text">为保护账号安全，修改密码后所有设备将重新登录。请妥善保管新密码。</text>
        </view>

        <!-- 表单 -->
        <view class="card">
          <view class="field">
            <text class="field-label">当前密码</text>
            <view class="input-wrap" :class="{ error: errors.oldPwd }">
              <AppIcon name="lock" :size="16" color="#999" />
              <input
                class="input"
                :password="!showOld"
                v-model="oldPwd"
                placeholder="请输入当前登录密码"
                placeholder-class="ph"
              />
              <view @tap="showOld = !showOld">
                <AppIcon :name="showOld ? 'eye-off' : 'eye'" :size="16" color="#999" />
              </view>
            </view>
            <text v-if="errors.oldPwd" class="err">{{ errors.oldPwd }}</text>
          </view>

          <view class="field">
            <text class="field-label">新密码</text>
            <view class="input-wrap" :class="{ error: errors.newPwd }">
              <AppIcon name="lock" :size="16" color="#999" />
              <input
                class="input"
                :password="!showNew"
                v-model="newPwd"
                placeholder="请设置新密码"
                placeholder-class="ph"
              />
              <view @tap="showNew = !showNew">
                <AppIcon :name="showNew ? 'eye-off' : 'eye'" :size="16" color="#999" />
              </view>
            </view>
            <text v-if="errors.newPwd" class="err">{{ errors.newPwd }}</text>
          </view>

          <!-- 强度条 -->
          <view v-if="newPwd.length > 0" class="strength">
            <view class="strength-head">
              <text class="strength-label">密码强度</text>
              <text class="strength-val" :style="{ color: strengthColorClass }">{{ strength.label }}</text>
            </view>
            <view class="strength-bars">
              <view
                v-for="i in 5"
                :key="i"
                class="strength-bar"
                :style="{ background: i <= strength.score ? strength.color : '#e5e7eb' }"
              />
            </view>
          </view>

          <view class="field">
            <text class="field-label">确认新密码</text>
            <view class="input-wrap" :class="{ error: errors.confirmPwd }">
              <AppIcon name="lock" :size="16" color="#999" />
              <input
                class="input"
                :password="!showConfirm"
                v-model="confirmPwd"
                placeholder="请再次输入新密码"
                placeholder-class="ph"
              />
              <view @tap="showConfirm = !showConfirm">
                <AppIcon :name="showConfirm ? 'eye-off' : 'eye'" :size="16" color="#999" />
              </view>
            </view>
            <text v-if="errors.confirmPwd" class="err">{{ errors.confirmPwd }}</text>
          </view>
        </view>

        <!-- 规则清单 -->
        <view class="card">
          <text class="rules-title">密码要求</text>
          <view v-for="rule in pwdRules" :key="rule.label" class="rule">
            <AppIcon
              v-if="newPwd.length > 0"
              :name="rule.test(newPwd) ? 'check-circle' : 'x-circle'"
              :size="16"
              :color="rule.test(newPwd) ? '#22c55e' : '#cbd5e1'"
            />
            <view v-else class="rule-empty" />
            <text class="rule-label" :style="{ color: newPwd.length > 0 && rule.test(newPwd) ? '#16a34a' : '#999' }">{{ rule.label }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 提交 -->
    <view class="footer">
      <view class="submit" :class="{ disabled: loading }" @tap="handleSubmit">
        <text class="submit-text">{{ loading ? '提交中...' : '确认修改' }}</text>
      </view>
    </view>

    <!-- toast -->
    <view v-if="toast" class="toast" :class="toast.type">
      <text class="toast-text">{{ toast.msg }}</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

.scroll {
  flex: 1;
  height: 0;
}
.container {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.tip {
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 20rpx;
  padding: 28rpx;
}
.tip-text {
  font-size: 26rpx;
  color: #b45309;
  line-height: 1.6;
}
.card {
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.field-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.input-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 88rpx;
  padding: 0 28rpx;
  border-radius: 20rpx;
  border: 1rpx solid #e8e3db;
  background: #faf8f5;
}
.input-wrap.error {
  border-color: #ef4444;
}
.input {
  flex: 1;
  font-size: 28rpx;
  color: #2c2c2c;
}
.ph {
  color: #ccc;
}
.err {
  font-size: 22rpx;
  color: #ef4444;
}
.strength {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.strength-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.strength-label {
  font-size: 22rpx;
  color: #999;
}
.strength-val {
  font-size: 22rpx;
}
.strength-bars {
  display: flex;
  gap: 8rpx;
}
.strength-bar {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
}
.rules-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rule {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.rule-empty {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 1rpx solid #e8e3db;
}
.rule-label {
  font-size: 26rpx;
}
.footer {
  position: sticky;
  bottom: 0;
  background: #faf8f5;
  border-top: 1rpx solid #e8e3db;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.submit {
  height: 88rpx;
  border-radius: 20rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit.disabled {
  opacity: 0.6;
}
.submit-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
.toast {
  position: fixed;
  top: 160rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 20rpx 40rpx;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
}
.toast.success {
  background: #16a34a;
}
.toast.error {
  background: #dc2626;
}
.toast-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}
</style>
