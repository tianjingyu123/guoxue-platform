<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">学习详情</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">课程信息</text>
        <view class="course-row"><view class="cr-cover">📚</view><view><text class="cr-title">{{course.title}}</text><text class="cr-instructor">{{course.instructor}}</text></view></view>
        <view class="progress-wrap"><text class="pw-label">学习进度 {{course.progress}}%</text><view class="pw-bar"><view class="pw-fill" :style="{width:course.progress+'%'}"/></view></view>
      </view>

      <view class="card"><text class="ct">学习统计</text>
        <view class="stats-grid"><view v-for="s in stats" :key="s.label" class="sg"><text class="sg-val">{{s.value}}</text><text class="sg-label">{{s.label}}</text></view></view>
      </view>

      <view class="card"><text class="ct">最近学习</text>
        <view v-for="r in recent" :key="r.id" class="recent-row"><text>{{r.icon}}</text><view><text class="rr-title">{{r.title}}</text><text class="rr-time">{{r.time}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
    <view class="bb"><view class="bbb" @click="goPlay">▶ 继续学习</view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const course={title:'八字命理入门精讲',instructor:'周易大师',progress:62};const stats=[{label:'学习课时',value:'20/32'},{label:'笔记数',value:'15'},{label:'作业',value:'2/4'},{label:'学习时长',value:'18h'},{label:'获得积分',value:'280'},{label:'连续打卡',value:'7天'}];const recent=[{id:1,title:'3.4 官杀的含义与作用',time:'昨天',icon:'▶️'},{id:2,title:'3.3 财星的含义与作用',time:'昨天',icon:'✓'},{id:3,title:'3.2 食伤的含义与作用',time:'前天',icon:'✓'}];function goPlay(){uni.navigateTo({url:'/pages/courses/id-detail/player/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.course-row{display:flex;gap:16rpx;align-items:center;margin-bottom:20rpx}.cr-cover{width:96rpx;height:72rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:44rpx}.cr-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.cr-instructor{font-size:22rpx;color:#999}.progress-wrap{margin-top:16rpx}.pw-label{font-size:22rpx;color:#999;margin-bottom:8rpx;display:block}.pw-bar{height:10rpx;background:#F5F1EB;border-radius:5rpx;overflow:hidden}.pw-fill{height:100%;background:linear-gradient(90deg,#C41E3A,#E85A71);border-radius:5rpx}.stats-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16rpx}.sg{text-align:center;padding:16rpx 0}.sg-val{font-size:32rpx;font-weight:700;color:#C41E3A;display:block}.sg-label{font-size:20rpx;color:#999;margin-top:4rpx}.recent-row{display:flex;align-items:center;gap:12rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB;font-size:28rpx}.rr-title{font-size:24rpx;color:#2C2C2C;display:block}.rr-time{font-size:20rpx;color:#999}.bb{position:fixed;bottom:0;left:0;right:0;padding:20rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bbb{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}
</style>
