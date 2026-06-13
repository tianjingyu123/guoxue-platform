<template>
  <view class="history-page">
    <!-- 头部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">浏览历史</text>
        <view class="header-actions">
          <text v-if="!isEditMode && history.length > 0" class="ha-btn" @click="handleClearAll">清空</text>
          <text v-if="history.length > 0" class="ha-btn primary" @click="toggleEditMode">
            {{ isEditMode ? '完成' : '管理' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <template v-if="loading">
      <view v-for="i in 4" :key="i" class="sk-item">
        <view class="sk-icon" />
        <view class="sk-info">
          <view class="sk-line short" />
          <view class="sk-line shorter" />
          <view class="sk-line medium" />
        </view>
      </view>
    </template>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <text class="es-icon">⚠️</text>
      <text class="es-text">{{ error }}</text>
      <view class="es-retry" @click="fetchData"><text>重试</text></view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="history.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无浏览历史</text>
    </view>

    <!-- 历史列表 -->
    <view v-else class="history-list">
      <view v-for="(group, gi) in history" :key="gi" class="h-group">
        <text class="hg-date">{{ group.date }}</text>
        <view class="hg-items">
          <view v-for="item in group.items" :key="item.id" class="hgi-row">
            <!-- 选择框 -->
            <view
              v-if="isEditMode"
              class="hgi-check"
              :class="{ checked: selectedIds.includes(item.id) }"
              @click="toggleSelect(item.id)"
            >
              <text v-if="selectedIds.includes(item.id)">✓</text>
            </view>

            <!-- 内容卡片 -->
            <view class="hgi-card" @click="isEditMode ? toggleSelect(item.id) : goItem(item)">
              <view class="hgic-icon" :class="'type-' + item.type">
                <text>{{ typeIcon(item.type) }}</text>
              </view>
              <view class="hgic-info">
                <view class="hgic-head">
                  <text class="hgic-badge" :class="'type-' + item.type">{{ typeLabel(item.type) }}</text>
                  <text class="hgic-time">{{ item.time }}</text>
                </view>
                <text class="hgic-title">{{ item.title }}</text>
                <text class="hgic-sub">{{ item.subtitle }}</text>

                <!-- 课程进度条 -->
                <view v-if="item.type === 'course' && item.progress !== undefined" class="hgic-progress">
                  <view class="hgp-head">
                    <text class="hgp-label">学习进度</text>
                    <text class="hgp-pct">{{ item.progress }}%</text>
                  </view>
                  <view class="hgp-bar">
                    <view class="hgp-fill" :style="{ width: item.progress + '%' }" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏（编辑模式） -->
    <view v-if="isEditMode && selectedIds.length > 0" class="edit-bar">
      <text class="eb-select-all" @click="selectAll">全选</text>
      <view class="eb-delete" @click="handleDelete">
        <text>🗑️</text>
        <text>删除 ({{ selectedIds.length }})</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const error = ref<string | null>(null)
const isEditMode = ref(false)
const selectedIds = ref<number[]>([])

interface HistoryItem {
  id: number
  type: string
  title: string
  subtitle: string
  time: string
  progress?: number
}

interface HistoryGroup {
  date: string
  items: HistoryItem[]
}

const history = ref<HistoryGroup[]>([
  {
    date: '2024-06-08',
    items: [
      { id: 1, type: 'course', title: '八字命理入门精讲 - 第3章', subtitle: '天干地支的刑冲合害关系详解', time: '14:30', progress: 65 },
      { id: 2, type: 'article', title: '周易六十四卦速查表', subtitle: '含卦象图解与白话释义', time: '10:15' },
      { id: 3, type: 'classic', title: '渊海子平·卷一', subtitle: '论五行·论天干·论地支', time: '09:00' }
    ]
  },
  {
    date: '2024-06-07',
    items: [
      { id: 4, type: 'product', title: '紫微斗数全解套装', subtitle: '含排盘工具+详解书籍+视频课程', time: '20:45' },
      { id: 5, type: 'circle', title: '风水研习圈', subtitle: '256位成员 · 128篇帖子', time: '16:20' },
      { id: 6, type: 'agent', title: '八字排盘助手', subtitle: '智能体 · 今日已使用3次', time: '14:00' }
    ]
  }
])

const typeLabels: Record<string, string> = {
  course: '课程', article: '文章', product: '商品', circle: '圈子', classic: '古籍', agent: '智能体'
}

const typeIcon = (type: string) => {
  const icons: Record<string, string> = {
    course: '▶️', article: '📄', product: '🛒', circle: '👥', classic: '📖', agent: '🤖'
  }
  return icons[type] || '📄'
}

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

function fetchData() {
  loading.value = true
  error.value = null
  setTimeout(() => { loading.value = false }, 500)
}

function toggleEditMode() {
  isEditMode.value = !isEditMode.value
  selectedIds.value = []
}

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function selectAll() {
  selectedIds.value = history.value.flatMap(g => g.items.map(i => i.id))
}

function handleDelete() {
  history.value = history.value.map(group => ({
    ...group,
    items: group.items.filter(item => !selectedIds.value.includes(item.id))
  })).filter(group => group.items.length > 0)
  selectedIds.value = []
  isEditMode.value = false
}

function handleClearAll() {
  uni.showModal({
    title: '提示',
    content: '确定要清空全部浏览历史吗？',
    success: (res) => {
      if (res.confirm) {
        history.value = []
      }
    }
  })
}

function goItem(item: HistoryItem) {
  const urls: Record<string, string> = {
    course: '/pages/learn/id-detail/index',
    article: '/pages/article/id-detail/index',
    product: '/pages/mall/product/index',
    circle: '/pages/circles/id-detail/home/index',
    classic: '/pages/classics/id-detail/index',
    agent: '/pages/agent/id-detail/index'
  }
  const url = urls[item.type] || '/pages/index/index'
  uni.navigateTo({ url: url + '?id=' + item.id })
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}

.header-sticky {
  position: sticky;
  top: 0;
  z-index: 30;
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.header-row {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  height: 80rpx;
}
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-actions { display: flex; align-items: center; gap: 16rpx; }
.ha-btn { font-size: 26rpx; color: #999; }
.ha-btn.primary { color: #C41E3A; }

/* 骨架 */
.sk-item { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; margin: 16rpx 24rpx 0; background: #fff; border-radius: 16rpx; }
.sk-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: #F0F0F0; }
.sk-line { height: 24rpx; background: #F0F0F0; border-radius: 6rpx; margin-bottom: 8rpx; }
.sk-line.short { width: 200rpx; }
.sk-line.shorter { width: 120rpx; }
.sk-line.medium { width: 280rpx; }

/* 错误/空状态 */
.error-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.es-icon { font-size: 80rpx; }
.es-text { font-size: 26rpx; color: #999; margin-top: 16rpx; }
.es-retry { margin-top: 24rpx; padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 26rpx; color: #999; margin-top: 16rpx; }

/* 历史列表 */
.history-list { padding: 24rpx; }

.h-group { margin-bottom: 48rpx; }
.hg-date { font-size: 26rpx; font-weight: 500; color: #999; margin-bottom: 20rpx; display: block; }
.hg-items { display: flex; flex-direction: column; gap: 16rpx; }

.hgi-row { display: flex; align-items: center; gap: 16rpx; }

.hgi-check {
  width: 48rpx; height: 48rpx;
  border-radius: 50%;
  border: 3rpx solid #CCC;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 28rpx;
  color: #fff;
}
.hgi-check.checked { background: #C41E3A; border-color: #C41E3A; }

.hgi-card {
  flex: 1;
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: 16rpx;
}
.hgic-icon {
  width: 80rpx; height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}
.hgic-icon.type-course { background: rgba(59,130,246,0.1); }
.hgic-icon.type-article { background: rgba(168,85,247,0.1); }
.hgic-icon.type-product { background: rgba(245,158,11,0.1); }
.hgic-icon.type-circle { background: rgba(34,197,94,0.1); }
.hgic-icon.type-classic { background: rgba(217,119,6,0.1); }
.hgic-icon.type-agent { background: rgba(236,72,153,0.1); }

.hgic-info { flex: 1; min-width: 0; }
.hgic-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.hgic-badge {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}
.hgic-badge.type-course { background: rgba(59,130,246,0.1); color: #3B82F6; }
.hgic-badge.type-article { background: rgba(168,85,247,0.1); color: #A855F7; }
.hgic-badge.type-product { background: rgba(245,158,11,0.1); color: #F59E0B; }
.hgic-badge.type-circle { background: rgba(34,197,94,0.1); color: #22C55E; }
.hgic-badge.type-classic { background: rgba(217,119,6,0.1); color: #D97706; }
.hgic-badge.type-agent { background: rgba(236,72,153,0.1); color: #EC4899; }
.hgic-time { font-size: 20rpx; color: #BBB; }
.hgic-title {
  font-size: 28rpx; font-weight: 500; color: #2C2C2C;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: block;
}
.hgic-sub {
  font-size: 22rpx; color: #999;
  margin-top: 4rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: block;
}

.hgic-progress { margin-top: 16rpx; }
.hgp-head { display: flex; justify-content: space-between; margin-bottom: 6rpx; }
.hgp-label { font-size: 20rpx; color: #BBB; }
.hgp-pct { font-size: 20rpx; color: #BBB; }
.hgp-bar { height: 10rpx; background: #F5F1EB; border-radius: 5rpx; overflow: hidden; }
.hgp-fill { height: 100%; background: #C41E3A; border-radius: 5rpx; transition: width 0.3s; }

/* 底部编辑栏 */
.edit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #E8E0D5;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.eb-select-all { font-size: 26rpx; color: #C41E3A; }
.eb-delete {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 40rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 26rpx;
  border-radius: 40rpx;
}
</style>
