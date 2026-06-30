<script setup lang="ts">
/** 作业提交页 - 从原型 app/courses/work-submit/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import { courseApi } from '@/lib/course-data'

const loading = ref(true)
const error = ref('')
const chapterId = ref('')

// 作业要求详情对象，模板 v-else 裸访问字段，保留 any 避免 null 链式报错
const requirement = ref<any>(null)

const content = ref('')
const images = ref<string[]>([])

const wordCount = computed(() => content.value.length)
const canSubmit = computed(() => wordCount.value >= (requirement.value?.minWords ?? 0))

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}
// 选图/提交为交互行为，交付时接 uploadApi/submitWork
function onAddImage() {}
function onSubmit() {}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await courseApi.getWorkRequirement(chapterId.value)
    requirement.value = res
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  chapterId.value = options?.chapterId || options?.id || '1'
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <!-- Loading -->
  <view v-if="loading" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>
  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="36" color="#2C2C2C" /></view>
      <text class="nav-title">提交作业</text>
      <view class="nav-ph" />
    </view>

    <view class="body">
      <!-- 作业信息卡片 -->
      <view class="card">
        <view class="info-row">
          <view class="info-ico"><app-icon name="file-text" :size="36" color="#C41E3A" /></view>
          <view class="info-main">
            <text class="info-title">{{ requirement.title }}</text>
            <text class="info-sub">{{ requirement.courseTitle }} · {{ requirement.chapterTitle }}</text>
            <view v-if="requirement.deadline" class="info-ddl">
              <app-icon name="clock" :size="26" color="#FF6B35" />
              <text class="info-ddl-txt">截止时间：{{ requirement.deadline }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 作业要求 -->
      <view class="card">
        <view class="sec-title">
          <app-icon name="alert-circle" :size="30" color="#C9A96E" />
          <text class="sec-title-txt">作业要求</text>
        </view>
        <text class="req-desc">{{ requirement.description }}</text>
      </view>

      <!-- 文字输入区 -->
      <view class="card np">
        <textarea
          v-model="content"
          class="ta"
          placeholder="请在此输入你的作业内容..."
          placeholder-class="ta-ph"
          :maxlength="-1"
        />
        <view class="ta-foot">
          <text class="ta-count" :class="{ warn: wordCount < requirement.minWords }">
            {{ wordCount }}/{{ requirement.minWords }}字（最少）
          </text>
        </view>
      </view>

      <!-- 图片上传区 -->
      <view class="card">
        <view class="sec-title">
          <app-icon name="image" :size="30" color="#C9A96E" />
          <text class="sec-title-txt">添加图片</text>
          <text class="sec-title-sub">（{{ images.length }}/{{ requirement.maxImages }}）</text>
        </view>
        <view class="img-grid">
          <view v-for="(url, index) in images" :key="index" class="img-cell">
            <image lazy-load class="img-thumb" :src="url" mode="aspectFill" />
            <view class="img-del" @tap="removeImage(index)"><app-icon name="x" :size="22" color="#ffffff" /></view>
          </view>
          <view v-if="images.length < requirement.maxImages" class="img-add" @tap="onAddImage">
            <app-icon name="image-plus" :size="44" color="#999999" />
            <text class="img-add-txt">添加图片</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部提交按钮 -->
    <view class="submit-bar">
      <view class="submit-btn" :class="{ disabled: !canSubmit }" @tap="canSubmit && onSubmit()">
        <app-icon name="send" :size="36" :color="canSubmit ? '#ffffff' : '#999999'" />
        <text class="submit-txt" :class="{ disabled: !canSubmit }">提交作业</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 192rpx; }

.nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; height: 96rpx; padding: 0 32rpx; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.nav-back { padding: 8rpx; margin-left: -8rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-ph { width: 48rpx; }

.body { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.04); border: 1rpx solid #E8E3DB; }
.card.np { padding: 0; overflow: hidden; }

.info-row { display: flex; align-items: flex-start; gap: 24rpx; }
.info-ico { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.info-main { flex: 1; min-width: 0; }
.info-title { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 8rpx; }
.info-sub { display: block; font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.info-ddl { display: flex; align-items: center; gap: 8rpx; }
.info-ddl-txt { font-size: 24rpx; color: #FF6B35; }

.sec-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.sec-title-txt { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.sec-title-sub { font-size: 24rpx; font-weight: 400; color: #999; }
.req-desc { font-size: 26rpx; color: #666; line-height: 1.7; white-space: pre-line; }

.ta { width: 100%; height: 384rpx; padding: 32rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; background: transparent; }
.ta-ph { color: #CCC; }
.ta-foot { padding: 16rpx 32rpx; border-top: 1rpx solid #E8E3DB; display: flex; align-items: center; justify-content: space-between; }
.ta-count { font-size: 24rpx; color: #999; }
.ta-count.warn { color: #FF6B35; }

.img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.img-cell { position: relative; aspect-ratio: 1; border-radius: 16rpx; overflow: hidden; background: #F5F0E8; }
.img-thumb { width: 100%; height: 100%; }
.img-del { position: absolute; top: 8rpx; right: 8rpx; width: 40rpx; height: 40rpx; background: rgba(0,0,0,0.6); border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.img-add { aspect-ratio: 1; border-radius: 16rpx; border: 4rpx dashed #E8E3DB; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.img-add-txt { font-size: 20rpx; color: #999; }

.submit-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.submit-btn { height: 96rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; background: linear-gradient(to right, var(--brand), #E74C3C); box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.submit-btn.disabled { background: #E8E3DB; box-shadow: none; }
.submit-txt { font-size: 30rpx; font-weight: 600; color: #fff; }
.submit-txt.disabled { color: #999; }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
