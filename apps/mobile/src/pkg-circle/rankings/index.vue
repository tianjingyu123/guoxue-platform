<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-btn" @tap="goBack">
        <AppIcon name="arrow-left" :size="20" color="#fff" />
      </view>
      <view class="nav-title-wrap">
        <AppIcon name="trophy" :size="20" color="#fff" />
        <text class="nav-title">{{ BRAND.nameShort }}榜单</text>
      </view>
    </view>

    <!-- 分类 Tab -->
    <scroll-view scroll-x class="cat-scroll">
      <view class="cat-row">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="cat-item"
          :class="{ active: activeCategory === cat.id }"
          @tap="activeCategory = cat.id"
        >
          <AppIcon :name="cat.icon" :size="16" :color="activeCategory === cat.id ? '#D97706' : '#999'" />
          <text class="cat-label" :class="{ active: activeCategory === cat.id }">{{ cat.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 时间筛选 -->
    <view class="time-filter">
      <view class="time-group">
        <view
          v-for="t in timeRanges"
          :key="t.id"
          class="time-chip"
          :class="{ active: timeRange === t.id }"
          @tap="timeRange = t.id"
        >
          <text class="time-label" :class="{ active: timeRange === t.id }">{{ t.label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="rank-scroll">
      <!-- 圈子榜 -->
      <view v-if="activeCategory === 'circles'" class="rank-list">
        <view v-for="(item, i) in circleRanks" :key="item.id" class="rank-card" :class="{ top: i < 3 }">
          <view class="rank-num" :style="rankStyle(i + 1)">{{ i + 1 }}</view>
          <view class="rank-avatar squared" :style="{ background: coverColor(item.name) }">
            <text class="rank-avatar-text">{{ item.name.slice(0, 1) }}</text>
          </view>
          <view class="rank-info">
            <text class="rank-name">{{ item.name }}</text>
            <text class="rank-sub">圈主：{{ item.owner }}</text>
          </view>
          <view class="rank-right">
            <text class="rank-value">{{ (item.members / 1000).toFixed(1) }}k</text>
            <text class="rank-growth">+{{ item.growth }}</text>
          </view>
        </view>
      </view>

      <!-- 创作者榜 -->
      <view v-else-if="activeCategory === 'creators'" class="rank-list">
        <view v-for="(item, i) in creatorRanks" :key="item.id" class="rank-card" :class="{ top: i < 3 }">
          <view class="rank-num" :style="rankStyle(i + 1)">{{ i + 1 }}</view>
          <view class="rank-avatar" :style="{ background: coverColor(item.name) }">
            <text class="rank-avatar-text">{{ item.name.slice(0, 1) }}</text>
          </view>
          <view class="rank-info">
            <text class="rank-name">{{ item.name }}</text>
            <text class="rank-sub">{{ item.title }}</text>
            <view class="rank-stats">
              <view class="rank-stat">
                <AppIcon name="users" :size="12" color="#999" />
                <text class="rank-stat-text">{{ (item.followers / 1000).toFixed(1) }}k</text>
              </view>
              <view class="rank-stat">
                <AppIcon name="heart" :size="12" color="#999" />
                <text class="rank-stat-text">{{ (item.likes / 1000).toFixed(1) }}k</text>
              </view>
              <view class="rank-stat">
                <AppIcon name="book-open" :size="12" color="#999" />
                <text class="rank-stat-text">{{ item.articles }}篇</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程榜 -->
      <view v-else-if="activeCategory === 'courses'" class="rank-list">
        <view v-for="(item, i) in courseRanks" :key="item.id" class="rank-card" :class="{ top: i < 3 }">
          <view class="rank-num" :style="rankStyle(i + 1)">{{ i + 1 }}</view>
          <view class="rank-thumb">
            <AppIcon name="book-open" :size="24" color="#999" />
          </view>
          <view class="rank-info">
            <text class="rank-name">{{ item.name }}</text>
            <text class="rank-sub">{{ item.teacher }}</text>
            <view class="rank-stats">
              <text class="rank-stat-text">{{ item.students }}人学习</text>
              <view class="rank-stat">
                <AppIcon name="star" :size="12" color="#F59E0B" />
                <text class="rank-stat-text amber">{{ item.rating }}</text>
              </view>
            </view>
          </view>
          <text class="rank-price">¥{{ formatPrice(item.price) }}</text>
        </view>
      </view>

      <!-- 商品榜 -->
      <view v-else-if="activeCategory === 'products'" class="rank-list">
        <view v-for="(item, i) in productRanks" :key="item.id" class="rank-card" :class="{ top: i < 3 }">
          <view class="rank-num" :style="rankStyle(i + 1)">{{ i + 1 }}</view>
          <view class="rank-thumb">
            <AppIcon name="shopping-bag" :size="22" color="#999" />
          </view>
          <view class="rank-info">
            <text class="rank-name">{{ item.name }}</text>
            <view class="rank-stats">
              <text class="rank-stat-text">{{ item.sales }}人购买</text>
              <view class="rank-stat">
                <AppIcon name="star" :size="12" color="#F59E0B" />
                <text class="rank-stat-text amber">{{ item.rating }}</text>
              </view>
            </view>
          </view>
          <text class="rank-price">¥{{ formatPrice(item.price) }}</text>
        </view>
      </view>

      <!-- 新星榜 -->
      <view v-else class="rank-list">
        <view v-for="(item, i) in risingRanks" :key="item.id" class="rank-card" :class="{ top: i < 3 }">
          <view class="rank-num" :style="rankStyle(i + 1)">{{ i + 1 }}</view>
          <view class="rank-avatar" :style="{ background: '#16A34A' }">
            <text class="rank-avatar-text">{{ item.name.slice(0, 1) }}</text>
          </view>
          <view class="rank-info">
            <view class="rank-name-row">
              <text class="rank-name">{{ item.name }}</text>
              <view class="rising-badge">
                <AppIcon name="flame" :size="12" color="#16A34A" />
                <text class="rising-text">新星</text>
              </view>
            </view>
            <text class="rank-sub">入驻{{ item.joinDays }}天</text>
          </view>
          <view class="rank-right">
            <text class="rank-value green">+{{ item.growth }}</text>
            <text class="rank-growth gray">{{ item.followers }}粉丝</text>
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { BRAND } from '@/lib/brand'
import { formatPrice } from '@/utils/format'

const activeCategory = ref('circles')
const timeRange = ref<'week' | 'month' | 'total'>('week')

const categories = [
  { id: 'circles', label: '圈子榜', icon: 'users' },
  { id: 'creators', label: '创作者榜', icon: 'crown' },
  { id: 'courses', label: '课程榜', icon: 'book-open' },
  { id: 'products', label: '商品榜', icon: 'shopping-bag' },
  { id: 'rising', label: '新星榜', icon: 'trending-up' },
]

const timeRanges = [
  { id: 'week' as const, label: '本周' },
  { id: 'month' as const, label: '本月' },
  { id: 'total' as const, label: '总榜' },
]

const circleRanks = [
  { id: 1, name: '八字命理研习社', members: 12680, growth: 1280, owner: '张道源' },
  { id: 2, name: '紫微斗数交流圈', members: 9856, growth: 856, owner: '李易卿' },
  { id: 3, name: '风水堪舆实战派', members: 8234, growth: 623, owner: '王文昌' },
  { id: 4, name: '易经智慧学堂', members: 7156, growth: 512, owner: '陈玄风' },
  { id: 5, name: '六爻预测研究会', members: 6023, growth: 389, owner: '周易安' },
]

const creatorRanks = [
  { id: 1, name: '张道源', title: '八字命理专家', followers: 28600, likes: 156800, articles: 326 },
  { id: 2, name: '李易卿', title: '紫微斗数研究员', followers: 21500, likes: 128600, articles: 245 },
  { id: 3, name: '王文昌', title: '风水堪舆大师', followers: 18900, likes: 98500, articles: 189 },
  { id: 4, name: '陈玄风', title: '易经学者', followers: 15600, likes: 86200, articles: 156 },
  { id: 5, name: '周易安', title: '六爻占卜师', followers: 12800, likes: 72300, articles: 128 },
]

const courseRanks = [
  { id: 1, name: '八字入门到精通', teacher: '张道源', students: 12680, rating: 4.9, price: 299 },
  { id: 2, name: '紫微斗数实战班', teacher: '李易卿', students: 8956, rating: 4.8, price: 399 },
  { id: 3, name: '阳宅风水精讲', teacher: '王文昌', students: 7234, rating: 4.9, price: 499 },
  { id: 4, name: '易经六十四卦详解', teacher: '陈玄风', students: 6156, rating: 4.7, price: 199 },
  { id: 5, name: '六爻预测从零开始', teacher: '周易安', students: 5023, rating: 4.8, price: 249 },
]

const productRanks = [
  { id: 1, name: '滴天髓精解', sales: 3268, rating: 4.9, price: 68 },
  { id: 2, name: '子平真诠评注', sales: 2856, rating: 4.8, price: 88 },
  { id: 3, name: '专业排盘罗盘', sales: 2134, rating: 4.9, price: 298 },
  { id: 4, name: '穷通宝鉴白话解', sales: 1956, rating: 4.7, price: 58 },
  { id: 5, name: '三命通会全套', sales: 1623, rating: 4.8, price: 168 },
]

const risingRanks = [
  { id: 1, name: '小易说命理', joinDays: 30, followers: 3680, growth: 2800 },
  { id: 2, name: '玄学新视角', joinDays: 45, followers: 2856, growth: 2100 },
  { id: 3, name: '紫微探秘', joinDays: 28, followers: 2234, growth: 1800 },
  { id: 4, name: '易学入门君', joinDays: 35, followers: 1956, growth: 1500 },
  { id: 5, name: '风水小课堂', joinDays: 42, followers: 1623, growth: 1200 },
]

function rankStyle(rank: number) {
  if (rank === 1) return 'background:#F59E0B;color:#fff;'
  if (rank === 2) return 'background:#9CA3AF;color:#fff;'
  if (rank === 3) return 'background:#B45309;color:#fff;'
  return 'background:#F0EBE2;color:#999;'
}

const coverPalette = ['#C41E3A', '#B8860B', '#2E7D5B', '#1F6FB2', '#8B5A2B', '#9A3B5C']
function coverColor(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return coverPalette[sum % coverPalette.length]
}
</script>

<style scoped>
.page {
  /* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
  height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.nav-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
  background: linear-gradient(90deg, #f59e0b, #f97316);
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-left: 8rpx;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}
.cat-scroll {
  white-space: nowrap;
  background: #faf8f5;
  border-bottom: 2rpx solid #ece7df;
}
.cat-row {
  display: inline-flex;
}
.cat-item {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 32rpx;
  border-bottom: 4rpx solid transparent;
}
.cat-item.active {
  border-bottom-color: #f59e0b;
}
.cat-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #999;
}
.cat-label.active {
  color: #d97706;
}
.time-filter {
  display: flex;
  justify-content: flex-end;
  padding: 24rpx;
}
.time-group {
  display: flex;
  gap: 4rpx;
  padding: 4rpx;
  background: #f0ebe2;
  border-radius: 999rpx;
}
.time-chip {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
}
.time-chip.active {
  background: #f59e0b;
}
.time-label {
  font-size: 22rpx;
  color: #999;
}
.time-label.active {
  color: #fff;
}
.rank-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}
.rank-list {
  padding: 0 24rpx;
}
.rank-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.rank-card.top {
  background: #fffbeb;
  border: 2rpx solid #fde68a;
}
.rank-num {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.rank-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rank-avatar.squared {
  border-radius: 24rpx;
}
.rank-avatar-text {
  font-size: 40rpx;
  font-weight: 600;
  color: #fff;
}
.rank-thumb {
  width: 96rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #f0ebe2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rank-info {
  flex: 1;
  min-width: 0;
}
.rank-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.rank-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rank-sub {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.rank-stats {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 8rpx;
}
.rank-stat {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.rank-stat-text {
  font-size: 20rpx;
  color: #999;
}
.rank-stat-text.amber {
  color: #f59e0b;
}
.rank-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.rank-value {
  font-size: 30rpx;
  font-weight: 700;
  color: #d97706;
}
.rank-value.green {
  color: #16a34a;
}
.rank-growth {
  font-size: 20rpx;
  color: #16a34a;
  margin-top: 4rpx;
}
.rank-growth.gray {
  color: #999;
}
.rank-price {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--brand);
}
.rising-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(22, 163, 74, 0.1);
}
.rising-text {
  font-size: 18rpx;
  color: #16a34a;
}
.bottom-safe {
  height: 48rpx;
}
</style>
