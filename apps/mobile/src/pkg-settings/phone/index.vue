<template>
  <view class="page">
    <app-nav-bar title="修改手机号" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <!-- 成功页 -->
    <view v-if="step === 3" class="success">
      <view class="success-ic"><app-icon name="check" :size="56" color="#2ecc71" /></view>
      <text class="success-title">手机号修改成功</text>
      <text class="success-sub">新手机号：{{ maskPhone(newPhone) }}</text>
      <text class="success-tip">3秒后自动返回设置页...</text>
    </view>

    <view v-else>
      <!-- 步骤指示器 -->
      <view class="steps">
        <view class="step-item">
          <view class="step-dot" :class="{ 'dot-on': step >= 1 }">
            <app-icon v-if="step > 1" name="check" :size="22" color="#fff" />
            <text v-else class="dot-num" :class="{ 'num-on': step >= 1 }">1</text>
          </view>
          <text class="step-label" :class="{ 'label-on': step >= 1 }">验证身份</text>
        </view>
        <view class="step-line" :class="{ 'line-on': step >= 2 }" />
        <view class="step-item">
          <view class="step-dot" :class="{ 'dot-on': step >= 2 }">
            <text class="dot-num" :class="{ 'num-on': step >= 2 }">2</text>
          </view>
          <text class="step-label" :class="{ 'label-on': step >= 2 }">绑定新号</text>
        </view>
      </view>

      <view class="main">
        <!-- 第一步 -->
        <view v-if="step === 1" class="card">
          <text class="card-title">验证当前手机号</text>
          <text class="card-sub">为保障账号安全，请先验证当前绑定的手机号</text>

          <view class="field">
            <text class="field-label">当前手机号</text>
            <view class="readonly"><text class="readonly-txt">{{ currentPhone }}</text></view>
          </view>

          <view class="field">
            <text class="field-label">验证码</text>
            <view class="code-row">
              <input
                class="code-input" :class="{ 'input-err': currentCodeError }"
                type="text" maxlength="6" v-model="currentCode"
                placeholder="请输入6位验证码" placeholder-class="ph"
                @input="currentCodeError = ''"
              />
              <view class="code-btn" :class="{ 'btn-dis': currentCountdown > 0 || currentSending }" @click="sendCurrentCode">
                <text class="code-btn-txt" :class="{ 'txt-dis': currentCountdown > 0 || currentSending }">
                  {{ currentSending ? '发送中' : currentCountdown > 0 ? `${currentCountdown}s` : '获取验证码' }}
                </text>
              </view>
            </view>
            <view v-if="currentCodeError" class="err">
              <app-icon name="alert-circle" :size="22" color="#e74c3c" />
              <text class="err-txt">{{ currentCodeError }}</text>
            </view>
          </view>

          <view class="submit" :class="{ 'submit-on': currentCode.length === 6 && !currentVerifying }" @click="verifyCurrentPhone">
            <text class="submit-txt" :class="{ 'submit-txt-on': currentCode.length === 6 && !currentVerifying }">下一步</text>
          </view>
        </view>

        <!-- 第二步 -->
        <view v-if="step === 2" class="card">
          <text class="card-title">绑定新手机号</text>
          <text class="card-sub">请输入您要绑定的新手机号</text>

          <view class="field">
            <text class="field-label">新手机号</text>
            <input class="text-input" type="text" maxlength="11" v-model="newPhone" placeholder="请输入新手机号" placeholder-class="ph" />
          </view>

          <view class="field">
            <text class="field-label">验证码</text>
            <view class="code-row">
              <input
                class="code-input" :class="{ 'input-err': newCodeError }"
                type="text" maxlength="6" v-model="newCode"
                placeholder="请输入6位验证码" placeholder-class="ph"
                @input="newCodeError = ''"
              />
              <view class="code-btn" :class="{ 'btn-dis': newCountdown > 0 || newSending || !validPhone(newPhone) }" @click="sendNewCode">
                <text class="code-btn-txt" :class="{ 'txt-dis': newCountdown > 0 || newSending || !validPhone(newPhone) }">
                  {{ newSending ? '发送中' : newCountdown > 0 ? `${newCountdown}s` : '获取验证码' }}
                </text>
              </view>
            </view>
            <view v-if="newCodeError" class="err">
              <app-icon name="alert-circle" :size="22" color="#e74c3c" />
              <text class="err-txt">{{ newCodeError }}</text>
            </view>
          </view>

          <view class="submit" :class="{ 'submit-on': newCode.length === 6 && validPhone(newPhone) && !newVerifying }" @click="bindNewPhone">
            <text class="submit-txt" :class="{ 'submit-txt-on': newCode.length === 6 && validPhone(newPhone) && !newVerifying }">确认绑定</text>
          </view>
          <view class="back-step" @click="backToStep1"><text class="back-step-txt">返回上一步</text></view>
        </view>
      </view>
    </view>

    <!-- 手机号已被绑定弹窗 -->
    <view v-if="phoneExistsModal" class="mask" @click="phoneExistsModal = false">
      <view class="modal" @click.stop>
        <view class="modal-ic"><app-icon name="alert-circle" :size="36" color="#e74c3c" /></view>
        <text class="modal-title">手机号已被绑定</text>
        <text class="modal-sub">该手机号已被其他账号绑定，请更换其他手机号或找回原账号。</text>
        <view class="modal-btns">
          <view class="modal-btn modal-btn-ghost" @click="resetNewPhone"><text class="modal-btn-ghost-txt">更换手机号</text></view>
          <view class="modal-btn modal-btn-primary" @click="go('/auth/recover')"><text class="modal-btn-primary-txt">找回原账号</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

