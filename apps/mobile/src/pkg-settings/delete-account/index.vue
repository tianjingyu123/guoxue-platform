<template>
  <view class="page">
    <!-- 注销须知 -->
    <block v-if="step === 'notice'">
      <app-nav-bar title="账号注销" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />
      <view class="body">
        <view class="warn-card">
          <view class="warn-icon"><app-icon name="alert-triangle" :size="34" color="#c41e3a" /></view>
          <view>
            <text class="warn-title">注销账号须知</text>
            <text class="warn-sub">注销账号后，以下数据将永久清空且无法恢复</text>
          </view>
        </view>

        <view class="warn-list">
          <view v-for="(w, i) in warnings" :key="i" class="warn-item">
            <text class="warn-emoji">{{ w.icon }}</text>
            <view class="warn-info">
              <text class="wi-title">{{ w.title }}</text>
              <text class="wi-desc">{{ w.description }}</text>
            </view>
            <app-icon name="x" :size="26" color="#c41e3a" />
          </view>
        </view>

        <text class="sec-label">您当前的账号数据</text>
        <view class="data-card">
          <view class="data-col"><text class="data-num c-accent">{{ userData.coinBalance }}</text><text class="data-cap">国学币余额</text></view>
          <view class="data-col"><text class="data-num c-primary">{{ userData.circleCount }}</text><text class="data-cap">管理的圈子</text></view>
          <view class="data-col"><text class="data-num c-ink">{{ userData.contentCount }}</text><text class="data-cap">发布的内容</text></view>
        </view>

        <text class="sec-label">内容处理方式</text>
        <view class="keep-card">
          <view class="keep-info">
            <text class="keep-title">保留已发布内容</text>
            <text class="keep-desc">您的帖子和文章将匿名保留</text>
          </view>
          <view class="switch" :class="{ on: keepContent }" @tap="keepContent = !keepContent">
            <view class="knob" :class="{ on: keepContent }" />
          </view>
        </view>
      </view>

      <view class="footer">
        <view class="btn-danger" @tap="step = 'verify'">我已了解，继续注销</view>
        <text class="footer-tip">注销前请确保已提现全部收益</text>
      </view>
    </block>

    <!-- 身份验证 -->
    <block v-else-if="step === 'verify'">
      <app-nav-bar title="身份验证" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" @back="step = 'notice'" />
      <view class="body">
        <view class="verify-card">
          <view class="verify-ic"><text class="emoji-lg">🔐</text></view>
          <view>
            <text class="vc-title">验证您的手机号</text>
            <text class="vc-sub">我们需要验证您的身份以确保账号安全</text>
          </view>
        </view>

        <text class="field-label">当前绑定手机号</text>
        <view class="phone-box">{{ userData.phone }}</view>

        <text class="field-label">短信验证码</text>
        <view class="code-row">
          <input class="code-input" :class="{ err: codeError }" v-model="verifyCode" type="number" maxlength="6" placeholder="请输入6位验证码" placeholder-class="ph" />
          <view class="send-btn" :class="{ disabled: countdown > 0 }" @tap="sendCode">
            {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
          </view>
        </view>
        <text v-if="codeError" class="err-text">{{ codeError }}</text>

        <view class="amber-card">
          <app-icon name="alert-triangle" :size="26" color="#f59e0b" />
          <view class="amber-text">
            <text class="amber-title">注销后将有7天冷静期</text>
            <text class="amber-sub">在此期间若再次登录，注销申请将自动撤销。7天后账号将被永久删除。</text>
          </view>
        </view>
      </view>

      <view class="footer">
        <view class="btn-danger" :class="{ disabled: verifyCode.length !== 6 }" @tap="submit">确认注销</view>
      </view>

      <!-- 二次确认弹窗 -->
      <view v-if="showConfirm" class="modal-mask">
        <view class="modal">
          <view class="modal-ic danger"><app-icon name="alert-triangle" :size="44" color="#c41e3a" /></view>
          <text class="modal-title">确定要注销账号吗？</text>
          <text class="modal-desc">注销后您的所有数据将在7天冷静期后被永久删除，此操作不可撤销。</text>
          <view class="modal-btns">
            <view class="m-btn m-cancel" @tap="showConfirm = false">再想想</view>
            <view class="m-btn m-confirm" @tap="confirmDelete">确认注销</view>
          </view>
        </view>
      </view>
    </block>

    <!-- 成功页 -->
    <view v-else class="success">
      <view class="suc-ic"><app-icon name="alert-triangle" :size="56" color="#f59e0b" /></view>
      <text class="suc-title">注销申请已提交</text>
      <text class="suc-desc">您的账号将于7天后正式注销。在此期间若再次登录，注销申请将自动撤销。</text>
      <view class="suc-card">
        <view class="suc-card-ic"><text class="emoji-lg">📅</text></view>
        <view>
          <text class="scc-title">7天冷静期</text>
          <text class="scc-sub">预计注销时间：{{ deleteDate }}</text>
        </view>
      </view>
      <view class="btn-primary" @tap="goHome">返回首页</view>
    </view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { reLaunch } from '@/utils/router'

const warnings = [
  { icon: '👤', title: '个人资料和认证信息', description: '头像、昵称、实名认证等信息将被清除' },
  { icon: '📚', title: '购买的课程、电子书、会员权益', description: '已购内容将无法再访问' },
  { icon: '🪙', title: '国学币余额', description: '剩余国学币将作废，不予退还' },
  { icon: '👥', title: '圈子管理权限', description: '您创建的圈子将被转让或解散' },
  { icon: '💰', title: '推广收益', description: '未提现余额将作废' },
  { icon: '📝', title: '所有发布的内容', description: '帖子、文章、评论等将被删除' },
]
const userData = { phone: '138****8888', coinBalance: 280, circleCount: 2, contentCount: 36 }

const step = ref<'notice' | 'verify' | 'success'>('notice')
const keepContent = ref(false)
const verifyCode = ref('')
const countdown = ref(0)
const codeError = ref('')
const showConfirm = ref(false)

const deleteDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')

let timer: any = null
function sendCode() {
  if (countdown.value > 0) return
  codeError.value = ''
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

function submit() {
  if (verifyCode.value.length !== 6) return
  showConfirm.value = true
}

function confirmDelete() {
  showConfirm.value = false
  if (verifyCode.value !== '123456') {
    codeError.value = '验证码错误，请重新输入'
    return
  }
  step.value = 'success'
}

function goHome() {
  reLaunch('/pages/index/index')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.body { padding: 32rpx 32rpx 200rpx; }
.warn-card { display: flex; align-items: flex-start; gap: 24rpx; padding: 32rpx; background: rgba(196,30,58,0.08); border: 1rpx solid rgba(196,30,58,0.2); border-radius: 24rpx; margin-bottom: 32rpx; }
.warn-icon { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(196,30,58,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.warn-title { display: block; font-size: 30rpx; font-weight: 600; color: #c41e3a; }
.warn-sub { display: block; font-size: 26rpx; color: rgba(196,30,58,0.8); margin-top: 6rpx; }
.warn-list { background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; overflow: hidden; }
.warn-item { display: flex; align-items: flex-start; gap: 24rpx; padding: 32rpx; border-bottom: 1rpx solid #f0ece3; }
.warn-item:last-child { border-bottom: none; }
.warn-emoji { font-size: 36rpx; }
.warn-info { flex: 1; }
.wi-title { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.wi-desc { display: block; font-size: 24rpx; color: #8a8378; margin-top: 4rpx; }
.sec-label { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; margin: 32rpx 0 16rpx; }
.data-card { display: flex; padding: 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; }
.data-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.data-num { font-size: 36rpx; font-weight: 700; }
.c-accent { color: #d4a017; }
.c-primary { color: #c41e3a; }
.c-ink { color: #2c2c2c; }
.data-cap { font-size: 22rpx; color: #8a8378; }
.keep-card { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; }
.keep-title { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.keep-desc { display: block; font-size: 24rpx; color: #8a8378; margin-top: 4rpx; }
.switch { width: 88rpx; height: 50rpx; border-radius: 999rpx; background: #e0dbd0; position: relative; transition: background .2s; }
.switch.on { background: #c41e3a; }
.knob { position: absolute; top: 5rpx; left: 5rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15); transition: transform .2s; }
.knob.on { transform: translateX(38rpx); }
.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.96); border-top: 1rpx solid #e8e3db; }
.btn-danger { height: 88rpx; display: flex; align-items: center; justify-content: center; background: #c41e3a; color: #fff; font-size: 28rpx; font-weight: 500; border-radius: 20rpx; }
.btn-danger.disabled { background: #e0dbd0; color: #b5ad9f; }
.footer-tip { display: block; text-align: center; font-size: 22rpx; color: #8a8378; margin-top: 12rpx; }
/* verify */
.verify-card { display: flex; align-items: center; gap: 24rpx; padding: 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; margin-bottom: 48rpx; }
.verify-ic { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.emoji-lg { font-size: 36rpx; }
.vc-title { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.vc-sub { display: block; font-size: 24rpx; color: #8a8378; margin-top: 4rpx; }
.field-label { display: block; font-size: 26rpx; color: #8a8378; margin-bottom: 16rpx; }
.phone-box { padding: 24rpx 32rpx; background: #f0ece3; border-radius: 16rpx; font-size: 28rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 48rpx; }
.code-row { display: flex; gap: 24rpx; }
.code-input { flex: 1; padding: 24rpx 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 16rpx; font-size: 28rpx; color: #2c2c2c; }
.code-input.err { border-color: #c41e3a; }
.ph { color: #b5ad9f; }
.send-btn { padding: 0 32rpx; height: 84rpx; display: flex; align-items: center; background: #c41e3a; color: #fff; font-size: 26rpx; font-weight: 500; border-radius: 16rpx; white-space: nowrap; }
.send-btn.disabled { background: #f0ece3; color: #8a8378; }
.err-text { display: block; font-size: 24rpx; color: #c41e3a; margin-top: 16rpx; }
.amber-card { display: flex; align-items: flex-start; gap: 16rpx; padding: 32rpx; background: rgba(245,158,11,0.1); border: 1rpx solid rgba(245,158,11,0.2); border-radius: 20rpx; margin-top: 48rpx; }
.amber-text { flex: 1; }
.amber-title { display: block; font-size: 26rpx; font-weight: 600; color: #d97706; }
.amber-sub { display: block; font-size: 24rpx; color: rgba(217,119,6,0.8); margin-top: 6rpx; line-height: 1.5; }
/* modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 48rpx; z-index: 100; }
.modal { width: 100%; max-width: 600rpx; background: #fff; border-radius: 28rpx; padding: 48rpx; display: flex; flex-direction: column; align-items: center; }
.modal-ic { width: 120rpx; height: 120rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.modal-ic.danger { background: rgba(196,30,58,0.1); }
.modal-title { font-size: 34rpx; font-weight: 600; color: #2c2c2c; margin-bottom: 16rpx; }
.modal-desc { font-size: 26rpx; color: #8a8378; text-align: center; line-height: 1.6; }
.modal-btns { display: flex; gap: 24rpx; width: 100%; margin-top: 48rpx; }
.m-btn { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 500; border-radius: 20rpx; }
.m-cancel { background: #f0ece3; color: #2c2c2c; }
.m-confirm { background: #c41e3a; color: #fff; }
/* success */
.success { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48rpx; }
.suc-ic { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(245,158,11,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.suc-title { font-size: 40rpx; font-weight: 600; color: #2c2c2c; margin-bottom: 16rpx; }
.suc-desc { font-size: 26rpx; color: #8a8378; text-align: center; max-width: 480rpx; line-height: 1.6; margin-bottom: 64rpx; }
.suc-card { display: flex; align-items: center; gap: 24rpx; width: 100%; max-width: 600rpx; padding: 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; margin-bottom: 48rpx; }
.suc-card-ic { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.scc-title { display: block; font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.scc-sub { display: block; font-size: 24rpx; color: #8a8378; margin-top: 4rpx; }
.btn-primary { width: 100%; max-width: 600rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; background: #c41e3a; color: #fff; font-size: 28rpx; font-weight: 500; border-radius: 20rpx; }
</style>
