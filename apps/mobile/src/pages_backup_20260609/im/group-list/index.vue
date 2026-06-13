<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的群聊</text><text class="nav-add" @click="goCreate">＋</text></view>
    <view class="search-wrap"><text class="sw-icon">🔍</text><input class="sw-input" placeholder="搜索群聊..."/></view>
    <scroll-view scroll-y class="content">
      <view v-for="g in groups" :key="g.id" class="group-row" @click="goChat(g.id)">
        <text class="gr-avatar">{{g.name[0]}}</text><view class="gr-info"><text class="gr-name">{{g.name}}</text><text class="gr-meta">{{g.members}}人·{{g.lastMsg||'暂无消息'}}</text></view>
        <view v-if="g.unread>0" class="gr-badge">{{g.unread>99?'99+':g.unread}}</view>
      </view>
      <view v-if="groups.length===0" class="empty"><text class="em-icon">👥</text><text>暂无群聊</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const groups=ref([{id:1,name:'八字学习群',members:128,lastMsg:'周易大师：今天分享八字...',unread:5},{id:2,name:'紫微斗数交流群',members:86,lastMsg:'张玄风：十二宫位讲解',unread:0},{id:3,name:'风水布局研究会',members:45,lastMsg:'李易安：新文章已发布',unread:2}]);function goChat(id:number){uni.navigateTo({url:'/pages/im/group-chat/id-detail/index'})};function goCreate(){uni.navigateTo({url:'/pages/im/group-detail/id-detail/create/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-add{font-size:40rpx;color:#C41E3A;padding:8rpx}.search-wrap{display:flex;align-items:center;padding:16rpx 24rpx}.sw-icon{font-size:28rpx;margin-right:12rpx}.sw-input{flex:1;height:64rpx;background:#fff;border-radius:40rpx;padding:0 24rpx;font-size:24rpx}.content{padding:0 24rpx 24rpx}.group-row{display:flex;align-items:center;gap:16rpx;padding:24rpx 0;border-bottom:1px solid #F5F1EB}.gr-avatar{width:88rpx;height:88rpx;border-radius:20rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:34rpx;color:#2C2C2C;flex-shrink:0}.gr-info{flex:1}.gr-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.gr-meta{font-size:22rpx;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4rpx}.gr-badge{min-width:36rpx;height:36rpx;border-radius:18rpx;background:#C41E3A;color:#fff;font-size:18rpx;display:flex;align-items:center;justify-content:center;padding:0 8rpx}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}.em-icon{font-size:80rpx;opacity:.3;display:block;margin-bottom:16rpx}
</style>
