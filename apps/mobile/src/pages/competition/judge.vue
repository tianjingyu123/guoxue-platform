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
        评审打分
      </text>
      <text
        v-if="submissions.length"
        class="header-count"
      >
        共 {{ submissions.length }} 份
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <!-- 统计卡片 -->
      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-num">
            {{ stats.total || submissions.length }}
          </text>
          <text class="stat-label">
            待评
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-num">
            {{ stats.graded || 0 }}
          </text>
          <text class="stat-label">
            已评
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-num">
            {{ stats.avg || '--' }}
          </text>
          <text class="stat-label">
            均分
          </text>
        </view>
      </view>

      <view
        v-if="submissions.length === 0 && !loading"
        class="empty-state"
      >
        <text class="empty-icon">
          ✅
        </text>
        <text class="empty-title">
          暂无待评作品
        </text>
        <text class="empty-desc">
          所有作品已评审完毕
        </text>
      </view>

      <view
        v-for="s in submissions"
        :key="s.id"
        class="sub-card"
      >
        <!-- 选手信息 -->
        <view class="sub-header">
          <image
            v-if="s.avatar"
            :src="s.avatar"
            class="sub-avatar"
            mode="aspectFill"
          />
          <view
            v-else
            class="sub-avatar-placeholder"
          />
          <view class="sub-info">
            <text class="sub-name">
              {{ s.participantName || s.name || s.nickname || '选手' }}
            </text>
            <text class="sub-meta">
              {{ s.group || s.level || '默认组别' }} · {{ s.id?.slice(0, 8) }}
            </text>
          </view>
          <view
            class="sub-status"
            :class="s.graded ? 'graded' : 'pending'"
          >
            <text>{{ s.graded ? '已评' : '待评' }}</text>
          </view>
        </view>

        <!-- 作品内容 -->
        <view class="sub-work">
          <text class="sub-work-title">
            {{ s.title || '作品名称' }}
          </text>
          <text class="sub-work-content">
            {{ s.content || s.description || '暂无内容' }}
          </text>
        </view>

        <!-- 评分区 -->
        <view class="score-area">
          <view class="score-header">
            <text class="score-label">
              评分
            </text>
            <text class="score-hint">
              0-100分
            </text>
          </view>
          <view class="score-input-row">
            <slider
              :value="s.scoreValue || 0"
              min="0"
              max="100"
              active-color="#C41E3A"
              block-color="#C41E3A"
              block-size="32"
              @changing="(e: any) => s.scoreValue = e.detail.value"
              @change="(e: any) => s.scoreValue = e.detail.value"
            />
            <input
              v-model="s.scoreValue"
              type="digit"
              class="score-input"
              placeholder="0"
              maxlength="3"
            >
            <text class="score-unit">
              分
            </text>
          </view>

          <!-- 评分维度 -->
          <view
            v-if="dimensions.length > 0"
            class="dims"
          >
            <view
              v-for="(dim, di) in dimensions"
              :key="di"
              class="dim-row"
            >
              <text class="dim-label">
                {{ dim.name }}
              </text>
              <view class="dim-stars">
                <text
                  v-for="star in 5"
                  :key="star"
                  class="dim-star"
                  :class="{ active: star <= (s.dimScores?.[di] || 0) }"
                  @click="setDimScore(s, di, star)"
                >
                  ★
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 评语 -->
        <view class="comment-area">
          <textarea
            v-model="s.comment"
            placeholder="输入评语（选填）..."
            class="comment-input"
            maxlength="500"
          />
          <text class="comment-count">
            {{ (s.comment || '').length }}/500
          </text>
        </view>

        <!-- 提交按钮 -->
        <button
          class="submit-btn"
          :disabled="s.submitting"
          @click="submitScore(s)"
        >
          <text v-if="s.submitting">
            提交中...
          </text>
          <text v-else>
            {{ s.graded ? '更新评分' : '提交评分' }}
          </text>
        </button>
      </view>
    </scroll-view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="list"
      @retry="fetchSubmissions"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

