<script setup lang="ts">
/** 八字排盘入口页（输入）——从原型 app/paipan/bazi/page.tsx 迁移 */
import AppIcon from '@/components/common/app-icon.vue'
import BaziInputForm from '@/components/bazi/input-form.vue'
import InstantBazi from '@/components/bazi/instant-bazi.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateBack, navigateTo } from '@/utils/router'

function goHistory() { navigateTo('/paipan/bazi/history') }

// R4 合规：小程序端无占卜类目，标题改历法表述（仅展示文案·路由/逻辑不变）
let hdrTitle = '热卜八字'
// #ifdef MP-WEIXIN
hdrTitle = '干支历法'
// #endif
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view class="hdr-back" @tap="navigateBack()">
          <app-icon name="chevron-left" :size="36" color="rgba(255,255,255,0.85)" />
          <text class="hdr-back-text">返回</text>
        </view>
        <text class="hdr-title">{{ hdrTitle }}</text>
        <view class="hdr-history" @tap="goHistory">
          <app-icon name="clock-3" :size="28" color="#ffffff" />
          <text class="hdr-history-text">记录</text>
        </view>
      </view>
    </view>

    <!-- 主体 -->
    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <bazi-input-form />
        <instant-bazi />
        <disclaimer variant="custom" tone="subtle" text="本工具仅供传统文化爱好者研究学习使用，命理分析结果不构成任何预测或建议。" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 50; background: var(--brand); box-shadow: 0 4rpx 12rpx rgba(196,30,58,0.1); padding-top: var(--status-bar-height, 0); }
.hdr-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.hdr-back { display: flex; align-items: center; gap: 2rpx; }
.hdr-back-text { font-size: 26rpx; color: rgba(255,255,255,0.85); }
.hdr-title { font-size: 32rpx; font-weight: 700; color: #fff; letter-spacing: 4rpx; }
.hdr-history { display: flex; align-items: center; gap: 8rpx; padding: 10rpx 24rpx; border-radius: 999rpx; background: rgba(255,255,255,0.2); }
.hdr-history-text { font-size: 26rpx; font-weight: 500; color: #fff; }
.body { flex: 1; }
.body-inner { padding: 32rpx; display: flex; flex-direction: column; gap: 28rpx; }
</style>
