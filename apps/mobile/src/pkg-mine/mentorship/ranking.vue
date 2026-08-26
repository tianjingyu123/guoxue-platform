<script setup lang="ts">
/**
 * V5 师徒传承 · 传道值荣誉榜（TOP20·公开）
 * 前三名领奖台 + 榜单列表。传道值为纯荣誉数字，不可兑换任何财物。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mentorshipApi, type RankingItem } from '@/lib/mentorship-data'

const loading = ref(true)
const error = ref('')
const list = ref<RankingItem[]>([])

/** 前三名（领奖台，按名次 2-1-3 排列展示交给模板） */
const podium = computed(() => list.value.slice(0, 3))
/** 第 4 名及以后 */
const rest = computed(() => list.value.slice(3))

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await mentorshipApi.ranking()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  load()
})
</script>

<template>
  <app-safe-area-top />
  <view class="page">
    <view class="nav">
      <view class="nav-back" @tap="goBack()">
        <AppIcon name="arrow-left" :size="48" color="#fff" />
      </view>
      <text class="nav-title">传道值荣誉榜</text>
      <view class="nav-ph" />
    </view>

    <view class="banner">
      <AppIcon name="trophy" :size="44" color="#f6e2b8" />
      <text class="banner-t">传道值 · 师门荣誉 · 薪火相传</text>
      <text class="banner-sub">徒弟成长化作师父的传道功德，纯荣誉记录，不作任何财物兑换</text>
    </view>

    <!-- loading -->
    <view v-if="loading" class="skeleton">
      <view class="sk-podium" />
      <view v-for="i in 5" :key="i" class="sk-row" />
    </view>

    <!-- error -->
    <view v-else-if="error" class="state-box">
      <view class="state-icon"><AppIcon name="trophy" :size="56" color="#c9a96e" /></view>
      <text class="state-title">加载失败</text>
      <text class="state-desc">{{ error }}</text>
      <view class="state-btn" @tap="load">重试</view>
    </view>

    <!-- empty -->
    <view v-else-if="list.length === 0" class="state-box">
      <view class="state-icon"><AppIcon name="users" :size="56" color="#c9a96e" /></view>
      <text class="state-title">荣誉榜虚位以待</text>
      <text class="state-desc">还没有师父上榜，收徒传业，你便是第一位传道者</text>
    </view>

    <!-- 榜单 -->
    <view v-else class="content">
      <!-- 领奖台（前三名，展示顺序 亚-冠-季） -->
      <view class="podium">
        <!-- 第 2 名 -->
        <view v-if="podium[1]" class="podium-col col-2">
          <view class="podium-avatar rank-2"><AppIcon name="user" :size="40" color="#8a8a8a" /></view>
          <text class="podium-name">{{ podium[1].mentorNickname || '同修' }}</text>
          <text class="podium-title">{{ podium[1].mentorLevel }}级</text>
          <view class="podium-base base-2">
            <text class="podium-rank-num">2</text>
            <text class="podium-points">{{ podium[1].mentorshipPoints }}</text>
            <text class="podium-points-unit">传道值</text>
          </view>
        </view>
        <!-- 第 1 名 -->
        <view v-if="podium[0]" class="podium-col col-1">
          <view class="podium-crown"><AppIcon name="crown" :size="40" color="#e0a800" /></view>
          <view class="podium-avatar rank-1"><AppIcon name="user" :size="48" color="#b8862d" /></view>
          <text class="podium-name">{{ podium[0].mentorNickname || '同修' }}</text>
          <text class="podium-title">{{ podium[0].mentorLevel }}级 · 收徒{{ podium[0].discipleCount }}</text>
          <view class="podium-base base-1">
            <text class="podium-rank-num">1</text>
            <text class="podium-points">{{ podium[0].mentorshipPoints }}</text>
            <text class="podium-points-unit">传道值</text>
          </view>
        </view>
        <!-- 第 3 名 -->
        <view v-if="podium[2]" class="podium-col col-3">
          <view class="podium-avatar rank-3"><AppIcon name="user" :size="40" color="#b07a4a" /></view>
          <text class="podium-name">{{ podium[2].mentorNickname || '同修' }}</text>
          <text class="podium-title">{{ podium[2].mentorLevel }}级</text>
          <view class="podium-base base-3">
            <text class="podium-rank-num">3</text>
            <text class="podium-points">{{ podium[2].mentorshipPoints }}</text>
            <text class="podium-points-unit">传道值</text>
          </view>
        </view>
      </view>

      <!-- 4 名及以后 -->
      <view v-if="rest.length" class="rank-list">
        <view v-for="(r, i) in rest" :key="i" class="rank-item">
          <text class="rank-idx">{{ i + 4 }}</text>
          <view class="rank-avatar"><AppIcon name="user" :size="34" color="#a89b85" /></view>
          <view class="rank-info">
            <text class="rank-name">{{ r.mentorNickname || '同修' }}</text>
            <text class="rank-meta">{{ r.mentorLevel }}级 · 收徒 {{ r.discipleCount }}</text>
          </view>
          <view class="rank-points">
            <text class="rank-points-num">{{ r.mentorshipPoints }}</text>
            <text class="rank-points-unit">传道值</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 60rpx;
}

