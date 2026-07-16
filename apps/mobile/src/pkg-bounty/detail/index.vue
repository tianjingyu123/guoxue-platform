<template>
  <view class="bd-page">
    <customer-service-fab />
    <!-- 顶栏 -->
    <view class="bd-topbar">
      <view class="bd-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="bd-title">悬赏问答</text>
      <!-- 分享外溢裂变：微信原生转发，H5/App 复制带 ref 链接 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="bd-share bd-share-btn" open-type="share">
        <app-icon name="share-2" :size="36" color="#2C2C2C" />
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="bd-share" @tap="copyShareLink">
        <app-icon name="share-2" :size="36" color="#2C2C2C" />
      </view>
      <!-- #endif -->
    </view>

    <!-- Loading -->
    <view v-if="loading" class="bd-state">
      <view class="bd-skel" /><view class="bd-skel sm" />
    </view>

    <!-- Error -->
    <app-error v-else-if="error" title="悬赏加载失败" desc="网络异常，请稍后重试" @retry="loadBounty" />

    <!-- Not found -->
    <view v-else-if="!bounty" class="bd-state">
      <app-icon name="alert-circle" :size="80" color="#999999" />
      <text class="bd-state-t">悬赏不存在或已删除</text>
    </view>

    <template v-else>
      <!-- 悬赏横幅：金额＋状态＋进度 -->
      <view class="bd-banner">
        <view class="bd-banner-coin"><app-icon name="coins" :size="36" color="#C9A96E" /></view>
        <view class="bd-banner-main">
          <text class="bd-banner-amt">{{ bounty.bountyCoin }} <text class="bd-banner-u">金币悬赏</text></text>
          <text class="bd-banner-sub">{{ bannerSub }}</text>
        </view>
        <text class="bd-banner-state" :class="bounty.status === 'SETTLED' ? 'is-done' : bounty.status === 'OPEN' || bounty.status === 'CLAIMED' || bounty.status === 'ANSWERED' ? 'is-open' : 'is-off'">{{ statusLabel(bounty.status) }}</text>
      </view>

      <!-- 问题卡 -->
      <view class="bd-question">
        <text class="bd-q-title">{{ bounty.title }}</text>
        <view class="bd-q-meta">
          <text v-if="categoryLabel(bounty.category)" class="bd-q-cat">{{ categoryLabel(bounty.category) }}</text>
          <text class="bd-q-time">发布于 {{ formatBountyDateTime(bounty.createdAt) }}</text>
        </view>
        <text class="bd-q-body">{{ bounty.description }}</text>
        <view v-if="bounty.images && bounty.images.length" class="bd-imgs">
          <image
            v-for="(img, i) in bounty.images" :key="i" lazy-load
            :src="img" class="bd-img" mode="aspectFill"
            @tap="previewImage(bounty.images, i)"
          />
        </view>
      </view>

      <!-- 回答区（后端单人抢答模型：最多一位答主一段回答） -->
      <text class="bd-label">{{ hasAnswer ? (bounty.status === 'SETTLED' ? '最佳答案' : '答主回答 · 待采纳') : '答主回答' }}</text>

      <!-- 无回答 -->
      <view v-if="!hasAnswer" class="bd-empty-answer">
        <app-icon name="message-circle" :size="64" color="#CCCCCC" />
        <text class="bd-empty-t">{{ answerEmptyHint }}</text>
        <text v-if="bounty.status === 'CLAIMED' && bounty.lockExpireAt" class="bd-empty-sub">答主答题期限 {{ remainingLockTime(bounty.lockExpireAt) }}</text>
      </view>

      <!-- 有回答（SETTLED 金描边最佳答案 / ANSWERED 普通卡+采纳操作） -->
      <view v-else class="bd-answer" :class="{ 'is-best': bounty.status === 'SETTLED' }">
        <text v-if="bounty.status === 'SETTLED'" class="bd-best-badge">已采纳</text>
        <view class="bd-a-head">
          <view class="bd-a-avatar"><app-icon name="user" :size="34" color="#C9A96E" /></view>
          <view class="bd-a-info">
            <text class="bd-a-name">答主</text>
            <text v-if="bounty.answeredAt" class="bd-a-time">{{ formatBountyDateTime(bounty.answeredAt) }}</text>
          </view>
        </view>
        <text class="bd-a-body">{{ bounty.answer }}</text>
        <view v-if="bounty.answerImages && bounty.answerImages.length" class="bd-imgs">
          <image
            v-for="(img, i) in bounty.answerImages" :key="i" lazy-load
            :src="img" class="bd-img" mode="aspectFill"
            @tap="previewImage(bounty.answerImages, i)"
          />
        </view>
        <text v-if="bounty.status === 'SETTLED'" class="bd-best-earn">获得悬赏 +{{ bounty.bountyCoin }} 金币</text>
        <view v-if="isAsker && bounty.status === 'ANSWERED'" class="bd-adopt-row">
          <view class="bd-adopt-btn" :class="{ 'is-disabled': submitting }" @tap="onSettle">
            <text class="bd-adopt-t">{{ submitting ? '处理中…' : `采纳并支付 ${bounty.bountyCoin} 金币` }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 底部操作栏 -->
    <view v-if="bounty" class="bd-bottom">
      <!-- 提问者视角 -->
      <template v-if="isAsker">
        <view
          v-if="bounty.status === 'OPEN' || bounty.status === 'CLAIMED'"
          class="bd-btn-outline" :class="{ 'is-disabled': submitting }"
          @tap="onRefund"
        >
          <text class="bd-btn-outline-t">{{ submitting ? '处理中…' : '撤销悬赏并退款' }}</text>
        </view>
        <view v-else-if="bounty.status === 'ANSWERED'" class="bd-btn-primary" :class="{ 'is-disabled': submitting }" @tap="onSettle">
          <text class="bd-btn-primary-t">{{ submitting ? '处理中…' : `采纳并支付 ${bounty.bountyCoin} 金币` }}</text>
        </view>
        <view v-else class="bd-btn-done"><text class="bd-btn-done-t">{{ statusLabel(bounty.status) }}</text></view>
      </template>

      <!-- 答主/围观者视角 -->
      <template v-else>
        <view v-if="bounty.status === 'OPEN'" class="bd-btn-primary" @tap="toAnswer">
          <app-icon name="send" :size="30" color="#ffffff" />
          <text class="bd-btn-primary-t">我要抢答</text>
        </view>
        <view v-else-if="bounty.status === 'CLAIMED' && isAnswerer" class="bd-btn-primary" @tap="toAnswer">
          <app-icon name="edit-3" :size="30" color="#ffffff" />
          <text class="bd-btn-primary-t">提交我的回答</text>
        </view>
        <view v-else-if="bounty.status === 'CLAIMED'" class="bd-btn-done"><text class="bd-btn-done-t">已被其他答主抢答</text></view>
        <view v-else-if="bounty.status === 'ANSWERED' && isAnswerer" class="bd-btn-done"><text class="bd-btn-done-t">回答已提交，等待采纳</text></view>
        <view v-else class="bd-btn-done"><text class="bd-btn-done-t">{{ statusLabel(bounty.status) }}</text></view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 悬赏问答详情 — V0 circle-consult-bounty-detail.html 还原（2026-07-10 批④）
 * 结构：顶栏(分享) → 悬赏横幅(金额+状态+进度) → 问题卡 → 回答区(已采纳=金描边最佳答案+获赏金额；
 *       竞答中=回答卡+提问者采纳操作) → 底部操作栏(采纳/撤销/抢答按角色与状态分支)。
 * 口径（后端为准·记台账）：后端为单人抢答模型（claim 锁定 72h + 单一回答），V0「多位竞答/折叠其余
 *   回答/答主从业资历」无后端支撑 → 单回答渲染、无资历行（悬赏表无用户关联，答主仅能匿名展示）；
 *   V0「到期未采纳自动退回」无有效期字段 → 横幅按抢答锁 lockExpireAt 展示答题期限。
 */
import { ref, computed } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppError from '@/components/common/app-error.vue'
import CustomerServiceFab from '@/components/common/customer-service-fab.vue'
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

/** 横幅副行：状态进度说明（全按后端真实规则） */
const bannerSub = computed(() => {
  const b = bounty.value
  if (!b) return ''
  switch (b.status) {
    case 'OPEN': return '等待达人抢答 · 未被回答前可撤销退回'
    case 'CLAIMED': return `答主已接单 · ${remainingLockTime(b.lockExpireAt)}内作答`
    case 'ANSWERED': return '已有回答 · 采纳后悬赏归答主'
    case 'SETTLED': return '已采纳答主的回答 · 赏金已解付'
    case 'REFUNDED': return '悬赏已撤销 · 金币已退回钱包'
    default: return '悬赏已结束'
  }
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
      content: `采纳后 ${bounty.value!.bountyCoin} 金币将解付给答主，此操作不可撤销。`,
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
      content: `撤销后托管的 ${bounty.value!.bountyCoin} 金币将退回你的钱包。`,
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
  const link = withRef(`https://api.rebugx.cn/h5${sharePath.value}`)
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

<style scoped lang="scss">
.bd-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 200rpx; }

/* 顶栏 */
.bd-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.bd-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.bd-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.bd-share { display: flex; padding: 8rpx; }
/* 原生 share 按钮复位（去默认边框/背景/内边距，与 view 版图标按钮视觉一致） */
.bd-share-btn { margin: 0; line-height: normal; background: transparent; border: none; }
.bd-share-btn::after { border: none; }

/* 三态 */
.bd-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.bd-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.bd-skel { width: 100%; height: 300rpx; border-radius: 36rpx; background: #ede7dd; }
.bd-skel.sm { height: 180rpx; }

/* 悬赏横幅 */
.bd-banner {
  margin: 24rpx 32rpx 0; padding: 26rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
}
.bd-banner-coin {
  width: 76rpx; height: 76rpx; border-radius: 999rpx; flex-shrink: 0;
  background: rgba(201, 169, 110, 0.15);
  display: flex; align-items: center; justify-content: center;
}
.bd-banner-main { flex: 1; min-width: 0; }
.bd-banner-amt { display: block; font-size: 30rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.bd-banner-u { font-size: 22rpx; font-weight: 500; color: var(--text-tertiary, #999); }
.bd-banner-sub { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.bd-banner-state { flex-shrink: 0; padding: 6rpx 18rpx; border-radius: 18rpx; font-size: 22rpx; font-weight: 500; }
.bd-banner-state.is-open { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); color: var(--brand, #c41e3a); }
.bd-banner-state.is-done { background: rgba(91, 138, 94, 0.1); color: #5b8a5e; }
.bd-banner-state.is-off { background: var(--bg-card, #fff); color: var(--text-tertiary, #999); }

/* 问题卡 */
.bd-question {
  margin: 24rpx 32rpx 0; padding: 32rpx 36rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.bd-q-title { display: block; font-size: 32rpx; font-weight: 600; line-height: 1.5; color: var(--text-primary, #2c2c2c); }
.bd-q-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.bd-q-cat { padding: 2rpx 14rpx; border-radius: 10rpx; font-size: 20rpx; border: 1rpx solid var(--gold, #c9a96e); color: var(--gold, #c9a96e); }
.bd-q-time { font-size: 24rpx; color: var(--text-tertiary, #999); }
.bd-q-body { display: block; margin-top: 20rpx; font-size: 28rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; }
.bd-imgs { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.bd-img { width: 256rpx; height: 192rpx; border-radius: 20rpx; background: var(--bg-warm, #f8f4ec); }

/* 回答区 */
.bd-label { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.bd-empty-answer {
  margin: 0 32rpx; padding: 64rpx 32rpx; text-align: center;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; flex-direction: column; align-items: center; gap: 16rpx;
}
.bd-empty-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.bd-empty-sub { font-size: 22rpx; color: #c97b2d; }

.bd-answer {
  position: relative; margin: 0 32rpx; padding: 28rpx 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.bd-answer.is-best { border: 2rpx solid var(--gold, #c9a96e); }
.bd-best-badge {
  position: absolute; top: -18rpx; left: 32rpx;
  padding: 4rpx 20rpx; border-radius: 18rpx;
  background: var(--gold, #c9a96e); color: #fff;
  font-size: 22rpx; font-weight: 600;
}
.bd-a-head { display: flex; align-items: center; gap: 20rpx; margin-top: 8rpx; }
.bd-a-avatar {
  width: 68rpx; height: 68rpx; border-radius: 999rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.bd-a-info { flex: 1; min-width: 0; }
.bd-a-name { display: block; font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.bd-a-time { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.bd-a-body { display: block; margin-top: 20rpx; font-size: 28rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; }
.bd-best-earn { display: block; margin-top: 20rpx; font-size: 24rpx; color: var(--gold, #c9a96e); font-weight: 600; }
.bd-adopt-row { display: flex; justify-content: flex-end; margin-top: 20rpx; }
.bd-adopt-btn { height: 64rpx; padding: 0 36rpx; border-radius: 32rpx; background: var(--brand-soft, rgba(196, 30, 58, 0.08)); display: flex; align-items: center; justify-content: center; }
.bd-adopt-btn.is-disabled { opacity: 0.5; }
.bd-adopt-t { font-size: 26rpx; font-weight: 600; color: var(--brand, #c41e3a); }

/* 底部操作 */
.bd-bottom {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.94); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
  display: flex; gap: 20rpx;
}
.bd-btn-primary {
  flex: 1; height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
}
.bd-btn-primary.is-disabled { opacity: 0.5; }
.bd-btn-primary:active { opacity: 0.88; }
.bd-btn-primary-t { font-size: 30rpx; font-weight: 600; color: #fff; }
.bd-btn-outline {
  flex: 1; height: 92rpx; border-radius: 46rpx;
  border: 1rpx solid var(--separator, #ede7dd); background: var(--bg-card, #fff);
  display: flex; align-items: center; justify-content: center;
}
.bd-btn-outline.is-disabled { opacity: 0.5; }
.bd-btn-outline-t { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.bd-btn-done {
  flex: 1; height: 92rpx; border-radius: 46rpx; background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.bd-btn-done-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
</style>