interface JudgeSubmission {
  id: string
  avatar?: string
  participantName?: string
  name?: string
  nickname?: string
  group?: string
  level?: string
  title?: string
  content?: string
  description?: string
  graded?: boolean
  scoreValue?: number
  dimScores?: number[]
  comment?: string
  submitting?: boolean
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const submissions = ref<JudgeSubmission[]>([])
const stats = ref({ total: 0, graded: 0, avg: '--' })
const dimensions = ref<{ name: string; max: number }[]>([])

onMounted(() => { fetchSubmissions() })

async function fetchSubmissions() {
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const res: any = await api.competitionApi.getJudgeSubmissions?.()
    const list = Array.isArray(res) ? res : res?.list || res?.data || []
    submissions.value = list.map((s: any) => ({
      ...s,
      scoreValue: s.score || s.scoreValue || 0,
      dimScores: s.dimScores || [],
      comment: s.comment || '',
      graded: !!s.score,
    }))
    stats.value = res?.stats || { total: list.length, graded: list.filter((s: any) => s.score).length }
    dimensions.value = res?.dimensions || []
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    // Use mock data for demo
    submissions.value = [
      { id: '1', participantName: '张明远', title: '八字命理分析', content: '乾造：甲子年丙寅月...十神排列如下...', scoreValue: 85 },
      { id: '2', participantName: '李思源', title: '紫微斗数排盘', content: '命宫在寅，兄弟宫...', scoreValue: 0 },
    ]
  } finally {
    loading.value = false
  }
}

function onRefresh() {
  fetchSubmissions()
}

function setDimScore(s: JudgeSubmission, dimIndex: number, score: number) {
  if (!s.dimScores) s.dimScores = []
  s.dimScores[dimIndex] = score
}

async function submitScore(s: JudgeSubmission) {
  if (!s.scoreValue || s.scoreValue < 0 || s.scoreValue > 100) {
    uni.showToast({ title: '请输入0-100的分数', icon: 'none' })
    return
  }
  s.submitting = true
  try {
    const api = require('../../api')
    await api.competitionApi.submitScore?.({
      submissionId: s.id,
      score: Number(s.scoreValue),
      comment: s.comment || '',
      dimScores: s.dimScores,
    })
    s.graded = true
    uni.showToast({ title: '提交成功', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '提交失败', icon: 'none' })
  } finally {
    s.submitting = false
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; flex: 1; }
.header-count { font-size: 24rpx; color: #999; }

.stats-bar { display: flex; gap: 16rpx; padding: 24rpx; }
.stat-item { flex: 1; background: #fff; border-radius: 16rpx; padding: 20rpx; text-align: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.stat-num { font-size: 36rpx; font-weight: bold; color: #C41E3A; display: block; }
.stat-label { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }

.scroll-area { padding: 0 24rpx 40rpx; }
.sub-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }

.sub-header { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.sub-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; }
.sub-avatar-placeholder { width: 64rpx; height: 64rpx; border-radius: 50%; background: #E8E0D5; }
.sub-info { flex: 1; }
.sub-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; }
.sub-meta { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.sub-status { padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 22rpx; }
.sub-status.pending { background: #fef0f0; color: #C41E3A; }
.sub-status.graded { background: #f0faf0; color: #52C41A; }

.sub-work { background: #FAF8F5; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.sub-work-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.sub-work-content { font-size: 24rpx; color: #666; line-height: 1.6; display: block; }

.score-area { margin-bottom: 20rpx; }
.score-header { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.score-label { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.score-hint { font-size: 22rpx; color: #999; }
.score-input-row { display: flex; align-items: center; gap: 16rpx; }
.score-input-row slider { flex: 1; }
.score-input { width: 80rpx; height: 64rpx; border: 1rpx solid #E8E0D5; border-radius: 8rpx; text-align: center; font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.score-unit { font-size: 24rpx; color: #666; }

.dims { margin-top: 16rpx; }
.dim-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.dim-label { font-size: 24rpx; color: #666; width: 120rpx; }
.dim-stars { display: flex; gap: 8rpx; }
.dim-star { font-size: 36rpx; color: #E8E0D5; }
.dim-star.active { color: #C9A96E; }

.comment-area { position: relative; margin-bottom: 16rpx; }
.comment-input { width: 100%; min-height: 120rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 16rpx; font-size: 24rpx; color: #2C2C2C; box-sizing: border-box; }
.comment-count { position: absolute; bottom: 16rpx; right: 16rpx; font-size: 20rpx; color: #ccc; }

.submit-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; border-radius: 40rpx; font-size: 28rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; border: none; }
.submit-btn:disabled { opacity: 0.5; }

.empty-state { padding: 120rpx 40rpx; text-align: center; }
.empty-icon { font-size: 80rpx; display: block; margin-bottom: 24rpx; }
.empty-title { font-size: 30rpx; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.empty-desc { font-size: 26rpx; color: #999; }
</style>
