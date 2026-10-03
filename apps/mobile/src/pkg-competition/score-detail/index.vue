<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="nav-title">我的成绩</text>
        <view class="nav-btn share" @tap="go('/competition/' + compId + '/poster')">
          <text class="share-txt">分享</text><app-icon name="share-2" :size="14" color="#C41E3A" />
        </view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon :name="notJoined ? 'award' : 'alert-circle'" :size="44" color="#d8cfc0" />
      <text class="state-txt">{{ error }}</text>
      <view v-if="notJoined" class="retry-btn" @tap="go('/pkg-competition/detail/index?id=' + compId)"><text class="retry-txt">去参加赛事</text></view>
      <view v-else class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <scroll-view v-else-if="result" scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 成绩总览 · 大数字 + 名次徽章 + 环形正确率 -->
      <view class="score-hero">
        <!-- 正确率环形：H5/App conic-gradient；MP 降级为数字圆 -->
        <!-- #ifndef MP -->
        <view class="ring" :style="ringStyle">
          <view class="ring-inner"><text class="ring-txt">{{ correctRate }}%</text></view>
        </view>
        <!-- #endif -->
        <!-- #ifdef MP -->
        <view class="ring ring-mp">
          <view class="ring-inner"><text class="ring-txt">{{ correctRate }}%</text></view>
        </view>
        <!-- #endif -->

        <text v-if="heroTitle" class="hero-ttl">{{ heroTitle }}</text>
        <view class="big-score-row">
          <text class="big-score">{{ totalScore }}</text>
        </view>
        <text class="hero-cap">总得分</text>

        <view v-if="myRank" class="rank-badge">
          <app-icon name="award" :size="15" color="#A5883F" />
          <text class="rank-badge-txt">本轮排名 第 {{ myRank }} 名</text>
        </view>

        <view class="stat3">
          <view class="s"><text class="s-n">{{ usedTime }}</text><text class="s-l">用时</text></view>
          <view class="s-div" />
          <view class="s"><text class="s-n gold">{{ correctRate }}%</text><text class="s-l">正确率</text></view>
          <template v-if="promotionText">
            <view class="s-div" />
            <view class="s"><text class="s-n red">{{ promotionText }}</text><text class="s-l">状态</text></view>
          </template>
        </view>
      </view>

      <!-- 答题统计 · 对/错/待评 -->
      <view class="astat">
        <view class="a a-right"><text class="a-n">{{ correctCount }}</text><text class="a-l">答对</text></view>
        <view class="a a-wrong"><text class="a-n">{{ wrongCount }}</text><text class="a-l">答错</text></view>
        <view class="a a-pend"><text class="a-n">{{ unscoredCount }}</text><text class="a-l">待评</text></view>
      </view>

      <!-- 逐题详情 -->
      <view class="sec-hd"><text class="sec-hd-txt">逐题详情</text></view>

      <view v-if="answers.length === 0" class="mini-empty"><text class="mini-empty-txt">暂无答题记录</text></view>

      <view v-for="(q, i) in answers" :key="q.questionId" class="q">
        <view class="q-hd" @tap="toggleQ(q.questionId)">
          <view class="q-mk" :class="qMkClass(q)"><text class="q-mk-txt">{{ qMkText(q) }}</text></view>
          <view class="qt">
            <text class="qt-txt">第 {{ i + 1 }} 题</text>
            <text v-if="q.type" class="qt-type"> · {{ questionTypeLabel[q.type] }}</text>
          </view>
          <text class="sc" :class="scClass(q)">{{ scText(q) }}</text>
          <app-icon :name="expanded.includes(q.questionId) ? 'chevron-up' : 'chevron-down'" :size="14" color="#ccc" />
        </view>

        <view v-if="expanded.includes(q.questionId)" class="q-detail">
          <text v-if="q.stem" class="stem">{{ q.stem }}</text>

          <!-- 主观题评分中态 -->
          <template v-if="isPending(q)">
            <view class="ans-row">
              <text class="lb">我的作答</text>
              <text class="my">{{ fmtAns(q.userAnswer) }}</text>
            </view>
            <view class="pend-box">
              <view class="dot" />
              <text class="pend-txt">评委评分中，评分完成后更新总分与排名</text>
            </view>
          </template>

          <!-- 客观题对照 -->
          <template v-else>
            <view class="ans-row">
              <text class="lb">我的答案</text>
              <text class="my" :class="{ wrong: q.isCorrect === false }">{{ fmtAns(q.userAnswer) }}</text>
            </view>
            <view v-if="q.correctAnswer" class="ans-row">
              <text class="lb">正确答案</text>
              <text class="std">{{ fmtAns(q.correctAnswer) }}</text>
            </view>
            <view v-if="q.analysis" class="analysis">
              <text class="ana-t">解析</text>
              <text class="ana-txt">{{ q.analysis }}</text>
            </view>
          </template>
        </view>
      </view>

      <!-- 含待评项提示 -->
      <view v-if="unscoredCount > 0" class="note">
        <text class="note-txt">主观题显「评委评分中」，总分含待评项时为暂计；评分完成后本页与排行榜同步刷新。</text>
      </view>

      <!-- 底部操作 -->
      <view class="foot-actions">
        <view class="b b-gold" @tap="go('/competition/' + compId + '/result')"><text class="b-txt gold">看排行榜</text></view>
        <view class="b b-primary" @tap="go('/competition/' + compId + '/poster')"><text class="b-txt light">生成荣誉海报</text></view>
      </view>

      <view v-if="awarded && myRankingId" class="foot-cert">
        <view class="b b-outline" @tap="go('/competition/' + compId + '/certificate?rankingId=' + myRankingId)">
          <app-icon name="award" :size="15" color="#C41E3A" /><text class="b-txt red">查看证书</text>
        </view>
        <view class="b b-outline" @tap="go('/competition/' + compId)"><text class="b-txt dark">返回赛事</text></view>
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
  type MyResults, type MyResultAnswer, type QuestionType,
} from '@/pkg-competition/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const compId = ref('')
const loading = ref(true)
const error = ref('')
const notJoined = ref(false) // true=未参加该赛事(引导去报名)·区别于真错误(重试)
const result = ref<MyResults | null>(null)

