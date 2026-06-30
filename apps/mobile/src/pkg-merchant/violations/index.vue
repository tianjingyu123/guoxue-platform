<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1f1f1f" />
        </view>
        <text class="nav-title">违规管理</text>
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

      <template v-else>
        <!-- 违规概览（由已加载记录真实聚合） -->
        <view class="overview-wrap">
          <view class="card">
            <view class="ov-stats">
              <view class="ov-stat">
                <text class="ov-stat-val">{{ totalCount }}</text>
                <text class="ov-stat-label">违规次数</text>
              </view>
              <view class="ov-stat">
                <text class="ov-stat-val ov-danger">{{ pendingCount }}</text>
                <text class="ov-stat-label">待处理</text>
              </view>
              <view class="ov-stat">
                <text class="ov-stat-val">¥{{ totalPenalty }}</text>
                <text class="ov-stat-label">累计罚款</text>
              </view>
            </view>
          </view>

          <!-- 说明 -->
          <view class="info-card">
            <AppIcon name="info" :size="16" color="#d97706" />
            <view class="info-text-wrap">
              <text class="info-text">如对违规判定有异议，可对「待处理」记录提交申诉，平台将复核处理。</text>
            </view>
          </view>
        </view>

        <!-- 违规记录 -->
        <view class="record-wrap">
          <text class="section-title">违规记录</text>

          <view v-if="violations.length === 0" class="empty">
            <view class="empty-icon">
              <AppIcon name="shield-alert" :size="32" color="#16a34a" />
            </view>
            <text class="empty-text">暂无违规记录，继续保持！</text>
          </view>

          <view v-else class="record-list">
            <view v-for="v in violations" :key="v.id" class="record-card">
              <view class="record-row">
                <view class="record-icon" :style="{ background: typeConfig[v.type]?.bg }">
                  <AppIcon :name="typeConfig[v.type]?.icon || 'alert-circle'" :size="20" :color="typeConfig[v.type]?.color" />
                </view>
                <view class="record-body">
                  <view class="record-title-row">
                    <text class="record-title">{{ v.title }}</text>
                    <view class="record-status" :style="{ background: statusConfig[v.status]?.bg }">
                      <text class="record-status-text" :style="{ color: statusConfig[v.status]?.color }">{{ statusConfig[v.status]?.label || v.status }}</text>
                    </view>
                  </view>
                  <text class="record-desc">{{ v.description }}</text>
                  <view v-if="Number(v.penalty) > 0" class="record-penalty">
                    <text class="record-penalty-text">罚款: ¥{{ Number(v.penalty) }}</text>
                  </view>

                  <!-- 已申诉：展示申诉内容 -->
                  <view v-if="v.appeal" class="appeal-box">
                    <view class="appeal-head">
                      <AppIcon name="message-square" :size="14" color="#2563eb" />
                      <text class="appeal-tag">我的申诉</text>
                      <text v-if="v.appealAt" class="appeal-time">{{ formatDate(v.appealAt) }}</text>
                    </view>
                    <text class="appeal-text">{{ v.appeal }}</text>
                  </view>

                  <view class="record-foot">
                    <text class="record-time">{{ formatDate(v.createdAt) }}</text>
                    <view v-if="v.status === 'PENDING' && !v.appeal" class="record-actions">
                      <view class="rbtn rbtn-outline" :class="{ 'rbtn-disabled': submittingId === v.id }" @tap="onAppeal(v)">
                        <text class="rbtn-outline-text">{{ submittingId === v.id ? '提交中...' : '申诉' }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view style="height: 40px" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  merchantBackendApi,
  violationTypeConfig,
  violationStatusConfig,
  type MerchantViolation,
} from '@/lib/merchant-data'

const statusBarHeight = ref(20)
const navH = ref(64)
uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 20
    navH.value = (r.statusBarHeight || 20) + 44
  },
})

const typeConfig = violationTypeConfig
const statusConfig = violationStatusConfig

const violations = ref<MerchantViolation[]>([])
const loading = ref(true)
const error = ref('')
const submittingId = ref('')

