<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">赛事人才榜</text>
        <view class="nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- loading -->
      <view v-if="loading" class="state">
        <view class="spinner" />
        <text class="state-txt">加载中...</text>
      </view>

      <!-- error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="44" color="#d1d5db" />
        <text class="state-txt">{{ error }}</text>
        <view class="retry-btn" @click="load"><text class="retry-txt">重新加载</text></view>
      </view>

      <template v-else>
        <!-- 我的战绩卡（登录后展示） -->
        <view v-if="mine" class="mine-card">
          <view class="mine-head">
            <text class="mine-title">我的战绩</text>
            <view v-if="mine.isCertified" class="cert-tag"><app-icon name="badge-check" :size="12" color="#c9a96e" /><text class="cert-tag-txt">{{ mine.verifiedTitle || '认证讲师' }}</text></view>
            <view v-else-if="mine.talentScore > 0" class="apply-tag" @click="goCertify"><text class="apply-tag-txt">申请讲师认证 ›</text></view>
          </view>
          <view class="mine-stats">
            <view class="mine-stat"><text class="stat-num">{{ mine.position ?? '-' }}</text><text class="stat-label">榜上位次</text></view>
            <view class="mine-stat"><text class="stat-num">{{ mine.talentScore }}</text><text class="stat-label">人才积分</text></view>
            <view class="mine-stat"><text class="stat-num">{{ mine.totalCompetitions }}</text><text class="stat-label">参赛</text></view>
            <view class="mine-stat"><text class="stat-num">{{ mine.totalWins }}</text><text class="stat-label">夺冠</text></view>
          </view>
          <view v-if="mine.badges.length" class="mine-badges">
            <view v-for="b in mine.badges.slice(0, 6)" :key="b.competitionId" class="mine-badge" :class="medalClass(b.status)">
              <text class="mine-badge-txt">{{ b.title }} · {{ medalLabel(b.status) }}</text>
            </view>
          </view>
        </view>

        <!-- 榜单说明 -->
        <view class="rule-bar">
          <app-icon name="trophy" :size="14" color="#c9a96e" />
          <text class="rule-txt">积分规则：冠军100 · 亚军60 · 季军40 · 晋级10/次 · 参与2</text>
        </view>

        <!-- 空态 -->
        <view v-if="talents.length === 0" class="state">
          <app-icon name="trophy" :size="48" color="#d1d5db" />
          <text class="state-txt">虚位以待，参赛即可上榜</text>
          <view class="retry-btn" @click="goHome"><text class="retry-txt">去看看赛事</text></view>
        </view>

        <!-- 榜单 -->
        <view v-else class="list">
          <view v-for="t in talents" :key="t.userId" class="row" :class="{ top3: t.position <= 3 }">
            <view class="rank" :class="'r' + Math.min(t.position, 4)">
              <text class="rank-txt">{{ t.position }}</text>
            </view>
            <view class="avatar-wrap">
              <image lazy-load v-if="t.avatar" :src="t.avatar" mode="aspectFill" class="avatar" />
              <view v-else class="avatar ph"><text class="avatar-ph-txt">{{ t.nickname.slice(0, 1) }}</text></view>
            </view>
            <view class="row-body">
              <view class="row-name-line">
                <text class="row-name">{{ t.nickname }}</text>
                <view v-if="t.isCertified" class="cert-tag"><app-icon name="badge-check" :size="11" color="#c9a96e" /><text class="cert-tag-txt">{{ t.verifiedTitle || '认证讲师' }}</text></view>
              </view>
              <view class="row-meta">
                <text class="row-meta-txt">参赛{{ t.totalCompetitions }} · 夺冠{{ t.totalWins }}{{ t.bestRank ? ' · 最好第' + t.bestRank + '名' : '' }}</text>
              </view>
              <view v-if="t.medals.length" class="row-medals">
                <view v-for="m in t.medals.slice(0, 3)" :key="m.competitionId" class="medal" :class="medalClass(m.status)">
                  <text class="medal-txt">{{ m.title }}{{ medalLabel(m.status) }}</text>
                </view>
              </view>
            </view>
            <view class="score">
              <text class="score-num">{{ t.talentScore }}</text>
              <text class="score-label">积分</text>
            </view>
          </view>

          <!-- 加载更多 -->
          <view v-if="talents.length < total" class="more" @click="loadMore">
            <text class="more-txt">{{ loadingMore ? '加载中...' : '加载更多' }}</text>
          </view>
        </view>
      </template>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { competitionApi, promotionLabel, type TalentItem, type MyTalentProfile } from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const talents = ref<TalentItem[]>([])
const total = ref(0)
const page = ref(1)
const PAGE_SIZE = 50
const mine = ref<MyTalentProfile | null>(null)

