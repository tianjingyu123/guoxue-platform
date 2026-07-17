<script setup lang="ts">
/**
 * 圈主管理后台 · 收益 — V0 circle-admin-revenue.html 还原（2026-07-10 批③）
 * 注：旧版整页为 mock 死数据（totalEarnings 285400 等），本次重写全部清除，真连后端。
 * 结构：收益总卡（本月/累计）→ 收入构成堆叠条 → 邀请码（统计+列表+生成）。
 * 数据：dashboardApi.revenue（GET /circle-backend/revenue·当月·含嘉宾分账后实得）+
 *      dashboardApi.revenueBreakdown(circleId)（全期 PAID·入圈费/课程/商品）+
 *      inviteApi（listCodes/getTotalInvited/generate）。
 * 降级（后端无来源）：V0"较上月 +18%"同比、"自 2023 年开圈"、逐笔收入明细（无明细端点）、
 *      "付费问答"构成分类（breakdown 无此项）、邀请码"免入圈费"文案（无该语义字段）→ 均不做。
 *      "本月收入构成"后端 breakdown 为全期口径无时间过滤 → 如实标"累计收入构成"。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack } from '@/utils/router'
import {
  dashboardApi,
  type DashboardRevenue,
  type RevenueBreakdownItem,
} from '@/lib/circle-dashboard-data'
import { inviteApi, type InviteCodeItem } from '@/lib/circle-invite-data'

const circleId = ref('')
const loading = ref(true)
const error = ref(false)

const revenue = ref<DashboardRevenue | null>(null)
const breakdown = ref<RevenueBreakdownItem[]>([])
const codes = ref<InviteCodeItem[]>([])
const totalInvited = ref(0)
const generating = ref(false)

const MIX_COLORS = ['#C9A96E', '#D4B87D', '#B7A99A', '#D9CDBB']

const breakdownTotal = computed(() => breakdown.value.reduce((s, b) => s + b.amount, 0))
/** 构成条分段（占比宽度·仅有金额的分类） */
const mixSegs = computed(() => {
  const total = breakdownTotal.value
  if (total <= 0) return []
  return breakdown.value
    .map((b, i) => ({ ...b, color: MIX_COLORS[i % MIX_COLORS.length], percent: (b.amount / total) * 100 }))
    .filter((b) => b.amount > 0)
})

const usedCodes = computed(() => codes.value.filter((c) => c.status === 'used' || (c.maxUses > 0 && c.usedCount >= c.maxUses)).length)
const openCodes = computed(() => codes.value.filter((c) => c.status === 'active').length)

