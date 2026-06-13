<template>
  <view class="page">
    <view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">举报详情</text><view style="width:48rpx"/></view>
    <view class="card"><text class="ct">举报信息</text><view class="row"><text class="rl">类型</text><text>{{report.type}}</text></view><view class="row"><text class="rl">对象</text><text>{{report.target}}</text></view><view class="row"><text class="rl">时间</text><text>{{report.time}}</text></view><view class="row"><text class="rl">状态</text><text :class="'st-'+report.status">{{statusLabel(report.status)}}</text></view></view>
    <view class="card"><text class="ct">处理结果</text><text class="result">{{report.result||'处理中，请耐心等待'}}</text></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const report=ref({type:'垃圾广告',target:'某用户帖子',time:'2024-01-15',status:'done',result:'经核实，该内容违反社区规范，已删除并警告发布者。'});function statusLabel(s:string){const m:any={pending:'处理中',done:'已处理'};return m[s]};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:32rpx;font-weight:600}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.row{display:flex;justify-content:space-between;padding:12rpx 0;font-size:26rpx;color:#2C2C2C;border-bottom:1px solid #F5F1EB}.rl{color:#999}.st-done{color:#22c55e}.st-pending{color:#f97316}.result{font-size:26rpx;color:#666;line-height:1.6}
</style>
