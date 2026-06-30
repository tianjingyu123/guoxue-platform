<script setup lang="ts">
/**
 * 咨询订单（真连后端 GET /question）—— 图文问答订单
 * 我在本圈的图文问答记录：我提问的 + 我作为达人被提问的。circleId 由 onLoad 带入。
 * 后端按 circleId + participantId（asker OR answerer）维度精确筛选（不再前端过滤降级）。
 * 注：本页仅图文问答（电话连麦订单属通话子系统，另页处理），故汇总不含「通话次数」。
 * 金额单位为金币（后端资金以币计，非现金 ¥）。三态齐全；点击进详情。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { questionApi, getCurrentUserId, splitQuestion, type PaidQuestion } from '@/lib/circle-consult-data'

type OrderStatus = 'all' | 'completed' | 'pending' | 'refunded'

const circleId = ref('')
const myId = ref('')
const loading = ref(true)
const error = ref('')
const all = ref<PaidQuestion[]>([])

const filterTabs: OrderStatus[] = ['all', 'completed', 'pending', 'refunded']
const filter = ref<OrderStatus>('all')

/** 后端状态 → 订单三态 */
function bucket(q: PaidQuestion): Exclude<OrderStatus, 'all'> {
  if (q.status === 'ANSWERED') return 'completed'
  if (q.status === 'PENDING') return 'pending'
  return 'refunded' // REFUNDED / REJECTED / EXPIRED / CLOSED
}

const STATUS_CFG: Record<Exclude<OrderStatus, 'all'>, { label: string; icon: string; color: string }> = {
  completed: { label: '已完成', icon: 'check-circle', color: '#16A34A' },
  pending: { label: '待处理', icon: 'clock', color: '#F59E0B' },
  refunded: { label: '已退款', icon: 'x-circle', color: '#999999' },
}

// 后端已按 participantId（我提问的 + 我回答的）维度筛选，列表即「我的订单」
const mine = computed(() => all.value)
const filtered = computed(() => filter.value === 'all' ? mine.value : mine.value.filter(q => bucket(q) === filter.value))

// 汇总：累计消费=我作为提问者且未退款的支付金币；问答总数；已回答数
const totalSpent = computed(() =>
  mine.value.filter(q => q.askerId === myId.value && bucket(q) !== 'refunded').reduce((s, q) => s + q.priceCoin, 0),
)
const totalCount = computed(() => mine.value.length)
const answeredCount = computed(() => mine.value.filter(q => q.status === 'ANSWERED').length)

function tabLabel(f: OrderStatus) { return f === 'all' ? '全部' : STATUS_CFG[f].label }
function roleLabel(q: PaidQuestion) { return q.askerId === myId.value ? '我提问' : '我回答' }
function counterpart(q: PaidQuestion) { return q.askerId === myId.value ? q.answerer : q.asker }
function fmtDate(s: string) { return s ? String(s).slice(0, 10) : '' }

