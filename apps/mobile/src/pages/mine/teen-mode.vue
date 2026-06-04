<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          青少年模式
        </text>
        <text
          class="header-forgot"
          @click="showResetModal = true"
        >
          忘记密码
        </text>
      </view>
    </view>

    <!-- Banner -->
    <view class="banner">
      <view class="banner-icon-wrap">
        <text class="banner-icon">
          🛡
        </text>
      </view>
      <view class="banner-info">
        <text class="banner-title">
          守护青少年健康成长
        </text>
        <text class="banner-desc">
          开启后将限制使用时长、屏蔽不适内容，为青少年营造绿色健康的学习环境
        </text>
      </view>
    </view>

    <!-- 主开关 -->
    <view class="toggle-card">
      <view class="toggle-card-left">
        <view
          class="toggle-icon-wrap"
          :class="{ 'toggle-icon-active': settings.enabled }"
        >
          <text class="toggle-icon-text">
            🛡
          </text>
        </view>
        <view class="toggle-info">
          <text class="toggle-label">
            青少年模式
          </text>
          <text class="toggle-hint">
            {{ settings.enabled ? '已开启保护' : '点击开启' }}
          </text>
        </view>
      </view>
      <view
        class="toggle-switch"
        :class="{ 'toggle-on': settings.enabled }"
        @click="handleToggleMode"
      >
        <view
          class="toggle-thumb"
          :class="{ 'toggle-thumb-on': settings.enabled }"
        />
      </view>
    </view>

    <!-- 设置项 -->
    <view
      class="settings-section"
      :class="{ 'settings-disabled': !settings.enabled }"
    >
      <!-- 使用时长限制 -->
      <view class="settings-group">
        <view class="settings-group-header">
          <text class="settings-group-label">
            使用时长限制
          </text>
        </view>
        <view
          class="settings-row"
          @click="settings.enabled && (showTimeLimitSheet = true)"
        >
          <view class="settings-row-left">
            <view class="settings-row-icon-wrap siw-orange">
              <text class="settings-row-icon">
                ⏱
              </text>
            </view>
            <view class="settings-row-info">
              <text class="settings-row-label">
                每日使用时长
              </text>
              <text class="settings-row-hint">
                超时后需输入密码继续
              </text>
            </view>
          </view>
          <view class="settings-row-right">
            <text class="settings-row-value">
              {{ settings.dailyLimit }}分钟
            </text>
            <text class="settings-row-arrow">
              →
            </text>
          </view>
        </view>
      </view>

      <!-- 使用时段限制 -->
      <view class="settings-group">
        <view class="settings-group-header">
          <text class="settings-group-label">
            使用时段限制
          </text>
        </view>
        <view
          class="settings-row"
          @click="settings.enabled && (showTimeRangeSheet = true)"
        >
          <view class="settings-row-left">
            <view class="settings-row-icon-wrap siw-purple">
              <text class="settings-row-icon">
                🌙
              </text>
            </view>
            <view class="settings-row-info">
              <text class="settings-row-label">
                禁止使用时段
              </text>
              <text class="settings-row-hint">
                该时段内无法使用App
              </text>
            </view>
          </view>
          <view class="settings-row-right">
            <text class="settings-row-value">
              {{ padZero(settings.restrictedStartHour) }}:00 - {{ padZero(settings.restrictedEndHour) }}:00
            </text>
            <text class="settings-row-arrow">
              →
            </text>
          </view>
        </view>
        <view class="settings-row">
          <view class="settings-row-left">
            <text class="settings-row-plain">
              夜间自动开启深色模式
            </text>
          </view>
          <view
            class="toggle-switch toggle-sm"
            :class="{ 'toggle-on': settings.autoNightMode }"
            @click="settings.enabled && (settings.autoNightMode = !settings.autoNightMode)"
          >
            <view
              class="toggle-thumb toggle-thumb-sm"
              :class="{ 'toggle-thumb-on': settings.autoNightMode }"
            />
          </view>
        </view>
      </view>

      <!-- 内容过滤 -->
      <view class="settings-group">
        <view class="settings-group-header">
          <text class="settings-group-label">
            内容过滤
          </text>
        </view>
        <view
          class="settings-row"
          @click="settings.enabled && (showFilterSheet = true)"
        >
          <view class="settings-row-left">
            <view class="settings-row-icon-wrap siw-green">
              <text class="settings-row-icon">
                🔍
              </text>
            </view>
            <view class="settings-row-info">
              <text class="settings-row-label">
                内容过滤级别
              </text>
              <text class="settings-row-hint">
                控制可见内容范围
              </text>
            </view>
          </view>
          <view class="settings-row-right">
            <text class="settings-row-value">
              {{ settings.filterLevel === 'strict' ? '严格' : '适中' }}
            </text>
            <text class="settings-row-arrow">
              →
            </text>
          </view>
        </view>
      </view>

      <!-- 监护密码 -->
      <view class="settings-group">
        <view class="settings-group-header">
          <text class="settings-group-label">
            监护密码
          </text>
        </view>
        <view
          class="settings-row"
          @click="settings.enabled && openPasswordModal()"
        >
          <view class="settings-row-left">
            <view class="settings-row-icon-wrap siw-red">
              <text class="settings-row-icon">
                🔒
              </text>
            </view>
            <view class="settings-row-info">
              <text class="settings-row-label">
                修改监护密码
              </text>
              <text class="settings-row-hint">
                用于关闭模式或延长时间
              </text>
            </view>
          </view>
          <view class="settings-row-right">
            <text
              class="settings-row-badge"
              :class="settings.hasPassword ? 'badge-set' : 'badge-unset'"
            >
              {{ settings.hasPassword ? '已设置' : '未设置' }}
            </text>
            <text class="settings-row-arrow">
              →
            </text>
          </view>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tip-card">
        <text class="tip-icon">
          💡
        </text>
        <view class="tip-body">
          <text class="tip-title">
            温馨提示
          </text>
          <text class="tip-item">
            • 开启后部分功能将受限，如直播打赏、商城购物等
          </text>
          <text class="tip-item">
            • 内容将过滤为适合青少年观看的教育类内容
          </text>
          <text class="tip-item">
            • 使用时长达到限制后需输入监护密码解锁
          </text>
          <text class="tip-item">
            • 忘记密码可通过监护人身份证验证重置
          </text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view
        class="btn-save"
        @click="handleSave"
      >
        {{ saving ? '保存中...' : '保存设置' }}
      </view>
    </view>

    <!-- 设置监护密码弹窗 -->
    <view
      v-if="showPasswordModal"
      class="modal-overlay"
      @click="cancelPasswordModal"
    >
      <view
        class="modal-content"
        @click.stop
      >
        <text class="modal-title">
          {{ passwordStep === 'set' ? '设置监护密码' : '确认监护密码' }}
        </text>
        <text class="modal-desc">
          {{ passwordStep === 'set' ? '请设置4位数字密码' : '请再次输入密码确认' }}
        </text>

        <view class="pwd-input-row">
          <view
            v-for="(digit, idx) in (passwordStep === 'set' ? tempPassword : tempConfirm)"
            :key="idx"
            class="pwd-cell"
            :class="{ 'pwd-cell-active': idx === currentPwdIndex }"
            @click="focusPwdInput(idx)"
          >
            <text
              v-if="digit"
              class="pwd-dot"
            >
              ●
            </text>
          </view>
        </view>

        <!-- 数字键盘 -->
        <view class="num-keyboard">
          <view
            v-for="n in 9"
            :key="n"
            class="num-key"
            @click="pwdInput(String(n))"
          >
            <text class="num-key-text">
              {{ n }}
            </text>
          </view>
          <view class="num-key" />
          <view
            class="num-key"
            @click="pwdInput('0')"
          >
            <text class="num-key-text">
              0
            </text>
          </view>
          <view
            class="num-key num-key-del"
            @click="pwdDelete"
          >
            <text class="num-key-del-text">
              ⌫
            </text>
          </view>
        </view>

        <view class="modal-actions">
          <view
            class="modal-btn modal-btn-cancel"
            @click="cancelPasswordModal"
          >
            取消
          </view>
        </view>
      </view>
    </view>

    <!-- 验证密码弹窗 -->
    <view
      v-if="showVerifyModal"
      class="modal-overlay"
      @click="cancelVerifyModal"
    >
      <view
        class="modal-content"
        @click.stop
      >
        <text class="modal-title">
          验证监护密码
        </text>
        <text class="modal-desc">
          关闭青少年模式需要验证监护密码
        </text>

        <view class="pwd-input-row">
          <view
            v-for="(digit, idx) in verifyPassword"
            :key="idx"
            class="pwd-cell"
            :class="{ 'pwd-cell-active': idx === verifyIndex }"
            @click="focusVerifyInput(idx)"
          >
            <text
              v-if="digit"
              class="pwd-dot"
            >
              ●
            </text>
          </view>
        </view>

        <!-- 数字键盘 -->
        <view class="num-keyboard">
          <view
            v-for="n in 9"
            :key="n"
            class="num-key"
            @click="verifyInput(String(n))"
          >
            <text class="num-key-text">
              {{ n }}
            </text>
          </view>
          <view class="num-key" />
          <view
            class="num-key"
            @click="verifyInput('0')"
          >
            <text class="num-key-text">
              0
            </text>
          </view>
          <view
            class="num-key num-key-del"
            @click="verifyDelete"
          >
            <text class="num-key-del-text">
              ⌫
            </text>
          </view>
        </view>

        <text
          class="modal-forgot"
          @click="handleForgotFromVerify"
        >
          忘记密码？
        </text>

        <view class="modal-actions">
          <view
            class="modal-btn modal-btn-cancel"
            @click="cancelVerifyModal"
          >
            取消
          </view>
        </view>
      </view>
    </view>

    <!-- 重置密码弹窗 -->
    <view
      v-if="showResetModal"
      class="modal-overlay"
      @click="showResetModal = false"
    >
      <view
        class="modal-content"
        @click.stop
      >
        <view class="modal-icon-row">
          <text class="modal-icon-text">
            ❓
          </text>
        </view>
        <text class="modal-title">
          身份验证
        </text>
        <text class="modal-desc">
          请输入监护人身份证号码重置密码
        </text>

        <input
          v-model="idCard"
          class="id-input"
          maxlength="18"
          placeholder="请输入18位身份证号"
          type="text"
        >

        <view class="modal-actions">
          <view
            class="modal-btn modal-btn-cancel"
            @click="showResetModal = false; idCard = ''"
          >
            取消
          </view>
          <view
            class="modal-btn modal-btn-primary"
            :class="{ disabled: idCard.length !== 18 }"
            @click="handleResetPassword"
          >
            验证并重置
          </view>
        </view>
      </view>
    </view>

    <!-- 时长选择底部弹窗 -->
    <view
      v-if="showTimeLimitSheet"
      class="sheet-overlay"
      @click="showTimeLimitSheet = false"
    >
      <view
        class="sheet-content"
        @click.stop
      >
        <view class="sheet-handle" />
        <text class="sheet-title">
          选择每日使用时长
        </text>
        <scroll-view
          scroll-y
          class="sheet-scroll"
        >
          <view
            v-for="opt in timeLimitOptions"
            :key="opt.value"
            class="sheet-option"
            :class="{ selected: settings.dailyLimit === opt.value }"
            @click="selectTimeLimit(opt)"
          >
            <text class="sheet-option-label">
              {{ opt.label }}
            </text>
            <text
              v-if="settings.dailyLimit === opt.value"
              class="sheet-option-check"
            >
              ✓
            </text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 时段选择底部弹窗 -->
    <view
      v-if="showTimeRangeSheet"
      class="sheet-overlay"
      @click="showTimeRangeSheet = false"
    >
      <view
        class="sheet-content"
        @click.stop
      >
        <view class="sheet-handle" />
        <text class="sheet-title">
          设置禁止使用时段
        </text>
        <view class="time-range-picker">
          <view class="time-col">
            <text class="time-col-label">
              开始时间
            </text>
            <picker
              mode="selector"
              :range="hourRange"
              @change="onStartHourChange"
            >
              <view class="time-picker-value">
                {{ padZero(settings.restrictedStartHour) }}:00
              </view>
            </picker>
          </view>
          <text class="time-sep">
            至
          </text>
          <view class="time-col">
            <text class="time-col-label">
              结束时间
            </text>
            <picker
              mode="selector"
              :range="hourRange"
              @change="onEndHourChange"
            >
              <view class="time-picker-value">
                {{ padZero(settings.restrictedEndHour) }}:00
              </view>
            </picker>
          </view>
        </view>
        <view
          class="sheet-confirm-btn"
          @click="showTimeRangeSheet = false"
        >
          确定
        </view>
      </view>
    </view>

    <!-- 过滤级别选择底部弹窗 -->
    <view
      v-if="showFilterSheet"
      class="sheet-overlay"
      @click="showFilterSheet = false"
    >
      <view
        class="sheet-content"
        @click.stop
      >
        <view class="sheet-handle" />
        <text class="sheet-title">
          内容过滤级别
        </text>
        <view
          v-for="level in filterLevels"
          :key="level.value"
          class="filter-option"
          :class="{ 'filter-active': settings.filterLevel === level.value }"
          @click="selectFilterLevel(level.value)"
        >
          <view class="filter-option-info">
            <text class="filter-option-label">
              {{ level.label }}
            </text>
            <text class="filter-option-desc">
              {{ level.desc }}
            </text>
          </view>
          <text
            v-if="settings.filterLevel === level.value"
            class="filter-option-check"
          >
            ✓
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface TeenModeSettings {
  enabled: boolean
  dailyLimit: number
  restrictedStartHour: number
  restrictedEndHour: number
  autoNightMode: boolean
  filterLevel: 'strict' | 'moderate'
  hasPassword: boolean
}

