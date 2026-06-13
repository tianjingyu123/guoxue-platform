<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">支付密码</text><view style="width:48rpx"/></view>
    <view class="body"><text class="icon">🔐</text><text class="t">设置6位支付密码</text><view class="dots"><view v-for="i in 6" :key="i" class="d" :class="{f:pwd.length>=i}"/></view>
      <view class="kp"><text v-for="k in keys" :key="k" class="k" :class="{del:k==='⌫',e:k===''}" @click="handle(k)">{{k}}</text></view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const pwd=ref('');const keys=['1','2','3','4','5','6','7','8','9','','0','⌫'];function handle(k:string){if(k==='⌫'){pwd.value=pwd.value.slice(0,-1)}else if(k!==''){pwd.value+=k;if(pwd.value.length===6){uni.showToast({title:'设置成功'});setTimeout(()=>uni.navigateBack(),1500)}}};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.body{display:flex;flex-direction:column;align-items:center;padding:80rpx}.icon{font-size:80rpx;margin-bottom:24rpx}.t{font-size:28rpx;color:#2C2C2C;margin-bottom:48rpx}.dots{display:flex;gap:24rpx;margin-bottom:80rpx}.d{width:36rpx;height:36rpx;border-radius:50%;border:2rpx solid #E8E0D5}.d.f{background:#C41E3A;border-color:#C41E3A}.kp{display:grid;grid-template-columns:repeat(3,1fr);gap:4rpx;width:100%;max-width:600rpx}.k{height:100rpx;display:flex;align-items:center;justify-content:center;font-size:36rpx;color:#2C2C2C;background:#fff;border-radius:12rpx}.k:active{background:#F5F1EB}.k.del{font-size:28rpx;color:#999}.k.e{background:transparent}
</style>
