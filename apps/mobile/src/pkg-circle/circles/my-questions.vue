<script setup lang="ts">
/**
 * 我的问答（提问者视角）— V0 circle-consult-my.html 还原（2026-07-10 批④）
 * 结构：顶栏+状态筛选(全部/待回答/已回答) → 问答条目卡（达人行+状态徽章+问题+底部金币/围观/退款信息行）。
 * 数据：GET /question?circleId&askerId（后端 askerId 维度精确筛选）。
 * 口径（后端为准）：待回答显示 72h 超时自动退款倒计时（后端固定 72h）；
 *   已回答且公开显示围观人数（peekCount 真字段）；V0「分成 +9 金币(40%)」金额无后端字段→不显示；
 *   未公开问答显示「仅自己与达人可见」（isPublic 真字段）。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { questionApi, getCurrentUserId, splitQuestion, type PaidQuestion } from '@/lib/circle-consult-data'

type QFilter = 'all' | 'pending' | 'answered'

const circleId = ref('')
const myId = ref('')
const loading = ref(true)
const error = ref('')
const all = ref<PaidQuestion[]>([])

const filterTabs: { key: QFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待回答' },
  { key: 'answered', label: '已回答' },
]
const filter = ref<QFilter>('all')

const filtered = computed(() => {
  if (filter.value === 'all') return all.value
  if (filter.value === 'answered') return all.value.filter(q => q.status === 'ANSWERED')
  return all.value.filter(q => q.status === 'PENDING')
})

function badge(q: PaidQuestion) {
  if (q.status === 'ANSWERED') return { label: '已回答', cls: 'answered' }
  if (q.status === 'PENDING') return { label: '待回答', cls: 'waiting' }
  return { label: '已拒答/退款', cls: 'declined' }
}
function qTitle(q: PaidQuestion) { const p = splitQuestion(q.question); return p.title || p.body }
function fmtTime(s: string) {
  if (!s) return ''
  const d = new Date(s)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000)
    return hours <= 0 ? '刚刚' : `${hours} 小时前`
  }
  if (days < 7) return `${days} 天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
/** 72h 超时退款剩余小时（后端固定 72h） */
function refundLeft(q: PaidQuestion) {
  const elapsed = (Date.now() - new Date(q.createdAt).getTime()) / 3_600_000
  return Math.max(0, Math.ceil(72 - elapsed))
}

