<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">图片浏览器演示</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">使用图片浏览器</text><text class="cd">支持多图切换、缩放、旋转、保存</text>
        <view class="img-grid"><view v-for="(img,i) in demoImages.slice(0,6)" :key="i" class="ig-item" @click="openViewer(i)"><text>🖼️</text></view></view>
      </view>
      <view class="card"><text class="ct">更多图片</text>
        <view class="img-grid"><view v-for="(img,i) in demoImages.slice(6)" :key="i+6" class="ig-item" @click="openViewer(i+6)"><text>🖼️</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="viewerOpen" class="viewer"><view class="v-nav"><text class="v-close" @click="viewerOpen=false">✕</text><text class="v-counter">{{currentIndex+1}}/{{demoImages.length}}</text><view style="width:48rpx"/></view>
      <view class="v-body"><text class="v-img">🖼️</text></view>
      <view class="v-foot"><text @click="goPrev">‹</text><view class="v-dots"><view v-for="(_,i) in demoImages" :key="i" class="v-dot" :class="{act:i===currentIndex}" @click="currentIndex=i"/></view><text @click="goNext">›</text></view>
    </view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const viewerOpen=ref(false),currentIndex=ref(0);const demoImages=Array.from({length:9},(_,i)=>({url:'',thumb:'',alt:'图片'+(i+1)}));function openViewer(i:number){currentIndex.value=i;viewerOpen.value=true};function goPrev(){if(currentIndex.value>0)currentIndex.value--};function goNext(){if(currentIndex.value<demoImages.length-1)currentIndex.value++};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:8rpx;display:block}.cd{font-size:22rpx;color:#999;margin-bottom:20rpx;display:block}.img-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx}.ig-item{aspect-ratio:1;background:#F5F1EB;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:48rpx}.viewer{position:fixed;inset:0;background:#000;z-index:200;display:flex;flex-direction:column}.v-nav{display:flex;align-items:center;justify-content:space-between;padding:24rpx 32rpx}.v-close{font-size:32rpx;color:#fff}.v-counter{font-size:28rpx;color:#fff}.v-body{flex:1;display:flex;align-items:center;justify-content:center}.v-img{font-size:120rpx}.v-foot{display:flex;align-items:center;justify-content:center;gap:40rpx;padding:32rpx;color:#fff;font-size:40rpx}.v-dots{display:flex;gap:12rpx}.v-dot{width:12rpx;height:12rpx;border-radius:50%;background:rgba(255,255,255,.4)}.v-dot.act{width:32rpx;background:#fff}</style>
