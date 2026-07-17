<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="nav-title">私董会</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>

      <!-- 403：非院内成员 -->
      <view v-else-if="forbidden" class="state-box">
        <app-icon name="lock" :size="44" color="#d1d5db" />
        <text class="state-title">仅研究院成员可见</text>
        <text class="state-text">私董会是研究院成员的闭门共研小组{{ '\n' }}加入研究院后即可申请入组</text>
        <view class="guide-btn" @tap="goApply"><text class="guide-btn-t">了解入会</text></view>
      </view>

      <!-- 错误态 -->
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else>
        <!-- 玩法说明卡 -->
        <view class="intro-card">
          <view class="intro-head">
            <view class="intro-icon"><app-icon name="users" :size="20" color="#fff" /></view>
            <text class="intro-title">私董会 · 闭门共研</text>
          </view>
          <text class="intro-desc">6-12 人闭门小组 · 轮流出题 · 众人拆解你的经营课题</text>
          <view class="intro-points">
            <view class="intro-point"><app-icon name="target" :size="13" color="#c9a96e" /><text class="intro-point-t">每期一位成员出题，全组共拆</text></view>
            <view class="intro-point"><app-icon name="shield-check" :size="13" color="#c9a96e" /><text class="intro-point-t">私密圈承载，圈外不可见</text></view>
            <view class="intro-point"><app-icon name="lightbulb" :size="13" color="#c9a96e" /><text class="intro-point-t">案例沉淀入小组知识库</text></view>
          </view>
        </view>

        <!-- 空态 -->
        <view v-if="groups.length === 0" class="state-box">
          <app-icon name="users" :size="40" color="#d1d5db" />
          <text class="state-text">暂无私董会小组{{ '\n' }}小组由研究院管理层发起组建</text>
        </view>

        <!-- 小组列表 -->
        <view v-else class="list">
          <view v-for="g in groups" :key="g.id" class="g-card" @tap="onEnter(g)">
            <view class="g-head">
              <text class="g-name">{{ g.name }}</text>
              <text v-if="g.status !== 'ACTIVE'" class="g-status g-status-off">已解散</text>
              <text v-else-if="g.joined" class="g-status g-status-in">已加入</text>
              <text v-else-if="isFull(g)" class="g-status g-status-full">已满员</text>
            </view>
            <view v-if="g.topic" class="g-topic">
              <text class="g-topic-tag">本期议题</text>
              <text class="g-topic-t">{{ g.topic }}</text>
            </view>
            <view class="g-leader">
              <image lazy-load v-if="g.leader.avatar" :src="g.leader.avatar" class="g-avatar-img" mode="aspectFill" />
              <view v-else class="g-avatar"><app-icon name="user" :size="14" color="#9ca3af" /></view>
              <text class="g-leader-name">{{ g.leader.nickname || '研究院成员' }}</text>
              <text class="g-leader-tag">组长</text>
            </view>
            <view class="g-progress-row">
              <view class="g-progress">
                <view class="g-progress-bar" :class="{ 'g-progress-full': isFull(g) }" :style="{ width: progressPct(g) }" />
              </view>
              <text class="g-progress-t">{{ g.memberCount }}/{{ g.memberLimit }} 人</text>
            </view>
            <view v-if="g.status === 'ACTIVE'" class="g-foot">
              <view v-if="g.joined" class="g-btn g-btn-primary" @tap.stop="goCircle(g)">
                <text class="g-btn-primary-t">进入小组</text>
              </view>
              <view v-else-if="isFull(g)" class="g-btn g-btn-disabled">
                <text class="g-btn-disabled-t">已满员</text>
              </view>
              <view v-else class="g-btn g-btn-outline" @tap.stop="goCircle(g)">
                <text class="g-btn-outline-t">申请加入</text>
              </view>
            </view>
          </view>
          <text class="list-note">入组申请由组长审批 · 小组日常交流在私密圈内进行</text>
        </view>

        <view class="bottom-safe" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, type BoardGroup } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
try {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  navHeight.value = (sys.statusBarHeight || 0) + 44
} catch (e) {}

const loading = ref(true)
const errMsg = ref('')
const forbidden = ref(false)
const groups = ref<BoardGroup[]>([])

