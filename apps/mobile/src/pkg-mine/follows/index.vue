<template>
  <view class="follows-page">
    <app-nav-bar title="关注与粉丝" :show-back="true" />

    <!-- Tab 切换 -->
    <view class="follows-tabs">
      <view
        class="follows-tab"
        :class="{ active: activeTab === 'following' }"
        @tap="activeTab = 'following'"
      >
        <text class="tab-text">关注</text>
        <text class="tab-count">{{ followingList.length }}</text>
        <view v-if="activeTab === 'following'" class="tab-underline" />
      </view>
      <view
        class="follows-tab"
        :class="{ active: activeTab === 'followers' }"
        @tap="activeTab = 'followers'"
      >
        <text class="tab-text">粉丝</text>
        <text class="tab-count">{{ followersList.length }}</text>
        <view v-if="activeTab === 'followers'" class="tab-underline" />
      </view>
    </view>

    <scroll-view scroll-y class="follows-scroll">
      <view class="follows-list">
        <view v-if="currentList.length === 0" class="follows-empty">
          <app-icon name="users" :size="120" color="rgba(0,0,0,0.15)" />
          <text class="empty-title">{{ activeTab === 'following' ? '暂无关注' : '暂无粉丝' }}</text>
          <text class="empty-desc">{{ activeTab === 'following' ? '去发现更多感兴趣的人吧' : '分享优质内容吸引更多关注' }}</text>
        </view>

        <view
          v-for="user in currentList"
          :key="user.id"
          class="user-item"
          @tap="goUser(user.id)"
        >
          <view class="user-avatar-wrap">
            <image class="user-avatar" :src="user.avatar || defaultAvatar" mode="aspectFill" />
            <view v-if="user.isFollowing && user.isFollowedBy" class="mutual-badge">
              <app-icon name="users" :size="18" color="#fff" />
            </view>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.name }}</text>
            <text class="user-bio">{{ user.bio || `${user.followers} 粉丝` }}</text>
          </view>
          <view
            class="follow-btn"
            :class="followBtnClass(user)"
            @tap.stop="toggleFollow(user)"
          >
            <app-icon :name="followBtnIcon(user)" :size="22" :color="followBtnIconColor(user)" />
            <text class="follow-btn-text">{{ followBtnText(user) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo } from '@/utils/router'

interface FollowUser {
  id: string
  name: string
  avatar: string
  bio?: string
  followers: number
  isFollowing: boolean
  isFollowedBy: boolean
}

const defaultAvatar = '/static/placeholder-avatar.png'

const activeTab = ref<'following' | 'followers'>('following')

const followingList = ref<FollowUser[]>([
  { id: '1', name: '易学大师王老师', avatar: '', bio: '专注易经研究30年，擅长八字命理与风水布局', followers: 12580, isFollowing: true, isFollowedBy: true },
  { id: '2', name: '道法自然', avatar: '', bio: '传播传统文化，弘扬国学智慧', followers: 8920, isFollowing: true, isFollowedBy: false },
  { id: '3', name: '玄学研究院', avatar: '', bio: '专业玄学研究机构官方账号', followers: 45600, isFollowing: true, isFollowedBy: true },
  { id: '4', name: '风水师李明', avatar: '', bio: '阳宅风水、办公室布局、家居环境优化', followers: 6780, isFollowing: true, isFollowedBy: false },
  { id: '5', name: '命理学堂', avatar: '', bio: '八字命理入门到精通，系统学习命理知识', followers: 23400, isFollowing: true, isFollowedBy: true },
])

const followersList = ref<FollowUser[]>([
  { id: '6', name: '学习者小王', avatar: '', bio: '国学爱好者，正在学习易经', followers: 128, isFollowing: false, isFollowedBy: true },
  { id: '7', name: '传统文化粉', avatar: '', bio: '热爱传统文化', followers: 256, isFollowing: true, isFollowedBy: true },
  { id: '8', name: '易学初学者', avatar: '', bio: '刚开始接触易学，求指导', followers: 45, isFollowing: false, isFollowedBy: true },
  { id: '9', name: '风水研究者', avatar: '', bio: '从事风水研究5年', followers: 890, isFollowing: true, isFollowedBy: true },
  { id: '10', name: '命理爱好者', avatar: '', bio: '对八字命理很感兴趣', followers: 320, isFollowing: false, isFollowedBy: true },
])

const currentList = computed(() => (activeTab.value === 'following' ? followingList.value : followersList.value))

function toggleFollow(user: FollowUser) {
  user.isFollowing = !user.isFollowing
}

function followBtnClass(u: FollowUser) {
  if (u.isFollowing && u.isFollowedBy) return 'btn-muted'
  if (u.isFollowing) return 'btn-muted'
  return 'btn-primary'
}
function followBtnText(u: FollowUser) {
  if (u.isFollowing && u.isFollowedBy) return '互相关注'
  if (u.isFollowing) return '已关注'
  return '关注'
}
function followBtnIcon(u: FollowUser) {
  if (u.isFollowing && u.isFollowedBy) return 'users'
  if (u.isFollowing) return 'user-check'
  return 'user-plus'
}
function followBtnIconColor(u: FollowUser) {
  return u.isFollowing ? '#999' : '#fff'
}

function goUser(id: string) {
  navigateTo(`/user/${id}`)
}
</script>

<style lang="scss" scoped>
.follows-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.follows-tabs {
  display: flex;
  border-bottom: 2rpx solid #eee;
}
.follows-tab {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
}
.tab-text { font-size: 30rpx; color: #999; }
.follows-tab.active .tab-text { color: #c41e3a; font-weight: 500; }
.tab-count {
  font-size: 22rpx;
  color: #999;
  background: #f4f4f5;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}
.tab-underline {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 96rpx;
  height: 4rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}

.follows-scroll {
  flex: 1;
  height: 0;
}
.follows-list {
  padding: 32rpx;
}

.follows-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.empty-title { font-size: 32rpx; color: #999; margin: 32rpx 0 16rpx; }
.empty-desc { font-size: 26rpx; color: #bbb; }

.user-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
}
.user-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f4f4f5;
}
.mutual-badge {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 32rpx;
  height: 32rpx;
  background: #c41e3a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fff;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-bio {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.follow-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.follow-btn-text { font-size: 24rpx; }
.btn-primary { background: #c41e3a; }
.btn-primary .follow-btn-text { color: #fff; }
.btn-muted { background: #f4f4f5; }
.btn-muted .follow-btn-text { color: #999; }
</style>
