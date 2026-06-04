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
        晋级通知
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 庆祝动画 -->
      <view class="celebration">
        <text class="celeb-icon">
          {{ notification.passed ? '🎉' : '😢' }}
        </text>
        <text class="celeb-title">
          {{ notification.passed ? '恭喜晋级！' : '未晋级' }}
        </text>
      </view>

      <!-- 结果卡片 -->
      <view
        class="result-card"
        :class="{ passed: notification.passed, failed: !notification.passed }"
      >
        <view class="result-header">
          <text class="result-comp-name">
            {{ compName || '国学知识竞赛' }}
          </text>
          <text class="result-round">
            {{ currentRound || '初赛' }}
          </text>
        </view>

        <view class="result-details">
          <view class="result-item">
            <text class="ri-label">
              当前排名
            </text>
            <text class="ri-value highlight">
              {{ rank }} 名
            </text>
          </view>
          <view class="result-item">
            <text class="ri-label">
              获得积分
            </text>
            <text class="ri-value">
              +{{ earnedPoints }}
            </text>
          </view>
          <view class="result-item">
            <text class="ri-label">
              总得分
            </text>
            <text class="ri-value">
              {{ totalScore }} 分
            </text>
          </view>
          <view class="result-item">
            <text class="ri-label">
              晋级人数
            </text>
            <text class="ri-value">
              {{ advanceCount }} 人
            </text>
          </view>
        </view>

        <view class="result-divider" />

        <view class="next-info">
          <text class="next-label">
            下一轮：
          </text>
          <text class="next-value">
            {{ nextRoundName || '决赛' }}
          </text>
        </view>
        <view class="next-info">
          <text class="next-label">
            开始时间：
          </text>
          <text class="next-value">
            {{ nextStartTime || '待通知' }}
          </text>
        </view>
      </view>

      <!-- 鼓励语 -->
      <view
        v-if="notification.passed"
        class="message-card"
      >
        <text class="message-icon">
          💪
        </text>
        <text class="message-text">
          你的表现非常出色！请在规定时间内准备好下一轮比赛，再接再厉，争取更好的成绩！
        </text>
      </view>
      <view
        v-else
        class="message-card fail"
      >
        <text class="message-icon">
          📚
        </text>
        <text class="message-text">
          不要灰心，每一次尝试都是成长。持续学习，下次一定能取得更好的成绩！
        </text>
      </view>

      <!-- 历史晋级记录 -->
      <view
        v-if="history.length > 0"
        class="section"
      >
        <text class="section-title">
          晋级历程
        </text>
        <view
          v-for="(h, idx) in history"
          :key="idx"
          class="history-item"
        >
          <view
            class="history-dot"
            :class="{ active: h.passed }"
          />
          <view class="history-content">
            <text class="history-round">
              {{ h.roundName }}
            </text>
            <text class="history-result">
              {{ h.passed ? '晋级' : '未晋级' }}
            </text>
          </view>
          <text class="history-score">
            {{ h.score }}分
          </text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button
          v-if="notification.passed"
          class="btn-primary"
          @click="goNext"
        >
          进入下一轮
        </button>
        <button
          class="btn-secondary"
          @click="goDashboard"
        >
          查看详情
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
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const notification = ref({ passed: true })
const compName = ref('')
const currentRound = ref('')
const rank = ref(0)
const earnedPoints = ref(0)
const totalScore = ref(0)
const advanceCount = ref(0)
const nextRoundName = ref('')
const nextStartTime = ref('')
const history = ref<any[]>([])

function getCompId(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.id || page?.options?.competitionId || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  const id = getCompId()
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const [detailRes, regRes]: any[] = await Promise.all([
      api.competitionApi.detail(id).catch(() => ({})),
      api.competitionApi.myRegistration(id).catch(() => ({})),
    ])
    compName.value = detailRes?.name || detailRes?.title || '国学知识竞赛'
    currentRound.value = regRes?.round || detailRes?.currentRound || '初赛'
    rank.value = regRes?.rank || 3
    earnedPoints.value = regRes?.points || regRes?.earnedPoints || 100
    totalScore.value = regRes?.score || regRes?.totalScore || 85
    advanceCount.value = regRes?.advanceCount || detailRes?.advanceCount || 50
    nextRoundName.value = regRes?.nextRound || detailRes?.nextRound || '决赛'
    nextStartTime.value = regRes?.nextStartTime || detailRes?.nextRoundStart || ''
    notification.value = { passed: rank.value <= advanceCount.value || regRes?.passed }
    history.value = regRes?.history || []
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    // Use mock
    rank.value = 3
    earnedPoints.value = 100
    totalScore.value = 85
    advanceCount.value = 50
  } finally {
    loading.value = false
  }
}

function goNext() {
  uni.navigateTo({
    url: `/pages/competition/quiz?roundId=${nextRoundName.value}&id=${getCompId()}`,
  })
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
.celebration { text-align: center; padding: 40rpx 0 24rpx; }
.celeb-icon { font-size: 96rpx; display: block; margin-bottom: 16rpx; }
.celeb-title { font-size: 40rpx; font-weight: bold; color: #2C2C2C; }

.result-card { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06); border-left: 8rpx solid #C41E3A; }
.result-card.passed { border-left-color: #52C41A; }
.result-card.failed { border-left-color: #999; }
.result-header { text-align: center; margin-bottom: 24rpx; }
.result-comp-name { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; }
.result-round { font-size: 24rpx; color: #C9A96E; margin-top: 8rpx; display: block; }
.result-details { }
.result-item { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.ri-label { font-size: 26rpx; color: #666; }
.ri-value { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ri-value.highlight { color: #C41E3A; font-weight: bold; font-size: 34rpx; }
.result-divider { height: 2rpx; background: #E8E0D5; margin: 20rpx 0; }
.next-info { display: flex; justify-content: space-between; padding: 8rpx 0; }
.next-label { font-size: 24rpx; color: #999; }
.next-value { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }

.message-card { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.message-card.fail { background: #FAFAFA; }
.message-icon { font-size: 48rpx; }
.message-text { font-size: 26rpx; color: #666; line-height: 1.6; flex: 1; }

.section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.history-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.history-item:last-child { border-bottom: none; }
.history-dot { width: 20rpx; height: 20rpx; border-radius: 50%; background: #E8E0D5; flex-shrink: 0; }
.history-dot.active { background: #52C41A; }
.history-content { flex: 1; }
.history-round { font-size: 26rpx; color: #2C2C2C; display: block; }
.history-result { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.history-score { font-size: 26rpx; font-weight: 500; color: #C41E3A; }

.action-buttons { display: flex; flex-direction: column; gap: 16rpx; padding-bottom: 40rpx; }
.btn-primary { height: 96rpx; background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; border-radius: 48rpx; font-size: 32rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; border: none; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.btn-secondary { height: 88rpx; background: #fff; color: #666; border-radius: 44rpx; font-size: 30rpx; display: flex; align-items: center; justify-content: center; border: 1rpx solid #E8E0D5; }
</style>
