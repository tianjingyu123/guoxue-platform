<template>
  <view class="ah-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">对话历史</text>
        <view class="header-more" @click="showMenu = !showMenu">
          <text>⋯</text>
        </view>
      </view>
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <input v-model="searchQuery" class="search-input" placeholder="搜索对话内容..." />
        <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
      </view>
    </view>

    <view class="ah-body">
      <template v-if="filteredHistory.length > 0">
        <view v-for="group in timeGroups" :key="group">
          <view v-if="getGroupItems(group).length > 0">
            <view class="group-header">
              <text>{{ group }}</text>
            </view>
            <view class="group-list">
              <view v-for="item in getGroupItems(group)" :key="item.id" class="chat-item" @click="goPage('/pages/agent/id-detail/index?id=' + item.id)">
                <view class="ci-avatar-wrap">
                  <view class="ci-avatar">{{ item.agentName[0] }}</view>
                  <view v-if="item.unread > 0" class="ci-badge">{{ item.unread }}</view>
                </view>
                <view class="ci-info">
                  <view class="ci-name-row">
                    <text class="ci-name">{{ item.agentName }}</text>
                    <text class="ci-type" :class="{ free: item.isFree }">{{ item.agentType }}</text>
                  </view>
                  <text class="ci-msg">{{ item.lastMessage }}</text>
                </view>
                <text class="ci-time">{{ item.time }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <view v-else-if="history.length === 0" class="empty-wrap">
        <text class="empty-icon">✨</text>
        <text class="empty-title">暂无对话记录</text>
        <text class="empty-desc">去智能体广场探索各类AI助手，开启你的国学之旅</text>
        <view class="empty-btn" @click="goPage('/pages/agents/index')">
          <text>探索智能体广场</text>
        </view>
      </view>

      <view v-else class="empty-wrap">
        <text class="empty-icon">🔍</text>
        <text class="empty-title">未找到相关对话</text>
        <text class="empty-desc">试试其他关键词</text>
      </view>
    </view>

    <!-- 更多菜单 -->
    <view v-if="showMenu" class="menu-mask" @click="showMenu = false">
      <view class="menu-pop" @click.stop>
        <view class="menu-item danger" @click="showClearConfirm = true">
          <text>🗑️ 清空全部</text>
        </view>
      </view>
    </view>

    <!-- 清空确认 -->
    <view v-if="showClearConfirm" class="modal-mask" @click="showClearConfirm = false">
      <view class="modal-card" @click.stop>
        <view class="modal-icon"><text>🗑️</text></view>
        <text class="modal-title">清空全部对话</text>
        <text class="modal-desc">确定要清空所有对话历史吗？此操作无法撤销。</text>
        <view class="modal-btns">
          <view class="modal-btn outline" @click="showClearConfirm = false"><text>取消</text></view>
          <view class="modal-btn danger" @click="handleClearAll"><text>确认清空</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showMenu = ref(false)
const showClearConfirm = ref(false)
const searchQuery = ref('')

interface ChatItem {
  id: number; agentName: string; agentType: string; lastMessage: string
  time: string; timeGroup: string; unread: number; isFree: boolean
}

const history = ref<ChatItem[]>([
  { id: 1, agentName: '八字分析师', agentType: '命理', lastMessage: '根据您的八字，今年的事业运势整体呈上升趋势...', time: '10分钟前', timeGroup: '今天', unread: 2, isFree: false },
  { id: 2, agentName: '紫微斗数大师', agentType: '紫微', lastMessage: '您的命盘中紫微星坐命宫，这是非常好的格局...', time: '昨天 15:30', timeGroup: '昨天', unread: 0, isFree: true },
  { id: 3, agentName: '风水顾问', agentType: '风水', lastMessage: '您家的客厅布局基本合理，但建议将沙发稍微往西移动...', time: '周一 09:20', timeGroup: '本周', unread: 0, isFree: false },
  { id: 4, agentName: '姓名学专家', agentType: '姓名', lastMessage: '这个名字的五行属性偏木，与您的八字喜用神相合...', time: '上周三', timeGroup: '更早', unread: 0, isFree: true },
  { id: 5, agentName: '周易占卜师', agentType: '占卜', lastMessage: '您所问之事，卦象显示近期会有转机，但需要耐心...', time: '2周前', timeGroup: '更早', unread: 0, isFree: false },
])

const timeGroups = ['今天', '昨天', '本周', '更早']

const filteredHistory = computed(() => {
  if (!searchQuery.value) return history.value
  return history.value.filter(h => h.agentName.includes(searchQuery.value) || h.lastMessage.includes(searchQuery.value))
})

function getGroupItems(group: string) {
  return filteredHistory.value.filter(h => h.timeGroup === group)
}

function handleClearAll() {
  history.value = []
  showClearConfirm.value = false
  showMenu.value = false
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.ah-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.header-more { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #333; }
.search-bar { display: flex; align-items: center; margin: 0 24rpx 10rpx; padding: 0 18rpx; height: 72rpx; background: #F5F1EB; border-radius: 36rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 24rpx; color: #333; }
.search-clear { font-size: 20rpx; color: #999; padding: 6rpx; }

.ah-body { padding: 8rpx 0; }
.group-header { padding: 10rpx 24rpx; background: rgba(245,241,235,0.6); }
.group-header text { font-size: 22rpx; color: #999; font-weight: 500; }
.group-list {  }
.chat-item { display: flex; align-items: center; gap: 14rpx; padding: 18rpx 24rpx; background: #fff; border-bottom: 1px solid #F5F1EB; }
.ci-avatar-wrap { position: relative; flex-shrink: 0; }
.ci-avatar { width: 84rpx; height: 84rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #C41E3A; }
.ci-badge { position: absolute; top: -4rpx; right: -4rpx; min-width: 32rpx; height: 32rpx; border-radius: 16rpx; background: #FF4D4F; color: #fff; font-size: 18rpx; display: flex; align-items: center; justify-content: center; padding: 0 6rpx; }
.ci-info { flex: 1; min-width: 0; }
.ci-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.ci-name { font-size: 26rpx; font-weight: 500; color: #333; }
.ci-type { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(196,30,58,0.08); color: #C41E3A; }
.ci-type.free { background: rgba(201,169,110,0.1); color: #C9A96E; }
.ci-msg { font-size: 22rpx; color: #999; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ci-time { font-size: 20rpx; color: #BBB; flex-shrink: 0; text-align: right; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 24rpx; }
.empty-icon { font-size: 100rpx; opacity: 0.2; margin-bottom: 20rpx; }
.empty-title { font-size: 28rpx; color: #666; margin-bottom: 8rpx; }
.empty-desc { font-size: 22rpx; color: #BBB; text-align: center; margin-bottom: 28rpx; }
.empty-btn { padding: 14rpx 36rpx; background: #C41E3A; border-radius: 28rpx; }
.empty-btn text { font-size: 24rpx; color: #fff; }

.menu-mask { position: fixed; inset: 0; z-index: 100; }
.menu-pop { position: absolute; top: 88rpx; right: 24rpx; background: #fff; border-radius: 14rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.1); overflow: hidden; min-width: 200rpx; }
.menu-item { padding: 16rpx 24rpx; font-size: 26rpx; color: #333; }
.menu-item.danger { color: #FF4D4F; }

.modal-mask { position: fixed; inset: 0; z-index: 110; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.modal-card { background: #fff; border-radius: 20rpx; padding: 36rpx 28rpx; width: 100%; max-width: 560rpx; }
.modal-icon { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(255,77,79,0.08); display: flex; align-items: center; justify-content: center; margin: 0 auto 16rpx; font-size: 36rpx; }
.modal-title { font-size: 28rpx; font-weight: 600; color: #333; text-align: center; display: block; margin-bottom: 10rpx; }
.modal-desc { font-size: 22rpx; color: #999; text-align: center; display: block; margin-bottom: 24rpx; }
.modal-btns { display: flex; gap: 14rpx; }
.modal-btn { flex: 1; padding: 14rpx; text-align: center; border-radius: 14rpx; }
.modal-btn.outline { background: #F5F1EB; color: #666; }
.modal-btn.danger { background: #FF4D4F; color: #fff; }
.modal-btn text { font-size: 26rpx; }
</style>
