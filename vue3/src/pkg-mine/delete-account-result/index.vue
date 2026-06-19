<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'

const status = ref<'pending' | 'completed'>('pending')
const expireAt = ref('')
const cancelling = ref(false)
const showCancelDialog = ref(false)
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
let timer: ReturnType<typeof setInterval> | null = null

const pad = (n: number) => String(n).padStart(2, '0')

function tick() {
  if (!expireAt.value) return
  const diff = new Date(expireAt.value).getTime() - Date.now()
  if (diff <= 0) {
    status.value = 'completed'
    if (timer) clearInterval(timer)
    return
  }
  countdown.value = {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

onLoad((q: Record<string, string> = {}) => {
  if (q.status === 'completed') status.value = 'completed'
  if (q.expire) {
    expireAt.value = decodeURIComponent(q.expire)
    tick()
    timer = setInterval(tick, 1000)
  }
})
onUnmounted(() => timer && clearInterval(timer))

const afterList = [
  { icon: '📝', text: '个人资料、发布内容将被删除' },
  { icon: '💰', text: '账户余额将被清零且不可恢复' },
  { icon: '🎁', text: '会员权益、优惠券将作废' },
  { icon: '📱', text: '手机号可重新注册新账号' },
]
const doneList = [
  '您的个人数据已按照隐私政策进行处理',
  '账户余额已按规定处理完毕',
  '该手机号可用于注册新账号',
  '原账号数据无法恢复',
]

function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
}
function confirmCancel() {
  cancelling.value = true
  setTimeout(() => {
    cancelling.value = false
    showCancelDialog.value = false
    uni.reLaunch({ url: '/pkg-mine/settings/index' })
  }, 1500)
}
function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
function goCustomerService() {
  uni.navigateTo({ url: '/pkg-agent/agent/customer-service' })
}
</script>

<template>
  <!-- 冷静期 pending -->
  <view v-if="status === 'pending'" class="page">
    <view class="navbar">
      <view class="nav-back" @tap="goBack"><AppIcon name="arrow-left" :size="40" color="#2c2c2c" /></view>
      <text class="nav-title">注销申请</text>
      <view class="nav-right" />
    </view>

    <view class="body">
      <view class="icon-clock"><AppIcon name="clock" :size="96" color="#3b82f6" /></view>
      <text class="title">注销申请已提交</text>
      <text class="subtitle">您的账号将在7天冷静期后正式注销</text>

      <view class="countdown">
        <text class="cd-label">冷静期剩余时间</text>
        <view class="cd-row">
          <view class="cd-cell">
            <view class="cd-box"><text class="cd-num">{{ countdown.days }}</text></view>
            <text class="cd-unit">天</text>
          </view>
          <view class="cd-cell">
            <view class="cd-box"><text class="cd-num">{{ pad(countdown.hours) }}</text></view>
            <text class="cd-unit">时</text>
          </view>
          <view class="cd-cell">
            <view class="cd-box"><text class="cd-num">{{ pad(countdown.minutes) }}</text></view>
            <text class="cd-unit">分</text>
          </view>
          <view class="cd-cell">
            <view class="cd-box"><text class="cd-num">{{ pad(countdown.seconds) }}</text></view>
            <text class="cd-unit">秒</text>
          </view>
        </view>
      </view>

      <view class="amber-box">
        <AppIcon name="alert-circle" :size="40" color="#f59e0b" class="amber-icon" />
        <view class="amber-body">
          <text class="amber-title">冷静期内您可以：</text>
          <text class="amber-li">重新登录账号撤销注销申请</text>
          <text class="amber-li">正常使用所有功能</text>
          <text class="amber-li">冷静期结束后账号将被永久注销</text>
        </view>
      </view>

      <view class="card">
        <text class="card-title">注销后将发生</text>
        <view v-for="(it, i) in afterList" :key="i" class="after-row">
          <text class="after-emoji">{{ it.icon }}</text>
          <text class="after-text">{{ it.text }}</text>
        </view>
      </view>

      <view class="btns">
        <view class="btn-danger" @tap="showCancelDialog = true"><text class="btn-danger-text">撤销注销申请</text></view>
        <view class="btn-muted" @tap="goHome">
          <AppIcon name="home" :size="32" color="#2c2c2c" />
          <text class="btn-muted-text">返回首页</text>
        </view>
        <view class="btn-text" @tap="goCustomerService">
          <AppIcon name="file-text" :size="32" color="#999999" />
          <text class="btn-text-label">了解注销详情</text>
        </view>
      </view>
    </view>

    <view v-if="showCancelDialog" class="mask">
      <view class="dialog">
        <view class="dialog-icon"><AppIcon name="check-circle" :size="64" color="#22c55e" /></view>
        <text class="dialog-title">撤销注销申请</text>
        <text class="dialog-desc">确定要撤销注销申请吗？撤销后账号将恢复正常状态。</text>
        <view class="dialog-btns">
          <view class="dialog-cancel" @tap="showCancelDialog = false"><text class="dialog-cancel-text">取消</text></view>
          <view class="dialog-ok" @tap="confirmCancel"><text class="dialog-ok-text">{{ cancelling ? '处理中...' : '确定撤销' }}</text></view>
        </view>
      </view>
    </view>
  </view>

  <!-- 已完成 completed -->
  <view v-else class="page">
    <view class="navbar center">
      <text class="nav-title">账号注销</text>
    </view>
    <view class="body body-center">
      <view class="icon-gray"><view class="icon-gray-inner"><AppIcon name="x" :size="48" color="#999999" /></view></view>
      <text class="title">账号已注销</text>
      <text class="subtitle narrow">所有数据将按隐私政策处理，感谢您一直以来的使用与支持</text>

      <view class="card">
        <text class="card-title">注销完成说明</text>
        <view v-for="(t, i) in doneList" :key="i" class="done-row">
          <AppIcon name="check-circle" :size="32" color="#22c55e" class="done-icon" />
          <text class="done-text">{{ t }}</text>
        </view>
      </view>

      <view class="blue-box">
        <text class="blue-text">如果您愿意告诉我们离开的原因，可以<text class="blue-link">填写反馈问卷</text>帮助我们改进服务</text>
      </view>

      <view class="btns">
        <view class="btn-danger" @tap="goHome">
          <AppIcon name="user-plus" :size="32" color="#fff" />
          <text class="btn-danger-text">重新注册账号</text>
        </view>
        <view class="btn-muted" @tap="goHome"><text class="btn-muted-text">关闭应用</text></view>
      </view>
      <text class="footer-note">如有问题请联系客服：400-xxx-xxxx</text>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; }

.navbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 32rpx; padding-top: var(--status-bar-height, 0); background: #FAF8F5; border-bottom: 1rpx solid #EDE7DC; }
.navbar.center { justify-content: center; }
.nav-back { padding: 16rpx; margin-left: -16rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.nav-right { width: 72rpx; }

.body { display: flex; flex-direction: column; align-items: center; padding: 128rpx 48rpx 64rpx; }
.body-center { justify-content: center; min-height: calc(100vh - 112rpx); padding-top: 64rpx; }

.icon-clock { width: 192rpx; height: 192rpx; border-radius: 50%; background: #dbeafe; display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.icon-gray { width: 192rpx; height: 192rpx; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.icon-gray-inner { width: 96rpx; height: 96rpx; border-radius: 50%; background: #d1d5db; display: flex; align-items: center; justify-content: center; }

.title { font-size: 40rpx; font-weight: 700; color: #2c2c2c; margin-bottom: 16rpx; }
.subtitle { font-size: 28rpx; color: #999999; text-align: center; margin-bottom: 64rpx; }
.subtitle.narrow { max-width: 480rpx; }

.countdown { width: 100%; background: #eff6ff; border-radius: 32rpx; padding: 48rpx; margin-bottom: 48rpx; }
.cd-label { display: block; font-size: 28rpx; color: #2563eb; text-align: center; margin-bottom: 32rpx; }
.cd-row { display: flex; justify-content: center; gap: 24rpx; }
.cd-cell { display: flex; flex-direction: column; align-items: center; }
.cd-box { width: 128rpx; height: 128rpx; background: #fff; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cd-num { font-size: 48rpx; font-weight: 700; color: #2563eb; }
.cd-unit { font-size: 24rpx; color: #999999; margin-top: 8rpx; }

.amber-box { width: 100%; display: flex; gap: 24rpx; background: #fffbeb; border-radius: 24rpx; padding: 32rpx; margin-bottom: 64rpx; }
.amber-icon { flex-shrink: 0; margin-top: 4rpx; }
.amber-body { display: flex; flex-direction: column; }
.amber-title { font-size: 28rpx; font-weight: 500; color: #b45309; margin-bottom: 8rpx; }
.amber-li { font-size: 28rpx; color: #d97706; line-height: 1.7; }

.card { width: 100%; background: #fff; border-radius: 24rpx; border: 1rpx solid #EDE7DC; padding: 32rpx; margin-bottom: 64rpx; }
.card-title { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 24rpx; }
.after-row { display: flex; align-items: center; gap: 24rpx; padding: 12rpx 0; }
.after-emoji { font-size: 28rpx; }
.after-text { font-size: 28rpx; color: #999999; }

.done-row { display: flex; align-items: flex-start; gap: 24rpx; padding: 12rpx 0; }
.done-icon { flex-shrink: 0; margin-top: 4rpx; }
.done-text { font-size: 28rpx; color: #999999; line-height: 1.5; }

.blue-box { width: 100%; background: #eff6ff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 64rpx; }
.blue-text { font-size: 28rpx; color: #1d4ed8; text-align: center; line-height: 1.6; }
.blue-link { color: #2563eb; font-weight: 500; text-decoration: underline; }

.btns { width: 100%; display: flex; flex-direction: column; gap: 24rpx; }
.btn-danger { height: 96rpx; background: #C41E3A; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.btn-danger-text { font-size: 30rpx; font-weight: 500; color: #fff; }
.btn-muted { height: 96rpx; background: #f2ece1; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.btn-muted-text { font-size: 30rpx; font-weight: 500; color: #2c2c2c; }
.btn-text { height: 96rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.btn-text-label { font-size: 28rpx; color: #999999; }

.footer-note { font-size: 24rpx; color: #999999; text-align: center; margin-top: 64rpx; }

.mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
.dialog { background: #fff; border-radius: 32rpx; padding: 48rpx; margin: 0 48rpx; max-width: 600rpx; width: 100%; display: flex; flex-direction: column; align-items: center; }
.dialog-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.dialog-title { font-size: 36rpx; font-weight: 700; color: #2c2c2c; margin-bottom: 16rpx; }
.dialog-desc { font-size: 28rpx; color: #999999; text-align: center; margin-bottom: 48rpx; line-height: 1.6; }
.dialog-btns { display: flex; gap: 24rpx; width: 100%; }
.dialog-cancel { flex: 1; height: 88rpx; background: #f2ece1; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.dialog-cancel-text { font-size: 30rpx; font-weight: 500; color: #2c2c2c; }
.dialog-ok { flex: 1; height: 88rpx; background: #22c55e; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.dialog-ok-text { font-size: 30rpx; font-weight: 500; color: #fff; }
</style>
