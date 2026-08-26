<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { bindBenefits, mineApi, type BoundAccount } from '@/lib/mine-data'

const accounts = ref<BoundAccount[]>([])
const loading = ref(true)
const error = ref('')
const unbindTarget = ref<BoundAccount | null>(null)
const processing = ref(false)
const toast = ref('')

const providerIcon: Record<string, string> = {
  wechat: 'message-circle',
  qq: 'message-square',
  apple: 'smartphone',
}

const boundCount = computed(() => accounts.value.filter((a) => a.isBound).length)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await mineApi.getBoundAccounts()
    accounts.value = data.map((a: BoundAccount) => ({ ...a }))
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

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 2000)
}
function explainComingSoon(acc: BoundAccount) {
  showToast(`${acc.name}新绑定即将开放`)
}
async function handleUnbind() {
  if (!unbindTarget.value || processing.value) return
  processing.value = true
  const target = unbindTarget.value
  try {
    await mineApi.toggleBind(target.provider, false)
    accounts.value = accounts.value.map((acc) =>
      acc.provider === target.provider
        ? { ...acc, isBound: false, accountInfo: undefined, boundAt: undefined }
        : acc,
    )
  } catch (e) {
    showToast((e as Error)?.message || '解绑失败')
  } finally {
    processing.value = false
    unbindTarget.value = null
  }
}
</script>

