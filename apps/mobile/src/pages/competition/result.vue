<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <text
        class="back-btn"
        @click="uni.navigateBack"
      >
        ‹
      </text>
      <text class="header-title">
        竞赛成绩
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 成绩展示 -->
      <view class="score-hero">
        <text class="score-emoji">
          {{ scoreEmoji }}
        </text>
        <text
          class="score-grade"
          :style="{ color: scoreColor }"
        >
          {{ gradeText }}
        </text>

        <view class="score-circle">
          <view class="score-ring">
            <text class="score-num">
              {{ totalScore }}
            </text>
            <text class="score-unit">
              分
            </text>
          </view>
          <view class="score-ring-bg" />
          <view
            class="score-ring-fill"
            :style="{ transform: `rotate(${scoreAngle}deg)` }"
          />
        </view>

        <text class="score-comp">
          {{ compName }}
        </text>
        <text class="score-round">
          {{ roundName }} · {{ submittedAt }}
        </text>
      </view>

      <!-- 数据统计 -->
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-icon">
            ✅
          </text>
          <text class="stat-val">
            {{ correctCount }}
          </text>
          <text class="stat-label">
            正确
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-icon">
            ❌
          </text>
          <text class="stat-val">
            {{ wrongCount }}
          </text>
          <text class="stat-label">
            错误
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-icon">
            ⏱
          </text>
          <text class="stat-val">
            {{ formatDuration }}
          </text>
          <text class="stat-label">
            用时
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-icon">
            🏅
          </text>
          <text class="stat-val">
            {{ rank || '--' }}
          </text>
          <text class="stat-label">
            排名
          </text>
        </view>
      </view>

      <!-- 正确率条 -->
      <view class="accuracy-bar">
        <view class="acc-header">
          <text class="acc-label">
            正确率
          </text>
          <text
            class="acc-value"
            :style="{ color: scoreColor }"
          >
            {{ accuracyPct }}%
          </text>
        </view>
        <view class="acc-track">
          <view
            class="acc-fill"
            :style="{ width: accuracyPct + '%', background: scoreColor }"
          />
        </view>
        <view class="acc-scale">
          <text>0%</text>
          <text>50%</text>
          <text>100%</text>
        </view>
      </view>

      <!-- 各题型得分 -->
      <view
        v-if="sectionScores.length > 0"
        class="section"
      >
        <text class="section-title">
          题型得分
        </text>
        <view
          v-for="(ss, idx) in sectionScores"
          :key="idx"
          class="section-score-row"
        >
          <text class="ss-label">
            {{ ss.name }}
          </text>
          <text class="ss-value">
            {{ ss.correct }}/{{ ss.total }}
          </text>
          <view class="ss-bar">
            <view
              class="ss-fill"
              :style="{ width: (ss.correct / ss.total * 100) + '%' }"
            />
          </view>
        </view>
      </view>

      <!-- 排名变化 -->
      <view
        v-if="rankHistory.length > 0"
        class="section"
      >
        <text class="section-title">
          排名变化
        </text>
        <view class="rank-chart">
          <view
            v-for="(rh, idx) in rankHistory"
            :key="idx"
            class="rank-point"
          >
            <view
              v-if="idx < rankHistory.length - 1"
              class="rp-line"
            />
            <text
              class="rp-dot"
              :class="{ current: idx === rankHistory.length - 1 }"
            >
              {{ rh.rank }}
            </text>
            <text class="rp-label">
              {{ rh.round }}
            </text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button
          class="btn-primary"
          @click="goDetail"
        >
          查看详细答案
        </button>
        <button
          v-if="passed"
          class="btn-secondary"
          @click="goPromotion"
        >
          查看晋级情况
        </button>
        <button
          class="btn-ghost"
          @click="goDashboard"
        >
          返回竞赛首页
        </button>
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
const totalScore = ref(0)
const totalQuestions = ref(0)
const correctCount = ref(0)
const wrongCount = ref(0)
const duration = ref(0)
const rank = ref<number | string>('--')
const passed = ref(false)
const compName = ref('')
const roundName = ref('')
const submittedAt = ref('')
const sectionScores = ref<any[]>([])
const rankHistory = ref<any[]>([])
const fullQuestions = ref<any[]>([])

const scoreColor = computed(() => {
  const pct = accuracyPct.value
  if (pct >= 90) return '#52C41A'
  if (pct >= 70) return '#C9A96E'
  if (pct >= 60) return '#F59E0B'
  return '#C41E3A'
})

const scoreEmoji = computed(() => {
  const pct = accuracyPct.value
  if (pct >= 90) return '🏆'
  if (pct >= 70) return '🎉'
  if (pct >= 60) return '👍'
  return '💪'
})

const gradeText = computed(() => {
  const pct = accuracyPct.value
  if (pct >= 90) return '优秀'
  if (pct >= 80) return '良好'
  if (pct >= 70) return '中等'
  if (pct >= 60) return '及格'
  return '不及格'
})

const accuracyPct = computed(() => {
  if (totalQuestions.value === 0) return 0
  return Math.round((correctCount.value / totalQuestions.value) * 100)
})

const scoreAngle = computed(() => {
  return (accuracyPct.value / 100) * 180
})

const formatDuration = computed(() => {
  const m = Math.floor(duration.value / 60)
  const s = duration.value % 60
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
})

