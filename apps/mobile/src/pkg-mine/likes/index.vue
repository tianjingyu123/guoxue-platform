<template>
  <view class="likes-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="onBack">
          <app-icon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="nav-title">我的点赞</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- 类型筛选 Tab -->
    <view class="tab-bar" :style="{ top: statusBarHeight + 56 + 'px' }">
      <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
        <view class="tab-row">
          <view
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-item"
            :class="{ 'tab-active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <app-icon
              v-if="tab.icon"
              :name="tab.icon"
              :size="16"
              :color="activeTab === tab.id ? '#c41e3a' : '#999999'"
            />
            <text class="tab-label">{{ tab.label }}</text>
            <text v-if="tabCount(tab.id) > 0" class="tab-count">({{ tabCount(tab.id) }})</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 点赞列表 -->
    <view class="list" :style="{ paddingTop: statusBarHeight + 56 + 49 + 12 + 'px' }">
      <template v-if="filteredItems.length > 0">
        <view v-for="item in filteredItems" :key="item.id" class="card">
          <view class="card-inner">
            <!-- 封面 -->
            <view class="cover" @click="goDetail(item)">
              <template v-if="item.type === 'video'">
                <app-icon name="play" :size="32" color="rgba(153,153,153,0.4)" />
                <text v-if="item.duration" class="duration">{{ item.duration }}</text>
              </template>
              <app-icon
                v-else-if="item.type === 'course'"
                name="book-open"
                :size="32"
                color="rgba(201,169,110,0.4)"
              />
              <app-icon v-else name="file-text" :size="32" color="rgba(153,153,153,0.4)" />
            </view>

            <!-- 内容 -->
            <view class="content">
              <view class="content-main">
                <!-- 类型标签 -->
                <view class="type-badge" :style="{ background: typeConfig[item.type].bg, color: typeConfig[item.type].color }">
                  <app-icon :name="typeConfig[item.type].icon" :size="12" :color="typeConfig[item.type].color" />
                  <text class="type-badge-text">{{ typeConfig[item.type].label }}</text>
                </view>
                <!-- 标题 -->
                <text class="title" @click="goDetail(item)">{{ item.title }}</text>
                <!-- 摘要 -->
                <text v-if="item.summary" class="summary">{{ item.summary }}</text>
                <!-- 底部信息 -->
                <view class="meta">
                  <text class="meta-author">{{ item.author || item.instructor }}</text>
                  <text v-if="item.type === 'course' && item.price" class="meta-price">¥{{ item.price }}</text>
                  <text v-if="item.type === 'video' && item.likes" class="meta-likes">{{ item.likes }} 点赞</text>
                  <text class="meta-time">· {{ item.likedAt }}</text>
                </view>
              </view>

              <!-- 取消点赞 -->
              <view class="unlike-btn" @click="handleUnlike(item.id)">
                <app-icon name="heart" :size="20" color="#c41e3a" :fill="true" />
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else class="empty">
        <view class="empty-icon">
          <app-icon name="heart" :size="40" color="rgba(153,153,153,0.4)" />
        </view>
        <text class="empty-title">暂无点赞记录</text>
        <text class="empty-sub">看到喜欢的内容，点个赞吧</text>
        <view class="empty-btn" @click="goHome">
          <text class="empty-btn-text">去发现内容</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { goBack, navigateTo } from '@/utils/router'

const likedItems = [
  {
    id: 1,
    type: 'article',
    title: '八字命理入门：如何看懂你的命盘',
    summary: '八字命理是中国传统文化的重要组成部分，本文将带你从零开始了解八字的基本概念...',
    author: '周易大师',
    likedAt: '2小时前',
    href: '/articles/1',
  },
  {
    id: 2,
    type: 'video',
    title: '三分钟看懂十神关系',
    duration: '03:25',
    author: '命理小课堂',
    likes: 2580,
    likedAt: '5小时前',
    href: '/video/1',
  },
  {
    id: 3,
    type: 'post',
    title: '今日案例分析：乙木生于子月',
    summary: '分享一个最近遇到的命盘，乙木日主生于子月，地支一片水旺...',
    images: 2,
    author: '八字研习者',
    likedAt: '昨天',
    href: '/post/1',
  },
  {
    id: 4,
    type: 'course',
    title: '紫微斗数入门到精通',
    instructor: '张玄风',
    price: 299,
    likedAt: '3天前',
    href: '/course/1',
  },
  {
    id: 5,
    type: 'article',
    title: '风水布局的五大禁忌',
    summary: '家居风水关系到一家人的运势，这些常见的风水禁忌你一定要知道...',
    author: '陈风水',
    likedAt: '1周前',
    href: '/articles/2',
  },
  {
    id: 6,
    type: 'video',
    title: '手把手教你排八字',
    duration: '08:42',
    author: '国学小白',
    likes: 5680,
    likedAt: '1周前',
    href: '/video/2',
  },
]