const loading = ref(true)
const saving = ref(false)
const settings = ref<TeenModeSettings>({
  enabled: false,
  dailyLimit: 40,
  restrictedStartHour: 22,
  restrictedEndHour: 6,
  autoNightMode: true,
  filterLevel: 'moderate',
  hasPassword: false,
})

// 密码弹窗
const showPasswordModal = ref(false)
const passwordStep = ref<'set' | 'confirm'>('set')
const tempPassword = ref<string[]>(['', '', '', ''])
const tempConfirm = ref<string[]>(['', '', '', ''])
const currentPwdIndex = ref(0)

// 验证密码弹窗
const showVerifyModal = ref(false)
const verifyPassword = ref<string[]>(['', '', '', ''])
const verifyIndex = ref(0)

// 重置密码
const showResetModal = ref(false)
const idCard = ref('')

// 选择弹窗
const showTimeLimitSheet = ref(false)
const showTimeRangeSheet = ref(false)
const showFilterSheet = ref(false)

const hourRange = Array.from({ length: 24 }, (_, i) => padZero(i) + ':00')

const timeLimitOptions = [
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 40, label: '40分钟（默认）' },
  { value: 60, label: '60分钟' },
  { value: 90, label: '90分钟' },
  { value: 120, label: '120分钟' },
]

