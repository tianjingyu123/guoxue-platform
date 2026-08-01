<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack, redirectTo } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'
import { formatPrice } from '@/utils/format'

const step = ref(1)
const agreed = ref(false)
const selectedReason = ref('')
const otherReason = ref('')
const password = ref('')
const showPassword = ref(false)
const confirmText = ref('')
const showConfirm = ref(false)
const loading = ref(false)
const reasons = ref<{ id: string; label: string }[]>([])
const dataItems = ref<{ icon: string; label: string; color: string }[]>([])
const assets = ref({ balance: 0, points: 0, coupons: 0, memberDays: 0 })
const profileLoading = ref(true)
const profileError = ref('')

async function fetchProfile() {
  profileLoading.value = true
  profileError.value = ''
  try {
    const info = await mineApi.getDeleteAccountInfo()
    reasons.value = info.reasons
    dataItems.value = info.dataItems
    assets.value = info.assets
  } catch (e) {
    profileError.value = (e as Error)?.message || '加载失败'
  } finally {
    profileLoading.value = false
  }
}

function retryProfile() {
  fetchProfile()
}

onMounted(() => {
  fetchProfile()
})

const nextDisabled = computed(() => {
  if (step.value === 1) return !agreed.value
  if (step.value === 2) return !selectedReason.value
  if (step.value === 3) return password.value.length < 6
  return false
})

