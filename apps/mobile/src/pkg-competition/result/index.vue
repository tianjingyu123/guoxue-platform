<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">排行榜</text>
        <view class="nav-btn" />
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

    <scroll-view v-else scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 赛事信息条 -->
      <view class="info-bar">
        <text v-if="title" class="info-title">{{ title }}</text>
        <view class="info-meta">
          <text v-if="totalParticipants > 0" class="info-sub">参赛 {{ totalParticipants }} 人</text>
          <text v-if="promotedCount > 0" class="info-sub">晋级 {{ promotedCount }} 人</text>
        </view>
      </view>

      <template v-if="rankings.length > 0">
        <!-- 前三名领奖台 -->
        <view v-if="top3.length > 0" class="podium-card">
          <view class="podium">
            <!-- 亚军 -->
            <view class="podium-item">
              <template v-if="top3[1]">
                <view class="pod-avatar silver">
                  <image lazy-load v-if="top3[1].user?.avatar" :src="top3[1].user!.avatar!" class="pod-avatar-img" mode="aspectFill" />
                  <app-icon v-else name="user" :size="24" color="#9ca3af" />
                  <view class="pod-medal silver"><app-icon name="medal" :size="14" color="#fff" /></view>
                </view>
                <text class="pod-name">{{ top3[1].user?.nickname || '选手' }}</text>
                <text class="pod-score silver-txt">{{ top3[1].score }}</text>
                <text class="pod-tag">{{ promotionLabel[top3[1].status] }}</text>
              </template>
            </view>
            <!-- 冠军 -->
            <view class="podium-item champion">
              <template v-if="top3[0]">
                <view class="pod-avatar gold">
                  <image lazy-load v-if="top3[0].user?.avatar" :src="top3[0].user!.avatar!" class="pod-avatar-img" mode="aspectFill" />
                  <app-icon v-else name="crown" :size="32" color="#f59e0b" />
                  <view class="pod-medal gold"><app-icon name="crown" :size="16" color="#fff" /></view>
                </view>
                <text class="pod-name bold">{{ top3[0].user?.nickname || '选手' }}</text>
                <text class="pod-score gold-txt">{{ top3[0].score }}</text>
                <text class="pod-tag gold-tag">{{ promotionLabel[top3[0].status] }}</text>
              </template>
            </view>
            <!-- 季军 -->
            <view class="podium-item">
              <template v-if="top3[2]">
                <view class="pod-avatar bronze">
                  <image lazy-load v-if="top3[2].user?.avatar" :src="top3[2].user!.avatar!" class="pod-avatar-img" mode="aspectFill" />
                  <app-icon v-else name="award" :size="24" color="#b45309" />
                  <view class="pod-medal bronze"><app-icon name="award" :size="14" color="#fff" /></view>
                </view>
                <text class="pod-name">{{ top3[2].user?.nickname || '选手' }}</text>
                <text class="pod-score bronze-txt">{{ top3[2].score }}</text>
                <text class="pod-tag">{{ promotionLabel[top3[2].status] }}</text>
              </template>
            </view>
          </view>
        </view>

        <!-- 我的排名 -->
        <view v-if="myRank" class="my-rank" :class="{ promoted: myPromoted }">
          <view class="my-no" :class="rankClass(myRank.rank)"><text class="my-no-txt">{{ myRank.rank }}</text></view>
          <view class="my-avatar">
            <image lazy-load v-if="myRank.user?.avatar" :src="myRank.user!.avatar!" class="my-avatar-img" mode="aspectFill" />
            <app-icon v-else name="user" :size="24" color="#c41e3a" />
          </view>
          <view class="my-info">
            <text class="my-title">我的排名</text>
            <text class="my-sub">超越了 {{ beatPct }}% 的选手</text>
          </view>
          <view class="my-right">
            <text class="my-score">{{ myRank.score }}</text>
            <view class="my-badge" :class="{ promoted: myPromoted }"><text class="my-badge-txt">{{ promotionLabel[myRank.status] }}</text></view>
          </view>
        </view>
        <view v-if="myRank && myAwarded" class="cert-row" @click="go('/competition/' + compId + '/certificate?rankingId=' + myRank.id)">
          <app-icon name="award" :size="16" color="#c41e3a" />
          <text class="cert-txt">查看证书</text>
          <app-icon name="chevron-right" :size="14" color="#c41e3a" />
        </view>

        <!-- 搜索筛选 -->
        <view class="filter">
          <view class="search-box">
            <app-icon name="search" :size="16" color="#9ca3af" />
            <input v-model="searchQuery" class="search-input" placeholder="搜索选手..." placeholder-class="ph" />
          </view>
          <view class="tabs">
            <view v-for="t in tabs" :key="t.id" class="tab" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
              <text class="tab-txt" :class="{ active: activeTab === t.id }">{{ t.label }}</text>
            </view>
          </view>
        </view>

        <!-- 排行榜列表 -->
        <view class="rank-card">
          <view v-for="(item, i) in filteredRankings" :key="item.id" class="rank-row" :class="{ first: i === 0 }">
            <view class="rank-no" :class="rankClass(item.rank)"><text class="rank-no-txt">{{ item.rank }}</text></view>
            <view class="rank-avatar">
              <image lazy-load v-if="item.user?.avatar" :src="item.user!.avatar!" class="rank-avatar-img" mode="aspectFill" />
              <app-icon v-else name="user" :size="20" color="#9ca3af" />
            </view>
            <text class="rank-name">{{ item.user?.nickname || '选手' }}</text>
            <view class="rank-right">
              <text class="rank-score">{{ item.score }}</text>
              <text class="rank-status" :class="{ promoted: item.status !== 'ELIMINATED' }">{{ promotionLabel[item.status] }}</text>
            </view>
          </view>
          <view v-if="filteredRankings.length === 0" class="mini-empty"><text class="mini-empty-txt">未找到选手</text></view>
        </view>
      </template>

      <!-- 空态 -->
      <view v-else class="empty">
        <app-icon name="trophy" :size="48" color="#d1d5db" />
        <text class="empty-txt">暂无排名，赛事结束后公布</text>
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
  competitionApi, promotionLabel,
  type Ranking, type Registration, type Competition,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const compId = ref('')
