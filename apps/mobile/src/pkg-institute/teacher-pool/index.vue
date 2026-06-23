<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left">
          <view class="nav-back" @tap="goBack">
            <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="nav-title">线下老师人才库</text>
        </view>
        <text class="nav-count">{{ filteredTeachers.length }}位</text>
      </view>
      <view class="search-wrap">
        <view class="search-box">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input
            class="search-input"
            v-model="keyword"
            placeholder="搜索老师姓名或擅长领域"
            placeholder-class="search-ph"
          />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 领域筛选 -->
      <view class="filter-section">
        <scroll-view scroll-x class="chip-scroll">
          <view class="chip-row">
            <view
              v-for="sp in specialties"
              :key="sp"
              class="chip"
              :class="{ 'chip-active': activeSpecialty === sp }"
              @tap="activeSpecialty = sp"
            >
              <text class="chip-text" :class="{ 'chip-text-active': activeSpecialty === sp }">{{ sp }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      <!-- 城市筛选 -->
      <view class="filter-section">
        <scroll-view scroll-x class="chip-scroll">
          <view class="chip-row">
            <view
              v-for="city in cities"
              :key="city"
              class="chip chip-sm"
              :class="{ 'chip-active': activeCity === city }"
              @tap="activeCity = city"
            >
              <app-icon v-if="city !== '全部'" name="map-pin" :size="11" :color="activeCity === city ? '#fff' : '#9ca3af'" />
              <text class="chip-text" :class="{ 'chip-text-active': activeCity === city }">{{ city }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 老师列表 -->
      <view class="list">
        <view
          v-for="t in filteredTeachers"
          :key="t.id"
          class="teacher-card"
          @tap="goDetail(t.id)"
        >
          <view class="card-top">
            <view class="avatar" :style="{ background: levelConfig[t.level].bg, color: levelConfig[t.level].color }">
              <text class="avatar-text" :style="{ color: levelConfig[t.level].color }">{{ t.name.slice(0, 1) }}</text>
            </view>
            <view class="card-main">
              <view class="name-row">
                <text class="t-name">{{ t.name }}</text>
                <view class="level-badge" :style="{ background: levelConfig[t.level].bg }">
                  <text class="level-text" :style="{ color: levelConfig[t.level].color }">{{ levelConfig[t.level].label }}</text>
                </view>
                <view v-if="!t.available" class="busy-badge">
                  <text class="busy-text">档期已满</text>
                </view>
              </view>
              <view class="meta-row">
                <view class="meta-item">
                  <app-icon name="star" :size="12" color="#f59e0b" />
                  <text class="meta-text">{{ t.rating.toFixed(1) }}</text>
                </view>
                <view class="meta-item">
                  <app-icon name="users" :size="12" color="#9ca3af" />
                  <text class="meta-text">{{ t.studentsCount }}学员</text>
                </view>
                <view class="meta-item">
                  <app-icon name="map-pin" :size="12" color="#9ca3af" />
                  <text class="meta-text">{{ t.location }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="specialty-row">
            <view v-for="(s, i) in t.specialty" :key="i" class="sp-tag">
              <text class="sp-tag-text">{{ s }}</text>
            </view>
          </view>

          <text class="intro">{{ t.intro }}</text>

          <view class="tag-row">
            <view v-for="(tag, i) in t.tags" :key="i" class="feature-tag">
              <text class="feature-tag-text">{{ tag }}</text>
            </view>
          </view>

          <view class="card-bottom">
            <view class="price-box">
              <text class="price-label">授课费用</text>
              <text class="price-value">¥{{ t.price.min }}-{{ t.price.max }}</text>
            </view>
            <view class="invite-btn" :class="{ 'invite-disabled': !t.available }">
              <text class="invite-text">{{ t.available ? '邀请授课' : '查看档期' }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="bottom-pad" />
    </scroll-view>

    <!-- 底部驿站入口 -->
    <view class="footer">
      <view class="footer-btn" @tap="goDemand">
        <app-icon name="file-text" :size="16" color="#fff" />
        <text class="footer-btn-text">发布课程需求，让老师主动联系您</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineTeachers,
  offlineTeacherLevelConfig as levelConfig,
  offlineTeacherSpecialties as specialties,
  offlineTeacherCities as cities,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44 - 52 - 64
} catch (e) {}

const keyword = ref('')
const activeSpecialty = ref('全部')
const activeCity = ref('全部')

const filteredTeachers = computed(() => offlineTeachers.filter(t => {
  if (activeSpecialty.value !== '全部' && !t.specialty.includes(activeSpecialty.value)) return false
  if (activeCity.value !== '全部' && t.location !== activeCity.value) return false
  if (keyword.value) {
    const k = keyword.value
    if (!t.name.includes(k) && !t.specialty.some(s => s.includes(k))) return false
  }
  return true
}))

function goDetail(id: number) {
  navigateTo(`/institute/instructors/${id}`)
}
function goDemand() {
  navigateTo('/institute/teacher-demand')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,0.95); border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-left { display: flex; align-items: center; gap: 8px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-count { font-size: 12px; color: #9ca3af; }
.search-wrap { padding: 0 16px 10px; }
.search-box { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; background: #f3f4f6; border-radius: 8px; }
.search-input { flex: 1; font-size: 13px; color: #1a1a1a; }
.search-ph { color: #9ca3af; }

.scroll { width: 100%; }
.filter-section { padding: 8px 0 0; background: #fff; }
.chip-scroll { width: 100%; white-space: nowrap; }
.chip-row { display: flex; gap: 8px; padding: 0 16px 8px; }
.chip { flex-shrink: 0; display: flex; align-items: center; gap: 4px; padding: 5px 14px; border-radius: 999px; border: 1px solid #d1d5db; background: #fff; }
.chip-sm { padding: 4px 12px; }
.chip-active { background: #c41e3a; border-color: #c41e3a; }
.chip-text { font-size: 12px; color: #4b5563; }
.chip-text-active { color: #fff; }

.list { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
.teacher-card { background: #fff; border-radius: 12px; border: 1px solid #ededed; padding: 14px; }
.card-top { display: flex; gap: 12px; }
.avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-text { font-size: 20px; font-weight: 700; }
.card-main { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.t-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.level-badge { padding: 2px 8px; border-radius: 999px; }
.level-text { font-size: 10px; }
.busy-badge { padding: 2px 8px; border-radius: 999px; background: #f3f4f6; }
.busy-text { font-size: 10px; color: #9ca3af; }
.meta-row { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
.meta-item { display: flex; align-items: center; gap: 3px; }
.meta-text { font-size: 11px; color: #6b7280; }

.specialty-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.sp-tag { padding: 3px 10px; background: rgba(196,30,58,0.08); border-radius: 6px; }
.sp-tag-text { font-size: 11px; color: #c41e3a; }
.intro { display: block; font-size: 12px; color: #6b7280; line-height: 1.6; margin-top: 10px; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.feature-tag { padding: 2px 8px; background: #f3f4f6; border-radius: 4px; }
.feature-tag-text { font-size: 10px; color: #6b7280; }

.card-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid #ededed; }
.price-box { display: flex; flex-direction: column; gap: 2px; }
.price-label { font-size: 10px; color: #9ca3af; }
.price-value { font-size: 16px; font-weight: 600; color: #c41e3a; }
.invite-btn { padding: 8px 18px; background: #c41e3a; border-radius: 8px; }
.invite-disabled { background: #9ca3af; }
.invite-text { font-size: 13px; color: #fff; font-weight: 500; }

.bottom-pad { height: 16px; }
.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.footer-btn { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; background: #c41e3a; border-radius: 8px; }
.footer-btn-text { font-size: 14px; color: #fff; font-weight: 500; }
</style>
