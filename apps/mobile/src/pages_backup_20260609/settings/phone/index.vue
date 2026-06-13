<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">修改手机号</text><view style="width:48rpx"/></view>
    <view class="f"><text class="step" v-if="step===1">验证当前手机号</text><text class="step" v-else>绑定新手机号</text>
      <view class="fi"><text class="fl" v-if="step===1">当前手机号</text><text class="fl" v-else>新手机号</text>
        <text v-if="step===1" class="ps">138****8888</text><input v-else class="fin" placeholder="请输入新手机号"/></view>
      <view class="fi"><text class="fl">验证码</text><view class="cr"><input class="fin" style="flex:1" placeholder="验证码"/><text class="cb" :class="{dis:cd>0}" @click="sc">{{cd>0?cd+'s':'获取验证码'}}</text></view></view>
      <view class="btn" :class="{dis:step===2}" @click="step===1?step=2:submit()">{{step===1?'下一步':'确认修改'}}</view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const step=ref(1),cd=ref(0);function sc(){if(cd.value>0)return;cd.value=60;const t=setInterval(()=>{cd.value--;if(cd.value<=0)clearInterval(t)},1000)};function submit(){uni.showToast({title:'修改成功'});setTimeout(()=>uni.navigateBack(),1500)};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.f{padding:48rpx 32rpx}.step{font-size:28rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:32rpx}.fi{margin-bottom:28rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.ps{font-size:32rpx;color:#2C2C2C;font-weight:500}.fin{height:80rpx;padding:0 24rpx;background:#fff;border:1px solid #E8E0D5;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.cr{display:flex;gap:16rpx}.cb{padding:0 24rpx;height:80rpx;line-height:80rpx;background:#C41E3A;color:#fff;border-radius:16rpx;font-size:24rpx;text-align:center}.cb.dis{background:#D9D9D9;color:#999}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}.btn.dis{opacity:.5}
</style>
