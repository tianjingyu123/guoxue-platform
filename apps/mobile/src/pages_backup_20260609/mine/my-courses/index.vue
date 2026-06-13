<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的课程</text><view class="nav-search" @click="goSearch">🔍</view></view>
    <view class="tab-row"><text v-for="t in tabs" :key="t.key" class="tab" :class="{act:tab===t.key}" @click="tab=t.key">{{t.label}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="c in courses" :key="c.id" class="course-card" @click="goLearn(c.id)">
        <view class="cc-cover">📚</view>
        <view class="cc-info"><text class="cci-title">{{c.title}}</text><text class="cci-instructor">{{c.instructor}}</text>
          <view class="cci-progress"><view class="ccip-bar"><view class="ccip-fill" :style="{width:c.progress+'%'}"/></view><text class="ccip-pct">{{c.progress}}%</text></view>
        </view>
      </view>
      <view v-if="courses.length===0" class="empty"><text>暂无课程</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const tab=ref('learning');const tabs=[{key:'learning',label:'学习中'},{key:'done',label:'已完结'}];const courses=ref([{id:1,title:'八字命理入门精讲',instructor:'周易大师',progress:62},{id:2,title:'紫微斗数基础课',instructor:'张玄风',progress:38},{id:3,title:'风水布局入门',instructor:'陈风水',progress:100}]);function goLearn(id:number){uni.navigateTo({url:'/pages/courses/id-detail/learn/index'})};function goSearch(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-search{font-size:32rpx}.tab-row{display:flex;gap:32rpx;padding:16rpx 24rpx}.tab{font-size:24rpx;color:#999;position:relative}.tab.act{color:#C41E3A;font-weight:500}.tab.act::after{content:'';position:absolute;bottom:-16rpx;left:0;right:0;height:4rpx;background:#C41E3A;border-radius:2rpx}.content{padding:24rpx}.course-card{display:flex;gap:20rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.cc-cover{width:120rpx;height:90rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:48rpx;flex-shrink:0}.cci-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.cci-instructor{font-size:22rpx;color:#999;margin-top:4rpx}.cci-progress{display:flex;align-items:center;gap:8rpx;margin-top:12rpx}.ccip-bar{flex:1;height:8rpx;background:#F5F1EB;border-radius:4rpx;overflow:hidden}.ccip-fill{height:100%;background:linear-gradient(90deg,#C41E3A,#E85A71);border-radius:4rpx}.ccip-pct{font-size:20rpx;color:#999}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
