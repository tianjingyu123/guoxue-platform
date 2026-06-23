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
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <view v-if="error" class="state-error"><text class="state-error-text">加载失败</text><view class="state-retry" @tap="retry"><text class="state-retry-text">重试</text></view></view>
      <template v-if="!loading && !error">
      <!-- 违规概览 -->
      <view class="overview-wrap">
        <view class="card">
          <view class="ov-head">
            <view>
              <text class="ov-label">店铺扣分</text>
              <view class="ov-score-row">
                <text class="ov-score">{{ stats.score }}</text>
                <text class="ov-max">/ {{ stats.maxScore }}分</text>
              </view>
            </view>
            <view class="ov-circle" :style="{ background: levelBg }">
              <text class="ov-circle-text" :style="{ color: levelColor }">{{ levelLabel }}</text>
            </view>
          </view>
          <!-- 进度条 -->
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: scorePercent + '%', background: levelColor }" />
          </view>
          <view class="ov-foot">
            <view class="ov-foot-item">
              <text class="ov-foot-label">违规次数</text>
              <text class="ov-foot-val">{{ stats.total }}</text>
            </view>
            <view class="ov-foot-item">
              <text class="ov-foot-label">待处理</text>
              <text class="ov-foot-val ov-foot-danger">{{ stats.pending }}</text>
            </view>
          </view>
        </view>

        <!-- 扣分说明 -->
        <view class="info-card">
          <AppIcon name="info" :size="16" color="#d97706" />
          <view class="info-text-wrap">
            <text class="info-text">扣分满48分将被暂停营业资格，每季度初清零一次。</text>
            <text class="info-text info-text-2">如有异议可在收到通知后3天内提交申诉。</text>
          </view>
        </view>
      </view>

      <!-- 违规记录 -->
      <view class="record-wrap">
        <text class="section-title">违规记录</text>
        <view class="record-list">
          <view v-for="v in violations" :key="v.id" class="record-card">
            <view class="record-row">
              <view class="record-icon" :style="{ background: typeConfig[v.type].bg }">
                <AppIcon :name="typeConfig[v.type].icon" :size="20" :color="typeConfig[v.type].color" />
              </view>
              <view class="record-body">
                <view class="record-title-row">
                  <text class="record-title">{{ v.title }}</text>
                  <view class="record-status" :style="{ background: statusConfig[v.status].bg }">
                    <text class="record-status-text" :style="{ color: statusConfig[v.status].color }">{{ statusConfig[v.status].label }}</text>
                  </view>
                </view>
                <text class="record-desc">{{ v.description }}</text>
                <view class="record-meta">
                  <text v-if="v.productTitle" class="record-meta-text">商品: {{ v.productTitle }}</text>
                  <text v-if="v.orderNo" class="record-meta-text">订单: {{ v.orderNo }}</text>
                </view>
                <view class="record-penalty">
                  <text class="record-penalty-text">处罚: {{ v.penalty }}</text>
                </view>
                <view class="record-foot">
                  <text class="record-time">{{ v.createdAt }}</text>
                  <view v-if="v.status === 'pending'" class="record-actions">
                    <view class="rbtn rbtn-outline" @tap="onAppeal">
                      <text class="rbtn-outline-text">申诉</text>
                    </view>
                    <view class="rbtn rbtn-primary" @tap="onHandle">
                      <text class="rbtn-primary-text">去处理</text>
                    </view>
                  </view>
                  <text v-else class="record-processed">处理时间: {{ v.processedAt }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="violations.length === 0" class="empty">
          <view class="empty-icon">
            <AppIcon name="shield-alert" :size="32" color="#16a34a" />
          </view>
          <text class="empty-text">暂无违规记录，继续保持！</text>
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
  merchantAdminApi,
  violationTypeConfig,
  violationStatusConfig,
} from '@/lib/merchant-data'

const statusBarHeight = ref(20)
const navH = ref(64)
uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 20
    navH.value = (r.statusBarHeight || 20) + 44
  },
})

const stats = ref<any>({})
const violations = ref<any[]>([])
const loading = ref(true)
const error = ref(false)
const typeConfig = violationTypeConfig
const statusConfig = violationStatusConfig

