<template>
  <view class="page">
    <app-nav-bar title="学习进度" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <scroll-view scroll-y class="scroll">
      <!-- 学习统计卡片 -->
      <view class="stat-card">
        <view class="streak-row">
          <view class="streak-left">
            <app-icon name="flame" :size="36" color="#F97316" />
            <text class="streak-txt">连续学习 {{ stats.streak }} 天</text>
          </view>
          <text class="streak-badge">坚持就是胜利</text>
        </view>

        <!-- 学习日历 -->
        <view class="calendar">
          <view v-for="(d, i) in calendar" :key="i" class="cal-col">
            <text class="cal-day">{{ d.day }}</text>
            <view :class="['cal-dot', d.completed ? 'cal-on' : 'cal-off', d.isToday && 'cal-today']">
              <text :class="['cal-date', d.completed ? 'cal-date-on' : 'cal-date-off']">{{ d.date }}</text>
            </view>
            <text class="cal-min" v-if="d.minutes > 0">{{ d.minutes }}分</text>
          </view>
        </view>

        <!-- 本周目标 -->
        <view class="goal">
          <view class="goal-head">
            <view class="goal-label">
              <app-icon name="target" :size="22" color="#9A8F80" />
              <text class="goal-label-txt">本周目标</text>
            </view>
            <text class="goal-val">{{ fmt(stats.weeklyProgress) }} / {{ fmt(stats.weeklyTarget) }}</text>
          </view>
          <view class="bar"><view class="bar-fill" :style="{ width: (stats.weeklyProgress / stats.weeklyTarget * 100) + '%' }" /></view>
        </view>
      </view>

      <!-- 统计网格 -->
      <view class="grid3">
        <view class="gcell">
          <app-icon name="clock" :size="36" color="#C41E2D" />
          <text class="gnum">{{ fmt(stats.totalMinutes) }}</text>
          <text class="glabel">累计学习</text>
        </view>
        <view class="gcell">
          <app-icon name="book-open" :size="36" color="#C9A96E" />
          <text class="gnum">{{ stats.totalCourses }}</text>
          <text class="glabel">学习课程</text>
        </view>
        <view class="gcell">
          <app-icon name="trophy" :size="36" color="#F59E0B" />
          <text class="gnum">{{ stats.completedCourses }}</text>
          <text class="glabel">已完成</text>
        </view>
      </view>

      <!-- Tab -->
      <view class="tabs">
        <text :class="['tab', activeTab === 'learning' && 'tab-on']" @tap="activeTab = 'learning'">正在学习 ({{ learningCourses.length }})</text>
        <text :class="['tab', activeTab === 'completed' && 'tab-on']" @tap="activeTab = 'completed'">已完成 ({{ completedCourses.length }})</text>
      </view>

      <!-- 正在学习 -->
      <view class="list" v-if="activeTab === 'learning'">
        <view v-for="c in learningCourses" :key="c.id" class="course" @tap="go('/learn/' + c.id)">
          <view class="course-top">
            <view class="cover"><app-icon name="play" :size="48" color="rgba(196,30,45,0.6)" /></view>
            <view class="course-info">
              <text class="course-title">{{ c.title }}</text>
              <text class="course-tutor">{{ c.instructor }}</text>
              <view class="cp-head">
                <text class="cp-txt">已学 {{ c.completedChapters }}/{{ c.totalChapters }} 章</text>
                <text class="cp-txt">{{ c.progress }}%</text>
              </view>
              <view class="bar sm"><view class="bar-fill red" :style="{ width: c.progress + '%' }" /></view>
              <view class="course-last">
                <text class="last-txt">上次学到：{{ c.lastChapter }}</text>
                <text class="last-time">{{ c.lastTime }}</text>
              </view>
            </view>
          </view>
          <view class="course-btn"><text class="course-btn-txt">继续学习</text></view>
        </view>
      </view>

      <!-- 已完成 -->
      <view class="list" v-else>
        <view v-for="c in completedCourses" :key="c.id" class="course" @tap="go('/course/' + c.id)">
          <view class="course-top">
            <view class="cover done">
              <app-icon name="trophy" :size="36" color="#16A34A" />
            </view>
            <view class="course-info">
              <view class="done-title-row">
                <text class="course-title">{{ c.title }}</text>
                <text class="done-badge">已完成</text>
              </view>
              <text class="course-tutor">{{ c.instructor }}</text>
              <view class="course-last">
                <view class="stars">
                  <text v-for="n in 5" :key="n" :class="['star', n <= c.rating ? 'star-on' : 'star-off']">★</text>
                  <text class="star-label">我的评分</text>
                </view>
                <text class="last-time">完成于 {{ c.completedDate }}</text>
              </view>
            </view>
          </view>
          <view class="cert-btn" v-if="c.certificate">
            <app-icon name="award" :size="28" color="#D97706" />
            <text class="cert-btn-txt">查看结业证书</text>
          </view>
        </view>
      </view>

      <!-- 学习路径 -->
      <view class="sect-head">
        <app-icon name="sparkles" :size="36" color="#C41E2D" />
        <text class="sect-title">我的学习路径</text>
      </view>
      <view class="path-card">
        <view class="path-top">
          <text class="path-name">八字命理学习路径</text>
          <text class="path-prog">35%</text>
        </view>
        <text class="path-desc">从入门到精通的系统学习计划</text>
        <view class="bar"><view class="bar-fill red" style="width:35%" /></view>
        <view class="nodes">
          <view v-for="(n, i) in pathNodes" :key="i" class="node">
            <view :class="['node-dot', 'nd-' + n.status]">
              <app-icon v-if="n.status === 'completed'" name="check" :size="20" color="#FFFFFF" />
              <text v-else class="node-idx">{{ i + 1 }}</text>
            </view>
            <view class="node-info">
              <text class="node-title">{{ n.title }}</text>
              <text class="node-desc">{{ n.description }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 成就徽章 -->
      <view class="sect-head">
        <app-icon name="award" :size="36" color="#C9A96E" />
        <text class="sect-title">成就徽章</text>
      </view>
      <view class="badges">
        <view v-for="b in badges" :key="b.id" :class="['badge-item', !b.unlocked && 'badge-lock']">
          <view :class="['badge-icon', 'br-' + b.rarity]">
            <app-icon :name="b.icon" :size="40" :color="b.unlocked ? '#FFFFFF' : '#BBB2A6'" />
          </view>
          <text class="badge-name">{{ b.name }}</text>
          <text class="badge-sub" v-if="!b.unlocked && b.total">{{ b.progress }}/{{ b.total }}</text>
          <text class="badge-sub" v-else-if="b.unlocked">已获得</text>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const activeTab = ref<'learning' | 'completed'>('learning')

const stats = { totalMinutes: 1280, totalCourses: 12, completedCourses: 5, streak: 7, weeklyTarget: 300, weeklyProgress: 180 }

const calendar = [
  { day: '一', date: 6, minutes: 45, completed: true },
  { day: '二', date: 7, minutes: 30, completed: true },
  { day: '三', date: 8, minutes: 60, completed: true },
  { day: '四', date: 9, minutes: 0, completed: false },
  { day: '五', date: 10, minutes: 45, completed: true },
  { day: '六', date: 11, minutes: 0, completed: false },
  { day: '日', date: 12, minutes: 0, completed: false, isToday: true },
]

const learningCourses = [
  { id: 1, title: '八字入门实战课', instructor: '周易大师', progress: 65, lastChapter: '第5章 十神详解', lastTime: '昨天 14:30', totalChapters: 28, completedChapters: 18 },
  { id: 2, title: '紫微斗数精讲', instructor: '张玄风', progress: 40, lastChapter: '第12章 四化详解', lastTime: '3天前', totalChapters: 36, completedChapters: 14 },
  { id: 3, title: '风水布局入门', instructor: '陈风水', progress: 15, lastChapter: '第2章 八宅风水', lastTime: '1周前', totalChapters: 12, completedChapters: 2 },
]

const completedCourses = [
  { id: 4, title: '易经六十四卦速记', instructor: '周易大师', completedDate: '2024-01-10', rating: 5, certificate: true },
  { id: 5, title: '八字看婚姻专题', instructor: '玄学居士', completedDate: '2024-01-05', rating: 4, certificate: true },
  { id: 6, title: '姓名学入门', instructor: '李国学', completedDate: '2023-12-28', rating: 5, certificate: false },
]

const pathNodes = [
  { title: '八字入门基础', description: '了解八字的基本概念', status: 'completed' },
  { title: '天干地支详解', description: '掌握十天干十二地支', status: 'completed' },
  { title: '基础测验', description: '检验基础知识掌握', status: 'completed' },
  { title: '五行生克关系', description: '理解五行相生相克', status: 'current' },
  { title: '十神基础', description: '学习十神的定义和作用', status: 'locked' },
  { title: '初级里程碑', description: '完成初级阶段学习', status: 'locked' },
]

const badges = [
  { id: 'first_course', name: '初识国学', icon: 'book-open', rarity: 'common', unlocked: true },
  { id: 'ten_courses', name: '勤学好问', icon: 'graduation-cap', rarity: 'rare', unlocked: true },
  { id: 'fifty_courses', name: '学富五车', icon: 'award', rarity: 'epic', unlocked: false, progress: 28, total: 50 },
  { id: 'streak_7', name: '初心不改', icon: 'flame', rarity: 'common', unlocked: true },
  { id: 'streak_30', name: '持之以恒', icon: 'flame', rarity: 'rare', unlocked: false, progress: 12, total: 30 },
  { id: 'bazi_basic', name: '八字入门', icon: 'medal', rarity: 'rare', unlocked: true },
]

function fmt(m: number) {
  const h = Math.floor(m / 60), mm = m % 60
  return h > 0 ? `${h}小时${mm > 0 ? mm + '分钟' : ''}` : `${mm}分钟`
}
function go(path: string) { navigateTo(path) }
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
.scroll { flex: 1; }

.stat-card { margin: 32rpx; padding: 32rpx; background: linear-gradient(135deg, rgba(196,30,45,0.08), rgba(201,169,110,0.05), rgba(196,30,45,0.08)); border: 1rpx solid rgba(196,30,45,0.18); border-radius: 24rpx; }
.streak-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.streak-left { display: flex; align-items: center; gap: 12rpx; }
.streak-txt { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.streak-badge { font-size: 22rpx; color: #EA580C; background: rgba(249,115,22,0.1); padding: 6rpx 16rpx; border-radius: 999rpx; }
.calendar { display: flex; justify-content: space-between; margin-bottom: 28rpx; }
.cal-col { display: flex; flex-direction: column; align-items: center; }
.cal-day { font-size: 20rpx; color: #9A8F80; margin-bottom: 8rpx; }
.cal-dot { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.cal-on { background: #C41E2D; }
.cal-off { background: #EFEAE2; }
.cal-today { border: 3rpx solid #C41E2D; }
.cal-date { font-size: 24rpx; font-weight: 500; }
.cal-date-on { color: #FFFFFF; }
.cal-date-off { color: #9A8F80; }
.cal-min { font-size: 18rpx; color: #9A8F80; margin-top: 8rpx; }
.goal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.goal-label { display: flex; align-items: center; gap: 6rpx; }
.goal-label-txt { font-size: 22rpx; color: #9A8F80; }
.goal-val { font-size: 22rpx; color: #2C2C2C; font-weight: 500; }
.bar { height: 16rpx; background: #EFEAE2; border-radius: 999rpx; overflow: hidden; }
.bar.sm { height: 12rpx; }
.bar-fill { height: 100%; border-radius: 999rpx; background: linear-gradient(90deg, #C41E2D, #C9A96E); }
.bar-fill.red { background: #C41E2D; }

.grid3 { display: flex; gap: 24rpx; margin: 0 32rpx; }
.gcell { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 24rpx 0; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 20rpx; }
.gnum { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.glabel { font-size: 20rpx; color: #9A8F80; }

.tabs { display: flex; gap: 8rpx; margin: 32rpx; padding: 8rpx; background: #EFEAE2; border-radius: 20rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 28rpx; font-weight: 500; color: #9A8F80; border-radius: 14rpx; }
.tab-on { background: #FFFFFF; color: #2C2C2C; }

.list { padding: 0 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.course { padding: 28rpx; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 20rpx; }
.course-top { display: flex; gap: 24rpx; }
.cover { width: 152rpx; height: 152rpx; border-radius: 16rpx; background: linear-gradient(135deg, rgba(196,30,45,0.2), rgba(201,169,110,0.2)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cover.done { width: 120rpx; height: 120rpx; background: linear-gradient(135deg, rgba(22,163,74,0.2), rgba(16,185,129,0.2)); }
.course-info { flex: 1; min-width: 0; }
.course-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.course-tutor { display: block; font-size: 22rpx; color: #9A8F80; margin: 6rpx 0 12rpx; }
.cp-head { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.cp-txt { font-size: 20rpx; color: #9A8F80; }
.course-last { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.last-txt { font-size: 20rpx; color: #9A8F80; }
.last-time { font-size: 20rpx; color: #9A8F80; }
.course-btn { margin-top: 24rpx; padding: 18rpx 0; background: rgba(196,30,45,0.1); border-radius: 14rpx; text-align: center; }
.course-btn-txt { font-size: 28rpx; color: #C41E2D; font-weight: 500; }
.done-title-row { display: flex; align-items: center; gap: 12rpx; }
.done-badge { font-size: 20rpx; color: #16A34A; background: rgba(22,163,74,0.1); padding: 2rpx 12rpx; border-radius: 8rpx; }
.stars { display: flex; align-items: center; gap: 2rpx; }
.star { font-size: 24rpx; }
.star-on { color: #FBBF24; }
.star-off { color: rgba(154,143,128,0.3); }
.star-label { font-size: 20rpx; color: #9A8F80; margin-left: 8rpx; }
.cert-btn { margin-top: 24rpx; padding: 18rpx 0; background: rgba(217,119,6,0.1); border-radius: 14rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.cert-btn-txt { font-size: 28rpx; color: #D97706; font-weight: 500; }

.sect-head { display: flex; align-items: center; gap: 12rpx; padding: 40rpx 32rpx 24rpx; }
.sect-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }

.path-card { margin: 0 32rpx; padding: 32rpx; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 20rpx; }
.path-top { display: flex; align-items: center; justify-content: space-between; }
.path-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.path-prog { font-size: 26rpx; font-weight: 700; color: #C41E2D; }
.path-desc { display: block; font-size: 22rpx; color: #9A8F80; margin: 8rpx 0 16rpx; }
.nodes { margin-top: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.node { display: flex; gap: 20rpx; align-items: center; }
.node-dot { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nd-completed { background: #16A34A; }
.nd-current { background: #C41E2D; }
.nd-locked { background: #EFEAE2; }
.node-idx { font-size: 24rpx; font-weight: 600; color: #9A8F80; }
.nd-current .node-idx { color: #FFFFFF; }
.node-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.node-desc { display: block; font-size: 20rpx; color: #9A8F80; margin-top: 4rpx; }

.badges { display: flex; flex-wrap: wrap; gap: 24rpx; padding: 0 32rpx; }
.badge-item { width: calc((100% - 48rpx) / 3); display: flex; flex-direction: column; align-items: center; padding: 28rpx 0; background: #FFFFFF; border: 1rpx solid #EFEAE2; border-radius: 20rpx; }
.badge-lock { opacity: 0.55; }
.badge-icon { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx; }
.br-common { background: #9CA3AF; }
.br-rare { background: #3B82F6; }
.br-epic { background: #A855F7; }
.br-legendary { background: linear-gradient(135deg, #F59E0B, #EF4444); }
.badge-lock .badge-icon { background: #EFEAE2; }
.badge-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.badge-sub { font-size: 20rpx; color: #9A8F80; margin-top: 4rpx; }

.safe-bottom { height: 48rpx; }
</style>