const filterLevels = [
  { value: 'strict' as const, label: '严格', desc: '仅显示适合青少年的教育内容' },
  { value: 'moderate' as const, label: '适中', desc: '过滤不适内容，保留大部分功能' },
]

function padZero(n: number): string {
  return n.toString().padStart(2, '0')
}

function handleToggleMode() {
  if (settings.value.enabled) {
    // 关闭需要验证密码
    showVerifyModal.value = true
    verifyPassword.value = ['', '', '', '']
    verifyIndex.value = 0
  } else {
    if (!settings.value.hasPassword) {
      // 首次开启需要设置密码
      showPasswordModal.value = true
      passwordStep.value = 'set'
      tempPassword.value = ['', '', '', '']
      tempConfirm.value = ['', '', '', '']
      currentPwdIndex.value = 0
    } else {
      settings.value.enabled = true
    }
  }
}

// 密码输入处理
function pwdInput(digit: string) {
  if (passwordStep.value === 'set') {
    if (currentPwdIndex.value >= 4) return
    const arr = [...tempPassword.value]
    arr[currentPwdIndex.value] = digit
    tempPassword.value = arr
    currentPwdIndex.value++

    if (currentPwdIndex.value === 4) {
      // 切换到确认
      passwordStep.value = 'confirm'
      tempConfirm.value = ['', '', '', '']
      currentPwdIndex.value = 0
    }
  } else {
    if (currentPwdIndex.value >= 4) return
    const arr = [...tempConfirm.value]
    arr[currentPwdIndex.value] = digit
    tempConfirm.value = arr
    currentPwdIndex.value++

    if (currentPwdIndex.value === 4) {
      // 检查两次密码是否一致
      if (tempPassword.value.join('') === tempConfirm.value.join('')) {
        settings.value.enabled = true
        settings.value.hasPassword = true
        showPasswordModal.value = false
        tempPassword.value = ['', '', '', '']
        tempConfirm.value = ['', '', '', '']
        passwordStep.value = 'set'
        currentPwdIndex.value = 0
        uni.showToast({ title: '密码设置成功', icon: 'success' })
      } else {
        uni.showToast({ title: '两次密码不一致，请重新输入', icon: 'none' })
        tempConfirm.value = ['', '', '', '']
        currentPwdIndex.value = 0
      }
    }
  }
}

