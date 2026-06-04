<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">我的悬赏</text>
        <view style="width:60rpx" />
      </view>
      <view class="tabs">
        <text v-for="t in tabs" :key="t.key" class="tab" :class="{ active: activeTab === t.key }" @click="switchTab(t.key)">{{ t.label }}</text>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view v-if="!loading && bounties.length" class="stats-card">
      <view class="stats-inner">
        <text class="stats-icon">🎁</text>
        <text class="stats-label">{{ activeTab === 'posted' ? '发布统计' : '回答统计' }}</text>
        <view class="stats-grid">
          <view class="stat-item"><text class="stat-num">{{ stats.total }}</text><text class="stat-desc">总数</text></view>
          <view class="stat-item"><text class="stat-num">{{ stats.open }}</text><text class="stat-desc">进行中</text></view>
          <view class="stat-item"><text class="stat-num">{{ stats.resolved }}</text><text class="stat-desc">已解决</text></view>
          <view class="stat-item"><text class="stat-num">¥{{ stats.totalAmount }}</text><text class="stat-desc">{{ activeTab === 'posted' ? '总投入' : '总收益' }}</text></view>
        </view>
      </view>
    </view>

    <view class="list-wrap">
      <DataState :is-loading="loading" :is-empty="!bounties.length" empty-icon="🎁" empty-title="暂无悬赏" empty-description="还没有发布过悬赏">
        <view v-for="b in bounties" :key="b.id" class="bounty-card" @click="goDetail(b)">
          <view class="bc-top">
            <view class="bc-status" :class="'s-' + b.status">
              <text>{{ getIcon(b.status) }}</text><text>{{ statusLabel(b.status) }}</text>
            </view>
            <text class="bc-amount">¥{{ b.amount }}</text>
          </view>
          <text class="bc-title">{{ b.title }}</text>
          <text class="bc-desc">{{ b.description }}</text>
          <view class="bc-meta">
            <text v-if="activeTab === 'posted'" class="bc-meta-item">💬 {{ b.answerCount }}个回答</text>
            <text v-if="activeTab === 'posted' && b.status === 'open'" class="bc-meta-item bc-remain">🕐 {{ getRemainTime(b.expireAt) }}</text>
            <text v-if="activeTab === 'answered'" class="bc-meta-item">{{ formatTimeAgo(b.createdAt) }}回答</text>
          </view>
          <view v-if="activeTab === 'posted'" class="bc-actions">
            <view v-if="b.status === 'answered'" class="bc-btn bc-btn-green" @click.stop="settle(b)">💰 结算悬赏</view>
            <view v-else-if="b.status === 'expired' || b.status === 'cancelled'" class="bc-btn bc-btn-primary" @click.stop="repost(b)">🔄 重新发布</view>
            <view v-else-if="b.status === 'open' && b.answerCount > 0" class="bc-btn bc-btn-amber" @click.stop="goDetail(b)">查看回答</view>
            <text v-else class="bc-waiting">等待回答中...</text>
          </view>
        </view>
        <view v-if="hasMore" class="load-more" @click="loadBounties(true)"><text>加载更多</text></view>
      </DataState>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { bountyApi } from '../../api'

interface BountyItem { id: string; title: string; description: string; amount: number; status: string; answerCount: number; expireAt: string; createdAt: string }

const activeTab = ref<'posted' | 'answered'>('posted'); const bounties = ref<BountyItem[]>([]); const loading = ref(true); const page = ref(1); const hasMore = ref(true)
const tabs = [{ key: 'posted' as const, label: '我发布的' }, { key: 'answered' as const, label: '我回答的' }]

const stats = computed(() => ({ total: bounties.value.length, open: bounties.value.filter(b => b.status === 'open').length, resolved: bounties.value.filter(b => b.status === 'resolved').length, totalAmount: bounties.value.reduce((s, b) => s + b.amount, 0) }))

onMounted(() => loadBounties())

