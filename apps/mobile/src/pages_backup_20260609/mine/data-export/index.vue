<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">数据导出</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">选择导出数据</text>
        <view v-for="d in dataTypes" :key="d.key" class="type-row"><text class="tr-icon">{{d.icon}}</text><view><text class="tr-name">{{d.label}}</text><text class="tr-desc">{{d.desc}}</text></view><checkbox :checked="selected.includes(d.key)" @change="toggle(d.key)"/></view>
      </view>
      <view class="btn" :class="{dis:selected.length===0}" @click="handleExport">导出数据</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const selected=ref<string[]>([]);const dataTypes=[{key:'profile',label:'个人资料',desc:'昵称、头像、简介等',icon:'👤'},{key:'posts',label:'帖子/文章',desc:'您发布的所有内容',icon:'📄'},{key:'comments',label:'评论',desc:'您发表的评论',icon:'💬'},{key:'orders',label:'订单记录',desc:'购买/消费记录',icon:'🛍️'},{key:'notes',label:'学习笔记',desc:'课程学习笔记',icon:'✏️'}];function toggle(key:string){const i=selected.value.indexOf(key);i>-1?selected.value.splice(i,1):selected.value.push(key)};function handleExport(){uni.showToast({title:'导出申请已提交，请留意通知',icon:'none'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.type-row{display:flex;align-items:center;gap:16rpx;padding:20rpx 0;border-bottom:1px solid #F5F1EB}.tr-icon{font-size:36rpx}.tr-name{font-size:26rpx;color:#2C2C2C;display:block}.tr-desc{font-size:22rpx;color:#999}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}.btn.dis{opacity:.5}
</style>