const step = ref<1 | 2 | 3>(1)
const currentPhone = '138****8888'

const currentCode = ref('')
const currentCodeError = ref('')
const currentCountdown = ref(0)
const currentSending = ref(false)
const currentVerifying = ref(false)

const newPhone = ref('')
const newCode = ref('')
const newCodeError = ref('')
const newCountdown = ref(0)
const newSending = ref(false)
const newVerifying = ref(false)
const phoneExistsModal = ref(false)

let curTimer: any = null
let newTimer: any = null

function validPhone(p: string) {
  return /^1[3-9]\d{9}$/.test(p)
}
function maskPhone(p: string) {
  return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function tick(countRef: any, timerHolder: 'cur' | 'new') {
  const t = setInterval(() => {
    if (countRef.value > 0) countRef.value--
    else clearInterval(t)
  }, 1000)
  if (timerHolder === 'cur') curTimer = t
  else newTimer = t
}

async function sendCurrentCode() {
  if (currentCountdown.value > 0 || currentSending.value) return
  currentSending.value = true
  currentCodeError.value = ''
  await new Promise((r) => setTimeout(r, 800))
  currentSending.value = false
  currentCountdown.value = 60
  tick(currentCountdown, 'cur')
}

async function verifyCurrentPhone() {
  if (currentCode.value.length !== 6 || currentVerifying.value) return
  currentVerifying.value = true
  currentCodeError.value = ''
  await new Promise((r) => setTimeout(r, 1000))
  if (currentCode.value === '123456') {
    step.value = 2
  } else if (currentCode.value === '000000') {
    currentCodeError.value = '验证码已过期，请重新获取'
  } else {
    currentCodeError.value = '验证码错误，请重新输入'
  }
  currentVerifying.value = false
}

async function sendNewCode() {
  if (newCountdown.value > 0 || newSending.value || !validPhone(newPhone.value)) return
  newSending.value = true
  newCodeError.value = ''
  await new Promise((r) => setTimeout(r, 800))
  newSending.value = false
  newCountdown.value = 60
  tick(newCountdown, 'new')
}

async function bindNewPhone() {
  if (newCode.value.length !== 6 || !validPhone(newPhone.value) || newVerifying.value) return
  newVerifying.value = true
  newCodeError.value = ''
  await new Promise((r) => setTimeout(r, 1000))
  if (newPhone.value === '13900001111') {
    phoneExistsModal.value = true
    newVerifying.value = false
    return
  }
  if (newCode.value === '123456') {
    step.value = 3
  } else if (newCode.value === '000000') {
    newCodeError.value = '验证码已过期，请重新获取'
  } else {
    newCodeError.value = '验证码错误，请重新输入'
  }
  newVerifying.value = false
}

function backToStep1() {
  step.value = 1
  currentCode.value = ''
  currentCodeError.value = ''
}
function resetNewPhone() {
  phoneExistsModal.value = false
  newPhone.value = ''
  newCode.value = ''
}
function go(path: string) {
  navigateTo(path)
}

// 成功后3秒自动返回
watch(step, (v) => {
  if (v === 3) {
    setTimeout(() => uni.navigateBack(), 3000)
  }
})
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.success { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; }
.success-ic { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(46,204,113,0.18); display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.success-title { font-size: 38rpx; font-weight: 600; color: #2c2c2c; margin-bottom: 16rpx; }
.success-sub { font-size: 26rpx; color: #999; margin-bottom: 8rpx; }
.success-tip { font-size: 22rpx; color: #bbb; }
.steps { display: flex; align-items: center; justify-content: center; gap: 24rpx; padding: 32rpx 48rpx; }
.step-item { display: flex; align-items: center; gap: 14rpx; }
.step-dot { width: 48rpx; height: 48rpx; border-radius: 50%; background: #ece7df; display: flex; align-items: center; justify-content: center; }
.step-dot.dot-on { background: var(--brand); }
.dot-num { font-size: 24rpx; font-weight: 500; color: #999; }
.dot-num.num-on { color: #fff; }
.step-label { font-size: 26rpx; color: #999; }
.step-label.label-on { color: #2c2c2c; }
.step-line { width: 96rpx; height: 3rpx; background: #ece7df; }
.step-line.line-on { background: var(--brand); }
.main { padding: 0 24rpx 180rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 40rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03); }
.card-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; display: block; margin-bottom: 8rpx; }
.card-sub { font-size: 26rpx; color: #999; display: block; margin-bottom: 40rpx; }
.field { margin-bottom: 32rpx; }
.field-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 12rpx; }
.readonly { height: 88rpx; padding: 0 28rpx; border-radius: 18rpx; background: #f5f1ea; display: flex; align-items: center; }
.readonly-txt { font-size: 30rpx; color: #2c2c2c; font-weight: 500; }
.text-input { height: 88rpx; padding: 0 28rpx; border-radius: 18rpx; background: #f5f1ea; font-size: 28rpx; color: #2c2c2c; border: 2rpx solid transparent; }
.code-row { display: flex; gap: 20rpx; }
.code-input { flex: 1; height: 88rpx; padding: 0 28rpx; border-radius: 18rpx; background: #f5f1ea; font-size: 28rpx; color: #2c2c2c; border: 2rpx solid transparent; }
.input-err { border-color: #e74c3c; }
.ph { color: #bbb; }
.code-btn { padding: 0 28rpx; height: 88rpx; border-radius: 18rpx; background: rgba(196,30,46,0.1); display: flex; align-items: center; justify-content: center; }
.code-btn.btn-dis { background: #f0ece5; }
.code-btn-txt { font-size: 26rpx; color: var(--brand); font-weight: 500; white-space: nowrap; }
.code-btn-txt.txt-dis { color: #bbb; }
.err { display: flex; align-items: center; gap: 6rpx; margin-top: 12rpx; }
.err-txt { font-size: 22rpx; color: #e74c3c; }
.submit { width: 100%; height: 88rpx; border-radius: 18rpx; background: #f0ece5; display: flex; align-items: center; justify-content: center; margin-top: 8rpx; }
.submit-on { background: var(--brand); }
.submit-txt { font-size: 30rpx; font-weight: 500; color: #bbb; }
.submit-txt-on { color: #fff; }
.back-step { margin-top: 24rpx; display: flex; justify-content: center; }
.back-step-txt { font-size: 26rpx; color: #999; }
.mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.modal { width: 100%; max-width: 560rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; }
.modal-ic { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(231,76,60,0.18); display: flex; align-items: center; justify-content: center; margin: 0 auto 32rpx; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; text-align: center; display: block; margin-bottom: 16rpx; }
.modal-sub { font-size: 26rpx; color: #999; text-align: center; display: block; margin-bottom: 40rpx; line-height: 1.5; }
.modal-btns { display: flex; gap: 24rpx; }
.modal-btn { flex: 1; height: 80rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; }
.modal-btn-ghost { background: #f5f1ea; }
.modal-btn-ghost-txt { font-size: 28rpx; color: #2c2c2c; font-weight: 500; }
.modal-btn-primary { background: var(--brand); }
.modal-btn-primary-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
