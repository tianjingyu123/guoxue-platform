<template>
  <view class="page">
    <view class="hero"><text class="hero-title">国学研究院</text><text class="hero-desc">传承千年智慧，汇聚当代英才</text></view>
    <view class="nav-grid">
      <view v-for="n in navItems" :key="n.path" class="nav-item" @click="go(n.path)"><text class="nav-icon">{{ n.icon }}</text><text class="nav-label">{{ n.label }}</text></view>
    </view>
    <view class="section"><text class="section-title">最新活动</text>
      <view v-for="e in events" :key="e.id" class="event-item" @click="goEvent(e)">
        <text class="e-title">{{ e.title }}</text><text class="e-date">{{ e.date || e.startDate }}</text>
      </view>
      <EmptyState v-if="!events.length" text="暂无活动" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
import { instituteApi } from '../../api'
const events = ref<any[]>([])
const navItems = [
  { icon: '📋', label: '申请入会', path: '/pages/institute/apply' },
  { icon: '📅', label: '学术活动', path: '/pages/institute/events' },
  { icon: '👥', label: '成员列表', path: '/pages/institute/member-detail' },
  { icon: '📝', label: '我的任务', path: '/pages/institute/my-tasks' },
]
onMounted(async () => {
  try { const res: any = await instituteApi.getEvents(); events.value = (Array.isArray(res) ? res : res?.data || []).slice(0, 5) } catch {}
})
function go(path: string) { uni.navigateTo({ url: path }) }
function goEvent(e: any) { uni.navigateTo({ url: `/pages/institute/events?id=${e.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.hero { background: linear-gradient(135deg, #C41E3A, #8B0000); padding: 40px 20px; text-align: center; color: #fff; }
.hero-title { font-size: 22px; font-weight: bold; display: block; }
.hero-desc { font-size: 13px; opacity: 0.8; display: block; margin-top: 6px; }
.nav-grid { display: grid; grid-template-columns: repeat(4, 1fr); background: #fff; padding: 16px; gap: 10px; }
.nav-item { text-align: center; }
.nav-icon { font-size: 24px; display: block; }
.nav-label { font-size: 12px; display: block; margin-top: 4px; }
.section { background: #fff; margin-top: 10px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.event-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.e-title { font-size: 14px; }
.e-date { font-size: 12px; color: #999; }
</style>
