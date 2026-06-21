<template>
  <view class="ck-page">
    <!-- 顶部封面 -->
    <view class="ck-cover">
      <image
        class="ck-cover-img"
        :src="activity.cover"
        mode="aspectFill"
      />
      <view class="ck-cover-mask" />
      <view class="ck-nav">
        <view
          class="ck-nav-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="36"
            color="#ffffff"
          />
        </view>
        <view
          class="ck-nav-btn"
          @tap="onShare"
        >
          <app-icon
            name="share-2"
            :size="34"
            color="#ffffff"
          />
        </view>
      </view>
      <view class="ck-cover-info">
        <view class="ck-cover-tags">
          <text class="ck-badge-live">
            进行中
          </text>
          <text class="ck-day-text">
            Day {{ activity.currentDay }}/{{ activity.totalDays }}
          </text>
        </view>
        <text class="ck-title">
          {{ activity.title }}
        </text>
        <text class="ck-desc">
          {{ activity.description }}
        </text>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="ck-progress-bar">
      <view class="ck-pb-head">
        <text class="ck-pb-label">
          活动进度
        </text>
        <text class="ck-pb-pct">
          {{ Math.round(progressPercent) }}%
        </text>
      </view>
      <view class="ck-pb-track">
        <view
          class="ck-pb-fill"
          :style="{ width: progressPercent + '%' }"
        />
      </view>
    </view>

    <!-- 数据统计 -->
    <view class="ck-stats">
      <view class="ck-stat">
        <text class="ck-stat-num">
          {{ activity.participants }}
        </text><text class="ck-stat-label">
          参与人数
        </text>
      </view>
      <view class="ck-stat">
        <text class="ck-stat-num c-green">
          {{ activity.todayCheckedIn }}
        </text><text class="ck-stat-label">
          今日已打卡
        </text>
      </view>
      <view class="ck-stat">
        <text class="ck-stat-num c-orange">
          {{ activity.myStreak }}
        </text><text class="ck-stat-label">
          我的连续
        </text>
      </view>
      <view class="ck-stat">
        <text class="ck-stat-num c-red">
          {{ activity.myTotalDays }}
        </text><text class="ck-stat-label">
          累计打卡
        </text>
      </view>
    </view>

    <!-- 打卡日历 -->
    <view class="ck-section">
      <view class="ck-cal">
        <view class="ck-cal-head">
          <text class="ck-cal-title">
            打卡日历
          </text>
          <text class="ck-cal-range">
            {{ activity.startDate }} - {{ activity.endDate }}
          </text>
        </view>
        <view class="ck-cal-grid">
          <view
            v-for="d in calendarDays"
            :key="d.day"
            class="ck-cal-cell"
            :class="cellClass(d)"
          >
            <app-icon
              v-if="d.isCompleted"
              name="check-circle"
              :size="28"
              color="#ffffff"
            />
            <text v-else>
              {{ d.day }}
            </text>
          </view>
        </view>
        <view class="ck-cal-legend">
          <view class="ck-legend-item">
            <view
              class="ck-dot"
              style="background:#52C41A"
            /><text class="ck-legend-t">
              已完成
            </text>
          </view>
          <view class="ck-legend-item">
            <view
              class="ck-dot"
              style="background:#FFE4E4"
            /><text class="ck-legend-t">
              已错过
            </text>
          </view>
          <view class="ck-legend-item">
            <view
              class="ck-dot"
              style="background:#F5F0E8"
            /><text class="ck-legend-t">
              未开始
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab -->
    <view class="ck-tabs-wrap">
      <view class="ck-tabs">
        <view
          v-for="t in tabs"
          :key="t.id"
          class="ck-tab"
          :class="{ on: activeTab === t.id }"
          @tap="activeTab = t.id"
        >
          {{ t.label }}
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="ck-section">
      <!-- 今日内容 -->
      <view
        v-if="activeTab === 'today'"
        class="ck-col"
      >
        <view class="ck-card">
          <view class="ck-card-head">
            <app-icon
              name="book-open"
              :size="36"
              color="#C9A96E"
            /><text class="ck-card-title">
              今日阅读
            </text>
          </view>
          <text class="ck-chapter">
            {{ todayContent.chapter }}
          </text>
          <text class="ck-summary">
            {{ todayContent.summary }}
          </text>
          <view class="ck-keypoints">
            <text class="ck-kp-label">
              核心要点
            </text>
            <view
              v-for="(p, i) in todayContent.keyPoints"
              :key="i"
              class="ck-kp-item"
            >
              <view class="ck-kp-dot" /><text class="ck-kp-text">
                {{ p }}
              </text>
            </view>
          </view>
        </view>
        <view class="ck-card">
          <view class="ck-card-head">
            <app-icon
              name="star"
              :size="36"
              color="#FF6B35"
            /><text class="ck-card-title">
              打卡规则
            </text>
          </view>
          <view
            v-for="(r, i) in activity.rules"
            :key="i"
            class="ck-rule"
          >
            <text class="ck-rule-no">
              {{ i + 1 }}
            </text><text class="ck-rule-text">
              {{ r }}
            </text>
          </view>
        </view>
        <view class="ck-reward">
          <view class="ck-card-head">
            <app-icon
              name="trophy"
              :size="36"
              color="#C9A96E"
            /><text class="ck-card-title">
              完成奖励
            </text>
          </view>
          <view class="ck-reward-row">
            <view class="ck-reward-item">
              <app-icon
                name="sparkles"
                :size="28"
                color="#C9A96E"
              /><text class="ck-reward-t">
                每日 +{{ activity.reward.xp }} 经验值
              </text>
            </view>
            <view class="ck-reward-item">
              <app-icon
                name="star"
                :size="28"
                color="#C9A96E"
              /><text class="ck-reward-t">
                获得「{{ activity.reward.badge }}」勋章
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 打卡动态 -->
      <view
        v-else-if="activeTab === 'feed'"
        class="ck-col"
      >
        <view
          v-for="item in checkinFeed"
          :key="item.id"
          class="ck-card"
        >
          <view class="ck-feed-head">
            <image
              class="ck-avatar"
              :src="item.user.avatar"
              mode="aspectFill"
            />
            <view class="ck-feed-meta">
              <text class="ck-feed-name">
                {{ item.user.name }}
              </text><text class="ck-feed-time">
                {{ item.time }}
              </text>
            </view>
            <text class="ck-feed-done">
              已打卡
            </text>
          </view>
          <text class="ck-feed-content">
            {{ item.content }}
          </text>
          <image
            v-for="(img, i) in item.images"
            :key="i"
            class="ck-feed-img"
            :src="img"
            mode="widthFix"
          />
          <view class="ck-feed-actions">
            <view class="ck-fa">
              <app-icon
                name="heart"
                :size="28"
                color="#999999"
              /><text class="ck-fa-t">
                {{ item.likes }}
              </text>
            </view>
            <view class="ck-fa">
              <app-icon
                name="message-circle"
                :size="28"
                color="#999999"
              /><text class="ck-fa-t">
                {{ item.comments }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 排行榜 -->
      <view
        v-else-if="activeTab === 'rank'"
        class="ck-rank-card"
      >
        <view class="ck-rank-head">
          <app-icon
            name="trophy"
            :size="36"
            color="#C9A96E"
          /><text class="ck-card-title">
            连续打卡排行
          </text>
        </view>
        <view
          v-for="(item, idx) in leaderboard"
          :key="item.rank"
          class="ck-rank-row"
          :class="{ noborder: idx === leaderboard.length - 1 }"
        >
          <view
            class="ck-rank-no"
            :class="rankClass(item.rank)"
          >
            {{ item.rank }}
          </view>
          <image
            class="ck-avatar"
            :src="item.user.avatar"
            mode="aspectFill"
          />
          <view class="ck-rank-info">
            <text class="ck-rank-name">
              {{ item.user.name }}
            </text><text class="ck-rank-total">
              累计{{ item.totalDays }}天
            </text>
          </view>
          <view class="ck-rank-streak">
            <view class="ck-rank-flame">
              <app-icon
                name="flame"
                :size="28"
                color="#FF6B35"
              /><text class="ck-rank-num">
                {{ item.streak }}
              </text>
            </view>
            <text class="ck-rank-lbl">
              连续天数
            </text>
          </view>
        </view>
      </view>

      <!-- 我的记录 -->
      <view
        v-else
        class="ck-col"
      >
        <template v-if="myCheckins.length">
          <view
            v-for="(item, idx) in myCheckins"
            :key="idx"
            class="ck-card"
          >
            <view class="ck-my-head">
              <app-icon
                name="check-circle"
                :size="28"
                color="#52C41A"
              /><text class="ck-my-date">
                {{ item.date }}
              </text>
            </view>
            <text class="ck-feed-content">
              {{ item.content }}
            </text>
            <view
              v-if="item.images.length"
              class="ck-my-imgs"
            >
              <image
                v-for="(img, i) in item.images"
                :key="i"
                class="ck-my-img"
                :src="img"
                mode="aspectFill"
              />
            </view>
            <view class="ck-feed-actions noborder">
              <view class="ck-fa">
                <app-icon
                  name="heart"
                  :size="26"
                  color="#999999"
                /><text class="ck-fa-t">
                  {{ item.likes }}
                </text>
              </view>
              <view class="ck-fa">
                <app-icon
                  name="message-circle"
                  :size="26"
                  color="#999999"
                /><text class="ck-fa-t">
                  {{ item.comments }}
                </text>
              </view>
            </view>
          </view>
        </template>
        <view
          v-else
          class="ck-empty"
        >
          <app-icon
            name="book-open"
            :size="80"
            color="#E8E3DB"
          /><text class="ck-empty-t">
            还没有打卡记录
          </text>
        </view>
      </view>
    </view>

    <!-- 底部打卡按钮 -->
    <view class="ck-footer">
      <view
        v-if="activity.hasCheckedToday"
        class="ck-done-bar"
      >
        <app-icon
          name="check-circle"
          :size="36"
          color="#52C41A"
        /><text class="ck-done-t">
          今日已打卡
        </text>
      </view>
      <view
        v-else
        class="ck-checkin-btn"
        @tap="showCheckinModal = true"
      >
        <app-icon
          name="check-circle"
          :size="36"
          color="#ffffff"
        /><text class="ck-checkin-t">
          立即打卡 (+{{ activity.reward.xp }}经验)
        </text>
      </view>
    </view>

    <!-- 打卡弹窗 -->
    <view
      v-if="showCheckinModal"
      class="ck-modal-mask"
      @tap="showCheckinModal = false"
    >
      <view
        class="ck-modal"
        @tap.stop
      >
        <view class="ck-modal-head">
          <view @tap="showCheckinModal = false">
            <app-icon
              name="x"
              :size="44"
              color="#999999"
            />
          </view>
          <text class="ck-modal-title">
            打卡
          </text>
          <view style="width: 44rpx" />
        </view>
        <scroll-view
          scroll-y
          class="ck-modal-body"
        >
          <view class="ck-modal-tip">
            <text class="ck-mt-label">
              今日阅读内容
            </text><text class="ck-mt-chapter">
              {{ todayContent.chapter }}
            </text>
          </view>
          <view class="ck-field">
            <text class="ck-field-label">
              写下你的心得 <text class="c-red">
                *
              </text>
            </text>
            <textarea
              v-model="checkinContent"
              class="ck-textarea"
              placeholder="记录今天的阅读收获，至少50字..."
              :maxlength="-1"
            />
            <text class="ck-field-count">
              {{ checkinContent.length }}/50 {{ checkinContent.length < 50 ? '(至少50字)' : '' }}
            </text>
          </view>
          <view class="ck-field">
            <text class="ck-field-label">
              添加图片 <text class="ck-field-sub">
                (选填)
              </text>
            </text>
            <view
              class="ck-img-add"
              @tap="chooseImg"
            >
              <app-icon
                name="camera"
                :size="44"
                color="#999999"
              /><text class="ck-img-add-t">
                添加
              </text>
            </view>
          </view>
        </scroll-view>
        <view class="ck-modal-foot">
          <view
            class="ck-submit"
            :class="{ disabled: checkinContent.length < 50 || isSubmitting }"
            @tap="handleCheckin"
          >
            {{ isSubmitting ? '提交中...' : '确认打卡' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view
      v-if="showSuccess"
      class="ck-success-mask"
    >
      <view class="ck-success">
        <view class="ck-success-icon">
          <app-icon
            name="check-circle"
            :size="56"
            color="#ffffff"
          />
        </view>
        <text class="ck-success-title">
          打卡成功!
        </text>
        <text class="ck-success-sub">
          连续打卡 <text class="c-orange ck-bold">
            {{ activity.myStreak }}
          </text> 天
        </text>
        <view class="ck-success-reward">
          <app-icon
            name="sparkles"
            :size="28"
            color="#C9A96E"
          /><text class="ck-sr-t">
            +{{ activity.reward.xp }} 经验
          </text>
        </view>
        <view
          class="ck-success-btn"
          @tap="showSuccess = false"
        >
          太棒了
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 活动打卡页（从原型 app/circles/[id]/checkin/[activityId]/page.tsx 高保真迁移）
 * 封面+进度+统计+打卡日历+四Tab(今日内容/动态/排行/记录)+打卡弹窗+成功弹窗
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, toastComingSoon } from '@/utils/router'

const activity = ref({
  id: '1', title: '《滴天髓》共读打卡', description: '每日阅读一章，记录心得体会，坚持21天养成阅读习惯',
  cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
  startDate: '2024-01-01', endDate: '2024-01-21', currentDay: 15, totalDays: 21,
  participants: 328, todayCheckedIn: 186, reward: { xp: 10, badge: '阅读达人' },
  isJoined: true, hasCheckedToday: false, myStreak: 12, myTotalDays: 12,
  rules: ['每日阅读指定章节', '打卡需写下心得（至少50字）', '可配图分享精彩段落', '截止时间为每日23:59'],
})

const todayContent = {
  chapter: '第十五章：论日主强弱',
  summary: '本章讲述如何判断日主的强弱，包括得令、得地、得生、得助等要点...',
  keyPoints: ['得令为重', '得地次之', '得生得助为辅'],
}

const leaderboard = [
  { rank: 1, user: { name: '命理大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' }, streak: 15, totalDays: 15 },
  { rank: 2, user: { name: '易学研究者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2' }, streak: 14, totalDays: 14 },
  { rank: 3, user: { name: '古籍爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3' }, streak: 13, totalDays: 14 },
  { rank: 4, user: { name: '学习达人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4' }, streak: 12, totalDays: 13 },
  { rank: 5, user: { name: '国学新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5' }, streak: 11, totalDays: 12 },
]

const myCheckins = [
  { date: '2024-01-14', content: '今天阅读了论十神的章节，对于正财和偏财的区别有了更深的理解...', images: [] as string[], likes: 12, comments: 3 },
  { date: '2024-01-13', content: '格局篇真是精彩，八格的分类方法让我豁然开朗...', images: ['https://picsum.photos/200/200?random=1'], likes: 8, comments: 2 },
  { date: '2024-01-12', content: '开始学习用神的概念，这是八字命理的核心所在...', images: [] as string[], likes: 15, comments: 5 },
]

const checkinFeed = [
  { id: 'f1', user: { name: '命理大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' }, content: '今天深入研究了日主强弱的判断方法，收获满满！书中所说「得令为重」确实是关键...', images: [] as string[], time: '10分钟前', likes: 28, comments: 6 },
  { id: 'f2', user: { name: '易学研究者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2' }, content: '分享一段经典论述', images: ['https://picsum.photos/400/300?random=10'], time: '30分钟前', likes: 15, comments: 3 },
  { id: 'f3', user: { name: '古籍爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3' }, content: '坚持打卡第13天！感觉自己对八字的理解越来越深入了', images: [] as string[], time: '1小时前', likes: 22, comments: 8 },
]

const tabs = [
  { id: 'today', label: '今日内容' },
  { id: 'feed', label: '打卡动态' },
  { id: 'rank', label: '排行榜' },
  { id: 'my', label: '我的记录' },
] as const

const activeTab = ref<'today' | 'feed' | 'rank' | 'my'>('today')
const showCheckinModal = ref(false)
const checkinContent = ref('')
const isSubmitting = ref(false)
const showSuccess = ref(false)

const calendarDays = computed(() => {
  const days: { day: number; isCompleted: boolean; isToday: boolean; isFuture: boolean }[] = []
  for (let i = 1; i <= activity.value.totalDays; i++) {
    days.push({
      day: i,
      isCompleted: i <= activity.value.myTotalDays,
      isToday: i === activity.value.currentDay,
      isFuture: i > activity.value.currentDay,
    })
  }
  return days
})
const progressPercent = computed(() => (activity.value.currentDay / activity.value.totalDays) * 100)

function cellClass(d: { isCompleted: boolean; isToday: boolean; isFuture: boolean }) {
  if (d.isCompleted) return 'done'
  if (d.isToday) return activity.value.hasCheckedToday ? 'done today' : 'today-active'
  if (d.isFuture) return 'future'
  return 'missed'
}
function rankClass(rank: number) {
  if (rank === 1) return 'r1'
  if (rank === 2) return 'r2'
  if (rank === 3) return 'r3'
  return 'rn'
}

function onShare() { toastComingSoon() }
function chooseImg() {
  uni.chooseImage({ count: 1, success: () => { uni.showToast({ title: '已选择图片', icon: 'none' }) } })
}
async function handleCheckin() {
  if (checkinContent.value.trim().length < 50) { uni.showToast({ title: '心得至少需要50字哦', icon: 'none' }); return }
  isSubmitting.value = true
  await new Promise((r) => setTimeout(r, 1500))
  isSubmitting.value = false
  showCheckinModal.value = false
  showSuccess.value = true
  activity.value.hasCheckedToday = true
  activity.value.myStreak += 1
  activity.value.myTotalDays += 1
}
</script>

<style scoped lang="scss">
.ck-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }
.c-green { color: #52C41A; } .c-orange { color: #FF6B35; } .c-red { color: #C41E3A; } .ck-bold { font-weight: 700; }

.ck-cover { position: relative; height: 416rpx; }
.ck-cover-img { width: 100%; height: 100%; }
.ck-cover-mask { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.3) 50%, transparent); }
.ck-nav { position: absolute; top: 0; left: 0; right: 0; padding: 32rpx; display: flex; align-items: center; justify-content: space-between; }
.ck-nav-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.ck-cover-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 32rpx; }
.ck-cover-tags { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.ck-badge-live { padding: 2rpx 16rpx; background: #52C41A; color: #fff; font-size: 20rpx; border-radius: 999rpx; }
.ck-day-text { color: rgba(255,255,255,0.8); font-size: 24rpx; }
.ck-title { display: block; color: #fff; font-size: 40rpx; font-weight: 700; margin-bottom: 8rpx; }
.ck-desc { display: block; color: rgba(255,255,255,0.7); font-size: 26rpx; }

.ck-progress-bar { padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.ck-pb-head { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.ck-pb-label { font-size: 24rpx; color: #666; } .ck-pb-pct { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
.ck-pb-track { height: 16rpx; background: #F5F0E8; border-radius: 999rpx; overflow: hidden; }
.ck-pb-fill { height: 100%; background: linear-gradient(to right, #C41E3A, #FF6B6B); border-radius: 999rpx; }

.ck-stats { padding: 32rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.ck-stat { background: #fff; border-radius: 24rpx; padding: 24rpx 8rpx; text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-stat-num { display: block; font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.ck-stat-label { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }

.ck-section { padding: 0 32rpx 32rpx; }
.ck-cal { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.ck-cal-title { font-weight: 500; color: #2C2C2C; } .ck-cal-range { font-size: 24rpx; color: #999; }
.ck-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 16rpx; }
.ck-cal-cell { aspect-ratio: 1; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.ck-cal-cell.done { background: #52C41A; color: #fff; }
.ck-cal-cell.today-active { background: #C41E3A; color: #fff; }
.ck-cal-cell.future { background: #F5F0E8; color: #ccc; }
.ck-cal-cell.missed { background: #FFE4E4; color: #C41E3A; }
.ck-cal-legend { display: flex; align-items: center; justify-content: center; gap: 32rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #F5F0E8; }
.ck-legend-item { display: flex; align-items: center; gap: 8rpx; }
.ck-dot { width: 24rpx; height: 24rpx; border-radius: 6rpx; } .ck-legend-t { font-size: 22rpx; color: #999; }

.ck-tabs-wrap { padding: 0 32rpx; }
.ck-tabs { display: flex; gap: 8rpx; background: #fff; border-radius: 24rpx; padding: 8rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 26rpx; font-weight: 500; border-radius: 16rpx; color: #666; }
.ck-tab.on { background: #C41E3A; color: #fff; }

.ck-col { display: flex; flex-direction: column; gap: 24rpx; }
.ck-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-card-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.ck-card-title { font-weight: 500; color: #2C2C2C; }
.ck-chapter { display: block; font-size: 32rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 16rpx; }
.ck-summary { display: block; font-size: 26rpx; color: #666; line-height: 1.7; margin-bottom: 24rpx; }
.ck-keypoints { background: #FAF8F5; border-radius: 16rpx; padding: 24rpx; }
.ck-kp-label { display: block; font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.ck-kp-item { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.ck-kp-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #C41E3A; }
.ck-kp-text { font-size: 26rpx; color: #2C2C2C; }
.ck-rule { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 16rpx; }
.ck-rule-no { width: 40rpx; height: 40rpx; border-radius: 50%; background: #F5F0E8; font-size: 22rpx; color: #666; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ck-rule-text { font-size: 26rpx; color: #666; flex: 1; }
.ck-reward { background: linear-gradient(to right, #FFF8E7, #FFFBF0); border-radius: 24rpx; padding: 32rpx; border: 1rpx solid #F0E6D3; }
.ck-reward-row { display: flex; align-items: center; gap: 32rpx; }
.ck-reward-item { display: flex; align-items: center; gap: 8rpx; } .ck-reward-t { font-size: 26rpx; color: #666; }

.ck-feed-head { display: flex; align-items: center; gap: 24rpx; margin-bottom: 24rpx; }
.ck-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; background: #F5F0E8; }
.ck-feed-meta { flex: 1; } .ck-feed-name { display: block; font-weight: 500; font-size: 28rpx; color: #2C2C2C; } .ck-feed-time { display: block; font-size: 22rpx; color: #999; }
.ck-feed-done { padding: 2rpx 16rpx; background: rgba(82,196,26,0.1); color: #52C41A; font-size: 20rpx; border-radius: 999rpx; }
.ck-feed-content { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.7; margin-bottom: 24rpx; }
.ck-feed-img { width: 100%; border-radius: 16rpx; margin-bottom: 24rpx; }
.ck-feed-actions { display: flex; align-items: center; gap: 32rpx; padding-top: 16rpx; border-top: 1rpx solid #F5F0E8; }
.ck-feed-actions.noborder { border-top: none; padding-top: 0; }
.ck-fa { display: flex; align-items: center; gap: 8rpx; } .ck-fa-t { font-size: 24rpx; color: #999; }

.ck-rank-card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.ck-rank-head { display: flex; align-items: center; gap: 16rpx; padding: 32rpx; border-bottom: 1rpx solid #F5F0E8; }
.ck-rank-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; border-bottom: 1rpx solid #F5F0E8; }
.ck-rank-row.noborder { border-bottom: none; }
.ck-rank-no { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; flex-shrink: 0; }
.ck-rank-no.r1 { background: linear-gradient(135deg, #FACC15, #F97316); color: #fff; }
.ck-rank-no.r2 { background: linear-gradient(135deg, #D1D5DB, #9CA3AF); color: #fff; }
.ck-rank-no.r3 { background: linear-gradient(135deg, #FDBA74, #FB923C); color: #fff; }
.ck-rank-no.rn { background: #F5F0E8; color: #999; }
.ck-rank-info { flex: 1; } .ck-rank-name { display: block; font-weight: 500; font-size: 28rpx; color: #2C2C2C; } .ck-rank-total { display: block; font-size: 22rpx; color: #999; }
.ck-rank-streak { text-align: right; }
.ck-rank-flame { display: flex; align-items: center; gap: 8rpx; justify-content: flex-end; } .ck-rank-num { font-weight: 700; color: #FF6B35; }
.ck-rank-lbl { font-size: 20rpx; color: #999; }

.ck-my-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; } .ck-my-date { font-size: 24rpx; color: #999; }
.ck-my-imgs { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.ck-my-img { width: 160rpx; height: 160rpx; border-radius: 16rpx; background: #F5F0E8; }
.ck-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 128rpx 0; }
.ck-empty-t { color: #999; font-size: 28rpx; margin-top: 24rpx; }

.ck-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); z-index: 50; }
.ck-done-bar { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 24rpx; background: #F5F0E8; border-radius: 999rpx; } .ck-done-t { color: #52C41A; font-weight: 500; }
.ck-checkin-btn { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 28rpx; background: linear-gradient(to right, #C41E3A, #E74C3C); border-radius: 999rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); } .ck-checkin-t { color: #fff; font-weight: 500; }

.ck-modal-mask { position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.5); }
.ck-modal { width: 100%; background: #fff; border-radius: 48rpx 48rpx 0 0; overflow: hidden; }
.ck-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; border-bottom: 1rpx solid #E8E3DB; }
.ck-modal-title { font-weight: 600; color: #2C2C2C; }
.ck-modal-body { max-height: 60vh; padding: 32rpx; }
.ck-modal-tip { background: #FAF8F5; border-radius: 16rpx; padding: 24rpx; margin-bottom: 32rpx; }
.ck-mt-label { display: block; font-size: 24rpx; color: #999; margin-bottom: 8rpx; } .ck-mt-chapter { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ck-field { margin-bottom: 32rpx; }
.ck-field-label { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 16rpx; } .ck-field-sub { font-size: 24rpx; color: #999; font-weight: 400; }
.ck-textarea { width: 100%; height: 256rpx; padding: 24rpx; background: #FAF8F5; border-radius: 16rpx; font-size: 28rpx; box-sizing: border-box; }
.ck-field-count { display: block; text-align: right; font-size: 24rpx; color: #999; margin-top: 8rpx; }
.ck-img-add { width: 160rpx; height: 160rpx; border-radius: 16rpx; border: 2rpx dashed #E8E3DB; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.ck-img-add-t { font-size: 22rpx; color: #999; }
.ck-modal-foot { padding: 32rpx; border-top: 1rpx solid #E8E3DB; }
.ck-submit { text-align: center; padding: 28rpx; border-radius: 999rpx; font-weight: 500; color: #fff; background: linear-gradient(to right, #C41E3A, #E74C3C); }
.ck-submit.disabled { background: #E8E3DB; color: #999; }

.ck-success-mask { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
.ck-success { width: 85%; max-width: 600rpx; background: #fff; border-radius: 32rpx; padding: 48rpx; text-align: center; }
.ck-success-icon { width: 160rpx; height: 160rpx; margin: 0 auto 32rpx; border-radius: 50%; background: linear-gradient(135deg, #52C41A, #95DE64); display: flex; align-items: center; justify-content: center; }
.ck-success-title { display: block; font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 16rpx; }
.ck-success-sub { display: block; color: #666; margin-bottom: 32rpx; }
.ck-success-reward { display: inline-flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #FFF8E7; border-radius: 999rpx; margin-bottom: 48rpx; } .ck-sr-t { font-size: 26rpx; color: #C9A96E; }
.ck-success-btn { padding: 24rpx; background: linear-gradient(to right, #C41E3A, #E74C3C); color: #fff; font-weight: 500; border-radius: 999rpx; }
</style>
