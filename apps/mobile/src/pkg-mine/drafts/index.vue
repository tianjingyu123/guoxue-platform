<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="nav-bar">
        <view class="back-btn" @click="goBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">草稿箱</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <view class="content">
      <!-- 加载态 -->
      <view v-if="loading" class="state">
        <app-icon name="loader-2" :size="32" color="#C41E3A" class="spin" />
        <text class="state-text">加载中...</text>
      </view>

      <!-- 错误态 -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">加载失败</text>
        <view class="retry-btn" @click="loadDrafts">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- 空态 -->
      <view v-else-if="drafts.length === 0" class="empty">
        <view class="empty-icon">
          <app-icon name="file-text" :size="40" color="#d1d5db" />
        </view>
        <text class="empty-title">还没有草稿</text>
        <text class="empty-desc">写文章时点「草稿」保存，未完成的内容会存放在这里</text>
        <view class="empty-btn" @click="goPublish">
          <text class="empty-btn-text">去写文章</text>
        </view>
      </view>

      <!-- 草稿列表 -->
      <view v-else class="list">
        <view v-for="d in drafts" :key="d.id" class="draft-card" @click="resumeEdit(d)">
          <image
            v-if="d.cover"
            lazy-load
            :src="d.cover"
            class="draft-cover"
            mode="aspectFill"
          />
          <view v-else class="draft-cover draft-cover-empty">
            <app-icon name="file-text" :size="28" color="#d1d5db" />
          </view>
          <view class="draft-main">
            <text class="draft-title">{{ d.title || '无标题草稿' }}</text>
            <text v-if="d.excerpt" class="draft-excerpt">{{ d.excerpt }}</text>
            <text class="draft-time">{{ formatTime(d.updatedAt) }}</text>
          </view>
          <view class="draft-del" @click.stop="confirmDelete(d)">
            <app-icon name="trash-2" :size="18" color="#bbb" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navigateBack, navigateTo } from '@/utils/router'
import { articleApi, type DraftListItem } from '@/lib/article-data'

const drafts = ref<DraftListItem[]>([])
const loading = ref(true)
const error = ref(false)

// 每次进入/返回本页都刷新（从编辑器续编保存后回来能看到最新）
onShow(() => {
  loadDrafts()
})

async function loadDrafts() {
  loading.value = true
  error.value = false
  try {
    const res = await articleApi.getDrafts(1, 50)
    drafts.value = res.items || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

/** 续编：跳回圈子编辑器，带草稿 id，编辑器加载草稿全文续写 */
function resumeEdit(d: DraftListItem) {
  navigateTo(`/pkg-circle/circles/editor?draftId=${d.id}`)
}

function confirmDelete(d: DraftListItem) {
  uni.showModal({
    title: '删除草稿',
    content: '删除后无法恢复，确定删除这份草稿吗？',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await articleApi.deleteDraft(d.id)
        drafts.value = drafts.value.filter(x => x.id !== d.id)
        uni.showToast({ title: '草稿已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

/** 时间格式化：今天显示时分，其余显示日期 */
function formatTime(iso: string): string {
  if (!iso) return ''
  const s = String(iso)
  const d = new Date(s)
  if (isNaN(d.getTime())) return s.slice(0, 16).replace('T', ' ')
  const now = new Date()
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function goPublish() {
  navigateTo('/pkg-circle/circles/editor')
}
function goBack() {
  navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(245, 245, 245, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1rpx solid #ececec;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.back-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-placeholder {
  width: 72rpx;
}
.content {
  padding: 32rpx;
}

/* 状态态（加载/错误） */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  gap: 24rpx;
}
.state-text {
  font-size: 26rpx;
  color: #999;
}
.retry-btn {
  padding: 16rpx 48rpx;
  border: 1rpx solid #d1d5db;
  border-radius: 999rpx;
}
.retry-text {
  font-size: 26rpx;
  color: #666;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.empty-icon {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background: #ececec;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-title {
  font-size: 28rpx;
  color: #888;
  margin-bottom: 8rpx;
}
.empty-desc {
  font-size: 24rpx;
  color: #aaa;
  margin-bottom: 32rpx;
  text-align: center;
  padding: 0 40rpx;
  line-height: 1.6;
}
.empty-btn {
  padding: 20rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.empty-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}

/* 列表 */
.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.draft-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
}
.draft-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  background: #f4f4f5;
}
.draft-cover-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}
.draft-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.draft-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.draft-excerpt {
  font-size: 24rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.draft-time {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 4rpx;
}
.draft-del {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
