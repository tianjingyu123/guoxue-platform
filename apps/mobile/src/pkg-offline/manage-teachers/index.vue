<template>
  <view class="mt-page">
    <view class="mt-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mt-nav">
        <view class="mt-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="mt-nav-title">讲师预约</text>
        <view class="mt-icon-btn" />
      </view>
      <view class="mt-tabs">
        <view class="mt-tab" :class="{ on: tab === 'mine' }" @tap="tab = 'mine'"><text class="mt-tab-text" :class="{ on: tab === 'mine' }">本站讲师</text></view>
        <view class="mt-tab" :class="{ on: tab === 'pool' }" @tap="tab = 'pool'"><text class="mt-tab-text" :class="{ on: tab === 'pool' }">签约讲师库</text></view>
      </view>
    </view>

    <scroll-view scroll-y class="mt-body">
      <view v-if="loading" class="mt-state"><view class="spinner" /><text class="mt-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="mt-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" /><text class="mt-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <!-- 本站讲师 -->
      <template v-else-if="tab === 'mine'">
        <view v-if="teachers.length === 0" class="mt-state">
          <app-icon name="users" :size="48" color="#d1d5db" /><text class="mt-state-text">本站暂无讲师</text>
          <view class="retry-btn" @tap="tab = 'pool'"><text class="retry-text">从签约库引入</text></view>
        </view>
        <view v-else class="mt-list">
          <view v-for="t in teachers" :key="t.id" class="mt-card">
            <image lazy-load v-if="t.avatar" :src="t.avatar" class="mt-avatar-img" mode="aspectFill" />
            <view v-else class="mt-avatar"><app-icon name="user" :size="24" color="#9ca3af" /></view>
            <view class="mt-info">
              <view class="mt-name-row">
                <text class="mt-name">{{ t.name }}</text>
                <text v-if="t.sourceUserId" class="mt-signed">研究院签约</text>
              </view>
              <text class="mt-spec">{{ t.specialties.length ? t.specialties.join(' · ') : '国学讲师' }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 签约讲师库 -->
      <template v-else>
        <view class="mt-pool-tip">
          <app-icon name="info" :size="14" color="#9a2e25" />
          <text class="mt-pool-tip-text">从研究院签约讲师库引入讲师到本驿站，为课程安排授课。</text>
        </view>
        <view v-if="lecturers.length === 0" class="mt-state"><app-icon name="award" :size="48" color="#d1d5db" /><text class="mt-state-text">暂无签约讲师</text></view>
        <view v-else class="mt-list">
          <view v-for="l in lecturers" :key="l.id" class="mt-card">
            <image lazy-load v-if="l.user.avatar" :src="l.user.avatar" class="mt-avatar-img" mode="aspectFill" />
            <view v-else class="mt-avatar"><app-icon name="user" :size="24" color="#9ca3af" /></view>
            <view class="mt-info">
              <view class="mt-name-row">
                <text class="mt-name">{{ l.user.nickname || '签约讲师' }}</text>
                <text class="mt-signed">签约讲师</text>
              </view>
              <text class="mt-spec">已入驻 {{ l.enrolledStations.length }} 家驿站</text>
            </view>
            <view v-if="isEnrolled(l)" class="mt-enrolled"><text class="mt-enrolled-text">已引入</text></view>
            <view v-else class="mt-import-btn" :class="{ disabled: importingId === l.userId }" @tap="onImport(l)">
              <text class="mt-import-text">{{ importingId === l.userId ? '引入中' : '引入' }}</text>
            </view>
          </view>
        </view>
      </template>
      <view class="mt-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { offlineManageApi, type StationTeacherLite, type SignedLecturer } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const tab = ref<'mine' | 'pool'>('mine')
const teachers = ref<StationTeacherLite[]>([])
const lecturers = ref<SignedLecturer[]>([])
const importingId = ref('')

function isEnrolled(l: SignedLecturer) {
  return l.enrolledStations.some((s) => s.stationId === stationId.value)
}

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    const [ts, ls] = await Promise.all([
      offlineManageApi.getStationTeachers(stationId.value),
      offlineManageApi.getSignedLecturers().catch(() => []),
    ])
    teachers.value = ts
    lecturers.value = ls
  } catch (e: any) {
    errMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad((q) => { stationId.value = q && q.stationId ? String(q.stationId) : ''; load() })

async function onImport(l: SignedLecturer) {
  if (importingId.value) return
  importingId.value = l.userId
  try {
    await offlineManageApi.createTeacherFromSigned(stationId.value, l.userId)
    uni.showToast({ title: '已引入', icon: 'success' })
    await load()
    tab.value = 'mine'
  } catch (e: any) {
    uni.showToast({ title: e?.message || '引入失败', icon: 'none' })
  } finally {
    importingId.value = ''
  }
}
</script>

<style scoped>
.mt-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.mt-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.mt-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.mt-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.mt-nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.mt-tabs { display: flex; padding: 0 16px 8px; gap: 8px; }
.mt-tab { padding: 6px 16px; border-radius: 999px; background: #f3f0ea; }
.mt-tab.on { background: #9a2e25; }
.mt-tab-text { font-size: 13px; color: #6b7280; }
.mt-tab-text.on { color: #fff; }
.mt-body { flex: 1; }
.mt-state { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mt-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }
.mt-pool-tip { display: flex; align-items: flex-start; gap: 8px; margin: 16px 16px 0; padding: 12px; background: rgba(154,46,37,0.05); border-radius: 10px; }
.mt-pool-tip-text { flex: 1; font-size: 12px; color: #9a2e25; line-height: 1.6; }
.mt-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.mt-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 14px; }
.mt-avatar { width: 48px; height: 48px; border-radius: 999px; background: #f3ede2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mt-avatar-img { width: 48px; height: 48px; border-radius: 999px; flex-shrink: 0; }
.mt-info { flex: 1; min-width: 0; }
.mt-name-row { display: flex; align-items: center; gap: 6px; }
.mt-name { font-size: 15px; font-weight: 600; color: #2a1f1a; }
.mt-signed { font-size: 10px; padding: 1px 6px; color: var(--brand); background: rgba(196,30,58,0.1); border-radius: 4px; }
.mt-spec { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
.mt-import-btn { padding: 7px 18px; background: #9a2e25; border-radius: 8px; flex-shrink: 0; }
.mt-import-btn.disabled { opacity: 0.6; }
.mt-import-text { font-size: 13px; color: #fff; }
.mt-enrolled { padding: 7px 14px; background: #f3f4f6; border-radius: 8px; flex-shrink: 0; }
.mt-enrolled-text { font-size: 13px; color: #9ca3af; }
.mt-safe { height: 24px; }
</style>
