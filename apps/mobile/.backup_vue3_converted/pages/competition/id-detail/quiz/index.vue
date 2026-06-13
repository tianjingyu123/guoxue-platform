<template>
  <!-- 提交中全屏状态 -->
  <view v-if="isSubmitting" class="min-h-screen bg-background flex items-center justify-center">
    <view class="text-center">
      <view class="w-12 h-12 border-2 border-primary/30 border-t-[#C41E3A] rounded-full animate-spin mx-auto mb-4" />
      <text class="text-lg font-medium text-foreground block">正在提交答卷...</text>
      <text class="text-muted-foreground text-sm mt-1 block">请勿关闭页面</text>
    </view>
  </view>

  <!-- 主页面 -->
  <view v-else class="min-h-screen bg-background pb-24">
    <!-- 顶部状态栏 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="px-4 py-3">
        <view class="flex items-center justify-between mb-2">
          <text class="font-medium text-sm truncate flex-1">{{ examPaper.competitionTitle }}</text>
          <text class="bg-secondary text-xs px-2 py-0.5 rounded">{{ examPaper.roundName }}</text>
        </view>
        <view class="flex items-center justify-between">
          <view :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-mono', timeLeft <= 300 ? 'bg-red-100 text-red-600' : 'bg-secondary']">
            <text>🕐</text>
            <text class="font-bold">{{ formatTime(timeLeft) }}</text>
          </view>
          <view class="flex items-center gap-2 text-sm text-muted-foreground">
            <text>{{ currentIndex + 1 }}/{{ totalQuestions }}</text>
            <text>·</text>
            <text>已答 {{ answeredCount }}</text>
            <text v-if="markedCount > 0">·</text>
            <text v-if="markedCount > 0" class="text-amber-600">标记 {{ markedCount }}</text>
          </view>
        </view>
        <view class="h-1 mt-2 bg-secondary rounded-full overflow-hidden">
          <view class="h-full bg-primary rounded-full transition-all duration-300" :style="{ width: (answeredCount / totalQuestions) * 100 + '%' }" />
        </view>
      </view>
    </view>

    <!-- 题目区域 -->
    <view class="px-4 py-4">
      <view class="bg-white rounded-xl p-4 border border-border/50">
        <!-- 题目类型和分值 -->
        <view class="flex items-center justify-between mb-3">
          <text class="border border-border text-xs px-2 py-0.5 rounded">
            {{ questionTypeLabel }}
          </text>
          <text class="text-sm text-muted-foreground">{{ currentQuestion.score }}分</text>
        </view>

        <!-- 题目内容 -->
        <view class="mb-4">
          <text class="text-base leading-relaxed">
            <text class="font-bold text-primary mr-2">{{ currentIndex + 1 }}.</text>
            {{ currentQuestion.content }}
          </text>
        </view>

        <!-- 选项列表 -->
        <view class="space-y-3">
          <view
            v-for="option in currentQuestion.options"
            :key="option.id"
            @click="handleSelectOption(option.id)"
            :class="[
              'w-full p-4 rounded-xl border-2 transition-all flex items-start gap-3',
              isOptionSelected(option.id)
                ? 'border-primary bg-primary/5'
                : 'border-border'
            ]"
          >
            <text
              :class="[
                'w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium flex-shrink-0',
                isOptionSelected(option.id)
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-300'
              ]"
            >
              {{ option.id }}
            </text>
            <text class="flex-1 text-foreground">{{ option.text }}</text>
          </view>
        </view>
      </view>

      <!-- 标记按钮 -->
      <view class="mt-4 flex justify-center">
        <view
          @click="handleMarkQuestion"
          :class="[
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors',
            answers[currentQuestion.id]?.marked
              ? 'bg-amber-100 text-amber-700'
              : 'bg-secondary text-muted-foreground'
          ]"
        >
          <text>🚩</text>
          <text>{{ answers[currentQuestion.id]?.marked ? '已标记' : '标记此题' }}</text>
        </view>
      </view>
    </view>

    <!-- 底部导航 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 z-50" style="padding-bottom: calc(env(safe-area-inset-bottom) + 12px)">
      <view class="flex items-center justify-between gap-3">
        <view
          @click="goToPrev"
          :class="['flex-1 py-2.5 rounded-lg border border-border text-center text-sm', currentIndex === 0 ? 'opacity-50' : '']"
        >
          <text>‹ 上一题</text>
        </view>

        <!-- 答题卡 -->
        <view
          @click="showAnswerSheet = !showAnswerSheet"
          class="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"
        >
          <text class="text-xs font-bold">{{ answeredCount }}/{{ totalQuestions }}</text>
        </view>

        <view
          v-if="currentIndex === totalQuestions - 1"
          @click="showSubmitDialog = true"
          class="flex-1 py-2.5 rounded-lg bg-primary text-white text-center text-sm"
        >
          <text>提交答卷</text>
        </view>
        <view
          v-else
          @click="goToNext"
          class="flex-1 py-2.5 rounded-lg bg-primary text-white text-center text-sm"
        >
          <text>下一题 ›</text>
        </view>
      </view>
    </view>

    <!-- 答题卡弹窗 -->
    <view v-if="showAnswerSheet" class="fixed inset-0 bg-black/50 z-50 flex items-end" @click="showAnswerSheet = false">
      <view class="bg-white rounded-t-2xl w-full p-6" style="max-height: 60vh;" @click.stop>
        <view class="flex items-center justify-between mb-4">
          <text class="font-bold text-lg text-foreground">答题卡</text>
          <text @click="showAnswerSheet = false" class="text-lg p-1">✕</text>
        </view>
        <view class="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <text class="flex items-center gap-1">
            <view class="w-4 h-4 rounded bg-primary/10 border-2 border-primary" /> 已答
          </text>
          <text class="flex items-center gap-1">
            <view class="w-4 h-4 rounded bg-amber-100 border-2 border-amber-400" /> 标记
          </text>
          <text class="flex items-center gap-1">
            <view class="w-4 h-4 rounded bg-secondary border-2 border-border" /> 未答
          </text>
        </view>
        <view class="grid grid-cols-6 gap-2">
          <view
            v-for="(q, index) in examPaper.questions"
            :key="q.id"
            @click="goToQuestion(index)"
            :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium border-2 transition-all',
              index === currentIndex ? 'ring-2 ring-primary ring-offset-2' : '',
              answers[q.id]?.marked
                ? 'bg-amber-100 border-amber-400 text-amber-700'
                : isAnswered(q)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-secondary border-border text-muted-foreground'
            ]"
          >
            {{ index + 1 }}
          </view>
        </view>
        <view
          @click="showAnswerSheet = false; showSubmitDialog = true"
          class="w-full text-center py-2.5 rounded-lg bg-gradient-to-r from-primary to-[#E74C3C] text-white text-sm mt-4"
        >
          提交答卷
        </view>
      </view>
    </view>

    <!-- 提交确认弹窗 -->
    <view v-if="showSubmitDialog" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <view class="bg-white rounded-2xl p-6 w-full max-w-sm">
        <text class="text-lg font-bold text-foreground block mb-4">确认提交答卷？</text>
        <view class="space-y-2 mb-4">
          <text class="text-sm text-ink-soft block">已答题目：{{ answeredCount }}/{{ totalQuestions }}</text>
          <text class="text-sm text-ink-soft block">未答题目：{{ totalQuestions - answeredCount }}</text>
          <text v-if="markedCount > 0" class="text-amber-600 text-sm block">标记题目：{{ markedCount }}</text>
          <text class="text-xs text-muted-foreground block mt-2">提交后将无法修改答案，请确认后提交。</text>
        </view>
        <view class="flex gap-3">
          <view @click="showSubmitDialog = false" class="flex-1 text-center py-2.5 rounded-lg border border-border text-sm text-foreground">继续答题</view>
          <view @click="handleSubmit" class="flex-1 text-center py-2.5 rounded-lg bg-primary text-white text-sm">确认提交</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface OptionItem {
  id: string
  text: string
}

