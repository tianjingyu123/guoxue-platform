<template>
  <view class="bd-page">
    <customer-service-fab />
    <!-- Header -->
    <view class="bd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="bd-header-row">
        <view class="bd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2c2c2c" />
        </view>
        <text class="bd-header-title">悬赏详情</text>
        <!-- 分享外溢裂变：微信原生转发，H5/App 复制带 ref 链接 -->
        <!-- #ifdef MP-WEIXIN -->
        <button class="bd-icon-btn bd-share-btn" open-type="share">
          <app-icon name="share-2" :size="40" color="#2c2c2c" />
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="bd-icon-btn" @tap="copyShareLink">
          <app-icon name="share-2" :size="40" color="#2c2c2c" />
        </view>
        <!-- #endif -->
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="bd-loading">
      <view class="bd-sk-line bd-sk-w75" />
      <view class="bd-sk-line bd-sk-w50" />
      <view class="bd-sk-block" />
    </view>

    <!-- Error -->
    <app-error v-else-if="error" title="悬赏加载失败" desc="网络异常，请稍后重试" @retry="loadBounty" />

    <!-- Not found -->
    <view v-else-if="!bounty" class="bd-notfound">
      <app-icon name="alert-circle" :size="96" color="#999999" />
      <text class="bd-notfound-text">悬赏不存在或已删除</text>
    </view>

    <template v-else>
      <!-- Bounty Info -->
      <view class="bd-info">
        <!-- Amount & Status -->
        <view class="bd-amount-card">
          <view class="bd-amount-row">
            <view class="bd-amount-left">
              <app-icon name="gift" :size="40" color="#d97706" />
              <text class="bd-amount-num">{{ bounty.bountyCoin }} 币</text>
            </view>
            <view class="bd-status" :class="'bd-status-' + bounty.status">
              <text class="bd-status-text" :class="'bd-status-text-' + bounty.status">{{ statusLabel(bounty.status) }}</text>
            </view>
          </view>
          <view v-if="bounty.status === 'CLAIMED' && bounty.lockExpireAt" class="bd-remain">
            <app-icon name="clock" :size="28" color="#b45309" />
            <text class="bd-remain-text">答主答题期限 {{ remainingLockTime(bounty.lockExpireAt) }}</text>
          </view>
        </view>

        <!-- Meta -->
        <view class="bd-meta">
          <text v-if="categoryLabel(bounty.category)" class="bd-cat">{{ categoryLabel(bounty.category) }}</text>
          <text class="bd-poster-time">{{ formatBountyDateTime(bounty.createdAt) }} 发布</text>
        </view>

        <!-- Title & Content -->
        <view class="bd-content-block">
          <text class="bd-content-title">{{ bounty.title }}</text>
          <text class="bd-content-text">{{ bounty.description }}</text>
        </view>

        <!-- Question Images -->
        <view v-if="bounty.images && bounty.images.length" class="bd-imgs">
          <image
            v-for="(img, i) in bounty.images"
            :key="i"
            :src="img"
            class="bd-img"
            mode="widthFix"
            @tap="previewImage(bounty.images, i)"
          />
        </view>
      </view>

      <!-- Answer -->
      <view class="bd-answers">
        <view class="bd-answers-head">
          <text class="bd-answers-title">答主回答</text>
        </view>

        <!-- 未有回答 -->
        <view v-if="!hasAnswer" class="bd-answers-empty">
          <app-icon name="message-circle" :size="80" color="#cccccc" />
          <text class="bd-answers-empty-text">{{ answerEmptyHint }}</text>
        </view>

        <!-- 已有回答（单一答主） -->
        <view v-else class="bd-answer">
          <view class="bd-answer-head">
            <view class="bd-answer-avatar">
              <app-icon name="user" :size="40" color="#2563eb" />
            </view>
            <view class="bd-answer-meta">
              <view class="bd-answer-meta-top">
                <text class="bd-answer-name">答主</text>
                <view v-if="bounty.status === 'SETTLED'" class="bd-accepted">
                  <app-icon name="check-circle" :size="24" color="#16a34a" />
                  <text class="bd-accepted-text">已采纳</text>
                </view>
              </view>
              <text v-if="bounty.answeredAt" class="bd-answer-time">{{ formatBountyDateTime(bounty.answeredAt) }}</text>
            </view>
          </view>

          <text class="bd-answer-content">{{ bounty.answer }}</text>

          <!-- Answer Images -->
          <view v-if="bounty.answerImages && bounty.answerImages.length" class="bd-imgs">
            <image
              v-for="(img, i) in bounty.answerImages"
              :key="i"
              :src="img"
              class="bd-img"
              mode="widthFix"
              @tap="previewImage(bounty.answerImages, i)"
            />
          </view>
        </view>
      </view>
    </template>

    <!-- Bottom Actions -->
    <view v-if="bounty" class="bd-bottom">
      <!-- 提问者视角 -->
      <view v-if="isAsker" class="bd-bottom-row">
        <view
          v-if="bounty.status === 'ANSWERED'"
          class="bd-btn-primary"
          :class="{ 'bd-btn-disabled': submitting }"
          @tap="onSettle"
        >
          <app-icon name="award" :size="32" color="#ffffff" />
          <text class="bd-btn-primary-text">{{ submitting ? '处理中...' : '采纳并解付赏金' }}</text>
        </view>
        <view
          v-else-if="bounty.status === 'OPEN' || bounty.status === 'CLAIMED'"
          class="bd-btn-warn"
          :class="{ 'bd-btn-disabled': submitting }"
          @tap="onRefund"
        >
          <text class="bd-btn-warn-text">{{ submitting ? '处理中...' : '撤销悬赏并退款' }}</text>
        </view>
        <view v-else class="bd-btn-done">
          <text class="bd-btn-done-text">{{ statusLabel(bounty.status) }}</text>
        </view>
      </view>

      <!-- 答主/围观者视角 -->
      <view v-else class="bd-bottom-row">
        <view v-if="bounty.status === 'OPEN'" class="bd-btn-primary" @tap="toAnswer">
          <app-icon name="send" :size="32" color="#ffffff" />
          <text class="bd-btn-primary-text">我要抢答</text>
        </view>
        <view v-else-if="bounty.status === 'CLAIMED' && isAnswerer" class="bd-btn-primary" @tap="toAnswer">
          <app-icon name="edit-3" :size="32" color="#ffffff" />
          <text class="bd-btn-primary-text">提交我的回答</text>
        </view>
        <view v-else-if="bounty.status === 'CLAIMED'" class="bd-btn-done">
          <text class="bd-btn-done-text">已被其他答主抢答</text>
        </view>
        <view v-else-if="bounty.status === 'ANSWERED' && isAnswerer" class="bd-btn-done">
          <text class="bd-btn-done-text">回答已提交，等待采纳</text>
        </view>
        <view v-else class="bd-btn-done">
          <text class="bd-btn-done-text">{{ statusLabel(bounty.status) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { navigateTo, navigateBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { withRef } from '@/utils/referral'
import { BRAND } from '@/lib/brand'
import {
  bountyApi,
  getMyUserId,
  formatBountyDateTime,
  remainingLockTime,
  BOUNTY_STATUS_LABEL,
  BOUNTY_CATEGORY_LABEL,
  type BountyQuestion,
  type BountyStatus,
} from '@/lib/bounty-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const bountyId = ref('')
const myId = getMyUserId()
const bounty = ref<BountyQuestion | null>(null)
const loading = ref(true)
const error = ref(false)
const submitting = ref(false)

function statusLabel(s: string): string {
  return BOUNTY_STATUS_LABEL[s as BountyStatus] || s
}
function categoryLabel(c: string): string {
  return BOUNTY_CATEGORY_LABEL[c as keyof typeof BOUNTY_CATEGORY_LABEL] || ''
}

const isAsker = computed(() => !!myId && bounty.value?.askerId === myId)
const isAnswerer = computed(() => !!myId && bounty.value?.answererId === myId)
const hasAnswer = computed(() => !!bounty.value?.answer && (bounty.value?.status === 'ANSWERED' || bounty.value?.status === 'SETTLED'))
const answerEmptyHint = computed(() => {
  const s = bounty.value?.status
  if (s === 'OPEN') return '暂无人抢答，快来抢答赢赏金'
  if (s === 'CLAIMED') return '答主已接单，正在作答中'
  return '暂无回答'
})

async function loadBounty() {
  loading.value = true
  error.value = false
  try {
    bounty.value = await bountyApi.detail(bountyId.value)
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function previewImage(urls: string[], current: number) {
  uni.previewImage({ urls, current: urls[current] })
}

function toAnswer() {
  navigateTo(`/bounty/answer?id=${bountyId.value}`)
}

async function onSettle() {
  if (submitting.value || !bounty.value) return
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '采纳并解付赏金',
      content: `采纳后 ${bounty.value!.bountyCoin} 国学币将解付给答主，此操作不可撤销。`,
      confirmText: '确认采纳',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    })
  })
  if (!res) return
  submitting.value = true
  try {
    await bountyApi.settle(bountyId.value)
    uni.showToast({ title: '已采纳，赏金已解付', icon: 'success' })
    await loadBounty()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '采纳失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function onRefund() {
  if (submitting.value || !bounty.value) return
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '撤销悬赏',
      content: `撤销后冻结的 ${bounty.value!.bountyCoin} 国学币将退回你的钱包。`,
      confirmText: '确认撤销',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    })
  })
  if (!res) return
  submitting.value = true
  try {
    await bountyApi.refund(bountyId.value)
    uni.showToast({ title: '已撤销，赏金已退回', icon: 'success' })
    await loadBounty()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '退款失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goBack() {
  navigateBack()
}

