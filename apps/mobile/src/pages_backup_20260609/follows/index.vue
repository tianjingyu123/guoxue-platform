<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><view class="nav-tabs"><text class="nt" :class="{act:tab==='following'}" @click="tab='following'">关注</text><text class="nt" :class="{act:tab==='followers'}" @click="tab='followers'">粉丝</text></view><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view v-for="u in list" :key="u.id" class="user-row">
        <text class="ur-avatar">{{u.name[0]}}</text><view class="ur-info"><text class="ur-name">{{u.name}}</text><text class="ur-bio">{{u.bio||''}}</text></view>
        <view class="ur-btn" :class="{on:u.isFollowing}" @click="toggleFollow(u.id)"><text>{{u.isFollowing?'已关注':'＋关注'}}</text></view>
      </view>
      <view v-if="list.length===0" class="empty"><text>暂无数据</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const tab=ref<'following'|'followers'>('following');
const following=[{id:1,name:'周易大师',bio:'资深命理师',isFollowing:true},{id:2,name:'张玄风',bio:'紫微斗数传承人',isFollowing:true},{id:3,name:'李易安',bio:'姓名学专家',isFollowing:true}];
const followers=[{id:4,name:'易学爱好者',bio:'八字学习中',isFollowing:false},{id:5,name:'风水新手',bio:'',isFollowing:false},{id:6,name:'命理小白',bio:'',isFollowing:true}];
const list=computed(()=>tab.value==='following'?following:followers);
function toggleFollow(id:number){const arr:any=tab.value==='following'?following:followers;const u=arr.find((x:any)=>x.id===id);if(u)u.isFollowing=!u.isFollowing};
function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-tabs{display:flex;gap:32rpx}.nt{font-size:28rpx;color:#999;padding:8rpx 0;position:relative}.nt.act{color:#C41E3A;font-weight:600}.content{padding:24rpx}.user-row{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ur-avatar{width:80rpx;height:80rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:30rpx;color:#2C2C2C;flex-shrink:0}.ur-info{flex:1}.ur-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.ur-bio{font-size:22rpx;color:#999;margin-top:4rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ur-btn{padding:14rpx 28rpx;border-radius:40rpx;font-size:24rpx;background:#C41E3A;color:#fff}.ur-btn.on{background:#F5F1EB;color:#999}.empty{padding:120rpx 0;text-align:center;font-size:26rpx;color:#999}</style>
