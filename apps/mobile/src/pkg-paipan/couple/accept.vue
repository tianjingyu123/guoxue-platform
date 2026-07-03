<script setup lang="ts">
/**
 * V4 双人合盘 · 被邀请落地页（onLoad 取 query token）
 * 看邀请（发起人昵称）→ 登录 → 选我的八字盘 → 授权合盘 / 婉拒。
 * R3：授权的是「用自己的盘参与本次合盘」，不向发起方暴露生辰/命盘，双方仅共享报告文本。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, redirectTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { coupleApi, type MyBaziRecord, type CoupleInviteInfo } from '@/lib/couple-data'

const token = ref('')
const loggedIn = ref(true)

// 邀请信息
const loading = ref(true)
const error = ref('')
const info = ref<CoupleInviteInfo | null>(null)

// 选盘
const recordsLoading = ref(false)
const recordsError = ref('')
const records = ref<MyBaziRecord[]>([])
const selectedId = ref('')

// 写操作
const submitting = ref(false)
const rejecting = ref(false)

/** 邀请是否可操作（待授权且未过期） */
const actionable = computed(
  () => info.value?.status === 'PENDING_INVITE' && !info.value?.expired,
)

async function loadInvite() {
  loading.value = true
  error.value = ''
  try {
    info.value = await coupleApi.getInvite(token.value)
  } catch (e) {
    error.value = (e as Error)?.message || '邀请加载失败'
  } finally {
    loading.value = false
  }
  // 已登录 + 可操作 → 顺带加载我的盘
  if (actionable.value && loggedIn.value) loadRecords()
}

async function loadRecords() {
  recordsLoading.value = true
  recordsError.value = ''
  try {
    records.value = await coupleApi.myBaziRecords()
    if (records.value.length && !selectedId.value) selectedId.value = records.value[0].id
  } catch (e) {
    recordsError.value = (e as Error)?.message || '排盘记录加载失败'
  } finally {
    recordsLoading.value = false
  }
}

