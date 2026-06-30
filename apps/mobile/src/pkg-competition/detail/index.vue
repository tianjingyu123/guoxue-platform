<template>
  <view class="page">
    <customer-service-fab />
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">赛事详情</text>
        <view class="nav-btn" @click="sharePoster"><app-icon name="share-2" :size="18" color="#fff" /></view>
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

    <template v-else-if="comp">
      <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
        <!-- Hero -->
        <view class="hero">
          <image lazy-load v-if="comp.coverImage" :src="comp.coverImage" mode="aspectFill" class="hero-img" />
          <view v-else class="hero-ph"><app-icon name="trophy" :size="56" color="rgba(255,255,255,0.5)" /></view>
          <view class="hero-badges">
            <view v-if="ui" class="hero-badge" :class="ui"><text class="hero-badge-txt">{{ uiStatusConfig[ui].label }}</text></view>
            <view class="hero-badge ghost"><text class="hero-badge-txt">{{ lv.label }}</text></view>
          </view>
        </view>

        <!-- 信息卡 -->
        <view class="info-card">
          <text class="info-title">{{ comp.title }}</text>
          <view class="info-org">
            <app-icon name="trophy" :size="13" color="#c41e3a" />
            <text class="info-org-txt">{{ organizer }} · {{ typeLabel(comp.type) }}赛</text>
          </view>
          <view class="info-progress">
            <view class="progress-bar"><view class="progress-fill" :style="{ width: progressPct + '%' }" /></view>
            <text class="progress-txt">已报名 {{ participants }}{{ comp.maxParticipants ? ' / ' + comp.maxParticipants : '' }} 人</text>
          </view>
          <view class="info-rows">
            <view v-if="timeRange" class="info-row">
              <app-icon name="calendar" :size="14" color="#9ca3af" /><text class="info-row-txt">比赛时间：{{ timeRange }}</text>
            </view>
            <view class="info-row">
              <app-icon name="award" :size="14" color="#f59e0b" /><text class="info-row-txt">{{ topPrizeText(comp) }}</text>
            </view>
          </view>
        </view>

        <!-- Tab -->
        <view class="tabs">
          <view v-for="t in tabs" :key="t.id" class="tab" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
            <text class="tab-txt" :class="{ active: activeTab === t.id }">{{ t.label }}</text>
          </view>
        </view>

        <!-- 介绍 -->
        <view v-if="activeTab === 'intro'" class="panel">
          <view v-if="comp.description" class="block">
            <text class="block-title">赛事简介</text>
            <text class="block-text">{{ comp.description }}</text>
          </view>
          <view v-if="comp.rules" class="block">
            <text class="block-title">比赛规则</text>
            <text class="block-text">{{ plainRules }}</text>
          </view>
          <view class="block notice">
            <app-icon name="info" :size="14" color="#c2790a" />
            <text class="notice-text">荣誉证书与专属海报赛后即时生成；获奖选手是否参与赛后分享，由选手自愿、与平台线下协商确定。</text>
          </view>
        </view>

        <!-- 赛程 -->
        <view v-else-if="activeTab === 'rounds'" class="panel">
          <view v-if="rounds.length === 0" class="mini-empty"><text class="mini-empty-txt">赛程待公布</text></view>
          <view v-for="(r, i) in rounds" :key="r.id" class="round-item">
            <view class="round-line">
              <view class="round-dot" :class="r.status" />
              <view v-if="i < rounds.length - 1" class="round-bar" />
            </view>
            <view class="round-body">
              <view class="round-head">
                <text class="round-name">{{ roundTypeLabel[r.type] || r.title }}</text>
                <view class="round-st" :class="r.status"><text class="round-st-txt">{{ roundStatusText(r.status) }}</text></view>
              </view>
              <text class="round-title">{{ r.title }}</text>
              <text v-if="r.description" class="round-desc">{{ r.description }}</text>
              <view class="round-meta">
                <text v-if="r.startAt" class="round-meta-txt">{{ fmtDate(r.startAt) }}{{ r.endAt && fmtDate(r.endAt) !== fmtDate(r.startAt) ? ' ~ ' + fmtDate(r.endAt) : '' }}</text>
                <text v-if="r.passCount > 0" class="round-meta-txt">取前 {{ r.passCount }} 名晋级</text>
                <text v-if="r.duration > 0" class="round-meta-txt">限时 {{ r.duration }} 分钟</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 奖品 -->
        <view v-else-if="activeTab === 'prize'" class="panel">
          <view v-if="prizeList.length === 0" class="mini-empty"><text class="mini-empty-txt">奖项待公布</text></view>
          <view v-for="(p, i) in prizeList" :key="i" class="prize-item">
            <view class="prize-rank" :class="'r' + (p.rank || i + 1)">
              <app-icon :name="(p.rank || i + 1) === 1 ? 'trophy' : (p.rank || i + 1) === 2 ? 'medal' : 'award'" :size="18" :color="rankColor(p.rank || i + 1)" />
            </view>
            <view class="prize-body">
              <text class="prize-title">{{ p.title || (p.rank ? p.rank + '等奖' : '奖项') }}</text>
              <text class="prize-reward">{{ p.description || (p.prize ? '奖金 ' + yuan(p.prize) + ' 元' : p.prizeItem || '荣誉证书') }}</text>
            </view>
          </view>
        </view>

        <!-- 排行 -->
        <view v-else-if="activeTab === 'rank'" class="panel">
          <view v-if="topRanks.length === 0" class="mini-empty"><text class="mini-empty-txt">暂无排名，赛事结束后公布</text></view>
          <template v-else>
            <view v-for="r in topRanks" :key="r.id" class="rank-item">
              <view class="rank-no" :class="'r' + r.rank"><text class="rank-no-txt" :class="'r' + r.rank">{{ r.rank }}</text></view>
              <view class="rank-avatar">
                <image lazy-load v-if="r.user?.avatar" :src="r.user.avatar" class="rank-avatar-img" mode="aspectFill" />
                <app-icon v-else name="user" :size="16" color="#c41e3a" />
              </view>
              <text class="rank-name">{{ r.user?.nickname || '选手' }}</text>
              <text class="rank-score">{{ r.score }} 分</text>
            </view>
            <view class="rank-more" @click="go('/competition/' + comp.id + '/result')">
              <text class="rank-more-txt">查看完整榜单</text>
              <app-icon name="chevron-right" :size="14" color="#c41e3a" />
            </view>
          </template>
        </view>

        <view class="safe-bottom" />
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
        <view class="footer-fee">
          <text class="fee-label">报名费</text>
          <text class="fee-value">{{ comp.entryFee > 0 ? '¥' + yuan(comp.entryFee) : '免费' }}</text>
        </view>
        <view class="footer-btn" :class="{ disabled: actionDisabled }" @click="onAction">
          <text class="footer-btn-txt">{{ actionLabel }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import {
  competitionApi, mapStatus, uiStatusConfig, typeLabel, levelInfo, topPrizeText, fmtDate, yuan,
  roundTypeLabel,
  type Competition, type Registration, type Ranking, type CompetitionRound, type RoundStatus,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44 - 64)

const compId = ref('')
const loading = ref(true)
const error = ref('')
const comp = ref<Competition | null>(null)
const registration = ref<Registration | null>(null)
const topRanks = ref<Ranking[]>([])

const activeTab = ref<'intro' | 'rounds' | 'prize' | 'rank'>('intro')
const tabs = [
  { id: 'intro', label: '介绍' },
  { id: 'rounds', label: '赛程' },
  { id: 'prize', label: '奖品' },
  { id: 'rank', label: '排行' },
] as const

const ui = computed(() => (comp.value ? mapStatus(comp.value.status) : null))
const lv = computed(() => (comp.value ? levelInfo(comp.value.level, comp.value.organizerType) : { label: '', kind: 'platform' as const }))
const organizer = computed(() => (comp.value?.organizerType === 'circle' ? '圈子主办' : '热卜平台'))
const participants = computed(() => comp.value?._count?.registrations ?? 0)
const progressPct = computed(() => {
  if (!comp.value?.maxParticipants) return Math.min(100, participants.value > 0 ? 60 : 0)
  return Math.min(100, Math.round((participants.value / comp.value.maxParticipants) * 100))
})
const rounds = computed<CompetitionRound[]>(() => comp.value?.rounds ?? [])
const prizeList = computed(() => comp.value?.prizeConfig ?? [])
const timeRange = computed(() => {
  const rs = rounds.value
  if (!rs.length) return comp.value?.startedAt ? fmtDate(comp.value.startedAt) : ''
  const start = fmtDate(rs[0].startAt)
  const end = fmtDate(rs[rs.length - 1].endAt)
  return start && end ? (start === end ? start : `${start} ~ ${end}`) : start
})
const plainRules = computed(() => (comp.value?.rules || '').replace(/[#*`>]/g, '').replace(/\n{2,}/g, '\n').trim())

const activeRound = computed(() => rounds.value.find((r) => r.status === 'IN_PROGRESS'))

// 底部按钮态
const actionLabel = computed(() => {
  if (!comp.value) return ''
  if (comp.value.status === 'FINISHED') return '查看结果'
  if (registration.value) {
    if (activeRound.value) return '开始答题'
    return '查看我的成绩'
  }
  if (comp.value.status === 'PUBLISHED') return '立即报名'
  return '暂未开放报名'
})
const actionDisabled = computed(() => {
  if (!comp.value) return true
  if (comp.value.status === 'FINISHED') return false
  if (registration.value) return false
  return comp.value.status !== 'PUBLISHED'
})

function roundStatusText(s: RoundStatus): string {
  return s === 'IN_PROGRESS' ? '进行中' : s === 'FINISHED' ? '已结束' : '未开始'
}
function rankColor(rank: number): string {
  return rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : rank === 3 ? '#b45309' : '#c41e3a'
}

function onAction() {
  if (!comp.value || actionDisabled.value) return
  const id = comp.value.id
  if (comp.value.status === 'FINISHED') { go(`/competition/${id}/result`); return }
  if (registration.value) {
    if (activeRound.value) {
      go(`/competition/${id}/quiz?roundId=${activeRound.value.id}&registrationId=${registration.value.id}&duration=${activeRound.value.duration || 60}`)
    } else {
      go(`/competition/${id}/score-detail`)
    }
    return
  }
  go(`/competition/${id}/register`)
}
function sharePoster() {
  if (comp.value) go(`/competition/${comp.value.id}/poster`)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [c, reg] = await Promise.all([
      competitionApi.detail(compId.value),
      competitionApi.myRegistration(compId.value).catch(() => null),
    ])
    if (!c) throw new Error('赛事不存在')
    comp.value = c
    registration.value = reg
    // 排名预览（可选，失败不阻塞）
    try {
      const rk = await competitionApi.rankings(compId.value)
      topRanks.value = rk.items.slice().sort((a, b) => a.rank - b.rank).slice(0, 3)
    } catch { topRanks.value = [] }
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
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

// 微信原生分享
const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => toAppMessage({
  title: comp.value?.title || '国学赛事',
  path: `/competition/${comp.value?.id || compId.value}`,
  cover: comp.value?.coverImage || undefined,
}))
onShareTimeline(() => toTimeline({
  title: comp.value?.title || '国学赛事',
  path: `/competition/${comp.value?.id || compId.value}`,
  cover: comp.value?.coverImage || undefined,
}))
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-bar { background: var(--brand); position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { color: #fff; font-size: 16px; font-weight: 500; }
.scroll { width: 100%; }

.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.hero { position: relative; height: 180px; background: linear-gradient(135deg, var(--brand), #a01830); }
.hero-img { width: 100%; height: 100%; }
.hero-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.hero-badges { position: absolute; top: 16px; left: 16px; display: flex; gap: 8px; }
.hero-badge { padding: 3px 10px; border-radius: 6px; background: rgba(0,0,0,0.25); }
.hero-badge.registering { background: #22c55e; }
.hero-badge.ongoing { background: rgba(255,255,255,0.25); }
.hero-badge.ended { background: #6b7280; }
.hero-badge.ghost { background: rgba(255,255,255,0.2); border: 1rpx solid rgba(255,255,255,0.4); }
.hero-badge-txt { color: #fff; font-size: 12px; }

.info-card { margin: -32px 16px 0; position: relative; z-index: 10; background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.info-title { display: block; font-size: 19px; font-weight: 700; color: #1a1a1a; line-height: 1.4; margin-bottom: 10px; }
.info-org { display: flex; align-items: center; gap: 6px; margin-bottom: 14px; }
.info-org-txt { font-size: 13px; color: #9ca3af; }
.info-progress { margin-bottom: 14px; }
.progress-bar { height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--brand), #e05a72); border-radius: 3px; }
.progress-txt { font-size: 12px; color: #9ca3af; }
.info-rows { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; align-items: center; gap: 8px; }
.info-row-txt { font-size: 13px; color: #4b5563; }

.tabs { display: flex; gap: 8px; margin: 16px; background: #ececec; border-radius: 10px; padding: 4px; }
.tab { flex: 1; padding: 8px 0; text-align: center; border-radius: 8px; }
.tab.active { background: var(--brand); }
.tab-txt { font-size: 13px; color: #4b5563; }
.tab-txt.active { color: #fff; font-weight: 500; }

.panel { margin: 0 16px; }
.block { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 12px; }
.block-title { display: block; font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
.block-text { font-size: 14px; color: #4b5563; line-height: 1.8; white-space: pre-wrap; }
.block.notice { display: flex; gap: 8px; align-items: flex-start; background: #fffbeb; }
.notice-text { flex: 1; font-size: 12px; color: #92704a; line-height: 1.6; }
.mini-empty { padding: 40px 0; text-align: center; }
.mini-empty-txt { color: #9ca3af; font-size: 13px; }

.round-item { display: flex; gap: 12px; }
.round-line { display: flex; flex-direction: column; align-items: center; width: 16px; }
.round-dot { width: 12px; height: 12px; border-radius: 50%; background: #d1d5db; margin-top: 4px; }
.round-dot.IN_PROGRESS { background: var(--brand); }
.round-dot.FINISHED { background: #22c55e; }
.round-bar { flex: 1; width: 2px; background: #e5e7eb; margin: 4px 0; }
.round-body { flex: 1; background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.round-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.round-name { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.round-st { padding: 1px 8px; border-radius: 4px; background: #f3f4f6; }
.round-st.IN_PROGRESS { background: #fee2e2; }
.round-st.FINISHED { background: #dcfce7; }
.round-st-txt { font-size: 11px; color: #6b7280; }
.round-st.IN_PROGRESS .round-st-txt { color: var(--brand); }
.round-title { display: block; font-size: 13px; color: #4b5563; margin-bottom: 4px; }
.round-desc { display: block; font-size: 12px; color: #9ca3af; line-height: 1.6; margin-bottom: 8px; }
.round-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.round-meta-txt { font-size: 12px; color: #9ca3af; }

.prize-item { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.prize-rank { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.prize-rank.r1 { background: #fef3c7; }
.prize-rank.r2 { background: #f3f4f6; }
.prize-rank.r3 { background: #fef9ec; }
.prize-body { flex: 1; }
.prize-title { display: block; font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }
.prize-reward { font-size: 13px; color: var(--brand); }

.rank-item { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
.rank-no { width: 26px; height: 26px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.rank-no.r1 { background: #fef3c7; } .rank-no.r2 { background: #f3f4f6; } .rank-no.r3 { background: #fef9ec; }
.rank-no-txt { font-size: 13px; font-weight: 700; color: #6b7280; }
.rank-no-txt.r1 { color: #f59e0b; } .rank-no-txt.r2 { color: #6b7280; } .rank-no-txt.r3 { color: #b45309; }
.rank-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rank-avatar-img { width: 100%; height: 100%; }
.rank-name { flex: 1; font-size: 14px; color: #1a1a1a; }
.rank-score { font-size: 14px; font-weight: 700; color: var(--brand); }
.rank-more { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 12px 0; }
.rank-more-txt { font-size: 13px; color: var(--brand); }

.footer { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1rpx solid #eee; display: flex; align-items: center; gap: 16px; padding: 12px 16px; z-index: 50; }
.footer-fee { display: flex; flex-direction: column; }
.fee-label { font-size: 11px; color: #9ca3af; }
.fee-value { font-size: 18px; font-weight: 700; color: var(--brand); }
.footer-btn { flex: 1; height: 46px; background: linear-gradient(135deg, var(--brand), #a01830); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.footer-btn.disabled { background: #d1d5db; }
.footer-btn-txt { color: #fff; font-size: 16px; font-weight: 600; }
.safe-bottom { height: 24px; }
</style>
