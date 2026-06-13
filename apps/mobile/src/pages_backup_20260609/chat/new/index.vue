<template>
  <view class="cl-page">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="header-center">
          <text class="header-title">消息</text>
          <text v-if="totalUnread > 0" class="header-badge">{{ totalUnread > 99 ? '99+' : totalUnread }}</text>
        </view>
        <view class="header-actions">
          <text class="ha-btn" @click="showSearch = !showSearch">🔍</text>
          <text class="ha-btn" @click="goPage('/pages/chat/new/index')">＋</text>
        </view>
      </view>
      <!-- 搜索栏 -->
      <view v-if="showSearch" class="search-bar">
        <view class="sb-wrap">
          <text class="sb-icon">🔍</text>
          <input v-model="searchQuery" class="sb-input" placeholder="搜索联系人" :focus="true" />
        </view>
      </view>
    </view>

    <!-- 会话列表 -->
    <scroll-view scroll-y class="cl-body">
      <template v-if="filteredConversations.length > 0">
        <view v-for="conv in filteredConversations" :key="conv.id" class="conv-item" @click="goPage('/pages/chat/id-detail/index?id=' + conv.id)">
          <!-- 头像 -->
          <view class="conv-avatar">
            <view v-if="conv.type === 'group'" class="ca-group">👥</view>
            <view v-else class="ca-private">{{ conv.name[0] }}</view>
            <view v-if="conv.type === 'private' && conv.isOnline" class="ca-dot" />
          </view>
          <!-- 信息 -->
          <view class="conv-info">
            <view class="conv-top">
              <view class="conv-name-row">
                <text class="conv-name">{{ conv.name }}</text>
                <text v-if="conv.role === '讲师'" class="conv-role teacher">讲师</text>
                <text v-if="conv.role === '圈主'" class="conv-role owner">圈主</text>
                <text v-if="conv.type === 'group'" class="conv-members">({{ conv.memberCount }})</text>
              </view>
              <text class="conv-time">{{ conv.time }}</text>
            </view>
            <view class="conv-bottom">
              <text class="conv-msg">{{ conv.lastMessage }}</text>
              <text v-if="conv.unread > 0" class="conv-unread">{{ conv.unread > 99 ? '99+' : conv.unread }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else class="empty">
        <view class="empty-icon">💬</view>
        <text class="empty-title">{{ searchQuery ? '未找到相关会话' : '暂无消息' }}</text>
        <text class="empty-desc">{{ searchQuery ? '换个关键词试试' : '快去和圈友们交流吧' }}</text>
        <view v-if="!searchQuery" class="empty-btn" @click="goPage('/pages/chat/new/index')"><text>发起聊天</text></view>
      </view>

      <!-- 猜你喜欢推荐 -->
      <view v-if="filteredConversations.length > 0" class="recommend">
        <view class="rec-header">
          <text class="rec-title">猜你喜欢</text>
          <text class="rec-more" @click="goPage('/pages/discover/index')">更多 ›</text>
        </view>
        <scroll-view scroll-x class="rec-scroll">
          <view v-for="item in recommendations" :key="item.id" class="rec-card" @click="goPage(item.type === 'circle' ? '/pages/circle/id-detail/index?id=' + item.id : '/pages/course/id-detail/index?id=' + item.id)">
            <view class="rc-thumb">
              <text v-if="item.type === 'circle'">👥</text>
              <text v-else>📚</text>
            </view>
            <view class="rc-info">
              <text class="rc-name">{{ item.name }}</text>
              <text v-if="item.type === 'circle'" class="rc-meta">{{ item.members }} 成员</text>
              <text v-else class="rc-meta">{{ item.students }} 人学习</text>
              <text v-if="item.type === 'course'" class="rc-price">¥{{ item.price }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </scroll-view>

    <!-- 浮动新建按钮 -->
    <view v-if="filteredConversations.length > 0" class="fab" @click="goPage('/pages/chat/new/index')">
      <text>＋</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const showSearch = ref(false)

const conversations = [
  { id: 1, type: 'private', name: '李明阳', avatar: '', lastMessage: '好的，那我们下周一详细聊聊八字命理的问题', time: '刚刚', unread: 3, isOnline: true, role: '讲师' },
  { id: 2, type: 'private', name: '张玄风', avatar: '', lastMessage: '你的排盘结果已经出来了，可以来看看', time: '5分钟前', unread: 1, isOnline: true, role: '圈主' },
  { id: 3, type: 'group', name: '八字研习小组', avatar: '', lastMessage: '[王师傅]: 今天的课程内容大家都理解了吗？', time: '30分钟前', unread: 12, isOnline: false, memberCount: 128 },
  { id: 4, type: 'private', name: '陈易安', avatar: '', lastMessage: '感谢老师的指导，受益匪浅！', time: '1小时前', unread: 0, isOnline: false, role: '' },
  { id: 5, type: 'private', name: '刘紫微', avatar: '', lastMessage: '紫微斗数的课程什么时候开始？', time: '昨天', unread: 0, isOnline: false, role: '讲师' },
  { id: 6, type: 'group', name: '风水堪舆交流群', avatar: '', lastMessage: '[系统]: 欢迎新成员加入', time: '昨天', unread: 0, isOnline: false, memberCount: 256 },
  { id: 7, type: 'private', name: '王德明', avatar: '', lastMessage: '已收到你的问题，稍后回复', time: '前天', unread: 0, isOnline: true, role: '圈主' },
  { id: 8, type: 'private', name: '赵启明', avatar: '', lastMessage: '[图片]', time: '3天前', unread: 0, isOnline: false, role: '' },
]

const recommendations = [
  { id: 1, type: 'circle', name: '八字命理研习社', members: 1280, image: '' },
  { id: 2, type: 'course', name: '紫微斗数入门精讲', price: 199, students: 856, image: '' },
  { id: 3, type: 'circle', name: '风水堪舆学院', members: 2560, image: '' },
  { id: 4, type: 'course', name: '八字排盘实战课', price: 299, students: 1024, image: '' },
]

const totalUnread = computed(() => conversations.reduce((s, c) => s + c.unread, 0))
const filteredConversations = computed(() =>
  searchQuery.value ? conversations.filter(c => c.name.includes(searchQuery.value)) : conversations
)

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.cl-page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 20rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-center { display: flex; align-items: center; gap: 10rpx; flex: 1; justify-content: center; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-badge { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; }
.header-actions { display: flex; gap: 4rpx; }
.ha-btn { font-size: 32rpx; color: #999; width: 56rpx; text-align: center; }

.search-bar { padding: 0 20rpx 14rpx; }
.sb-wrap { position: relative; }
.sb-icon { position: absolute; left: 16rpx; top: 50%; transform: translateY(-50%); font-size: 24rpx; }
.sb-input { width: 100%; height: 68rpx; background: #F5F1EB; border-radius: 34rpx; padding: 0 20rpx 0 56rpx; font-size: 24rpx; color: #333; box-sizing: border-box; }

.cl-body { flex: 1; }

.conv-item { display: flex; align-items: center; gap: 14rpx; padding: 20rpx; background: #fff; border-bottom: 1px solid #F5F1EB; }
.conv-avatar { position: relative; flex-shrink: 0; }
.ca-group { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(240,160,48,0.1); display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.ca-private { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #C41E3A; }
.ca-dot { position: absolute; bottom: 2rpx; right: 2rpx; width: 18rpx; height: 18rpx; border-radius: 50%; background: #52C41A; border: 2rpx solid #fff; }

.conv-info { flex: 1; min-width: 0; }
.conv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6rpx; }
.conv-name-row { display: flex; align-items: center; gap: 8rpx; }
.conv-name { font-size: 26rpx; font-weight: 500; color: #333; }
.conv-role { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; }
.conv-role.teacher { background: rgba(240,160,48,0.1); color: #F0A030; }
.conv-role.owner { background: rgba(196,30,58,0.08); color: #C41E3A; }
.conv-members { font-size: 20rpx; color: #BBB; }
.conv-time { font-size: 20rpx; color: #CCC; flex-shrink: 0; }
.conv-bottom { display: flex; justify-content: space-between; align-items: center; }
.conv-msg { font-size: 22rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.conv-unread { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; flex-shrink: 0; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 100rpx; opacity: 0.15; margin-bottom: 20rpx; }
.empty-title { font-size: 28rpx; font-weight: 500; color: #333; margin-bottom: 8rpx; }
.empty-desc { font-size: 24rpx; color: #999; margin-bottom: 24rpx; }
.empty-btn { padding: 14rpx 36rpx; background: #C41E3A; border-radius: 28rpx; }
.empty-btn text { font-size: 24rpx; color: #fff; }

.recommend { padding: 24rpx 20rpx 140rpx; }
.rec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.rec-title { font-size: 26rpx; font-weight: 500; color: #333; }
.rec-more { font-size: 22rpx; color: #BBB; }
.rec-scroll { white-space: nowrap; }
.rec-card { display: inline-block; width: 200rpx; margin-right: 14rpx; background: #fff; border-radius: 14rpx; overflow: hidden; flex-shrink: 0; }
.rc-thumb { aspect-ratio: 4/3; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.rc-info { padding: 10rpx 14rpx; }
.rc-name { font-size: 22rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.rc-meta { font-size: 18rpx; color: #BBB; display: block; margin-top: 4rpx; }
.rc-price { font-size: 22rpx; color: #C41E3A; font-weight: 500; display: block; margin-top: 4rpx; }

.fab { position: fixed; bottom: 48rpx; right: 32rpx; width: 80rpx; height: 80rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); z-index: 20; }
.fab text { font-size: 40rpx; color: #fff; font-weight: 300; }
</style>
