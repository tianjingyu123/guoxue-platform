<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <app-icon name="arrow-left" :size="20" color="#2c2c2c" />
      </view>
      <text class="nav-title">浏览历史</text>
      <view class="nav-right" :class="{ disabled: clearing }" @click="clearAll">
        <text v-if="totalCount > 0" class="nav-clear">{{ clearing ? '清除中' : '清空' }}</text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="content">
      <view v-for="g in 2" :key="g" class="group">
        <view class="sk-date" />
        <view v-for="i in 3" :key="i" class="card sk-card">
          <view class="sk-icon" />
          <view class="sk-lines">
            <view class="sk-line" style="width: 70%" />
            <view class="sk-line" style="width: 40%" />
          </view>
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error-state">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @click="retry"><text class="retry-text">重试</text></view>
    </view>

    <!-- 空态 -->
    <view v-else-if="totalCount === 0" class="empty">
      <view class="empty-icon">
        <app-icon name="clock" :size="40" color="#cccccc" />
      </view>
      <text class="empty-title">暂无浏览历史</text>
      <text class="empty-desc">你浏览过的内容会显示在这里</text>
    </view>

    <!-- 历史列表 -->
    <view v-else class="content">
      <view v-for="group in groups" :key="group.date" class="group">
        <text class="group-date">{{ group.label }}</text>
        <view
          v-for="item in group.items"
          :key="item.id"
          class="card"
          @click="openItem(item)"
        >
          <!-- 类型图标 -->
          <view class="type-icon" :style="{ background: cfg(item.type).color }">
            <app-icon :name="cfg(item.type).icon" :size="22" color="#ffffff" />
          </view>
          <!-- 信息 -->
          <view class="info">
            <view class="info-head">
              <view class="type-badge" :style="{ background: cfg(item.type).color }">
                {{ cfg(item.type).label }}
              </view>
              <text class="time">{{ item.viewedAt }}</text>
            </view>
            <text class="title">{{ item.title }}</text>
            <!-- 进度条 -->
            <view v-if="item.progress != null" class="progress-row">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: item.progress + '%' }" />
              </view>
              <text class="progress-text">{{ item.progress }}%</text>
            </view>
          </view>
        </view>
      </view>
      <view class="list-foot">仅展示近30天的浏览记录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { goBack } from '@/utils/router'
import { apiGet } from '@/utils/request'
import {
  mineApi,
  historyTypeConfig,
  type HistoryGroup,
  type HistoryItem,
  type HistoryItemType,
} from '@/lib/mine-data'

const loading = ref(true)
const error = ref('')
const groups = ref<HistoryGroup[]>([])
const clearing = ref(false)

const totalCount = computed(() => groups.value.reduce((s, g) => s + g.items.length, 0))

function cfg(type: HistoryItemType) {
  return historyTypeConfig[type] || historyTypeConfig.article
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    groups.value = await mineApi.getHistory()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  error.value = ''
  loadData()
}

/** 跳原内容页（原为"开发中"toast）。
 * HistoryItem.id 是浏览记录 cuid 而非内容 id（adaptHistory 未透传 targetId）
 * → 首次点击时拉一次原始记录建 记录id→{targetType,targetId} 映射，用原始 targetType 判跳转 */
interface RawHistoryRow { id?: string | number; targetType?: string; targetId?: string }
let rawMapPromise: Promise<Map<string, { targetType: string; targetId: string }>> | null = null
function loadRawMap() {
  if (!rawMapPromise) {
    rawMapPromise = apiGet<{ items?: RawHistoryRow[] } | RawHistoryRow[]>('/users/history?page=1&pageSize=50')
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items ?? [])
        return new Map(items.map((r) => [
          String(r.id),
          { targetType: String(r.targetType || '').toLowerCase(), targetId: String(r.targetId || '') },
        ]))
      })
      .catch(() => { rawMapPromise = null; return new Map<string, { targetType: string; targetId: string }>() })
  }
  return rawMapPromise
}
function contentUrl(type: string, id: string): string {
  return type === 'article' ? `/pkg-circle/articles/detail?id=${id}`
    : type === 'course' ? `/pkg-course/detail/index?id=${id}`
    : type === 'video' ? `/pkg-video/detail/index?id=${id}`
    : type === 'product' ? `/pkg-mall/product/detail?id=${id}`
    : type === 'live' ? `/pkg-live/watch/index?id=${id}`
    : type === 'circle' ? `/pkg-circle/circles/detail?id=${id}`
    : type === 'post' || type === 'circle_post' ? `/pkg-circle/circles/post?id=${id}`
    : '' // classic·ebook·poetry·content 等无对应映射 → 保持提示
}
async function openItem(item: HistoryItem) {
  const raw = (await loadRawMap()).get(item.id)
  const url = raw && raw.targetId ? contentUrl(raw.targetType, raw.targetId) : ''
  if (!url) { uni.showToast({ title: '该内容暂不支持跳转', icon: 'none' }); return }
  uni.navigateTo({ url, fail: () => uni.showToast({ title: '打开失败', icon: 'none' }) })
}

function clearAll() {
  if (clearing.value || totalCount.value === 0) return
  uni.showModal({
    title: '清空浏览历史',
    content: `将删除全部 ${totalCount.value} 条浏览记录，此操作无法撤销。`,
    confirmText: '确认清空',
    confirmColor: '#C41E3A',
    success: async (result) => {
      if (!result.confirm || clearing.value) return
      clearing.value = true
      try {
        await mineApi.clearHistory()
        groups.value = []
        rawMapPromise = null
        uni.showToast({ title: '浏览历史已清空', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '清空失败，请重试', icon: 'none' })
      } finally {
        clearing.value = false
      }
    },
  })
}

onMounted(loadData)
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 24rpx;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 12rpx;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-right {
  min-width: 80rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.nav-right.disabled {
  opacity: 0.55;
}
.nav-clear {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--brand);
}

.content {
  padding: 24rpx;
}
.group {
  margin-bottom: 32rpx;
}
.group-date {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #999999;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
}

.card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #f0ebe3;
}

.type-icon {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  flex: 1;
  min-width: 0;
}
.info-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.type-badge {
  font-size: 20rpx;
  color: #ffffff;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  line-height: 1.6;
}
.time {
  font-size: 22rpx;
  color: #bbbbbb;
}
.title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.progress-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 14rpx;
}
.progress-bar {
  flex: 1;
  height: 8rpx;
  background: #f0ebe3;
  border-radius: 4rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--brand);
  border-radius: 4rpx;
}
.progress-text {
  font-size: 22rpx;
  color: var(--brand);
  font-weight: 500;
}

.list-foot {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: #b8b0a4;
}

/* 错误态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  gap: 24rpx;
}
.error-text {
  font-size: 28rpx;
  color: #999999;
}
.retry-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 12rpx;
}
.retry-text {
  font-size: 26rpx;
  color: #fff;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.empty-icon {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 12rpx;
}
.empty-desc {
  font-size: 26rpx;
  color: #999999;
}

/* 骨架 */
.sk-date {
  width: 120rpx;
  height: 26rpx;
  background: #ece7df;
  border-radius: 6rpx;
  margin-bottom: 16rpx;
}
.sk-card {
  border: 1rpx solid #f0ebe3;
}
.sk-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #ece7df;
  flex-shrink: 0;
}
.sk-lines {
  flex: 1;
  padding-top: 8rpx;
}
.sk-line {
  height: 24rpx;
  background: #ece7df;
  border-radius: 6rpx;
  margin-bottom: 14rpx;
}
</style>
