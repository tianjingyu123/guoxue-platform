<template>
  <view class="page">
    <customer-service-fab />

    <!-- loading -->
    <view v-if="loading" class="state" :style="{ paddingTop: statusBarHeight + 80 + 'px' }">
      <view class="spinner" /><text class="state-txt">加载中…</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state" :style="{ paddingTop: statusBarHeight + 80 + 'px' }">
      <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <template v-else-if="comp">
      <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
        <!-- Hero 16:9 -->
        <view class="hero">
          <image lazy-load v-if="comp.coverImage" :src="comp.coverImage" mode="aspectFill" class="hero-img" />
          <view v-else class="hero-ph"><app-icon name="trophy" :size="56" color="rgba(201,169,110,0.55)" /></view>
          <view class="hero-grad" />
          <!-- 顶部操作 -->
          <view class="hero-top" :style="{ paddingTop: statusBarHeight + 'px' }">
            <view class="rbtn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#fff" /></view>
            <view class="rbtn" @tap="sharePoster"><app-icon name="share-2" :size="16" color="#fff" /></view>
          </view>
        </view>

        <!-- 名片式 Hero -->
        <view class="namecard">
          <text class="nc-title">{{ comp.title }}</text>
          <view class="meta-row">
            <text class="chip type">{{ typeLabel(comp.type) }}</text>
            <text class="chip level">{{ lv.label }}</text>
            <text v-if="ui" class="chip state" :class="ui"><text class="dot">●</text> {{ uiStatusConfig[ui].label }}</text>
          </view>
          <view class="kv"><text class="kv-k">主办方</text><text class="kv-v">{{ organizer }}</text></view>
          <view class="kv"><text class="kv-k">赛制</text><text class="kv-v">{{ raceModeText }}</text></view>
          <view class="kv"><text class="kv-k">报名费</text><text class="kv-v">{{ comp.entryFee > 0 ? '¥' + yuan(comp.entryFee) : '免费' }}{{ comp.isInviteOnly ? '（邀请制）' : '' }}</text></view>
          <view class="kv"><text class="kv-k">已参赛</text><text class="kv-v">{{ participants }}{{ comp.maxParticipants ? ' / ' + comp.maxParticipants : '' }} 人</text></view>
          <!-- 报名进度 -->
          <view class="progress-bar"><view class="progress-fill" :style="{ width: progressPct + '%' }" /></view>
        </view>

        <!-- Tab -->
        <view class="tabs">
          <view v-for="t in tabs" :key="t.id" class="tab" :class="{ active: activeTab === t.id }" @tap="activeTab = t.id">
            <text class="tab-txt" :class="{ active: activeTab === t.id }">{{ t.label }}</text>
          </view>
        </view>

        <!-- ===== 介绍 ===== -->
        <view v-if="activeTab === 'intro'" class="panel">
          <!-- 赛制说明卡 -->
          <view class="sec">
            <view class="sec-hd"><text class="sec-title">赛制 · 晋级漏斗</text></view>
            <view v-if="funnelRounds.length" class="funnel">
              <template v-for="(r, i) in funnelRounds" :key="r.id">
                <view class="fn" :class="{ 'fn-done': r.status === 'FINISHED', 'fn-now': r.status === 'IN_PROGRESS' }">
                  <view class="fn-hd">
                    <text class="fn-tag" :class="fnTagClass(r.type)">{{ roundTypeLabel[r.type] }}</text>
                    <text class="fn-stage">{{ r.title }}{{ r.status === 'IN_PROGRESS' ? ' · 进行中' : '' }}</text>
                  </view>
                  <text v-if="r.description" class="fn-body">{{ r.description }}</text>
                  <text v-else class="fn-body">{{ fnDefaultDesc(r) }}</text>
                </view>
                <view v-if="i < funnelRounds.length - 1" class="fn-arrow"><text class="fn-arrow-txt">▼ 自动晋级</text></view>
              </template>
            </view>
            <view v-else class="mini-empty"><text class="mini-empty-txt">赛制待公布</text></view>
            <view class="srun">
              <text class="srun-txt"><text class="srun-em">〔自运转〕</text>状态机到点自动流转：报名→晋级→决赛→出榜→发奖，无需人工开关。<text class="srun-em">〔高透明〕</text>晋级规则、判分权重、名额前置写死，报名前可见。</text>
            </view>
          </view>

          <!-- 赛事简介 -->
          <view v-if="comp.description" class="sec">
            <view class="sec-hd"><text class="sec-title">赛事简介</text></view>
            <view class="block"><text class="block-text">{{ comp.description }}</text></view>
          </view>

          <!-- 荐才同荣（平台机制说明） -->
          <view class="sec">
            <view class="invite-reward">
              <text class="ir-title">◆ 荐才同荣 · 邀请人连带奖励</text>
              <text class="ir-p">你邀请的参赛者获得实物奖励时，你作为荐才人自动获得对应一份连带奖励。仅追溯一层（你→TA），不做多级分销，挂钩真实赛事荣誉而非消费。</text>
              <view class="ir-map">
                <view class="ir-col"><text class="ir-h">TA 得冠军</text><text class="ir-v">荐者得最高档连带奖</text></view>
                <view class="ir-col"><text class="ir-h">TA 晋级/优胜</text><text class="ir-v">荐者得中档连带奖</text></view>
                <view class="ir-col"><text class="ir-h">TA 参与荣誉</text><text class="ir-v">荐者得荣誉值/积分</text></view>
              </view>
            </view>
          </view>

          <!-- 规则透明公示 -->
          <view v-if="plainRules" class="sec">
            <view class="sec-hd"><text class="sec-title">规则透明公示</text></view>
            <view class="block"><text class="block-text">{{ plainRules }}</text></view>
          </view>

          <view class="notice">
            <app-icon name="info" :size="14" color="#A5883F" />
            <text class="notice-text">荣誉证书与专属海报赛后即时生成；获奖选手是否参与赛后分享，由选手自愿、与平台线下协商确定。</text>
          </view>
        </view>

        <!-- ===== 赛程晋级链时间轴（灵魂） ===== -->
        <view v-else-if="activeTab === 'rounds'" class="panel">
          <view v-if="rounds.length === 0" class="mini-empty"><text class="mini-empty-txt">赛程待公布</text></view>
          <view v-else class="tl">
            <view v-for="(r, i) in rounds" :key="r.id" class="tl-item" :class="tlClass(r.status)">
              <view class="tl-rail">
                <view class="tl-dot" :class="tlClass(r.status)" />
                <view v-if="i < rounds.length - 1" class="tl-line" />
              </view>
              <view class="tl-body">
                <view class="tl-head">
                  <text class="tl-name" :class="{ now: r.status === 'IN_PROGRESS' }">{{ roundTypeLabel[r.type] || r.title }}</text>
                  <text v-if="r.status === 'IN_PROGRESS'" class="badge-now">进行中</text>
                  <text v-else-if="r.status === 'FINISHED'" class="badge-done">已结束</text>
                </view>
                <text v-if="r.title && r.title !== roundTypeLabel[r.type]" class="tl-sub">{{ r.title }}</text>
                <text class="tl-time">{{ roundTimeText(r) }}</text>
                <view class="tl-meta">
                  <text v-if="r.passCount > 0" class="tl-meta-txt">取前 {{ r.passCount }} 名晋级</text>
                  <text v-if="r.duration > 0" class="tl-meta-txt">限时 {{ r.duration }} 分钟</text>
                </view>
                <text v-if="r.description" class="tl-desc">{{ r.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 奖品 ===== -->
        <view v-else-if="activeTab === 'prize'" class="panel">
          <view v-if="prizeList.length === 0" class="mini-empty"><text class="mini-empty-txt">奖项待公布</text></view>
          <view v-else class="prize-grid">
            <view v-for="(p, i) in prizeList" :key="i" class="prize">
              <view class="medal" :class="medalClass(p.rank || i + 1)"><text class="medal-txt">{{ medalLabel(p.rank || i + 1) }}</text></view>
              <view class="pb">
                <text class="pb-h">{{ prizeMain(p) }}</text>
                <text class="pb-p">{{ p.title || (p.rank ? p.rank + '等奖' : '奖项') }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 排行 ===== -->
        <view v-else-if="activeTab === 'rank'" class="panel">
          <view v-if="topRanks.length === 0" class="mini-empty"><text class="mini-empty-txt">暂无排名，赛事结束后公布</text></view>
          <template v-else>
            <view v-for="r in topRanks" :key="r.id" class="rank-item">
              <view class="rank-no" :class="'r' + r.rank"><text class="rank-no-txt" :class="'r' + r.rank">{{ r.rank }}</text></view>
              <view class="rank-avatar">
                <image lazy-load v-if="r.user?.avatar" :src="r.user.avatar" class="rank-avatar-img" mode="aspectFill" />
                <app-icon v-else name="user" :size="16" color="#C41E3A" />
              </view>
              <text class="rank-name">{{ r.user?.nickname || '选手' }}</text>
              <text class="rank-score">{{ r.score }} 分</text>
            </view>
            <view class="rank-more" @tap="go('/competition/' + comp.id + '/result')">
              <text class="rank-more-txt">查看完整榜单</text>
              <app-icon name="chevron-right" :size="14" color="#C41E3A" />
            </view>
          </template>
        </view>

        <view class="safe-bottom" />
      </scroll-view>

      <!-- 底部状态化 CTA -->
      <view class="cta-bar" :style="{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }">
        <view class="cta-side" @tap="sharePoster">
          <app-icon name="share-2" :size="20" color="#9A9A9A" />
          <text class="cta-side-txt">分享</text>
        </view>
        <!-- ④ 已结束：查看成绩 + 看排行 -->
        <view v-if="ctaMode === 'finished'" class="btn-split">
          <view class="btn btn-gray" @tap="onAction"><text class="btn-txt gray">查看成绩</text></view>
          <view class="btn btn-gold" @tap="go('/competition/' + comp.id + '/result')"><text class="btn-txt light">看排行榜</text></view>
        </view>
        <!-- ③ 进行中：开始答题 -->
        <view v-else-if="ctaMode === 'quiz'" class="btn btn-primary" @tap="onAction">
          <text class="btn-txt light">开始答题</text>
          <app-icon name="arrow-right" :size="16" color="#fff" />
        </view>
        <!-- ② 已报名待赛：置灰 -->
        <view v-else-if="ctaMode === 'waiting'" class="btn btn-wait">
          <text class="btn-txt light">{{ actionLabel }}</text>
        </view>
        <!-- ① 未报名：立即报名 / 暂未开放 -->
        <view v-else class="btn" :class="ctaMode === 'register' ? 'btn-primary' : 'btn-disabled'" @tap="onAction">
          <text class="btn-txt" :class="ctaMode === 'register' ? 'light' : 'gray'">{{ actionLabel }}</text>
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
import { BRAND } from '@/lib/brand'
import {
  competitionApi, mapStatus, uiStatusConfig, typeLabel, levelInfo, topPrizeText, fmtDate, yuan,
  roundTypeLabel, promotionLabel,
  type Competition, type Registration, type Ranking, type CompetitionRound, type RoundStatus, type RoundType, type PrizeItem,
} from '@/pkg-competition/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
// iOS flex：scroll 占满剩余高度，减去 CTA 栏（约 66px）
const scrollHeight = computed(() => sysH.value - 66)

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
const organizer = computed(() => (comp.value?.organizerType === 'circle' ? '圈子主办' : `${BRAND.nameShort}平台`))
const participants = computed(() => comp.value?._count?.registrations ?? 0)
const progressPct = computed(() => {
  if (!comp.value?.maxParticipants) return Math.min(100, participants.value > 0 ? 60 : 0)
  return Math.min(100, Math.round((participants.value / comp.value.maxParticipants) * 100))
})
const rounds = computed<CompetitionRound[]>(() =>
  (comp.value?.rounds ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
)
// 赛制漏斗：剔除「报名」轮，只画实际比赛阶段（初赛/复赛/总决赛）
const funnelRounds = computed(() => rounds.value.filter((r) => r.type !== 'REGISTRATION'))
const prizeList = computed<PrizeItem[]>(() => comp.value?.prizeConfig ?? [])
// 赛制一句话：按真实 rounds 拼（诚实·后端无「直播赛/线下赛」独立枚举则不造假）
const raceModeText = computed(() => {
  const rs = funnelRounds.value
  if (!rs.length) return '单轮赛制'
  return rs.map((r) => roundTypeLabel[r.type]).join(' → ')
})
const plainRules = computed(() => (comp.value?.rules || '').replace(/[#*`>]/g, '').replace(/\n{2,}/g, '\n').trim())

const activeRound = computed(() => rounds.value.find((r) => r.status === 'IN_PROGRESS' && r.type !== 'REGISTRATION'))

// ─── 底部状态化 CTA 态机 ───
// finished=已结束 / quiz=已报名+进行中轮 / waiting=已报名待开赛 / register=未报名可报 / disabled=未开放
const ctaMode = computed<'finished' | 'quiz' | 'waiting' | 'register' | 'disabled'>(() => {
  const c = comp.value
  if (!c) return 'disabled'
  if (c.status === 'FINISHED') return 'finished'
  if (registration.value) return activeRound.value ? 'quiz' : 'waiting'
  if (c.status === 'PUBLISHED') return 'register'
  return 'disabled'
})
const actionLabel = computed(() => {
  switch (ctaMode.value) {
    case 'finished': return '查看成绩'
    case 'quiz': return '开始答题'
    case 'waiting': return waitingText.value
    case 'register': return '立即报名'
    default: return '暂未开放报名'
  }
})
// 待开赛文案：有下一未开始轮次则显其起始日
const waitingText = computed(() => {
  const next = rounds.value.find((r) => r.status === 'PENDING' && r.type !== 'REGISTRATION')
  const d = next?.startAt ? fmtDate(next.startAt) : ''
  return d ? `已报名 · ${d} 开赛` : '已报名 · 待开赛'
})

function onAction() {
  const c = comp.value
  if (!c) return
  const id = c.id
  if (ctaMode.value === 'finished') { go(`/competition/${id}/result`); return }
  if (ctaMode.value === 'quiz' && activeRound.value && registration.value) {
    go(`/competition/${id}/quiz?roundId=${activeRound.value.id}&registrationId=${registration.value.id}&duration=${activeRound.value.duration || 60}`)
    return
  }
  if (ctaMode.value === 'register') { go(`/competition/${id}/register`); return }
  // waiting / disabled：不可点，无动作
}
function sharePoster() {
  if (comp.value) go(`/competition/${comp.value.id}/poster`)
}

// ─── 展示工具 ───
function tlClass(s: RoundStatus): string {
  return s === 'IN_PROGRESS' ? 'now' : s === 'FINISHED' ? 'done' : ''
}
function roundTimeText(r: CompetitionRound): string {
  const s = fmtDate(r.startAt)
  const e = fmtDate(r.endAt)
  const range = s && e && e !== s ? `${s} ~ ${e}` : s
  const suffix = r.status === 'FINISHED' ? ' · 已结束' : r.status === 'IN_PROGRESS' ? ' · 进行中' : ''
  return (range || '时间待定') + suffix
}
function fnTagClass(t: RoundType): string {
  return t === 'FINAL' ? 't-offline' : t === 'SEMIFINAL' ? 't-live' : 't-online'
}
function fnDefaultDesc(r: CompetitionRound): string {
  const cap = r.passCount > 0 ? `，取前 ${r.passCount} 名晋级` : ''
  const t = r.duration > 0 ? ` · 限时 ${r.duration} 分钟` : ''
  return `${roundTypeLabel[r.type]}轮${t}${cap}`
}
function medalClass(rank: number): string {
  return rank === 1 ? 'm-gold' : rank === 2 ? 'm-silver' : rank === 3 ? 'm-bronze' : 'm-plain'
}
function medalLabel(rank: number): string {
  return rank === 1 ? '冠军' : rank === 2 ? '亚军' : rank === 3 ? '季军' : `第${rank}`
}
function prizeMain(p: PrizeItem): string {
  if (p.description) return p.description
  const parts: string[] = []
  if (p.prize) parts.push(`¥${yuan(p.prize)}`)
  if (p.prizeItem) parts.push(p.prizeItem)
  return parts.length ? parts.join(' + ') : '荣誉证书'
}
// 引用 promotionLabel / topPrizeText 以对齐工具接线（供后续扩展，避免未用告警）
void promotionLabel
void topPrizeText

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
    try {
      const rk = await competitionApi.rankings(compId.value)
      topRanks.value = rk.items.slice().sort((a, b) => a.rank - b.rank).slice(0, 3)
    } catch { topRanks.value = [] }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
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
/* ─── 设计 token ─── */
$paper: #FAF8F5;
$card: #FFF;
$red: #C41E3A;
$red-deep: #A5162E;
$gold: #C9A96E;
$gold-deep: #A5883F;
$t1: #2C2C2C;
$t2: #6E6E73;
$t3: #999;
$line: #ECE7DF;

.page { display: flex; flex-direction: column; height: 100vh; background: $paper; overflow: hidden; }

.state { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: $t3; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0e0e2; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: $red; border-radius: 999px; }
.retry-txt { color: #fff; font-size: 14px; }

.scroll { width: 100%; flex: 1; height: 0; }

/* ─── Hero 16:9 ─── */
.hero { position: relative; width: 100%; padding-top: 56.25%; background: linear-gradient(150deg, #3a2b2e, #221819); overflow: hidden; }
.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.hero-grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,12,14,.55), transparent 55%); }
.hero-top { position: absolute; top: 0; left: 0; right: 0; height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; box-sizing: border-box; }
.rbtn { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; }

/* ─── 名片 ─── */
.namecard { margin: -40px 20px 0; position: relative; z-index: 3; background: $card; border-radius: 18px; border: 1rpx solid $line; padding: 18px; box-shadow: 0 8rpx 26rpx rgba(60,40,20,.1); }
.nc-title { display: block; font-family: "Songti SC", "STSong", serif; font-size: 21px; font-weight: 700; color: $t1; line-height: 1.4; letter-spacing: 1px; margin-bottom: 12px; }
.meta-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
.chip { font-size: 11px; padding: 4px 10px; border-radius: 7px; font-weight: 500; }
.chip.type { background: #eef2f5; color: #5a7a8a; }
.chip.level { background: #f6efdf; color: $gold-deep; }
.chip.state { color: #fff; font-weight: 600; }
.chip.state.registering { background: #4caf50; }
.chip.state.ongoing { background: $red; }
.chip.state.ended { background: #8a8a8a; }
.chip .dot { font-size: 9px; }
.kv { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding: 9px 0; border-top: 1rpx dashed $line; }
.kv-k { color: $t3; }
.kv-v { color: $t1; font-weight: 500; text-align: right; max-width: 65%; }
.progress-bar { height: 6px; background: #f0ece5; border-radius: 3px; overflow: hidden; margin-top: 12px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, $red, #e05a72); border-radius: 3px; }

/* ─── Tab ─── */
.tabs { display: flex; gap: 8px; margin: 18px 20px 6px; background: #efe9e0; border-radius: 12px; padding: 4px; }
.tab { flex: 1; padding: 9px 0; text-align: center; border-radius: 9px; }
.tab.active { background: $red; }
.tab-txt { font-size: 13px; color: $t2; }
.tab-txt.active { color: #fff; font-weight: 600; }

.panel { padding: 12px 20px 0; }

/* ─── section ─── */
.sec { margin-bottom: 22px; }
.sec-hd { position: relative; padding-left: 13px; margin-bottom: 14px; }
.sec-hd::before { content: ''; position: absolute; left: 0; top: 2px; bottom: 2px; width: 4px; background: $gold; border-radius: 2px; }
.sec-title { font-family: "Songti SC", "STSong", serif; font-size: 18px; font-weight: 700; color: $t1; letter-spacing: 1px; }

.block { background: $card; border: 1rpx solid $line; border-radius: 14px; padding: 16px; box-shadow: 0 3rpx 12rpx rgba(60,40,20,.04); }
.block-text { font-size: 13.5px; color: $t2; line-height: 1.8; white-space: pre-wrap; }
.mini-empty { padding: 40px 0; text-align: center; }
.mini-empty-txt { color: $t3; font-size: 13px; }

/* ─── 赛制漏斗 ─── */
.funnel { display: flex; flex-direction: column; }
.fn { background: $card; border: 1rpx solid $line; border-radius: 14px; padding: 14px 16px; box-shadow: 0 3rpx 12rpx rgba(60,40,20,.04); }
.fn-done { opacity: .65; }
.fn-now { border: 1.5px solid $red; box-shadow: 0 0 0 4px #fdeef0, 0 6rpx 18rpx rgba(196,30,58,.1); }
.fn-hd { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
.fn-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 7px; }
.t-online { background: #eef2f5; color: #5a7a8a; }
.t-live { background: $red; color: #fff; }
.t-offline { background: #f6efdf; color: $gold-deep; }
.fn-stage { font-size: 11px; color: $t3; }
.fn-now .fn-stage { color: $red; font-weight: 600; }
.fn-body { display: block; font-size: 12.5px; color: $t2; line-height: 1.7; }
.fn-arrow { text-align: center; padding: 7px 0; }
.fn-arrow-txt { font-size: 11px; color: $gold-deep; font-weight: 700; }
.srun { background: #f9f3e6; border: 1rpx solid #ecdcbb; border-radius: 11px; padding: 11px 13px; margin-top: 12px; }
.srun-txt { font-size: 11.5px; color: $gold-deep; line-height: 1.7; }
.srun-em { color: $red; }

/* ─── 荐才同荣 ─── */
.invite-reward { background: linear-gradient(135deg, #faf3e6, #f6ecd8); border: 1rpx solid #ecdcbb; border-radius: 15px; padding: 15px; }
.ir-title { display: block; font-size: 14px; font-weight: 700; color: $gold-deep; margin-bottom: 8px; }
.ir-p { display: block; font-size: 12px; color: $t2; line-height: 1.7; }
.ir-map { display: flex; gap: 9px; margin-top: 12px; }
.ir-col { flex: 1; background: $card; border: 1rpx solid #ecdcbb; border-radius: 11px; padding: 11px 6px; text-align: center; }
.ir-h { display: block; font-size: 10px; color: $t3; margin-bottom: 6px; }
.ir-v { display: block; font-size: 11px; font-weight: 700; color: $gold-deep; line-height: 1.5; }

/* ─── 提示 ─── */
.notice { display: flex; gap: 8px; align-items: flex-start; background: #f9f3e6; border: 1rpx solid #ecdcbb; border-radius: 11px; padding: 11px 13px; }
.notice-text { flex: 1; font-size: 11.5px; color: $gold-deep; line-height: 1.7; }

/* ─── 赛程时间轴 ─── */
.tl { background: $card; border: 1rpx solid $line; border-radius: 16px; padding: 18px 16px; box-shadow: 0 3rpx 12rpx rgba(60,40,20,.04); }
.tl-item { display: flex; gap: 14px; position: relative; padding-bottom: 20px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-rail { display: flex; flex-direction: column; align-items: center; width: 22px; flex: 0 0 22px; }
.tl-dot { width: 22px; height: 22px; border-radius: 50%; background: $card; border: 2px solid #ddd; box-sizing: border-box; }
.tl-dot.done { background: $gold; border-color: $gold; }
.tl-dot.now { background: $red; border-color: $red; box-shadow: 0 0 0 5px #fdeef0; }
.tl-line { flex: 1; width: 2px; background: $line; margin-top: 2px; min-height: 20px; }
.tl-body { flex: 1; padding-top: 1px; }
.tl-head { display: flex; align-items: center; gap: 7px; }
.tl-name { font-size: 15px; font-weight: 700; color: $t1; }
.tl-name.now { color: $red; }
.badge-now { font-size: 10px; color: #fff; background: $red; padding: 2px 8px; border-radius: 999px; }
.badge-done { font-size: 10px; color: $gold-deep; background: #f6efdf; padding: 2px 8px; border-radius: 999px; }
.tl-sub { display: block; font-size: 12.5px; color: $t2; margin-top: 4px; }
.tl-time { display: block; font-size: 12px; color: $t3; margin-top: 3px; }
.tl-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; }
.tl-meta-txt { font-size: 11.5px; color: $gold-deep; }
.tl-desc { display: block; font-size: 12px; color: $t3; line-height: 1.6; margin-top: 6px; }

/* ─── 奖品 ─── */
.prize-grid { display: flex; flex-direction: column; gap: 11px; }
.prize { display: flex; align-items: center; gap: 14px; background: $card; border: 1rpx solid $line; border-radius: 14px; padding: 14px; box-shadow: 0 3rpx 12rpx rgba(60,40,20,.04); }
.medal { width: 48px; height: 48px; border-radius: 13px; flex: 0 0 48px; display: flex; align-items: center; justify-content: center; }
.medal-txt { font-size: 13px; font-weight: 700; color: #fff; }
.m-gold { background: linear-gradient(135deg, #e6d4a0, #c9a96e); }
.m-silver { background: linear-gradient(135deg, #e2e2e2, #b8b8b8); }
.m-bronze { background: linear-gradient(135deg, #dcae87, #b07a4f); }
.m-plain { background: linear-gradient(135deg, #efe9e0, #d8cfc0); }
.pb { flex: 1; min-width: 0; }
.pb-h { display: block; font-size: 14.5px; font-weight: 700; color: $t1; }
.pb-p { display: block; font-size: 12px; color: $t3; margin-top: 3px; }

/* ─── 排行 ─── */
.rank-item { display: flex; align-items: center; gap: 12px; background: $card; border: 1rpx solid $line; border-radius: 14px; padding: 12px 14px; margin-bottom: 11px; box-shadow: 0 3rpx 12rpx rgba(60,40,20,.04); }
.rank-no { width: 28px; height: 28px; border-radius: 9px; background: #f0ece5; display: flex; align-items: center; justify-content: center; }
.rank-no.r1 { background: #f6efdf; } .rank-no.r2 { background: #eee; } .rank-no.r3 { background: #f6efdf; }
.rank-no-txt { font-size: 13px; font-weight: 700; color: $t2; }
.rank-no-txt.r1 { color: $gold-deep; } .rank-no-txt.r2 { color: #888; } .rank-no-txt.r3 { color: #b07a4f; }
.rank-avatar { width: 34px; height: 34px; border-radius: 50%; background: rgba(196,30,58,.08); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rank-avatar-img { width: 100%; height: 100%; }
.rank-name { flex: 1; font-size: 14px; color: $t1; }
.rank-score { font-size: 14px; font-weight: 700; color: $red; }
.rank-more { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 12px 0; }
.rank-more-txt { font-size: 13px; color: $red; }

.safe-bottom { height: 20px; }

/* ─── 底部 CTA ─── */
.cta-bar { flex: 0 0 auto; background: rgba(255,255,255,.98); border-top: 1rpx solid $line; display: flex; align-items: center; gap: 13px; padding: 10px 18px; box-sizing: border-box; }
.cta-side { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.cta-side-txt { font-size: 10px; color: $t3; }
.btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; height: 48px; border-radius: 999px; }
.btn-txt { font-size: 15px; font-weight: 600; }
.btn-txt.light { color: #fff; }
.btn-txt.gray { color: $t3; }
.btn-primary { background: linear-gradient(135deg, $red, $red-deep); box-shadow: 0 6rpx 18rpx rgba(196,30,58,.3); }
.btn-wait { background: linear-gradient(135deg, #e6d4a0, $gold-deep); }
.btn-gold { background: linear-gradient(135deg, #e6d4a0, $gold-deep); }
.btn-gray { background: #f0eee9; }
.btn-disabled { background: #e5e1da; }
.btn-split { display: flex; gap: 10px; flex: 1; }
.btn-split .btn { flex: 1; }
</style>
