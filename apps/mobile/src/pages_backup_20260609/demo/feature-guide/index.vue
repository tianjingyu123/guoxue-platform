<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">功能引导演示</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">默认引导</text><text class="cd">首次安装或版本更新后自动展示</text><view class="btn" @click="showDefault=true">预览默认引导</view></view>
      <view class="card"><text class="ct">自定义引导</text><text class="cd">针对特定功能定制引导步骤</text><view class="btn" @click="showCustom=true">预览自定义引导</view></view>
      <view class="card"><text class="ct">引导步骤</text>
        <view v-for="(s,i) in steps" :key="s.id" class="step"><text class="sn">{{i+1}}</text><view><text class="stt">{{s.title}}</text><text class="sd">{{s.description}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view v-if="showDefault" class="overlay" @click="showDefault=false"><view class="guide-popup" @click.stop><text class="gp-icon">✨</text><text class="gp-title">欢迎使用新版本</text><text class="gp-desc">发现更多国学知识和功能</text><view class="gp-btn" @click="showDefault=false">知道了</view></view></view>
    <view v-if="showCustom" class="overlay" @click="showCustom=false"><view class="guide-popup" @click.stop><text class="gp-icon">📱</text><text class="gp-title">首页AI入口</text><text class="gp-desc">点击这里开始智能对话</text><view class="gp-btn" @click="showCustom=false">下一步</view></view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const showDefault=ref(false),showCustom=ref(false);const steps=[{id:'home-ai',title:'首页AI入口',description:'点击这里开始智能对话，探索国学智慧'},{id:'paipan-new',title:'排盘工具升级',description:'新增紫微斗数、奇门遁甲等更多排盘方式'},{id:'qa-feature',title:'付费问答上线',description:'向圈主发起提问，获取专业解答'}];function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:8rpx;display:block}.cd{font-size:22rpx;color:#999;margin-bottom:20rpx;display:block}.btn{padding:24rpx;text-align:center;background:#C41E3A;color:#fff;border-radius:16rpx;font-size:26rpx}.step{display:flex;gap:16rpx;padding:20rpx 0;border-bottom:1px solid #F5F1EB}.sn{width:48rpx;height:48rpx;border-radius:50%;background:rgba(196,30,58,.1);color:#C41E3A;display:flex;align-items:center;justify-content:center;font-size:22rpx;font-weight:600;flex-shrink:0}.stt{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.sd{font-size:22rpx;color:#999;margin-top:4rpx}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:center;justify-content:center}.guide-popup{background:#fff;border-radius:24rpx;padding:48rpx 40rpx;text-align:center;width:560rpx}.gp-icon{font-size:64rpx;display:block;margin-bottom:16rpx}.gp-title{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:8rpx}.gp-desc{font-size:26rpx;color:#999;display:block;margin-bottom:32rpx}.gp-btn{padding:24rpx;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:16rpx;font-size:28rpx}</style>