function medalLabel(status: string): string {
  if (status === 'PARTICIPANT') return '参与'
  return (promotionLabel as Record<string, string>)[status] || status
}
function medalClass(status: string): string {
  if (status === 'CHAMPION') return 'gold'
  if (status === 'RUNNER_UP') return 'silver'
  if (status === 'THIRD_PLACE') return 'bronze'
  return 'plain'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    page.value = 1
    const res = await competitionApi.talents({ page: 1, pageSize: PAGE_SIZE })
    talents.value = res.items
    total.value = res.total
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || talents.value.length >= total.value) return
  loadingMore.value = true
  try {
    const res = await competitionApi.talents({ page: page.value + 1, pageSize: PAGE_SIZE })
    page.value += 1
    talents.value = [...talents.value, ...res.items]
    total.value = res.total
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

/** 我的战绩（未登录静默跳过，不打扰公开浏览） */
async function loadMine() {
  if (!getToken()) return
  try {
    mine.value = await competitionApi.myTalent()
  } catch {
    mine.value = null
  }
}

function goCertify() { navigateTo('/pkg-creator/teacher-certification/index') }
function goHome() { navigateTo('/competition/home') }
function goBack() { navigateBack() }

onMounted(() => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
  loadMine()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-bar { background: var(--brand); position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { color: #fff; font-size: 16px; font-weight: 500; }
.scroll { width: 100%; }

.state { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.mine-card { margin: 16px; padding: 16px; border-radius: 14px; background: linear-gradient(135deg, var(--brand), #a01830); }
.mine-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.mine-title { color: #fff; font-size: 15px; font-weight: 700; }
.apply-tag { background: rgba(255,255,255,0.92); border-radius: 999px; padding: 4px 12px; }
.apply-tag-txt { color: var(--brand); font-size: 12px; font-weight: 600; }
.mine-stats { display: flex; }
.mine-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { color: #fff; font-size: 20px; font-weight: 700; }
.stat-label { color: rgba(255,255,255,0.75); font-size: 11px; }
.mine-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.mine-badge { background: rgba(255,255,255,0.16); border-radius: 6px; padding: 2px 8px; }
.mine-badge.gold { background: rgba(245,158,11,0.35); }
.mine-badge-txt { color: #fff; font-size: 11px; }

.rule-bar { display: flex; align-items: center; gap: 6px; margin: 0 16px 12px; padding: 8px 12px; background: #fdf6ec; border-radius: 8px; }
.rule-txt { color: #a16207; font-size: 11px; }

.list { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 12px; box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.04); }
.row.top3 { border: 1rpx solid rgba(201,169,110,0.5); background: linear-gradient(135deg, #fffdf8, #fff); }
.rank { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; flex-shrink: 0; }
.rank.r1 { background: #f59e0b; }
.rank.r2 { background: #9ca3af; }
.rank.r3 { background: #d97706; }
.rank-txt { font-size: 13px; font-weight: 700; color: #6b7280; }
.rank.r1 .rank-txt, .rank.r2 .rank-txt, .rank.r3 .rank-txt { color: #fff; }
.avatar-wrap { flex-shrink: 0; }
.avatar { width: 44px; height: 44px; border-radius: 50%; background: #f3f4f6; }
.avatar.ph { display: flex; align-items: center; justify-content: center; background: rgba(196,30,58,0.08); }
.avatar-ph-txt { color: var(--brand); font-size: 16px; font-weight: 700; }
.row-body { flex: 1; min-width: 0; }
.row-name-line { display: flex; align-items: center; gap: 6px; }
.row-name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.cert-tag { display: flex; align-items: center; gap: 2px; background: #fdf6ec; border-radius: 4px; padding: 1px 6px; }
.cert-tag-txt { color: #c9a96e; font-size: 10px; font-weight: 600; }
.row-meta { margin-top: 2px; }
.row-meta-txt { font-size: 11px; color: #9ca3af; }
.row-medals { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.medal { border-radius: 4px; padding: 1px 6px; background: #f3f4f6; }
.medal.gold { background: #fef3c7; }
.medal.silver { background: #f3f4f6; }
.medal.bronze { background: #ffedd5; }
.medal-txt { font-size: 10px; color: #6b7280; }
.medal.gold .medal-txt { color: #b45309; }
.medal.bronze .medal-txt { color: #c2410c; }
.score { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.score-num { font-size: 17px; font-weight: 700; color: var(--brand); }
.score-label { font-size: 10px; color: #9ca3af; }

.more { padding: 12px 0; text-align: center; }
.more-txt { color: #6b7280; font-size: 13px; }
.safe-bottom { height: 24px; }
</style>
