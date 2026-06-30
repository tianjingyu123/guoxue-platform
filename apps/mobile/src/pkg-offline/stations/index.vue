<template>
  <view class="st-page">
    <!-- 顶部导航 -->
    <view class="st-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="st-nav">
        <view class="st-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="st-title">线下驿站</text>
        <view class="st-icon-btn" @tap="goManage">
          <app-icon name="store" :size="20" color="#9a2e25" />
        </view>
      </view>
      <!-- 搜索栏 -->
      <view class="st-search-wrap">
        <view class="st-search">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="keyword" class="st-search-input" placeholder="搜索驿站名称或地址" placeholder-class="st-ph" />
        </view>
      </view>
      <!-- 类型筛选 -->
      <scroll-view scroll-x class="st-types" :show-scrollbar="false">
        <view
          v-for="t in stationTypeFilters"
          :key="t.value"
          class="st-type"
          :class="{ active: selectedType === t.value }"
          @tap="selectedType = t.value"
        >
          {{ t.label }}
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="st-body">
      <!-- 加载/错误态 -->
      <view v-if="loading" class="st-state">
        <view class="spinner" />
        <text class="st-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="st-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="st-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <view v-else class="st-section">
        <text class="st-sec-title">
          {{ keyword ? '搜索结果' : '全部驿站' }}
          <text class="st-count">({{ filteredStations.length }})</text>
        </text>

        <view v-if="filteredStations.length === 0" class="st-empty">
          <app-icon name="map-pin" :size="48" color="#d1d5db" />
          <text class="st-empty-text">暂无驿站</text>
        </view>

        <view v-else class="st-list">
          <view
            v-for="s in filteredStations"
            :key="s.id"
            class="st-card"
            @tap="goDetail(s.id)"
          >
            <view class="st-cover">
              <image lazy-load v-if="s.cover" :src="s.cover" class="st-cover-img" mode="aspectFill" />
              <app-icon v-else name="map-pin" :size="32" color="#d8b48a" />
              <view v-if="s.status !== 'ACTIVE'" class="st-cover-mask">
                <text class="st-cover-mask-text">{{ stationStatusLabel[s.status] || '筹备中' }}</text>
              </view>
            </view>
            <view class="st-card-info">
              <view class="st-card-top">
                <view class="st-card-titlerow">
                  <text class="st-card-name">{{ s.name }}</text>
                  <text v-if="s.type" class="st-card-typetag">{{ getStationTypeLabel(s.type) }}</text>
                </view>
              </view>
              <view class="st-addr">
                <app-icon name="map-pin" :size="12" color="#9ca3af" />
                <text class="st-addr-text">{{ s.city }} · {{ s.address }}</text>
              </view>
              <view v-if="s.tags && s.tags.length" class="st-tags">
                <text v-for="t in s.tags.slice(0, 3)" :key="t" class="st-tag">{{ t }}</text>
              </view>
              <view class="st-facilities">
                <app-icon
                  v-for="f in s.facilities.slice(0, 5)"
                  :key="f"
                  :name="getFacilityInfo(f).icon"
                  :size="15"
                  color="#9ca3af"
                />
                <text v-if="s.facilities.length > 5" class="st-fac-more">+{{ s.facilities.length - 5 }}</text>
              </view>
              <view class="st-card-bottom">
                <text class="st-course-cnt">{{ s._count?.courses ?? 0 }} 门课程</text>
                <view class="st-enter">
                  <text class="st-enter-text">查看</text>
                  <app-icon name="chevron-right" :size="14" color="#c41e3a" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="st-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineApi,
  stationTypeFilters,
  getStationTypeLabel,
  getFacilityInfo,
  stationStatusLabel,
  type Station,
  type StationType,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const all = ref<Station[]>([])
const selectedType = ref<StationType | 'all'>('all')
const keyword = ref('')

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    all.value = await offlineApi.discoverStations()
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

const filteredStations = computed(() => {
  let list = all.value
  if (selectedType.value !== 'all') list = list.filter((s) => s.type === selectedType.value)
  if (keyword.value) list = list.filter((s) => s.name.includes(keyword.value) || s.address.includes(keyword.value) || s.city.includes(keyword.value))
  return list
})

function goDetail(id: string) {
  navigateTo(`/offline/stations/${id}`)
}
function goManage() {
  navigateTo('/offline/manage')
}
</script>

<style scoped>
.st-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.st-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.st-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.st-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.st-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.st-search-wrap { padding: 0 16px 12px; }
.st-search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; background: #f3f4f6; border-radius: 999px; }
.st-search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.st-ph { color: #9ca3af; }
.st-types { white-space: nowrap; padding: 0 16px 12px; }
.st-type { display: inline-block; padding: 6px 16px; margin-right: 8px; font-size: 14px; color: #6b7280; background: #f3f4f6; border-radius: 999px; }
.st-type.active { color: #fff; background: var(--brand); }
.st-body { flex: 1; }

.st-state { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.st-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.st-section { padding: 16px; }
.st-sec-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.st-count { font-size: 13px; font-weight: 400; color: #9ca3af; margin-left: 6px; }
.st-empty { padding: 48px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.st-empty-text { font-size: 14px; color: #9ca3af; }
.st-list { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
.st-card { display: flex; background: #fff; border-radius: 12px; overflow: hidden; }
.st-cover { position: relative; width: 112px; height: 132px; flex-shrink: 0; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.st-cover-img { width: 100%; height: 100%; }
.st-cover-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.st-cover-mask-text { font-size: 12px; color: #fff; }
.st-card-info { flex: 1; padding: 12px; display: flex; flex-direction: column; min-width: 0; }
.st-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.st-card-titlerow { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.st-card-name { font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-card-typetag { flex-shrink: 0; padding: 1px 6px; font-size: 11px; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 4px; }
.st-addr { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
.st-addr-text { font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.st-tag { font-size: 10px; padding: 1px 6px; background: #f3f4f6; border-radius: 4px; color: #6b7280; }
.st-facilities { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.st-fac-more { font-size: 12px; color: #9ca3af; }
.st-card-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 8px; }
.st-course-cnt { font-size: 12px; color: var(--brand); }
.st-enter { display: flex; align-items: center; gap: 2px; }
.st-enter-text { font-size: 12px; color: var(--brand); }
.st-safe { height: 24px; }
</style>
