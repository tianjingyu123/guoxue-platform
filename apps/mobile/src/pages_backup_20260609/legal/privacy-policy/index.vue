<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">隐私政策</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="meta"><text>版本：v2.1</text><text>生效日期：2024-01-01</text></view>
      <view class="doc">
        <text v-for="s in sections" :key="s.title" class="h2">{{s.title}}</text>
        <text v-for="(p,i) in s.paragraphs" :key="i" class="p">{{p}}</text>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">const sections=[{title:'一、我们收集的信息',paragraphs:['我们收集您在使用服务时主动提供的信息，包括但不限于：注册信息（手机号、密码）、个人资料信息（昵称、头像）、交互信息（发帖、评论、收藏）、支付信息（购买记录）。','当您使用App时，我们会自动收集设备信息（设备型号、操作系统版本）和使用日志信息（访问时间、浏览记录）。']},{title:'二、信息的使用',paragraphs:['我们使用收集的信息来：提供、维护和改进服务；向您发送服务相关的通知；分析和改善用户体验；保障账号安全；遵守法律法规的要求。']},{title:'三、信息的存储与保护',paragraphs:['您的个人信息存储在中国境内。我们采取合理的安全措施保护您的信息，防止未经授权的访问和使用。']},{title:'四、信息的共享与披露',paragraphs:['未经您的同意，我们不会向第三方共享您的个人信息，但法律法规要求或为保护平台合法权益的除外。']}];function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.meta{display:flex;gap:32rpx;padding:16rpx 0;font-size:22rpx;color:#999}.doc{}.h2{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block;margin:32rpx 0 12rpx}.p{font-size:26rpx;color:#666;line-height:1.8;margin-bottom:16rpx}</style>
