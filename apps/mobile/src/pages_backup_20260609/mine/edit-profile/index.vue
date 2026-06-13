<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">编辑资料</text><text class="nav-save" @click="handleSave">保存</text></view>
    <scroll-view scroll-y class="content">
      <view class="avatar-section" @click="changeAvatar"><text class="as-icon">{{profile.avatar[0]||'👤'}}</text><text class="as-hint">点击更换头像</text></view>
      <view class="card">
        <view class="field"><text class="fl">昵称</text><input v-model="profile.nickname" class="fi" placeholder="请输入昵称" maxlength="20"/></view>
        <view class="field"><text class="fl">简介</text><textarea v-model="profile.bio" class="fi ta" placeholder="介绍一下自己吧..." maxlength="200" :rows="3"/></view>
        <view class="field"><text class="fl">性别</text><view class="gender-row"><text v-for="g in genders" :key="g" class="gr" :class="{sel:profile.gender===g}" @click="profile.gender=g">{{g}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {reactive} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const profile=reactive({avatar:'头像',nickname:'国学爱好者',bio:'热爱传统文化，学习八字命理中...',gender:'男'});const genders=['男','女','保密'];function changeAvatar(){uni.showToast({title:'选择头像',icon:'none'})};function handleSave(){uni.showToast({title:'保存成功',icon:'success'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-save{color:#C41E3A;font-size:26rpx;font-weight:500}.content{padding:24rpx}.avatar-section{text-align:center;padding:40rpx 0}.as-icon{width:140rpx;height:140rpx;border-radius:50%;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:56rpx;color:#C41E3A;margin:0 auto 16rpx}.as-hint{font-size:24rpx;color:#C41E3A}.card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.field{margin-bottom:24rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.fi.ta{height:120rpx;padding:20rpx;resize:none}.gender-row{display:flex;gap:16rpx}.gr{padding:16rpx 40rpx;border-radius:16rpx;background:#F5F1EB;font-size:26rpx;color:#999}.gr.sel{background:#C41E3A;color:#fff}
</style>
