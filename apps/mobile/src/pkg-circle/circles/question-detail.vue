<script setup lang="ts">
/**
 * 问答详情 — V0 circle-consult-qa-detail.html 还原（2026-07-10 批④）
 * 四态按后端真实状态分支（GET /question/:id·付费墙后端裁定）：
 *  ① 已回答·围观墙：answerLocked=true → 打码渐隐 + 围观数据 + 支付围观（POST /:id/peek）
 *  ② 待回答·提问者视角：PENDING → 托管中说明 + 72 小时超时自动退款倒计时（后端固定 72h）
 *  ③ 已拒答/退款：REFUNDED/CLOSED → 拒答理由（后端写入 answer 字段）+ 全额退回说明
 *  ④ 待回答·回答者视角：answererId=我 + PENDING → 结算说明 + 提交回答 / 拒答（可填理由）
 * 降级：V0「完整回答约600字+2张图」预览摘要无字段（answer 被后端剔除）→ 骨架线；
 *       V0 围观分成比例文案与后端不符 → 不写比例。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { questionApi, getCurrentUserId, splitQuestion, type PaidQuestion } from '@/lib/circle-consult-data'

const qid = ref('')
const myId = ref('')
const loading = ref(true)
const error = ref('')
const q = ref<PaidQuestion | null>(null)

const peeking = ref(false)
const answerText = ref('')
const answering = ref(false)
const rejecting = ref(false)
const showRejectSheet = ref(false)
const rejectReason = ref('')

const parsed = computed(() => q.value ? splitQuestion(q.value.question) : { title: '', body: '' })
const isAnswerer = computed(() => !!q.value && q.value.answererId === myId.value)
const isAsker = computed(() => !!q.value && q.value.askerId === myId.value)
const canAnswer = computed(() => isAnswerer.value && q.value?.status === 'PENDING')
// 已回答但被付费墙锁住（非当事人未围观），且支持围观
const canPeek = computed(() => !!q.value && q.value.status === 'ANSWERED' && q.value.answerLocked && q.value.peekPriceCoin > 0 && !isAsker.value && !isAnswerer.value)

/** 状态徽章（V0 三色：answered 绿 / waiting 橙 / declined 灰） */
const badge = computed(() => {
  const s = q.value?.status
  if (s === 'ANSWERED') return { label: '已回答', cls: 'answered' }
  if (s === 'PENDING') return { label: '待回答', cls: 'waiting' }
  return { label: '已拒答/退款', cls: 'declined' }
})

/** 48h 超时退款剩余小时（董事长拍板 2026-07-10：图文提问与悬赏统一 48h） */
const refundLeftHours = computed(() => {
  if (!q.value?.createdAt) return 0
  const elapsed = (Date.now() - new Date(q.value.createdAt).getTime()) / 3_600_000
  return Math.max(0, Math.ceil(48 - elapsed))
})

function fmtTime(s: string | null) { return s ? String(s).replace('T', ' ').slice(0, 16) : '' }

