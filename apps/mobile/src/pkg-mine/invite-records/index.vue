<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @click="goBack">
          <app-icon name="chevron-left" :size="24" color="#2D2A26" />
        </view>
        <text class="nav-title">邀请记录</text>
        <view class="nav-btn" @click="showLinkSheet = true">
          <app-icon name="share-2" :size="20" color="#C41E3A" />
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 统计卡片 -->
      <view class="stat-card">
        <view class="stat-grid">
          <view v-for="(item, i) in statItems" :key="i" class="stat-item">
            <view class="stat-icon">
              <app-icon :name="item.icon" :size="16" color="#FFFFFF" />
            </view>
            <text class="stat-value">{{ item.value }}</text>
            <text class="stat-label">{{ item.label }}</text>
          </view>
        </view>
        <view class="stat-pending">
          <text class="pending-label">待结算收益</text>
          <text class="pending-value">¥{{ stats.pendingEarnings.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 邀请链接快捷入口 -->
      <view class="link-entry" @click="showLinkSheet = true">
        <view class="link-left">
          <view class="link-icon">
            <app-icon name="link" :size="20" color="#C41E3A" />
          </view>
          <view>
            <text class="link-title">我的邀请链接</text>
            <text class="link-code">邀请码：{{ linkInfo.inviteCode }}</text>
          </view>
        </view>
        <app-icon name="chevron-right" :size="20" color="#8C8378" />
      </view>

      <!-- 筛选 -->
      <view class="filter-tabs">
        <view
          v-for="f in filters"
          :key="f.key"
          class="filter-tab"
          :class="{ 'filter-active': filter === f.key }"
          @click="filter = f.key"
        >
          <text class="filter-text" :class="{ 'filter-text-active': filter === f.key }">{{ f.label }}</text>
        </view>
      </view>

      <!-- 邀请记录列表 -->
      <view class="record-list">
        <view v-for="r in filteredRecords" :key="r.id" class="record-card">
          <view class="record-avatar">{{ r.nickname.charAt(0) }}</view>
          <view class="record-main">
            <view class="record-name-row">
              <text class="record-name">{{ r.nickname }}</text>
              <app-icon v-if="r.status === 'vip'" name="crown" :size="16" color="#F59E0B" />
            </view>
            <text class="record-phone">{{ r.phone }}</text>
            <text class="record-time">注册：{{ r.registeredAt }}</text>
            <text v-if="r.paidAt" class="record-time">首付：{{ r.paidAt }} · 累计 ¥{{ r.paidAmount }}</text>
          </view>
          <view class="record-right">
            <view class="record-badge" :class="'badge-' + r.status">
              <text class="badge-text" :style="{ color: statusColor(r.status) }">{{ statusText(r.status) }}</text>
            </view>
            <text v-if="r.commission > 0" class="record-commission">+¥{{ r.commission.toFixed(2) }}</text>
            <text v-if="r.pendingCommission > 0" class="record-pending">待结算 ¥{{ r.pendingCommission.toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请链接弹窗 -->
    <view v-if="showLinkSheet" class="sheet-mask" @click="showLinkSheet = false">
      <view class="sheet" @click.stop>
        <text class="sheet-title">邀请好友</text>
        <!-- 二维码 -->
        <view class="qr-wrap">
          <view class="qr-box">
            <app-icon name="qr-code" :size="48" color="#8C8378" />
          </view>
        </view>
        <!-- 邀请码 -->
        <view class="code-block">
          <text class="code-label">我的邀请码</text>
          <text class="code-value">{{ linkInfo.inviteCode }}</text>
        </view>
        <!-- 邀请链接 -->
        <view class="link-block">
          <text class="link-block-label">邀请链接</text>
          <text class="link-block-text">{{ linkInfo.inviteLink }}</text>
        </view>
        <!-- 操作按钮 -->
        <view class="sheet-actions">
          <view class="btn-outline" @click="onRegenerate">
            <app-icon name="refresh-cw" :size="16" color="#C9A96E" />
            <text class="btn-outline-text">重新生成</text>
          </view>
          <view class="btn-primary" @click="onCopy">
            <app-icon :name="copied ? 'check' : 'copy'" :size="16" color="#FFFFFF" />
            <text class="btn-primary-text">{{ copied ? '已复制' : '复制链接' }}</text>
          </view>
        </view>
        <view class="rule-tip">
          <text class="rule-text">好友通过链接注册并付费后，您将获得相应佣金奖励</text>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

const filter = ref<'all' | 'registered' | 'paid' | 'vip'>('all')
const showLinkSheet = ref(false)
const copied = ref(false)

const filters = [
  { key: 'all' as const, label: '全部' },
  { key: 'registered' as const, label: '已注册' },
  { key: 'paid' as const, label: '已付费' },
  { key: 'vip' as const, label: '会员' },
]

const stats = { totalInvited: 156, registeredCount: 142, paidCount: 68, totalEarnings: 3280.5, pendingEarnings: 420.0 }
const linkInfo = { inviteCode: 'GUOXUE2026', inviteLink: 'https://app.example.com/invite/GUOXUE2026' }

const statItems = [
  { label: '邀请人数', value: stats.totalInvited, icon: 'users' },
  { label: '已注册', value: stats.registeredCount, icon: 'user-check' },
  { label: '已付费', value: stats.paidCount, icon: 'credit-card' },
  { label: '总收益', value: '¥' + stats.totalEarnings.toFixed(2), icon: 'coins' },
]

const records = [
  { id: '1', nickname: '易学新人', phone: '138****8888', status: 'vip', registeredAt: '2026-06-01 14:30', paidAt: '2026-06-02 10:20', paidAmount: 298, commission: 29.8, pendingCommission: 0 },
  { id: '2', nickname: '国学爱好者', phone: '139****6666', status: 'paid', registeredAt: '2026-05-28 09:15', paidAt: '2026-05-30 16:40', paidAmount: 99, commission: 9.9, pendingCommission: 5.0 },
  { id: '3', nickname: '玄学入门者', phone: '136****2222', status: 'registered', registeredAt: '2026-06-03 08:00', paidAt: '', paidAmount: 0, commission: 0, pendingCommission: 0 },
  { id: '4', nickname: '传统文化学者', phone: '137****3333', status: 'paid', registeredAt: '2026-05-20 11:30', paidAt: '2026-05-22 14:00', paidAmount: 588, commission: 58.8, pendingCommission: 0 },
  { id: '5', nickname: '八字研究者', phone: '135****5555', status: 'vip', registeredAt: '2026-05-15 16:20', paidAt: '2026-05-16 09:00', paidAmount: 1288, commission: 128.8, pendingCommission: 0 },
]

const filteredRecords = computed(() => {
  if (filter.value === 'all') return records
  return records.filter((r) => r.status === filter.value)
})

function statusText(s: string) {
  return { registered: '已注册', paid: '已付费', vip: '已开通会员' }[s] || s
}
function statusColor(s: string) {
  return { registered: '#8C8378', paid: '#16A34A', vip: '#D97706' }[s] || '#8C8378'
}

function goBack() { uni.navigateBack() }
function onCopy() {
  uni.setClipboardData({ data: linkInfo.inviteLink, success: () => { copied.value = true; setTimeout(() => (copied.value = false), 2000) } })
}
function onRegenerate() { uni.showToast({ title: '已重新生成', icon: 'none' }) }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; }

.nav { position: sticky; top: 0; z-index: 10; background: #FAF8F5; border-bottom: 1rpx solid rgba(201, 169, 110, 0.2); }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.nav-btn { padding: 8rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2D2A26; }

.body { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }

.stat-card { background: linear-gradient(135deg, #C41E3A, #A01830); border-radius: 24rpx; padding: 32rpx; box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.2); }
.stat-grid { display: flex; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.stat-icon { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.stat-value { font-size: 34rpx; font-weight: 700; color: #FFFFFF; }
.stat-label { font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 2rpx; }
.stat-pending { margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: space-between; }
.pending-label { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.pending-value { font-size: 26rpx; font-weight: 600; color: #C9A96E; }

.link-entry { background: #FFFFFF; border-radius: 24rpx; border: 1rpx solid rgba(201, 169, 110, 0.3); padding: 24rpx; display: flex; align-items: center; justify-content: space-between; }
.link-left { display: flex; align-items: center; gap: 24rpx; }
.link-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(196, 30, 58, 0.1); display: flex; align-items: center; justify-content: center; }
.link-title { font-size: 28rpx; font-weight: 500; color: #2D2A26; display: block; }
.link-code { font-size: 22rpx; color: #8C8378; margin-top: 4rpx; display: block; }

.filter-tabs { display: flex; background: #FFFFFF; border: 1rpx solid rgba(201, 169, 110, 0.3); border-radius: 16rpx; padding: 6rpx; }
.filter-tab { flex: 1; padding: 14rpx 0; border-radius: 12rpx; text-align: center; }
.filter-active { background: #C41E3A; }
.filter-text { font-size: 26rpx; color: #2D2A26; }
.filter-text-active { color: #FFFFFF; }

.record-list { display: flex; flex-direction: column; gap: 24rpx; }
.record-card { background: #FFFFFF; border-radius: 24rpx; border: 1rpx solid rgba(201, 169, 110, 0.3); padding: 32rpx; display: flex; align-items: flex-start; gap: 24rpx; }
.record-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(196, 30, 58, 0.1); color: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; flex-shrink: 0; }
.record-main { flex: 1; min-width: 0; }
.record-name-row { display: flex; align-items: center; gap: 12rpx; }
.record-name { font-size: 28rpx; font-weight: 500; color: #2D2A26; }
.record-phone { font-size: 22rpx; color: #8C8378; display: block; }
.record-time { font-size: 22rpx; color: #8C8378; margin-top: 4rpx; display: block; }
.record-right { text-align: right; flex-shrink: 0; }
.record-badge { display: inline-flex; padding: 4rpx 16rpx; border-radius: 999rpx; border: 1rpx solid currentColor; }
.badge-registered { border-color: rgba(140,131,120,0.4); }
.badge-paid { border-color: rgba(22,163,74,0.4); }
.badge-vip { border-color: rgba(217,119,6,0.4); }
.badge-text { font-size: 22rpx; }
.record-commission { font-size: 28rpx; font-weight: 600; color: #C41E3A; margin-top: 16rpx; display: block; }
.record-pending { font-size: 22rpx; color: #8C8378; display: block; }

.sheet-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #FAF8F5; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx 64rpx; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #2D2A26; text-align: center; display: block; margin-bottom: 32rpx; }
.qr-wrap { display: flex; justify-content: center; margin-bottom: 40rpx; }
.qr-box { padding: 32rpx; background: #FFFFFF; border-radius: 24rpx; border: 1rpx solid rgba(201,169,110,0.3); width: 320rpx; height: 320rpx; display: flex; align-items: center; justify-content: center; }
.code-block { text-align: center; margin-bottom: 40rpx; }
.code-label { font-size: 26rpx; color: #8C8378; display: block; margin-bottom: 8rpx; }
.code-value { font-size: 44rpx; font-weight: 700; color: #C41E3A; letter-spacing: 4rpx; }
.link-block { background: #FFFFFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 40rpx; }
.link-block-label { font-size: 22rpx; color: #8C8378; display: block; margin-bottom: 8rpx; }
.link-block-text { font-size: 26rpx; color: #2D2A26; word-break: break-all; }
.sheet-actions { display: flex; gap: 24rpx; }
.btn-outline { flex: 1; height: 80rpx; border: 1rpx solid #C9A96E; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.btn-outline-text { font-size: 28rpx; color: #C9A96E; }
.btn-primary { flex: 1; height: 80rpx; background: #C41E3A; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.btn-primary-text { font-size: 28rpx; color: #FFFFFF; }
.rule-tip { padding-top: 32rpx; margin-top: 32rpx; border-top: 1rpx solid rgba(201,169,110,0.2); }
.rule-text { font-size: 22rpx; color: #8C8378; text-align: center; display: block; }
</style>
