<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { agentApi, historyGroups, type HistoryItem } from '@/lib/agent-data'

const loading = ref(true)
const error = ref('')
const history = ref<HistoryItem[]>([])
const searchQuery = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentApi.getHistory()
    history.value = data || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

const filteredHistory = computed(() =>
  history.value.filter(
    (item) => item.agentName.includes(searchQuery.value) || item.lastMessage.includes(searchQuery.value),
  ),
)

function groupItems(group: string) {
  return filteredHistory.value.filter((item) => item.timeGroup === group)
}

function openChat(item: HistoryItem) {
  // 带 botConfigId + conversationId 进入对话页续聊（后端按 conversationId 续接 Coze 会话）
  navigateTo(`/agent/${item.botConfigId}?conversationId=${encodeURIComponent(item.conversationId)}`)
}
</script>

<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="header safe-pt">
      <view class="head-bar">
        <view class="back" @tap="goBack()"><AppIcon name="arrow-left" :size="40" color="#1a1a1a" /></view>
        <text class="title">对话历史</text>
        <view class="head-placeholder" />
      </view>
      <!-- 搜索栏 -->
      <view class="search-wrap">
        <view class="search-box">
          <AppIcon name="search" :size="28" color="#999" />
          <input v-model="searchQuery" class="search-input" placeholder="搜索对话内容..." />
          <view v-if="searchQuery" class="clear-search" @tap="searchQuery = ''"><AppIcon name="x" :size="24" color="#999" /></view>
        </view>
      </view>
    </view>

    <!-- 对话列表 -->
    <scroll-view scroll-y class="list-area">
      <template v-if="filteredHistory.length > 0">
        <view v-for="group in historyGroups" :key="group">
          <template v-if="groupItems(group).length > 0">
            <view class="group-title"><text class="group-label">{{ group }}</text></view>
            <view
              v-for="item in groupItems(group)"
              :key="item.id"
              class="swipe-wrap"
            >
              <!-- 卡片 -->
              <view class="row" @tap="openChat(item)">
                <view class="avatar-wrap">
                  <image lazy-load class="avatar" :src="item.agentAvatar" mode="aspectFill" />
                  <view v-if="item.unread > 0" class="unread"><text class="unread-txt">{{ item.unread }}</text></view>
                </view>
                <view class="row-info">
                  <view class="row-top">
                    <text class="agent-name">{{ item.agentName }}</text>
                    <text class="type-badge" :class="item.isFree ? 'badge-free' : 'badge-paid'">{{ item.agentType }}</text>
                  </view>
                  <text class="last-msg">{{ item.lastMessage }}</text>
                </view>
                <text class="row-time">{{ item.time }}</text>
              </view>
            </view>
          </template>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else-if="history.length === 0" class="empty">
        <view class="empty-icon"><AppIcon name="sparkles" :size="56" color="#c9a96e" /></view>
        <text class="empty-title">暂无对话记录</text>
        <text class="empty-desc">去智能体广场探索各类AI助手，开启你的国学之旅</text>
        <view class="empty-btn" @tap="navigateTo('/pkg-circle/circles/bots')"><text class="empty-btn-txt">探索智能体广场</text></view>
      </view>

      <!-- 搜索无结果 -->
      <view v-else class="empty">
        <view class="empty-icon search-empty"><AppIcon name="search" :size="44" color="#999" /></view>
        <text class="empty-sub">未找到相关对话</text>
        <text class="empty-hint">试试其他关键词</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

.page { min-height: 100vh; background: #f7f5f0; }
.safe-pt { padding-top: var(--status-bar-height, 0); }

.header { position: sticky; top: 0; z-index: 40; background: rgba(255, 255, 255, 0.96); border-bottom: 1rpx solid #ececec; }
.head-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 100rpx; }
.title { font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.head-placeholder { width: 40rpx; }

.search-wrap { padding: 0 24rpx 20rpx; }
.search-box { position: relative; display: flex; align-items: center; gap: 12rpx; height: 72rpx; padding: 0 24rpx; background: rgba(0,0,0,0.04); border-radius: 20rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #1a1a1a; }
.clear-search { padding: 4rpx; }

.list-area { height: calc(100vh - 0rpx); }
.group-title { padding: 16rpx 24rpx; background: rgba(0,0,0,0.03); }
.group-label { font-size: 22rpx; color: #999; font-weight: 500; }

.swipe-wrap { position: relative; overflow: hidden; border-bottom: 1rpx solid #f0f0f0; }
.row {
  position: relative; display: flex; align-items: center; gap: 24rpx; padding: 28rpx 24rpx;
  background: #f7f5f0;
}
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #eee; }
.unread { position: absolute; top: -6rpx; right: -6rpx; min-width: 36rpx; height: 36rpx; padding: 0 8rpx; background: var(--brand); border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.unread-txt { font-size: 20rpx; color: #fff; font-weight: 500; }
.row-info { flex: 1; min-width: 0; }
.row-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.agent-name { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.type-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.badge-free { background: rgba(201,169,110,0.12); color: #c9a96e; }
.badge-paid { background: rgba(196,30,58,0.1); color: var(--brand); }
.last-msg { font-size: 24rpx; color: #999; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.row-time { flex-shrink: 0; font-size: 22rpx; color: #999; align-self: flex-start; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: rgba(201,169,110,0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-icon.search-empty { width: 120rpx; height: 120rpx; background: rgba(0,0,0,0.04); }
.empty-title { font-size: 30rpx; color: #1a1a1a; font-weight: 500; margin-bottom: 12rpx; }
.empty-desc { font-size: 26rpx; color: #999; text-align: center; margin-bottom: 40rpx; line-height: 1.5; }
.empty-btn { padding: 20rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.empty-btn-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
.empty-sub { font-size: 26rpx; color: #999; }
.empty-hint { font-size: 22rpx; color: #bbb; margin-top: 8rpx; }
</style>
