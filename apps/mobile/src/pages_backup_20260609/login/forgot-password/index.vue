<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">忘记密码</text><view style="width:48rpx"/></view>
    <view class="body">
      <text class="icon">🔑</text><text class="title">重置密码</text><text class="desc">请输入注册手机号，我们将发送验证码</text>

      <view class="form"><view class="field"><text class="fl">手机号</text><input class="fi" v-model="phone" placeholder="请输入手机号" type="number" maxlength="11"/></view>
        <view class="field"><text class="fl">验证码</text><view class="code-row"><input class="fi cr-input" v-model="code" placeholder="请输入验证码" maxlength="6"/><text class="cr-btn" :class="{dis:countdown>0}" @click="sendCode">{{countdown>0?countdown+'s':'获取验证码'}}</text></view></view>
        <view class="field"><text class="fl">新密码</text><input class="fi" v-model="password" placeholder="请输入新密码(6-20位)" password/></view>
        <view class="field"><text class="fl">确认密码</text><input class="fi" v-model="confirmPwd" placeholder="请再次输入密码" password/></view>
      </view>

      <view class="btn" :class="{dis:!canSubmit}" @click="handleSubmit">重置密码</view>
    </view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const phone=ref(''),code=ref(''),password=ref(''),confirmPwd=ref(''),countdown=ref(0);const canSubmit=computed(()=>phone.value.length===11&&code.value.length>=4&&password.value.length>=6&&password.value===confirmPwd.value);function sendCode(){if(countdown.value>0)return;countdown.value=60;const t=setInterval(()=>{countdown.value--;if(countdown.value<=0)clearInterval(t)},1000)};async function handleSubmit(){if(!canSubmit.value)return;uni.showToast({title:'密码重置成功',icon:'success'});setTimeout(()=>uni.navigateBack(),1500)};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.body{padding:48rpx 32rpx;display:flex;flex-direction:column;align-items:center}.icon{font-size:80rpx;margin-bottom:20rpx}.title{font-size:36rpx;font-weight:600;color:#2C2C2C;margin-bottom:12rpx}.desc{font-size:26rpx;color:#999;text-align:center;margin-bottom:48rpx}.form{width:100%;margin-bottom:48rpx}.field{margin-bottom:28rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:80rpx;padding:0 24rpx;background:#fff;border:1px solid #E8E0D5;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.code-row{display:flex;gap:16rpx}.cr-input{flex:1}.cr-btn{padding:0 24rpx;height:80rpx;line-height:80rpx;background:#C41E3A;color:#fff;border-radius:16rpx;font-size:24rpx;flex-shrink:0;text-align:center}.cr-btn.dis{background:#D9D9D9;color:#999}.btn{width:100%;padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}.btn.dis{opacity:.5}
</style>
