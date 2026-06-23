<template>
  <view class="page">
    <app-nav-bar title="我的钱包" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <view class="body">
      <!-- 资产卡片 -->
      <view class="asset-card">
        <view class="asset-deco deco1"><app-icon name="coins" :size="160" color="#C9A96E" /></view>
        <view class="balance-box">
          <text class="balance-label">国学币余额</text>
          <view class="balance-row">
            <app-icon name="coins" :size="32" color="#C9A96E" />
            <text class="balance-num">{{ wallet.balance.toLocaleString() }}</text>
            <text class="balance-unit">币</text>
          </view>
          <text class="balance-rmb">≈ ¥{{ wallet.rmb.toFixed(2) }}</text>
        </view>

        <view class="stat-line">
          <view class="stat-item" @tap="go('/points')">
            <app-icon name="star" :size="28" color="#E0A106" />
            <text class="stat-k">积分</text>
            <text class="stat-v">{{ wallet.points.toLocaleString() }}</text>
          </view>
          <view class="vline" />
          <view class="stat-item">
            <app-icon name="trending-up" :size="28" color="#16A34A" />
            <text class="stat-k">成长值</text>
            <text class="stat-v">{{ wallet.growthValue.toLocaleString() }}</text>
          </view>
        </view>

        <!-- 会员等级进度 -->
        <view class="level-box">
          <view class="level-row">
            <text class="level-tag">LV.{{ wallet.level }}</text>
            <text class="level-tag">LV.{{ wallet.level + 1 }}</text>
          </view>
          <view class="level-bar">
            <view class="level-fill" :style="{ width: levelPercent + '%' }" />
          </view>
          <text class="level-hint">还需 {{ (wallet.nextLevelGrowth - wallet.growthValue).toLocaleString() }} 成长值升级</text>
        </view>

        <view class="total-line">
          <view class="total-item">
            <text class="total-k">累计充值</text>
            <text class="total-v">{{ wallet.totalRecharge }}币</text>
          </view>
          <view class="vline tall" />
          <view class="total-item">
            <text class="total-k">累计消费</text>
            <text class="total-v">{{ wallet.totalSpent }}币</text>
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="quick-row">
        <view class="quick-btn primary" @tap="go('/wallet/recharge')">
          <app-icon name="credit-card" :size="36" color="#FFFFFF" />
          <text class="quick-txt light">充值</text>
        </view>
        <view class="quick-btn outline" @tap="go('/wallet/withdraw')">
          <app-icon name="download" :size="36" color="#2C2C2C" />
          <text class="quick-txt">提现</text>
        </view>
      </view>

      <!-- 近期交易 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">近期交易</text>
          <view class="more" @tap="go('/wallet/transactions')">
            <text class="more-txt">全部记录</text>
            <app-icon name="chevron-right" :size="28" color="#C41E3A" />
          </view>
        </view>
        <view class="trans-list">
          <view v-for="item in transactions" :key="item.id" class="trans-item">
            <view class="trans-icon" :style="{ background: iconBg(item.type) }">
              <app-icon :name="iconName(item.icon)" :size="36" :color="iconColor(item.type)" />
            </view>
            <view class="trans-mid">
              <text class="trans-title">{{ item.title }}</text>
              <text class="trans-time">{{ item.time }}</text>
            </view>
            <text class="trans-amt" :class="{ pos: item.amount > 0 }">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}币</text>
          </view>
        </view>
      </view>

      <!-- 充值说明 -->
      <view class="card">
        <text class="card-title">充值说明</text>
        <view class="note-list">
          <view v-for="(n, i) in notes" :key="i" class="note-item">
            <text class="note-dot">•</text>
            <text class="note-txt">{{ n }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

const wallet = {
  balance: 1280, rmb: 128.0, points: 3680, growthValue: 4520,
  level: 3, nextLevelGrowth: 6000, totalRecharge: 2500, totalSpent: 1220,
}

const transactions = [
  { id: 1, type: 'recharge', title: '充值国学币', amount: 500, time: '今天 14:30', icon: 'Plus' },
  { id: 2, type: 'spend', title: '购买课程《八字入门》', amount: -199, time: '今天 10:15', icon: 'ShoppingBag' },
  { id: 3, type: 'spend', title: '加入圈子「紫微研习社」', amount: -99, time: '昨天 18:20', icon: 'Minus' },
  { id: 4, type: 'bonus', title: '充值赠送', amount: 20, time: '昨天 15:00', icon: 'Gift' },
  { id: 5, type: 'refund', title: '退款-课程《风水基础》', amount: 299, time: '3天前', icon: 'RefreshCcw' },
  { id: 6, type: 'spend', title: '购买电子书《渊海子平》', amount: -68, time: '5天前', icon: 'ShoppingBag' },
]

const notes = [
  '1元人民币 = 10国学币',
  '国学币可用于购买课程、商品、加入圈子等',
  '充值后国学币不可提现，请按需充值',
  '大额充值享受额外赠送，详见充值页面',
]

const levelPercent = computed(() => Math.min(100, (wallet.growthValue / wallet.nextLevelGrowth) * 100))

const iconNameMap: Record<string, string> = {
  Plus: 'plus', Minus: 'minus', ShoppingBag: 'shopping-bag', Gift: 'gift',
  RefreshCcw: 'refresh-cw', ArrowUpRight: 'arrow-up-right', ArrowDownLeft: 'arrow-down-left',
}
function iconName(n: string) { return iconNameMap[n] || 'plus' }
function iconBg(t: string) {
  const m: Record<string, string> = {
    recharge: 'rgba(22,163,74,0.1)', spend: 'rgba(196,30,58,0.1)', bonus: 'rgba(201,169,110,0.15)',
    refund: 'rgba(33,150,243,0.1)', income: 'rgba(22,163,74,0.1)', withdraw: 'rgba(232,93,4,0.1)',
  }
  return m[t] || 'rgba(196,30,58,0.1)'
}
function iconColor(t: string) {
  const m: Record<string, string> = {
    recharge: '#16A34A', spend: '#C41E3A', bonus: '#C9A96E',
    refund: '#2196F3', income: '#16A34A', withdraw: '#E85D04',
  }
  return m[t] || '#C41E3A'
}
function go(path: string) { navigateTo(path) }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; }
.body { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }

