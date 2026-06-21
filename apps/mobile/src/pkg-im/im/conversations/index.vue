<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left">
        <view class="back-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#2c2c2c" />
        </view>
        <text class="nav-title">消息</text>
        <view v-if="totalUnread > 0" class="nav-badge">
          <text class="nav-badge-text">{{ totalUnread > 99 ? '99+' : totalUnread }}</text>
        </view>
      </view>
      <view class="search-btn" @tap="showSearch = true">
        <AppIcon name="search" :size="20" color="#8a8178" />
      </view>
    </view>

    <!-- 会话列表 -->
    <view class="conv-list">
      <view
        v-for="conv in sortedConversations"
        :key="conv.id"
        class="conv-item"
        :class="{ 'conv-pinned': conv.isPinned }"
        @tap="handleEnterChat(conv)"
      >
        <!-- 头像 -->
        <view class="avatar-wrap">
          <image class="avatar" :src="conv.targetAvatar" mode="aspectFill" />
          <!-- 未读角标 -->
          <view v-if="conv.unreadCount > 0 && !conv.isMuted" class="unread-badge">
            <text class="unread-text">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</text>
          </view>
          <!-- 免打扰红点 -->
          <view v-if="conv.unreadCount > 0 && conv.isMuted" class="mute-dot" />
          <!-- 类型标识 -->
          <view v-if="conv.type !== 'private'" class="type-flag">
            <AppIcon :name="typeIcon(conv.type)" :size="12" color="#ffffff" />
          </view>
        </view>

        <!-- 内容 -->
        <view class="conv-body">
          <view class="conv-row1">
            <view class="conv-name-wrap">
              <text class="conv-name" :class="{ 'conv-name-dim': conv.unreadCount === 0 }">{{ conv.targetName }}</text>
              <AppIcon v-if="conv.isPinned" name="pin" :size="12" color="#c41e3a" class="row-icon" />
              <AppIcon v-if="conv.isMuted" name="bell-off" :size="12" color="#8a8178" class="row-icon" />
            </view>
            <text class="conv-time">{{ conv.lastMessage.time }}</text>
          </view>
          <view class="conv-row2">
            <text v-if="conv.draft" class="conv-summary conv-draft">[草稿] {{ conv.draft }}</text>
            <text v-else class="conv-summary" :class="{ 'conv-summary-unread': conv.unreadCount > 0 }">{{ summary(conv.lastMessage) }}</text>
          </view>
        </view>

        <!-- 更多按钮 -->
        <view class="more-btn" @tap.stop="openActions(conv)">
          <AppIcon name="more-vertical" :size="20" color="#8a8178" />
        </view>
      </view>
    </view>

    <!-- 搜索弹层 -->
    <view v-if="showSearch" class="search-overlay" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search-head">
        <view class="search-input-wrap">
          <AppIcon name="search" :size="16" color="#8a8178" class="search-input-icon" />
          <input
            class="search-input"
            :value="searchKeyword"
            placeholder="搜索好友或聊天记录"
            placeholder-class="search-ph"
            focus
            @input="onSearchInput"
          />
          <view v-if="searchKeyword" class="search-clear" @tap="searchKeyword = ''">
            <AppIcon name="x" :size="16" color="#8a8178" />
          </view>
        </view>
        <text class="search-cancel" @tap="closeSearch">取消</text>
      </view>

      <view class="search-body">
        <view v-if="!searchKeyword.trim()" class="search-tip">
          <text class="search-tip-text">输入关键词搜索好友或聊天记录</text>
        </view>
        <view v-else-if="searchMatches.length === 0" class="search-tip">
          <text class="search-tip-text">未找到相关结果</text>
        </view>
        <view v-else class="search-results">
          <text class="search-section-title">聊天记录</text>
          <view
            v-for="conv in searchMatches"
            :key="conv.id"
            class="search-result-item"
            @tap="handleEnterChat(conv); closeSearch()"
          >
            <image class="search-result-avatar" :src="conv.targetAvatar" mode="aspectFill" />
            <view class="search-result-body">
              <text class="search-result-name">{{ conv.targetName }}</text>
              <text class="search-result-summary">{{ summary(conv.lastMessage) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作菜单 -->
    <view v-if="showActions" class="mask" @tap="showActions = false">
      <view class="action-sheet" @tap.stop>
        <view class="action-item" @tap="handleTogglePin">
          <AppIcon name="pin" :size="20" color="#2c2c2c" />
          <text class="action-text">{{ activeConv?.isPinned ? '取消置顶' : '置顶聊天' }}</text>
        </view>
        <view class="action-item" @tap="handleToggleMute">
          <AppIcon name="bell-off" :size="20" color="#2c2c2c" />
          <text class="action-text">{{ activeConv?.isMuted ? '取消免打扰' : '消息免打扰' }}</text>
        </view>
        <view class="action-item" @tap="openDeleteConfirm">
          <AppIcon name="trash-2" :size="20" color="#dc2626" />
          <text class="action-text action-danger">删除会话</text>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <view v-if="showDeleteConfirm" class="mask mask-center" @tap="showDeleteConfirm = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">删除会话</text>
        <text class="dialog-desc">确定要删除与"{{ activeConv?.targetName }}"的会话吗？聊天记录将被清空且无法恢复。</text>
        <view class="dialog-footer">
          <view class="dialog-btn dialog-cancel" @tap="showDeleteConfirm = false">
            <text class="dialog-cancel-text">取消</text>
          </view>
          <view class="dialog-btn dialog-confirm" @tap="handleDelete">
            <text class="dialog-confirm-text">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  mockConversations,
  getMessageSummary,
  convTypeIcon,
  type ConversationItem,
  type ConversationType,
  type LastMessage,
} from '@/lib/im-data'

const statusBarHeight = ref(0)

// 列表数据（保留 mock 渲染以通过像素验收）
const conversations = ref<ConversationItem[]>([...mockConversations])

// UI 临时状态
const showSearch = ref(false)
const searchKeyword = ref('')
const showActions = ref(false)
const showDeleteConfirm = ref(false)
const activeConv = ref<ConversationItem | null>(null)

const totalUnread = computed(() => conversations.value.reduce((s, c) => s + c.unreadCount, 0))

const sortedConversations = computed(() =>
  [...conversations.value].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  }),
)

