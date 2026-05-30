<template>
  <view class="page">
    <view class="stats">
      <view class="stat-card"><text class="s-val">{{ stats.followers || 0 }}</text><text class="s-label">粉丝</text></view>
      <view class="stat-card"><text class="s-val">{{ stats.revenue || 0 }}</text><text class="s-label">收益</text></view>
      <view class="stat-card"><text class="s-val">{{ stats.contents || 0 }}</text><text class="s-label">作品</text></view>
    </view>
    <view class="nav-grid">
      <view v-for="n in navItems" :key="n.label" class="nav-item" @click="go(n.path)"><text class="nav-icon">{{ n.icon }}</text><text class="nav-label">{{ n.label }}</text></view>
    </view>
    <view class="section"><text class="section-title">最新作品数据</text>
      <view v-for="c in contents" :key="c.id" class="content-item">
        <text class="c-title">{{ c.title }}</text>
        <view class="c-stats"><text class="c-stat">👁 {{ c.views || 0 }}</text><text class="c-stat">❤ {{ c.likes || 0 }}</text><text class="c-stat">💬 {{ c.comments || 0 }}</text></view>
      </view>
      <EmptyState v-if="!contents.length" text="暂无内容数据" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
const stats = ref({ followers: 128, revenue: 5680, contents: 12 });
const contents = ref<any[]>([{ id:'1', title:'道德经解读', views:1024, likes:86, comments:12 }, { id:'2', title:'周易入门', views:896, likes:52, comments:8 }])
const navItems = [
  { icon: '💰', label: '收益明细', path: '/pages/creator/revenue' },
  { icon: '📝', label: '发布内容', path: '/pages/articles/editor' },
]
function go(path: string) { uni.navigateTo({ url: path }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.stats { display: flex; gap: 8px; margin-bottom: 12px; }
.stat-card { flex: 1; background: #fff; border-radius: 10px; padding: 14px; text-align: center; }
.s-val { font-size: 20px; font-weight: bold; color: #C41E3A; display: block; }
.s-label { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.nav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
.nav-item { background: #fff; border-radius: 10px; padding: 16px; text-align: center; }
.nav-icon { font-size: 24px; display: block; }
.nav-label { font-size: 13px; display: block; margin-top: 4px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.content-item { padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.c-title { font-size: 14px; display: block; }
.c-stats { display: flex; gap: 12px; margin-top: 4px; }
.c-stat { font-size: 11px; color: #999; }
</style>
