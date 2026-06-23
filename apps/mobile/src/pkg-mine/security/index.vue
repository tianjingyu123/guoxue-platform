<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  mineProfile, securityLoginItems, securityPaymentItems,
  securityDeviceItems, securityScoreItems, securityDeactivateLossList,
  type SecurityItem,
} from '@/lib/mine-data'

const showDeactivate = ref(false)

const ringStyle = computed(() => {
  const pct = mineProfile.securityScore
  return `background: conic-gradient(#C9A96E ${pct}%, rgba(255,255,255,0.12) ${pct}% 100%);`
})

const groups: { title: string; items: SecurityItem[] }[] = [
  { title: '登录安全', items: securityLoginItems },
  { title: '支付安全', items: securityPaymentItems },
  { title: '设备管理', items: securityDeviceItems },
]

function isPositive(status?: SecurityItem['status']) {
  return status === 'set' || status === 'verified'
}
function statusText(status?: SecurityItem['status']) {
  if (status === 'verified') return '已认证'
  if (status === 'set') return '已设置'
  if (status === 'unverified') return '未认证'
  if (status === 'unset') return '未设置'
  return ''
}
function confirmDeactivate() {
  showDeactivate.value = false
  navigateTo('/mine/delete-account')
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <app-nav-bar title="账号安全" />

    <scroll-view scroll-y class="scroll">
      <!-- 安全评分卡片 -->
      <view class="score-card">
        <view class="score-top">
          <view class="score-info">
            <text class="score-label">账号安全评分</text>
            <view class="score-num-wrap">
              <text class="score-num">{{ mineProfile.securityScore }}</text>
              <text class="score-total">/ 100</text>
            </view>
            <text class="score-tip">安全级别：良好，建议完善实名认证</text>
          </view>
          <view class="ring" :style="ringStyle">
            <view class="ring-hole">
              <AppIcon name="shield" :size="22" color="#C9A96E" />
            </view>
          </view>
        </view>
        <view class="score-items">
          <view v-for="it in securityScoreItems" :key="it.label" class="score-item">
            <view class="score-dot" :class="it.done ? 'done' : 'todo'">
              <AppIcon :name="it.done ? 'check-circle' : 'x-circle'" :size="12" :color="it.done ? '#4ade80' : '#fb923c'" />
            </view>
            <text class="score-item-label">{{ it.label }}</text>
          </view>
        </view>
      </view>

      <!-- 安全项分组 -->
      <view v-for="g in groups" :key="g.title" class="group">
        <text class="group-title">{{ g.title }}</text>
        <view class="card">
          <view v-for="item in g.items" :key="item.id" class="row" @tap="navigateTo(item.href)">
            <view class="row-icon" :style="{ background: item.iconBg }">
              <AppIcon :name="item.icon" :size="18" color="#fff" />
            </view>
            <text class="row-label">{{ item.label }}</text>
            <view class="row-right">
              <text v-if="item.value" class="row-value">{{ item.value }}</text>
              <view v-if="item.status" class="tag" :class="isPositive(item.status) ? 'tag-ok' : 'tag-warn'">
                <AppIcon :name="isPositive(item.status) ? 'check-circle' : 'x-circle'" :size="10" :color="isPositive(item.status) ? '#16a34a' : '#ea580c'" />
                <text class="tag-text" :class="isPositive(item.status) ? 'tag-ok-text' : 'tag-warn-text'">{{ statusText(item.status) }}</text>
              </view>
              <AppIcon name="chevron-right" :size="16" color="#cbb" />
            </view>
          </view>
        </view>
      </view>

      <!-- 账号管理 -->
      <view class="group">
        <text class="group-title">账号管理</text>
        <view class="card">
          <view class="row danger-row" @tap="showDeactivate = true">
            <view class="row-icon" style="background: #fee2e2">
              <AppIcon name="alert-triangle" :size="18" color="#ef4444" />
            </view>
            <view class="row-main">
              <text class="danger-title">注销账号</text>
              <text class="danger-desc">注销后所有数据将被永久删除，不可恢复</text>
            </view>
            <AppIcon name="chevron-right" :size="16" color="#cbb" />
          </view>
        </view>
      </view>

      <!-- 安全提示 -->
      <view class="notice">
        <AppIcon name="lock" :size="16" color="#d97706" />
        <view class="notice-body">
          <text class="notice-title">安全提示</text>
          <text class="notice-text">平台工作人员绝不会索要您的账号密码或支付密码，请注意防范钓鱼欺诈，保护账号安全。</text>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 注销确认弹窗 -->
    <view v-if="showDeactivate" class="mask mask-fade-in" @tap="showDeactivate = false">
      <view class="sheet sheet-slide-up" @tap.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <view class="sheet-icon">
            <AppIcon name="alert-triangle" :size="28" color="#ef4444" />
          </view>
          <text class="sheet-title">确认注销账号？</text>
          <text class="sheet-sub">注销账号后，以下数据将被永久删除且无法恢复：</text>
        </view>
        <view class="loss-list">
          <view v-for="(item, i) in securityDeactivateLossList" :key="i" class="loss-item">
            <view class="loss-dot" />
            <text class="loss-text">{{ item }}</text>
          </view>
        </view>
        <view class="sheet-actions">
          <view class="sheet-btn ghost" @tap="showDeactivate = false"><text class="sheet-btn-text ghost-text">再想想</text></view>
          <view class="sheet-btn danger" @tap="confirmDeactivate"><text class="sheet-btn-text danger-text">继续注销</text></view>
        </view>
        <text class="sheet-foot">注销流程需要验证身份并等待7天冷静期</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.scroll {
  flex: 1;
  height: 0;
}
/* 评分卡片 */
.score-card {
  margin: 32rpx;
  padding: 32rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}
.score-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.score-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8rpx;
}
.score-num-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
}
.score-num {
  font-size: 60rpx;
  font-weight: 700;
  color: #c9a96e;
  line-height: 1;
}
.score-total {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
}
.score-tip {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}
.ring {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ring-hole {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.score-items {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
}
.score-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.score-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.score-dot.done {
  background: rgba(34, 197, 94, 0.2);
}
.score-dot.todo {
  background: rgba(249, 115, 22, 0.2);
}
.score-item-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
}
/* 分组 */
.group {
  margin-bottom: 8rpx;
}
.group-title {
  display: block;
  padding: 16rpx 32rpx;
  font-size: 24rpx;
  color: #999;
  font-weight: 500;
}
.card {
  background: #fff;
  margin: 0 32rpx;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(232, 227, 219, 0.6);
}
.row:last-child {
  border-bottom: none;
}
.row-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.row-label {
  flex: 1;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.row-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.row-value {
  font-size: 26rpx;
  color: #999;
}
.tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.tag-ok {
  background: #f0fdf4;
}
.tag-warn {
  background: #fff7ed;
}
.tag-text {
  font-size: 20rpx;
}
.tag-ok-text {
  color: #16a34a;
}
.tag-warn-text {
  color: #ea580c;
}
.row-main {
  flex: 1;
}
.danger-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #ef4444;
}
.danger-desc {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
/* 安全提示 */
.notice {
  display: flex;
  gap: 16rpx;
  margin: 24rpx 32rpx 0;
  padding: 28rpx;
  background: #fffbeb;
  border: 1rpx solid rgba(251, 191, 36, 0.4);
  border-radius: 28rpx;
}
.notice-body {
  flex: 1;
}
.notice-title {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #b45309;
  margin-bottom: 6rpx;
}
.notice-text {
  display: block;
  font-size: 22rpx;
  color: #d97706;
  line-height: 1.6;
}
.safe-bottom {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
/* 注销弹窗 */
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
  padding: 32rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
}
.sheet-handle {
  width: 80rpx;
  height: 8rpx;
  background: #e8e3db;
  border-radius: 999rpx;
  margin: 0 auto 32rpx;
}
.sheet-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}
.sheet-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.sheet-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 8rpx;
}
.sheet-sub {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.6;
}
.loss-list {
  margin-bottom: 40rpx;
}
.loss-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 0;
}
.loss-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #f87171;
  flex-shrink: 0;
}
.loss-text {
  font-size: 26rpx;
  color: rgba(44, 44, 44, 0.7);
}
.sheet-actions {
  display: flex;
  gap: 24rpx;
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
  background: #f3f4f6;
}
.sheet-btn.danger {
  background: #ef4444;
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
.sheet-foot {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #999;
  margin-top: 24rpx;
}
</style>
