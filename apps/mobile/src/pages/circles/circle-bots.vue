<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view
        class="nav-left"
        @click="goBack"
      >
        <text class="nav-icon">
          ‹
        </text>
      </view>
      <text class="nav-title">
        圈子智能体
      </text>
      <view
        v-if="isAdmin"
        class="nav-right"
        @click="goManage"
      >
        <text class="nav-icon">
          ⚙
        </text>
      </view>
      <view
        v-else
        class="nav-spacer"
      />
    </view>

    <!-- 圈子信息 -->
    <view
      v-if="circle"
      class="circle-info"
    >
      <image
        :src="circle.cover || ''"
        class="circle-cover"
        mode="aspectFill"
      />
      <view class="circle-detail">
        <text class="circle-name">
          {{ circle.name }}
        </text>
        <text class="circle-meta">
          {{ formatNumber(circle.members) }} 成员 · {{ bots.length }} 个智能体
        </text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-inner">
        <text class="search-icon">
          🔍
        </text>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索智能体..."
          @input="onSearchInput"
        >
      </view>
    </view>

    <!-- 智能体列表 -->
    <view class="bot-list-wrap">
      <template v-if="loading">
        <view
          v-for="i in 4"
          :key="i"
          class="bot-skeleton"
        >
          <view class="sk-avatar" />
          <view class="sk-info">
            <view class="sk-name" />
            <view class="sk-desc" />
            <view class="sk-desc short" />
          </view>
        </view>
      </template>

      <template v-else-if="filteredBots.length === 0">
        <view class="empty-state">
          <view class="empty-icon-wrap">
            <text class="empty-icon">
              🤖
            </text>
          </view>
          <text class="empty-text">
            {{ searchQuery ? '未找到相关智能体' : '暂无智能体' }}
          </text>
          <view
            v-if="isAdmin && !searchQuery"
            class="btn-empty-create"
            @click="goCreate"
          >
            创建智能体
          </view>
        </view>
      </template>

      <template v-else>
        <view
          v-for="bot in filteredBots"
          :key="bot.id"
          class="bot-card"
          @click="goChat(bot)"
        >
          <view class="bot-card-inner">
            <view class="bot-avatar-wrap">
              <image
                :src="bot.avatar || ''"
                class="bot-avatar"
                mode="aspectFill"
              />
              <view
                v-if="bot.isOfficial"
                class="badge-official"
              >
                <text class="badge-official-icon">
                  ✨
                </text>
              </view>
            </view>
            <view class="bot-info">
              <view class="bot-name-row">
                <text class="bot-name">
                  {{ bot.name }}
                </text>
                <text class="bot-category">
                  {{ bot.category }}
                </text>
              </view>
              <text class="bot-desc">
                {{ bot.description }}
              </text>
            </view>
          </view>

          <view class="bot-stats">
            <view class="bot-stat-item">
              <text class="bot-stat-icon">
                💬
              </text>
              <text class="bot-stat-num">
                {{ formatNumber(bot.chats) }}
              </text>
            </view>
            <view class="bot-stat-item">
              <text class="bot-stat-icon">
                ❤
              </text>
              <text class="bot-stat-num">
                {{ formatNumber(bot.likes) }}
              </text>
            </view>
            <view
              class="bot-chat-btn"
              @click.stop="goChat(bot)"
            >
              对话
            </view>
          </view>
        </view>
      </template>
    </view>

    <!-- 创建按钮 (管理员) -->
    <view
      v-if="isAdmin && !loading && bots.length > 0"
      class="fab-create"
      @click="goCreate"
    >
      <text class="fab-icon">
        ＋
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { botApi, circleApi } from '../../api'

interface CircleBot {
  id: string
  name: string
  avatar: string
  description: string
  category: string
  chats: number
  likes: number
  isOfficial: boolean
  createdAt: string
}

interface CircleDetail {
  id: string
  name: string
  cover: string
  description: string
  category: string
  members: number
  posts: number
  isJoined: boolean
  createdAt: string
  owner: { id: string; name: string; avatar: string }
  tags: string[]
}

const mockCircle: CircleDetail = {
  id: '1',
  name: '周易研习社',
  cover: '',
  description: '传承易学精髓，探索宇宙奥秘',
  category: '易经',
  members: 12800,
  posts: 3560,
  isJoined: true,
  createdAt: '2024-01-01',
  owner: { id: '1', name: '周易大师', avatar: '' },
  tags: ['周易', '八卦', '风水'],
}

const mockBots: CircleBot[] = [
  {
    id: '1', name: '周易解卦助手', avatar: '', description: '专业解读六十四卦，帮助您理解卦象含义与人生指引',
    category: '占卜解读', chats: 12580, likes: 3420, isOfficial: true, createdAt: '2024-01-15',
  },
  {
    id: '2', name: '风水顾问', avatar: '', description: '提供家居风水布局建议，助您打造和谐居住环境',
    category: '风水堪舆', chats: 8960, likes: 2180, isOfficial: true, createdAt: '2024-02-01',
  },
  {
    id: '3', name: '八字命理分析', avatar: '', description: '根据生辰八字分析命理运势，提供人生建议',
    category: '命理分析', chats: 15620, likes: 4890, isOfficial: false, createdAt: '2024-02-15',
  },
  {
    id: '4', name: '易经学习导师', avatar: '', description: '系统讲解易经知识，从入门到精通的学习伴侣',
    category: '学习辅导', chats: 6780, likes: 1560, isOfficial: false, createdAt: '2024-03-01',
  },
]

