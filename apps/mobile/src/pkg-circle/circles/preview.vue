<script setup lang="ts">
/**
 * 圈子预览页（转化关键页）— V0 circle-join-preview.html + circle-join-confirm-sheet.html 还原（2026-07-10）
 * 结构：透明顶栏 → 封面 → 身份区(名称/简介/数据) → 圈主行 → 圈主的话(intro 降级) → 权益清单 → 内容抢先看(精华2条+锁) → 底部加入通栏(三方式)
 * 加入三方式（circle-join-modes.html）：免费直接加入 / 免费需审批提交申请 / 付费走确认弹层→支付。
 * 数据：circleDetailApi.detail + getJoinStatus + posts（真连）；付费支付复用 PurchaseSheet（bizType=CIRCLE）。
 * 降级（后端缺）：圈主的话图文块→description/announcement 文本；权益清单→通用四项；本周更新数/圈主头衔副行→隐藏；申请理由输入→后端 join 无 message 字段不做。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import PurchaseSheet from '@/components/common/purchase-sheet.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { formatPrice } from '@/utils/format'
import { track } from '@/composables/useTrack'
import {
  circleDetailApi, memberBenefits,
  type CircleDetail, type CirclePost,
} from '@/lib/circle-detail-data'

const circleId = ref('')
const circle = ref<CircleDetail | null>(null)
const previewPosts = ref<CirclePost[]>([])
const isLoading = ref(true)
const error = ref('')
const isJoined = ref(false)
const applied = ref(false)
const joining = ref(false)
const introExpanded = ref(false)
const showConfirmSheet = ref(false)
const showPurchase = ref(false)

const isLoggedIn = () => !!getToken()

/** 加入方式：免费 / 免费需审批 / 付费 */
const joinMode = computed<'free' | 'approval' | 'paid'>(() => {
  const c = circle.value
  if (!c) return 'free'
  if (c.type !== 'FREE') return 'paid'
  return c.needApproval ? 'approval' : 'free'
})

/** 圈主的话（后端无 circle_intro 图文块 → description + 公告降级） */
const introParas = computed(() => {
  const c = circle.value
  if (!c) return []
  const paras: string[] = []
  if (c.description) paras.push(c.description)
  if (c.announcement) paras.push(c.announcement)
  return paras
})
const introLong = computed(() => introParas.value.join('').length > 120)
const introShown = computed(() => {
  if (!introLong.value || introExpanded.value) return introParas.value
  const joined = introParas.value.join('\n')
  return [joined.slice(0, 120) + '…']
})

