<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <view class="header-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <text class="header-title">
            第三方账号
          </text>
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="list"
    >
      <!-- 提示卡片 -->
      <view class="tip-card">
        <view class="tip-icon-wrap">
          <text class="tip-icon">
            ⚠
          </text>
        </view>
        <view class="tip-content">
          <text class="tip-title">
            绑定提示
          </text>
          <text class="tip-desc">
            绑定第三方账号后，可使用该账号快速登录。解绑后将无法使用该方式登录，请确保已绑定其他登录方式。
          </text>
        </view>
      </view>

      <!-- 统计 -->
      <view class="stats-row">
        <text class="stats-text">
          已绑定 {{ boundCount }}/3 个账号
        </text>
        <text
          v-if="boundCount >= 2"
          class="stats-badge"
        >
          账号安全
        </text>
      </view>

      <!-- 账号列表 -->
      <view class="account-list">
        <view
          v-for="acc in accounts"
          :key="acc.provider"
          class="account-card"
        >
          <view class="account-left">
            <view
              class="account-icon"
              :style="{ backgroundColor: providerColor(acc.provider) }"
            >
              <text class="account-icon-text">
                {{ providerIcon(acc.provider) }}
              </text>
            </view>
            <view class="account-info">
              <view class="account-name-row">
                <text class="account-name">
                  {{ providerName(acc.provider) }}
                </text>
                <text
                  v-if="acc.isBound"
                  class="account-badge"
                >
                  ✓ 已绑定
                </text>
              </view>
              <text
                v-if="acc.isBound"
                class="account-desc"
              >
                {{ acc.accountInfo }}
                <text class="account-date">
                  绑定于 {{ acc.boundAt }}
                </text>
              </text>
              <text
                v-else
                class="account-desc"
              >
                未绑定，绑定后可快速登录
              </text>
            </view>
          </view>
          <view class="account-right">
            <view
              v-if="acc.isBound"
              class="btn-unbind"
              @click="confirmUnbind(acc)"
            >
              解绑
            </view>
            <view
              v-else
              class="btn-bind"
              :style="{ backgroundColor: providerColor(acc.provider) }"
              @click="handleBind(acc.provider)"
            >
              ＋ 绑定
            </view>
          </view>
        </view>
      </view>

      <!-- 绑定后可享受 -->
      <view class="benefits">
        <text class="benefits-title">
          绑定后可享受
        </text>
        <view class="benefits-grid">
          <view
            v-for="item in benefits"
            :key="item.title"
            class="benefit-item"
          >
            <text class="benefit-icon">
              {{ item.icon }}
            </text>
            <text class="benefit-name">
              {{ item.title }}
            </text>
            <text class="benefit-desc">
              {{ item.desc }}
            </text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 解绑确认弹窗 -->
    <view
      v-if="unbindTarget"
      class="dialog-overlay"
      @click="unbindTarget = null"
    >
      <view
        class="dialog-content"
        @click.stop
      >
        <text class="dialog-title">
          确认解绑
        </text>

        <view class="dialog-account-info">
          <view
            class="dialog-account-icon"
            :style="{ backgroundColor: providerColor(unbindTarget.provider) }"
          >
            <text class="account-icon-text">
              {{ providerIcon(unbindTarget.provider) }}
            </text>
          </view>
          <view>
            <text class="dialog-account-name">
              {{ providerName(unbindTarget.provider) }}
            </text>
            <text class="dialog-account-desc">
              {{ unbindTarget.accountInfo }}
            </text>
          </view>
        </view>

        <view class="dialog-warning">
          <text class="dialog-warning-title">
            解绑后：
          </text>
          <text class="dialog-warning-item">
            • 无法使用该账号登录
          </text>
          <text class="dialog-warning-item">
            • 请确保已绑定手机号或其他账号
          </text>
          <text class="dialog-warning-item">
            • 解绑后可重新绑定
          </text>
        </view>

        <view class="dialog-actions">
          <view
            class="dialog-btn dialog-btn-cancel"
            @click="unbindTarget = null"
          >
            取消
          </view>
          <view
            class="dialog-btn dialog-btn-confirm"
            :class="{ disabled: processing }"
            @click="handleUnbind"
          >
            {{ processing ? '解绑中...' : '确认解绑' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

interface BoundAccount {
  provider: 'wechat' | 'qq' | 'apple'
  isBound: boolean
  accountInfo?: string
  boundAt?: string
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const accounts = ref<BoundAccount[]>([])
const unbindTarget = ref<BoundAccount | null>(null)
const processing = ref(false)

const providerConfig: Record<string, { name: string; color: string; icon: string }> = {
  wechat: { name: '微信', color: '#07C160', icon: '💬' },
  qq: { name: 'QQ', color: '#12B7F5', icon: '🐧' },
  apple: { name: 'Apple ID', color: '#000000', icon: '🍎' },
}

const benefits = [
  { icon: '🚀', title: '快速登录', desc: '一键授权登录' },
  { icon: '🔐', title: '账号安全', desc: '多重验证保护' },
  { icon: '📱', title: '多端同步', desc: '数据云端同步' },
  { icon: '🎁', title: '专属福利', desc: '绑定送积分' },
]

const boundCount = computed(() => accounts.value.filter((a) => a.isBound).length)

function providerName(p: string) { return providerConfig[p]?.name || p }
function providerColor(p: string) { return providerConfig[p]?.color || '#999' }
function providerIcon(p: string) { return providerConfig[p]?.icon || '🔗' }

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    // Mock data - replace with actual API call
    await new Promise((r) => setTimeout(r, 500))
    accounts.value = [
      { provider: 'wechat', isBound: true, accountInfo: 'wx_user***89', boundAt: '2024-01-15' },
      { provider: 'qq', isBound: false },
      { provider: 'apple', isBound: true, accountInfo: 'user***@icloud.com', boundAt: '2024-03-20' },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
})

function handleBind(provider: string) {
  uni.showToast({ title: `即将跳转到${providerName(provider)}授权页面`, icon: 'none' })
}

function confirmUnbind(acc: BoundAccount) {
  unbindTarget.value = acc
}

async function handleUnbind() {
  if (!unbindTarget.value) return
  processing.value = true
  try {
    await new Promise((r) => setTimeout(r, 1000))
    accounts.value = accounts.value.map((acc) =>
      acc.provider === unbindTarget.value!.provider
        ? { ...acc, isBound: false, accountInfo: undefined, boundAt: undefined }
        : acc
    )
    unbindTarget.value = null
    uni.showToast({ title: '解绑成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '解绑失败', icon: 'none' })
  } finally {
    processing.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* 顶部导航 */
.header {
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.back-btn {
  font-size: 36rpx;
  color: #2C2C2C;
  padding: 8rpx;
}
.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
}

/* 提示卡片 */
.tip-card {
  margin: 24rpx;
  background: #FFF8E1;
  border: 1rpx solid #FFE082;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
}
.tip-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #FFF3CD;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tip-icon {
  font-size: 28rpx;
  color: #F5A623;
}
.tip-content {
  flex: 1;
}
.tip-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #8D6E00;
}
.tip-desc {
  font-size: 22rpx;
  color: #A08030;
  margin-top: 8rpx;
  line-height: 1.5;
}

/* 统计 */
.stats-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx;
  margin-bottom: 16rpx;
}
.stats-text {
  font-size: 24rpx;
  color: #999;
}
.stats-badge {
  font-size: 20rpx;
  color: #22C55E;
  background: #E8F5E9;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

/* 账号列表 */
.account-list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.account-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.account-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}
.account-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.account-icon-text {
  font-size: 40rpx;
  color: #fff;
}
.account-info {
  flex: 1;
  min-width: 0;
}
.account-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.account-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.account-badge {
  font-size: 20rpx;
  color: #22C55E;
  background: #E8F5E9;
  padding: 2rpx 12rpx;
  border-radius: 16rpx;
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
}
.account-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
}
.account-date {
  font-size: 20rpx;
  color: #ccc;
}
.account-right {
  flex-shrink: 0;
  margin-left: 16rpx;
}
.btn-bind {
  padding: 12rpx 28rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
  text-align: center;
}
.btn-unbind {
  padding: 12rpx 28rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
  background: #F5F0E8;
  text-align: center;
}

/* 绑定后可享受 */
.benefits {
  padding: 32rpx 24rpx 0;
}
.benefits-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 20rpx;
  display: block;
}
.benefits-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.benefit-item {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.benefit-icon {
  font-size: 40rpx;
}
.benefit-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-top: 10rpx;
  display: block;
}
.benefit-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

/* 解绑确认弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.dialog-content {
  background: #fff;
  width: 100%;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx;
  animation: slideUp 0.3s ease;
}
.dialog-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
  text-align: center;
  display: block;
  margin-bottom: 24rpx;
}
.dialog-account-info {
  background: #FFF5F5;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.dialog-account-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dialog-account-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  display: block;
}
.dialog-account-desc {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}
.dialog-warning {
  margin-bottom: 32rpx;
}
.dialog-warning-title {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 12rpx;
}
.dialog-warning-item {
  font-size: 24rpx;
  color: #C41E3A;
  display: block;
  line-height: 1.8;
}
.dialog-actions {
  display: flex;
  gap: 20rpx;
}
.dialog-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 500;
}
.dialog-btn-cancel {
  background: #F5F0E8;
  color: #666;
}
.dialog-btn-confirm {
  background: #EF4444;
  color: #fff;
}
.dialog-btn-confirm.disabled {
  opacity: 0.5;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
