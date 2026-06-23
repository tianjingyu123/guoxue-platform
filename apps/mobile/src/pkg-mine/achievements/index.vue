<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="48" color="#2D2A26" />
      </view>
      <text class="nav-title">成就墙</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="skeleton">
      <view class="sk-overview" />
      <view class="sk-chips">
        <view v-for="i in 5" :key="i" class="sk-chip" />
      </view>
      <view class="sk-grid">
        <view v-for="i in 6" :key="i" class="sk-cell" />
      </view>
    </view>

    <view v-else class="body">
      <!-- 总览卡片 -->
      <view class="overview">
        <view class="overview-head">
          <view class="overview-icon">
            <AppIcon name="trophy" :size="40" color="#ffffff" />
          </view>
          <view>
            <text class="overview-label">成就进度</text>
            <text class="overview-value">{{ stats.unlockedCount }}/{{ stats.totalCount }}</text>
          </view>
          <view class="overview-right">
            <text class="overview-label">累计积分</text>
            <text class="overview-points">+{{ stats.totalPoints }}</text>
          </view>
        </view>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </view>
        <text class="overview-percent">{{ progressPercent }}%</text>
      </view>

      <!-- 分类筛选 -->
      <scroll-view class="chips" scroll-x :show-scrollbar="false">
        <view class="chips-inner">
          <view class="chip" :class="{ 'chip-active': selectedCategory === 'all' }" @tap="selectCategory('all')">
            <text class="chip-text" :class="{ 'chip-text-active': selectedCategory === 'all' }">全部 ({{ stats.totalCount }})</text>
          </view>
          <view
            v-for="cat in categories"
            :key="cat.key"
            class="chip"
            :class="{ 'chip-active': selectedCategory === cat.key }"
            @tap="selectCategory(cat.key)"
          >
            <text class="chip-emoji">{{ cat.icon }}</text>
            <text class="chip-text" :class="{ 'chip-text-active': selectedCategory === cat.key }">{{ cat.name.replace('成就', '') }}</text>
            <text class="chip-count" :class="{ 'chip-text-active': selectedCategory === cat.key }">({{ cat.unlocked }}/{{ cat.total }})</text>
          </view>
        </view>
      </scroll-view>

      <!-- 成就网格 -->
      <view class="grid">
        <view
          v-for="a in filteredAchievements"
          :key="a.id"
          class="cell"
          :class="a.isUnlocked ? rarityBg(a.rarity) : 'cell-locked'"
          @tap="openDetail(a)"
        >
          <text class="cell-emoji" :class="{ 'cell-gray': !a.isUnlocked }">{{ a.icon }}</text>
          <text class="cell-name" :class="{ 'cell-name-locked': !a.isUnlocked }">{{ a.name }}</text>
          <view v-if="a.isUnlocked" class="cell-got">
            <AppIcon name="check-circle" :size="22" color="#22c55e" />
            <text class="cell-got-text">已获得</text>
          </view>
          <view v-else class="cell-prog">
            <view class="cell-prog-track">
              <view class="cell-prog-fill" :style="{ width: pct(a.currentProgress, a.targetProgress) + '%' }" />
            </view>
            <text class="cell-prog-text">{{ a.currentProgress }}/{{ a.targetProgress }}</text>
          </view>
          <text v-if="a.rarity !== 'common'" class="cell-rarity" :style="{ color: rarityColor(a.rarity) }">{{ rarityName(a.rarity) }}</text>
        </view>
      </view>

      <!-- 最近解锁 -->
      <view v-if="stats.recentUnlocked.length > 0" class="recent">
        <text class="recent-title">最近解锁</text>
        <view class="recent-list">
          <view v-for="a in stats.recentUnlocked" :key="a.id" class="recent-item" @tap="openDetail(a)">
            <text class="recent-emoji">{{ a.icon }}</text>
            <view class="recent-info">
              <text class="recent-name">{{ a.name }}</text>
              <text class="recent-time">{{ a.unlockedAt }} 获得</text>
            </view>
            <text class="recent-points">+{{ a.rewardPoints }}</text>
            <AppIcon name="chevron-right" :size="28" color="#9ca3af" />
          </view>
        </view>
      </view>
    </view>

    <!-- 成就详情弹层 -->
    <view v-if="selected" class="mask" @tap="selected = null" />
    <view v-if="selected" class="sheet">
      <view class="sheet-head">
        <text class="sheet-title">成就详情</text>
      </view>
      <scroll-view class="sheet-body" scroll-y>
        <view class="detail-top">
          <text class="detail-emoji" :class="{ 'cell-gray': !selected.isUnlocked }">{{ selected.icon }}</text>
          <text class="detail-name">{{ selected.name }}</text>
          <text class="detail-rarity" :style="{ color: rarityColor(selected.rarity) }">{{ rarityName(selected.rarity) }}成就</text>
          <text class="detail-desc">{{ selected.description }}</text>
        </view>

        <!-- 获得状态 -->
        <view class="status-box" :class="selected.isUnlocked ? 'status-unlocked' : 'status-locked'">
          <view v-if="selected.isUnlocked" class="status-row">
            <AppIcon name="check-circle" :size="56" color="#22c55e" />
            <view class="status-info">
              <text class="status-title status-title-green">已获得此成就</text>
              <text class="status-sub status-sub-green">{{ selected.unlockedAt }} 解锁</text>
            </view>
            <view class="status-pts">
              <text class="status-pts-label">获得积分</text>
              <text class="status-pts-value">+{{ selected.rewardPoints }}</text>
            </view>
          </view>
          <view v-else>
            <view class="status-row status-row-mb">
              <AppIcon name="lock" :size="44" color="#9ca3af" />
              <view class="status-info">
                <text class="status-title">尚未解锁</text>
                <text class="status-sub">{{ selected.condition }}</text>
              </view>
            </view>
            <view class="status-prog">
              <view class="status-prog-track">
                <view class="status-prog-fill" :style="{ width: pct(selected.currentProgress, selected.targetProgress) + '%' }" />
              </view>
              <text class="status-prog-text">{{ selected.currentProgress }}/{{ selected.targetProgress }}</text>
            </view>
          </view>
        </view>

        <!-- 奖励信息 -->
        <view class="reward-box">
          <text class="reward-label">成就奖励</text>
          <view class="reward-row">
            <view class="reward-item">
              <AppIcon name="star" :size="28" color="#c9a96e" />
              <text class="reward-text">{{ selected.rewardPoints }} 积分</text>
            </view>
            <view v-if="selected.rewardBadge" class="reward-item">
              <AppIcon name="trophy" :size="28" color="#c9a96e" />
              <text class="reward-text">{{ selected.rewardBadge }}</text>
            </view>
          </view>
        </view>

        <!-- 相关成就 -->
        <view v-if="relatedAchievements.length > 0" class="related">
          <text class="related-title">相关成就</text>
          <scroll-view class="related-scroll" scroll-x :show-scrollbar="false">
            <view class="related-inner">
              <view
                v-for="r in relatedAchievements"
                :key="r.id"
                class="related-cell"
                :class="r.isUnlocked ? rarityBg(r.rarity) : 'cell-locked'"
                @tap="openDetail(r)"
              >
                <text class="related-emoji" :class="{ 'cell-gray': !r.isUnlocked }">{{ r.icon }}</text>
                <text class="related-name">{{ r.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </scroll-view>
    </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
type Category = 'learning' | 'social' | 'creation' | 'special' | 'activity'
interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  category: Category
  rarity: Rarity
  condition: string
  currentProgress: number
  targetProgress: number
  isUnlocked: boolean
  unlockedAt?: string
  rewardPoints: number
  rewardBadge?: string
}

const allAchievements: Achievement[] = [
  { id: 1, name: '初入国学', description: '完成首次注册，开启国学之旅', icon: '🎓', category: 'learning', rarity: 'common', condition: '完成账号注册', currentProgress: 1, targetProgress: 1, isUnlocked: true, unlockedAt: '2026-01-15', rewardPoints: 10 },
  { id: 2, name: '好学不倦', description: '累计学习时长达到10小时', icon: '📚', category: 'learning', rarity: 'common', condition: '累计学习10小时', currentProgress: 10, targetProgress: 10, isUnlocked: true, unlockedAt: '2026-02-20', rewardPoints: 50 },
  { id: 3, name: '学海无涯', description: '累计学习时长达到100小时', icon: '🏆', category: 'learning', rarity: 'rare', condition: '累计学习100小时', currentProgress: 68, targetProgress: 100, isUnlocked: false, rewardPoints: 200 },
  { id: 4, name: '博古通今', description: '累计学习时长达到500小时', icon: '👑', category: 'learning', rarity: 'legendary', condition: '累计学习500小时', currentProgress: 68, targetProgress: 500, isUnlocked: false, rewardPoints: 1000 },
  { id: 5, name: '广结善缘', description: '关注10位国学爱好者', icon: '🤝', category: 'social', rarity: 'common', condition: '关注10位用户', currentProgress: 10, targetProgress: 10, isUnlocked: true, unlockedAt: '2026-03-10', rewardPoints: 30 },
  { id: 6, name: '德高望重', description: '获得100位粉丝关注', icon: '⭐', category: 'social', rarity: 'rare', condition: '拥有100位粉丝', currentProgress: 45, targetProgress: 100, isUnlocked: false, rewardPoints: 150 },
  { id: 7, name: '桃李满天下', description: '获得1000位粉丝关注', icon: '🌟', category: 'social', rarity: 'epic', condition: '拥有1000位粉丝', currentProgress: 45, targetProgress: 1000, isUnlocked: false, rewardPoints: 500 },
  { id: 8, name: '妙笔生花', description: '发布首篇原创文章', icon: '✍️', category: 'creation', rarity: 'common', condition: '发布1篇文章', currentProgress: 1, targetProgress: 1, isUnlocked: true, unlockedAt: '2026-04-05', rewardPoints: 30 },
  { id: 9, name: '著作等身', description: '累计发布50篇原创内容', icon: '📖', category: 'creation', rarity: 'epic', condition: '发布50篇内容', currentProgress: 12, targetProgress: 50, isUnlocked: false, rewardPoints: 300 },
  { id: 10, name: '春节同庆', description: '参与2026年春节活动', icon: '🧧', category: 'activity', rarity: 'rare', condition: '参与春节限定活动', currentProgress: 1, targetProgress: 1, isUnlocked: true, unlockedAt: '2026-01-28', rewardPoints: 100, rewardBadge: '新春福袋' },
  { id: 11, name: '端午传承', description: '参与2026年端午活动', icon: '🐲', category: 'activity', rarity: 'rare', condition: '参与端午限定活动', currentProgress: 0, targetProgress: 1, isUnlocked: false, rewardPoints: 100 },
  { id: 12, name: '传道授业', description: '成功回答10个问题并被采纳', icon: '💡', category: 'social', rarity: 'rare', condition: '被采纳10次回答', currentProgress: 3, targetProgress: 10, isUnlocked: false, rewardPoints: 100 },
  { id: 13, name: '开山祖师', description: '创建一个超过100人的圈子', icon: '🏛️', category: 'creation', rarity: 'legendary', condition: '圈子成员达100人', currentProgress: 0, targetProgress: 100, isUnlocked: false, rewardPoints: 500 },
  { id: 14, name: '日行一善', description: '连续签到7天', icon: '📅', category: 'special', rarity: 'common', condition: '连续签到7天', currentProgress: 7, targetProgress: 7, isUnlocked: true, unlockedAt: '2026-05-01', rewardPoints: 50 },
  { id: 15, name: '持之以恒', description: '连续签到30天', icon: '🔥', category: 'special', rarity: 'rare', condition: '连续签到30天', currentProgress: 18, targetProgress: 30, isUnlocked: false, rewardPoints: 200 },
  { id: 16, name: '岁月如歌', description: '连续签到365天', icon: '💎', category: 'special', rarity: 'legendary', condition: '连续签到365天', currentProgress: 18, targetProgress: 365, isUnlocked: false, rewardPoints: 2000 },
]

const categories = [
  { key: 'learning' as Category, name: '学习成就', icon: '📚', total: 4, unlocked: 2 },
  { key: 'social' as Category, name: '社交成就', icon: '🤝', total: 4, unlocked: 1 },
  { key: 'creation' as Category, name: '创作成就', icon: '✍️', total: 3, unlocked: 1 },
  { key: 'special' as Category, name: '特殊成就', icon: '⭐', total: 3, unlocked: 1 },
  { key: 'activity' as Category, name: '活动成就', icon: '🎉', total: 2, unlocked: 1 },
]

const stats = {
  totalCount: allAchievements.length,
  unlockedCount: allAchievements.filter((a) => a.isUnlocked).length,
  totalPoints: allAchievements.filter((a) => a.isUnlocked).reduce((s, a) => s + (a.rewardPoints || 0), 0),
  recentUnlocked: allAchievements.filter((a) => a.isUnlocked).slice(-3).reverse(),
}

const loading = ref(true)
const selectedCategory = ref<Category | 'all'>('all')
const selected = ref<Achievement | null>(null)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

const filteredAchievements = computed(() =>
  selectedCategory.value === 'all'
    ? allAchievements
    : allAchievements.filter((a) => a.category === selectedCategory.value),
)

const relatedAchievements = computed(() => {
  if (!selected.value) return []
  return allAchievements.filter((a) => a.category === selected.value!.category && a.id !== selected.value!.id).slice(0, 3)
})

const progressPercent = computed(() => Math.round((stats.unlockedCount / stats.totalCount) * 100))

function pct(cur: number, target: number) {
  return Math.min(100, Math.round((cur / target) * 100))
}
function selectCategory(c: Category | 'all') {
  selectedCategory.value = c
}
function openDetail(a: Achievement) {
  selected.value = a
}
function goBack() {
  uni.navigateBack()
}

function rarityName(r: Rarity) {
  return { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }[r]
}
function rarityColor(r: Rarity) {
  return { common: '#6b7280', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' }[r]
}
function rarityBg(r: Rarity) {
  return { common: 'bg-common', rare: 'bg-rare', epic: 'bg-epic', legendary: 'bg-legendary' }[r]
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.nav-placeholder {
  width: 48rpx;
}

/* 骨架 */
.skeleton {
  padding: 32rpx;
}
.sk-overview {
  height: 256rpx;
  border-radius: 24rpx;
  background: #ece7df;
}
.sk-chips {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}
.sk-chip {
  width: 140rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #ece7df;
}
.sk-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  margin-top: 32rpx;
}
.sk-cell {
  height: 220rpx;
  border-radius: 24rpx;
  background: #ece7df;
}

.body {
  padding-bottom: 160rpx;
}

/* 总览卡片 */
.overview {
  margin: 32rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #c41e3a, #9a1830);
}
.overview-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.overview-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.overview-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}
.overview-value {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
}
.overview-right {
  margin-left: auto;
  text-align: right;
}
.overview-points {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #c9a96e;
}
.progress-track {
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #ffffff;
}
.overview-percent {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 16rpx;
}

/* 分类筛选 */
.chips {
  white-space: nowrap;
  padding: 0 32rpx;
}
.chips-inner {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 16rpx;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 2rpx solid #e5e5e5;
}
.chip-active {
  background: #c41e3a;
  border-color: #c41e3a;
}
.chip-emoji {
  font-size: 26rpx;
}
.chip-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #666666;
}
.chip-count {
  font-size: 26rpx;
  color: #999999;
}
.chip-text-active {
  color: #ffffff;
}

