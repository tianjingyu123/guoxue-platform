<template>
  <view class="page">
    <!-- 加载态 -->
    <view v-if="loading" class="not-found-page">
      <view class="nav-simple" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-bar">
          <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
          <text class="nav-title">活动详情</text>
        </view>
      </view>
      <view class="not-found" :style="{ paddingTop: navHeight + 'px' }">
        <view class="spinner" />
        <text class="not-found-text">加载中…</text>
      </view>
    </view>

    <!-- 不存在 / 错误 -->
    <view v-else-if="!event" class="not-found-page">
      <view class="nav-simple" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-bar">
          <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
          <text class="nav-title">活动详情</text>
        </view>
      </view>
      <view class="not-found" :style="{ paddingTop: navHeight + 'px' }">
        <app-icon name="calendar" :size="48" color="#d1d5db" />
        <text class="not-found-text">{{ errMsg || '活动不存在或已下架' }}</text>
        <view class="not-found-btn" @tap="goEvents"><text class="not-found-btn-text">返回活动列表</text></view>
      </view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="scroll">
        <!-- 封面 -->
        <view class="cover">
          <view class="cover-img"><app-icon name="calendar" :size="48" color="#d1d5db" /></view>
          <view class="cover-mask" />
          <view class="cover-header" :style="{ paddingTop: statusBarHeight + 'px' }">
            <view class="round-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#fff" /></view>
          </view>
          <view class="cover-tags">
            <text class="cover-tag" :style="{ color: eventTypeColor[event.type].color, background: eventTypeColor[event.type].bg }">{{ eventTypeLabel[event.type] }}</text>
            <text class="cover-tag" :style="{ color: eventStatusColor[event.status].color, background: eventStatusColor[event.status].bg }">{{ eventStatusLabel[event.status] }}</text>
          </view>
        </view>

        <view class="body">
          <!-- 标题与信息 -->
          <view class="card">
            <text class="title">{{ event.title }}</text>
            <view class="info-list">
              <view class="info-row">
                <app-icon name="calendar" :size="16" color="#c41e3a" />
                <text class="info-text">{{ fmtDateTime(event.scheduleAt) }}</text>
              </view>
              <view class="info-row">
                <app-icon :name="event.type === 'LIVE' ? 'video' : 'map-pin'" :size="16" color="#c41e3a" />
                <text class="info-text">{{ event.type === 'LIVE' ? (event.location || '线上直播') : (event.location || '地点待定') }}</text>
              </view>
              <view class="info-row">
                <app-icon name="users" :size="16" color="#c41e3a" />
                <text class="info-text">活动名额 {{ event.maxAttendees }} 人</text>
              </view>
            </view>
          </view>

          <!-- 主讲嘉宾（后端 lecturer 单人）-->
          <view v-if="event.lecturer" class="card">
            <text class="card-title">主讲嘉宾</text>
            <view class="speaker-list">
              <view class="speaker-row" @tap="goInstructor(event.lecturer.id)">
                <image lazy-load v-if="event.lecturer.avatar" :src="event.lecturer.avatar" class="speaker-avatar-img" mode="aspectFill" />
                <view v-else class="speaker-avatar"><app-icon name="user" :size="20" color="#9ca3af" /></view>
                <view class="speaker-info">
                  <text class="speaker-name">{{ memberName(event.lecturer) }}</text>
                  <text class="speaker-title">研究院讲师</text>
                </view>
                <app-icon name="chevron-right" :size="16" color="#9ca3af" />
              </view>
            </view>
          </view>

          <!-- 活动介绍 -->
          <view v-if="event.description" class="card">
            <text class="card-title">活动介绍</text>
            <text class="desc">{{ event.description }}</text>
          </view>

          <!-- 主办方 -->
          <view v-if="event.institute" class="card">
            <text class="card-title">主办方</text>
            <text class="desc">{{ event.institute.name }}</text>
          </view>
        </view>

        <view class="bottom-safe" />
      </scroll-view>

      <!-- 底部栏：报名功能后端暂未开放，诚实降级为状态提示 -->
      <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
        <view class="footer-status">
          <app-icon name="clock" :size="16" color="#9ca3af" />
          <text class="footer-status-text">{{ eventStatusLabel[event.status] }}</text>
        </view>
        <view class="enroll-btn enroll-btn-disabled" @tap="onEnrollTip">
          <text class="enroll-btn-text">{{ event.type === 'LIVE' ? '线上活动 · 报名即将开放' : '线下活动 · 报名即将开放' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, eventTypeLabel, eventTypeColor, eventStatusLabel, eventStatusColor, fmtDateTime, memberName, type InstituteEvent } from '@/pkg-institute/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const loading = ref(true)
const errMsg = ref('')
const event = ref<InstituteEvent | null>(null)

async function load(id?: string) {
  if (!id) { loading.value = false; errMsg.value = '缺少活动参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    event.value = await instituteApi.getEvent(id)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
    event.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => load(q && q.id ? String(q.id) : undefined))

function onEnrollTip() {
  uni.showToast({ title: '活动报名功能即将开放', icon: 'none' })
}
function goInstructor(id: string) {
  navigateTo('/institute/instructors/' + id)
}
function goEvents() {
  navigateTo('/institute/events')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.scroll { height: 100vh; }

.nav-simple { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: #fff; border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; gap: 8px; }
.nav-back { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin: 0 -6px 0 -10px; } /* 触控热区≥44px：容器扩大+负margin保持视觉位置 */
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.not-found { display: flex; flex-direction: column; align-items: center; padding-top: 120px; gap: 12px; }
.not-found-text { font-size: 14px; color: #9ca3af; }
.not-found-btn { margin-top: 12px; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 24px; }
.not-found-btn-text { font-size: 14px; color: #4b5563; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.cover { position: relative; height: 208px; background: #f3f4f6; }
.cover-img { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.cover-mask { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.5), transparent); }
.cover-header { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; }
.round-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.cover-tags { position: absolute; bottom: 12px; left: 16px; display: flex; gap: 8px; }
.cover-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; }

.body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border-radius: 12px; padding: 16px; }
.title { display: block; font-size: 18px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
.info-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; align-items: center; gap: 8px; }
.info-text { font-size: 13px; color: #6b7280; }

.card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.speaker-list { display: flex; flex-direction: column; gap: 12px; }
.speaker-row { display: flex; align-items: center; gap: 12px; }
.speaker-avatar { width: 44px; height: 44px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.speaker-avatar-img { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
.speaker-info { flex: 1; }
.speaker-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.speaker-title { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }
.desc { display: block; font-size: 13px; color: #6b7280; line-height: 1.6; white-space: pre-line; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ececec; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
.footer-status { display: flex; align-items: center; gap: 4px; }
.footer-status-text { font-size: 12px; color: #9ca3af; }
.enroll-btn { flex: 1; background: var(--brand); border-radius: 10px; padding: 12px 0; display: flex; align-items: center; justify-content: center; }
.enroll-btn-disabled { background: #d1d5db; }
.enroll-btn-text { font-size: 15px; font-weight: 500; color: #fff; }
.bottom-safe { height: 88px; }
</style>
