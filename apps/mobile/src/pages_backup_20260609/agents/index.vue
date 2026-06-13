<template>
  <view class="ag-page">
    <!-- 顶部搜索 -->
    <view class="header-sticky">
      <view class="header-bg">
        <view class="header-top">
          <view class="ht-left">
            <text class="ht-title">智能体广场</text>
            <text class="ht-count">{{ bots.length }}个在线</text>
          </view>
          <view class="ht-history" @click="goPage('/pages/agents/history/index')">
            <text>🕐 对话记录</text>
          </view>
        </view>
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索智能体或直接提问..." />
          <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
          <view class="search-mic" :class="{ listening: isListening }" @click="toggleVoice">
            <text>🎤</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 主入口 -->
    <view class="main-entry" @click="goPage('/pages/agent/main/index')">
      <view class="me-card">
        <view class="me-glow" />
        <view class="me-left">
          <view class="me-icon">
            <text>🤖</text>
          </view>
          <view class="me-info">
            <view class="me-name-row">
              <text class="me-name">热卜智能助手</text>
              <text class="me-status">在线</text>
            </view>
            <text class="me-desc">有任何问题都可以问我，我来帮您解答</text>
          </view>
        </view>
        <view class="me-arrow">
          <text>💬</text>
        </view>
      </view>
    </view>

    <!-- 大家都在问 -->
    <view class="section">
      <view class="sec-head">
        <view class="sec-title-row">
          <text class="sec-icon">🔥</text>
          <text class="sec-title">大家都在问</text>
        </view>
        <text class="sec-more" @click="goPage('/pages/agents/questions/index')">更多 ›</text>
      </view>
      <view class="q-list">
        <view v-for="(q, i) in hotQuestions.slice(0, 3)" :key="q.id" class="q-item" @click="goPage('/pages/agent/id-detail/index?id=' + q.botId + '&q=' + encodeURIComponent(q.question))">
          <view class="q-rank" :class="'rank-' + (i + 1)">{{ i + 1 }}</view>
          <view class="q-info">
            <text class="q-text">{{ q.question }}</text>
            <view class="q-meta">
              <text>{{ q.botName }}</text>
              <text>·</text>
              <text>{{ formatNum(q.views) }}浏览</text>
            </view>
          </view>
          <text class="q-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 智能体列表 -->
    <view class="section">
      <view class="sec-head">
        <view class="sec-title-row">
          <text class="sec-icon">📈</text>
          <text class="sec-title">智能体</text>
        </view>
        <text class="sec-more gold" @click="goPage('/pages/agents/ranking/index')">
          <text>👑 热度榜</text>
        </text>
      </view>

      <view class="bot-list">
        <view v-for="(bot, i) in displayBots" :key="bot.id" class="bot-card" @click="goPage('/pages/agent/id-detail/index?id=' + bot.id)">
          <view class="bc-main">
            <view class="bc-avatar-wrap">
              <view class="bc-avatar" :class="'grad-' + (i % 6)">
                <text>🤖</text>
              </view>
              <view v-if="i < 3" class="bc-rank" :class="'r-' + (i + 1)">{{ i + 1 }}</view>
            </view>
            <view class="bc-info">
              <view class="bc-name-row">
                <text class="bc-name">{{ bot.name }}</text>
                <text v-if="bot.isOfficial" class="bc-official">👑</text>
                <text v-if="bot.isNew" class="bc-new">NEW</text>
              </view>
              <text class="bc-desc">{{ bot.description }}</text>
              <view v-if="bot.capabilities" class="bc-caps">
                <text v-for="cap in bot.capabilities.slice(0, 3)" :key="cap" class="bc-cap">{{ cap }}</text>
              </view>
              <view class="bc-stats">
                <text class="bc-stat">⭐ {{ bot.rating }}</text>
                <text class="bc-stat">{{ formatNum(bot.useCount) }}次对话</text>
                <text v-if="bot.capabilities && bot.capabilities.includes('语音对话')" class="bc-voice">🔊 语音</text>
              </view>
            </view>
            <view class="bc-btn">
              <text>对话</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="bots.length > 4" class="expand-btn" @click="showAll = !showAll">
        <text>{{ showAll ? '收起' : '查看全部' + bots.length + '个智能体' }}</text>
        <text class="expand-arrow" :class="{ open: showAll }">›</text>
      </view>
    </view>

    <view class="bottom-safe" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const isListening = ref(false)
