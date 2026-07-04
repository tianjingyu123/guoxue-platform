<template>
  <view class="page">
    <!-- 庆祝动画背景 -->
    <view v-if="showConfetti" class="confetti">
      <view
        v-for="i in 24"
        :key="i"
        class="confetti-item"
        :class="'c' + (i % 3)"
        :style="confettiStyle(i)"
      >
        <app-icon name="sparkles" :size="16" :color="confettiColor(i)" />
      </view>
    </view>

    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
      </view>
      <text class="nav-title">学习完成</text>
      <view class="nav-spacer" />
    </view>

    <scroll-view scroll-y class="content" :style="{ height: scrollHeight + 'px' }">
      <view class="body">
        <!-- 成就展示卡 -->
        <view class="achieve-card">
          <view class="achieve-header">
            <view class="deco deco1" />
            <view class="deco deco2" />
            <view class="deco deco3" />
            <view class="achieve-icon">
              <view class="achieve-icon-ping" />
              <view class="achieve-icon-inner">
                <app-icon name="award" :size="48" color="#fff" />
              </view>
            </view>
            <text class="achieve-title">恭喜你完成学习！</text>
            <text class="achieve-course">《{{ courseData.title }}》</text>
          </view>
          <view class="achieve-stats">
            <view class="stat">
              <app-icon name="clock" :size="16" color="#c41e3a" />
              <text class="stat-value">{{ formatDuration(courseData.totalDuration) }}</text>
              <text class="stat-label">总学习时长</text>
            </view>
            <view class="stat stat-border">
              <app-icon name="book-open" :size="16" color="#b48a3c" />
              <text class="stat-value">{{ courseData.chaptersCount }}节</text>
              <text class="stat-label">完成章节</text>
            </view>
            <view class="stat">
              <app-icon name="zap" :size="16" color="#eab308" />
              <text class="stat-value">+{{ courseData.earnedPoints }}</text>
              <text class="stat-label">获得积分</text>
            </view>
          </view>
        </view>

        <!-- 结业证书入口 -->
        <view v-if="courseData.hasCertificate" class="cert-entry" @tap="showCert = true">
          <view class="cert-icon">
            <app-icon name="award" :size="28" color="#b48a3c" />
          </view>
          <view class="cert-info">
            <text class="cert-title">结业证书已生成</text>
            <text class="cert-desc">点击查看并保存你的专属证书</text>
          </view>
          <app-icon name="chevron-right" :size="20" color="#ccc" />
        </view>

        <!-- 评价邀请区 -->
        <view class="rate-card">
          <text class="rate-title">为课程评分</text>
          <block v-if="!isSubmitted">
            <view class="stars">
              <view
                v-for="star in 5"
                :key="star"
                class="star-btn"
                @tap="rating = star"
              >
                <app-icon
                  name="star"
                  :size="32"
                  :color="rating >= star ? '#facc15' : '#ddd'"
                  :fill="rating >= star ? '#facc15' : 'none'"
                />
              </view>
            </view>
            <text class="rate-tip">{{ ratingTip }}</text>
            <textarea
              v-model="review"
              class="rate-input"
              placeholder="分享你的学习感受...（选填）"
              placeholder-class="ph"
            />
            <view class="rate-submit" :class="{ disabled: rating === 0 || isSubmitting }" @tap="handleSubmitReview">
              <text class="rate-submit-text">{{ isSubmitting ? '提交中...' : '提交评价' }}</text>
            </view>
          </block>
          <view v-else class="rate-done">
            <view class="rate-done-icon">
              <app-icon name="check" :size="32" color="#22c55e" />
            </view>
            <text class="rate-done-title">感谢你的评价！</text>
            <text class="rate-done-desc">你的反馈将帮助更多学员</text>
          </view>
        </view>

        <!-- 进阶推荐区 -->
        <view class="recommend">
          <view class="recommend-head">
            <text class="recommend-title">学完这门课的人还学了</text>
            <text class="recommend-more" @tap="navigateTo('/courses')">更多课程</text>
          </view>
          <scroll-view scroll-x class="recommend-scroll">
            <view class="recommend-row">
              <view
                v-for="course in recommendedCourses"
                :key="course.id"
                class="rec-card"
                @tap="navigateTo('/course/' + course.id)"
              >
                <view class="rec-cover">
                  <app-icon name="book-open" :size="32" color="rgba(180,138,60,0.6)" />
                  <view class="rec-level">
                    <text class="rec-level-text">{{ course.level }}</text>
                  </view>
                </view>
                <view class="rec-info">
                  <text class="rec-name">{{ course.title }}</text>
                  <text class="rec-instructor">{{ course.instructor }}</text>
                  <view class="rec-bottom">
                    <text class="rec-price">¥{{ course.price }}</text>
                    <text class="rec-students">{{ course.students }}人学习</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 讲师感谢卡片 -->
        <view class="thanks-card">
          <view class="thanks-avatar">
            <text class="thanks-avatar-text">{{ courseData.instructor[0] }}</text>
          </view>
          <view class="thanks-info">
            <text class="thanks-from">来自讲师 {{ courseData.instructor }}</text>
            <text class="thanks-msg">感谢你的学习，期待下次相见！</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="footer-btn footer-secondary" @tap="reLaunch('/')">
        <text class="footer-secondary-text">返回首页</text>
      </view>
      <view class="footer-btn footer-primary" @tap="showCert = true">
        <app-icon name="share-2" :size="16" color="#fff" />
        <text class="footer-primary-text">分享成就</text>
      </view>
    </view>

    <!-- 内联结业证书弹窗 -->
    <view v-if="showCert" class="cert-mask" @tap="showCert = false">
      <view class="cert-modal" @tap.stop>
        <view class="cert-paper">
          <view class="cert-paper-head">
            <app-icon name="award" :size="40" color="#b48a3c" />
            <text class="cert-paper-title">结业证书</text>
            <text class="cert-paper-sub">CERTIFICATE OF COMPLETION</text>
          </view>
          <text class="cert-name">{{ certData.userName }}</text>
          <text class="cert-line">恭喜您完成</text>
          <text class="cert-subject">《{{ certData.subject }}》</text>
          <view class="cert-stats">
            <view v-for="(s, i) in certData.stats" :key="i" class="cert-stat">
              <text class="cert-stat-value">{{ s.value }}</text>
              <text class="cert-stat-label">{{ s.label }}</text>
            </view>
          </view>
          <text class="cert-comment">{{ certData.aiComment }}</text>
          <view class="cert-foot">
            <text class="cert-foot-text">讲师：{{ certData.instructor }}</text>
            <text class="cert-foot-text">证书编号：{{ certData.serialNo }}</text>
            <text class="cert-foot-text">颁发日期：{{ certData.date }}</text>
          </view>
        </view>
        <view class="cert-actions">
          <view class="cert-action cert-action-save" @tap="onSaveCert">
            <app-icon name="download" :size="16" color="#c41e3a" />
            <text class="cert-action-save-text">保存证书</text>
          </view>
          <view class="cert-action cert-action-more" @tap="onCertMore">
            <text class="cert-action-more-text">查看更多课程</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo, reLaunch } from '@/utils/router'
