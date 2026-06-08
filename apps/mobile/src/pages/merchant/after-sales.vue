<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">售后管理</text>
      <view class="header-spacer" />
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.key" class="tab-item" :class="{ active: currentTab === tab.key }" @click="switchTab(tab.key)">
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading && !list.length" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <!-- 列表 -->
    <scroll-view
      v-else
      class="scroll-wrap"
      scroll-y
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!list.length" class="empty-wrap">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无售后记录</text>
      </view>

      <view v-for="item in list" :key="item.id" class="card" @click="toggleDetail(item)">
        <!-- 顶部：售后单号 + 类型标签 -->
        <view class="card-top">
          <text class="card-no">{{ item.afterSaleNo || item.id }}</text>
          <text class="type-tag" :class="'type-' + item.type">{{ typeLabel(item.type) }}</text>
        </view>
        <!-- 商品名 -->
        <text class="card-product">{{ item.productTitle || '商品' }}</text>
        <!-- 用户 + 申请时间 -->
        <view class="card-meta">
          <text class="card-user">{{ item.userName || item.user?.nickname || '用户' }}</text>
          <text class="card-time">{{ item.createdAt }}</text>
        </view>
        <!-- 状态 + 操作 -->
        <view class="card-bottom">
          <text class="status-tag" :class="'status-' + item.status">{{ statusLabel(item.status) }}</text>
          <view v-if="item.status === 'PENDING'" class="process-btn" @click.stop="showProcess(item)">处理</view>
        </view>

        <!-- 内联详情 -->
        <view v-if="expandId === item.id" class="detail-wrap">
          <view class="detail-row"><text class="detail-label">售后原因</text><text class="detail-val">{{ item.reason || '—' }}</text></view>
          <view class="detail-row"><text class="detail-label">申请金额</text><text class="detail-val">¥{{ item.amount || 0 }}</text></view>
          <view class="detail-row" v-if="item.remark"><text class="detail-label">备注</text><text class="detail-val">{{ item.remark }}</text></view>
          <view class="detail-row" v-if="item.processedAt"><text class="detail-label">处理时间</text><text class="detail-val">{{ item.processedAt }}</text></view>
        </view>
      </view>

      <view v-if="hasMore" class="loadmore-wrap"><text class="loadmore-text">加载更多...</text></view>
      <view v-if="!hasMore && list.length" class="loadmore-wrap"><text class="loadmore-text">— 没有更多了 —</text></view>
    </scroll-view>

    <!-- 处理弹窗 -->
    <view v-if="showModal" class="modal-mask" @click="closeModal">
      <view class="modal-box" @click.stop>
        <text class="modal-title">售后处理</text>
        <view class="modal-body">
          <view class="modal-actions">
            <view v-for="act in availableActions" :key="act.value" class="modal-action-btn" :class="'act-' + act.value" @click="handleAction(act.value)">
              <text>{{ act.label }}</text>
            </view>
          </view>
          <textarea v-model="processRemark" class="modal-remark" placeholder="备注（选填）" placeholder-style="color:#bbb" />
        </view>
        <view class="modal-close" @click="closeModal"><text>取消</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { merchantApi } from '@/api'

const tabs = [
  { key: '', label: '全部' },
  { key: 'REFUND', label: '退款' },
  { key: 'RETURN', label: '退货' },
  { key: 'EXCHANGE', label: '换货' },
]