interface Question {
  id: string
  type: 'single' | 'multiple' | 'judge'
  content: string
  options: OptionItem[]
  score: number
}

interface Answer {
  questionId: string
  answer: string | string[]
  marked: boolean
}

const examPaper = {
  roundId: 'r1',
  roundName: '初赛',
  competitionTitle: '2024热卜杯·八字命理大赛',
  totalTime: 90 * 60,
  questions: [
    { id: 'q1', type: 'single' as const, content: '八字中的「日主」指的是什么？', options: [{ id: 'A', text: '年柱天干' }, { id: 'B', text: '月柱天干' }, { id: 'C', text: '日柱天干' }, { id: 'D', text: '时柱天干' }], score: 2 },
    { id: 'q2', type: 'single' as const, content: '以下哪个是「木」的五行属性的天干？', options: [{ id: 'A', text: '甲、乙' }, { id: 'B', text: '丙、丁' }, { id: 'C', text: '戊、己' }, { id: 'D', text: '庚、辛' }], score: 2 },
    { id: 'q3', type: 'single' as const, content: '「子」属于十二地支中的哪一个？', options: [{ id: 'A', text: '第一个' }, { id: 'B', text: '第五个' }, { id: 'C', text: '第七个' }, { id: 'D', text: '第十二个' }], score: 2 },
    { id: 'q4', type: 'multiple' as const, content: '以下哪些属于「六冲」关系？（多选）', options: [{ id: 'A', text: '子午冲' }, { id: 'B', text: '丑未冲' }, { id: 'C', text: '寅申冲' }, { id: 'D', text: '卯酉冲' }], score: 4 },
    { id: 'q5', type: 'judge' as const, content: '「正官」代表的是克我且与我同性的五行。', options: [{ id: 'A', text: '正确' }, { id: 'B', text: '错误' }], score: 2 },
  ],
}

