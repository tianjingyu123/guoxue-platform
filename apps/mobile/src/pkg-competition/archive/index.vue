<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">往届赛事档案</text>
        <view class="nav-btn" />
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>
    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="info" :size="44" color="#d1d5db" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @click="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <scroll-view v-else scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 年份筛选 -->
      <view v-if="items.length" class="year-bar">
        <view v-for="y in years" :key="y" class="year-chip" :class="{ active: selectedYear === y }" @click="selectedYear = y">
          <text class="year-txt" :class="{ active: selectedYear === y }">{{ y === 'all' ? '全部' : y + '年' }}</text>
        </view>
      </view>

      <view class="list">
        <view v-for="comp in filteredItems" :key="comp.id" class="arc-card">
          <view class="arc-body">
            <view class="arc-head">
              <text class="arc-title">{{ comp.title }}</text>
              <text v-if="yearOf(comp)" class="arc-year">{{ yearOf(comp) }}</text>
            </view>
            <view class="arc-meta">
              <text v-if="comp.finishedAt" class="meta-item"><app-icon name="calendar" :size="14" color="#9ca3af" /> {{ fmtDate(comp.finishedAt) }}</text>
              <text class="meta-item"><app-icon name="users" :size="14" color="#9ca3af" /> {{ comp._count?.registrations ?? 0 }} 人参赛</text>
            </view>

            <!-- 领奖台（有 top3 才显示） -->
            <view v-if="(podiums[comp.id] || []).length" class="podium">
              <!-- 亚军 -->
              <view v-if="podiums[comp.id][1]" class="podium-item">
                <view class="podium-avatar silver"><app-icon name="medal" :size="20" color="#9ca3af" /></view>
                <text class="podium-name">{{ podiums[comp.id][1].user?.nickname || '选手' }}</text>
                <text class="podium-score">{{ podiums[comp.id][1].score }}分</text>
              </view>
              <!-- 冠军 -->
              <view class="podium-item champion">
                <view class="podium-avatar gold"><app-icon name="crown" :size="28" color="#f59e0b" /></view>
                <text class="podium-name bold">{{ podiums[comp.id][0].user?.nickname || '选手' }}</text>
                <text class="podium-score gold-txt">{{ podiums[comp.id][0].score }}分</text>
              </view>
              <!-- 季军 -->
              <view v-if="podiums[comp.id][2]" class="podium-item">
                <view class="podium-avatar bronze"><app-icon name="award" :size="20" color="#b45309" /></view>
                <text class="podium-name">{{ podiums[comp.id][2].user?.nickname || '选手' }}</text>
                <text class="podium-score">{{ podiums[comp.id][2].score }}分</text>
              </view>
            </view>

            <view class="rank-btn" @click="go('/competition/' + comp.id + '/result')">
              <app-icon name="trophy" :size="16" color="#c41e3a" />
              <text class="rank-btn-txt">查看完整排名</text>
            </view>
          </view>
        </view>

        <!-- 空态 -->
        <view v-if="filteredItems.length === 0" class="empty">
          <app-icon name="trophy" :size="48" color="#d1d5db" />
          <text class="empty-txt">暂无往届赛事</text>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { competitionApi, fmtDate, type Competition, type Ranking } from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const loading = ref(true)
const error = ref('')
const items = ref<Competition[]>([])
// 每届赛事 id → top3 排名
const podiums = ref<Record<string, Ranking[]>>({})
const selectedYear = ref('all')

function yearOf(c: Competition): string {
  if (!c.finishedAt) return ''
  const d = new Date(c.finishedAt)
  return isNaN(d.getTime()) ? '' : String(d.getFullYear())
}

// 年份去重 + 全部
const years = computed(() => {
  const set = new Set<string>()
  items.value.forEach((c) => { const y = yearOf(c); if (y) set.add(y) })
  return ['all', ...Array.from(set).sort((a, b) => Number(b) - Number(a))]
})
const filteredItems = computed(() =>
  items.value.filter((c) => selectedYear.value === 'all' || yearOf(c) === selectedYear.value),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await competitionApi.list({ status: 'FINISHED', pageSize: 50 })
    items.value = res.items
    // 并发取每届 top3，失败不阻塞
    const top3List = await Promise.all(
      items.value.map((c) =>
        competitionApi.rankings(c.id)
          .then((r) => r.items.slice().sort((a, b) => a.rank - b.rank).slice(0, 3))
          .catch(() => [] as Ranking[]),
      ),
    )
    const map: Record<string, Ranking[]> = {}
    items.value.forEach((c, i) => { map[c.id] = top3List[i] })
    podiums.value = map
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
.scroll { width: 100%; }

.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); border-radius: 8px; }
.retry-txt { color: #fff; font-size: 14px; }

.year-bar { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px; background: #fff; border-bottom: 1rpx solid #eee; }
.year-chip { padding: 6px 16px; border-radius: 999px; background: #ececec; }
.year-chip.active { background: var(--brand); }
.year-txt { font-size: 13px; color: #4b5563; }
.year-txt.active { color: #fff; }

.list { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.arc-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.04); }
.arc-body { padding: 16px; }
.arc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.arc-title { flex: 1; font-size: 16px; font-weight: 700; color: #1a1a1a; line-height: 1.4; }
.arc-year { font-size: 14px; color: #9ca3af; flex-shrink: 0; }
.arc-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; }
.meta-item { font-size: 13px; color: #9ca3af; }

.podium { display: flex; align-items: flex-end; justify-content: center; gap: 12px; padding: 16px 0; margin-bottom: 12px; background: linear-gradient(to bottom, rgba(245,158,11,0.06), transparent); border-radius: 12px; }
.podium-item { text-align: center; }
.podium-item.champion { margin-top: -16px; }
.podium-avatar { border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 4px; }
.podium-avatar.silver, .podium-avatar.bronze { width: 48px; height: 48px; }
.podium-avatar.gold { width: 64px; height: 64px; background: #fef3c7; }
.podium-avatar.silver { background: #f3f4f6; }
.podium-avatar.bronze { background: #fef9ec; }
.podium-name { display: block; font-size: 12px; font-weight: 500; color: #1a1a1a; max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.podium-name.bold { font-size: 14px; font-weight: 700; }
.podium-score { display: block; font-size: 11px; color: #9ca3af; }
.podium-score.gold-txt { color: #d97706; }

.rank-btn { height: 40px; border: 1rpx solid #e5e7eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.rank-btn-txt { font-size: 14px; color: var(--brand); font-weight: 500; }

.empty { padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-txt { color: #9ca3af; font-size: 14px; }
.safe-bottom { height: 24px; }
</style>
