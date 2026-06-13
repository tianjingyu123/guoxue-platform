<template>
  <view class="page">
    <view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">附近的人</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="u in users" :key="u.id" class="row">
        <text class="r-av">{{u.name[0]}}</text><view><text class="rn">{{u.name}}</text><text class="rd">{{u.dist}}·{{u.bio}}</text></view>
        <view class="rb" :class="{on:u.followed}" @click="u.followed=!u.followed"><text>{{u.followed?'已关注':'关注'}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const users=ref([{id:1,name:'易学爱好者',bio:'八字学习中',dist:'0.5km',followed:false},{id:2,name:'风水新手',bio:'',dist:'1.2km',followed:true}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.row{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.r-av{width:80rpx;height:80rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:30rpx;color:#2C2C2C;flex-shrink:0}.rn{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.rd{font-size:22rpx;color:#999;margin-top:4rpx}.rb{padding:14rpx 28rpx;border-radius:40rpx;font-size:24rpx;background:#C41E3A;color:#fff}.rb.on{background:#F5F1EB;color:#999}
</style>
