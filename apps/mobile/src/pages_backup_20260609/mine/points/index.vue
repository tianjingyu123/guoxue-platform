<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">积分中心</text><text class="nav-right" @click="goHistory">明细</text></view>
    <scroll-view scroll-y class="content">
      <view class="balance-card"><text class="bc-label">当前积分</text><text class="bc-val">{{balance}}</text>
        <view class="bc-actions"><view class="bca" @click="goTasks">做任务赚积分</view><view class="bca outline" @click="goExchange">积分兑换</view></view>
      </view>
      <view class="card"><text class="ct">积分规则</text>
        <view v-for="r in rules" :key="r.label" class="rule-row"><text class="rr-icon">{{r.icon}}</text><view><text class="rr-label">{{r.label}}</text><text class="rr-val">+{{r.points}}积分</text></view></view>
      </view>
      <view class="card"><text class="ct">积分明细</text>
        <view v-for="d in details" :key="d.id" class="det-row"><text class="dr-icon">{{d.icon}}</text><view><text class="dr-desc">{{d.desc}}</text><text class="dr-time">{{d.time}}</text></view><text class="dr-pts" :class="d.amount>=0?'up':'down'">{{d.amount>=0?'+':''}}{{d.amount}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const balance=ref(1580);const rules=[{label:'每日签到',points:10,icon:'📅'},{label:'学习课程',points:20,icon:'📚'},{label:'发布帖子',points:15,icon:'✏️'},{label:'评论互动',points:5,icon:'💬'},{label:'邀请好友',points:50,icon:'👥'}];const details=ref([{id:1,desc:'每日签到',time:'今天',amount:10,icon:'📅'},{id:2,desc:'完成课程学习',time:'昨天',amount:20,icon:'📚'},{id:3,desc:'发布帖子',time:'2天前',amount:15,icon:'✏️'},{id:4,desc:'积分兑换优惠券',time:'3天前',amount:-500,icon:'🎫'}]);function goTasks(){};function goExchange(){};function goHistory(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-right{font-size:24rpx;color:#C41E3A}.content{padding:24rpx}.balance-card{background:linear-gradient(135deg,#C9A96E,#C41E3A);border-radius:24rpx;padding:36rpx;text-align:center;color:#fff;margin-bottom:24rpx}.bc-label{font-size:24rpx;opacity:.8}.bc-val{font-size:80rpx;font-weight:900;display:block;margin:8rpx 0 28rpx}.bc-actions{display:flex;gap:16rpx;justify-content:center}.bca{padding:20rpx 40rpx;background:rgba(255,255,255,.2);border-radius:40rpx;font-size:24rpx}.bca.outline{border:1px solid rgba(255,255,255,.5);background:transparent}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.rule-row{display:flex;align-items:center;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.rr-icon{font-size:32rpx}.rr-label{font-size:26rpx;color:#2C2C2C;display:block}.rr-val{font-size:24rpx;color:#C41E3A;font-weight:500}.det-row{display:flex;align-items:center;gap:12rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.dr-icon{font-size:28rpx}.dr-desc{font-size:26rpx;color:#2C2C2C;display:block}.dr-time{font-size:20rpx;color:#999}.dr-pts{font-size:26rpx;font-weight:500;margin-left:auto}.up{color:#22c55e}.down{color:#ef4444}
</style>
