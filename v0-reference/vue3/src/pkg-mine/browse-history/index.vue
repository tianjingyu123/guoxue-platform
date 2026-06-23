<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-btn" @click="onBack">
        <app-icon name="arrow-left" :size="20" color="#2c2c2c" />
      </view>
      <text class="nav-title">浏览历史</text>
      <view class="nav-right">
        <template v-if="allItems.length > 0">
          <text v-if="!isEditMode" class="nav-action" @click="handleClearAll">清空</text>
          <text class="nav-action" @click="toggleEditMode">{{ isEditMode ? '完成' : '管理' }}</text>
        </template>
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

    <!-- 空态 -->
    <view v-else-if="allItems.length === 0" class="empty">
      <view class="empty-icon">
        <app-icon name="clock" :size="40" color="#cccccc" />
      </view>
      <text class="empty-title">暂无浏览历史</text>
      <text class="empty-desc">你浏览过的内容会显示在这里</text>
    </view>

    <!-- 历史列表 -->
    <view v-else class="content" :style="{ paddingBottom: isEditMode ? '140rpx' : '24rpx' }">
      <view v-for="group in history" :key="group.date" class="group">
        <text class="group-date">{{ group.date }}</text>
        <view
          v-for="item in group.items"
          :key="item.id"
          class="card"
          :class="{ 'card-selected': isEditMode && selectedIds.includes(item.id) }"
          @click="onCardClick(item)"
        >
          <!-- 选择圈 -->
          <view v-if="isEditMode" class="select-circle" :class="{ 'select-on': selectedIds.includes(item.id) }">
            <app-icon v-if="selectedIds.includes(item.id)" name="check" :size="14" color="#ffffff" />
          </view>
          <!-- 类型图标 -->
          <view class="type-icon" :style="{ background: typeColors[item.type].bg }">
            <app-icon :name="typeIcons[item.type]" :size="22" :color="typeColors[item.type].fg" />
          </view>
          <!-- 信息 -->
          <view class="info">
            <view class="info-head">
              <view class="type-badge" :style="{ background: typeColors[item.type].bg, color: typeColors[item.type].fg }">
                {{ typeLabels[item.type] }}
              </view>
              <text class="time">{{ item.time }}</text>
            </view>
            <text class="title">{{ item.title }}</text>
            <text class="subtitle">{{ item.subtitle }}</text>
            <!-- 课程进度条 -->
            <view v-if="item.progress != null" class="progress-row">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: item.progress + '%' }" />
              </view>
              <text class="progress-text">{{ item.progress }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部删除栏 -->
    <view v-if="isEditMode && allItems.length > 0" class="del-bar">
      <view class="del-left" @click="toggleSelectAll">
        <view class="select-circle sm" :class="{ 'select-on': allSelected }">
          <app-icon v-if="allSelected" name="check" :size="12" color="#ffffff" />
        </view>
        <text class="del-all-text">全选</text>
      </view>
      <view class="del-btn" :class="{ 'del-disabled': selectedIds.length === 0 }" @click="handleDelete">
        <app-icon name="trash-2" :size="16" :color="selectedIds.length === 0 ? '#cccccc' : '#ffffff'" />
        <text class="del-btn-text" :style="{ color: selectedIds.length === 0 ? '#cccccc' : '#ffffff' }">
          删除{{ selectedIds.length > 0 ? ` (${selectedIds.length})` : '' }}
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import { goBack, navigateTo } from '@/utils/router'

const TYPE_ICONS = {
  course: 'play',
  article: 'file-text',
  product: 'shopping-bag',
  circle: 'users',
  classic: 'book-open',
  agent: 'bot',
}
const TYPE_LABELS = {
  course: '课程', article: '文章', product: '商品', circle: '圈子', classic: '古籍', agent: '智能体',
}
const TYPE_COLORS = {
  course: { bg: 'rgba(59,130,246,0.1)', fg: '#2563eb' },
  article: { bg: 'rgba(139,92,246,0.1)', fg: '#9333ea' },
  product: { bg: 'rgba(249,115,22,0.1)', fg: '#ea580c' },
  circle: { bg: 'rgba(34,197,94,0.1)', fg: '#16a34a' },
  classic: { bg: 'rgba(245,158,11,0.1)', fg: '#d97706' },
  agent: { bg: 'rgba(236,72,153,0.1)', fg: '#db2777' },
}

const MOCK_HISTORY = [
  {
    date: '今天',
    items: [
      { id: 1, type: 'course', title: '八字入门实战课 - 第5章', subtitle: '已学习 45分钟', progress: 65, time: '14:30' },
      { id: 2, type: 'article', title: '八字中的食神制杀格局详解', subtitle: '周易大师', time: '11:20' },
      { id: 3, type: 'agent', title: '八字命理大师', subtitle: '对话 3 次', time: '10:15' },
    ],
  },
  {
    date: '昨天',
    items: [
      { id: 4, type: 'course', title: '紫微斗数精讲 - 第12章', subtitle: '已学习 30分钟', progress: 40, time: '20:45' },
      { id: 5, type: 'product', title: '开运水晶手链', subtitle: '浏览商品', time: '16:30' },
      { id: 6, type: 'circle', title: '八字命理研习社', subtitle: '浏览帖子 5 篇', time: '14:20' },
    ],
  },
  {
    date: '1月13日',
    items: [
      { id: 7, type: 'classic', title: '周易 - 乾卦', subtitle: '阅读 20分钟', time: '21:00' },
      { id: 8, type: 'article', title: '流年运势分析方法论', subtitle: '玄学居士', time: '19:30' },
      { id: 9, type: 'agent', title: '风水布局顾问', subtitle: '对话 1 次', time: '15:00' },
    ],
  },
]

export default {
  data() {
    return {
      isEditMode: false,
      selectedIds: [],
      loading: true,
      history: [],
      typeIcons: TYPE_ICONS,
      typeLabels: TYPE_LABELS,
      typeColors: TYPE_COLORS,
    }
  },
  computed: {
    allItems() {
      return this.history.reduce((acc, g) => acc.concat(g.items), [])
    },
    allSelected() {
      return this.allItems.length > 0 && this.selectedIds.length === this.allItems.length
    },
  },
  mounted() {
    setTimeout(() => {
      this.history = JSON.parse(JSON.stringify(MOCK_HISTORY))
      this.loading = false
    }, 500)
  },
  methods: {
    onBack() {
      goBack()
    },
    toggleEditMode() {
      this.isEditMode = !this.isEditMode
      if (!this.isEditMode) this.selectedIds = []
    },
    toggleSelect(id) {
      const idx = this.selectedIds.indexOf(id)
      if (idx >= 0) this.selectedIds.splice(idx, 1)
      else this.selectedIds.push(id)
    },
    toggleSelectAll() {
      if (this.allSelected) this.selectedIds = []
      else this.selectedIds = this.allItems.map((i) => i.id)
    },
    onCardClick(item) {
      if (this.isEditMode) {
        this.toggleSelect(item.id)
        return
      }
      navigateTo(this.getTypeUrl(item.type, item.id))
    },
    getTypeUrl(type, id) {
      switch (type) {
        case 'course': return `/learn/${id}`
        case 'article': return `/article/${id}`
        case 'product': return `/mall/product/${id}`
        case 'circle': return `/circle/${id}/home`
        case 'classic': return `/classics/${id}`
        case 'agent': return `/agent/${id}`
        default: return '#'
      }
    },
    handleDelete() {
      if (this.selectedIds.length === 0) return
      this.history = this.history
        .map((g) => ({ ...g, items: g.items.filter((it) => !this.selectedIds.includes(it.id)) }))
        .filter((g) => g.items.length > 0)
      this.selectedIds = []
      this.isEditMode = false
    },
    handleClearAll() {
      uni.showModal({
        title: '清空浏览历史',
        content: '确定要清空全部浏览历史吗？',
        confirmText: '清空',
        confirmColor: '#C41E3A',
        success: (res) => {
          if (res.confirm) {
            this.history = []
            this.selectedIds = []
            this.isEditMode = false
          }
        },
      })
    },
  },
}
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
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding-right: 12rpx;
}
.nav-action {
  font-size: 27rpx;
  color: #666666;
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
.card-selected {
  border-color: #C41E3A;
  background: rgba(196,30,58,0.03);
}

.select-circle {
  flex-shrink: 0;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #d0c9bd;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}
.select-circle.sm {
  width: 32rpx;
  height: 32rpx;
  margin-top: 0;
}
.select-on {
  background: #C41E3A;
  border-color: #C41E3A;
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
.subtitle {
  display: block;
  font-size: 24rpx;
  color: #999999;
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
  background: #C41E3A;
  border-radius: 4rpx;
}
.progress-text {
  font-size: 22rpx;
  color: #C41E3A;
  font-weight: 500;
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

/* 底部删除栏 */
.del-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #ffffff;
  border-top: 1rpx solid #e8e3db;
}
.del-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.del-all-text {
  font-size: 27rpx;
  color: #2c2c2c;
}
.del-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 72rpx;
  padding: 0 40rpx;
  background: #C41E3A;
  border-radius: 999rpx;
}
.del-disabled {
  background: #f0ebe3;
}
.del-btn-text {
  font-size: 27rpx;
  font-weight: 500;
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
