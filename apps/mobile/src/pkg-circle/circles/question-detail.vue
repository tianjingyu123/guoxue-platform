<script setup lang="ts">
/**
 * 图文问答详情（真连后端 GET /question/:id）
 * 渲染问题 + 答案；付费墙由后端裁定：
 *  - answer 有值 → 当事人(提问者/回答者) 或 已围观 或 公开免费，直接展示；
 *  - answerLocked=true → 已回答但需付费围观，打码 + 「围观」按钮(POST /:id/peek)；
 *  - PENDING → 等待回答；REFUNDED/REJECTED → 展示退款/拒答说明。
 * 回答者本人(且 PENDING) 额外显示「回答 / 拒答」操作(POST /:id/answer | /reject)。
 * 写操作均有 submitting 防重复；页面三态齐全。
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

const parsed = computed(() => q.value ? splitQuestion(q.value.question) : { title: '', body: '' })
const isAnswerer = computed(() => !!q.value && q.value.answererId === myId.value)
const isAsker = computed(() => !!q.value && q.value.askerId === myId.value)
const canAnswer = computed(() => isAnswerer.value && q.value?.status === 'PENDING')
// 已回答但被付费墙锁住（非当事人未围观），且支持围观
const canPeek = computed(() => !!q.value && q.value.status === 'ANSWERED' && q.value.answerLocked && q.value.peekPriceCoin > 0 && !isAsker.value && !isAnswerer.value)

function fmtTime(s: string | null) { return s ? String(s).replace('T', ' ').slice(0, 16) : '' }

async function load() {
  if (!qid.value) { error.value = '缺少问题ID'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    q.value = await questionApi.detail(qid.value)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onPeek() {
  if (peeking.value || !q.value) return
  peeking.value = true
  try {
    await questionApi.peek(q.value.id)
    uni.showToast({ title: '围观成功', icon: 'success' })
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '围观失败', icon: 'none' })
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
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    answering.value = false
  }
}

function onReject() {
  if (rejecting.value || !q.value) return
  uni.showModal({
    title: '拒答确认',
    content: '拒答后将全额退还提问者支付的金币，确定拒答？',
    confirmText: '确定拒答',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm || !q.value) return
      rejecting.value = true
      try {
        await questionApi.reject(q.value.id)
        uni.showToast({ title: '已拒答并退款', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        rejecting.value = false
      }
    },
  })
}

onLoad((opt) => { qid.value = (opt?.id || '') as string })
onMounted(() => { myId.value = getCurrentUserId(); load() })
</script>

<template>
  <view class="qd-page">
    <view class="qd-nav">
      <view class="qd-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="qd-nav-title">问答详情</text>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="qd-state"><text class="qd-state-t">加载中…</text></view>
    <view v-else-if="error" class="qd-state">
      <text class="qd-state-t">{{ error }}</text>
      <view class="qd-retry" @tap="load"><text class="qd-retry-t">重试</text></view>
    </view>
    <view v-else-if="!q" class="qd-state"><text class="qd-state-t">问题不存在</text></view>

    <view v-else class="qd-body">
      <!-- 问题卡 -->
      <view class="qd-card">
        <view class="qd-asker">
          <image lazy-load class="qd-avatar" :src="q.asker?.avatar || ''" mode="aspectFill" />
          <view class="qd-asker-info">
            <text class="qd-asker-name">{{ q.asker?.nickname || '匿名' }}</text>
            <text class="qd-time">{{ fmtTime(q.createdAt) }}</text>
          </view>
          <text class="qd-price">{{ q.priceCoin }} 金币</text>
        </view>
        <text v-if="parsed.title" class="qd-title">{{ parsed.title }}</text>
        <text class="qd-content">{{ parsed.body }}</text>
        <view v-if="q.images.length" class="qd-imgs">
          <image lazy-load v-for="(img, i) in q.images" :key="i" class="qd-img" :src="img" mode="aspectFill" />
        </view>
      </view>

      <!-- 答案区 -->
      <view class="qd-answer-block">
        <view class="qd-answer-head">
          <image lazy-load class="qd-avatar sm" :src="q.answerer?.avatar || ''" mode="aspectFill" />
          <text class="qd-answer-name">{{ q.answerer?.nickname || '达人' }} 的回答</text>
        </view>

        <!-- 已回答且可见 -->
        <view v-if="q.status === 'ANSWERED' && q.answer" class="qd-answer">
          <text class="qd-answer-text">{{ q.answer }}</text>
          <text v-if="q.answeredAt" class="qd-answer-time">回复于 {{ fmtTime(q.answeredAt) }}</text>
        </view>

        <!-- 已回答但被付费墙锁住 -->
        <view v-else-if="q.status === 'ANSWERED' && q.answerLocked" class="qd-locked">
          <view class="qd-lock-mask">
            <view class="qd-lock-line" />
            <view class="qd-lock-line short" />
            <view class="qd-lock-line" />
          </view>
          <view class="qd-lock-overlay">
            <app-icon name="lock" :size="40" color="#C41E3A" />
            <text class="qd-lock-t">付费围观查看完整答案</text>
            <view v-if="canPeek" class="qd-peek-btn" :class="{ 'is-disabled': peeking }" @tap="onPeek">
              <text class="qd-peek-t">{{ peeking ? '处理中…' : `围观 ${q.peekPriceCoin} 金币` }}</text>
            </view>
            <text v-else class="qd-lock-sub">该问答暂不支持围观</text>
          </view>
        </view>

        <!-- 待回答 -->
        <view v-else-if="q.status === 'PENDING'" class="qd-tip">
          <app-icon name="clock" :size="28" color="#F59E0B" />
          <text class="qd-tip-t">达人尚未回答，请耐心等待</text>
        </view>

        <!-- 已退款 / 拒答 -->
        <view v-else class="qd-tip">
          <app-icon name="x-circle" :size="28" color="#999999" />
          <text class="qd-tip-t">{{ q.answer || '该提问已退款关闭' }}</text>
        </view>
      </view>

      <!-- 回答者操作区（仅本人 + 待回答） -->
      <view v-if="canAnswer" class="qd-act">
        <text class="qd-act-label">回答此提问</text>
        <textarea v-model="answerText" class="qd-act-textarea" maxlength="2000" placeholder="输入您的专业解答…" placeholder-class="qd-ph" />
        <view class="qd-act-btns">
          <view class="qd-reject" :class="{ 'is-disabled': rejecting }" @tap="onReject">
            <text class="qd-reject-t">{{ rejecting ? '处理中…' : '拒答退款' }}</text>
          </view>
          <view class="qd-submit" :class="{ 'is-disabled': answering || !answerText.trim() }" @tap="onAnswer">
            <app-icon name="send" :size="24" color="#ffffff" />
            <text class="qd-submit-t">{{ answering ? '提交中…' : '提交回答' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.qd-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 48rpx; }
.qd-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.qd-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.qd-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.qd-state { padding: 160rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.qd-state-t { font-size: 26rpx; color: #999; }
.qd-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.qd-retry-t { font-size: 26rpx; color: #fff; }
.qd-body { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.qd-card { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; padding: 24rpx; }
.qd-asker { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.qd-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; background: #ECE6D8; }
.qd-avatar.sm { width: 56rpx; height: 56rpx; }
.qd-asker-info { flex: 1; min-width: 0; }
.qd-asker-name { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.qd-time { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.qd-price { font-size: 26rpx; font-weight: 700; color: var(--brand); flex-shrink: 0; }
.qd-title { display: block; font-size: 32rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 12rpx; line-height: 1.5; }
.qd-content { display: block; font-size: 28rpx; color: #444; line-height: 1.7; }
.qd-imgs { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.qd-img { width: 200rpx; height: 200rpx; border-radius: 12rpx; background: #ECE6D8; }
.qd-answer-block { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; padding: 24rpx; }
.qd-answer-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.qd-answer-name { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.qd-answer-text { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.8; }
.qd-answer-time { display: block; font-size: 22rpx; color: #999; margin-top: 16rpx; }
.qd-locked { position: relative; border-radius: 16rpx; overflow: hidden; }
.qd-lock-mask { padding: 20rpx; display: flex; flex-direction: column; gap: 16rpx; filter: blur(2rpx); }
.qd-lock-line { height: 28rpx; border-radius: 8rpx; background: #ECE6D8; }
.qd-lock-line.short { width: 60%; }
.qd-lock-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx; background: rgba(255,255,255,0.82); }
.qd-lock-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.qd-lock-sub { font-size: 22rpx; color: #999; }
.qd-peek-btn { padding: 14rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.qd-peek-btn.is-disabled { opacity: 0.5; }
.qd-peek-t { font-size: 26rpx; color: #fff; font-weight: 600; }
.qd-tip { display: flex; align-items: center; gap: 12rpx; padding: 24rpx 0; }
.qd-tip-t { font-size: 26rpx; color: #666; }
.qd-act { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; padding: 24rpx; }
.qd-act-label { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; }
.qd-act-textarea { width: 100%; box-sizing: border-box; height: 220rpx; padding: 18rpx 20rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #FBF9F4; font-size: 28rpx; color: #2C2C2C; }
.qd-ph { color: #b5aea3; }
.qd-act-btns { display: flex; gap: 16rpx; margin-top: 16rpx; }
.qd-reject { flex: 1; height: 80rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #fff; display: flex; align-items: center; justify-content: center; }
.qd-reject.is-disabled { opacity: 0.5; }
.qd-reject-t { font-size: 28rpx; color: var(--brand); }
.qd-submit { flex: 2; height: 80rpx; border-radius: 12rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.qd-submit.is-disabled { opacity: 0.5; }
.qd-submit-t { font-size: 28rpx; color: #fff; font-weight: 600; }
</style>
