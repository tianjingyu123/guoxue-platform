<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-row">
        <view class="header-left">
          <text class="back-btn" @click="goBack">←</text>
          <text class="header-title">附近的人</text>
        </view>
        <view class="header-right">
          <text class="header-btn" :class="{ spinning: refreshing }" @click="loadUsers(true)">🔄</text>
          <text class="header-btn" @click="showSettings = true">⚙</text>
        </view>
      </view>
      <!-- 搜索框 -->
      <view class="search-wrap">
        <text class="search-icon">🔍</text>
        <input v-model="searchKeyword" class="search-input" placeholder="搜索用户名、兴趣..." />
      </view>
      <!-- 类型筛选 -->
      <scroll-view scroll-x class="type-scroll" show-scrollbar="false">
        <view class="type-inner">
          <text
            v-for="t in userTypes"
            :key="t.value"
            class="type-tab"
            :class="{ active: selectedType === t.value }"
            @click="selectedType = t.value; loadUsers()"
          >{{ t.icon }} {{ t.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 用户列表 -->
    <DataState
      :is-loading="loading && users.length === 0"
      :isEmpty="!loading && filteredUsers.length === 0"
      empty-icon="📍"
      :empty-title="searchKeyword ? '没有找到匹配的用户' : '附近暂无用户'"
      skeleton-type="card"
      @retry="loadUsers"
    >
      <view class="user-list">
        <view v-for="user in filteredUsers" :key="user.id" class="user-card">
          <view class="user-card-inner">
            <!-- 头像 -->
            <view class="user-avatar-wrap" @click="goUser(user)">
              <image :src="user.avatar" class="user-avatar" mode="aspectFill" />
              <view v-if="user.isOnline" class="online-dot" />
            </view>
            <!-- 信息 -->
            <view class="user-info">
              <view class="user-name-row">
                <text class="user-name" @click="goUser(user)">{{ user.name }}</text>
                <text v-if="user.verified" class="verified-badge">✅</text>
                <text class="user-type-tag" :class="'type-' + user.type">{{ getUserTypeLabel(user.type) }}</text>
              </view>
              <text v-if="user.verifiedTitle" class="user-verified-title">{{ user.verifiedTitle }}</text>
              <text v-if="user.bio" class="user-bio">{{ user.bio }}</text>
              <view class="user-tags">
                <text v-for="interest in user.commonInterests" :key="interest" class="tag tag-primary">{{ interest }}</text>
                <text v-for="interest in (user.interests || []).filter((i: string) => !(user.commonInterests || []).includes(i)).slice(0, 2)" :key="interest" class="tag tag-muted">{{ interest }}</text>
              </view>
              <view class="user-footer">
                <view class="user-meta">
                  <text>📍 {{ formatUserDistance(user.distance, user.showExactDistance) }}</text>
                  <text>{{ user.followerCount }} 粉丝</text>
                  <text v-if="user.lastActiveAt">{{ user.lastActiveAt }}</text>
                </view>
                <view class="user-actions">
                  <text class="action-chat" @click="goChat(user)">💬</text>
                  <text
                    class="action-follow"
                    :class="{ following: followingIds.has(user.id) }"
                    @click="handleToggleFollow(user.id)"
                  >{{ followingIds.has(user.id) ? (user.isMutual ? '互关' : '已关注') : '+ 关注' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 隐私设置弹窗 -->
    <view v-if="showSettings && privacySetting" class="mask" @click="showSettings = false">
      <view class="settings-sheet" @click.stop>
        <view class="settings-header">
          <text class="settings-title">位置隐私设置</text>
          <text @click="showSettings = false" class="settings-close">关闭</text>
        </view>
        <view class="settings-body">
          <view class="setting-row">
            <view class="setting-left">
              <text class="setting-icon">👁</text>
              <view>
                <text class="setting-label">对附近的人可见</text>
                <text class="setting-desc">开启后，附近的人可以发现你</text>
              </view>
            </view>
            <view class="toggle" :class="{ active: privacySetting.visibleToNearby }" @click="privacySetting.visibleToNearby = !privacySetting.visibleToNearby">
              <view class="toggle-knob" />
            </view>
          </view>
          <view class="setting-block">
            <text class="setting-label">距离显示精度</text>
            <view class="btn-group">
              <text
                class="btn-option"
                :class="{ active: privacySetting.distancePrecision === 'fuzzy' }"
                @click="privacySetting.distancePrecision = 'fuzzy'"
              >模糊（推荐）</text>
              <text
                class="btn-option"
                :class="{ active: privacySetting.distancePrecision === 'exact' }"
                @click="privacySetting.distancePrecision = 'exact'"
              >精确</text>
            </view>
            <text class="setting-hint">模糊模式下，1km内统一显示"附近"</text>
          </view>
          <view class="setting-block">
            <text class="setting-label">可见范围</text>
            <view class="btn-group">
              <text
                v-for="range in visibleRanges"
                :key="range"
                class="btn-option"
                :class="{ active: privacySetting.visibleRange === range }"
                @click="privacySetting.visibleRange = range"
              >{{ range }}km</text>
            </view>
            <text class="setting-hint">只有在此范围内的用户才能看到你</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { sameCityApi, interactApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface NearbyUser {
  id: number
  name: string
  avatar: string
  type: string
  bio?: string
  verified?: boolean
  verifiedTitle?: string
  isOnline?: boolean
  isFollowing?: boolean
  isMutual?: boolean
  followerCount: number
  distance: number
  showExactDistance?: boolean
  lastActiveAt?: string
  interests: string[]
  commonInterests?: string[]
}

const userTypes = [
  { value: 'all', label: '全部', icon: '👥' },
  { value: 'enthusiast', label: '爱好者', icon: '👥' },
  { value: 'teacher', label: '老师', icon: '🎓' },
  { value: 'inheritor', label: '传承人', icon: '🏆' },
]

const visibleRanges = [1, 3, 5, 10, 20]

const users = ref<NearbyUser[]>([])
const loading = ref(false)
const refreshing = ref(false)
const selectedType = ref('all')
const searchKeyword = ref('')
const showSettings = ref(false)
const followingIds = ref<Set<number>>(new Set())
const userLocation = ref<{ lat: number; lng: number }>({ lat: 39.9087, lng: 116.4716 })
const privacySetting = ref({
  visibleToNearby: true,
  distancePrecision: 'fuzzy',
  visibleRange: 5,
})

onMounted(() => {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      userLocation.value = { lat: res.latitude, lng: res.longitude }
    },
    fail: () => {
      console.error('获取位置失败，使用默认坐标')
    },
    complete: () => {
      loadUsers()
    },
  })
})

const filteredUsers = computed(() => {
  if (!searchKeyword.value) return users.value
  const kw = searchKeyword.value.toLowerCase()
  return users.value.filter((u: NearbyUser) =>
    u.name.toLowerCase().includes(kw) ||
    u.bio?.toLowerCase().includes(kw) ||
    (u.interests || []).some((i: string) => i.toLowerCase().includes(kw))
  )
})

async function loadUsers(showRefresh = false) {
  if (showRefresh) refreshing.value = true
  else loading.value = true
  try {
    const loc = userLocation.value || { lat: 39.9087, lng: 116.4716 }
    const res: any = await sameCityApi.nearbyUsers({
      lat: loc.lat,
      lng: loc.lng,
      type: selectedType.value === 'all' ? undefined : selectedType.value,
      radius: 5000,
    })
    const list = Array.isArray(res) ? res : res?.list || res?.data || []
    users.value = list
    const following = new Set<number>(
      list.filter((u: NearbyUser) => u.isFollowing).map((u: NearbyUser) => u.id)
    )
    followingIds.value = following
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function handleToggleFollow(userId: number) {
  try {
    await interactApi.toggleFollow(String(userId))
    const newSet = new Set(followingIds.value)
    if (newSet.has(userId)) {
      newSet.delete(userId)
    } else {
      newSet.add(userId)
    }
    followingIds.value = newSet
  } catch (e: any) {
    console.error(e)
  }
}

function goUser(user: NearbyUser) {
  uni.navigateTo({ url: `/pages/user/profile?id=${user.id}` })
}

function goChat(user: NearbyUser) {
  uni.navigateTo({ url: `/pages/im/chat?userId=${user.id}` })
}

function goBack() {
  uni.navigateBack()
}

function getUserTypeLabel(type: string): string {
  const map: Record<string, string> = {
    enthusiast: '爱好者',
    teacher: '老师',
    inheritor: '传承人',
  }
  return map[type] || type
}

function formatUserDistance(dist?: number, showExact?: boolean): string {
  if (dist === undefined || dist === null) return ''
  if (!showExact && dist < 1) return '附近'
  if (dist < 1) return `${Math.round(dist * 1000)}m`
  return `${dist.toFixed(1)}km`
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}
.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 24rpx 0;
}
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 36rpx; padding: 4rpx; margin-left: -8rpx; }
.header-title { font-size: 32rpx; font-weight: 600; }
.header-right { display: flex; gap: 8rpx; }
.header-btn { font-size: 32rpx; padding: 8rpx; color: #666; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.search-wrap {
  position: relative;
  margin: 16rpx 24rpx;
}
.search-icon {
  position: absolute;
  left: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28rpx;
}
.search-input {
  width: 100%;
  height: 64rpx;
  background: #F5F0E8;
  border-radius: 32rpx;
  padding-left: 60rpx;
  font-size: 26rpx;
  border: none;
  box-sizing: border-box;
}

.type-scroll {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.type-inner { display: inline-flex; gap: 12rpx; }
.type-tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #666;
  padding: 10rpx 24rpx;
  border-radius: 28rpx;
  background: #F5F0E8;
  border: 1rpx solid #E8E0D5;
}
.type-tab.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-color: #C41E3A;
}

.user-list { padding: 20rpx 24rpx; }
.user-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #E5E1DB;
}
.user-card-inner { display: flex; gap: 16rpx; }
.user-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.user-avatar { width: 84rpx; height: 84rpx; border-radius: 50%; }
.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20rpx;
  height: 20rpx;
  background: #2ecc71;
  border: 4rpx solid #fff;
  border-radius: 50%;
}
.user-info { flex: 1; min-width: 0; }
.user-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.user-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.verified-badge { font-size: 24rpx; flex-shrink: 0; }
.user-type-tag { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; flex-shrink: 0; }
.type-teacher { background: rgba(196,30,58,0.1); color: #C41E3A; }
.type-inheritor { background: rgba(201,169,110,0.15); color: #C9A96E; }
.type-enthusiast { background: #F5F0E8; color: #666; }
.user-verified-title { font-size: 22rpx; color: #C41E3A; display: block; margin-bottom: 4rpx; }
.user-bio { font-size: 24rpx; color: #666; display: block; margin-bottom: 12rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.user-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 12rpx; }
.tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 20rpx; }
.tag-primary { background: rgba(196,30,58,0.1); color: #C41E3A; }
.tag-muted { background: #F5F0E8; color: #666; }
.user-footer { display: flex; justify-content: space-between; align-items: center; }
.user-meta { display: flex; gap: 16rpx; font-size: 22rpx; color: #999; align-items: center; flex-wrap: wrap; }
.user-actions { display: flex; align-items: center; gap: 12rpx; }
.action-chat { font-size: 28rpx; }
.action-follow {
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  font-weight: 500;
}
.action-follow.following {
  background: #F5F0E8;
  color: #666;
  border: 1rpx solid #E5E1DB;
}

/* 设置弹窗 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.5);
}
.settings-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  overflow-y: auto;
}
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #E5E1DB;
}
.settings-title { font-weight: 600; font-size: 28rpx; }
.settings-close { font-size: 26rpx; color: #999; }
.settings-body { padding: 24rpx 32rpx 40rpx; }
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #E5E1DB;
}
.setting-left { display: flex; align-items: center; gap: 16rpx; }
.setting-icon { font-size: 32rpx; }
.setting-label { font-size: 26rpx; font-weight: 500; display: block; }
.setting-desc { font-size: 22rpx; color: #999; }
.setting-block { padding: 24rpx 0; border-bottom: 1rpx solid #E5E1DB; }
.setting-hint { font-size: 20rpx; color: #999; display: block; margin-top: 12rpx; }
.toggle {
  width: 80rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background: #ddd;
  position: relative;
  transition: background 0.2s;
}
.toggle.active { background: #C41E3A; }
.toggle-knob {
  position: absolute;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #fff;
  top: 4rpx;
  left: 4rpx;
  transition: left 0.2s;
}
.toggle.active .toggle-knob { left: 40rpx; }
.btn-group { display: flex; gap: 12rpx; margin-top: 12rpx; flex-wrap: wrap; }
.btn-option {
  flex: 1;
  text-align: center;
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  background: #F5F0E8;
  color: #666;
  min-width: 100rpx;
}
.btn-option.active { background: #C41E3A; color: #fff; }
</style>
