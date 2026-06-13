<template>
  <view class="page">
    <view class="body"><text class="icon">🏮</text><text class="name">热卜国学</text><text class="slogan">探寻东方智慧</text>
      <view class="invite"><text class="inv">{{inviter}} 邀请你加入</text></view>
      <view class="benefits"><text v-for="b in benefits" :key="b" class="bf">🎁 {{b}}</text></view>
      <view class="btn" @click="join">立即加入</view>
      <text class="hint">已有 {{count}} 人加入</text>
    </view>
  </view>
</template>
<script setup lang="ts">const inviter='国学传承者';const benefits=['注册即得100积分','首次购买享9折','免费领取入门课程'];const count=12860;function join(){uni.showToast({title:'欢迎加入！'})}</script>
<style scoped>.page{background:linear-gradient(180deg,#C41E3A,#8B0000);min-height:100vh}.body{display:flex;flex-direction:column;align-items:center;padding:80rpx 48rpx}.icon{font-size:120rpx;margin-bottom:20rpx}.name{font-size:56rpx;font-weight:700;color:#fff}.slogan{font-size:28rpx;color:rgba(255,255,255,.7);margin:8rpx 0 48rpx}.invite{background:rgba(255,255,255,.1);padding:20rpx 40rpx;border-radius:40rpx;margin-bottom:40rpx}.inv{font-size:26rpx;color:rgba(255,255,255,.9)}.benefits{width:100%;margin-bottom:48rpx}.bf{font-size:26rpx;color:#fff;display:block;padding:12rpx 0;text-align:center}.btn{padding:28rpx 120rpx;background:#fff;color:#C41E3A;border-radius:40rpx;font-size:28rpx;font-weight:600;margin-bottom:16rpx}.hint{font-size:24rpx;color:rgba(255,255,255,.6)}
</style>
