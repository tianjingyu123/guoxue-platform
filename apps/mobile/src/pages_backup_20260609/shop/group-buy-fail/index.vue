<template>
  <view class="page"><view class="body"><text class="icon">😞</text><text class="t">拼团未成功</text><text class="d">超时未满员，已自动退款</text>
    <view class="btns"><view class="b" @click="retry">重新开团</view><view class="b ol" @click="browse">浏览其他</view></view></view></view>
</template>
<script setup lang="ts">function retry(){};function browse(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:96rpx;display:block;margin-bottom:24rpx}.t{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.d{font-size:26rpx;color:#999;display:block;margin-bottom:48rpx}.btns{display:flex;gap:24rpx}.b{padding:24rpx 48rpx;border-radius:24rpx;font-size:26rpx;font-weight:500;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff}.b.ol{border:1px solid #E8E0D5;background:#fff;color:#666}
</style>