const currentIndex = ref(0)
const answers = ref<Record<string, Answer>>({})
const timeLeft = ref(examPaper.totalTime)
const showSubmitDialog = ref(false)
const showAnswerSheet = ref(false)
const isSubmitting = ref(false)
const isSubmitted = ref(false)

const currentQuestion = computed(() => examPaper.questions[currentIndex.value])
const totalQuestions = computed(() => examPaper.questions.length)

const questionTypeLabel = computed(() => {
  const t = currentQuestion.value.type
  return t === 'single' ? '单选题' : t === 'multiple' ? '多选题' : '判断题'
})

const answeredCount = computed(() =>
  Object.values(answers.value).filter(a => {
    if (!a.answer) return false
    return Array.isArray(a.answer) ? a.answer.length > 0 : a.answer !== ''
  }).length
)
const markedCount = computed(() => Object.values(answers.value).filter(a => a.marked).length)

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (!isSubmitted.value) {
    timer = setInterval(() => {
      if (timeLeft.value <= 1) {
        if (timer) clearInterval(timer)
        handleAutoSubmit()
        return
      }
      timeLeft.value -= 1
    }, 1000)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function handleSelectOption(optionId: string) {
  const question = currentQuestion.value
  if (question.type === 'multiple') {
    const currentAnswer = (answers.value[question.id]?.answer as string[]) || []
    const newAnswer = currentAnswer.includes(optionId)
      ? currentAnswer.filter(id => id !== optionId)
      : [...currentAnswer, optionId]
    answers.value = {
      ...answers.value,
      [question.id]: { questionId: question.id, answer: newAnswer, marked: answers.value[question.id]?.marked || false },
    }
  } else {
    answers.value = {
      ...answers.value,
      [question.id]: { questionId: question.id, answer: optionId, marked: answers.value[question.id]?.marked || false },
    }
  }
}

function handleMarkQuestion() {
  const qId = currentQuestion.value.id
  answers.value = {
    ...answers.value,
    [qId]: {
      questionId: qId,
      answer: answers.value[qId]?.answer || '',
      marked: !answers.value[qId]?.marked,
    },
  }
}

function isOptionSelected(optionId: string): boolean {
  const answer = answers.value[currentQuestion.value.id]?.answer
  if (Array.isArray(answer)) return answer.includes(optionId)
  return answer === optionId
}

function isAnswered(q: Question): boolean {
  const a = answers.value[q.id]?.answer
  if (!a) return false
  return Array.isArray(a) ? a.length > 0 : a !== ''
}

function goToPrev() {
  if (currentIndex.value > 0) currentIndex.value -= 1
}

function goToNext() {
  if (currentIndex.value < totalQuestions.value - 1) currentIndex.value += 1
}

function goToQuestion(index: number) {
  currentIndex.value = index
  showAnswerSheet.value = false
}

async function handleAutoSubmit() {
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isSubmitted.value = true
  isSubmitting.value = false
  uni.redirectTo({ url: `/pages/competition/id-detail/score-detail/index` })
}

async function handleSubmit() {
  showSubmitDialog.value = false
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isSubmitted.value = true
  isSubmitting.value = false
  uni.redirectTo({ url: `/pages/competition/id-detail/score-detail/index` })
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