/* 成就网格 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  padding: 32rpx;
}
.cell {
  padding: 24rpx;
  border-radius: 24rpx;
  text-align: center;
  border: 2rpx solid rgba(201, 169, 110, 0.3);
}
.cell-locked {
  background: #f3f4f6;
  opacity: 0.6;
  border-color: transparent;
}
.bg-common { background: #f3f4f6; }
.bg-rare { background: #eff6ff; }
.bg-epic { background: #faf5ff; }
.bg-legendary { background: #fffbeb; }
.cell-emoji {
  display: block;
  font-size: 56rpx;
  margin-bottom: 16rpx;
}
.cell-gray {
  filter: grayscale(1);
}
.cell-name {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #2d2a26;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cell-name-locked {
  color: #6b7280;
}
.cell-got {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.cell-got-text {
  font-size: 20rpx;
  color: #16a34a;
}
.cell-prog {
  margin-top: 8rpx;
}
.cell-prog-track {
  height: 8rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  overflow: hidden;
}
.cell-prog-fill {
  height: 100%;
  background: #c41e3a;
  border-radius: 999rpx;
}
.cell-prog-text {
  display: block;
  font-size: 20rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}
.cell-rarity {
  display: block;
  font-size: 20rpx;
  margin-top: 8rpx;
}

/* 最近解锁 */
.recent {
  padding: 0 32rpx;
  margin-top: 16rpx;
}
.recent-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
  margin-bottom: 24rpx;
}
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.recent-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  border: 2rpx solid #e5e5e5;
}
.recent-emoji {
  font-size: 40rpx;
}
.recent-info {
  flex: 1;
  min-width: 0;
}
.recent-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}
.recent-time {
  display: block;
  font-size: 24rpx;
  color: #666666;
}
.recent-points {
  font-size: 28rpx;
  font-weight: 500;
  color: #c9a96e;
}

