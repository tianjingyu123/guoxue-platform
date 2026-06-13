<template>
  <view class="page">
    <view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">{{book.title}}</text><view style="width:48rpx"/></view>
    <view class="controls"><text @click="prevPage">‹</text><text class="ctl-page">{{currentPage}}/{{totalPages}}</text><text class="ctl-chapter">{{book.chapter}}</text><view class="ctl-menu" @click="showMenu=!showMenu">☰</view></view>
    <view class="reader-area" @click="toggleControls"><scroll-view scroll-y class="text-area" :style="{height:'calc(100vh - 56px - 56px)'}">
      <rich-text :nodes="content" class="richtext"/>
    </scroll-view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const showMenu=ref(false),currentPage=ref(12),totalPages=ref(156);const book=ref({title:'渊海子平',chapter:'卷一·论天干地支'});const content='<p>盖天地未分之前，二气混合，有名无形，谓之混沌。混沌开而天地分，轻清者上浮而为天，重浊者下凝而为地。天得此气，地得此形。</p><p>夫天干者，甲、乙、丙、丁、戊、己、庚、辛、壬、癸是也。地支者，子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥是也。</p><p>天干阳者：甲、丙、戊、庚、壬。天干阴者：乙、丁、己、辛、癸。地支阳者：子、寅、辰、午、申、戌。地支阴者：丑、卯、巳、未、酉、亥。</p>';function toggleControls(){};function prevPage(){};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#F5F1EB;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:rgba(245,241,235,.95);border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:28rpx;font-weight:500}.controls{display:flex;align-items:center;justify-content:space-between;padding:12rpx 24rpx;background:rgba(245,241,235,.95);border-bottom:1px solid #E8E0D5}.ctl-page{font-size:24rpx;color:#999}.ctl-chapter{font-size:24rpx;color:#C41E3A}.ctl-menu{font-size:28rpx;color:#999;padding:8rpx}.richtext{font-size:30rpx;color:#2C2C2C;line-height:2;padding:24rpx}
</style>
