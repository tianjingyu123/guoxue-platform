<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">运势订阅</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">订阅设置</text>
        <view v-for="s in settings" :key="s.key" class="set-row"><view><text class="sr-name">{{s.label}}</text><text class="sr-desc">{{s.desc}}</text></view><switch :checked="s.enabled" @change="s.enabled=!s.enabled"/></view>
      </view>
      <view class="card"><text class="ct">推送时间</text>
        <view class="time-row"><text class="tr-label">每日推送</text><picker mode="time" value="08:00"><text>08:00</text></picker></view>
      </view>
      <view class="card"><text class="ct">订阅提醒方式</text>
        <view v-for="c in channels" :key="c.key" class="ch-row"><text class="cr-icon">{{c.icon}}</text><view><text class="cr-name">{{c.label}}</text><text class="cr-desc">{{c.desc}}</text></view><switch :checked="c.enabled" @change="c.enabled=!c.enabled"/></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
    <view class="bb"><view class="bbb" @click="handleSave">保存设置</view></view>
  </view>
</template>
<script setup lang="ts">import {ref,reactive} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const settings=reactive([{key:'daily',label:'每日运势',desc:'每天推送当日运势',enabled:true},{key:'weekly',label:'周运势',desc:'每周一推送本周综合运势',enabled:true},{key:'monthly',label:'月运势',desc:'每月1日推送本月运势',enabled:false}]);const channels=reactive([{key:'app',label:'App通知',desc:'通过App推送',icon:'📱',enabled:true},{key:'sms',label:'短信提醒',desc:'通过短信推送',icon:'💬',enabled:false}]);function handleSave(){uni.showToast({title:'保存成功',icon:'success'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.set-row,.ch-row{display:flex;align-items:center;justify-content:space-between;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.sr-name,.cr-name{font-size:26rpx;color:#2C2C2C;display:block}.sr-desc,.cr-desc{font-size:22rpx;color:#999;margin-top:2rpx}.cr-icon{font-size:36rpx;margin-right:16rpx}.time-row{display:flex;align-items:center;justify-content:space-between;padding:16rpx 0;font-size:26rpx;color:#2C2C2C}.bb{position:fixed;bottom:0;left:0;right:0;padding:20rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bbb{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}</style>
