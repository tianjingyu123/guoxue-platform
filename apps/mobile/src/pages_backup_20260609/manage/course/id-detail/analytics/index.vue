<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">课程数据</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">{{course.title}}</text><text class="cd">{{course.instructor}}</text></view>
      <view class="metrics"><view v-for="m in metrics" :key="m.label" class="m-item"><text class="mi-val">{{m.value}}</text><text class="mi-label">{{m.label}}</text></view></view>
      <view class="card"><text class="ct">学习进度分布</text>
        <view v-for="p in progress" :key="p.range" class="pg-row"><text class="pgr-label">{{p.range}}</text><view class="pgr-bar"><view class="pgr-fill" :style="{width:(p.count/maxProgress*100)+'%'}"/></view><text class="pgr-count">{{p.count}}人</text></view>
      </view>
      <view class="card"><text class="ct">学员评价统计</text>
        <view class="star-avg"><text class="sa-score">{{course.rating}}</text><text class="sa-stars">⭐</text></view>
        <view v-for="r in ratingDist" :key="r.star" class="star-row"><text>{{r.star}}星</text><view class="sr-bar"><view class="sr-fill" :style="{width:(r.count/course.students*100)+'%'}"/></view><text class="sr-count">{{r.count}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const course={title:'八字命理入门精讲',instructor:'周易大师',rating:4.9,students:12860};const metrics=[{label:'总学员',value:'12,860'},{label:'完成率',value:'68%'},{label:'好评率',value:'95%'},{label:'总收益',value:'¥128,600'}];const progress=[{range:'完成100%',count:4280},{range:'50-99%',count:3680},{range:'1-49%',count:3560},{range:'未开始',count:1340}];const maxProgress=computed(()=>Math.max(...progress.map(p=>p.count)));const ratingDist=[{star:'5',count:9860},{star:'4',count:1860},{star:'3',count:680},{star:'2',count:280},{star:'1',count:180}];function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:12rpx;display:block}.cd{font-size:24rpx;color:#999}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}.m-item{background:#fff;border-radius:20rpx;padding:28rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.mi-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.mi-label{font-size:22rpx;color:#999;margin-top:4rpx}.pg-row{display:flex;align-items:center;gap:12rpx;padding:8rpx 0}.pgr-label{font-size:22rpx;color:#2C2C2C;min-width:120rpx}.pgr-bar{flex:1;height:12rpx;background:#F5F1EB;border-radius:6rpx;overflow:hidden}.pgr-fill{height:100%;background:linear-gradient(90deg,#C41E3A,#E85A71);border-radius:6rpx}.pgr-count{font-size:20rpx;color:#999}.star-avg{text-align:center;padding:24rpx 0}.sa-score{font-size:64rpx;font-weight:900;color:#C41E3A}.sa-stars{font-size:36rpx;color:#C9A96E}.star-row{display:flex;align-items:center;gap:12rpx;padding:8rpx 0;font-size:22rpx;color:#2C2C2C}.sr-bar{flex:1;height:16rpx;background:#F5F1EB;border-radius:8rpx;overflow:hidden}.sr-fill{height:100%;background:#C9A96E;border-radius:8rpx}.sr-count{color:#999;min-width:60rpx;text-align:right}
</style>
