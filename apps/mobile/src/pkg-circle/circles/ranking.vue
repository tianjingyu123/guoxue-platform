<script setup lang="ts">
/**
 * 圈子排行榜（视觉层沿用原型 app/circles/ranking/page.tsx；逻辑层重写为真连后端）
 * 渐变顶部 + 三Tab + 前3名台阶式 + 4名后列表 + 三态
 * 注：原型"高质量/精华率"Tab 后端无支撑(臆想指标)，改为后端支持的"内容数"(postCount)。
 *     三Tab 对应后端 sortBy: memberCount / activityScore / postCount。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleApi, formatMembers, type RankingCircle, type RankSortBy } from '@/lib/circle-data'

type RankTab = 'members' | 'active' | 'content'
const tabs: { value: RankTab; label: string; sortBy: RankSortBy; sub: string }[] = [
  { value: 'members', label: '成员数', sortBy: 'memberCount', sub: '成员' },
  { value: 'active', label: '最活跃', sortBy: 'activityScore', sub: '帖子' },
  { value: 'content', label: '内容数', sortBy: 'postCount', sub: '内容' },
]

const activeTab = ref<RankTab>('members')
const loading = ref(true)
const error = ref('')
const items = ref<RankingCircle[]>([])

const currentTab = computed(() => tabs.find(t => t.value === activeTab.value)!)
const top3 = computed(() => items.value.slice(0, 3))
const rest = computed(() => items.value.slice(3))

/** 当前 Tab 展示的数值：成员数走万分位格式化，帖子/内容数直接显示 */
function valOf(c?: RankingCircle): string {
  if (!c) return ''
  return activeTab.value === 'members' ? formatMembers(c.memberCount) : String(c.postCount)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await circleApi.getRanking(currentTab.value.sortBy)
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(t: RankTab) {
  if (activeTab.value === t) return
  activeTab.value = t
  load()
}

function openCircle(id: string) { navigateTo(`/pkg-circle/circles/detail?id=${id}`) }

onMounted(load)
</script>

<template>
  <view class="rk">
    <!-- 渐变顶部 -->
    <view class="rk-top">
      <view class="rk-head">
        <view @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
        <text class="rk-title">圈子排行榜</text>
        <app-icon name="trophy" :size="44" color="#FCD34D" />
      </view>
      <view class="rk-tabs">
        <view v-for="tab in tabs" :key="tab.value" class="rk-tab" :class="{ on: activeTab === tab.value }" @tap="switchTab(tab.value)">
          <text class="rk-tab-txt" :class="{ on: activeTab === tab.value }">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 加载 / 错误 / 空 三态 -->
    <view v-if="loading" class="rk-state"><text class="rk-state-txt">加载中…</text></view>
    <view v-else-if="error" class="rk-state">
      <text class="rk-state-txt">{{ error }}</text>
      <view class="rk-state-btn" @tap="load">重试</view>
    </view>
    <view v-else-if="!items.length" class="rk-state"><text class="rk-state-txt">暂无排行数据</text></view>

    <template v-else>
      <!-- 前3名台阶式 -->
      <view class="rk-podium">
        <!-- 第2名 -->
        <view class="rk-pod rk-pod-2">
          <view class="rk-pod-avatar-wrap">
            <view class="rk-pod-avatar silver"><smart-cover :src="top3[1]?.cover" :title="top3[1]?.name" type="circle" deco :deco-size="44" /></view>
            <view class="rk-pod-rank silver">2</view>
          </view>
          <text class="rk-pod-name">{{ top3[1]?.name }}</text>
          <text class="rk-pod-value">{{ valOf(top3[1]) }}</text>
          <text class="rk-pod-sub">{{ currentTab.sub }}</text>
        </view>
        <!-- 第1名 -->
        <view class="rk-pod rk-pod-1">
          <view class="rk-pod-crown"><app-icon name="crown" :size="32" color="#F59E0B" /></view>
          <view class="rk-pod-avatar-wrap">
            <view class="rk-pod-avatar gold"><smart-cover :src="top3[0]?.cover" :title="top3[0]?.name" type="circle" deco :deco-size="50" /></view>
            <view class="rk-pod-rank gold">1</view>
          </view>
          <text class="rk-pod-name">{{ top3[0]?.name }}</text>
          <text class="rk-pod-value gold">{{ valOf(top3[0]) }}</text>
          <text class="rk-pod-sub">{{ currentTab.sub }}</text>
        </view>
        <!-- 第3名 -->
        <view class="rk-pod rk-pod-2">
          <view class="rk-pod-avatar-wrap">
            <view class="rk-pod-avatar bronze"><smart-cover :src="top3[2]?.cover" :title="top3[2]?.name" type="circle" deco :deco-size="44" /></view>
            <view class="rk-pod-rank bronze">3</view>
          </view>
          <text class="rk-pod-name">{{ top3[2]?.name }}</text>
          <text class="rk-pod-value">{{ valOf(top3[2]) }}</text>
          <text class="rk-pod-sub">{{ currentTab.sub }}</text>
        </view>
      </view>

      <!-- 4名后列表 -->
      <view class="rk-list">
        <view v-for="c in rest" :key="c.id" class="rk-row" @tap="openCircle(c.id)">
          <text class="rk-row-rank">{{ c.rank }}</text>
          <view class="rk-row-avatar"><smart-cover :src="c.cover" :title="c.name" type="circle" deco :deco-size="34" /></view>
          <view class="rk-row-main">
            <view class="rk-row-name-row">
              <text class="rk-row-name">{{ c.name }}</text>
              <text v-if="c.category" class="rk-row-cat">{{ c.category }}</text>
            </view>
            <text v-if="c.owner" class="rk-row-owner">{{ c.owner }}</text>
          </view>
          <view class="rk-row-val">
            <text class="rk-row-value">{{ valOf(c) }}</text>
            <text class="rk-row-sub">{{ currentTab.sub }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.rk { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.rk-top { background: linear-gradient(135deg, var(--brand), #8B0000); padding: 24rpx 32rpx 128rpx; padding-top: calc(48rpx + var(--status-bar-height, 0px)); }
.rk-head { display: flex; align-items: center; gap: 24rpx; margin-bottom: 48rpx; }
.rk-title { flex: 1; font-size: 40rpx; font-weight: 700; color: #fff; }
.rk-tabs { display: flex; background: rgba(255,255,255,0.1); border-radius: 24rpx; padding: 8rpx; gap: 8rpx; }
.rk-tab { flex: 1; padding: 16rpx 0; border-radius: 16rpx; text-align: center; }
.rk-tab.on { background: #fff; }
.rk-tab-txt { font-size: 28rpx; font-weight: 500; color: rgba(255,255,255,0.8); }
.rk-tab-txt.on { color: var(--brand, var(--brand)); }
/* 三态 */
.rk-state { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 0; }
.rk-state-txt { font-size: 28rpx; color: #999; }
.rk-state-btn { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand, var(--brand)); color: #fff; font-size: 26rpx; }
/* 台阶 */
.rk-podium { display: flex; gap: 16rpx; padding: 0 32rpx; margin-top: -80rpx; align-items: flex-end; }
.rk-pod { flex: 1; display: flex; flex-direction: column; align-items: center; background: var(--card, #fff); border-radius: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); padding-bottom: 24rpx; }
.rk-pod-2 { margin-top: 48rpx; padding-top: 16rpx; border: 2rpx solid var(--border, #EDE8E0); }
.rk-pod-1 { border: 2rpx solid #FDE68A; }
.rk-pod-crown { width: 100%; background: rgba(251,191,36,0.2); padding: 8rpx 0; text-align: center; border-radius: 24rpx 24rpx 0 0; margin-bottom: 16rpx; display: flex; justify-content: center; }
.rk-pod-avatar-wrap { position: relative; margin-bottom: 16rpx; }
.rk-pod-avatar { width: 112rpx; height: 112rpx; border-radius: 24rpx; border: 4rpx solid #CBD5E1; overflow: hidden; }
.rk-pod-avatar.gold { width: 128rpx; height: 128rpx; border-color: #FBBF24; }
.rk-pod-avatar.silver { border-color: #CBD5E1; }
.rk-pod-avatar.bronze { border-color: #FDBA74; }
.rk-pod-rank { position: absolute; bottom: -8rpx; right: -8rpx; width: 40rpx; height: 40rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; color: #fff; }
.rk-pod-rank.gold { background: #FBBF24; color: #78350F; }
.rk-pod-rank.silver { background: #94A3B8; }
.rk-pod-rank.bronze { background: #FB923C; }
.rk-pod-name { font-size: 24rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); text-align: center; padding: 0 8rpx; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-pod-value { font-size: 28rpx; font-weight: 700; color: var(--brand, var(--brand)); margin-top: 4rpx; }
.rk-pod-value.gold { font-size: 32rpx; color: #D97706; }
.rk-pod-sub { font-size: 20rpx; color: #999; }
/* 列表 */
.rk-list { padding: 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.rk-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: var(--card, #fff); border-radius: 24rpx; border: 2rpx solid var(--border, #EDE8E0); }
.rk-row-rank { width: 48rpx; text-align: center; font-size: 28rpx; font-weight: 700; color: #999; flex-shrink: 0; }
.rk-row-avatar { width: 88rpx; height: 88rpx; border-radius: 20rpx; flex-shrink: 0; overflow: hidden; }
.rk-row-main { flex: 1; min-width: 0; }
.rk-row-name-row { display: flex; align-items: center; gap: 12rpx; }
.rk-row-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280rpx; }
.rk-row-cat { font-size: 20rpx; padding: 2rpx 12rpx; background: #F5F0E8; color: #999; border-radius: 8rpx; flex-shrink: 0; }
.rk-row-owner { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.rk-row-val { text-align: right; flex-shrink: 0; }
.rk-row-value { display: block; font-size: 28rpx; font-weight: 700; color: var(--brand, var(--brand)); }
.rk-row-sub { font-size: 20rpx; color: #999; }
</style>
