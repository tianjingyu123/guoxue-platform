<template>
  <view class="page">
    <!-- 顶部导航 + 搜索 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">讲师广场</text>
        <view class="nav-placeholder" />
      </view>
      <view class="search-wrap">
        <view class="search-box">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="keyword" class="search-input" placeholder="搜索讲师、擅长领域" placeholder-class="search-ph" confirm-type="search" @confirm="applyFilter" />
          <view class="search-btn" @tap="applyFilter"><text class="search-btn-text">搜索</text></view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 级别筛选 -->
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-row">
          <view
            v-for="f in levelFilters"
            :key="f.id"
            class="level-btn"
            :class="{ 'level-btn-active': activeLevel === f.id }"
            @tap="activeLevel = f.id"
          >
            <text class="level-btn-text" :class="{ 'level-btn-text-active': activeLevel === f.id }">{{ f.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 列表 -->
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
        <view v-else-if="filteredList.length === 0" class="empty">
          <app-icon name="users" :size="48" color="#d1d5db" />
          <text class="empty-text">未找到符合条件的讲师</text>
        </view>
        <view v-for="ins in filteredList" :key="ins.id" class="ins-card" @tap="goDetail(ins.id)">
          <view class="ins-row">
            <view class="ins-avatar-wrap">
              <image lazy-load v-if="ins.user.avatar" :src="ins.user.avatar" class="ins-avatar-img" mode="aspectFill" />
              <view v-else class="ins-avatar"><app-icon name="user" :size="26" color="#9ca3af" /></view>
              <view v-if="ins.lecturerLevel === 'SIGNED'" class="ins-badge">
                <app-icon name="badge-check" :size="16" color="#c41e3a" />
              </view>
            </view>
            <view class="ins-info">
              <view class="ins-name-row">
                <text class="ins-name">{{ memberName(ins.user) }}</text>
                <text class="ins-level" :style="{ color: lecturerLevelColor[ins.lecturerLevel].color, background: lecturerLevelColor[ins.lecturerLevel].bg }">{{ lecturerLevelLabel[ins.lecturerLevel] }}</text>
              </view>
              <text class="ins-title">研究院签约讲师体系成员</text>
            </view>
            <app-icon name="chevron-right" :size="16" color="#d1d5db" />
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, lecturerLevelLabel, lecturerLevelColor, memberName, type LecturerLevel, type TalentTeacher } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const levelFilters: { id: LecturerLevel | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'SIGNED', label: '签约讲师' },
  { id: 'SENIOR', label: '高级讲师' },
  { id: 'JUNIOR', label: '初级讲师' },
  { id: 'PREPARATORY', label: '储备讲师' },
]

const loading = ref(true)
const errMsg = ref('')
const all = ref<TalentTeacher[]>([])
const keyword = ref('')
const searchTerm = ref('')
const activeLevel = ref<LecturerLevel | 'all'>('all')

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    all.value = await instituteApi.getTalentPool()
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  if (q && q.keyword) {
    keyword.value = decodeURIComponent(q.keyword)
    searchTerm.value = keyword.value
  }
  load()
})

function applyFilter() {
  searchTerm.value = keyword.value.trim()
}

const filteredList = computed(() => {
  return all.value.filter((t) => {
    if (activeLevel.value !== 'all' && t.lecturerLevel !== activeLevel.value) return false
    if (searchTerm.value && !memberName(t.user).toLowerCase().includes(searchTerm.value.toLowerCase())) return false
    return true
  })
})

function goDetail(id: string) {
  navigateTo('/institute/instructors/' + id)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.search-wrap { padding: 0 16px 12px; }
.search-box { position: relative; display: flex; align-items: center; height: 38px; background: rgba(196,30,58,0.04); border-radius: 10px; padding: 0 8px 0 12px; gap: 8px; }
.search-input { flex: 1; font-size: 14px; color: #1a1a1a; height: 38px; }
.search-ph { color: #9ca3af; }
.search-btn { background: var(--brand); border-radius: 8px; padding: 6px 14px; }
.search-btn-text { font-size: 13px; color: #fff; }

.scroll { height: 100vh; box-sizing: border-box; }
.filter-scroll { white-space: nowrap; padding: 12px 16px 0; }
.filter-row { display: inline-flex; gap: 8px; }
.level-btn { border: 1px solid #d1d5db; border-radius: 999px; padding: 5px 14px; background: #fff; }
.level-btn-active { background: var(--brand); border-color: var(--brand); }
.level-btn-text { font-size: 12px; color: #4b5563; }
.level-btn-text-active { color: #fff; }
.spec-btn { border-radius: 999px; padding: 4px 12px; background: #f0f0f0; }
.spec-btn-active { background: rgba(196,30,58,0.1); }
.spec-btn-text { font-size: 12px; color: #9ca3af; }
.spec-btn-text-active { color: var(--brand); font-weight: 500; }

.list { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
.empty { padding: 64px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-text { font-size: 13px; color: #9ca3af; }
.ins-card { background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 16px; }
.ins-row { display: flex; gap: 12px; }
.ins-avatar-wrap { position: relative; flex-shrink: 0; }
.ins-avatar { width: 56px; height: 56px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.ins-badge { position: absolute; bottom: -2px; right: -2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ins-info { flex: 1; min-width: 0; }
.ins-name-row { display: flex; align-items: center; gap: 8px; }
.ins-name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.ins-level { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.ins-title { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ins-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.ins-tag { font-size: 10px; padding: 2px 6px; background: #f3f4f6; border-radius: 4px; color: #6b7280; }
.ins-stats { display: flex; gap: 16px; margin-top: 8px; }
.ins-stat { display: flex; align-items: center; gap: 4px; }
.ins-stat-text { font-size: 11px; color: #9ca3af; }
.bottom-safe { height: 24px; }
.ins-row { align-items: center; }
.ins-avatar-img { width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; }
.state-box { padding: 64px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
</style>
