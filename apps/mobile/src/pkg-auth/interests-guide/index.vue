<template>
  <view class="ig-page">
    <!-- 顶部装饰背景 -->
    <view class="ig-deco">
      <view class="ig-deco-gradient" />
      <text
        v-for="(sym, i) in DECO_SYMBOLS"
        :key="i"
        class="ig-deco-sym"
        :style="{
          fontSize: (20 + i * 8) + 'rpx',
          left: (10 + i * 20) + '%',
          top: (10 + (i % 2) * 20) + 'rpx',
          transform: 'rotate(' + (i * 15) + 'deg)',
        }"
      >{{ sym }}</text>
    </view>

    <!-- 右上角跳过 -->
    <view class="ig-skip" hover-class="ig-skip-hover" @tap="handleSkip">
      <text class="ig-skip-text">跳过</text>
    </view>

    <!-- 头部 -->
    <view class="ig-header">
      <view class="ig-title">
        <text>你最想亲近哪些</text>
        <text class="ig-title-accent">领域？</text>
      </view>
      <text class="ig-sub">选 1-3 个，为你定制专属首页</text>
    </view>

    <!-- 六张主题大卡（2 列 3 行） -->
    <scroll-view scroll-y class="ig-cards-wrap">
      <view class="ig-cards">
        <view
          v-for="theme in themes"
          :key="theme.key"
          class="ig-card"
          :class="{ 'is-selected': isSelected(theme.key) }"
          hover-class="ig-card-hover"
          @tap="toggleTheme(theme.key)"
        >
          <view class="ig-card-icon" :class="{ 'is-selected': isSelected(theme.key) }">
            <AppIcon :name="theme.icon" :size="48" :color="isSelected(theme.key) ? '#FFFFFF' : '#C41E3A'" />
          </view>
          <text class="ig-card-label">{{ theme.label }}</text>
          <text class="ig-card-desc">{{ theme.desc }}</text>
          <!-- 选中态对勾角标 -->
          <view v-if="isSelected(theme.key)" class="ig-card-check">
            <AppIcon name="check" :size="24" color="#FFFFFF" />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="ig-footer">
      <view
        class="ig-submit"
        :class="{ 'is-active': selected.length > 0 }"
        @tap="handleSubmit"
      >
        <text class="ig-submit-text" :class="{ 'is-active': selected.length > 0 }">
          {{ selected.length > 0 ? '开启我的国学之旅' : '至少选 1 个' }}
        </text>
        <AppIcon v-if="selected.length > 0" name="arrow-right" :size="32" color="#FFFFFF" />
      </view>
      <text class="ig-count-tip">已选 {{ selected.length }}/{{ MAX_SELECT }} 个主题</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { reLaunch } from '@/utils/router'
import { INTEREST_THEMES, saveInterestThemes } from '@/utils/interests'

const DECO_SYMBOLS = ['☯', '☷', '☵', '☳', '☴']
const MAX_SELECT = 3

// 六大主题卡数据（共享真源，勿在页面内复制）
const themes = INTEREST_THEMES

const selected = ref<string[]>([])
// 防重复：提交/跳过后不再响应任何操作
let navigated = false

function isSelected(key: string) {
  return selected.value.includes(key)
}

function toggleTheme(key: string) {
  if (navigated) return
  if (isSelected(key)) {
    selected.value = selected.value.filter((k) => k !== key)
    return
  }
  if (selected.value.length >= MAX_SELECT) {
    uni.showToast({ title: `最多选 ${MAX_SELECT} 个`, icon: 'none' })
    return
  }
  selected.value = [...selected.value, key]
}

// 保存所选主题并进首页
function handleSubmit() {
  if (navigated) return
  if (selected.value.length === 0) return
  navigated = true
  saveInterestThemes(selected.value)
  // 用完整页面路径（'/' 在 ROUTE_MAP 无映射会原样透传，小程序端不可达）
  reLaunch('/pages/index/index')
}

// 跳过：不保存，直接进首页
function handleSkip() {
  if (navigated) return
  navigated = true
  reLaunch('/pages/index/index')
}
</script>

<style scoped lang="scss">
.ig-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* 顶部装饰 */
.ig-deco {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 512rpx;
  overflow: hidden;
  pointer-events: none;
}
.ig-deco-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(196, 30, 58, 0.08), rgba(201, 169, 110, 0.05), transparent);
}
.ig-deco-sym {
  position: absolute;
  color: rgba(196, 30, 58, 0.1);
  font-family: serif;
}

/* 右上角跳过 */
.ig-skip {
  position: absolute;
  top: 88rpx;
  right: 40rpx;
  z-index: 20;
  padding: 8rpx 28rpx;
  border-radius: 999rpx;
  border: 2rpx solid #e8e0d5;
  background: rgba(255, 255, 255, 0.7);
}
.ig-skip-hover {
  opacity: 0.7;
}
.ig-skip-text {
  font-size: 24rpx;
  color: #999999;
}

/* 头部 */
.ig-header {
  position: relative;
  z-index: 10;
  padding: 176rpx 48rpx 40rpx;
}
.ig-title {
  font-family: serif;
  font-size: 52rpx;
  font-weight: bold;
  color: #2c2c2c;
  line-height: 1.3;
}
.ig-title-accent {
  color: var(--brand);
}
.ig-sub {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999999;
}

/* 主题卡网格（2 列） */
.ig-cards-wrap {
  flex: 1;
  padding: 0 40rpx;
  box-sizing: border-box;
}
.ig-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding-bottom: 32rpx;
}
.ig-card {
  position: relative;
  width: 324rpx;
  box-sizing: border-box;
  margin-bottom: 24rpx;
  padding: 36rpx 28rpx 32rpx;
  border-radius: 28rpx;
  border: 3rpx solid #e8e0d5;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition: all 0.2s;
  overflow: hidden;
}
.ig-card-hover {
  transform: scale(0.97);
}
.ig-card.is-selected {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.04);
  box-shadow: 0 8rpx 32rpx rgba(196, 30, 58, 0.15);
}
.ig-card-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  transition: all 0.2s;
}
.ig-card-icon.is-selected {
  background: var(--brand);
}
.ig-card-label {
  font-family: serif;
  font-size: 32rpx;
  font-weight: bold;
  color: #2c2c2c;
  line-height: 1.2;
}
.ig-card-desc {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #999999;
  line-height: 1.4;
}
.ig-card-check {
  position: absolute;
  top: 0;
  right: 0;
  width: 56rpx;
  height: 56rpx;
  border-radius: 0 24rpx 0 28rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 底部操作区 */
.ig-footer {
  padding: 24rpx 40rpx 80rpx;
  background: linear-gradient(to top, #faf8f5 70%, transparent);
}
.ig-submit {
  width: 100%;
  height: 104rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: #e8e3db;
  transition: all 0.2s;
}
.ig-submit.is-active {
  background: linear-gradient(to right, var(--brand), #e8314e);
  box-shadow: 0 8rpx 40rpx rgba(196, 30, 58, 0.35);
}
.ig-submit-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #b0aaa0;
}
.ig-submit-text.is-active {
  color: #ffffff;
}
.ig-count-tip {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #bbbbbb;
  margin-top: 20rpx;
}
</style>