const circle = ref<CircleDetail | null>(null)
const bots = ref<CircleBot[]>([])
const loading = ref(true)
const searchQuery = ref('')
const isAdmin = ref(true)
const circleId = ref('')

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  circleId.value = page?.options?.circleId || page?.options?.id || ''
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const [circleRes, botsRes] = await Promise.all([
      circleApi.detail(circleId.value),
      botApi.circleBots(circleId.value),
    ])
    circle.value = circleRes
    bots.value = botsRes
  } catch {
    circle.value = mockCircle
    bots.value = mockBots
  } finally {
    loading.value = false
  }
}

const filteredBots = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return bots.value
  return bots.value.filter(
    (bot) =>
      bot.name.toLowerCase().includes(q) ||
      bot.description.toLowerCase().includes(q) ||
      bot.category.toLowerCase().includes(q)
  )
})

function formatNumber(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function onSearchInput() {
  // computed handles filtering
}

function goBack() {
  uni.navigateBack()
}

function goManage() {
  uni.navigateTo({ url: `/pages/circles/circle-bots?circleId=${circleId.value}` })
}

function goCreate() {
  uni.navigateTo({ url: `/pages/circles/circle-bots?circleId=${circleId.value}` })
}

function goChat(bot: CircleBot) {
  uni.navigateTo({ url: `/pages/bots/bot-chat?id=${bot.id}` })
}
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* ===== 顶部导航 ===== */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #FAF8F5;
  border-bottom: 2rpx solid #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 112rpx;
}
.nav-left, .nav-right { padding: 12rpx; }
.nav-icon { font-size: 48rpx; color: #2C2C2C; }
.nav-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }
.nav-spacer { width: 72rpx; }

/* ===== 圈子信息 ===== */
.circle-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 2rpx solid #E8E3DB;
}
.circle-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  background: #F2EFEA;
}
.circle-detail { flex: 1; min-width: 0; }
.circle-name { font-size: 30rpx; font-weight: 600; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.circle-meta { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }

/* ===== 搜索栏 ===== */
.search-bar { padding: 20rpx 32rpx; }
.search-inner {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 24rpx;
  font-size: 28rpx;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 80rpx;
  background: #fff;
  border: 2rpx solid #E8E3DB;
  border-radius: 50rpx;
  font-size: 26rpx;
  color: #2C2C2C;
}

/* ===== 智能体列表 ===== */
.bot-list-wrap { padding: 0 24rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }

/* 骨架 */
.bot-skeleton {
  display: flex;
  gap: 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.sk-avatar { width: 112rpx; height: 112rpx; border-radius: 16rpx; background: #E8E3DB; flex-shrink: 0; }
.sk-info { flex: 1; }
.sk-name { height: 32rpx; background: #E8E3DB; border-radius: 8rpx; width: 192rpx; margin-bottom: 12rpx; }
.sk-desc { height: 24rpx; background: #E8E3DB; border-radius: 8rpx; margin-bottom: 8rpx; }
.sk-desc.short { width: 75%; }

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.empty-icon-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #E8E3DB;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-icon { font-size: 64rpx; }
.empty-text { font-size: 28rpx; color: #666; margin-bottom: 16rpx; }
.btn-empty-create {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 50rpx;
  font-size: 26rpx;
  font-weight: 500;
}

/* 卡片 */
.bot-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.bot-card-inner {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}
.bot-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.bot-avatar { width: 112rpx; height: 112rpx; border-radius: 16rpx; background: #F2EFEA; }
.badge-official {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  background: #C41E3A;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge-official-icon { font-size: 20rpx; color: #fff; }

.bot-info { flex: 1; min-width: 0; }
.bot-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.bot-name { font-size: 30rpx; font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bot-category { padding: 4rpx 16rpx; background: #FAF8F5; color: #999; font-size: 22rpx; border-radius: 50rpx; flex-shrink: 0; }
.bot-desc { font-size: 26rpx; color: #666; line-height: 1.5; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }

.bot-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #E8E3DB;
}
.bot-stat-item { display: flex; align-items: center; gap: 8rpx; }
.bot-stat-icon { font-size: 24rpx; }
.bot-stat-num { font-size: 24rpx; color: #999; }
.bot-chat-btn {
  padding: 10rpx 32rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 50rpx;
  font-size: 24rpx;
  font-weight: 500;
}

/* ===== 创建按钮 ===== */
.fab-create {
  position: fixed;
  bottom: 192rpx;
  right: 32rpx;
  width: 112rpx;
  height: 112rpx;
  background: #C41E3A;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(196, 30, 58, 0.4);
}
.fab-icon { font-size: 48rpx; color: #fff; }
</style>
