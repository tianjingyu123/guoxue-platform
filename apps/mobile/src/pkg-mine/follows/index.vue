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
        <!-- 加载态 -->
        <view v-if="loading" class="follows-empty">
          <AppLoading />
        </view>
        <!-- 错误态 -->
        <view v-else-if="error" class="follows-empty">
          <app-icon name="alert-circle" :size="100" color="rgba(0,0,0,0.15)" />
          <text class="empty-title">{{ error }}</text>
          <view class="retry-btn" @tap="fetchData"><text class="retry-btn-text">重试</text></view>
        </view>
        <!-- 空态 -->
        <view v-else-if="currentList.length === 0" class="follows-empty">
          <app-icon name="users" :size="120" color="rgba(0,0,0,0.15)" />
          <text class="empty-title">{{ activeTab === 'following' ? '暂无关注' : '暂无粉丝' }}</text>
          <text class="empty-desc">{{ activeTab === 'following' ? '去发现更多感兴趣的人吧' : '分享优质内容吸引更多关注' }}</text>
        </view>

        <view
          v-for="user in (loading || error ? [] : currentList)"
          :key="user.id"
          class="user-item"
          @tap="goUser(user.id)"
        >
          <view class="user-avatar-wrap">
            <smart-avatar :src="user.avatar || defaultAvatar" :name="user.name" class="user-avatar" />
            <view v-if="user.isFollowing && user.isFollowedBy" class="mutual-badge">
              <app-icon name="users" :size="18" color="#fff" />
            </view>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.name }}</text>
            <text class="user-bio">{{ user.isFollowing && user.isFollowedBy ? '互相关注' : (user.isFollowedBy ? '关注了你' : '') }}</text>
          </view>
          <view
            class="follow-btn"
            :class="[followBtnClass(user), { disabled: submittingId === user.id }]"
            @tap.stop="toggleFollow(user)"
          >
            <app-icon :name="followBtnIcon(user)" :size="22" :color="followBtnIconColor(user)" />
            <text class="follow-btn-text">{{ followBtnText(user) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navigateTo } from '@/utils/router'
import AppLoading from '@/components/common/app-loading.vue'
import { mineApi, type FollowUserItem } from '@/lib/mine-data'
import SmartAvatar from '@/components/common/smart-avatar.vue'

const defaultAvatar = '/static/placeholder-avatar.png'

const activeTab = ref<'following' | 'followers'>('following')
const followingList = ref<FollowUserItem[]>([])
const followersList = ref<FollowUserItem[]>([])
const loading = ref(true)
const error = ref('')
const submittingId = ref<string | null>(null)

const currentList = computed(() => (activeTab.value === 'following' ? followingList.value : followersList.value))

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await mineApi.getFollowData()
    followingList.value = res.following
    followersList.value = res.followers
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// 用 onShow：从他人主页取关返回时重拉，避免关注列表陈旧（onShow 首次进入也会触发，等价初始加载）
onShow(fetchData)

async function toggleFollow(user: FollowUserItem) {
  if (submittingId.value) return
  submittingId.value = user.id
  const next = !user.isFollowing
  try {
    if (next) await mineApi.followUser(user.id)
    else await mineApi.unfollowUser(user.id)
    // 同步两个列表中同一用户的关注态
    for (const list of [followingList.value, followersList.value]) {
      const u = list.find((x) => x.id === user.id)
      if (u) u.isFollowing = next
    }
    // 关注列表：取关后从列表移除
    if (!next) {
      followingList.value = followingList.value.filter((x) => x.id !== user.id)
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submittingId.value = null
  }
}

function followBtnClass(u: FollowUserItem) {
  return u.isFollowing ? 'btn-muted' : 'btn-primary'
}
function followBtnText(u: FollowUserItem) {
  if (u.isFollowing && u.isFollowedBy) return '互相关注'
  if (u.isFollowing) return '已关注'
  return '关注'
}
function followBtnIcon(u: FollowUserItem) {
  if (u.isFollowing && u.isFollowedBy) return 'users'
  if (u.isFollowing) return 'user-check'
  return 'user-plus'
}
function followBtnIconColor(u: FollowUserItem) {
  return u.isFollowing ? '#999' : '#fff'
}

function goUser(id: string) {
  navigateTo(`/user/${id}`)
}
</script>

<style lang="scss" scoped>
.follows-page {
  /* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
  height: 100vh;
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
.follows-tab.active .tab-text { color: var(--brand); font-weight: 500; }
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
  background: var(--brand);
  border-radius: 999rpx;
}

.follows-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
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
.retry-btn { margin-top: 24rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 12rpx; }
.retry-btn-text { font-size: 26rpx; color: #fff; }
.follow-btn.disabled { opacity: 0.5; }

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
  background: var(--brand);
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
.btn-primary { background: var(--brand); }
.btn-primary .follow-btn-text { color: #fff; }
.btn-muted { background: #f4f4f5; }
.btn-muted .follow-btn-text { color: #999; }
</style>