import { BRAND } from '@/lib/brand'

const statusBarHeight = ref(20)
const safeBottom = ref(0)
const scrollHeight = ref(600)

const rating = ref(0)
const review = ref('')
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const showConfetti = ref(true)
const showCert = ref(false)

const courseData = ref({
  id: 1,
  title: '八字入门实战课',
  instructor: '周易大师',
  completedAt: '2026-05-10',
  totalDuration: 1860,
  chaptersCount: 24,
  earnedPoints: 500,
  hasCertificate: true,
})

const recommendedCourses = [
  { id: 2, title: '八字进阶实战课', instructor: '周易大师', price: 399, students: 1024, level: '进阶' },
  { id: 3, title: '紫微斗数精讲', instructor: '张玄风', price: 299, students: 856, level: '入门' },
  { id: 4, title: '八字看婚姻专题', instructor: '周易大师', price: 199, students: 628, level: '专题' },
]

const ratingTip = computed(() => {
  const map = ['点击星星评分', '很不满意', '不太满意', '一般', '比较满意', '非常满意']
  return map[rating.value]
})

const certData = computed(() => ({
  userName: '周明远',
  subject: courseData.value.title,
  date: courseData.value.completedAt,
  stats: [
    { label: '学习时长', value: `${Math.floor(courseData.value.totalDuration / 60)}h` },
    { label: '完成章节', value: `${courseData.value.chaptersCount}节` },
    { label: '获得积分', value: `${courseData.value.earnedPoints}` },
  ],
  aiComment: `在${BRAND.name}完成了《${courseData.value.title}》，探寻东方智慧的旅程，刚刚开始。`,
  serialNo: `RB${courseData.value.completedAt.replace(/-/g, '')}${String(courseData.value.id).padStart(2, '0')}`,
  instructor: courseData.value.instructor,
}))

