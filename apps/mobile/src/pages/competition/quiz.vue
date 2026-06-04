<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-left">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">答题</text>
      </view>
      <view class="header-right">
        <text class="timer" :class="{ urgent: timeRemaining < 300 }">⏱ {{ formatTime(timeRemaining) }}</text>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="progress-bar">
      <view class="progress-fill" :style="{ width: progressPct + '%' }" />
      <text class="progress-text">{{ currentIndex + 1 }}/{{ questions.length }}</text>
    </view>

    <!-- 题目区域 -->
    <scroll-view scroll-y class="quiz-scroll" v-if="questions.length > 0">
      <view class="question-card">
        <text class="q-number">第 {{ currentIndex + 1 }} 题</text>
        <text class="q-text">{{ currentQuestion?.title || currentQuestion?.stem || currentQuestion?.question || '' }}</text>

        <!-- 选择题选项 -->
        <view v-if="currentQuestion?.type === 'choice' || currentQuestion?.type === 'single' || !currentQuestion?.type" class="options">
          <view
            v-for="(opt, idx) in currentQuestion.options"
            :key="idx"
            class="option-item"
            :class="{ selected: selectedOption === idx }"
            @click="selectOption(idx)"
          >
            <text class="option-label">{{ String.fromCharCode(65 + idx) }}</text>
            <text class="option-text">{{ typeof opt === 'string' ? opt : opt.text || opt }}</text>
          </view>
        </view>

        <!-- 填空题 -->
        <view v-if="currentQuestion?.type === 'fill'" class="fill-area">
          <textarea v-model="fillText" placeholder="请输入你的答案" class="fill-input" />
        </view>
      </view>

      <!-- 答题卡 -->
      <view class="answer-sheet">
        <text class="sheet-title">答题卡</text>
        <view class="sheet-grid">
          <text
            v-for="(_, idx) in questions"
            :key="idx"
            class="sheet-num"
            :class="{ answered: answers[idx] !== undefined, current: idx === currentIndex }"
            @click="goToQuestion(idx)"
          >{{ idx + 1 }}</text>
        </view>
      </view>

      <!-- 导航按钮 -->
      <view class="nav-buttons">
        <button v-if="currentIndex > 0" class="nav-btn prev" @click="prevQuestion">上一题</button>
        <button v-if="currentIndex < questions.length - 1" class="nav-btn next" @click="nextQuestion">下一题</button>
        <button v-if="currentIndex === questions.length - 1" class="nav-btn submit" @click="handleSubmit" :disabled="submitting">交卷</button>
      </view>
    </scroll-view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && questions.length === 0"
      empty-icon="📝"
      empty-title="暂无试题"
      skeleton-type="detail"
      @retry="fetchPaper"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { competitionApi } from '../../api'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const questions = ref<any[]>([])
const currentIndex = ref(0)
const selectedOption = ref(-1)
const answers = ref<Record<number, number>>({})
const fillText = ref('')
const submitting = ref(false)
const timeRemaining = ref(3600)
let timer: ReturnType<typeof setInterval> | null = null

const currentQuestion = computed(() => questions.value[currentIndex.value])
const progressPct = computed(() => {
  if (questions.value.length === 0) return 0
  return ((currentIndex.value + 1) / questions.value.length) * 100
})

