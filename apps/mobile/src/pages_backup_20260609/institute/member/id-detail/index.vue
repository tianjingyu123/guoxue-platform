<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">成员详情</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="header"><text class="h-avatar">{{member.name[0]}}</text><text class="h-name">{{member.name}}</text><text class="h-role">{{member.role}}</text><text class="h-bio">{{member.bio}}</text></view>
      <view class="card"><text class="ct">研究方向</text><view class="tags"><text v-for="t in member.tags" :key="t" class="tag">{{t}}</text></view></view>
      <view class="card"><text class="ct">学术成果</text><view v-for="w in member.works" :key="w.id" class="work-item"><text class="wi-title">{{w.title}}</text><text class="wi-meta">{{w.type}}·{{w.date}}</text></view></view>
      <view class="card"><text class="ct">联系方式</text><view class="contact-row"><text>📧 {{member.email}}</text></view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const member=ref({name:'周易大师',role:'研究员',bio:'资深命理师，从业二十年，专注八字、紫微研究。',email:'master@rebu.com',tags:['八字命理','紫微斗数','风水堪舆'],works:[{id:1,title:'《八字命理精解》',type:'专著',date:'2023'},{id:2,title:'《紫微斗数实践指南》',type:'论文',date:'2022'},{id:3,title:'浅析五行生克在命理中的应用',type:'论文',date:'2021'}]});function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.header{background:#fff;border-radius:20rpx;padding:36rpx 28rpx;text-align:center;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.h-avatar{width:120rpx;height:120rpx;border-radius:50%;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:48rpx;color:#C41E3A;margin:0 auto 16rpx}.h-name{font-size:36rpx;font-weight:600;color:#2C2C2C;display:block}.h-role{font-size:24rpx;color:#C9A96E;margin-top:4rpx;display:block}.h-bio{font-size:24rpx;color:#999;margin-top:12rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.tags{display:flex;flex-wrap:wrap;gap:12rpx}.tag{padding:10rpx 24rpx;background:#F5F1EB;border-radius:40rpx;font-size:22rpx;color:#999}.work-item{padding:16rpx 0;border-bottom:1px solid #F5F1EB}.wi-title{font-size:26rpx;color:#2C2C2C;display:block}.wi-meta{font-size:22rpx;color:#999;margin-top:4rpx}.contact-row{font-size:26rpx;color:#666;padding:16rpx 0}
</style>
