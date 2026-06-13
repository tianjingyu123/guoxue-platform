<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的学习</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="summary-card">
        <text class="sc-title">学习概览</text>
        <view class="sc-grid"><view class="scg"><text class="scg-val">{{summary.courses}}</text><text class="scg-label">课程数</text></view><view class="scg"><text class="scg-val">{{summary.hours}}h</text><text class="scg-label">学习时长</text></view><view class="scg"><text class="scg-val">{{summary.streak}}天</text><text class="scg-label">连续打卡</text></view><view class="scg"><text class="scg-val">{{summary.notes}}</text><text class="scg-label">笔记</text></view></view>
      </view>

      <view class="card"><text class="ct">继续学习</text>
        <view v-for="c in continueList" :key="c.id" class="cl-item" @click="goLearn(c.id)">
          <view class="cli-cover">{{c.icon}}</view><view class="cli-info"><text class="cli-title">{{c.title}}</text><view class="cli-prog"><view class="cli-bar"><view class="cli-fill" :style="{width:c.progress+'%'}"/></view><text class="cli-pct">{{c.progress}}%</text></view></view>
        </view>
      </view>

      <view class="card"><text class="ct">学习成就</text>
        <view class="ach-grid"><view v-for="a in achievements" :key="a.id" class="ach-item"><text class="ai-icon">{{a.icon}}</text><text class="ai-name">{{a.name}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const summary={courses:5,hours:128,streak:21,notes:42};const continueList=ref([{id:1,title:'八字命理入门精讲',progress:62,icon:'📚'},{id:2,title:'紫微斗数基础课',progress:38,icon:'⭐'},{id:3,title:'风水布局入门',progress:15,icon:'🏠'}]);const achievements=[{id:1,icon:'🎯',name:'初识命理'},{id:2,icon:'📖',name:'学习10小时'},{id:3,icon:'🔥',name:'连续7天'},{id:4,icon:'✏️',name:'10篇笔记'},{id:5,icon:'💯',name:'完成第一课'},{id:6,icon:'🏆',name:'学习达人'}];function goLearn(id:number){uni.navigateTo({url:'/pages/courses/id-detail/learn/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.summary-card{background:linear-gradient(135deg,#C41E3A,#C9A96E);border-radius:24rpx;padding:32rpx;color:#fff;margin-bottom:24rpx}.sc-title{font-size:29rpx;font-weight:600;display:block;margin-bottom:24rpx}.sc-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16rpx}.scg{text-align:center}.scg-val{font-size:36rpx;font-weight:700;display:block}.scg-label{font-size:22rpx;opacity:.8;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.cl-item{display:flex;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.cli-cover{width:88rpx;height:66rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:36rpx;flex-shrink:0}.cli-title{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cli-prog{display:flex;align-items:center;gap:8rpx;margin-top:8rpx}.cli-bar{flex:1;height:8rpx;background:#F5F1EB;border-radius:4rpx;overflow:hidden}.cli-fill{height:100%;background:linear-gradient(90deg,#C41E3A,#E85A71);border-radius:4rpx}.cli-pct{font-size:20rpx;color:#999}.ach-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx}.ach-item{text-align:center;padding:24rpx 0;background:#FAF8F5;border-radius:16rpx}.ai-icon{font-size:44rpx;display:block;margin-bottom:8rpx}.ai-name{font-size:22rpx;color:#999}</style>
