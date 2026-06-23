<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 顶栏 -->
    <view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tb-inner">
        <view class="tb-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2b2b2b" />
        </view>
        <text class="tb-title">对话历史</text>
        <view class="tb-placeholder" />
      </view>
    </view>

    <view class="body">
      <!-- 搜索 -->
      <view class="search-box">
        <app-icon name="search" :size="32" color="#999999" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="搜索对话"
          placeholder-class="search-ph"
        />
      </view>

      <!-- 空状态 -->
      <view v-if="filtered.length === 0" class="empty">
        <app-icon name="message-square" :size="96" color="#d8d8d8" />
        <text class="empty-txt">{{ search ? '未找到相关对话' : '暂无对话记录' }}</text>
      </view>

      <!-- 对话列表 -->
      <view v-else class="conv-list">
        <view
          v-for="conv in filtered"
          :key="conv.id"
          class="conv-card"
          @tap="goChat(conv)"
        >
          <view class="conv-avatar">
            <app-icon name="bot" :size="40" color="#c41e3a" />
          </view>
          <view class="conv-main">
            <view class="conv-row1">
              <view class="conv-name-wrap">
                <text class="conv-name">{{ conv.agentName }}</text>
                <text
                  class="conv-cat"
                  :style="{ background: catColor(conv.agentCategory).bg, color: catColor(conv.agentCategory).fg }"
                >{{ conv.agentCategory }}</text>
              </view>
              <text class="conv-time">{{ conv.lastTime }}</text>
            </view>
            <view class="conv-row2">
              <text class="conv-msg">{{ conv.lastMessage }}</text>
              <view class="conv-tail">
                <text v-if="conv.unread > 0" class="conv-unread">{{ conv.unread }}</text>
                <view class="conv-del" @tap.stop="remove(conv.id)">
                  <app-icon name="trash-2" :size="28" color="#bbbbbb" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { agentsSquareApi, type AgentConversation } from '@/lib/agents-square-data'

const loading = ref(true)
const error = ref('')
const statusBarHeight = ref(0)
const convs = ref<AgentConversation[]>([])
const search = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentsSquareApi.getConversations()
    convs.value = data || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

uni.getSystemInfo({
  success: (e) => {
    statusBarHeight.value = e.statusBarHeight || 0
  },
})

const filtered = computed(() =>
  convs.value.filter(
    (c) => c.agentName.includes(search.value) || c.lastMessage.includes(search.value),
  ),
)

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  八字命理: { bg: '#fdecec', fg: '#c0392b' },
  奇门遁甲: { bg: '#f3eafb', fg: '#7d3cb5' },
  紫微斗数: { bg: '#e9f1fd', fg: '#2563c9' },
  风水: { bg: '#e8f6ed', fg: '#1f9254' },
  易经: { bg: '#fdf4e3', fg: '#b8791a' },
}
function catColor(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: '#f0f0f0', fg: '#888888' }
}

function remove(id: string) {
  convs.value = convs.value.filter((c) => c.id !== id)
}

function goChat(conv: AgentConversation) {
  navigateTo(`/agent/${conv.id}`)
}

function goBack() {
  // #ifdef H5
  if (window.history.length > 1) {
    uni.navigateBack()
    return
  }
  // #endif
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pkg-agent/agents/index' })
}
</script>

<style scoped>
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: #c41e3a; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  border-bottom: 1rpx solid #ececec;
}
.tb-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}
.tb-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -12rpx;
}
.tb-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 600;
  color: #2b2b2b;
  margin-left: 8rpx;
}
.tb-placeholder {
  width: 44rpx;
}
.body {
  padding: 28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
}
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 999rpx;
  margin-bottom: 28rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #2b2b2b;
}
.search-ph {
  color: #aaaaaa;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 140rpx;
  gap: 20rpx;
}
.empty-txt {
  font-size: 26rpx;
  color: #999999;
}
.conv-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.conv-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
}
.conv-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.conv-main {
  flex: 1;
  min-width: 0;
}
.conv-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.conv-name-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.conv-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2b2b2b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-cat {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.conv-time {
  font-size: 20rpx;
  color: #aaaaaa;
  flex-shrink: 0;
}
.conv-row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.conv-msg {
  flex: 1;
  font-size: 24rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-tail {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}
.conv-unread {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  color: #ffffff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.conv-del {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
