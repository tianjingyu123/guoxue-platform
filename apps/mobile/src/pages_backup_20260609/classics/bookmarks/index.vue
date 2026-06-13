<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">我的书签</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="b in bms" :key="b.id" class="card"><text class="cicon">🔖</text><view><text class="cn">{{b.bookName}}·第{{b.page}}页</text><text class="ct">{{b.note||'无笔记'}}</text><text class="cm">{{b.time}}</text></view></view></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const bms=ref([{id:1,bookName:'渊海子平',page:156,note:'论财官印绶',time:'3天前'},{id:2,bookName:'紫微斗数全书',page:89,note:'',time:'1周前'}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cicon{font-size:40rpx}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.ct{font-size:24rpx;color:#666;margin-top:4rpx}.cm{font-size:20rpx;color:#ccc;margin-top:4rpx}
</style>
