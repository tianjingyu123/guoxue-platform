<template>
  <view class="cb-page">
    <!-- Header -->
    <view class="cb-header">
      <view class="cb-hd-btn" @tap="goBack"><app-icon name="chevron-left" :size="44" color="#2C2C2C" /></view>
      <text class="cb-hd-title">圈子智能体</text>
      <view v-if="isAdmin" class="cb-hd-btn" @tap="toComingSoon"><app-icon name="settings" :size="36" color="#666666" /></view>
      <view v-else style="width: 44rpx" />
    </view>

    <!-- Circle Info -->
    <view v-if="circle" class="cb-circle">
      <image class="cb-circle-cover" :src="circle.cover" mode="aspectFill" />
      <view class="cb-circle-info">
        <text class="cb-circle-name">{{ circle.name }}</text>
        <text class="cb-circle-meta">{{ formatNumber(circle.members) }} 成员 · {{ bots.length }} 个智能体</text>
      </view>
    </view>

    <!-- Search -->
    <view class="cb-search-wrap">
      <view class="cb-search">
        <app-icon name="search" :size="30" color="#999999" />
        <input v-model="searchQuery" class="cb-search-input" placeholder="搜索智能体..." placeholder-class="cb-ph" />
      </view>
    </view>

    <!-- Bots -->
    <view class="cb-list-wrap">
      <!-- skeleton -->
      <view v-if="loading" class="cb-list">
        <view v-for="i in 4" :key="i" class="cb-skel">
          <view class="cb-skel-row">
            <view class="cb-skel-avatar" />
            <view class="cb-skel-lines">
              <view class="cb-skel-line w24" /><view class="cb-skel-line wfull" /><view class="cb-skel-line w34" />
            </view>
          </view>
        </view>
      </view>

      <error-state v-else-if="error" :message="error" @retry="loadData" />

      <!-- empty -->
      <view v-else-if="filteredBots.length === 0" class="cb-empty">
        <view class="cb-empty-icon"><app-icon name="bot" :size="56" color="#999999" /></view>
        <text class="cb-empty-t">{{ searchQuery ? '未找到相关智能体' : '暂无智能体' }}</text>
        <view v-if="isAdmin && !searchQuery" class="cb-empty-btn" @tap="toComingSoon">创建智能体</view>
      </view>

      <!-- list -->
      <view v-else class="cb-list">
        <view v-for="bot in filteredBots" :key="bot.id" class="cb-bot" @tap="toComingSoon">
          <view class="cb-bot-top">
            <view class="cb-bot-avatar-wrap">
              <image class="cb-bot-avatar" :src="bot.avatar" mode="aspectFill" />
              <view v-if="bot.isOfficial" class="cb-bot-official"><app-icon name="sparkles" :size="20" color="#ffffff" /></view>
            </view>
            <view class="cb-bot-main">
              <view class="cb-bot-name-row">
                <text class="cb-bot-name">{{ bot.name }}</text>
                <text class="cb-bot-cat">{{ bot.category }}</text>
              </view>
              <text class="cb-bot-desc">{{ bot.description }}</text>
            </view>
          </view>
          <view class="cb-bot-foot">
            <view class="cb-bot-stats">
              <view class="cb-stat"><app-icon name="message-circle" :size="26" color="#999999" /><text class="cb-stat-t">{{ formatNumber(bot.chats) }}</text></view>
              <view class="cb-stat"><app-icon name="heart" :size="26" color="#999999" /><text class="cb-stat-t">{{ formatNumber(bot.likes) }}</text></view>
            </view>
            <view class="cb-bot-chat" @tap.stop="toComingSoon">对话</view>
          </view>
        </view>
      </view>
    </view>

    <!-- FAB -->
    <view v-if="isAdmin && !loading && bots.length > 0" class="cb-fab" @tap="toComingSoon"><app-icon name="plus" :size="40" color="#ffffff" /></view>
  </view>
</template>