async function load() {
  if (!circleId.value) { error.value = '缺少圈子参数'; loading.value = false; return }
  if (!myId.value) { error.value = '请先登录'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const res = await questionApi.list({ circleId: circleId.value, participantId: myId.value, page: 1, pageSize: 100 })
    all.value = res.items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openDetail(id: string) { navigateTo(`/pkg-circle/circles/question-detail?id=${id}`) }

onLoad((opt) => { circleId.value = (opt?.circleId || opt?.id || '') as string })
onMounted(() => { myId.value = getCurrentUserId(); load() })
</script>

<template>
  <view class="co-page">
    <view class="co-nav">
      <view class="co-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="co-nav-title">咨询订单</text>
    </view>

    <view class="co-summary">
      <view class="co-sum-item"><text class="co-sum-num is-primary">{{ totalSpent }}</text><text class="co-sum-label">累计消费(币)</text></view>
      <view class="co-sum-item"><text class="co-sum-num">{{ totalCount }}</text><text class="co-sum-label">问答总数</text></view>
      <view class="co-sum-item"><text class="co-sum-num">{{ answeredCount }}</text><text class="co-sum-label">已回答</text></view>
    </view>

    <scroll-view scroll-x class="co-filters" :show-scrollbar="false">
      <view class="co-filters-inner">
        <view v-for="f in filterTabs" :key="f" class="co-filter" :class="{ 'is-active': filter === f }" @tap="filter = f">
          <text class="co-filter-t" :class="{ 'is-active': filter === f }">{{ tabLabel(f) }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 三态 -->
    <view v-if="loading" class="co-state"><text class="co-state-t">加载中…</text></view>
    <view v-else-if="error" class="co-state">
      <text class="co-state-t">{{ error }}</text>
      <view class="co-retry" @tap="load"><text class="co-retry-t">重试</text></view>
    </view>
    <view v-else-if="filtered.length === 0" class="co-state"><text class="co-state-t">暂无订单</text></view>

    <view v-else class="co-list">
      <view v-for="o in filtered" :key="o.id" class="co-card" @tap="openDetail(o.id)">
        <view class="co-card-head">
          <text class="co-order-no">订单号：{{ o.id.slice(0, 8).toUpperCase() }}</text>
          <view class="co-status">
            <app-icon :name="STATUS_CFG[bucket(o)].icon" :size="22" :color="STATUS_CFG[bucket(o)].color" />
            <text class="co-status-t" :style="{ color: STATUS_CFG[bucket(o)].color }">{{ STATUS_CFG[bucket(o)].label }}</text>
          </view>
        </view>
        <view class="co-card-body">
          <image lazy-load class="co-avatar" :src="counterpart(o)?.avatar || ''" mode="aspectFill" />
          <view class="co-info">
            <view class="co-info-top">
              <text class="co-expert">{{ counterpart(o)?.nickname || '用户' }}</text>
              <view class="co-type">
                <app-icon name="message-square" :size="20" color="#999999" />
                <text class="co-type-t">图文 · {{ roleLabel(o) }}</text>
              </view>
            </view>
            <text class="co-desc">{{ splitQuestion(o.question).title || splitQuestion(o.question).body }}</text>
          </view>
          <view class="co-amount-wrap">
            <text class="co-amount" :class="{ 'is-refunded': bucket(o) === 'refunded' }">{{ o.priceCoin }}币</text>
            <text class="co-date">{{ fmtDate(o.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.co-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 48rpx; }
.co-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.co-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.co-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.co-summary { display: flex; gap: 32rpx; margin: 24rpx; padding: 28rpx; background: rgba(196,30,58,0.05); border: 1rpx solid rgba(196,30,58,0.2); border-radius: 20rpx; }
.co-sum-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.co-sum-num { font-size: 38rpx; font-weight: 700; color: #2C2C2C; }
.co-sum-num.is-primary { color: var(--brand); }
.co-sum-label { font-size: 22rpx; color: #999; }
.co-filters { white-space: nowrap; padding: 8rpx 24rpx 16rpx; }
.co-filters-inner { display: inline-flex; gap: 16rpx; }
.co-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.co-filter.is-active { background: var(--brand); }
.co-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.co-filter-t.is-active { color: #fff; }
.co-state { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.co-state-t { font-size: 26rpx; color: #999; }
.co-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.co-retry-t { font-size: 26rpx; color: #fff; }
.co-list { display: flex; flex-direction: column; gap: 20rpx; padding: 8rpx 24rpx 0; }
.co-card { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; padding: 24rpx; }
.co-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.co-order-no { font-size: 22rpx; color: #999; }
.co-status { display: flex; align-items: center; gap: 6rpx; }
.co-status-t { font-size: 22rpx; }
.co-card-body { display: flex; align-items: center; gap: 16rpx; }
.co-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; background: #ECE6D8; }
.co-info { flex: 1; min-width: 0; }
.co-info-top { display: flex; align-items: center; gap: 12rpx; }
.co-expert { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.co-type { display: flex; align-items: center; gap: 4rpx; }
.co-type-t { font-size: 22rpx; color: #999; }
.co-desc { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.co-amount-wrap { text-align: right; flex-shrink: 0; }
.co-amount { display: block; font-size: 28rpx; font-weight: 700; color: var(--brand); }
.co-amount.is-refunded { text-decoration: line-through; color: #999; }
.co-date { display: block; font-size: 20rpx; color: #999; margin-top: 6rpx; }
</style>
