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

      <!-- 类型筛选Tab -->
      <scroll-view scroll-x class="tabs" :show-scrollbar="false">
        <view class="tabs-inner">
          <view
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ 'tab-active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <text class="tab-label">{{ tab.label }}</text>
            <text v-if="tab.id !== 'all'" class="tab-count">({{ countByType(tab.id) }})</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 草稿列表 -->
    <view class="content">
      <view v-if="filteredDrafts.length > 0" class="draft-list">
        <view
          v-for="draft in filteredDrafts"
          :key="draft.id"
          class="draft-card"
          @click="goEdit(draft)"
        >
          <view class="card-inner">
            <!-- 视频缩略图 -->
            <view v-if="draft.type === 'video'" class="video-thumb">
              <app-icon name="video" :size="24" color="#9ca3af" />
              <view class="video-badge" :style="{ background: typeColor(draft.type) }">
                <text class="video-badge-text">视频</text>
              </view>
            </view>
            <!-- 类型图标 -->
            <view v-else class="type-icon" :style="{ background: typeColor(draft.type) }">
              <app-icon :name="typeIcon(draft.type)" :size="20" color="#ffffff" />
            </view>

            <!-- 内容 -->
            <view class="card-body">
              <view class="card-title-row">
                <text class="card-title">{{ draft.title || '无标题草稿' }}</text>
                <view v-if="draft.type !== 'video'" class="type-badge">
                  <text class="type-badge-text">{{ typeLabel(draft.type) }}</text>
                </view>
              </view>
              <text class="card-content">{{ draft.content }}</text>
              <view class="card-meta">
                <text class="meta-circle">{{ draft.circle }}</text>
                <text class="meta-time">{{ formatTime(draft.savedAt) }}</text>
              </view>
            </view>

            <!-- 操作 -->
            <view class="card-actions">
              <view class="action-btn" @click.stop="goEdit(draft)">
                <app-icon name="edit-3" :size="16" color="#9ca3af" />
              </view>
              <view class="action-btn" @click.stop="showDeleteConfirm = draft.id">
                <app-icon name="trash-2" :size="16" color="#9ca3af" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty">
        <view class="empty-icon">
          <app-icon name="file-text" :size="40" color="#d1d5db" />
        </view>
        <text class="empty-title">暂无草稿</text>
        <text class="empty-desc">发布内容时可保存为草稿</text>
        <view class="empty-btn" @click="goPublish">
          <text class="empty-btn-text">去发布内容</text>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="showDeleteConfirm !== null" class="modal-mask" @click="showDeleteConfirm = null">
      <view class="modal" @click.stop>
        <view class="modal-body">
          <view class="modal-icon">
            <app-icon name="trash-2" :size="24" color="#EF4444" />
          </view>
          <text class="modal-title">确认删除草稿？</text>
          <text class="modal-desc">删除后无法恢复，请确认是否继续</text>
        </view>
        <view class="modal-actions">
          <view class="modal-btn modal-btn-cancel" @click="showDeleteConfirm = null">
            <text class="modal-btn-cancel-text">取消</text>
          </view>
          <view class="modal-btn modal-btn-delete" @click="handleDelete(showDeleteConfirm)">
            <text class="modal-btn-delete-text">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

interface Draft {
  id: number
  type: 'post' | 'article' | 'video'
  title: string
  content: string
  savedAt: string
  circle: string
}

const tabs = [
  { id: 'all', label: '全部' },
  { id: 'post', label: '帖子' },
  { id: 'article', label: '文章' },
  { id: 'video', label: '短视频' },
]

const drafts = ref<Draft[]>([
  { id: 1, type: 'article', title: '八字命理学习心得分享', content: '学习八字已有三年，从最初的懵懂到现在能够独立排盘分析，这一路走来收获颇丰...', savedAt: '2026-05-09 14:30', circle: '八字命理研习社' },
  { id: 2, type: 'post', title: '', content: '今天研究了一个很有意思的命盘，日主甲木生于子月，天干透出壬水...', savedAt: '2026-05-08 20:15', circle: '八字命理研习社' },
  { id: 3, type: 'video', title: '紫微斗数入门讲解', content: '视频时长: 05:32 | 已选封面', savedAt: '2026-05-07 16:45', circle: '紫微斗数交流圈' },
  { id: 4, type: 'article', title: '', content: '风水学中，阳宅的选择至关重要，需要考虑的因素包括...', savedAt: '2026-05-06 09:20', circle: '风水堪舆学院' },
  { id: 5, type: 'post', title: '求教一个问题', content: '各位老师好，请教一下关于大运流年的问题...', savedAt: '2026-05-05 11:00', circle: '八字命理研习社' },
])

