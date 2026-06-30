<script setup lang="ts">
/**
 * 我的问答（真连后端 GET /question）
 * 圈子内「我作为提问者」的付费问答列表。circleId 由 onLoad 带入（圈子作用域页）。
 * 后端按 circleId + askerId 维度精确筛选（不再前端过滤降级，见 circle-consult-data）。
 * 状态筛选(全部/待回答/已回答)；点击进详情；三态齐全。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { questionApi, getCurrentUserId, splitQuestion, type PaidQuestion } from '@/lib/circle-consult-data'

type QFilter = 'all' | 'answered' | 'pending'

const circleId = ref('')
const myId = ref('')
const loading = ref(true)
const error = ref('')
const all = ref<PaidQuestion[]>([])

const filterTabs: QFilter[] = ['all', 'answered', 'pending']
const filter = ref<QFilter>('all')

// 后端已按 askerId 维度筛选，列表即「我的提问」
const mine = computed(() => all.value)
const filtered = computed(() => {
  if (filter.value === 'all') return mine.value
  if (filter.value === 'answered') return mine.value.filter(q => q.status === 'ANSWERED')
  return mine.value.filter(q => q.status === 'PENDING')
})

function tabLabel(f: QFilter) { return f === 'all' ? '全部' : f === 'answered' ? '已回答' : '待回答' }

function statusInfo(q: PaidQuestion) {
  switch (q.status) {
    case 'ANSWERED': return { label: '已回答', icon: 'check-circle', color: '#16A34A' }
    case 'PENDING': return { label: '待回答', icon: 'clock', color: '#F59E0B' }
    case 'REFUNDED':
    case 'REJECTED': return { label: '已退款', icon: 'x-circle', color: '#999999' }
    default: return { label: '已关闭', icon: 'x-circle', color: '#999999' }
  }
}

function fmtDate(s: string) { return s ? String(s).slice(0, 10) : '' }

async function load() {
  if (!circleId.value) { error.value = '缺少圈子参数'; loading.value = false; return }
  if (!myId.value) { error.value = '请先登录'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const res = await questionApi.list({ circleId: circleId.value, askerId: myId.value, page: 1, pageSize: 100 })
    all.value = res.items
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openDetail(id: string) { navigateTo(`/pkg-circle/circles/question-detail?id=${id}`) }

onLoad((opt) => { circleId.value = (opt?.circleId || opt?.id || '') as string })
onMounted(() => { myId.value = getCurrentUserId(); load() })
</script>

<template>
  <view class="mq-page">
    <view class="mq-nav">
      <view class="mq-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="mq-nav-title">我的问答</text>
    </view>

    <view class="mq-filters">
      <view v-for="f in filterTabs" :key="f" class="mq-filter" :class="{ 'is-active': filter === f }" @tap="filter = f">
        <text class="mq-filter-t" :class="{ 'is-active': filter === f }">{{ tabLabel(f) }}</text>
      </view>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="mq-state"><text class="mq-state-t">加载中…</text></view>
    <view v-else-if="error" class="mq-state">
      <text class="mq-state-t">{{ error }}</text>
      <view class="mq-retry" @tap="load"><text class="mq-retry-t">重试</text></view>
    </view>
    <view v-else-if="filtered.length === 0" class="mq-state"><text class="mq-state-t">暂无问答记录</text></view>

    <view v-else class="mq-list">
      <view v-for="q in filtered" :key="q.id" class="mq-card" @tap="openDetail(q.id)">
        <view class="mq-card-main">
          <image lazy-load class="mq-avatar" :src="q.answerer?.avatar || ''" mode="aspectFill" />
          <view class="mq-info">
            <view class="mq-info-top">
              <text class="mq-expert">{{ q.answerer?.nickname || '达人' }}</text>
              <view class="mq-status">
                <app-icon :name="statusInfo(q).icon" :size="22" :color="statusInfo(q).color" />
                <text class="mq-status-t" :style="{ color: statusInfo(q).color }">{{ statusInfo(q).label }}</text>
              </view>
            </view>
            <text class="mq-content">{{ splitQuestion(q.question).title || splitQuestion(q.question).body }}</text>
            <view class="mq-meta">
              <text class="mq-date">{{ fmtDate(q.createdAt) }}</text>
              <text class="mq-cost">{{ q.priceCoin }} 金币</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mq-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 48rpx; }
.mq-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.mq-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.mq-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.mq-filters { display: flex; gap: 16rpx; padding: 24rpx 24rpx 16rpx; }
.mq-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.mq-filter.is-active { background: var(--brand); }
.mq-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.mq-filter-t.is-active { color: #fff; }
.mq-state { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.mq-state-t { font-size: 26rpx; color: #999; }
.mq-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.mq-retry-t { font-size: 26rpx; color: #fff; }
.mq-list { display: flex; flex-direction: column; gap: 20rpx; padding: 8rpx 24rpx 0; }
.mq-card { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; overflow: hidden; }
.mq-card-main { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx; }
.mq-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; margin-top: 4rpx; background: #ECE6D8; }
.mq-info { flex: 1; min-width: 0; }
.mq-info-top { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 8rpx; }
.mq-expert { font-size: 22rpx; color: #999; }
.mq-status { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.mq-status-t { font-size: 22rpx; }
.mq-content { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.mq-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.mq-date { font-size: 22rpx; color: #999; }
.mq-cost { font-size: 22rpx; font-weight: 500; color: var(--brand); }
</style>
