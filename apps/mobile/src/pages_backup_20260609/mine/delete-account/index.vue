<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">账号注销</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="warn-card"><text class="wc-icon">⚠️</text><text class="wc-title">注销须知</text>
        <view v-for="n in notices" :key="n" class="wc-item">• {{n}}</view>
      </view>
      <view class="card"><text class="ct">请选择注销原因</text>
        <view v-for="r in reasons" :key="r" class="reason" :class="{sel:reason===r}" @click="reason=r"><text>{{r}}</text></view>
      </view>
      <view class="field"><text class="fl">请输入「确认注销」以继续</text><input class="fi" v-model="confirmText" placeholder="确认注销"/></view>
      <view class="btn danger" :class="{dis:confirmText!=='确认注销'}" @click="handleDelete">确认注销</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const reason=ref(''),confirmText=ref('');const notices=['注销后账号将永久删除，无法恢复','所有个人信息、学习记录、订单数据将被清除','已购课程权益将失效，请确认无未使用的权益','如有正在进行中的交易，请处理完毕后再注销'];const reasons=['不再使用平台','内容不符合预期','账号安全考虑','其他原因'];function handleDelete(){if(confirmText.value!=='确认注销')return;uni.showToast({title:'注销申请已提交',icon:'none'});setTimeout(()=>uni.navigateTo({url:'/pages/mine/delete-account-result/index'}),1500)};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.warn-card{background:#FFF7E6;border:1px solid #FFD591;border-radius:20rpx;padding:28rpx;margin-bottom:24rpx}.wc-icon{font-size:48rpx;display:block;margin-bottom:12rpx}.wc-title{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:16rpx}.wc-item{font-size:24rpx;color:#8B6914;padding:6rpx 0}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.reason{padding:20rpx;border:2rpx solid #E8E0D5;border-radius:16rpx;font-size:26rpx;color:#666;margin-bottom:12rpx}.reason.sel{border-color:#C41E3A;background:rgba(196,30,58,.03)}.field{margin-bottom:32rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:80rpx;padding:0 24rpx;background:#fff;border:1px solid #E8E0D5;border-radius:16rpx;font-size:26rpx;box-sizing:border-box;text-align:center}.btn{padding:28rpx;text-align:center;color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}.btn.danger{background:#ef4444}.btn.dis{opacity:.5}
</style>