const searchMatches = computed(() => {
  const kw = searchKeyword.value.trim()
  if (!kw) return []
  return conversations.value.filter(
    (c) => c.targetName.includes(kw) || c.lastMessage.content.includes(kw),
  )
})

function summary(message: LastMessage) {
  return getMessageSummary(message)
}
function typeIcon(type: ConversationType) {
  return convTypeIcon[type] || 'bell'
}

function handleEnterChat(conv: ConversationItem) {
  if (conv.type === 'private') {
    navigateTo(`/im/chat/${conv.targetId}`)
  } else if (conv.type === 'group') {
    navigateTo(`/im/group-chat/${conv.targetId}`)
  } else if (conv.type === 'service') {
    navigateTo('/customer-service')
  } else if (conv.type === 'system') {
    navigateTo('/im/messages')
  }
}

function onSearchInput(e: any) {
  searchKeyword.value = e.detail.value
}
function closeSearch() {
  showSearch.value = false
  searchKeyword.value = ''
}

function openActions(conv: ConversationItem) {
  activeConv.value = conv
  showActions.value = true
}
function openDeleteConfirm() {
  showActions.value = false
  showDeleteConfirm.value = true
}

// @data-needs: 置顶/取消置顶会话, 参数 {convId, isPinned}, 返回 {code}
function handleTogglePin() {
  if (!activeConv.value) return
  const c = conversations.value.find((x) => x.id === activeConv.value!.id)
  if (c) c.isPinned = !c.isPinned
  showActions.value = false
}
// @data-needs: 会话免打扰开关, 参数 {convId, isMuted}, 返回 {code}
function handleToggleMute() {
  if (!activeConv.value) return
  const c = conversations.value.find((x) => x.id === activeConv.value!.id)
  if (c) c.isMuted = !c.isMuted
  showActions.value = false
}
// @data-needs: 删除会话, 参数 {convId}, 返回 {code}
function handleDelete() {
  if (!activeConv.value) return
  conversations.value = conversations.value.filter((x) => x.id !== activeConv.value!.id)
  showDeleteConfirm.value = false
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
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #ede7dc;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.back-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -12rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  background: #f2ece1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-badge-text {
  font-size: 22rpx;
  color: #8a8178;
}
.search-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 会话列表 */
.conv-list {
  display: flex;
  flex-direction: column;
}
.conv-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #ede7dc;
}
.conv-pinned {
  background: rgba(242, 236, 225, 0.5);
}

