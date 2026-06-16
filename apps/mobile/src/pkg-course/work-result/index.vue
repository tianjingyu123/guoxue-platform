<script setup lang="ts">
/** 作业批改结果页 - 从原型 app/courses/work-result/page.tsx 迁移(graded 状态) */
import { ref, computed, onMounted } from 'vue'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import AppError from '@/components/common/app-error.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
// @data-needs: 作业批改结果, 参数 workId, 返回 WorkResult
// mock 见 @/lib/course-data.ts，交付时由 Claude Code 替换为真实接口
import { workResult as work } from '@/lib/course-data'

const loading = ref(false)
const error = ref('')
const dataReady = ref(false)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 300))
    dataReady.value = true
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const statusMap = {
  pending: { text: '批改中', color: '#f97316', bg: '#FFF7ED', iconBg: '#FFEDD5', icon: 'clock' },
  graded: { text: '已批改', color: '#16a34a', bg: '#F0FDF4', iconBg: '#DCFCE7', icon: 'check-circle' },
  returned: { text: '已退回', color: '#ef4444', bg: '#FEF2F2', iconBg: '#FEE2E2', icon: 'alert-circle' },
} as const
const st = computed(() => statusMap[work.status])

function scoreColor(score: number, max: number) {
  const p = score / max
  if (p >= 0.9) return '#16a34a'
  if (p >= 0.7) return '#2563eb'
  if (p >= 0.6) return '#f97316'
  return '#ef4444'
}
function barColor(score: number, max: number) {
  const p = score / max
  if (p >= 0.9) return '#22c55e'
  if (p >= 0.7) return '#3b82f6'
  if (p >= 0.6) return '#f97316'
  return '#ef4444'
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <app-nav-bar title="作业批改结果" background="#FAF8F5" color="#2C2C2C" />

    <scroll-view scroll-y class="scroll">
      <view v-if="loading" class="body">
        <!-- 骨架屏：状态卡 + 2个白色卡片占位 -->
        <view class="pl-skeleton">
          <view class="sk-status-card" />
          <view class="sk-card"><view class="sk-title" /><view class="sk-paragraph" /><view class="sk-paragraph sk-short" /></view>
          <view class="sk-card"><view class="sk-title" /><view class="sk-paragraph" /></view>
        </view>
      </view>
      <app-error v-else-if="error" :desc="error" @retry="loadData" />
      <view v-else class="body">
        <!-- 状态卡 -->
        <view class="status-card" :style="{ background: st.bg }">
          <view class="status-row">
            <view class="status-icon" :style="{ background: st.iconBg }">
              <app-icon :name="st.icon" :size="36" :color="st.color" />
            </view>
            <view class="status-main">
              <view class="status-line">
                <text class="status-text" :style="{ color: st.color }">{{ st.text }}</text>
                <text v-if="work.status === 'graded' && work.score != null" class="score" :style="{ color: scoreColor(work.score, work.maxScore) }">
                  {{ work.score }}<text class="score-max">/{{ work.maxScore }}分</text>
                </text>
              </view>
              <text class="status-sub">{{ work.courseTitle }} · {{ work.chapterTitle }}</text>
            </view>
          </view>
          <view v-if="work.status === 'pending'" class="pending-tip">
            <view class="pending-dot" />
            <text class="pending-text">教师正在批改中，请耐心等待...</text>
          </view>
        </view>

        <!-- 教师评语 -->
        <view v-if="work.status === 'graded' && work.gradedBy" class="card">
          <view class="card-head">
            <app-icon name="message-square" :size="32" color="#C41E3A" />
            <text class="card-title">教师评语</text>
          </view>
          <view class="card-body">
            <view class="teacher-row">
              <image class="teacher-avatar" :src="work.gradedBy.avatar" mode="aspectFill" />
              <view class="teacher-info">
                <text class="teacher-name">{{ work.gradedBy.name }}</text>
                <text class="graded-at">批改于 {{ work.gradedAt }}</text>
              </view>
            </view>
            <text class="comment-text">{{ work.teacherComment }}</text>
            <view v-if="work.suggestions && work.suggestions.length" class="suggest-box">
              <text class="suggest-title">修改建议：</text>
              <view v-for="(s, i) in work.suggestions" :key="i" class="suggest-item">
                <text class="suggest-dot">•</text>
                <text class="suggest-text">{{ s }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 我的提交 -->
        <view class="card">
          <view class="card-head card-head-between">
            <view class="card-head-left">
              <app-icon name="file-text" :size="32" color="#C9A96E" />
              <text class="card-title">我的提交</text>
            </view>
            <text class="submit-time">{{ work.submittedAt }}</text>
          </view>
          <view class="card-body">
            <text class="content-text">{{ work.content }}</text>
            <view v-if="work.images.length" class="img-grid">
              <view v-for="(img, i) in work.images" :key="i" class="img-cell">
                <image class="img" :src="img" mode="aspectFill" />
                <view class="img-mask"><app-icon name="zoom-in" :size="36" color="#ffffff" /></view>
              </view>
            </view>
          </view>
        </view>

        <!-- 评分详情 -->
        <view v-if="work.status === 'graded' && work.score != null" class="card">
          <view class="card-head">
            <app-icon name="star" :size="32" color="#C9A96E" />
            <text class="card-title">评分详情</text>
          </view>
          <view class="card-body">
            <view class="score-center">
              <text class="score-big" :style="{ color: scoreColor(work.score, work.maxScore) }">{{ work.score }}</text>
              <text class="score-full">满分 {{ work.maxScore }} 分</text>
            </view>
            <view class="score-bar">
              <view class="score-bar-fill" :style="{ width: (work.score / work.maxScore * 100) + '%', background: barColor(work.score, work.maxScore) }" />
            </view>
            <view class="score-scale">
              <text class="scale-txt">0</text>
              <text class="scale-txt">60及格</text>
              <text class="scale-txt">100</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="work.canResubmit" class="footer">
      <view class="footer-btn" @tap="navigateTo('/pkg-course/work-submit/index')">
        <app-icon name="refresh-cw" :size="32" color="#ffffff" />
        <text class="footer-btn-txt">重新提交</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

.nav { display: flex; align-items: center; justify-content: space-between; height: 96rpx; padding: 0 32rpx; background: #FAF8F5; border-bottom: 1rpx solid #E8E3DB; }
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-placeholder { width: 56rpx; }

.scroll { flex: 1; }
.body { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }

.status-card { border-radius: 24rpx; padding: 32rpx; }
.status-row { display: flex; align-items: center; gap: 24rpx; }
.status-icon { width: 84rpx; height: 84rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.status-main { flex: 1; }
.status-line { display: flex; align-items: center; gap: 16rpx; }
.status-text { font-size: 36rpx; font-weight: 600; }
.score { font-size: 48rpx; font-weight: 700; }
.score-max { font-size: 24rpx; font-weight: 400; color: #999; }
.status-sub { display: block; font-size: 26rpx; color: #666; margin-top: 8rpx; }
.pending-tip { margin-top: 32rpx; padding: 24rpx; background: rgba(255,255,255,0.6); border-radius: 16rpx; display: flex; align-items: center; gap: 16rpx; }
.pending-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #fb923c; }
.pending-text { font-size: 26rpx; color: #ea580c; }

.card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-head { display: flex; align-items: center; gap: 12rpx; padding: 24rpx 32rpx; border-bottom: 1rpx solid #E8E3DB; }
.card-head-between { justify-content: space-between; }
.card-head-left { display: flex; align-items: center; gap: 12rpx; }
.card-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.submit-time { font-size: 22rpx; color: #999; }
.card-body { padding: 32rpx; }

.teacher-row { display: flex; align-items: center; gap: 24rpx; margin-bottom: 32rpx; }
.teacher-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F2EFEA; }
.teacher-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.graded-at { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.comment-text { font-size: 26rpx; line-height: 1.6; color: #333; white-space: pre-wrap; }
.suggest-box { margin-top: 32rpx; padding: 24rpx; background: #FEF2F2; border-radius: 16rpx; }
.suggest-title { display: block; font-size: 22rpx; font-weight: 500; color: #dc2626; margin-bottom: 16rpx; }
.suggest-item { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 8rpx; }
.suggest-dot { color: #f87171; font-size: 26rpx; line-height: 1.5; }
.suggest-text { flex: 1; font-size: 26rpx; color: #dc2626; line-height: 1.5; }

.content-text { font-size: 26rpx; line-height: 1.6; color: #333; white-space: pre-wrap; }
.img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin-top: 32rpx; }
.img-cell { position: relative; width: 100%; aspect-ratio: 1; border-radius: 16rpx; overflow: hidden; background: #F5F0E8; }
.img { width: 100%; height: 100%; }
.img-mask { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0); }

.score-center { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0; }
.score-big { font-size: 96rpx; font-weight: 700; line-height: 1; }
.score-full { font-size: 26rpx; color: #999; margin-top: 8rpx; }
.score-bar { height: 16rpx; border-radius: 999rpx; background: #E8E3DB; overflow: hidden; margin-top: 16rpx; }
.score-bar-fill { height: 100%; border-radius: 999rpx; }
.score-scale { display: flex; justify-content: space-between; margin-top: 8rpx; }
.scale-txt { font-size: 22rpx; color: #999; }

.footer { padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #E8E3DB; }
.footer-btn { height: 88rpx; border-radius: 999rpx; background: linear-gradient(to right, #C41E3A, #E74C3C); display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.footer-btn-txt { font-size: 30rpx; font-weight: 600; color: #fff; }

/* 骨架屏 */
@keyframes sk-pulse { 0%,100%{ opacity: 0.3 } 50%{ opacity: 0.6 } }
.pl-skeleton { display: flex; flex-direction: column; gap: 32rpx; }
.sk-status-card { height: 180rpx; border-radius: 24rpx; background: #E8E3DB; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-card { background: #fff; border-radius: 24rpx; padding: 32rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-title { height: 32rpx; width: 40%; background: #E8E3DB; border-radius: 8rpx; margin-bottom: 24rpx; }
.sk-paragraph { height: 28rpx; background: #E8E3DB; border-radius: 8rpx; margin-bottom: 16rpx; }
.sk-paragraph.sk-short { width: 70%; }
</style>