const expanded = ref<string[]>([])

const answers = computed<MyResultAnswer[]>(() => result.value?.answers ?? [])
const totalScore = computed(() => result.value?.totalScores?.[0]?.totalScore ?? 0)
const firstRanking = computed(() => result.value?.rankings?.[0] ?? null)
const myRank = computed(() => firstRanking.value?.rank ?? null)
const myRankingId = computed(() => firstRanking.value?.id ?? null)
const promotionText = computed(() => (firstRanking.value ? promotionLabel[firstRanking.value.status] : ''))
const awarded = computed(() => {
  const s = firstRanking.value?.status
  return s === 'CHAMPION' || s === 'RUNNER_UP' || s === 'THIRD_PLACE' || s === 'PROMOTED'
})

// 主观题（案例分析/论述）无自动判分：score 为 null 即评委评分中
const SUBJECTIVE: QuestionType[] = ['CASE_ANALYSIS', 'ESSAY']
function isPending(q: MyResultAnswer): boolean {
  if (q.score != null) return false
  return q.isCorrect == null && (q.type ? SUBJECTIVE.includes(q.type) : true)
}

// 环形正确率：仅统计客观题（有 isCorrect 判定的题）
const objectiveAnswers = computed(() => answers.value.filter((a) => a.isCorrect != null))
const correctCount = computed(() => answers.value.filter((a) => a.isCorrect === true).length)
const wrongCount = computed(() => answers.value.filter((a) => a.isCorrect === false).length)
const unscoredCount = computed(() => answers.value.filter((a) => isPending(a)).length)
const correctRate = computed(() => {
  const total = objectiveAnswers.value.length
  if (total === 0) return 0
  return Math.round((correctCount.value / total) * 100)
})

// #ifndef MP
const ringStyle = computed(() => {
  const p = correctRate.value
  return { background: `conic-gradient(#C9A96E 0% ${p}%, #F0EDE6 ${p}% 100%)` }
})
// #endif

// 赛事标题（真源自 registration.extraData，无则不显示，不虚构）
const heroTitle = computed(() => {
  const t = result.value?.registration?.extraData?.roundTitle
  return typeof t === 'string' && t.trim() ? t : ''
})

