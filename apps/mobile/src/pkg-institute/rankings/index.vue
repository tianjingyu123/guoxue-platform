<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">讲师影响力榜单</text>
        <view class="nav-action" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 榜单头：年份切换 + 计分说明 -->
      <view class="head">
        <view class="head-bg" />
        <view class="head-inner">
          <text class="head-title">{{ year }} 年度讲师影响力榜</text>
          <text class="head-sub">任务 40% · 授课 30% · 驿站 20% · 资历 10%（学术榜单 · 不含收入）</text>
          <view class="year-tabs">
            <view
              v-for="y in yearOptions" :key="y"
              class="year-tab" :class="{ 'year-tab-active': y === year }"
              @tap="switchYear(y)"
            >
              <text class="year-tab-text" :class="{ 'year-tab-text-active': y === year }">{{ y }}年</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">榜单计算中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>
      <!-- 空态 -->
      <view v-else-if="!items.length" class="state-box">
        <app-icon name="trophy" :size="40" color="#d1d5db" />
        <text class="state-text">{{ year }} 年度暂无上榜讲师</text>
      </view>

      <template v-else>
        <!-- 前三名领奖台（金银铜） -->
        <view class="podium">
          <view
            v-for="p in podium" :key="p.item.userId"
            class="podium-card" :class="'podium-' + p.item.rank"
            @tap="goProfile(p.item.userId)"
          >
            <view class="podium-medal" :style="{ background: p.medalBg }">
              <text class="podium-medal-text">{{ p.item.rank }}</text>
            </view>
            <view class="podium-avatar-wrap" :style="{ borderColor: p.medalBg }">
              <smart-avatar class="podium-avatar" :src="p.item.avatar" :name="p.item.nickname" />
            </view>
            <text class="podium-name">{{ p.item.nickname }}</text>
            <text class="podium-level" :style="{ color: lecturerLevelColor[p.item.lecturerLevel].color, background: lecturerLevelColor[p.item.lecturerLevel].bg }">{{ lecturerLevelLabel[p.item.lecturerLevel] }}</text>
            <view class="podium-score">
              <text class="podium-score-num">{{ p.item.score }}</text>
              <text class="podium-score-unit">分</text>
            </view>
            <!-- 四维迷你分值条（透明可解释） -->
            <view class="podium-dims">
              <view v-for="d in dimDefs" :key="d.key" class="podium-dim">
                <text class="podium-dim-label">{{ d.shortLabel }}</text>
                <view class="podium-dim-track">
                  <view class="podium-dim-fill" :style="{ width: p.item.dims[d.key] + '%', background: d.color }" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 第 4 名起列表 -->
        <view v-if="restList.length" class="list">
          <view v-for="it in restList" :key="it.userId" class="row" @tap="goProfile(it.userId)">
            <view class="row-top">
              <text class="row-rank">{{ it.rank }}</text>
              <view class="row-avatar-wrap">
                <smart-avatar class="row-avatar" :src="it.avatar" :name="it.nickname" />
              </view>
              <view class="row-info">
                <text class="row-name">{{ it.nickname }}</text>
                <text class="row-level" :style="{ color: lecturerLevelColor[it.lecturerLevel].color, background: lecturerLevelColor[it.lecturerLevel].bg }">{{ lecturerLevelLabel[it.lecturerLevel] }}</text>
              </view>
              <view class="row-score">
                <text class="row-score-num">{{ it.score }}</text>
                <text class="row-score-unit">分</text>
              </view>
            </view>
            <!-- 四维分值条 -->
            <view class="row-dims">
              <view v-for="d in dimDefs" :key="d.key" class="dim">
                <text class="dim-label">{{ d.label }}</text>
                <view class="dim-track">
                  <view class="dim-fill" :style="{ width: it.dims[d.key] + '%', background: d.color }" />
                </view>
                <text class="dim-value">{{ it.dims[d.key] }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 计分口径说明 + 更新时间 -->
        <view class="footnote">
          <text class="footnote-title">计分口径</text>
          <text v-for="d in dimDefs" :key="d.key" class="footnote-line">· {{ d.label }}（{{ d.weight }}）：{{ d.desc }}</text>
          <text class="footnote-line footnote-honest">· 收入数据不进入公开榜单</text>
          <text v-if="updatedAt" class="footnote-time">榜单更新于 {{ fmtDateTime(updatedAt) }} · 每小时刷新</text>
        </view>
      </template>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import {
  instituteApi, lecturerLevelLabel, lecturerLevelColor, fmtDateTime,
  type RankingItem, type RankingDims,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

// ───── 四维定义（与后端权重契约一致，透明可解释）─────
const dimDefs: Array<{ key: keyof RankingDims; label: string; shortLabel: string; weight: string; color: string; desc: string }> = [
  { key: 'tasks', label: '年度任务', shortLabel: '任务', weight: '40%', color: '#c41e3a', desc: '年度分享任务完成数（全员归一化）' },
  { key: 'events', label: '授课场次', shortLabel: '授课', weight: '30%', color: '#c9a96e', desc: '当年研究院授课/沙龙/直播场次' },
  { key: 'stations', label: '驿站覆盖', shortLabel: '驿站', weight: '20%', color: '#2563eb', desc: '签约入驻的在岗驿站数' },
  { key: 'seniority', label: '资历年限', shortLabel: '资历', weight: '10%', color: '#16a34a', desc: '入会年限（满 5 年封顶）' },
]

const nowYear = new Date().getFullYear()
const yearOptions = [nowYear, nowYear - 1, nowYear - 2]

const loading = ref(true)
const errMsg = ref('')
const year = ref(nowYear)
const items = ref<RankingItem[]>([])
const updatedAt = ref('')

/** 领奖台展示序：2nd - 1st - 3rd（不足三人按实际数量） */
const podium = computed(() => {
  const top3 = items.value.slice(0, 3)
  const medals: Record<number, string> = { 1: '#c9a96e', 2: '#a8b0bd', 3: '#c08a5a' }
  const order = [top3[1], top3[0], top3[2]].filter(Boolean) as RankingItem[]
  return order.map((item) => ({ item, medalBg: medals[item.rank] || '#c9a96e' }))
})
const restList = computed(() => items.value.slice(3))

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const res = await instituteApi.getRankings(year.value)
    items.value = res?.items || []
    updatedAt.value = res?.updatedAt || ''
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchYear(y: number) {
  if (y === year.value || loading.value) return
  year.value = y
  load()
}

function goProfile(userId: string) {
  uni.navigateTo({ url: `/pkg-creator/teacher-profile/index?userId=${userId}` })
}

// ───── 分享（微信好友/朋友圈·useShare 统一携带分享者 ref）─────
const { toAppMessage, toTimeline } = useShare()
const shareContent = computed(() => ({
  title: `${year.value} 年度讲师影响力榜 · 研究院`,
  path: `/pkg-institute/rankings/index?year=${year.value}`,
  cover: items.value[0]?.avatar || undefined,
}))
onShareAppMessage(() => toAppMessage(shareContent.value))
onShareTimeline(() => toTimeline(shareContent.value))

onLoad((options) => {
  const y = Number(options?.year)
  if (Number.isFinite(y) && yearOptions.includes(y)) year.value = y
  load()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin: 0 -6px 0 -10px; } /* 触控热区≥44px：容器扩大+负margin保持视觉位置 */
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-action { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.scroll { height: 100vh; box-sizing: border-box; }

/* 榜单头 */
.head { position: relative; overflow: hidden; }
.head-bg { position: absolute; inset: 0; background: linear-gradient(160deg, #2b2118 0%, #4a3623 60%, #6b5334 100%); }
.head-inner { position: relative; padding: 24px 16px 18px; }
.head-title { display: block; font-size: 20px; font-weight: 700; color: #f3e7cf; }
.head-sub { display: block; margin-top: 6px; font-size: 12px; color: rgba(243,231,207,0.75); }
.year-tabs { display: flex; gap: 8px; margin-top: 14px; }
.year-tab { padding: 5px 14px; border-radius: 999px; border: 1px solid rgba(201,169,110,0.5); }
.year-tab-active { background: #c9a96e; border-color: #c9a96e; }
.year-tab-text { font-size: 13px; color: rgba(243,231,207,0.85); }
.year-tab-text-active { color: #2b2118; font-weight: 600; }

/* 领奖台 */
.podium { display: flex; align-items: flex-end; gap: 8px; padding: 20px 12px 4px; }
.podium-card { flex: 1; display: flex; flex-direction: column; align-items: center; background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 14px 8px 12px; position: relative; }
.podium-1 { margin-top: -12px; padding-top: 18px; border-color: rgba(201,169,110,0.7); box-shadow: 0 4px 16px rgba(201,169,110,0.22); }
.podium-medal { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
.podium-medal-text { font-size: 12px; font-weight: 700; color: #fff; }
.podium-avatar-wrap { width: 56px; height: 56px; border-radius: 50%; border: 2px solid; overflow: hidden; box-sizing: border-box; }
.podium-1 .podium-avatar-wrap { width: 64px; height: 64px; }
.podium-avatar { width: 100%; height: 100%; border-radius: 50%; }
.podium-avatar-fallback { background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.podium-name { margin-top: 8px; font-size: 13px; font-weight: 600; color: #1a1a1a; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.podium-level { margin-top: 4px; font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.podium-score { margin-top: 6px; display: flex; align-items: baseline; gap: 2px; }
.podium-score-num { font-size: 20px; font-weight: 700; color: #c9a96e; }
.podium-1 .podium-score-num { font-size: 24px; }
.podium-score-unit { font-size: 10px; color: #9ca3af; }
.podium-dims { width: 100%; margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.podium-dim { display: flex; align-items: center; gap: 4px; }
.podium-dim-label { width: 24px; font-size: 9px; color: #9ca3af; flex-shrink: 0; }
.podium-dim-track { flex: 1; height: 4px; background: #f3f4f6; border-radius: 2px; overflow: hidden; }
.podium-dim-fill { height: 100%; border-radius: 2px; }

/* 第4名起列表 */
.list { padding: 12px 12px 0; display: flex; flex-direction: column; gap: 10px; }
.row { background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 12px; }
.row-top { display: flex; align-items: center; gap: 10px; }
.row-rank { width: 24px; text-align: center; font-size: 15px; font-weight: 700; color: #9ca3af; font-style: italic; }
.row-avatar-wrap { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.row-avatar { width: 100%; height: 100%; border-radius: 50%; }
.row-avatar-fallback { background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.row-name { font-size: 14px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-level { align-self: flex-start; font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.row-score { display: flex; align-items: baseline; gap: 2px; }
.row-score-num { font-size: 18px; font-weight: 700; color: #c9a96e; }
.row-score-unit { font-size: 10px; color: #9ca3af; }
.row-dims { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f0f0f0; display: flex; flex-direction: column; gap: 6px; }
.dim { display: flex; align-items: center; gap: 8px; }
.dim-label { width: 52px; font-size: 11px; color: #6b7280; flex-shrink: 0; }
.dim-track { flex: 1; height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
.dim-fill { height: 100%; border-radius: 3px; }
.dim-value { width: 34px; text-align: right; font-size: 11px; color: #9ca3af; }

/* 口径说明 */
.footnote { margin: 16px 12px 0; background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
.footnote-title { font-size: 13px; font-weight: 600; color: #1a1a1a; }
.footnote-line { font-size: 12px; color: #6b7280; line-height: 1.6; }
.footnote-honest { color: #c9a96e; }
.footnote-time { margin-top: 4px; font-size: 11px; color: #9ca3af; }

/* 三态 */
.state-box { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: #c9a96e; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid #c9a96e; border-radius: 999px; }
.retry-text { font-size: 13px; color: #c9a96e; }
.bottom-safe { height: 32px; }
</style>