async function load() {
  loading.value = true
  errMsg.value = ''
  forbidden.value = false
  try {
    groups.value = await instituteApi.getBoardGroups()
  } catch (e) {
    const msg = (e as Error)?.message || '加载失败'
    // 后端契约：403 = 非院内成员（消息可能是自定义中文或框架默认 Forbidden）
    if (/403|Forbidden|成员|权限/i.test(msg)) forbidden.value = true
    else errMsg.value = msg
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

const isFull = (g: BoardGroup) => g.memberCount >= g.memberLimit
const progressPct = (g: BoardGroup) => {
  const pct = g.memberLimit > 0 ? Math.min(100, Math.round((g.memberCount / g.memberLimit) * 100)) : 0
  return pct + '%'
}

/** 入组/进组统一跳圈子详情：申请加入走圈子现有 join（needApproval 组长审批） */
function goCircle(g: BoardGroup) {
  navigateTo(`/pkg-circle/circles/detail?id=${g.circleId}`)
}
function onEnter(g: BoardGroup) {
  if (g.status !== 'ACTIVE') return
  if (!g.joined && isFull(g)) return
  goCircle(g)
}
function goApply() { navigateTo('/institute/member-apply') }
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin: 0 -6px 0 -10px; } /* 触控热区≥44px：容器扩大+负margin保持视觉位置 */
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; }

/* 三态 */
.state-box { padding: 64px 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.state-text { font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.7; white-space: pre-line; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.guide-btn { margin-top: 4px; padding: 8px 26px; background: var(--brand); border-radius: 999px; }
.guide-btn-t { font-size: 13px; color: #fff; font-weight: 500; }

/* 玩法说明卡（墨青底 + 金标点缀，与研究院榜单金标风格呼应） */
.intro-card { margin: 12px 16px 16px; padding: 16px; border-radius: 14px; background: linear-gradient(135deg, #2b2f3a, #3d3428); }
.intro-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.intro-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(201,169,110,0.28); display: flex; align-items: center; justify-content: center; }
.intro-title { font-size: 16px; font-weight: 700; color: #fff; }
.intro-desc { display: block; font-size: 13px; color: rgba(255,255,255,0.82); line-height: 1.6; }
.intro-points { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.intro-point { display: flex; align-items: center; gap: 6px; }
.intro-point-t { font-size: 12px; color: rgba(255,255,255,0.62); }

/* 小组卡 */
.list { padding: 0 16px; }
.g-card { background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
.g-head { display: flex; align-items: center; gap: 8px; }
.g-name { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-status { font-size: 11px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.g-status-in { color: #16a34a; background: #f0fdf4; }
.g-status-full { color: #6b7280; background: #f3f4f6; }
.g-status-off { color: #9ca3af; background: #f3f4f6; }
.g-topic { display: flex; align-items: flex-start; gap: 6px; margin-top: 8px; }
.g-topic-tag { flex-shrink: 0; font-size: 10px; color: #b8860b; background: rgba(212,160,23,0.12); border-radius: 4px; padding: 2px 6px; margin-top: 1px; }
.g-topic-t { flex: 1; font-size: 13px; color: #4b5563; line-height: 1.5; }
.g-leader { display: flex; align-items: center; gap: 6px; margin-top: 10px; }
.g-avatar { width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.g-avatar-img { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; }
.g-leader-name { font-size: 12px; color: #4b5563; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-leader-tag { font-size: 10px; color: var(--brand); background: rgba(196,30,58,0.08); border-radius: 4px; padding: 1px 6px; }
.g-progress-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.g-progress { flex: 1; height: 6px; border-radius: 999px; background: #f0f0f0; overflow: hidden; }
.g-progress-bar { height: 100%; border-radius: 999px; background: linear-gradient(to right, #c9a96e, #b8860b); transition: width 0.3s; }
.g-progress-full { background: #d1d5db; }
.g-progress-t { font-size: 12px; color: #9ca3af; white-space: nowrap; }
.g-foot { display: flex; justify-content: flex-end; margin-top: 12px; }
.g-btn { padding: 7px 22px; border-radius: 999px; }
.g-btn-primary { background: var(--brand); }
.g-btn-primary-t { font-size: 13px; color: #fff; font-weight: 500; }
.g-btn-outline { border: 1px solid var(--brand); }
.g-btn-outline-t { font-size: 13px; color: var(--brand); font-weight: 500; }
.g-btn-disabled { background: #f3f4f6; }
.g-btn-disabled-t { font-size: 13px; color: #9ca3af; }
.list-note { display: block; text-align: center; font-size: 11px; color: #c0c4cc; padding: 4px 0 8px; }
.bottom-safe { height: 24px; }
</style>
