<script setup lang="ts">
/**
 * 通话结算单 — V0 circle-consult-call-end.html 还原（2026-07-10 批④·新建页）
 * 结构：完成态头部 → 通话对象卡 → 账单核算表（双方看同一套数字）→ 评价区（降级）→ 吸底返回。
 * 数据：后端无 GET /consult-calls/:id 单条端点 → 经 GET /consult-calls/my 反查（记录仅当事人可见，口径一致）。
 * 账单全真字段：durationSec/pricePerMinute/prepaidCoin/settledCoin/refundedCoin；
 *   达人侧入账 = settledCoin × 50%（与后端 end() 分账硬编码 rate 0.5 一致）。
 * 评价（待办 #31·2026-07-11 解锁）：星级 1-5 + 标签 chips（V0 稿文案）+ 文字 ≤200 字，
 *   真连 POST /consult-calls/:id/rate（仅发起方·仅 ENDED·仅一次·结束后 24h 内）；已评态回显；超窗提示。
 * 账单申诉（同批解锁）：POST /consult-calls/:id/dispute（双方·24h 内·一次），提交后回显状态；
 *   处理只记结论，退款走人工金币退款审批流（资金零触碰）。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { callApi, type ConsultCallRecord } from '@/lib/consult-call-data'
import { getCurrentUserId } from '@/lib/circle-consult-data'

const callId = ref('')
const me = ref('')
const loading = ref(true)
const error = ref('')
const call = ref<ConsultCallRecord | null>(null)

const isCaller = computed(() => !!call.value && call.value.callerId === me.value)
const ended = computed(() => call.value?.status === 'ENDED')
const peerName = computed(() => (isCaller.value ? call.value?.expertName : call.value?.callerName) || '对方')
const peerAvatar = computed(() => (isCaller.value ? call.value?.expertAvatar : call.value?.callerAvatar) || '')
/** 计费分钟（后端口径：不足 1 分钟按 1 分钟） */
const billedMinutes = computed(() => call.value ? Math.max(1, Math.ceil((call.value.durationSec || 0) / 60)) : 0)
/** 达人侧入账（后端 end() 分账硬编码 50%） */
const expertIncome = computed(() => call.value ? Math.floor(call.value.settledCoin * 0.5) : 0)

const headline = computed(() => {
  const s = call.value?.status
  if (s === 'ENDED') return { title: '通话完成', icon: 'check', ok: true }
  if (s === 'MISSED') return { title: '通话未接通', icon: 'phone', ok: false }
  return { title: '通话已取消', icon: 'x-circle', ok: false }
})