const totalCount = computed(() => violations.value.length)
const pendingCount = computed(() => violations.value.filter((v) => v.status === 'PENDING').length)
const totalPenalty = computed(() => violations.value.reduce((s, v) => s + Number(v.penalty || 0), 0))

function formatDate(t?: string | null) {
  if (!t) return ''
  return String(t).slice(0, 10)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantBackendApi.getViolations({ page: 1, pageSize: 100 })
    violations.value = res.items
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onAppeal(v: MerchantViolation) {
  if (submittingId.value) return
  uni.showModal({
    title: '提交申诉',
    editable: true,
    placeholderText: '请输入申诉理由…',
    success: async (r) => {
      if (!r.confirm) return
      const text = (r.content || '').trim()
      if (!text) {
        uni.showToast({ title: '请输入申诉理由', icon: 'none' })
        return
      }
      submittingId.value = v.id
      try {
        await merchantBackendApi.appealViolation(v.id, text)
        uni.showToast({ title: '申诉已提交', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; border-bottom: 1px solid #ededed; }
.navbar-inner { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1f1f1f; margin-left: 4px; }
.nav-placeholder { width: 32px; }
.scroll { position: fixed; left: 0; right: 0; bottom: 0; }

.overview-wrap { padding: 16px; }
.card { background: #fff; border-radius: 12px; padding: 16px; }
.ov-stats { display: flex; align-items: center; }
.ov-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ov-stat-val { font-size: 24px; font-weight: 700; color: #1f1f1f; }
.ov-danger { color: #dc2626; }
.ov-stat-label { font-size: 12px; color: #9ca3af; }

.info-card { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 12px; background: #fffbeb; border: 1px solid rgba(217, 119, 6, 0.2); border-radius: 12px; }
.info-text-wrap { flex: 1; }
.info-text { font-size: 12px; color: #6b7280; line-height: 1.5; display: block; }

.record-wrap { padding: 0 16px; }
.section-title { font-size: 15px; font-weight: 500; color: #1f1f1f; display: block; margin-bottom: 12px; }
.record-list { display: flex; flex-direction: column; gap: 12px; }
.record-card { background: #fff; border-radius: 12px; padding: 16px; }
.record-row { display: flex; align-items: flex-start; gap: 12px; }
.record-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.record-body { flex: 1; min-width: 0; }
.record-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.record-title { font-size: 15px; font-weight: 500; color: #1f1f1f; flex: 1; }
.record-status { padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }
.record-status-text { font-size: 10px; }
.record-desc { font-size: 13px; color: #6b7280; margin-top: 4px; display: block; }
.record-penalty { margin-top: 8px; padding: 8px; background: #fef2f2; border-radius: 6px; }
.record-penalty-text { font-size: 12px; color: #dc2626; }
.appeal-box { margin-top: 8px; padding: 8px 10px; background: #eff6ff; border-radius: 6px; }
.appeal-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.appeal-tag { font-size: 12px; color: #2563eb; font-weight: 500; }
.appeal-time { font-size: 11px; color: #9ca3af; margin-left: auto; }
.appeal-text { font-size: 13px; color: #1f1f1f; line-height: 1.5; }
.record-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #ededed; }
.record-time { font-size: 12px; color: #9ca3af; }
.record-actions { display: flex; gap: 8px; }
.rbtn { height: 30px; padding: 0 14px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.rbtn-outline { border: 1px solid #d1d5db; }
.rbtn-outline-text { font-size: 13px; color: #4b5563; }
.rbtn-disabled { opacity: 0.5; }

.empty { padding: 60px 0; display: flex; flex-direction: column; align-items: center; }
.empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.empty-text { font-size: 14px; color: #9ca3af; }

.state { padding: 100px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 14px; color: #9ca3af; text-align: center; }
.state-btn { margin-top: 8px; padding: 8px 24px; border: 1px solid #d1d5db; border-radius: 8px; }
.state-btn-text { font-size: 14px; color: #4b5563; }
</style>
