<script setup lang="ts">
/**
 * 退出圈子 — V0 circle-exit-guide.html（引导步）+ circle-refund-apply.html（申请步）还原（2026-07-10）
 * 引导步：会员信息卡 → 退出后你将失去（如实告知） → 会保留的 → 退款规则卡 → 底部挽留优先（继续使用 / 仍要申请退款）
 * 申请步：金额测算逐行算式（资金可信关键·后端 preview 实时计算） → 申请原因（快捷标签+补充说明） → 双审三步流程 → 吸底提交（到账金额复述）
 * 数据：circleDetailApi.detail/getJoinStatus（会员信息）+ refundApi.preview/apply（真连 circle-refund 后端）。
 * 降级：无独立「重新加入需再次付费」价格保留字段→按规则文案说明；申请原因后端只收 reason 字符串→快捷标签拼入 reason 提交。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { goBack, navigateTo } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { circleDetailApi, type CircleDetail } from '@/lib/circle-detail-data'
import { refundApi, type RefundPreview } from '@/lib/circle-refund-data'

const circleId = ref('')
const step = ref<'guide' | 'apply'>('guide')
const submitted = ref(false)

// ── 引导步：会员信息 ──
const circle = ref<CircleDetail | null>(null)
const joinedAt = ref<string | null>(null)
const expireAt = ref<string | null>(null)
const infoLoading = ref(true)

const usedDays = computed(() => {
  if (!joinedAt.value) return 0
  const t = new Date(joinedAt.value).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(1, Math.floor((Date.now() - t) / 86400000))
})
const remainingDays = computed(() => {
  if (!expireAt.value) return 0
  const t = new Date(expireAt.value).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000))
})
const memberSub = computed(() => {
  const c = circle.value
  if (!c) return ''
  const kind = c.type === 'YEARLY' ? '年费会员' : '付费会员'
  const parts = [kind]
  if (joinedAt.value) parts.push(`已使用 ${usedDays.value} 天`)
  return parts.join(' · ')
})

async function loadInfo() {
  infoLoading.value = true
  try {
    const [c, st] = await Promise.all([
      circleDetailApi.detail(circleId.value),
      circleDetailApi.getJoinStatus(circleId.value),
    ])
    circle.value = c
    joinedAt.value = st.joinedAt
    expireAt.value = st.expireAt
  } catch { /* 信息卡加载失败不阻断流程，仅少展示 */ }
  finally { infoLoading.value = false }
}

// ── 申请步：金额测算 + 提交 ──
const loading = ref(false)
const error = ref('')
const preview = ref<RefundPreview | null>(null)
const reasonChips = ['内容不符合预期', '时间不够用', '误购', '其他']
const selectedChip = ref('')
const reasonText = ref('')
const submitting = ref(false)

function errMsg(e: unknown): string {
  const x = e as { message?: string; data?: { message?: string } }
  return x?.message || x?.data?.message || ''
}

