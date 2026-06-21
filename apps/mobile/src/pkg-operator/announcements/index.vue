<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1f2937" />
        </view>
        <text class="nav-title">平台公告</text>
      </view>
    </view>

    <!-- 分类筛选 -->
    <view class="filter-bar" :style="{ top: navbarHeight + 'px' }">
      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
        <view class="filter-list">
          <view
            v-for="type in announcementTypes"
            :key="type.id"
            class="filter-chip"
            :class="{ 'filter-chip--active': activeType === type.id }"
            @tap="activeType = type.id"
          >
            <text class="filter-chip-text" :class="{ 'filter-chip-text--active': activeType === type.id }">{{ type.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 公告列表 -->
    <view class="list">
      <!-- 置顶公告 -->
      <view
        v-for="item in topAnnouncements"
        :key="'top-' + item.id"
        class="card card--top"
        @tap="openDetail(item)"
      >
        <view class="card-row">
          <view class="type-icon" :class="'type-icon--' + item.type">
            <AppIcon :name="typeConfig[item.type].icon" :size="20" :color="typeConfig[item.type].color" />
          </view>
          <view class="card-main">
            <view class="badge-row">
              <text class="badge badge--top">置顶</text>
              <text v-if="item.isNew" class="badge badge--new">NEW</text>
            </view>
            <text class="card-title">{{ item.title }}</text>
            <text class="card-summary">{{ item.summary }}</text>
            <view class="card-foot">
              <view class="card-time">
                <AppIcon name="clock" :size="12" color="#9ca3af" />
                <text class="card-time-text">{{ item.time }}</text>
              </view>
              <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
            </view>
          </view>
        </view>
      </view>

      <!-- 普通公告 -->
      <view
        v-for="item in normalAnnouncements"
        :key="'normal-' + item.id"
        class="card"
        @tap="openDetail(item)"
      >
        <view class="card-row">
          <view class="type-icon" :class="'type-icon--' + item.type">
            <AppIcon :name="typeConfig[item.type].icon" :size="20" :color="typeConfig[item.type].color" />
          </view>
          <view class="card-main">
            <view class="title-row">
              <text class="card-title card-title--inline">{{ item.title }}</text>
              <text v-if="item.isNew" class="badge badge--new">NEW</text>
            </view>
            <text class="card-summary">{{ item.summary }}</text>
            <view class="card-foot">
              <view class="card-time">
                <AppIcon name="clock" :size="12" color="#9ca3af" />
                <text class="card-time-text">{{ item.time }}</text>
              </view>
              <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
            </view>
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-if="filteredAnnouncements.length === 0" class="empty">
        <AppIcon name="megaphone" :size="48" color="#d1d5db" />
        <text class="empty-text">暂无相关公告</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, navigateTo } from '@/utils/router'

const sys = uni.getSystemInfoSync()
const statusBarHeight = sys.statusBarHeight || 20
const navbarHeight = statusBarHeight + 44

const announcementTypes = [
  { id: 'all', label: '全部' },
  { id: 'notice', label: '平台通知' },
  { id: 'activity', label: '活动公告' },
  { id: 'update', label: '功能更新' },
  { id: 'important', label: '重要公告' },
]

const typeConfig: Record<string, { icon: string; color: string }> = {
  notice: { icon: 'bell', color: '#3b82f6' },
  activity: { icon: 'gift', color: '#ec4899' },
  update: { icon: 'wrench', color: '#22c55e' },
  important: { icon: 'alert-triangle', color: '#ef4444' },
}

interface Announcement {
  id: number
  type: string
  title: string
  summary: string
  time: string
  isTop: boolean
  isNew: boolean
}

const announcements: Announcement[] = [
  { id: 1, type: 'important', title: '关于平台服务升级的通知', summary: '为提升用户体验，平台将于4月20日凌晨2:00-6:00进行系统升级维护，届时部分功能将暂停使用。', time: '2024-03-18', isTop: true, isNew: true },
  { id: 2, type: 'activity', title: '2024春季国学文化节活动开启', summary: '春暖花开，热卜国学平台联合多位名师举办春季国学文化节，精彩课程限时优惠，更有神秘大奖等你来拿！', time: '2024-03-15', isTop: true, isNew: true },
  { id: 3, type: 'update', title: '新功能上线：研究院正式开放申请', summary: '研究院是平台知识分享和学术交流的核心组织，现面向全体圈主开放申请，快来加入我们！', time: '2024-03-12', isTop: false, isNew: false },
  { id: 4, type: 'notice', title: '关于加强内容审核的说明', summary: '为维护平台良好的学习氛围，我们将进一步加强对平台内容的审核，请各位圈主和创作者遵守平台规范。', time: '2024-03-10', isTop: false, isNew: false },
  { id: 5, type: 'activity', title: '分站招募计划正式启动', summary: '成为热卜国学分站站长，享受专属权益和分佣收益，首批站长限时优惠中！', time: '2024-03-05', isTop: false, isNew: false },
  { id: 6, type: 'update', title: 'APP新版本2.0发布', summary: '全新设计界面，优化课程播放体验，新增AI排盘助手功能，快来体验吧！', time: '2024-02-28', isTop: false, isNew: false },
  { id: 7, type: 'notice', title: '关于调整圈子管理规则的通知', summary: '为促进圈子健康发展，平台对圈子管理规则进行了部分调整，请各位圈主仔细阅读。', time: '2024-02-20', isTop: false, isNew: false },
]

const activeType = ref('all')

const filteredAnnouncements = computed(() =>
  activeType.value === 'all'
    ? announcements
    : announcements.filter((a) => a.type === activeType.value)
)
const topAnnouncements = computed(() => filteredAnnouncements.value.filter((a) => a.isTop))
const normalAnnouncements = computed(() => filteredAnnouncements.value.filter((a) => !a.isTop))

function goBack() {
  navigateBack()
}

function openDetail(item: Announcement) {
  // 公告详情页未单独迁移，复用已迁的 notices 详情兜底
  navigateTo(`/notices/${item.id}`)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f9fafb;
  padding-bottom: 40rpx;
}

/* 顶部导航 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e7eb;
}
.navbar-inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 32rpx;
}
.nav-back {
  padding: 8rpx;
  margin-right: 24rpx;
}
.nav-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2937;
}

/* 分类筛选 */
.filter-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 40;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e7eb;
}
.filter-scroll {
  white-space: nowrap;
}
.filter-list {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx;
}
.filter-chip {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
}
.filter-chip--active {
  background: #dc2626;
}
.filter-chip-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #6b7280;
}
.filter-chip-text--active {
  color: #ffffff;
}

/* 列表 */
.list {
  padding: 32rpx;
  padding-top: calc(88rpx + 88rpx + 32rpx);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 卡片 */
.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid #f3f4f6;
}
.card--top {
  border: 1rpx solid rgba(220, 38, 38, 0.3);
  background: rgba(220, 38, 38, 0.05);
}
.card-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.type-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.type-icon--notice {
  background: rgba(59, 130, 246, 0.1);
}
.type-icon--activity {
  background: rgba(236, 72, 153, 0.1);
}
.type-icon--update {
  background: rgba(34, 197, 94, 0.1);
}
.type-icon--important {
  background: rgba(239, 68, 68, 0.1);
}
.card-main {
  flex: 1;
  min-width: 0;
}
.badge-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  color: #ffffff;
}
.badge--top {
  background: #ef4444;
}
.badge--new {
  background: #dc2626;
}
.card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
  margin-top: 8rpx;
}
.card-title--inline {
  flex: 1;
  margin-top: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-summary {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 8rpx;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.card-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.card-time-text {
  font-size: 20rpx;
  color: #9ca3af;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: #9ca3af;
  margin-top: 16rpx;
}
</style>
