<script setup lang="ts">
/**
 * 圈子成员列表页（2026-07-10·UX 重排批）
 * 入口：详情页身份区「N 成员 + 头像叠排」。分页展示，加载失败保留已读取的成员。
 */
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleDetailApi, type CircleMember } from '@/lib/circle-detail-data'
import { getMiniProgramMenuSafeRight } from '@/utils/mini-program-menu'

const circleId = ref('')
const members = ref<CircleMember[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref('')
const page = ref(1)
const loadingMore = ref(false)
const moreError = ref(false)
const hasMore = computed(() => members.value.length < total.value)
const menuSafeRight = getMiniProgramMenuSafeRight()

onLoad((q) => {
  if (q?.id) circleId.value = q.id
  load()
})

async function load() {
  isLoading.value = true
  error.value = ''
  moreError.value = false
  try {
    if (!circleId.value) throw new Error('missing circle id')
    const r = await circleDetailApi.listMembers(circleId.value)
    members.value = r.data
    total.value = r.total
    page.value = 1
  } catch {
    error.value = circleId.value ? '成员暂时无法加载，请重试' : '圈子信息缺失，请返回重试'
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  moreError.value = false
  try {
    const nextPage = page.value + 1
    const r = await circleDetailApi.listMembers(circleId.value, nextPage)
    if (r.data.length === 0) {
      moreError.value = true
      return
    }
    const seen = new Set(members.value.map(member => member.id))
    members.value.push(...r.data.filter(member => !seen.has(member.id)))
    total.value = r.total
    page.value = nextPage
  } catch {
    moreError.value = true
  } finally {
    loadingMore.value = false
  }
}

function openUser(id: string) { navigateTo(`/pkg-circle/user/profile?id=${id}`) }
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="menuSafeRight ? { paddingRight: `${menuSafeRight}px` } : undefined">
      <view class="nav-back" role="button" aria-label="返回圈子" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="nav-title">圈子成员<text v-if="total" class="nav-count">（{{ total }}）</text></text>
    </view>

    <!-- 加载态 -->
    <view v-if="isLoading" class="state">
      <view class="sk-row" v-for="i in 6" :key="i" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="state center">
      <text class="state-txt">{{ error }}</text>
      <view v-if="circleId" class="retry" role="button" aria-label="重新加载成员" @tap="load"><text class="retry-txt">重试</text></view>
    </view>

    <!-- 空态 -->
    <view v-else-if="!members.length" class="state center">
      <app-icon name="users" :size="88" color="#E8E3DB" />
      <text class="state-txt">暂无成员</text>
    </view>

    <scroll-view v-else scroll-y class="body" lower-threshold="80" @scrolltolower="loadMore">
      <text class="list-summary">已显示 {{ members.length }} / {{ total }} 位成员</text>
      <view class="member-list">
        <view v-for="m in members" :key="m.id" class="member" @tap="openUser(m.id)">
          <smart-avatar :src="m.avatar" :name="m.name" class="member-avatar" />
          <view class="member-main">
            <view class="member-name-row">
              <text class="member-name">{{ m.name }}</text>
              <view v-if="m.role === 'owner'" class="role-badge"><app-icon name="crown" :size="20" color="#C9A96E" /><text class="role-txt owner">圈主</text></view>
              <view v-else-if="m.role === 'admin'" class="role-badge"><app-icon name="shield" :size="20" color="#D4B87D" /><text class="role-txt admin">管理员</text></view>
            </view>
            <view class="member-meta">
              <text v-if="m.title" class="member-meta-txt">{{ m.title }}</text>
              <text class="member-meta-txt">发帖 {{ m.posts }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="hasMore" class="more-wrap">
        <view class="more-button" role="button" :aria-label="moreError ? '重试加载更多成员' : '加载更多成员'" @tap="loadMore">
          <text>{{ loadingMore ? '正在加载…' : moreError ? '加载失败，点此重试' : '查看更多成员' }}</text>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }

.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(20rpx);
}
.nav-back { width: 44px; height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-left: -16rpx; }
.nav-title { flex: 1; min-width: 0; white-space: nowrap; font-size: 32rpx; font-weight: 600; color: #1d1d1f; }
.nav-count { font-size: 26rpx; font-weight: 400; color: var(--text-tertiary, #999); }

.body { flex: 1; min-height: 0; }
.list-summary { display: block; padding: 24rpx 32rpx 0; font-size: 24rpx; color: #6e6e73; }

/* 状态 */
.state { padding: 32rpx; }
.state.center { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 32rpx; }
.state-txt { font-size: 27rpx; color: #6e6e73; }
.sk-row { height: 120rpx; background: #f2efea; border-radius: 24rpx; margin-bottom: 16rpx; }
.retry { min-height: 44px; padding: 0 56rpx; display: flex; align-items: center; background: var(--brand, #c41e3a); border-radius: 24rpx; }
.retry-txt { font-size: 27rpx; color: #fff; }

/* 成员列表（样式与原详情页成员 Tab 一致） */
.member-list { padding: 24rpx 32rpx 0; display: flex; flex-direction: column; gap: 8rpx; }
.member { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; background: var(--bg-card, #fff); border-radius: 24rpx; }
.member:active { background: #f0f0f2; }
.member-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; flex-shrink: 0; }
.member-main { flex: 1; min-width: 0; }
.member-name-row { display: flex; align-items: center; gap: 12rpx; }
.member-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.role-badge { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: var(--gold-soft, rgba(201, 169, 110, 0.14)); }
.role-txt { font-size: 20rpx; }
.role-txt.owner { color: var(--gold, #c9a96e); }
.role-txt.admin { color: var(--gold-2, #d4b87d); }
.member-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.member-meta-txt { font-size: 23rpx; color: var(--text-tertiary, #999); }

.more-wrap { display: flex; justify-content: center; padding: 28rpx 32rpx; }
.more-button { min-height: 44px; min-width: 280rpx; padding: 0 32rpx; display: flex; align-items: center; justify-content: center; border-radius: 22rpx; background: #fff; color: #1d1d1f; font-size: 26rpx; }
.more-button:active { background: #ececef; }

.safe-bottom { height: calc(40rpx + env(safe-area-inset-bottom)); }
</style>
