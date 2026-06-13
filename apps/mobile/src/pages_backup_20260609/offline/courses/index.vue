<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">线下课程</text><text class="nav-search" @click="goSearch">🔍</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="c in courses" :key="c.id" class="course-card" @click="goDetail(c.id)">
        <view class="cc-cover">📚</view><view class="cc-info"><text class="cci-title">{{c.title}}</text><text class="cci-meta">{{c.venue}}·{{c.date}}</text><view class="cci-bottom"><text class="cci-price">¥{{c.price}}</text><text class="cci-students">{{c.students}}人报名</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const courses=ref([{id:1,title:'八字命理入门线下班',venue:'北京国学馆',date:'2024-03-15',price:1999,students:28},{id:2,title:'风水实践课',venue:'上海分院',date:'2024-04-01',price:2999,students:15},{id:3,title:'紫微斗数高级班',venue:'广州国学中心',date:'2024-04-20',price:3999,students:8}]);function goDetail(id:number){uni.navigateTo({url:'/pages/offline/courses/id-detail/index'})};function goSearch(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-search{font-size:32rpx}.content{padding:24rpx}.course-card{display:flex;gap:20rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.cc-cover{width:120rpx;height:90rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:48rpx;flex-shrink:0}.cci-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.cci-meta{font-size:22rpx;color:#999;margin-top:6rpx}.cci-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:12rpx}.cci-price{font-size:28rpx;font-weight:600;color:#C41E3A}.cci-students{font-size:22rpx;color:#999}
</style>