async function onAccept() {
  if (submitting.value || rejecting.value || !selectedId.value) return
  submitting.value = true
  try {
    const res = await coupleApi.accept(token.value, selectedId.value)
    redirectTo(`/pkg-paipan/couple/result?id=${res.chartId}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '授权失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function onReject() {
  if (submitting.value || rejecting.value) return
  rejecting.value = true
  try {
    await coupleApi.reject(token.value)
    uni.showToast({ title: '已婉拒', icon: 'none' })
    if (info.value) info.value.status = 'REJECTED'
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    rejecting.value = false
  }
}

onLoad((q: Record<string, string> = {}) => {
  token.value = q.token || ''
})

onMounted(() => {
  loggedIn.value = !!getToken()
  if (!token.value) {
    error.value = '邀请令牌缺失'
    loading.value = false
    return
  }
  loadInvite()
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666" /></view>
      <text class="hdr-title">合盘邀请</text>
      <view class="hdr-ph" />
    </view>

    <scroll-view scroll-y class="body">
      <!-- loading -->
      <view v-if="loading" class="state">
        <view class="skel skel-hero" />
        <view class="skel" v-for="i in 3" :key="i" />
      </view>

      <!-- error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="88" color="#ccc" />
        <text class="state-t">{{ error }}</text>
        <view v-if="token" class="btn btn-ghost" @tap="loadInvite"><text class="btn-t-ghost">重试</text></view>
      </view>

      <template v-else-if="info">
        <!-- 邀请人卡片 -->
        <view class="hero">
          <view class="hero-icon"><app-icon name="heart" :size="56" color="#fff" /></view>
          <text class="hero-title">{{ info.initiatorNickname || 'TA' }} 邀请你测两人合盘</text>
          <text class="hero-sub">授权用你的八字盘参与这次合盘，共同生成一份缘分合婚报告。你的生辰不会透露给对方，双方只共享报告结论。</text>
        </view>

        <!-- 过期 -->
        <view v-if="info.expired || info.status === 'EXPIRED'" class="state">
          <app-icon name="clock" :size="88" color="#ccc" />
          <text class="state-t">邀请已过期</text>
          <text class="state-sub">请让 TA 重新发起一次合盘邀请</text>
        </view>

        <!-- 已授权 -->
        <view v-else-if="info.status === 'AUTHORIZED'" class="state">
          <app-icon name="check-circle" :size="88" color="#10b981" />
          <text class="state-t">这次合盘已经授权完成</text>
          <view class="btn btn-primary" @tap="navigateTo('/pkg-paipan/couple/mine')"><text class="btn-t">查看我的合盘</text></view>
        </view>

        <!-- 已婉拒 -->
        <view v-else-if="info.status === 'REJECTED'" class="state">
          <app-icon name="x-circle" :size="88" color="#ccc" />
          <text class="state-t">你已婉拒这次合盘邀请</text>
        </view>

        <!-- 未登录 -->
        <view v-else-if="!loggedIn" class="state">
          <app-icon name="user" :size="88" color="#ccc" />
          <text class="state-t">登录后即可授权参与合盘</text>
          <view class="btn btn-primary" @tap="navigateTo('/login')"><text class="btn-t">去登录</text></view>
          <text class="state-sub">登录后重新打开邀请链接即可继续</text>
        </view>

        <!-- 可操作：选盘 + 授权/婉拒 -->
        <template v-else>
          <view class="sec-title-row"><text class="sec-title">选择你的八字盘</text></view>

          <view v-if="recordsLoading" class="state">
            <view class="skel" v-for="i in 3" :key="i" />
          </view>

          <view v-else-if="recordsError" class="state">
            <app-icon name="alert-circle" :size="80" color="#ccc" />
            <text class="state-t">{{ recordsError }}</text>
            <view class="btn btn-ghost" @tap="loadRecords"><text class="btn-t-ghost">重试</text></view>
          </view>

          <view v-else-if="records.length === 0" class="state">
            <app-icon name="inbox" :size="88" color="#ccc" />
            <text class="state-t">你还没有八字排盘记录</text>
            <text class="state-sub">先给自己排一张八字盘，再来授权合盘</text>
            <view class="btn btn-primary" @tap="navigateTo('/paipan/bazi')"><text class="btn-t">去排盘</text></view>
          </view>

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
            <view class="btn btn-primary btn-block" :class="{ 'btn-disabled': submitting || rejecting || !selectedId }" @tap="onAccept">
              <text class="btn-t">{{ submitting ? '授权中…' : '授权合盘' }}</text>
            </view>
            <view class="btn btn-ghost btn-block reject-btn" :class="{ 'btn-disabled': submitting || rejecting }" @tap="onReject">
              <text class="btn-t-ghost">{{ rejecting ? '处理中…' : '婉拒' }}</text>
            </view>
          </view>
        </template>
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
.hdr-back { padding: 6rpx; }
.hdr-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.hdr-ph { width: 52rpx; }
.body { flex: 1; }

.hero { margin: 24rpx; padding: 40rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg, #c41e3a, rgba(196,30,58,0.82)); display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { width: 112rpx; height: 112rpx; border-radius: 28rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.hero-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 24rpx; color: rgba(255,255,255,0.88); line-height: 1.6; margin-top: 12rpx; }

.sec-title-row { padding: 8rpx 32rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }

.state { display: flex; flex-direction: column; align-items: center; padding: 72rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); }
.state-sub { font-size: 24rpx; color: var(--text-soft, #bbb); text-align: center; }
.skel { width: calc(100% - 64rpx); height: 120rpx; margin: 12rpx 0; border-radius: 20rpx; background: #eee; }
.skel-hero { height: 240rpx; }

.list { padding: 8rpx 24rpx 0; }
.rec { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 24rpx; margin-bottom: 16rpx; border-radius: 20rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.rec-on { border-color: var(--brand); background: rgba(196,30,58,0.04); }
.radio { width: 40rpx; height: 40rpx; border-radius: 999rpx; border: 3rpx solid var(--border, #ddd); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio-on { border-color: var(--brand); }
.radio-dot { width: 22rpx; height: 22rpx; border-radius: 999rpx; background: var(--brand); }
.rec-info { flex: 1; min-width: 0; }
.rec-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); }
.rec-birth { display: block; font-size: 22rpx; color: var(--text-soft, #999); margin-top: 6rpx; }

.cta-bar { padding: 24rpx 32rpx 8rpx; display: flex; flex-direction: column; gap: 16rpx; }
.btn { padding: 24rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-block { width: 100%; }
.btn-primary { background: var(--brand); }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--border, #ddd); background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: var(--text-soft, #666); }
.reject-btn { padding: 20rpx 48rpx; }
.btn-disabled { opacity: 0.5; }

.disclaimer { padding: 32rpx 40rpx 48rpx; }
.disclaimer-t { font-size: 22rpx; color: var(--text-soft, #aaa); line-height: 1.6; text-align: center; }
</style>