onLoad((options) => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    safeBottom.value = (info.safeAreaInsets && info.safeAreaInsets.bottom) || 0
    scrollHeight.value = info.windowHeight - (statusBarHeight.value + 44) - 64 - safeBottom.value
  } catch (e) {
    // ignore
  }
  if (options && options.id) {
    courseData.value.id = Number(options.id) || courseData.value.id
  }
  setTimeout(() => {
    showConfetti.value = false
  }, 3000)
})

function confettiStyle(i: number) {
  const left = (i * 37) % 100
  const delay = (i % 5) * 0.4
  const dur = 2 + (i % 4) * 0.5
  return {
    left: left + '%',
    animationDelay: delay + 's',
    animationDuration: dur + 's',
  }
}
function confettiColor(i: number) {
  return i % 3 === 0 ? '#c41e3a' : i % 3 === 1 ? '#b48a3c' : '#facc15'
}
function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
}
async function handleSubmitReview() {
  if (rating.value === 0 || isSubmitting.value) return
  isSubmitting.value = true
  await new Promise((resolve) => setTimeout(resolve, 1000))
  isSubmitting.value = false
  isSubmitted.value = true
}
function onSaveCert() {
  uni.showToast({ title: '证书已保存到相册', icon: 'success' })
}
function onCertMore() {
  showCert.value = false
  navigateTo('/courses')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f7f8;
  display: flex;
  flex-direction: column;
}
.confetti {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
  overflow: hidden;
}
.confetti-item {
  position: absolute;
  top: -10%;
  animation: fall linear infinite;
}
@keyframes fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(120vh) rotate(360deg);
    opacity: 0.2;
  }
}
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1rpx solid #eee;
}
.nav-back,
.nav-spacer {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.content {
  flex: 1;
}
.body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.achieve-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}
.achieve-header {
  position: relative;
  padding: 24px;
  text-align: center;
  background: linear-gradient(135deg, var(--brand), #d94b60, #b48a3c);
}
.deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}
.deco1 {
  top: 16px;
  left: 16px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
}
.deco2 {
  top: 32px;
  right: 24px;
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
}
.deco3 {
  bottom: 16px;
  left: 32px;
  width: 24px;
  height: 24px;
}
.achieve-icon {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto 16px;
}
.achieve-icon-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes ping {
  75%,
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
.achieve-icon-inner {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.achieve-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}
.achieve-course {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}
.achieve-stats {
  display: flex;
}
.stat {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.stat-border {
  border-left: 1rpx solid #eee;
  border-right: 1rpx solid #eee;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.stat-label {
  font-size: 12px;
  color: #888;
}
.cert-entry {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(90deg, rgba(180, 138, 60, 0.1), rgba(180, 138, 60, 0.03), transparent);
  border: 1rpx solid rgba(180, 138, 60, 0.3);
  border-radius: 16px;
}
.cert-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(180, 138, 60, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cert-info {
  flex: 1;
}
.cert-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.cert-desc {
  font-size: 13px;
  color: #888;
  margin-top: 2px;
}
.rate-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
}
.rate-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}
.stars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}
.star-btn {
  padding: 4px;
}
.rate-tip {
  display: block;
  text-align: center;
  font-size: 14px;
  color: #888;
  margin-bottom: 16px;
}
.rate-input {
  width: 100%;
  height: 72px;
  padding: 12px;
  background: #f0f0f0;
  border-radius: 12px;
  font-size: 14px;
  color: #1a1a1a;
  box-sizing: border-box;
}
.ph {
  color: #aaa;
}
.rate-submit {
  margin-top: 16px;
  height: 48px;
  background: var(--brand);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rate-submit.disabled {
  background: #ececec;
}
.rate-submit-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}
.rate-submit.disabled .rate-submit-text {
  color: #aaa;
}
.rate-done {
  text-align: center;
  padding: 24px 0;
}
.rate-done-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}
.rate-done-title {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}
.rate-done-desc {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}
.recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.recommend-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.recommend-more {
  font-size: 12px;
  color: var(--brand);
}
.recommend-scroll {
  white-space: nowrap;
}
.recommend-row {
  display: flex;
  gap: 12px;
}
.rec-card {
  width: 176px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
.rec-cover {
  position: relative;
  height: 132px;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(180, 138, 60, 0.1), #ececec);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rec-level {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 6px;
  background: rgba(180, 138, 60, 0.9);
  border-radius: 4px;
}
.rec-level-text {
  font-size: 10px;
  color: #fff;
}
.rec-info {
  padding: 12px;
}
.rec-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rec-instructor {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  display: block;
}
.rec-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.rec-price {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand);
}
.rec-students {
  font-size: 10px;
  color: #888;
}
.thanks-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
}
.thanks-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.thanks-avatar-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--brand);
}
.thanks-info {
  flex: 1;
}
.thanks-from {
  font-size: 13px;
  color: #888;
  display: block;
}
.thanks-msg {
  font-size: 14px;
  color: #1a1a1a;
  margin-top: 2px;
}
.footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1rpx solid #eee;
}
.footer-btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.footer-secondary {
  background: #f0f0f0;
}
.footer-secondary-text {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}
.footer-primary {
  background: var(--brand);
}
.footer-primary-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}
.cert-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.cert-modal {
  width: 100%;
  max-width: 640rpx;
}
.cert-paper {
  background: linear-gradient(160deg, #fffdf7, #fdf6e8);
  border: 2rpx solid rgba(180, 138, 60, 0.4);
  border-radius: 16px;
  padding: 28px 24px;
  text-align: center;
}
.cert-paper-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
}
.cert-paper-title {
  font-size: 20px;
  font-weight: 700;
  color: #b48a3c;
  margin-top: 4px;
}
.cert-paper-sub {
  font-size: 10px;
  letter-spacing: 2px;
  color: #b48a3c;
}
.cert-name {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}
.cert-line {
  font-size: 13px;
  color: #666;
}
.cert-subject {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--brand);
  margin: 8px 0 16px;
}
.cert-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  border-top: 1rpx solid rgba(180, 138, 60, 0.2);
  border-bottom: 1rpx solid rgba(180, 138, 60, 0.2);
  margin-bottom: 16px;
}
.cert-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cert-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.cert-stat-label {
  font-size: 12px;
  color: #888;
}
.cert-comment {
  display: block;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  font-style: italic;
  margin-bottom: 16px;
}
.cert-foot {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cert-foot-text {
  font-size: 11px;
  color: #999;
}
.cert-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.cert-action {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.cert-action-save {
  background: #fff;
  border: 1rpx solid var(--brand);
}
.cert-action-save-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--brand);
}
.cert-action-more {
  background: var(--brand);
}
.cert-action-more-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}
</style>
