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
            <text class="stat-num">{{ totalCircles }}</text>
            <text class="stat-label">已加入</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ stats.postCount }}</text>
            <text class="stat-label">发帖数</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ formatK(stats.likeReceived) }}</text>
            <text class="stat-label">获赞数</text>
          </view>
        </view>
        <view class="overview-roles">
          <view class="role-stat">
            <view class="role-stat-top">
              <AppIcon name="crown" :size="16" color="#FDE047" />
              <text class="role-stat-num">{{ roleCounts.owner }}</text>
            </view>
            <text class="role-stat-label">圈主</text>
          </view>
          <view class="role-stat">
            <view class="role-stat-top">
              <AppIcon name="shield" :size="16" color="#93C5FD" />
              <text class="role-stat-num">{{ roleCounts.admin }}</text>
            </view>
            <text class="role-stat-label">管理员</text>
          </view>
          <view class="role-stat">
            <view class="role-stat-top">
              <AppIcon name="user" :size="16" color="#86EFAC" />
              <text class="role-stat-num">{{ roleCounts.member }}</text>
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
        <!-- 加载态 -->
        <view v-if="loading" class="skeleton-wrap">
          <view v-for="i in 3" :key="i" class="skeleton-card">
            <view class="sk-cover" />
            <view class="sk-lines">
              <view class="sk-line sk-line-lg" />
              <view class="sk-line sk-line-sm" />
            </view>
          </view>
        </view>

        <!-- 错误态 -->
        <view v-else-if="error" class="state-box">
          <view class="empty-icon">
            <AppIcon name="alert-circle" :size="32" color="#999" />
          </view>
          <text class="empty-text">加载失败，请稍后重试</text>
          <text class="empty-link" @tap="load">点击重试</text>
        </view>

        <!-- 空态 -->
        <view v-else-if="filteredCircles.length === 0" class="state-box">
          <view class="empty-icon">
            <AppIcon name="users" :size="32" color="#999" />
          </view>
          <text class="empty-text">{{ myCircles.length === 0 ? '你还没有加入任何圈子' : '没有符合条件的圈子' }}</text>
          <text class="empty-link" @tap="navigateTo('/circles')">去圈子广场逛逛</text>
        </view>

        <!-- 列表 -->
        <view
          v-for="circle in filteredCircles"
          v-else
          :key="circle.id"
          class="circle-card"
          @tap="navigateTo(`/circles/${circle.id}`)"
        >
          <view class="circle-cover-wrap">
            <view class="circle-cover" :style="{ background: coverColor(circle.name) }">
              <text class="circle-cover-text">{{ circle.name.slice(0, 1) }}</text>
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
              <view class="meta-item">
                <AppIcon name="file-text" :size="14" color="#999" />
                <text class="meta-text">{{ circle.postCount }}帖</text>
              </view>
            </view>
          </view>

          <view class="circle-right">
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
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleApi, type MyCircle, type MyCircleRole } from '@/lib/circle-data'

const loading = ref(true)
const error = ref(false)
const myCircles = ref<MyCircle[]>([])
// 后端 /circles/my-stats 聚合：发帖数 / 累计获赞（已加入数与角色分布从列表实时派生）
const stats = ref<{ postCount: number; likeReceived: number }>({ postCount: 0, likeReceived: 0 })

const searchQuery = ref('')
const activeFilter = ref<'all' | MyCircleRole>('all')

async function load() {
  loading.value = true
  error.value = false
  try {
    const [circles, s] = await Promise.all([
      circleApi.getMyCircles(),
      circleApi.getMyStats(),
    ])
    myCircles.value = circles
    stats.value = { postCount: s.postCount, likeReceived: s.likeReceived }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

// 已加入总数（列表长度，权威口径）
const totalCircles = computed(() => myCircles.value.length)

// 角色分布：从真实列表派生（后端 CircleMember.role 已映射为三档）
const roleCounts = computed(() => {
  const c = { owner: 0, admin: 0, member: 0 }
  for (const x of myCircles.value) c[x.role]++
  return c
})

const filterTabs = computed(() => [
  { id: 'all' as const, label: '全部', count: totalCircles.value },
  { id: 'owner' as const, label: '我创建的', count: roleCounts.value.owner },
  { id: 'admin' as const, label: '我管理的', count: roleCounts.value.admin },
  { id: 'member' as const, label: '我加入的', count: roleCounts.value.member },
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

function roleIcon(role: MyCircleRole) {
  return role === 'owner' ? 'crown' : role === 'admin' ? 'shield' : 'user'
}
function roleLabel(role: MyCircleRole) {
  return role === 'owner' ? '圈主' : role === 'admin' ? '管理员' : '成员'
}
function roleColor(role: MyCircleRole) {
  return role === 'owner' ? '#C9A96E' : role === 'admin' ? '#1890FF' : '#52C41A'
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
  color: var(--brand);
}
.scroll-area {
  flex: 1;
  height: 0;
  min-height: 0;
}
.overview-card {
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, var(--brand), #a01530);
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
  background: var(--brand);
  border-color: var(--brand);
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
  background: var(--brand);
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
  color: var(--brand);
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
  background: linear-gradient(90deg, var(--brand), #ff6b35);
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
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
}
.skeleton-wrap {
  padding-top: 8rpx;
}
.skeleton-card {
  display: flex;
  gap: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 24rpx;
}
.sk-cover {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: #efeae2;
}
.sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20rpx;
}
.sk-line {
  height: 24rpx;
  border-radius: 12rpx;
  background: #efeae2;
}
.sk-line-lg {
  width: 60%;
}
.sk-line-sm {
  width: 35%;
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
  color: var(--brand);
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
