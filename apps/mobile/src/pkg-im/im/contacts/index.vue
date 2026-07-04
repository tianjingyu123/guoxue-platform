<template>
  <view v-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-btn nav-btn-left" @tap="onBack">
        <AppIcon name="arrow-left" :size="40" color="#2c2c2c" />
      </view>
      <text class="nav-title">通讯录</text>
      <view class="nav-actions">
        <view class="nav-btn" @tap="showSearch = true">
          <AppIcon name="search" :size="40" color="#2c2c2c" />
        </view>
        <view class="nav-btn" @tap="goAddFriend">
          <AppIcon name="user-plus" :size="40" color="#2c2c2c" />
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <view class="main">
      <!-- 骨架屏 -->
      <view v-if="loading" class="skeleton">
        <view v-for="i in 8" :key="i" class="skeleton-item">
          <view class="skeleton-avatar" />
          <view class="skeleton-lines">
            <view class="skeleton-line skeleton-line-1" />
            <view class="skeleton-line skeleton-line-2" />
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-else-if="groups.length === 0" class="empty">
        <text class="empty-title">暂无好友</text>
        <text class="empty-desc">快去添加好友吧</text>
      </view>

      <!-- 好友列表 -->
      <scroll-view
        v-else
        class="friend-scroll"
        scroll-y
        :scroll-into-view="scrollTarget"
        scroll-with-animation
      >
        <view v-for="group in groups" :id="'letter-' + group.letter" :key="group.letter">
          <view class="letter-header">
            <text class="letter-text">{{ group.letter }}</text>
          </view>
          <view class="group-body">
            <view
              v-for="friend in group.friends"
              :key="friend.id"
              class="friend-item"
              @tap="selectedFriend = friend"
            >
              <view class="friend-avatar-wrap">
                <image lazy-load class="friend-avatar" :src="friend.avatar" mode="aspectFill" />
                <view v-if="friend.isOnline" class="online-dot" />
              </view>
              <view class="friend-body">
                <view class="friend-name-row">
                  <text class="friend-name">{{ friend.remark || friend.nickname }}</text>
                  <text v-if="friend.remark" class="friend-nickname">({{ friend.nickname }})</text>
                </view>
                <text v-if="friend.signature" class="friend-sub">{{ friend.signature }}</text>
                <text v-else-if="friend.lastActiveAt && !friend.isOnline" class="friend-sub friend-sub-sm">{{ friend.lastActiveAt }}活跃</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 右侧字母索引条 -->
      <view v-if="letterList.length > 0" class="letter-index">
        <view
          v-for="(letter, index) in letterList"
          :key="letter"
          class="letter-index-item"
          :class="{ 'letter-index-active': activeLetterIndex === index }"
          @tap="scrollToLetter(letter, index)"
        >
          <text class="letter-index-text">{{ letter }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索弹层 -->
    <view v-if="showSearch" class="search-overlay">
      <view class="search-header">
        <text class="search-title">搜索好友</text>
        <view class="search-close" @tap="closeSearch">
          <AppIcon name="x" :size="40" color="#2c2c2c" />
        </view>
      </view>
      <view class="search-body">
        <view class="search-input-wrap">
          <AppIcon name="search" :size="32" color="#999999" class="search-input-icon" />
          <input
            class="search-input"
            :value="searchKeyword"
            placeholder="搜索昵称、备注"
            placeholder-class="ph"
            :focus="showSearch"
            @input="(e: any) => onSearchInput(e)"
          />
          <view v-if="searchKeyword" class="search-clear" @tap="clearSearch">
            <AppIcon name="x" :size="28" color="#999999" />
          </view>
        </view>

        <view class="search-results">
          <!-- 搜索中骨架 -->
          <view v-if="isSearching" class="search-skeleton">
            <view v-for="i in 3" :key="i" class="search-skeleton-item">
              <view class="search-skeleton-avatar" />
              <view class="search-skeleton-line" />
            </view>
          </view>
          <!-- 有结果 -->
          <view v-else-if="searchKeyword && searchResults.length > 0" class="search-list">
            <view
              v-for="friend in searchResults"
              :key="friend.id"
              class="friend-item"
              @tap="selectedFriend = friend"
            >
              <view class="friend-avatar-wrap">
                <image lazy-load class="friend-avatar" :src="friend.avatar" mode="aspectFill" />
                <view v-if="friend.isOnline" class="online-dot" />
              </view>
              <view class="friend-body">
                <view class="friend-name-row">
                  <text class="friend-name">{{ friend.remark || friend.nickname }}</text>
                  <text v-if="friend.remark" class="friend-nickname">({{ friend.nickname }})</text>
                </view>
                <text v-if="friend.signature" class="friend-sub">{{ friend.signature }}</text>
                <text v-else-if="friend.lastActiveAt && !friend.isOnline" class="friend-sub friend-sub-sm">{{ friend.lastActiveAt }}活跃</text>
              </view>
            </view>
          </view>
          <!-- 无结果 -->
          <view v-else-if="searchKeyword" class="search-empty">
            <text class="search-empty-text">未找到相关好友</text>
          </view>
          <!-- 未输入 -->
          <view v-else class="search-empty">
            <text class="search-empty-text">输入关键词搜索好友</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 好友操作弹窗 -->
    <view v-if="selectedFriend" class="mask" @tap="selectedFriend = null">
      <view class="action-sheet" @tap.stop>
        <view class="action-friend">
          <view class="action-avatar-wrap">
            <image lazy-load class="action-avatar" :src="selectedFriend.avatar" mode="aspectFill" />
            <view v-if="selectedFriend.isOnline" class="action-online-dot" />
          </view>
          <view class="action-info">
            <text class="action-name">{{ selectedFriend.remark || selectedFriend.nickname }}</text>
            <text v-if="selectedFriend.remark" class="action-sub">昵称: {{ selectedFriend.nickname }}</text>
            <text v-if="selectedFriend.signature" class="action-sub">{{ selectedFriend.signature }}</text>
            <text class="action-status" :class="{ 'action-status-online': selectedFriend.isOnline }">
              {{ selectedFriend.isOnline ? '在线' : selectedFriend.lastActiveAt ? selectedFriend.lastActiveAt + '活跃' : '离线' }}
            </text>
          </view>
        </view>
        <view class="action-buttons">
          <view class="action-btn action-btn-primary" @tap="friendAction('chat')">
            <AppIcon name="message-circle" :size="32" color="#ffffff" />
            <text class="action-btn-text action-btn-text-primary">发消息</text>
          </view>
          <view class="action-btn action-btn-outline" @tap="friendAction('profile')">
            <AppIcon name="user" :size="32" color="#2c2c2c" />
            <text class="action-btn-text">查看主页</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  imApi,
  groupFriendsByLetter,
  searchFriends,
  getLetterIndexList,
  type FriendItem,
  type FriendGroup,
} from '@/lib/im-data'

