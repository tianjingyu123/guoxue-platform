<template>
  <view class="page">
    <app-nav-bar
      title="修改密码"
      :back-icon="'arrow-left'"
      :back-size="40"
      :title-size="32"
      :title-weight="600"
      :bar-height="112"
    />

    <!-- 成功页 -->
    <view
      v-if="isSuccess"
      class="success"
    >
      <view class="success-ic">
        <app-icon
          name="check"
          :size="56"
          color="#2ecc71"
        />
      </view>
      <text class="success-title">
        密码修改成功
      </text>
      <text class="success-sub">
        请重新登录以确保账号安全
      </text>
      <view
        class="relogin"
        @click="go('/login')"
      >
        <text class="relogin-txt">
          重新登录
        </text>
      </view>
    </view>

    <view
      v-else
      class="container"
    >
      <!-- 当前密码 -->
      <view class="field">
        <text class="label">
          当前密码
        </text>
        <view class="input-card">
          <input
            v-model="oldPassword"
            class="input"
            :password="!showOld"
            placeholder="请输入当前密码"
            placeholder-class="ph"
            @input="oldPasswordError = ''"
          >
          <view
            class="eye"
            @click="showOld = !showOld"
          >
            <app-icon
              :name="showOld ? 'eye-off' : 'eye'"
              :size="36"
              color="#999"
            />
          </view>
        </view>
        <view
          v-if="oldPasswordError"
          class="err"
        >
          <app-icon
            name="alert-circle"
            :size="22"
            color="#e74c3c"
          />
          <text class="err-txt">
            {{ oldPasswordError }}
          </text>
        </view>
      </view>

      <!-- 新密码 -->
      <view class="field">
        <text class="label">
          新密码
        </text>
        <view class="input-card">
          <input
            v-model="newPassword"
            class="input"
            :password="!showNew"
            placeholder="请输入新密码"
            placeholder-class="ph"
          >
          <view
            class="eye"
            @click="showNew = !showNew"
          >
            <app-icon
              :name="showNew ? 'eye-off' : 'eye'"
              :size="36"
              color="#999"
            />
          </view>
        </view>

        <!-- 强度条 -->
        <view
          v-if="newPassword"
          class="strength"
        >
          <view class="strength-head">
            <text class="strength-label">
              密码强度
            </text>
            <text
              class="strength-txt"
              :class="strengthClass"
            >
              {{ strength.text }}
            </text>
          </view>
          <view class="bars">
            <view
              v-for="lv in 3"
              :key="lv"
              class="bar"
              :class="lv <= strength.level ? strengthBarClass : ''"
            />
          </view>
        </view>

        <!-- 规则 -->
        <view class="rules">
          <view
            class="rule"
            :class="{ 'rule-on': rules.length }"
          >
            <app-icon
              v-if="rules.length"
              name="check"
              :size="22"
              color="#2ecc71"
            />
            <view
              v-else
              class="rule-dot"
            />
            <text
              class="rule-txt"
              :class="{ 'rule-txt-on': rules.length }"
            >
              6-20位字符
            </text>
          </view>
          <view
            class="rule"
            :class="{ 'rule-on': rules.hasLetter }"
          >
            <app-icon
              v-if="rules.hasLetter"
              name="check"
              :size="22"
              color="#2ecc71"
            />
            <view
              v-else
              class="rule-dot"
            />
            <text
              class="rule-txt"
              :class="{ 'rule-txt-on': rules.hasLetter }"
            >
              包含字母
            </text>
          </view>
          <view
            class="rule"
            :class="{ 'rule-on': rules.hasNumber }"
          >
            <app-icon
              v-if="rules.hasNumber"
              name="check"
              :size="22"
              color="#2ecc71"
            />
            <view
              v-else
              class="rule-dot"
            />
            <text
              class="rule-txt"
              :class="{ 'rule-txt-on': rules.hasNumber }"
            >
              包含数字
            </text>
          </view>
        </view>
      </view>

      <!-- 确认新密码 -->
      <view class="field">
        <text class="label">
          确认新密码
        </text>
        <view class="input-card">
          <input
            v-model="confirmPassword"
            class="input"
            :password="!showConfirm"
            placeholder="请再次输入新密码"
            placeholder-class="ph"
          >
          <view
            class="eye"
            @click="showConfirm = !showConfirm"
          >
            <app-icon
              :name="showConfirm ? 'eye-off' : 'eye'"
              :size="36"
              color="#999"
            />
          </view>
        </view>
        <view
          v-if="confirmPassword && !isConfirmMatch"
          class="err"
        >
          <app-icon
            name="alert-circle"
            :size="22"
            color="#e74c3c"
          />
          <text class="err-txt">
            两次输入的密码不一致
          </text>
        </view>
        <view
          v-if="confirmPassword && isConfirmMatch"
          class="ok"
        >
          <app-icon
            name="check"
            :size="22"
            color="#2ecc71"
          />
          <text class="ok-txt">
            密码一致
          </text>
        </view>
      </view>

      <!-- 提交 -->
      <view
        class="submit"
        :class="{ 'submit-on': canSubmit }"
        @click="handleSubmit"
      >
        <app-icon
          v-if="isSubmitting"
          name="loader-2"
          :size="28"
          color="#999"
          class="spin"
        />
        <text
          class="submit-txt"
          :class="{ 'submit-txt-on': canSubmit }"
        >
          {{ isSubmitting ? '提交中...' : '确认修改' }}
        </text>
      </view>

      <view
        class="forgot"
        @click="go('/forgot-password')"
      >
        <text class="forgot-txt">
          忘记原密码？
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showOld = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const oldPasswordError = ref('')
const isSubmitting = ref(false)
const isSuccess = ref(false)

