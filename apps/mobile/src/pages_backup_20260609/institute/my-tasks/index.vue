<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的任务</text><view style="width:48rpx"/></view>
    <view class="tab-row"><text v-for="t in tabs" :key="t.key" class="tab" :class="{act:tab===t.key}" @click="tab=t.key">{{t.label}}{{t.count}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="t in tasks" :key="t.id" class="task-card">
        <view class="tc-head"><text class="tc-icon">{{t.icon}}</text><view class="tc-info"><text class="tc-title">{{t.title}}</text><text class="tc-desc">{{t.desc}}</text></view></view>
        <view class="tc-foot"><text class="tc-deadline">⏰{{t.deadline}}</text><text class="tc-status" :class="'st-'+t.status">{{statusLabel(t.status)}}</text></view>
      </view>
      <view v-if="tasks.length===0" class="empty"><text>暂无任务</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const tab=ref<'pending'|'done'>('pending');const tabs=[{key:'pending' as const,label:'待完成',count:'(2)'},{key:'done' as const,label:'已完成',count:'(3)'}];const allTasks=[{id:1,title:'审稿：《八字命理研究》论文',desc:'审查会员提交的学术论文',deadline:'2024-02-20',status:'pending',icon:'📄'},{id:2,title:'活动评审',desc:'春季国学研讨会稿件评审',deadline:'2024-03-01',status:'pending',icon:'⭐'},{id:3,title:'季度报告撰写',desc:'提交第一季度研究报告',deadline:'2024-01-15',status:'done',icon:'📝'},{id:4,title:'新成员面试',desc:'面试研究员候选人',deadline:'2024-01-10',status:'done',icon:'👥'}];const tasks=computed(()=>allTasks.filter(t=>t.status===tab.value));function statusLabel(s:string){const m:any={pending:'待处理',done:'已完成'};return m[s]};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.tab-row{display:flex;gap:32rpx;padding:16rpx 24rpx;background:#FAF8F5;border-bottom:1px solid #E8E0D5}.tab{font-size:26rpx;color:#999;position:relative}.tab.act{color:#C41E3A;font-weight:500}.tab.act::after{content:'';position:absolute;bottom:-16rpx;left:0;right:0;height:4rpx;background:#C41E3A;border-radius:2rpx}.content{padding:24rpx}.task-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.tc-head{display:flex;gap:16rpx;margin-bottom:16rpx}.tc-icon{font-size:44rpx;flex-shrink:0}.tc-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.tc-desc{font-size:24rpx;color:#999;margin-top:4rpx}.tc-foot{display:flex;justify-content:space-between;align-items:center;padding-top:16rpx;border-top:1px solid #F5F1EB}.tc-deadline{font-size:22rpx;color:#999}.tc-status{font-size:20rpx;padding:6rpx 16rpx;border-radius:12rpx}.st-pending{background:rgba(249,115,22,.1);color:#f97316}.st-done{background:rgba(34,197,94,.1);color:#22c55e}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
