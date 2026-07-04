<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">研究院</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else-if="info">
      <!-- Banner -->
      <view class="banner">
        <view class="banner-mask" />
        <view class="banner-content">
          <text class="banner-title">{{ info.name }}</text>
          <text class="banner-slogan">{{ SLOGAN }}</text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="search-wrap">
        <view class="search-box">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="keyword" class="search-input" placeholder="搜索讲师、课程..." placeholder-class="search-ph" confirm-type="search" @confirm="handleSearch" />
          <view class="search-btn" @tap="handleSearch"><text class="search-btn-text">搜索</text></view>
        </view>
      </view>

      <!-- 统计数据 -->
      <view class="stats">
        <view class="stat-item">
          <text class="stat-num">{{ info.counts.members }}</text>
          <text class="stat-label">研究院成员</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ teachers.length }}</text>
          <text class="stat-label">讲师</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ info.counts.events }}</text>
          <text class="stat-label">活动</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ info.counts.courses }}</text>
          <text class="stat-label">课程</text>
        </view>
      </view>

      <!-- 关于我们 -->
      <view class="section">
        <view class="card about-card">
          <text class="about-title">关于我们</text>
          <text class="about-desc">{{ info.intro || '文化研究院 —— 平台精英师资的筛选与培养体系。' }}</text>
          <view v-if="info.legalEntity" class="mission">
            <text class="mission-text">运营主体：{{ info.legalEntity }}</text>
          </view>
        </view>
      </view>

      <!-- 金牌讲师 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title-wrap">
            <app-icon name="users" :size="18" color="#c41e3a" />
            <text class="section-title">金牌讲师</text>
          </view>
          <view class="section-more" @tap="goInstructors">
            <text class="more-text">查看全部</text>
            <app-icon name="chevron-right" :size="14" color="#c41e3a" />
          </view>
        </view>

        <view v-if="teachers.length" class="teacher-grid">
          <view v-for="t in teachers.slice(0, 4)" :key="t.id" class="teacher-card" @tap="goInstructor(t.id)">
            <view class="teacher-head">
              <view class="avatar-wrap">
                <image lazy-load v-if="t.user.avatar" :src="t.user.avatar" class="avatar-img" mode="aspectFill" />
                <view v-else class="avatar"><app-icon name="user" :size="22" color="#9ca3af" /></view>
                <view v-if="t.lecturerLevel === 'SIGNED'" class="avatar-badge">
                  <app-icon name="badge-check" :size="14" color="#c41e3a" />
                </view>
              </view>
              <view class="teacher-info">
                <text class="teacher-name">{{ memberName(t.user) }}</text>
                <text class="teacher-level" :style="{ color: lecturerLevelColor[t.lecturerLevel].color, background: lecturerLevelColor[t.lecturerLevel].bg }">{{ lecturerLevelLabel[t.lecturerLevel] }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="mini-empty"><text class="mini-empty-text">暂无讲师入库</text></view>
      </view>

      <!-- 讲师影响力榜单入口（T9-P0a·四维透明计分） -->
      <view class="section">
        <view class="rankings-entry" @tap="goRankings">
          <view class="rankings-medal">
            <app-icon name="trophy" :size="22" color="#7a5f33" />
          </view>
          <view class="rankings-info">
            <text class="rankings-title">讲师影响力榜单</text>
            <text class="rankings-sub">任务 · 授课 · 驿站 · 资历 四维透明计分</text>
          </view>
          <app-icon name="chevron-right" :size="16" color="#c9a96e" />
        </view>
      </view>

      <!-- 大师讲座入口（研-P1·分享回放沉淀·研究院出品课程频道） -->
      <view class="section">
        <view class="lectures-entry" @tap="goLectures">
          <view class="lectures-icon">
            <app-icon name="landmark" :size="22" color="#fff" />
          </view>
          <view class="lecture-info">
            <text class="lecture-title">大师讲座</text>
            <text class="lecture-sub">分享回放沉淀 · 研究院出品精品讲座频道</text>
          </view>
          <app-icon name="chevron-right" :size="16" color="#9ca3af" />
        </view>
      </view>

      <!-- 大师讲堂入口（T9-P0b·付费知识库） -->
      <view class="section">
        <view class="lecture-entry" @tap="goContents">
          <view class="lecture-icon">
            <app-icon name="book-open" :size="22" color="#c41e3a" />
          </view>
          <view class="lecture-info">
            <text class="lecture-title">大师讲堂</text>
            <text class="lecture-sub">研究院讲师沉淀的文章 · 视频 · 文档知识库</text>
          </view>
          <app-icon name="chevron-right" :size="16" color="#9ca3af" />
        </view>
      </view>

      <!-- 私董会入口（T9-P1·闭门共研小组） -->
      <view class="section">
        <view class="board-entry" @tap="goBoardGroups">
          <view class="board-icon">
            <app-icon name="users" :size="22" color="#e8dcc3" />
          </view>
          <view class="board-info">
            <text class="board-title">私董会</text>
            <text class="board-sub">6-12 人闭门小组 · 轮流出题 · 众人拆解经营课题</text>
          </view>
          <app-icon name="chevron-right" :size="16" color="#8b8fa3" />
        </view>
      </view>

      <!-- 近期活动 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title-wrap">
            <app-icon name="calendar" :size="18" color="#c41e3a" />
            <text class="section-title">近期活动</text>
          </view>
          <view class="section-more" @tap="goEvents">
            <text class="more-text">更多活动</text>
            <app-icon name="chevron-right" :size="14" color="#c41e3a" />
          </view>
        </view>

        <view v-if="upcomingEvents.length" class="event-list">
          <view v-for="e in upcomingEvents" :key="e.id" class="event-card" @tap="goEvent(e.id)">
            <view class="event-cover">
              <app-icon name="calendar" :size="28" color="#d1d5db" />
              <view class="event-status" :style="{ background: eventStatusColor[e.status].bg }">
                <text class="event-status-text" :style="{ color: eventStatusColor[e.status].color }">{{ eventStatusLabel[e.status] }}</text>
              </view>
            </view>
            <view class="event-body">
              <view class="event-top">
                <text class="event-title">{{ e.title }}</text>
                <text class="event-type">{{ eventTypeLabel[e.type] }}</text>
              </view>
              <view class="event-meta">
                <app-icon name="clock" :size="12" color="#9ca3af" />
                <text class="event-meta-text">{{ fmtDate(e.scheduleAt) }}</text>
              </view>
              <view class="event-meta">
                <app-icon name="map-pin" :size="12" color="#9ca3af" />
                <text class="event-meta-text">{{ e.location || '地点待定' }}</text>
              </view>
              <view class="event-foot">
                <text class="event-enrolled">限 {{ e.maxAttendees }} 人</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="mini-empty"><text class="mini-empty-text">近期暂无活动</text></view>
      </view>

      <!-- 我的会籍入口 -->
      <view class="section">
        <view class="my-entry" @tap="goMy">
          <view class="my-entry-left">
            <app-icon name="id-card" :size="20" color="#c41e3a" />
            <view>
              <text class="my-entry-title">我的会籍</text>
              <text class="my-entry-sub">会籍状态 · 分享任务 · 会费退还</text>
            </view>
          </view>
          <app-icon name="chevron-right" :size="16" color="#9ca3af" />
        </view>
      </view>

      <!-- 成为讲师入口 -->
      <view class="section">
        <view class="apply-banner" @tap="goApply">
          <view class="apply-content">
            <text class="apply-title">成为讲师</text>
            <text class="apply-desc">加入热卜研究院，分享你的专业知识</text>
            <view class="apply-btn">
              <text class="apply-btn-text">立即申请</text>
              <app-icon name="arrow-right" :size="14" color="#c41e3a" />
            </view>
          </view>
          <view class="apply-circle apply-circle-1" />
          <view class="apply-circle apply-circle-2" />
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
  instituteApi, lecturerLevelLabel, lecturerLevelColor,
  eventStatusLabel, eventStatusColor, eventTypeLabel, fmtDate, memberName,
  type InstituteIntro, type TalentTeacher, type InstituteEvent,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const SLOGAN = '传承国学智慧 · 点亮人生方向'

const loading = ref(true)
const errMsg = ref('')
const info = ref<InstituteIntro | null>(null)
const teachers = ref<TalentTeacher[]>([])
const events = ref<InstituteEvent[]>([])
const keyword = ref('')

const upcomingEvents = computed(() =>
  events.value.filter((e) => e.status === 'SCHEDULED' || e.status === 'ONGOING').slice(0, 3),
)

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const [intro, talent, evs] = await Promise.all([
      instituteApi.getIntro(),
      instituteApi.getTalentPool(),
      instituteApi.getEvents({ upcoming: true }),
    ])
    info.value = intro
    teachers.value = talent
    events.value = evs
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

function handleSearch() {
  if (keyword.value.trim()) {
    navigateTo('/institute/instructors?keyword=' + encodeURIComponent(keyword.value))
  }
}
function goInstructors() { navigateTo('/institute/instructors') }
function goInstructor(id: string) { navigateTo('/institute/instructors/' + id) }
function goEvents() { navigateTo('/institute/events') }
function goEvent(id: string) { navigateTo('/institute/events/' + id) }
function goApply() { navigateTo('/institute/member-apply') }
function goMy() { navigateTo('/institute/my-tasks') }
function goRankings() { navigateTo('/pkg-institute/rankings/index') }
function goContents() { navigateTo('/pkg-institute/contents/index') }
function goLectures() { navigateTo('/pkg-institute/lectures/index') }
function goBoardGroups() { navigateTo('/pkg-institute/board-groups/index') }
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; }

