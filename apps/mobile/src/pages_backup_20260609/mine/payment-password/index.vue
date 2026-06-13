<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">支付密码</text><view style="width:48rpx"/></view>
    <view class="body">
      <text class="icon">🔐</text><text class="title" v-if="!hasSet">设置支付密码</text><text class="title" v-else>修改支付密码</text>
      <text class="desc">6位数字密码，用于支付确认</text>
      <view class="pwd-dots"><view v-for="i in 6" :key="i" class="pd" :class="{fill:pwd.length>=i}"/></view>
      <view class="keypad">
        <text v-for="k in keys" :key="k" class="kp" :class="{del:k==='⌫',empty:k===''}" @click="handleKey(k)">{{k}}</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const hasSet=ref(false),pwd=ref(''),step=ref(1),firstPwd=ref('');const keys=['1','2','3','4','5','6','7','8','9','','0','⌫'];function handleKey(k:string){if(k==='⌫'){pwd.value=pwd.value.slice(0,-1);return}if(k==='')return;if(pwd.value.length<6)pwd.value+=k;if(pwd.value.length===6){if(step.value===1){if(hasSet.value){step.value=2;return}firstPwd.value=pwd.value;step.value=2;pwd.value=''}else{if(pwd.value===firstPwd.value||hasSet.value){hasSet.value=true;uni.showToast({title:hasSet.value?'修改成功':'设置成功',icon:'success'});setTimeout(()=>uni.navigateBack(),1500)}else{uni.showToast({title:'两次密码不一致',icon:'none'});pwd.value=''}}}};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.body{display:flex;flex-direction:column;align-items:center;padding:60rpx 48rpx}.icon{font-size:80rpx;margin-bottom:24rpx}.title{font-size:36rpx;font-weight:600;color:#2C2C2C}.desc{font-size:26rpx;color:#999;margin:12rpx 0 48rpx}.pwd-dots{display:flex;gap:24rpx;margin-bottom:60rpx}.pd{width:36rpx;height:36rpx;border-radius:50%;border:2rpx solid #E8E0D5}.pd.fill{background:#C41E3A;border-color:#C41E3A}.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:4rpx;width:100%;max-width:600rpx}.kp{height:100rpx;display:flex;align-items:center;justify-content:center;font-size:36rpx;color:#2C2C2C;background:#fff;border-radius:12rpx}.kp:active{background:#F5F1EB}.kp.del{font-size:28rpx;color:#999}.kp.empty{background:transparent}
</style>
