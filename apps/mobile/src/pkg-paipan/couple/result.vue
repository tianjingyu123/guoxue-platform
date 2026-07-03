<script setup lang="ts">
/**
 * V4 双人合盘 · 合婚报告页（onLoad 取 id）
 * 展示合婚报告文本 + 双方昵称 + 状态；PENDING 等待对方授权态。
 * 分享按钮引导他人发起自己的合盘（再裂变）；删除软删己方可见性。
 * R3：仅报告文本 + 昵称，绝不含任何生辰/命盘。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack, redirectTo } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { coupleApi, COUPLE_STATUS_LABEL, type CoupleDetail } from '@/lib/couple-data'

const { toAppMessage, toTimeline } = useShare()

const id = ref('')
const loading = ref(true)
const error = ref('')
const forbidden = ref(false)
const detail = ref<CoupleDetail | null>(null)
const deleting = ref(false)

/** 报告正文分段（后端返回纯文本/含换行；# 开头视为小标题） */
const paragraphs = computed(() => {
  const raw = detail.value?.analysisContent || ''
  return raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const heading = /^#{1,6}\s+/.test(line)
      return { heading, text: line.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '') }
    })
})

const shareTitle = computed(() =>
  detail.value
    ? `${detail.value.initiatorNickname || 'TA'} 与 ${detail.value.partnerNickname || 'TA'} 的缘分合婚`
    : '来测测你们的缘分合盘',
)

async function loadDetail() {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    detail.value = await coupleApi.detail(id.value)
  } catch (e) {
    const msg = (e as Error)?.message || '加载失败'
    if (msg.includes('无权')) forbidden.value = true
    error.value = msg
  } finally {
    loading.value = false
  }
}

function onDelete() {
  if (deleting.value) return
  uni.showModal({
    title: '删除合盘',
    content: '删除后你将不再看到这份合婚报告，确定删除吗？',
    confirmColor: '#c41e3a',
    success: async (r) => {
      if (!r.confirm || deleting.value) return
      deleting.value = true
      try {
        await coupleApi.remove(id.value)
        uni.showToast({ title: '已删除', icon: 'none' })
        redirectTo('/pkg-paipan/couple/mine')
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
      } finally {
        deleting.value = false
      }
    },
  })
}

onLoad((q: Record<string, string> = {}) => {
  id.value = q.id || ''
})

onMounted(() => {
  if (!id.value) {
    error.value = '合盘 ID 缺失'
    loading.value = false
    return
  }
  loadDetail()
})

