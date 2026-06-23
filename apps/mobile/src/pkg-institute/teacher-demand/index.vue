<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left">
          <view class="nav-back" @tap="goBack">
            <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="nav-title">课程需求大厅</text>
        </view>
        <view class="view-switch">
          <view class="switch-btn" :class="{ 'switch-active': viewMode === 'teacher' }" @tap="viewMode = 'teacher'">
            <text class="switch-text" :class="{ 'switch-text-active': viewMode === 'teacher' }">老师视角</text>
          </view>
          <view class="switch-btn" :class="{ 'switch-active': viewMode === 'station' }" @tap="viewMode = 'station'">
            <text class="switch-text" :class="{ 'switch-text-active': viewMode === 'station' }">驿站视角</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-chip"
        :class="{ 'tab-chip-active': activeTab === tab.id }"
        @tap="activeTab = tab.id"
      >
        <text class="tab-chip-text" :class="{ 'tab-chip-text-active': activeTab === tab.id }">{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="list">
        <view v-if="loading" class="empty-state">
          <text class="empty-state-text">加载中...</text>
        </view>
        <view v-else-if="filteredDemands.length === 0" class="empty-state">
          <text class="empty-state-text">暂无课程需求</text>
        </view>
        <template v-else>
        <view
          v-for="demand in filteredDemands"
          :key="demand.id"
          class="demand-card"
          @tap="goDetail(demand.id)"
        >
          <!-- 驿站信息 -->
          <view class="station-row">
            <view class="station-icon">
              <app-icon name="building-2" :size="16" color="#2563eb" />
            </view>
            <view class="station-info">
              <text class="station-name">{{ demand.stationName }}</text>
              <view class="station-loc">
                <app-icon name="map-pin" :size="12" color="#9ca3af" />
                <text class="station-loc-text">{{ demand.stationLocation }}</text>
              </view>
            </view>
            <text class="status-badge" :style="{ color: statusConfig[demand.status].color, background: statusConfig[demand.status].bg }">{{ statusConfig[demand.status].label }}</text>
          </view>

          <!-- 需求内容 -->
          <text class="demand-title">{{ demand.title }}</text>
          <text class="demand-desc">{{ demand.description }}</text>

          <!-- 标签 -->
          <view class="tag-row">
            <text class="tag">{{ demand.specialty }}</text>
            <text class="tag">{{ demand.duration }}</text>
            <text class="tag">{{ demand.studentCount }}人班</text>
          </view>

          <!-- 底部信息 -->
          <view class="bottom-row">
            <view class="bottom-left">
              <view class="bottom-item">
                <app-icon name="calendar" :size="12" color="#9ca3af" />
                <text class="bottom-text">{{ demand.date.split(' ')[0] }}</text>
              </view>
              <view class="bottom-item">
                <app-icon name="users" :size="12" color="#9ca3af" />
                <text class="bottom-text">{{ demand.applicants }}人申请</text>
              </view>
            </view>
            <view class="budget">
              <text class="budget-label">预算 </text>
              <text class="budget-value">¥{{ (demand.budget.min / 1000).toFixed(0) }}k-{{ (demand.budget.max / 1000).toFixed(0) }}k</text>
            </view>
          </view>

          <!-- 老师视角：申请按钮 -->
          <view v-if="viewMode === 'teacher' && demand.status === 'recruiting'" class="apply-btn" @tap.stop="applyDemand">
            <text class="apply-btn-text">申请授课</text>
          </view>
        </view>
        </template>
      </view>
      <view :style="{ height: viewMode === 'station' ? '88px' : '24px' }" />
    </scroll-view>

    <!-- 驿站视角：发布需求按钮 -->
    <view v-if="viewMode === 'station'" class="footer">
      <view class="footer-btn" @tap="goCreate">
        <app-icon name="plus" :size="16" color="#fff" />
        <text class="footer-btn-text">发布课程需求</text>
      </view>
    </view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi,
  teacherDemands,
  demandStatusConfig as statusConfig,
  demandTabs as tabs,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44 - 45
} catch (e) {}

const activeTab = ref('all')
const viewMode = ref<'teacher' | 'station'>('teacher')
const loading = ref(false)

onMounted(() => {
  loading.value = true
  // teacherDemands 从模块同步导入，暂无独立 API
  loading.value = false
})

const filteredDemands = computed(() => teacherDemands.filter(d => {
  if (activeTab.value === 'all') return true
  return d.status === activeTab.value
}))

function goDetail(id: number) {
  navigateTo(`/institute/demands/${id}`)
}
function goCreate() {
  navigateTo('/institute/demands/create')
}
function applyDemand() {
  uni.showToast({ title: '已提交申请', icon: 'success' })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,0.95); border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-left { display: flex; align-items: center; gap: 8px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.view-switch { display: flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
.switch-btn { padding: 4px 10px; height: 28px; display: flex; align-items: center; }
.switch-active { background: #c41e3a; }
.switch-text { font-size: 12px; color: #4b5563; }
.switch-text-active { color: #fff; }

.tab-bar { display: flex; gap: 8px; padding: 8px 16px; overflow-x: auto; border-bottom: 1px solid #ededed; background: #fff; white-space: nowrap; }
.tab-chip { flex-shrink: 0; padding: 4px 14px; border-radius: 999px; border: 1px solid #d1d5db; background: #fff; }
.tab-chip-active { background: #c41e3a; border-color: #c41e3a; }
.tab-chip-text { font-size: 12px; color: #4b5563; }
.tab-chip-text-active { color: #fff; }
.scroll { width: 100%; }

.list { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }

.empty-state { padding: 40px 0; display: flex; flex-direction: column; align-items: center; }
.empty-state-text { font-size: 14px; color: #9ca3af; }
.demand-card { background: #fff; border-radius: 12px; border: 1px solid #ededed; padding: 12px; }
.station-row { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #ededed; margin-bottom: 8px; }
.station-icon { width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; }
.station-info { flex: 1; min-width: 0; }
.station-name { font-size: 14px; font-weight: 500; color: #1a1a1a; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.station-loc { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.station-loc-text { font-size: 10px; color: #9ca3af; }
.status-badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }

.demand-title { font-size: 15px; font-weight: 500; color: #1a1a1a; display: block; }
.demand-desc { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.5; display: block; }
.tag-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.tag { font-size: 10px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; color: #4b5563; }
.bottom-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ededed; }
.bottom-left { display: flex; align-items: center; gap: 12px; }
.bottom-item { display: flex; align-items: center; gap: 4px; }
.bottom-text { font-size: 10px; color: #9ca3af; }
.budget-label { font-size: 10px; color: #9ca3af; }
.budget-value { font-size: 14px; font-weight: 500; color: #c41e3a; }

.apply-btn { margin-top: 12px; height: 36px; background: #c41e3a; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.apply-btn-text { font-size: 12px; color: #fff; font-weight: 500; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.footer-btn { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; background: #c41e3a; border-radius: 8px; }
.footer-btn-text { font-size: 14px; color: #fff; font-weight: 500; }
</style>