function pwdDelete() {
  if (passwordStep.value === 'set') {
    if (currentPwdIndex.value <= 0) return
    currentPwdIndex.value--
    const arr = [...tempPassword.value]
    arr[currentPwdIndex.value] = ''
    tempPassword.value = arr
  } else {
    if (currentPwdIndex.value <= 0) return
    currentPwdIndex.value--
    const arr = [...tempConfirm.value]
    arr[currentPwdIndex.value] = ''
    tempConfirm.value = arr
  }
}

function focusPwdInput(idx: number) {
  currentPwdIndex.value = idx
}

// 验证密码处理
function verifyInput(digit: string) {
  if (verifyIndex.value >= 4) return
  const arr = [...verifyPassword.value]
  arr[verifyIndex.value] = digit
  verifyPassword.value = arr
  verifyIndex.value++

  if (verifyIndex.value === 4) {
    // 验证密码（简化：假设密码正确）
    settings.value.enabled = false
    showVerifyModal.value = false
    verifyPassword.value = ['', '', '', '']
    verifyIndex.value = 0
    uni.showToast({ title: '已关闭青少年模式', icon: 'success' })
  }
}

function verifyDelete() {
  if (verifyIndex.value <= 0) return
  verifyIndex.value--
  const arr = [...verifyPassword.value]
  arr[verifyIndex.value] = ''
  verifyPassword.value = arr
}

