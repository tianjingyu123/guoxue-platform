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
        {{ hasOld ? '修改支付密码' : '设置支付密码' }}
      </text>
      <view style="width:60rpx" />
    </view>

    <view class="content">
      <view class="tip-banner">
        <text class="tip-icon">
          🔒
        </text>
        <text class="tip-text">
          支付密码用于资金交易时的安全验证，请设置为6位数字
        </text>
      </view>

      <view class="form-card">
        <!-- 原密码 -->
        <view
          v-if="hasOld"
          class="form-item"
        >
          <text class="form-label">
            原支付密码
          </text>
          <view class="pwd-input-wrap">
            <view
              v-for="i in 6"
              :key="i"
              class="pwd-dot"
              :class="{ filled: oldCode.length >= i }"
            />
          </view>
          <input
            v-model="oldCode"
            class="pwd-hidden-input"
            type="password"
            maxlength="6"
            inputmode="numeric"
            pattern="[0-9]*"
            @input="onOldInput"
          >
        </view>

        <view class="form-divider" />

        <!-- 新密码 -->
        <view class="form-item">
          <text class="form-label">
            {{ hasOld ? '新支付密码' : '设置支付密码' }}
          </text>
          <view class="pwd-input-wrap">
            <view
              v-for="i in 6"
              :key="i"
              class="pwd-dot"
              :class="{ filled: newCode.length >= i }"
            />
          </view>
          <input
            v-model="newCode"
            class="pwd-hidden-input"
            type="password"
            maxlength="6"
            inputmode="numeric"
            pattern="[0-9]*"
            @input="onNewInput"
          >
        </view>

        <view class="form-divider" />

        <!-- 确认密码 -->
        <view class="form-item">
          <text class="form-label">
            确认支付密码
          </text>
          <view class="pwd-input-wrap">
            <view
              v-for="i in 6"
              :key="i"
              class="pwd-dot"
              :class="{ filled: confirmCode.length >= i }"
            />
          </view>
          <input
            v-model="confirmCode"
            class="pwd-hidden-input"
            type="password"
            maxlength="6"
            inputmode="numeric"
            pattern="[0-9]*"
            @input="onConfirmInput"
          >
          <text
            v-if="confirmCode.length === 6 && confirmCode !== newCode"
            class="error-tip"
          >
            两次密码输入不一致
          </text>
        </view>
      </view>

      <!-- 虚拟数字键盘 -->
      <view
        v-if="showKeyboard"
        class="num-keyboard"
      >
        <view
          v-for="n in 9"
          :key="n"
          class="num-key"
          @click="pressNum(n)"
        >
          <text>{{ n }}</text>
        </view>
        <view
          class="num-key"
          @click="pressClear"
        >
          <text>C</text>
        </view>
        <view
          class="num-key"
          @click="pressNum(0)"
        >
          <text>0</text>
        </view>
        <view
          class="num-key"
          @click="pressBack"
        >
          <text>⌫</text>
        </view>
      </view>

      <view
        class="submit-btn"
        :class="{ disabled: !canSubmit }"
        @click="submit"
      >
        <text>确认</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { userApi } from '../../api'

const hasOld = ref(true)
const oldCode = ref('')
const newCode = ref('')
const confirmCode = ref('')
const showKeyboard = ref(false)
const submitting = ref(false)

const canSubmit = computed(() => {
  if (hasOld.value && oldCode.value.length !== 6) return false
  return newCode.value.length === 6 && confirmCode.value.length === 6 && newCode.value === confirmCode.value
})

function pressNum(n: number) {
  if (currentField.value === 'old' && oldCode.value.length < 6) oldCode.value += n
  else if (currentField.value === 'new' && newCode.value.length < 6) newCode.value += n
  else if (currentField.value === 'confirm' && confirmCode.value.length < 6) confirmCode.value += n
}
function pressBack() {
  if (currentField.value === 'old') oldCode.value = oldCode.value.slice(0, -1)
  else if (currentField.value === 'new') newCode.value = newCode.value.slice(0, -1)
  else if (currentField.value === 'confirm') confirmCode.value = confirmCode.value.slice(0, -1)
}
function pressClear() {
  if (currentField.value === 'old') oldCode.value = ''
  else if (currentField.value === 'new') newCode.value = ''
  else if (currentField.value === 'confirm') confirmCode.value = ''
}
const currentField = ref<'old' | 'new' | 'confirm'>('new')

function onOldInput(e: any) { currentField.value = 'old'; showKeyboard.value = true }
function onNewInput(e: any) { currentField.value = 'new'; showKeyboard.value = true }
function onConfirmInput(e: any) { currentField.value = 'confirm'; showKeyboard.value = true }

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    if (hasOld.value) await userApi.updatePaymentPassword({ oldPassword: oldCode.value, newPassword: newCode.value })
    else await userApi.setPaymentPassword({ password: newCode.value })
    uni.showToast({ title: '设置成功', icon: 'success' })
    setTimeout(() => goBack(), 1500)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '设置失败', icon: 'none' })
  } finally { submitting.value = false }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content { padding: 24rpx; }
.tip-banner { display: flex; align-items: flex-start; gap: 12rpx; background: #e3f2fd; border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.tip-icon { font-size: 28rpx; flex-shrink: 0; }
.tip-text { font-size: 24rpx; color: #1565c0; line-height: 1.6; }
.form-card { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx; }
.form-item { margin-bottom: 8rpx; }
.form-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 12rpx; }
.pwd-input-wrap { display: flex; gap: 16rpx; justify-content: center; margin-bottom: 8rpx; }
.pwd-dot { width: 60rpx; height: 60rpx; border-radius: 50%; border: 2rpx solid #ddd; }
.pwd-dot.filled { background: #C41E3A; border-color: #C41E3A; }
.pwd-hidden-input { position: absolute; opacity: 0; height: 0; width: 0; }
.form-divider { height: 1rpx; background: #f5f5f5; margin: 20rpx 0; }
.error-tip { font-size: 22rpx; color: #C41E3A; display: block; text-align: center; margin-top: 8rpx; }
.num-keyboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 24rpx; }
.num-key { padding: 24rpx; background: #fff; border-radius: 16rpx; text-align: center; font-size: 36rpx; color: #2C2C2C; }
.num-key:active { background: #f5f0e8; }
.submit-btn { width: 100%; padding: 22rpx; background: #C41E3A; color: #fff; border-radius: 48rpx; text-align: center; font-size: 30rpx; font-weight: 500; }
.submit-btn.disabled { background: #ccc; }
</style>
