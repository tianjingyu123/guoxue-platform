<template>
  <view class="min-h-screen bg-background flex flex-col">
    <view class="flex-1 flex flex-col items-center justify-center px-8">
      <view class="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center mb-6 shadow-lg">
        <text class="text-4xl text-white"></text>
      </view>
      <text class="text-2xl font-serif font-bold text-foreground mb-3">欢迎来到儒布国学</text>
      <text class="text-sm text-muted-foreground text-center leading-relaxed mb-8">与万千国学爱好者一起，探索传统文化的智慧与魅力</text>
      <view class="w-full max-w-xs">
        <view class="py-3.5 bg-primary text-white rounded-xl text-center text-sm font-semibold mb-3" @click="goHome">开始探索</view>
        <view class="py-3.5 bg-white border border-border text-foreground rounded-xl text-center text-sm font-semibold" @click="goLogin">已有账号？立即登录</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function goHome() { uni.switchTab({ url: '/pages/index/index' }) }
function goLogin() { uni.navigateTo({ url: '/pages/auth/login/index' }) }
</script>
