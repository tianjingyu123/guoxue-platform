<script setup lang="ts">
/**
 * P4 我的学习（学习中心）— 已购用户的家，被「接着学」驱动
 * 视觉：V0 阶段二视觉稿 p4-my-learning.html / p4-my-learning-states.html
 * 合并：原 learn（课程学习中心）+ study-plan（学习计划）能力并入本页
 * 真连：courseApi.getStudyPlan() → 从已购课 + 进度派生（在学课程/已完成/连续学习），需登录
 *   - 顶部数据条：连续学习 streak（真实）/ 已学课时（各课程 completedLessons 累加，真实）/ 已完成门数（进度满 100%，真实）
 *   - 在学课程：进度 <100% 的课，按 order 排序，逐课时进度真连
 *   - 已完成：进度 100% 的课，带「查看证书」入口
 * 说明：全局「累计学习小时」后端暂无该看板字段 → 中格诚实降级为「已学 X 节」（各课程已完成课时累加，真实可计），不臆造时长
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { courseApi, type PlannedCourse } from '@/lib/course-data'

// 自定义导航状态栏高度
const statusBarHeight = ref(0)

const loading = ref(true)
const error = ref('')

// 学习计划中的课程（已购 + 进度派生），模板裸访问字段用具体类型
const courses = ref<PlannedCourse[]>([])
// 连续学习天数（真实）
const streak = ref(0)
// 已完成区块折叠态（默认展开）
const doneExpanded = ref(true)

// 完成判定：已购且进度 100%
function isDone(c: PlannedCourse) { return c.totalLessons > 0 && c.completedLessons >= c.totalLessons }
function coursePct(c: PlannedCourse) { return c.totalLessons > 0 ? Math.round((c.completedLessons / c.totalLessons) * 100) : 0 }

// 在学课程：进度 <100%，按 order 排序
const learningCourses = computed(() => courses.value.filter((c) => !isDone(c)).sort((a, b) => a.order - b.order))
// 已完成课程
const doneCourses = computed(() => courses.value.filter((c) => isDone(c)))

// 顶部三格数据（全部真实可计）
const doneCount = computed(() => doneCourses.value.length)
// 已学课时 = 各课程已完成课时累加（后端无全局累计学习小时看板字段，此为诚实可计的等价指标）
const learnedLessons = computed(() => courses.value.reduce((s, c) => s + c.completedLessons, 0))

// 空态：无任何已购课程
const isEmpty = computed(() => courses.value.length === 0)

function toEnrolledSame(c: PlannedCourse) {
  // 整卡 / 继续学 → 学习中心（播放页续播位置由播放页据进度定位）
  navigateTo(`/courses/${c.courseId}/player`)
}
function viewCertificate(c: PlannedCourse) { navigateTo(`/courses/${c.courseId}/certificate`) }
function goExplore() { navigateTo('/course/home') }
function goFavorites() { navigateTo('/mine/browse-history') }
function goReviews() { navigateTo('/mine/my-comments') }
function goWorks() { navigateTo('/mine/submissions') }

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await courseApi.getStudyPlan()
    courses.value = res.courses
    streak.value = res.streak
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onShow(() => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
  loadData()
})
</script>

<template>
  <view class="page">
    <!-- ══ 顶部导航 ══ -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" hover-class="btn-press" @tap="goBack">
        <app-icon name="arrow-left" :size="34" color="#2C2C2C" />
      </view>
      <text class="nav-title serif">我的学习</text>
    </view>

    <!-- ══ Error 态 ══ -->
    <view v-if="error" class="state-wrap">
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" hover-class="btn-press" @tap="loadData"><text class="retry-text">重试</text></view>
    </view>

    <!-- ══ Loading 骨架屏（对应正常态结构：数据条 / 标题 / 在学卡×2 / 标题 / 次入口）══ -->
    <view v-else-if="loading" class="body-pad">
      <view class="sk sk-stats" />
      <view class="sk sk-title" />
      <view class="sk sk-hcard" />
      <view class="sk sk-hcard" />
      <view class="sk sk-title" />
      <view class="sk sk-hcard" />
      <view class="sk sk-entries" />
    </view>

    <!-- ══ 空态（无任何已购课程）══ -->
    <view v-else-if="isEmpty" class="empty">
      <view class="empty-illus">
        <app-icon name="book-open" :size="52" color="#C9A96E" />
      </view>
      <text class="empty-title serif">开始你的国学之旅</text>
      <text class="empty-desc">还没有课程，去发现感兴趣的{{ '\n' }}易学与国学好课吧</text>
      <view class="empty-btn" hover-class="btn-press" @tap="goExplore">
        <text class="empty-btn-txt">去逛逛课程</text>
      </view>
    </view>

    <!-- ══ Content ══ -->
    <view v-else class="body-pad">
      <!-- ── 区块1 顶部数据条（三格·全部真实）── -->
      <view class="stats">
        <view class="stat">
          <view class="stat-num">{{ streak }}<text class="stat-unit">天</text></view>
          <text class="stat-label">连续学习</text>
        </view>
        <view class="stat">
          <view class="stat-num">{{ learnedLessons }}<text class="stat-unit">节</text></view>
          <text class="stat-label">已学课时</text>
        </view>
        <view class="stat">
          <view class="stat-num">{{ doneCount }}<text class="stat-unit">门</text></view>
          <text class="stat-label">已完成</text>
        </view>
      </view>

      <!-- ── 区块2 在学课程（主体）── -->
      <text class="section-title serif">在学课程</text>
      <template v-if="learningCourses.length">
        <view
          v-for="c in learningCourses" :key="c.id"
          class="learn-card" hover-class="card-press" @tap="toEnrolledSame(c)"
        >
          <view class="learn-cover">
            <view class="ratio-169">
              <smart-cover class="learn-cover-img" :src="c.cover" :title="c.title" type="course" />
            </view>
          </view>
          <view class="learn-info">
            <text class="learn-title">{{ c.title }}</text>
            <view class="progress-track"><view class="progress-fill" :style="{ width: coursePct(c) + '%' }" /></view>
            <text class="learn-meta">已学 {{ coursePct(c) }}% · 上次学到第 {{ Math.min(c.completedLessons + 1, c.totalLessons || 1) }} 讲</text>
          </view>
          <view class="btn-continue" hover-class="btn-press" @tap.stop="toEnrolledSame(c)">
            <text class="btn-continue-txt">继续学</text>
          </view>
        </view>
      </template>
      <view v-else class="mini-empty">
        <text class="mini-empty-txt">在学课程都学完啦，去发现更多好课</text>
      </view>

      <!-- ── 区块3 已完成（次区块·可折叠·默认展开）── -->
      <template v-if="doneCourses.length">
        <view class="done-head" hover-class="tab-press" @tap="doneExpanded = !doneExpanded">
          <text class="section-title serif done-title">已完成</text>
          <view class="done-count">
            <text class="done-count-txt">{{ doneCourses.length }} 门</text>
            <app-icon :name="doneExpanded ? 'chevron-down' : 'chevron-right'" :size="24" color="#999999" />
          </view>
        </view>
        <template v-if="doneExpanded">
          <view v-for="c in doneCourses" :key="c.id" class="done-card">
            <view class="learn-cover">
              <view class="ratio-169">
                <smart-cover class="learn-cover-img" :src="c.cover" :title="c.title" type="course" />
              </view>
            </view>
            <view class="learn-info">
              <text class="learn-title">{{ c.title }}</text>
              <view class="done-check">
                <app-icon name="check-circle" :size="26" color="#34A853" />
                <text class="done-check-txt">已完成全部 {{ c.totalLessons }} 讲</text>
              </view>
            </view>
            <view class="btn-cert" hover-class="btn-press" @tap="viewCertificate(c)">
              <text class="btn-cert-txt">查看证书</text>
            </view>
          </view>
        </template>
      </template>

      <!-- ── 区块4 底部次入口（我的收藏 / 我的评价 / 我的作业）── -->
      <view class="entries">
        <view class="entry" hover-class="tab-press" @tap="goFavorites">
          <view class="entry-icon"><app-icon name="heart" :size="30" color="#C41E3A" /></view>
          <text class="entry-name">我的收藏</text>
          <app-icon name="chevron-right" :size="30" color="#999999" />
        </view>
        <view class="entry" hover-class="tab-press" @tap="goReviews">
          <view class="entry-icon"><app-icon name="star" :size="30" color="#C9A96E" :fill="true" /></view>
          <text class="entry-name">我的评价</text>
          <app-icon name="chevron-right" :size="30" color="#999999" />
        </view>
        <view class="entry" hover-class="tab-press" @tap="goWorks">
          <view class="entry-icon"><app-icon name="edit" :size="30" color="#6E6E73" /></view>
          <text class="entry-name">我的作业</text>
          <app-icon name="chevron-right" :size="30" color="#999999" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ── 视觉 token（V0 委托书第七节）── */
