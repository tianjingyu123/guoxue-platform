<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-btn" @tap="goBack">
        <AppIcon name="arrow-left" :size="20" color="#2C2C2C" />
      </view>
      <text class="nav-title">我的圈子</text>
      <text class="nav-more" @tap="navigateTo('/circles')">发现更多</text>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 数据概览卡片 -->
      <view class="overview-card">
        <view class="overview-head">
          <text class="overview-title">我的圈子数据</text>
          <view class="overview-detail" @tap="navigateTo('/circles/stats')">
            <text class="overview-detail-text">详情</text>
            <AppIcon name="chevron-right" :size="14" color="rgba(255,255,255,0.7)" />
          </view>
        </view>
        <view class="overview-stats">
          <view class="stat-item">
            <text class="stat-num">{{ stats.totalCircles }}</text>
            <text class="stat-label">已加入</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ stats.totalPosts }}</text>
            <text class="stat-label">发帖数</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ formatK(stats.totalLikes) }}</text>
            <text class="stat-label">获赞数</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ stats.totalExp }}</text>
            <text class="stat-label">总经验</text>
          </view>
        </view>
        <view class="overview-roles">
          <view class="role-stat">
            <view class="role-stat-top">
              <AppIcon name="crown" :size="16" color="#FDE047" />
              <text class="role-stat-num">{{ stats.asOwner }}</text>
            </view>
            <text class="role-stat-label">圈主</text>
          </view>
          <view class="role-stat">
            <view class="role-stat-top">
              <AppIcon name="shield" :size="16" color="#93C5FD" />
              <text class="role-stat-num">{{ stats.asAdmin }}</text>
            </view>
            <text class="role-stat-label">管理员</text>
          </view>
          <view class="role-stat">
            <view class="role-stat-top">
              <AppIcon name="user" :size="16" color="#86EFAC" />
              <text class="role-stat-num">{{ stats.asMember }}</text>
            </view>
            <text class="role-stat-label">成员</text>
          </view>
        </view>
      </view>

      <!-- 搜索 -->
      <view class="search-wrap">
        <view class="search-box">
          <AppIcon name="search" :size="16" color="#999" />
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索圈子"
            placeholder-class="search-ph"
          />
        </view>
      </view>

      <!-- 筛选 Tab -->
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-row">
          <view
            v-for="tab in filterTabs"
            :key="tab.id"
            class="filter-chip"
            :class="{ active: activeFilter === tab.id }"
            @tap="activeFilter = tab.id"
          >
            <text class="filter-label">{{ tab.label }}</text>
            <text class="filter-count" :class="{ active: activeFilter === tab.id }">{{ tab.count }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 圈子列表 -->
      <view class="circle-list">
        <view v-if="filteredCircles.length === 0" class="empty">
          <view class="empty-icon">
            <AppIcon name="users" :size="32" color="#999" />
          </view>
          <text class="empty-text">暂无圈子</text>
          <text class="empty-link" @tap="navigateTo('/circles')">去发现圈子</text>
        </view>

        <view
          v-for="circle in filteredCircles"
          :key="circle.id"
          class="circle-card"
          @tap="navigateTo(`/circles/${circle.id}`)"
        >
          <view class="circle-cover-wrap">
            <view class="circle-cover" :style="{ background: coverColor(circle.name) }">
              <text class="circle-cover-text">{{ circle.name.slice(0, 1) }}</text>
            </view>
            <view v-if="circle.unreadCount > 0" class="unread-badge">
              <text class="unread-text">{{ circle.unreadCount > 99 ? '99+' : circle.unreadCount }}</text>
            </view>
          </view>

          <view class="circle-info">
            <view class="circle-name-row">
              <text class="circle-name">{{ circle.name }}</text>
              <view class="role-tag" :class="circle.role">
                <AppIcon :name="roleIcon(circle.role)" :size="12" :color="roleColor(circle.role)" />
                <text class="role-tag-text" :style="{ color: roleColor(circle.role) }">{{ roleLabel(circle.role) }}</text>
              </view>
            </view>

            <view class="circle-meta">
              <view class="meta-item">
                <AppIcon name="users" :size="14" color="#999" />
                <text class="meta-text">{{ circle.memberCount }}人</text>
              </view>
              <view v-if="circle.todayActive > 0" class="meta-item hot">
                <AppIcon name="flame" :size="14" color="#FF6B35" />
                <text class="meta-text hot">今日{{ circle.todayActive }}动态</text>
              </view>
            </view>

            <text class="circle-latest">{{ circle.latestPost }}</text>

            <view class="circle-level">
              <text class="level-tag">Lv.{{ circle.level }}</text>
              <view class="level-bar">
                <view class="level-fill" :style="{ width: `${(circle.exp % 500) / 5}%` }" />
              </view>
              <text class="level-exp">{{ circle.exp }}exp</text>
            </view>
          </view>

          <view class="circle-right">
            <text class="circle-time">{{ circle.lastActive }}</text>
            <view
              v-if="circle.role === 'owner'"
              class="manage-btn"
              @tap.stop="navigateTo(`/circles/${circle.id}/manage`)"
            >
              <AppIcon name="settings" :size="16" color="#666" />
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-entry">
        <view class="quick-item" @tap="navigateTo('/circles/create')">
          <view class="quick-icon" style="background: rgba(196,30,58,0.1)">
            <AppIcon name="plus" :size="20" color="#C41E3A" />
          </view>
          <text class="quick-label">创建圈子</text>
        </view>
        <view class="quick-item" @tap="navigateTo('/circles/activities')">
          <view class="quick-icon" style="background: rgba(255,107,53,0.1)">
            <AppIcon name="calendar" :size="20" color="#FF6B35" />
          </view>
          <text class="quick-label">我的活动</text>
        </view>
        <view class="quick-item" @tap="navigateTo('/circles/badges')">
          <view class="quick-icon" style="background: rgba(201,169,110,0.1)">
            <AppIcon name="award" :size="20" color="#C9A96E" />
          </view>
          <text class="quick-label">我的勋章</text>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

type Role = 'owner' | 'admin' | 'member'

interface Circle {
  id: string
  name: string
  type: string
  price: number
  role: Role
  memberCount: number
  todayActive: number
  latestPost: string
  unreadCount: number
  lastActive: string
  level: number
  exp: number
}

const searchQuery = ref('')
const activeFilter = ref<'all' | Role>('all')

const myCircles = ref<Circle[]>([
  { id: '1', name: '八字命理研习社', type: 'paid', price: 199, role: 'owner', memberCount: 1280, todayActive: 56, latestPost: '周易大师发布了新文章《八字中的十神关系详解》', unreadCount: 5, lastActive: '10分钟前', level: 5, exp: 1280 },
  { id: '2', name: '紫微斗数学院', type: 'paid', price: 299, role: 'admin', memberCount: 856, todayActive: 32, latestPost: '张玄风：今天的直播课程大家记得准时参加', unreadCount: 12, lastActive: '30分钟前', level: 4, exp: 960 },
  { id: '3', name: '风水堪舆交流群', type: 'free', price: 0, role: 'member', memberCount: 2560, todayActive: 128, latestPost: '陈风水分享了一个案例《商铺选址的风水要点》', unreadCount: 0, lastActive: '1小时前', level: 3, exp: 450 },
  { id: '4', name: '易经六十四卦研习', type: 'paid', price: 99, role: 'member', memberCount: 680, todayActive: 18, latestPost: '今日话题：乾卦与坤卦的关系', unreadCount: 3, lastActive: '2小时前', level: 2, exp: 180 },
])

const stats = {
  totalCircles: 4,
  asOwner: 1,
  asAdmin: 1,
  asMember: 2,
  totalPosts: 156,
  totalLikes: 2800,
  totalExp: 2870,
}

const filterTabs = computed(() => [
  { id: 'all' as const, label: '全部', count: stats.totalCircles },
  { id: 'owner' as const, label: '我创建的', count: stats.asOwner },
  { id: 'admin' as const, label: '我管理的', count: stats.asAdmin },
  { id: 'member' as const, label: '我加入的', count: stats.asMember },
])

const filteredCircles = computed(() =>
  myCircles.value.filter((c) => {
    if (activeFilter.value !== 'all' && c.role !== activeFilter.value) return false
    if (searchQuery.value && !c.name.includes(searchQuery.value)) return false
    return true
  })
)

function formatK(n: number) {
  return n > 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

const coverPalette = ['#C41E3A', '#B8860B', '#2E7D5B', '#1F6FB2', '#8B5A2B', '#9A3B5C']
function coverColor(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return coverPalette[sum % coverPalette.length]
}

function roleIcon(role: Role) {
  return role === 'owner' ? 'crown' : role === 'admin' ? 'shield' : 'user'
}
function roleLabel(role: Role) {
  return role === 'owner' ? '圈主' : role === 'admin' ? '管理员' : '成员'
}
function roleColor(role: Role) {
  return role === 'owner' ? '#C9A96E' : role === 'admin' ? '#1890FF' : '#52C41A'
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-more {
  font-size: 26rpx;
  color: #c41e3a;
}
.scroll-area {
  flex: 1;
  height: 0;
}
.overview-card {
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #c41e3a, #a01530);
}
.overview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.overview-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.overview-detail {
  display: flex;
  align-items: center;
}
.overview-detail-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}
.overview-stats {
  display: flex;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
}
.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4rpx;
}
.overview-roles {
  display: flex;
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(255, 255, 255, 0.2);
}
.role-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.role-stat-top {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.role-stat-num {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.role-stat-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4rpx;
}
.search-wrap {
  padding: 24rpx 24rpx 0;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 28rpx;
  background: #fff;
  border: 2rpx solid #e8e3db;
  border-radius: 999rpx;
}
.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #2c2c2c;
}
.search-ph {
  color: #999;
}
.filter-scroll {
  white-space: nowrap;
  padding: 24rpx 24rpx 8rpx;
}
.filter-row {
  display: inline-flex;
  gap: 16rpx;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 2rpx solid #e8e3db;
}
.filter-chip.active {
  background: #c41e3a;
  border-color: #c41e3a;
}
.filter-label {
  font-size: 24rpx;
  font-weight: 500;
  color: #666;
}
.filter-chip.active .filter-label {
  color: #fff;
}
.filter-count {
  font-size: 20rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #f5f0e8;
  color: #999;
}
.filter-count.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.circle-list {
  padding: 8rpx 24rpx 0;
}
.circle-card {
  display: flex;
  gap: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.circle-cover-wrap {
  position: relative;
}
.circle-cover {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.circle-cover-text {
  font-size: 48rpx;
  font-weight: 600;
  color: #fff;
}
.unread-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.unread-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}
.circle-info {
  flex: 1;
  min-width: 0;
}
.circle-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.circle-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  max-width: 320rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.role-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}
.role-tag.owner {
  background: rgba(201, 169, 110, 0.1);
}
.role-tag.admin {
  background: rgba(24, 144, 255, 0.1);
}
.role-tag.member {
  background: rgba(82, 196, 26, 0.1);
}
.role-tag-text {
  font-size: 20rpx;
}
.circle-meta {
  display: flex;
  gap: 24rpx;
  margin-top: 8rpx;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.meta-text {
  font-size: 24rpx;
  color: #999;
}
.meta-text.hot {
  color: #ff6b35;
}
.circle-latest {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-top: 12rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.circle-level {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}
.level-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(196, 30, 58, 0.1);
  color: #c41e3a;
}
.level-bar {
  flex: 1;
  height: 12rpx;
  background: #f5f0e8;
  border-radius: 999rpx;
  overflow: hidden;
}
.level-fill {
  height: 100%;
  background: linear-gradient(90deg, #c41e3a, #ff6b35);
  border-radius: 999rpx;
}
.level-exp {
  font-size: 20rpx;
  color: #999;
}
.circle-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
}
.circle-time {
  font-size: 22rpx;
  color: #bbb;
}
.manage-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: #f5f0e8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
}
.empty-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 999rpx;
  background: #f5f0e8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 16rpx;
}
.empty-link {
  font-size: 26rpx;
  color: #c41e3a;
}
.quick-entry {
  display: flex;
  gap: 24rpx;
  padding: 48rpx 24rpx 32rpx;
}
.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.quick-label {
  font-size: 24rpx;
  color: #2c2c2c;
}
.bottom-safe {
  height: 48rpx;
}
</style>
