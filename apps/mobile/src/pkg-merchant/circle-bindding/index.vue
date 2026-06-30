<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#1f1f1f" />
        </view>
        <text class="nav-title">绑定圈子</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ top: navH + 'px' }">
      <view class="placeholder">
        <view class="ph-icon">
          <AppIcon name="users" :size="40" color="#c41e3a" />
        </view>
        <text class="ph-title">圈子绑定功能即将开放</text>
        <text class="ph-desc">商家商品经平台审核进入商品池后，由圈主在自有圈子中自主选品上架分销，商家无需手动绑定圈子。</text>
        <text class="ph-tip">您只需专注于商品上架与经营，分销渠道由平台与圈主自动对接。</text>
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

const statusBarHeight = ref(20)
const navH = ref(64)
uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 20
    navH.value = (r.statusBarHeight || 20) + 44
  },
})
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; }
.navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; border-bottom: 1px solid #ededed; }
.navbar-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1f1f1f; }
.nav-placeholder { width: 32px; }
.scroll { position: fixed; left: 0; right: 0; bottom: 0; }

.placeholder { padding: 120px 32px 0; display: flex; flex-direction: column; align-items: center; }
.ph-icon { width: 80px; height: 80px; border-radius: 50%; background: rgba(196, 30, 58, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.ph-title { font-size: 17px; font-weight: 600; color: #1f1f1f; margin-bottom: 8px; }
.ph-desc { font-size: 14px; color: #9ca3af; line-height: 1.6; text-align: center; }
.ph-tip { font-size: 13px; color: #6b7280; line-height: 1.6; text-align: center; margin-top: 12px; }
.ph-btn { margin-top: 28px; padding: 0 40px; height: 44px; border-radius: 8px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; }
.ph-btn-text { font-size: 15px; color: #4b5563; }
</style>