const roundId = ref<string | undefined>(undefined)
const loading = ref(true)
const error = ref('')

const rankings = ref<Ranking[]>([])
const myReg = ref<Registration | null>(null)
const detail = ref<Competition | null>(null)

const tabs = [
  { id: 'all', label: '全部' },
  { id: 'promoted', label: '已晋级' },
  { id: 'eliminated', label: '未晋级' },
] as const
const activeTab = ref<'all' | 'promoted' | 'eliminated'>('all')
const searchQuery = ref('')

const title = computed(() => detail.value?.title || '')
const totalParticipants = computed(() => detail.value?._count?.registrations ?? 0)
const promotedCount = computed(() => rankings.value.filter((r) => r.status !== 'ELIMINATED').length)

const top3 = computed(() => rankings.value.slice(0, 3))

const myRank = computed(() => {
  const uid = myReg.value?.userId
  if (!uid) return null
  return rankings.value.find((r) => r.userId === uid) || null
})
const myPromoted = computed(() => !!myRank.value && myRank.value.status !== 'ELIMINATED')
const myAwarded = computed(() => {
  const s = myRank.value?.status
  return s === 'CHAMPION' || s === 'RUNNER_UP' || s === 'THIRD_PLACE' || s === 'PROMOTED'
})
const beatPct = computed(() => {
  const total = rankings.value.length
  if (!myRank.value || total === 0) return 0
  return Math.round(((total - myRank.value.rank) / total) * 100)
})

const filteredRankings = computed(() => rankings.value.filter((r) => {
  if (activeTab.value === 'promoted') return r.status !== 'ELIMINATED'
  if (activeTab.value === 'eliminated') return r.status === 'ELIMINATED'
  return true
}).filter((r) => (r.user?.nickname || '').includes(searchQuery.value)))

