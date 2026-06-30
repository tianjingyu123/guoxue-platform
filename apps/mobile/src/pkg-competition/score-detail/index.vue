<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">成绩详情</text>
        <view class="nav-btn" @click="go('/competition/' + compId + '/poster')"><app-icon name="share-2" :size="18" color="#fff" /></view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="alert-circle" :size="44" color="#d1d5db" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @click="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <scroll-view v-else-if="result" scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 成绩总览 -->
      <view class="score-hero" :class="{ promoted: isPromoted }">
        <text class="hero-score">{{ totalScore }}</text>
        <text class="hero-cap">总得分</text>
        <view v-if="promotionText" class="hero-status" :class="{ promoted: isPromoted }">
          <app-icon v-if="isPromoted" name="award" :size="18" color="#fff" />
          <text class="hero-status-txt">{{ promotionText }}</text>
        </view>
        <view class="hero-stats">
          <view v-if="myRank" class="hs-item"><text class="hs-cap">名次</text><text class="hs-val">第 {{ myRank }} 名</text></view>
          <view v-if="myRank" class="hs-divider" />
          <view class="hs-item"><text class="hs-cap">用时</text><text class="hs-val">{{ usedTime }}</text></view>
          <view class="hs-divider" />
          <view class="hs-item"><text class="hs-cap">正确率</text><text class="hs-val">{{ correctRate }}%</text></view>
        </view>
      </view>

      <!-- 答题统计 -->
      <view class="card">
        <text class="card-title">答题统计</text>
        <view class="stat-grid">
          <view class="stat-box"><text class="stat-num green">{{ correctCount }}</text><text class="stat-cap">正确</text></view>
          <view class="stat-box"><text class="stat-num red">{{ wrongCount }}</text><text class="stat-cap">错误</text></view>
          <view class="stat-box"><text class="stat-num gray">{{ unscoredCount }}</text><text class="stat-cap">未判</text></view>
        </view>
      </view>

      <!-- 答题详情 -->
      <view class="card">
        <text class="card-title">答题详情</text>
        <view v-if="answers.length === 0" class="mini-empty"><text class="mini-empty-txt">暂无答题记录</text></view>
        <view v-else class="q-list">
          <view v-for="(q, i) in answers" :key="q.questionId" class="q-item">
            <view class="q-row" @click="toggleQ(q.questionId)">
              <view class="q-ico" :class="qIcoClass(q)">
                <app-icon :name="qIcoName(q)" :size="16" :color="qIcoColor(q)" />
              </view>
              <text class="q-content">{{ i + 1 }}. {{ q.stem || '题目' }}</text>
              <text v-if="q.score != null" class="q-score" :class="{ wrong: q.isCorrect === false }">{{ q.score }} 分</text>
              <app-icon :name="expanded.includes(q.questionId) ? 'chevron-down' : 'chevron-right'" :size="16" color="#9ca3af" />
            </view>
            <view v-if="expanded.includes(q.questionId)" class="q-detail">
              <view v-if="q.type" class="qd-row"><text class="qd-label">题型</text><text class="qd-val gray">{{ questionTypeLabel[q.type] }}</text></view>
              <view class="qd-row"><text class="qd-label">你的答案</text><text class="qd-val" :class="{ wrong: q.isCorrect === false, green: q.isCorrect === true }">{{ fmtAns(q.userAnswer) }}</text></view>
              <view v-if="q.correctAnswer" class="qd-row"><text class="qd-label">正确答案</text><text class="qd-val green">{{ fmtAns(q.correctAnswer) }}</text></view>
              <view v-if="q.analysis" class="qd-analysis"><text class="qd-ana-txt">解析：{{ q.analysis }}</text></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作 -->
      <view class="actions">
        <view v-if="awarded && myRankingId" class="act-btn primary" @click="go('/competition/' + compId + '/certificate?rankingId=' + myRankingId)">
          <app-icon name="award" :size="16" color="#fff" /><text class="act-txt">查看证书</text>
        </view>
        <view class="act-row">
          <view class="act-btn outline" @click="go('/competition/' + compId + '/result')"><text class="act-txt dark">查看排行榜</text></view>
          <view class="act-btn outline" @click="go('/competition/' + compId)"><text class="act-txt dark">返回赛事</text></view>
        </view>
        <view class="act-btn ghost" @click="go('/competition/' + compId + '/poster')">
          <app-icon name="share-2" :size="16" color="#c41e3a" /><text class="act-txt red">生成海报</text>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  competitionApi, promotionLabel, questionTypeLabel,
  type MyResults, type MyResultAnswer,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const compId = ref('')
const loading = ref(true)
const error = ref('')
const result = ref<MyResults | null>(null)

const expanded = ref<string[]>([])

const answers = computed<MyResultAnswer[]>(() => result.value?.answers ?? [])
const totalScore = computed(() => result.value?.totalScores?.[0]?.totalScore ?? 0)
const firstRanking = computed(() => result.value?.rankings?.[0] ?? null)
const myRank = computed(() => firstRanking.value?.rank ?? null)
const myRankingId = computed(() => firstRanking.value?.id ?? null)
const isPromoted = computed(() => !!firstRanking.value && firstRanking.value.status !== 'ELIMINATED')
const promotionText = computed(() => (firstRanking.value ? promotionLabel[firstRanking.value.status] : ''))
const awarded = computed(() => {
  const s = firstRanking.value?.status
  return s === 'CHAMPION' || s === 'RUNNER_UP' || s === 'THIRD_PLACE' || s === 'PROMOTED'
})

