<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { mineApi, type WalletInfo, type RechargeOption, type WalletTxRecord, type WalletTxCategory } from '@/lib/mine-data'

const loading = ref(false)
const error = ref('')
const info = ref<WalletInfo>({ balance: 0, rmb: 0, level: 0, growthValue: 0, nextLevelGrowth: 1, points: 0, totalRecharge: 0, totalSpent: 0 })
const options = ref<RechargeOption[]>([])
const transactions = ref<WalletTxRecord[]>([])

const retry = () => { error.value = ''; loadData() }
async function loadData() {
  loading.value = true; error.value = ''
  try {
    const [w, o, t] = await Promise.all([
      mineApi.getWallet(),
      mineApi.getRechargeOptions(),
      mineApi.getTransactions(),
    ])
    info.value = w
    options.value = o
    transactions.value = t
  } catch (e) { error.value = (e as Error)?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(loadData)

const levelProgress = computed(() =>
  Math.round((info.value.growthValue / info.value.nextLevelGrowth) * 100),
)

const txIcon: Record<WalletTxCategory, { icon: string; color: string }> = {
  purchase: { icon: 'shopping-bag', color: '#dc2626' },
  refund: { icon: 'arrow-up-right', color: '#9333ea' },
  reward: { icon: 'gift', color: '#2563eb' },
  recharge: { icon: 'plus', color: '#16a34a' },
  withdraw: { icon: 'arrow-up-right', color: '#9333ea' },
  transfer: { icon: 'send', color: '#f97316' },
  other: { icon: 'help-circle', color: '#6B7280' },
}

function notReady() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="我的钱包" back-icon="arrow-left" :title-size="36" />

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 余额卡片 -->
      <view class="balance-card">
        <view class="balance-head">
          <view>
            <text class="balance-label">国学币余额</text>
            <text class="balance-num">{{ info.balance }}</text>
            <text v-if="info.rmb > 0" class="balance-rmb">≈ ¥{{ info.rmb.toFixed(2) }}</text>
          </view>
          <view class="balance-icon">
            <AppIcon name="zap" :size="34" color="#fff" />
          </view>
        </view>
        <view class="balance-actions">
          <view class="ba-btn" @tap="navigateTo('/wallet/recharge')">
            <AppIcon name="plus" :size="18" color="#fff" />
            <text class="ba-text">充值</text>
          </view>
          <view class="ba-btn" @tap="navigateTo('/wallet/withdraw')">
            <AppIcon name="arrow-up-right" :size="18" color="#fff" />
            <text class="ba-text">提现</text>
          </view>
        </view>
      </view>

      <!-- 会员等级（成长值体系，后端钱包接口不含→无数据时降级隐藏，不展示 0 级假象） -->
      <view v-if="info.growthValue > 0" class="level-card">
        <view class="level-head">
          <view class="level-left">
            <view class="level-badge">{{ info.level }}</view>
            <view>
              <text class="level-name">会员 {{ info.level }} 级</text>
              <text class="level-sub">已累积 {{ info.growthValue }} 成长值</text>
            </view>
          </view>
          <AppIcon name="trending-up" :size="20" color="#C9A96E" />
        </view>
        <view class="level-prog-row">
          <text class="level-prog-label">升级进度</text>
          <text class="level-prog-val">{{ info.growthValue }}/{{ info.nextLevelGrowth }}</text>
        </view>
        <view class="prog-track">
          <view class="prog-fill" :style="{ width: levelProgress + '%' }" />
        </view>
      </view>

      <!-- 数据统计 -->
      <view class="stat-grid">
        <view class="stat-card">
          <text class="stat-label">累计充值</text>
          <text class="stat-val">¥{{ info.totalRecharge.toFixed(2) }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">累计消费</text>
          <text class="stat-val">¥{{ info.totalSpent.toFixed(2) }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">积分</text>
          <text class="stat-val">{{ info.points }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">成长值</text>
          <text class="stat-val">{{ info.growthValue }}</text>
        </view>
      </view>

      <!-- 优惠券入口（领券中心 / 我的券包） -->
      <view class="entry-card" @tap="navigateTo('/shop/coupons')">
        <view class="entry-left">
          <view class="entry-icon">
            <AppIcon name="ticket" :size="20" color="#C41E3A" />
          </view>
          <view class="entry-body">
            <text class="entry-title">优惠券</text>
            <text class="entry-sub">领券中心 · 我的券包</text>
          </view>
        </view>
        <AppIcon name="chevron-right" :size="20" color="#8a8178" />
      </view>

      <!-- 快速充值 -->
      <view class="section">
        <text class="section-title">快速充值</text>
        <view class="recharge-grid">
          <view
            v-for="(opt, idx) in options"
            :key="idx"
            class="recharge-item"
            :class="{ popular: opt.popular }"
            @tap="navigateTo('/wallet/recharge')"
          >
            <text v-if="opt.popular" class="recharge-tag">推荐</text>
            <text class="recharge-coins">{{ opt.coins }}</text>
            <text class="recharge-price">¥{{ opt.price }}</text>
            <text v-if="opt.bonus > 0" class="recharge-bonus">+送{{ opt.bonus }}币</text>
          </view>
        </view>
        <view class="more-btn" @tap="navigateTo('/wallet/recharge')">
          <text class="more-btn-text">查看更多充值方案</text>
        </view>
      </view>

      <!-- 最近交易 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">最近交易</text>
          <text class="section-link" @tap="navigateTo('/wallet/transactions')">查看全部</text>
        </view>
        <view class="tx-list">
          <view v-for="t in transactions" :key="t.id" class="tx-item">
            <view class="tx-icon">
              <AppIcon :name="txIcon[t.category]?.icon || 'help-circle'" :size="18" :color="txIcon[t.category]?.color || '#6B7280'" />
            </view>
            <view class="tx-body">
              <text class="tx-title">{{ t.title }}</text>
              <text class="tx-time">{{ t.createdAt }}</text>
            </view>
            <text class="tx-amount" :class="{ income: t.type === 'income' }">
              {{ t.type === 'income' ? '+' : '' }}{{ t.amount }}
            </text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }

.balance-card { background: linear-gradient(135deg, var(--brand), #8B0000); border-radius: 28rpx; padding: 40rpx 36rpx; }
.balance-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 40rpx; }
.balance-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.8); margin-bottom: 12rpx; }
.balance-num { display: block; font-size: 64rpx; font-weight: 700; color: #fff; line-height: 1.1; }
.balance-rmb { display: block; font-size: 24rpx; color: rgba(255,255,255,0.7); margin-top: 8rpx; }
.balance-icon { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.balance-actions { display: flex; gap: 20rpx; }
.ba-btn { flex: 1; height: 80rpx; background: rgba(255,255,255,0.2); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 10rpx; }
.ba-text { font-size: 28rpx; color: #fff; font-weight: 500; }

.level-card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-top: 24rpx; }
.level-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.level-left { display: flex; align-items: center; gap: 20rpx; }
.level-badge { width: 80rpx; height: 80rpx; border-radius: 50%; background: linear-gradient(135deg, #C9A96E, #b8860b); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 32rpx; }
.level-name { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.level-sub { display: block; font-size: 24rpx; color: #8a8178; margin-top: 4rpx; }
.level-prog-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.level-prog-label { font-size: 24rpx; color: #8a8178; }
.level-prog-val { font-size: 24rpx; color: #2C2C2C; font-weight: 500; }
.prog-track { height: 14rpx; background: #F2ECE1; border-radius: 999rpx; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, #C9A96E, var(--brand)); border-radius: 999rpx; }

.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin-top: 24rpx; }
.stat-card { background: #fff; border-radius: 20rpx; padding: 28rpx; text-align: center; }
.stat-label { display: block; font-size: 22rpx; color: #8a8178; margin-bottom: 10rpx; }
.stat-val { display: block; font-size: 40rpx; font-weight: 700; color: #2C2C2C; }

.entry-card { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 20rpx; padding: 26rpx 28rpx; margin-top: 24rpx; }
.entry-left { display: flex; align-items: center; gap: 20rpx; }
.entry-icon { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.entry-body { display: flex; flex-direction: column; gap: 4rpx; }
.entry-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.entry-sub { font-size: 22rpx; color: #8a8178; }

.section { margin-top: 36rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-link { font-size: 24rpx; color: var(--brand); }

.recharge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.recharge-item { background: #fff; border: 1rpx solid #EDE7DC; border-radius: 20rpx; padding: 24rpx; display: flex; flex-direction: column; align-items: flex-start; gap: 4rpx; position: relative; }
.recharge-item.popular { border-color: var(--brand); background: rgba(196,30,58,0.04); }
.recharge-tag { font-size: 20rpx; color: var(--brand); font-weight: 600; }
.recharge-coins { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.recharge-price { font-size: 24rpx; color: #8a8178; }
.recharge-bonus { font-size: 22rpx; color: #C9A96E; margin-top: 4rpx; }
.more-btn { margin-top: 24rpx; height: 84rpx; background: var(--brand); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.more-btn-text { font-size: 28rpx; color: #fff; font-weight: 500; }

.tx-list { display: flex; flex-direction: column; gap: 16rpx; }
.tx-item { display: flex; align-items: center; gap: 20rpx; background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; }
.tx-icon { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tx-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.tx-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.tx-time { font-size: 22rpx; color: #8a8178; }
.tx-amount { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex-shrink: 0; }
.tx-amount.income { color: #16a34a; }

.loading { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
