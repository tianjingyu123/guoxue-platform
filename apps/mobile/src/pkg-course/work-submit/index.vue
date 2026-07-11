<script setup lang="ts">
/**
 * P5 课时作业（一页三态）— 合并原 work-submit + work-result + work-review 三页
 * 视觉：V0 阶段二视觉稿 p5-homework.html（未提交 / AI 已批改 / 讲师已复核，同页纵向流转）
 *       骨架屏 p5-p6-states.html
 * 真连：
 *   - courseApi.getWorkRequirement(chapterId) → 未提交态：作业要求（真实章节/课程名 + 指引）
 *   - courseApi.getWorkResult(workId)         → 已批改态：我的答案 + 批改结果（score/评语）
 * 诚实说明：后端作业模型仅单一 score/feedback，无独立「AI 评分」与「讲师复核」两套字段。
 *   故「AI 批改卡」以后端 score/feedback 承载批改结果；「讲师复核卡」仅当后端补齐独立复核
 *   字段（gradedBy.name / teacherComment 且区别于 AI 批改）时展示，当前恒隐藏但结构保留。
 * 页面入口：传 workId → 已提交（批改态）；仅传 chapterId → 未提交（提交态）。
 * 提交 / 选图为交互占位（后端提交端点未落地，沿用原页占位，不造假）。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import { courseApi } from '@/lib/course-data'
import type { WorkRequirement, WorkResult } from '@/lib/course-data'

// 自定义导航状态栏高度
const statusBarHeight = ref(0)

const loading = ref(true)
const error = ref('')

const chapterId = ref('')
const workId = ref('')

// 未提交态：作业要求
const requirement = ref<WorkRequirement | null>(null)
// 已批改态：作业批改结果（含我的答案 + 评分评语）
const work = ref<WorkResult | null>(null)

// 未提交态：答题输入
const content = ref('')
const images = ref<string[]>([])

// —— 三态判定 ——
// 有 workId 且拿到批改结果 → 已提交（批改流）；否则未提交（提交流）
const submitted = computed(() => !!work.value)
// 已批改（AI/系统给分）
const graded = computed(() => work.value?.status === 'graded' && work.value?.score != null)
// 讲师已复核：后端补齐独立复核字段后生效（当前 gradedBy 为占位「讲师」→ 恒 false）
const hasTeacherReview = computed(() => {
  const g = work.value?.gradedBy
  return !!(g && g.name && g.name !== '讲师' && work.value?.teacherComment)
})

// 未提交态输入校验
const wordCount = computed(() => content.value.length)
const minWords = computed(() => requirement.value?.minWords ?? 0)
const canSubmit = computed(() => wordCount.value >= minWords.value)

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}
// 选图 / 提交为交互占位，交付时接 uploadApi / submitWork
function onAddImage() {}
function onSubmit() {}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    if (workId.value) {
      // 已提交：拉批改结果
      work.value = await courseApi.getWorkResult(workId.value)
    } else {
      // 未提交：拉作业要求
      requirement.value = await courseApi.getWorkRequirement(chapterId.value)
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options?: Record<string, string>) => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
  workId.value = options?.workId || ''
  chapterId.value = options?.chapterId || options?.id || '1'
  loadData()
})

// 预览大图
function previewImage(urls: string[], current: string) {
  uni.previewImage({ urls, current })
}
</script>

<template>
  <view class="page">
    <!-- ══ 顶部导航 ══ -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" hover-class="btn-press" @tap="goBack">
        <app-icon name="arrow-left" :size="36" color="#2C2C2C" />
      </view>
      <text class="nav-title serif">本讲作业</text>
      <view class="nav-ph" />
    </view>

    <!-- ══ Error 态 ══ -->
    <view v-if="error" class="state-wrap">
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" hover-class="btn-press" @tap="loadData"><text class="retry-text">重试</text></view>
    </view>

    <!-- ══ Loading 骨架屏 ══ -->
    <view v-else-if="loading" class="body-pad">
      <view class="sk" style="height:260rpx;border-radius:36rpx" />
      <view class="sk" style="height:500rpx;border-radius:36rpx" />
      <view class="sk" style="height:96rpx;border-radius:999rpx;margin-top:24rpx" />
    </view>

    <!-- ══════════ 态1 · 未提交 ══════════ -->
    <template v-else-if="!submitted">
      <view class="body-pad">
        <!-- 题目卡 -->
        <view class="card">
          <text class="lesson-name">{{ requirement?.courseTitle }}<text v-if="requirement?.chapterTitle"> · {{ requirement?.chapterTitle }}</text></text>
          <text class="hw-title serif">{{ requirement?.title }}</text>
          <text v-if="requirement?.description" class="hw-desc">{{ requirement?.description }}</text>
          <view v-if="requirement?.deadline" class="hw-ddl">
            <app-icon name="clock" :size="26" color="#FF9500" />
            <text class="hw-ddl-txt">截止 {{ requirement?.deadline }}</text>
          </view>
        </view>

        <!-- 答题卡 -->
        <view class="card">
          <view class="sec-head">
            <app-icon name="edit" :size="30" color="#C9A96E" />
            <text class="sec-head-txt">我的作答</text>
          </view>
          <textarea
            v-model="content"
            class="input-area"
            placeholder="写下你的思考与答案…"
            placeholder-class="input-ph"
            :maxlength="-1"
          />
          <view class="word-row">
            <text class="word-count" :class="{ warn: wordCount < minWords }">{{ wordCount }}/{{ minWords }} 字（最少）</text>
          </view>

          <!-- 图片九宫格 -->
          <view class="img-grid">
            <view
              v-for="(url, index) in images" :key="index"
              class="img-thumb"
            >
              <image class="img-thumb-img" :src="url" mode="aspectFill" lazy-load @tap="previewImage(images, url)" />
              <view class="img-del" hover-class="btn-press" @tap="removeImage(index)">
                <app-icon name="x" :size="22" color="#ffffff" />
              </view>
            </view>
            <view v-if="images.length < (requirement?.maxImages ?? 9)" class="img-add" hover-class="btn-press" @tap="onAddImage">
              <app-icon name="image-plus" :size="40" color="#999999" />
              <text class="img-add-txt">添加图片</text>
            </view>
          </view>
          <text class="img-count">最多 {{ requirement?.maxImages ?? 9 }} 张</text>
        </view>
      </view>

      <!-- 吸底提交 -->
      <view class="bottom-bar">
        <view class="btn-submit" :class="{ disabled: !canSubmit }" hover-class="btn-press" @tap="canSubmit && onSubmit()">
          <app-icon name="send" :size="34" :color="canSubmit ? '#ffffff' : '#999999'" />
          <text class="btn-submit-txt" :class="{ disabled: !canSubmit }">提交作业</text>
        </view>
      </view>
    </template>

    <!-- ══════════ 态2/3 · 已批改 / 讲师已复核 ══════════ -->
    <template v-else>
      <view class="body-pad body-pad-nobar">
        <!-- 状态胶囊 -->
        <view v-if="hasTeacherReview" class="status-chip chip-green">
          <app-icon name="check-circle" :size="24" color="#34A853" />
          <text class="status-chip-txt chip-green-txt">讲师已复核</text>
        </view>
        <view v-else-if="graded" class="status-chip chip-gold">
          <app-icon name="bot" :size="24" color="#8A6D3B" />
          <text class="status-chip-txt chip-gold-txt">AI 已批改 · 待讲师复核</text>
        </view>
        <view v-else class="status-chip chip-orange">
          <app-icon name="clock" :size="24" color="#FF9500" />
          <text class="status-chip-txt chip-orange-txt">批改中</text>
        </view>

        <!-- 题目卡（精简） -->
        <view class="card">
          <text class="lesson-name">{{ work?.courseTitle }}<text v-if="work?.chapterTitle"> · {{ work?.chapterTitle }}</text></text>
          <text class="hw-title serif">课后作业</text>
        </view>

        <!-- 我的答案（只读） -->
        <view class="card">
          <text class="lesson-name">我的答案<text v-if="work?.submittedAt"> · {{ work?.submittedAt }} 提交</text></text>
          <text class="answer-ro">{{ work?.content }}</text>
          <view v-if="work?.images && work.images.length" class="answer-imgs">
            <view v-for="(img, i) in work.images" :key="i" class="img-thumb">
              <image class="img-thumb-img" :src="img" mode="aspectFill" lazy-load @tap="previewImage(work!.images, img)" />
            </view>
          </view>
        </view>

        <!-- 批改中提示 -->
        <view v-if="!graded" class="pending-tip">
          <view class="pending-dot" />
          <text class="pending-txt">系统正在批改中，请耐心等待…</text>
        </view>

        <!-- AI 批改结果卡（金色浅底·深金字） -->
        <view v-if="graded" class="ai-card">
          <view class="ai-head">
            <view class="ai-badge">
              <app-icon name="bot" :size="22" color="#ffffff" />
              <text class="ai-badge-txt">AI 批改</text>
            </view>
            <text class="ai-head-t">批改结果</text>
          </view>
          <view class="ai-score-row">
            <text class="ai-score">{{ work?.score }}<text class="ai-score-unit">分</text></text>
            <text class="ai-score-full">/ {{ work?.maxScore }}</text>
          </view>
          <text v-if="work?.teacherComment" class="ai-comment">{{ work?.teacherComment }}</text>
          <view class="ai-note">
            <app-icon name="info" :size="24" color="#999999" />
            <text class="ai-note-txt">AI 批改，讲师会复核</text>
          </view>
        </view>

        <!-- 讲师复核卡（后端补齐独立复核字段后展示） -->
        <view v-if="hasTeacherReview" class="review-card">
          <view class="review-head">
            <image v-if="work?.gradedBy?.avatar" class="review-avatar" :src="work?.gradedBy?.avatar" mode="aspectFill" lazy-load />
            <view v-else class="review-avatar review-avatar-ph">
              <app-icon name="user-check" :size="30" color="#C41E3A" />
            </view>
            <text class="review-name">{{ work?.gradedBy?.name }}</text>
            <view class="review-tag"><text class="review-tag-txt">讲师复核</text></view>
            <text v-if="work?.score != null" class="review-score">{{ work?.score }}<text class="review-score-unit"> 分</text></text>
          </view>
          <text v-if="work?.teacherComment" class="review-comment">{{ work?.teacherComment }}</text>
        </view>

        <!-- 底部操作：可重新提交 -->
        <view v-if="work?.canResubmit" class="resubmit-row">
          <view class="btn-resubmit" hover-class="btn-press" @tap="onSubmit">
            <app-icon name="edit" :size="30" color="#C41E3A" />
            <text class="btn-resubmit-txt">重新提交</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
/* ── 视觉 token（V0 委托书第七节）── */
.page { min-height: 100vh; background: #FAF8F5; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.btn-press { opacity: 0.6; }

/* ── 顶部导航 ── */
.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 40rpx 16rpx;
  background: #FAF8F5;
}
.nav-back { width: 72rpx; height: 72rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; background: #FFFFFF; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.nav-title { font-size: 40rpx; font-weight: 700; letter-spacing: 2rpx; color: #2C2C2C; }
.nav-ph { width: 72rpx; }

/* ── 内容主体 ── */
.body-pad { padding: 24rpx 40rpx 220rpx; display: flex; flex-direction: column; gap: 24rpx; }
.body-pad-nobar { padding-bottom: 64rpx; }

/* ── 通用卡片 ── */
.card { background: #FFFFFF; border-radius: 36rpx; padding: 32rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.lesson-name { display: block; font-size: 26rpx; color: #999999; margin-bottom: 16rpx; }
.hw-title { display: block; font-size: 34rpx; font-weight: 700; color: #2C2C2C; line-height: 1.5; }
.hw-desc { display: block; font-size: 30rpx; color: #6E6E73; line-height: 1.7; margin-top: 20rpx; white-space: pre-line; }
.hw-ddl { display: flex; align-items: center; gap: 8rpx; margin-top: 20rpx; }
.hw-ddl-txt { font-size: 26rpx; color: #FF9500; }

/* ── 区块小标题 ── */
.sec-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.sec-head-txt { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }

/* ── 未提交·答题输入区（暖底衬） ── */
.input-area { width: 100%; box-sizing: border-box; min-height: 300rpx; background: #F8F4EC; border-radius: 16rpx; padding: 28rpx; font-size: 30rpx; color: #2C2C2C; line-height: 1.7; }
.input-ph { color: #999999; }
.word-row { display: flex; justify-content: flex-end; margin-top: 16rpx; }
.word-count { font-size: 24rpx; color: #999999; }
.word-count.warn { color: #FF9500; }

/* ── 图片九宫格 ── */
.img-grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.img-thumb { position: relative; width: 152rpx; height: 152rpx; border-radius: 16rpx; overflow: hidden; background: #F8F4EC; }
.img-thumb-img { width: 100%; height: 100%; }
.img-del { position: absolute; top: 8rpx; right: 8rpx; width: 40rpx; height: 40rpx; background: rgba(0,0,0,0.6); border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.img-add { width: 152rpx; height: 152rpx; border-radius: 16rpx; border: 3rpx dashed #EDE7DD; background: #F8F4EC; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.img-add-txt { font-size: 22rpx; color: #999999; }
.img-count { display: block; font-size: 24rpx; color: #999999; margin-top: 16rpx; }

/* ── 吸底提交按钮 ── */
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; background: #FFFFFF; border-top: 2rpx solid #EDE7DD; padding: 24rpx 40rpx calc(24rpx + env(safe-area-inset-bottom)); }
.btn-submit { height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 16rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.24); }
.btn-submit.disabled { background: #EDE7DD; box-shadow: none; }
.btn-submit-txt { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
.btn-submit-txt.disabled { color: #999999; }

/* ── 状态胶囊 ── */
.status-chip { align-self: flex-start; display: flex; align-items: center; gap: 8rpx; padding: 10rpx 22rpx; border-radius: 999rpx; }
.status-chip-txt { font-size: 24rpx; font-weight: 600; }
.chip-gold { background: rgba(201,169,110,0.14); }
.chip-gold-txt { color: #8A6D3B; }
.chip-green { background: rgba(52,168,83,0.1); }
.chip-green-txt { color: #34A853; }
.chip-orange { background: rgba(255,149,0,0.1); }
.chip-orange-txt { color: #FF9500; }

/* ── 我的答案（只读） ── */
.answer-ro { display: block; font-size: 30rpx; line-height: 1.7; color: #2C2C2C; white-space: pre-wrap; }
.answer-imgs { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }

/* ── 批改中提示 ── */
.pending-tip { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 28rpx; background: rgba(255,149,0,0.08); border-radius: 16rpx; }
.pending-dot { width: 16rpx; height: 16rpx; border-radius: 999rpx; background: #FF9500; }
.pending-txt { font-size: 26rpx; color: #FF9500; }

/* ── AI 批改结果卡（金色浅底·深金字，X5 单层实底） ── */
.ai-card { background: rgba(201,169,110,0.14); border-radius: 36rpx; padding: 36rpx 32rpx; }
.ai-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.ai-badge { display: flex; align-items: center; gap: 6rpx; background: #C9A96E; border-radius: 10rpx; padding: 6rpx 14rpx; }
.ai-badge-txt { font-size: 22rpx; font-weight: 700; color: #FFFFFF; letter-spacing: 1rpx; }
.ai-head-t { font-size: 30rpx; font-weight: 700; color: #8A6D3B; }
.ai-score-row { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 16rpx; }
.ai-score { font-size: 80rpx; font-weight: 700; color: #8A6D3B; font-family: "SF Mono", "Roboto Mono", monospace; }
.ai-score-unit { font-size: 28rpx; font-weight: 500; }
.ai-score-full { font-size: 28rpx; color: #999999; }
.ai-comment { display: block; font-size: 28rpx; line-height: 1.7; color: #2C2C2C; white-space: pre-wrap; }
.ai-note { display: flex; align-items: center; gap: 8rpx; margin-top: 24rpx; }
.ai-note-txt { font-size: 24rpx; color: #999999; }

/* ── 讲师复核卡 ── */
.review-card { background: #FFFFFF; border-radius: 36rpx; padding: 32rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); border: 2rpx solid #EDE7DD; }
.review-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.review-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.review-avatar-ph { background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; }
.review-name { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.review-tag { background: rgba(196,30,58,0.08); border-radius: 10rpx; padding: 4rpx 14rpx; }
.review-tag-txt { font-size: 22rpx; font-weight: 600; color: #C41E3A; }
.review-score { margin-left: auto; font-size: 40rpx; font-weight: 700; color: #C41E3A; font-family: "SF Mono", "Roboto Mono", monospace; }
.review-score-unit { font-size: 24rpx; font-weight: 500; color: #999999; }
.review-comment { display: block; font-size: 28rpx; line-height: 1.7; color: #2C2C2C; white-space: pre-wrap; }

/* ── 重新提交 ── */
.resubmit-row { margin-top: 8rpx; }
.btn-resubmit { height: 88rpx; border-radius: 999rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.btn-resubmit-txt { font-size: 30rpx; font-weight: 600; color: #C41E3A; }

/* ── 错误态 ── */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.state-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

/* ── 骨架屏（#F0EBE2 微光 1.4s）── */
.sk { position: relative; overflow: hidden; background: #F0EBE2; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
</style>
