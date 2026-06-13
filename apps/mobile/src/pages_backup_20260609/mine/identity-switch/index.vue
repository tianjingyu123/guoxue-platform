<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">身份切换</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="r in roles" :key="r.key" class="role-card" :class="{active:r.active}" @click="switchRole(r)">
        <text class="rc-icon">{{r.icon}}</text><view class="rc-info"><text class="rc-name">{{r.label}}</text><text class="rc-desc">{{r.desc}}</text></view>
        <text v-if="r.active" class="rc-badge">当前</text>
        <text v-else class="rc-arrow">切换 ›</text>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,reactive} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const roles=reactive([{key:'user',label:'普通用户',desc:'浏览内容、购买课程、参与讨论',icon:'👤',active:true},{key:'creator',label:'创作者',desc:'发布内容、管理圈子、获得收益',icon:'✏️',active:false},{key:'teacher',label:'讲师',desc:'开设课程、批改作业、数据分析',icon:'🎓',active:false},{key:'merchant',label:'商家',desc:'管理商品、处理订单、查看收益',icon:'🛍️',active:false}]);function switchRole(r:any){roles.forEach(x=>x.active=false);r.active=true;uni.showToast({title:'已切换为'+r.label,icon:'success'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.role-card{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04);border:2rpx solid transparent}.role-card.active{border-color:#C41E3A}.rc-icon{font-size:48rpx}.rc-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.rc-desc{font-size:22rpx;color:#999;margin-top:4rpx}.rc-badge{font-size:20rpx;padding:6rpx 16rpx;background:rgba(196,30,58,.1);color:#C41E3A;border-radius:8rpx}.rc-arrow{font-size:24rpx;color:#C41E3A}
</style>