/* 弹层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  height: 70vh;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
}
.sheet-head {
  padding: 32rpx;
  border-bottom: 2rpx solid #e5e5e5;
}
.sheet-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #2d2a26;
}
.sheet-body {
  flex: 1;
  padding: 48rpx 0;
}
.detail-top {
  text-align: center;
  padding: 0 32rpx;
}
.detail-emoji {
  display: block;
  font-size: 112rpx;
  margin-bottom: 24rpx;
}
.detail-name {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #2d2a26;
}
.detail-rarity {
  display: block;
  font-size: 26rpx;
  margin-top: 8rpx;
}
.detail-desc {
  display: block;
  font-size: 26rpx;
  color: #666666;
  margin-top: 16rpx;
}

/* 状态盒 */
.status-box {
  margin: 48rpx 32rpx 0;
  padding: 32rpx;
  border-radius: 24rpx;
}
.status-unlocked {
  background: #f0fdf4;
  border: 2rpx solid #bbf7d0;
}
.status-locked {
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.status-row-mb {
  margin-bottom: 24rpx;
}
.status-info {
  flex: 1;
}
.status-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}
.status-title-green {
  color: #15803d;
}
.status-sub {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
}
.status-sub-green {
  color: #16a34a;
}
.status-pts {
  text-align: right;
}
.status-pts-label {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
}
.status-pts-value {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #c9a96e;
}
.status-prog {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.status-prog-track {
  flex: 1;
  height: 16rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  overflow: hidden;
}
.status-prog-fill {
  height: 100%;
  background: #c41e3a;
  border-radius: 999rpx;
}
.status-prog-text {
  font-size: 24rpx;
  color: #6b7280;
}

/* 奖励盒 */
.reward-box {
  margin: 24rpx 32rpx 0;
  padding: 32rpx;
  background: #fff9e6;
  border-radius: 24rpx;
  border: 2rpx solid rgba(201, 169, 110, 0.3);
}
.reward-label {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #8b7355;
  margin-bottom: 16rpx;
}
.reward-row {
  display: flex;
  gap: 32rpx;
}
.reward-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.reward-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}

/* 相关成就 */
.related {
  margin: 48rpx 32rpx 0;
}
.related-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
  margin-bottom: 24rpx;
}
.related-scroll {
  white-space: nowrap;
}
.related-inner {
  display: inline-flex;
  gap: 24rpx;
  padding-bottom: 16rpx;
}
.related-cell {
  width: 160rpx;
  padding: 16rpx;
  border-radius: 24rpx;
  text-align: center;
}
.related-emoji {
  display: block;
  font-size: 40rpx;
}
.related-name {
  display: block;
  font-size: 24rpx;
  margin-top: 8rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