function onBack() {
  if (step.value > 1) step.value--
  else goBack()
}
function next() {
  if (nextDisabled.value) return
  if (step.value === 3) {
    showConfirm.value = true
    return
  }
  step.value++
}
async function doDelete() {
  if (confirmText.value !== '确认注销' || loading.value) return
  loading.value = true
  try {
    const label = reasons.value.find((r) => r.id === selectedReason.value)?.label || selectedReason.value
    const reason = selectedReason.value === 'other' ? (otherReason.value || label) : label
    await mineApi.deleteAccount(password.value, reason)
    redirectTo(`/mine/delete-account-result?status=pending&expire=${encodeURIComponent(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}`)
  } catch (e) {
    loading.value = false
    showConfirm.value = false
    uni.showToast({ title: (e as Error)?.message || '注销失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="page">
    <view class="nav-wrap">
      <app-nav-bar title="账号注销" :back-size="40" :title-weight="500" custom-back no-border @back="onBack" />
      <!-- 进度 -->
      <view class="steps">
        <view v-for="s in 3" :key="s" class="step-item">
          <view class="step-dot" :class="{ active: s <= step }">
            <AppIcon v-if="s < step" name="check-circle" :size="18" color="#fff" />
            <text v-else class="step-num" :class="{ 'num-active': s === step }">{{ s }}</text>
          </view>
          <view v-if="s < 3" class="step-line" :class="{ active: s < step }" />
        </view>
      </view>
    </view>

    <!-- 个人信息加载/错误 -->
    <view v-if="profileLoading" class="loading"><AppLoading /></view>
    <view v-else-if="profileError" class="error-state"><text>{{ profileError }}</text><view class="retry-btn" @tap="retryProfile">重试</view></view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- Step 1: 须知 -->
      <template v-if="step === 1">
        <view class="warn-card">
          <view class="warn-icon"><AppIcon name="alert-triangle" :size="20" color="#ef4444" /></view>
          <view class="warn-body">
            <text class="warn-title">注销账号前请仔细阅读</text>
            <text class="warn-desc">账号注销后，以下数据将被永久删除且无法恢复</text>
          </view>
        </view>

        <view class="card">
          <text class="card-title">将被删除的数据</text>
          <view v-for="(item, idx) in dataItems" :key="idx" class="data-row">
            <view class="data-icon"><AppIcon :name="item.icon" :size="18" :color="item.color" /></view>
            <text class="data-label">{{ item.label }}</text>
            <AppIcon name="x-circle" :size="18" color="#ef4444" />
          </view>
        </view>

        <view class="card">
          <text class="card-title">您当前的资产</text>
          <view class="asset-grid">
            <view class="asset asset-orange">
              <text class="asset-label">钱包余额</text>
              <text class="asset-val">¥{{ formatPrice(assets.balance) }}</text>
            </view>
            <view class="asset asset-purple">
              <text class="asset-label">积分</text>
              <text class="asset-val">{{ assets.points }}</text>
            </view>
            <view class="asset asset-green">
              <text class="asset-label">优惠券</text>
              <text class="asset-val">{{ assets.coupons }}张</text>
            </view>
            <view class="asset asset-blue">
              <text class="asset-label">会员剩余</text>
              <text class="asset-val">{{ assets.memberDays }}天</text>
            </view>
          </view>
          <text v-if="assets.balance > 0" class="asset-tip">* 您的钱包余额尚有 ¥{{ formatPrice(assets.balance) }}，建议先提现后再注销</text>
        </view>

        <view class="cool-card">
          <text class="cool-title">7天冷静期</text>
          <text class="cool-desc">提交注销申请后，账号将进入7天冷静期。期间登录即可撤销注销。</text>
        </view>

        <view class="agree" @tap="agreed = !agreed">
          <view class="checkbox" :class="{ checked: agreed }">
            <AppIcon v-if="agreed" name="check" :size="14" color="#fff" />
          </view>
          <text class="agree-text">我已阅读并理解上述内容，确认要注销账号，并同意《账号注销协议》</text>
        </view>
      </template>

      <!-- Step 2: 原因 -->
      <template v-if="step === 2">
        <view class="card">
          <text class="card-title">请告诉我们您注销的原因</text>
          <text class="card-sub">您的反馈将帮助我们改进服务</text>
          <view v-for="r in reasons" :key="r.id" class="reason" :class="{ active: selectedReason === r.id }" @tap="selectedReason = r.id">
            <view class="radio" :class="{ on: selectedReason === r.id }">
              <view v-if="selectedReason === r.id" class="radio-dot" />
            </view>
            <text class="reason-label">{{ r.label }}</text>
          </view>
        </view>
        <view v-if="selectedReason === 'other'" class="card">
          <text class="card-title">其他原因（选填）</text>
          <textarea v-model="otherReason" class="textarea" placeholder="请输入您的原因..." :maxlength="200" placeholder-class="ph" />
          <text class="textarea-count">{{ otherReason.length }}/200</text>
        </view>
      </template>

      <!-- Step 3: 验证 -->
      <template v-if="step === 3">
        <view class="card">
          <text class="card-title">验证身份</text>
          <text class="field-label">请输入登录密码</text>
          <view class="input-wrap">
            <input class="input" :password="!showPassword" v-model="password" placeholder="输入当前登录密码" placeholder-class="ph" />
            <view class="input-eye" @tap="showPassword = !showPassword">
              <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="20" color="#9b948a" />
            </view>
          </view>
        </view>
        <view class="yellow-tip">
          <text class="yellow-tip-text">验证通过后，将进入最终确认步骤</text>
        </view>
      </template>

      <view class="safe-bottom-lg" />
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="footer-bar">
      <view class="btn-danger" :class="{ disabled: nextDisabled }" @tap="next">
        <text class="btn-danger-text">{{ step === 3 ? '确认注销' : '下一步' }}</text>
      </view>
    </view>

    <!-- 最终确认弹窗 -->
    <view v-if="showConfirm" class="mask center mask-fade-in">
      <view class="confirm">
        <view class="confirm-icon"><AppIcon name="trash-2" :size="28" color="#ef4444" /></view>
        <text class="confirm-title">最终确认</text>
        <text class="confirm-desc">请输入 <text class="hl">"确认注销"</text> 以继续</text>
        <input v-model="confirmText" class="confirm-input" placeholder='请输入"确认注销"' placeholder-class="ph" />
        <text v-if="confirmText && confirmText !== '确认注销'" class="confirm-err">请输入正确的确认文字</text>
        <view class="confirm-actions">
          <view class="confirm-btn ghost" @tap="showConfirm = false; confirmText = ''"><text class="confirm-btn-text">取消</text></view>
          <view class="confirm-btn danger" :class="{ disabled: confirmText !== '确认注销' || loading }" @tap="doDelete">
            <text class="confirm-btn-text danger-text">{{ loading ? '处理中...' : '确认注销' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 三态 */
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.nav-wrap { background: #fff; border-bottom: 1rpx solid #EDE7DC; position: sticky; top: 0; z-index: 10; }
.steps { display: flex; align-items: center; padding: 0 64rpx 28rpx; }
.step-item { display: flex; align-items: center; flex: 1; }
.step-item:last-child { flex: none; }
.step-dot { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-dot.active { background: var(--brand); }
.step-num { font-size: 26rpx; color: #b8b0a4; font-weight: 600; }
.step-num.num-active { color: #fff; }
.step-line { flex: 1; height: 4rpx; background: #F2ECE1; margin: 0 16rpx; }
.step-line.active { background: var(--brand); }

.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }

.warn-card { display: flex; gap: 20rpx; background: #FCEBEB; border: 1rpx solid #F5C6C6; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.warn-icon { width: 72rpx; height: 72rpx; border-radius: 50%; background: #FAD7D7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.warn-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.warn-title { font-size: 28rpx; font-weight: 600; color: #c0392b; }
.warn-desc { font-size: 24rpx; color: #d9534f; line-height: 1.5; }

.card { background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.card-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.card-sub { display: block; font-size: 24rpx; color: #8a8178; margin-top: 8rpx; margin-bottom: 16rpx; }
.data-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.data-icon { width: 56rpx; height: 56rpx; border-radius: 14rpx; background: #F2ECE1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.data-label { flex: 1; font-size: 26rpx; color: #2C2C2C; }

.asset-grid { display: flex; flex-wrap: wrap; gap: 20rpx; margin-top: 16rpx; }
.asset { width: calc(50% - 10rpx); border-radius: 20rpx; padding: 20rpx 24rpx; box-sizing: border-box; }
.asset-orange { background: #FBF0E1; }
.asset-purple { background: #F1ECFA; }
.asset-green { background: #E7F6EC; }
.asset-blue { background: #E8EEFB; }
.asset-label { display: block; font-size: 22rpx; margin-bottom: 8rpx; }
.asset-orange .asset-label { color: #d97706; } .asset-orange .asset-val { color: #d97706; }
.asset-purple .asset-label { color: #7c3aed; } .asset-purple .asset-val { color: #7c3aed; }
.asset-green .asset-label { color: #16a34a; } .asset-green .asset-val { color: #16a34a; }
.asset-blue .asset-label { color: #2563eb; } .asset-blue .asset-val { color: #2563eb; }
.asset-val { display: block; font-size: 34rpx; font-weight: 700; }
.asset-tip { display: block; font-size: 22rpx; color: #ef4444; margin-top: 16rpx; }

.cool-card { background: #E8EEFB; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.cool-title { display: block; font-size: 28rpx; font-weight: 600; color: #1e40af; }
.cool-desc { display: block; font-size: 24rpx; color: #3b5bbd; line-height: 1.6; margin-top: 8rpx; }

.agree { display: flex; gap: 16rpx; background: #fff; border-radius: 24rpx; padding: 28rpx; }
.checkbox { width: 40rpx; height: 40rpx; border-radius: 10rpx; border: 3rpx solid #D8D1C5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2rpx; }
.checkbox.checked { background: var(--brand); border-color: var(--brand); }
.agree-text { flex: 1; font-size: 24rpx; color: #8a8178; line-height: 1.6; }

.reason { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; border: 1rpx solid #EDE7DC; border-radius: 20rpx; margin-top: 16rpx; }
.reason.active { border-color: var(--brand); background: #FBEDEF; }
.radio { width: 36rpx; height: 36rpx; border-radius: 50%; border: 3rpx solid #D8D1C5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio.on { border-color: var(--brand); }
.radio-dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: var(--brand); }
.reason-label { font-size: 28rpx; color: #2C2C2C; }
.textarea { width: 100%; height: 180rpx; background: #F6F1E8; border-radius: 20rpx; padding: 20rpx 24rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; margin-top: 16rpx; }
.textarea-count { display: block; text-align: right; font-size: 22rpx; color: #b8b0a4; margin-top: 8rpx; }
.ph { color: #b8b0a4; }

.method-toggle { display: flex; gap: 16rpx; margin: 20rpx 0; }
.method { flex: 1; height: 76rpx; border-radius: 16rpx; background: #F2ECE1; display: flex; align-items: center; justify-content: center; }
.method.active { background: var(--brand); }
.method-text { font-size: 28rpx; color: #8a8178; }
.method.active .method-text { color: #fff; font-weight: 500; }
.field-label { display: block; font-size: 24rpx; color: #8a8178; margin-bottom: 12rpx; }
.input-wrap { position: relative; }
.input { height: 88rpx; background: #F6F1E8; border-radius: 20rpx; padding: 0 28rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.input-wrap .input { width: 100%; padding-right: 80rpx; }
.input-eye { position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%); width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.code-row { display: flex; gap: 16rpx; }
.flex1 { flex: 1; }
.btn-code { padding: 0 28rpx; height: 88rpx; background: var(--brand); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.btn-code.disabled { opacity: 0.5; }
.btn-code-text { font-size: 26rpx; color: #fff; font-weight: 500; }
.yellow-tip { background: #FBF4E6; border-radius: 20rpx; padding: 24rpx; }
.yellow-tip-text { font-size: 24rpx; color: #a98a52; }

.safe-bottom-lg { height: 40rpx; }
.footer-bar { padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #EDE7DC; }
.btn-danger { height: 92rpx; background: #ef4444; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.btn-danger.disabled { opacity: 0.5; }
.btn-danger-text { font-size: 30rpx; font-weight: 600; color: #fff; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50; display: flex; }
.mask.center { align-items: center; justify-content: center; padding: 0 48rpx; }
.confirm { width: 100%; max-width: 600rpx; background: #fff; border-radius: 28rpx; padding: 48rpx 40rpx 32rpx; box-sizing: border-box; }
.confirm-icon { width: 112rpx; height: 112rpx; border-radius: 50%; background: #FCEBEB; display: flex; align-items: center; justify-content: center; margin: 0 auto 24rpx; }
.confirm-title { display: block; font-size: 34rpx; font-weight: 700; color: #2C2C2C; text-align: center; }
.confirm-desc { display: block; font-size: 26rpx; color: #8a8178; text-align: center; margin-top: 12rpx; }
.hl { color: #ef4444; font-weight: 600; }
.confirm-input { height: 88rpx; background: #F6F1E8; border-radius: 20rpx; text-align: center; font-size: 28rpx; color: #2C2C2C; margin-top: 24rpx; }
.confirm-err { display: block; text-align: center; font-size: 22rpx; color: #ef4444; margin-top: 12rpx; }
.confirm-actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.confirm-btn { flex: 1; height: 84rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.confirm-btn.ghost { background: #F2ECE1; }
.confirm-btn.danger { background: #ef4444; }
.confirm-btn.danger.disabled { opacity: 0.5; }
.confirm-btn-text { font-size: 28rpx; color: #2C2C2C; font-weight: 500; }
.danger-text { color: #fff; }
</style>
