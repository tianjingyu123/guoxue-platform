<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">修改密码</text><view style="width:48rpx"/></view>
    <view class="form">
      <view class="field"><text class="fl">旧密码</text><input class="fi" v-model="oldPwd" placeholder="请输入旧密码" password/></view>
      <view class="field"><text class="fl">新密码</text><input class="fi" v-model="newPwd" placeholder="请输入新密码(6-20位)" password/><text class="hint">密码长度为6-20位，建议包含字母和数字</text></view>
      <view class="field"><text class="fl">确认新密码</text><input class="fi" v-model="confirmPwd" placeholder="请再次输入新密码" password/></view>
      <view class="btn" :class="{dis:!canSubmit}" @click="handleSubmit">确认修改</view>
    </view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const oldPwd=ref(''),newPwd=ref(''),confirmPwd=ref('');const canSubmit=computed(()=>oldPwd.value.length>=6&&newPwd.value.length>=6&&newPwd.value===confirmPwd.value);function handleSubmit(){if(!canSubmit.value)return;uni.showToast({title:'修改成功',icon:'success'});setTimeout(()=>uni.navigateBack(),1500)};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.form{padding:48rpx 32rpx}.field{margin-bottom:32rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:80rpx;padding:0 24rpx;background:#fff;border:1px solid #E8E0D5;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.hint{font-size:22rpx;color:#999;margin-top:8rpx;display:block}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600;margin-top:48rpx}.btn.dis{opacity:.5}
</style>
