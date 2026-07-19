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
      <!-- Loading -->
      <view v-if="loading" class="state">
        <text class="state-text">加载中…</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="state">
        <AppIcon name="alert-circle" :size="40" color="#dc2626" />
        <text class="state-text">{{ error }}</text>
        <view class="state-btn" @tap="load"><text class="state-btn-text">重试</text></view>
      </view>

      <template v-else-if="stats">
        <!-- 商品数据概览（后端真实统计） -->
        <view class="grid3">
          <view class="ov-card">
            <text class="ov-label">商品总数</text>
            <text class="ov-num">{{ stats.totalProducts }}</text>
          </view>
          <view class="ov-card">
            <text class="ov-label">已发布</text>
            <text class="ov-num">{{ stats.publishedProducts }}</text>
          </view>
          <view class="ov-card">
            <text class="ov-label">草稿/下架</text>
            <text class="ov-num">{{ stats.draftProducts }}</text>
          </view>
        </view>

        <!-- 商品明细卡片 -->
        <view class="detail-wrap">
          <view class="card">
            <view class="card-head">
              <view class="card-head-left">
                <AppIcon name="shopping-bag" :size="20" color="#c41e3a" />
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
                <text class="inner-label">草稿/下架</text>
                <text class="inner-num">{{ stats.draftProducts }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 文章/图文内容暂未开放（后端尚无内容模块） -->
        <view class="soon-card">
          <AppIcon name="file-text" :size="20" color="#9ca3af" />
          <view class="soon-text-wrap">
            <text class="soon-title">图文内容管理即将开放</text>
            <text class="soon-desc">文章发布、阅读与互动数据统计正在建设中，敬请期待。</text>
          </view>
        </view>
        <view style="height: 40px" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantBackendApi, type MerchantContentStats } from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(20)
const navH = ref(64)
uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 20
    navH.value = (r.statusBarHeight || 20) + 44
  },
})

const stats = ref<MerchantContentStats | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await merchantBackendApi.getContentStats()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; border-bottom: 1px solid #ededed; }
.navbar-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-back { width: 44px; height: 44px; margin: 0 -6px; display: flex; align-items: center; justify-content: center; } /* 触控热区≥44px：容器扩大+负margin保持视觉位置 */
.nav-title { font-size: 17px; font-weight: 600; color: #1f1f1f; }
.nav-placeholder { width: 32px; }
.scroll { position: fixed; left: 0; right: 0; bottom: 0; }

.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 16px 16px 0; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ov-card { background: #fff; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; }
.ov-label { font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
.ov-num { font-size: 24px; font-weight: 700; color: #1f1f1f; }

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

.soon-card { margin: 24px 16px 0; padding: 16px; background: #fff; border-radius: 12px; display: flex; align-items: flex-start; gap: 12px; }
.soon-text-wrap { flex: 1; }
.soon-title { font-size: 14px; font-weight: 600; color: #1f1f1f; display: block; margin-bottom: 4px; }
.soon-desc { font-size: 12px; color: #9ca3af; line-height: 1.5; }

.state { padding: 100px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 14px; color: #9ca3af; text-align: center; }
.state-btn { margin-top: 8px; padding: 8px 24px; border: 1px solid #d1d5db; border-radius: 8px; }
.state-btn-text { font-size: 14px; color: #4b5563; }
</style>
