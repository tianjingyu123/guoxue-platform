<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">群聊信息</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="header"><text class="h-avatar">{{group.name[0]}}</text><text class="h-name">{{group.name}}</text><text class="h-id">群号：{{group.id}}</text></view>

      <view class="card"><text class="ct">群成员 ({{members.length}})</text>
        <view class="member-grid"><view v-for="m in members.slice(0,9)" :key="m.id" class="mg-item"><text class="mgi-av">{{m.name[0]}}</text><text class="mgi-name">{{m.name}}</text></view>
          <view class="mg-item" @click="goAll"><text class="mgi-av more">⋯</text><text class="mgi-name">全部</text></view>
        </view>
      </view>

      <view class="card"><text class="ct">群设置</text>
        <view v-for="s in groupSettings" :key="s.key" class="set-row"><text class="sr-text">{{s.label}}</text><switch :checked="s.enabled"/></view>
      </view>

      <view class="card"><text class="ct">群公告</text><text class="anno">{{group.announcement||'暂无群公告'}}</text></view>

      <view class="card"><view class="danger-row" @click="quitGroup"><text>🚫 退出群聊</text></view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,reactive} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const group={name:'八字学习群',id:'GRP128',announcement:'欢迎入群！请文明交流。',members:128};const members=ref([{id:1,name:'周易大师',role:'owner'},{id:2,name:'张玄风',role:'admin'},{id:3,name:'陈风水',role:'member'},{id:4,name:'李易安',role:'member'},{id:5,name:'王命理',role:'member'},{id:6,name:'赵星辰',role:'member'},{id:7,name:'孙紫微',role:'member'},{id:8,name:'刘八字',role:'member'},{id:9,name:'杨天干',role:'member'}]);const groupSettings=reactive([{key:'mute',label:'消息免打扰',enabled:false},{key:'top',label:'置顶聊天',enabled:true},{key:'save',label:'保存到通讯录',enabled:true}]);function goAll(){uni.navigateTo({url:'/pages/im/group-detail/id-detail/members/index'})};function quitGroup(){uni.showModal({title:'提示',content:'确定退出群聊？'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.header{text-align:center;padding:40rpx 0;background:#fff;border-radius:20rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.h-avatar{width:120rpx;height:120rpx;border-radius:24rpx;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:48rpx;color:#C41E3A;margin:0 auto 16rpx}.h-name{font-size:36rpx;font-weight:600;color:#2C2C2C;display:block}.h-id{font-size:24rpx;color:#999;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.member-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16rpx}.mg-item{text-align:center}.mgi-av{width:80rpx;height:80rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:28rpx;color:#2C2C2C;margin:0 auto 8rpx}.mgi-av.more{background:#C41E3A;color:#fff}.mgi-name{font-size:20rpx;color:#999}.set-row{display:flex;align-items:center;justify-content:space-between;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.sr-text{font-size:26rpx;color:#2C2C2C}.anno{font-size:26rpx;color:#666;line-height:1.6}.danger-row{text-align:center;font-size:26rpx;color:#ef4444;padding:16rpx 0}</style>
