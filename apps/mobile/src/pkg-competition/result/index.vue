<template>
  <view class="a9-page">
    <!-- 顶部导航 -->
    <view class="a9-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="a9-nav-row">
        <view class="a9-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="a9-nav-title">排行榜{{ navSuffix }}</text>
        <view class="a9-nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="a9-body" :style="{ height: bodyHeight + 'px' }">
      <!-- loading -->
      <view v-if="loading" class="a9-state">
        <view class="a9-spinner" /><text class="a9-state-txt">加载中…</text>
      </view>
      <!-- error -->
      <view v-else-if="error" class="a9-state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
        <text class="a9-state-txt">{{ error }}</text>
        <view class="a9-retry" @tap="load"><text class="a9-retry-txt">重新加载</text></view>
      </view>

      <template v-else>
        <!-- 轮次切换（仅当赛事多 round 且已排名） -->
        <scroll-view v-if="roundTabs.length > 1" scroll-x class="a9-rounds" :show-scrollbar="false">
          <view class="a9-rounds-inner">
            <view
              v-for="r in roundTabs" :key="r.id"
              class="a9-round" :class="{ on: activeRoundId === r.id }"
              @tap="switchRound(r.id)"
            >
              <text class="a9-round-txt" :class="{ on: activeRoundId === r.id }">{{ r.label }}</text>
            </view>
          </view>
        </scroll-view>

        <template v-if="rankings.length > 0">
          <!-- 荣誉领奖台 -->
          <view v-if="top3.length > 0" class="a9-podium-wrap">
            <text class="a9-podium-ttl">— 荣 誉 领 奖 台 —</text>
            <view class="a9-podium">
              <!-- 亚军 -->
              <view class="a9-stand silver">
                <template v-if="top3[1]">
                  <view class="a9-ava silver">
                    <image v-if="top3[1].user?.avatar" :src="top3[1].user!.avatar!" class="a9-ava-img" mode="aspectFill" />
                    <text v-else class="a9-ava-initial">{{ initial(top3[1]) }}</text>
                  </view>
                  <text class="a9-stand-nm">{{ name(top3[1]) }}</text>
                  <text class="a9-stand-sc">{{ top3[1].score }} 分</text>
                  <view class="a9-base silver"><text class="a9-base-no">2</text></view>
                </template>
              </view>
              <!-- 冠军 -->
              <view class="a9-stand gold">
                <template v-if="top3[0]">
                  <view class="a9-crown"><app-icon name="crown" :size="22" color="#c9a96e" /></view>
                  <view class="a9-ava gold">
                    <image v-if="top3[0].user?.avatar" :src="top3[0].user!.avatar!" class="a9-ava-img" mode="aspectFill" />
                    <text v-else class="a9-ava-initial gold">{{ initial(top3[0]) }}</text>
                  </view>
                  <text class="a9-stand-nm gold-nm">{{ name(top3[0]) }}</text>
                  <text class="a9-stand-sc">{{ top3[0].score }} 分</text>
                  <view class="a9-base gold"><text class="a9-base-no">1</text></view>
                </template>
              </view>
              <!-- 季军 -->
              <view class="a9-stand bronze">
                <template v-if="top3[2]">
                  <view class="a9-ava bronze">
                    <image v-if="top3[2].user?.avatar" :src="top3[2].user!.avatar!" class="a9-ava-img" mode="aspectFill" />
                    <text v-else class="a9-ava-initial">{{ initial(top3[2]) }}</text>
                  </view>
                  <text class="a9-stand-nm">{{ name(top3[2]) }}</text>
                  <text class="a9-stand-sc">{{ top3[2].score }} 分</text>
                  <view class="a9-base bronze"><text class="a9-base-no">3</text></view>
                </template>
              </view>
            </view>
          </view>

          <!-- 我的排名（醒目高亮） -->
          <view v-if="myRank" class="a9-myrank" :class="{ out: !myPromoted }">
            <view class="a9-my-rk">
              <text class="a9-my-rk-no" :class="{ out: !myPromoted }">{{ myRank.rank }}</text>
              <text class="a9-my-rk-lbl">我的名次</text>
            </view>
            <view class="a9-my-av">
              <image v-if="myRank.user?.avatar" :src="myRank.user!.avatar!" class="a9-my-av-img" mode="aspectFill" />
              <text v-else class="a9-my-av-initial">{{ initial(myRank) }}</text>
            </view>
            <view class="a9-my-info">
              <text class="a9-my-name">{{ name(myRank) }}（我）</text>
              <text v-if="myPromoted" class="a9-tag up">✓ {{ promotionLabel[myRank.status] }}</text>
              <text v-else class="a9-tag out">{{ promotionLabel[myRank.status] }}</text>
              <text v-if="beatPct > 0" class="a9-my-beat">超越了 {{ beatPct }}% 的选手</text>
            </view>
            <text class="a9-my-sc" :class="{ out: !myPromoted }">{{ myRank.score }}</text>
          </view>

          <!-- 筛选 -->
          <view class="a9-filters">
            <view
              v-for="t in tabs" :key="t.id"
              class="a9-f" :class="{ on: activeTab === t.id }"
              @tap="activeTab = t.id"
            >
              <text class="a9-f-txt" :class="{ on: activeTab === t.id }">{{ t.label }}</text>
            </view>
          </view>

          <!-- 榜单列表 -->
          <view class="a9-rows">
            <view
              v-for="item in filteredRankings" :key="item.id"
              class="a9-lrow" :class="{ out: item.status === 'ELIMINATED', me: isMe(item) }"
            >
              <view class="a9-no" :class="rankClass(item.rank)">
                <text class="a9-no-txt" :class="rankClass(item.rank)">{{ item.rank }}</text>
              </view>
              <view class="a9-lav">
                <image v-if="item.user?.avatar" :src="item.user!.avatar!" class="a9-lav-img" mode="aspectFill" />
                <text v-else class="a9-lav-initial">{{ initial(item) }}</text>
              </view>
              <view class="a9-lnm">
                <text class="a9-lnm-txt">{{ name(item) }}<text v-if="isMe(item)" class="a9-me-mark">（我）</text></text>
                <text class="a9-st" :class="item.status === 'ELIMINATED' ? 'out' : 'up'">{{ promotionLabel[item.status] }}</text>
              </view>
              <text class="a9-lsc" :class="{ gold: item.status !== 'ELIMINATED', out: item.status === 'ELIMINATED' }">{{ item.score }}</text>
            </view>
            <view v-if="filteredRankings.length === 0" class="a9-mini-empty">
              <text class="a9-mini-empty-txt">未找到符合条件的选手</text>
            </view>
          </view>

          <!-- 荣誉/结果入口 -->
          <view class="a9-cta">
            <!-- 获奖/晋级：证书入口 -->
            <view v-if="myRank && myAwarded" class="a9-cta-btn gold" @tap="goCertificate">
              <app-icon name="award" :size="17" color="#fff" />
              <text class="a9-cta-txt gold">查看我的荣誉证书</text>
            </view>
            <!-- 淘汰：引导看解析 + 邀请同台 -->
            <template v-else-if="myRank">
              <view class="a9-cta-btn primary" @tap="goAnalysis">
                <text class="a9-cta-txt primary">再接再厉 · 查看逐题解析</text>
              </view>
              <view class="a9-cta-btn ghost" @tap="goInvite">
                <text class="a9-cta-txt ghost">邀请好友来同台竞技</text>
              </view>
            </template>
          </view>
        </template>

        <!-- 空态 -->
        <view v-else class="a9-empty">
          <app-icon name="award" :size="48" color="#d8cfc0" />
          <text class="a9-empty-txt">暂无排名</text>
          <text class="a9-empty-sub">赛事结束、成绩核算后公布</text>
        </view>
      </template>

      <view class="a9-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  competitionApi, promotionLabel, roundTypeLabel,
  type Ranking, type Registration, type Competition, type CompetitionRound,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const winH = ref(667)
