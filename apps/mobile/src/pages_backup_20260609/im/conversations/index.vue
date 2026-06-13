<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">消息</text><text class="nav-add" @click="goContacts">＋</text></view>
    <view class="search-wrap"><text class="sw-icon">🔍</text><input class="sw-input" placeholder="搜索消息..."/></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view v-for="c in conversations" :key="c.id" class="conv-row" @click="goChat(c.id)">
        <view class="cr-avatar-wrap">
          <text class="cra-icon">{{c.name[0]}}</text>
          <view v-if="c.unread>0" class="cra-badge">{{c.unread>99?'99+':c.unread}}</view>
        </view>
        <view class="cr-info"><text class="cri-name">{{c.name}}</text><text class="cri-msg">{{c.lastMsg}}</text></view>
        <text class="cr-time">{{c.time}}</text>
      </view>
      <view v-if="conversations.length===0" class="empty"><text class="em-icon">💬</text><text class="em-text">暂无消息</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const conversations=ref([{id:1,name:'周易大师',lastMsg:'好的稍等，我帮你排一下盘',time:'刚刚',unread:2},{id:2,name:'八字学习群',lastMsg:'张玄风：今天分享给大家一个案例',time:'10:30',unread:15},{id:3,name:'李易安',lastMsg:'这个名字从五格来看比较...',time:'昨天',unread:0},{id:4,name:'系统通知',lastMsg:'您的课程即将到期',time:'3天前',unread:0}]);function goChat(id:number){uni.navigateTo({url:'/pages/im/chat/id-detail/index'})};function goContacts(){uni.navigateTo({url:'/pages/im/contacts/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-add{font-size:40rpx;color:#C41E3A;padding:8rpx}.search-wrap{display:flex;align-items:center;padding:16rpx 24rpx}.sw-icon{font-size:28rpx;margin-right:12rpx}.sw-input{flex:1;height:64rpx;background:#fff;border-radius:40rpx;padding:0 24rpx;font-size:24rpx}.content{padding:0 24rpx 24rpx}.conv-row{display:flex;align-items:center;gap:16rpx;padding:24rpx 0;border-bottom:1px solid #F5F1EB}.cr-avatar-wrap{position:relative}.cra-icon{width:88rpx;height:88rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:34rpx;color:#2C2C2C}.cra-badge{position:absolute;top:-4rpx;right:-4rpx;min-width:36rpx;height:36rpx;border-radius:18rpx;background:#C41E3A;color:#fff;font-size:18rpx;display:flex;align-items:center;justify-content:center;padding:0 6rpx}.cr-info{flex:1;min-width:0}.cri-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.cri-msg{font-size:24rpx;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4rpx}.cr-time{font-size:20rpx;color:#ccc;flex-shrink:0}.empty{display:flex;flex-direction:column;align-items:center;padding:160rpx 0}.em-icon{font-size:80rpx;opacity:.3;margin-bottom:16rpx}.em-text{font-size:26rpx;color:#999}
</style>
