<template>
  <view class="bots-page">
    <!-- 顶部红色渐变 -->
    <view class="header-red">
      <view class="header-top">
        <view class="header-left">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <text class="header-title">✨ 智能体广场</text>
        </view>
        <text class="header-rank" @click="goRanking">🏆 排行榜</text>
      </view>

      <!-- 搜索入口 -->
      <view class="search-entry" @click="showSearch = true">
        <text class="search-icon">🔍</text>
        <text class="search-placeholder">搜索智能体...</text>
      </view>

      <!-- 分类Tab -->
      <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="cat in categoryList"
            :key="cat.id"
            class="cat-tab"
            :class="{ active: activeCat === cat.id }"
            @click="activeCat = cat.id; fetchBots()"
          >
            <text>{{ cat.icon }} {{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
    </view>

    <!-- Error -->
    <view v-else-if="err" class="err-area">
      <EmptyState icon="📡" title="加载失败" :description="err" action-text="重试" @action="fetchBots" />
    </view>

    <!-- 内容 -->
    <view v-else>
      <!-- 热门智能体 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">🔥 热门智能体</text>
          <text class="section-more" @click="activeCat = 'all'; fetchBots()">查看全部 ›</text>
        </view>

        <view class="bot-grid">
          <view
            v-for="bot in hotBots"
            :key="bot.id"
            class="bot-card"
            @click="goChat(bot.id)"
          >
            <image
              v-if="bot.avatar"
              :src="bot.avatar"
              class="bot-avatar"
              mode="aspectFill"
            />
            <view v-else class="bot-avatar-plain">{{ bot.name?.charAt(0) || '🤖' }}</view>

            <text class="bot-name">{{ bot.name }}</text>
            <text class="bot-desc">{{ bot.description }}</text>

            <view class="bot-meta">
              <text class="bot-rating">⭐ {{ bot.rating || '4.5' }}</text>
              <text class="bot-uses">{{ fmtN(bot.useCount || 0) }} 次</text>
            </view>

            <view class="bot-price">
              <text v-if="bot.isFree" class="free-tag">免费使用</text>
              <text v-else class="paid-tag">💰 {{ bot.price || 0 }}元/次</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 新上线 -->
      <view v-if="newBots.length" class="section">
        <view class="section-header">
          <text class="section-title">✨ 新上线</text>
        </view>
        <scroll-view scroll-x class="new-scroll" :show-scrollbar="false">
          <view class="new-row">
            <view
              v-for="bot in newBots"
              :key="bot.id"
              class="new-card"
              @click="goChat(bot.id)"
            >
              <image v-if="bot.avatar" :src="bot.avatar" class="new-avatar" mode="aspectFill" />
              <view v-else class="new-avatar-plain">{{ bot.name?.charAt(0) }}</view>
              <text class="new-name">{{ bot.name }}</text>
              <text class="new-cat">{{ bot.categoryName }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 全部智能体 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">全部智能体</text>
        </view>
        <view class="bot-grid">
          <view
            v-for="bot in allBots"
            :key="bot.id"
            class="bot-card"
            @click="goChat(bot.id)"
          >
            <image v-if="bot.avatar" :src="bot.avatar" class="bot-avatar" mode="aspectFill" />
            <view v-else class="bot-avatar-plain">{{ bot.name?.charAt(0) || '🤖' }}</view>
            <text class="bot-name">{{ bot.name }}</text>
            <text class="bot-desc">{{ bot.description }}</text>
            <view class="bot-meta">
              <text class="bot-rating">⭐ {{ bot.rating || '4.5' }}</text>
              <text class="bot-uses">{{ fmtN(bot.useCount || 0) }} 次</text>
            </view>
            <view class="bot-price">
              <text v-if="bot.isFree" class="free-tag">免费使用</text>
              <text v-else class="paid-tag">💰 {{ bot.price || 0 }}元/次</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索浮层 -->
    <view v-if="showSearch" class="search-overlay">
      <view class="search-overlay-top">
        <text class="search-overlay-back" @click="showSearch = false">‹</text>
        <view class="search-overlay-box">
          <text class="search-ov-icon">🔍</text>
          <input
            v-model="searchKw"
            class="search-ov-input"
            placeholder="搜索智能体..."
            :focus="true"
            confirm-type="search"
            @confirm="doSearchKw"
          />
        </view>
        <text class="search-ov-btn" @click="doSearchKw">搜索</text>
      </view>
      <view class="search-hot-tags">
        <text class="hot-tags-label">热门搜索</text>
        <view class="hot-tags-row">
          <text v-for="t in hotTags" :key="t" class="hot-tag" @click="searchKw = t; doSearchKw()">{{ t }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { botApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const categoryList = [
  { id: 'all', name: '全部', icon: '▦' },
  { id: 'bazi', name: '八字', icon: '📅' },
  { id: 'fengshui', name: '风水', icon: '🧭' },
  { id: 'health', name: '养生', icon: '❤' },
  { id: 'divination', name: '占卜', icon: '✨' },
  { id: 'naming', name: '起名', icon: '✏' },
  { id: 'dream', name: '解梦', icon: '🌙' },
  { id: 'face', name: '面相', icon: '🔍' },
  { id: 'palm', name: '手相', icon: '🤚' },
]

const hotTags = ['八字', '起名', '风水', '塔罗', '解梦', '养生']

interface BotItem {
  id: string; name: string; avatar?: string; description?: string
  rating?: number; useCount?: number; isFree?: boolean; price?: number
  categoryName?: string; isOfficial?: boolean; isNew?: boolean
}

const activeCat = ref('all')
const loading = ref(true)
const err = ref<string | null>(null)
const hotBots = ref<BotItem[]>([])
const newBots = ref<BotItem[]>([])
const allBots = ref<BotItem[]>([])

const showSearch = ref(false)
const searchKw = ref('')

function fmtN(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

async function fetchBots() {
  loading.value = true; err.value = null
  try {
    // 获取广场数据
    const params: Record<string, any> = {}
    if (activeCat.value !== 'all') params.category = activeCat.value
    const data = await botApi.list(params) as any
    const bots: BotItem[] = Array.isArray(data) ? data : (data?.list || data?.data || [])

    // 热门按useCount排序
    hotBots.value = [...bots].sort((a, b) => (b.useCount || 0) - (a.useCount || 0)).slice(0, 4)
    newBots.value = bots.filter(b => (b as any).isNew).slice(0, 6)
    allBots.value = bots
  } catch (e: any) { err.value = e.errMsg || '加载失败' }
  finally { loading.value = false }
}

function goChat(id: string) {
  uni.navigateTo({ url: `/pages/bots/chat/id-detail/index?id=${id}` })
}

function goRanking() {
  uni.navigateTo({ url: '/pages/agents/ranking/index' })
}

function doSearchKw() {
  if (!searchKw.value.trim()) return
  showSearch.value = false
  uni.navigateTo({ url: `/pages/search/index?q=${encodeURIComponent(searchKw.value)}&type=bot` })
}

onMounted(() => { fetchBots() })
onPullDownRefresh(() => {
  fetchBots().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.bots-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }

/* 红色头部 */
.header-red {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  padding: 16rpx 0 0;
}
.header-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; height: 80rpx;
}
.header-left { display: flex; align-items: center; gap: 12rpx; }
.header-back { font-size: 48rpx; color: #fff; }
.header-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.header-rank { font-size: 24rpx; color: rgba(255,255,255,0.9); }

.search-entry {
  display: flex; align-items: center;
  margin: 0 24rpx 16rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 40rpx; padding: 0 24rpx; height: 72rpx;
}
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-placeholder { font-size: 26rpx; color: rgba(255,255,255,0.6); }

.cat-scroll { white-space: nowrap; padding-bottom: 20rpx; }
.cat-row { display: flex; gap: 10rpx; padding: 0 24rpx; }
.cat-tab {
  flex-shrink: 0; padding: 10rpx 22rpx; border-radius: 32rpx;
  font-size: 24rpx; color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.2);
}
.cat-tab.active { background: #fff; color: #C41E3A; font-weight: 600; }

/* Loading / Error */
.load-area { padding: 24rpx; }
.err-area { padding: 80rpx 24rpx; }

/* 区块 */
.section { padding: 24rpx; }
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20rpx;
}
.section-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #C41E3A; }

/* Bot 卡片网格 */
.bot-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.bot-card {
  background: #fff; border-radius: 20rpx; padding: 24rpx 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.bot-avatar {
  width: 100rpx; height: 100rpx; border-radius: 24rpx; margin-bottom: 16rpx;
}
.bot-avatar-plain {
  width: 100rpx; height: 100rpx; border-radius: 24rpx; margin-bottom: 16rpx;
  background: linear-gradient(135deg, #C9A96E, #A67C52);
  display: flex; align-items: center; justify-content: center;
  font-size: 44rpx; color: #fff;
}
.bot-name { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 6rpx; }
.bot-desc {
  font-size: 22rpx; color: #888; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; min-height: 60rpx;
}
.bot-meta {
  display: flex; justify-content: space-between; width: 100%;
  margin-top: 12rpx; font-size: 22rpx;
}
.bot-rating { color: #C9A96E; }
.bot-uses { color: #aaa; }
.bot-price { margin-top: 12rpx; }
.free-tag {
  font-size: 20rpx; color: #2e7d32; border: 1px solid #a5d6a7;
  background: #e8f5e9; padding: 4rpx 16rpx; border-radius: 16rpx;
}
.paid-tag {
  font-size: 20rpx; color: #fff; background: #C9A96E;
  padding: 4rpx 16rpx; border-radius: 16rpx;
}

/* 新上线 */
.new-scroll { white-space: nowrap; }
.new-row { display: flex; gap: 16rpx; }
.new-card {
  flex-shrink: 0; width: 160rpx; background: #fff;
  border-radius: 16rpx; padding: 20rpx 16rpx;
  text-align: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.new-avatar, .new-avatar-plain {
  width: 80rpx; height: 80rpx; border-radius: 20rpx; margin: 0 auto 12rpx;
}
.new-avatar-plain {
  background: linear-gradient(135deg, #C9A96E, #A67C52);
  display: flex; align-items: center; justify-content: center;
  font-size: 36rpx; color: #fff;
}
.new-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.new-cat { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }

/* 搜索浮层 */
.search-overlay {
  position: fixed; inset: 0; background: #fff; z-index: 100;
}
.search-overlay-top {
  display: flex; align-items: center; gap: 16rpx; padding: 24rpx;
  border-bottom: 1px solid #f0f0f0;
}
.search-overlay-back { font-size: 48rpx; color: #333; }
.search-overlay-box {
  flex: 1; display: flex; align-items: center;
  background: #f5f5f5; border-radius: 40rpx; padding: 0 20rpx; height: 72rpx;
}
.search-ov-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-ov-input { flex: 1; font-size: 26rpx; }
.search-ov-btn { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.search-hot-tags { padding: 24rpx; }
.hot-tags-label { font-size: 26rpx; color: #888; margin-bottom: 16rpx; display: block; }
.hot-tags-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
.hot-tag {
  font-size: 24rpx; color: #666; background: #f5f5f5;
  padding: 8rpx 24rpx; border-radius: 32rpx;
}
</style>
