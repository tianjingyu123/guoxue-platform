<script setup lang="ts">
/**
 * V3 共读拼团 · 我的共读
 * GET mine → 列表（书名/状态标签/人数/我是否完成）；点进详情；空态引导去发起。
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import {
  sharedReadingApi,
  SHARED_READING_STATUS_LABEL,
  type SharedReadingMineItem,
} from '@/lib/shared-reading-data'

const loggedIn = ref(true)
const loading = ref(true)
const error = ref('')
const list = ref<SharedReadingMineItem[]>([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await sharedReadingApi.mine()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function goDetail(id: string) {
  navigateTo(`/pkg-classics/shared-reading/detail?id=${id}`)
}

// onShow：从详情退组/建组返回后刷新列表
onShow(() => {
  loggedIn.value = !!getToken()
  if (!loggedIn.value) { loading.value = false; return }
  load()
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666" /></view>
      <text class="hdr-title">我的共读</text>
      <view class="hdr-link" @tap="navigateTo('/pkg-classics/shared-reading/create')"><text class="hdr-link-t">发起</text></view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 未登录 -->
      <view v-if="!loggedIn" class="state">
        <app-icon name="user" :size="88" color="#ccc" />
        <text class="state-t">登录后查看我的共读</text>
        <view class="btn btn-primary" @tap="navigateTo('/login')"><text class="btn-t">去登录</text></view>
      </view>

      <!-- loading -->
      <view v-else-if="loading" class="state">
        <view class="skel" v-for="i in 3" :key="i" />
      </view>

      <!-- error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="88" color="#ccc" />
        <text class="state-t">{{ error }}</text>
        <view class="btn btn-ghost" @tap="load"><text class="btn-t-ghost">重试</text></view>
      </view>

      <!-- empty -->
      <view v-else-if="list.length === 0" class="state">
        <app-icon name="users" :size="88" color="#ccc" />
        <text class="state-t">还没有参加共读</text>
        <text class="state-sub">去古籍馆选一本书，发起一场结伴共读吧</text>
        <view class="btn btn-primary" @tap="navigateTo('/pkg-classics/shared-reading/create')"><text class="btn-t">去发起共读</text></view>
      </view>

      <!-- list -->
      <view v-else class="list">
        <view v-for="g in list" :key="g.groupId" class="grp" @tap="goDetail(g.groupId)">
          <view class="grp-cover"><app-icon name="book-open" :size="38" color="#c41e3a" /></view>
          <view class="grp-body">
            <text class="grp-title">《{{ g.bookTitle }}</text>
            <view class="grp-meta">
              <text class="tag" :class="'tag-' + g.status.toLowerCase()">{{ SHARED_READING_STATUS_LABEL[g.status] }}</text>
              <text class="grp-count">{{ g.memberCount }} 人</text>
              <text v-if="g.myCompleted" class="grp-done"><text class="grp-done-dot">✓</text> 我已完成</text>
            </view>
          </view>
          <app-icon name="chevron-right" :size="34" color="#ccc" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: var(--card, #fff); border-bottom: 2rpx solid var(--border, #eee); padding-top: calc(var(--status-bar-height, 0px) + 16rpx); }
.hdr-back { padding: 6rpx; }
.hdr-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.hdr-link { padding: 6rpx 12rpx; }
.hdr-link-t { font-size: 24rpx; color: var(--brand); }
.body { flex: 1; }

.state { display: flex; flex-direction: column; align-items: center; padding: 96rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); }
.state-sub { font-size: 24rpx; color: var(--text-soft, #bbb); text-align: center; }
.skel { width: calc(100% - 48rpx); height: 140rpx; margin: 12rpx 24rpx; border-radius: 20rpx; background: #eee; }

.list { padding: 20rpx 24rpx; }
.grp { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 24rpx; margin-bottom: 16rpx; border-radius: 24rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.grp-cover { width: 80rpx; height: 80rpx; border-radius: 18rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.grp-body { flex: 1; min-width: 0; }
.grp-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.grp-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.tag { font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 8rpx; }
.tag-recruiting { background: #fef3c7; color: #b45309; }
.tag-reading { background: #dbeafe; color: #1d4ed8; }
.tag-completed { background: #d1fae5; color: #047857; }
.tag-expired { background: #f3f4f6; color: #6b7280; }
.grp-count { font-size: 24rpx; color: var(--text-soft, #999); }
.grp-done { font-size: 22rpx; color: #10b981; font-weight: 600; }
.grp-done-dot { font-size: 22rpx; }

.btn { padding: 24rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-primary { background: var(--brand); }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--border, #ddd); background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: var(--text-soft, #666); }
</style>