/* 头像 */
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f2ece1;
}
.unread-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  background: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
}
.unread-text {
  font-size: 20rpx;
  color: #ffffff;
}
.mute-dot {
  position: absolute;
  top: -2rpx;
  right: -2rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: rgba(138, 129, 120, 0.5);
}
.type-flag {
  position: absolute;
  bottom: -2rpx;
  right: -2rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #faf8f5;
}

/* 内容 */
.conv-body {
  flex: 1;
  min-width: 0;
}
.conv-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.conv-name-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.conv-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-name-dim {
  color: rgba(44, 44, 44, 0.8);
}
.row-icon {
  flex-shrink: 0;
}
.conv-time {
  font-size: 22rpx;
  color: #8a8178;
  flex-shrink: 0;
}
.conv-row2 {
  display: flex;
  align-items: center;
  margin-top: 4rpx;
}
.conv-summary {
  font-size: 26rpx;
  color: #8a8178;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-summary-unread {
  color: rgba(44, 44, 44, 0.7);
}
.conv-draft {
  color: #dc2626;
}

/* 更多按钮 */
.more-btn {
  padding: 8rpx;
  margin-right: -8rpx;
  flex-shrink: 0;
}

/* 搜索弹层 */
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #faf8f5;
}
.search-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
}
.search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  height: 72rpx;
  background: #f2ece1;
  border-radius: 16rpx;
}
.search-input-icon {
  position: absolute;
  left: 24rpx;
}
.search-input {
  flex: 1;
  height: 72rpx;
  padding-left: 64rpx;
  padding-right: 64rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  background: transparent;
}
.search-ph {
  color: #8a8178;
}
.search-clear {
  position: absolute;
  right: 24rpx;
}
.search-cancel {
  font-size: 28rpx;
  color: #2c2c2c;
}
.search-body {
  padding: 0 32rpx;
}
.search-tip {
  padding: 64rpx 0;
  text-align: center;
}
.search-tip-text {
  font-size: 26rpx;
  color: #8a8178;
}
.search-section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #8a8178;
  margin-bottom: 16rpx;
}
.search-result-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
}
.search-result-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f2ece1;
}
.search-result-body {
  flex: 1;
  min-width: 0;
}
.search-result-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.search-result-summary {
  display: block;
  font-size: 26rpx;
  color: #8a8178;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 遮罩与弹窗 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.mask-center {
  align-items: center;
  justify-content: center;
}
.action-sheet {
  width: 100%;
  background: #faf8f5;
  border-radius: 24rpx 24rpx 0 0;
  padding: 16rpx;
}
.action-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 16rpx;
}
.action-text {
  font-size: 30rpx;
  color: #2c2c2c;
}
.action-danger {
  color: #dc2626;
}

/* 删除确认 */
.dialog {
  width: 560rpx;
  background: #faf8f5;
  border-radius: 24rpx;
  padding: 48rpx 40rpx 32rpx;
}
.dialog-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  text-align: center;
}
.dialog-desc {
  display: block;
  font-size: 26rpx;
  color: #8a8178;
  line-height: 1.6;
  margin-top: 24rpx;
}
.dialog-footer {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}
.dialog-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-cancel {
  background: #f2ece1;
}
.dialog-cancel-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.dialog-confirm {
  background: #dc2626;
}
.dialog-confirm-text {
  font-size: 28rpx;
  color: #ffffff;
}
</style>