const bodyHeight = computed(() => winH.value - statusBarHeight.value - 44)

const compId = ref('')
const activeRoundId = ref<string | undefined>(undefined)
const loading = ref(true)
const error = ref('')

const rankings = ref<Ranking[]>([])
const myReg = ref<Registration | null>(null)
const detail = ref<Competition | null>(null)

const tabs = [
  { id: 'all', label: '全部' },
  { id: 'promoted', label: '晋级' },
  { id: 'eliminated', label: '未晋级' },
] as const
const activeTab = ref<'all' | 'promoted' | 'eliminated'>('all')

// ── 轮次链（诚实降级：只画后端真实存在的非报名轮次） ──
const roundTabs = computed(() => {
  const rounds = (detail.value?.rounds || [])
    .filter((r) => r.type !== 'REGISTRATION')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return rounds.map((r: CompetitionRound) => ({
    id: r.id,
    label: r.title || roundTypeLabel[r.type],
  }))
})
const navSuffix = computed(() => {
  const cur = roundTabs.value.find((r) => r.id === activeRoundId.value)
  return cur ? ' · ' + cur.label : ''
})

const top3 = computed(() => rankings.value.slice(0, 3))

function isMe(r: Ranking) {
  return !!myReg.value?.userId && r.userId === myReg.value.userId
}
const myRank = computed(() => {
  const uid = myReg.value?.userId
  if (!uid) return null
  return rankings.value.find((r) => r.userId === uid) || null
})
const myPromoted = computed(() => !!myRank.value && myRank.value.status !== 'ELIMINATED')
const myAwarded = computed(() => {
  const s = myRank.value?.status
  // 有证书链接即可见；否则获奖/晋级态（非淘汰）亦可见
  return !!myRank.value?.certificateUrl || (!!s && s !== 'ELIMINATED')
})
const beatPct = computed(() => {
  const total = rankings.value.length
  if (!myRank.value || total <= 1) return 0
  return Math.round(((total - myRank.value.rank) / total) * 100)
})

