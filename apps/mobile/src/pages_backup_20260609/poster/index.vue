<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">生成海报</text><view style="width:48rpx"/></view>
    <view class="preview"><view class="poster"><text class="pl-title">热卜国学</text><text class="pl-sub">探寻东方智慧</text><view class="pl-qr">📱</view><text class="pl-hint">扫码加入</text></view></view>
    <view class="actions"><view class="act" @click="save">💾 保存</view><view class="act primary" @click="share">📤 分享</view></view>
  </view>
</template>
<script setup lang="ts">function save(){uni.showToast({title:'海报已保存'})};function share(){};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#000;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;color:#fff}.nav-back{font-size:36rpx;color:#fff}.nav-title{font-size:32rpx;font-weight:500}.preview{display:flex;justify-content:center;padding:60rpx 0}.poster{width:500rpx;height:800rpx;background:linear-gradient(180deg,#FAF8F5,#F5F1EB);border-radius:24rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20rpx}.pl-title{font-size:52rpx;font-weight:700;color:#C41E3A}.pl-sub{font-size:24rpx;color:#999}.pl-qr{font-size:120rpx}.pl-hint{font-size:22rpx;color:#999}.actions{display:flex;gap:24rpx;padding:0 24rpx}.act{flex:1;padding:24rpx;text-align:center;border-radius:24rpx;font-size:28rpx;font-weight:500;border:1px solid rgba(255,255,255,.2);color:#fff}.act.primary{background:#C41E3A;border-color:#C41E3A}
</style>
