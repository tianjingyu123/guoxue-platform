<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">通讯录</text><text class="nav-add" @click="goAddFriend">＋</text></view>
    <view class="search-wrap"><text class="sw-icon">🔍</text><input class="sw-input" placeholder="搜索联系人..."/></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view v-for="(group,letter) in groupedContacts" :key="letter">
        <text class="letter">{{letter}}</text>
        <view v-for="c in group" :key="c.id" class="contact-row" @click="goChat(c.id)">
          <text class="cr-avatar">{{c.name[0]}}</text><view class="cr-info"><text class="cr-name">{{c.name}}</text><text class="cr-bio">{{c.bio||''}}</text></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const contacts=ref([{id:1,name:'周易大师',bio:'资深命理师',pinyin:'zhou'},{id:2,name:'张玄风',bio:'紫微斗数传承人',pinyin:'zhang'},{id:3,name:'陈风水',bio:'风水堪舆专家',pinyin:'chen'},{id:4,name:'李易安',bio:'姓名学专家',pinyin:'li'},{id:5,name:'王命理',bio:'八字爱好者',pinyin:'wang'},{id:6,name:'赵星辰',bio:'易学博主',pinyin:'zhao'}]);const groupedContacts=computed(()=>{const g:any={};contacts.value.sort((a,b)=>a.pinyin.localeCompare(b.pinyin)).forEach(c=>{const l=c.pinyin[0].toUpperCase();if(!g[l])g[l]=[];g[l].push(c)});return g});function goChat(id:number){uni.navigateTo({url:'/pages/im/chat/id-detail/index'})};function goAddFriend(){uni.navigateTo({url:'/pages/im/friend-requests/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-add{font-size:40rpx;color:#C41E3A;padding:8rpx}.search-wrap{display:flex;align-items:center;padding:16rpx 24rpx}.sw-icon{font-size:28rpx;margin-right:12rpx}.sw-input{flex:1;height:64rpx;background:#fff;border-radius:40rpx;padding:0 24rpx;font-size:24rpx}.content{padding:0 24rpx 24rpx}.letter{font-size:24rpx;color:#999;padding:16rpx 0 8rpx;display:block}.contact-row{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:8rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cr-avatar{width:72rpx;height:72rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:28rpx;color:#2C2C2C;flex-shrink:0}.cr-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cr-bio{font-size:22rpx;color:#999;margin-top:2rpx}</style>
