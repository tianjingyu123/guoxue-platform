<template>
  <view class="ev-page">
    <!-- 顶部导航 -->
    <view class="ev-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ev-nav">
        <view class="ev-icon-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="ev-nav-title">线下活动</text>
      </view>
    </view>

    <scroll-view scroll-y class="ev-body">
      <!-- 搜索 -->
      <view class="ev-search-wrap">
        <view class="ev-search">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="search" class="ev-search-input" placeholder="搜索活动名称或标签" placeholder-class="ev-ph" />
        </view>
      </view>

      <!-- 城市筛选 -->
      <scroll-view scroll-x class="ev-chip-row">
        <view class="ev-chip-inner">
          <view
            v-for="c in cities"
            :key="c"
            class="ev-chip"
            :class="{ 'ev-chip-on': city === c }"
            @tap="city = c"
          >
            <text class="ev-chip-text" :class="{ 'ev-chip-text-on': city === c }">{{ c }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 状态筛选 -->
      <scroll-view scroll-x class="ev-chip-row">
        <view class="ev-chip-inner">
          <view
            v-for="s in statusFilters"
            :key="s.key"
            class="ev-chip-o"
            :class="{ 'ev-chip-o-on': statusFilter === s.key }"
            @tap="statusFilter = s.key"
          >
            <text class="ev-chip-o-text" :class="{ 'ev-chip-o-text-on': statusFilter === s.key }">{{ s.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 活动列表 -->
      <view class="ev-list">
        <view v-for="event in filtered" :key="event.id" class="ev-card">
          <view class="ev-cover">
            <app-icon name="calendar" :size="40" color="#d8b48a" />
            <text class="ev-cover-status" :style="{ color: statusCfg[event.status].color, background: statusCfg[event.status].bg }">{{ statusCfg[event.status].label }}</text>
            <text class="ev-cover-price">{{ event.price }}</text>
          </view>

          <view class="ev-info">
            <text class="ev-title">{{ event.title }}</text>

            <view class="ev-meta">
              <view class="ev-meta-row">
                <app-icon name="map-pin" :size="14" color="#c41e3a" />
                <text class="ev-meta-text">{{ event.location }}</text>
              </view>
              <view class="ev-meta-row">
                <app-icon name="calendar" :size="14" color="#c41e3a" />
                <text class="ev-meta-text">{{ event.date }}</text>
                <app-icon name="clock" :size="14" color="#c41e3a" />
                <text class="ev-meta-text">{{ event.time }}</text>
              </view>
            </view>

            <!-- 报名进度 -->
            <view class="ev-progress-head">
              <view class="ev-progress-label">
                <app-icon name="users" :size="12" color="#6b7280" />
                <text class="ev-progress-text">{{ event.registered }}/{{ event.capacity }} 人已报名</text>
              </view>
              <text v-if="event.registered >= event.capacity" class="ev-soldout">已满员</text>
            </view>
            <view class="ev-progress-bar">
              <view
                class="ev-progress-fill"
                :class="{ 'ev-progress-full': event.registered >= event.capacity }"
                :style="{ width: pct(event) + '%' }"
              />
            </view>

            <view class="ev-tags">
              <text v-for="tag in event.tags" :key="tag" class="ev-tag">{{ tag }}</text>
            </view>

            <view class="ev-foot">
              <text class="ev-organizer">主办：{{ event.organizer }}</text>
              <view
                class="ev-btn"
                :class="{ 'ev-btn-disabled': event.status === 'ended' || event.registered >= event.capacity }"
                @tap="onRegister(event)"
              >
                <text class="ev-btn-text">{{ btnLabel(event) }}</text>
                <app-icon v-if="event.status !== 'ended' && event.registered < event.capacity" name="chevron-right" :size="12" color="#fff" />
              </view>
            </view>
          </view>
        </view>

        <view v-if="filtered.length === 0" class="ev-empty">
          <text class="ev-empty-text">暂无相关活动</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

type EventStatus = 'upcoming' | 'ongoing' | 'ended'
interface OfflineEvent {
  id: string
  title: string
  location: string
  city: string
  date: string
  time: string
  price: string
  capacity: number
  registered: number
  status: EventStatus
  organizer: string
  tags: string[]
}

const events: OfflineEvent[] = [
  { id: '1', title: '2024 甲辰年命理研讨大会', location: '北京国际会议中心 A 厅', city: '北京', date: '2024-03-20', time: '09:00 - 17:00', price: '¥380', capacity: 200, registered: 176, status: 'upcoming', organizer: '热卜国学文化', tags: ['命理', '八字', '年度大会'] },
  { id: '2', title: '紫微斗数专题研修班', location: '上海静安区文化中心', city: '上海', date: '2024-03-25', time: '10:00 - 16:00', price: '¥680', capacity: 50, registered: 48, status: 'upcoming', organizer: '张玄风工作室', tags: ['紫微斗数', '小班授课'] },
  { id: '3', title: '风水堪舆实地考察活动', location: '广州白云山风景区', city: '广州', date: '2024-04-06', time: '08:00 - 18:00', price: '¥260', capacity: 30, registered: 18, status: 'upcoming', organizer: '王德华堪舆学堂', tags: ['风水', '实地考察', '户外'] },
  { id: '4', title: '易经六十四卦公益讲座', location: '成都市图书馆报告厅', city: '成都', date: '2024-03-15', time: '14:00 - 16:30', price: '免费', capacity: 120, registered: 120, status: 'ongoing', organizer: '热卜国学公益', tags: ['易经', '公益', '免费'] },
  { id: '5', title: '国学文化新春交流会', location: '杭州西湖文化广场', city: '杭州', date: '2024-02-18', time: '13:00 - 17:00', price: '¥128', capacity: 80, registered: 80, status: 'ended', organizer: '热卜国学文化', tags: ['交流', '国学', '新春'] },
]

const statusCfg: Record<EventStatus, { label: string; color: string; bg: string }> = {
  upcoming: { label: '即将开始', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  ongoing: { label: '进行中', color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
  ended: { label: '已结束', color: '#6b7280', bg: '#f3f4f6' },
}
const cities = ['全部', '北京', '上海', '广州', '成都', '杭州']
const statusFilters: { key: EventStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'upcoming', label: '即将开始' },
  { key: 'ongoing', label: '进行中' },
  { key: 'ended', label: '已结束' },
]

const search = ref('')
const city = ref('全部')
const statusFilter = ref<EventStatus | 'all'>('all')

const filtered = computed(() =>
  events.filter((e) => {
    const matchSearch = !search.value || e.title.includes(search.value) || e.tags.some((t) => t.includes(search.value))
    const matchCity = city.value === '全部' || e.city === city.value
    const matchStatus = statusFilter.value === 'all' || e.status === statusFilter.value
    return matchSearch && matchCity && matchStatus
  })
)

function pct(e: OfflineEvent) {
  return Math.round((e.registered / e.capacity) * 100)
}
function btnLabel(e: OfflineEvent) {
  if (e.status === 'ended') return '已结束'
  if (e.registered >= e.capacity) return '已满员'
  return '立即报名'
}
function onRegister(e: OfflineEvent) {
  if (e.status === 'ended' || e.registered >= e.capacity) return
  uni.showToast({ title: '报名成功', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.ev-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}
.ev-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.ev-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 16px;
}
.ev-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ev-nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.ev-body {
  flex: 1;
  height: 0;
}
.ev-search-wrap {
  padding: 16px 16px 8px;
}
.ev-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.ev-search-input {
  flex: 1;
  font-size: 14px;
  color: #1a1a1a;
}
.ev-ph {
  color: #9ca3af;
}
.ev-chip-row {
  white-space: nowrap;
  padding: 8px 0;
}
.ev-chip-inner {
  display: inline-flex;
  gap: 8px;
  padding: 0 16px;
}
.ev-chip {
  padding: 6px 12px;
  border-radius: 999px;
  background: #f3f4f6;
}
.ev-chip-on {
  background: #c41e3a;
}
.ev-chip-text {
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
}
.ev-chip-text-on {
  color: #fff;
}
.ev-chip-o {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
}
.ev-chip-o-on {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}
.ev-chip-o-text {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
}
.ev-chip-o-text-on {
  color: #c41e3a;
}
.ev-list {
  padding: 8px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ev-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
}
.ev-cover {
  position: relative;
  height: 144px;
  background: linear-gradient(135deg, #f5ede0, #ece0cd);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ev-cover-status {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 999px;
}
.ev-cover-price {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 999px;
}
.ev-info {
  padding: 16px;
}
.ev-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  display: block;
}
.ev-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.ev-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ev-meta-text {
  font-size: 12px;
  color: #6b7280;
}
.ev-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.ev-progress-label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ev-progress-text {
  font-size: 12px;
  color: #6b7280;
}
.ev-soldout {
  font-size: 10px;
  font-weight: 600;
  color: #dc2626;
}
.ev-progress-bar {
  height: 6px;
  background: #f3f4f6;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 12px;
}
.ev-progress-fill {
  height: 100%;
  background: #c41e3a;
  border-radius: 999px;
}
.ev-progress-full {
  background: #dc2626;
}
.ev-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}
.ev-tag {
  font-size: 10px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 999px;
}
.ev-foot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ev-organizer {
  flex: 1;
  font-size: 12px;
  color: #6b7280;
}
.ev-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  background: #c41e3a;
  border-radius: 8px;
}
.ev-btn-disabled {
  background: #d1d5db;
}
.ev-btn-text {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
}
.ev-empty {
  padding: 64px 0;
  text-align: center;
}
.ev-empty-text {
  font-size: 14px;
  color: #9ca3af;
}
</style>
