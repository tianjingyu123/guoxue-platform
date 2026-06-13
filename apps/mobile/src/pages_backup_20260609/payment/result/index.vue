<template>
  <view class="page">
    <view class="body">
      <text class="icon">{{status==='success'?'✅':'❌'}}</text>
      <text class="title">{{status==='success'?'支付成功':'支付失败'}}</text>
      <text class="desc">{{status==='success'?'感谢您的购买':'请重试或联系客服'}}</text>
      <view v-if="status==='success'" class="info"><text class="in-amount">¥{{order.amount}}</text><text class="in-no">订单号：{{order.orderNo}}</text></view>
      <view class="btns"><view class="btn" @click="goOrder">查看订单</view><view class="btn outline" @click="goHome">返回首页</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const status=ref('success');const order=ref({amount:'98.00',orderNo:'RB202401150001'});function goOrder(){uni.navigateTo({url:'/pages/orders/id-detail/index'})};function goHome(){uni.reLaunch({url:'/pages/index/index'})}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:96rpx;display:block;margin-bottom:24rpx}.title{font-size:36rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:8rpx}.desc{font-size:26rpx;color:#999;display:block;margin-bottom:40rpx}.info{margin-bottom:40rpx}.in-amount{font-size:64rpx;font-weight:900;color:#C41E3A;display:block}.in-no{font-size:22rpx;color:#999;margin-top:8rpx}.btns{display:flex;gap:24rpx;justify-content:center}.btn{padding:24rpx 56rpx;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:26rpx;font-weight:500}.btn.outline{border:1px solid #E8E0D5;background:#fff;color:#666}
</style>
