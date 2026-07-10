<template>
  <!-- 无发布权限引导半屏弹层（发布权限体系 P0·docs/design/发布权限与实名认证体系-20260711.md 第四节） -->
  <view v-if="open" class="pgs-mask" @tap="onClose">
    <view class="pgs-sheet" @tap.stop>
      <!-- 头部 -->
      <view class="pgs-head">
        <text class="pgs-title">开通发布权限</text>
        <view class="pgs-close" @tap="onClose">
          <AppIcon name="x" :size="36" color="#9CA3AF" />
        </view>
      </view>
      <text class="pgs-intro">平台内容面向全体用户，发布需通过圈子授权开通</text>

      <!-- 四步路径 -->
      <view class="pgs-steps">
        <view v-for="(step, i) in steps" :key="step.title" class="pgs-step">
          <view class="pgs-step-icon">
            <AppIcon :name="step.icon" :size="36" color="var(--brand)" />
          </view>
          <view class="pgs-step-body">
            <view class="pgs-step-title-row">
              <text class="pgs-step-no">{{ i + 1 }}</text>
              <text class="pgs-step-title">{{ step.title }}</text>
            </view>
            <text v-if="step.desc" class="pgs-step-desc">{{ step.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 快速通道 -->
      <view class="pgs-fast">
        <AppIcon name="zap" :size="30" color="var(--brand)" />
        <text class="pgs-fast-txt">其他平台粉丝≥1万？可提交证明直接申请</text>
      </view>

      <!-- 底部按钮 -->
      <view class="pgs-foot">
        <view class="pgs-btn pgs-btn-ghost" @tap="onClose">
          <text class="pgs-btn-ghost-txt">知道了</text>
        </view>
        <view class="pgs-btn pgs-btn-primary" @tap="goCreateCircle">
          <text class="pgs-btn-primary-txt">去创建圈子</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

// 四步路径（门槛值=2026-07-11 董事长拍板参数，见设计方案第六节）
// TODO(P1): 接 CirclePublishGrant 授权接口后，门槛行展示该用户当前圈子的实时进度
//           （如「运营 12/30 天 · 成员 45/100」），并按是否达标切换底部按钮为「去申请」。
const steps: { icon: string; title: string; desc?: string }[] = [
  { icon: 'users', title: '创建/运营你的圈子' },
  { icon: 'trending-up', title: '达到运营门槛', desc: '运营≥30天 · 成员≥100 · 作品≥30 · 近30天新增≥8条' },
  { icon: 'shield-check', title: '完成实名认证' },
  { icon: 'send', title: '提交申请等待审批' },
]

function onClose() {
  emit('close')
}
function goCreateCircle() {
  emit('close')
  navigateTo('/circles/create')
}
</script>

<style scoped>
.pgs-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.pgs-sheet {
  width: 100%;
  background-color: var(--bg-paper, #faf8f5);
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 40rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 头部 */
.pgs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pgs-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-strong, #1a1a1a);
}
.pgs-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pgs-intro {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-soft, #6b7280);
  line-height: 1.5;
}

/* 四步路径卡 */
.pgs-steps {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.pgs-step {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.pgs-step-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pgs-step-body {
  flex: 1;
  min-width: 0;
  padding-top: 4rpx;
}
.pgs-step-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.pgs-step-no {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background-color: var(--brand, #c41e3a);
  color: #ffffff;
  font-size: 20rpx;
  line-height: 32rpx;
  text-align: center;
  flex-shrink: 0;
}
.pgs-step-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-strong, #1a1a1a);
}
.pgs-step-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-soft, #6b7280);
  line-height: 1.5;
}

/* 快速通道 */
.pgs-fast {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background-color: var(--brand-soft, rgba(196, 30, 58, 0.08));
}
.pgs-fast-txt {
  font-size: 24rpx;
  color: var(--brand, #c41e3a);
}

/* 底部按钮 */
.pgs-foot {
  margin-top: 32rpx;
  display: flex;
  gap: 24rpx;
}
.pgs-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pgs-btn-ghost {
  background-color: var(--brand-soft, rgba(196, 30, 58, 0.08));
}
.pgs-btn-ghost-txt {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--brand, #c41e3a);
}
.pgs-btn-primary {
  background-color: var(--brand, #c41e3a);
}
.pgs-btn-primary-txt {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
</style>
