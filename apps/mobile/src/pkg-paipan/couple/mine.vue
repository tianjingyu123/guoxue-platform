<script setup lang="ts">
/**
 * V4 双人合盘 · 我的合盘列表
 * 我发起的 + 我参与的，role/status 标签，点进合婚报告，空态引导发起。
 */
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import {
  coupleApi,
  COUPLE_STATUS_LABEL,
  COUPLE_ROLE_LABEL,
  type CoupleMineItem,
  type CoupleStatus,
} from '@/lib/couple-data'

const loggedIn = ref(true)
const loading = ref(true)
const error = ref('')
const list = ref<CoupleMineItem[]>([])

/** 状态色（视觉区分待授权/已合盘/已婉拒过期） */
const STATUS_CLASS: Record<CoupleStatus, string> = {
  PENDING_INVITE: 'st-pending',
  AUTHORIZED: 'st-ok',
  REJECTED: 'st-off',
  EXPIRED: 'st-off',
}

function fmtDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function load() {
  if (!getToken()) {
    loggedIn.value = false
    loading.value = false
    return
  }
  loggedIn.value = true
  loading.value = true
  error.value = ''
  try {
    list.value = await coupleApi.mine()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(load)
// 从报告页删除后返回列表需刷新
onShow(() => {
  if (!loading.value) load()
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666" /></view>
      <text class="hdr-title">我的合盘</text>
      <view class="hdr-add" @tap="navigateTo('/pkg-paipan/couple/invite')"><app-icon name="plus" :size="38" color="var(--brand)" /></view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 未登录 -->
      <view v-if="!loggedIn" class="state">
        <app-icon name="user" :size="88" color="#ccc" />
        <text class="state-t">登录后查看你的合盘记录</text>
        <view class="btn btn-primary" @tap="navigateTo('/login')"><text class="btn-t">去登录</text></view>
      </view>

      <!-- loading -->
      <view v-else-if="loading" class="state">
        <view class="skel" v-for="i in 4" :key="i" />
      </view>

      <!-- error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="88" color="#ccc" />
        <text class="state-t">{{ error }}</text>
        <view class="btn btn-ghost" @tap="load"><text class="btn-t-ghost">重试</text></view>
      </view>

      <!-- empty -->
      <view v-else-if="list.length === 0" class="state">
        <app-icon name="heart" :size="88" color="#ccc" />
        <text class="state-t">还没有合盘记录</text>
        <text class="state-sub">邀请 TA 一起测测你们的缘分合婚吧</text>
        <view class="btn btn-primary" @tap="navigateTo('/pkg-paipan/couple/invite')"><text class="btn-t">发起双人合盘</text></view>
      </view>

      <!-- list -->
      <view v-else class="list">
        <view v-for="c in list" :key="c.id" class="item" @tap="navigateTo(`/pkg-paipan/couple/result?id=${c.id}`)">
          <view class="item-av"><app-icon name="heart" :size="40" color="#fff" /></view>
          <view class="item-main">
            <view class="item-top">
              <text class="item-name">与 {{ c.otherNickname || '待授权对象' }}</text>
              <text class="role-tag">{{ COUPLE_ROLE_LABEL[c.role] }}</text>
            </view>
            <text class="item-date">{{ fmtDate(c.createdAt) }}</text>
          </view>
          <view class="item-right">
            <text class="status-tag" :class="STATUS_CLASS[c.status]">{{ COUPLE_STATUS_LABEL[c.status] }}</text>
            <app-icon name="chevron-right" :size="32" color="#ccc" />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: var(--card, #fff); border-bottom: 2rpx solid var(--border, #eee); padding-top: calc(var(--status-bar-height, 0px) + 16rpx); }
.hdr-back { width: 88rpx; height: 88rpx; margin: -18rpx; display: flex; align-items: center; justify-content: center; } /* 触控热区≥88rpx：容器扩大+负margin保持视觉位置 */
.hdr-add { padding: 6rpx; }
.hdr-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.body { flex: 1; }

.state { display: flex; flex-direction: column; align-items: center; padding: 96rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: var(--text-soft, #999); }
.state-sub { font-size: 24rpx; color: var(--text-soft, #bbb); }
.skel { width: calc(100% - 48rpx); height: 140rpx; margin: 12rpx 24rpx; border-radius: 20rpx; background: #eee; }

.list { padding: 16rpx 24rpx; }
.item { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 24rpx; margin-bottom: 16rpx; border-radius: 20rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #eee); }
.item-av { width: 80rpx; height: 80rpx; border-radius: 999rpx; background: linear-gradient(135deg, #c41e3a, rgba(196,30,58,0.8)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.item-main { flex: 1; min-width: 0; }
.item-top { display: flex; align-items: center; gap: 12rpx; }
.item-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role-tag { font-size: 20rpx; color: var(--text-soft, #888); background: var(--secondary, #f2f2f2); border-radius: 6rpx; padding: 2rpx 10rpx; flex-shrink: 0; }
.item-date { display: block; font-size: 22rpx; color: var(--text-soft, #999); margin-top: 8rpx; }
.item-right { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.status-tag { font-size: 22rpx; border-radius: 8rpx; padding: 4rpx 14rpx; }
.st-pending { color: #d4a017; background: rgba(212,160,23,0.14); }
.st-ok { color: #10b981; background: rgba(16,185,129,0.14); }
.st-off { color: #999; background: rgba(153,153,153,0.14); }

.btn { padding: 22rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-primary { background: var(--brand); }
.btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid var(--border, #ddd); background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: var(--text-soft, #666); }
</style>