export default {
  data() {
    return {
      statusBarHeight: 0,
      activeTab: 'all',
      items: [...likedItems],
      tabs: [
        { id: 'all', label: '全部', icon: null },
        { id: 'post', label: '帖子', icon: 'message-square' },
        { id: 'article', label: '文章', icon: 'file-text' },
        { id: 'video', label: '短视频', icon: 'video' },
        { id: 'course', label: '课程', icon: 'book-open' },
      ],
      typeConfig: {
        post: { label: '帖子', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: 'message-square' },
        article: { label: '文章', bg: 'rgba(34,197,94,0.1)', color: '#22c55e', icon: 'file-text' },
        video: { label: '视频', bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', icon: 'video' },
        course: { label: '课程', bg: 'rgba(201,169,110,0.1)', color: '#c9a96e', icon: 'book-open' },
      },
    }
  },
  computed: {
    filteredItems() {
      if (this.activeTab === 'all') return this.items
      return this.items.filter((i) => i.type === this.activeTab)
    },
  },
  onLoad() {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 0
    } catch (e) {
      this.statusBarHeight = 0
    }
  },
  methods: {
    tabCount(id) {
      if (id === 'all') return this.items.length
      return this.items.filter((i) => i.type === id).length
    },
    handleUnlike(id) {
      this.items = this.items.filter((i) => i.id !== id)
    },
    goDetail(item) {
      if (item.href) navigateTo(item.href)
    },
    onBack() {
      goBack()
    },
    goHome() {
      navigateTo('/pages/index/index')
    },
  },
}
</script>

<style lang="scss" scoped>
.likes-page {
  min-height: 100vh;
  background: #faf8f5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e8e3db;
}
.nav-inner {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-placeholder {
  width: 36px;
}

.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 30;
  background: #faf8f5;
  border-bottom: 1px solid #e8e3db;
}
.tab-scroll {
  white-space: nowrap;
}
.tab-row {
  display: flex;
  align-items: center;
  padding: 0 8px;
}
.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 2px solid transparent;
}
.tab-active {
  border-bottom-color: #c41e3a;
}
.tab-label {
  font-size: 14px;
  font-weight: 500;
  color: #999999;
}
.tab-active .tab-label {
  color: #c41e3a;
}
.tab-count {
  font-size: 12px;
  color: #999999;
}

.list {
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 24px;
}
.card {
  background: #ffffff;
  border: 1px solid #e8e3db;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
.card-inner {
  display: flex;
}
.cover {
  flex-shrink: 0;
  width: 112px;
  aspect-ratio: 4 / 3;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  font-size: 10px;
  border-radius: 4px;
}
.content {
  flex: 1;
  padding: 12px;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.content-main {
  flex: 1;
  min-width: 0;
}
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-bottom: 6px;
}
.type-badge-text {
  font-size: 10px;
}
.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
}
.summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  font-size: 12px;
  color: #999999;
  margin-top: 4px;
}
.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.meta-author,
.meta-likes,
.meta-time {
  font-size: 10px;
  color: #999999;
}
.meta-price {
  font-size: 10px;
  color: #c41e3a;
  font-weight: 500;
}
.unlike-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}
.empty-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.empty-title {
  font-size: 14px;
  color: #999999;
}
.empty-sub {
  font-size: 12px;
  color: rgba(153, 153, 153, 0.7);
  margin-top: 4px;
}
.empty-btn {
  margin-top: 16px;
  padding: 8px 24px;
  background: #c41e3a;
  border-radius: 9999px;
}
.empty-btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}
</style>
