<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">{{title}}</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="meta"><text>{{doc.version}}</text><text>{{doc.effectiveDate}}</text></view>
      <view class="doc"><text v-for="s in sections" :key="s.title" class="h2">{{s.title}}</text><text v-for="p in s.content" :key="p" class="p">{{p}}</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';const type=ref('privacy');const title=computed(()=>type.value==='privacy'?'隐私政策':'用户协议');const doc=ref({version:'v2.1',effectiveDate:'2024-01-01'});const sections=[{title:'总则',content:['本协议是您与平台之间的法律协议。']},{title:'用户注册',content:['用户需提供真实准确的注册信息。']}];function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.meta{display:flex;gap:32rpx;padding:16rpx 0;font-size:22rpx;color:#999}.h2{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block;margin:32rpx 0 12rpx}.p{font-size:26rpx;color:#666;line-height:1.8;margin-bottom:16rpx}
</style>
