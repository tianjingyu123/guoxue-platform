<script setup lang="ts">
/**
 * 圈子活动 — 真实接入 GET /circles/activities（圈子今日新动态/帖子）
 * 后端该端点仅返回今日帖子动态：{ id, type:'post', title, circle, user, createdAt }，
 * 无活动封面/状态/地点/报名等字段，故页面只渲染真实存在的字段，
 * 报名/状态筛选等臆想能力已移除（后端无支撑，不造假）。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleApi, type TodayActivity } from '@/lib/circle-data'

const list = ref<TodayActivity[]>([])
const loading = ref(true)
const error = ref(false)

async function load() {
  loading.value = true
  error.value = false
  try {
    list.value = await circleApi.listActivities(20)
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function openCircle(a: TodayActivity) {
  if (a.circleId) navigateTo(`/circles/${a.circleId}`)
}

onMounted(load)
</script>

<template>
  <view class="ac">
    <view class="ac-header">
      <view @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="ac-title">圈子活动</text>
      <app-icon name="calendar" :size="40" color="#999999" />
    </view>

    <!-- loading -->
    <view v-if="loading" class="ac-state">
      <app-icon name="loader-2" :size="40" color="#C41E3A" class="spin" />
      <text class="ac-state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="ac-state">
      <text class="ac-state-txt">加载失败，请稍后重试</text>
      <view class="ac-retry" @tap="load"><text class="ac-retry-txt">重试</text></view>
    </view>

    <!-- empty -->
    <view v-else-if="list.length === 0" class="ac-state">
      <app-icon name="calendar" :size="64" color="#D8D2C8" />
      <text class="ac-state-txt">今日暂无圈子动态</text>
    </view>

    <!-- list -->
    <view v-else class="ac-list">
      <view v-for="act in list" :key="act.id" class="ac-card" @tap="openCircle(act)">
        <view class="ac-card-top">
          <view class="ac-badge"><text class="ac-badge-txt">动态</text></view>
          <text v-if="act.time" class="ac-time">{{ act.time }}</text>
        </view>
        <text class="ac-card-title">{{ act.title || '（无标题）' }}</text>
        <view class="ac-meta">
          <view v-if="act.circleName" class="ac-meta-row">
            <app-icon name="users" :size="26" color="#999999" />
            <text class="ac-meta-txt brand">{{ act.circleName }}</text>
          </view>
          <view v-if="act.author" class="ac-meta-row">
            <app-icon name="user" :size="26" color="#999999" />
            <text class="ac-meta-txt">{{ act.author }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ac { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.ac-header { position: sticky; top: 0; z-index: 10; background: var(--bg-paper, #FAF8F5); border-bottom: 2rpx solid var(--border, #EDE8E0); display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 96rpx; padding-top: var(--status-bar-height, 0px); }
.ac-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.ac-state { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 160rpx 0; }
.ac-state-txt { font-size: 26rpx; color: #999; }
.ac-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand, var(--brand)); }
.ac-retry-txt { font-size: 26rpx; color: #fff; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.ac-list { padding: 24rpx 32rpx 160rpx; display: flex; flex-direction: column; gap: 24rpx; }
.ac-card { background: var(--card, #fff); border: 2rpx solid var(--border, #EDE8E0); border-radius: 24rpx; padding: 32rpx; }
.ac-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.ac-badge { padding: 6rpx 18rpx; border-radius: 999rpx; background: #DCFCE7; }
.ac-badge-txt { font-size: 22rpx; font-weight: 500; color: #15803D; }
.ac-time { font-size: 22rpx; color: #999; }
.ac-card-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); line-height: 1.4; }
.ac-meta { display: flex; flex-direction: column; gap: 12rpx; margin-top: 20rpx; }
.ac-meta-row { display: flex; align-items: center; gap: 12rpx; }
.ac-meta-txt { font-size: 24rpx; color: #999; }
.ac-meta-txt.brand { color: var(--brand, var(--brand)); }
</style>
