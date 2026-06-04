<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <text
        class="back-btn"
        @click="uni.navigateBack"
      >
        ‹
      </text>
      <text class="header-title">
        作业批改结果
      </text>
      <view class="header-spacer" />
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 状态卡片 -->
      <view
        class="status-card"
        :class="'status-' + (work?.status || 'pending')"
      >
        <view class="status-row">
          <view
            class="status-icon-wrap"
            :class="'status-icon-' + (work?.status || 'pending')"
          >
            <text class="status-emoji">
              {{ statusEmoji }}
            </text>
          </view>
          <view class="status-info">
            <view class="status-title-row">
              <text
                class="status-title"
                :class="'status-color-' + (work?.status || 'pending')"
              >
                {{ statusText }}
              </text>
              <text
                v-if="work?.status === 'graded' && work.score !== undefined"
                class="status-score"
                :style="{ color: scoreColor }"
              >
                {{ work.score }}<text class="status-max">
                  /{{ work.maxScore }}分
                </text>
              </text>
            </view>
            <text class="status-course">
              {{ work?.courseTitle || '' }} · {{ work?.chapterTitle || '' }}
            </text>
          </view>
        </view>
        <view
          v-if="work?.status === 'pending'"
          class="status-waiting"
        >
          <view class="waiting-dot" />
          <text class="waiting-text">
            教师正在批改中，请耐心等待...
          </text>
        </view>
      </view>

      <!-- 批改结果 -->
      <view
        v-if="work?.status === 'graded' && work?.gradedBy"
        class="section-card"
      >
        <view class="section-header">
          <text class="section-icon">
            💬
          </text>
          <text class="section-title">
            教师评语
          </text>
        </view>
        <view class="teacher-row">
          <view class="teacher-avatar-wrap">
            <image
              v-if="work.gradedBy.avatar"
              :src="work.gradedBy.avatar"
              class="teacher-avatar"
              mode="aspectFill"
            />
            <text
              v-else
              class="teacher-avatar-placeholder"
            >
              👨‍🏫
            </text>
          </view>
          <view class="teacher-info">
            <text class="teacher-name">
              {{ work.gradedBy.name }}
            </text>
            <text class="teacher-date">
              批改于 {{ work.gradedAt }}
            </text>
          </view>
        </view>
        <text class="teacher-comment">
          {{ work.teacherComment }}
        </text>
        <!-- 修改建议 -->
        <view
          v-if="work.suggestions?.length"
          class="suggestions-box"
        >
          <text class="suggestions-title">
            修改建议：
          </text>
          <text
            v-for="(s, idx) in work.suggestions"
            :key="idx"
            class="suggestion-item"
          >
            • {{ s }}
          </text>
        </view>
      </view>

      <!-- 我的提交 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-icon">
            📄
          </text>
          <text class="section-title">
            我的提交
          </text>
          <text class="section-date">
            {{ work?.submittedAt || '' }}
          </text>
        </view>
        <text class="submit-content">
          {{ work?.content || '' }}
        </text>
        <!-- 图片 -->
        <view
          v-if="work?.images?.length"
          class="image-grid"
        >
          <image
            v-for="(img, idx) in work.images"
            :key="idx"
            :src="img"
            class="submit-image"
            mode="aspectFill"
            @click="previewIndex = idx"
          />
        </view>
      </view>

      <!-- 评分详情 -->
      <view
        v-if="work?.status === 'graded' && work.score !== undefined"
        class="section-card"
      >
        <view class="section-header">
          <text class="section-icon">
            ⭐
          </text>
          <text class="section-title">
            评分详情
          </text>
        </view>
        <view class="score-hero">
          <text
            class="score-big"
            :style="{ color: scoreColor }"
          >
            {{ work.score }}
          </text>
          <text class="score-max">
            满分 {{ work.maxScore }} 分
          </text>
        </view>
        <view class="score-track">
          <view
            class="score-fill"
            :style="{ width: scorePct + '%', background: scoreColor }"
          />
        </view>
        <view class="score-scale">
          <text>0</text>
          <text>60及格</text>
          <text>100</text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view
      v-if="work?.canResubmit"
      class="bottom-bar"
    >
      <button
        class="btn-resubmit"
        @click="handleResubmit"
      >
        🔄 重新提交
      </button>
    </view>

    <!-- 图片预览 -->
    <view
      v-if="previewIndex !== null && work?.images?.length"
      class="image-preview-overlay"
      @click="previewIndex = null"
    >
      <image
        :src="work.images[previewIndex]"
        class="preview-full"
        mode="widthFix"
        @click.stop
      />
      <view class="preview-nav">
        <text
          class="preview-nav-btn"
          @click.stop="prevImage"
        >
          ‹
        </text>
        <text class="preview-counter">
          {{ previewIndex + 1 }}/{{ work.images.length }}
        </text>
        <text
          class="preview-nav-btn"
          @click.stop="nextImage"
        >
          ›
        </text>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="detail"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const work = ref<any>(null)
