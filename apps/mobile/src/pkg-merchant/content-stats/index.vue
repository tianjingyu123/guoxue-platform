<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#1f1f1f" />
        </view>
        <text class="nav-title">内容统计</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ top: navH + 'px' }">
      <!-- 数据概览 -->
      <view class="grid2">
        <view class="ov-card">
          <text class="ov-label">发布商品</text>
          <text class="ov-num">{{ stats.publishedProducts }}</text>
          <text class="ov-sub">/ {{ stats.totalProducts }}</text>
        </view>
        <view class="ov-card">
          <text class="ov-label">已发布文章</text>
          <text class="ov-num">{{ stats.publishedArticles }}</text>
        </view>
        <view class="ov-card">
          <text class="ov-label">总浏览数</text>
          <text class="ov-num">{{ formatNum(stats.totalViews) }}</text>
        </view>
        <view class="ov-card">
          <text class="ov-label">总点赞数</text>
          <text class="ov-num">{{ formatNum(stats.totalLikes) }}</text>
        </view>
      </view>

      <!-- 内容详情卡片 -->
      <view class="detail-wrap">
        <view class="card">
          <view class="card-head">
            <view class="card-head-left">
              <AppIcon name="file-text" :size="20" color="#c41e3a" />
              <text class="card-title">商品</text>
            </view>
            <text class="card-count">{{ stats.totalProducts }} 件</text>
          </view>
          <view class="grid2 inner-grid">
            <view class="inner-box">
              <text class="inner-label">已发布</text>
              <text class="inner-num">{{ stats.publishedProducts }}</text>
            </view>
            <view class="inner-box">
              <text class="inner-label">草稿</text>
              <text class="inner-num">{{ stats.draftProducts }}</text>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="card-head">
            <view class="card-head-left">
              <AppIcon name="file-text" :size="20" color="#c9a96e" />
              <text class="card-title">文章</text>
            </view>
            <text class="card-count">{{ stats.publishedArticles }} 篇</text>
          </view>
          <view class="row-line">
            <text class="row-label">总阅读</text>
            <text class="row-val">{{ formatNum(stats.totalViews) }}</text>
          </view>
          <view class="row-line">
            <text class="row-label">总点赞</text>
            <text class="row-val">{{ formatNum(stats.totalLikes) }}</text>
          </view>
        </view>
      </view>

      <!-- 内容列表 -->
      <view class="list-wrap">
        <text class="section-title">内容列表</text>
        <view class="tabs">
          <view
            v-for="t in tabs"
            :key="t.value"
            class="tab"
            :class="{ 'tab-active': activeType === t.value }"
            @tap="activeType = t.value"
          >
            <text class="tab-text" :class="{ 'tab-text-active': activeType === t.value }">{{ t.label }}</text>
          </view>
        </view>

        <view v-if="filteredList.length" class="content-list">
          <view v-for="item in filteredList" :key="item.id" class="content-card">
            <view class="content-top">
              <text class="content-title">{{ item.title }}</text>
              <view class="status-badge" :style="{ color: contentStatusBadge[item.status].color, background: contentStatusBadge[item.status].bg }">
                <text class="status-text" :style="{ color: contentStatusBadge[item.status].color }">{{ item.status }}</text>
              </view>
            </view>
            <text class="content-date">{{ item.createdAt }}</text>
            <view class="content-stats">
              <view class="stat-item">
                <AppIcon name="eye" :size="13" color="#9ca3af" />
                <text class="stat-text">{{ item.views }}</text>
              </view>
              <view class="stat-item">
                <AppIcon name="thumbs-up" :size="13" color="#9ca3af" />
                <text class="stat-text">{{ item.likes }}</text>
              </view>
              <view v-if="item.sales !== undefined" class="stat-item">
                <AppIcon name="shopping-bag" :size="13" color="#9ca3af" />
                <text class="stat-text">{{ item.sales }} 件</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty">
          <text class="empty-text">暂无内容</text>
        </view>
      </view>
      <view style="height: 40px" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantContentStats, merchantContentList, contentStatusBadge } from '@/lib/merchant-data'

const statusBarHeight = ref(20)
const navH = ref(64)
uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 20
    navH.value = (r.statusBarHeight || 20) + 44
  },
})

const stats = merchantContentStats
const activeType = ref<'all' | '商品' | '文章'>('all')
const tabs = [
  { label: '全部', value: 'all' as const },
  { label: '商品', value: '商品' as const },
  { label: '文章', value: '文章' as const },
]

const filteredList = computed(() => {
  if (activeType.value === 'all') return merchantContentList
  return merchantContentList.filter((c) => c.type === activeType.value)
})

function formatNum(n: number) {
  return n.toLocaleString('en-US')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; border-bottom: 1px solid #ededed; }
.navbar-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1f1f1f; }
.nav-placeholder { width: 32px; }
.scroll { position: fixed; left: 0; right: 0; bottom: 0; }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 16px 0; }
.ov-card { background: #fff; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; }
.ov-label { font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
.ov-num { font-size: 24px; font-weight: 700; color: #1f1f1f; }
.ov-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }

.detail-wrap { padding: 24px 16px 0; display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border-radius: 12px; padding: 16px; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.card-head-left { display: flex; align-items: center; gap: 8px; }
.card-title { font-size: 15px; font-weight: 600; color: #1f1f1f; }
.card-count { font-size: 13px; color: #9ca3af; }
.inner-grid { padding: 0; }
.inner-box { background: #f9fafb; border-radius: 8px; padding: 8px 12px; }
.inner-label { font-size: 12px; color: #9ca3af; display: block; margin-bottom: 4px; }
.inner-num { font-size: 18px; font-weight: 700; color: #1f1f1f; }
.row-line { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
.row-label { font-size: 13px; color: #9ca3af; }
.row-val { font-size: 14px; font-weight: 600; color: #1f1f1f; }

.list-wrap { padding: 24px 16px 0; }
.section-title { font-size: 14px; font-weight: 600; color: #1f1f1f; display: block; margin-bottom: 12px; }
.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.tab { padding: 6px 14px; border-radius: 999px; background: #ededed; }
.tab-active { background: #c41e3a; }
.tab-text { font-size: 13px; color: #4b5563; }
.tab-text-active { color: #fff; }

.content-list { display: flex; flex-direction: column; gap: 8px; }
.content-card { background: #fff; border-radius: 10px; padding: 12px; }
.content-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.content-title { font-size: 14px; font-weight: 500; color: #1f1f1f; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { padding: 1px 8px; border-radius: 6px; flex-shrink: 0; }
.status-text { font-size: 11px; }
.content-date { font-size: 12px; color: #9ca3af; }
.content-stats { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.stat-item { display: flex; align-items: center; gap: 4px; }
.stat-text { font-size: 12px; color: #9ca3af; }

.empty { background: #fff; border-radius: 12px; padding: 32px; display: flex; justify-content: center; }
.empty-text { font-size: 14px; color: #9ca3af; }
</style>
