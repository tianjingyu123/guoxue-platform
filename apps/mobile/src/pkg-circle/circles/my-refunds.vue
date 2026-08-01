<script setup lang="ts">
/**
 * 我的退款 — V0 circle-refunds-my.html + circle-refunds-empty.html 还原（2026-07-10）
 * 结构：钱包卡（可提现余额·退款到账去处）→ 退款记录卡（金额+状态徽章+三节点双审进度轨+驳回原因）→ 空态。
 * 五种状态：圈主审核中 / 平台审核中 / 退款处理中 / 退款已到账 / 已驳回（圈主或平台）。
 * 数据：refundApi.myRefunds + wallet（真连 circle-refund 后端）。去提现 → /pkg-mine/wallet/withdraw。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { refundApi, type RefundRequestItem } from '@/lib/circle-refund-data'
import { circleApi, type MyCircle } from '@/lib/circle-data'
import { formatPrice } from '@/utils/format'

const list = ref<RefundRequestItem[]>([])
const eligibleCircles = ref<MyCircle[]>([])
const balance = ref(0)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [refunds, wallet, circles] = await Promise.all([
      refundApi.myRefunds(),
      refundApi.wallet(),
      circleApi.getMyCircles().catch(() => []),
    ])
    list.value = refunds
    balance.value = wallet.balance
    eligibleCircles.value = circles.filter((c) => c.role === 'member')
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

type BadgeKind = 'pending' | 'refunding' | 'done' | 'rejected'
interface StatusView {
  badge: BadgeKind
  label: string
  timeSub: string
  /** 三节点：done/active/fail/idle */
  nodes: { label: string; state: 'done' | 'active' | 'fail' | 'idle' }[]
  rejectReason: string
}

/** 状态映射：徽章 + 副说明 + 双审进度轨三节点 */
function statusView(it: RefundRequestItem): StatusView {
  if (it.refundStatus === 'refunded') {
    return {
      badge: 'done', label: '退款已到账', timeSub: '已退至可提现余额', rejectReason: '',
      nodes: [
        { label: '圈主已通过', state: 'done' },
        { label: '平台已通过', state: 'done' },
        { label: '已到账余额', state: 'done' },
      ],
    }
  }
  if (it.refundStatus === 'refunding') {
    return {
      badge: 'refunding', label: '退款处理中', timeSub: '双审已通过', rejectReason: '',
      nodes: [
        { label: '圈主已通过', state: 'done' },
        { label: '平台已通过', state: 'done' },
        { label: '处理中', state: 'active' },
      ],
    }
  }
  if (it.ownerStatus === 'rejected') {
    return {
      badge: 'rejected', label: '已驳回', timeSub: '圈主驳回', rejectReason: it.ownerRejectReason || '',
      nodes: [
        { label: '圈主驳回', state: 'fail' },
        { label: '平台审核', state: 'idle' },
        { label: '到账', state: 'idle' },
      ],
    }
  }
  if (it.adminStatus === 'rejected') {
    return {
      badge: 'rejected', label: '已驳回', timeSub: '平台驳回', rejectReason: it.adminRejectReason || '',
      nodes: [
        { label: '圈主已通过', state: 'done' },
        { label: '平台驳回', state: 'fail' },
        { label: '到账', state: 'idle' },
      ],
    }
  }
  if (it.ownerStatus === 'approved') {
    return {
      badge: 'pending', label: '平台审核中', timeSub: '圈主已通过', rejectReason: '',
      nodes: [
        { label: '圈主已通过', state: 'done' },
        { label: '平台审核', state: 'active' },
        { label: '到账', state: 'idle' },
      ],
    }
  }
  return {
    badge: 'pending', label: '圈主审核中', timeSub: '预计到账 ¥' + formatPrice(it.actualRefund), rejectReason: '',
    nodes: [
      { label: '圈主审核', state: 'active' },
      { label: '平台审核', state: 'idle' },
      { label: '到账', state: 'idle' },
    ],
  }
}

