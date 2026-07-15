<script setup lang="ts">
/**
 * 圈主管理后台 · 审核（加入申请 + 退款初审）— V0 circle-admin-review.html 还原（2026-07-10 批③）
 * 类型双 Tab（加入申请/退款申请·带计数徽章）× 状态双 Tab（待审核/已处理）。
 * 数据：加入申请 growthApi.joinRequests/reviewJoinRequest（拒绝理由 rejectReason 后端已有）；
 *      退款初审 refundApi.ownerPending/ownerReview（金额核算 paidAmount/usedDays/feeAmount/actualRefund 全为后端真实字段）。
 * 降级：申请人画像（平台注册时长/加入过 N 个圈子）后端无字段 → 仅申请时间+等待天数；
 *      退款"已处理"列表后端仅有 owner-pending 端点 → 退款 Tab 只展示待审，已处理提示去「我的圈子退款」台账无从圈主侧查——显示说明文案。
 * 入口：dashboard 待办/分区（?id=xxx&type=refund 直达退款 Tab）。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { growthApi, type JoinRequestItem } from '@/lib/circle-growth-data'
import { refundApi, type RefundRequestItem } from '@/lib/circle-refund-data'

type ReviewType = 'join' | 'refund'
type StateTab = 'pending' | 'processed'

const circleId = ref('')
const activeType = ref<ReviewType>('join')
const stateTab = ref<StateTab>('pending')

const loading = ref(true)
const loadError = ref(false)
const joinRequests = ref<JoinRequestItem[]>([])
const refunds = ref<RefundRequestItem[]>([])
const submittingId = ref<string | null>(null)

// 拒绝理由弹层（加入申请与退款共用）
const rejectState = ref<{ type: ReviewType; id: string; name: string } | null>(null)
const rejectReason = ref('')

const pendingJoin = computed(() => joinRequests.value.filter((r) => r.status === 'PENDING'))
const processedJoin = computed(() => joinRequests.value.filter((r) => r.status !== 'PENDING'))
const pendingRefunds = computed(() => refunds.value.filter((r) => r.ownerStatus === 'pending'))

async function load() {
  if (!circleId.value) { loading.value = false; loadError.value = true; return }
  loading.value = true
  loadError.value = false
  try {
    const [jRes, rRes] = await Promise.allSettled([
      growthApi.joinRequests(circleId.value),
      refundApi.ownerPending(),
    ])
    if (jRes.status === 'rejected') throw new Error('load failed')
    joinRequests.value = jRes.value
    refunds.value = rRes.status === 'fulfilled' ? rRes.value.filter((r) => r.circleId === circleId.value) : []
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// ─── 加入申请审批 ───
async function approveJoin(r: JoinRequestItem) {
  if (submittingId.value) return
  submittingId.value = r.id
  try {
    await growthApi.reviewJoinRequest(circleId.value, r.id, 'approve')
    uni.showToast({ title: '已通过', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submittingId.value = null
  }
}

// ─── 退款初审 ───
async function approveRefund(r: RefundRequestItem) {
  if (submittingId.value) return
  submittingId.value = r.id
  try {
    await refundApi.ownerReview(r.id, true)
    uni.showToast({ title: '已通过，转平台复核', icon: 'none' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submittingId.value = null
  }
}

// ─── 拒绝（弹层填理由） ───
function openReject(type: ReviewType, id: string, name: string) {
  rejectReason.value = ''
  rejectState.value = { type, id, name }
}

async function submitReject() {
  const s = rejectState.value
  if (!s || submittingId.value) return
  const reason = rejectReason.value.trim()
  if (s.type === 'refund' && !reason) {
    uni.showToast({ title: '拒绝退款需填写理由', icon: 'none' })
    return
  }
  submittingId.value = s.id
  try {
    if (s.type === 'join') {
      await growthApi.reviewJoinRequest(circleId.value, s.id, 'reject', reason || undefined)
    } else {
      await refundApi.ownerReview(s.id, false, reason)
    }
    uni.showToast({ title: '已拒绝', icon: 'none' })
    rejectState.value = null
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submittingId.value = null
  }
}

// ─── 工具 ───
function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`
}
function waitDays(iso: string): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(Math.floor((Date.now() - t) / 86400000), 0)
}
function money(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onLoad((q) => {
  circleId.value = q?.id || q?.circleId || ''
  if (q?.type === 'refund') activeType.value = 'refund'
  load()
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="topbar-title">审核</text>
    </view>

    <!-- 类型切换 -->
    <view class="type-tabs">
      <view class="type-tab" :class="{ active: activeType === 'join' }" @tap="activeType = 'join'">
        <text class="type-tab-txt">加入申请</text>
        <view v-if="pendingJoin.length" class="n"><text class="n-txt">{{ pendingJoin.length }}</text></view>
      </view>
      <view class="type-tab" :class="{ active: activeType === 'refund' }" @tap="activeType = 'refund'">
        <text class="type-tab-txt">退款申请</text>
        <view v-if="pendingRefunds.length" class="n"><text class="n-txt">{{ pendingRefunds.length }}</text></view>
      </view>
    </view>

    <!-- 状态切换（退款仅有待审端点 → 只在加入申请下展示） -->
    <view v-if="activeType === 'join'" class="state-tabs">
      <view class="state-tab" :class="{ active: stateTab === 'pending' }" @tap="stateTab = 'pending'">
        <text class="state-tab-txt">待审核</text>
      </view>
      <view class="state-tab" :class="{ active: stateTab === 'processed' }" @tap="stateTab = 'processed'">
        <text class="state-tab-txt">已处理</text>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 三态 -->
      <view v-if="loading" class="state-view"><app-icon name="loader" :size="56" color="#C41E3A" class="spin" /><text class="state-desc">加载中…</text></view>
      <view v-else-if="loadError" class="state-view">
        <app-icon name="alert-circle" :size="64" color="#C9A96E" />
        <text class="state-desc">加载失败（需圈主身份访问）</text>
        <view class="state-btn" @tap="load"><text class="state-btn-txt">重试</text></view>
      </view>

      <!-- ═══ 加入申请 ═══ -->
      <template v-else-if="activeType === 'join'">
        <!-- 待审核 -->
        <template v-if="stateTab === 'pending'">
          <view v-if="!pendingJoin.length" class="state-view">
            <app-icon name="check" :size="64" color="#5B8A5E" />
            <text class="state-title">暂无待审申请</text>
            <text class="state-desc">新的加入申请会出现在这里</text>
          </view>
          <view v-for="r in pendingJoin" :key="r.id" class="card">
            <view class="applicant">
              <view class="avatar-wrap">
                <image v-if="r.userAvatar" lazy-load :src="r.userAvatar" class="avatar" mode="aspectFill" />
                <view v-else class="avatar avatar-fallback"><app-icon name="user" :size="36" color="#999999" /></view>
              </view>
              <view class="applicant-main">
                <text class="applicant-name">{{ r.userNickname }}</text>
                <text class="applicant-meta">{{ fmtDate(r.createdAt) }}申请</text>
              </view>
              <view v-if="waitDays(r.createdAt) > 0" class="wait-tag"><text class="wait-tag-txt">已等待 {{ waitDays(r.createdAt) }} 天</text></view>
            </view>
            <view class="reason"><text class="reason-txt">申请理由：{{ r.message || '（未填写）' }}</text></view>
            <view class="actions">
              <view class="btn reject" @tap="openReject('join', r.id, r.userNickname)"><text class="btn-txt reject-txt">拒绝</text></view>
              <view class="btn approve" :class="{ disabled: submittingId === r.id }" @tap="approveJoin(r)">
                <text class="btn-txt approve-txt">{{ submittingId === r.id ? '处理中…' : '通过' }}</text>
              </view>
            </view>
          </view>
        </template>

        <!-- 已处理 -->
        <template v-else>
          <view v-if="!processedJoin.length" class="state-view">
            <app-icon name="file-text" :size="64" color="#CCCCCC" />
            <text class="state-desc">还没有已处理的申请</text>
          </view>
          <view v-for="r in processedJoin" :key="r.id" class="done-row">
            <view class="avatar-wrap">
              <image v-if="r.userAvatar" lazy-load :src="r.userAvatar" class="avatar" mode="aspectFill" />
              <view v-else class="avatar avatar-fallback"><app-icon name="user" :size="36" color="#999999" /></view>
            </view>
            <view class="done-main">
              <text class="done-name">{{ r.userNickname }} · 加入申请</text>
              <text class="done-meta">
                {{ r.reviewedAt ? fmtDate(r.reviewedAt) + '处理' : '' }}<template v-if="r.status === 'REJECTED' && r.rejectReason"> · 理由：{{ r.rejectReason }}</template>
              </text>
            </view>
            <text class="done-state" :class="r.status === 'APPROVED' ? 'ok' : 'no'">
              {{ r.status === 'APPROVED' ? '已通过' : '已拒绝' }}
            </text>
          </view>
        </template>
      </template>

      <!-- ═══ 退款初审 ═══ -->
      <template v-else>
        <view v-if="!pendingRefunds.length" class="state-view">
          <app-icon name="check" :size="64" color="#5B8A5E" />
          <text class="state-title">暂无待审退款</text>
          <text class="state-desc">成员发起退款申请后会在这里等待你初审</text>
        </view>
        <view v-for="r in pendingRefunds" :key="r.id" class="card">
          <view class="applicant">
            <view class="avatar-wrap">
              <image v-if="r.userAvatar" lazy-load :src="r.userAvatar" class="avatar" mode="aspectFill" />
              <view v-else class="avatar avatar-fallback"><app-icon name="user" :size="36" color="#999999" /></view>
            </view>
            <view class="applicant-main">
              <text class="applicant-name">{{ r.userNickname }} · 退款申请</text>
              <text class="applicant-meta">{{ fmtDate(r.createdAt) }}申请 · 已加入 {{ r.usedDays }} 天</text>
            </view>
            <view class="wait-tag"><text class="wait-tag-txt">待你初审</text></view>
          </view>
          <view v-if="r.reason" class="reason"><text class="reason-txt">退款原因：{{ r.reason }}</text></view>
          <!-- 金额核算（全为后端真实字段） -->
          <view class="calc">
            <view class="calc-row"><text class="calc-k">已付金额</text><text class="calc-v">¥{{ money(r.paidAmount) }}</text></view>
            <view class="calc-row"><text class="calc-k">已使用 {{ r.usedDays }} 天扣减</text><text class="calc-v">−¥{{ money(r.dailyCost * r.usedDays) }}</text></view>
            <view class="calc-row"><text class="calc-k">手续费</text><text class="calc-v">−¥{{ money(r.feeAmount) }}</text></view>
            <view class="calc-row total"><text class="calc-k total-k">拟退金额</text><text class="calc-v total-v">¥{{ money(r.actualRefund) }}</text></view>
          </view>
          <text class="calc-note">你初审通过后将提交平台复核，复核通过退到成员钱包余额。拒绝需填写理由。</text>
          <view class="actions">
            <view class="btn reject" @tap="openReject('refund', r.id, r.userNickname)"><text class="btn-txt reject-txt">拒绝（填写理由）</text></view>
            <view class="btn approve" :class="{ disabled: submittingId === r.id }" @tap="approveRefund(r)">
              <text class="btn-txt approve-txt">{{ submittingId === r.id ? '处理中…' : '通过初审' }}</text>
            </view>
          </view>
        </view>
        <text v-if="pendingRefunds.length" class="foot-note">已处理的退款去向与进度，成员可在「我的圈子退款」查看</text>
      </template>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 拒绝理由弹层 -->
    <view v-if="rejectState" class="mask" @tap="rejectState = null">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">拒绝{{ rejectState.type === 'join' ? '加入申请' : '退款申请' }}</text>
        <text class="sheet-desc">「{{ rejectState.name }}」将看到你的拒绝理由{{ rejectState.type === 'join' ? '（可不填）' : '' }}</text>
        <textarea
          v-model="rejectReason" class="sheet-input" auto-height
          :placeholder="rejectState.type === 'join' ? '例如：建议先关注公开内容，熟悉后再申请' : '请填写拒绝理由（必填）'"
          placeholder-class="ph" maxlength="200"
        />
        <view class="sheet-btns">
          <view class="btn reject" @tap="rejectState = null"><text class="btn-txt reject-txt">取消</text></view>
          <view class="btn approve" :class="{ disabled: !!submittingId }" @tap="submitReject">
            <text class="btn-txt approve-txt">{{ submittingId ? '提交中…' : '确认拒绝' }}</text>
          </view>
        </view>
      </view>
    </view>
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

/* 类型双 Tab */
.type-tabs { display: flex; gap: 16rpx; margin: 8rpx 32rpx 0; }
.type-tab {
  flex: 1; height: 72rpx; border-radius: 36rpx;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  background: var(--bg-card, #ffffff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.type-tab.active { background: var(--text-primary, #2c2c2c); }
.type-tab-txt { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.type-tab.active .type-tab-txt { color: #ffffff; font-weight: 500; }
.n {
  min-width: 36rpx; height: 36rpx; padding: 0 10rpx; border-radius: 18rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.n-txt { color: #ffffff; font-size: 22rpx; font-weight: 600; }

/* 状态双 Tab */
.state-tabs { display: flex; gap: 40rpx; margin: 36rpx 40rpx 0; border-bottom: 1rpx solid var(--separator, #ede7dd); }
.state-tab { padding-bottom: 20rpx; position: relative; }
.state-tab-txt { font-size: 28rpx; color: var(--text-tertiary, #999999); }
.state-tab.active .state-tab-txt { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.state-tab.active::after {
  content: ""; position: absolute; left: 50%; transform: translateX(-50%);
  bottom: 0; width: 40rpx; height: 5rpx; border-radius: 4rpx; background: var(--brand, #c41e3a);
}

.body { flex: 1; }

/* 审核卡片 */
.card {
  margin: 24rpx 32rpx 0; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 32rpx;
}
.applicant { display: flex; align-items: center; gap: 24rpx; }
.avatar-wrap {
  width: 84rpx; height: 84rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0;
  box-shadow: 0 0 0 1rpx var(--separator, #ede7dd);
}
.avatar { width: 100%; height: 100%; }
.avatar-fallback { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.applicant-main { flex: 1; min-width: 0; }
.applicant-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.applicant-meta { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.wait-tag {
  flex-shrink: 0; padding: 6rpx 16rpx; border-radius: 12rpx;
  background: rgba(201, 123, 45, 0.09);
}
.wait-tag-txt { font-size: 22rpx; color: #c97b2d; }
.reason {
  margin-top: 24rpx; padding: 22rpx 26rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 16rpx;
}
.reason-txt { font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }
.actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.btn {
  flex: 1; height: 76rpx; border-radius: 38rpx;
  display: flex; align-items: center; justify-content: center;
}
.btn:active { opacity: 0.85; }
.btn.disabled { opacity: 0.6; }
.btn.approve { background: var(--brand, #c41e3a); }
.btn.reject { background: var(--bg-warm, #f8f4ec); }
.btn-txt { font-size: 28rpx; font-weight: 500; }
.approve-txt { color: #ffffff; }
.reject-txt { color: var(--text-secondary, #6e6e73); }

/* 退款金额核算 */
.calc { margin-top: 24rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.calc-row { display: flex; justify-content: space-between; padding: 18rpx 0; }
.calc-row + .calc-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.calc-k { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.calc-v { font-size: 26rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.calc-row.total { background: var(--bg-warm, #f8f4ec); margin: 0 -32rpx; padding: 22rpx 32rpx; }
.total-k { color: var(--text-primary, #2c2c2c); }
.total-v { color: var(--gold, #c9a96e); font-weight: 700; font-size: 32rpx; }
.calc-note { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 20rpx; line-height: 1.6; }
.foot-note { display: block; margin: 24rpx 40rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999999); text-align: center; line-height: 1.6; }

/* 已处理行 */
.done-row {
  margin: 24rpx 32rpx 0; background: var(--bg-card, #ffffff);
  border-radius: 28rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 26rpx 32rpx; display: flex; align-items: center; gap: 24rpx;
}
.done-main { flex: 1; min-width: 0; }
.done-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.done-meta { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.done-state { font-size: 24rpx; font-weight: 500; flex-shrink: 0; }
.done-state.ok { color: #5b8a5e; }
.done-state.no { color: var(--text-tertiary, #999999); }

/* 三态 */
.state-view { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; padding: 120rpx 80rpx; }
.state-title { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 8rpx; }
.state-desc { font-size: 26rpx; color: var(--text-tertiary, #999999); text-align: center; }
.state-btn { margin-top: 24rpx; height: 72rpx; padding: 0 48rpx; border-radius: 36rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.state-btn-txt { color: #ffffff; font-size: 26rpx; font-weight: 500; }
.spin { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 拒绝理由弹层 */
.mask {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(44, 44, 44, 0.45);
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; background: #ffffff; border-radius: 36rpx 36rpx 0 0;
  padding: 44rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box;
}
.sheet-title { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.sheet-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 8rpx; }
.sheet-input {
  width: 100%; min-height: 144rpx; margin-top: 24rpx; padding: 22rpx 26rpx; box-sizing: border-box;
  border: 1rpx solid var(--separator, #ede7dd); border-radius: 16rpx;
  background: var(--bg-page, #faf8f5); font-size: 28rpx; line-height: 1.7;
  color: var(--text-primary, #2c2c2c);
}
.ph { color: var(--text-tertiary, #999999); }
.sheet-btns { display: flex; gap: 20rpx; margin-top: 32rpx; }

.safe-bottom { height: 60rpx; }
</style>
