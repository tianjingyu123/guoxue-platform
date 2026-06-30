<template>
  <view class="tb-page">
    <!-- 顶部导航 -->
    <view class="tb-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tb-nav">
        <view class="tb-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="tb-nav-title">驿站师资</text>
        <view class="tb-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="tb-body">
      <!-- 三态 -->
      <view v-if="loading" class="tb-state">
        <view class="spinner" />
        <text class="tb-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="tb-state">
        <app-icon name="alert-circle" :size="44" color="#d1d5db" />
        <text class="tb-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="teachers.length === 0" class="tb-state">
        <app-icon name="users" :size="48" color="#d1d5db" />
        <text class="tb-state-text">该驿站暂无驻场讲师</text>
      </view>

      <view v-else class="tb-list">
        <view class="tb-tip">
          <app-icon name="info" :size="15" color="#c41e3a" />
          <text class="tb-tip-text">驿站讲师面向学员开展线下课程教学，可在下方查看讲师课程并报名。</text>
        </view>

        <view v-for="t in teachers" :key="t.id" class="tb-card" :class="{ highlight: t.id === highlightId }">
          <view class="tb-card-head">
            <image lazy-load v-if="t.avatar" :src="t.avatar" class="tb-avatar-img" mode="aspectFill" />
            <view v-else class="tb-avatar"><app-icon name="user" :size="26" color="#9ca3af" /></view>
            <view class="tb-card-info">
              <view class="tb-name-row">
                <text class="tb-name">{{ t.name }}</text>
                <text v-if="t.sourceUserId" class="tb-signed">研究院签约</text>
              </view>
              <text class="tb-spec">{{ t.specialties.length ? t.specialties.join(' · ') : '国学讲师' }}</text>
            </view>
          </view>
          <text v-if="t.bio" class="tb-bio">{{ t.bio }}</text>
          <view class="tb-card-foot">
            <view class="tb-foot-btn ghost" @tap="goCourses"><text class="tb-foot-btn-text">查看课程</text></view>
            <view class="tb-foot-btn primary" @tap="onConsult"><text class="tb-foot-btn-text primary">咨询预约</text></view>
          </view>
        </view>
      </view>
      <view class="tb-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { offlineApi, type StationTeacherLite } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const highlightId = ref('')
const teachers = ref<StationTeacherLite[]>([])

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '请从驿站详情进入'; return }
  loading.value = true
  errMsg.value = ''
  try {
    teachers.value = await offlineApi.getStationTeachers(stationId.value)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  stationId.value = q && q.stationId ? String(q.stationId) : ''
  highlightId.value = q && q.teacherId ? String(q.teacherId) : ''
  load()
})

function goCourses() {
  navigateTo(`/offline/courses?stationId=${stationId.value}`)
}
function onConsult() {
  uni.showToast({ title: '1对1咨询预约即将开放', icon: 'none' })
}
</script>

<style scoped>
.tb-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.tb-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.tb-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.tb-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.tb-nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.tb-body { flex: 1; }
.tb-state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.tb-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.tb-list { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.tb-tip { display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: rgba(196,30,58,0.05); border-radius: 10px; }
.tb-tip-text { flex: 1; font-size: 12px; color: #9a2e25; line-height: 1.6; }
.tb-card { background: #fff; border-radius: 12px; padding: 16px; }
.tb-card.highlight { border: 1px solid var(--brand); }
.tb-card-head { display: flex; align-items: center; gap: 12px; }
.tb-avatar { width: 56px; height: 56px; border-radius: 999px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tb-avatar-img { width: 56px; height: 56px; border-radius: 999px; flex-shrink: 0; }
.tb-card-info { flex: 1; min-width: 0; }
.tb-name-row { display: flex; align-items: center; gap: 6px; }
.tb-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.tb-signed { font-size: 10px; padding: 1px 6px; color: var(--brand); background: rgba(196,30,58,0.1); border-radius: 4px; }
.tb-spec { display: block; font-size: 13px; color: #9ca3af; margin-top: 4px; }
.tb-bio { display: block; font-size: 13px; color: #6b7280; line-height: 1.6; margin-top: 12px; }
.tb-card-foot { display: flex; gap: 12px; margin-top: 16px; }
.tb-foot-btn { flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.tb-foot-btn.ghost { border: 1px solid #e5e7eb; }
.tb-foot-btn.primary { background: var(--brand); }
.tb-foot-btn-text { font-size: 14px; color: #1a1a1a; }
.tb-foot-btn-text.primary { color: #fff; }
.tb-safe { height: 24px; }
</style>
