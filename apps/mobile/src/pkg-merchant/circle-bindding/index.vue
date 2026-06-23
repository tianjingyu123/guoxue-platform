<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#1f1f1f" />
        </view>
        <text class="nav-title">绑定圈子</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ top: navH + 'px' }">
      <view v-if="loading" class="loading-state"><text>加载中...</text></view>
      <view v-if="error" class="error-state">
        <text>加载失败</text>
        <view @tap="retry"><text>重试</text></view>
      </view>
      <view v-if="!loading && !error">
      <!-- 说明 -->
      <view class="intro">
        <text class="intro-title">圈子绑定说明</text>
        <text class="intro-text">绑定圈子后，您可以在该圈子中发布内容、与圈主进行合作。请选择您希望合作的圈子。</text>
      </view>

      <!-- 搜索 -->
      <view class="search-wrap">
        <view class="search-box">
          <AppIcon name="search" :size="16" color="#9ca3af" />
          <input
            v-model="searchText"
            class="search-input"
            placeholder="搜索圈子名称或分类"
            placeholder-class="search-ph"
          />
        </view>
      </view>

      <!-- 圈子列表 -->
      <view class="list-wrap">
        <text class="section-title">可绑定圈子 ({{ filteredCircles.length }})</text>
        <view class="circle-list">
          <view
            v-for="circle in filteredCircles"
            :key="circle.id"
            class="circle-item"
            :class="{ 'circle-item-active': selected.includes(circle.id) }"
            @tap="toggle(circle.id)"
          >
            <view class="circle-left">
              <view class="circle-avatar" :class="{ 'circle-avatar-active': selected.includes(circle.id) }">
                <AppIcon v-if="selected.includes(circle.id)" name="check" :size="24" color="#fff" />
                <AppIcon v-else name="users" :size="24" color="#9ca3af" />
              </view>
              <view class="circle-info">
                <text class="circle-name">{{ circle.name }}</text>
                <view class="circle-meta">
                  <view class="circle-cat">
                    <text class="circle-cat-text">{{ circle.category }}</text>
                  </view>
                  <view class="circle-members">
                    <AppIcon name="users" :size="12" color="#9ca3af" />
                    <text class="circle-members-text">{{ circle.members }} 人</text>
                  </view>
                </view>
              </view>
            </view>
            <AppIcon name="chevron-right" :size="20" :color="selected.includes(circle.id) ? '#c41e3a' : '#d1d5db'" />
          </view>
        </view>

        <view v-if="filteredCircles.length === 0" class="empty">
          <text class="empty-text">未找到匹配的圈子</text>
        </view>
      </view>

      <!-- 已选统计 -->
      <view v-if="selected.length > 0" class="summary">
        <text class="summary-title">已选择 {{ selected.length }} 个圈子</text>
        <view class="summary-list">
          <text v-for="c in selectedCircles" :key="c.id" class="summary-item">• {{ c.name }}</text>
        </view>
      </view>
      <view style="height: 100px" />
      </view>
    </scroll-view>

    <!-- 底部操作按钮 -->
    <view class="footer">
      <view class="btn btn-outline" @tap="goBack">
        <text class="btn-outline-text">返回</text>
      </view>
      <view
        class="btn btn-primary"
        :class="{ 'btn-disabled': submitting || selected.length === 0 }"
        @tap="submit"
      >
        <text class="btn-primary-text">{{ submitting ? '提交中...' : '确认绑定' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { merchantAdminApi } from '@/lib/merchant-data'

const statusBarHeight = ref(20)
const navH = ref(64)
const loading = ref(true)
const error = ref(false)
const circles = ref<any[]>([])

uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 20
    navH.value = (r.statusBarHeight || 20) + 44
  },
})

onMounted(async () => {
  try {
    await merchantAdminApi.getDashboard()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

function retry() {
  error.value = false
  loading.value = true
  onMounted()
}

const searchText = ref('')
const selected = ref<string[]>([])
const submitting = ref(false)

const filteredCircles = computed(() =>
  circles.value.filter(
    (c) =>
      c.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
      c.category.toLowerCase().includes(searchText.value.toLowerCase()),
  ),
)

const selectedCircles = computed(() => circles.value.filter((c) => selected.value.includes(c.id)))

function toggle(id: string) {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter((x) => x !== id)
  } else {
    selected.value = [...selected.value, id]
  }
}

async function submit() {
  if (submitting.value || selected.value.length === 0) return
  submitting.value = true
  try {
    await merchantAdminApi.getDashboard()
    uni.showToast({ title: '绑定成功', icon: 'success' })
    setTimeout(() => navigateTo('/merchant/dashboard'), 800)
  } catch {
    uni.showToast({ title: '绑定失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; }
.navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; border-bottom: 1px solid #ededed; }
.navbar-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1f1f1f; }
.nav-placeholder { width: 32px; }
.scroll { position: fixed; left: 0; right: 0; bottom: 0; }

.intro { margin: 16px; padding: 16px; background: rgba(196, 30, 58, 0.08); border: 1px solid rgba(196, 30, 58, 0.2); border-radius: 12px; }
.intro-title { font-size: 15px; font-weight: 600; color: #1f1f1f; display: block; margin-bottom: 4px; }
.intro-text { font-size: 13px; color: #6b7280; line-height: 1.5; }

.search-wrap { padding: 0 16px; margin-top: 4px; }
.search-box { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; background: #f5f5f5; border-radius: 8px; }
.search-input { flex: 1; font-size: 14px; color: #1f1f1f; }
.search-ph { color: #9ca3af; }

.list-wrap { padding: 16px; }
.section-title { font-size: 14px; font-weight: 600; color: #1f1f1f; display: block; margin-bottom: 12px; }
.circle-list { display: flex; flex-direction: column; gap: 8px; }
.circle-item { display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid #ededed; border-radius: 12px; }
.circle-item-active { border-color: #c41e3a; background: rgba(196, 30, 58, 0.05); }
.circle-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.circle-avatar { width: 40px; height: 40px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.circle-avatar-active { background: #c41e3a; }
.circle-info { flex: 1; }
.circle-name { font-size: 15px; font-weight: 600; color: #1f1f1f; display: block; }
.circle-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.circle-cat { padding: 1px 8px; background: #f3f4f6; border-radius: 999px; }
.circle-cat-text { font-size: 11px; color: #6b7280; }
.circle-members { display: flex; align-items: center; gap: 4px; }
.circle-members-text { font-size: 11px; color: #9ca3af; }

.empty { padding: 32px; display: flex; justify-content: center; }
.empty-text { font-size: 14px; color: #9ca3af; }

.summary { margin: 24px 16px 0; padding: 16px; background: #f9fafb; border-radius: 12px; }
.summary-title { font-size: 13px; color: #6b7280; display: block; margin-bottom: 8px; }
.summary-list { display: flex; flex-direction: column; gap: 4px; }
.summary-item { font-size: 13px; color: #1f1f1f; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.btn { flex: 1; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.btn-outline { border: 1px solid #d1d5db; }
.btn-outline-text { font-size: 15px; color: #4b5563; }
.btn-primary { background: #c41e3a; }
.btn-primary-text { font-size: 15px; color: #fff; }
.btn-disabled { opacity: 0.5; }

.loading-state { padding: 60px 0; display: flex; align-items: center; justify-content: center; }
.loading-state text { font-size: 14px; color: #9ca3af; }
.error-state { padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.error-state text { font-size: 14px; color: #ef4444; }
.error-state view { padding: 8px 20px; background: #c41e3a; border-radius: 8px; }
.error-state view text { font-size: 14px; color: #fff; }
</style>
