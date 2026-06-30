<script setup lang="ts">
/** 课程结业证书页 - 从原型 app/courses/certificate/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import { courseApi } from '@/lib/course-data'

const loading = ref(true)
const error = ref('')
const courseId = ref('')

const cert = ref<any>(null)

const dateStr = computed(() => cert.value?.completedAt ?? '')

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await courseApi.getCertificate(courseId.value)
    cert.value = res
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options: any) => {
  courseId.value = options?.id || '1'
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
      <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#ffffff" /></view>
      <text class="nav-title">结业证书</text>
      <view class="nav-right" />
    </view>

    <!-- 恭喜提示 -->
    <view class="congrats-wrap">
      <view class="congrats">
        <app-icon name="check-circle" :size="32" color="#C9A96E" />
        <text class="congrats-txt">恭喜您完成课程学习！</text>
      </view>
    </view>

    <!-- 证书展示（产品中由 canvas 生成图填充；比对时图片被中和露出底色） -->
    <view class="cert-area">
      <view class="cert-card">
        <view class="cert-inner">
          <view class="cert-badge"><text class="cert-star">★</text></view>
          <text class="cert-title">结业证书</text>
          <text class="cert-en">CERTIFICATE OF COMPLETION</text>
          <text class="cert-name">{{ cert.studentName }}</text>
          <text class="cert-desc">已完成</text>
          <text class="cert-course">《{{ cert.courseName }}》</text>
          <text class="cert-hours">全部课程学习，共计 {{ cert.totalHours }} 学时</text>
          <text v-if="cert.score" class="cert-score">综合评分：{{ cert.score }} 分</text>
          <view class="cert-divider" />
          <view class="cert-foot">
            <view class="cert-foot-col left">
              <text class="cert-foot-label">授课讲师</text>
              <text class="cert-foot-val italic">{{ cert.instructor }}</text>
            </view>
            <view class="cert-foot-col right">
              <text class="cert-foot-label">颁发日期</text>
              <text class="cert-foot-val">{{ fmtDate(dateStr) }}</text>
            </view>
          </view>
          <text class="cert-no">证书编号：{{ cert.certificateNo }}</text>
          <text class="cert-platform">热卜国学</text>
        </view>
      </view>
    </view>

    <!-- 证书信息 -->
    <view class="info-card">
      <view class="info-grid">
        <view class="info-item">
          <app-icon name="user" :size="28" color="#C9A96E" />
          <text class="info-label">学员：</text>
          <text class="info-val">{{ cert.studentName }}</text>
        </view>
        <view class="info-item">
          <app-icon name="clock" :size="28" color="#C9A96E" />
          <text class="info-label">学时：</text>
          <text class="info-val">{{ cert.totalHours }}小时</text>
        </view>
        <view class="info-item">
          <app-icon name="calendar" :size="28" color="#C9A96E" />
          <text class="info-label">日期：</text>
          <text class="info-val">{{ fmtDate(dateStr) }}</text>
        </view>
        <view class="info-item">
          <app-icon name="qr-code" :size="28" color="#C9A96E" />
          <text class="info-label">编号：</text>
          <text class="info-val small">{{ cert.certificateNo }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="actions">
      <view class="btn-primary">
        <app-icon name="download" :size="40" color="#ffffff" />
        <text class="btn-primary-txt">保存到相册</text>
      </view>
      <view class="btn-secondary">
        <app-icon name="share-2" :size="40" color="#ffffff" />
        <text class="btn-secondary-txt">分享给好友</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(to bottom, #1a1a2e, #16213e); display: flex; flex-direction: column; }

.nav { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.nav-back { width: 80rpx; height: 80rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 30rpx; font-weight: 500; color: #fff; }
.nav-right { width: 80rpx; }

.congrats-wrap { padding: 16rpx 32rpx; text-align: center; }
.congrats { display: inline-flex; align-items: center; gap: 16rpx; padding: 16rpx 32rpx; border-radius: 999rpx; background: linear-gradient(to right, rgba(201,169,110,0.2), rgba(196,30,58,0.2)); }
.congrats-txt { font-size: 26rpx; color: #C9A96E; }

.cert-area { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32rpx; }
.cert-card { width: 100%; max-width: 670rpx; aspect-ratio: 3 / 4; background: linear-gradient(to bottom, #FDF8F3, #F5EDE4); border: 6rpx solid #C9A96E; border-radius: 16rpx; box-shadow: 0 24rpx 64rpx rgba(0,0,0,0.5); padding: 20rpx; }
.cert-inner { width: 100%; height: 100%; border: 2rpx solid #E8D5B5; border-radius: 8rpx; display: flex; flex-direction: column; align-items: center; padding: 32rpx 40rpx; }
.cert-badge { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; margin-top: 8rpx; }
.cert-star { font-size: 40rpx; color: #fff; }
.cert-title { font-size: 48rpx; font-weight: 700; color: var(--brand); margin-top: 24rpx; font-family: serif; }
.cert-en { font-size: 18rpx; color: #999; margin-top: 8rpx; letter-spacing: 1rpx; }
.cert-name { font-size: 44rpx; font-weight: 700; color: #2C2C2C; margin-top: 40rpx; }
.cert-desc { font-size: 24rpx; color: #666; margin-top: 24rpx; }
.cert-course { font-size: 32rpx; font-weight: 700; color: var(--brand); margin-top: 16rpx; font-family: serif; }
.cert-hours { font-size: 22rpx; color: #666; margin-top: 16rpx; }
.cert-score { font-size: 28rpx; font-weight: 700; color: #C9A96E; margin-top: 16rpx; }
.cert-divider { width: 80%; height: 1rpx; background: #E8D5B5; margin: 32rpx 0; }
.cert-foot { width: 100%; display: flex; justify-content: space-between; }
.cert-foot-col { display: flex; flex-direction: column; gap: 8rpx; }
.cert-foot-col.right { align-items: flex-end; }
.cert-foot-label { font-size: 20rpx; color: #666; }
.cert-foot-val { font-size: 26rpx; color: #2C2C2C; }
.cert-foot-val.italic { font-style: italic; font-family: serif; }
.cert-no { font-size: 18rpx; color: #999; margin-top: 24rpx; }
.cert-platform { font-size: 22rpx; font-weight: 700; color: var(--brand); margin-top: 12rpx; }

.info-card { margin: 0 32rpx 32rpx; padding: 24rpx 32rpx; background: rgba(255,255,255,0.05); border-radius: 24rpx; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32rpx; }
.info-item { display: flex; align-items: center; gap: 12rpx; }
.info-label { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.info-val { font-size: 26rpx; color: #fff; }
.info-val.small { font-size: 22rpx; }

.actions { padding: 32rpx; padding-bottom: 64rpx; display: flex; flex-direction: column; gap: 24rpx; }
.btn-primary { height: 96rpx; border-radius: 999rpx; background: linear-gradient(to right, var(--brand), #E74C3C); display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.btn-primary-txt { font-size: 30rpx; font-weight: 500; color: #fff; }
.btn-secondary { height: 96rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.btn-secondary-txt { font-size: 30rpx; font-weight: 500; color: #fff; }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
