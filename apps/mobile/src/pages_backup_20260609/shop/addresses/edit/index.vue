<template>
  <view class="page">
    <view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">{{id?'编辑地址':'新增地址'}}</text><text class="ns" @click="save">保存</text></view>
    <view class="f"><view class="fi"><text class="fl">收货人</text><input class="fin" placeholder="请输入收货人"/></view>
      <view class="fi"><text class="fl">手机号</text><input class="fin" placeholder="请输入手机号"/></view>
      <view class="fi"><text class="fl">所在地区</text><picker mode="region"><text>请选择省市区</text></picker></view>
      <view class="fi"><text class="fl">详细地址</text><input class="fin" placeholder="街道/门牌号"/></view>
      <view class="fi"><label><checkbox :checked="isDefault" @change="isDefault=!isDefault"/> 设为默认地址</label></view>
      <view class="btn" @click="save">保存</view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const id=ref(''),isDefault=ref(false);function save(){uni.showToast({title:'保存成功'});setTimeout(()=>uni.navigateBack(),1500)};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.ns{color:#C41E3A;font-size:26rpx}.f{padding:24rpx}.fi{margin-bottom:24rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fin{width:100%;height:80rpx;padding:0 24rpx;background:#fff;border:1px solid #E8E0D5;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
