<script setup lang="ts">
/**
 * V4 双人合盘 · 发起页
 * 选我的八字盘 → 生成合盘邀请 → 展示邀请卡（分享 + 复制链接）。
 * R3：邀请只携带令牌，不暴露任何生辰/命盘；对方授权后双方仅共享合婚报告文本。
 */
import { ref, onMounted } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { useShare } from '@/composables/useShare'
import { coupleApi, type MyBaziRecord, type CoupleInviteResult } from '@/lib/couple-data'

const { toAppMessage, toTimeline } = useShare()

// —— 选盘阶段 ——
const loggedIn = ref(true)
const loading = ref(true)
const error = ref('')
const records = ref<MyBaziRecord[]>([])
const selectedId = ref('')

// —— 邀请阶段 ——
const submitting = ref(false)
const invited = ref<CoupleInviteResult | null>(null)

/** 分享落地路径（携带令牌；useShare 会自动追加分享者 ref 归因） */
function sharePath(): string {
  return `/pkg-paipan/couple/accept?token=${invited.value?.inviteToken || ''}`
}

async function loadRecords() {
  loading.value = true
  error.value = ''
  try {
    records.value = await coupleApi.myBaziRecords()
    if (records.value.length && !selectedId.value) selectedId.value = records.value[0].id
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function onGenerate() {
  if (submitting.value || !selectedId.value) return
  submitting.value = true
  try {
    invited.value = await coupleApi.invite(selectedId.value)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function copyLink() {
  const url = invited.value?.shareUrl
  if (!url) return
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制，发给 TA 即可', icon: 'none' }),
  })
}

function goResult() {
  // 邀请刚生成时对方尚未授权，进详情页可查看等待态
  if (invited.value?.id) navigateTo(`/pkg-paipan/couple/result?id=${invited.value.id}`)
}

onMounted(() => {
  if (!getToken()) {
    loggedIn.value = false
    loading.value = false
    return
  }
  loadRecords()
})

// 微信原生分享（好友/群 + 朋友圈）；路径自动带 ref 归因
onShareAppMessage(() =>
  toAppMessage({ title: '和我测测我们的缘分合盘', path: sharePath() }),
)
onShareTimeline(() =>
  toTimeline({ title: '和我测测我们的缘分合盘', path: sharePath() }),
)
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666" /></view>
      <text class="hdr-title">双人合盘</text>
      <view class="hdr-link" @tap="navigateTo('/pkg-paipan/couple/mine')"><text class="hdr-link-t">我的合盘</text></view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 顶部说明卡 -->
      <view class="hero">
        <view class="hero-icon"><app-icon name="heart" :size="56" color="#fff" /></view>
        <text class="hero-title">缘分合婚 · 双人合盘</text>
        <text class="hero-sub">选择你的八字盘，邀请 TA 授权自己的盘，共同生成一份缘分合婚报告。彼此的生辰互不可见，只共享报告结论。</text>
      </view>

      <!-- 未登录 -->
      <view v-if="!loggedIn" class="state">
        <app-icon name="user" :size="88" color="#ccc" />
        <text class="state-t">登录后即可发起双人合盘</text>
        <view class="btn btn-primary" @tap="navigateTo('/login')"><text class="btn-t">去登录</text></view>
      </view>

      <!-- 已生成邀请：邀请卡 -->
      <template v-else-if="invited">
        <view class="card invite-card">
          <view class="ic-badge"><app-icon name="check" :size="36" color="#fff" /></view>
          <text class="ic-title">邀请已生成</text>
          <text class="ic-sub">把链接发给 TA，对方授权自己的八字盘后即可生成合婚报告。邀请 7 天内有效。</text>
          <view class="ic-url"><text class="ic-url-t">{{ invited.shareUrl }}</text></view>
          <view class="ic-actions">
            <button class="share-btn" open-type="share"><app-icon name="share-2" :size="30" color="#fff" /><text class="share-btn-t">分享给 TA</text></button>
            <view class="copy-btn" @tap="copyLink"><app-icon name="copy" :size="30" color="var(--brand)" /><text class="copy-btn-t">复制链接</text></view>
          </view>
        </view>
        <view class="foot-links">
          <text class="foot-link" @tap="goResult">查看合盘状态</text>
          <text class="foot-dot">·</text>
          <text class="foot-link" @tap="navigateTo('/pkg-paipan/couple/mine')">我的合盘列表</text>
        </view>
      </template>

      <!-- 选盘态 -->
      <template v-else>
        <view class="sec-title-row">
          <text class="sec-title">选择我的八字盘</text>
        </view>

        <!-- loading -->
        <view v-if="loading" class="state">
          <view class="skel" v-for="i in 3" :key="i" />
        </view>

        <!-- error -->
        <view v-else-if="error" class="state">
          <app-icon name="alert-circle" :size="80" color="#ccc" />
          <text class="state-t">{{ error }}</text>
          <view class="btn btn-ghost" @tap="loadRecords"><text class="btn-t-ghost">重试</text></view>
        </view>

        <!-- empty -->
        <view v-else-if="records.length === 0" class="state">
          <app-icon name="inbox" :size="88" color="#ccc" />
          <text class="state-t">你还没有八字排盘记录</text>
          <text class="state-sub">先给自己排一张八字盘，再来发起合盘吧</text>
          <view class="btn btn-primary" @tap="navigateTo('/paipan/bazi')"><text class="btn-t">去排盘</text></view>
        </view>

        <!-- records -->
        <view v-else class="list">
          <view
            v-for="r in records"
            :key="r.id"
            class="rec"
            :class="{ 'rec-on': selectedId === r.id }"
            @tap="selectedId = r.id"
          >
            <view class="radio" :class="{ 'radio-on': selectedId === r.id }">
              <view v-if="selectedId === r.id" class="radio-dot" />
            </view>
            <view class="rec-info">
              <text class="rec-name">{{ r.name }}</text>
              <text v-if="r.birth" class="rec-birth">{{ r.birth }}</text>
            </view>
          </view>
        </view>

        <view v-if="records.length" class="cta-bar">
          <view class="btn btn-primary btn-block" :class="{ 'btn-disabled': submitting || !selectedId }" @tap="onGenerate">
            <text class="btn-t">{{ submitting ? '生成中…' : '生成合盘邀请' }}</text>
          </view>
        </view>
      </template>

      <view class="disclaimer">
        <text class="disclaimer-t">合婚分析仅供传统文化研究学习，不构成任何婚恋决策建议。双方生辰全程加密，互不可见。</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: var(--card, #fff); border-bottom: 2rpx solid var(--border, #eee); padding-top: calc(var(--status-bar-height, 0px) + 16rpx); }
.hdr-back { width: 88rpx; height: 88rpx; margin: -18rpx; display: flex; align-items: center; justify-content: center; } /* 触控热区≥88rpx：容器扩大+负margin保持视觉位置 */
.hdr-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.hdr-link { padding: 6rpx 12rpx; }
.hdr-link-t { font-size: 24rpx; color: var(--brand); }
.body { flex: 1; }

/* 顶部说明卡 */
.hero { margin: 24rpx; padding: 40rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg, #c41e3a, rgba(196,30,58,0.82)); display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { width: 112rpx; height: 112rpx; border-radius: 28rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.hero-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 24rpx; color: rgba(255,255,255,0.88); line-height: 1.6; margin-top: 12rpx; }

/* 分区标题 */
.sec-title-row { padding: 8rpx 32rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }

/* 状态区 */
.state { display: flex; flex-direction: column; align-items: center; padding: 80rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); }
.state-sub { font-size: 24rpx; color: var(--text-soft, #bbb); }
.skel { width: calc(100% - 64rpx); height: 120rpx; margin: 12rpx 0; border-radius: 20rpx; background: #eee; }

/* 记录列表 */
.list { padding: 8rpx 24rpx 0; }
.rec { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 24rpx; margin-bottom: 16rpx; border-radius: 20rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.rec-on { border-color: var(--brand); background: rgba(196,30,58,0.04); }
.radio { width: 40rpx; height: 40rpx; border-radius: 999rpx; border: 3rpx solid var(--border, #ddd); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio-on { border-color: var(--brand); }
.radio-dot { width: 22rpx; height: 22rpx; border-radius: 999rpx; background: var(--brand); }
.rec-info { flex: 1; min-width: 0; }
.rec-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); }
.rec-birth { display: block; font-size: 22rpx; color: var(--text-soft, #999); margin-top: 6rpx; }

/* CTA */
.cta-bar { padding: 24rpx 32rpx 8rpx; }
.btn { padding: 24rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-block { width: 100%; }
.btn-primary { background: var(--brand); }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--border, #ddd); background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: var(--text-soft, #666); }
.btn-disabled { opacity: 0.5; }

/* 邀请卡 */
.card { margin: 8rpx 24rpx 0; padding: 40rpx 32rpx; border-radius: 28rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.invite-card { display: flex; flex-direction: column; align-items: center; text-align: center; }
.ic-badge { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #10b981; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.ic-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.ic-sub { font-size: 24rpx; color: var(--text-soft, #999); line-height: 1.6; margin-top: 12rpx; }
.ic-url { width: 100%; margin-top: 24rpx; padding: 20rpx 24rpx; border-radius: 16rpx; background: var(--secondary, #f5f5f5); }
.ic-url-t { font-size: 22rpx; color: var(--text-soft, #888); word-break: break-all; }
.ic-actions { width: 100%; display: flex; gap: 20rpx; margin-top: 28rpx; }
.share-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 22rpx 0; border-radius: 999rpx; background: var(--brand); line-height: 1.4; border: none; }
.share-btn::after { border: none; }
.share-btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.copy-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 22rpx 0; border-radius: 999rpx; border: 2rpx solid var(--brand); }
.copy-btn-t { font-size: 28rpx; font-weight: 600; color: var(--brand); }

.foot-links { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 32rpx 0 8rpx; }
.foot-link { font-size: 26rpx; color: var(--brand); }
.foot-dot { color: var(--text-soft, #ccc); }

.disclaimer { padding: 32rpx 40rpx 48rpx; }
.disclaimer-t { font-size: 22rpx; color: var(--text-soft, #aaa); line-height: 1.6; text-align: center; }
</style>