const strength = computed(() => {
  const p = newPassword.value
  if (!p) return { level: 0, text: '' }
  let s = 0
  if (p.length >= 6) s++
  if (p.length >= 10) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(p)) s++
  if (s <= 2) return { level: 1, text: '弱' }
  if (s <= 3) return { level: 2, text: '中' }
  return { level: 3, text: '强' }
})
const strengthClass = computed(() => ['', 'st-weak', 'st-mid', 'st-strong'][strength.value.level])
const strengthBarClass = computed(() => ['', 'bar-weak', 'bar-mid', 'bar-strong'][strength.value.level])

const rules = computed(() => ({
  length: newPassword.value.length >= 6 && newPassword.value.length <= 20,
  hasLetter: /[a-zA-Z]/.test(newPassword.value),
  hasNumber: /\d/.test(newPassword.value),
}))
const isPasswordValid = computed(() => rules.value.length && rules.value.hasLetter && rules.value.hasNumber)
const isConfirmMatch = computed(() => confirmPassword.value === newPassword.value && confirmPassword.value.length > 0)
const canSubmit = computed(() => oldPassword.value.length > 0 && isPasswordValid.value && isConfirmMatch.value && !isSubmitting.value)

async function handleSubmit() {
  if (!canSubmit.value) return
  oldPasswordError.value = ''
  isSubmitting.value = true
  try {
    const res = await mineApi.changePassword(oldPassword.value, newPassword.value)
    if (res.success) {
      isSuccess.value = true
    } else {
      oldPasswordError.value = res.message || '修改失败'
    }
  } finally {
    isSubmitting.value = false
  }
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.container { padding: 32rpx 32rpx 64rpx; display: flex; flex-direction: column; gap: 48rpx; }
.field { display: flex; flex-direction: column; }
.label { font-size: 28rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 16rpx; }
.input-card { position: relative; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03); }
.input { width: 100%; box-sizing: border-box; padding: 26rpx 88rpx 26rpx 28rpx; font-size: 28rpx; color: #2c2c2c; }
.ph { color: #bbb; }
.eye { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); padding: 8rpx; }
.err { display: flex; align-items: center; gap: 6rpx; margin-top: 12rpx; }
.err-txt { font-size: 22rpx; color: #e74c3c; }
.ok { display: flex; align-items: center; gap: 6rpx; margin-top: 12rpx; }
.ok-txt { font-size: 22rpx; color: #2ecc71; }
.strength { margin-top: 24rpx; }
.strength-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.strength-label { font-size: 22rpx; color: #999; }
.strength-txt { font-size: 22rpx; font-weight: 500; }
.st-weak { color: #e74c3c; }
.st-mid { color: #f0a020; }
.st-strong { color: #2ecc71; }
.bars { display: flex; gap: 8rpx; }
.bar { height: 8rpx; flex: 1; border-radius: 999rpx; background: #ece7df; }
.bar-weak { background: #e74c3c; }
.bar-mid { background: #f0a020; }
.bar-strong { background: #2ecc71; }
.rules { margin-top: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.rule { display: flex; align-items: center; gap: 12rpx; }
.rule-dot { width: 22rpx; height: 22rpx; border-radius: 50%; border: 2rpx solid #bbb; box-sizing: border-box; }
.rule-txt { font-size: 22rpx; color: #999; }
.rule-txt-on { color: #2ecc71; }
.submit { width: 100%; height: 88rpx; border-radius: 20rpx; background: #f0ece5; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.submit-on { background: #c41e3a; }
.submit-txt { font-size: 30rpx; font-weight: 500; color: #bbb; }
.submit-txt-on { color: #fff; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.forgot { display: flex; justify-content: center; }
.forgot-txt { font-size: 28rpx; color: #c41e3a; }
.success { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 180rpx; }
.success-ic { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(46,204,113,0.18); display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.success-title { font-size: 38rpx; font-weight: 600; color: #2c2c2c; margin-bottom: 16rpx; }
.success-sub { font-size: 26rpx; color: #999; margin-bottom: 64rpx; }
.relogin { width: 480rpx; height: 88rpx; border-radius: 20rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.relogin-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