async function loadData() {
  isLoading.value = true
  error.value = ''
  try {
    const [c, p] = await Promise.all([
      circleDetailApi.detail(circleId.value),
      circleDetailApi.posts(circleId.value),
    ])
    circle.value = c
    isJoined.value = c.isJoined
    // 抢先看：精华优先，不足补最新帖，最多 2 条（真数据）
    const essence = p.data.filter((x) => x.isEssence)
    previewPosts.value = [...essence, ...p.data.filter((x) => !x.isEssence)].slice(0, 2)
    if (isLoggedIn()) {
      const st = await circleDetailApi.getJoinStatus(circleId.value)
      isJoined.value = st.joined
    }
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

function requireLogin(): boolean {
  if (isLoggedIn()) return true
  uni.showToast({ title: '请先登录', icon: 'none' })
  setTimeout(() => navigateTo('/pkg-auth/login/index'), 600)
  return false
}

/** 底部主按钮 */
function handleJoin() {
  if (isJoined.value) { enterCircle(); return }
  if (applied.value) { navigateTo('/pkg-circle/circles/my-join-requests'); return }
  if (joining.value || !circle.value) return
  if (!requireLogin()) return
  if (joinMode.value === 'paid') { showConfirmSheet.value = true; return }
  doFreeJoin()
}

/** 免费圈 / 免费需审批圈提交（submitting 防重复） */
async function doFreeJoin() {
  if (joining.value) return
  joining.value = true
  try {
    const r = await circleDetailApi.join(circleId.value)
    if (joinMode.value === 'approval' || r?.status === 'pending') {
      applied.value = true
      uni.showToast({ title: r?.message || '申请已提交，等待圈主审核', icon: 'none' })
    } else {
      isJoined.value = true
      uni.showToast({ title: `欢迎加入「${circle.value?.name || '圈子'}」`, icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '加入失败，请重试', icon: 'none' })
  } finally {
    joining.value = false
  }
}

/** 付费确认弹层 → 拉起支付 */
function confirmPaidJoin() {
  showConfirmSheet.value = false
  showPurchase.value = true
}
async function onPurchased() {
  showPurchase.value = false
  track.purchase({ type: 'circle', id: circle.value?.id, amount: circle.value?.price })
  const st = await circleDetailApi.getJoinStatus(circleId.value)
  isJoined.value = st.joined
  if (st.joined) uni.showToast({ title: `欢迎加入「${circle.value?.name || '圈子'}」`, icon: 'none' })
  else uni.showToast({ title: '订单已提交，支付完成后自动加入', icon: 'none' })
}

function enterCircle() { navigateTo(`/pkg-circle/circles/detail?id=${circleId.value}`) }
function openOwner() { if (circle.value?.owner.id) navigateTo(`/pkg-circle/user/profile?id=${circle.value.owner.id}`) }
function openShare() { navigateTo(`/pkg-circle/common/share-poster?type=circle&targetId=${circleId.value}`) }
function fmt(n: number) { return n.toLocaleString() }

onLoad((q) => {
  circleId.value = (q?.id || q?.circleId || '') as string
  loadData()
})
</script>

<template>
  <!-- 骨架屏 -->
  <view v-if="isLoading" class="jp-page">
    <view class="jp-skel-cover" />
    <view class="jp-skel-line w60" /><view class="jp-skel-line w90" />
    <view class="jp-skel-card" /><view class="jp-skel-card" />
  </view>

  <!-- 错误态 -->
  <view v-else-if="error || !circle" class="jp-page jp-err">
    <text class="jp-err-t">{{ error || '加载失败' }}</text>
    <view class="jp-err-retry" @tap="loadData"><text class="jp-err-retry-t">重试</text></view>
  </view>

  <view v-else class="jp-page has-bar">
    <!-- 顶栏：透明浮层 -->
    <view class="jp-topbar">
      <view class="jp-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="32" color="#2C2C2C" /></view>
      <view class="jp-icon-btn" @tap="openShare"><app-icon name="share-2" :size="30" color="#2C2C2C" /></view>
    </view>

    <!-- 封面与身份 -->
    <view class="jp-cover">
      <smart-cover class="jp-cover-img" :src="circle.cover" :title="circle.name" type="circle" />
    </view>
    <view class="jp-identity">
      <text class="jp-name">{{ circle.name }}</text>
      <text v-if="circle.description" class="jp-desc">{{ circle.description }}</text>
    </view>
    <view class="jp-stats">
      <text class="jp-stat"><text class="jp-stat-b">{{ fmt(circle.members) }}</text> 位成员</text>
      <text class="jp-stat"><text class="jp-stat-b">{{ fmt(circle.posts) }}</text> 条内容</text>
    </view>

    <!-- 圈主行 -->
    <view class="jp-owner-row" @tap="openOwner">
      <view class="jp-owner-avatar">
        <image v-if="circle.owner.avatar" lazy-load class="jp-owner-img" :src="circle.owner.avatar" mode="aspectFill" />
        <view v-else class="jp-owner-img jp-owner-ph"><app-icon name="user" :size="30" color="#C9A96E" /></view>
      </view>
      <view class="jp-owner-main">
        <text class="jp-owner-name">{{ circle.owner.name }} <text class="jp-owner-tag">圈主</text></text>
      </view>
      <app-icon name="chevron-right" :size="28" color="#999999" />
    </view>

    <!-- 圈主介绍区（description/公告降级渲染） -->
    <template v-if="introParas.length">
      <text class="jp-label">圈主的话</text>
      <view class="jp-intro">
        <text v-for="(p, i) in introShown" :key="i" class="jp-intro-p">{{ p }}</text>
        <view v-if="introLong" class="jp-intro-fold" @tap="introExpanded = !introExpanded">
          <text class="jp-intro-fold-t">{{ introExpanded ? '收起介绍' : '展开介绍' }}</text>
          <app-icon :name="introExpanded ? 'chevron-up' : 'chevron-down'" :size="24" color="#6E6E73" />
        </view>
      </view>
    </template>

    <!-- 权益清单（后端无圈子自定义权益 → 通用四项降级） -->
    <text class="jp-label">加入后你将获得</text>
    <view class="jp-benefits">
      <view v-for="(b, i) in memberBenefits" :key="i" class="jp-benefit">
        <view class="jp-benefit-icon"><app-icon :name="b.icon" :size="34" color="#C9A96E" /></view>
        <view class="jp-benefit-main">
          <text class="jp-benefit-title">{{ b.title }}</text>
          <text class="jp-benefit-desc">{{ b.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 内容预览：勾兴趣但不可深入 -->
    <template v-if="previewPosts.length">
      <text class="jp-label">圈内内容抢先看</text>
      <view v-for="p in previewPosts" :key="p.id" class="jp-preview-card">
        <view class="jp-preview-meta">
          <text v-if="p.isEssence" class="jp-essence">精华</text>
          <text class="jp-preview-author">{{ p.author.name }} · {{ p.createdAt }}</text>
        </view>
        <text class="jp-preview-text">{{ p.content }}</text>
      </view>
      <view class="jp-preview-lock">
        <app-icon name="lock" :size="26" color="#999999" />
        <text class="jp-preview-lock-t">加入后解锁全部 {{ fmt(circle.posts) }} 条内容</text>
      </view>
    </template>

    <!-- 底部通栏：三方式分流（同一组件切换文案与流程） -->
    <view class="jp-join-bar">
      <view class="jp-join-price">
        <template v-if="isJoined"><text class="jp-free">已加入</text></template>
        <template v-else-if="joinMode === 'paid'">
          <text class="jp-price-num">¥{{ formatPrice(circle.price) }}</text>
          <text v-if="circle.type === 'YEARLY'" class="jp-price-unit"> / 年</text>
        </template>
        <template v-else-if="joinMode === 'approval'"><text class="jp-free">免费 · 需审批</text></template>
        <template v-else><text class="jp-free">免费</text></template>
      </view>
      <view
        class="jp-join-btn"
        :class="{ secondary: joinMode === 'approval' && !isJoined, disabled: joining }"
        @tap="handleJoin"
      >
        <text class="jp-join-btn-t">
          {{ joining ? '正在处理…' : isJoined ? '进入圈子' : applied ? '申请已提交 · 查看进度' : joinMode === 'paid' ? '加入圈子' : joinMode === 'approval' ? '申请加入' : '免费加入' }}
        </text>
      </view>
    </view>

    <!-- 付费加入 · 权益确认弹层（V0 circle-join-confirm-sheet） -->
    <view v-if="showConfirmSheet" class="jp-overlay" @tap="showConfirmSheet = false">
      <view class="jp-sheet" @tap.stop>
        <view class="jp-sheet-handle" />
        <view class="jp-sheet-head">
          <view class="jp-sheet-cover">
            <smart-cover class="jp-sheet-cover-img" :src="circle.cover" :title="circle.name" type="circle" />
          </view>
          <view class="jp-sheet-main">
            <text class="jp-sheet-name">{{ circle.name }}</text>
            <text class="jp-sheet-sub">{{ circle.type === 'YEARLY' ? '年费会员 · 自加入日起 365 天' : '一次付费 · 长期有效' }}</text>
          </view>
          <view class="jp-sheet-price">
            <text class="jp-sheet-price-num">¥{{ formatPrice(circle.price) }}</text>
            <text v-if="circle.type === 'YEARLY'" class="jp-sheet-price-unit">/ 年</text>
          </view>
        </view>

        <view class="jp-sheet-benefits">
          <view v-for="(b, i) in memberBenefits" :key="i" class="jp-sheet-benefit">
            <view class="jp-sheet-benefit-icon"><app-icon :name="b.icon" :size="30" color="#C9A96E" /></view>
            <view class="jp-benefit-main">
              <text class="jp-sheet-benefit-title">{{ b.title }}</text>
              <text class="jp-sheet-benefit-desc">{{ b.desc }}</text>
            </view>
          </view>
        </view>

        <text class="jp-terms">虚拟内容服务一经使用不支持无理由退款，退款按实际使用天数扣费并收取 20% 手续费。支付即代表同意《圈子会员服务协议》。</text>

        <view class="jp-sheet-actions">
          <view class="jp-sheet-btn cancel" @tap="showConfirmSheet = false"><text class="jp-sheet-btn-t cancel">再想想</text></view>
          <view class="jp-sheet-btn primary" @tap="confirmPaidJoin"><text class="jp-sheet-btn-t primary">立即加入 ¥{{ formatPrice(circle.price) }}</text></view>
        </view>
      </view>
    </view>

    <!-- 支付弹窗（复用通用购买组件·真下单链路） -->
    <purchase-sheet
      :open="showPurchase"
      :product="{ id: circle.id, name: circle.name, cover: circle.cover, price: circle.price }"
      biz-type="CIRCLE" :allow-qty="false"
      @close="showPurchase = false" @paid="onPurchased"
    />
  </view>
</template>

<style scoped lang="scss">
.jp-page { min-height: 100vh; background: var(--bg-page, #faf8f5); }
.jp-page.has-bar { padding-bottom: 184rpx; }

/* 骨架 */
.jp-skel-cover { height: 296rpx; margin: 96rpx 32rpx 0; border-radius: 36rpx; background: #ede7dd; }
.jp-skel-line { height: 28rpx; border-radius: 14rpx; background: #ede7dd; margin: 24rpx 40rpx 0; }
.jp-skel-line.w60 { width: 60%; } .jp-skel-line.w90 { width: 86%; }
.jp-skel-card { height: 220rpx; border-radius: 36rpx; background: #fff; margin: 28rpx 32rpx 0; }

/* 错误态 */
.jp-err { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28rpx; }
.jp-err-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.jp-err-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.jp-err-retry-t { font-size: 26rpx; color: #fff; }

/* 顶栏 */
.jp-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.jp-icon-btn {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}

/* 封面与身份 */
.jp-cover { margin: 8rpx 32rpx 0; border-radius: 36rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.jp-cover-img { width: 100%; height: 296rpx; display: block; }
.jp-identity { margin: 32rpx 40rpx 0; display: flex; flex-direction: column; }
.jp-name { font-size: 44rpx; font-weight: 700; letter-spacing: 1rpx; color: var(--text-primary, #2c2c2c); }
.jp-desc { margin-top: 12rpx; font-size: 28rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6; }
.jp-stats { display: flex; align-items: center; gap: 28rpx; margin: 24rpx 40rpx 0; }
.jp-stat { font-size: 26rpx; color: var(--text-tertiary, #999); }
.jp-stat-b { color: var(--text-primary, #2c2c2c); font-weight: 600; }

/* 圈主行 */
.jp-owner-row {
  display: flex; align-items: center; gap: 20rpx; margin: 28rpx 32rpx 0;
  background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 24rpx 28rpx;
}
.jp-owner-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; box-shadow: 0 0 0 3rpx var(--gold, #c9a96e); }
.jp-owner-img { width: 72rpx; height: 72rpx; border-radius: 999rpx; }
.jp-owner-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.jp-owner-main { flex: 1; min-width: 0; }
.jp-owner-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.jp-owner-tag { font-size: 22rpx; color: var(--gold, #c9a96e); }

/* 分区标题 */
.jp-label { display: block; margin: 44rpx 40rpx 20rpx; font-size: 26rpx; color: var(--text-tertiary, #999); }

/* 圈主介绍区 */
.jp-intro {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 36rpx 36rpx 40rpx;
}
.jp-intro-p { display: block; font-size: 28rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; }
.jp-intro-p + .jp-intro-p { margin-top: 24rpx; }
.jp-intro-fold {
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
  margin-top: 28rpx; padding-top: 24rpx; border-top: 1rpx solid var(--separator, #ede7dd);
}
.jp-intro-fold-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }

/* 权益清单 */
.jp-benefits {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.jp-benefit { display: flex; align-items: flex-start; gap: 24rpx; padding: 28rpx 32rpx; }
.jp-benefit + .jp-benefit { border-top: 1rpx solid var(--separator, #ede7dd); }
.jp-benefit-icon {
  width: 68rpx; height: 68rpx; border-radius: 20rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.jp-benefit-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.jp-benefit-title { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.jp-benefit-desc { font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; line-height: 1.5; }

/* 内容预览 */
.jp-preview-card {
  margin: 0 32rpx 20rpx; background: var(--bg-card, #fff);
  border-radius: 28rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 28rpx 32rpx;
}
.jp-preview-meta { display: flex; align-items: center; gap: 16rpx; }
.jp-essence { padding: 0 10rpx; border-radius: 8rpx; font-size: 20rpx; border: 1rpx solid var(--gold, #c9a96e); color: var(--gold, #c9a96e); }
.jp-preview-author { font-size: 24rpx; color: var(--text-tertiary, #999); }
.jp-preview-text {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-top: 12rpx; font-size: 28rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6;
}
.jp-preview-lock {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  margin: 8rpx 32rpx 0; padding: 26rpx;
  border-radius: 28rpx; background: var(--bg-warm, #f8f4ec);
}
.jp-preview-lock-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }

/* 底部通栏 */
.jp-join-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
  display: flex; align-items: center; justify-content: space-between; gap: 24rpx;
}
.jp-join-price { flex-shrink: 0; display: flex; align-items: baseline; }
.jp-price-num { font-size: 40rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.jp-price-unit { font-size: 24rpx; color: var(--text-tertiary, #999); }
.jp-free { font-size: 28rpx; color: var(--text-secondary, #6e6e73); font-weight: 500; }
.jp-join-btn {
  flex: 1; height: 88rpx; border-radius: 44rpx; max-width: 420rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.jp-join-btn.secondary { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.jp-join-btn.disabled { opacity: 0.6; }
.jp-join-btn:active { opacity: 0.88; }
.jp-join-btn-t { font-size: 30rpx; font-weight: 600; letter-spacing: 2rpx; color: #fff; }
.jp-join-btn.secondary .jp-join-btn-t { color: var(--brand, #c41e3a); }

/* 付费确认弹层 */
.jp-overlay { position: fixed; inset: 0; z-index: 40; background: rgba(44, 44, 44, 0.4); display: flex; flex-direction: column; justify-content: flex-end; }
.jp-sheet {
  background: var(--bg-page, #faf8f5);
  border-radius: 44rpx 44rpx 0 0;
  padding: 20rpx 40rpx calc(32rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -16rpx 64rpx rgba(44, 44, 44, 0.12);
}
.jp-sheet-handle { width: 72rpx; height: 8rpx; border-radius: 4rpx; background: var(--separator, #ede7dd); margin: 0 auto 28rpx; }
.jp-sheet-head { display: flex; align-items: center; gap: 24rpx; }
.jp-sheet-cover { width: 104rpx; height: 104rpx; border-radius: 24rpx; overflow: hidden; flex-shrink: 0; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.jp-sheet-cover-img { width: 104rpx; height: 104rpx; }
.jp-sheet-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.jp-sheet-name { font-size: 32rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.jp-sheet-sub { font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.jp-sheet-price { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; }
.jp-sheet-price-num { font-size: 44rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.jp-sheet-price-unit { font-size: 24rpx; color: var(--text-tertiary, #999); }
.jp-sheet-benefits {
  margin-top: 32rpx; background: var(--bg-card, #fff);
  border-radius: 28rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.jp-sheet-benefit { display: flex; align-items: flex-start; gap: 22rpx; padding: 24rpx 28rpx; }
.jp-sheet-benefit + .jp-sheet-benefit { border-top: 1rpx solid var(--separator, #ede7dd); }
.jp-sheet-benefit-icon {
  width: 60rpx; height: 60rpx; border-radius: 18rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.jp-sheet-benefit-title { font-size: 27rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.jp-sheet-benefit-desc { font-size: 23rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; line-height: 1.5; }
.jp-terms { display: block; margin: 24rpx 8rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.6; }
.jp-sheet-actions { display: flex; gap: 24rpx; margin-top: 28rpx; }
.jp-sheet-btn {
  flex: 1; height: 92rpx; border-radius: 46rpx;
  display: flex; align-items: center; justify-content: center;
}
.jp-sheet-btn.cancel { background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.jp-sheet-btn.primary { background: var(--brand, #c41e3a); }
.jp-sheet-btn:active { opacity: 0.88; }
.jp-sheet-btn-t { font-size: 30rpx; font-weight: 600; }
.jp-sheet-btn-t.cancel { color: var(--text-secondary, #6e6e73); }
.jp-sheet-btn-t.primary { color: #fff; letter-spacing: 1rpx; }
</style>