function focusVerifyInput(idx: number) {
  verifyIndex.value = idx
}

function cancelPasswordModal() {
  showPasswordModal.value = false
  tempPassword.value = ['', '', '', '']
  tempConfirm.value = ['', '', '', '']
  passwordStep.value = 'set'
  currentPwdIndex.value = 0
}

function cancelVerifyModal() {
  showVerifyModal.value = false
  verifyPassword.value = ['', '', '', '']
  verifyIndex.value = 0
}

function openPasswordModal() {
  showPasswordModal.value = true
  passwordStep.value = 'set'
  tempPassword.value = ['', '', '', '']
  tempConfirm.value = ['', '', '', '']
  currentPwdIndex.value = 0
}

function handleForgotFromVerify() {
  showVerifyModal.value = false
  showResetModal.value = true
  verifyPassword.value = ['', '', '', '']
  verifyIndex.value = 0
}

function handleResetPassword() {
  if (idCard.value.length !== 18) {
    uni.showToast({ title: '请输入18位身份证号', icon: 'none' })
    return
  }
  // 重置密码
  settings.value.hasPassword = false
  showResetModal.value = false
  idCard.value = ''
  uni.showToast({ title: '密码已重置，请重新设置', icon: 'success' })
  // 打开设置密码弹窗
  setTimeout(() => {
    openPasswordModal()
  }, 500)
}

function selectTimeLimit(opt: { value: number; label: string }) {
  settings.value.dailyLimit = opt.value
  showTimeLimitSheet.value = false
}

