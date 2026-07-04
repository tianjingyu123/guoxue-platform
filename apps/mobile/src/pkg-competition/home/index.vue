<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">赛事中心</text>
        <view class="nav-links">
          <text class="nav-link" @click="go('/pkg-competition/talents/index')">人才榜</text>
          <text class="nav-link" @click="go('/competition/archive')">往届</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 搜索栏 -->
      <view class="search-wrap">
        <view class="search-box">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="searchQuery" class="search-input" placeholder="搜索赛事名称..." placeholder-class="ph" />
        </view>
      </view>

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
        <!-- 热门赛事横幅 -->
        <view v-if="hotComp" class="hot-banner" @click="go('/competition/' + hotComp.id)">
          <view class="hot-deco hot-deco-1" />
          <view class="hot-deco hot-deco-2" />
          <view class="hot-inner">
            <view class="hot-tags">
              <view class="hot-tag"><app-icon name="flame" :size="12" color="#fff" /><text class="hot-tag-txt">热门赛事</text></view>
              <view class="hot-tag registering"><text class="hot-tag-txt">{{ uiStatusConfig.registering.label }}</text></view>
            </view>
            <text class="hot-title">{{ hotComp.title }}</text>
            <text class="hot-sub">{{ hotComp.organizer }} · {{ hotComp.participants }}人已报名</text>
            <view class="hot-prize"><app-icon name="trophy" :size="16" color="#fff" /><text class="hot-prize-txt">{{ hotComp.prize }}</text></view>
            <view class="hot-foot">
              <text class="hot-ddl">{{ hotComp.startTime ? '开赛: ' + hotComp.startTime : '报名中' }}</text>
              <view class="hot-btn"><text class="hot-btn-txt">查看详情</text></view>
            </view>
          </view>
        </view>

        <!-- 分类标签 -->
        <scroll-view scroll-x class="cat-scroll">
          <view class="cat-row">
            <view v-for="cat in categories" :key="cat.id" class="cat-chip" :class="{ active: activeCategory === cat.id }" @click="activeCategory = cat.id">
              <text class="cat-txt" :class="{ active: activeCategory === cat.id }">{{ cat.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 状态 Tab -->
        <view class="status-tabs">
          <view v-for="t in statusTabs" :key="t.id" class="status-tab" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
            <text class="status-tab-txt" :class="{ active: activeTab === t.id }">{{ t.label }}</text>
          </view>
        </view>

        <!-- 赛事列表 -->
        <view class="list">
          <view v-for="comp in filteredCompetitions" :key="comp.id" class="comp-card" @click="go('/competition/' + comp.id)">
            <view class="comp-cover">
              <image lazy-load v-if="comp.cover" :src="comp.cover" mode="aspectFill" class="comp-cover-img" />
              <view v-else class="comp-cover-ph"><app-icon name="trophy" :size="48" color="rgba(196,30,58,0.2)" /></view>
              <view class="comp-badges">
                <view class="comp-badge" :class="comp.ui"><view class="badge-dot" /><text class="badge-txt">{{ uiStatusConfig[comp.ui].label }}</text></view>
                <view class="comp-type-badge" :class="comp.levelKind"><text class="type-txt" :class="comp.levelKind">{{ comp.levelLabel }}</text></view>
              </view>
            </view>
            <view class="comp-body">
              <text class="comp-title">{{ comp.title }}</text>
              <view class="comp-org">
                <view class="org-ico"><app-icon name="trophy" :size="12" color="#c41e3a" /></view>
                <text class="org-txt">{{ comp.organizer }} · {{ comp.typeTag }}</text>
              </view>
              <view class="comp-tags">
                <text v-for="tag in comp.tags" :key="tag" class="comp-tag">{{ tag }}</text>
              </view>
              <view class="comp-meta">
                <view class="meta-left">
                  <text class="meta-item"><app-icon name="users" :size="13" color="#9ca3af" /> {{ comp.participants }}{{ comp.maxParticipants ? '/' + comp.maxParticipants : '' }}</text>
                  <text v-if="comp.startTime" class="meta-item"><app-icon name="calendar" :size="13" color="#9ca3af" /> {{ comp.startTime }}</text>
                </view>
                <text v-if="comp.ui === 'registering'" class="meta-action primary">立即报名</text>
                <text v-else-if="comp.ui === 'ongoing'" class="meta-action">查看详情</text>
                <text v-else class="meta-action gray">查看结果</text>
              </view>
              <view class="comp-prize">
                <app-icon name="award" :size="14" color="#f59e0b" /><text class="prize-txt">{{ comp.prize }}</text>
              </view>
            </view>
          </view>

          <view v-if="filteredCompetitions.length === 0" class="empty">
            <app-icon name="trophy" :size="48" color="#d1d5db" />
            <text class="empty-txt">暂无相关赛事</text>
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
import { BRAND } from '@/lib/brand'
import {
  competitionApi, mapStatus, uiStatusConfig, typeLabel, levelInfo, topPrizeText, fmtDate,
  type Competition, type UiStatus,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const loading = ref(true)
const error = ref('')

interface CardVM {
  id: string; title: string; cover: string; ui: UiStatus
  levelKind: 'platform' | 'circle' | 'joint'; levelLabel: string; typeTag: string
  participants: number; maxParticipants: number; startTime: string; prize: string
  organizer: string; tags: string[]; type: string
}
const cards = ref<CardVM[]>([])

const categories = [
  { id: 'all', label: '全部' },
  { id: 'BAZI_PREDICT', label: '八字命理' },
  { id: 'ZIWEI_DOUSHU', label: '紫微斗数' },
  { id: 'FENGSHUI', label: '风水堪舆' },
  { id: 'LIUYAO', label: '六爻占卜' },
  { id: 'POETRY', label: '诗词雅集' },
  { id: 'CALLIGRAPHY', label: '书法' },
]
const statusTabs = [
  { id: 'all', label: '全部' },
  { id: 'registering', label: '报名中' },
  { id: 'ongoing', label: '进行中' },
  { id: 'ended', label: '已结束' },
]

const activeTab = ref('all')
const activeCategory = ref('all')
const searchQuery = ref('')

function toCard(c: Competition): CardVM | null {
  const ui = mapStatus(c.status)
  if (!ui) return null
  const lv = levelInfo(c.level, c.organizerType)
  const firstRound = c.rounds && c.rounds.length ? c.rounds[0] : null
  return {
    id: c.id, title: c.title, cover: c.coverImage || '', ui,
    levelKind: lv.kind, levelLabel: lv.label, typeTag: typeLabel(c.type),
    participants: c._count?.registrations ?? 0, maxParticipants: c.maxParticipants || 0,
    startTime: fmtDate(firstRound?.startAt || c.startedAt || c.publishedAt),
    prize: topPrizeText(c),
    organizer: c.organizerType === 'platform' ? `${BRAND.nameShort}平台` : c.organizerType === 'circle' ? '圈子主办' : `${BRAND.nameShort}平台`,
    tags: c.tags || [], type: c.type,
  }
}

const filteredCompetitions = computed(() => cards.value.filter((c) => {
  const matchTab = activeTab.value === 'all' || c.ui === activeTab.value
  const matchCat = activeCategory.value === 'all' || c.type === activeCategory.value
  const matchSearch = c.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  return matchTab && matchCat && matchSearch
}))
const hotComp = computed(() => filteredCompetitions.value.find((c) => c.ui === 'registering') || null)

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
function goBack() { navigateBack() }

onMounted(() => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-bar { background: var(--brand); position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { color: #fff; font-size: 16px; font-weight: 500; }
.nav-links { display: flex; align-items: center; gap: 12px; }
.nav-link { color: rgba(255,255,255,0.8); font-size: 14px; }
.scroll { width: 100%; }
.search-wrap { padding: 12px 16px; background: #fff; border-bottom: 1rpx solid #eee; }
.search-box { display: flex; align-items: center; gap: 8px; background: #f3f4f6; border-radius: 10px; padding: 8px 12px; }
.search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.ph { color: #9ca3af; }

.state { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.hot-banner { position: relative; margin: 16px; border-radius: 16px; overflow: hidden; background: linear-gradient(135deg, var(--brand), #a01830); padding: 16px; }
.hot-deco { position: absolute; background: rgba(255,255,255,0.1); border-radius: 50%; }
.hot-deco-1 { width: 128px; height: 128px; top: -64px; right: -64px; }
.hot-deco-2 { width: 80px; height: 80px; bottom: -40px; left: -40px; }
.hot-inner { position: relative; }
.hot-tags { display: flex; gap: 8px; margin-bottom: 8px; }
.hot-tag { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.2); border-radius: 6px; padding: 2px 8px; }
.hot-tag.registering { background: #22c55e; }
.hot-tag-txt { color: #fff; font-size: 11px; }
.hot-title { display: block; color: #fff; font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.hot-sub { display: block; color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 12px; }
.hot-prize { display: flex; align-items: center; gap: 4px; }
.hot-prize-txt { color: #fff; font-size: 13px; }
.hot-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
.hot-ddl { color: rgba(255,255,255,0.7); font-size: 12px; }
.hot-btn { background: #fff; border-radius: 8px; padding: 6px 16px; }
.hot-btn-txt { color: var(--brand); font-size: 13px; font-weight: 600; }

.cat-scroll { white-space: nowrap; padding: 8px 16px 0; }
.cat-row { display: inline-flex; gap: 8px; }
.cat-chip { padding: 6px 14px; border-radius: 999px; background: #ececec; }
.cat-chip.active { background: var(--brand); }
.cat-txt { font-size: 13px; color: #4b5563; }
.cat-txt.active { color: #fff; }

.status-tabs { display: flex; gap: 8px; padding: 12px 16px; }
.status-tab { flex: 1; padding: 7px 0; text-align: center; background: #ececec; border-radius: 8px; }
.status-tab.active { background: var(--brand); }
.status-tab-txt { font-size: 12px; color: #4b5563; }
.status-tab-txt.active { color: #fff; }

.list { padding: 0 16px; display: flex; flex-direction: column; gap: 16px; }
.comp-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.04); }
.comp-cover { position: relative; height: 144px; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(196,30,58,0.04)); }
.comp-cover-img { width: 100%; height: 100%; }
.comp-cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.comp-badges { position: absolute; top: 12px; left: 12px; display: flex; gap: 8px; }
.comp-badge { display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; }
.comp-badge.registering { background: #22c55e; }
.comp-badge.ongoing { background: var(--brand); }
.comp-badge.ended { background: #9ca3af; }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; }
.badge-txt { color: #fff; font-size: 11px; }
.comp-type-badge { padding: 2px 8px; border-radius: 6px; }
.comp-type-badge.platform { background: rgba(196,30,58,0.1); }
.comp-type-badge.circle { background: #fff7ed; }
.comp-type-badge.joint { background: #fdf6ec; }
.type-txt { font-size: 11px; }
.type-txt.platform { color: var(--brand); }
.type-txt.circle { color: #c2790a; }
.type-txt.joint { color: #c9a96e; }
.comp-body { padding: 16px; }
.comp-title { display: block; font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.comp-org { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.org-ico { width: 20px; height: 20px; border-radius: 4px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.org-txt { font-size: 12px; color: #9ca3af; }
.comp-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.comp-tag { padding: 1px 8px; background: #f3f4f6; font-size: 11px; color: #6b7280; border-radius: 4px; }
.comp-meta { display: flex; align-items: center; justify-content: space-between; }
.meta-left { display: flex; gap: 12px; }
.meta-item { font-size: 12px; color: #9ca3af; }
.meta-action { font-size: 13px; color: var(--brand); font-weight: 500; }
.meta-action.primary { background: var(--brand); color: #fff; padding: 4px 12px; border-radius: 8px; font-size: 12px; }
.meta-action.gray { color: #9ca3af; }
.comp-prize { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1rpx solid #eee; }
.prize-txt { font-size: 12px; color: #9ca3af; }
.empty { padding: 48px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-txt { color: #9ca3af; font-size: 14px; }
.safe-bottom { height: 24px; }
</style>
