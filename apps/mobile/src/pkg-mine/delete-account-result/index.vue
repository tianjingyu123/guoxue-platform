<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'

const status = ref<'pending' | 'done'>('pending')
const expireAt = ref('')
const cancelling = ref(false)

onLoad((q: Record<string, string> = {}) => {
  if (q.status === 'done') status.value = 'done'
  if (q.expire) expireAt.value = decodeURIComponent(q.expire)
})

const expireText = computed(() => {
  if (!expireAt.value) return ''
  const d = new Date(expireAt.value)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})
const remainDays = computed(() => {
  if (!expireAt.value) return 7
  const diff = new Date(expireAt.value).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
})

function cancelDelete() {
  cancelling.value = true
  setTimeout(() => {
    cancelling.value = false
    uni.showToast({ title: '已撤销注销申请', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/profile/index' }), 800)
  }, 1000)
}
function backHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="page">
    <!-- 冷静期 -->
    <template v-if="status === 'pending'">
      <view class="hero hero-blue">
        <view class="hero-icon">
          <AppIcon
            name="clock"
            :size="44"
            color="#fff"
          />
        </view>
        <text class="hero-title">
          注销申请已提交
        </text>
        <text class="hero-sub">
          您的账号已进入 7 天冷静期
        </text>
      </view>

      <view class="content">
        <view class="countdown-card">
          <text class="countdown-label">
            距离账号永久注销还剩
          </text>
          <text class="countdown-num">
            {{ remainDays }}<text class="countdown-unit">
              天
            </text>
          </text>
          <text
            v-if="expireText"
            class="countdown-date"
          >
            预计注销时间：{{ expireText }}
          </text>
        </view>

        <view class="card">
          <view class="card-row">
            <view class="card-icon icon-blue">
              <AppIcon
                name="info"
                :size="20"
                color="#2563eb"
              />
            </view>
            <view class="card-body">
              <text class="card-title">
                冷静期说明
              </text>
              <text class="card-desc">
                在冷静期内，您随时可以撤销注销申请。冷静期结束后，账号及所有数据将被永久删除，无法恢复。
              </text>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="list-title">
            注销后将清除
          </text>
          <view class="list-item">
            <AppIcon
              name="x-circle"
              :size="16"
              color="#ef4444"
            /><text class="list-text">
              个人资料与账号信息
            </text>
          </view>
          <view class="list-item">
            <AppIcon
              name="x-circle"
              :size="16"
              color="#ef4444"
            /><text class="list-text">
              订单、收藏与浏览记录
            </text>
          </view>
          <view class="list-item">
            <AppIcon
              name="x-circle"
              :size="16"
              color="#ef4444"
            /><text class="list-text">
              钱包余额、积分与优惠券
            </text>
          </view>
          <view class="list-item">
            <AppIcon
              name="x-circle"
              :size="16"
              color="#ef4444"
            /><text class="list-text">
              圈子动态与社交关系
            </text>
          </view>
        </view>
      </view>

      <view class="footer-bar">
        <view
          class="btn-primary"
          :class="{ disabled: cancelling }"
          @tap="cancelDelete"
        >
          <text class="btn-primary-text">
            {{ cancelling ? '撤销中...' : '我再想想，撤销注销' }}
          </text>
        </view>
        <view
          class="btn-ghost"
          @tap="backHome"
        >
          <text class="btn-ghost-text">
            返回首页
          </text>
        </view>
      </view>
    </template>

    <!-- 已完成 -->
    <template v-else>
      <view class="hero hero-gray">
        <view class="hero-icon hero-icon-gray">
          <AppIcon
            name="check-circle"
            :size="44"
            color="#fff"
          />
        </view>
        <text class="hero-title">
          账号已注销
        </text>
        <text class="hero-sub">
          感谢您曾经的陪伴
        </text>
      </view>

      <view class="content">
        <view class="card center-card">
          <text class="done-title">
            账号注销完成
          </text>
          <text class="done-desc">
            您的账号及相关数据已被永久删除。如需重新使用，请注册新账号。期待与您再次相遇。
          </text>
        </view>
      </view>

      <view class="footer-bar">
        <view
          class="btn-primary"
          @tap="backHome"
        >
          <text class="btn-primary-text">
            返回首页
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

.hero { padding: calc(120rpx + env(safe-area-inset-top)) 48rpx 64rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.hero-blue { background: linear-gradient(160deg, #2563eb, #1e40af); }
.hero-gray { background: linear-gradient(160deg, #8a8178, #6f6760); }
.hero-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx; }
.hero-title { font-size: 40rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 26rpx; color: rgba(255,255,255,0.85); }

.content { flex: 1; padding: 24rpx; margin-top: -32rpx; }

.countdown-card { background: #fff; border-radius: 24rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04); }
.countdown-label { font-size: 26rpx; color: #8a8178; }
.countdown-num { font-size: 88rpx; font-weight: 700; color: #2563eb; line-height: 1.1; }
.countdown-unit { font-size: 32rpx; font-weight: 500; }
.countdown-date { font-size: 24rpx; color: #b8b0a4; }

.card { background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.card-row { display: flex; gap: 16rpx; }
.card-icon { width: 72rpx; height: 72rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-blue { background: #E8EEFB; }
.card-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.card-desc { font-size: 24rpx; color: #8a8178; line-height: 1.6; }

.list-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; }
.list-item { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; }
.list-text { font-size: 26rpx; color: #6f6760; }

.center-card { display: flex; flex-direction: column; align-items: center; padding: 48rpx 32rpx; }
.done-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; }
.done-desc { font-size: 26rpx; color: #8a8178; line-height: 1.7; text-align: center; }

.footer-bar { padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #EDE7DC; display: flex; flex-direction: column; gap: 16rpx; }
.btn-primary { height: 92rpx; background: #C41E3A; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.btn-primary.disabled { opacity: 0.6; }
.btn-primary-text { font-size: 30rpx; font-weight: 600; color: #fff; }
.btn-ghost { height: 92rpx; background: #F2ECE1; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.btn-ghost-text { font-size: 30rpx; color: #6f6760; }
</style>
