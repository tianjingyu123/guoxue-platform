<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">邀请好友</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">邀请方式</text>
        <view v-for="w in inviteWays" :key="w.key" class="way-row" @click="invite(w.key)"><text class="wr-icon">{{w.icon}}</text><view><text class="wr-name">{{w.label}}</text><text class="wr-desc">{{w.desc}}</text></view><text>›</text></view>
      </view>
      <view class="card"><text class="ct">邀请码</text><text class="inv-code">GUOXUE2024</text><text class="inv-hint">分享邀请码给好友，输入后加入</text>
        <view class="inv-actions"><view class="ia-btn" @click="copyCode">📋 复制邀请码</view><view class="ia-btn primary" @click="shareCode">📤 分享链接</view></view>
      </view>
      <view class="card"><text class="ct">邀请奖励</text>
        <view v-for="r in rewards" :key="r" class="reward-item">🎁 {{r}}</view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const inviteWays=[{key:'wechat',label:'微信好友',desc:'通过微信分享邀请',icon:'💚'},{key:'qrcode',label:'二维码',desc:'好友扫码加入',icon:'📱'},{key:'link',label:'复制链接',desc:'复制邀请链接',icon:'🔗'}];const rewards=['邀请1人注册：+50积分','邀请3人注册：+200积分','被邀请人首次购买：佣金5%'];function invite(key:string){};function copyCode(){uni.setClipboardData({data:'GUOXUE2024'});uni.showToast({title:'已复制',icon:'success'})};function shareCode(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.way-row{display:flex;align-items:center;gap:16rpx;padding:20rpx 0;border-bottom:1px solid #F5F1EB}.wr-icon{font-size:44rpx}.wr-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.wr-desc{font-size:22rpx;color:#999;margin-top:2rpx}.inv-code{font-size:48rpx;font-weight:900;color:#C41E3A;text-align:center;letter-spacing:8rpx;display:block;margin-bottom:8rpx}.inv-hint{font-size:22rpx;color:#999;text-align:center;display:block;margin-bottom:24rpx}.inv-actions{display:flex;gap:16rpx}.ia-btn{flex:1;padding:20rpx;text-align:center;border-radius:16rpx;font-size:24rpx;background:#F5F1EB;color:#666}.ia-btn.primary{background:#C41E3A;color:#fff}.reward-item{font-size:24rpx;color:#666;padding:12rpx 0;border-bottom:1px solid #F5F1EB}
</style>
