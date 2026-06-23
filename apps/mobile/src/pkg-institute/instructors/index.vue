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

      <!-- 领域筛选 -->
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-row">
          <view
            v-for="s in specialtyFilters"
            :key="s"
            class="spec-btn"
            :class="{ 'spec-btn-active': activeSpecialty === s }"
            @tap="activeSpecialty = s"
          >
            <text class="spec-btn-text" :class="{ 'spec-btn-text-active': activeSpecialty === s }">{{ s }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 列表 -->
      <view class="list">
        <view v-if="loading" class="empty">
          <text class="empty-text">加载中...</text>
        </view>
        <view v-else-if="error" class="empty">
          <text class="empty-text">加载失败</text>
          <view class="retry-btn" @tap="loading = false; error = false"><text class="retry-btn-text">重试</text></view>
        </view>
        <view v-else-if="filteredList.length === 0" class="empty">
          <app-icon name="users" :size="48" color="#d1d5db" />
          <text class="empty-text">未找到符合条件的讲师</text>
        </view>
        <view v-for="ins in filteredList" :key="ins.id" class="ins-card" @tap="goDetail(ins.id)">
          <view class="ins-row">
            <view class="ins-avatar-wrap">
              <view class="ins-avatar"><app-icon name="user" :size="26" color="#9ca3af" /></view>
              <view v-if="ins.verified" class="ins-badge">
                <app-icon name="badge-check" :size="16" color="#c41e3a" />
              </view>
            </view>
            <view class="ins-info">
              <view class="ins-name-row">
                <text class="ins-name">{{ ins.name }}</text>
                <text class="ins-level" :style="{ color: instructorLevelColor[ins.level].color, background: instructorLevelColor[ins.level].bg }">{{ instructorLevelLabel[ins.level] }}</text>
              </view>
              <text class="ins-title">{{ ins.title }}</text>
              <view class="ins-tags">
                <text v-for="s in ins.specialties.slice(0, 3)" :key="s" class="ins-tag">{{ s }}</text>
              </view>
              <view class="ins-stats">
                <view class="ins-stat">
                  <app-icon name="users" :size="12" color="#9ca3af" />
                  <text class="ins-stat-text">{{ ins.studentCount }}学员</text>
                </view>
                <view class="ins-stat">
                  <app-icon name="book-open" :size="12" color="#9ca3af" />
                  <text class="ins-stat-text">{{ ins.courseCount }}课程</text>
                </view>
                <view class="ins-stat">
                  <app-icon name="star" :size="12" color="#f59e0b" />
                  <text class="ins-stat-text">{{ ins.rating }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>

  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onMounted } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, instructors as allInstructors, instructorLevelLabel, instructorLevelColor, type Instructor, type InstructorLevel } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const levelFilters: { id: InstructorLevel | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'master', label: '大师' },
  { id: 'expert', label: '专家' },
  { id: 'senior', label: '高级' },
  { id: 'junior', label: '讲师' },
]
const specialtyFilters = ['全部', '八字命理', '紫微斗数', '风水堪舆', '易经占卜', '六爻预测', '奇门遁甲']

const keyword = ref('')
const searchTerm = ref('')
const activeLevel = ref<InstructorLevel | 'all'>('all')
const activeSpecialty = ref('全部')
const loading = ref(false)
const error = ref(false)

onLoad((q) => {
  if (q && q.keyword) {
    keyword.value = decodeURIComponent(q.keyword)
    searchTerm.value = keyword.value
  }
})

onMounted(() => {
  loading.value = true
  // 数据来自模块导入（同步），无需异步API
  loading.value = false
})

function applyFilter() {
  searchTerm.value = keyword.value.trim()
}

const filteredList = computed(() => {
  return allInstructors.filter((i) => {
    if (activeLevel.value !== 'all' && i.level !== activeLevel.value) return false
    if (activeSpecialty.value !== '全部' && !i.specialties.includes(activeSpecialty.value)) return false
    if (searchTerm.value) {
      const kw = searchTerm.value.toLowerCase()
      const hit = i.name.toLowerCase().includes(kw) || i.title.toLowerCase().includes(kw) || i.specialties.some((s) => s.toLowerCase().includes(kw))
      if (!hit) return false
    }
    return true
  })
})

function goDetail(id: number) {
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
.search-btn { background: #c41e3a; border-radius: 8px; padding: 6px 14px; }
.search-btn-text { font-size: 13px; color: #fff; }

.scroll { height: 100vh; box-sizing: border-box; }
.filter-scroll { white-space: nowrap; padding: 12px 16px 0; }
.filter-row { display: inline-flex; gap: 8px; }
.level-btn { border: 1px solid #d1d5db; border-radius: 999px; padding: 5px 14px; background: #fff; }
.level-btn-active { background: #c41e3a; border-color: #c41e3a; }
.level-btn-text { font-size: 12px; color: #4b5563; }
.level-btn-text-active { color: #fff; }
.spec-btn { border-radius: 999px; padding: 4px 12px; background: #f0f0f0; }
.spec-btn-active { background: rgba(196,30,58,0.1); }
.spec-btn-text { font-size: 12px; color: #9ca3af; }
.spec-btn-text-active { color: #c41e3a; font-weight: 500; }

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
</style>