.banner { position: relative; height: 192px; background: linear-gradient(135deg, rgba(196,30,58,0.2) 0%, rgba(240,240,240,0.2) 100%); overflow: hidden; }
.banner-mask { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.06), transparent); }
.banner-content { position: absolute; left: 16px; right: 16px; bottom: 16px; }
.banner-title { display: block; font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
.banner-slogan { display: block; font-size: 14px; color: #4a4a4a; }

.search-wrap { padding: 12px 16px; background: #fff; border-bottom: 1px solid #ececec; }
.search-box { position: relative; display: flex; align-items: center; height: 38px; background: #f3f4f6; border-radius: 10px; padding: 0 8px 0 12px; gap: 8px; }
.search-input { flex: 1; font-size: 14px; color: #1a1a1a; height: 38px; }
.search-ph { color: #9ca3af; }
.search-btn { background: var(--brand); border-radius: 8px; padding: 6px 14px; }
.search-btn-text { font-size: 13px; color: #fff; }

.stats { display: flex; margin: 16px; padding: 16px 0; background: #fafafa; border-radius: 12px; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stat-num { font-size: 20px; font-weight: 700; color: var(--brand); }
.stat-label { font-size: 12px; color: #9ca3af; }

.section { padding: 0 16px 16px; }
.card { background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 16px; }
.about-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.about-desc { display: block; font-size: 13px; color: #6b7280; line-height: 1.6; }
.mission { margin-top: 12px; padding: 12px; background: rgba(196,30,58,0.05); border-left: 2px solid var(--brand); border-radius: 8px; }
.mission-text { font-size: 13px; color: var(--brand); font-weight: 500; }

.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title-wrap { display: flex; align-items: center; gap: 8px; }
.section-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.section-more { display: flex; align-items: center; gap: 2px; }
.more-text { font-size: 13px; color: var(--brand); }

.teacher-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.teacher-card { width: calc(50% - 6px); box-sizing: border-box; background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 12px; }
.teacher-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.avatar-wrap { position: relative; }
.avatar { width: 44px; height: 44px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.avatar-badge { position: absolute; bottom: -2px; right: -2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.teacher-info { flex: 1; min-width: 0; }
.teacher-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.teacher-title { display: block; font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.teacher-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.teacher-tag { font-size: 11px; padding: 2px 6px; background: #f3f4f6; border-radius: 4px; color: #6b7280; }
.teacher-foot { display: flex; align-items: center; justify-content: space-between; }
.foot-item { display: flex; align-items: center; gap: 4px; }
.foot-text { font-size: 12px; color: #9ca3af; }

.event-list { display: flex; flex-direction: column; gap: 12px; }
.event-card { display: flex; background: #fff; border: 1px solid #ececec; border-radius: 12px; overflow: hidden; }
.event-cover { position: relative; width: 112px; height: 96px; flex-shrink: 0; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.event-status { position: absolute; top: 4px; left: 4px; padding: 2px 6px; border-radius: 4px; }
.event-status-text { font-size: 11px; }
.event-body { flex: 1; padding: 12px; min-width: 0; }
.event-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.event-title { flex: 1; font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-type { font-size: 11px; color: #9ca3af; white-space: nowrap; }
.event-meta { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.event-meta-text { font-size: 12px; color: #9ca3af; }
.event-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.event-price { font-size: 14px; font-weight: 600; color: var(--brand); }
.event-enrolled { font-size: 12px; color: #9ca3af; }

.apply-banner { position: relative; overflow: hidden; border-radius: 12px; background: linear-gradient(to right, var(--brand), #d4445c); padding: 16px; }
.apply-content { position: relative; z-index: 2; }
.apply-title { display: block; font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.apply-desc { display: block; font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 12px; }
.apply-btn { display: inline-flex; align-items: center; gap: 4px; background: #fff; border-radius: 8px; padding: 6px 14px; align-self: flex-start; }
.apply-btn-text { font-size: 13px; font-weight: 500; color: var(--brand); }
.apply-circle { position: absolute; background: rgba(255,255,255,0.1); border-radius: 50%; }
.apply-circle-1 { right: -40px; bottom: -40px; width: 128px; height: 128px; }
.apply-circle-2 { right: 32px; top: -40px; width: 80px; height: 80px; }
.bottom-safe { height: 24px; }

/* 三态 + 新增字段样式 */
.state-box { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.avatar-img { width: 44px; height: 44px; border-radius: 50%; }
.teacher-level { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 4px; margin-top: 2px; }
.mini-empty { padding: 24px 0; display: flex; justify-content: center; }
.mini-empty-text { font-size: 13px; color: #9ca3af; }
.my-entry { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 14px 16px; }
/* 影响力榜单入口（全站金标风格 #c9a96e） */
.rankings-entry { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #fdf9f0, #f6ecd8); border: 1px solid rgba(201,169,110,0.55); border-radius: 12px; padding: 14px 16px; }
.lectures-entry { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #7c1423, #a4283c); border: 1px solid rgba(196,30,58,0.3); border-radius: 12px; padding: 14px 16px; }
.lectures-entry .lecture-title { color: #fff; }
.lectures-entry .lecture-sub { color: rgba(255,255,255,0.72); }
.lectures-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lecture-entry { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #fdf5f6, #faeaed); border: 1px solid rgba(196,30,58,0.18); border-radius: 12px; padding: 14px 16px; }
.lecture-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lecture-info { flex: 1; min-width: 0; }
.lecture-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; }
.lecture-sub { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.rankings-medal { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #f3e7cf, #c9a96e); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(201,169,110,0.35); }
/* 私董会入口（墨青底金标·闭门质感） */
.board-entry { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #2b2f3a, #3d3428); border-radius: 12px; padding: 14px 16px; }
.board-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(201,169,110,0.24); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.board-info { flex: 1; min-width: 0; }
.board-title { display: block; font-size: 14px; font-weight: 600; color: #fff; }
.board-sub { display: block; font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; }
.rankings-info { flex: 1; min-width: 0; }
.rankings-title { display: block; font-size: 14px; font-weight: 600; color: #7a5f33; }
.rankings-sub { display: block; font-size: 11px; color: #a98d5f; margin-top: 2px; }
.my-entry-left { display: flex; align-items: center; gap: 12px; }
.my-entry-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; }
.my-entry-sub { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
</style>