.asset-card { position: relative; overflow: hidden; border-radius: 24rpx; padding: 40rpx 32rpx; background: linear-gradient(135deg, rgba(201,169,110,0.18) 0%, rgba(201,169,110,0.08) 50%, rgba(196,30,58,0.05) 100%); border: 1rpx solid rgba(201,169,110,0.25); }
.asset-deco { position: absolute; opacity: 0.06; }
.deco1 { right: -40rpx; top: -40rpx; }
.balance-box { text-align: center; margin-bottom: 36rpx; position: relative; z-index: 1; }
.balance-label { font-size: 26rpx; color: #8A8478; display: block; margin-bottom: 12rpx; }
.balance-row { display: flex; align-items: baseline; justify-content: center; gap: 6rpx; }
.balance-num { font-size: 76rpx; font-weight: 700; color: #C9A96E; line-height: 1; }
.balance-unit { font-size: 32rpx; color: rgba(201,169,110,0.8); }
.balance-rmb { font-size: 26rpx; color: #8A8478; display: block; margin-top: 12rpx; }

.stat-line { display: flex; align-items: center; justify-content: center; gap: 36rpx; margin-bottom: 28rpx; position: relative; z-index: 1; }
.stat-item { display: flex; align-items: center; gap: 10rpx; }
.stat-k { font-size: 26rpx; color: #8A8478; }
.stat-v { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.vline { width: 1rpx; height: 28rpx; background: #E8E3DB; }
.vline.tall { height: 56rpx; }

.level-box { margin-bottom: 28rpx; position: relative; z-index: 1; }
.level-row { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.level-tag { font-size: 22rpx; color: #8A8478; }
.level-bar { height: 12rpx; background: rgba(232,227,219,0.6); border-radius: 999rpx; overflow: hidden; }
.level-fill { height: 100%; background: linear-gradient(90deg, #C9A96E, #C41E3A); border-radius: 999rpx; }
.level-hint { font-size: 22rpx; color: #8A8478; display: block; text-align: center; margin-top: 8rpx; }

.total-line { display: flex; align-items: center; justify-content: center; gap: 48rpx; padding-top: 28rpx; border-top: 1rpx solid rgba(232,227,219,0.6); position: relative; z-index: 1; }
.total-item { text-align: center; }
.total-k { font-size: 22rpx; color: #8A8478; display: block; }
.total-v { font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-top: 4rpx; display: block; }

.quick-row { display: flex; gap: 24rpx; }
.quick-btn { flex: 1; height: 96rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.quick-btn.primary { background: #C41E3A; }
.quick-btn.outline { background: #FFFFFF; border: 1rpx solid #E8E3DB; }
.quick-txt { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.quick-txt.light { color: #FFFFFF; }

.card { background: #FFFFFF; border-radius: 24rpx; padding: 32rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.more { display: flex; align-items: center; }
.more-txt { font-size: 26rpx; color: #C41E3A; }

.trans-list { display: flex; flex-direction: column; gap: 24rpx; }
.trans-item { display: flex; align-items: center; gap: 24rpx; }
.trans-icon { width: 80rpx; height: 80rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.trans-mid { flex: 1; min-width: 0; }
.trans-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trans-time { font-size: 22rpx; color: #8A8478; display: block; margin-top: 4rpx; }
.trans-amt { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.trans-amt.pos { color: #16A34A; }

.note-list { display: flex; flex-direction: column; gap: 16rpx; margin-top: 24rpx; }
.note-item { display: flex; align-items: flex-start; gap: 12rpx; }
.note-dot { color: #C9A96E; font-size: 26rpx; }
.note-txt { flex: 1; font-size: 26rpx; color: #8A8478; line-height: 1.5; }
</style>
