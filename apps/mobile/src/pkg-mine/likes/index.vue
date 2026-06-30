<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  mineApi,
  likeTypeNames,
  likeTypeStyles,
  likeFilterOptions,
  type LikeItem,
  type LikeTargetType,
} from '@/lib/mine-data'

const statusBarHeight = ref(0)
const activeTab = ref<LikeTargetType | 'all'>('all')
const list = ref<LikeItem[]>([])
const loading = ref(true)
const error = ref('')
const unliking = ref<string | number | null>(null)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    list.value = await mineApi.getMyLikes()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch {
    statusBarHeight.value = 0
  }
})
onMounted(fetchData)

const filteredItems = computed(() =>
  activeTab.value === 'all'
    ? list.value
    : list.value.filter((i) => i.target.type === activeTab.value),
)
const isEmpty = computed(() => filteredItems.value.length === 0)

function tabCount(id: LikeTargetType | 'all') {
  if (id === 'all') return list.value.length
  return list.value.filter((i) => i.target.type === id).length
}

async function handleUnlike(item: LikeItem) {
  if (unliking.value !== null) return
  unliking.value = item.id
  try {
    // 乐观移除（后端取消点赞端点为 interaction toggle，此处先本地移除保持交互）
    list.value = list.value.filter((i) => i.id !== item.id)
    uni.showToast({ title: '已取消点赞', icon: 'none' })
  } finally {
    unliking.value = null
  }
}
function goDetail() {
  uni.showToast({ title: '内容详情开发中', icon: 'none' })
}
function onBack() {
  goBack()
}
function goHome() {
  navigateTo('/pages/index/index')
}
</script>

<template>
  <view class="likes-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="onBack">
          <app-icon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="nav-title">我的点赞</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- 类型筛选 Tab -->
    <view class="tab-bar" :style="{ top: statusBarHeight + 56 + 'px' }">
      <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
        <view class="tab-row">
          <view
            v-for="tab in likeFilterOptions"
            :key="tab.value"
            class="tab-item"
            :class="{ 'tab-active': activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            <text class="tab-label">{{ tab.label }}</text>
            <text v-if="tabCount(tab.value) > 0" class="tab-count">({{ tabCount(tab.value) }})</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 列表区域 -->
    <view class="list" :style="{ paddingTop: statusBarHeight + 56 + 49 + 12 + 'px' }">
      <!-- 加载 -->
      <view v-if="loading" class="state-box"><text class="state-text">加载中...</text></view>
      <!-- 错误 -->
      <view v-else-if="error" class="state-box">
        <text class="state-text">{{ error }}</text>
        <view class="retry-btn" @click="fetchData"><text class="retry-text">重试</text></view>
      </view>
      <!-- 正常列表 -->
      <template v-else-if="!isEmpty">
        <view v-for="item in filteredItems" :key="item.id" class="card">
          <view class="card-inner">
            <!-- 类型图标 -->
            <view class="cover" :style="{ background: likeTypeStyles[item.target.type].bg }" @click="goDetail">
              <app-icon
                :name="likeTypeStyles[item.target.type].icon"
                :size="32"
                :color="likeTypeStyles[item.target.type].color"
              />
            </view>

            <!-- 内容 -->
            <view class="content">
              <view class="content-main">
                <view
                  class="type-badge"
                  :style="{ background: likeTypeStyles[item.target.type].bg, color: likeTypeStyles[item.target.type].color }"
                >
                  <app-icon :name="likeTypeStyles[item.target.type].icon" :size="12" :color="likeTypeStyles[item.target.type].color" />
                  <text class="type-badge-text">{{ likeTypeNames[item.target.type] }}</text>
                </view>
                <text class="title" @click="goDetail">{{ item.target.title }}</text>
                <view class="meta">
                  <text v-if="item.target.author" class="meta-author">{{ item.target.author.nickname }}</text>
                  <text class="meta-time">· {{ item.createdAt }}</text>
                </view>
              </view>

              <!-- 取消点赞 -->
              <view class="unlike-btn" :class="{ disabled: unliking === item.id }" @click="handleUnlike(item)">
                <app-icon name="heart" :size="20" color="#c41e3a" :fill="true" />
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else class="empty">
        <view class="empty-icon">
          <app-icon name="heart" :size="40" color="rgba(153,153,153,0.4)" />
        </view>
        <text class="empty-title">暂无点赞记录</text>
        <text class="empty-sub">看到喜欢的内容，点个赞吧</text>
        <view class="empty-btn" @click="goHome">
          <text class="empty-btn-text">去发现内容</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.likes-page {
  min-height: 100vh;
  background: #faf8f5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e8e3db;
}
.nav-inner {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-placeholder {
  width: 36px;
}

.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 30;
  background: #faf8f5;
  border-bottom: 1px solid #e8e3db;
}
.tab-scroll {
  white-space: nowrap;
}
.tab-row {
  display: flex;
  align-items: center;
  padding: 0 8px;
}
.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 2px solid transparent;
}
.tab-active {
  border-bottom-color: var(--brand);
}
.tab-label {
  font-size: 14px;
  font-weight: 500;
  color: #999999;
}
.tab-active .tab-label {
  color: var(--brand);
}
.tab-count {
  font-size: 12px;
  color: #999999;
}

.list {
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 24px;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
}
.state-text {
  font-size: 14px;
  color: #999999;
}
.retry-btn {
  padding: 8px 24px;
  background: var(--brand);
  border-radius: 9999px;
}
.retry-text {
  font-size: 14px;
  color: #ffffff;
}

.card {
  background: #ffffff;
  border: 1px solid #e8e3db;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
.card-inner {
  display: flex;
}
.cover {
  flex-shrink: 0;
  width: 112px;
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.content {
  flex: 1;
  padding: 12px;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.content-main {
  flex: 1;
  min-width: 0;
}
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-bottom: 6px;
}
.type-badge-text {
  font-size: 10px;
}
.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
}
.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.meta-author,
.meta-time {
  font-size: 10px;
  color: #999999;
}
.unlike-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.unlike-btn.disabled {
  opacity: 0.5;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}
.empty-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.empty-title {
  font-size: 14px;
  color: #999999;
}
.empty-sub {
  font-size: 12px;
  color: rgba(153, 153, 153, 0.7);
  margin-top: 4px;
}
.empty-btn {
  margin-top: 16px;
  padding: 8px 24px;
  background: var(--brand);
  border-radius: 9999px;
}
.empty-btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}
</style>
