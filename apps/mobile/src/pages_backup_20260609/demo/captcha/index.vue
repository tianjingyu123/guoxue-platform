<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">安全验证演示</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">滑块验证</text><text class="cd">拖动滑块完成拼图验证</text>
        <view class="slider"><view class="st"><view class="sf"/></view><view class="sb">→</view></view>
        <text class="ok">✓ 验证通过</text>
      </view>
      <view class="card"><text class="ct">短信验证码</text><text class="cd">发送验证码到 138****8888</text>
        <view class="sr"><input class="si" placeholder="输入验证码" maxlength="6"/><text class="sbtn" :class="{dis:cdt>0}" @click="sendSms">{{cdt>0?cdt+'s':'发送验证码'}}</text></view>
      </view>
      <view class="card"><text class="ct">使用场景</text><text v-for="s in scenes" :key="s" class="si2">{{s}}</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const cdt=ref(0);const scenes=['📱 发送验证码','🔑 登录验证','💰 支付确认','✏️ 修改信息'];function sendSms(){if(cdt.value>0)return;cdt.value=60;const t=setInterval(()=>{cdt.value--;if(cdt.value<=0)clearInterval(t)},1000)};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:8rpx;display:block}.cd{font-size:22rpx;color:#999;margin-bottom:20rpx}.slider{position:relative;height:88rpx}.st{height:100%;background:#F5F1EB;border-radius:44rpx}.sb{position:absolute;top:0;left:0;width:88rpx;height:88rpx;border-radius:50%;background:#fff;box-shadow:0 2rpx 12rpx rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;font-size:28rpx;color:#999}.ok{font-size:24rpx;color:#22c55e;margin-top:16rpx;display:block}.sr{display:flex;gap:16rpx}.si{flex:1;height:80rpx;background:#F5F1EB;border-radius:16rpx;padding:0 20rpx;font-size:28rpx}.sbtn{padding:0 28rpx;height:80rpx;line-height:80rpx;background:#C41E3A;color:#fff;border-radius:16rpx;font-size:24rpx}.sbtn.dis{background:#D9D9D9;color:#999}.si2{padding:16rpx 0;border-bottom:1px solid #F5F1EB;font-size:26rpx;color:#666;display:block}</style>