<script setup lang="ts">
/**
 * 单圈子智能体列表（从原型 app/circles/[id]/bots/page.tsx 高保真迁移）
 * 区别于 bots.vue（平台智能体市场）：此页为单个圈子内的智能体列表
 * 圈子信息卡 + 搜索 + 骨架屏 + 智能体卡片 + 管理员FAB
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, toastComingSoon } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'

interface Bot { id: string; name: string; avatar: string; description: string; category: string; chats: number; likes: number; isOfficial: boolean }

const mockCircle = {
  id: '1', name: '周易研习社', cover: 'https://api.dicebear.com/7.x/shapes/svg?seed=zhouyi',
  description: '传承易学精髓，探索宇宙奥秘', members: 12800,
}
const mockBots: Bot[] = [
  { id: '1', name: '周易解卦助手', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=1', description: '专业解读六十四卦，帮助您理解卦象含义与人生指引', category: '占卜解读', chats: 12580, likes: 3420, isOfficial: true },
  { id: '2', name: '风水顾问', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=2', description: '提供家居风水布局建议，助您打造和谐居住环境', category: '风水堪舆', chats: 8960, likes: 2180, isOfficial: true },
  { id: '3', name: '八字命理分析', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=3', description: '根据生辰八字分析命理运势，提供人生建议', category: '命理分析', chats: 15620, likes: 4890, isOfficial: false },
  { id: '4', name: '易经学习导师', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=4', description: '系统讲解易经知识，从入门到精通的学习伴侣', category: '学习辅导', chats: 6780, likes: 1560, isOfficial: false },
]

const circleId = ref('1')
const currentUserId = '1' // mock 当前用户 ID
const circle = ref<typeof mockCircle | null>(null)
const bots = ref<Bot[]>([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const isAdmin = ref(false)

const filteredBots = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return bots.value.filter((b) => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
})

function formatNumber(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}
function toComingSoon() { toastComingSoon() }

onLoad((q) => {
  if (q?.id) circleId.value = q.id
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 500))
    circle.value = mockCircle
    bots.value = mockBots
    // mock: circleId='1' 的圈子管理员是 currentUserId='1'
    isAdmin.value = circleId.value === '1'
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.cb-page { min-height: 100vh; background: #FAF8F5; }
.cb-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; height: 112rpx; background: #FAF8F5; border-bottom: 1rpx solid #E8E3DB; }
.cb-hd-btn { padding: 16rpx; }
.cb-hd-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }

.cb-circle { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.cb-circle-cover { width: 96rpx; height: 96rpx; border-radius: 20rpx; background: #F5F0E8; flex-shrink: 0; }
.cb-circle-info { flex: 1; min-width: 0; }
.cb-circle-name { display: block; font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-circle-meta { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }

.cb-search-wrap { padding: 24rpx 32rpx; }
.cb-search { display: flex; align-items: center; gap: 16rpx; padding: 0 28rpx; height: 80rpx; background: #fff; border: 1rpx solid #E8E3DB; border-radius: 999rpx; }
.cb-search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.cb-ph { color: #999999; }

.cb-list-wrap { padding: 0 32rpx 160rpx; }
.cb-list { display: flex; flex-direction: column; gap: 24rpx; }

.cb-skel { background: #fff; border-radius: 32rpx; padding: 32rpx; }
.cb-skel-row { display: flex; align-items: flex-start; gap: 24rpx; }
.cb-skel-avatar { width: 112rpx; height: 112rpx; border-radius: 24rpx; background: #E8E3DB; }
.cb-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.cb-skel-line { height: 24rpx; background: #E8E3DB; border-radius: 8rpx; }
.cb-skel-line.w24 { width: 180rpx; } .cb-skel-line.wfull { width: 100%; } .cb-skel-line.w34 { width: 70%; }

.cb-empty { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.cb-empty-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: #E8E3DB; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.cb-empty-t { color: #666666; margin-bottom: 16rpx; }
.cb-empty-btn { margin-top: 32rpx; padding: 20rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 999rpx; font-size: 28rpx; font-weight: 500; }

.cb-bot { background: #fff; border-radius: 32rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cb-bot-top { display: flex; align-items: flex-start; gap: 24rpx; }
.cb-bot-avatar-wrap { position: relative; flex-shrink: 0; }
.cb-bot-avatar { width: 112rpx; height: 112rpx; border-radius: 24rpx; background: #F5F0E8; }
.cb-bot-official { position: absolute; top: -8rpx; right: -8rpx; width: 40rpx; height: 40rpx; background: #C41E3A; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.cb-bot-main { flex: 1; min-width: 0; }
.cb-bot-name-row { display: flex; align-items: center; gap: 16rpx; }
.cb-bot-name { font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-bot-cat { padding: 2rpx 16rpx; background: #FAF8F5; color: #999999; font-size: 22rpx; border-radius: 999rpx; flex-shrink: 0; }
.cb-bot-desc { display: block; font-size: 26rpx; color: #666666; margin-top: 8rpx; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cb-bot-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #E8E3DB; }
.cb-bot-stats { display: flex; align-items: center; gap: 32rpx; }
.cb-stat { display: flex; align-items: center; gap: 8rpx; } .cb-stat-t { font-size: 22rpx; color: #999999; }
.cb-bot-chat { padding: 12rpx 32rpx; background: #C41E3A; color: #fff; font-size: 22rpx; border-radius: 999rpx; font-weight: 500; }

.cb-fab { position: fixed; bottom: 96rpx; right: 32rpx; width: 112rpx; height: 112rpx; background: #C41E3A; border-radius: 50%; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); display: flex; align-items: center; justify-content: center; }
.cb-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.cb-sk-row { display: flex; gap: 16rpx; }
.cb-sk-block { flex: 1; height: 120rpx; border-radius: 16rpx; }
.sk-anim { background: linear-gradient(90deg, #E8E0D0 25%, #F0EDE6 50%, #E8E0D0 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
