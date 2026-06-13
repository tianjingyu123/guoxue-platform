<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">儿童隐私保护指引</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="meta"><text>版本：v2.0</text><text>生效日期：2024-01-01</text></view>
      <view class="doc">
        <text class="h2">一、引言</text>
        <text class="p">热卜国学高度重视儿童的个人信息保护。本指引旨在向监护人说明我们如何收集、使用和保护儿童个人信息。</text>
        <text class="h2">二、信息收集</text>
        <text class="p">我们仅在征得监护人明示同意的前提下，收集实现服务所必需的儿童个人信息。</text>
        <text class="h2">三、信息使用</text>
        <text class="p">收集的儿童信息仅用于提供服务功能，不会用于广告营销或其他商业用途。</text>
        <text class="h2">四、监护人权利</text>
        <text class="p">监护人有权查阅、更正、删除儿童个人信息，并有权撤回同意。</text>
        <text class="h2">五、联系方式</text>
        <text class="p">如有疑问，请联系邮箱：privacy@rebu.com</text>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.meta{display:flex;gap:32rpx;padding:16rpx 0;font-size:22rpx;color:#999}.doc{}.h2{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block;margin:32rpx 0 12rpx}.p{font-size:26rpx;color:#666;line-height:1.8;margin-bottom:16rpx}</style>
