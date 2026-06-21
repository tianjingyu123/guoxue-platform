<template>
  <view class="page">
    <!-- 顶栏 -->
    <view
      class="topbar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="tb-inner">
        <view
          class="tb-back"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#2b2b2b"
          />
        </view>
        <text class="tb-title">
          对话历史
        </text>
        <view class="tb-placeholder" />
      </view>
    </view>

    <view class="body">
      <!-- 搜索 -->
      <view class="search-box">
        <app-icon
          name="search"
          :size="32"
          color="#999999"
        />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="搜索对话"
          placeholder-class="search-ph"
        >
      </view>

      <!-- 空状态 -->
      <view
        v-if="filtered.length === 0"
        class="empty"
      >
        <app-icon
          name="message-square"
          :size="96"
          color="#d8d8d8"
        />
        <text class="empty-txt">
          {{ search ? '未找到相关对话' : '暂无对话记录' }}
        </text>
      </view>

      <!-- 对话列表 -->
      <view
        v-else
        class="conv-list"
      >
        <view
          v-for="conv in filtered"
          :key="conv.id"
          class="conv-card"
          @tap="goChat(conv)"
        >
          <view class="conv-avatar">
            <app-icon
              name="bot"
              :size="40"
              color="#c41e3a"
            />
          </view>
          <view class="conv-main">
            <view class="conv-row1">
              <view class="conv-name-wrap">
                <text class="conv-name">
                  {{ conv.agentName }}
                </text>
                <text
                  class="conv-cat"
                  :style="{ background: catColor(conv.agentCategory).bg, color: catColor(conv.agentCategory).fg }"
                >
                  {{ conv.agentCategory }}
                </text>
              </view>
              <text class="conv-time">
                {{ conv.lastTime }}
              </text>
            </view>
            <view class="conv-row2">
              <text class="conv-msg">
                {{ conv.lastMessage }}
              </text>
              <view class="conv-tail">
                <text
                  v-if="conv.unread > 0"
                  class="conv-unread"
                >
                  {{ conv.unread }}
                </text>
                <view
                  class="conv-del"
                  @tap.stop="remove(conv.id)"
                >
                  <app-icon
                    name="trash-2"
                    :size="28"
                    color="#bbbbbb"
                  />
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

interface AgentConversation {
  id: string
  agentName: string
  agentCategory: string
  lastMessage: string
  lastTime: string
  messageCount: number
  unread: number
}

const statusBarHeight = ref(0)
uni.getSystemInfo({
  success: (e) => {
    statusBarHeight.value = e.statusBarHeight || 0
  },
})

// TODO: 后续对接 API 后从服务端获取对话历史
const convs = ref<AgentConversation[]>([])

onMounted(() => {
  convs.value = [
    { id: '1', agentName: '八字命理大师', agentCategory: '八字命理', lastMessage: '您的命局中财星得地，今年走食伤生财之运…', lastTime: '今天 14:35', messageCount: 24, unread: 0 },
    { id: '2', agentName: '奇门遁甲助手', agentCategory: '奇门遁甲', lastMessage: '根据今日癸卯日的奇门布局，您的出行方向…', lastTime: '昨天 20:12', messageCount: 8, unread: 2 },
    { id: '3', agentName: '紫微斗数专家', agentCategory: '紫微斗数', lastMessage: '您的命宫坐紫微星，主性格稳重、志向远大…', lastTime: '2天前', messageCount: 15, unread: 0 },
    { id: '4', agentName: '风水布局师', agentCategory: '风水', lastMessage: '根据您的房屋朝向，建议将财位布置在…', lastTime: '3天前', messageCount: 6, unread: 0 },
    { id: '5', agentName: '易经解读助手', agentCategory: '易经', lastMessage: '您抽到的卦象为「水雷屯」，代表事业初创…', lastTime: '上周', messageCount: 12, unread: 0 },
  ]
})
const search = ref('')

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
