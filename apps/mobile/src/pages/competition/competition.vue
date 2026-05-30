<template>
  <view class="page">
    <view class="header">
      <text class="title">🏆 赛事中心</text>
      <text class="subtitle">国学竞技 · 以赛会友</text>
    </view>

    <!-- 赛事类型快捷入口 -->
    <view class="quick-types">
      <view
        v-for="item in competitionTypes"
        :key="item.type"
        class="type-card"
        :class="{ 'type-disabled': !features.competition }"
      >
        <text class="type-icon">{{ item.icon }}</text>
        <text class="type-name">{{ item.name }}</text>
        <text class="type-count">{{ item.count }} 场进行中</text>
      </view>
    </view>

    <!-- 占位提示 -->
    <view class="placeholder">
      <text class="placeholder-icon">🏗️</text>
      <text class="placeholder-title">赛事功能即将上线</text>
      <text class="placeholder-desc">
        八字预测大赛 · 诗词创作赛 · 格物感知赛 · 书法绘画赛{'\n'}
        月度赛 · 季度赛 · 年度总决赛
      </text>
      <text class="placeholder-tip">敬请期待</text>
    </view>

    <!-- 赛事预告 -->
    <view class="upcoming" v-if="upcomingList.length > 0">
      <text class="section-title">📅 赛事预告</text>
      <view v-for="item in upcomingList" :key="item.id" class="upcoming-item">
        <text class="upcoming-date">{{ item.date }}</text>
        <text class="upcoming-name">{{ item.title }}</text>
        <text class="upcoming-tag">{{ item.tag }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 赛事类型
const competitionTypes = [
  { type: "bazi", icon: "🔮", name: "八字预测", count: 0 },
  { type: "poetry", icon: "📜", name: "诗词创作", count: 0 },
  { type: "gewu", icon: "🔍", name: "格物感知", count: 0 },
  { type: "calligraphy", icon: "🖌️", name: "书法绘画", count: 0 },
  { type: "weiqi", icon: "⚫", name: "棋艺对弈", count: 0 },
  { type: "tcm", icon: "🌿", name: "中医辨证", count: 0 },
];

// 预告（占位数据）
const upcomingList: any[] = [];

// 功能开关（从全局配置获取）
const features = { competition: false };

// 赛事上线后会改为从 API 拉取真实数据：
// import { api } from '@/api';
// const { data } = await api.get('/competitions');
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f0eb;
  padding-bottom: 40rpx;
}
.header {
  background: linear-gradient(135deg, #C41E3A 0%, #8B0000 100%);
  padding: 60rpx 40rpx 40rpx;
  color: #fff;
  text-align: center;
}
.title { font-size: 44rpx; font-weight: bold; display: block; }
.subtitle { font-size: 26rpx; opacity: 0.85; margin-top: 10rpx; display: block; }

.quick-types {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 30rpx;
  gap: 16rpx;
}
.type-card {
  flex: 0 0 calc(33.33% - 12rpx);
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 12rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.type-disabled { opacity: 0.4; }
.type-icon { font-size: 40rpx; display: block; }
.type-name { font-size: 24rpx; color: #333; margin-top: 8rpx; display: block; }
.type-count { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }

.placeholder {
  text-align: center;
  padding: 80rpx 40rpx;
}
.placeholder-icon { font-size: 80rpx; display: block; }
.placeholder-title { font-size: 32rpx; color: #333; margin-top: 20rpx; font-weight: bold; display: block; }
.placeholder-desc { font-size: 24rpx; color: #999; margin-top: 16rpx; line-height: 1.6; white-space: pre-line; display: block; }
.placeholder-tip {
  display: inline-block;
  margin-top: 24rpx;
  padding: 10rpx 32rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 40rpx;
  font-size: 24rpx;
}

.upcoming { padding: 0 30rpx 40rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; display: block; }
.upcoming-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}
.upcoming-date { font-size: 22rpx; color: #C41E3A; margin-right: 20rpx; min-width: 100rpx; }
.upcoming-name { flex: 1; font-size: 26rpx; color: #333; }
.upcoming-tag { font-size: 20rpx; color: #fff; background: #C41E3A; padding: 4rpx 14rpx; border-radius: 20rpx; }
</style>
