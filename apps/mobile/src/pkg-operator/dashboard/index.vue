<template>
  <view class="dash-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="运营商中心" :show-back="true" background="#7c3aed" color="#ffffff" :no-border="true">
      <template #right>
        <view class="dash-nav-more" @tap="goSettings"><app-icon name="more-horizontal" :size="40" color="#ffffff" /></view>
      </template>
    </app-nav-bar>

    <!-- 运营商信息头部 -->
    <view class="dash-header">
      <view class="dash-header-top">
        <view class="dash-avatar"><app-icon name="building-2" :size="56" color="#ffffff" /></view>
        <view>
          <text class="dash-name">{{ data.name }}</text>
          <view class="dash-level"><app-icon name="crown" :size="22" color="#ffffff" /><text class="dash-level-txt">{{ data.level }}</text></view>
        </view>
      </view>

      <!-- 名额状态 -->
      <view class="dash-quota-card">
        <view class="dash-quota-head">
          <text class="dash-quota-label">分站名额</text>
          <view class="dash-quota-more" @tap="goQuota"><text class="dash-quota-more-txt">管理</text><app-icon name="chevron-right" :size="26" color="rgba(255,255,255,0.6)" /></view>
        </view>
        <view class="dash-quota-grid">
          <view class="dash-quota-item"><text class="dash-quota-num">{{ data.quota.total }}</text><text class="dash-quota-sub">总名额</text></view>
          <view class="dash-quota-item"><text class="dash-quota-num">{{ data.quota.used }}</text><text class="dash-quota-sub">自用</text></view>
          <view class="dash-quota-item"><text class="dash-quota-num c-success">{{ data.quota.sold }}</text><text class="dash-quota-sub">已售</text></view>
          <view class="dash-quota-item"><text class="dash-quota-num c-gold">{{ data.quota.available }}</text><text class="dash-quota-sub">可售</text></view>
        </view>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="dash-sec dash-overview-wrap">
      <view class="dash-card dash-overview">
        <view class="dash-ov-item ov-bg1">
          <view class="dash-ov-top"><app-icon name="wallet" :size="28" color="#C41E3A" /><text class="dash-ov-label">累计收益</text></view>
          <text class="dash-ov-val c-primary">¥{{ data.earnings.total.toLocaleString() }}</text>
          <text class="dash-ov-sub">本月 +¥{{ data.earnings.thisMonth }}</text>
        </view>
        <view class="dash-ov-item ov-bg2">
          <view class="dash-ov-top"><app-icon name="users" :size="28" color="#7c3aed" /><text class="dash-ov-label">团队站长</text></view>
          <text class="dash-ov-val c-operator">{{ data.team.total }}人</text>
          <text class="dash-ov-sub">本月 +{{ data.team.thisMonth }}人</text>
        </view>
        <view class="dash-ov-item ov-bg3">
          <view class="dash-ov-top"><app-icon name="gift" :size="28" color="#C9A96E" /><text class="dash-ov-label">名额销售</text></view>
          <text class="dash-ov-val c-gold">¥{{ data.earnings.quotaSales.toLocaleString() }}</text>
          <text class="dash-ov-sub">已售 {{ data.quota.sold }} 个名额</text>
        </view>
        <view class="dash-ov-item ov-bg4">
          <view class="dash-ov-top"><app-icon name="trending-up" :size="28" color="#16a34a" /><text class="dash-ov-label">团队奖励</text></view>
          <text class="dash-ov-val c-success">¥{{ data.earnings.teamBonus.toLocaleString() }}</text>
          <text class="dash-ov-sub">下级站长分佣5%</text>
        </view>
      </view>
    </view>

    <!-- 推广链接 -->
    <view class="dash-sec">
      <view class="dash-card">
        <view class="dash-link-title"><app-icon name="link-2" :size="28" color="#7c3aed" /><text class="dash-link-title-txt">站长招募链接</text></view>
        <view class="dash-link-row">
          <view class="dash-link-box"><text class="dash-link-txt">{{ inviteLink }}</text></view>
          <view class="dash-link-btn" @tap="copyLink"><app-icon :name="copied ? 'check' : 'copy'" :size="30" :color="copied ? '#16a34a' : '#666'" /></view>
          <view class="dash-link-btn primary" @tap="toastSoon"><app-icon name="qr-code" :size="30" color="#ffffff" /></view>
        </view>
        <text class="dash-link-hint">通过此链接注册的站长将加入您的团队，您可获得5%团队奖励</text>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="dash-sec">
      <view class="dash-tabs">
        <view class="dash-tab" :class="{ active: activeTab === 'team' }" @tap="activeTab = 'team'"><text class="dash-tab-txt">团队管理</text></view>
        <view class="dash-tab" :class="{ active: activeTab === 'quota' }" @tap="activeTab = 'quota'"><text class="dash-tab-txt">名额记录</text></view>
      </view>
    </view>

    <!-- 团队列表 -->
    <view v-if="activeTab === 'team'" class="dash-sec dash-list">
      <!-- 运营管理快捷入口 -->
      <view class="dash-quick">
        <view class="dash-quick-item" @tap="goTeam"><app-icon name="users" :size="40" color="#7c3aed" /><text class="dash-quick-txt">团队详情</text></view>
        <view class="dash-quick-item" @tap="goDormant"><app-icon name="clock" :size="40" color="#f59e0b" /><text class="dash-quick-txt">沉寂预警</text></view>
        <view class="dash-quick-item" @tap="goAnalysis"><app-icon name="trending-up" :size="40" color="#2563eb" /><text class="dash-quick-txt">业绩分析</text></view>
      </view>

      <view v-for="m in teamMembers" :key="m.id" class="dash-card dash-member">
        <view class="dash-member-row">
          <view class="dash-member-icon"><app-icon name="award" :size="48" color="#16a34a" /></view>
          <view class="dash-member-info">
            <view class="dash-member-name-row">
              <text class="dash-member-name">{{ m.name }}</text>
              <text class="dash-badge" :class="m.status === 'active' ? 'badge-success' : 'badge-amber'">{{ m.status === 'active' ? '已激活' : '待激活' }}</text>
            </view>
            <text class="dash-member-date">加入于 {{ m.joinDate }}</text>
          </view>
          <view class="dash-member-more" @tap="toastSoon"><app-icon name="more-horizontal" :size="32" color="#999" /></view>
        </view>
        <view v-if="m.status === 'active'" class="dash-member-stats">
          <view class="dash-mstat"><text class="dash-mstat-num">{{ m.users }}</text><text class="dash-mstat-label">用户数</text></view>
          <view class="dash-mstat"><text class="dash-mstat-num c-success">¥{{ m.earnings }}</text><text class="dash-mstat-label">产生收益</text></view>
          <view class="dash-mstat"><text class="dash-mstat-num c-operator">¥{{ m.myBonus }}</text><text class="dash-mstat-label">我的奖励</text></view>
        </view>
      </view>

      <view v-if="data.quota.available > 0" class="dash-invite-card" @tap="goInvite">
        <app-icon name="plus" :size="40" color="#7c3aed" />
        <text class="dash-invite-txt">邀请新站长（剩余{{ data.quota.available }}个名额）</text>
      </view>
    </view>

    <!-- 名额记录 -->
    <view v-if="activeTab === 'quota'" class="dash-sec dash-list">
      <view v-for="r in quotaRecords" :key="r.id" class="dash-card dash-record">
        <view class="dash-record-icon" :class="r.type === 'self' ? 'icon-operator' : 'icon-gold'">
          <app-icon :name="r.type === 'self' ? 'building-2' : 'gift'" :size="40" :color="r.type === 'self' ? '#7c3aed' : '#C9A96E'" />
        </view>
        <view class="dash-record-info">
          <view class="dash-member-name-row">
            <text class="dash-record-name">{{ r.name }}</text>
            <text class="dash-badge" :class="r.status === 'active' ? 'badge-success' : 'badge-amber'">{{ r.status === 'active' ? '已激活' : '待激活' }}</text>
          </view>
          <text class="dash-member-date">{{ r.type === 'self' ? '自用名额' : '售出名额' }} · {{ r.date }}</text>
        </view>
        <text v-if="r.type === 'sold' && r.price" class="dash-record-price">+¥{{ r.price }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import {
  operatorDashboardData as data,
  dashboardTeamMembers as teamMembers,
  dashboardQuotaRecords as quotaRecords,
  operatorInviteLink as inviteLink,
} from '@/lib/operator-data'

const activeTab = ref<'team' | 'quota'>('team')
const copied = ref(false)

function copyLink() {
  uni.setClipboardData({
    data: inviteLink,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}
function toastSoon() { uni.showToast({ title: '功能开发中', icon: 'none' }) }
function goSettings() { navigateTo('/pkg-operator/settings/index') }
function goQuota() { navigateTo('/pkg-operator/quota/index') }
function goTeam() { navigateTo('/pkg-operator/team/index') }
function goDormant() { navigateTo('/pkg-operator/dormant/index') }
function goAnalysis() { navigateTo('/pkg-operator/analysis/index') }
function goInvite() { navigateTo('/pkg-operator/invite/index') }
</script>

<style scoped>
.dash-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 48rpx; }
.dash-nav-more { padding: 8rpx; }

/* 头部 */
.dash-header { background: linear-gradient(180deg, #7c3aed 0%, rgba(124,58,237,0.85) 100%); padding: 0 32rpx 48rpx; }
.dash-header-top { display: flex; align-items: center; gap: 24rpx; margin-bottom: 32rpx; padding-top: 16rpx; }
.dash-avatar { width: 112rpx; height: 112rpx; border-radius: 32rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.dash-name { display: block; font-size: 36rpx; font-weight: 700; color: #fff; margin-bottom: 10rpx; }
.dash-level { display: inline-flex; align-items: center; gap: 6rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; padding: 4rpx 14rpx; }
.dash-level-txt { font-size: 20rpx; color: #fff; }

/* 名额卡 */
.dash-quota-card { background: rgba(255,255,255,0.12); border-radius: 24rpx; padding: 28rpx; }
.dash-quota-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.dash-quota-label { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.dash-quota-more { display: flex; align-items: center; }
.dash-quota-more-txt { font-size: 22rpx; color: rgba(255,255,255,0.6); }
.dash-quota-grid { display: flex; }
.dash-quota-item { flex: 1; text-align: center; }
.dash-quota-num { display: block; font-size: 44rpx; font-weight: 700; color: #fff; }
.dash-quota-sub { font-size: 20rpx; color: rgba(255,255,255,0.6); }
.c-success { color: #16a34a !important; }
.c-gold { color: #C9A96E !important; }
.c-operator { color: #7c3aed !important; }
.c-primary { color: #C41E3A !important; }

/* 通用 */
.dash-sec { padding: 0 32rpx; margin-top: 32rpx; }
.dash-overview-wrap { margin-top: -16rpx; }
.dash-card { background: #fff; border-radius: 24rpx; padding: 28rpx; }

/* 概览 */
.dash-overview { display: flex; flex-wrap: wrap; gap: 24rpx; }
.dash-ov-item { width: calc(50% - 12rpx); border-radius: 20rpx; padding: 24rpx; box-sizing: border-box; }
.ov-bg1 { background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(201,169,110,0.05)); }
.ov-bg2 { background: linear-gradient(135deg, rgba(124,58,237,0.05), rgba(37,99,235,0.05)); }
.ov-bg3 { background: linear-gradient(135deg, rgba(201,169,110,0.05), rgba(22,163,74,0.05)); }
.ov-bg4 { background: linear-gradient(135deg, rgba(22,163,74,0.05), rgba(37,99,235,0.05)); }
.dash-ov-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.dash-ov-label { font-size: 22rpx; color: #999; }
.dash-ov-val { display: block; font-size: 38rpx; font-weight: 700; }
.dash-ov-sub { font-size: 20rpx; color: #999; margin-top: 8rpx; }

/* 推广链接 */
.dash-link-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.dash-link-title-txt { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.dash-link-row { display: flex; align-items: center; gap: 16rpx; }
.dash-link-box { flex: 1; min-width: 0; padding: 16rpx; background: rgba(0,0,0,0.04); border-radius: 16rpx; }
.dash-link-txt { font-size: 22rpx; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash-link-btn { flex-shrink: 0; width: 64rpx; height: 64rpx; border-radius: 16rpx; border: 1rpx solid #e5e5e5; display: flex; align-items: center; justify-content: center; }
.dash-link-btn.primary { background: #7c3aed; border-color: #7c3aed; }
.dash-link-hint { display: block; font-size: 20rpx; color: #999; margin-top: 16rpx; line-height: 1.5; }

/* Tabs */
.dash-tabs { display: flex; background: rgba(0,0,0,0.05); border-radius: 16rpx; padding: 6rpx; }
.dash-tab { flex: 1; height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.dash-tab.active { background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.dash-tab-txt { font-size: 26rpx; color: #666; }
.dash-tab.active .dash-tab-txt { color: #1a1a1a; font-weight: 600; }

/* 列表 */
.dash-list { display: flex; flex-direction: column; gap: 24rpx; }
.dash-quick { display: flex; gap: 16rpx; }
.dash-quick-item { flex: 1; background: #fff; border-radius: 20rpx; padding: 24rpx 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.dash-quick-txt { font-size: 22rpx; color: #333; }

/* 成员卡 */
.dash-member-row { display: flex; align-items: center; gap: 24rpx; }
.dash-member-icon { width: 96rpx; height: 96rpx; border-radius: 24rpx; background: rgba(22,163,74,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.dash-member-info { flex: 1; min-width: 0; }
.dash-member-name-row { display: flex; align-items: center; gap: 12rpx; }
.dash-member-name, .dash-record-name { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.dash-badge { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 999rpx; }
.badge-success { background: rgba(22,163,74,0.1); color: #16a34a; }
.badge-amber { background: #fef3c7; color: #b45309; }
.dash-member-date { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; }
.dash-member-more { padding: 8rpx; }
.dash-member-stats { display: flex; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #f0f0f0; }
.dash-mstat { flex: 1; text-align: center; }
.dash-mstat-num { display: block; font-size: 28rpx; font-weight: 700; color: #1a1a1a; }
.dash-mstat-label { font-size: 20rpx; color: #999; }

/* 邀请卡 */
.dash-invite-card { border: 2rpx dashed rgba(124,58,237,0.3); background: rgba(124,58,237,0.05); border-radius: 24rpx; padding: 28rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.dash-invite-txt { font-size: 26rpx; font-weight: 500; color: #7c3aed; }

/* 名额记录 */
.dash-record { display: flex; align-items: center; gap: 24rpx; }
.dash-record-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-operator { background: rgba(124,58,237,0.1); }
.icon-gold { background: rgba(201,169,110,0.1); }
.dash-record-info { flex: 1; min-width: 0; }
.dash-record-price { font-size: 28rpx; font-weight: 700; color: #C9A96E; flex-shrink: 0; }
</style>