const correctCount = computed(() => answers.value.filter((a) => a.isCorrect === true).length)
const wrongCount = computed(() => answers.value.filter((a) => a.isCorrect === false).length)
const unscoredCount = computed(() => answers.value.filter((a) => a.score == null).length)
const correctRate = computed(() => {
  const total = answers.value.length
  if (total === 0) return 0
  return Math.round((correctCount.value / total) * 100)
})

const usedTime = computed(() => {
  const sec = answers.value.reduce((sum, a) => sum + (a.duration || 0), 0)
  if (sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

function qIcoName(q: MyResultAnswer) {
  if (q.isCorrect === true) return 'check'
  if (q.isCorrect === false) return 'x'
  return 'alert-circle'
}
function qIcoColor(q: MyResultAnswer) {
  if (q.isCorrect === true) return '#16a34a'
  if (q.isCorrect === false) return '#ef4444'
  return '#9ca3af'
}
function qIcoClass(q: MyResultAnswer) {
  if (q.isCorrect === true) return 'ok'
  if (q.isCorrect === false) return 'wrong'
  return 'pending'
}

/** 格式化答案 JSON：兼容 selectedKey/selectedKeys/correctKey/correctKeys/text */
function fmtAns(a?: Record<string, any> | null): string {
  if (!a || typeof a !== 'object') return '未作答'
  if (a.selectedKey != null) return String(a.selectedKey)
  if (a.correctKey != null) return String(a.correctKey)
  if (Array.isArray(a.selectedKeys)) return a.selectedKeys.length ? a.selectedKeys.join('、') : '未作答'
  if (Array.isArray(a.correctKeys)) return a.correctKeys.length ? a.correctKeys.join('、') : '未作答'
  if (a.text != null && String(a.text).trim()) return String(a.text)
  if (a.value != null) return String(a.value)
  return '未作答'
}

function toggleQ(id: string) {
  expanded.value = expanded.value.includes(id) ? expanded.value.filter((x) => x !== id) : [...expanded.value, id]
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    result.value = await competitionApi.myResults(compId.value)
  } catch (e: any) {
    error.value = e?.message || '暂无成绩，请先报名参赛并完成答题'
  } finally {
    loading.value = false
  }
}

function go(p: string) { navigateTo(p) }
function goBack() { navigateBack() }

onLoad((q: any) => {
  compId.value = (q?.id as string) || ''
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-bar { background: var(--brand); position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { color: #fff; font-size: 16px; font-weight: 500; }
.scroll { width: 100%; }

.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; text-align: center; padding: 0 32px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.score-hero { padding: 28px 16px 24px; text-align: center; background: linear-gradient(135deg, #6b7280, #4b5563); }
.score-hero.promoted { background: linear-gradient(135deg, #22c55e, #16a34a); }
.hero-score { display: block; font-size: 48px; font-weight: 700; color: #fff; line-height: 1.1; }
.hero-cap { display: block; color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 16px; }
.hero-status { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; background: rgba(255,255,255,0.12); }
.hero-status.promoted { background: rgba(255,255,255,0.22); }
.hero-status-txt { color: #fff; font-size: 14px; font-weight: 500; }
.hero-stats { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 20px; }
.hs-item { text-align: center; }
.hs-cap { display: block; color: rgba(255,255,255,0.7); font-size: 12px; }
.hs-val { display: block; color: #fff; font-size: 16px; font-weight: 700; margin-top: 2px; }
.hs-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.2); }

.card { margin: 16px 16px 0; background: #fff; border-radius: 14px; padding: 16px; }
.card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.mini-empty { padding: 24px 0; text-align: center; }
.mini-empty-txt { color: #9ca3af; font-size: 13px; }

.stat-grid { display: flex; gap: 16px; }
.stat-box { flex: 1; padding: 12px; background: #f5f5f5; border-radius: 12px; text-align: center; }
.stat-num { display: block; font-size: 24px; font-weight: 700; }
.stat-num.green { color: #16a34a; } .stat-num.red { color: #ef4444; } .stat-num.gray { color: #9ca3af; }
.stat-cap { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }

.q-list { display: flex; flex-direction: column; gap: 12px; }
.q-item { border: 1rpx solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.q-row { display: flex; align-items: center; gap: 12px; padding: 12px; }
.q-ico { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.q-ico.ok { background: #dcfce7; }
.q-ico.wrong { background: #fee2e2; }
.q-ico.pending { background: #f3f4f6; }
.q-content { flex: 1; font-size: 14px; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.q-score { font-size: 14px; font-weight: 500; color: #16a34a; flex-shrink: 0; }
.q-score.wrong { color: #ef4444; }
.q-detail { padding: 12px; border-top: 1rpx solid #eee; display: flex; flex-direction: column; gap: 8px; }
.qd-row { display: flex; gap: 8px; }
.qd-label { width: 64px; flex-shrink: 0; font-size: 14px; color: #9ca3af; }
.qd-val { flex: 1; font-size: 14px; color: #1a1a1a; }
.qd-val.wrong { color: #ef4444; }
.qd-val.green { color: #16a34a; }
.qd-val.gray { color: #6b7280; }
.qd-analysis { padding: 8px; background: #f5f5f5; border-radius: 8px; }
.qd-ana-txt { font-size: 12px; color: #6b7280; line-height: 1.6; }

.actions { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.act-row { display: flex; gap: 12px; }
.act-btn { flex: 1; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.act-btn.primary { background: linear-gradient(135deg, var(--brand), #a01830); }
.act-btn.outline { border: 1rpx solid #e5e7eb; background: #fff; }
.act-btn.ghost { border: 1rpx solid rgba(196,30,58,0.3); background: #fff; }
.act-txt { font-size: 15px; font-weight: 600; color: #fff; }
.act-txt.dark { color: #1a1a1a; }
.act-txt.red { color: var(--brand); }
.safe-bottom { height: 24px; }
</style>
