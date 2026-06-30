<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left">
          <view class="nav-back" @tap="goBack">
            <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="nav-title">研究院成员</text>
        </view>
        <view class="nav-count"><text class="nav-count-text">{{ stats.total }}人</text></view>
      </view>
      <view class="search-wrap">
        <view class="search-box">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input class="search-input" v-model="keyword" placeholder="搜索成员姓名或擅长领域" placeholder-class="search-ph" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 统计 -->
      <view class="stats">
        <view class="stat-card" style="background:rgba(212,160,23,0.1)">
          <text class="stat-num" style="color:#d4a017">{{ stats.total }}</text>
          <text class="stat-label">总成员</text>
        </view>
        <view class="stat-card" style="background:rgba(196,30,58,0.1)">
          <text class="stat-num" style="color:#c41e3a">{{ stats.leadership }}</text>
          <text class="stat-label">管理层</text>
        </view>
        <view class="stat-card" style="background:rgba(22,163,74,0.1)">
          <text class="stat-num" style="color:#16a34a">{{ stats.teachers }}</text>
          <text class="stat-label">入选人才库</text>
        </view>
      </view>

      <!-- 筛选 -->
      <view class="filter-row">
        <view
          v-for="opt in filterOptions"
          :key="opt.id"
          class="filter-chip"
          :class="{ 'filter-chip-active': activeFilter === opt.id }"
          @tap="activeFilter = opt.id"
        >
          <text class="filter-text" :class="{ 'filter-text-active': activeFilter === opt.id }">{{ opt.label }}</text>
        </view>
      </view>

      <!-- 成员列表 -->
      <view class="list">
        <view v-if="loading" class="state-box">
          <view class="spinner" />
          <text class="state-text">加载中…</text>
        </view>
        <view v-else-if="errMsg" class="state-box">
          <app-icon name="alert-circle" :size="40" color="#d1d5db" />
          <text class="state-text">{{ errMsg }}</text>
          <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
        </view>
        <view v-else-if="filteredMembers.length === 0" class="state-box">
          <app-icon name="users" :size="44" color="#d1d5db" />
          <text class="state-text">暂无成员</text>
        </view>
        <view
          v-else
          v-for="m in filteredMembers"
          :key="m.id"
          class="member-card"
          @tap="goDetail(m.id)"
        >
          <view class="avatar-wrap">
            <image lazy-load v-if="m.user.avatar" :src="m.user.avatar" class="avatar-img" mode="aspectFill" />
            <view v-else class="avatar">
              <text class="avatar-text">{{ memberName(m.user).slice(0, 1) }}</text>
            </view>
            <view v-if="isManagement(m.role)" class="role-badge" :style="{ background: roleColor[m.role].bg }">
              <app-icon :name="roleIcon(m.role)" :size="12" :color="roleColor[m.role].color" />
            </view>
          </view>

          <view class="member-info">
            <view class="name-row">
              <text class="m-name">{{ memberName(m.user) }}</text>
              <view class="role-tag" :style="{ background: roleColor[m.role].bg }">
                <text class="role-tag-text" :style="{ color: roleColor[m.role].color }">{{ roleLabel[m.role] }}</text>
              </view>
              <view v-if="m.lecturerLevel !== 'NONE'" class="teacher-tag">
                <text class="teacher-tag-text">{{ lecturerLevelLabel[m.lecturerLevel] }}</text>
              </view>
            </view>
            <view class="meta-row">
              <view class="meta-item">
                <app-icon name="calendar" :size="11" color="#9ca3af" />
                <text class="meta-text">{{ m.joinYear }}年加入</text>
              </view>
              <view class="meta-item">
                <app-icon name="check-circle" :size="11" color="#9ca3af" />
                <text class="meta-text">完成任务 {{ m.tasksCompleted }} 项</text>
              </view>
            </view>
          </view>

          <app-icon name="chevron-right" :size="16" color="#9ca3af" />
        </view>
      </view>
      <view class="bottom-pad" />
    </scroll-view>

    <!-- 申请入口 -->
    <view class="footer">
      <view class="footer-btn" @tap="goApply">
        <text class="footer-btn-text">申请加入研究院</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi, roleLabel, roleColor, isManagement, memberName,
  lecturerLevelLabel, type InstituteRole, type InstituteMember,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44 - 52 - 64
} catch (e) {}

