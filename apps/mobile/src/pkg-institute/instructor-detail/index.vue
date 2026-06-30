<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">成员详情</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 加载/错误态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <view v-else-if="!detail" class="state-box">
        <app-icon name="user-x" :size="44" color="#d1d5db" />
        <text class="state-text">{{ errMsg || '成员不存在' }}</text>
        <view class="retry-btn" @tap="goMembers"><text class="retry-text">返回成员名录</text></view>
      </view>

      <template v-else>
        <!-- 头部信息 -->
        <view class="header">
          <view class="header-row">
            <view class="avatar-wrap">
              <image lazy-load v-if="detail.user.avatar" :src="detail.user.avatar" class="avatar-img" mode="aspectFill" />
              <view v-else class="avatar"><app-icon name="user" :size="34" color="#9ca3af" /></view>
              <view v-if="detail.lecturerLevel === 'SIGNED'" class="avatar-badge">
                <app-icon name="badge-check" :size="18" color="#c41e3a" />
              </view>
            </view>
            <view class="header-info">
              <view class="name-row">
                <text class="name">{{ memberName(detail.user) }}</text>
              </view>
              <view class="badge-row">
                <text class="role-badge" :style="{ color: roleColor[detail.role].color, background: roleColor[detail.role].bg }">{{ roleLabel[detail.role] }}</text>
                <text v-if="detail.lecturerLevel !== 'NONE'" class="level-badge" :style="{ color: lecturerLevelColor[detail.lecturerLevel].color, background: lecturerLevelColor[detail.lecturerLevel].bg }">{{ lecturerLevelLabel[detail.lecturerLevel] }}</text>
                <text class="status-badge" :style="{ color: memberStatusColor[detail.status].color, background: memberStatusColor[detail.status].bg }">{{ memberStatusLabel[detail.status] }}</text>
              </view>
            </view>
          </view>

          <!-- 真实统计 -->
          <view class="stats">
            <view class="stat-item">
              <text class="stat-num">{{ detail.joinYear }}</text>
              <text class="stat-label">加入年份</text>
            </view>
            <view class="stat-item">
              <text class="stat-num">{{ detail.tasksCompleted }}/{{ detail.tasksRequired }}</text>
              <text class="stat-label">任务进度</text>
            </view>
            <view class="stat-item">
              <text class="stat-num">{{ verifiedCount }}</text>
              <text class="stat-label">已验证</text>
            </view>
          </view>
        </view>

        <view class="content">
          <!-- 成员档案 -->
          <view class="sec">
            <text class="sec-title">成员档案</text>
            <view class="info-line">
              <text class="info-k">研究院角色</text>
              <text class="info-v">{{ roleLabel[detail.role] }}{{ isManagement(detail.role) ? '（管理层）' : '' }}</text>
            </view>
            <view class="info-line">
              <text class="info-k">讲师等级</text>
              <text class="info-v">{{ lecturerLevelLabel[detail.lecturerLevel] }}</text>
            </view>
            <view class="info-line">
              <text class="info-k">会籍状态</text>
              <text class="info-v">{{ memberStatusLabel[detail.status] }}</text>
            </view>
            <view class="info-line">
              <text class="info-k">入会年份</text>
              <text class="info-v">{{ detail.joinYear }} 年</text>
            </view>
            <view v-if="detail.expireAt" class="info-line">
              <text class="info-k">会籍到期</text>
              <text class="info-v">{{ fmtDate(detail.expireAt) }}</text>
            </view>
          </view>

          <!-- 师资供给：签约讲师已入驻驿站 -->
          <view v-if="detail.lecturerLevel === 'SIGNED'" class="sec">
            <text class="sec-title">驿站授课</text>
            <view v-if="!detail.enrolledStations || detail.enrolledStations.length === 0" class="task-empty">
              <text class="task-empty-text">尚未入驻驿站讲师库</text>
            </view>
            <view v-else class="station-list">
              <view v-for="s in detail.enrolledStations" :key="s.stationId" class="station-chip">
                <app-icon name="map-pin" :size="13" color="#c41e3a" />
                <text class="station-name">{{ s.name }}</text>
              </view>
            </view>
          </view>

          <!-- 分享任务记录 -->
          <view class="sec">
            <text class="sec-title">分享任务</text>
            <view v-if="!detail.tasks || detail.tasks.length === 0" class="task-empty">
              <text class="task-empty-text">暂无分享任务记录</text>
            </view>
            <view v-else class="task-list">
              <view v-for="t in detail.tasks" :key="t.id" class="task-card">
                <view class="task-top">
                  <text class="task-title">{{ t.title }}</text>
                  <text class="task-status" :style="{ color: taskStatusColor[t.status].color, background: taskStatusColor[t.status].bg }">{{ taskStatusLabel[t.status] }}</text>
                </view>
                <view class="task-meta">
                  <text class="task-type">{{ taskTypeLabel[t.taskType] }}</text>
                  <text v-if="t.completedAt" class="task-date">完成于 {{ fmtDate(t.completedAt) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-safe" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi, roleLabel, roleColor, lecturerLevelLabel, lecturerLevelColor,
  memberStatusLabel, memberStatusColor, isManagement, memberName,
  taskTypeLabel, taskStatusLabel, taskStatusColor, fmtDate, type MemberDetail,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const loading = ref(true)
const errMsg = ref('')
const detail = ref<MemberDetail | null>(null)

const verifiedCount = computed(() => detail.value?.tasks?.filter((t) => t.status === 'VERIFIED').length || 0)

async function load(id?: string) {
  if (!id) { loading.value = false; errMsg.value = '缺少成员参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    detail.value = await instituteApi.getMember(id)
  } catch (e: any) {
    errMsg.value = e?.message || '加载失败'
    detail.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => load(q && q.id ? String(q.id) : undefined))

function goMembers() {
  navigateTo('/institute/members')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; }

.state-box { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.header { background: #fff; padding: 16px; }
.header-row { display: flex; gap: 16px; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.avatar-img { width: 72px; height: 72px; border-radius: 50%; }
.avatar-badge { position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.header-info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 8px; }
.name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.role-badge, .level-badge, .status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.stats { display: flex; margin-top: 16px; padding: 12px 0; background: #fafafa; border-radius: 12px; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { font-size: 18px; font-weight: 700; color: var(--brand); }
.stat-label { font-size: 10px; color: #9ca3af; }

.content { padding: 16px; }
.sec { margin-bottom: 16px; background: #fff; border-radius: 12px; padding: 16px; }
.sec-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.info-line { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.info-k { font-size: 13px; color: #9ca3af; }
.info-v { font-size: 13px; color: #1a1a1a; font-weight: 500; }
.task-empty { padding: 24px 0; display: flex; justify-content: center; }
.task-empty-text { font-size: 13px; color: #9ca3af; }
.station-list { display: flex; flex-wrap: wrap; gap: 8px; }
.station-chip { display: flex; align-items: center; gap: 4px; padding: 6px 12px; background: rgba(196,30,58,0.06); border-radius: 8px; }
.station-name { font-size: 13px; color: #1a1a1a; }
.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-card { padding: 12px; background: #fafafa; border-radius: 10px; }
.task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.task-title { flex: 1; font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.task-status { font-size: 10px; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.task-meta { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.task-type { font-size: 12px; color: #6b7280; }
.task-date { font-size: 12px; color: #9ca3af; }
.bottom-safe { height: 24px; }
</style>
