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
        答题详情
      </text>
      <text
        class="header-score"
        :style="{ color: scoreColor }"
      >
        {{ totalScore }}分
      </text>
    </view>

    <!-- Tabs -->
    <view class="tabs">
      <text
        class="tab"
        :class="{ active: tab === 'all' }"
        @click="tab = 'all'"
      >
        全部
      </text>
      <text
        class="tab"
        :class="{ active: tab === 'correct' }"
        @click="tab = 'correct'"
      >
        正确
      </text>
      <text
        class="tab"
        :class="{ active: tab === 'wrong' }"
        @click="tab = 'wrong'"
      >
        错误
      </text>
      <text
        class="tab"
        :class="{ active: tab === 'unanswered' }"
        @click="tab = 'unanswered'"
      >
        未答
      </text>
    </view>

    <!-- 题目列表 -->
    <scroll-view
      v-if="filteredQuestions.length > 0"
      scroll-y
      class="scroll-area"
    >
      <view
        v-for="(q, idx) in filteredQuestions"
        :key="q.id || idx"
        class="q-card"
      >
        <view class="q-header">
          <text class="q-num">
            第 {{ q.index || idx + 1 }} 题
          </text>
          <text
            class="q-tag"
            :class="q.correct ? 'correct' : q.userAnswer !== undefined ? 'wrong' : 'skip'"
          >
            {{ q.correct ? '✓ 正确' : q.userAnswer !== undefined ? '✗ 错误' : '— 未答' }}
          </text>
        </view>

        <text class="q-title">
          {{ q.title || q.stem || q.question }}
        </text>

        <!-- 选择题 -->
        <view
          v-if="q.options?.length"
          class="options"
        >
          <view
            v-for="(opt, oi) in q.options"
            :key="oi"
            class="option-item"
            :class="{
              correct: oi === q.answer,
              wrong: oi === q.userAnswer && !q.correct,
              user: oi === q.userAnswer,
            }"
          >
            <text class="option-label">
              {{ String.fromCharCode(65 + oi) }}
            </text>
            <text class="option-text">
              {{ typeof opt === 'string' ? opt : opt.text || opt }}
            </text>
            <text
              v-if="oi === q.answer"
              class="option-check"
            >
              ✓
            </text>
          </view>
        </view>

        <!-- 解析 -->
        <view
          v-if="q.explanation || q.analysis"
          class="explanation"
        >
          <text class="exp-icon">
            💡
          </text>
          <text class="exp-text">
            {{ q.explanation || q.analysis }}
          </text>
        </view>

        <!-- 参考来源 -->
        <view
          v-if="q.source"
          class="source"
        >
          <text class="source-text">
            📖 参考：{{ q.source }}
          </text>
        </view>
      </view>
    </scroll-view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && questions.length === 0"
      empty-icon="📝"
      empty-title="暂无题目详情"
      skeleton-type="list"
      @retry="fetchData"
    />

    <!-- 底部统计 -->
    <view
      v-if="questions.length > 0"
      class="bottom-bar"
    >
      <view class="bottom-stats">
        <text class="bs-item">
          <text class="bs-dot correct" />正确 {{ correctCount }}
        </text>
        <text class="bs-item">
          <text class="bs-dot wrong" />错误 {{ wrongCount }}
        </text>
        <text class="bs-item">
          <text class="bs-dot skip" />未答 {{ unansweredCount }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { competitionApi } from '../../api'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const questions = ref<any[]>([])
const totalScore = ref(0)
const tab = ref('all')

const correctCount = computed(() => questions.value.filter((q: any) => q.correct).length)
const wrongCount = computed(() => questions.value.filter((q: any) => q.userAnswer !== undefined && !q.correct).length)
const unansweredCount = computed(() => questions.value.filter((q: any) => q.userAnswer === undefined).length)

const scoreColor = computed(() => {
  if (questions.value.length === 0) return '#999'
  const pct = correctCount.value / questions.value.length
  if (pct >= 0.9) return '#52C41A'
  if (pct >= 0.7) return '#C9A96E'
  if (pct >= 0.6) return '#F59E0B'
  return '#C41E3A'
})

const filteredQuestions = computed(() => {
  if (tab.value === 'all') return questions.value
  if (tab.value === 'correct') return questions.value.filter((q: any) => q.correct)
  if (tab.value === 'wrong') return questions.value.filter((q: any) => q.userAnswer !== undefined && !q.correct)
  if (tab.value === 'unanswered') return questions.value.filter((q: any) => q.userAnswer === undefined)
  return questions.value
})

onMounted(() => { fetchData() })

async function fetchData() {
  loading.value = true; loadError.value = null
  try {
    const pages = getCurrentPages()
    const opts = (pages[pages.length - 1] as any)?.options || {}
    const id = opts.id || ''
    totalScore.value = Number(opts.score) || 0

    const res: any = await competitionApi.getPaper(id)
    const data = res?.paper || res?.data || res || {}
    const rawQs = data.questions || data.list || []

    questions.value = rawQs.map((q: any, idx: number) => ({
      ...q,
      index: idx + 1,
      title: q.stem || q.question || q.title,
      options: q.options || q.choices || [],
      answer: q.answer !== undefined ? q.answer : q.correctIndex,
      userAnswer: q.userAnswer !== undefined ? q.userAnswer : q.selected,
      correct: q.correct !== undefined ? q.correct : (q.userAnswer !== undefined && q.userAnswer === q.answer),
      explanation: q.explanation || q.analysis || q.note,
    }))
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; flex: 1; }
.header-score { font-size: 36rpx; font-weight: bold; }

.tabs { display: flex; background: #fff; padding: 16rpx 24rpx; gap: 16rpx; border-bottom: 1rpx solid #E8E0D5; position: sticky; top: 100rpx; z-index: 9; }
.tab { padding: 8rpx 24rpx; border-radius: 24rpx; font-size: 24rpx; color: #666; background: #F5F0E8; }
.tab.active { background: #C41E3A; color: #fff; font-weight: 500; }

.scroll-area { padding: 24rpx; }
.q-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.q-num { font-size: 24rpx; color: #666; font-weight: 500; }
.q-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; }
.q-tag.correct { background: rgba(82,196,26,0.1); color: #52C41A; }
.q-tag.wrong { background: rgba(196,30,58,0.1); color: #C41E3A; }
.q-tag.skip { background: #F5F0E8; color: #999; }

.q-title { font-size: 28rpx; color: #2C2C2C; line-height: 1.6; display: block; margin-bottom: 20rpx; }

.options { display: flex; flex-direction: column; gap: 12rpx; }
.option-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 20rpx; border-radius: 12rpx; background: #F9F8F6; }
.option-item.correct { background: rgba(82,196,26,0.08); border: 2rpx solid rgba(82,196,26,0.3); }
.option-item.wrong { background: rgba(196,30,58,0.06); border: 2rpx solid rgba(196,30,58,0.3); }
.option-label { width: 40rpx; height: 40rpx; border-radius: 50%; background: #E8E0D5; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #666; flex-shrink: 0; }
.option-item.correct .option-label { background: #52C41A; color: #fff; }
.option-item.wrong .option-label { background: #C41E3A; color: #fff; }
.option-text { font-size: 26rpx; color: #2C2C2C; flex: 1; }
.option-check { font-size: 28rpx; color: #52C41A; font-weight: bold; }

.explanation { margin-top: 16rpx; padding: 16rpx; background: rgba(201,169,110,0.08); border-radius: 12rpx; display: flex; align-items: flex-start; gap: 8rpx; }
.exp-icon { font-size: 28rpx; }
.exp-text { font-size: 24rpx; color: #666; line-height: 1.6; flex: 1; }

.source { margin-top: 12rpx; }
.source-text { font-size: 22rpx; color: #999; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E0D5; padding: 20rpx 24rpx; }
.bottom-stats { display: flex; justify-content: center; gap: 32rpx; }
.bs-item { font-size: 24rpx; color: #666; display: flex; align-items: center; gap: 8rpx; }
.bs-dot { width: 16rpx; height: 16rpx; border-radius: 50%; display: inline-block; }
.bs-dot.correct { background: #52C41A; }
.bs-dot.wrong { background: #C41E3A; }
.bs-dot.skip { background: #ccc; }
</style>