/** 相对时间「今天 / 昨天 / x天前 / M月D日」 */
function relTime(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const day = Math.floor((Date.now() - t) / 86400000)
  if (day < 1) return '今天'
  if (day === 1) return '昨天'
  if (day < 30) return `${day} 天前`
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function toWithdraw() { navigateTo('/pkg-mine/wallet/withdraw') }
function showRules() {
  uni.showModal({
    title: '退款规则',
    content: '虚拟内容服务一经使用不支持无理由退款；申请时按实际使用天数折算扣费，剩余金额收取 20% 手续费后退还；经圈主与平台两步审核，通过后退款到账你的可提现余额。',
    showCancel: false,
    confirmText: '我知道了',
    confirmColor: '#C41E3A',
  })
}

function chooseExitCircle() {
  if (!eligibleCircles.value.length) {
    uni.showToast({ title: '暂无可办理的圈子会员', icon: 'none' })
    return
  }
  if (eligibleCircles.value.length === 1) {
    navigateTo(`/pkg-circle/circles/exit?id=${eligibleCircles.value[0].id}`)
    return
  }
  uni.showActionSheet({
    itemList: eligibleCircles.value.map((c) => c.name.slice(0, 24)),
    success: (result) => {
      const circle = eligibleCircles.value[result.tapIndex]
      if (circle) navigateTo(`/pkg-circle/circles/exit?id=${circle.id}`)
    },
  })
}

onMounted(load)
</script>

<template>
  <view class="rf-page">
    <!-- 顶栏 -->
    <view class="rf-topbar">
      <view class="rf-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="rf-title">会员与售后</text>
    </view>

    <!-- 余额钱包：退款到账的去处（常驻） -->
    <view class="rf-wallet">
      <view class="rf-wallet-main">
        <text class="rf-wallet-label">可提现余额</text>
        <text class="rf-wallet-amount">¥{{ formatPrice(balance) }}</text>
      </view>
      <view class="rf-wallet-btn" @tap="toWithdraw"><text class="rf-wallet-btn-t">去提现</text></view>
    </view>
    <text class="rf-wallet-note">余额与提现由平台钱包统一管理，提现明细见个人中心。</text>

    <!-- 加载态 -->
    <view v-if="loading" class="rf-state">
      <view class="rf-skel" /><view class="rf-skel" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="rf-state center">
      <text class="rf-state-t">{{ error }}</text>
      <view class="rf-retry" @tap="load"><text class="rf-retry-t">重试</text></view>
    </view>
    <!-- 空态（V0 circle-refunds-empty） -->
    <view v-else-if="!list.length" class="rf-empty">
      <view class="rf-empty-icon"><app-icon name="credit-card" :size="56" color="#999999" /></view>
      <text class="rf-empty-title">暂无退款记录</text>
      <text class="rf-empty-sub">你在圈子里的每一笔付费都受保障。退款申请与处理进度会统一记录在这里。</text>
      <view class="rf-empty-btn" @tap="showRules"><text class="rf-empty-btn-t">查看退款规则</text></view>
    </view>

    <!-- 退款记录 -->
    <template v-else>
      <text class="rf-label">退款记录</text>
      <view v-for="it in list" :key="it.id" class="rf-refund">
        <view class="rf-head">
          <view class="rf-main">
            <text class="rf-name">{{ it.circleName }}</text>
            <text class="rf-time">{{ relTime(it.createdAt) }}提交 · {{ statusView(it).timeSub }}</text>
          </view>
          <view class="rf-amount">
            <text class="rf-amount-num">¥{{ formatPrice(it.actualRefund) }}</text>
            <text class="rf-badge" :class="statusView(it).badge">{{ statusView(it).label }}</text>
          </view>
        </view>

        <!-- 双审进度：三节点 -->
        <view class="rf-track">
          <template v-for="(n, i) in statusView(it).nodes" :key="i">
            <view v-if="i > 0" class="rf-track-line" />
            <view class="rf-node" :class="n.state">
              <view class="rf-node-dot" :class="n.state" />
              <text class="rf-node-t" :class="n.state">{{ n.label }}</text>
            </view>
          </template>
        </view>

        <!-- 驳回原因 -->
        <text v-if="statusView(it).rejectReason" class="rf-reject">
          <text class="rf-reject-b">驳回原因：</text>{{ statusView(it).rejectReason }}
        </text>
      </view>
      <view class="rf-bottom-pad" />
    </template>

    <!-- 退出与退款收敛到二级售后路径，避免圈子卡片快捷菜单误触 -->
    <view v-if="!loading && eligibleCircles.length" class="rf-member-care" @tap="chooseExitCircle">
      <view class="rf-member-care-copy">
        <text class="rf-member-care-title">其他会员事项</text>
        <text class="rf-member-care-sub">退出已加入的圈子</text>
      </view>
      <app-icon name="chevron-right" :size="28" color="#B7B1A8" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.rf-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 */
.rf-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.rf-back {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.rf-title { font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }

/* 钱包卡 */
.rf-wallet {
  margin: 16rpx 32rpx 0; padding: 32rpx 36rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; align-items: center; gap: 24rpx;
}
.rf-wallet-main { flex: 1; display: flex; flex-direction: column; }
.rf-wallet-label { font-size: 24rpx; color: var(--text-tertiary, #999); }
.rf-wallet-amount { font-size: 52rpx; font-weight: 700; color: var(--gold, #c9a96e); margin-top: 4rpx; }
.rf-wallet-btn {
  flex-shrink: 0; height: 68rpx; padding: 0 32rpx; border-radius: 34rpx;
  background: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: flex; align-items: center; justify-content: center;
}
.rf-wallet-btn:active { opacity: 0.85; }
.rf-wallet-btn-t { font-size: 26rpx; font-weight: 500; color: var(--brand, #c41e3a); }
.rf-wallet-note { display: block; margin: 16rpx 44rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); }

/* 三态 */
.rf-state { padding: 40rpx 32rpx; }
.rf-state.center { padding: 120rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.rf-skel { height: 220rpx; border-radius: 36rpx; background: #fff; margin-bottom: 24rpx; }
.rf-state-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.rf-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.rf-retry-t { font-size: 26rpx; color: #fff; }

/* 空态 */
.rf-empty { margin-top: 140rpx; padding: 0 80rpx; display: flex; flex-direction: column; align-items: center; }
.rf-empty-icon {
  width: 128rpx; height: 128rpx; border-radius: 40rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.rf-empty-title { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 36rpx; }
.rf-empty-sub { font-size: 26rpx; color: var(--text-tertiary, #999); margin-top: 12rpx; line-height: 1.7; text-align: center; }
.rf-empty-btn {
  margin-top: 40rpx; height: 80rpx; padding: 0 48rpx; border-radius: 40rpx;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; align-items: center; justify-content: center;
}
.rf-empty-btn-t { font-size: 28rpx; color: var(--text-secondary, #6e6e73); font-weight: 500; }

/* 退款条目 */
.rf-label { display: block; margin: 40rpx 40rpx 16rpx; font-size: 26rpx; color: var(--text-tertiary, #999); }
.rf-refund {
  margin: 0 32rpx 24rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 28rpx 32rpx;
}
.rf-head { display: flex; align-items: center; gap: 24rpx; }
.rf-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rf-name { font-size: 29rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.rf-time { font-size: 23rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.rf-amount { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; }
.rf-amount-num { font-size: 32rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.rf-badge {
  margin-top: 6rpx; padding: 4rpx 18rpx; border-radius: 22rpx;
  font-size: 22rpx; font-weight: 500;
}
.rf-badge.pending { background: rgba(201, 123, 45, 0.1); color: #c97b2d; }
.rf-badge.refunding { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); color: var(--brand, #c41e3a); }
.rf-badge.done { background: rgba(91, 138, 94, 0.1); color: #5b8a5e; }
.rf-badge.rejected { background: var(--bg-warm, #f8f4ec); color: var(--text-tertiary, #999); }

/* 双审进度轨 */
.rf-track {
  display: flex; align-items: center; gap: 16rpx;
  margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid var(--separator, #ede7dd);
}
.rf-node { display: flex; align-items: center; gap: 10rpx; flex-shrink: 0; }
.rf-node-dot { width: 14rpx; height: 14rpx; border-radius: 999rpx; background: var(--separator, #ede7dd); }
.rf-node-dot.done { background: #5b8a5e; }
.rf-node-dot.active { background: #c97b2d; }
.rf-node-dot.fail { background: var(--text-tertiary, #999); }
.rf-node-t { font-size: 23rpx; color: var(--text-tertiary, #999); }
.rf-node-t.done { color: #5b8a5e; }
.rf-node-t.active { color: #c97b2d; font-weight: 500; }
.rf-node-t.fail { color: var(--text-secondary, #6e6e73); }
.rf-track-line { flex: 1; height: 1rpx; background: var(--separator, #ede7dd); min-width: 24rpx; }

/* 驳回原因 */
.rf-reject {
  display: block; margin-top: 20rpx; padding: 20rpx 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 16rpx;
  font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6;
}
.rf-reject-b { font-weight: 600; color: var(--text-primary, #2c2c2c); }

.rf-bottom-pad { height: 40rpx; }

.rf-member-care {
  margin: 28rpx 40rpx 16rpx;
  padding: 24rpx 4rpx;
  border-top: 1rpx solid var(--separator, #ede7dd);
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.rf-member-care:active { opacity: 0.72; }
.rf-member-care-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.rf-member-care-title { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.rf-member-care-sub { font-size: 22rpx; color: var(--text-tertiary, #999); }
</style>
