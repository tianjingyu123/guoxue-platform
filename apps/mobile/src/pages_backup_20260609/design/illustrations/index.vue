<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">插画设计资源</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <text class="sec">默认头像</text>
      <view class="row"><view v-for="a in avatars" :key="a" class="av"><text class="av-icon">👤</text><text class="av-label">{{a}}</text></view></view>

      <text class="sec mt">空状态插图</text>
      <view class="row"><view v-for="e in empties" :key="e" class="av"><text class="av-icon">📭</text><text class="av-label">{{e}}</text></view></view>

      <text class="sec mt">引导插图</text>
      <view class="row"><view v-for="g in guides" :key="g" class="av"><text class="av-icon">🎯</text><text class="av-label">{{g}}</text></view></view>

      <text class="sec mt">图标占位</text>
      <view class="row"><view v-for="i in icons" :key="i" class="av"><text class="av-icon">🖼️</text><text class="av-label">{{i}}</text></view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const avatars=['男性默认','女性默认','中性默认','圈主默认','系统默认'];const empties=['通用空数据','内容为空','网络异常','消息为空','搜索无结果','支付成功','支付失败','404'];const guides=['排盘引导','加入圈子','学习课程','发布内容','会员引导'];const icons=['排盘图标','圈子图标','课程图标','商城图标','发现图标','封面占位','平台Logo'];function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.sec{font-size:26rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.mt{margin-top:32rpx}.row{display:flex;flex-wrap:wrap;gap:16rpx}.av{width:160rpx;background:#fff;border-radius:16rpx;padding:24rpx 16rpx;text-align:center;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.av-icon{font-size:48rpx;display:block;margin-bottom:8rpx}.av-label{font-size:20rpx;color:#999}</style>