// ============ 分享外溢裂变（V7）============
// 好问题分享到站外，钩子=好奇+挑战+赏金诱惑；path 指向本悬赏详情，好友点开被吸引来答题/围观 → 需注册=拉新
const shareTitle = computed(() => {
  const b = bounty.value
  if (!b) return '悬赏求答：一道有意思的国学题，你会吗？'
  // 有赏金则突出赏金（虚拟币悬赏机制·仅展示不涉资金逻辑），否则用「悬赏求答」钩子
  return b.bountyCoin > 0
    ? `${b.bountyCoin}币悬赏这道国学题，你会吗？`
    : `悬赏求答：${b.title}`
})
// 分享落地=本悬赏详情页；withRef 在 useShare/H5 链接内自动追加分享者 ref 归因
const sharePath = computed(() => `/pkg-bounty/detail/index?id=${bounty.value?.id || bountyId.value}`)

const { toAppMessage, toTimeline } = useShare()
// 微信小程序原生转发（右上角菜单 / open-type="share" 按钮触发）
onShareAppMessage(() => toAppMessage({ title: shareTitle.value, path: sharePath.value }))
onShareTimeline(() => toTimeline({ title: shareTitle.value, path: sharePath.value }))

/** H5/App 端：复制带 ref 的完整链接 + 外溢文案到剪贴板（好友点开自动记归因） */
function copyShareLink() {
  const link = withRef(`https://api.rebugx.cn/h5/#${sharePath.value}`)
  const text = `${shareTitle.value} 来${BRAND.name}答题赢赏金 👉 ${link}`
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '分享文案已复制，快发给好友吧', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }),
  })
}