const usedTime = computed(() => {
  const sec = answers.value.reduce((sum, a) => sum + (a.duration || 0), 0)
  if (sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}′${String(s).padStart(2, '0')}″` : `${s}″`
})

function qMkText(q: MyResultAnswer): string {
  if (q.isCorrect === true) return '✓'
  if (q.isCorrect === false) return '✕'
  return '…'
}
function qMkClass(q: MyResultAnswer): string {
  if (q.isCorrect === true) return 'mk-right'
  if (q.isCorrect === false) return 'mk-wrong'
  return 'mk-pend'
}
function scClass(q: MyResultAnswer): string {
  if (q.isCorrect === true) return 'right'
  if (q.isCorrect === false) return 'wrong'
  return 'pend'
}
function scText(q: MyResultAnswer): string {
  if (isPending(q)) return '评分中'
  if (q.score == null) return ''
  if (q.isCorrect === true) return `+${q.score}`
  return `${q.score} 分`
}

/** 格式化答案 JSON：兼容 selectedKey/selectedKeys/correctKey/correctKeys/text */
function fmtAns(a?: Record<string, unknown> | null): string {
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
  notJoined.value = false
  try {
    result.value = await competitionApi.myResults(compId.value)
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 后端对未报名返回「未找到报名记录」→ 引导态(去参赛)，非错误重试
    if (msg.includes('报名') || msg.includes('未找到') || msg.includes('未参加')) {
      notJoined.value = true
      error.value = '你还没有参加该赛事'
    } else {
      error.value = msg || '暂无成绩，请先报名参赛并完成答题'
    }
  } finally {
    loading.value = false
  }
}

function go(p: string) { navigateTo(p) }
function goBack() { navigateBack() }

onLoad((q) => {
  compId.value = (q?.id as string) || ''
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
})
</script>

<style lang="scss" scoped>
/* 设计 token */
$paper: #FAF8F5;
$card: #FFF;
$red: #C41E3A;
$red-deep: #A5162E;
$gold: #C9A96E;
$gold-deep: #A5883F;
$t1: #2C2C2C;
$t2: #6E6E73;
$t3: #9A9A9A;
$line: #ECE7DF;

.page { min-height: 100vh; background: $paper; }

/* 导航 */
.nav-bar { background: $paper; position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { min-width: 48px; height: 32px; display: flex; align-items: center; }
.nav-btn.share { justify-content: flex-end; }
.share-txt { font-size: 13px; color: $red; margin-right: 4px; }
.nav-title { font-size: 17px; font-weight: 700; color: $t1; letter-spacing: 1px; }

.scroll { width: 100%; }

/* 三态 */
.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: $t3; font-size: 14px; text-align: center; padding: 0 32px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f1e9d8; border-top-color: $gold; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: $red; border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

/* 成绩总览 */
.score-hero {
  position: relative; margin: 14px 20px; padding: 26px 20px; border-radius: 20px;
  background: linear-gradient(160deg, #fff, #fdfaf4); border: 1px solid $line;
  box-shadow: 0 8px 26px rgba(60, 40, 20, 0.08); overflow: hidden;
}
/* 环形 */
.ring {
  position: absolute; right: 16px; top: 16px; width: 62px; height: 62px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.ring-mp { background: #f6efdf; border: 6px solid $gold; }
.ring-inner {
  position: relative; width: 50px; height: 50px; border-radius: 50%; background: #fff;
  display: flex; align-items: center; justify-content: center;
}
.ring-txt { font-size: 13px; font-weight: 700; color: $gold-deep; }

.hero-ttl { display: block; font-size: 13px; color: $t3; margin-bottom: 8px; }
.big-score-row { display: flex; align-items: flex-end; justify-content: center; }
.big-score { font-size: 60px; font-weight: 800; color: $red; line-height: 1; font-family: "Songti SC", "STSong", serif; }
.hero-cap { display: block; text-align: center; font-size: 12px; color: $t3; margin-top: 6px; }

.rank-badge {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 7px 18px; border-radius: 999px;
  background: linear-gradient(135deg, #f6efdf, #efe3c8); border: 1px solid #e3d5b0;
}
.rank-badge-txt { font-size: 14px; font-weight: 700; color: $gold-deep; }

.stat3 { display: flex; align-items: center; margin-top: 20px; }
.s { flex: 1; text-align: center; }
.s-n { display: block; font-size: 21px; font-weight: 700; color: $t1; }
.s-n.gold { color: $gold-deep; }
.s-n.red { color: $red; }
.s-l { display: block; font-size: 11px; color: $t3; margin-top: 3px; }
.s-div { width: 1px; height: 28px; background: $line; }

/* 答题统计 */
.astat { display: flex; gap: 11px; margin: 0 20px 16px; }
.a { flex: 1; text-align: center; padding: 13px 0; border-radius: 14px; }
.a-right { background: linear-gradient(135deg, #f6efdf, #efe3c8); }
.a-wrong { background: #fdeef0; }
.a-pend { background: #f1efec; }
.a-n { display: block; font-size: 20px; font-weight: 700; }
.a-right .a-n { color: $gold-deep; }
.a-wrong .a-n { color: $red; }
.a-pend .a-n { color: $t3; }
.a-l { display: block; font-size: 11px; color: $t2; margin-top: 3px; }

/* section 标题 */
.sec-hd { padding: 0 20px; margin-bottom: 13px; }
.sec-hd-txt { position: relative; padding-left: 13px; font-size: 17px; font-weight: 700; color: $t1; }
.sec-hd-txt::before { content: ""; position: absolute; left: 0; top: 3px; bottom: 3px; width: 4px; background: $gold; border-radius: 2px; }

.mini-empty { padding: 24px 0; text-align: center; }
.mini-empty-txt { color: $t3; font-size: 13px; }

/* 逐题 */
.q {
  background: $card; margin: 0 20px 12px; border-radius: 14px; border: 1px solid $line; overflow: hidden;
  box-shadow: 0 3px 12px rgba(60, 40, 20, 0.04);
}
.q-hd { display: flex; align-items: center; gap: 11px; padding: 15px; }
.q-mk { width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.q-mk-txt { font-size: 13px; font-weight: 700; }
.mk-right { background: linear-gradient(135deg, #f6efdf, #efe3c8); }
.mk-right .q-mk-txt { color: $gold-deep; }
.mk-wrong { background: #fdeef0; }
.mk-wrong .q-mk-txt { color: $red; }
.mk-pend { background: #f1efec; }
.mk-pend .q-mk-txt { color: $t3; }
.qt { flex: 1; overflow: hidden; }
.qt-txt { font-size: 14.5px; font-weight: 600; color: $t1; }
.qt-type { font-size: 11px; color: $t3; font-weight: 400; }
.sc { font-size: 14px; font-weight: 700; flex-shrink: 0; }
.sc.right { color: $gold-deep; }
.sc.wrong { color: $red; }
.sc.pend { color: $t3; }

.q-detail { border-top: 1px dashed $line; padding: 15px; }
.stem { display: block; font-size: 14px; font-weight: 600; color: $t1; line-height: 1.7; margin-bottom: 13px; font-family: "Songti SC", "STSong", serif; }
.ans-row { display: flex; gap: 9px; margin-bottom: 9px; }
.lb { flex-shrink: 0; width: 66px; font-size: 13px; color: $t3; }
.my { flex: 1; font-size: 13px; color: $t1; line-height: 1.6; }
.my.wrong { color: $red; font-weight: 600; }
.std { flex: 1; font-size: 13px; color: $gold-deep; font-weight: 700; line-height: 1.6; }
.analysis { background: $paper; border: 1px solid $line; border-radius: 11px; padding: 12px 13px; margin-top: 8px; }
.ana-t { display: block; font-size: 11px; color: $gold-deep; font-weight: 700; margin-bottom: 5px; }
.ana-txt { font-size: 13px; color: $t2; line-height: 1.7; }

.pend-box {
  display: flex; align-items: center; gap: 9px; margin-top: 8px; padding: 13px;
  background: #f9f3e6; border: 1px solid #ecdcbb; border-radius: 11px;
}
.dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: $gold; animation: pulse 1.4s infinite; }
@keyframes pulse { 50% { opacity: 0.4; } }
.pend-txt { font-size: 12px; color: $gold-deep; line-height: 1.6; }

.note { margin: 6px 20px 16px; padding: 11px 13px; background: #fdf4f5; border: 1px solid #f2cdd3; border-radius: 11px; }
.note-txt { font-size: 11.5px; color: $t2; line-height: 1.7; }

/* 底部操作 */
.foot-actions { display: flex; gap: 12px; padding: 6px 20px 0; }
.foot-cert { display: flex; gap: 12px; padding: 12px 20px 0; }
.b { flex: 1; height: 48px; border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.b-primary { background: linear-gradient(135deg, $red, $red-deep); box-shadow: 0 6px 18px rgba(196, 30, 58, 0.3); }
.b-gold { background: linear-gradient(135deg, #e6d4a0, $gold-deep); }
.b-outline { background: $card; border: 1px solid $line; }
.b-txt { font-size: 15px; font-weight: 600; }
.b-txt.light { color: #fff; }
.b-txt.gold { color: #fff; }
.b-txt.red { color: $red; }
.b-txt.dark { color: $t1; }

.safe-bottom { height: 26px; }
</style>