const filteredRankings = computed(() => rankings.value.filter((r) => {
  if (activeTab.value === 'promoted') return r.status !== 'ELIMINATED'
  if (activeTab.value === 'eliminated') return r.status === 'ELIMINATED'
  return true
}))

function rankClass(rank: number) {
  if (rank === 1) return 'r1'
  if (rank === 2) return 'r2'
  if (rank === 3) return 'r3'
  return ''
}
function name(r: Ranking) {
  return r.user?.nickname || '选手'
}
function initial(r: Ranking) {
  const n = r.user?.nickname || ''
  return n ? n.charAt(0) : '手'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [rk, reg, c] = await Promise.all([
      competitionApi.rankings(compId.value, activeRoundId.value),
      competitionApi.myRegistration(compId.value).catch(() => null),
      competitionApi.detail(compId.value).catch(() => null),
    ])
    rankings.value = (rk.items || []).slice().sort((a, b) => a.rank - b.rank)
    myReg.value = reg
    detail.value = c
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function switchRound(rid: string) {
  if (activeRoundId.value === rid) return
  activeRoundId.value = rid
  activeTab.value = 'all'
  load()
}

function goCertificate() {
  if (!myRank.value) return
  navigateTo(`/pkg-competition/certificate/index?id=${compId.value}&rankingId=${myRank.value.id}`)
}
function goAnalysis() {
  navigateTo(`/pkg-competition/score-detail/index?id=${compId.value}`)
}
function goInvite() {
  navigateTo(`/pkg-competition/detail/index?id=${compId.value}`)
}
function goBack() { navigateBack() }

onLoad((q) => {
  compId.value = (q?.id as string) || ''
  activeRoundId.value = (q?.roundId as string) || undefined
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; winH.value = e.windowHeight || 667 } })
  load()
})
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #fff;
$red: #c41e3a;
$red2: #a01830;
$gold: #c9a96e;
$goldD: #a5883f;
$ink: #2c2c2c;
$sub: #6e6e73;
$mute: #999;
$line: #ece7df;

.a9-page { height: 100vh; background: $paper; display: flex; flex-direction: column; }