function durText(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`
}
function fmtStart(c: ConsultCallRecord) {
  const s = c.startAt || c.createdAt
  return s ? String(s).replace('T', ' ').slice(0, 16) : ''
}

async function load() {
  if (!callId.value) { error.value = '缺少通话参数'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    me.value = getCurrentUserId()
    const list = await callApi.myCalls()
    call.value = list.find(c => c.id === callId.value) || null
    if (!call.value) error.value = '通话记录不存在'
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

/* ───────── 评价（待办 #31）：星级 + 标签 + 文字 ≤200 字 ───────── */

/** 快捷评价标签（V0 circle-consult-call-end.html 稿文案） */
const RATE_TAGS = ['讲解清楚', '有实际方案', '耐心细致', '准时守约', '性价比高']
/** 星级对应文案（V0 稿 5 星=非常满意） */
const RATE_TEXT = ['', '不满意', '一般', '满意', '很满意', '非常满意']

const rateStars = ref(0)
const rateTags = ref<string[]>([])
const rateComment = ref('')
const rateSubmitting = ref(false)

const rated = computed(() => !!call.value?.ratedAt)
const ratedTags = computed(() => (call.value?.ratingTags || '').split(',').filter(Boolean))
/** 评价/申诉共用 24h 窗口（自通话结束 endAt 起算·与后端口径一致） */
const within24h = computed(() => {
  const end = call.value?.endAt ? new Date(String(call.value.endAt)).getTime() : 0
  return end > 0 && Date.now() - end <= 24 * 60 * 60 * 1000
})
const canRate = computed(() => ended.value && isCaller.value && !rated.value && within24h.value)

function toggleTag(t: string) {
  const i = rateTags.value.indexOf(t)
  if (i >= 0) rateTags.value.splice(i, 1)
  else rateTags.value.push(t)
}

async function submitRate() {
  if (!call.value || rateSubmitting.value) return
  if (!rateStars.value) { uni.showToast({ title: '请先点亮星级', icon: 'none' }); return }
  if (rateComment.value.length > 200) { uni.showToast({ title: '评价最多 200 字', icon: 'none' }); return }
  rateSubmitting.value = true
  try {
    const comment = rateComment.value.trim()
    await callApi.rate(call.value.id, { rating: rateStars.value, tags: rateTags.value, comment: comment || undefined })
    // 就地切已评态回显（不整页重载）
    call.value = {
      ...call.value,
      rating: rateStars.value,
      ratingTags: rateTags.value.join(','),
      ratingComment: comment || null,
      ratedAt: new Date().toISOString(),
    }
    uni.showToast({ title: '感谢你的评价', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    rateSubmitting.value = false
  }
}

/* ───────── 24h 账单申诉（只落记录·退款走人工审批流） ───────── */

const disputeOpen = ref(false)
const disputeReason = ref('')
const disputeSubmitting = ref(false)

const disputed = computed(() => !!call.value?.disputedAt)
const canDispute = computed(() => ended.value && !disputed.value && within24h.value)
const DISPUTE_STATUS_TEXT: Record<string, string> = {
  PENDING: '账单申诉已提交，平台核查中（24 小时内）',
  RESOLVED: '账单申诉已处理，如涉退款将由平台人工执行',
  REJECTED: '账单申诉核查未通过',
}
const disputeStatusText = computed(() => DISPUTE_STATUS_TEXT[call.value?.disputeStatus || 'PENDING'] || DISPUTE_STATUS_TEXT.PENDING)

async function submitDispute() {
  if (!call.value || disputeSubmitting.value) return
  const reason = disputeReason.value.trim()
  if (!reason) { uni.showToast({ title: '请填写申诉原因', icon: 'none' }); return }
  disputeSubmitting.value = true
  try {
    await callApi.dispute(call.value.id, reason)
    call.value = { ...call.value, disputeReason: reason, disputedAt: new Date().toISOString(), disputeStatus: 'PENDING' }
    disputeOpen.value = false
    uni.showToast({ title: '申诉已提交', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    disputeSubmitting.value = false
  }
}

onLoad((opt) => { callId.value = (opt?.id || '') as string })
onMounted(load)
</script>

<template>
  <view class="cle-page">
    <view class="cle-topbar"><text class="cle-topbar-t">通话已结束</text></view>

    <!-- 三态 -->
    <view v-if="loading" class="cle-state"><view class="cle-skel" /><view class="cle-skel sm" /></view>
    <view v-else-if="error || !call" class="cle-state">
      <text class="cle-state-t">{{ error || '通话记录不存在' }}</text>
      <view class="cle-retry" @tap="load"><text class="cle-retry-t">重试</text></view>
    </view>

    <template v-else>
      <!-- 完成态头部 -->
      <view class="cle-head">
        <view class="cle-head-icon" :class="{ 'is-warn': !headline.ok }">
          <app-icon :name="headline.icon" :size="48" :color="headline.ok ? '#5B8A5E' : '#999999'" />
        </view>
        <text class="cle-head-title">{{ headline.title }}</text>
        <text class="cle-head-sub">{{ fmtStart(call) }}{{ ended ? ` 开始 · 通话 ${durText(call.durationSec)}` : '' }}</text>
      </view>

      <!-- 通话对象 -->
      <view class="cle-peer">
        <view class="cle-peer-avatar">
          <image v-if="peerAvatar" lazy-load class="cle-peer-img" :src="peerAvatar" mode="aspectFill" />
          <view v-else class="cle-peer-img cle-peer-ph"><app-icon name="user" :size="34" color="#C9A96E" /></view>
        </view>
        <view class="cle-peer-main">
          <text class="cle-peer-name">{{ peerName }}</text>
          <text class="cle-peer-meta">{{ call.type === 'VIDEO' ? '视频' : '语音' }}通话咨询{{ isCaller ? '' : ' · 我是接听方' }}</text>
        </view>
      </view>

      <!-- 账单核算表 -->
      <text class="cle-label">本次通话结算</text>
      <view class="cle-bill">
        <template v-if="ended">
          <view class="cle-bill-row"><text class="cle-bill-l">通话时长</text><text class="cle-bill-v">{{ durText(call.durationSec) }}（计 {{ billedMinutes }} 分钟）</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">计费单价</text><text class="cle-bill-v">{{ call.pricePerMinute }} 金币/分钟</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">发起时预扣</text><text class="cle-bill-v">{{ call.prepaidCoin }} 金币</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">实际费用</text><text class="cle-bill-v">{{ call.settledCoin }} 金币</text></view>
          <view v-if="call.refundedCoin > 0" class="cle-bill-row"><text class="cle-bill-l">差额退回</text><text class="cle-bill-v is-green">+{{ call.refundedCoin }} 金币 已退回余额</text></view>
          <view class="cle-bill-total">
            <text class="cle-total-l">{{ isCaller ? '实际支付' : '分账入账（50%）' }}</text>
            <text class="cle-total-v">{{ isCaller ? call.settledCoin : expertIncome }} 金币</text>
          </view>
        </template>
        <template v-else>
          <view class="cle-bill-row"><text class="cle-bill-l">发起时预扣</text><text class="cle-bill-v">{{ call.prepaidCoin }} 金币</text></view>
          <view class="cle-bill-row"><text class="cle-bill-l">退回</text><text class="cle-bill-v is-green">+{{ call.refundedCoin || call.prepaidCoin }} 金币 已全额退回</text></view>
          <view class="cle-bill-total">
            <text class="cle-total-l">实际支付</text>
            <text class="cle-total-v">0 金币</text>
          </view>
        </template>
      </view>
      <text class="cle-bill-note">不足 1 分钟按 1 分钟计 · 结算明细与对方看到的完全一致</text>

      <!-- 账单申诉：24h 内一次；提交后回显状态（处理只记结论·退款走人工审批流） -->
      <view v-if="ended && (disputed || canDispute)" class="cle-dispute">
        <view v-if="disputed" class="cle-dispute-status">
          <app-icon name="info" :size="28" color="#9A9A9A" />
          <text class="cle-dispute-status-t">{{ disputeStatusText }}</text>
        </view>
        <template v-else>
          <text v-if="!disputeOpen" class="cle-dispute-link" @tap="disputeOpen = true">对时长或金额有异议？提交申诉（24 小时内平台核查）</text>
          <view v-else class="cle-dispute-form">
            <view class="cle-input-wrap">
              <textarea v-model="disputeReason" class="cle-input" :maxlength="500" placeholder="请说明对时长或金额的异议，平台将在 24 小时内核查" placeholder-class="cle-input-ph" />
            </view>
            <view class="cle-dispute-btns">
              <view class="cle-dispute-cancel" @tap="disputeOpen = false"><text class="cle-dispute-cancel-t">取消</text></view>
              <view class="cle-dispute-submit" :class="{ 'is-disabled': disputeSubmitting }" @tap="submitDispute">
                <text class="cle-dispute-submit-t">{{ disputeSubmitting ? '提交中…' : '提交申诉' }}</text>
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- 评价区（待办 #31 解锁）：发起方 ENDED 后 24h 内一次；已评回显；超窗提示 -->
      <template v-if="ended && (isCaller || rated)">
        <text class="cle-label">评价本次咨询</text>

        <!-- 已评态回显 -->
        <view v-if="rated" class="cle-rate">
          <text class="cle-rate-t">{{ isCaller ? '你已评价本次咨询' : '对方的评价' }}</text>
          <view class="cle-stars">
            <view v-for="i in 5" :key="i" class="cle-star">
              <app-icon name="star" :size="48" :color="i <= (call.rating || 0) ? '#C9A96E' : '#EDE7DD'" />
            </view>
          </view>
          <text v-if="call.rating" class="cle-rate-level">{{ RATE_TEXT[call.rating] }}</text>
          <view v-if="ratedTags.length" class="cle-tags">
            <view v-for="t in ratedTags" :key="t" class="cle-tag is-on"><text class="cle-tag-t is-on">{{ t }}</text></view>
          </view>
          <text v-if="call.ratingComment" class="cle-comment-view">{{ call.ratingComment }}</text>
        </view>

        <!-- 可评态：星级 + 标签 chips + 文字 200 字 -->
        <view v-else-if="canRate" class="cle-rate">
          <text class="cle-rate-t">这次通话解决你的问题了吗？</text>
          <text class="cle-rate-sub">你的评价将帮助其他圈友选择合适的达人</text>
          <view class="cle-stars">
            <view v-for="i in 5" :key="i" class="cle-star" @tap="rateStars = i">
              <app-icon name="star" :size="60" :color="i <= rateStars ? '#C9A96E' : '#EDE7DD'" />
            </view>
          </view>
          <text v-if="rateStars" class="cle-rate-level">{{ RATE_TEXT[rateStars] }}</text>
          <view class="cle-tags">
            <view
              v-for="t in RATE_TAGS" :key="t"
              class="cle-tag" :class="{ 'is-on': rateTags.includes(t) }"
              @tap="toggleTag(t)"
            >
              <text class="cle-tag-t" :class="{ 'is-on': rateTags.includes(t) }">{{ t }}</text>
            </view>
          </view>
          <view class="cle-input-wrap">
            <textarea v-model="rateComment" class="cle-input" :maxlength="200" placeholder="补充评价（选填，最多 200 字）" placeholder-class="cle-input-ph" />
            <text class="cle-input-count">{{ rateComment.length }}/200</text>
          </view>
        </view>

        <!-- 超窗未评 -->
        <view v-else class="cle-rate">
          <app-icon name="star" :size="40" color="#C9A96E" />
          <text class="cle-rate-t">评价窗口已关闭</text>
          <text class="cle-rate-sub">通话结束 24 小时内可评价</text>
        </view>
      </template>

      <!-- 吸底：可评时=暂不评价+提交评价（评价可跳过不强制）；否则=完成 -->
      <view class="cle-bottom">
        <template v-if="canRate">
          <view class="cle-skip-btn" @tap="goBack"><text class="cle-skip-btn-t">暂不评价</text></view>
          <view class="cle-back-btn cle-flex1" :class="{ 'is-disabled': !rateStars || rateSubmitting }" @tap="submitRate">
            <text class="cle-back-btn-t">{{ rateSubmitting ? '提交中…' : '提交评价' }}</text>
          </view>
        </template>
        <view v-else class="cle-back-btn cle-flex1" @tap="goBack"><text class="cle-back-btn-t">完成</text></view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.cle-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 200rpx; }

.cle-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  padding: 28rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 28rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.cle-topbar-t { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

.cle-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.cle-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.cle-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.cle-retry-t { font-size: 26rpx; color: #fff; }
.cle-skel { width: 100%; height: 300rpx; border-radius: 36rpx; background: #ede7dd; }
.cle-skel.sm { height: 160rpx; }

/* 完成态头部 */
.cle-head { text-align: center; padding: 52rpx 32rpx 40rpx; }
.cle-head-icon {
  width: 112rpx; height: 112rpx; border-radius: 999rpx; margin: 0 auto;
  background: rgba(91, 138, 94, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.cle-head-icon.is-warn { background: var(--bg-warm, #f8f4ec); }
.cle-head-title { display: block; font-size: 36rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); margin-top: 24rpx; }
.cle-head-sub { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 8rpx; }

/* 通话对象 */
.cle-peer {
  margin: 0 32rpx; padding: 28rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cle-peer-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.cle-peer-img { width: 88rpx; height: 88rpx; border-radius: 999rpx; }
.cle-peer-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.cle-peer-main { flex: 1; min-width: 0; }
.cle-peer-name { display: block; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.cle-peer-meta { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }

/* 账单 */
.cle-label { display: block; padding: 36rpx 36rpx 16rpx; font-size: 26rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); }
.cle-bill {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.cle-bill-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 26rpx 32rpx; font-size: 26rpx; color: var(--text-secondary, #6e6e73);
}
.cle-bill-row + .cle-bill-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.cle-bill-v { color: var(--text-primary, #2c2c2c); font-weight: 500; }
.cle-bill-v.is-green { color: #5b8a5e; }
.cle-bill-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 28rpx 32rpx; background: var(--bg-warm, #f8f4ec);
}
.cle-total-l { font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.cle-total-v { font-size: 36rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.cle-bill-note { display: block; padding: 20rpx 36rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; }

/* 账单申诉（V0：异议出口不让用户没地方说话） */
.cle-dispute { margin: 0 32rpx; padding-top: 20rpx; }
.cle-dispute-link {
  display: block; text-align: center; padding: 4rpx 8rpx;
  font-size: 24rpx; color: var(--text-tertiary, #999);
  text-decoration: underline; text-underline-offset: 6rpx;
}
.cle-dispute-status {
  display: flex; align-items: flex-start; gap: 12rpx;
  padding: 20rpx 24rpx; background: var(--bg-warm, #f8f4ec); border-radius: 24rpx;
}
.cle-dispute-status-t { flex: 1; font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6; }
.cle-dispute-form {
  padding: 24rpx; background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cle-dispute-btns { display: flex; gap: 16rpx; margin-top: 20rpx; }
.cle-dispute-cancel {
  flex: 1; height: 72rpx; border-radius: 36rpx;
  border: 1rpx solid var(--separator, #ede7dd);
  display: flex; align-items: center; justify-content: center;
}
.cle-dispute-cancel-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.cle-dispute-submit {
  flex: 2; height: 72rpx; border-radius: 36rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.cle-dispute-submit.is-disabled { opacity: 0.5; }
.cle-dispute-submit:active { opacity: 0.88; }
.cle-dispute-submit-t { font-size: 26rpx; font-weight: 600; color: #fff; }

/* 评价卡（V0：星级 + 标签 chips + 文字输入） */
.cle-rate {
  margin: 0 32rpx; padding: 36rpx 32rpx; text-align: center;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
}
.cle-rate-t { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.cle-rate-sub { font-size: 22rpx; color: var(--text-tertiary, #999); }
.cle-stars { display: flex; justify-content: center; gap: 20rpx; margin-top: 12rpx; }
.cle-star { display: flex; padding: 4rpx; }
.cle-star:active { opacity: 0.8; }
.cle-rate-level { font-size: 26rpx; color: var(--gold, #c9a96e); font-weight: 600; }
.cle-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 16rpx; margin-top: 12rpx; }
.cle-tag {
  padding: 12rpx 28rpx; border-radius: 32rpx;
  border: 1rpx solid var(--separator, #ede7dd); background: transparent;
}
.cle-tag.is-on { border-color: var(--gold, #c9a96e); background: rgba(201, 169, 110, 0.07); }
.cle-tag-t { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.cle-tag-t.is-on { color: var(--gold, #c9a96e); font-weight: 500; }
.cle-comment-view {
  align-self: stretch; margin-top: 8rpx; padding: 24rpx 28rpx; text-align: left;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
  font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6;
}
/* 文本输入（评价/申诉共用） */
.cle-input-wrap { position: relative; align-self: stretch; margin-top: 16rpx; }
.cle-input {
  box-sizing: border-box; width: 100%; height: 160rpx;
  padding: 24rpx 28rpx 44rpx; text-align: left;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
  font-size: 26rpx; color: var(--text-primary, #2c2c2c); line-height: 1.6;
}
:deep(.cle-input-ph) { color: var(--text-tertiary, #999); }
.cle-input-count {
  position: absolute; right: 24rpx; bottom: 14rpx;
  font-size: 20rpx; color: var(--text-tertiary, #999);
}

/* 吸底：可评时=暂不评价+提交评价；否则=完成 */
.cle-bottom {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.94); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.cle-skip-btn {
  height: 92rpx; padding: 0 36rpx; border-radius: 46rpx;
  border: 1rpx solid var(--separator, #ede7dd);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cle-skip-btn:active { opacity: 0.8; }
.cle-skip-btn-t { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.cle-back-btn {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.cle-back-btn.is-disabled { opacity: 0.5; }
.cle-back-btn:active { opacity: 0.88; }
.cle-back-btn-t { font-size: 30rpx; font-weight: 600; color: #fff; }
.cle-flex1 { flex: 1; }
</style>