// 分享引导他人发起自己的合盘（本人报告私密不可分享，故分享落地到合盘发起页）
onShareAppMessage(() => toAppMessage({ title: shareTitle.value + '，你也来测测？', path: '/pkg-paipan/couple/invite' }))
onShareTimeline(() => toTimeline({ title: shareTitle.value + '，你也来测测？', path: '/pkg-paipan/couple/invite' }))
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666" /></view>
      <text class="hdr-title">合婚报告</text>
      <view v-if="detail" class="hdr-del" @tap="onDelete"><app-icon name="trash-2" :size="34" color="#999" /></view>
      <view v-else class="hdr-ph" />
    </view>

    <scroll-view scroll-y class="body">
      <!-- loading -->
      <view v-if="loading" class="state">
        <view class="skel skel-hero" />
        <view class="skel" v-for="i in 4" :key="i" />
      </view>

      <!-- 403 无权 -->
      <view v-else-if="forbidden" class="state">
        <app-icon name="lock" :size="88" color="#ccc" />
        <text class="state-t">这份合婚报告仅合盘双方可见</text>
        <view class="btn btn-ghost" @tap="navigateBack()"><text class="btn-t-ghost">返回</text></view>
      </view>

      <!-- error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="88" color="#ccc" />
        <text class="state-t">{{ error }}</text>
        <view class="btn btn-ghost" @tap="loadDetail"><text class="btn-t-ghost">重试</text></view>
      </view>

      <template v-else-if="detail">
        <!-- 双方 + 状态 -->
        <view class="hero">
          <view class="couple">
            <view class="party">
              <view class="party-av"><app-icon name="user" :size="40" color="#fff" /></view>
              <text class="party-name">{{ detail.initiatorNickname || 'TA' }}</text>
            </view>
            <view class="party-link"><app-icon name="heart" :size="40" color="#fff" /></view>
            <view class="party">
              <view class="party-av"><app-icon name="user" :size="40" color="#fff" /></view>
              <text class="party-name">{{ detail.partnerNickname || '待授权' }}</text>
            </view>
          </view>
          <view class="status-chip"><text class="status-chip-t">{{ COUPLE_STATUS_LABEL[detail.status] }}</text></view>
        </view>

        <!-- 等待对方授权 -->
        <view v-if="detail.status === 'PENDING_INVITE'" class="state">
          <app-icon name="clock" :size="88" color="#d4a017" />
          <text class="state-t">等待对方授权自己的八字盘</text>
          <text class="state-sub">对方授权后即可生成合婚报告，可稍后回来查看</text>
          <view class="btn btn-ghost" @tap="loadDetail"><text class="btn-t-ghost">刷新状态</text></view>
        </view>

        <!-- 对方婉拒 -->
        <view v-else-if="detail.status === 'REJECTED'" class="state">
          <app-icon name="x-circle" :size="88" color="#ccc" />
          <text class="state-t">对方婉拒了本次合盘</text>
          <text class="state-sub">可以重新发起一次邀请</text>
          <view class="btn btn-primary" @tap="navigateTo('/pkg-paipan/couple/invite')"><text class="btn-t">重新发起</text></view>
        </view>

        <!-- 过期 -->
        <view v-else-if="detail.status === 'EXPIRED'" class="state">
          <app-icon name="clock" :size="88" color="#ccc" />
          <text class="state-t">邀请已过期</text>
          <view class="btn btn-primary" @tap="navigateTo('/pkg-paipan/couple/invite')"><text class="btn-t">重新发起</text></view>
        </view>

        <!-- 已授权：报告正文 -->
        <template v-else>
          <view v-if="paragraphs.length" class="report">
            <view class="report-head">
              <app-icon name="scroll-text" :size="36" color="var(--brand)" />
              <text class="report-title">缘分合婚分析</text>
            </view>
            <view v-for="(p, i) in paragraphs" :key="i" :class="p.heading ? 'p-head' : 'p-body'">
              <text :class="p.heading ? 'p-head-t' : 'p-body-t'">{{ p.text }}</text>
            </view>
          </view>
          <view v-else class="state">
            <app-icon name="file-text" :size="88" color="#ccc" />
            <text class="state-t">报告内容暂不可用</text>
          </view>

          <!-- 分享再裂变 -->
          <view class="share-bar">
            <button class="share-btn" open-type="share"><app-icon name="share-2" :size="30" color="#fff" /><text class="share-btn-t">分享 · 邀好友也来测</text></button>
          </view>
        </template>
      </template>

      <view class="disclaimer">
        <text class="disclaimer-t">合婚分析仅供传统文化研究学习，不构成任何婚恋决策建议。</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: var(--card, #fff); border-bottom: 2rpx solid var(--border, #eee); padding-top: calc(var(--status-bar-height, 0px) + 16rpx); }
.hdr-back { padding: 6rpx; }
.hdr-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.hdr-del, .hdr-ph { width: 52rpx; padding: 6rpx; }
.body { flex: 1; }

.hero { margin: 24rpx; padding: 40rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg, #c41e3a, rgba(196,30,58,0.82)); display: flex; flex-direction: column; align-items: center; }
.couple { display: flex; align-items: center; gap: 32rpx; }
.party { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.party-av { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.party-name { font-size: 26rpx; color: #fff; max-width: 180rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.party-link { display: flex; align-items: center; justify-content: center; }
.status-chip { margin-top: 24rpx; padding: 6rpx 24rpx; border-radius: 999rpx; background: rgba(255,255,255,0.22); }
.status-chip-t { font-size: 22rpx; color: #fff; }

.state { display: flex; flex-direction: column; align-items: center; padding: 72rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); text-align: center; }
.state-sub { font-size: 24rpx; color: var(--text-soft, #bbb); text-align: center; }
.skel { width: calc(100% - 64rpx); height: 60rpx; margin: 10rpx 0; border-radius: 16rpx; background: #eee; }
.skel-hero { height: 240rpx; margin: 12rpx 0; border-radius: 28rpx; }

/* 报告 */
.report { margin: 8rpx 24rpx 0; padding: 32rpx 28rpx; border-radius: 24rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.report-head { display: flex; align-items: center; gap: 14rpx; padding-bottom: 20rpx; margin-bottom: 12rpx; border-bottom: 2rpx solid var(--border, #f0f0f0); }
.report-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.p-head { margin: 20rpx 0 8rpx; }
.p-head-t { font-size: 28rpx; font-weight: 600; color: var(--brand); }
.p-body { margin: 12rpx 0; }
.p-body-t { font-size: 27rpx; color: var(--text-ink, #333); line-height: 1.8; }

.share-bar { padding: 28rpx 32rpx 8rpx; }
.share-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 24rpx 0; border-radius: 999rpx; background: var(--brand); border: none; line-height: 1.4; }
.share-btn::after { border: none; }
.share-btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }

.btn { padding: 22rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-primary { background: var(--brand); }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--border, #ddd); background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: var(--text-soft, #666); }

.disclaimer { padding: 32rpx 40rpx 48rpx; }
.disclaimer-t { font-size: 22rpx; color: var(--text-soft, #aaa); line-height: 1.6; text-align: center; }
</style>
