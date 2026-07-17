<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack } from '@/utils/router'
import { mineApi, teenTimeLimitOptions, teenFilterLevels, type TeenModeSettings } from '@/lib/mine-data'

const loading = ref(true)
const error = ref('')
const settings = reactive<TeenModeSettings>({
  enabled: false,
  dailyLimit: 40,
  restrictedStartHour: 22,
  restrictedEndHour: 6,
  autoNightMode: true,
  filterLevel: 'moderate',
  hasPassword: false,
})
const saving = ref(false)
const submitting = ref(false)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await mineApi.getTeenMode()
    Object.assign(settings, data)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

// 弹窗状态
const pwdModal = ref(false)
const pwdStep = ref<'set' | 'confirm'>('set')
const verifyModal = ref(false)
const resetModal = ref(false)
const timeLimitSheet = ref(false)
const timeRangeSheet = ref(false)
const filterSheet = ref(false)

// 密码输入（4 位）
const pwdSet = ref('')
const pwdConfirm = ref('')
const pwdVerify = ref('')
const idCard = ref('')

const pwdActiveVal = computed(() => (pwdStep.value === 'set' ? pwdSet.value : pwdConfirm.value))

const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${String(i).padStart(2, '0')}:00` }))

function toggleMode() {
  if (settings.enabled) {
    verifyModal.value = true
    pwdVerify.value = ''
  } else if (!settings.hasPassword) {
    pwdStep.value = 'set'
    pwdSet.value = ''
    pwdConfirm.value = ''
    pwdModal.value = true
  } else {
    settings.enabled = true
  }
}

function onPwdInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  const v = String(e.detail.value).replace(/\D/g, '').slice(0, 4)
  if (pwdStep.value === 'set') {
    pwdSet.value = v
    if (v.length === 4) {
      pwdStep.value = 'confirm'
      pwdConfirm.value = ''
    }
  } else {
    pwdConfirm.value = v
    if (v.length === 4) {
      if (pwdConfirm.value === pwdSet.value) {
        settings.enabled = true
        settings.hasPassword = true
        pwdModal.value = false
        pwdSet.value = ''
        pwdConfirm.value = ''
        pwdStep.value = 'set'
        uni.showToast({ title: '已开启青少年模式', icon: 'none' })
      } else {
        pwdConfirm.value = ''
        uni.showToast({ title: '两次密码不一致', icon: 'none' })
      }
    }
  }
}

function onVerifyInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  const v = String(e.detail.value).replace(/\D/g, '').slice(0, 4)
  pwdVerify.value = v
  if (v.length === 4) {
    settings.enabled = false
    verifyModal.value = false
    pwdVerify.value = ''
    uni.showToast({ title: '已关闭青少年模式', icon: 'none' })
  }
}

function openModifyPwd() {
  pwdStep.value = 'set'
  pwdSet.value = ''
  pwdConfirm.value = ''
  pwdModal.value = true
}

function doReset() {
  if (idCard.value.length !== 18) return
  settings.hasPassword = false
  resetModal.value = false
  idCard.value = ''
  pwdStep.value = 'set'
  pwdSet.value = ''
  pwdConfirm.value = ''
  pwdModal.value = true
}

function pickTimeLimit(v: number) {
  settings.dailyLimit = v
  timeLimitSheet.value = false
}
function pickFilter(v: 'strict' | 'moderate') {
  settings.filterLevel = v
  filterSheet.value = false
}
async function save() {
  if (submitting.value) return
  saving.value = true
  submitting.value = true
  try {
    await mineApi.updateTeenMode({ ...settings })
    uni.showToast({ title: '已保存', icon: 'none' })
    setTimeout(() => goBack(), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="青少年模式" :back-size="40">
      <template #right>
        <text class="nav-link" @tap="resetModal = true">忘记密码</text>
      </template>
    </app-nav-bar>

    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="retry">重试</view>
    </view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- Banner -->
      <view class="banner">
        <view class="banner-icon">
          <AppIcon name="shield" :size="24" color="#fff" />
        </view>
        <view class="banner-body">
          <text class="banner-title">守护青少年健康成长</text>
          <text class="banner-desc">开启后将限制使用时长、屏蔽不适内容，为青少年营造绿色健康的学习环境</text>
        </view>
      </view>

      <!-- 主开关 -->
      <view class="card">
        <view class="row">
          <view class="row-icon" :class="settings.enabled ? 'icon-on' : 'icon-off'">
            <AppIcon name="shield" :size="20" :color="settings.enabled ? '#2563EB' : '#9b948a'" />
          </view>
          <view class="row-body">
            <text class="row-name">青少年模式</text>
            <text class="row-sub">{{ settings.enabled ? '已开启保护' : '点击开启' }}</text>
          </view>
          <view class="switch" :class="{ on: settings.enabled }" @tap="toggleMode">
            <view class="switch-dot" />
          </view>
        </view>
      </view>

      <!-- 设置区 -->
      <view class="settings" :class="{ disabled: !settings.enabled }">
        <!-- 时长限制 -->
        <view class="card">
          <view class="card-head"><text class="card-head-title">使用时长限制</text></view>
          <view class="row" @tap="timeLimitSheet = true">
            <view class="row-icon icon-orange"><AppIcon name="clock" :size="20" color="#d97706" /></view>
            <view class="row-body">
              <text class="row-name">每日使用时长</text>
              <text class="row-sub">超时后需输入密码继续</text>
            </view>
            <text class="row-value">{{ settings.dailyLimit }}分钟</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
        </view>

        <!-- 时段限制 -->
        <view class="card">
          <view class="card-head"><text class="card-head-title">使用时段限制</text></view>
          <view class="row" @tap="timeRangeSheet = true">
            <view class="row-icon icon-purple"><AppIcon name="moon" :size="20" color="#7c3aed" /></view>
            <view class="row-body">
              <text class="row-name">禁止使用时段</text>
              <text class="row-sub">该时段内无法使用App</text>
            </view>
            <text class="row-value">{{ settings.restrictedStartHour }}:00 - {{ settings.restrictedEndHour }}:00</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
          <view class="row">
            <text class="row-name flex1">夜间自动开启深色模式</text>
            <view class="switch" :class="{ on: settings.autoNightMode }" @tap="settings.autoNightMode = !settings.autoNightMode">
              <view class="switch-dot" />
            </view>
          </view>
        </view>

        <!-- 内容过滤 -->
        <view class="card">
          <view class="card-head"><text class="card-head-title">内容过滤</text></view>
          <view class="row" @tap="filterSheet = true">
            <view class="row-icon icon-green"><AppIcon name="filter" :size="20" color="#16a34a" /></view>
            <view class="row-body">
              <text class="row-name">内容过滤级别</text>
              <text class="row-sub">控制可见内容范围</text>
            </view>
            <text class="row-value">{{ settings.filterLevel === 'strict' ? '严格' : '适中' }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
        </view>

        <!-- 监护密码 -->
        <view class="card">
          <view class="card-head"><text class="card-head-title">监护密码</text></view>
          <view class="row" @tap="openModifyPwd">
            <view class="row-icon icon-red"><AppIcon name="lock" :size="20" color="#C41E3A" /></view>
            <view class="row-body">
              <text class="row-name">修改监护密码</text>
              <text class="row-sub">用于关闭模式或延长时间</text>
            </view>
            <text class="status-tag" :class="settings.hasPassword ? 'tag-ok' : 'tag-warn'">{{ settings.hasPassword ? '已设置' : '未设置' }}</text>
            <AppIcon name="chevron-right" :size="16" color="#C9A96E" />
          </view>
        </view>

        <!-- 提示 -->
        <view class="tips">
          <AppIcon name="alert-circle" :size="18" color="#3B82F6" />
          <view class="tips-body">
            <text class="tips-title">温馨提示</text>
            <text class="tips-item">· 开启后部分功能将受限，如直播打赏、商城购物等</text>
            <text class="tips-item">· 内容将过滤为适合青少年观看的教育类内容</text>
            <text class="tips-item">· 使用时长达到限制后需输入监护密码解锁</text>
            <text class="tips-item">· 忘记密码可通过监护人身份证验证重置</text>
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部保存 -->
    <view class="footer-bar">
      <view class="btn-save" :class="{ disabled: saving }" @tap="save">
        <text class="btn-save-text">{{ saving ? '保存中...' : '保存设置' }}</text>
      </view>
    </view>

    <!-- 密码设置弹窗 -->
    <view v-if="pwdModal" class="mask center mask-fade-in">
      <view class="modal">
        <text class="modal-title">{{ pwdStep === 'set' ? '设置监护密码' : '确认监护密码' }}</text>
        <text class="modal-sub">{{ pwdStep === 'set' ? '请设置4位数字密码' : '请再次输入密码确认' }}</text>
        <view class="pin-wrap">
          <view v-for="i in 4" :key="i" class="pin-box" :class="{ filled: pwdActiveVal.length >= i }">
            <text v-if="pwdActiveVal.length >= i" class="pin-dot">●</text>
          </view>
          <input class="pin-input" type="text" :value="pwdActiveVal" :focus="pwdModal" :maxlength="4" @input="onPwdInput" />
        </view>
        <view class="modal-cancel" @tap="pwdModal = false"><text class="modal-cancel-text">取消</text></view>
      </view>
    </view>

    <!-- 验证密码弹窗 -->
    <view v-if="verifyModal" class="mask center mask-fade-in">
      <view class="modal">
        <text class="modal-title">验证监护密码</text>
        <text class="modal-sub">关闭青少年模式需要验证监护密码</text>
        <view class="pin-wrap">
          <view v-for="i in 4" :key="i" class="pin-box" :class="{ filled: pwdVerify.length >= i }">
            <text v-if="pwdVerify.length >= i" class="pin-dot">●</text>
          </view>
          <input class="pin-input" type="text" :value="pwdVerify" :focus="verifyModal" :maxlength="4" @input="onVerifyInput" />
        </view>
        <view class="modal-link" @tap="verifyModal = false; resetModal = true"><text class="modal-link-text">忘记密码？</text></view>
        <view class="modal-cancel" @tap="verifyModal = false"><text class="modal-cancel-text">取消</text></view>
      </view>
    </view>

    <!-- 重置密码弹窗 -->
    <view v-if="resetModal" class="mask center mask-fade-in">
      <view class="modal">
        <view class="modal-head-row">
          <AppIcon name="help-circle" :size="20" color="#d97706" />
          <text class="modal-title inline">身份验证</text>
        </view>
        <text class="modal-sub">请输入监护人身份证号码重置密码</text>
        <input v-model="idCard" class="id-input" type="idcard" :maxlength="18" placeholder="请输入18位身份证号" placeholder-class="ph" />
        <view class="modal-actions">
          <view class="modal-btn ghost" @tap="resetModal = false; idCard = ''"><text class="modal-btn-text">取消</text></view>
          <view class="modal-btn solid" :class="{ disabled: idCard.length !== 18 }" @tap="doReset"><text class="modal-btn-text solid-text">验证并重置</text></view>
        </view>
      </view>
    </view>

    <!-- 时长选择 -->
    <view v-if="timeLimitSheet" class="mask mask-fade-in" @tap="timeLimitSheet = false">
      <view class="sheet sheet-slide-up" @tap.stop>
        <view class="sheet-bar" />
        <text class="sheet-title">选择每日使用时长</text>
        <view class="opt-list">
          <view v-for="opt in teenTimeLimitOptions" :key="opt.value" class="opt" :class="{ active: settings.dailyLimit === opt.value }" @tap="pickTimeLimit(opt.value)">
            <text class="opt-label">{{ opt.label }}</text>
            <AppIcon v-if="settings.dailyLimit === opt.value" name="check" :size="20" color="#C41E3A" />
          </view>
        </view>
      </view>
    </view>

    <!-- 时段选择 -->
    <view v-if="timeRangeSheet" class="mask mask-fade-in" @tap="timeRangeSheet = false">
      <view class="sheet sheet-slide-up" @tap.stop>
        <view class="sheet-bar" />
        <text class="sheet-title">设置禁止使用时段</text>
        <view class="range-row">
          <view class="range-col">
            <text class="range-label">开始时间</text>
            <picker mode="selector" :range="hourOptions" range-key="label" :value="settings.restrictedStartHour" @change="settings.restrictedStartHour = hourOptions[$event.detail.value].value">
              <view class="range-picker"><text>{{ String(settings.restrictedStartHour).padStart(2, '0') }}:00</text></view>
            </picker>
          </view>
          <text class="range-sep">至</text>
          <view class="range-col">
            <text class="range-label">结束时间</text>
            <picker mode="selector" :range="hourOptions" range-key="label" :value="settings.restrictedEndHour" @change="settings.restrictedEndHour = hourOptions[$event.detail.value].value">
              <view class="range-picker"><text>{{ String(settings.restrictedEndHour).padStart(2, '0') }}:00</text></view>
            </picker>
          </view>
        </view>
        <view class="btn-confirm" @tap="timeRangeSheet = false"><text class="btn-confirm-text">确定</text></view>
      </view>
    </view>

    <!-- 过滤级别选择 -->
    <view v-if="filterSheet" class="mask mask-fade-in" @tap="filterSheet = false">
      <view class="sheet sheet-slide-up" @tap.stop>
        <view class="sheet-bar" />
        <text class="sheet-title">内容过滤级别</text>
        <view class="opt-list">
          <view v-for="lv in teenFilterLevels" :key="lv.value" class="opt opt-block" :class="{ active: settings.filterLevel === lv.value }" @tap="pickFilter(lv.value as 'strict' | 'moderate')">
            <view class="opt-block-body">
              <text class="opt-label">{{ lv.label }}</text>
              <text class="opt-desc">{{ lv.desc }}</text>
            </view>
            <AppIcon v-if="settings.filterLevel === lv.value" name="check" :size="20" color="#C41E3A" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.nav-link { font-size: 28rpx; color: var(--brand); }
.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }

.banner { background: linear-gradient(90deg, #3B82F6, #06B6D4); border-radius: 24rpx; padding: 32rpx; display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.banner-icon { width: 84rpx; height: 84rpx; border-radius: 20rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.banner-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.banner-title { font-size: 32rpx; font-weight: 600; color: #fff; }
.banner-desc { font-size: 24rpx; color: rgba(255,255,255,0.85); line-height: 1.6; }

.card { background: #fff; border-radius: 24rpx; overflow: hidden; margin-bottom: 24rpx; }
.card-head { padding: 24rpx 28rpx; border-bottom: 1rpx solid #F2ECE1; }
.card-head-title { font-size: 24rpx; font-weight: 500; color: #8a8178; }
.row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 28rpx; border-bottom: 1rpx solid #F6F1E8; }
.row:last-child { border-bottom: none; }
.row-icon { width: 76rpx; height: 76rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-on { background: #DBEAFE; }
.icon-off { background: #F2ECE1; }
.icon-orange { background: #FBF0E1; }
.icon-purple { background: #F1ECFA; }
.icon-green { background: #E7F6EC; }
.icon-red { background: #FBEDEF; }
.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.row-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.row-name.flex1 { flex: 1; }
.row-sub { font-size: 22rpx; color: #8a8178; }
.row-value { font-size: 26rpx; color: var(--brand); font-weight: 500; }
.status-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }
.tag-ok { color: #16a34a; background: #E7F6EC; }
.tag-warn { color: #d97706; background: #FBF0E1; }

.switch { width: 88rpx; height: 50rpx; border-radius: 999rpx; background: #E0DACE; position: relative; transition: background 0.2s; flex-shrink: 0; }
.switch.on { background: #3B82F6; }
.switch-dot { width: 42rpx; height: 42rpx; border-radius: 50%; background: #fff; position: absolute; top: 4rpx; left: 4rpx; transition: transform 0.2s; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15); }
.switch.on .switch-dot { transform: translateX(38rpx); }

.settings.disabled { opacity: 0.5; pointer-events: none; }

.tips { display: flex; gap: 16rpx; background: #EFF6FF; border-radius: 24rpx; padding: 28rpx; }
.tips-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.tips-title { font-size: 26rpx; font-weight: 600; color: #1E3A8A; }
.tips-item { font-size: 24rpx; color: #1D4ED8; line-height: 1.5; }

.safe-bottom { height: 40rpx; }
.footer-bar { padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #EDE7DC; }
.btn-save { height: 92rpx; background: var(--brand); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.btn-save.disabled { opacity: 0.6; }
.btn-save-text { font-size: 30rpx; font-weight: 600; color: #fff; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50; display: flex; align-items: flex-end; }
.mask.center { align-items: center; justify-content: center; padding: 0 48rpx; }

.modal { width: 100%; max-width: 600rpx; background: #fff; border-radius: 28rpx; padding: 44rpx 40rpx 32rpx; box-sizing: border-box; }
.modal-head-row { display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.modal-title { display: block; font-size: 32rpx; font-weight: 700; color: #2C2C2C; text-align: center; }
.modal-title.inline { display: inline; }
.modal-sub { display: block; font-size: 26rpx; color: #8a8178; text-align: center; margin-top: 12rpx; }
.pin-wrap { position: relative; display: flex; justify-content: center; gap: 24rpx; margin: 40rpx 0; }
.pin-box { width: 88rpx; height: 100rpx; background: #F6F1E8; border-radius: 20rpx; border: 2rpx solid transparent; display: flex; align-items: center; justify-content: center; }
.pin-box.filled { border-color: var(--brand); }
.pin-dot { font-size: 36rpx; color: #2C2C2C; }
.pin-input { position: absolute; inset: 0; opacity: 0; }
.modal-cancel { height: 84rpx; border: 1rpx solid #EDE7DC; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-top: 12rpx; }
.modal-cancel-text { font-size: 28rpx; color: #6f6760; }
.modal-link { display: flex; justify-content: center; padding: 24rpx 0 8rpx; }
.modal-link-text { font-size: 26rpx; color: var(--brand); }
.id-input { height: 88rpx; background: #F6F1E8; border-radius: 20rpx; padding: 0 28rpx; font-size: 28rpx; color: #2C2C2C; margin: 28rpx 0; }
.ph { color: #b8b0a4; }
.modal-actions { display: flex; gap: 20rpx; }
.modal-btn { flex: 1; height: 84rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.modal-btn.ghost { border: 1rpx solid #EDE7DC; }
.modal-btn.solid { background: var(--brand); }
.modal-btn.solid.disabled { opacity: 0.5; }
.modal-btn-text { font-size: 28rpx; color: #6f6760; }
.solid-text { color: #fff; }

.sheet { width: 100%; background: #fff; border-radius: 40rpx 40rpx 0 0; padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.sheet-bar { width: 72rpx; height: 8rpx; background: #E0DACE; border-radius: 999rpx; margin: 0 auto 24rpx; }
.sheet-title { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; margin-bottom: 24rpx; }
.opt-list { display: flex; flex-direction: column; gap: 16rpx; max-height: 600rpx; }
.opt { display: flex; align-items: center; justify-content: space-between; background: #F6F1E8; border-radius: 20rpx; padding: 28rpx; border: 2rpx solid transparent; }
.opt.active { background: #FBEDEF; }
.opt.opt-block.active { border-color: var(--brand); }
.opt-label { font-size: 28rpx; color: #2C2C2C; font-weight: 500; }
.opt-block-body { display: flex; flex-direction: column; gap: 6rpx; }
.opt-desc { font-size: 24rpx; color: #8a8178; }

.range-row { display: flex; align-items: center; gap: 24rpx; padding: 16rpx 0; }
.range-col { flex: 1; display: flex; flex-direction: column; gap: 12rpx; align-items: center; }
.range-label { font-size: 24rpx; color: #8a8178; }
.range-picker { width: 100%; height: 88rpx; background: #F6F1E8; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; color: #2C2C2C; }
.range-sep { font-size: 26rpx; color: #8a8178; margin-top: 36rpx; }
.btn-confirm { height: 92rpx; background: var(--brand); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-top: 32rpx; }
.btn-confirm-text { font-size: 30rpx; font-weight: 600; color: #fff; }
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