const showAll = ref(false)

const bots = [
  { id: '1', name: '八字命理大师', description: '专业八字排盘解读，精准分析命局特点', category: 'bazi', hotScore: 9856, useCount: 128000, rating: 4.9, tags: ['八字', '命理', '流年运势'], isOfficial: true, isRecommended: true, isNew: false, capabilities: ['语音对话', '图片识别', '深度解析'] },
  { id: '2', name: '奇门遁甲助手', description: '奇门遁甲起局断卦，预测事业、感情、财运', category: 'qimen', hotScore: 7823, useCount: 89000, rating: 4.8, tags: ['奇门', '预测', '决策'], isOfficial: true, isRecommended: true, isNew: false, capabilities: ['实时起局', '详细解读'] },
  { id: '3', name: '国学经典导读', description: '《易经》《道德经》等国学经典深度解读', category: 'guoxue', hotScore: 6542, useCount: 67000, rating: 4.9, tags: ['易经', '国学', '智慧'], isOfficial: true, isRecommended: false, isNew: true, capabilities: ['语音朗读', '原文释义', '智慧问答'] },
  { id: '4', name: '智能起名顾问', description: '结合八字五行、三才五格取吉祥好名', category: 'naming', hotScore: 8234, useCount: 102000, rating: 4.7, tags: ['起名', '五行', '吉祥'], isOfficial: false, isRecommended: true, isNew: false, capabilities: ['五行分析', '寓意解读', '多方案推荐'] },
  { id: '5', name: '紫微斗数解盘', description: '紫微斗数命盘解读，十二宫位详解', category: 'ziwei', hotScore: 5678, useCount: 56000, rating: 4.8, tags: ['紫微', '命盘', '宫位'], isOfficial: true, isRecommended: false, isNew: false, capabilities: ['命盘生成', '详细解读'] },
  { id: '6', name: '国学文案大师', description: '一键生成国学风格推广文案、朋友圈文案', category: 'content', hotScore: 9234, useCount: 156000, rating: 4.9, tags: ['文案', '朋友圈', '短视频'], isOfficial: true, isRecommended: true, isNew: false, capabilities: ['多风格文案', '一键生成', '智能改写'] },
]

const hotQuestions = [
  { id: 'q1', question: '我的八字适合创业还是打工？', botId: '1', botName: '八字命理大师', views: 12800 },
  { id: 'q2', question: '2024年下半年财运如何？', botId: '1', botName: '八字命理大师', views: 9600 },
  { id: 'q3', question: '奇门遁甲如何预测项目成败？', botId: '2', botName: '奇门遁甲助手', views: 8700 },
]

