<template>
  <view class="a1-page">
    <scroll-view scroll-y class="a1-scroll">
      <!-- 朱红渐变品牌头（自定义 navbar） -->
      <view class="a1-brand" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="a1-brand-top">
          <view class="a1-brand-logo"><app-icon name="award" :size="18" color="#fff" /></view>
          <view class="a1-brand-title">
            <text class="a1-brand-h2">赛事中心</text>
            <text class="a1-brand-en">COMPETITION ARENA</text>
          </view>
          <view class="a1-brand-nav">
            <text class="a1-brand-nav-link" @tap="go('/pkg-competition/talents/index')">人才榜</text>
          </view>
        </view>
        <!-- 搜索框 -->
        <view class="a1-search">
          <app-icon name="search" :size="16" color="#b7b0a6" />
          <input v-model="searchQuery" class="a1-search-input" placeholder="搜索赛事 / 承办圈子 / 关键词" placeholder-class="a1-search-ph" />
        </view>
      </view>

      <!-- loading -->
      <view v-if="loading" class="a1-state">
        <view class="a1-spinner" /><text class="a1-state-txt">加载中…</text>
      </view>

      <!-- error -->
      <view v-else-if="error" class="a1-state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
        <text class="a1-state-txt">{{ error }}</text>
        <view class="a1-retry" @tap="load"><text class="a1-retry-txt">重新加载</text></view>
      </view>

      <template v-else>
        <!-- 分类 Tab（前端过滤） -->
        <scroll-view scroll-x class="a1-tabs">
          <view class="a1-tabs-row">
            <view
              v-for="cat in categories" :key="cat.id"
              class="a1-tab" :class="{ on: activeCategory === cat.id }"
              @tap="activeCategory = cat.id"
            >
              <text class="a1-tab-txt" :class="{ on: activeCategory === cat.id }">{{ cat.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 焦点赛事大卡 -->
        <template v-if="focus">
          <view class="a1-sec-hd">
            <text class="a1-sec-title">焦点赛事</text>
            <text class="a1-sec-more">{{ uiStatusConfig[focus.ui].label }}</text>
          </view>
          <view class="a1-focus" @tap="go('/competition/' + focus.id)">
            <view class="a1-cover" :class="{ ended: focus.ui === 'ended' }">
              <image v-if="focus.cover" :src="focus.cover" mode="aspectFill" class="a1-cover-img" />
              <view v-else class="a1-cover-art"><app-icon name="award" :size="64" color="rgba(201,169,110,0.5)" /></view>
              <view class="a1-cover-grad" />
              <!-- 状态徽章 -->
              <view v-if="focus.ui !== 'ended'" class="a1-badge-live" :class="focus.ui">
                <view class="a1-blink" /><text class="a1-badge-live-txt">{{ uiStatusConfig[focus.ui].label }}</text>
              </view>
              <view v-else class="a1-badge-count a1-badge-count-left"><text class="a1-badge-count-txt">● 已结束</text></view>
              <view class="a1-badge-count"><text class="a1-badge-count-txt">{{ focus.countText }}</text></view>
              <view class="a1-cover-title"><text class="a1-cover-title-txt">{{ focus.title }}</text></view>
            </view>
            <view class="a1-focus-body">
              <view class="a1-meta-row">
                <text class="a1-chip circle">◎ {{ focus.organizer }}</text>
                <text class="a1-chip type">{{ focus.typeTag }}</text>
                <text class="a1-chip level">{{ focus.levelLabel }}</text>
                <text class="a1-chip prize">{{ focus.prize }}</text>
              </view>
              <!-- 倒计时（真实时间，无则不显示） -->
              <view v-if="focus.ui !== 'ended' && focus.countdown" class="a1-countdown">
                <text class="a1-cd-lab">{{ focus.countdownLabel }}</text>
                <view class="a1-cd-nums">
                  <text class="a1-cd-b">{{ focus.countdown.h }}</text><text class="a1-cd-i">:</text>
                  <text class="a1-cd-b">{{ focus.countdown.m }}</text><text class="a1-cd-i">:</text>
                  <text class="a1-cd-b">{{ focus.countdown.s }}</text>
                </view>
              </view>
              <!-- 状态化 CTA -->
              <view v-if="focus.ui === 'registering'" class="a1-btn a1-btn-primary"><text class="a1-btn-txt">立即报名</text></view>
              <view v-else-if="focus.ui === 'ongoing'" class="a1-btn a1-btn-primary">
                <text class="a1-btn-txt">开始答题</text>
                <app-icon name="arrow-right" :size="16" color="#fff" />
              </view>
              <view v-else class="a1-btn-dual">
                <view class="a1-btn a1-btn-ghost" @tap.stop="go('/competition/' + focus.id)"><text class="a1-btn-ghost-txt">查看成绩</text></view>
                <view class="a1-btn a1-btn-gold" @tap.stop="go('/competition/' + focus.id)"><text class="a1-btn-txt">看排行榜</text></view>
              </view>
            </view>
          </view>
        </template>

        <!-- 快捷入口宫格 -->
        <view class="a1-sec-hd">
          <text class="a1-sec-title">快捷入口</text>
          <text class="a1-sec-more">荣誉 · 裂变</text>
        </view>
        <view class="a1-grid">
          <view v-for="e in entries" :key="e.key" class="a1-ge" @tap="onEntry(e.key)">
            <view class="a1-ge-ico" :class="e.tone"><app-icon :name="e.icon" :size="20" :color="e.color" /></view>
            <text class="a1-ge-txt">{{ e.label }}</text>
          </view>
        </view>

        <!-- 全部赛事三态列表 -->
        <view class="a1-sec-hd">
          <text class="a1-sec-title">全部赛事</text>
          <text class="a1-sec-more">综合排序 ›</text>
        </view>

        <view v-if="listCompetitions.length" class="a1-list">
          <view v-for="comp in listCompetitions" :key="comp.id" class="a1-lc" @tap="go('/competition/' + comp.id)">
            <view class="a1-lc-cover" :class="{ ended: comp.ui === 'ended' }">
              <image v-if="comp.cover" :src="comp.cover" mode="aspectFill" class="a1-lc-cover-img" />
              <view v-else class="a1-lc-cover-ph"><app-icon name="award" :size="26" color="rgba(201,169,110,0.5)" /></view>
            </view>
            <view class="a1-lc-body">
              <text class="a1-lc-title">{{ comp.title }}</text>
              <view class="a1-lc-tags">
                <text class="a1-chip type">{{ comp.typeTag }}</text>
                <text class="a1-chip level">{{ comp.levelLabel }}</text>
                <text class="a1-chip prize">{{ comp.prize }}</text>
              </view>
              <view class="a1-lc-foot">
                <view class="a1-status-dot" :class="comp.ui === 'ended' ? 's-end' : 's-ing'">
                  <view class="a1-dot" /><text class="a1-status-txt">{{ comp.footText }}</text>
                </view>
                <view class="a1-mini-btn" :class="{ on: comp.ui === 'registering' }">
                  <text class="a1-mini-btn-txt" :class="{ on: comp.ui === 'registering' }">{{ comp.actionText }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- empty -->
        <view v-else class="a1-empty">
          <app-icon name="award" :size="48" color="#d8cfc0" />
          <text class="a1-empty-txt">暂无相关赛事</text>
        </view>
      </template>

      <view class="a1-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { BRAND } from '@/lib/brand'
import {
  competitionApi, mapStatus, uiStatusConfig, typeLabel, levelInfo, topPrizeText, fmtDate,
  type Competition, type UiStatus, type CompetitionRound,
} from '@/pkg-competition/lib/competition-data'

const statusBarHeight = ref(0)

const loading = ref(true)
const error = ref('')

interface Countdown { h: string; m: string; s: string }
interface CardVM {
  id: string; title: string; cover: string; ui: UiStatus
  levelKind: 'platform' | 'circle' | 'joint'; levelLabel: string; typeTag: string
  participants: number; maxParticipants: number; startTime: string; prize: string
  organizer: string; tags: string[]; type: string
  countText: string; footText: string; actionText: string
  countdownLabel: string; countdownEnd: number | null; countdown: Countdown | null
}
const cards = ref<CardVM[]>([])

// 分类 Tab（前端过滤，type 值对齐后端枚举）
const categories = [
  { id: 'all', label: '全部' },
  { id: 'BAZI_PREDICT', label: '八字' },
  { id: 'FENGSHUI', label: '风水' },
  { id: 'ZIWEI_DOUSHU', label: '紫微' },
  { id: 'LIUYAO', label: '六爻' },
  { id: 'QIMEN_DUNJIA', label: '奇门' },
]
const activeCategory = ref('all')
const searchQuery = ref('')

// 快捷入口 6 格（icon 用 app-icon 现有名）
const entries = [
  { key: 'live', label: '直播赛间', icon: 'video', tone: 'red', color: '#C41E3A' },
  { key: 'offline', label: '线下赛', icon: 'map-pin', tone: 'gold', color: '#A5883F' },
  { key: 'ranking', label: '排行榜', icon: 'bar-chart-3', tone: 'gold', color: '#A5883F' },
  { key: 'talents', label: '分析师榜', icon: 'user', tone: 'gold', color: '#A5883F' },
  { key: 'invite', label: '邀请同台', icon: 'user-plus', tone: 'red', color: '#C41E3A' },
  { key: 'rules', label: '赛制公示', icon: 'file-text', tone: 'gray', color: '#6E6E73' },
]

// 每秒滴答（驱动倒计时重算）
const nowTick = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

/** 从赛事取焦点倒计时截止时间：进行中取「进行中的轮次 endAt」，报名中取「报名轮 startAt / 首轮 startAt」 */
function pickCountdown(c: Competition, ui: UiStatus): { label: string; end: number | null } {
  const rounds: CompetitionRound[] = c.rounds || []
  const toMs = (iso?: string | null) => {
    if (!iso) return null
    const t = new Date(iso).getTime()
    return isNaN(t) ? null : t
  }
  if (ui === 'ongoing') {
    const running = rounds.find((r) => r.status === 'IN_PROGRESS')
    const end = toMs(running?.endAt) || toMs(c.finishedAt)
    return { label: '距本轮截止', end }
  }
  if (ui === 'registering') {
    const reg = rounds.find((r) => r.type === 'REGISTRATION')
    const first = rounds.length ? rounds[0] : null
    const end = toMs(reg?.endAt) || toMs(first?.startAt) || toMs(c.startedAt)
    return { label: '距报名截止', end }
  }
  return { label: '', end: null }
}

function toCard(c: Competition): CardVM | null {
  const ui = mapStatus(c.status)
  if (!ui) return null
  const lv = levelInfo(c.level, c.organizerType)
  const firstRound = c.rounds && c.rounds.length ? c.rounds[0] : null
  const people = c._count?.registrations ?? 0
  const cd = pickCountdown(c, ui)

  let countText = ''
  let footText = ''
  let actionText = ''
  if (ui === 'registering') {
    countText = people > 0 ? `已报名 ${people} 人` : '报名中'
    const end = fmtDate(c.rounds?.find((r) => r.type === 'REGISTRATION')?.endAt || firstRound?.startAt || c.startedAt)
    footText = end ? `报名中 · 截止 ${end}` : '报名中'
    actionText = '立即报名'
  } else if (ui === 'ongoing') {
    countText = people > 0 ? `${people} 人参赛` : '进行中'
    footText = people > 0 ? `进行中 · ${people} 人` : '进行中'
    actionText = '查看'
  } else {
    countText = people > 0 ? `完赛 ${people} 人` : '已结束'
    footText = '已结束 · 看排行'
    actionText = '成绩/排行'
  }

  return {
    id: c.id, title: c.title, cover: c.coverImage || '', ui,
    levelKind: lv.kind, levelLabel: lv.label, typeTag: typeLabel(c.type),
    participants: people, maxParticipants: c.maxParticipants || 0,
    startTime: fmtDate(firstRound?.startAt || c.startedAt || c.publishedAt),
    prize: topPrizeText(c),
    organizer: c.organizerType === 'platform' ? `${BRAND.nameShort}平台` : c.organizerType === 'circle' ? '圈子主办' : `${BRAND.nameShort}平台`,
    tags: c.tags || [], type: c.type,
    countText, footText, actionText,
    countdownLabel: cd.label, countdownEnd: cd.end, countdown: null,
  }
}

const filteredCompetitions = computed(() => cards.value.filter((c) => {
  const matchCat = activeCategory.value === 'all' || c.type === activeCategory.value
  const matchSearch = c.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  return matchCat && matchSearch
}))

/** 焦点卡：优先进行中，否则报名中，否则最新一个 */
const focus = computed<CardVM | null>(() => {
  const list = filteredCompetitions.value
  const f = list.find((c) => c.ui === 'ongoing') || list.find((c) => c.ui === 'registering') || (list.length ? list[0] : null)
  if (!f) return null
  // 计算实时倒计时（依赖 nowTick）
  let countdown: Countdown | null = null
  if (f.countdownEnd) {
    const diff = f.countdownEnd - nowTick.value
    if (diff > 0) {
      const totalH = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      countdown = { h: pad(totalH), m: pad(m), s: pad(s) }
    }
  }
  return { ...f, countdown }
})

/** 全部赛事列表：排除焦点卡 */
const listCompetitions = computed(() => {
  const fid = focus.value?.id
  return filteredCompetitions.value.filter((c) => c.id !== fid)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await competitionApi.list({ pageSize: 50 })
    cards.value = res.items.map(toCard).filter((c): c is CardVM => c !== null)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function go(p: string) { navigateTo(p) }

// 快捷入口降级处理（诚实：后端无对应能力的一律 toast / 引导）
function onEntry(key: string) {
  switch (key) {
    case 'live': uni.showToast({ title: '直播赛即将开放', icon: 'none' }); break
    case 'offline': uni.showToast({ title: '线下赛即将开放', icon: 'none' }); break
    // 排行榜依赖具体赛事，无全局榜 → 引导到人才榜
    case 'ranking': uni.showToast({ title: '请进入具体赛事查看排行', icon: 'none' }); break
    case 'talents': navigateTo('/pkg-competition/talents/index'); break
    case 'invite': uni.showToast({ title: '邀请同台即将开放', icon: 'none' }); break
    case 'rules': uni.showToast({ title: '赛制公示即将开放', icon: 'none' }); break
  }
}

onMounted(() => {
  try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}
  timer = setInterval(() => { nowTick.value = Date.now() }, 1000)
  load()
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style lang="scss" scoped>
.a1-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.a1-scroll { flex: 1; height: 0; min-height: 0; }

/* 朱红渐变品牌头 */
.a1-brand { background: linear-gradient(135deg, #C41E3A 0%, #A5162E 100%); padding: 0 20px 34px; position: relative; }
.a1-brand::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 22px; background: #FAF8F5; border-radius: 22px 22px 0 0; }
.a1-brand-top { display: flex; align-items: center; gap: 10px; padding-top: 8px; }
.a1-brand-logo { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.a1-brand-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.a1-brand-h2 { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 3px; font-family: 'Songti SC', 'STSong', serif; }
.a1-brand-en { color: rgba(255,255,255,0.55); font-size: 10px; letter-spacing: 1px; margin-top: 1px; }
.a1-brand-nav { flex-shrink: 0; }
.a1-brand-nav-link { color: rgba(255,255,255,0.85); font-size: 13px; }

/* 搜索框 */
.a1-search { margin-top: 16px; height: 42px; border-radius: 999px; background: rgba(255,255,255,0.92); display: flex; align-items: center; padding: 0 16px; gap: 9px; }
.a1-search-input { flex: 1; font-size: 13px; color: #2C2C2C; }
.a1-search-ph { color: #b7b0a6; }

/* 三态 */
.a1-state { padding: 80px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.a1-state-txt { color: #9A9A9A; font-size: 14px; text-align: center; }
.a1-spinner { width: 32px; height: 32px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.a1-retry { margin-top: 4px; padding: 8px 24px; border: 1px solid #C41E3A; border-radius: 999px; }
.a1-retry-txt { color: #C41E3A; font-size: 13px; }

/* 分类 Tab */
.a1-tabs { white-space: nowrap; padding: 24px 20px 4px; }
.a1-tabs-row { display: inline-flex; gap: 8px; }
.a1-tab { flex: 0 0 auto; padding: 7px 16px; border-radius: 999px; background: #FFF; border: 1px solid #ECE7DF; }
.a1-tab.on { background: #C41E3A; border-color: #C41E3A; box-shadow: 0 3px 10px rgba(196,30,58,0.28); }
.a1-tab-txt { font-size: 13px; color: #6E6E73; }
.a1-tab-txt.on { color: #fff; font-weight: 600; }

/* section 标题 */
.a1-sec-hd { display: flex; align-items: baseline; justify-content: space-between; padding: 0 20px; margin: 22px 0 12px; }
.a1-sec-title { font-size: 18px; font-weight: 700; letter-spacing: 1px; color: #2C2C2C; position: relative; padding-left: 13px; font-family: 'Songti SC', 'STSong', serif; }
.a1-sec-title::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 4px; background: #C9A96E; border-radius: 2px; }
.a1-sec-more { font-size: 12px; color: #9A9A9A; }

/* 焦点大卡 */
.a1-focus { margin: 0 20px; background: #FFF; border-radius: 18px; overflow: hidden; border: 1px solid #ECE7DF; box-shadow: 0 6px 22px rgba(60,40,20,0.07); }
.a1-cover { position: relative; width: 100%; padding-top: 56.25%; background: linear-gradient(150deg, #3a2b2e, #241a1c); overflow: hidden; }
.a1-cover.ended { filter: grayscale(0.55); }
.a1-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.a1-cover-art { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.a1-cover-grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,12,14,0.82), rgba(20,12,14,0) 55%); }
.a1-badge-live { position: absolute; left: 14px; top: 14px; display: flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; box-shadow: 0 2px 8px rgba(196,30,58,0.4); }
.a1-badge-live.registering, .a1-badge-live.ongoing { background: #C41E3A; }
.a1-blink { width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: blink 1.2s infinite; }
@keyframes blink { 50% { opacity: 0.3; } }
.a1-badge-live-txt { color: #fff; font-size: 11px; font-weight: 700; }
.a1-badge-count { position: absolute; right: 14px; top: 14px; padding: 5px 11px; border-radius: 999px; background: rgba(0,0,0,0.4); }
.a1-badge-count-left { left: 14px; right: auto; background: rgba(0,0,0,0.45); }
.a1-badge-count-txt { color: #fff; font-size: 11px; }
.a1-cover-title { position: absolute; left: 16px; right: 16px; bottom: 14px; }
.a1-cover-title-txt { color: #fff; font-size: 20px; font-weight: 700; line-height: 1.4; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.5); font-family: 'Songti SC', 'STSong', serif; }
.a1-focus-body { padding: 16px; }

/* chip */
.a1-meta-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
.a1-chip { font-size: 11px; padding: 4px 10px; border-radius: 7px; font-weight: 500; }
.a1-chip.circle { background: #fdeef0; color: #C41E3A; border: 1px solid #f2cdd3; }
.a1-chip.type { background: #eef2f5; color: #5a7a8a; }
.a1-chip.level { background: #f6efdf; color: #A5883F; }
.a1-chip.prize { background: #f6efdf; color: #A5883F; }

/* 倒计时 */
.a1-countdown { display: flex; align-items: center; background: linear-gradient(135deg, #fdeef0, #fbe3e6); border: 1px solid #f2cdd3; border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; }
.a1-cd-lab { font-size: 12px; color: #C41E3A; font-weight: 600; }
.a1-cd-nums { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.a1-cd-b { font-family: ui-monospace, monospace; font-size: 17px; font-weight: 700; color: #fff; background: #C41E3A; border-radius: 7px; padding: 4px 8px; }
.a1-cd-i { color: #C41E3A; font-weight: 700; }

/* 按钮 */
.a1-btn { display: flex; align-items: center; justify-content: center; gap: 7px; border-radius: 999px; padding: 13px; }
.a1-btn-primary { background: linear-gradient(135deg, #C41E3A, #A5162E); box-shadow: 0 6px 18px rgba(196,30,58,0.32); }
.a1-btn-gold { background: linear-gradient(135deg, #d8bd85, #A5883F); box-shadow: 0 6px 18px rgba(165,136,63,0.3); flex: 1; }
.a1-btn-ghost { background: #FFF; border: 1px solid #ECE7DF; flex: 1; }
.a1-btn-txt { color: #fff; font-size: 15px; font-weight: 600; }
.a1-btn-ghost-txt { color: #6E6E73; font-size: 15px; font-weight: 600; }
.a1-btn-dual { display: flex; gap: 11px; }

/* 快捷入口宫格 */
.a1-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 11px; padding: 0 20px; }
.a1-ge { background: #FFF; border: 1px solid #ECE7DF; border-radius: 15px; padding: 15px 6px; display: flex; flex-direction: column; align-items: center; gap: 9px; box-shadow: 0 3px 12px rgba(60,40,20,0.04); }
.a1-ge-ico { width: 42px; height: 42px; border-radius: 13px; display: flex; align-items: center; justify-content: center; }
.a1-ge-ico.red { background: #fdeef0; }
.a1-ge-ico.gold { background: #f6efdf; }
.a1-ge-ico.blue { background: #eef2f5; }
.a1-ge-ico.gray { background: #f1efec; }
.a1-ge-txt { font-size: 12px; color: #2C2C2C; font-weight: 500; }

/* 全部赛事列表卡 */
.a1-list { padding: 0; }
.a1-lc { display: flex; gap: 13px; background: #FFF; border: 1px solid #ECE7DF; border-radius: 16px; padding: 13px; margin: 0 20px 13px; box-shadow: 0 4px 14px rgba(60,40,20,0.04); }
.a1-lc-cover { flex: 0 0 100px; height: 76px; border-radius: 12px; overflow: hidden; position: relative; background: linear-gradient(150deg, #463c2c, #2b2519); }
.a1-lc-cover.ended { filter: grayscale(0.5); }
.a1-lc-cover-img { width: 100%; height: 100%; }
.a1-lc-cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.a1-lc-body { flex: 1; min-width: 0; }
.a1-lc-title { display: block; font-size: 15px; font-weight: 700; line-height: 1.35; color: #2C2C2C; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.a1-lc-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 9px; }
.a1-lc-foot { display: flex; align-items: center; justify-content: space-between; }
.a1-status-dot { display: flex; align-items: center; gap: 6px; }
.a1-dot { width: 7px; height: 7px; border-radius: 50%; }
.a1-status-txt { font-size: 12px; font-weight: 600; }
.a1-status-dot.s-ing .a1-dot { background: #C41E3A; }
.a1-status-dot.s-ing .a1-status-txt { color: #C41E3A; }
.a1-status-dot.s-end .a1-dot { background: #c3bcb0; }
.a1-status-dot.s-end .a1-status-txt { color: #9A9A9A; }
.a1-mini-btn { padding: 6px 14px; border-radius: 999px; border: 1px solid #ECE7DF; background: #FFF; flex-shrink: 0; }
.a1-mini-btn.on { background: #C41E3A; border-color: #C41E3A; }
.a1-mini-btn-txt { font-size: 12px; color: #6E6E73; font-weight: 500; }
.a1-mini-btn-txt.on { color: #fff; }

/* empty */
.a1-empty { padding: 48px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.a1-empty-txt { color: #9A9A9A; font-size: 14px; }

.a1-safe { height: 30px; }
</style>
