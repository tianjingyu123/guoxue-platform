<template>
  <view class="page"><view class="body"><text class="icon">✅</text><text class="t">支付成功</text><text class="a">¥98.00</text><text class="n">订单号：RB202401150001</text><view class="btns"><view class="b" @click="goOrder">查看订单</view><view class="b ol" @click="goHome">继续逛逛</view></view></view></view>
</template>
<script setup lang="ts">function goOrder(){uni.navigateTo({url:'/pages/orders/id-detail/index'})};function goHome(){uni.reLaunch({url:'/pages/index/index'})}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:96rpx;display:block;margin-bottom:24rpx}.t{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:16rpx}.a{font-size:64rpx;font-weight:900;color:#C41E3A;display:block;margin-bottom:8rpx}.n{font-size:22rpx;color:#999;display:block;margin-bottom:48rpx}.btns{display:flex;gap:24rpx}.b{padding:24rpx 48rpx;border-radius:24rpx;font-size:26rpx;font-weight:500;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff}.b.ol{border:1px solid #E8E0D5;background:#fff;color:#666}
</style>
