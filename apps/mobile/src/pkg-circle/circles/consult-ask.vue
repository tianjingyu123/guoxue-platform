<script setup lang="ts">
/**
 * 发起付费提问（真连后端 POST /question/ask）
 * 入口：从达人列表「图文咨询」带 query —— circleId(或 id) + answererId(或 expertId)
 *       + priceCoin(达人 questionPriceCoin) + 可选 expertName/expertAvatar/peekPriceCoin。
 * 表单：标题 + 正文 + 是否公开 + 公开时可设围观价 → questionApi.ask（事务内扣币）。
 * 下方：本圈公开问答列表（GET /question?circleId&isPublic=true），点卡片进详情。
 * 付费墙：列表不展示 answer，answer 仅详情页受墙渲染。
 * 说明：暂不接图片上传（无服务端图床管线，避免传设备本地临时路径造假），故无配图字段。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { questionApi, splitQuestion, type PaidQuestion } from '@/lib/circle-consult-data'

const circleId = ref('')
const answererId = ref('')
const expertName = ref('')
const expertAvatar = ref('')
const priceCoin = ref(0)
const peekEnabled = ref(false)
const peekPrice = ref<number | null>(null)

const newTitle = ref('')
const newContent = ref('')
const isPublic = ref(true)
const submitting = ref(false)

// 公开问答列表（围观广场）
const loading = ref(true)
const listError = ref('')
const questions = ref<PaidQuestion[]>([])

const canAsk = computed(() => !!circleId.value && !!answererId.value && priceCoin.value >= 10)
const canSubmit = computed(() => canAsk.value && newTitle.value.trim().length >= 2 && newContent.value.trim().length > 0 && !submitting.value)

async function loadList() {
  if (!circleId.value) { loading.value = false; return }
  loading.value = true
  listError.value = ''
  try {
    const res = await questionApi.list({ circleId: circleId.value, isPublic: true, page: 1, pageSize: 30 })
    questions.value = res.items
  } catch (e) {
    listError.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (submitting.value) return
  if (!canAsk.value) { uni.showToast({ title: '提问入口参数缺失', icon: 'none' }); return }
  if (newTitle.value.trim().length < 2) { uni.showToast({ title: '请填写问题标题', icon: 'none' }); return }
  if (!newContent.value.trim()) { uni.showToast({ title: '请填写问题内容', icon: 'none' }); return }
  submitting.value = true
  try {
    const q = await questionApi.ask({
      circleId: circleId.value,
      answererId: answererId.value,
      questionTitle: newTitle.value.trim(),
      question: newContent.value.trim(),
      priceCoin: priceCoin.value,
      isPublic: isPublic.value,
      peekPriceCoin: isPublic.value && peekEnabled.value && peekPrice.value ? Number(peekPrice.value) : undefined,
    })
    uni.showToast({ title: '提问已提交，已扣费', icon: 'success' })
    setTimeout(() => navigateTo(`/pkg-circle/circles/question-detail?id=${q.id}`), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function openDetail(id: string) {
  navigateTo(`/pkg-circle/circles/question-detail?id=${id}`)
}

onLoad((opt) => {
  circleId.value = (opt?.circleId || opt?.id || '') as string
  answererId.value = (opt?.answererId || opt?.expertId || '') as string
  expertName.value = (opt?.expertName || '') as string
  expertAvatar.value = (opt?.expertAvatar || '') as string
  priceCoin.value = Number(opt?.priceCoin) || 0
  const pk = Number(opt?.peekPriceCoin) || 0
  if (pk > 0) { peekEnabled.value = true; peekPrice.value = pk }
  loadList()
})
</script>

<template>
  <view class="ca-page">
    <view class="ca-nav">
      <view class="ca-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="36" color="#2C2C2C" /></view>
      <text class="ca-nav-title">图文咨询</text>
      <view class="ca-nav-btn" />
    </view>

    <view class="ca-body">
      <!-- 发起提问表单 -->
      <view class="ca-form">
        <view v-if="expertName" class="ca-expert">
          <image lazy-load v-if="expertAvatar" class="ca-expert-avatar" :src="expertAvatar" mode="aspectFill" />
          <text class="ca-expert-name">向 {{ expertName }} 提问</text>
        </view>

        <input v-model="newTitle" class="ca-input" maxlength="100" placeholder="问题标题（必填）" placeholder-class="ca-ph" />
        <textarea v-model="newContent" class="ca-textarea" maxlength="500" placeholder="详细描述您的问题…（最多500字）" placeholder-class="ca-ph" />

        <view class="ca-row" @tap="isPublic = !isPublic">
          <view class="ca-row-left">
            <text class="ca-row-t">公开问答</text>
            <text class="ca-row-sub">公开后其他用户可付费围观此问答</text>
          </view>
          <view class="ca-switch" :class="{ 'is-on': isPublic }"><view class="ca-switch-dot" /></view>
        </view>

        <view v-if="isPublic" class="ca-row">
          <view class="ca-row-left">
            <text class="ca-row-t">围观价格</text>
            <text class="ca-row-sub">他人围观答案需支付的金币，留空=不可围观</text>
          </view>
          <input
            v-model.number="peekPrice"
            class="ca-peek-input"
            type="number"
            placeholder="如 9"
            placeholder-class="ca-ph"
            @input="peekEnabled = !!peekPrice"
          />
        </view>

        <view class="ca-pay">
          <text class="ca-pay-t">本次提问支付</text>
          <text class="ca-pay-coin">{{ priceCoin }} 金币</text>
        </view>

        <view v-if="!canAsk" class="ca-warn">
          <app-icon name="alert-circle" :size="24" color="#C2660A" />
          <text class="ca-warn-t">提问入口参数缺失（请从达人「图文咨询」进入）</text>
        </view>

        <view class="ca-submit" :class="{ 'is-disabled': !canSubmit }" @tap="submit">
          <app-icon name="send" :size="26" color="#ffffff" />
          <text class="ca-submit-t">{{ submitting ? '提交中…' : '提交提问' }}</text>
        </view>
      </view>

      <text class="ca-section">本圈公开问答</text>

      <!-- 三态 -->
      <view v-if="loading" class="ca-state"><text class="ca-state-t">加载中…</text></view>
      <view v-else-if="listError" class="ca-state">
        <text class="ca-state-t">{{ listError }}</text>
        <view class="ca-retry" @tap="loadList"><text class="ca-retry-t">重试</text></view>
      </view>
      <view v-else-if="questions.length === 0" class="ca-state"><text class="ca-state-t">暂无公开问答</text></view>

      <view v-else class="ca-list">
        <view v-for="q in questions" :key="q.id" class="ca-card" @tap="openDetail(q.id)">
          <view class="ca-card-top">
            <image lazy-load class="ca-avatar" :src="q.asker?.avatar || ''" mode="aspectFill" />
            <view class="ca-card-info">
              <text class="ca-card-title">{{ splitQuestion(q.question).title || splitQuestion(q.question).body }}</text>
              <text class="ca-card-desc">{{ splitQuestion(q.question).body }}</text>
            </view>
            <view v-if="q.status === 'PENDING'" class="ca-badge"><text class="ca-badge-t">待答</text></view>
            <view v-else-if="q.status === 'ANSWERED'" class="ca-badge is-done"><text class="ca-badge-t is-done">已答</text></view>
          </view>
          <view class="ca-card-meta">
            <text class="ca-meta-asker">{{ q.asker?.nickname || '匿名' }}</text>
            <view class="ca-meta-stats">
              <view v-if="q.peekPriceCoin > 0" class="ca-stat"><app-icon name="eye" :size="22" color="#999999" /><text class="ca-stat-t">围观 {{ q.peekPriceCoin }}币</text></view>
              <view class="ca-stat"><app-icon name="users" :size="22" color="#999999" /><text class="ca-stat-t">{{ q.peekCount }}</text></view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ca-page { min-height: 100vh; background: #F5F1E8; }
.ca-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.ca-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ca-nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.ca-body { padding: 24rpx; padding-bottom: 48rpx; }
.ca-form { padding: 24rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; }
.ca-expert { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.ca-expert-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; }
.ca-expert-name { font-size: 26rpx; color: #2C2C2C; font-weight: 600; }
.ca-input { width: 100%; box-sizing: border-box; padding: 18rpx 20rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #FBF9F4; font-size: 28rpx; color: #2C2C2C; }
.ca-textarea { width: 100%; box-sizing: border-box; height: 180rpx; margin-top: 16rpx; padding: 18rpx 20rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #FBF9F4; font-size: 28rpx; color: #2C2C2C; }
.ca-ph { color: #b5aea3; }
.ca-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 20rpx; }
.ca-row-left { flex: 1; min-width: 0; }
.ca-row-t { display: block; font-size: 28rpx; color: #2C2C2C; font-weight: 500; }
.ca-row-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.ca-switch { width: 84rpx; height: 48rpx; border-radius: 999rpx; background: #D8D2C4; position: relative; transition: background .2s; flex-shrink: 0; }
.ca-switch.is-on { background: var(--brand); }
.ca-switch-dot { position: absolute; top: 4rpx; left: 4rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; transition: transform .2s; }
.ca-switch.is-on .ca-switch-dot { transform: translateX(36rpx); }
.ca-peek-input { width: 160rpx; box-sizing: border-box; padding: 12rpx 16rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #FBF9F4; font-size: 26rpx; color: #2C2C2C; text-align: right; flex-shrink: 0; }
.ca-pay { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; padding-top: 20rpx; border-top: 1rpx solid #F0EBE0; }
.ca-pay-t { font-size: 26rpx; color: #666; }
.ca-pay-coin { font-size: 32rpx; font-weight: 700; color: var(--brand); }
.ca-warn { display: flex; align-items: center; gap: 8rpx; margin-top: 16rpx; padding: 14rpx 16rpx; background: #FEF6EC; border-radius: 12rpx; }
.ca-warn-t { font-size: 22rpx; color: #C2660A; }
.ca-submit { display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 84rpx; margin-top: 24rpx; border-radius: 16rpx; background: var(--brand); }
.ca-submit.is-disabled { opacity: 0.5; }
.ca-submit-t { font-size: 28rpx; color: #fff; font-weight: 600; }
.ca-section { display: block; font-size: 26rpx; font-weight: 600; color: #2C2C2C; margin: 32rpx 0 16rpx; }
.ca-state { padding: 80rpx 0; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.ca-state-t { font-size: 26rpx; color: #999; }
.ca-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.ca-retry-t { font-size: 26rpx; color: #fff; }
.ca-list { display: flex; flex-direction: column; gap: 16rpx; }
.ca-card { padding: 24rpx; border-radius: 20rpx; border: 1rpx solid #E8E0D0; background: #fff; }
.ca-card-top { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 20rpx; }
.ca-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; background: #ECE6D8; }
.ca-card-info { flex: 1; min-width: 0; }
.ca-card-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ca-card-desc { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ca-badge { background: #FEF0E6; border-radius: 999rpx; padding: 4rpx 14rpx; flex-shrink: 0; }
.ca-badge.is-done { background: #E7F6EC; }
.ca-badge-t { font-size: 22rpx; color: #C2660A; }
.ca-badge-t.is-done { color: #16A34A; }
.ca-card-meta { display: flex; align-items: center; justify-content: space-between; }
.ca-meta-asker { font-size: 22rpx; color: #999; }
.ca-meta-stats { display: flex; align-items: center; gap: 20rpx; }
.ca-stat { display: flex; align-items: center; gap: 6rpx; }
.ca-stat-t { font-size: 22rpx; color: #999; }
</style>