const loading = ref(true)
const error = ref('')
const allFriends = ref<FriendItem[]>([])
const groups = ref<FriendGroup[]>([])
const letterList = ref<string[]>([])
const searchKeyword = ref('')
const searchResults = ref<FriendItem[]>([])
const isSearching = ref(false)
const showSearch = ref(false)
const selectedFriend = ref<FriendItem | null>(null)
const activeLetterIndex = ref(0)
const scrollTarget = ref('')

// @data-needs: 加载好友列表, 返回 FriendItem[]
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const friends = await imApi.getFriends()
    allFriends.value = friends
    const grouped = groupFriendsByLetter(friends)
    groups.value = grouped
    letterList.value = getLetterIndexList(grouped)
  } catch (e) {
    error.value = (e as Error)?.message || '加载好友列表失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

function onBack() {
  goBack()
}

function goAddFriend() {
  navigateTo('/im/add-friend')
}

function scrollToLetter(letter: string, index: number) {
  activeLetterIndex.value = index
  scrollTarget.value = 'letter-' + letter
}

// @data-needs: 搜索好友, 参数 keyword, 返回 FriendItem[]
function onSearchInput(e: { detail: { value: string } }) {
  const keyword = e.detail.value
  searchKeyword.value = keyword
  if (!keyword.trim()) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  setTimeout(() => {
    searchResults.value = searchFriends(allFriends.value, keyword)
    isSearching.value = false
  }, 200)
}

function clearSearch() {
  searchKeyword.value = ''
  searchResults.value = []
}

function closeSearch() {
  showSearch.value = false
  clearSearch()
}

function friendAction(action: 'chat' | 'profile') {
  if (!selectedFriend.value) return
  const id = selectedFriend.value.id
  if (action === 'chat') {
    navigateTo(`/im/chat/${id}`)
  } else {
    navigateTo(`/user/${id}`)
  }
  selectedFriend.value = null
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #faf8f5;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-btn-left {
  margin-left: -16rpx;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* 主内容 */
.main {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.friend-scroll {
  height: calc(100vh - 112rpx);
  padding-right: 48rpx;
  box-sizing: border-box;
}

/* 字母头 */
.letter-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12rpx 32rpx;
  background: rgba(240, 235, 229, 0.8);
  backdrop-filter: blur(8rpx);
}
.letter-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.group-body {
  padding: 0 16rpx;
}

/* 好友项 */
.friend-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
}
.friend-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.friend-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f0ebe5;
}
.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24rpx;
  height: 24rpx;
  background: #22c55e;
  border-radius: 50%;
  border: 4rpx solid #faf8f5;
}
.friend-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.friend-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.friend-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.friend-nickname {
  font-size: 24rpx;
  color: #999999;
  flex-shrink: 0;
}
.friend-sub {
  font-size: 28rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.friend-sub-sm {
  font-size: 24rpx;
}

/* 右侧字母索引 */
.letter-index {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0;
}
.letter-index-item {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.letter-index-text {
  font-size: 20rpx;
  font-weight: 500;
  color: #999999;
}
.letter-index-active {
  background: rgba(196, 30, 58, 0.1);
  border-radius: 50%;
}
.letter-index-active .letter-index-text {
  color: var(--brand);
}

/* 骨架屏 */
.skeleton {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.skeleton-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.skeleton-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f0ebe5;
}
.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.skeleton-line {
  height: 28rpx;
  border-radius: 8rpx;
  background: #f0ebe5;
}
.skeleton-line-1 {
  width: 192rpx;
}
.skeleton-line-2 {
  width: 256rpx;
  height: 24rpx;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 160rpx;
  gap: 16rpx;
}
.empty-title {
  font-size: 30rpx;
  color: #2c2c2c;
}
.empty-desc {
  font-size: 26rpx;
  color: #999999;
}

/* 搜索弹层 */
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
}
.search-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.search-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-body {
  flex: 1;
  padding: 0 32rpx;
}
.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 72rpx;
  border: 2rpx solid #e8e0d5;
  border-radius: 12rpx;
  background: #ffffff;
}
.search-input-icon {
  position: absolute;
  left: 24rpx;
}
.search-input {
  flex: 1;
  height: 72rpx;
  padding-left: 72rpx;
  padding-right: 72rpx;
  font-size: 32rpx;
  color: #2c2c2c;
  background: transparent;
}
.ph {
  color: #999999;
}
.search-clear {
  position: absolute;
  right: 24rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-results {
  margin-top: 32rpx;
}
.search-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.search-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.search-skeleton-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.search-skeleton-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0ebe5;
}
.search-skeleton-line {
  width: 192rpx;
  height: 28rpx;
  border-radius: 8rpx;
  background: #f0ebe5;
}
.search-empty {
  padding: 64rpx 0;
  text-align: center;
}
.search-empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 好友操作弹窗 */
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.action-sheet {
  width: 100%;
  background: #faf8f5;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: 48rpx;
}
.action-friend {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx 0;
}
.action-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.action-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #f0ebe5;
}
.action-online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32rpx;
  height: 32rpx;
  background: #22c55e;
  border-radius: 50%;
  border: 4rpx solid #faf8f5;
}
.action-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.action-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.action-sub {
  font-size: 28rpx;
  color: #999999;
}
.action-status {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.action-status-online {
  color: #22c55e;
}
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding-bottom: 8rpx;
}
.action-btn {
  height: 80rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.action-btn-primary {
  background: var(--brand);
}
.action-btn-outline {
  background: transparent;
  border: 2rpx solid #e8e0d5;
}
.action-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.action-btn-text-primary {
  color: #ffffff;
}

/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
