<template>
  <view class="bots-page">
    <!-- 红渐变头部 -->
    <view class="hero">
      <view class="hero-top">
        <view class="hero-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#fff" />
        </view>
        <view class="hero-title">
          <app-icon name="sparkles" :size="34" color="#fff" />
          <text class="hero-title-text">智能体广场</text>
        </view>
        <view class="hero-btn" @tap="goRanking">
          <app-icon name="trending-up" :size="38" color="#fff" />
        </view>
      </view>
      <!-- 搜索框 -->
      <view class="search-box" @tap="openSearch">
        <app-icon name="search" :size="34" color="#999" />
        <text class="search-ph">搜索智能体、技能...</text>
      </view>
    </view>

    <scroll-view class="body-scroll" scroll-y>
      <!-- 分类 Tab -->
      <scroll-view class="cat-scroll" scroll-x>
        <view class="cat-list">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-item"
            :class="{ 'cat-active': activeCat === cat.id }"
            @tap="activeCat = cat.id"
          >
            <app-icon :name="cat.icon" :size="30" :color="activeCat === cat.id ? '#fff' : '#666'" />
            <text class="cat-name" :class="{ 'cat-name-active': activeCat === cat.id }">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- Banner -->
      <view class="banner">
        <image class="banner-img" :src="banner.image" mode="aspectFill" />
        <view class="banner-overlay">
          <text class="banner-title">{{ banner.title }}</text>
          <text class="banner-desc">{{ banner.desc }}</text>
        </view>
      </view>

      <!-- 热门智能体 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title-wrap">
            <app-icon name="flame" :size="34" color="#C41E3A" />
            <text class="section-title">热门智能体</text>
          </view>
          <view class="section-more" @tap="goRanking">
            <text class="section-more-text">排行榜</text>
            <app-icon name="chevron-right" :size="28" color="#999" />
          </view>
        </view>
        <view class="bot-grid">
          <view v-for="bot in hotBots" :key="bot.id" class="bot-card" @tap="openBot(bot)">
            <view class="bot-card-top">
              <image class="bot-avatar" :src="bot.avatar" mode="aspectFill" />
              <view v-if="bot.isOfficial" class="bot-badge bot-badge-official">
                <app-icon name="badge-check" :size="22" color="#fff" />
                <text class="bot-badge-text">官方</text>
              </view>
              <view v-else-if="bot.isNew" class="bot-badge bot-badge-new">NEW</view>
            </view>
            <text class="bot-name">{{ bot.name }}</text>
            <text class="bot-desc">{{ bot.desc }}</text>
            <view class="bot-foot">
              <view class="bot-rate">
                <app-icon name="star" :size="22" color="#F5A623" />
                <text class="bot-rate-text">{{ bot.rating }}</text>
                <app-icon name="flame" :size="22" color="#C41E3A" />
                <text class="bot-hot-text">{{ bot.hot }}</text>
              </view>
              <view v-if="bot.isFree" class="bot-free">免费</view>
              <view v-else class="bot-price">
                <app-icon name="crown" :size="22" color="#C9A96E" />
                <text class="bot-price-text">{{ bot.price }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 新上线 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title-wrap">
            <app-icon name="sparkles" :size="34" color="#C41E3A" />
            <text class="section-title">新上线</text>
          </view>
        </view>
        <scroll-view class="new-scroll" scroll-x>
          <view class="new-list">
            <view v-for="bot in newBots" :key="bot.id" class="new-card" @tap="openBot(bot)">
              <image class="new-avatar" :src="bot.avatar" mode="aspectFill" />
              <text class="new-name">{{ bot.name }}</text>
              <text class="new-desc">{{ bot.desc }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 为你推荐 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title-wrap">
            <app-icon name="compass" :size="34" color="#C41E3A" />
            <text class="section-title">为你推荐</text>
          </view>
        </view>
        <view class="feed-list">
          <view v-for="card in feedCards" :key="card.id" class="feed-card" @tap="onFeed(card)">
            <view class="feed-icon" :class="'feed-icon-' + card.type">
              <app-icon :name="feedIcon(card.type)" :size="32" color="#fff" />
            </view>
            <view class="feed-body">
              <text class="feed-title">{{ card.title }}</text>
              <text class="feed-desc">{{ card.desc }}</text>
            </view>
            <app-icon name="chevron-right" :size="28" color="#ccc" />
          </view>
        </view>
        <view style="height: 40rpx" />
      </view>
    </scroll-view>

    <!-- 搜索弹层 -->
    <view v-if="searchOpen" class="search-mask">
      <view class="search-panel">
        <view class="search-bar">
          <view class="search-input-wrap">
            <app-icon name="search" :size="32" color="#999" />
            <input
              class="search-input"
              v-model="searchKeyword"
              placeholder="搜索智能体、技能..."
              focus
              confirm-type="search"
            />
          </view>
          <text class="search-cancel" @tap="closeSearch">取消</text>
        </view>
        <view class="hot-search">
          <text class="hot-search-tip">热门搜索</text>
          <view class="hot-tags">
            <view
              v-for="(tag, i) in hotSearches"
              :key="i"
              class="hot-tag"
              @tap="searchKeyword = tag"
            >{{ tag }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'

const activeCat = ref('all')
const searchOpen = ref(false)
const searchKeyword = ref('')

const categories = [
  { id: 'all', name: '全部', icon: 'grid-3x3' },
  { id: 'bazi', name: '八字', icon: 'calendar' },
  { id: 'fengshui', name: '风水', icon: 'compass' },
  { id: 'health', name: '养生', icon: 'heart' },
  { id: 'divination', name: '占卜', icon: 'sparkles' },
  { id: 'naming', name: '起名', icon: 'pen-tool' },
  { id: 'dream', name: '解梦', icon: 'moon' },
  { id: 'face', name: '面相', icon: 'scan' },
  { id: 'palm', name: '手相', icon: 'hand' },
  { id: 'other', name: '其他', icon: 'more-horizontal' },
]

const banner = {
  title: '紫微大师 AI 助手',
  desc: '专业命理分析，24小时为你解惑',
  image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
}

const hotBots = [
  { id: 1, name: '紫微大师', desc: '精通紫微斗数，专业命盘解析', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ziwei', rating: 4.9, hot: '12.8w', isOfficial: true, isNew: false, isFree: false, price: '¥9.9' },
  { id: 2, name: '八字先生', desc: '生辰八字推算，运势预测', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bazi', rating: 4.8, hot: '9.5w', isOfficial: true, isNew: false, isFree: true, price: '' },
  { id: 3, name: '风水罗盘', desc: '居家办公风水布局指导', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=fengshui', rating: 4.7, hot: '6.2w', isOfficial: false, isNew: true, isFree: true, price: '' },
  { id: 4, name: '解梦精灵', desc: '周公解梦，梦境深度分析', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=dream', rating: 4.6, hot: '5.1w', isOfficial: false, isNew: false, isFree: false, price: '¥6.6' },
]

const newBots = [
  { id: 5, name: '起名大师', desc: '宝宝起名', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=naming' },
  { id: 6, name: '面相分析', desc: '看相识人', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=face' },
  { id: 7, name: '塔罗占卜', desc: '塔罗牌解读', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tarot' },
  { id: 8, name: '养生顾问', desc: '中医养生', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=health' },
]

const feedCards = [
  { id: 1, type: 'bot_recommend', title: '今日推荐：紫微大师', desc: '超过12万用户的选择，专业命理解析', botId: 1 },
  { id: 2, type: 'hot_topic', title: '热门话题：2024 流年运势', desc: '大家都在问的流年运势分析', topic: '流年运势' },
  { id: 3, type: 'user_story', title: '用户故事：他这样改变了命运', desc: '通过 AI 命理指导找到人生方向', storyId: 1 },
]

const hotSearches = ['紫微斗数', '八字算命', '今年运势', '风水布局', '宝宝起名', '塔罗牌']

function feedIcon(type: string): string {
  if (type === 'bot_recommend') return 'sparkles'
  if (type === 'hot_topic') return 'flame'
  return 'star'
}

function openBot(bot: any) {
  navigateTo(`/pkg-agent/bots/chat?id=${bot.id}`)
}

function onFeed(card: any) {
  if (card.type === 'bot_recommend' && card.botId) {
    navigateTo(`/pkg-agent/bots/chat?id=${card.botId}`)
  } else {
    uni.showToast({ title: '功能开发中', icon: 'none' })
  }
}

function openSearch() {
  searchOpen.value = true
}
function closeSearch() {
  searchOpen.value = false
  searchKeyword.value = ''
}

function goRanking() {
  navigateTo('/pkg-agent/agents/ranking')
}
</script>

<style scoped>
.bots-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf8f5;
}

/* 头部 */
.hero {
  background: linear-gradient(135deg, #c41e3a, #e8544e);
  padding: 0 24rpx 24rpx;
  padding-top: calc(env(safe-area-inset-top) + 16rpx);
  flex-shrink: 0;
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
}
.hero-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.hero-title-text {
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
}
.search-box {
  margin-top: 16rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 12rpx;
}
.search-ph {
  font-size: 26rpx;
  color: #999;
}

/* 分类 */
.body-scroll {
  flex: 1;
  overflow: hidden;
}
.cat-scroll {
  white-space: nowrap;
  background: #fff;
  padding: 20rpx 0;
}
.cat-list {
  display: inline-flex;
  padding: 0 16rpx;
  gap: 12rpx;
}
.cat-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
}
.cat-active {
  background: #c41e3a;
}
.cat-name {
  font-size: 22rpx;
  color: #666;
}
.cat-name-active {
  color: #fff;
}

/* Banner */
.banner {
  margin: 24rpx;
  height: 220rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
}
.banner-img {
  width: 100%;
  height: 100%;
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.5), transparent);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 32rpx;
}
.banner-title {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
}
.banner-desc {
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  margin-top: 8rpx;
}

/* 区块 */
.section {
  margin: 0 24rpx;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24rpx 0 16rpx;
}
.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.section-more {
  display: flex;
  align-items: center;
}
.section-more-text {
  font-size: 24rpx;
  color: #999;
}

/* 热门网格 */
.bot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.bot-card {
  width: calc(50% - 10rpx);
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-sizing: border-box;
}
.bot-card-top {
  position: relative;
  display: flex;
}
.bot-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: #f5f5f5;
}
.bot-badge {
  position: absolute;
  top: 0;
  left: 60rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
}
.bot-badge-official {
  background: #c41e3a;
}
.bot-badge-text {
  color: #fff;
  font-size: 18rpx;
}
.bot-badge-new {
  background: #f5a623;
  color: #fff;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
}
.bot-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-top: 16rpx;
}
.bot-desc {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 60rpx;
}
.bot-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.bot-rate {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.bot-rate-text {
  font-size: 22rpx;
  color: #666;
  margin-right: 8rpx;
}
.bot-hot-text {
  font-size: 22rpx;
  color: #999;
}
.bot-free {
  font-size: 22rpx;
  color: #27ae60;
  font-weight: 600;
}
.bot-price {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.bot-price-text {
  font-size: 22rpx;
  color: #c9a96e;
  font-weight: 600;
}

/* 新上线 */
.new-scroll {
  white-space: nowrap;
}
.new-list {
  display: inline-flex;
  gap: 20rpx;
}
.new-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 180rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
}
.new-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: #f5f5f5;
}
.new-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  margin-top: 12rpx;
}
.new-desc {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}

/* 推荐 feed */
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.feed-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.feed-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feed-icon-bot_recommend {
  background: #c41e3a;
}
.feed-icon-hot_topic {
  background: #f5a623;
}
.feed-icon-user_story {
  background: #c9a96e;
}
.feed-body {
  flex: 1;
  min-width: 0;
}
.feed-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.feed-desc {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

/* 搜索弹层 */
.search-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
}
.search-panel {
  background: #fff;
  padding: calc(env(safe-area-inset-top) + 16rpx) 24rpx 24rpx;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.search-input-wrap {
  flex: 1;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 12rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
}
.search-cancel {
  font-size: 28rpx;
  color: #c41e3a;
}
.hot-search {
  margin-top: 32rpx;
}
.hot-search-tip {
  font-size: 26rpx;
  color: #666;
  font-weight: 600;
}
.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}
.hot-tag {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #666;
}
</style>