async function loadBounties(loadMore = false) {
  if (!loadMore) { loading.value = true; page.value = 1 }
  try {
    const res = await bountyApi.list({ type: activeTab.value, page: page.value, pageSize: 20 }) as any
    const items: BountyItem[] = Array.isArray(res) ? res : res?.list || res?.data || []
    if (loadMore) bounties.value.push(...items); else bounties.value = items
    hasMore.value = items.length >= 20
    if (loadMore) page.value++
  } catch { bounties.value = [] }
  loading.value = false
}

function switchTab(tab: 'posted' | 'answered') { activeTab.value = tab; loadBounties() }
function statusLabel(s: string): string { return { open: '进行中', answered: '待采纳', resolved: '已解决', expired: '已过期', cancelled: '已取消' }[s] || s }
function getIcon(s: string): string { return { open: '🕐', answered: '💬', resolved: '✅', expired: '❌', cancelled: '❌' }[s] || '🕐' }

function getRemainTime(expireAt: string): string {
  const diff = new Date(expireAt).getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / 86400000); const hours = Math.floor((diff % 86400000) / 3600000)
  return days > 0 ? `剩余${days}天${hours}小时` : `剩余${hours}小时`
}
function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 30) return `${Math.floor(d / 30)}个月前`; if (d > 0) return `${d}天前`;
  const h = Math.floor(diff / 3600000); if (h > 0) return `${h}小时前`; return '刚刚'
}

async function settle(b: BountyItem) { try { await bountyApi.settle(b.id); loadBounties() } catch {} }
function repost(b: BountyItem) { uni.navigateTo({ url: `/pages/bounty/create?repost=${b.id}` }) }
function goDetail(b: BountyItem) { uni.navigateTo({ url: `/pages/bounty/detail?id=${b.id}` }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }
.header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx 0; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.tabs { display: flex; border-bottom: 1rpx solid #E5E1DB; margin-top: 12rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 26rpx; color: #999; position: relative; }
.tab.active { color: #C41E3A; font-weight: 500; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }
.stats-card { margin: 16rpx 24rpx; }
.stats-inner { background: linear-gradient(135deg, #C9A96E, #b8944e); border-radius: 20rpx; padding: 24rpx; color: #fff; }
.stats-icon { font-size: 32rpx; }
.stats-label { font-size: 26rpx; font-weight: 500; margin-left: 8rpx; display: inline; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; margin-top: 16rpx; }
.stat-item { text-align: center; }
.stat-num { font-size: 36rpx; font-weight: bold; display: block; }
.stat-desc { font-size: 20rpx; opacity: 0.8; }
.list-wrap { padding: 0 24rpx; }
.bounty-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.bc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.bc-status { display: flex; align-items: center; gap: 8rpx; padding: 6rpx 20rpx; border-radius: 28rpx; font-size: 22rpx; }
.s-open { background: #e3f2fd; color: #1976d2; }
.s-answered { background: #fff3e0; color: #e65100; }
.s-resolved { background: #e8f5e9; color: #2e7d32; }
.s-expired, .s-cancelled { background: #f5f5f5; color: #999; }
.bc-amount { font-size: 32rpx; font-weight: bold; color: #C9A96E; }
.bc-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-desc { font-size: 24rpx; color: #666; display: block; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-meta { display: flex; gap: 24rpx; margin-top: 12rpx; }
.bc-meta-item { font-size: 22rpx; color: #999; }
.bc-remain { color: #e65100; }
.bc-actions { display: flex; justify-content: flex-end; gap: 12rpx; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f0f0f0; }
.bc-btn { padding: 12rpx 32rpx; border-radius: 12rpx; font-size: 24rpx; color: #fff; }
.bc-btn-green { background: #4CAF50; }
.bc-btn-primary { background: #C41E3A; }
.bc-btn-amber { background: #C9A96E; }
.bc-waiting { font-size: 22rpx; color: #999; }
.load-more { text-align: center; padding: 24rpx 0; font-size: 26rpx; color: #999; }
</style>