async function goApply() {
  step.value = 'apply'
  loading.value = true
  error.value = ''
  preview.value = null
  try {
    preview.value = await refundApi.preview(circleId.value)
  } catch (e) {
    error.value = errMsg(e) || '当前无法申请退款'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (submitting.value || !preview.value) return
  submitting.value = true
  try {
    const reason = [selectedChip.value, reasonText.value.trim()].filter(Boolean).join('：')
    await refundApi.apply(circleId.value, reason || undefined)
    submitted.value = true
  } catch (e) {
    uni.showToast({ title: errMsg(e) || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function fmt(n: number) { return n.toLocaleString() }

onLoad((opt) => {
  circleId.value = (opt?.id || opt?.circleId || '') as string
  loadInfo()
})
</script>

<template>
  <!-- 提交成功页 -->
  <view v-if="submitted" class="ex-success">
    <view class="ex-success-icon"><app-icon name="check-circle" :size="44" color="#5B8A5E" /></view>
    <text class="ex-success-title">退款申请已提交</text>
    <text class="ex-success-desc">将经过「圈主审核 → 平台审核」两步，通过后退款到账你的可提现余额。可在「我的退款」中随时查看进度。</text>
    <view class="ex-success-actions">
      <view class="ex-sa-primary" @tap="navigateTo('/pkg-circle/circles/my-refunds')"><text class="ex-sa-primary-t">查看我的退款</text></view>
      <view class="ex-sa-plain" @tap="goBack"><text class="ex-sa-plain-t">返回</text></view>
    </view>
  </view>

  <view v-else class="ex-page">
    <!-- 顶栏 -->
    <view class="ex-topbar">
      <view class="ex-back" @tap="step === 'apply' ? (step = 'guide') : goBack()">
        <app-icon name="chevron-left" :size="32" color="#2C2C2C" />
      </view>
      <text class="ex-title">{{ step === 'guide' ? '退出圈子' : '申请退款' }}</text>
    </view>

    <!-- ════ 引导步（V0 circle-exit-guide）════ -->
    <template v-if="step === 'guide'">
      <!-- 会员信息卡 -->
      <view v-if="circle" class="ex-member-card">
        <view class="ex-member-cover">
          <smart-cover class="ex-member-cover-img" :src="circle.cover" :title="circle.name" type="circle" />
        </view>
        <view class="ex-member-main">
          <text class="ex-member-name">{{ circle.name }}</text>
          <text class="ex-member-sub">
            {{ memberSub }}<template v-if="remainingDays"> · 剩余 <text class="ex-member-b">{{ remainingDays }} 天</text></template>
          </text>
        </view>
      </view>
      <view v-else-if="infoLoading" class="ex-member-card skeleton" />

      <!-- 失去的权益：如实告知，不夸大 -->
      <text class="ex-label">退出后你将失去</text>
      <view class="ex-lose-list">
        <view class="ex-lose-item">
          <view class="ex-lose-icon"><app-icon name="x-circle" :size="30" color="#999999" /></view>
          <view class="ex-lose-main">
            <text class="ex-lose-title">成员身份即刻取消</text>
            <text class="ex-lose-desc">圈内{{ circle ? ` ${fmt(circle.posts)} 条` : '' }}内容、直播与回放不再可见</text>
          </view>
        </view>
        <view class="ex-lose-item">
          <view class="ex-lose-icon"><app-icon name="x-circle" :size="30" color="#999999" /></view>
          <view class="ex-lose-main">
            <text class="ex-lose-title">{{ remainingDays ? `剩余 ${remainingDays} 天会员权益终止` : '会员权益同步终止' }}</text>
            <text class="ex-lose-desc">课程会员价、答疑优先响应同步失效</text>
          </view>
        </view>
        <view class="ex-lose-item">
          <view class="ex-lose-icon"><app-icon name="x-circle" :size="30" color="#999999" /></view>
          <view class="ex-lose-main">
            <text class="ex-lose-title">重新加入需再次付费</text>
            <text class="ex-lose-desc">届时按当时价格购买，优惠不保留</text>
          </view>
        </view>
      </view>
      <text class="ex-keep-note"><text class="ex-keep-b">会保留的：</text>你发布的帖子与评论仍会留在圈内（署名不变），你的提问与已购课程记录可在「圈子·我的」中查看。</text>

      <!-- 退款规则：清晰不吓人 -->
      <text class="ex-label">退款规则</text>
      <view class="ex-rule-card">
        <text class="ex-rule-title">虚拟内容服务一经使用，不支持无理由退款</text>
        <view class="ex-rule-list">
          <text class="ex-rule-li">· 申请退款时，按<text class="ex-rule-b">实际使用天数</text>折算扣除已使用部分费用</text>
          <text class="ex-rule-li">· 剩余金额收取 <text class="ex-rule-b">20% 手续费</text>后退还</text>
          <text class="ex-rule-li">· 提交后经<text class="ex-rule-b">圈主审核 → 平台审核</text>两步，退款到账你的可提现余额</text>
          <text class="ex-rule-li">· 下一步会展示你的<text class="ex-rule-b">具体可退金额</text>，确认后再提交</text>
        </view>
      </view>

      <!-- 底部：挽留优先，退款不阻断 -->
      <view class="ex-exit-bar">
        <view class="ex-stay-btn" @tap="goBack"><text class="ex-stay-btn-t">继续使用会员权益</text></view>
        <view class="ex-refund-link" @tap="goApply"><text class="ex-refund-link-t">仍要申请退款</text></view>
      </view>
    </template>

    <!-- ════ 申请步（V0 circle-refund-apply）════ -->
    <template v-else>
      <!-- 加载 -->
      <view v-if="loading" class="ex-state"><text class="ex-state-t">正在实时测算退款金额…</text></view>
      <!-- 不可退/错误 -->
      <view v-else-if="error" class="ex-state">
        <app-icon name="info" :size="48" color="#C9A96E" />
        <text class="ex-state-t">{{ error }}</text>
        <view class="ex-state-btn" @tap="step = 'guide'"><text class="ex-state-btn-t">返回</text></view>
      </view>

      <template v-else-if="preview">
        <text v-if="circle" class="ex-member-line">
          <text class="ex-member-line-b">{{ circle.name }}</text>
          {{ circle.type === 'YEARLY' ? ' · 年费会员' : ' · 付费会员' }}<template v-if="joinedAt"> · {{ joinedAt.slice(0, 10).replace(/-/g, '/') }} 加入</template>
        </text>

        <!-- 金额测算：逐行算式，钱怎么算一目了然 -->
        <view class="ex-calc-card">
          <view class="ex-calc-row">
            <view class="ex-calc-labels">
              <text class="ex-calc-label">已付费用</text>
              <text v-if="circle?.type === 'YEARLY'" class="ex-calc-sub">年费会员 365 天</text>
            </view>
            <text class="ex-calc-value">¥{{ formatPrice(preview.paidAmount) }}</text>
          </view>
          <view class="ex-calc-row">
            <view class="ex-calc-labels">
              <text class="ex-calc-label">已使用 {{ preview.usedDays }} 天</text>
              <text class="ex-calc-sub">¥{{ formatPrice(preview.dailyCost) }} / 天 × {{ preview.usedDays }} 天</text>
            </view>
            <text class="ex-calc-value minus">− ¥{{ formatPrice(preview.paidAmount - preview.refundBase) }}</text>
          </view>
          <view class="ex-calc-row">
            <view class="ex-calc-labels">
              <text class="ex-calc-label">应退金额</text>
              <text class="ex-calc-sub">剩余天数对应费用</text>
            </view>
            <text class="ex-calc-value">¥{{ formatPrice(preview.refundBase) }}</text>
          </view>
          <view class="ex-calc-row">
            <view class="ex-calc-labels">
              <text class="ex-calc-label">手续费 {{ Math.round(preview.feeRate * 100) }}%</text>
              <text class="ex-calc-sub">¥{{ formatPrice(preview.refundBase) }} × {{ Math.round(preview.feeRate * 100) }}%</text>
            </view>
            <text class="ex-calc-value minus">− ¥{{ formatPrice(preview.feeAmount) }}</text>
          </view>
          <view class="ex-calc-row total">
            <text class="ex-calc-total-label">实际到账</text>
            <text class="ex-calc-total-value">¥{{ formatPrice(preview.actualRefund) }}</text>
          </view>
        </view>
        <text class="ex-calc-note">金额按提交申请当日实时计算；审核通过后退至你的可提现余额，可在「我的退款」中随时查看进度。</text>

        <!-- 申请原因：选填，快捷标签 + 补充说明 -->
        <text class="ex-label">申请原因 · 选填</text>
        <view class="ex-reason-card">
          <view class="ex-chips">
            <view
              v-for="c in reasonChips" :key="c"
              class="ex-chip" :class="{ selected: selectedChip === c }"
              @tap="selectedChip = selectedChip === c ? '' : c"
            >
              <text class="ex-chip-t" :class="{ selected: selectedChip === c }">{{ c }}</text>
            </view>
          </view>
          <textarea
            v-model="reasonText" class="ex-textarea" maxlength="200"
            placeholder="补充说明（选填），有助于圈主更快处理…" placeholder-class="ex-ph"
          />
          <text class="ex-count">{{ reasonText.length }} / 200</text>
        </view>

        <!-- 双审流程：提前告知 -->
        <text class="ex-label">提交后的流程</text>
        <view class="ex-flow-card">
          <view class="ex-flow-step">
            <view class="ex-flow-dot"><text class="ex-flow-dot-t">1</text></view>
            <text class="ex-flow-name">圈主审核</text>
            <text class="ex-flow-time">一般 3 天内</text>
          </view>
          <view class="ex-flow-line" />
          <view class="ex-flow-step">
            <view class="ex-flow-dot"><text class="ex-flow-dot-t">2</text></view>
            <text class="ex-flow-name">平台审核</text>
            <text class="ex-flow-time">一般 2 天内</text>
          </view>
          <view class="ex-flow-line" />
          <view class="ex-flow-step">
            <view class="ex-flow-dot"><text class="ex-flow-dot-t">3</text></view>
            <text class="ex-flow-name">退款到账</text>
            <text class="ex-flow-time">至可提现余额</text>
          </view>
        </view>

        <!-- 底部：到账金额复述 + 提交 -->
        <view class="ex-submit-bar">
          <text class="ex-submit-summary">确认后预计到账 <text class="ex-submit-summary-b">¥{{ formatPrice(preview.actualRefund) }}</text>，将经圈主与平台两步审核</text>
          <view class="ex-submit-btn" :class="{ disabled: submitting }" @tap="submit">
            <text class="ex-submit-btn-t">{{ submitting ? '提交中…' : '提交退款申请' }}</text>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<style scoped lang="scss">
.ex-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 240rpx; }

/* 顶栏 */
.ex-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.ex-back {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ex-title { font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }

/* 会员信息卡 */
.ex-member-card {
  margin: 16rpx 32rpx 0; display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 28rpx 32rpx;
}
.ex-member-card.skeleton { height: 144rpx; background: #fff; }
.ex-member-cover { width: 88rpx; height: 88rpx; border-radius: 22rpx; overflow: hidden; flex-shrink: 0; }
.ex-member-cover-img { width: 88rpx; height: 88rpx; }
.ex-member-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ex-member-name { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ex-member-sub { font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.ex-member-b { color: var(--gold, #c9a96e); font-weight: 600; }

/* 分区标题 */
.ex-label { display: block; margin: 40rpx 40rpx 16rpx; font-size: 26rpx; color: var(--text-tertiary, #999); }

/* 失去的权益 */
.ex-lose-list {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.ex-lose-item { display: flex; align-items: flex-start; gap: 22rpx; padding: 26rpx 32rpx; }
.ex-lose-item + .ex-lose-item { border-top: 1rpx solid var(--separator, #ede7dd); }
.ex-lose-icon { flex-shrink: 0; margin-top: 4rpx; }
.ex-lose-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ex-lose-title { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.ex-lose-desc { font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; line-height: 1.5; }
.ex-keep-note { display: block; margin: 20rpx 40rpx 0; font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }
.ex-keep-b { font-weight: 600; }

/* 退款规则卡 */
.ex-rule-card { margin: 0 32rpx; background: var(--bg-warm, #f8f4ec); border-radius: 28rpx; padding: 28rpx 32rpx; }
.ex-rule-title { font-size: 27rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ex-rule-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 6rpx; }
.ex-rule-li { font-size: 25rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; }
.ex-rule-b { color: var(--text-primary, #2c2c2c); font-weight: 600; }

/* 引导步底部 */
.ex-exit-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 32rpx calc(28rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.ex-stay-btn {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.ex-stay-btn:active { opacity: 0.88; }
.ex-stay-btn-t { font-size: 32rpx; font-weight: 600; letter-spacing: 2rpx; color: #fff; }
.ex-refund-link { margin-top: 20rpx; display: flex; align-items: center; justify-content: center; }
.ex-refund-link-t { font-size: 26rpx; color: var(--text-tertiary, #999); text-decoration: underline; }

/* 三态 */
.ex-state { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 48rpx; }
.ex-state-t { font-size: 28rpx; color: var(--text-tertiary, #999); text-align: center; line-height: 1.6; }
.ex-state-btn { padding: 16rpx 56rpx; border-radius: 999rpx; background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.ex-state-btn-t { font-size: 26rpx; color: var(--text-primary, #2c2c2c); }

/* 申请步 */
.ex-member-line { display: block; margin: 16rpx 40rpx 0; font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.ex-member-line-b { font-weight: 600; color: var(--text-primary, #2c2c2c); }

/* 金额测算卡 */
.ex-calc-card {
  margin: 28rpx 32rpx 0; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  overflow: hidden; padding-top: 6rpx;
}
.ex-calc-row { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 36rpx; }
.ex-calc-row + .ex-calc-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.ex-calc-labels { display: flex; flex-direction: column; }
.ex-calc-label { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.ex-calc-sub { font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.ex-calc-value { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ex-calc-value.minus { color: var(--text-tertiary, #999); font-weight: 500; }
.ex-calc-row.total { background: var(--bg-warm, #f8f4ec); }
.ex-calc-total-label { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ex-calc-total-value { font-size: 44rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.ex-calc-note { display: block; margin: 20rpx 44rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; }

/* 申请原因 */
.ex-reason-card {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 28rpx 32rpx;
}
.ex-chips { display: flex; flex-wrap: wrap; gap: 16rpx; }
.ex-chip {
  height: 60rpx; padding: 0 26rpx; border-radius: 30rpx;
  border: 1rpx solid var(--separator, #ede7dd);
  display: inline-flex; align-items: center;
}
.ex-chip.selected { border-color: var(--brand, #c41e3a); background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.ex-chip-t { font-size: 25rpx; color: var(--text-secondary, #6e6e73); }
.ex-chip-t.selected { color: var(--brand, #c41e3a); }
.ex-textarea {
  width: 100%; box-sizing: border-box; margin-top: 24rpx; padding: 24rpx;
  border: 1rpx solid var(--separator, #ede7dd); border-radius: 16rpx;
  background: var(--bg-page, #faf8f5); font-size: 28rpx; color: var(--text-primary, #2c2c2c);
  min-height: 144rpx; line-height: 1.6;
}
.ex-ph { color: var(--text-tertiary, #999); }
.ex-count { display: block; text-align: right; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 12rpx; }

/* 双审流程 */
.ex-flow-card {
  margin: 0 32rpx; padding: 28rpx 32rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
  display: flex; align-items: flex-start;
}
.ex-flow-step { flex: 1; display: flex; flex-direction: column; align-items: center; }
.ex-flow-dot {
  width: 48rpx; height: 48rpx; border-radius: 999rpx;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; align-items: center; justify-content: center;
}
.ex-flow-dot-t { font-size: 22rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); }
.ex-flow-name { font-size: 22rpx; color: var(--text-secondary, #6e6e73); margin-top: 12rpx; }
.ex-flow-time { font-size: 20rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.ex-flow-line { width: 48rpx; height: 1rpx; background: var(--separator, #ede7dd); margin-top: 24rpx; }

/* 提交步底部 */
.ex-submit-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 32rpx calc(28rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.ex-submit-summary { display: block; text-align: center; font-size: 24rpx; color: var(--text-secondary, #6e6e73); margin-bottom: 20rpx; }
.ex-submit-summary-b { color: var(--gold, #c9a96e); font-weight: 700; }
.ex-submit-btn {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.ex-submit-btn.disabled { opacity: 0.6; }
.ex-submit-btn:active { opacity: 0.88; }
.ex-submit-btn-t { font-size: 32rpx; font-weight: 600; letter-spacing: 2rpx; color: #fff; }

/* 成功页 */
.ex-success {
  min-height: 100vh; background: var(--bg-page, #faf8f5);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 0 64rpx; text-align: center;
}
.ex-success-icon {
  width: 128rpx; height: 128rpx; border-radius: 999rpx;
  background: rgba(91, 138, 94, 0.1);
  display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx;
}
.ex-success-title { font-size: 36rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ex-success-desc { font-size: 28rpx; color: var(--text-tertiary, #999); margin-top: 16rpx; line-height: 1.7; }
.ex-success-actions { display: flex; flex-direction: column; gap: 16rpx; width: 100%; max-width: 480rpx; margin-top: 64rpx; }
.ex-sa-primary { height: 88rpx; border-radius: 44rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.ex-sa-primary-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.ex-sa-plain { height: 88rpx; border-radius: 44rpx; background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); display: flex; align-items: center; justify-content: center; }
.ex-sa-plain-t { font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
</style>