const scorePercent = computed(() => (stats.value.score / stats.value.maxScore) * 100)
const levelLabel = computed(() => (scorePercent.value > 50 ? '警告' : scorePercent.value > 25 ? '注意' : '良好'))
const levelColor = computed(() => (scorePercent.value > 50 ? '#dc2626' : scorePercent.value > 25 ? '#d97706' : '#16a34a'))
const levelBg = computed(() => (scorePercent.value > 50 ? '#fee2e2' : scorePercent.value > 25 ? '#fef3c7' : '#dcfce7'))

function onAppeal() {
  uni.showToast({ title: '申诉功能开发中', icon: 'none' })
}
function onHandle() {
  uni.showToast({ title: '处理功能开发中', icon: 'none' })
}

onMounted(async () => {
  try {
    const res = await merchantAdminApi.getViolations()
    stats.value = res.stats || {}
    violations.value = res.items || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

async function retry() {
  error.value = false
  loading.value = true
  try {
    const res = await merchantAdminApi.getViolations()
    stats.value = res.stats || {}
    violations.value = res.items || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
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
.ov-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.ov-label { font-size: 13px; color: #9ca3af; }
.ov-score-row { display: flex; align-items: baseline; gap: 4px; margin-top: 4px; }
.ov-score { font-size: 30px; font-weight: 700; color: #1f1f1f; }
.ov-max { font-size: 13px; color: #9ca3af; }
.ov-circle { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ov-circle-text { font-size: 17px; font-weight: 700; }
.progress-track { width: 100%; height: 8px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 999px; }
.ov-foot { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
.ov-foot-item { display: flex; align-items: center; gap: 4px; }
.ov-foot-label { font-size: 13px; color: #9ca3af; }
.ov-foot-val { font-size: 13px; font-weight: 500; color: #1f1f1f; }
.ov-foot-danger { color: #dc2626; }

.info-card { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 12px; background: #fffbeb; border: 1px solid rgba(217, 119, 6, 0.2); border-radius: 12px; }
.info-text-wrap { flex: 1; }
.info-text { font-size: 12px; color: #6b7280; line-height: 1.5; display: block; }
.info-text-2 { margin-top: 4px; }

.record-wrap { padding: 0 16px; }
.section-title { font-size: 15px; font-weight: 500; color: #1f1f1f; display: block; margin-bottom: 12px; }
.record-list { display: flex; flex-direction: column; gap: 12px; }
.record-card { background: #fff; border-radius: 12px; padding: 16px; }
.record-row { display: flex; align-items: flex-start; gap: 12px; }
.record-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.record-body { flex: 1; min-width: 0; }
.record-title-row { display: flex; align-items: center; justify-content: space-between; }
.record-title { font-size: 15px; font-weight: 500; color: #1f1f1f; }
.record-status { padding: 2px 8px; border-radius: 6px; }
.record-status-text { font-size: 10px; }
.record-desc { font-size: 13px; color: #6b7280; margin-top: 4px; display: block; }
.record-meta { margin-top: 8px; }
.record-meta-text { font-size: 12px; color: #9ca3af; display: block; }
.record-penalty { margin-top: 8px; padding: 8px; background: #fef2f2; border-radius: 6px; }
.record-penalty-text { font-size: 12px; color: #dc2626; }
.record-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #ededed; }
.record-time { font-size: 12px; color: #9ca3af; }
.record-actions { display: flex; gap: 8px; }
.rbtn { height: 30px; padding: 0 14px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.rbtn-outline { border: 1px solid #d1d5db; }
.rbtn-outline-text { font-size: 13px; color: #4b5563; }
.rbtn-primary { background: #c41e3a; }
.rbtn-primary-text { font-size: 13px; color: #fff; }
.record-processed { font-size: 12px; color: #9ca3af; }

.empty { padding: 80px 0; display: flex; flex-direction: column; align-items: center; }
.empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.empty-text { font-size: 14px; color: #9ca3af; }
/* 三态 */
.state-loading { padding: 80px 0; text-align: center; }
.state-loading-text { font-size: 14px; color: #9ca3af; }
.state-error { padding: 80px 0; text-align: center; }
.state-error-text { font-size: 14px; color: #ef4444; display: block; margin-bottom: 12px; }
.state-retry { display: inline-block; padding: 8px 20px; background: #c41e3a; border-radius: 8px; }
.state-retry-text { font-size: 14px; color: #fff; }
</style>
