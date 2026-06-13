<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">商品评价</text><view style="width:48rpx"/></view>
    <view class="summary"><text class="sm-score">{{avgRating}}</text><view class="sm-stars"><text>⭐⭐⭐⭐⭐</text><text class="sm-count">{{reviews.length}}条评价</text></view></view>
    <view class="filter-row"><text v-for="f in filters" :key="f.key" class="fr" :class="{act:filter===f.key}" @click="filter=f.key">{{f.label}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="r in filteredReviews" :key="r.id" class="review-card">
        <view class="rc-head"><text class="rch-avatar">{{r.user[0]}}</text><view><text class="rch-name">{{r.user}}</text><text class="rch-stars">⭐{{r.rating}}</text></view><text class="rch-time">{{r.time}}</text></view>
        <text class="rc-content">{{r.content}}</text>
        <view v-if="r.images" class="rc-images"><text v-for="i in r.images" :key="i" class="rci">🖼️</text></view>
        <view v-if="r.reply" class="rc-reply"><text class="rcr-label">商家回复：</text><text>{{r.reply}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const filter=ref('all');const filters=[{key:'all',label:'全部'},{key:'good',label:'好评'},{key:'normal',label:'中评'},{key:'bad',label:'差评'},{key:'image',label:'有图'}];const reviews=ref([{id:1,user:'易学爱好者',rating:5,content:'书的质量很好，纸质优良，排版也很清晰。适合收藏！',images:['',''],time:'3天前',reply:'感谢您的认可！'},{id:2,user:'命理新手',rating:5,content:'入门必读书籍，讲解详细，很有收获。',images:[],time:'1周前'},{id:3,user:'风水先生',rating:4,content:'整体不错，就是快递有点慢。',images:[],time:'2周前'}]);const avgRating=computed(()=>(reviews.value.reduce((s,r)=>s+r.rating,0)/reviews.value.length).toFixed(1));const filteredReviews=computed(()=>reviews.value);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.summary{text-align:center;padding:32rpx;background:#fff;margin-bottom:16rpx}.sm-score{font-size:64rpx;font-weight:900;color:#C41E3A;display:block}.sm-stars{font-size:28rpx;margin-top:8rpx}.sm-count{font-size:22rpx;color:#999;margin-left:8rpx}.filter-row{display:flex;gap:12rpx;padding:16rpx 24rpx;background:#FAF8F5}.fr{padding:10rpx 24rpx;border-radius:40rpx;font-size:24rpx;background:#F5F1EB;color:#999}.fr.act{background:#C41E3A;color:#fff}.content{padding:24rpx}.review-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.rc-head{display:flex;align-items:center;gap:12rpx;margin-bottom:16rpx}.rch-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999}.rch-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.rch-stars{font-size:22rpx;color:#C9A96E}.rch-time{font-size:20rpx;color:#ccc;margin-left:auto}.rc-content{font-size:26rpx;color:#333;line-height:1.6}.rc-images{display:flex;gap:12rpx;margin-top:12rpx}.rci{width:140rpx;height:140rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:40rpx}.rc-reply{margin-top:12rpx;padding:16rpx;background:#F5F1EB;border-radius:12rpx;font-size:24rpx;color:#999}.rcr-label{color:#C9A96E;font-weight:500}
</style>
