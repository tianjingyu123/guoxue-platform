<template>
  <view class="page">
    <view class="nav-header"><text class="nav-back" @click="goBack">←</text><text class="nav-title">内容详情</text><text class="nav-share" @click="onShare">📤</text></view>

    <view v-if="isLoading" class="skel"><view class="skel-cover"/><view v-for="i in 5" :key="i" class="skel-line" :style="{width:(100-i*10)+'%'}"/></view>
    <scroll-view v-else scroll-y class="content" :style="{height:'calc(100vh - 56px - 100rpx)'}">
      <view class="article">
        <text class="ar-title">{{content.title}}</text>
        <view class="ar-meta"><text class="ar-avatar">{{content.author[0]}}</text><text class="ar-author">{{content.author}}</text><text class="ar-time">{{content.time}}</text></view>
        <rich-text class="ar-body" :nodes="content.body"/>

        <view v-if="content.tags" class="ar-tags"><text v-for="t in content.tags" :key="t" class="ar-tag">#{{t}}</text></view>

        <view class="ar-stats"><text @click="toggleLike">❤️{{likes}}</text><text>⭐{{stars}}</text><text>💬{{comments.length}}</text></view>
      </view>

      <view class="card"><text class="card-title">评论 ({{comments.length}})</text>
        <view v-for="c in comments" :key="c.id" class="cmt"><text class="cmt-avatar">{{c.user[0]}}</text><view class="cmt-info"><text class="cmt-name">{{c.user}}</text><text class="cmt-content">{{c.content}}</text><text class="cmt-time">{{c.time}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view class="bottom-bar"><view class="bb-input" @click="focusComment">💬 说点什么...</view><view class="bb-actions"><text @click="toggleLike">❤️{{likes}}</text><text>⭐{{stars}}</text><text>📤</text></view></view>
  </view>
</template>
<script setup lang="ts">import {ref,onMounted} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const isLoading=ref(true),likes=ref(328),stars=ref(56);const content=ref({title:'八字命理入门：如何看懂你的命盘',author:'周易大师',time:'3天前',body:'<p>八字命理，又称四柱命理，是中国传统命理学的重要分支。</p><h2>什么是八字</h2><p>八字是指一个人出生时的年、月、日、时所对应的天干地支，共八个字。</p><h2>天干地支基础</h2><p><strong>十天干：</strong>甲、乙、丙、丁、戊、己、庚、辛、壬、癸</p><p><strong>十二地支：</strong>子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥</p>',tags:['八字','命理','入门']});const comments=[{id:1,user:'易学爱好者',content:'讲得很清晰！期待后续课程。',time:'2小时前'},{id:2,user:'命理新手',content:'请问日柱怎么排的？有详细教程吗？',time:'1天前'},{id:3,user:'风水研究员',content:'老师讲得非常好，已收藏。',time:'2天前'}];function toggleLike(){likes.value++};function onShare(){};function focusComment(){};function goBack(){uni.navigateBack()};onMounted(async()=>{await new Promise(r=>setTimeout(r,600));isLoading.value=false});onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-share{font-size:32rpx}
.skel{padding:24rpx}.skel-cover{height:280rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:24rpx}.skel-line{height:28rpx;background:#e8e8e8;border-radius:6rpx;margin-bottom:16rpx}
.content{padding:0 24rpx 24rpx}.article{padding-top:24rpx}.ar-title{font-size:36rpx;font-weight:700;color:#2C2C2C;margin-bottom:16rpx;display:block;line-height:1.4}.ar-meta{display:flex;align-items:center;gap:12rpx;margin-bottom:28rpx}.ar-avatar{width:56rpx;height:56rpx;border-radius:50%;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#C41E3A}.ar-author{font-size:26rpx;font-weight:500;color:#2C2C2C}.ar-time{font-size:22rpx;color:#999;margin-left:auto}.ar-body{font-size:28rpx;color:#333;line-height:1.8}.ar-tags{display:flex;gap:12rpx;margin-top:40rpx;flex-wrap:wrap}.ar-tag{font-size:22rpx;color:#C41E3A;padding:8rpx 20rpx;background:rgba(196,30,58,.05);border-radius:40rpx}.ar-stats{display:flex;gap:32rpx;padding:28rpx 0;border-bottom:1px solid #E8E0D5;font-size:26rpx;color:#999}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-top:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}
.cmt{display:flex;gap:12rpx;margin-bottom:20rpx}.cmt-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999;flex-shrink:0}.cmt-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cmt-content{font-size:26rpx;color:#333;margin-top:4rpx}.cmt-time{font-size:20rpx;color:#999;margin-top:8rpx}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;gap:24rpx;padding:16rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bb-input{flex:1;height:72rpx;background:#F5F1EB;border-radius:40rpx;padding:0 24rpx;line-height:72rpx;font-size:24rpx;color:#999}.bb-actions{display:flex;gap:24rpx;font-size:28rpx;color:#999}
</style>