const previewIndex = ref<number | null>(null)

const scoreColor = computed(() => {
  if (!work.value?.score || !work.value?.maxScore) return '#999'
  const pct = work.value.score / work.value.maxScore
  if (pct >= 0.9) return '#52C41A'
  if (pct >= 0.7) return '#4A90D9'
  if (pct >= 0.6) return '#F59E0B'
  return '#C41E3A'
})

const scorePct = computed(() => {
  if (!work.value?.score || !work.value?.maxScore) return 0
  return (work.value.score / work.value.maxScore) * 100
})

const statusEmoji = computed(() => {
  const map: Record<string, string> = { pending: '⏳', graded: '✅', returned: '⚠️' }
  return map[work.value?.status || ''] || '📝'
})

const statusText = computed(() => {
  const map: Record<string, string> = { pending: '批改中', graded: '已批改', returned: '已退回' }
  return map[work.value?.status || ''] || work.value?.status || ''
})

function getWorkId(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.id || page?.options?.workId || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  const id = getWorkId()
  if (!id) { loading.value = false; return }
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const pages = getCurrentPages()
    const opts = (pages[pages.length - 1] as any)?.options || {}
    const courseId = opts.courseId || ''

    if (courseId) {
      const res: any = await api.courseApi.getWorks(courseId).catch(() => ({}))
      const works = Array.isArray(res) ? res : res?.data || res?.list || []
      work.value = works.find((w: any) => w.id === id) || null
    }

    // Mock fallback
    if (!work.value) {
      work.value = {
        id,
        courseTitle: '八字命理入门精讲',
        chapterTitle: '第一章：八字基础入门',
        status: 'graded',
        score: 85,
        maxScore: 100,
        content: '通过本章学习，我对八字命理有了初步的认识。八字由年柱、月柱、日柱、时柱组成，每柱包含一个天干和一个地支。',
        submittedAt: '2024-01-15 14:30',
        teacherComment: '作业完成得很好！对八字的基本概念理解准确。',
        suggestions: ['建议补充五行生克关系的说明', '可以尝试分析自己的八字加深理解'],
        gradedAt: '2024-01-16 09:15',
        gradedBy: { id: 't1', name: '周易大师', avatar: '' },
        images: [],
        canResubmit: true,
      }
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleResubmit() {
  uni.navigateTo({ url: `/pages/courses/editor?chapterId=${work.value?.chapterId || ''}` })
}

function prevImage() {
  if (previewIndex.value !== null && work.value?.images?.length) {
    previewIndex.value = (previewIndex.value - 1 + work.value.images.length) % work.value.images.length
  }
}

function nextImage() {
  if (previewIndex.value !== null && work.value?.images?.length) {
    previewIndex.value = (previewIndex.value + 1) % work.value.images.length
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; border-bottom: 1rpx solid #E8E0D5; position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-spacer { width: 44rpx; }

.scroll-area { padding: 24rpx; padding-bottom: 120rpx; }

.status-card { border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.status-pending { background: rgba(245,158,11,0.08); }
.status-graded { background: rgba(82,196,26,0.08); }
.status-returned { background: rgba(196,30,58,0.06); }
.status-row { display: flex; gap: 16rpx; }
.status-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.status-icon-pending { background: rgba(245,158,11,0.15); }
.status-icon-graded { background: rgba(82,196,26,0.15); }
.status-icon-returned { background: rgba(196,30,58,0.1); }
.status-emoji { font-size: 36rpx; }
.status-info { flex: 1; }
.status-title-row { display: flex; align-items: center; gap: 12rpx; }
.status-title { font-size: 30rpx; font-weight: 600; }
.status-color-pending { color: #F59E0B; }
.status-color-graded { color: #52C41A; }
.status-color-returned { color: #C41E3A; }
.status-score { font-size: 36rpx; font-weight: bold; }
.status-max { font-size: 20rpx; font-weight: normal; color: #999; }
.status-course { font-size: 22rpx; color: #666; margin-top: 4rpx; display: block; }
.status-waiting { margin-top: 16rpx; padding: 16rpx; background: rgba(255,255,255,0.6); border-radius: 12rpx; display: flex; align-items: center; gap: 12rpx; }
.waiting-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #F59E0B; animation: pulse-dot 1.5s infinite; }
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.waiting-text { font-size: 22rpx; color: #F59E0B; }

.section-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.section-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #E8E0D5; }
.section-icon { font-size: 28rpx; }
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; flex: 1; }
.section-date { font-size: 20rpx; color: #999; }

.teacher-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.teacher-avatar-wrap { width: 64rpx; height: 64rpx; border-radius: 50%; overflow: hidden; }
.teacher-avatar { width: 100%; height: 100%; }
.teacher-avatar-placeholder { font-size: 40rpx; }
.teacher-info { flex: 1; }
.teacher-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.teacher-date { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.teacher-comment { font-size: 24rpx; color: #333; line-height: 1.8; white-space: pre-wrap; display: block; }

.suggestions-box { margin-top: 20rpx; padding: 20rpx; background: rgba(196,30,58,0.04); border-radius: 12rpx; }
.suggestions-title { font-size: 22rpx; font-weight: 500; color: #C41E3A; display: block; margin-bottom: 8rpx; }
.suggestion-item { font-size: 22rpx; color: #C41E3A; display: block; padding: 4rpx 0; }

.submit-content { font-size: 24rpx; color: #333; line-height: 1.8; white-space: pre-wrap; display: block; }
.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 20rpx; }
.submit-image { width: 100%; aspect-ratio: 1; border-radius: 12rpx; background: #F5F0E8; }

.score-hero { text-align: center; padding: 24rpx 0; }
.score-big { font-size: 80rpx; font-weight: bold; display: block; line-height: 1; }
.score-max { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; }
.score-track { height: 12rpx; background: #E8E0D5; border-radius: 6rpx; overflow: hidden; margin-top: 20rpx; }
.score-fill { height: 100%; border-radius: 6rpx; transition: width 0.5s; }
.score-scale { display: flex; justify-content: space-between; font-size: 18rpx; color: #ccc; margin-top: 4rpx; }

.bottom-spacer { height: 40rpx; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 40rpx; background: #fff; border-top: 1rpx solid #E8E0D5; }
.btn-resubmit { width: 100%; height: 88rpx; background: linear-gradient(135deg, #C41E3A, #E74C3C); color: #fff; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; border: none; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }

.image-preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.preview-full { max-width: 90vw; max-height: 70vh; border-radius: 12rpx; }
.preview-nav { position: absolute; bottom: 80rpx; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 24rpx; }
.preview-nav-btn { font-size: 44rpx; color: #fff; width: 64rpx; height: 64rpx; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.preview-counter { font-size: 24rpx; color: #fff; }
</style>
