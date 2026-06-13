<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">发布内容</text><text class="ns" @click="pub">发布</text></view>
    <view class="c"><view class="f"><view class="ts"><text v-for="t in types" :key="t" class="ti" :class="{s:tp===t}" @click="tp=t">{{t}}</text></view></view>
    <view class="f"><input class="fi" placeholder="标题"/></view><view class="f"><textarea class="fi ta" placeholder="内容..."/></view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const tp=ref('帖子');const types=['帖子','文章'];function pub(){uni.showToast({title:'发布成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.ns{color:#C41E3A;font-size:26rpx}.c{padding:24rpx}.ts{display:flex;gap:16rpx;margin-bottom:16rpx}.ti{padding:14rpx 28rpx;background:#F5F1EB;border-radius:40rpx;font-size:24rpx;color:#999}.ti.s{background:#C41E3A;color:#fff}.f{margin-bottom:20rpx}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#fff;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.fi.ta{height:240rpx;padding:20rpx;resize:none}
</style>