/* 导航（红底白字） */
.nav {
  position: sticky;
  top: var(--status-bar-height, 0px);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #b4432f;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}
.nav-ph {
  width: 48rpx;
}

/* banner */
.banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 32rpx 48rpx 44rpx;
  background: linear-gradient(180deg, #b4432f, #9a3826);
}
.banner-t {
  font-size: 30rpx;
  font-weight: 600;
  color: #f6e2b8;
  letter-spacing: 2rpx;
}
.banner-sub {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  line-height: 1.5;
}

/* 骨架 */
.skeleton {
  padding: 32rpx;
}
.sk-podium {
  height: 300rpx;
  border-radius: 24rpx;
  background: #f0ece3;
}
.sk-row {
  height: 110rpx;
  margin-top: 20rpx;
  border-radius: 20rpx;
  background: #f0ece3;
}

/* 状态盒 */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 140rpx 48rpx;
  gap: 16rpx;
}
.state-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #fff9e6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2d2a26;
}
.state-desc {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  line-height: 1.5;
}
.state-btn {
  margin-top: 24rpx;
  padding: 20rpx 88rpx;
  border-radius: 48rpx;
  background: #b4432f;
  color: #fff;
  font-size: 28rpx;
}

/* 内容 */
.content {
  padding: 32rpx;
}

/* 领奖台 */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.podium-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.col-1 {
  margin-bottom: 0;
}
.podium-crown {
  margin-bottom: -8rpx;
}
.podium-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #e2dbcc;
}
.rank-1 {
  width: 120rpx;
  height: 120rpx;
  border-color: #e0a800;
  box-shadow: 0 6rpx 16rpx rgba(224, 168, 0, 0.35);
}
.rank-2 {
  border-color: #b8b8b8;
}
.rank-3 {
  border-color: #c99a6a;
}
.podium-name {
  margin-top: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #2d2a26;
  max-width: 180rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.podium-title {
  font-size: 20rpx;
  color: #999;
  margin-top: 2rpx;
}
.podium-base {
  margin-top: 14rpx;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  border-radius: 16rpx 16rpx 0 0;
  padding: 20rpx 0 24rpx;
}
.base-1 {
  height: 160rpx;
  background: linear-gradient(180deg, #f6e2b8, #ecc98a);
  justify-content: center;
}
.base-2 {
  height: 120rpx;
  background: linear-gradient(180deg, #eef0f2, #dfe3e7);
  justify-content: center;
}
.base-3 {
  height: 100rpx;
  background: linear-gradient(180deg, #f3e2d2, #e6cfb8);
  justify-content: center;
}
.podium-rank-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #6d4914;
  line-height: 1;
}
.base-2 .podium-rank-num {
  color: #6a6a6a;
}
.base-3 .podium-rank-num {
  color: #8a5a2c;
}
.podium-points {
  font-size: 30rpx;
  font-weight: 700;
  color: #b4432f;
  line-height: 1;
  margin-top: 6rpx;
}
.podium-points-unit {
  font-size: 18rpx;
  color: #8a6d3b;
}

/* 列表 */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(45, 42, 38, 0.04);
}
.rank-idx {
  width: 48rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #c9a96e;
  flex-shrink: 0;
}
.rank-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f7f4ec;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rank-info {
  flex: 1;
  min-width: 0;
}
.rank-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
}
.rank-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #999;
}
.rank-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}
.rank-points-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #b8862d;
  line-height: 1;
}
.rank-points-unit {
  font-size: 20rpx;
  color: #c9a96e;
}
</style>
