<template>
  <view class="inst-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">研究院</text>
        <view class="header-spacer" />
      </view>
    </view>

    <!-- 骨架屏 -->
    <template v-if="loading">
      <view class="sk-area">
        <view class="sk-banner" />
        <view class="sk-search" />
        <view class="sk-stats" />
        <view class="sk-card" />
        <view class="sk-grid">
          <view v-for="i in 4" :key="i" class="sk-card-sm" />
        </view>
      </view>
    </template>

    <template v-else>
      <!-- Banner -->
      <view class="banner">
        <text class="banner-name">{{ instituteInfo.name }}</text>
        <text class="banner-slogan">{{ instituteInfo.slogan }}</text>
      </view>

      <!-- 搜索 -->
      <view class="search-bar">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchKeyword" class="search-input" placeholder="搜索讲师、课程..." @confirm="handleSearch" />
        </view>
        <view class="search-btn" @click="handleSearch">搜索</view>
      </view>

      <!-- 统计数据 -->
      <view class="stats-row">
        <view class="stat">
          <text class="stat-num">{{ instituteInfo.stats.instructorCount }}</text>
          <text class="stat-label">讲师</text>
        </view>
        <view class="stat">
          <text class="stat-num">{{ (instituteInfo.stats.studentCount / 10000).toFixed(1) }}万</text>
          <text class="stat-label">学员</text>
        </view>
        <view class="stat">
          <text class="stat-num">{{ instituteInfo.stats.courseCount }}</text>
          <text class="stat-label">课程</text>
        </view>
        <view class="stat">
          <text class="stat-num">{{ instituteInfo.stats.eventCount }}</text>
          <text class="stat-label">活动</text>
        </view>
      </view>

      <!-- 简介 -->
      <view class="about-card">
        <text class="about-title">关于我们</text>
        <text class="about-desc">{{ instituteInfo.description }}</text>
        <view class="about-mission">
          <text>使命：{{ instituteInfo.mission }}</text>
        </view>
      </view>

      <!-- 金牌讲师 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">👨‍🏫 金牌讲师</text>
          <text class="section-more" @click="goPage('/pages/institute/instructors')">查看全部 ›</text>
        </view>
        <view class="inst-grid">
          <view v-for="inst in instructors.slice(0, 4)" :key="inst.id" class="inst-card">
            <view class="inst-top">
              <view class="inst-avatar-wrap">
                <view class="inst-avatar">{{ inst.name[0] }}</view>
                <text v-if="inst.verified" class="inst-badge">✅</text>
              </view>
              <view class="inst-meta">
                <text class="inst-name">{{ inst.name }}</text>
                <text class="inst-title">{{ inst.title }}</text>
              </view>
            </view>
            <view class="inst-tags">
              <text v-for="s in inst.specialties.slice(0, 2)" :key="s" class="inst-tag">{{ s }}</text>
            </view>
            <view class="inst-stats">
              <text>👥 {{ inst.studentCount }}</text>
              <text>⭐ {{ inst.rating }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 近期活动 -->
      <view v-if="events.length > 0" class="section">
        <view class="section-head">
          <text class="section-title">📅 近期活动</text>
          <text class="section-more" @click="goPage('/pages/institute/events')">更多活动 ›</text>
        </view>
        <view class="event-list">
          <view v-for="ev in events" :key="ev.id" class="event-card">
            <view class="ev-img">
              <text class="ev-img-placeholder">📸</text>
              <text class="ev-status">{{ ev.status === 'enrolling' ? '报名中' : ev.status }}</text>
            </view>
            <view class="ev-info">
              <view class="ev-top-row">
                <text class="ev-title">{{ ev.title }}</text>
                <text class="ev-type">讲座</text>
              </view>
              <text class="ev-time">🕐 {{ ev.startTime.split(' ')[0] }}</text>
              <text class="ev-loc">📍 {{ ev.isOnline ? '线上直播' : ev.location }}</text>
              <view class="ev-bottom">
                <text class="ev-price" :class="{ free: ev.price === 0 }">{{ ev.price === 0 ? '免费' : '¥' + ev.price }}</text>
                <text class="ev-signups">{{ ev.currentParticipants }}人已报名</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 成为讲师 -->
      <view class="section">
        <view class="apply-card" @click="goPage('/pages/institute/apply')">
          <view class="apply-deco" />
          <text class="apply-title">成为讲师</text>
          <text class="apply-desc">加入热卜研究院，分享你的专业知识</text>
          <view class="apply-btn">立即申请 →</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Instructor {
  id: string; name: string; avatar: string; title: string; verified: boolean
  specialties: string[]; studentCount: number; rating: number
}

interface InstituteEvent {
  id: string; title: string; cover: string; status: string; startTime: string
  isOnline: boolean; location: string; price: number; currentParticipants: number
  type: string
}

const loading = ref(true)
const searchKeyword = ref('')

const instituteInfo = ref({
  name: '热卜国学研究院', slogan: '传承中华智慧，探索易学精髓',
  description: '热卜国学研究院成立于2020年，汇集了全国各地资深的国学研究者与传承人。我们致力于通过系统化的教学体系和前沿的技术手段，让更多人了解和受益于中华优秀传统文化。',
  mission: '传播国学智慧，让传统在现代生活中焕发新生',
  stats: { instructorCount: 48, studentCount: 128000, courseCount: 256, eventCount: 32 },
})

const instructors = ref<Instructor[]>([
  { id: '1', name: '李明华', avatar: '', title: '八字命理名师', verified: true, specialties: ['八字', '紫微斗数'], studentCount: 3580, rating: 4.9 },
  { id: '2', name: '张天师', avatar: '', title: '风水实战专家', verified: true, specialties: ['风水', '择日'], studentCount: 2680, rating: 4.8 },
  { id: '3', name: '陈易卦', avatar: '', title: '六爻预测名师', verified: true, specialties: ['六爻', '奇门'], studentCount: 1890, rating: 4.7 },
  { id: '4', name: '王道玄', avatar: '', title: '道德经研究专家', verified: false, specialties: ['道家', '易经'], studentCount: 1200, rating: 4.6 },
])

const events = ref<InstituteEvent[]>([
  { id: '1', title: '八字命理入门公开课', cover: '', status: 'enrolling', startTime: '2026-06-15 14:00', isOnline: true, location: '', price: 0, currentParticipants: 328, type: '讲座' },
  { id: '2', title: '风水布局实战工作坊', cover: '', status: 'enrolling', startTime: '2026-06-20 09:00', isOnline: false, location: '北京朝阳区', price: 299, currentParticipants: 56, type: '工作坊' },
  { id: '3', title: '易经智慧与企业管理', cover: '', status: 'enrolling', startTime: '2026-06-25 15:00', isOnline: true, location: '', price: 0, currentParticipants: 215, type: '讲座' },
])

onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

function handleSearch() {
  if (searchKeyword.value.trim()) {
    uni.navigateTo({ url: `/pages/institute/instructors?keyword=${encodeURIComponent(searchKeyword.value)}` })
  }
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.inst-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 60rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-spacer { width: 64rpx; }

.sk-area { padding: 16rpx 24rpx; }
.sk-banner { height: 240rpx; background: #E8E4DC; border-radius: 16rpx; margin-bottom: 16rpx; }
.sk-search { height: 80rpx; background: #E8E4DC; border-radius: 16rpx; margin-bottom: 16rpx; }
.sk-stats { height: 100rpx; background: #E8E4DC; border-radius: 16rpx; margin-bottom: 16rpx; }
.sk-card { height: 160rpx; background: #E8E4DC; border-radius: 16rpx; margin-bottom: 16rpx; }
.sk-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.sk-card-sm { height: 200rpx; background: #E8E4DC; border-radius: 14rpx; }

.banner { height: 280rpx; margin: 16rpx 24rpx; background: linear-gradient(180deg, rgba(196,30,58,0.15), rgba(201,169,110,0.08)); border-radius: 20rpx; display: flex; flex-direction: column; justify-content: flex-end; padding: 32rpx; }
.banner-name { font-size: 40rpx; font-weight: 700; color: #2C2C2C; display: block; }
.banner-slogan { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }

.search-bar { display: flex; align-items: center; gap: 12rpx; padding: 0 24rpx; margin-bottom: 16rpx; }
.search-box { flex: 1; display: flex; align-items: center; background: #fff; border-radius: 48rpx; padding: 0 24rpx; height: 76rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.search-icon { font-size: 26rpx; margin-right: 10rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.search-btn { padding: 16rpx 28rpx; border-radius: 48rpx; background: #C41E3A; color: #fff; font-size: 26rpx; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; margin: 0 24rpx 16rpx; padding: 24rpx; background: rgba(201,169,110,0.06); border-radius: 20rpx; text-align: center; }
.stat-num { font-size: 36rpx; font-weight: 700; color: #C41E3A; display: block; }
.stat-label { font-size: 20rpx; color: #999; margin-top: 6rpx; display: block; }

.about-card { margin: 0 24rpx 20rpx; padding: 24rpx; background: #fff; border-radius: 16rpx; border: 1px solid #F0EDE5; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.about-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 10rpx; }
.about-desc { font-size: 24rpx; color: #666; line-height: 1.6; }
.about-mission { margin-top: 16rpx; padding: 16rpx 20rpx; background: rgba(196,30,58,0.03); border-left: 4rpx solid #C41E3A; border-radius: 4rpx; font-size: 24rpx; color: #C41E3A; font-weight: 500; }

.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #C9A96E; }

.inst-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.inst-card { background: #fff; border-radius: 16rpx; padding: 18rpx; border: 1px solid #F0EDE5; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.inst-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 10rpx; }
.inst-avatar-wrap { position: relative; }
.inst-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(201,169,110,0.15)); display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; color: #C9A96E; }
.inst-badge { position: absolute; bottom: -4rpx; right: -4rpx; font-size: 20rpx; }
.inst-meta { flex: 1; min-width: 0; }
.inst-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inst-title { font-size: 20rpx; color: #999; margin-top: 2rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.inst-tags { display: flex; gap: 6rpx; margin-bottom: 10rpx; }
.inst-tag { font-size: 18rpx; color: #999; background: #F5F1EB; padding: 2rpx 10rpx; border-radius: 6rpx; }
.inst-stats { display: flex; justify-content: space-between; font-size: 20rpx; color: #999; }

.event-list { }
.event-card { display: flex; gap: 14rpx; background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.ev-img { width: 180rpx; height: 160rpx; background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(201,169,110,0.08)); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.ev-img-placeholder { font-size: 48rpx; opacity: 0.3; }
.ev-status { position: absolute; top: 8rpx; left: 8rpx; font-size: 18rpx; color: #fff; background: #52C41A; padding: 2rpx 10rpx; border-radius: 6rpx; }
.ev-info { flex: 1; padding: 14rpx 14rpx 14rpx 0; min-width: 0; }
.ev-top-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8rpx; }
.ev-title { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.ev-type { font-size: 20rpx; color: #999; flex-shrink: 0; }
.ev-time, .ev-loc { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.ev-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 10rpx; }
.ev-price { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.ev-price.free { color: #52C41A; }
.ev-signups { font-size: 20rpx; color: #BBB; }

.apply-card { position: relative; overflow: hidden; background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 20rpx; padding: 32rpx; }
.apply-deco { position: absolute; right: -40rpx; bottom: -40rpx; width: 200rpx; height: 200rpx; border-radius: 50%; background: rgba(255,255,255,0.08); }
.apply-title { font-size: 34rpx; font-weight: 700; color: #fff; display: block; position: relative; }
.apply-desc { font-size: 24rpx; color: rgba(255,255,255,0.8); margin: 8rpx 0 20rpx; display: block; position: relative; }
.apply-btn { display: inline-block; padding: 12rpx 28rpx; border-radius: 48rpx; background: #fff; color: #C41E3A; font-size: 26rpx; font-weight: 500; position: relative; }
</style>
