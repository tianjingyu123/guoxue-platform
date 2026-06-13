<template>
  <view class="min-h-screen bg-background max-w-lg mx-auto">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-2 -ml-2" @click="goBack">
          <text class="text-foreground">←</text>
        </view>

        <view class="flex items-center gap-2">
          <text class="font-semibold text-lg text-foreground">消息</text>
          <view v-if="totalUnread > 0" class="h-5 min-w-5 text-xs px-1.5 bg-red-500 text-white rounded-full flex items-center justify-center">
            <text>{{ totalUnread > 99 ? '99+' : totalUnread }}</text>
          </view>
        </view>

        <view class="flex items-center gap-1">
          <view class="p-2 rounded-full" @click="showSearch = !showSearch">
            <text></text>
          </view>
          <view class="p-2 rounded-full" @click="goTo('/pages/chat/new/index')">
            <text>＋</text>
          </view>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view v-if="showSearch" class="px-4 pb-3">
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></text>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索联系人"
            class="w-full h-10 pl-10 pr-4 rounded-full bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </view>
      </view>
    </view>

    <!-- 会话列表 -->
    <view class="divide-y divide-border">
      <template v-if="filteredConversations.length > 0">
        <view
          v-for="conv in filteredConversations"
          :key="conv.id"
          class="flex items-center gap-3 px-4 py-3"
          @click="goTo('/pages/chat/id-detail/index?id=' + conv.id)"
        >
          <!-- 头像 -->
          <view class="relative flex-shrink-0">
            <view class="w-12 h-12 rounded-full flex items-center justify-center" :class="conv.type === 'group' ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'">
              <text v-if="conv.type === 'group'" class="text-lg"></text>
              <text v-else class="text-sm font-medium">{{ conv.name[0] }}</text>
            </view>
            <!-- 在线状态 -->
            <view v-if="conv.type === 'private' && conv.isOnline" class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#FAF8F5]" />
          </view>

          <!-- 会话信息 -->
          <view class="flex-1 min-w-0">
            <view class="flex items-center justify-between mb-0.5">
              <view class="flex items-center gap-2">
                <text class="font-medium text-sm text-foreground truncate">{{ conv.name }}</text>
                <view
                  v-if="conv.type === 'private' && conv.role"
                  class="text-[10px] px-1.5 py-0 rounded-full"
                  :class="conv.role === '讲师' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'"
                >
                  <text>{{ conv.role }}</text>
                </view>
                <text v-if="conv.type === 'group'" class="text-[10px] text-muted-foreground">({{ conv.memberCount }})</text>
              </view>
              <text class="text-xs text-muted-foreground flex-shrink-0">{{ conv.time }}</text>
            </view>
            <view class="flex items-center justify-between">
              <text class="text-sm text-muted-foreground truncate pr-2">{{ conv.lastMessage }}</text>
              <view v-if="conv.unread > 0" class="h-5 min-w-5 text-xs px-1.5 bg-red-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <text>{{ conv.unread > 99 ? '99+' : conv.unread }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else class="flex flex-col items-center justify-center py-20 px-4">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <text class="text-3xl"></text>
        </view>
        <text class="text-base font-medium text-foreground mb-1">{{ searchQuery ? '未找到相关会话' : '暂无消息' }}</text>
        <text class="text-sm text-muted-foreground text-center mb-4">{{ searchQuery ? '换个关键词试试' : '快去和圈友们交流吧' }}</text>
        <view
          v-if="!searchQuery"
          class="px-6 py-2 bg-primary text-white text-sm font-medium rounded-full"
          @click="goTo('/pages/chat/new/index')"
        >
          <text>发起聊天</text>
        </view>
      </view>
    </view>

    <!-- 猜你喜欢推荐位 -->
    <view v-if="filteredConversations.length > 0" class="p-4 pb-24">
      <view class="flex items-center justify-between mb-3">
        <text class="font-medium text-sm text-foreground">猜你喜欢</text>
        <view class="flex items-center gap-1" @click="goTo('/pages/discover/index')">
          <text class="text-xs text-muted-foreground">更多 ›</text>
        </view>
      </view>
      <scroll-view scroll-x class="flex gap-3 pb-2">
        <view
          v-for="item in recommendations"
          :key="item.id"
          class="flex-shrink-0 w-36 mr-3"
          @click="goTo(item.type === 'circle' ? '/pages/circle/id-detail/index?id=' + item.id : '/pages/courses/id-detail/index?id=' + item.id)"
        >
          <view class="overflow-hidden rounded-xl border border-border shadow-sm">
            <view class="aspect-[4/3] bg-secondary flex items-center justify-center">
              <text class="text-2xl">{{ item.type === 'circle' ? '' : '' }}</text>
            </view>
            <view class="p-2">
              <text class="text-xs font-medium text-foreground line-clamp-1 block">{{ item.name }}</text>
              <text class="text-[10px] text-muted-foreground mt-0.5 block">
                {{ item.type === 'circle' ? item.members + ' 成员' : item.students + ' 人学习' }}
              </text>
              <text v-if="item.type === 'course'" class="text-xs text-primary font-medium mt-1 block">¥{{ item.price }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部快捷入口 -->
    <view v-if="filteredConversations.length > 0" class="fixed bottom-6 right-4">
      <view
        class="flex items-center justify-center w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/30"
        @click="goTo('/pages/chat/new/index')"
      >
        <text class="text-white text-xl">＋</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

interface Conversation {
  id: number
  type: string
  name: string
  avatar: string
  lastMessage: string
  time: string
  unread: number
  isOnline: boolean
  role?: string
  memberCount?: number
}

const conversations: Conversation[] = [
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

const searchQuery = ref('')
const showSearch = ref(false)

const filteredConversations = computed(() =>
  conversations.filter((conv) => conv.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
)

const totalUnread = computed(() => conversations.reduce((sum, conv) => sum + conv.unread, 0))
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
