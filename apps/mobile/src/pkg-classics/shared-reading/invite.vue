<script setup lang="ts">
/**
 * V3 共读拼团 · 招募落地页（onLoad 取 query token）
 * 看招募卡（书名/发起人/已N人/需M人成团）→ 登录 → 加入共读 → 跳详情。
 * 未登录引导登录后重开链接；已满/已加入/已开读走友好态。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, redirectTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { captureRefFromQuery } from '@/utils/referral'
import {
  sharedReadingApi,
  SHARED_READING_STATUS_LABEL,
  type SharedReadingInviteInfo,
} from '@/lib/shared-reading-data'

const token = ref('')
const loggedIn = ref(true)

const loading = ref(true)
const error = ref('')
const info = ref<SharedReadingInviteInfo | null>(null)

const joining = ref(false)

/** 是否可加入（招募中） */
const joinable = computed(() => info.value?.status === 'RECRUITING')
const stillNeed = computed(() =>
  info.value ? Math.max(0, info.value.minMembers - info.value.memberCount) : 0,
)

async function loadInvite() {
  loading.value = true
  error.value = ''
  try {
    info.value = await sharedReadingApi.inviteInfo(token.value)
  } catch (e) {
    error.value = (e as Error)?.message || '招募信息加载失败'
  } finally {
    loading.value = false
  }
}

async function onJoin() {
  if (joining.value) return
  if (!loggedIn.value) { navigateTo('/login'); return }
  joining.value = true
  try {
    const res = await sharedReadingApi.join(token.value)
    uni.showToast({ title: '已加入共读', icon: 'success' })
    redirectTo(`/pkg-classics/shared-reading/detail?id=${res.groupId}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '加入失败', icon: 'none' })
    // 可能因已加入/已满/已开读失败，刷新招募卡展示最新态
    loadInvite()
  } finally {
    joining.value = false
  }
}

onLoad((q: Record<string, string> = {}) => {
  token.value = q.token || ''
  captureRefFromQuery(q) // 归因：记录分享者 ref
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
      <text class="hdr-title">共读招募</text>
      <view class="hdr-ph" />
    </view>

    <scroll-view scroll-y class="body">
      <!-- loading -->
      <view v-if="loading" class="state">
        <view class="skel skel-hero" />
        <view class="skel" v-for="i in 2" :key="i" />
      </view>

      <!-- error / 失效 -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="88" color="#ccc" />
        <text class="state-t">{{ error }}</text>
        <view v-if="token" class="btn btn-ghost" @tap="loadInvite"><text class="btn-t-ghost">重试</text></view>
        <view class="btn btn-primary" @tap="navigateTo('/pkg-classics/shared-reading/mine')"><text class="btn-t">我的共读</text></view>
      </view>

      <template v-else-if="info">
        <!-- 招募卡 -->
        <view class="hero">
          <view class="hero-icon"><app-icon name="users" :size="52" color="#fff" /></view>
          <text class="hero-title">{{ info.initiatorNickname || 'TA' }} 邀你共读</text>
          <text class="hero-book">《{{ info.bookTitle }}</text>
          <view class="hero-stat">
            <text class="hero-stat-t">已 {{ info.memberCount }} 人 · 需 {{ info.minMembers }} 人成团</text>
          </view>
          <text class="hero-sub">加入共读，一起在古籍馆读完目标章节。全员达成即得共读学分与结业卡。纯学习激励，零资金。</text>
        </view>

        <!-- 已开读 / 已结束 -->
        <view v-if="!joinable" class="state">
          <app-icon name="info" :size="80" color="#ccc" />
          <text class="state-t">该共读组当前状态：{{ SHARED_READING_STATUS_LABEL[info.status] }}</text>
          <text class="state-sub">已开读或已结束的共读组无法再加入，去发起或看看我的共读吧</text>
          <view class="btn btn-primary" @tap="navigateTo('/pkg-classics/shared-reading/create')"><text class="btn-t">我要发起共读</text></view>
        </view>

        <!-- 未登录引导 -->
        <view v-else-if="!loggedIn" class="state">
          <app-icon name="user" :size="88" color="#ccc" />
          <text class="state-t">登录后即可加入共读</text>
          <view class="btn btn-primary" @tap="navigateTo('/login')"><text class="btn-t">去登录</text></view>
          <text class="state-sub">登录后重新打开邀请链接即可继续加入</text>
        </view>

        <!-- 可加入 -->
        <view v-else class="cta-bar">
          <text v-if="stillNeed > 0" class="need-tip">还差 {{ stillNeed }} 人成团，快加入吧</text>
          <text v-else class="need-tip">人数已够，加入即可开读</text>
          <view class="btn btn-primary btn-block" :class="{ 'btn-disabled': joining }" @tap="onJoin">
            <text class="btn-t">{{ joining ? '加入中…' : '加入共读' }}</text>
          </view>
        </view>
      </template>

      <view class="disclaimer">
        <text class="disclaimer-t">共读学分为学习荣誉成长值，不可兑现、不涉及任何资金。以文会友，共学共进。</text>
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

.hero { margin: 24rpx; padding: 44rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg, #c41e3a, rgba(196,30,58,0.82)); display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { width: 104rpx; height: 104rpx; border-radius: 28rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.hero-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.hero-book { font-size: 40rpx; font-weight: 800; color: #fff; margin-top: 12rpx; font-family: var(--font-serif, serif); }
.hero-stat { margin-top: 20rpx; padding: 8rpx 24rpx; border-radius: 999rpx; background: rgba(255,255,255,0.2); }
.hero-stat-t { font-size: 24rpx; color: #fff; font-weight: 600; }
.hero-sub { font-size: 24rpx; color: rgba(255,255,255,0.88); line-height: 1.6; margin-top: 20rpx; }

.state { display: flex; flex-direction: column; align-items: center; padding: 64rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); text-align: center; }
.state-sub { font-size: 24rpx; color: var(--text-soft, #bbb); text-align: center; }
.skel { width: calc(100% - 64rpx); height: 108rpx; margin: 10rpx 0; border-radius: 20rpx; background: #eee; }
.skel-hero { height: 300rpx; }

.cta-bar { padding: 32rpx 32rpx 8rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.need-tip { font-size: 26rpx; color: var(--brand); font-weight: 600; }
.btn { padding: 24rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-block { width: 100%; }
.btn-primary { background: var(--brand); }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--border, #ddd); background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: var(--text-soft, #666); }
.btn-disabled { opacity: 0.5; }

.disclaimer { padding: 40rpx 40rpx 48rpx; }
.disclaimer-t { font-size: 22rpx; color: var(--text-soft, #aaa); line-height: 1.6; text-align: center; }
</style>
