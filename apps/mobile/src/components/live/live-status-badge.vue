<template>
  <view class="live-status-badge" aria-label="直播中">
    <view class="live-status-badge__signal">
      <view class="live-status-badge__halo" />
      <view class="live-status-badge__dot" />
    </view>
    <text class="live-status-badge__text">直播中</text>
  </view>
</template>

<style scoped>
.live-status-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 9rpx;
  min-height: 40rpx;
  padding: 4rpx 14rpx 4rpx 12rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(255, 255, 255, .28);
  border-radius: 999rpx;
  background: linear-gradient(135deg, rgba(214, 32, 61, .96), rgba(170, 16, 42, .96));
  box-shadow: 0 4rpx 14rpx rgba(145, 12, 37, .26);
  pointer-events: none;
  animation: live-badge-breathe 1.8s ease-in-out infinite;
}
.live-status-badge__signal {
  position: relative;
  width: 14rpx;
  height: 14rpx;
  flex: 0 0 14rpx;
}
.live-status-badge__halo,
.live-status-badge__dot {
  position: absolute;
  inset: 0;
  border-radius: 999rpx;
}
.live-status-badge__halo {
  background: rgba(255, 255, 255, .7);
  animation: live-signal-pulse 1.5s ease-out infinite;
}
.live-status-badge__dot {
  background: #ffffff;
  box-shadow: 0 0 8rpx rgba(255, 255, 255, .95);
}
.live-status-badge__text {
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 1rpx;
  white-space: nowrap;
}
@keyframes live-signal-pulse {
  0% { transform: scale(.8); opacity: .9; }
  72%, 100% { transform: scale(2.45); opacity: 0; }
}
@keyframes live-badge-breathe {
  0%, 100% { box-shadow: 0 4rpx 14rpx rgba(145, 12, 37, .24); }
  50% { box-shadow: 0 5rpx 22rpx rgba(196, 30, 58, .46); }
}
@media (prefers-reduced-motion: reduce) {
  .live-status-badge,
  .live-status-badge__halo {
    animation: none;
  }
}
</style>
