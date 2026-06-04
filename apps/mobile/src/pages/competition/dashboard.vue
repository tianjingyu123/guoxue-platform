<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <text class="back-btn" @click="uni.navigateBack">‹</text>
      <text class="header-title">{{ comp.name || comp.title || '竞赛详情' }}</text>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 统计数据 -->
      <view class="stats-grid">
        <view class="stat-card primary">
          <text class="s-icon">👥</text>
          <text class="s-val">{{ stats.totalPlayers || stats.enrolledCount || 0 }}</text>
          <text class="s-label">参赛人数</text>
        </view>
        <view class="stat-card">
          <text class="s-icon">📊</text>
          <text class="s-val">{{ stats.avgScore || '--' }}</text>
          <text class="s-label">平均分</text>
        </view>
        <view class="stat-card">
          <text class="s-icon">🏅</text>
          <text class="s-val">{{ myRank || '-' }}</text>
          <text class="s-label">我的排名</text>
        </view>
        <view class="stat-card">
          <text class="s-icon">🎯</text>
          <text class="s-val">{{ myScore || '--' }}</text>
          <text class="s-label">我的分数</text>
        </view>
      </view>

      <!-- 竞赛信息 -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">竞赛状态</text>
          <text class="info-val" :style="{ color: statusColor }">{{ statusText }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">开始时间</text>
          <text class="info-val">{{ formatDate(comp.startDate) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">结束时间</text>
          <text class="info-val">{{ formatDate(comp.endDate) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">当前轮次</text>
          <text class="info-val">{{ comp.currentRound || comp.round || '--' }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button v-if="canRegister" class="action-btn register" @click="goRegister">立即报名</button>
        <button v-if="canQuiz" class="action-btn quiz" @click="goQuiz">开始答题</button>
        <button v-if="showResult" class="action-btn result" @click="goResult">查看成绩</button>
      </view>

      <!-- 排行榜 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">🏆 排行榜</text>
          <text class="section-more" @click="goFullRanking">查看全部</text>
        </view>

        <view v-if="ranking.length === 0" class="empty-rank">
          <text class="empty-text">暂无排行数据</text>
        </view>

        <view v-for="(r, idx) in ranking.slice(0, 10)" :key="r.id || idx" class="rank-item" :class="{ 'is-me': r.isMe }">
          <view class="rank-left">
            <text class="rank-num" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</text>
            <image v-if="r.avatar" :src="r.avatar" class="rank-avatar" mode="aspectFill" />
            <view v-else class="rank-avatar-placeholder" />
          </view>
          <view class="rank-center">
            <text class="rank-name">{{ r.nickname || r.name || r.username || '选手' }}</text>
            <text class="rank-detail" v-if="r.school">来自 {{ r.school }}</text>
          </view>
          <view class="rank-right">
            <text class="rank-score">{{ r.score || r.totalScore }}分</text>
            <text class="rank-duration" v-if="r.duration">用时 {{ r.duration }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="detail"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { competitionApi } from '../../api'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const comp = ref<any>({})
const stats = ref<any>({})
const ranking = ref<any[]>([])
const myRank = ref<string | number>('-')
const myScore = ref<string | number>('--')
const canRegister = ref(false)
const canQuiz = ref(false)
const showResult = ref(false)

const statusColor = computed(() => {
  const s = comp.value?.status || ''
  if (s === 'ongoing' || s === 'active') return '#52C41A'
  if (s === 'upcoming' || s === 'pending') return '#C9A96E'
  return '#999'
})

const statusText = computed(() => {
  const s = comp.value?.status || ''
  const map: Record<string, string> = {
    ongoing: '进行中', active: '进行中',
    upcoming: '即将开始', pending: '即将开始',
    ended: '已结束', finished: '已结束',
    draft: '筹备中',
  }
  return map[s] || s
})

function getCompId(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.id || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  const id = getCompId()
  if (!id) { loading.value = false; return }
  loading.value = true; loadError.value = null
  try {
    const [compRes, rankRes, myReg]: any[] = await Promise.all([
      competitionApi.detail(id),
      competitionApi.rankings(id),
      competitionApi.myRegistration(id).catch(() => null),
    ])
    comp.value = compRes || {}
    ranking.value = Array.isArray(rankRes) ? rankRes : rankRes?.list || rankRes?.data || []
    stats.value = compRes?.stats || {}

    if (myReg) {
      myRank.value = myReg.rank || '-'
      myScore.value = myReg.score || '--'
    }

    const status = compRes?.status || ''
    canRegister.value = status === 'upcoming' || status === 'pending' || status === 'draft'
    canQuiz.value = status === 'ongoing' || status === 'active'
    showResult.value = status === 'ended' || status === 'finished' || !!myReg
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function formatDate(d?: string): string {
  if (!d) return '--'
  return d.slice(0, 10)
}

function goRegister() {
  uni.navigateTo({ url: '/pages/competition/register?id=' + getCompId() })
}

function goQuiz() {
  const roundId = comp.value?.currentRoundId || comp.value?.roundId || getCompId()
  uni.navigateTo({ url: '/pages/competition/quiz?roundId=' + roundId + '&id=' + getCompId() })
}

function goResult() {
  uni.navigateTo({ url: '/pages/competition/result?id=' + getCompId() })
}

function goFullRanking() {
  uni.navigateTo({ url: '/pages/competition/score-detail?id=' + getCompId() })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.scroll-area { padding: 24rpx; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; margin-bottom: 24rpx; }
.stat-card { background: #fff; border-radius: 16rpx; padding: 20rpx 12rpx; text-align: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.stat-card.primary { background: linear-gradient(135deg, #C41E3A, #A01830); }
.stat-card.primary .s-val, .stat-card.primary .s-label { color: #fff; }
.s-icon { font-size: 36rpx; display: block; margin-bottom: 8rpx; }
.s-val { font-size: 34rpx; font-weight: bold; color: #C41E3A; display: block; }
.s-label { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }

.info-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26rpx; color: #999; }
.info-val { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }

.action-buttons { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.action-btn { flex: 1; height: 88rpx; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; border: none; }
.register { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.quiz { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.result { background: #fff; color: #C41E3A; border: 2rpx solid #C41E3A; }

.section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #C41E3A; }
.empty-rank { padding: 40rpx 0; text-align: center; }
.empty-text { font-size: 26rpx; color: #ccc; }

.rank-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.rank-item.is-me { background: rgba(196,30,58,0.03); margin: 0 -16rpx; padding: 16rpx; border-radius: 12rpx; }
.rank-item:last-child { border-bottom: none; }
.rank-left { display: flex; align-items: center; gap: 12rpx; }
.rank-num { width: 40rpx; font-size: 28rpx; font-weight: bold; color: #999; text-align: center; }
.rank-1 { color: #C9A96E; }
.rank-2 { color: #A8A8A8; }
.rank-3 { color: #CD7F32; }
.rank-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; }
.rank-avatar-placeholder { width: 56rpx; height: 56rpx; border-radius: 50%; background: #E8E0D5; }
.rank-center { flex: 1; min-width: 0; }
.rank-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.rank-detail { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.rank-right { text-align: right; }
.rank-score { font-size: 28rpx; font-weight: bold; color: #C41E3A; display: block; }
.rank-duration { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
</style>
