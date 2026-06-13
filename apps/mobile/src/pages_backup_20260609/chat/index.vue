<template>
  <view class="chat-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="header-center">
          <text class="header-title">消息</text>
          <text v-if="totalUnread" class="unread-badge">{{ totalUnread > 99 ? '99+' : totalUnread }}</text>
        </view>
        <view class="header-actions">
          <text class="header-btn" @click="showSearch = !showSearch">🔍</text>
          <text class="header-btn" @click="goPage('/pages/chat/new/index')">＋</text>
        </view>
      </view>
      <view v-if="showSearch" class="search-bar">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索联系人" focus />
        </view>
      </view>
    </view>

    <!-- 会话列表 -->
    <view v-if="filteredConversations.length" class="conv-list">
      <view v-for="conv in filteredConversations" :key="conv.id" class="conv-item" @click="goPage('/pages/chat/id-detail/index')">
        <view class="avatar-wrap">
          <view class="avatar" :class="{ group: conv.type === 'group' }">
            <text v-if="conv.type === 'group'">👥</text>
            <text v-else>{{ conv.name[0] }}</text>
          </view>
          <view v-if="conv.type === 'private' && conv.isOnline" class="online-dot" />
        </view>
        <view class="conv-info">
          <view class="conv-top">
            <view class="conv-name-row">
              <text class="conv-name">{{ conv.name }}</text>
              <text v-if="conv.type === 'private' && conv.role" class="role-tag" :class="conv.role === '讲师' ? 'teacher' : 'owner'">{{ conv.role }}</text>
              <text v-if="conv.type === 'group'" class="member-count">({{ conv.memberCount }})</text>
            </view>
            <text class="conv-time">{{ conv.time }}</text>
          </view>
          <view class="conv-bottom">
            <text class="conv-msg">{{ conv.lastMessage }}</text>
            <text v-if="conv.unread" class="unread-count">{{ conv.unread > 99 ? '99+' : conv.unread }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-wrap">
      <view class="empty-icon">💬</view>
      <text class="empty-title">{{ searchQuery ? '未找到相关会话' : '暂无消息' }}</text>
      <text class="empty-desc">{{ searchQuery ? '换个关键词试试' : '快去和圈友们交流吧' }}</text>
      <view v-if="!searchQuery" class="empty-btn" @click="goPage('/pages/chat/new/index')">发起聊天</view>
    </view>

    <!-- 推荐 -->
    <view v-if="filteredConversations.length" class="recommend-section">
      <view class="section-head">
        <text class="section-title">猜你喜欢</text>
        <text class="section-more" @click="goPage('/pages/discover/index')">更多 ›</text>
      </view>
      <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
        <view v-for="item in recommendations" :key="item.id" class="rec-card" @click="goPage(item.type === 'circle' ? '/pages/circles/index' : '/pages/courses/index')">
          <view class="rec-img">
            <text v-if="item.type === 'circle'">👥</text>
            <text v-else>📖</text>
          </view>
          <text class="rec-name">{{ item.name }}</text>
          <text class="rec-desc">{{ item.type === 'circle' ? item.members + ' 成员' : item.students + ' 人学习' }}</text>
          <text v-if="item.type === 'course'" class="rec-price">¥{{ item.price }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 浮窗新建 -->
    <view v-if="filteredConversations.length" class="float-btn" @click="goPage('/pages/chat/new/index')">
      <text class="float-icon">＋</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const conversations = [
  { id: 1, type: 'private', name: '李明阳', lastMessage: '好的，那我们下周一详细聊聊八字命理的问题', time: '刚刚', unread: 3, isOnline: true, role: '讲师' },
  { id: 2, type: 'private', name: '张玄风', lastMessage: '你的排盘结果已经出来了，可以来看看', time: '5分钟前', unread: 1, isOnline: true, role: '圈主' },
  { id: 3, type: 'group', name: '八字研习小组', lastMessage: '[王师傅]: 今天的课程内容大家都理解了吗？', time: '30分钟前', unread: 12, isOnline: false, memberCount: 128 },
  { id: 4, type: 'private', name: '陈易安', lastMessage: '感谢老师的指导，受益匪浅！', time: '1小时前', unread: 0, isOnline: false, role: '' },
  { id: 5, type: 'private', name: '刘紫微', lastMessage: '紫微斗数的课程什么时候开始？', time: '昨天', unread: 0, isOnline: false, role: '讲师' },
  { id: 6, type: 'group', name: '风水堪舆交流群', lastMessage: '[系统]: 欢迎新成员加入', time: '昨天', unread: 0, isOnline: false, memberCount: 256 },
  { id: 7, type: 'private', name: '王德明', lastMessage: '已收到你的问题，稍后回复', time: '前天', unread: 0, isOnline: true, role: '圈主' },
  { id: 8, type: 'private', name: '赵启明', lastMessage: '[图片]', time: '3天前', unread: 0, isOnline: false, role: '' },
]

const recommendations = [
  { id: 1, type: 'circle', name: '八字命理研习社', members: 1280 },
  { id: 2, type: 'course', name: '紫微斗数入门精讲', price: 199, students: 856 },
  { id: 3, type: 'circle', name: '风水堪舆学院', members: 2560 },
  { id: 4, type: 'course', name: '八字排盘实战课', price: 299, students: 1024 },
]

const showSearch = ref(false)
const searchQuery = ref('')

const filteredConversations = computed(() => {
  if (!searchQuery.value) return conversations
  return conversations.filter(c => c.name.includes(searchQuery.value))
})

const totalUnread = computed(() => conversations.reduce((s, c) => s + c.unread, 0))

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.chat-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 100rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-center { flex: 1; display: flex; align-items: center; gap: 12rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.unread-badge { min-width: 36rpx; height: 36rpx; background: #C41E3A; color: #fff; font-size: 20rpx; font-weight: 600; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; padding: 0 8rpx; }
.header-actions { display: flex; gap: 8rpx; }
.header-btn { font-size: 36rpx; padding: 8rpx; }

.search-bar { padding: 0 24rpx 16rpx; }
.search-box { display: flex; align-items: center; height: 64rpx; background: #F5F1EB; border-radius: 40rpx; padding: 0 20rpx; }
.search-icon { font-size: 28rpx; color: #999; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }

.conv-list { }
.conv-item { display: flex; gap: 16rpx; padding: 20rpx 24rpx; border-bottom: 1px solid #F0EDE5; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(196,30,58,0.1); color: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 36rpx; font-weight: 600; }
.avatar.group { background: rgba(201,169,110,0.15); color: #C9A96E; font-size: 40rpx; }
.online-dot { position: absolute; bottom: 0; right: 0; width: 24rpx; height: 24rpx; background: #52C41A; border-radius: 50%; border: 3rpx solid #FAF8F5; }

.conv-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.conv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6rpx; }
.conv-name-row { display: flex; align-items: center; gap: 8rpx; flex: 1; min-width: 0; }
.conv-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role-tag { font-size: 20rpx; padding: 1rpx 10rpx; border-radius: 6rpx; flex-shrink: 0; }
.role-tag.teacher { background: rgba(201,169,110,0.12); color: #C9A96E; }
.role-tag.owner { background: rgba(196,30,58,0.08); color: #C41E3A; }
.member-count { font-size: 20rpx; color: #999; }
.conv-time { font-size: 22rpx; color: #999; flex-shrink: 0; }

.conv-bottom { display: flex; justify-content: space-between; align-items: center; }
.conv-msg { font-size: 26rpx; color: #999; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.unread-count { min-width: 36rpx; height: 36rpx; background: #C41E3A; color: #fff; font-size: 20rpx; font-weight: 600; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; padding: 0 8rpx; margin-left: 12rpx; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 32rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; }
.empty-desc { font-size: 26rpx; color: #999; margin-bottom: 32rpx; }
.empty-btn { padding: 16rpx 48rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; }

.recommend-section { padding: 24rpx; margin-top: 8rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #999; }
.rec-scroll { white-space: nowrap; }
.rec-card { display: inline-flex; flex-direction: column; width: 240rpx; background: #fff; border-radius: 16rpx; padding: 12rpx; margin-right: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.rec-img { width: 100%; aspect-ratio: 4/3; border-radius: 12rpx; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; font-size: 48rpx; margin-bottom: 8rpx; }
.rec-name { font-size: 24rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-desc { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.rec-price { font-size: 24rpx; color: #C41E3A; font-weight: 500; margin-top: 6rpx; }

.float-btn { position: fixed; bottom: 48rpx; right: 48rpx; width: 112rpx; height: 112rpx; border-radius: 50%; background: #C41E3A; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.4); display: flex; align-items: center; justify-content: center; z-index: 20; }
.float-icon { font-size: 48rpx; color: #fff; font-weight: 300; }
</style>