.page { min-height: 100vh; background: #FAF8F5; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.btn-press { opacity: 0.6; }
.card-press { transform: scale(0.98); }
.tab-press { opacity: 0.7; }

/* ── 顶部导航 ── */
.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 40rpx 20rpx;
  background: #FAF8F5;
}
.nav-back {
  width: 68rpx; height: 68rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.nav-title { font-size: 40rpx; font-weight: 700; letter-spacing: 2rpx; color: #2C2C2C; }

/* ── 内容主体间距 ── */
.body-pad { padding: 24rpx 40rpx 64rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* ── 区块1 顶部数据条 ── */
.stats {
  background: #FFFFFF; border-radius: 36rpx; padding: 36rpx 32rpx;
  display: flex; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.stat + .stat { border-left: 2rpx solid #EDE7DD; }
.stat-num {
  font-size: 48rpx; font-weight: 700; color: #2C2C2C; line-height: 1;
  font-variant-numeric: tabular-nums; font-family: "SF Mono", "Roboto Mono", monospace, serif;
  display: flex; align-items: baseline;
}
.stat-unit { font-size: 26rpx; font-weight: 500; color: #6E6E73; margin-left: 4rpx; font-family: -apple-system, sans-serif; }
.stat-label { font-size: 26rpx; color: #999999; }

/* ── 区块标题 ── */
.section-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; margin-top: 12rpx; }

/* ── 通用横排封面（100px 小图·16:9）── */
.learn-cover { width: 200rpx; flex-shrink: 0; border-radius: 16rpx; overflow: hidden; }
.ratio-169 { position: relative; width: 100%; padding-top: 56.25%; }
.learn-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }

/* ── 区块2 在学课程卡 ── */
.learn-card {
  background: #FFFFFF; border-radius: 36rpx; padding: 28rpx;
  display: flex; gap: 24rpx; align-items: center;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.learn-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14rpx; }
.learn-title {
  font-size: 30rpx; font-weight: 600; color: #2C2C2C; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.progress-track { height: 8rpx; border-radius: 4rpx; background: #F8F4EC; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4rpx; background: #C41E3A; }
.learn-meta {
  font-size: 24rpx; color: #999999;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.btn-continue {
  flex-shrink: 0; background: #C41E3A; border-radius: 999rpx;
  padding: 16rpx 28rpx; display: flex; align-items: center; justify-content: center;
}
.btn-continue-txt { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }

/* ── 在学为空的轻提示 ── */
.mini-empty { padding: 48rpx 0; text-align: center; }
.mini-empty-txt { font-size: 26rpx; color: #BBBBBB; }

/* ── 区块3 已完成 ── */
.done-head { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.done-title { margin-top: 0; }
.done-count { display: flex; align-items: center; gap: 8rpx; }
.done-count-txt { font-size: 26rpx; color: #999999; }
.done-card {
  background: #FFFFFF; border-radius: 36rpx; padding: 28rpx;
  display: flex; gap: 24rpx; align-items: center;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.done-check { display: flex; align-items: center; gap: 10rpx; }
.done-check-txt { font-size: 24rpx; color: #34A853; }
.btn-cert {
  flex-shrink: 0; background: rgba(201,169,110,0.14); border-radius: 999rpx;
  padding: 16rpx 28rpx; display: flex; align-items: center; justify-content: center;
}
.btn-cert-txt { font-size: 26rpx; font-weight: 600; color: #8A6D3B; }

/* ── 区块4 底部次入口 ── */
.entries {
  background: #FFFFFF; border-radius: 36rpx; overflow: hidden;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); margin-top: 12rpx;
}
.entry { display: flex; align-items: center; gap: 24rpx; padding: 30rpx 32rpx; }
.entry + .entry { border-top: 2rpx solid #EDE7DD; }
.entry-icon {
  width: 64rpx; height: 64rpx; border-radius: 16rpx; flex-shrink: 0;
  background: #F8F4EC; display: flex; align-items: center; justify-content: center;
}
.entry-name { flex: 1; font-size: 30rpx; font-weight: 500; color: #2C2C2C; }

/* ── 空态 ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 32rpx; padding: 160rpx 80rpx; text-align: center; }
.empty-illus { width: 240rpx; height: 240rpx; border-radius: 50%; background: #F8F4EC; display: flex; align-items: center; justify-content: center; }
.empty-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.empty-desc { font-size: 28rpx; color: #999999; line-height: 1.6; white-space: pre-line; }
.empty-btn { margin-top: 12rpx; height: 88rpx; padding: 0 72rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; }
.empty-btn-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* ── 错误态 ── */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.state-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #FFFFFF; }

/* ── 骨架屏（#F0EBE2 微光 1.4s）── */
.sk { position: relative; overflow: hidden; background: #F0EBE2; border-radius: 12rpx; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: shine 1.4s infinite; }
@keyframes shine { 100% { transform: translateX(100%); } }
.sk-stats { height: 176rpx; border-radius: 36rpx; }
.sk-title { height: 40rpx; width: 180rpx; border-radius: 12rpx; margin-top: 12rpx; }
.sk-hcard { height: 184rpx; border-radius: 36rpx; }
.sk-entries { height: 300rpx; border-radius: 36rpx; margin-top: 12rpx; }
</style>
