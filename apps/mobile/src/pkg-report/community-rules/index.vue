<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @tap="onBack">
          <app-icon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="nav-title">社区规范</text>
        <view class="nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <view class="content">
        <!-- 标题区 -->
        <view class="hero">
          <view class="hero-icon">
            <app-icon name="shield" :size="24" color="#c41e3a" />
          </view>
          <view class="hero-text">
            <text class="hero-title">社区规范</text>
            <text class="hero-sub">维护健康的国学文化交流环境</text>
          </view>
        </view>

        <text class="intro">儒布社区是国学爱好者学习与交流的家园。为维护良好的社区环境，请所有成员遵守以下规范。</text>

        <!-- 鼓励的行为 -->
        <view class="section">
          <view class="sec-head">
            <app-icon name="check-circle-2" :size="16" color="#16a34a" />
            <text class="sec-title">鼓励的行为</text>
          </view>
          <view class="list">
            <view v-for="item in allowed" :key="item" class="item item-allow">
              <app-icon name="check-circle-2" :size="14" color="#16a34a" />
              <text class="item-text">{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- 禁止的行为 -->
        <view class="section">
          <view class="sec-head">
            <app-icon name="ban" :size="16" color="#ef4444" />
            <text class="sec-title">禁止的行为</text>
          </view>
          <view class="list">
            <view v-for="item in prohibited" :key="item" class="item item-ban">
              <app-icon name="ban" :size="14" color="#ef4444" />
              <text class="item-text">{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- 违规处理 -->
        <view class="section">
          <view class="sec-head">
            <app-icon name="alert-triangle" :size="16" color="#f97316" />
            <text class="sec-title">违规处理</text>
          </view>
          <view class="list">
            <view
              v-for="p in punishments"
              :key="p.level"
              class="punish"
              :style="{ background: p.bg, borderColor: p.border }"
            >
              <text class="punish-level" :style="{ color: p.levelColor, borderColor: p.border, background: p.bg }">{{ p.level }}</text>
              <text class="punish-desc" :style="{ color: p.descColor }">{{ p.desc }}</text>
            </view>
          </view>
        </view>

        <text class="footer">遇到违规内容，请使用举报功能。感谢您共同维护社区环境。</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { goBack } from '@/utils/router'

export default {
  data() {
    return {
      statusBarHeight: 0,
      allowed: [
        '分享原创命理知识和学习心得',
        '提出有建设性的命理问题和讨论',
        '分享真实的学习经历和体验',
        '参与友好的国学文化交流',
        '尊重他人，文明互动',
      ],
      prohibited: [
        '发布封建迷信、宣扬不科学内容',
        '对他人进行人身攻击或辱骂',
        '未经授权转载他人内容',
        '发布广告、营销或诈骗信息',
        '散布谣言或虚假信息',
        '涉及政治敏感话题',
        '发布色情、暴力等违规内容',
      ],
      punishments: [
        { level: '一级', levelColor: '#ca8a04', descColor: '#2c2c2c', bg: '#fefce8', border: '#fef08a' },
        { level: '二级', levelColor: '#ea580c', descColor: '#2c2c2c', bg: '#fff7ed', border: '#fed7aa' },
        { level: '三级', levelColor: '#dc2626', descColor: '#2c2c2c', bg: '#fef2f2', border: '#fecaca' },
        { level: '封号', levelColor: '#f3f4f6', descColor: '#f3f4f6', bg: '#374151', border: '#4b5563' },
      ],
    }
  },
  onLoad() {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 0
    } catch (e) {}
  },
  methods: {
    onBack() {
      goBack()
    },
  },
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}
.nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.body {
  flex: 1;
  height: 0;
}
.content {
  padding: 48rpx 32rpx 160rpx;
}
.hero {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.hero-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.hero-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.hero-sub {
  font-size: 24rpx;
  color: #999999;
}
.intro {
  display: block;
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
  margin-bottom: 48rpx;
}
.section {
  margin-bottom: 48rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.sec-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  border-width: 1rpx;
  border-style: solid;
}
.item-allow {
  background: #f0fdf4;
  border-color: #dcfce7;
}
.item-ban {
  background: #fef2f2;
  border-color: #fee2e2;
}
.item-text {
  font-size: 28rpx;
  color: #2c2c2c;
  line-height: 1.5;
  flex: 1;
}
.punish {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  border-width: 1rpx;
  border-style: solid;
}
.punish-level {
  font-size: 24rpx;
  font-weight: 700;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  border-width: 1rpx;
  border-style: solid;
  flex-shrink: 0;
}
.punish-desc {
  font-size: 28rpx;
  line-height: 1.5;
}
.footer {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 48rpx;
  text-align: center;
}
</style>
