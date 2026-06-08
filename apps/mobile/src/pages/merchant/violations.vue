<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">违规记录</text>
      <view class="header-spacer" />
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <view v-if="!list.length && !loadingMore" class="empty-wrap">
        <text class="empty-icon">✅</text>
        <text class="empty-text">暂无违规记录</text>
      </view>

      <scroll-view
        v-else
        class="scroll-wrap"
        scroll-y
        :refresher-enabled="true"
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
      >
        <view v-for="item in list" :key="item.id" class="card">
          <view class="card-top">
            <text class="type-label">{{ item.type || '违规' }}</text>
            <text class="status-tag" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</text>
          </view>

          <text class="reason">{{ item.reason }}</text>

          <view class="meta-row">
            <text class="meta-time">{{ item.createdAt }}</text>
            <text class="meta-result" v-if="item.penalty">处罚：{{ item.penalty }}</text>
          </view>

          <!-- 申诉按钮 -->
          <view v-if="item.canAppeal" class="action-row">
            <view class="appeal-btn" @click="openAppeal(item)">申诉</view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="load-more-wrap">
          <text class="load-more-text">加载中...</text>
        </view>
        <view v-else-if="!hasMore" class="load-more-wrap">
          <text class="load-more-text">— 没有更多了 —</text>
        </view>
      </scroll-view>
    </template>

    <!-- 申诉弹层 -->
    <view v-if="showAppeal" class="overlay" @click="closeAppeal">
      <view class="dialog" @click.stop>
        <text class="dialog-title">提交申诉</text>
        <textarea
          class="dialog-textarea"
          v-model="appealText"
          placeholder="请输入申诉理由..."
          maxlength="500"
        />
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @click="closeAppeal">取消</view>
          <view class="dialog-btn confirm" @click="submitAppeal">提交</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { merchantApi } from '@/api'

const loading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const list = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)

const showAppeal = ref(false)
const appealText = ref('')
const currentId = ref<string | null>(null)

onMounted(() => fetchData())

async function fetchData() {
  try {
    const res = await merchantApi.listViolations({ page: page.value, pageSize: pageSize.value })
    const data = res?.list || res?.records || res?.data || []
    list.value = page.value === 1 ? data : [...list.value, ...data]
    hasMore.value = data.length >= pageSize.value
  } catch {
    if (page.value === 1) list.value = []
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await fetchData()
}

async function onLoadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  await fetchData()
}

function statusClass(s: string) {
  const m: Record<string, string> = {
    PENDING: 'orange',
    PENALIZED: 'red',
    APPEALED: 'blue',
    APPEAL_PASSED: 'green',
    APPEAL_REJECTED: 'red',
  }
  return m[s] || ''
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    PENDING: '待处理',
    PENALIZED: '已处罚',
    APPEALED: '已申诉',
    APPEAL_PASSED: '申诉通过',
    APPEAL_REJECTED: '申诉驳回',
  }
  return m[s] || s
}

function openAppeal(item: any) {
  currentId.value = item.id
  appealText.value = ''
  showAppeal.value = true
}

function closeAppeal() {
  showAppeal.value = false
  appealText.value = ''
  currentId.value = null
}

async function submitAppeal() {
  if (!appealText.value.trim()) {
    uni.showToast({ title: '请输入申诉理由', icon: 'none' })
    return
  }
  if (!currentId.value) return
  try {
    await merchantApi.appealViolation(currentId.value, { appeal: appealText.value.trim() })
    uni.showToast({ title: '申诉已提交', icon: 'success' })
    showAppeal.value = false
    appealText.value = ''
    currentId.value = null
    page.value = 1
    await fetchData()
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 60rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

.scroll-wrap { height: calc(100vh - 120rpx); }

/* 空状态 */
.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }

/* 卡片 */
.card { margin: 20rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.type-label { font-size: 28rpx; font-weight: 600; color: #3C2415; }

/* 状态标签 */
.status-tag { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx; flex-shrink: 0; }
.status-tag.orange { background: #FFF3E0; color: #E65100; }
.status-tag.red { background: #FFEBEE; color: #C62828; }
.status-tag.blue { background: #E3F2FD; color: #1565C0; }
.status-tag.green { background: #E8F5E9; color: #2E7D32; }

.reason { font-size: 26rpx; color: #555; line-height: 1.6; margin-bottom: 12rpx; }

.meta-row { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 12rpx; }
.meta-time { font-size: 22rpx; color: #bbb; }
.meta-result { font-size: 22rpx; color: #C41E3A; }

/* 申诉按钮 */
.action-row { display: flex; justify-content: flex-end; }
.appeal-btn { padding: 10rpx 32rpx; background: #5a3a1a; border-radius: 8rpx; font-size: 24rpx; color: #fff; }

/* 加载更多 */
.load-more-wrap { display: flex; justify-content: center; padding: 24rpx 0; }
.load-more-text { font-size: 24rpx; color: #ccc; }

/* 弹层 */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 999; }
.dialog { width: 620rpx; background: #fff; border-radius: 20rpx; padding: 32rpx; }
.dialog-title { font-size: 30rpx; font-weight: 600; color: #3C2415; display: block; text-align: center; margin-bottom: 24rpx; }
.dialog-textarea { width: 100%; height: 200rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; color: #333; box-sizing: border-box; background: #FAFAFA; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 20rpx; margin-top: 24rpx; }
.dialog-btn { padding: 14rpx 40rpx; border-radius: 10rpx; font-size: 26rpx; }
.dialog-btn.cancel { background: #f0ebe0; color: #666; }
.dialog-btn.confirm { background: #5a3a1a; color: #fff; }
</style>