const currentTab = ref('')
const list = ref<any[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loading = ref(true)
const refreshing = ref(false)
const expandId = ref<string | null>(null)

// 处理弹窗
const showModal = ref(false)
const currentItem = ref<any>(null)
const processRemark = ref('')

// 根据状态返回可用操作
const availableActions = computed(() => {
  const s = currentItem.value?.status
  if (s === 'PENDING') return [
    { value: 'approve', label: '同意' },
    { value: 'reject', label: '拒绝' },
  ]
  if (s === 'PROCESSING') return [
    { value: 'complete', label: '完成' },
    { value: 'reject', label: '拒绝' },
  ]
  return []
})

function typeLabel(t: string) {
  const m: Record<string, string> = { REFUND: '退款', RETURN: '退货', EXCHANGE: '换货' }
  return m[t] || t
}

function statusLabel(s: string) {
  const m: Record<string, string> = { PENDING: '待处理', PROCESSING: '处理中', COMPLETED: '已完成', REJECTED: '已拒绝' }
  return m[s] || s
}

async function fetchData(pageNum: number, append: boolean) {
  try {
    const res = await merchantApi.listAfterSales({
      type: currentTab.value || undefined,
      status: undefined,
      page: pageNum,
      pageSize,
    })
    const items = Array.isArray(res) ? res : res?.list || res?.records || []
    if (append) {
      list.value = list.value.concat(items)
    } else {
      list.value = items
    }
    hasMore.value = items.length >= pageSize
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function loadList() {
  loading.value = true
  page.value = 1
  await fetchData(1, false)
  loading.value = false
}

function switchTab(key: string) {
  currentTab.value = key
  loadList()
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  await fetchData(page.value, true)
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await fetchData(1, false)
  refreshing.value = false
}

function toggleDetail(item: any) {
  expandId.value = expandId.value === item.id ? null : item.id
}

function showProcess(item: any) {
  currentItem.value = item
  processRemark.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  currentItem.value = null
  processRemark.value = ''
}

async function handleAction(action: string) {
  if (!currentItem.value) return
  try {
    await merchantApi.processAfterSale(currentItem.value.id, {
      action,
      remark: processRemark.value || undefined,
    })
    uni.showToast({ title: '操作成功', icon: 'success' })
    closeModal()
    // 刷新列表
    await loadList()
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function goBack() { uni.navigateBack() }

onMounted(loadList)
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 60rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

/* Tabs */
.tabs { display: flex; background: #fff; padding: 0 24rpx; border-bottom: 1rpx solid #E8E0D5; }
.tab-item { flex: 1; text-align: center; padding: 20rpx 0; font-size: 26rpx; color: #999; position: relative; }
.tab-item.active { color: #5a3a1a; font-weight: 600; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: #8b6914; border-radius: 2rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

.scroll-wrap { height: calc(100vh - 180rpx); }

/* Empty */
.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #ccc; }

/* Card */
.card { margin: 16rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.card-no { font-size: 24rpx; color: #999; }
.type-tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 6rpx; }
.type-tag.type-REFUND { background: #FFF8E1; color: #F57F17; }
.type-tag.type-RETURN { background: #E3F2FD; color: #1565C0; }
.type-tag.type-EXCHANGE { background: #E8F5E9; color: #2E7D32; }
.card-product { font-size: 28rpx; color: #3C2415; font-weight: 500; display: block; margin-bottom: 8rpx; }
.card-meta { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.card-user { font-size: 22rpx; color: #999; }
.card-time { font-size: 22rpx; color: #bbb; }
.card-bottom { display: flex; justify-content: space-between; align-items: center; }
.status-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 6rpx; }
.status-tag.status-PENDING { background: #FFF8E1; color: #F57F17; }
.status-tag.status-PROCESSING { background: #E3F2FD; color: #1565C0; }
.status-tag.status-COMPLETED { background: #E8F5E9; color: #2E7D32; }
.status-tag.status-REJECTED { background: #FFEBEE; color: #C62828; }
.process-btn { padding: 8rpx 28rpx; background: #C41E3A; border-radius: 8rpx; color: #fff; font-size: 24rpx; }

/* Detail */
.detail-wrap { margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f0ebe0; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 6rpx 0; }
.detail-label { font-size: 22rpx; color: #999; }
.detail-val { font-size: 24rpx; color: #3C2415; }

/* LoadMore */
.loadmore-wrap { text-align: center; padding: 24rpx 0; }
.loadmore-text { font-size: 24rpx; color: #ccc; }

/* Modal */
.modal-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-box { width: 560rpx; background: #fff; border-radius: 20rpx; padding: 32rpx; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; display: block; margin-bottom: 24rpx; }
.modal-body { }
.modal-actions { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.modal-action-btn { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 10rpx; font-size: 26rpx; }
.modal-action-btn.act-approve { background: #E8F5E9; color: #2E7D32; }
.modal-action-btn.act-reject { background: #FFEBEE; color: #C62828; }
.modal-action-btn.act-complete { background: #E3F2FD; color: #1565C0; }
.modal-remark { width: 100%; min-height: 120rpx; border: 1rpx solid #E8E0D5; border-radius: 10rpx; padding: 16rpx; font-size: 24rpx; color: #3C2415; box-sizing: border-box; }
.modal-close { text-align: center; margin-top: 24rpx; padding: 16rpx 0; border-top: 1rpx solid #f0ebe0; }
.modal-close text { font-size: 28rpx; color: #999; }
</style>
