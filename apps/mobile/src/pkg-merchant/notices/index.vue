<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="onNavBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">{{ selected ? '公告详情' : '商家公告' }}</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 详情视图 -->
      <template v-if="selected">
        <view class="detail-card" :style="{ background: typeStyle(selected.type).bg, borderColor: typeStyle(selected.type).border }">
          <view class="detail-head">
            <app-icon :name="typeStyle(selected.type).icon" :size="20" :color="typeStyle(selected.type).iconColor" />
            <view class="detail-head-body">
              <view class="detail-title-row">
                <text class="detail-title">{{ selected.title }}</text>
                <text v-if="selected.category" class="cat-badge">{{ selected.category }}</text>
              </view>
              <view class="detail-time">
                <app-icon name="clock" :size="14" color="#9ca3af" />
                <text class="detail-time-text">{{ formatTime(selected.time) }}</text>
              </view>
            </view>
          </view>
          <text class="detail-content">{{ selected.content }}</text>
        </view>

        <view class="section">
          <view class="op-btn op-muted" @tap="selected = null"><text class="op-muted-text">返回列表</text></view>
        </view>
      </template>

      <!-- 列表视图 -->
      <template v-else>
        <!-- Loading -->
        <view v-if="loading" class="state">
          <text class="state-text">加载中…</text>
        </view>
        <!-- Error -->
        <view v-else-if="error" class="state">
          <app-icon name="alert-circle" :size="40" color="#dc2626" />
          <text class="state-text">{{ error }}</text>
          <view class="state-btn" @tap="load"><text class="state-btn-text">重试</text></view>
        </view>
        <!-- Empty -->
        <view v-else-if="notices.length === 0" class="state">
          <app-icon name="bell" :size="40" color="#d1d5db" />
          <text class="state-text">暂无公告</text>
        </view>
        <!-- 列表 -->
        <view v-else class="list">
          <view
            v-for="notice in notices"
            :key="notice.id"
            class="notice-card"
            :style="{ background: typeStyle(notice.type).bg, borderColor: typeStyle(notice.type).border }"
            @tap="openNotice(notice)"
          >
            <view class="notice-row">
              <app-icon :name="typeStyle(notice.type).icon" :size="20" :color="typeStyle(notice.type).iconColor" />
              <view class="notice-body">
                <view class="notice-title-row">
                  <text class="notice-title">{{ notice.title }}</text>
                </view>
                <text class="notice-excerpt">{{ notice.content }}</text>
                <view class="notice-foot">
                  <text v-if="notice.category" class="cat-badge">{{ notice.category }}</text>
                  <view class="notice-time">
                    <app-icon name="clock" :size="12" color="#9ca3af" />
                    <text class="notice-time-text">{{ formatTime(notice.time) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantBackendApi, type MerchantNotice } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const notices = ref<MerchantNotice[]>([])
const selected = ref<MerchantNotice | null>(null)
const loading = ref(true)
const error = ref('')

// 纯展示映射：按公告 type 选图标配色，未知 type 走默认（非 mock 数据）
function typeStyle(type: string) {
  const map: Record<string, { icon: string; iconColor: string; bg: string; border: string }> = {
    important: { icon: 'alert-circle', iconColor: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    activity: { icon: 'gift', iconColor: '#c41e3a', bg: '#fef2f4', border: '#f5c2cb' },
    warning: { icon: 'alert-triangle', iconColor: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    system: { icon: 'bell', iconColor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  }
  return map[type] || { icon: 'bell', iconColor: '#6b7280', bg: '#f9fafb', border: '#ededed' }
}

function formatTime(t: string) {
  if (!t) return ''
  return String(t).replace('T', ' ').slice(0, 16)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    notices.value = await merchantBackendApi.getNotices()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openNotice(notice: MerchantNotice) {
  selected.value = notice
}
function onNavBack() {
  if (selected.value) {
    selected.value = null
  } else {
    goBack()
  }
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: #ffffff; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 40px; }

.list { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.notice-card { padding: 16px; border-radius: 12px; border: 1px solid transparent; }
.notice-row { display: flex; align-items: flex-start; gap: 12px; }
.notice-body { flex: 1; min-width: 0; }
.notice-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.notice-title { flex: 1; font-size: 15px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-excerpt { display: block; font-size: 14px; color: rgba(26, 26, 26, 0.7); line-height: 1.5; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.notice-foot { display: flex; align-items: center; gap: 8px; }
.cat-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; color: #6b7280; background: rgba(0, 0, 0, 0.05); }
.notice-time { display: flex; align-items: center; gap: 4px; }
.notice-time-text { font-size: 12px; color: #9ca3af; }

.detail-card { margin: 16px; padding: 16px; border-radius: 12px; border: 1px solid transparent; }
.detail-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.detail-head-body { flex: 1; }
.detail-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.detail-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.detail-time { display: flex; align-items: center; gap: 4px; }
.detail-time-text { font-size: 14px; color: #9ca3af; }
.detail-content { display: block; font-size: 15px; color: #1a1a1a; line-height: 1.7; }

.section { padding: 8px 16px 0; }
.op-btn { padding: 14px; border-radius: 8px; margin-bottom: 8px; }
.op-muted { background: #f3f4f6; }
.op-muted-text { font-size: 15px; font-weight: 500; color: #1a1a1a; text-align: center; display: block; }

.state { padding: 80px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 14px; color: #9ca3af; text-align: center; }
.state-btn { margin-top: 8px; padding: 8px 24px; border: 1px solid #d1d5db; border-radius: 8px; }
.state-btn-text { font-size: 14px; color: #4b5563; }
</style>
