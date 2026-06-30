<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">咨询管理</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <view class="placeholder">
        <view class="ph-icon">
          <app-icon name="message-square" :size="40" color="#c41e3a" />
        </view>
        <text class="ph-title">客户咨询功能即将开放</text>
        <text class="ph-desc">在线咨询与回复能力正在建设中，敬请期待。</text>
        <text class="ph-tip">当前客户沟通请通过「订单售后」处理。</text>
        <view class="ph-btn" @tap="goBack">
          <text class="ph-btn-text">返回</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44
</script>

<style scoped>
.page { min-height: 100vh; background: #ffffff; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; }

.placeholder { padding: 120px 32px 0; display: flex; flex-direction: column; align-items: center; }
.ph-icon { width: 80px; height: 80px; border-radius: 50%; background: rgba(196, 30, 58, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.ph-title { font-size: 17px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.ph-desc { font-size: 14px; color: #9ca3af; line-height: 1.6; text-align: center; }
.ph-tip { font-size: 13px; color: #6b7280; line-height: 1.6; text-align: center; margin-top: 12px; }
.ph-btn { margin-top: 28px; padding: 0 40px; height: 44px; border-radius: 8px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; }
.ph-btn-text { font-size: 15px; color: #4b5563; }
</style>
