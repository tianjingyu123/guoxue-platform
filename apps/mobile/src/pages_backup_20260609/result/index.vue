<template>
  <view class="page"><view class="body"><text class="icon">{{status==='success'?'✅':'❌'}}</text><text class="title">{{msg}}</text><view class="btn" @click="goBack">返回</view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const status=ref('success');const msg=ref('操作成功');function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:96rpx;display:block;margin-bottom:24rpx}.title{font-size:28rpx;color:#2C2C2C;display:block;margin-bottom:48rpx}.btn{padding:24rpx 80rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:26rpx;display:inline-block}
</style>
