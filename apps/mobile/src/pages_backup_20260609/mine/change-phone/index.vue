<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">修改手机号</text><view style="width:48rpx"/></view>
    <view class="form">
      <view v-if="step===1">
        <text class="step-title">第一步：验证当前手机号</text>
        <view class="field"><text class="fl">当前手机号</text><text class="phone-show">{{currentPhone}}</text></view>
        <view class="field"><text class="fl">验证码</text><view class="code-row"><input class="fi" v-model="code1" placeholder="请输入验证码" maxlength="6"/><text class="cr-btn" :class="{dis:cdt>0}" @click="sendCode">{{cdt>0?cdt+'s':'获取验证码'}}</text></view></view>
        <view class="btn" :class="{dis:code1.length<4}" @click="step=2">下一步</view>
      </view>
      <view v-else>
        <text class="step-title">第二步：绑定新手机号</text>
        <view class="field"><text class="fl">新手机号</text><input class="fi" v-model="newPhone" placeholder="请输入新手机号" type="number" maxlength="11"/></view>
        <view class="field"><text class="fl">验证码</text><view class="code-row"><input class="fi" v-model="code2" placeholder="请输入验证码" maxlength="6"/><text class="cr-btn" @click="sendCode">获取验证码</text></view></view>
        <view class="btn" :class="{dis:newPhone.length<11||code2.length<4}" @click="handleSubmit">确认修改</view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const step=ref(1),currentPhone=ref('138****8888'),code1=ref(''),code2=ref(''),newPhone=ref(''),cdt=ref(0);function sendCode(){if(cdt.value>0)return;cdt.value=60;const t=setInterval(()=>{cdt.value--;if(cdt.value<=0)clearInterval(t)},1000)};function handleSubmit(){uni.showToast({title:'修改成功',icon:'success'});setTimeout(()=>uni.navigateBack(),1500)};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.form{padding:48rpx 32rpx}.step-title{font-size:28rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:32rpx}.field{margin-bottom:32rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:80rpx;padding:0 24rpx;background:#fff;border:1px solid #E8E0D5;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.phone-show{font-size:32rpx;color:#2C2C2C;font-weight:500;padding:16rpx 0;display:block}.code-row{display:flex;gap:16rpx}.cr-btn{padding:0 24rpx;height:80rpx;line-height:80rpx;background:#C41E3A;color:#fff;border-radius:16rpx;font-size:24rpx;flex-shrink:0;text-align:center}.cr-btn.dis{background:#D9D9D9;color:#999}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600;margin-top:16rpx}.btn.dis{opacity:.5}
</style>