onMounted(() => {
  fetchPaper()
  timer = setInterval(() => { if (timeRemaining.value > 0) timeRemaining.value-- }, 1000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

async function fetchPaper() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const roundId = page?.options?.roundId || page?.options?.id || ''
  loading.value = true; loadError.value = null
  try {
    const res: any = await competitionApi.getPaper(roundId)
    const data = res?.paper || res?.data || res || {}
    const qs = data.questions || data.list || []
    questions.value = qs.map((q: any) => ({
      ...q,
      options: q.options || q.choices || [],
    }))
    // Restore from storage
    const saved = uni.getStorageSync('quiz_answers_' + roundId)
    if (saved) answers.value = JSON.parse(saved)
  } catch (e: any) { loadError.value = e?.errMsg || e?.message || '加载失败' }
  finally { loading.value = false }
}

function selectOption(idx: number) {
  selectedOption.value = idx
  answers.value = { ...answers.value, [currentIndex.value]: idx }
  saveAnswers()
}

function goToQuestion(idx: number) {
  currentIndex.value = idx
  selectedOption.value = answers.value[idx] ?? -1
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    selectedOption.value = answers.value[currentIndex.value] ?? -1
  }
}

function prevQuestion() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    selectedOption.value = answers.value[currentIndex.value] ?? -1
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function saveAnswers() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const roundId = page?.options?.roundId || page?.options?.id || ''
  uni.setStorageSync('quiz_answers_' + roundId, JSON.stringify(answers.value))
}

async function handleSubmit() {
  const unanswered = questions.value.length - Object.keys(answers.value).length
  if (unanswered > 0) {
    const confirm = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '确认交卷',
        content: `还有 ${unanswered} 题未作答，确定交卷吗？`,
        success: (res) => resolve(res.confirm),
      })
    })
    if (!confirm) return
  }
  submitting.value = true
  try {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    const roundId = page?.options?.roundId || page?.options?.id || ''
    await competitionApi.submit(roundId, { answers: answers.value })
    uni.removeStorageSync('quiz_answers_' + roundId)
    uni.showToast({ title: '交卷成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '交卷失败', icon: 'none' })
  } finally { submitting.value = false }
}

function goBack() {
  uni.showModal({
    title: '确认退出',
    content: '退出后答题进度将丢失，确定退出吗？',
    success: (res) => { if (res.confirm) uni.navigateBack() },
  })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.timer { font-size: 24rpx; color: #666; background: #F5F0E8; padding: 8rpx 20rpx; border-radius: 24rpx; }
.timer.urgent { color: #C41E3A; background: #fef0f0; }
.progress-bar { height: 8rpx; background: #E8E0D5; position: relative; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E74C3C); border-radius: 4rpx; transition: width 0.3s; }
.progress-text { position: absolute; right: 24rpx; top: 16rpx; font-size: 22rpx; color: #999; }
.quiz-scroll { padding: 24rpx; height: calc(100vh - 120rpx); }
.question-card { background: #fff; border-radius: 16rpx; padding: 32rpx 24rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.q-number { font-size: 22rpx; color: #C41E3A; font-weight: 500; margin-bottom: 16rpx; display: block; }
.q-text { font-size: 30rpx; color: #2C2C2C; line-height: 1.6; margin-bottom: 32rpx; display: block; }
.options { display: flex; flex-direction: column; gap: 16rpx; }
.option-item { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; border: 2rpx solid #E8E0D5; border-radius: 12rpx; }
.option-item.selected { border-color: #C41E3A; background: rgba(196,30,58,0.05); }
.option-label { width: 48rpx; height: 48rpx; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; color: #666; flex-shrink: 0; }
.option-item.selected .option-label { background: #C41E3A; color: #fff; }
.option-text { font-size: 28rpx; color: #2C2C2C; }
.fill-input { width: 100%; min-height: 200rpx; border: 2rpx solid #E8E0D5; border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.answer-sheet { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.sheet-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.sheet-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 12rpx; }
.sheet-num { height: 60rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; background: #F5F0E8; color: #666; }
.sheet-num.answered { background: rgba(196,30,58,0.15); color: #C41E3A; font-weight: 500; }
.sheet-num.current { background: #C41E3A; color: #fff; font-weight: 600; }
.nav-buttons { display: flex; gap: 16rpx; padding-bottom: 40rpx; }
.nav-btn { flex: 1; height: 88rpx; border-radius: 44rpx; font-size: 30rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; border: none; }
.prev { background: #fff; color: #666; border: 1rpx solid #E8E0D5; }
.next { background: #C41E3A; color: #fff; }
.submit { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.nav-btn:disabled { opacity: 0.5; }
</style>