function onStartHourChange(e: any) {
  settings.value.restrictedStartHour = e.detail.value
}

function onEndHourChange(e: any) {
  settings.value.restrictedEndHour = e.detail.value
}

function selectFilterLevel(val: 'strict' | 'moderate') {
  settings.value.filterLevel = val
  showFilterSheet.value = false
}

async function handleSave() {
  saving.value = true
  await new Promise((r) => setTimeout(r, 800))
  saving.value = false
  uni.showToast({ title: '设置已保存', icon: 'success' })
  goBack()
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-forgot { font-size: 24rpx; color: #C41E3A; padding: 8rpx; }

/* Banner */
.banner { display: flex; gap: 16rpx; margin: 24rpx; padding: 24rpx; background: linear-gradient(135deg, #3B82F6, #06B6D4); border-radius: 24rpx; }
.banner-icon-wrap { width: 88rpx; height: 88rpx; background: rgba(255,255,255,0.2); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.banner-icon { font-size: 40rpx; }
.banner-info { flex: 1; }
.banner-title { font-size: 30rpx; font-weight: 600; color: #fff; display: block; }
.banner-desc { font-size: 22rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; line-height: 1.6; display: block; }

/* 主开关 */
.toggle-card { display: flex; align-items: center; justify-content: space-between; margin: 0 24rpx 24rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.toggle-card-left { display: flex; align-items: center; gap: 16rpx; }
.toggle-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 14rpx; background: #F5F5F5; display: flex; align-items: center; justify-content: center; }
.toggle-icon-active { background: #DBEAFE; }
.toggle-icon-text { font-size: 32rpx; }
.toggle-info { }
.toggle-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.toggle-hint { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.toggle-switch { width: 88rpx; height: 48rpx; border-radius: 24rpx; background: #D0C8B8; position: relative; transition: all 0.3s; }
.toggle-switch.toggle-on { background: #3B82F6; }
.toggle-thumb { width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; position: absolute; top: 4rpx; left: 4rpx; transition: all 0.3s; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2); }
.toggle-thumb.toggle-thumb-on { left: 44rpx; }
.toggle-sm { width: 72rpx; height: 40rpx; }
.toggle-thumb-sm { width: 32rpx; height: 32rpx; top: 4rpx; left: 4rpx; }
.toggle-thumb-sm.toggle-thumb-on { left: 36rpx; }

/* 设置区域 */
.settings-section { margin: 0 24rpx; }
.settings-disabled { opacity: 0.5; pointer-events: none; }
.settings-group { background: #fff; border-radius: 20rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); overflow: hidden; }
.settings-group-header { padding: 24rpx 24rpx 0; }
.settings-group-label { font-size: 22rpx; color: #999; display: block; }
.settings-row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-top: 1rpx solid #F5F0E8; }
.settings-row:first-child { border-top: none; }
.settings-row-left { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.settings-row-icon-wrap { width: 64rpx; height: 64rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.siw-orange { background: #FFF3E0; }
.siw-purple { background: #F3E5F5; }
.siw-green { background: #E8F5E9; }
.siw-red { background: #FFEBEE; }
.settings-row-icon { font-size: 28rpx; }
.settings-row-info { flex: 1; }
.settings-row-label { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.settings-row-hint { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.settings-row-plain { font-size: 26rpx; color: #2C2C2C; }
.settings-row-right { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.settings-row-value { font-size: 24rpx; color: #C41E3A; }
.settings-row-arrow { font-size: 28rpx; color: #B8B0A4; }
.settings-row-badge { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 16rpx; }
.badge-set { background: #E8F5E9; color: #22C55E; }
.badge-unset { background: #FFF3E0; color: #F59E0B; }

/* 温馨提示 */
.tip-card { display: flex; gap: 16rpx; background: #E3F2FD; border: 1rpx solid #90CAF9; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.tip-icon { font-size: 28rpx; flex-shrink: 0; margin-top: 2rpx; }
.tip-body { flex: 1; }
.tip-title { font-size: 24rpx; font-weight: 500; color: #1565C0; display: block; margin-bottom: 8rpx; }
.tip-item { font-size: 22rpx; color: #1976D2; display: block; line-height: 1.7; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; background: #F5F0E8; border-top: 1rpx solid #E8E3DB; }
.btn-save { height: 88rpx; background: #C41E3A; color: #fff; border-radius: 16rpx; font-size: 28rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; }

/* 弹窗通用 */
.modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.modal-content { background: #fff; border-radius: 28rpx; padding: 40rpx 32rpx; width: 100%; max-width: 580rpx; }
.modal-icon-row { text-align: center; margin-bottom: 12rpx; }
.modal-icon-text { font-size: 48rpx; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; }
.modal-desc { font-size: 24rpx; color: #666; text-align: center; margin-top: 12rpx; display: block; }
.modal-actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.modal-btn { flex: 1; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.modal-btn-cancel { background: #F5F0E8; color: #666; }
.modal-btn-primary { background: #C41E3A; color: #fff; }
.modal-btn-primary.disabled { opacity: 0.5; }
.modal-forgot { text-align: center; font-size: 24rpx; color: #C41E3A; display: block; margin-top: 24rpx; }

/* 密码输入 */
.pwd-input-row { display: flex; justify-content: center; gap: 20rpx; margin: 32rpx 0; }
.pwd-cell { width: 80rpx; height: 96rpx; background: #F5F0E8; border-radius: 16rpx; border: 2rpx solid #E8E3DB; display: flex; align-items: center; justify-content: center; }
.pwd-cell-active { border-color: #C41E3A; }
.pwd-dot { font-size: 40rpx; color: #2C2C2C; }

/* 数字键盘 */
.num-keyboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; max-width: 480rpx; margin: 0 auto; }
.num-key { height: 88rpx; border-radius: 16rpx; background: #F5F0E8; display: flex; align-items: center; justify-content: center; }
.num-key:active { opacity: 0.7; }
.num-key-text { font-size: 36rpx; font-weight: 500; color: #2C2C2C; }
.num-key-del { background: transparent; }
.num-key-del-text { font-size: 32rpx; color: #999; }

/* 身份证输入 */
.id-input { width: 100%; height: 88rpx; background: #F5F0E8; border-radius: 16rpx; border: none; padding: 0 24rpx; font-size: 26rpx; color: #2C2C2C; margin-top: 24rpx; box-sizing: border-box; }

/* 底部弹窗 */
.sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.sheet-content { background: #fff; width: 100%; border-radius: 32rpx 32rpx 0 0; padding: 16rpx 32rpx 48rpx; animation: slideUp 0.3s ease; max-height: 70vh; }
.sheet-handle { width: 80rpx; height: 8rpx; background: #E8E3DB; border-radius: 4rpx; margin: 0 auto 24rpx; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; margin-bottom: 24rpx; display: block; }
.sheet-scroll { max-height: 50vh; }
.sheet-option { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-radius: 16rpx; background: #F5F0E8; margin-bottom: 12rpx; }
.sheet-option.selected { background: #FDE8E8; }
.sheet-option-label { font-size: 26rpx; color: #2C2C2C; }
.sheet-option-check { font-size: 28rpx; color: #C41E3A; font-weight: bold; }
.sheet-confirm-btn { height: 88rpx; background: #C41E3A; color: #fff; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 500; margin-top: 24rpx; }

/* 时间范围选择 */
.time-range-picker { display: flex; align-items: center; gap: 24rpx; justify-content: center; padding: 16rpx 0; }
.time-col { flex: 1; text-align: center; }
.time-col-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 12rpx; }
.time-picker-value { padding: 20rpx; background: #F5F0E8; border-radius: 16rpx; font-size: 28rpx; color: #2C2C2C; text-align: center; }
.time-sep { font-size: 28rpx; color: #999; margin-top: 40rpx; }

/* 过滤选项 */
.filter-option { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-radius: 16rpx; background: #F5F0E8; margin-bottom: 12rpx; border: 2rpx solid transparent; }
.filter-active { background: #FDE8E8; border-color: #C41E3A; }
.filter-option-info { flex: 1; }
.filter-option-label { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.filter-option-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.filter-option-check { font-size: 28rpx; color: #C41E3A; font-weight: bold; }

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