const filterOptions = [
  { id: 'all', label: '全部' },
  { id: 'leadership', label: '管理层' },
  { id: 'teacher', label: '讲师库' },
]
const ROLE_ORDER: Record<InstituteRole, number> = {
  PRESIDENT: 1, VICE_PRESIDENT: 2, SECRETARY_GENERAL: 3, INITIATOR: 4, TYPE_A: 5, TYPE_B: 6,
}

const loading = ref(true)
const errMsg = ref('')
const members = ref<InstituteMember[]>([])
const keyword = ref('')
const activeFilter = ref('all')

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    members.value = await instituteApi.getMembers({ status: 'ACTIVE' })
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

const stats = computed(() => ({
  total: members.value.length,
  leadership: members.value.filter(m => isManagement(m.role)).length,
  teachers: members.value.filter(m => m.lecturerLevel !== 'NONE').length,
}))

const filteredMembers = computed(() => members.value
  .filter(m => {
    if (activeFilter.value === 'leadership') return isManagement(m.role)
    if (activeFilter.value === 'teacher') return m.lecturerLevel !== 'NONE'
    return true
  })
  .filter(m => !keyword.value || memberName(m.user).includes(keyword.value))
  .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
)

function roleIcon(role: InstituteRole) {
  if (role === 'PRESIDENT') return 'crown'
  if (role === 'VICE_PRESIDENT') return 'award'
  if (role === 'SECRETARY_GENERAL') return 'star'
  return 'user'
}
function goDetail(id: string) {
  navigateTo(`/institute/members/${id}`)
}
function goApply() {
  navigateTo('/institute/member-apply')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,0.95); border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-left { display: flex; align-items: center; gap: 8px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-count { padding: 2px 10px; background: #f3f4f6; border-radius: 999px; }
.nav-count-text { font-size: 12px; color: #4b5563; }
.search-wrap { padding: 0 16px 10px; }
.search-box { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; background: #f3f4f6; border-radius: 8px; }
.search-input { flex: 1; font-size: 13px; color: #1a1a1a; }
.search-ph { color: #9ca3af; }

.scroll { width: 100%; }
.stats { display: flex; gap: 8px; padding: 12px 16px; }
.stat-card { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 0; border-radius: 12px; }
.stat-num { font-size: 18px; font-weight: 700; }
.stat-label { font-size: 10px; color: #9ca3af; }

.filter-row { display: flex; gap: 8px; padding: 0 16px 8px; }
.filter-chip { padding: 5px 16px; border-radius: 999px; border: 1px solid #d1d5db; background: #fff; }
.filter-chip-active { background: var(--brand); border-color: var(--brand); }
.filter-text { font-size: 12px; color: #4b5563; }
.filter-text-active { color: #fff; }

.list { padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 12px; }
.member-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; border: 1px solid #ededed; padding: 12px; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 56px; height: 56px; border-radius: 50%; background: rgba(212,160,23,0.15); display: flex; align-items: center; justify-content: center; }
.avatar-img { width: 56px; height: 56px; border-radius: 50%; }
.state-box { padding: 64px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.avatar-text { font-size: 20px; font-weight: 700; color: #d4a017; }
.role-badge { position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
.member-info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.m-name { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.role-tag { padding: 1px 7px; border-radius: 4px; }
.role-tag-text { font-size: 10px; }
.teacher-tag { padding: 1px 7px; border-radius: 4px; background: rgba(22,163,74,0.1); }
.teacher-tag-text { font-size: 10px; color: #16a34a; }
.m-title { display: block; font-size: 12px; color: #6b7280; margin-top: 3px; }
.meta-row { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
.meta-item { display: flex; align-items: center; gap: 4px; }
.meta-text { font-size: 10px; color: #9ca3af; }

.bottom-pad { height: 16px; }
.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.footer-btn { display: flex; align-items: center; justify-content: center; height: 44px; background: linear-gradient(90deg, #d4a017, #b8860b); border-radius: 8px; }
.footer-btn-text { font-size: 14px; color: #fff; font-weight: 500; }
</style>