function rankClass(rank: number) {
  if (rank === 1) return 'r1'
  if (rank === 2) return 'r2'
  if (rank === 3) return 'r3'
  if (rank <= 10) return 'top10'
  return ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [rk, reg, c] = await Promise.all([
      competitionApi.rankings(compId.value, roundId.value),
      competitionApi.myRegistration(compId.value).catch(() => null),
      competitionApi.detail(compId.value).catch(() => null),
    ])
    rankings.value = (rk.items || []).slice().sort((a, b) => a.rank - b.rank)
    myReg.value = reg
    detail.value = c
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function go(p: string) { navigateTo(p) }
function goBack() { navigateBack() }

onLoad((q: any) => {
  compId.value = (q?.id as string) || ''
  roundId.value = (q?.roundId as string) || undefined
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
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.info-bar { background: var(--brand); padding: 8px 16px 24px; }
.info-title { display: block; color: #fff; font-size: 15px; font-weight: 600; margin-bottom: 6px; }
.info-meta { display: flex; align-items: center; gap: 12px; }
.info-sub { color: rgba(255,255,255,0.8); font-size: 13px; }

.podium-card { margin: -8px 16px 0; background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 16px; }
.podium-item { flex: 1; text-align: center; }
.podium-item.champion { margin-bottom: 8px; }
.pod-avatar { position: relative; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; overflow: visible; }
.pod-avatar.silver, .pod-avatar.bronze { width: 56px; height: 56px; }
.pod-avatar.gold { width: 80px; height: 80px; background: #fef3c7; }
.pod-avatar.silver { background: #f3f4f6; }
.pod-avatar.bronze { background: #fef9ec; }
.pod-avatar-img { width: 100%; height: 100%; border-radius: 50%; }
.pod-medal { position: absolute; bottom: -2px; right: -2px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.pod-medal.gold { width: 28px; height: 28px; background: #f59e0b; }
.pod-medal.silver { background: #d1d5db; }
.pod-medal.bronze { background: #b45309; }
.pod-name { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.pod-name.bold { font-size: 15px; font-weight: 700; }
.pod-score { display: block; font-size: 18px; font-weight: 700; }
.pod-score.gold-txt { color: #f59e0b; font-size: 24px; }
.pod-score.silver-txt { color: #6b7280; }
.pod-score.bronze-txt { color: #b45309; }
.pod-tag { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.pod-tag.gold-tag { color: #f59e0b; }

.my-rank { margin: 16px 16px 0; display: flex; align-items: center; gap: 12px; background: #fff; border: 2rpx solid #e5e7eb; border-radius: 14px; padding: 16px; }
.my-rank.promoted { border-color: #86efac; background: #f0fdf4; }
.my-no { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; }
.my-no.r1, .my-no.r2, .my-no.r3 { background: #fef3c7; }
.my-no.top10 { background: rgba(196,30,58,0.1); }
.my-no-txt { font-size: 16px; font-weight: 700; color: #6b7280; }
.my-avatar { width: 48px; height: 48px; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.my-avatar-img { width: 100%; height: 100%; }
.my-info { flex: 1; }
.my-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.my-sub { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.my-right { text-align: right; }
.my-score { display: block; font-size: 20px; font-weight: 700; color: var(--brand); }
.my-badge { display: inline-block; background: #f3f4f6; border-radius: 6px; padding: 1px 8px; margin-top: 2px; }
.my-badge.promoted { background: #dcfce7; }
.my-badge-txt { font-size: 11px; color: #6b7280; }
.my-badge.promoted .my-badge-txt { color: #15803d; }

.cert-row { margin: 12px 16px 0; display: flex; align-items: center; justify-content: center; gap: 4px; background: #fff; border: 1rpx solid rgba(196,30,58,0.3); border-radius: 12px; padding: 12px 0; }
.cert-txt { font-size: 14px; color: var(--brand); font-weight: 500; }

.filter { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.search-box { display: flex; align-items: center; gap: 8px; background: #fff; border: 1rpx solid #e5e7eb; border-radius: 10px; padding: 8px 12px; }
.search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.ph { color: #9ca3af; }
.tabs { display: flex; gap: 8px; }
.tab { flex: 1; padding: 7px 0; text-align: center; background: #ececec; border-radius: 8px; }
.tab.active { background: var(--brand); }
.tab-txt { font-size: 12px; color: #4b5563; }
.tab-txt.active { color: #fff; }

.rank-card { margin: 0 16px; background: #fff; border-radius: 14px; overflow: hidden; }
.rank-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-top: 1rpx solid #f0f0f0; }
.rank-row.first { border-top: none; }
.rank-no { width: 32px; height: 32px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.rank-no.r1 { background: #fef3c7; } .rank-no.r2 { background: #f3f4f6; } .rank-no.r3 { background: #fef9ec; }
.rank-no.top10 { background: rgba(196,30,58,0.1); }
.rank-no-txt { font-size: 14px; font-weight: 700; color: #6b7280; }
.rank-no.r1 .rank-no-txt { color: #f59e0b; } .rank-no.r2 .rank-no-txt { color: #6b7280; } .rank-no.r3 .rank-no-txt { color: #b45309; }
.rank-no.top10 .rank-no-txt { color: var(--brand); }
.rank-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rank-avatar-img { width: 100%; height: 100%; }
.rank-name { flex: 1; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.rank-right { text-align: right; }
.rank-score { display: block; font-size: 16px; font-weight: 700; color: #1a1a1a; }
.rank-status { display: block; font-size: 11px; color: #9ca3af; }
.rank-status.promoted { color: #16a34a; }
.mini-empty { padding: 32px 0; text-align: center; }
.mini-empty-txt { color: #9ca3af; font-size: 14px; }

.empty { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-txt { color: #9ca3af; font-size: 14px; }
.safe-bottom { height: 24px; }
</style>
