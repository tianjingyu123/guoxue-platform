<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">团队管理</text></view><text class="nav-add" @click="showAdd=true">＋</text></view>
    <view class="search-wrap"><text class="sw-icon">🔍</text><input class="sw-input" placeholder="搜索成员..."/></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <text class="sec">主播/副播</text>
      <view v-for="m in hosts" :key="m.id" class="mem-card">
        <text class="mc-avatar">{{m.name[0]}}</text><view class="mc-info"><text class="mc-name">{{m.name}}</text><text class="mc-role">{{m.role}}</text></view>
        <view class="mc-actions"><text @click="edit(m)">✏️</text><text @click="del(m)">🗑️</text></view>
      </view>
      <text class="sec mt">权限角色</text>
      <view v-for="r in roles" :key="r.name" class="role-row"><text class="rr-icon">{{r.icon}}</text><view><text class="rr-name">{{r.name}}</text><text class="rr-desc">{{r.desc}}</text></view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const showAdd=ref(false)
const hosts=[{id:1,name:'周易大师',role:'主播',isOnline:true},{id:2,name:'紫微真人',role:'副播',isOnline:false},{id:3,name:'风水学徒',role:'助教',isOnline:true}]
const roles=[{name:'主播',desc:'拥有全部权限：开播、管理商品、连麦控制',icon:'👑'},{name:'副播',desc:'辅助主播：管理弹幕、上架商品、回复评论',icon:'🎤'},{name:'助教',desc:'基础权限：回复评论、分享直播',icon:'💬'}]
function edit(m:any){};function del(m:any){}
function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-add{font-size:44rpx;color:#C41E3A;padding:8rpx}
.search-wrap{display:flex;align-items:center;padding:16rpx 24rpx;background:#FAF8F5}.sw-icon{font-size:28rpx;margin-right:12rpx}.sw-input{flex:1;height:64rpx;background:#fff;border-radius:40rpx;padding:0 24rpx;font-size:24rpx;color:#2C2C2C}
.content{padding:24rpx}
.sec{font-size:26rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.mt{margin-top:32rpx}
.mem-card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.mc-avatar{width:72rpx;height:72rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:28rpx;color:#2C2C2C;flex-shrink:0}.mc-info{flex:1}.mc-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.mc-role{font-size:22rpx;color:#999}.mc-actions{display:flex;gap:16rpx;font-size:28rpx;color:#999}
.role-row{display:flex;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.rr-icon{font-size:40rpx;flex-shrink:0}.rr-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.rr-desc{font-size:22rpx;color:#999;margin-top:4rpx}
</style>