try {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1] as unknown as { options?: Record<string, string>; $page?: { options?: Record<string, string> } }
  const opts = cur?.options || cur?.$page?.options || {}
  bountyId.value = opts.id || ''
} catch (e) {
  bountyId.value = ''
}

loadBounty()
</script>

<style scoped>
.bd-page {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: 180rpx;
}

/* Header */
.bd-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border-bottom: 2rpx solid #e8e3db;
}
.bd-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
}
.bd-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}
.bd-header-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
/* 原生 share 按钮复位（去默认边框/背景/内边距，与 view 版图标按钮视觉一致） */
.bd-share-btn {
  padding: 0;
  margin: 0;
  line-height: normal;
  background: transparent;
  border: none;
}
.bd-share-btn::after {
  border: none;
}

/* Loading / Notfound */
.bd-loading {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bd-sk-line {
  height: 40rpx;
  border-radius: 8rpx;
  background: #ececec;
}
.bd-sk-w75 { width: 75%; }
.bd-sk-w50 { width: 50%; }
.bd-sk-block {
  height: 256rpx;
  border-radius: 24rpx;
  background: #ececec;
}
.bd-notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 24rpx;
}
.bd-notfound-text {
  font-size: 28rpx;
  color: #999999;
}

/* Info */
.bd-info {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.bd-amount-card {
  background: linear-gradient(90deg, #fffbeb 0%, #fff7ed 100%);
  border-radius: 32rpx;
  padding: 32rpx;
}
.bd-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bd-amount-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bd-amount-num {
  font-size: 48rpx;
  font-weight: 700;
  color: #d97706;
}
.bd-status {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
}
.bd-status-OPEN { background: #f0fdf4; }
.bd-status-CLAIMED { background: #eff6ff; }
.bd-status-ANSWERED { background: #fff7ed; }
.bd-status-SETTLED { background: rgba(196, 30, 58, 0.1); }
.bd-status-REFUNDED { background: #f5f5f4; }
.bd-status-CLOSED { background: #f5f5f4; }
.bd-status-EXPIRED { background: #f5f5f4; }
.bd-status-text {
  font-size: 26rpx;
  font-weight: 500;
}
.bd-status-text-OPEN { color: #16a34a; }
.bd-status-text-CLAIMED { color: #2563eb; }
.bd-status-text-ANSWERED { color: #ea580c; }
.bd-status-text-SETTLED { color: var(--brand); }
.bd-status-text-REFUNDED { color: #999999; }
.bd-status-text-CLOSED { color: #999999; }
.bd-status-text-EXPIRED { color: #999999; }
.bd-remain {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;
}
.bd-remain-text {
  font-size: 26rpx;
  color: #b45309;
}

/* Meta */
.bd-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bd-cat {
  font-size: 22rpx;
  color: var(--brand);
  background: rgba(196, 30, 58, 0.08);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}
.bd-poster-time {
  font-size: 22rpx;
  color: #999999;
}

/* Content */
.bd-content-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
  line-height: 1.4;
}
.bd-content-text {
  display: block;
  font-size: 28rpx;
  color: rgba(44, 44, 44, 0.8);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* Images */
.bd-imgs {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.bd-img {
  width: 100%;
  border-radius: 16rpx;
  background: #f5f5f4;
}

/* Answers */
.bd-answers {
  margin-top: 16rpx;
}
.bd-answers-head {
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #f0f0ef;
}
.bd-answers-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bd-answers-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
  gap: 16rpx;
}
.bd-answers-empty-text {
  font-size: 26rpx;
  color: #999999;
}
.bd-answer {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bd-answer-head {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.bd-answer-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bd-answer-meta {
  flex: 1;
  min-width: 0;
}
.bd-answer-meta-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}
.bd-answer-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bd-accepted {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  background: #f0fdf4;
  border-radius: 8rpx;
}
.bd-accepted-text {
  font-size: 20rpx;
  color: #16a34a;
}
.bd-answer-time {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}
.bd-answer-content {
  display: block;
  font-size: 28rpx;
  color: rgba(44, 44, 44, 0.8);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* Bottom */
.bd-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 2rpx solid #e8e3db;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.bd-bottom-row {
  display: flex;
  gap: 24rpx;
}
.bd-btn-disabled {
  opacity: 0.6;
}
.bd-btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  height: 88rpx;
  background: var(--brand);
  border-radius: 24rpx;
}
.bd-btn-primary-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
.bd-btn-warn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: #f59e0b;
  border-radius: 24rpx;
}
.bd-btn-warn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
.bd-btn-done {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: #f5f5f4;
  border-radius: 24rpx;
}
.bd-btn-done-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #999999;
}
</style>
