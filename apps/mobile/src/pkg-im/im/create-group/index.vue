<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="back-btn" @tap="onBack">
        <AppIcon name="arrow-left" :size="40" color="#2c2c2c" />
      </view>
      <text class="nav-title">{{ step === 'select' ? '创建群聊' : '群聊设置' }}</text>
      <text v-if="step === 'select' && selected.length >= 2" class="nav-next" @tap="nextStep">下一步</text>
    </view>

    <!-- 步骤1：选择好友 -->
    <view v-if="step === 'select'" class="content-select">
      <!-- 搜索 -->
      <view class="search-wrap">
        <AppIcon name="search" :size="32" color="#999999" class="search-icon" />
        <input
          class="search-input"
          :value="search"
          placeholder="搜索好友"
          placeholder-class="search-ph"
          @input="(e: any) => search = e.detail.value"
        />
      </view>

      <!-- 已选 -->
      <view v-if="selected.length > 0" class="selected-block">
        <text class="selected-tip">已选 {{ selected.length }} 人（至少选 2 人）</text>
        <view class="selected-row">
          <view v-for="f in selectedFriends" :key="f.id" class="selected-avatar-wrap" @tap="toggle(f.id)">
            <image lazy-load class="selected-avatar" :src="f.avatar" mode="aspectFill" />
            <view class="selected-remove"><text class="selected-remove-text">×</text></view>
          </view>
        </view>
      </view>

      <!-- 好友列表 -->
      <view class="friend-list">
        <view v-for="friend in filtered" :key="friend.id" class="friend-item" @tap="toggle(friend.id)">
          <view class="checkbox" :class="{ 'checkbox-on': selected.includes(friend.id) }">
            <AppIcon v-if="selected.includes(friend.id)" name="check" :size="24" color="#ffffff" />
          </view>
          <image lazy-load class="friend-avatar" :src="friend.avatar" mode="aspectFill" />
          <view class="friend-body">
            <text class="friend-name">{{ friend.name }}</text>
            <text class="friend-bio">{{ friend.bio }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 步骤2：群聊设置 -->
    <view v-else class="content-name">
      <!-- 群头像 -->
      <view class="avatar-section">
        <view class="group-avatar">
          <AppIcon name="camera" :size="48" color="#999999" />
          <text class="group-avatar-text">群头像</text>
        </view>
        <view class="member-avatars">
          <image lazy-load v-for="f in selectedFriends" :key="f.id" class="member-avatar" :src="f.avatar" mode="aspectFill" />
        </view>
      </view>

      <!-- 群名称 -->
      <view class="name-block">
        <text class="name-label">群聊名称</text>
        <view class="name-input-wrap">
          <input
            class="name-input"
            :value="groupName"
            placeholder="设置群聊名称"
            placeholder-class="search-ph"
            maxlength="20"
            @input="(e: any) => groupName = e.detail.value"
          />
        </view>
        <text class="name-counter">{{ groupName.length }}/20</text>
      </view>

      <!-- 成员数 -->
      <view class="members-box">
        <AppIcon name="users" :size="32" color="#999999" />
        <text class="members-text">群成员：{{ selected.length + 1 }} 人（含自己）</text>
      </view>
    </view>

    <!-- 底部按钮：步骤2 创建 -->
    <view v-if="step === 'name'" class="footer">
      <view class="footer-btn" :class="{ 'btn-disabled': loading || !groupName.trim() }" @tap="create">
        <view v-if="loading" class="footer-loading">
          <view class="spin"><AppIcon name="loader-2" :size="32" color="#ffffff" /></view>
          <text class="footer-btn-text">创建中…</text>
        </view>
        <text v-else class="footer-btn-text">创建群聊</text>
      </view>
    </view>

    <!-- 底部按钮：步骤1 下一步 -->
    <view v-if="step === 'select' && selected.length >= 2" class="footer">
      <view class="footer-btn" @tap="nextStep">
        <text class="footer-btn-text">下一步（已选 {{ selected.length }} 人）</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

interface Friend {
  id: string
  name: string
  avatar: string
  bio: string
}

// @data-needs: 好友列表, 返回 Friend[]
const friends: Friend[] = [
  { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', bio: '八字命理' },
  { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', bio: '紫微斗数' },
  { id: '3', name: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', bio: '易经占卜' },
  { id: '4', name: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', bio: '风水堪舆' },
  { id: '5', name: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', bio: '奇门遁甲' },
  { id: '6', name: '陈梅花', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', bio: '梅花易数' },
]

const search = ref('')
const selected = ref<string[]>([])
const groupName = ref('')
const step = ref<'select' | 'name'>('select')
const loading = ref(false)

const filtered = computed(() =>
  friends.filter((f) => f.name.includes(search.value) || f.bio.includes(search.value)),
)
const selectedFriends = computed(() => friends.filter((f) => selected.value.includes(f.id)))

function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id]
}

function nextStep() {
  if (selected.value.length < 2) return
  const names = selectedFriends.value.map((f) => f.name).join('、')
  groupName.value = names.length > 15 ? names.slice(0, 15) + '…' : names
  step.value = 'name'
}

function onBack() {
  if (step.value === 'name') step.value = 'select'
  else goBack()
}

// @data-needs: 创建群聊, 参数 {name, memberIds}, 返回 {groupId}
async function create() {
  if (!groupName.value.trim() || loading.value) return
  loading.value = true
  await new Promise((r) => setTimeout(r, 1000))
  loading.value = false
  navigateTo('/im/conversations')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 24rpx;
  height: 96rpx;
  padding: 0 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.back-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-next {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--brand);
}

/* 步骤1 */
.content-select {
  padding: 32rpx 32rpx 192rpx;
}
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 72rpx;
  border: 2rpx solid #e8e0d5;
  border-radius: 12rpx;
  background: #ffffff;
  margin-bottom: 32rpx;
}
.search-icon {
  position: absolute;
  left: 24rpx;
}
.search-input {
  flex: 1;
  height: 72rpx;
  padding-left: 72rpx;
  padding-right: 24rpx;
  font-size: 32rpx;
  color: #2c2c2c;
  background: transparent;
}
.search-ph {
  color: #999999;
}

/* 已选 */
.selected-block {
  margin-bottom: 32rpx;
}
.selected-tip {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.selected-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.selected-avatar-wrap {
  position: relative;
}
.selected-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0ebe5;
}
.selected-remove {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.selected-remove-text {
  font-size: 20rpx;
  color: #ffffff;
  line-height: 1;
}

/* 好友列表 */
.friend-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.friend-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border: 2rpx solid #e8e0d5;
  border-radius: 24rpx;
  background: #ffffff;
}
.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 4rpx solid #e8e0d5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.checkbox-on {
  background: var(--brand);
  border-color: var(--brand);
}
.friend-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0ebe5;
  flex-shrink: 0;
}
.friend-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.friend-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.friend-bio {
  font-size: 24rpx;
  color: #999999;
}

/* 步骤2 */
.content-name {
  padding: 48rpx 32rpx 192rpx;
}
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.group-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  background: #f0ebe5;
  border: 4rpx dashed #e8e0d5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.group-avatar-text {
  font-size: 24rpx;
  color: #999999;
}
.member-avatars {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 480rpx;
}
.member-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f0ebe5;
}

/* 群名称 */
.name-block {
  margin-bottom: 48rpx;
}
.name-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 12rpx;
}
.name-input-wrap {
  height: 72rpx;
  border: 2rpx solid #e8e0d5;
  border-radius: 12rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
}
.name-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #2c2c2c;
  background: transparent;
}
.name-counter {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 成员数 */
.members-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(240, 235, 229, 0.3);
  border-radius: 24rpx;
}
.members-text {
  font-size: 28rpx;
  color: #999999;
}

/* 底部按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx 48rpx;
  background: #faf8f5;
  border-top: 2rpx solid #e8e0d5;
}
.footer-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 12rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-disabled {
  opacity: 0.5;
}
.footer-loading {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.footer-btn-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

/* loading 旋转 */
.spin {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
