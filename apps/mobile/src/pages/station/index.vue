<template>
  <view class="page">
    <view class="hero">
      <image :src="station.banner || ''" class="banner" mode="aspectFill" />
      <view class="hero-info"><text class="station-name">{{ station.name || '分站首页' }}</text><text class="station-desc">{{ station.description || '' }}</text></view>
    </view>
    <view class="nav-grid">
      <view v-for="n in navItems" :key="n.path" class="nav-item" @click="go(n.path)">
        <text class="nav-icon">{{ n.icon }}</text><text class="nav-label">{{ n.label }}</text>
      </view>
    </view>
    <view class="section"><text class="section-title">最新内容</text>
      <view v-for="c in contents" :key="c.id" class="content-item" @click="goDetail(c)">
        <text class="c-title">{{ c.title }}</text><text class="c-time">{{ c.createdAt?.slice(0, 10) }}</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { stationApi } from '../../api'
const station = ref<any>({}); const contents = ref<any[]>([])
const navItems = [
  { icon: '📚', label: '课程', path: '/pages/courses/index' },
  { icon: '🎤', label: '直播', path: '/pages/live/index' },
  { icon: '👥', label: '圈子', path: '/pages/circles/index' },
  { icon: '🛒', label: '商城', path: '/pages/shop/index' },
]
onMounted(async () => {
  try {
    const res: any = await stationApi.getInfo()
    station.value = res || {}
    const c: any = await stationApi.getContents()
    contents.value = Array.isArray(c) ? c : c?.data || []
  } catch {}
})
function go(path: string) { uni.navigateTo({ url: path }) }
function goDetail(c: any) { uni.navigateTo({ url: `/pages/detail/index?id=${c.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.hero { position: relative; }
.banner { width: 100%; height: 180px; }
.hero-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: #fff; }
.station-name { font-size: 18px; font-weight: 600; display: block; }
.station-desc { font-size: 12px; opacity: 0.8; display: block; margin-top: 4px; }
.nav-grid { display: grid; grid-template-columns: repeat(4, 1fr); background: #fff; padding: 16px; gap: 10px; }
.nav-item { text-align: center; }
.nav-icon { font-size: 24px; display: block; }
.nav-label { font-size: 12px; display: block; margin-top: 4px; }
.section { background: #fff; margin-top: 10px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.content-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.c-title { font-size: 14px; }
.c-time { font-size: 11px; color: #ccc; }
</style>