<template>
  <view class="page">
    <!-- 导航 -->
    <app-nav-bar title="第三方账号" :back-size="40" background="rgba(250, 248, 245, 0.95)" />

    <!-- 加载/错误 -->
    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 提示卡片 -->
      <view class="tip-wrap">
        <view class="tip-card">
          <view class="tip-icon"><AppIcon name="alert-triangle" :size="16" color="#d97706" /></view>
          <view class="tip-body">
            <text class="tip-title">新绑定能力即将开放</text>
            <text class="tip-text">当前可查看和解绑历史已绑定账号；微信、QQ 与 Apple 的新绑定入口仍在联调，开放前不会发起授权。</text>
          </view>
        </view>
      </view>

      <!-- 统计 -->
      <view class="stats">
        <text class="stats-text">已绑定 {{ boundCount }}/3 个账号 · 新绑定即将开放</text>
        <view v-if="boundCount >= 2" class="stats-badge"><text class="stats-badge-text">账号安全</text></view>
      </view>

      <!-- 账号列表 -->
      <view class="list">
        <view v-for="acc in accounts" :key="acc.provider" class="acc-card">
          <view class="acc-icon" :style="{ background: acc.color }">
            <AppIcon :name="providerIcon[acc.provider]" :size="24" color="#fff" />
          </view>
          <view class="acc-info">
            <view class="acc-name-row">
              <text class="acc-name">{{ acc.name }}</text>
              <view v-if="acc.isBound" class="bound-tag">
                <AppIcon name="check-circle" :size="12" color="#16a34a" />
                <text class="bound-tag-text">已绑定</text>
              </view>
            </view>
            <text v-if="acc.isBound" class="acc-sub">{{ acc.accountInfo }} · 绑定于 {{ acc.boundAt }}</text>
            <text v-else class="acc-sub">暂不支持新绑定，开放后可用于快速登录</text>
          </view>
          <view v-if="acc.isBound" class="unbind-btn" @tap="unbindTarget = acc">
            <text class="unbind-btn-text">解绑</text>
          </view>
          <view
            v-else
            class="soon-btn"
            role="button"
            aria-disabled="true"
            :aria-label="`${acc.name}新绑定即将开放`"
            @tap="explainComingSoon(acc)"
          >
            <AppIcon name="clock" :size="14" color="#8a8178" />
            <text class="soon-btn-text">即将开放</text>
          </view>
        </view>
      </view>

      <!-- 权益 -->
      <view class="benefits">
        <text class="benefits-title">开放后可享受</text>
        <view class="benefits-grid">
          <view v-for="(b, i) in bindBenefits" :key="i" class="benefit-cell">
            <view class="benefit-icon"><AppIcon :name="b.icon" :size="20" color="#C41E3A" /></view>
            <text class="benefit-name">{{ b.title }}</text>
            <text class="benefit-desc">{{ b.desc }}</text>
          </view>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 解绑确认弹窗 -->
    <view v-if="unbindTarget" class="mask mask-fade-in" @tap="unbindTarget = null">
      <view class="sheet sheet-slide-up" @tap.stop>
        <text class="sheet-title">确认解绑</text>
        <view class="sheet-acc">
          <view class="sheet-acc-icon" :style="{ background: unbindTarget.color }">
            <AppIcon :name="providerIcon[unbindTarget.provider]" :size="20" color="#fff" />
          </view>
          <view>
            <text class="sheet-acc-name">{{ unbindTarget.name }}</text>
            <text class="sheet-acc-sub">{{ unbindTarget.accountInfo }}</text>
          </view>
        </view>
        <text class="sheet-label">解绑后：</text>
        <view class="sheet-list">
          <view class="sheet-li"><view class="li-dot" /><text class="li-text">无法使用该账号登录</text></view>
          <view class="sheet-li"><view class="li-dot" /><text class="li-text">请确保已绑定手机号或其他账号</text></view>
          <view class="sheet-li"><view class="li-dot" /><text class="li-text">解绑后可重新绑定</text></view>
        </view>
        <view class="sheet-actions">
          <view class="sheet-btn ghost" @tap="unbindTarget = null"><text class="sheet-btn-text ghost-text">取消</text></view>
          <view class="sheet-btn danger" :class="{ disabled: processing }" @tap="handleUnbind">
            <text class="sheet-btn-text danger-text">{{ processing ? '解绑中...' : '确认解绑' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- toast -->
    <view v-if="toast" class="toast"><text class="toast-text">{{ toast }}</text></view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 三态 */
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.scroll {
  height: calc(100vh - 112rpx - env(safe-area-inset-top));
}
.tip-wrap {
  padding: 32rpx;
}
.tip-card {
  display: flex;
  gap: 24rpx;
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 20rpx;
  padding: 28rpx;
}
.tip-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tip-body {
  flex: 1;
}
.tip-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #78350f;
}
.tip-text {
  display: block;
  font-size: 22rpx;
  color: #b45309;
  line-height: 1.6;
  margin-top: 6rpx;
}
.stats {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 32rpx 24rpx;
}
.stats-text {
  font-size: 26rpx;
  color: #999;
}
.stats-badge {
  padding: 4rpx 16rpx;
  background: #dcfce7;
  border-radius: 999rpx;
}
.stats-badge-text {
  font-size: 20rpx;
  color: #15803d;
}
.list {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.acc-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx;
  border: 1rpx solid #e8e3db;
}
.acc-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.acc-info {
  flex: 1;
  min-width: 0;
}
.acc-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.acc-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bound-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background: #dcfce7;
  border-radius: 999rpx;
}
.bound-tag-text {
  font-size: 20rpx;
  color: #15803d;
}
.acc-sub {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
.unbind-btn {
  padding: 16rpx 28rpx;
  border: 1rpx solid #e8e3db;
  border-radius: 16rpx;
}
.unbind-btn-text {
  font-size: 26rpx;
  color: #666;
}
.soon-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 20rpx;
  border-radius: 16rpx;
  background: #f3f0eb;
  border: 1rpx solid #e3ddd4;
}
.soon-btn-text {
  font-size: 22rpx;
  color: #8a8178;
}
.benefits {
  padding: 48rpx 32rpx 0;
}
.benefits-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}
.benefits-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.benefit-cell {
  width: calc(50% - 12rpx);
  background: rgba(232, 227, 219, 0.4);
  border-radius: 20rpx;
  padding: 24rpx;
  box-sizing: border-box;
}
.benefit-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.benefit-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.benefit-desc {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.safe-bottom {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
}
.sheet-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.sheet-acc {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fef2f2;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 32rpx;
}
.sheet-acc-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-acc-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.sheet-acc-sub {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}
.sheet-label {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-top: 32rpx;
}
.sheet-list {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.sheet-li {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.li-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #dc2626;
}
.li-text {
  font-size: 26rpx;
  color: #dc2626;
}
.sheet-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 48rpx;
}
.sheet-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-btn.ghost {
  border: 1rpx solid #e8e3db;
}
.sheet-btn.danger {
  background: #ef4444;
}
.sheet-btn.disabled {
  opacity: 0.5;
}
.sheet-btn-text {
  font-size: 28rpx;
  font-weight: 500;
}
.ghost-text {
  color: #2c2c2c;
}
.danger-text {
  color: #fff;
}
.toast {
  position: fixed;
  bottom: 120rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 20rpx 40rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 16rpx;
}
.toast-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
