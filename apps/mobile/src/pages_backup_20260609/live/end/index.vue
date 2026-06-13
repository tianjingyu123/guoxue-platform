<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="header"><text class="h-icon">📻</text><text class="h-title">直播已结束</text><text class="h-sub">感谢观看！</text></view>
      <view class="stats"><view v-for="s in liveStats" :key="s.label" class="st"><text class="st-val">{{s.value}}</text><text class="st-label">{{s.label}}</text></view></view>
      <view class="card"><text class="ct">推荐内容</text>
        <view v-for="r in recommends" :key="r.id" class="rec-row"><text class="rr-cover">{{r.icon}}</text><view><text class="rr-title">{{r.title}}</text><text class="rr-sub">{{r.sub}}</text></view></view>
      </view>
      <view class="actions"><view class="act" @click="goBack">返回</view><view class="act primary" @click="goReplay">查看回放</view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const liveStats=[{label:'总观看',value:'12,580'},{label:'峰值在线',value:'3,256'},{label:'总点赞',value:'32,800'},{label:'总打赏',value:'¥2,680'}];const recommends=[{id:1,title:'八字命理入门精讲',sub:'周易大师·299元',icon:'📚'},{id:2,title:'紫微斗数基础课',sub:'张玄风·199元',icon:'⭐'},{id:3,title:'风水布局入门',sub:'陈风水·149元',icon:'🏠'}];function goBack(){uni.navigateBack()};function goReplay(){uni.navigateTo({url:'/pages/live/replay/id-detail/index'})}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.content{padding:24rpx;padding-top:80rpx}.header{text-align:center;padding:32rpx 0 40rpx}.h-icon{font-size:80rpx;display:block;margin-bottom:16rpx}.h-title{font-size:40rpx;font-weight:600;color:#2C2C2C;display:block}.h-sub{font-size:26rpx;color:#999;margin-top:8rpx}.stats{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}.st{background:#fff;border-radius:20rpx;padding:24rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.st-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.st-label{font-size:22rpx;color:#999;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.rec-row{display:flex;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.rr-cover{width:80rpx;height:56rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:32rpx}.rr-title{font-size:26rpx;color:#2C2C2C;display:block}.rr-sub{font-size:22rpx;color:#999;margin-top:4rpx}.actions{display:flex;gap:24rpx}.act{flex:1;padding:24rpx;text-align:center;border-radius:24rpx;font-size:26rpx;background:#F5F1EB;color:#666}.act.primary{background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff}
</style>