async function load() {
  if (!myId.value) { error.value = '请先登录'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    // circleId 可选：圈内进入=本圈记录；「圈子·我的」板块入口不带 circleId=跨圈全量（后端 QueryDto 支持）
    const res = await questionApi.list({ circleId: circleId.value || undefined, askerId: myId.value, page: 1, pageSize: 100 })
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
  <view class="mq-page">
    <!-- 顶栏 + 状态筛选 -->
    <view class="mq-topbar">
      <view class="mq-topbar-row">
        <view class="mq-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
        <text class="mq-title">我的问答</text>
      </view>
      <view class="mq-filters">
        <view
          v-for="f in filterTabs" :key="f.key"
          class="mq-filter" :class="{ 'is-active': filter === f.key }"
          @tap="filter = f.key"
        >
          <text class="mq-filter-t" :class="{ 'is-active': filter === f.key }">{{ f.label }}</text>
        </view>
      </view>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="mq-state"><view class="mq-skel" /><view class="mq-skel" /></view>
    <view v-else-if="error" class="mq-state">
      <text class="mq-state-t">{{ error }}</text>
      <view class="mq-retry" @tap="load"><text class="mq-retry-t">重试</text></view>
    </view>
    <view v-else-if="filtered.length === 0" class="mq-state"><text class="mq-state-t">暂无问答记录</text></view>

    <template v-else>
      <view v-for="q in filtered" :key="q.id" class="mq-item" @tap="openDetail(q.id)">
        <view class="mq-head">
          <view class="mq-expert">
            <view class="mq-expert-avatar">
              <image v-if="q.answerer?.avatar" lazy-load class="mq-expert-img" :src="q.answerer.avatar" mode="aspectFill" />
              <view v-else class="mq-expert-img mq-expert-ph"><app-icon name="user" :size="22" color="#C9A96E" /></view>
            </view>
            <text class="mq-expert-name">{{ q.answerer?.nickname || '达人' }}</text>
          </view>
          <text class="mq-badge" :class="'mq-badge-' + badge(q).cls">{{ badge(q).label }}</text>
        </view>
        <text class="mq-q">{{ qTitle(q) }}{{ !q.isPublic ? '（未公开）' : '' }}</text>
        <view class="mq-foot">
          <text v-if="q.status === 'PENDING'" class="mq-foot-l">{{ q.priceCoin }} 金币托管中 · {{ fmtTime(q.createdAt) }}</text>
          <text v-else class="mq-foot-l">{{ q.priceCoin }} 金币 · {{ fmtTime(q.createdAt) }}</text>
          <view class="mq-spacer" />
          <text v-if="q.status === 'PENDING'" class="mq-countdown">{{ refundLeft(q) }} 小时内未回复自动退款</text>
          <text v-else-if="q.status === 'ANSWERED' && q.isPublic && q.peekCount" class="mq-gold">{{ q.peekCount }} 人围观</text>
          <text v-else-if="q.status === 'ANSWERED' && !q.isPublic" class="mq-foot-r">仅自己与达人可见</text>
          <text v-else-if="q.status !== 'ANSWERED'" class="mq-refund">{{ q.priceCoin }} 金币已退回钱包</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.mq-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 + 筛选 */
.mq-topbar {
  position: sticky; top: 0; z-index: 10;
  padding: 24rpx 32rpx 0;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.mq-topbar-row { display: flex; align-items: center; gap: 20rpx; }
.mq-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.mq-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.mq-filters { display: flex; gap: 16rpx; padding: 24rpx 0; }
.mq-filter { padding: 12rpx 28rpx; border-radius: 30rpx; background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.mq-filter.is-active { background: var(--text-primary, #2c2c2c); }
.mq-filter-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.mq-filter-t.is-active { color: #fff; font-weight: 500; }

/* 三态 */
.mq-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.mq-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.mq-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.mq-retry-t { font-size: 26rpx; color: #fff; }
.mq-skel { width: 100%; height: 220rpx; border-radius: 36rpx; background: #ede7dd; }

/* 问答条目 */
.mq-item {
  margin: 24rpx 32rpx 0; padding: 30rpx 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.mq-head { display: flex; align-items: center; gap: 16rpx; }
.mq-expert { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12rpx; }
.mq-expert-avatar { width: 44rpx; height: 44rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.mq-expert-img { width: 44rpx; height: 44rpx; border-radius: 999rpx; }
.mq-expert-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.mq-expert-name { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.mq-badge { flex-shrink: 0; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 20rpx; }
.mq-badge-answered { background: rgba(91, 138, 94, 0.1); color: #5b8a5e; }
.mq-badge-waiting { background: rgba(201, 123, 45, 0.1); color: #c97b2d; }
.mq-badge-declined { background: var(--bg-warm, #f8f4ec); color: var(--text-tertiary, #999); }
.mq-q {
  display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c);
  line-height: 1.6; margin-top: 20rpx;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.mq-foot {
  display: flex; align-items: center; gap: 12rpx;
  margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid var(--separator, #ede7dd);
}
.mq-foot-l { font-size: 22rpx; color: var(--text-tertiary, #999); }
.mq-foot-r { font-size: 22rpx; color: var(--text-tertiary, #999); }
.mq-spacer { flex: 1; }
.mq-gold { font-size: 22rpx; color: var(--gold, #c9a96e); font-weight: 600; }
.mq-refund { font-size: 22rpx; color: #5b8a5e; }
.mq-countdown { font-size: 22rpx; color: #c97b2d; }
</style>