function getCompId(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.id || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  const id = getCompId()
  loading.value = true; loadError.value = null
  try {
    // Try to get from params first
    const pages = getCurrentPages()
    const opts = (pages[pages.length - 1] as any)?.options || {}
    if (opts.score) totalScore.value = Number(opts.score)
    if (opts.correct) correctCount.value = Number(opts.correct)
    if (opts.total) totalQuestions.value = Number(opts.total)
    if (opts.duration) duration.value = Number(opts.duration)
    if (opts.rank) rank.value = Number(opts.rank)
    submittedAt.value = opts.submittedAt || new Date().toLocaleString()

    wrongCount.value = totalQuestions.value - correctCount.value

    // Load detail from API
    const res: any = await competitionApi.detail(id).catch(() => ({}))
    compName.value = res?.name || res?.title || '国学竞赛'
    roundName.value = res?.currentRound || '初赛'

    // Load ranking
    const rankRes: any = await competitionApi.rankings(id).catch(() => ({}))
    const rankList = Array.isArray(rankRes) ? rankRes : rankRes?.list || []
    if (rankList.length > 0 && rank.value === '--') {
      rank.value = rankList.findIndex((r: any) => r.isMe) + 1 || '--'
    }

    // Load full paper for detail
    try {
      const paperRes: any = await competitionApi.getPaper(id)
      fullQuestions.value = paperRes?.questions || []
      sectionScores.value = paperRes?.sections || []
      rankHistory.value = paperRes?.rankHistory || []
    } catch {}
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goDetail() {
  uni.navigateTo({ url: '/pages/competition/score-detail?id=' + getCompId() + '&score=' + totalScore.value })
}

function goPromotion() {
  uni.navigateTo({ url: '/pages/competition/promotion-notice?id=' + getCompId() })
}

function goDashboard() {
  uni.navigateTo({ url: '/pages/competition/dashboard?id=' + getCompId() })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }

.scroll-area { padding: 24rpx; }
.score-hero { text-align: center; padding: 40rpx 0; margin-bottom: 24rpx; }
.score-emoji { font-size: 80rpx; display: block; margin-bottom: 8rpx; }
.score-grade { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 32rpx; }
.score-circle { position: relative; width: 240rpx; height: 120rpx; margin: 0 auto 32rpx; overflow: hidden; }
.score-ring { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); text-align: center; }
.score-num { font-size: 64rpx; font-weight: bold; color: #2C2C2C; display: block; line-height: 1; }
.score-unit { font-size: 28rpx; color: #999; }
.score-ring-bg { position: absolute; bottom: 0; left: 0; right: 0; height: 240rpx; border-radius: 50%; border: 12rpx solid #E8E0D5; }
.score-ring-fill { position: absolute; bottom: 0; left: 0; right: 0; height: 240rpx; border-radius: 50%; border: 12rpx solid; clip: rect(0, 120rpx, 240rpx, 0); }
.score-comp { font-size: 28rpx; color: #2C2C2C; display: block; font-weight: 500; }
.score-round { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; margin-bottom: 24rpx; }
.stat-item { background: #fff; border-radius: 16rpx; padding: 20rpx 8rpx; text-align: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.stat-icon { font-size: 32rpx; display: block; margin-bottom: 8rpx; }
.stat-val { font-size: 32rpx; font-weight: bold; color: #2C2C2C; display: block; }
.stat-label { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }

.accuracy-bar { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.acc-header { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.acc-label { font-size: 26rpx; color: #666; }
.acc-value { font-size: 28rpx; font-weight: bold; }
.acc-track { height: 16rpx; background: #E8E0D5; border-radius: 8rpx; overflow: hidden; }
.acc-fill { height: 100%; border-radius: 8rpx; transition: width 1s ease; }
.acc-scale { display: flex; justify-content: space-between; margin-top: 8rpx; font-size: 20rpx; color: #ccc; }

.section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }

.section-score-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.ss-label { font-size: 24rpx; color: #666; width: 120rpx; }
.ss-value { font-size: 24rpx; color: #C41E3A; font-weight: 500; width: 80rpx; text-align: center; }
.ss-bar { flex: 1; height: 12rpx; background: #E8E0D5; border-radius: 6rpx; overflow: hidden; }
.ss-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #C9A96E); border-radius: 6rpx; }

.rank-chart { display: flex; justify-content: space-between; padding: 20rpx 0; }
.rank-point { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
.rp-line { position: absolute; top: 20rpx; left: 50%; width: 100%; height: 4rpx; background: #E8E0D5; }
.rp-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: #E8E0D5; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; font-weight: 500; margin-bottom: 8rpx; }
.rp-dot.current { background: #C41E3A; color: #fff; }
.rp-label { font-size: 20rpx; color: #999; }

.action-buttons { display: flex; flex-direction: column; gap: 16rpx; padding-bottom: 40rpx; }
.btn-primary { height: 96rpx; background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; border-radius: 48rpx; font-size: 32rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; border: none; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.btn-secondary { height: 88rpx; background: #fff; color: #C41E3A; border-radius: 44rpx; font-size: 30rpx; display: flex; align-items: center; justify-content: center; border: 2rpx solid #C41E3A; }
.btn-ghost { height: 80rpx; color: #999; font-size: 28rpx; display: flex; align-items: center; justify-content: center; background: none; border: none; }
</style>