async function load() {
  if (!qid.value) { error.value = '缺少问题ID'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    q.value = await questionApi.detail(qid.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onPeek() {
  if (peeking.value || !q.value) return
  peeking.value = true
  try {
    await questionApi.peek(q.value.id)
    uni.showToast({ title: '围观成功，永久可看', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '围观失败', icon: 'none' })
  } finally {
    peeking.value = false
  }
}

async function onAnswer() {
  if (answering.value || !q.value) return
  if (answerText.value.trim().length === 0) { uni.showToast({ title: '请填写回答内容', icon: 'none' }); return }
  answering.value = true
  try {
    await questionApi.answer(q.value.id, { answer: answerText.value.trim() })
    uni.showToast({ title: '回答已提交', icon: 'success' })
    answerText.value = ''
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    answering.value = false
  }
}

async function confirmReject() {
  if (rejecting.value || !q.value) return
  rejecting.value = true
  try {
    await questionApi.reject(q.value.id, rejectReason.value.trim() || undefined)
    showRejectSheet.value = false
    uni.showToast({ title: '已拒答并全额退款', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    rejecting.value = false
  }
}

function previewImgs(urls: string[], i: number) { uni.previewImage({ urls, current: urls[i] }) }

onLoad((opt) => { qid.value = (opt?.id || '') as string })
onMounted(() => { myId.value = getCurrentUserId(); load() })
</script>

<template>
  <view class="qd-page">
    <view class="qd-topbar">
      <view class="qd-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="qd-title">问答详情</text>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="qd-state"><view class="qd-skel" /><view class="qd-skel sm" /></view>
    <view v-else-if="error" class="qd-state">
      <text class="qd-state-t">{{ error }}</text>
      <view class="qd-retry" @tap="load"><text class="qd-retry-t">重试</text></view>
    </view>
    <view v-else-if="!q" class="qd-state"><text class="qd-state-t">问题不存在</text></view>

    <view v-else class="qd-body">
      <!-- 提问卡 -->
      <view class="qd-card">
        <view class="qd-head">
          <view class="qd-avatar">
            <image v-if="q.asker?.avatar" lazy-load class="qd-avatar-img" :src="q.asker.avatar" mode="aspectFill" />
            <view v-else class="qd-avatar-img qd-avatar-ph"><app-icon name="user" :size="30" color="#C9A96E" /></view>
          </view>
          <view class="qd-who">
            <text class="qd-name">{{ isAsker ? '我' : (q.asker?.nickname || '提问者') }}</text>
            <text class="qd-time">{{ fmtTime(q.createdAt) }} 提问 · {{ q.priceCoin }} 金币{{ q.status === 'PENDING' ? '（托管中）' : '' }}</text>
          </view>
          <text class="qd-badge" :class="'qd-badge-' + badge.cls">{{ badge.label }}</text>
        </view>
        <text v-if="parsed.title" class="qd-q-title">{{ parsed.title }}</text>
        <text v-if="parsed.body" class="qd-q-body">{{ parsed.body }}</text>
        <view v-if="q.images.length" class="qd-thumbs">
          <image
            v-for="(img, i) in q.images" :key="i" lazy-load
            class="qd-thumb" :src="img" mode="aspectFill"
            @tap="previewImgs(q.images, i)"
          />
        </view>
      </view>

      <!-- ① 已回答·答案可见（当事人/已围观/公开免费） -->
      <view v-if="q.status === 'ANSWERED' && q.answer" class="qd-a-card">
        <view class="qd-a-head">
          <view class="qd-a-avatar">
            <image v-if="q.answerer?.avatar" lazy-load class="qd-avatar-img" :src="q.answerer.avatar" mode="aspectFill" />
            <view v-else class="qd-avatar-img qd-avatar-ph"><app-icon name="user" :size="26" color="#C9A96E" /></view>
          </view>
          <text class="qd-a-name">{{ q.answerer?.nickname || '达人' }}</text>
        </view>
        <text class="qd-a-body">{{ q.answer }}</text>
        <text v-if="q.answeredAt" class="qd-a-time">回复于 {{ fmtTime(q.answeredAt) }}{{ q.isPublic && q.peekCount ? ` · ${q.peekCount} 人围观` : '' }}</text>
      </view>

      <!-- ① 已回答·围观墙（非当事人未付） -->
      <view v-else-if="q.status === 'ANSWERED' && q.answerLocked" class="qd-a-card">
        <view class="qd-a-head">
          <view class="qd-a-avatar">
            <image v-if="q.answerer?.avatar" lazy-load class="qd-avatar-img" :src="q.answerer.avatar" mode="aspectFill" />
            <view v-else class="qd-avatar-img qd-avatar-ph"><app-icon name="user" :size="26" color="#C9A96E" /></view>
          </view>
          <text class="qd-a-name">{{ q.answerer?.nickname || '达人' }}</text>
        </view>
        <!-- 回答全文受付费墙保护（后端剔除）→ 渐隐骨架示意 -->
        <view class="qd-walled">
          <view class="qd-wall-line" /><view class="qd-wall-line w80" /><view class="qd-wall-line w60" />
        </view>
        <view class="qd-peek-wall">
          <text class="qd-peek-stats">已有 <text class="qd-peek-b">{{ q.peekCount }}</text> 人围观 · 达人已完整回答</text>
          <view v-if="canPeek" class="qd-peek-btn" :class="{ 'is-disabled': peeking }" @tap="onPeek">
            <text class="qd-peek-btn-t">{{ peeking ? '处理中…' : `支付 ${q.peekPriceCoin} 金币 围观完整回答` }}</text>
          </view>
          <text v-else class="qd-peek-sub">该问答不支持围观</text>
          <text v-if="canPeek" class="qd-peek-compare">提问需 {{ q.priceCoin }} 金币，围观仅 {{ q.peekPriceCoin }} 金币 · 付费后永久可看</text>
        </view>
      </view>

      <!-- ② 待回答（非回答者视角）：托管+超时退款保障 -->
      <view v-else-if="q.status === 'PENDING' && !canAnswer" class="qd-status-block">
        <text class="qd-status-t">你的提问已送达达人，金币由平台托管。</text>
        <text class="qd-status-t">若 <text class="qd-status-b">{{ refundLeftHours }} 小时</text>内仍未回答，{{ q.priceCoin }} 金币将<text class="qd-refund">自动全额退回钱包</text>，无需操作。</text>
      </view>

      <!-- ③ 已拒答/退款：理由 + 退款说明 -->
      <view v-else-if="q.status !== 'PENDING'" class="qd-status-block">
        <text class="qd-status-t"><text class="qd-status-b">{{ q.answerer?.nickname || '达人' }} 未回答此问题</text>{{ q.answer ? `：「${q.answer}」` : '' }}</text>
        <text class="qd-status-t">{{ q.priceCoin }} 金币已<text class="qd-refund">全额退回钱包</text>。</text>
      </view>

      <!-- ④ 回答者视角：结算说明 + 双操作 -->
      <view v-if="canAnswer" class="qd-answerer">
        <text class="qd-answerer-note">回答后 <text class="qd-note-gold">{{ q.priceCoin }} 金币</text>按平台分成规则结算到你的收益账户{{ q.isPublic ? '；此问答已公开，后续围观收入同样按分成结算' : '' }}。若不便回答请及时拒答，金币将全额退还提问者。剩余回答时限约 <text class="qd-note-gold">{{ refundLeftHours }} 小时</text>。</text>
        <textarea v-model="answerText" class="qd-answer-input" maxlength="2000" placeholder="输入您的专业解答…（最多 2000 字）" placeholder-class="qd-ph" />
        <view class="qd-answerer-actions">
          <view class="qd-btn-answer" :class="{ 'is-disabled': answering || !answerText.trim() }" @tap="onAnswer">
            <text class="qd-btn-answer-t">{{ answering ? '提交中…' : '提交回答' }}</text>
          </view>
          <view class="qd-btn-decline" @tap="showRejectSheet = true"><text class="qd-btn-decline-t">拒答并退款</text></view>
        </view>
      </view>
    </view>

    <!-- 拒答理由弹层（理由选填·后端 reject 收 reason） -->
    <view v-if="showRejectSheet" class="qd-overlay" @tap="showRejectSheet = false">
      <view class="qd-sheet" @tap.stop>
        <view class="qd-sheet-handle" />
        <text class="qd-sheet-title">拒答并退款</text>
        <text class="qd-sheet-sub">拒答后 {{ q?.priceCoin }} 金币将全额退还提问者，理由会展示给对方（选填）。</text>
        <textarea v-model="rejectReason" class="qd-sheet-input" maxlength="200" placeholder="如：该问题超出图文问答范围，建议连麦详聊" placeholder-class="qd-ph" />
        <view class="qd-sheet-actions">
          <view class="qd-sheet-cancel" @tap="showRejectSheet = false"><text class="qd-sheet-cancel-t">再想想</text></view>
          <view class="qd-sheet-confirm" :class="{ 'is-disabled': rejecting }" @tap="confirmReject">
            <text class="qd-sheet-confirm-t">{{ rejecting ? '处理中…' : '确定拒答' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.qd-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 80rpx; }

/* 顶栏 */
.qd-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.qd-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.qd-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

/* 三态 */
.qd-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.qd-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.qd-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.qd-retry-t { font-size: 26rpx; color: #fff; }
.qd-skel { width: 100%; height: 280rpx; border-radius: 36rpx; background: #ede7dd; }
.qd-skel.sm { height: 180rpx; }

.qd-body { padding: 24rpx 0 0; }

/* 提问卡 */
.qd-card {
  margin: 0 32rpx; padding: 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.qd-head { display: flex; align-items: center; gap: 20rpx; }
.qd-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.qd-avatar-img { width: 100%; height: 100%; border-radius: 999rpx; }
.qd-avatar-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.qd-who { flex: 1; min-width: 0; }
.qd-name { display: block; font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.qd-time { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.qd-badge { flex-shrink: 0; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 20rpx; }
.qd-badge-answered { background: rgba(91, 138, 94, 0.1); color: #5b8a5e; }
.qd-badge-waiting { background: rgba(201, 123, 45, 0.1); color: #c97b2d; }
.qd-badge-declined { background: var(--bg-warm, #f8f4ec); color: var(--text-tertiary, #999); }
.qd-q-title { display: block; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); line-height: 1.5; margin-top: 24rpx; }
.qd-q-body { display: block; font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; margin-top: 16rpx; }
.qd-thumbs { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.qd-thumb { width: 192rpx; height: 144rpx; border-radius: 16rpx; background: var(--bg-warm, #f8f4ec); }

/* 回答卡 */
.qd-a-card {
  margin: 20rpx 32rpx 0; padding: 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.qd-a-head { display: flex; align-items: center; gap: 16rpx; }
.qd-a-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; box-shadow: 0 0 0 3rpx var(--gold, #c9a96e); }
.qd-a-name { font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.qd-a-body { display: block; font-size: 28rpx; line-height: 1.9; color: var(--text-primary, #2c2c2c); margin-top: 24rpx; }
.qd-a-time { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid var(--separator, #ede7dd); }

/* 围观墙 */
.qd-walled { margin-top: 24rpx; display: flex; flex-direction: column; gap: 18rpx; }
.qd-wall-line { height: 26rpx; border-radius: 10rpx; background: var(--bg-warm, #f8f4ec); }
.qd-wall-line.w80 { width: 80%; opacity: 0.7; }
.qd-wall-line.w60 { width: 60%; opacity: 0.4; }
.qd-peek-wall { text-align: center; padding: 16rpx 8rpx 4rpx; }
.qd-peek-stats { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-bottom: 20rpx; }
.qd-peek-b { color: var(--gold, #c9a96e); font-weight: 700; }
.qd-peek-btn { height: 84rpx; border-radius: 42rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.qd-peek-btn.is-disabled { opacity: 0.5; }
.qd-peek-btn:active { opacity: 0.88; }
.qd-peek-btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.qd-peek-sub { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); }
.qd-peek-compare { display: block; font-size: 20rpx; color: var(--text-tertiary, #999); margin-top: 16rpx; }

/* 状态块（待回答/已拒答） */
.qd-status-block {
  margin: 20rpx 32rpx 0; padding: 32rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
}
.qd-status-t { display: block; font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; }
.qd-status-b { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.qd-refund { color: #5b8a5e; font-weight: 600; }

/* 回答者操作区 */
.qd-answerer {
  margin: 20rpx 32rpx 0; padding: 28rpx 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.qd-answerer-note { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; margin-bottom: 24rpx; }
.qd-note-gold { color: var(--gold, #c9a96e); font-weight: 700; }
.qd-answer-input {
  width: 100%; box-sizing: border-box; height: 240rpx; padding: 24rpx;
  border-radius: 20rpx; background: var(--bg-warm, #f8f4ec);
  font-size: 28rpx; color: var(--text-primary, #2c2c2c); line-height: 1.7;
}
.qd-ph { color: var(--text-tertiary, #999); }
.qd-answerer-actions { display: flex; gap: 20rpx; margin-top: 24rpx; }
.qd-btn-answer { flex: 1; height: 84rpx; border-radius: 42rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.qd-btn-answer.is-disabled { opacity: 0.5; }
.qd-btn-answer-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.qd-btn-decline { flex-shrink: 0; padding: 0 36rpx; height: 84rpx; border: 1rpx solid var(--separator, #ede7dd); border-radius: 42rpx; display: flex; align-items: center; justify-content: center; }
.qd-btn-decline-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }

/* 拒答理由弹层 */
.qd-overlay { position: fixed; inset: 0; z-index: 40; background: rgba(44, 44, 44, 0.4); display: flex; flex-direction: column; justify-content: flex-end; }
.qd-sheet {
  background: var(--bg-page, #faf8f5); border-radius: 44rpx 44rpx 0 0;
  padding: 20rpx 40rpx calc(32rpx + env(safe-area-inset-bottom));
}
.qd-sheet-handle { width: 72rpx; height: 8rpx; border-radius: 4rpx; background: var(--separator, #ede7dd); margin: 0 auto 28rpx; }
.qd-sheet-title { display: block; font-size: 32rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); text-align: center; }
.qd-sheet-sub { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); line-height: 1.6; text-align: center; margin-top: 12rpx; }
.qd-sheet-input {
  width: 100%; box-sizing: border-box; height: 180rpx; margin-top: 24rpx; padding: 24rpx;
  border-radius: 20rpx; background: var(--bg-card, #fff);
  font-size: 26rpx; color: var(--text-primary, #2c2c2c);
}
.qd-sheet-actions { display: flex; gap: 24rpx; margin-top: 28rpx; }
.qd-sheet-cancel { flex: 1; height: 88rpx; border-radius: 44rpx; background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); display: flex; align-items: center; justify-content: center; }
.qd-sheet-cancel-t { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.qd-sheet-confirm { flex: 1; height: 88rpx; border-radius: 44rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.qd-sheet-confirm.is-disabled { opacity: 0.5; }
.qd-sheet-confirm-t { font-size: 28rpx; font-weight: 600; color: #fff; }
</style>