/* 顶部导航 */
.a9-nav { background: $paper; border-bottom: 1rpx solid $line; }
.a9-nav-row { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.a9-nav-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; }
.a9-nav-title { font-family: "Songti SC", "STSong", serif; font-size: 17px; font-weight: 700; color: $ink; letter-spacing: 1px; }

.a9-body { flex: 1; height: 0; min-height: 0; }

/* 三态 */
.a9-state { padding: 100px 40px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.a9-state-txt { color: $mute; font-size: 14px; }
.a9-spinner { width: 30px; height: 30px; border: 3px solid #ede9e2; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.a9-retry { margin-top: 4px; padding: 8px 24px; border: 1rpx solid $red; border-radius: 999px; }
.a9-retry-txt { color: $red; font-size: 14px; }

/* 轮次链 */
.a9-rounds { white-space: nowrap; padding: 12px 0 4px; }
.a9-rounds-inner { display: inline-flex; gap: 8px; padding: 0 20px; }
.a9-round { padding: 6px 16px; background: $card; border: 1rpx solid $line; border-radius: 999px; }
.a9-round.on { background: #f1e9d8; border-color: #e3d5b0; }
.a9-round-txt { font-size: 13px; color: $sub; }
.a9-round-txt.on { color: $goldD; font-weight: 700; }

/* 领奖台 */
.a9-podium-wrap { background: linear-gradient(180deg, #fbf3e2, $paper); padding: 18px 20px 0; }
.a9-podium-ttl { display: block; text-align: center; font-family: "Songti SC", "STSong", serif; font-size: 13px; color: $goldD; font-weight: 700; letter-spacing: 4px; margin-bottom: 16px; }
.a9-podium { display: flex; align-items: flex-end; justify-content: center; gap: 8px; }
.a9-stand { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }

.a9-crown { margin-bottom: 2px; }
.a9-ava { border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: linear-gradient(135deg, #e8dcc4, #d8c9a8); }
.a9-ava.gold { width: 66px; height: 66px; border: 3px solid $gold; box-shadow: 0 0 0 4px #f1e9d8, 0 6px 16px rgba(201,169,110,.4); }
.a9-ava.silver { width: 52px; height: 52px; border: 3px solid #c0c0c0; }
.a9-ava.bronze { width: 52px; height: 52px; border: 3px solid #cb9c78; }
.a9-ava-img { width: 100%; height: 100%; }
.a9-ava-initial { font-family: "Songti SC", "STSong", serif; font-size: 18px; font-weight: 700; color: #fff; }
.a9-ava-initial.gold { font-size: 22px; }

.a9-stand-nm { display: block; font-size: 12px; font-weight: 700; color: $ink; margin-top: 7px; }
.a9-stand-nm.gold-nm { color: $goldD; }
.a9-stand-sc { display: block; font-size: 11px; color: $mute; margin-top: 1px; }
.a9-base { width: 100%; margin-top: 7px; border-radius: 10px 10px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; }
.a9-base.gold { height: 80px; background: linear-gradient(#d8bd82, $gold); }
.a9-base.silver { height: 58px; background: linear-gradient(#d4d4d4, #b8b8b8); }
.a9-base.bronze { height: 46px; background: linear-gradient(#d6ac84, #c08d63); }
.a9-base-no { font-family: "Songti SC", "STSong", serif; font-size: 22px; font-weight: 800; color: #fff; }

/* 我的排名 */
.a9-myrank { margin: 14px 20px; background: $card; border: 2rpx solid $red; border-radius: 16px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 6px 16px rgba(196,30,58,.14); }
.a9-myrank.out { border-color: #ddd; box-shadow: none; }
.a9-my-rk { min-width: 46px; display: flex; flex-direction: column; align-items: center; }
.a9-my-rk-no { font-family: "Songti SC", "STSong", serif; font-size: 24px; font-weight: 800; color: $red; line-height: 1.1; }
.a9-my-rk-no.out { color: $mute; }
.a9-my-rk-lbl { font-size: 10px; color: $mute; margin-top: 1px; }
.a9-my-av { width: 42px; height: 42px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #e8dcc4, #d8c9a8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.a9-my-av-img { width: 100%; height: 100%; }
.a9-my-av-initial { font-family: "Songti SC", "STSong", serif; font-size: 16px; font-weight: 700; color: #fff; }
.a9-my-info { flex: 1; }
.a9-my-name { display: block; font-size: 14px; font-weight: 700; color: $ink; }
.a9-tag { display: inline-block; font-size: 11px; padding: 1px 9px; border-radius: 999px; margin-top: 4px; }
.a9-tag.up { color: $goldD; background: #f1e9d8; border: 1rpx solid #e3d5b0; }
.a9-tag.out { color: $mute; background: #f2f2f2; border: 1rpx solid #e6e6e6; }
.a9-my-beat { display: block; font-size: 11px; color: $sub; margin-top: 4px; }
.a9-my-sc { font-family: "Songti SC", "STSong", serif; font-size: 18px; font-weight: 800; color: $red; }
.a9-my-sc.out { color: $mute; }

/* 筛选 */
.a9-filters { display: flex; gap: 8px; padding: 0 20px 12px; }
.a9-f { flex: 1; text-align: center; padding: 8px 0; border-radius: 10px; background: $card; border: 1rpx solid #e2ddd4; }
.a9-f.on { background: #f1e9d8; border-color: #e3d5b0; }
.a9-f-txt { font-size: 13px; color: $sub; }
.a9-f-txt.on { color: $goldD; font-weight: 700; }

/* 榜单 */
.a9-rows { padding: 0 20px; }
.a9-lrow { display: flex; align-items: center; gap: 12px; background: $card; border: 1rpx solid $line; border-radius: 12px; padding: 11px 14px; margin-bottom: 8px; }
.a9-lrow.out { opacity: .55; }
.a9-lrow.me { border-color: #edc0c6; background: #fffafb; }
.a9-no { width: 26px; text-align: center; flex-shrink: 0; }
.a9-no-txt { font-family: "Songti SC", "STSong", serif; font-size: 16px; font-weight: 800; color: $mute; }
.a9-no-txt.r1, .a9-no-txt.r2, .a9-no-txt.r3 { color: $goldD; }
.a9-lav { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #e8dcc4, #d8c9a8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.a9-lav-img { width: 100%; height: 100%; }
.a9-lav-initial { font-family: "Songti SC", "STSong", serif; font-size: 15px; font-weight: 700; color: #fff; }
.a9-lnm { flex: 1; min-width: 0; }
.a9-lnm-txt { font-size: 14px; font-weight: 600; color: $ink; }
.a9-me-mark { font-size: 12px; color: $red; }
.a9-st { display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 999px; margin-top: 3px; }
.a9-st.up { background: #f1e9d8; color: $goldD; }
.a9-st.out { background: #f2f2f2; color: $mute; }
.a9-lsc { font-family: "Songti SC", "STSong", serif; font-size: 15px; font-weight: 800; color: $ink; }
.a9-lsc.gold { color: $goldD; }
.a9-lsc.out { color: $mute; }
.a9-mini-empty { padding: 32px 0; text-align: center; }
.a9-mini-empty-txt { color: $mute; font-size: 14px; }

/* CTA */
.a9-cta { padding: 14px 20px 18px; }
.a9-cta-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 13px 0; border-radius: 999px; }
.a9-cta-btn.gold { background: linear-gradient(135deg, #d8c28a, $gold); box-shadow: 0 6px 16px rgba(201,169,110,.3); }
.a9-cta-btn.primary { background: linear-gradient(135deg, $red, $red2); }
.a9-cta-btn.ghost { background: $card; border: 1rpx solid #e2ddd4; margin-top: 10px; }
.a9-cta-txt { font-size: 15px; font-weight: 700; }
.a9-cta-txt.gold { color: #fff; }
.a9-cta-txt.primary { color: #fff; }
.a9-cta-txt.ghost { color: $sub; }

/* 空态 */
.a9-empty { padding: 90px 40px 0; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.a9-empty-txt { color: $sub; font-size: 15px; font-weight: 600; }
.a9-empty-sub { color: $mute; font-size: 12px; }

.a9-safe { height: 30px; }
</style>