const activeTab = ref('all')
const showDeleteConfirm = ref<number | null>(null)

const filteredDrafts = computed(() =>
  activeTab.value === 'all' ? drafts.value : drafts.value.filter((d) => d.type === activeTab.value)
)

function countByType(type: string) {
  return drafts.value.filter((d) => d.type === type).length
}

const typeMeta: Record<string, { label: string; icon: string; color: string; editPath: string }> = {
  post: { label: '帖子', icon: 'message-square', color: '#3b82f6', editPath: '/publish?type=post' },
  article: { label: '文章', icon: 'file-text', color: '#C9A96E', editPath: '/publish?type=article' },
  video: { label: '短视频', icon: 'video', color: '#C41E3A', editPath: '/publish/video' },
}

function typeLabel(t: string) {
  return typeMeta[t]?.label ?? ''
}
function typeIcon(t: string) {
  return typeMeta[t]?.icon ?? 'file-text'
}
function typeColor(t: string) {
  return typeMeta[t]?.color ?? '#9ca3af'
}

function formatTime(time: string) {
  const date = new Date(time.replace(/-/g, '/'))
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hm = time.split(' ')[1] ?? ''
  if (days === 0) return '今天 ' + hm
  if (days === 1) return '昨天 ' + hm
  if (days < 7) return `${days}天前`
  return time.split(' ')[0]
}

function handleDelete(id: number | null) {
  if (id === null) return
  drafts.value = drafts.value.filter((d) => d.id !== id)
  showDeleteConfirm.value = null
}

function goEdit(draft: Draft) {
  const base = typeMeta[draft.type]?.editPath ?? '/publish'
  const sep = base.includes('?') ? '&' : '?'
  navigateTo(`${base}${sep}draft=${draft.id}`)
}

function goPublish() {
  navigateTo('/publish')
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

/* 顶部导航 */
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

/* Tab */
.tabs {
  white-space: nowrap;
  padding: 0 32rpx 24rpx;
}
.tabs-inner {
  display: flex;
  gap: 16rpx;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #ececec;
  white-space: nowrap;
}
.tab-active {
  background: #C41E3A;
}
.tab-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #888;
}
.tab-count {
  font-size: 22rpx;
  color: #888;
  opacity: 0.7;
}
.tab-active .tab-label,
.tab-active .tab-count {
  color: #fff;
  opacity: 1;
}

/* 列表 */
.content {
  padding: 32rpx;
}
.draft-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.draft-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}
.card-inner {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx;
}
.video-thumb {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #ececec;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}
.video-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}
.video-badge-text {
  font-size: 20rpx;
  color: #fff;
}
.type-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-body {
  flex: 1;
  min-width: 0;
}
.card-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.type-badge {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  border: 1rpx solid #e5e5e5;
  flex-shrink: 0;
}
.type-badge-text {
  font-size: 20rpx;
  color: #888;
}
.card-content {
  font-size: 24rpx;
  color: #888;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.meta-circle,
.meta-time {
  font-size: 20rpx;
  color: #aaa;
}
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  flex-shrink: 0;
}
.action-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空状态 */
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
}
.empty-btn {
  padding: 20rpx 48rpx;
  background: #C41E3A;
  border-radius: 999rpx;
}
.empty-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}

/* 删除确认弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
.modal {
  width: 80%;
  max-width: 560rpx;
  background: #fff;
  border-radius: 32rpx;
  overflow: hidden;
}
.modal-body {
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}
.modal-desc {
  font-size: 28rpx;
  color: #888;
  text-align: center;
}
.modal-actions {
  display: flex;
  border-top: 1rpx solid #ececec;
}
.modal-btn {
  flex: 1;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-btn-cancel {
  border-right: 1rpx solid #ececec;
}
.modal-btn-cancel-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.modal-btn-delete-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #EF4444;
}
</style>
