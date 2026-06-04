<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-header-inner">
        <text
          class="nav-back"
          @click="goBack"
        >
          ←
        </text>
        <text class="nav-title">
          研究院
        </text>
      </view>
    </view>

    <!-- Banner -->
    <view
      v-if="instituteInfo"
      class="banner-wrap"
    >
      <image
        :src="instituteInfo.bannerUrl"
        mode="aspectFill"
        class="banner-img"
      />
      <view class="banner-overlay" />
      <view class="banner-content">
        <text class="banner-title">
          {{ instituteInfo.name }}
        </text>
        <text class="banner-slogan">
          {{ instituteInfo.slogan }}
        </text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">
          🔍
        </text>
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索讲师、课程..."
          @confirm="handleSearch"
        >
        <view
          class="search-btn"
          @click="handleSearch"
        >
          <text class="search-btn-text">
            搜索
          </text>
        </view>
      </view>
    </view>

    <!-- 统计数据 -->
    <view
      v-if="instituteInfo"
      class="section-padding"
    >
      <view class="stats-grid">
        <view
          v-for="stat in statsList"
          :key="stat.label"
          class="stat-item"
        >
          <text class="stat-num">
            {{ stat.value }}
          </text>
          <text class="stat-label">
            {{ stat.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 关于我们 -->
    <view
      v-if="instituteInfo"
      class="section-padding"
    >
      <view class="card">
        <text class="section-title">
          关于我们
        </text>
        <text class="about-desc">
          {{ instituteInfo.description }}
        </text>
        <view class="mission-box">
          <text class="mission-text">
            使命：{{ instituteInfo.mission }}
          </text>
        </view>
      </view>
    </view>

    <!-- 金牌讲师 -->
    <view class="section-padding">
      <view class="section-header">
        <view class="section-header-left">
          <text class="section-icon">
            👥
          </text>
          <text class="section-title">
            金牌讲师
          </text>
        </view>
        <view
          class="section-more"
          @click="goInstructors"
        >
          <text>查看全部 </text>
          <text>›</text>
        </view>
      </view>
      <view class="instructor-grid">
        <view
          v-for="inst in instructors.slice(0, 4)"
          :key="inst.id"
          class="instructor-card"
          @click="goInstructorDetail(inst.id)"
        >
          <view class="instructor-avatar-wrap">
            <image
              :src="inst.avatar"
              mode="aspectFill"
              class="instructor-avatar"
            />
            <text
              v-if="inst.verified"
              class="verified-badge"
            >
              ✓
            </text>
          </view>
          <view class="instructor-meta">
            <text class="instructor-name">
              {{ inst.name }}
            </text>
            <text class="instructor-title">
              {{ inst.title }}
            </text>
          </view>
          <view class="tag-group">
            <text
              v-for="s in inst.specialties.slice(0, 2)"
              :key="s"
              class="tag"
            >
              {{ s }}
            </text>
          </view>
          <view class="instructor-footer">
            <text class="meta-text">
              👥 {{ inst.studentCount }}
            </text>
            <text class="meta-text">
              ⭐ {{ inst.rating }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 近期活动 -->
    <view
      v-if="events.length > 0"
      class="section-padding"
    >
      <view class="section-header">
        <view class="section-header-left">
          <text class="section-icon">
            📅
          </text>
          <text class="section-title">
            近期活动
          </text>
        </view>
        <view
          class="section-more"
          @click="goEvents"
        >
          <text>更多活动 </text>
          <text>›</text>
        </view>
      </view>
      <view class="events-list">
        <view
          v-for="evt in events"
          :key="evt.id"
          class="event-card"
          @click="goEventDetail(evt.id)"
        >
          <view class="event-cover-wrap">
            <image
              :src="evt.cover"
              mode="aspectFill"
              class="event-cover"
            />
            <text
              class="event-status"
              :style="{ backgroundColor: getEventStatusColor(evt.status) }"
            >
              {{ getEventStatusLabel(evt.status) }}
            </text>
          </view>
          <view class="event-info">
            <view class="event-title-row">
              <text class="event-title ellipsis">
                {{ evt.title }}
              </text>
              <text class="event-type-label">
                {{ getEventTypeLabel(evt.type) }}
              </text>
            </view>
            <view class="event-row">
              <text>🕐 {{ evt.startTime.split(' ')[0] }}</text>
            </view>
            <view class="event-row">
              <text>📍 {{ evt.isOnline ? '线上直播' : evt.location }}</text>
            </view>
            <view class="event-footer">
              <text :class="evt.price === 0 ? 'text-free' : 'text-price'">
                {{ evt.price === 0 ? '免费' : '¥' + evt.price }}
              </text>
              <text class="text-muted-small">
                {{ evt.currentParticipants }}人已报名
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 成为讲师入口 -->
    <view
      class="cta-section"
      @click="goApply"
    >
      <view class="cta-content">
        <text class="cta-title">
          成为讲师
        </text>
        <text class="cta-desc">
          加入热卜研究院，分享你的专业知识
        </text>
        <view class="cta-btn">
          <text>立即申请 →</text>
        </view>
      </view>
      <view class="cta-deco-1" />
      <view class="cta-deco-2" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { instituteApi } from '../../api'

interface InstituteInfo {
  bannerUrl: string
  name: string
  slogan: string
  description: string
  mission: string
  stats: { instructorCount: number; studentCount: number; courseCount: number; eventCount: number }
}
interface Instructor {
  id: number; name: string; avatar: string; title: string
  specialties: string[]; studentCount: number; rating: number; verified: boolean
}
interface InstituteEvent {
  id: number; title: string; cover: string; status: string; type: string
  startTime: string; endTime: string; location: string; isOnline: boolean
  price: number; currentParticipants: number; maxEnrollment: number
}

const instituteInfo = ref<InstituteInfo | null>(null)
const instructors = ref<Instructor[]>([])
const events = ref<InstituteEvent[]>([])
const searchKeyword = ref('')

const statsList = computed(() => {
  if (!instituteInfo.value) return []
  const s = instituteInfo.value.stats
  return [
    { label: '讲师', value: s.instructorCount },
    { label: '学员', value: (s.studentCount / 10000).toFixed(1) + '万' },
    { label: '课程', value: s.courseCount },
    { label: '活动', value: s.eventCount },
  ]
})

onMounted(() => loadData())

async function loadData() {
  try {
    const [infoRes, insRes, evtRes] = await Promise.all([
      instituteApi.members({ pageSize: 1 }),
      instituteApi.members({ pageSize: 6 }),
      instituteApi.events({ status: 'enrolling', pageSize: 3 }),
    ])
    if (infoRes) instituteInfo.value = infoRes as any
    if (insRes?.list) instructors.value = insRes.list
    if (evtRes?.list) events.value = evtRes.list
  } catch (e) {
    console.error('load fail', e)
  }
}

function handleSearch() {
  if (searchKeyword.value.trim()) {
    uni.navigateTo({ url: `/pages/institute/instructors?keyword=${encodeURIComponent(searchKeyword.value)}` })
  }
}
function goBack() { uni.navigateBack() }
function goInstructors() { uni.navigateTo({ url: '/pages/institute/instructors' }) }
function goInstructorDetail(id: number) { uni.navigateTo({ url: `/pages/institute/member-detail?id=${id}` }) }
function goEvents() { uni.navigateTo({ url: '/pages/institute/events' }) }
function goEventDetail(id: number) { uni.navigateTo({ url: `/pages/institute/event-detail?id=${id}` }) }
function goApply() { uni.navigateTo({ url: '/pages/institute/apply' }) }

function getEventStatusLabel(s: string): string {
  return { enrolling: '报名中', ongoing: '进行中', ended: '已结束' }[s] || s
}
function getEventStatusColor(s: string): string {
  return { enrolling: '#C41E3A', ongoing: '#C9A96E', ended: '#999' }[s] || '#999'
}
function getEventTypeLabel(t: string): string {
  return { lecture: '学术讲座', seminar: '研讨会', workshop: '工作坊', conference: '学术会议', online: '线上活动' }[t] || t
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 10; background: rgba(245,240,232,0.95); border-bottom: 1rpx solid #E5E1DB; padding: 20rpx 24rpx; }
.nav-header-inner { display: flex; align-items: center; gap: 16rpx; }
.nav-back { font-size: 36rpx; color: #2C2C2C; padding: 4rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }

/* Banner */
.banner-wrap { position: relative; height: 360rpx; overflow: hidden; }
.banner-img { width: 100%; height: 100%; }
.banner-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%); }
.banner-content { position: absolute; bottom: 24rpx; left: 24rpx; right: 24rpx; color: #fff; }
.banner-title { font-size: 36rpx; font-weight: bold; margin-bottom: 8rpx; }
.banner-slogan { font-size: 26rpx; opacity: 0.9; }

/* 搜索栏 */
.search-bar { position: sticky; top: 88rpx; z-index: 10; background: #F5F0E8; border-bottom: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; }
.search-input-wrap { position: relative; display: flex; align-items: center; background: #fff; border-radius: 12rpx; border: 1rpx solid #E5E1DB; }
.search-icon { position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; color: #999; }
.search-input { flex: 1; height: 72rpx; padding-left: 60rpx; padding-right: 120rpx; font-size: 26rpx; color: #2C2C2C; background: transparent; }
.search-btn { position: absolute; right: 8rpx; top: 50%; transform: translateY(-50%); background: #C41E3A; padding: 8rpx 24rpx; border-radius: 8rpx; height: 56rpx; display: flex; align-items: center; }
.search-btn-text { color: #fff; font-size: 24rpx; }

/* 公共 */
.section-padding { padding: 0 24rpx 24rpx; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.section-header-left { display: flex; align-items: center; gap: 12rpx; }
.section-icon { font-size: 32rpx; color: #C41E3A; }
.section-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.section-more { display: flex; align-items: center; gap: 4rpx; font-size: 26rpx; color: #C41E3A; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 统计 */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; background: rgba(196,30,58,0.05); border-radius: 16rpx; padding: 24rpx; }
.stat-item { text-align: center; }
.stat-num { display: block; font-size: 36rpx; font-weight: bold; color: #C41E3A; }
.stat-label { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }

/* 卡片 */
.card { background: #fff; border-radius: 16rpx; border: 1rpx solid #E5E1DB; padding: 24rpx; }
.about-desc { display: block; font-size: 26rpx; color: #666; line-height: 1.6; }
.mission-box { margin-top: 20rpx; padding: 20rpx; background: rgba(196,30,58,0.05); border-radius: 12rpx; border-left: 4rpx solid #C41E3A; }
.mission-text { font-size: 26rpx; color: #C41E3A; font-weight: 500; }

/* 讲师 */
.instructor-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.instructor-card { background: #fff; border-radius: 16rpx; border: 1rpx solid #E5E1DB; padding: 20rpx; }
.instructor-avatar-wrap { position: relative; width: 88rpx; height: 88rpx; margin-bottom: 12rpx; }
.instructor-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; }
.verified-badge { position: absolute; bottom: -4rpx; right: -4rpx; width: 28rpx; height: 28rpx; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 18rpx; text-align: center; line-height: 28rpx; }
.instructor-meta { margin-bottom: 12rpx; }
.instructor-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.instructor-title { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.tag-group { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 12rpx; }
.tag { font-size: 22rpx; padding: 4rpx 12rpx; background: #F5F0E8; border-radius: 6rpx; color: #666; }
.instructor-footer { display: flex; align-items: center; justify-content: space-between; }
.meta-text { font-size: 22rpx; color: #999; }

/* 活动 */
.events-list { display: flex; flex-direction: column; gap: 16rpx; }
.event-card { background: #fff; border-radius: 16rpx; border: 1rpx solid #E5E1DB; overflow: hidden; display: flex; }
.event-cover-wrap { position: relative; width: 210rpx; height: 180rpx; flex-shrink: 0; }
.event-cover { width: 100%; height: 100%; }
.event-status { position: absolute; top: 8rpx; left: 8rpx; font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; color: #fff; }
.event-info { flex: 1; padding: 20rpx; min-width: 0; }
.event-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12rpx; }
.event-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; flex: 1; }
.event-type-label { font-size: 22rpx; color: #999; white-space: nowrap; }
.event-row { font-size: 22rpx; color: #999; margin-top: 8rpx; display: flex; align-items: center; }
.event-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; }
.text-price { color: #C41E3A; font-weight: 600; font-size: 26rpx; }
.text-free { color: #C41E3A; font-weight: 600; font-size: 26rpx; }
.text-muted-small { font-size: 22rpx; color: #999; }

/* CTA */
.cta-section { margin: 0 24rpx; position: relative; overflow: hidden; border-radius: 16rpx; background: linear-gradient(135deg, #C41E3A, #D4456A); padding: 32rpx; color: #fff; }
.cta-content { position: relative; z-index: 1; }
.cta-title { display: block; font-size: 34rpx; font-weight: bold; margin-bottom: 8rpx; }
.cta-desc { display: block; font-size: 26rpx; opacity: 0.9; margin-bottom: 20rpx; }
.cta-btn { display: inline-flex; align-items: center; padding: 12rpx 32rpx; background: #fff; border-radius: 8rpx; color: #C41E3A; font-size: 26rpx; font-weight: 500; }
.cta-deco-1 { position: absolute; right: -80rpx; bottom: -60rpx; width: 240rpx; height: 240rpx; border-radius: 50%; background: rgba(255,255,255,0.1); }
.cta-deco-2 { position: absolute; right: 60rpx; top: -60rpx; width: 140rpx; height: 140rpx; border-radius: 50%; background: rgba(255,255,255,0.1); }
</style>