const displayBots = computed(() => showAll.value ? bots : bots.slice(0, 4))

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function toggleVoice() {
  isListening.value = true
  setTimeout(() => { isListening.value = false }, 2000)
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.ag-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 40; }
.header-bg { background: linear-gradient(180deg, #C41E3A 0%, #A01530 100%); padding: 24rpx 24rpx 20rpx; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.ht-left { display: flex; align-items: center; gap: 10rpx; }
.ht-title { font-size: 36rpx; font-weight: 700; color: #fff; }
.ht-count { font-size: 20rpx; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.15); padding: 4rpx 12rpx; border-radius: 20rpx; }
.ht-history { display: flex; align-items: center; }
.ht-history text { font-size: 22rpx; color: rgba(255,255,255,0.8); }

.search-box { display: flex; align-items: center; background: #fff; border-radius: 20rpx; padding: 6rpx 18rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #333; }
.search-clear { font-size: 22rpx; color: #999; padding: 6rpx; }
.search-mic { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.search-mic.listening { background: #C41E3A; }

.main-entry { padding: 18rpx 24rpx; }
.me-card { background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 20rpx; padding: 22rpx 20rpx; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; }
.me-glow { position: absolute; top: -30rpx; right: -30rpx; width: 180rpx; height: 180rpx; border-radius: 50%; background: radial-gradient(circle, rgba(196,30,58,0.3), transparent); }
.me-left { display: flex; align-items: center; gap: 14rpx; }
.me-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; background: linear-gradient(135deg, #C41E3A, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.me-name-row { display: flex; align-items: center; gap: 8rpx; }
.me-name { font-size: 30rpx; font-weight: 700; color: #fff; }
.me-status { font-size: 18rpx; color: #fff; background: #52C41A; padding: 2rpx 10rpx; border-radius: 4rpx; }
.me-desc { font-size: 22rpx; color: rgba(255,255,255,0.5); display: block; margin-top: 6rpx; }
.me-arrow { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 28rpx; }

.section { padding: 8rpx 0; }
.sec-head { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 24rpx; }
.sec-title-row { display: flex; align-items: center; gap: 8rpx; }
.sec-icon { font-size: 26rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.sec-more { font-size: 22rpx; color: #999; }
.sec-more.gold { color: #C9A96E; }

.q-list { padding: 0 24rpx; }
.q-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 18rpx; background: #fff; border-radius: 14rpx; margin-bottom: 8rpx; }
.q-rank { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 700; flex-shrink: 0; }
.q-rank.rank-1 { background: #FF6B35; color: #fff; }
.q-rank.rank-2 { background: #FFB800; color: #fff; }
.q-rank.rank-3 { background: #E8E3DB; color: #666; }
.q-info { flex: 1; min-width: 0; }
.q-text { font-size: 24rpx; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.q-meta { display: flex; gap: 4rpx; margin-top: 4rpx; }
.q-meta text { font-size: 18rpx; color: #BBB; }
.q-arrow { font-size: 28rpx; color: #CCC; flex-shrink: 0; }

.bot-list { padding: 0 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.bot-card { background: #fff; border-radius: 18rpx; padding: 20rpx; }
.bc-main { display: flex; align-items: flex-start; gap: 14rpx; }
.bc-avatar-wrap { position: relative; flex-shrink: 0; }
.bc-avatar { width: 92rpx; height: 92rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.bc-avatar.grad-0 { background: linear-gradient(135deg, #C41E3A, #A01530); }
.bc-avatar.grad-1 { background: linear-gradient(135deg, #7C3AED, #5B21B6); }
.bc-avatar.grad-2 { background: linear-gradient(135deg, #059669, #047857); }
.bc-avatar.grad-3 { background: linear-gradient(135deg, #EA580C, #C2410C); }
.bc-avatar.grad-4 { background: linear-gradient(135deg, #6366F1, #4F46E5); }
.bc-avatar.grad-5 { background: linear-gradient(135deg, #0891B2, #0E7490); }
.bc-rank { position: absolute; top: -6rpx; right: -6rpx; width: 34rpx; height: 34rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18rpx; font-weight: 700; }
.bc-rank.r-1 { background: #FFD700; color: #333; }
.bc-rank.r-2 { background: #C0C0C0; color: #fff; }
.bc-rank.r-3 { background: #CD7F32; color: #fff; }
.bc-info { flex: 1; min-width: 0; }
.bc-name-row { display: flex; align-items: center; gap: 6rpx; margin-bottom: 4rpx; }
.bc-name { font-size: 28rpx; font-weight: 700; color: #2C2C2C; }
.bc-official { font-size: 18rpx; }
.bc-new { font-size: 16rpx; padding: 2rpx 6rpx; border-radius: 4rpx; background: #52C41A; color: #fff; }
.bc-desc { font-size: 22rpx; color: #666; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.bc-caps { display: flex; gap: 6rpx; margin-top: 8rpx; flex-wrap: wrap; }
.bc-cap { font-size: 18rpx; color: #8B7355; background: #F5F0E8; padding: 2rpx 10rpx; border-radius: 12rpx; }
.bc-stats { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.bc-stat { font-size: 20rpx; color: #999; }
.bc-voice { font-size: 18rpx; color: #7C3AED; }
.bc-btn { padding: 10rpx 28rpx; background: #C41E3A; border-radius: 28rpx; flex-shrink: 0; margin-top: 6rpx; }
.bc-btn text { font-size: 24rpx; color: #fff; font-weight: 500; }

.expand-btn { display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 18rpx; margin: 8rpx 24rpx; background: #fff; border-radius: 14rpx; }
.expand-btn text { font-size: 24rpx; color: #666; }
.expand-arrow { font-size: 28rpx; transition: transform 0.2s; }
.expand-arrow.open { transform: rotate(90deg); }

.bottom-safe { height: 40rpx; }
</style>