function money(n: number) {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`
}
function codeStatusLabel(c: InviteCodeItem) {
  if (c.status === 'expired') return '已过期'
  if (c.status === 'used') return '已使用'
  return '待使用'
}

async function load() {
  loading.value = true
  error.value = false
  try {
    // 收益总卡是页面主体，失败走 error 态
    revenue.value = await dashboardApi.revenue()
    // 其余区块并行拉取，单块失败降级为空
    const [bRes, cRes, iRes] = await Promise.allSettled([
      dashboardApi.revenueBreakdown(circleId.value),
      inviteApi.listCodes(circleId.value),
      inviteApi.getTotalInvited(circleId.value),
    ])
    breakdown.value = bRes.status === 'fulfilled' ? bRes.value : []
    codes.value = cRes.status === 'fulfilled' ? cRes.value : []
    totalInvited.value = iRes.status === 'fulfilled' ? iRes.value : 0
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function generate() {
  if (generating.value) return
  generating.value = true
  try {
    await inviteApi.generate(circleId.value, 1)
    uni.showToast({ title: '邀请码已生成', icon: 'success' })
    codes.value = await inviteApi.listCodes(circleId.value)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败', icon: 'none' })
  } finally {
    generating.value = false
  }
}

function copyCode(c: InviteCodeItem) {
  uni.setClipboardData({
    data: c.code,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
}

onLoad((q) => {
  circleId.value = q?.id || q?.circleId || ''
  load()
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="topbar-title">收益</text>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="state-view"><AppLoading /></view>
    <view v-else-if="error || !revenue" class="state-view">
      <app-icon name="alert-circle" :size="64" color="#C9A96E" />
      <text class="state-desc">加载失败（需圈主身份访问）</text>
      <view class="state-btn" @tap="load"><text class="state-btn-txt">重试</text></view>
    </view>

    <scroll-view v-else scroll-y class="body">
      <!-- 收益总卡：本月 / 累计 -->
      <view class="hero">
        <view class="hero-row">
          <view class="hero-col">
            <text class="hero-label">本月收入{{ revenue.period ? `（${revenue.period}）` : '' }}</text>
            <text class="hero-num">¥{{ money(revenue.totalAmount) }}</text>
            <text class="hero-sub">嘉宾分账后实得 ¥{{ money(revenue.ownerRevenue) }}</text>
          </view>
          <view class="hero-col with-divider">
            <text class="hero-label">累计收入</text>
            <text class="hero-num plain">¥{{ money(breakdownTotal) }}</text>
            <text class="hero-sub">本月成交 {{ revenue.totalTransactions }} 笔</text>
          </view>
        </view>
      </view>

      <!-- 收入构成（后端 breakdown 为全期口径 → 如实标"累计"） -->
      <template v-if="mixSegs.length">
        <text class="section-label">累计收入构成</text>
        <view class="mix-card">
          <view class="mix-bar">
            <view
              v-for="s in mixSegs" :key="s.type"
              class="mix-seg" :style="{ width: s.percent + '%', background: s.color }"
            />
          </view>
          <view class="mix-legend">
            <view v-for="s in mixSegs" :key="s.type" class="mix-item">
              <view class="mix-dot" :style="{ background: s.color }" />
              <text class="mix-label">{{ s.label }}</text>
              <text class="mix-amt">¥{{ money(s.amount) }}</text>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <text class="section-label">收入构成</text>
        <view class="empty-card">
          <text class="empty-txt">还没有收入记录。开启付费入圈、发布课程或上架商品后，收入构成会在这里展示</text>
        </view>
      </template>

      <!-- 邀请码 -->
      <text class="section-label">邀请码</text>
      <view class="invite-stats">
        <view class="invite-stat"><text class="invite-n">{{ codes.length }}</text><text class="invite-t">总数</text></view>
        <view class="invite-stat"><text class="invite-n">{{ usedCodes }}</text><text class="invite-t">已使用</text></view>
        <view class="invite-stat"><text class="invite-n">{{ openCodes }}</text><text class="invite-t">待使用</text></view>
        <view class="invite-stat"><text class="invite-n">{{ totalInvited }}</text><text class="invite-t">邀请人数</text></view>
      </view>
      <view v-if="codes.length" class="invite-list">
        <view v-for="c in codes" :key="c.id" class="invite-row">
          <view class="invite-main">
            <text class="invite-code">{{ c.code }}</text>
            <text class="invite-meta">{{ fmtDate(c.createdAt) }}生成{{ c.maxUses ? ` · 限 ${c.maxUses} 次` : '' }}{{ c.usedCount ? ` · 已用 ${c.usedCount} 次` : '' }}</text>
          </view>
          <text class="invite-state" :class="c.status === 'active' ? 'open' : 'used'">{{ codeStatusLabel(c) }}</text>
          <view class="invite-copy" @tap="copyCode(c)"><text class="invite-copy-txt">复制</text></view>
        </view>
      </view>
      <view class="gen-btn" :class="{ disabled: generating }" @tap="generate">
        <app-icon name="plus" :size="26" color="#FFFFFF" />
        <text class="gen-btn-txt">{{ generating ? '生成中…' : '生成邀请码' }}</text>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 28rpx 32rpx 20rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 28rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.back-btn { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }

.body { flex: 1; }

/* 收益总卡 */
.hero {
  margin: 16rpx 32rpx 0; padding: 40rpx 36rpx;
  background: var(--bg-card, #ffffff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.hero-row { display: flex; }
.hero-col { flex: 1; min-width: 0; }
.hero-col.with-divider { border-left: 1rpx solid var(--separator, #ede7dd); padding-left: 36rpx; }
.hero-label { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); }
.hero-num { display: block; font-size: 52rpx; font-weight: 700; color: var(--gold, #c9a96e); margin-top: 8rpx; letter-spacing: -1rpx; }
.hero-num.plain { color: var(--text-primary, #2c2c2c); font-size: 40rpx; }
.hero-sub { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; }

/* 分区标题 */
.section-label { display: block; margin: 44rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999999); }

/* 收入构成 */
.mix-card {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 32rpx;
}
.mix-bar { display: flex; height: 20rpx; border-radius: 10rpx; overflow: hidden; }
.mix-seg { height: 100%; }
.mix-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx 32rpx; margin-top: 28rpx; }
.mix-item { display: flex; align-items: center; gap: 14rpx; }
.mix-dot { width: 16rpx; height: 16rpx; border-radius: 6rpx; flex-shrink: 0; }
.mix-label { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.mix-amt { margin-left: auto; font-size: 24rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

/* 空构成 */
.empty-card {
  margin: 0 32rpx; padding: 48rpx 40rpx;
  background: var(--bg-card, #ffffff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; justify-content: center;
}
.empty-txt { font-size: 24rpx; color: var(--text-tertiary, #999999); text-align: center; line-height: 1.7; }

/* 邀请码统计 */
.invite-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; margin: 0 32rpx; }
.invite-stat {
  background: var(--bg-card, #ffffff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 22rpx 8rpx;
  display: flex; flex-direction: column; align-items: center;
}
.invite-n { font-size: 36rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.invite-t { font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; }

/* 邀请码列表 */
.invite-list {
  margin: 20rpx 32rpx 0; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.invite-row { display: flex; align-items: center; gap: 24rpx; padding: 26rpx 32rpx; }
.invite-row + .invite-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.invite-main { flex: 1; min-width: 0; }
.invite-code { display: block; font-size: 28rpx; font-weight: 600; letter-spacing: 2rpx; color: var(--text-primary, #2c2c2c); font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
.invite-meta { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.invite-state { font-size: 24rpx; flex-shrink: 0; }
.invite-state.used { color: var(--text-tertiary, #999999); }
.invite-state.open { color: #5b8a5e; }
.invite-copy {
  flex-shrink: 0; height: 56rpx; padding: 0 24rpx; border-radius: 28rpx;
  background: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: flex; align-items: center;
}
.invite-copy:active { opacity: 0.8; }
.invite-copy-txt { font-size: 24rpx; font-weight: 500; color: var(--brand, #c41e3a); }

/* 生成按钮 */
.gen-btn {
  margin: 24rpx 32rpx 0; height: 88rpx; border-radius: 44rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
}
.gen-btn.disabled { opacity: 0.6; }
.gen-btn:active { opacity: 0.85; }
.gen-btn-txt { color: #ffffff; font-size: 30rpx; font-weight: 600; letter-spacing: 2rpx; }

/* 三态 */
.state-view { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; padding: 160rpx 80rpx; }
.state-desc { font-size: 26rpx; color: var(--text-tertiary, #999999); text-align: center; }
.state-btn { margin-top: 24rpx; height: 72rpx; padding: 0 48rpx; border-radius: 36rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.state-btn-txt { color: #ffffff; font-size: 26rpx; font-weight: 500; }

.safe-bottom { height: 60rpx; }
</style>
