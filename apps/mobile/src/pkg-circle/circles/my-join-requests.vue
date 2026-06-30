<script setup lang="ts">
/**
 * 我的入圈申请（申请人视角，真连 GET /circles/my-join-requests）
 * 展示我提交的需审批圈子的入圈申请及其状态（待审核/已通过/已拒绝）。
 * 点击进圈子详情；三态齐全（加载/错误/空态）。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { growthApi, type MyJoinRequestItem } from '@/lib/circle-growth-data'

const loading = ref(true)
const error = ref('')
const list = ref<MyJoinRequestItem[]>([])

const STATUS_CFG: Record<MyJoinRequestItem['status'], { label: string; icon: string; color: string }> = {
  PENDING: { label: '待审核', icon: 'clock', color: '#F59E0B' },
  APPROVED: { label: '已通过', icon: 'check-circle', color: '#16A34A' },
  REJECTED: { label: '已拒绝', icon: 'x-circle', color: '#999999' },
}

function statusInfo(s: MyJoinRequestItem['status']) {
  return STATUS_CFG[s] ?? STATUS_CFG.PENDING
}
function fmtDate(s: string) { return s ? String(s).slice(0, 10) : '' }

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await growthApi.myJoinRequests()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openCircle(circleId: string) {
  if (circleId) navigateTo('/circles/' + circleId)
}

onMounted(load)
</script>

<template>
  <view class="mjr-page">
    <view class="mjr-nav">
      <view class="mjr-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="mjr-nav-title">我的入圈申请</text>
      <view class="mjr-nav-btn" />
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="mjr-state">
      <text class="mjr-state-t">加载中…</text>
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="mjr-state">
      <text class="mjr-state-t">{{ error }}</text>
      <view class="mjr-retry" @tap="load"><text class="mjr-retry-t">重试</text></view>
    </view>
    <!-- 空态 -->
    <view v-else-if="!list.length" class="mjr-state">
      <app-icon name="inbox" :size="56" color="#CCCCCC" />
      <text class="mjr-state-t">还没有入圈申请</text>
      <text class="mjr-state-sub">加入需审批的圈子时，申请会显示在这里</text>
    </view>

    <!-- 列表 -->
    <scroll-view v-else scroll-y class="mjr-list">
      <view v-for="r in list" :key="r.id" class="mjr-item" @tap="openCircle(r.circleId)">
        <image lazy-load v-if="r.circleCover" class="mjr-cover" :src="r.circleCover" mode="aspectFill" />
        <view v-else class="mjr-cover mjr-cover-ph"><app-icon name="users" :size="32" color="#C9A96E" /></view>
        <view class="mjr-body">
          <text class="mjr-name">{{ r.circleName }}</text>
          <text class="mjr-time">申请于 {{ fmtDate(r.createdAt) }}</text>
        </view>
        <view class="mjr-status">
          <app-icon :name="statusInfo(r.status).icon" :size="26" :color="statusInfo(r.status).color" />
          <text class="mjr-status-t" :style="{ color: statusInfo(r.status).color }">{{ statusInfo(r.status).label }}</text>
        </view>
      </view>
      <view class="mjr-bottom-pad" />
    </scroll-view>
  </view>
</template>

<style scoped>
.mjr-page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.mjr-nav { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 16rpx; background: #fff; border-bottom: 1rpx solid #F0EBE3; }
.mjr-nav-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.mjr-nav-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
/* 三态 */
.mjr-state { padding: 200rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.mjr-state-t { font-size: 28rpx; color: #999999; }
.mjr-state-sub { font-size: 24rpx; color: #BBBBBB; text-align: center; }
.mjr-retry { padding: 12rpx 48rpx; border: 1rpx solid var(--brand); border-radius: 999rpx; }
.mjr-retry-t { font-size: 26rpx; color: var(--brand); }
/* 列表 */
.mjr-list { flex: 1; padding: 24rpx; }
.mjr-item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: #fff; border-radius: 20rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.mjr-cover { width: 96rpx; height: 96rpx; border-radius: 16rpx; flex-shrink: 0; }
.mjr-cover-ph { background: #F5F0E8; display: flex; align-items: center; justify-content: center; }
.mjr-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10rpx; }
.mjr-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.mjr-time { font-size: 22rpx; color: #999999; }
.mjr-status { display: flex; flex-direction: column; align-items: center; gap: 6rpx; flex-shrink: 0; }
.mjr-status-t { font-size: 22rpx; }
.mjr-bottom-pad { height: 40rpx; }
</style>
