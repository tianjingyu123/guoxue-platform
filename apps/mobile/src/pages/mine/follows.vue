<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">←</text>
        <text class="header-title">关注与粉丝</text>
        <view class="header-right" />
      </view>

      <!-- Tabs -->
      <view class="tabs">
        <view class="tab" :class="{ active: activeTab === 'following' }" @click="switchTab('following')">
          <text>关注</text>
          <text class="tab-count">{{ followingCount }}</text>
          <view v-if="activeTab === 'following'" class="tab-indicator" />
        </view>
        <view class="tab" :class="{ active: activeTab === 'followers' }" @click="switchTab('followers')">
          <text>粉丝</text>
          <text class="tab-count">{{ followersCount }}</text>
          <view v-if="activeTab === 'followers'" class="tab-indicator" />
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && currentList.length === 0"
      :empty-icon="activeTab === 'following' ? '👥' : '👤'"
      :empty-title="activeTab === 'following' ? '暂无关注' : '暂无粉丝'"
      :empty-description="activeTab === 'following' ? '去发现更多感兴趣的人吧' : '分享优质内容吸引更多关注'"
      skeleton-type="list"
      @retry="loadData"
    >
      <view class="user-list">
        <view v-for="user in currentList" :key="user.id" class="user-item">
          <image v-if="user.avatar" :src="user.avatar" class="user-avatar" mode="aspectFill" />
          <view v-else class="user-avatar-placeholder">
            <text class="user-avatar-text">{{ (user.name || '?').slice(0, 1) }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.name }}</text>
            <text class="user-bio">{{ user.bio || user.followers + ' 粉丝' }}</text>
          </view>
          <view
            class="follow-btn"
            :class="followBtnClass(user)"
            @click="handleToggleFollow(user)"
          >
            <text v-if="user.isFollowing && user.isFollowedBy">👥 互相关注</text>
            <text v-else-if="user.isFollowing">👤 已关注</text>
            <text v-else>＋ 关注</text>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataState from '../../components/DataState.vue'

interface FollowUser {
  id: string
  name: string
  avatar?: string
  bio?: string
  followers: number
  isFollowing: boolean
  isFollowedBy: boolean
}

const activeTab = ref<'following' | 'followers'>('following')
const followingList = ref<FollowUser[]>([])
const followersList = ref<FollowUser[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const followingCount = ref(0)
const followersCount = ref(0)

const currentList = computed(() => activeTab.value === 'following' ? followingList.value : followersList.value)

function followBtnClass(user: FollowUser) {
  if (user.isFollowing) return 'followed'
  return 'not-followed'
}

function switchTab(tab: 'following' | 'followers') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  loadData()
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    followingList.value = [
      { id: '1', name: '易学大师王老师', avatar: '', bio: '专注易经研究30年，擅长八字命理与风水布局', followers: 12580, isFollowing: true, isFollowedBy: true },
      { id: '2', name: '道法自然', avatar: '', bio: '传播传统文化，弘扬国学智慧', followers: 8920, isFollowing: true, isFollowedBy: false },
      { id: '3', name: '玄学研究院', avatar: '', bio: '专业玄学研究机构官方账号', followers: 45600, isFollowing: true, isFollowedBy: true },
      { id: '4', name: '风水师李明', avatar: '', bio: '阳宅风水、办公室布局、家居环境优化', followers: 6780, isFollowing: true, isFollowedBy: false },
      { id: '5', name: '命理学堂', avatar: '', bio: '八字命理入门到精通，系统学习命理知识', followers: 23400, isFollowing: true, isFollowedBy: true },
    ]
    followersList.value = [
      { id: '6', name: '学习者小王', avatar: '', bio: '国学爱好者，正在学习易经', followers: 128, isFollowing: false, isFollowedBy: true },
      { id: '7', name: '传统文化粉', avatar: '', bio: '热爱传统文化', followers: 256, isFollowing: true, isFollowedBy: true },
      { id: '8', name: '易学初学者', avatar: '', bio: '刚开始接触易学，求指导', followers: 45, isFollowing: false, isFollowedBy: true },
      { id: '9', name: '风水研究者', avatar: '', bio: '从事风水研究5年', followers: 890, isFollowing: true, isFollowedBy: true },
      { id: '10', name: '命理爱好者', avatar: '', bio: '对八字命理很感兴趣', followers: 320, isFollowing: false, isFollowedBy: true },
    ]
    followingCount.value = followingList.value.length
    followersCount.value = followersList.value.length
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleToggleFollow(user: FollowUser) {
  user.isFollowing = !user.isFollowing
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

.tabs { display: flex; border-top: 1rpx solid #E8E3DB; }
.tab { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #666; position: relative; gap: 8rpx; }
.tab.active { color: #C41E3A; font-weight: 500; }
.tab-count { font-size: 20rpx; background: #F5F0E8; padding: 2rpx 14rpx; border-radius: 20rpx; color: #999; }
.tab.active .tab-count { background: #FDE8E8; color: #C41E3A; }
.tab-indicator { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60rpx; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }

.user-list { padding: 16rpx 24rpx; }
.user-item { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.user-item:last-child { border-bottom: none; }
.user-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; }
.user-avatar-placeholder { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-avatar-text { font-size: 28rpx; color: #C9A96E; font-weight: 500; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.user-bio { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.follow-btn { padding: 12rpx 24rpx; border-radius: 28rpx; font-size: 22rpx; font-weight: 500; flex-shrink: 0; }
.follow-btn.followed { background: #F5F0E8; color: #666; }
.follow-btn.not-followed { background: #C41E3A; color: #fff; }
</style>
