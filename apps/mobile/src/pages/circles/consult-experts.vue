<script setup lang="ts">
/**
 * 专家列表 — 三态：加载骨架 → 错误重试 → 搜索筛选列表
 * API: circleDetailApi.listExperts + 本地搜索/在线筛选
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack, toastComingSoon } from '@/utils/router'
import { circleDetailApi, type ExpertItem } from '@/lib/circle-detail-data'

const loading = ref(true)
const error = ref('')
const experts = ref<ExpertItem[]>([])
const circleId = ref('1')

const search = ref('')
const filter = ref<'all' | 'online'>('all')

onMounted(() => {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  const q = (cur as any).$page?.options || {}
  if (q.circleId) circleId.value = q.circleId
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await circleDetailApi.listExperts(circleId.value)
    experts.value = Array.isArray(res) ? res : (res as any).data || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => experts.value.filter(e => {
  const matchOnline = filter.value === 'all' || e.online
  const s = search.value.trim()
  const matchSearch = !s || e.name.includes(s) || e.specialty.includes(s) || e.tags.some(t => t.includes(s))
  return matchOnline && matchSearch
}))
</script>

<template>
  <view class="ce-page">
    <view class="ce-nav">
      <view class="ce-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="ce-nav-title">专家列表</text>
    </view>

    <view class="ce-body">
      <view class="ce-search">
        <app-icon name="search" :size="28" color="#999999" />
        <input v-model="search" class="ce-search-input" placeholder="搜索专家或专长" placeholder-class="ce-ph" />
      </view>

      <view class="ce-filters">
        <view v-for="f in (['all','online'] as const)" :key="f" class="ce-filter" :class="{ 'is-active': filter === f }" @tap="filter = f">
          <text class="ce-filter-t" :class="{ 'is-active': filter === f }">{{ f === 'all' ? '全部' : '在线' }}</text>
        </view>
      </view>

      <!-- 骨架 -->
      <view v-if="loading" class="ce-skel">
        <view v-for="i in 3" :key="i" class="ce-skel-card">
          <view class="ce-skel-top"><view class="ce-skel-avatar" /><view class="ce-skel-lines"><view class="ce-skel-line w60" /><view class="ce-skel-line w40" /><view class="ce-skel-line w80" /></view></view>
          <view class="ce-skel-tags"><view class="ce-skel-tag" /><view class="ce-skel-tag" /><view class="ce-skel-tag" /></view>
          <view class="ce-skel-actions"><view class="ce-skel-btn" /><view class="ce-skel-btn" /></view>
        </view>
      </view>

      <!-- 错误 -->
      <error-state v-else-if="error" :message="error" @retry="loadData" />

      <!-- 列表 -->
      <template v-else>
        <view class="ce-list">
          <view v-for="e in filtered" :key="e.id" class="ce-card">
            <view class="ce-card-top">
              <view class="ce-avatar-wrap">
                <image class="ce-avatar" :src="e.avatar" mode="aspectFill" />
                <view v-if="e.online" class="ce-online-dot" />
              </view>
              <view class="ce-card-info">
                <view class="ce-name-row">
                  <text class="ce-name">{{ e.name }}</text>
                  <app-icon v-if="e.verified" name="award" :size="26" color="#F59E0B" />
                  <view class="ce-status" :class="e.online ? 'is-online' : 'is-offline'"><text class="ce-status-t" :class="e.online ? 'is-online' : 'is-offline'">{{ e.online ? '在线' : '离线' }}</text></view>
                </view>
                <text class="ce-specialty">{{ e.specialty }}</text>
                <view class="ce-rate-row">
                  <view class="ce-rate"><app-icon name="star" :size="22" color="#FBBF24" :fill="true" /><text class="ce-rate-t">{{ e.rating }}</text></view>
                  <text class="ce-rate-sub">{{ e.reviewCount }} 评价</text>
                  <text class="ce-rate-sub">{{ e.answerCount }} 次咨询</text>
                </view>
              </view>
            </view>

            <view class="ce-tags">
              <view v-for="t in e.tags" :key="t" class="ce-tag"><text class="ce-tag-t">{{ t }}</text></view>
            </view>

            <view class="ce-price-row">
              <view class="ce-prices">
                <view class="ce-price"><app-icon name="phone" :size="22" color="#999999" /><text class="ce-price-t">电话 ¥{{ e.callPrice }}/分钟</text></view>
                <view class="ce-price"><app-icon name="message-square" :size="22" color="#999999" /><text class="ce-price-t">图文 ¥{{ e.textPrice }}/次</text></view>
              </view>
              <view class="ce-resp"><app-icon name="clock" :size="22" color="#16A34A" /><text class="ce-resp-t">{{ e.responseTime }}响应</text></view>
            </view>

            <view class="ce-actions">
              <view class="ce-btn-outline" @tap="toastComingSoon"><app-icon name="phone" :size="26" color="#2C2C2C" /><text class="ce-btn-outline-t">电话咨询</text></view>
              <view class="ce-btn-primary" @tap="toastComingSoon"><app-icon name="message-square" :size="26" color="#ffffff" /><text class="ce-btn-primary-t">图文咨询</text></view>
            </view>
          </view>

          <view v-if="filtered.length === 0" class="ce-empty"><text class="ce-empty-t">暂无符合条件的专家</text></view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ce-page { min-height: 100vh; background: #F5F1E8; }
.ce-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.ce-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ce-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ce-body { padding: 24rpx; padding-bottom: 48rpx; }
.ce-search { display: flex; align-items: center; gap: 12rpx; padding: 0 24rpx; height: 76rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 16rpx; margin-bottom: 24rpx; }
.ce-search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.ce-ph { color: #b5aea3; }
.ce-filters { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.ce-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.ce-filter.is-active { background: #C41E3A; }
.ce-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.ce-filter-t.is-active { color: #fff; }
.ce-list { display: flex; flex-direction: column; gap: 20rpx; }
.ce-card { padding: 24rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; }
.ce-card-top { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.ce-avatar-wrap { position: relative; flex-shrink: 0; }
.ce-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.ce-online-dot { position: absolute; bottom: 4rpx; right: 4rpx; width: 20rpx; height: 20rpx; border-radius: 50%; background: #22C55E; border: 3rpx solid #fff; }
.ce-card-info { flex: 1; min-width: 0; }
.ce-name-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 4rpx; }
.ce-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.ce-status { padding: 2rpx 12rpx; border-radius: 999rpx; }
.ce-status.is-online { background: #ECFDF3; }
.ce-status.is-offline { background: #F2EFEA; }
.ce-status-t { font-size: 20rpx; }
.ce-status-t.is-online { color: #16A34A; }
.ce-status-t.is-offline { color: #999; }
.ce-specialty { display: block; font-size: 24rpx; color: #C41E3A; margin-bottom: 8rpx; }
.ce-rate-row { display: flex; align-items: center; gap: 16rpx; }
.ce-rate { display: flex; align-items: center; gap: 4rpx; }
.ce-rate-t { font-size: 22rpx; color: #999; }
.ce-rate-sub { font-size: 22rpx; color: #999; }
.ce-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 20rpx; }
.ce-tag { background: #F2EFEA; border-radius: 999rpx; padding: 4rpx 16rpx; }
.ce-tag-t { font-size: 20rpx; color: #999; }
.ce-price-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.ce-prices { display: flex; gap: 20rpx; }
.ce-price { display: flex; align-items: center; gap: 6rpx; }
.ce-price-t { font-size: 22rpx; color: #999; }
.ce-resp { display: flex; align-items: center; gap: 4rpx; }
.ce-resp-t { font-size: 22rpx; color: #16A34A; }
.ce-actions { display: flex; gap: 16rpx; }
.ce-btn-outline { flex: 1; height: 64rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ce-btn-outline-t { font-size: 26rpx; color: #2C2C2C; }
.ce-btn-primary { flex: 1; height: 64rpx; background: #C41E3A; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ce-btn-primary-t { font-size: 26rpx; color: #fff; }
.ce-empty { padding: 120rpx 0; }
.ce-empty-t { display: block; text-align: center; font-size: 26rpx; color: #999; }
/* 骨架 */
.ce-skel { display: flex; flex-direction: column; gap: 20rpx; }
.ce-skel-card { padding: 24rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; }
.ce-skel-top { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.ce-skel-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; background: #E8E0D0; flex-shrink: 0; }
.ce-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 10rpx; padding-top: 8rpx; }
.ce-skel-line { height: 24rpx; background: #E8E0D0; border-radius: 8rpx; }
.ce-skel-line.w60 { width: 60%; }
.ce-skel-line.w40 { width: 40%; }
.ce-skel-line.w80 { width: 80%; }
.ce-skel-tags { display: flex; gap: 10rpx; margin-bottom: 20rpx; }
.ce-skel-tag { width: 100rpx; height: 36rpx; border-radius: 999rpx; background: #E8E0D0; }
.ce-skel-actions { display: flex; gap: 16rpx; }
.ce-skel-btn { flex: 1; height: 64rpx; border-radius: 12rpx; background: #E8E0D0; }
</style>
