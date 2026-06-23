<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { initialHistory, historyGroups, type HistoryItem } from '@/lib/agent-data'

const history = ref<HistoryItem[]>([...initialHistory])
const searchQuery = ref('')
const showClearConfirm = ref(false)
const swipedId = ref<number | null>(null)
const showMenu = ref(false)

const filteredHistory = computed(() =>
  history.value.filter(
    (item) => item.agentName.includes(searchQuery.value) || item.lastMessage.includes(searchQuery.value),
  ),
)

function groupItems(group: string) {
  return filteredHistory.value.filter((item) => item.timeGroup === group)
}

function handleDelete(id: number) {
  history.value = history.value.filter((item) => item.id !== id)
  swipedId.value = null
}

function handleClearAll() {
  history.value = []
  showClearConfirm.value = false
  showMenu.value = false
}

function toggleSwipe(id: number) {
  swipedId.value = swipedId.value === id ? null : id
}

function openChat(item: HistoryItem) {
  if (swipedId.value === item.id) {
    swipedId.value = null
    return
  }
  navigateTo(`/pkg-agent/agent/chat?id=${item.id}`)
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header safe-pt">
      <view class="head-bar">
        <view class="back" @tap="goBack()"><AppIcon name="arrow-left" :size="40" color="#1a1a1a" /></view>
        <text class="title">对话历史</text>
        <view class="menu-wrap">
          <view class="more" @tap="showMenu = !showMenu"><AppIcon name="more-horizontal" :size="40" color="#1a1a1a" /></view>
          <view v-if="showMenu" class="menu-mask" @tap="showMenu = false" />
          <view v-if="showMenu" class="menu">
            <view class="menu-item" @tap="showClearConfirm = true; showMenu = false">
              <AppIcon name="trash-2" :size="28" color="#c41e3a" />
              <text class="menu-txt">清空全部</text>
            </view>
          </view>
        </view>
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
              <!-- 删除按钮 -->
              <view class="del-btn" :class="{ open: swipedId === item.id }" @tap="handleDelete(item.id)">
                <AppIcon name="trash-2" :size="36" color="#ffffff" />
                <text class="del-txt">删除</text>
              </view>
              <!-- 卡片 -->
              <view class="row" :class="{ slid: swipedId === item.id }" @tap="openChat(item)" @longpress="toggleSwipe(item.id)">
                <view class="avatar-wrap">
                  <image class="avatar" :src="item.agentAvatar" mode="aspectFill" />
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

    <!-- 清空确认弹窗 -->
    <view v-if="showClearConfirm" class="modal-mask" @tap="showClearConfirm = false">
      <view class="modal" @tap.stop>
        <view class="modal-icon"><AppIcon name="trash-2" :size="40" color="#c41e3a" /></view>
        <text class="modal-title">清空全部对话</text>
        <text class="modal-desc">确定要清空所有对话历史吗？此操作无法撤销。</text>
        <view class="modal-btns">
          <view class="modal-btn cancel" @tap="showClearConfirm = false"><text>取消</text></view>
          <view class="modal-btn confirm" @tap="handleClearAll"><text class="confirm-txt">确认清空</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f7f5f0; }
.safe-pt { padding-top: var(--status-bar-height, 0); }

.header { position: sticky; top: 0; z-index: 40; background: rgba(255, 255, 255, 0.96); border-bottom: 1rpx solid #ececec; }
.head-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 100rpx; }
.title { font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.menu-wrap { position: relative; }
.menu-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 40; }
.menu { position: absolute; right: 0; top: 100%; margin-top: 8rpx; width: 220rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #ececec; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); z-index: 50; overflow: hidden; }
.menu-item { display: flex; align-items: center; gap: 12rpx; padding: 24rpx 28rpx; }
.menu-txt { font-size: 28rpx; color: #c41e3a; }

.search-wrap { padding: 0 24rpx 20rpx; }
.search-box { position: relative; display: flex; align-items: center; gap: 12rpx; height: 72rpx; padding: 0 24rpx; background: rgba(0,0,0,0.04); border-radius: 20rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #1a1a1a; }
.clear-search { padding: 4rpx; }

.list-area { height: calc(100vh - 0rpx); }
.group-title { padding: 16rpx 24rpx; background: rgba(0,0,0,0.03); }
.group-label { font-size: 22rpx; color: #999; font-weight: 500; }

.swipe-wrap { position: relative; overflow: hidden; border-bottom: 1rpx solid #f0f0f0; }
.del-btn {
  position: absolute; right: 0; top: 0; bottom: 0; width: 160rpx;
  background: #c41e3a; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx;
  transform: translateX(100%); transition: transform 0.2s ease;
}
.del-btn.open { transform: translateX(0); }
.del-txt { font-size: 22rpx; color: #fff; }
.row {
  position: relative; display: flex; align-items: center; gap: 24rpx; padding: 28rpx 24rpx;
  background: #f7f5f0; transition: transform 0.2s ease;
}
.row.slid { transform: translateX(-160rpx); }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #eee; }
.unread { position: absolute; top: -6rpx; right: -6rpx; min-width: 36rpx; height: 36rpx; padding: 0 8rpx; background: #c41e3a; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.unread-txt { font-size: 20rpx; color: #fff; font-weight: 500; }
.row-info { flex: 1; min-width: 0; }
.row-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.agent-name { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.type-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.badge-free { background: rgba(201,169,110,0.12); color: #c9a96e; }
.badge-paid { background: rgba(196,30,58,0.1); color: #c41e3a; }
.last-msg { font-size: 24rpx; color: #999; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.row-time { flex-shrink: 0; font-size: 22rpx; color: #999; align-self: flex-start; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: rgba(201,169,110,0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-icon.search-empty { width: 120rpx; height: 120rpx; background: rgba(0,0,0,0.04); }
.empty-title { font-size: 30rpx; color: #1a1a1a; font-weight: 500; margin-bottom: 12rpx; }
.empty-desc { font-size: 26rpx; color: #999; text-align: center; margin-bottom: 40rpx; line-height: 1.5; }
.empty-btn { padding: 20rpx 48rpx; background: #c41e3a; border-radius: 999rpx; }
.empty-btn-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
.empty-sub { font-size: 26rpx; color: #999; }
.empty-hint { font-size: 22rpx; color: #bbb; margin-top: 8rpx; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 50; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 0 64rpx; }
.modal { width: 100%; max-width: 560rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; }
.modal-icon { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 24rpx; }
.modal-title { display: block; text-align: center; font-size: 30rpx; font-weight: 600; color: #1a1a1a; margin-bottom: 12rpx; }
.modal-desc { display: block; text-align: center; font-size: 26rpx; color: #999; line-height: 1.5; margin-bottom: 32rpx; }
.modal-btns { display: flex; gap: 24rpx; }
.modal-btn { flex: 1; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.cancel { background: rgba(0,0,0,0.05); color: #1a1a1a; }
.confirm { background: #c41e3a; }
.confirm-txt { color: #fff; }
</style>
