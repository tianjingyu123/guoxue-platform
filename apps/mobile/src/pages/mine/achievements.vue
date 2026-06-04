<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-left">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <text class="header-title">
          成就墙
        </text>
      </view>
      <text class="header-right">
&nbsp;
      </text>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!data"
      empty-title="暂无成就"
      @retry="loadData"
    >
      <view
        v-if="data"
        class="content"
      >
        <!-- 总览卡片 -->
        <view class="overview-card">
          <view class="overview-top">
            <view class="overview-icon-wrap">
              <text class="overview-icon">
                🏆
              </text>
            </view>
            <view class="overview-info">
              <text class="overview-label">
                成就进度
              </text>
              <text class="overview-count">
                {{ data.stats.unlockedCount }}/{{ data.stats.totalCount }}
              </text>
            </view>
            <view class="overview-points">
              <text class="overview-label">
                累计积分
              </text>
              <text class="overview-points-val">
                +{{ data.stats.totalPoints }}
              </text>
            </view>
          </view>
          <view class="progress-wrap">
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: progressPercent + '%' }"
              />
            </view>
            <text class="progress-text">
              {{ progressPercent }}%
            </text>
          </view>
        </view>

        <!-- 分类筛选 -->
        <scroll-view
          scroll-x
          class="cats-scroll"
          show-scrollbar="false"
        >
          <view class="cats-inner">
            <text
              class="cat-btn"
              :class="{ active: selectedCategory === 'all' }"
              @click="selectedCategory = 'all'; loadData()"
            >
              全部 ({{ data.stats.totalCount }})
            </text>
            <text
              v-for="cat in data.categories"
              :key="cat.key"
              class="cat-btn"
              :class="{ active: selectedCategory === cat.key }"
              @click="selectedCategory = cat.key; loadData()"
            >
              <text>{{ cat.icon }} </text>
              <text>{{ cat.name.replace('成就', '') }} ({{ cat.unlocked }}/{{ cat.total }})</text>
            </text>
          </view>
        </scroll-view>

        <!-- 成就网格 -->
        <view class="grid">
          <view
            v-for="ach in data.achievements"
            :key="ach.id"
            class="ach-item"
            :class="{ locked: !ach.isUnlocked }"
            @click="openDetail(ach)"
          >
            <text
              class="ach-icon"
              :class="{ grayscale: !ach.isUnlocked }"
            >
              {{ ach.icon || '🏆' }}
            </text>
            <text class="ach-name">
              {{ ach.name }}
            </text>
            <view
              v-if="ach.isUnlocked"
              class="ach-status"
            >
              <text class="ach-check">
                ✓
              </text>
              <text class="ach-status-txt">
                已获得
              </text>
            </view>
            <view
              v-else
              class="ach-progress"
            >
              <view class="ach-progress-bar">
                <view
                  class="ach-progress-fill"
                  :style="{ width: (ach.currentProgress / ach.targetProgress * 100) + '%' }"
                />
              </view>
              <text class="ach-progress-num">
                {{ ach.currentProgress }}/{{ ach.targetProgress }}
              </text>
            </view>
            <text
              v-if="ach.rarity !== 'common'"
              class="ach-rarity"
              :style="{ color: rarityColor(ach.rarity) }"
            >
              {{ rarityName(ach.rarity) }}
            </text>
          </view>
        </view>

        <!-- 最近解锁 -->
        <view
          v-if="data.stats.recentUnlocked?.length"
          class="recent-section"
        >
          <text class="section-title">
            最近解锁
          </text>
          <view
            v-for="ach in data.stats.recentUnlocked"
            :key="ach.id"
            class="recent-item"
            @click="openDetail(ach)"
          >
            <text class="recent-icon">
              {{ ach.icon }}
            </text>
            <view class="recent-info">
              <text class="recent-name">
                {{ ach.name }}
              </text>
              <text class="recent-time">
                {{ ach.unlockedAt }}
              </text>
            </view>
            <text class="recent-points">
              +{{ ach.rewardPoints }}
            </text>
            <text class="recent-arrow">
              ›
            </text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 成就详情弹窗 -->
    <view
      v-if="selectedAchievement"
      class="sheet-mask"
      @click="selectedAchievement = null"
    />
    <view
      v-if="selectedAchievement"
      class="sheet-content"
    >
      <view class="sheet-handle" />
      <view
        class="sheet-close"
        @click="selectedAchievement = null"
      >
        ✕
      </view>
      <text class="sheet-title">
        成就详情
      </text>

      <scroll-view
        scroll-y
        class="sheet-body"
      >
        <view class="detail-icon-wrap">
          <text
            class="detail-icon"
            :class="{ grayscale: !selectedAchievement.isUnlocked }"
          >
            {{ selectedAchievement.icon }}
          </text>
          <text class="detail-name">
            {{ selectedAchievement.name }}
          </text>
          <text
            class="detail-rarity"
            :style="{ color: rarityColor(selectedAchievement.rarity) }"
          >
            {{ rarityName(selectedAchievement.rarity) }}成就
          </text>
          <text class="detail-desc">
            {{ selectedAchievement.description }}
          </text>
        </view>

        <view
          class="detail-status"
          :class="selectedAchievement.isUnlocked ? 'status-unlocked' : 'status-locked'"
        >
          <view
            v-if="selectedAchievement.isUnlocked"
            class="status-row"
          >
            <text class="status-ok">
              ✓
            </text>
            <view>
              <text class="status-title">
                已获得此成就
              </text>
              <text class="status-time">
                {{ selectedAchievement.unlockedAt }} 解锁
              </text>
            </view>
            <view class="status-points">
              <text class="status-plabel">
                获得积分
              </text>
              <text class="status-pval">
                +{{ selectedAchievement.rewardPoints }}
              </text>
            </view>
          </view>
          <view v-else>
            <view class="status-row">
              <text class="status-lock-icon">
                🔒
              </text>
              <view>
                <text class="status-title">
                  尚未解锁
                </text>
                <text class="status-time">
                  {{ selectedAchievement.condition }}
                </text>
              </view>
            </view>
            <view class="detail-progress-row">
              <view class="detail-progress-bar">
                <view
                  class="detail-progress-fill"
                  :style="{ width: (selectedAchievement.currentProgress / selectedAchievement.targetProgress * 100) + '%' }"
                />
              </view>
              <text class="detail-progress-num">
                {{ selectedAchievement.currentProgress }}/{{ selectedAchievement.targetProgress }}
              </text>
            </view>
          </view>
        </view>

        <view class="reward-box">
          <text class="reward-title">
            成就奖励
          </text>
          <view class="reward-items">
            <text>⭐ {{ selectedAchievement.rewardPoints }} 积分</text>
            <text v-if="selectedAchievement.rewardBadge">
              🏆 {{ selectedAchievement.rewardBadge }}
            </text>
          </view>
        </view>

        <view
          v-if="detailData?.relatedAchievements?.length"
          class="related-section"
        >
          <text class="section-title">
            相关成就
          </text>
          <scroll-view
            scroll-x
            class="related-scroll"
            show-scrollbar="false"
          >
            <view
              v-for="r in detailData.relatedAchievements"
              :key="r.id"
              class="related-item"
              :class="{ locked: !r.isUnlocked }"
              @click="openDetail(r)"
            >
              <text
                class="related-icon"
                :class="{ grayscale: !r.isUnlocked }"
              >
                {{ r.icon }}
              </text>
              <text class="related-name">
                {{ r.name }}
              </text>
            </view>
          </scroll-view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../../api'
import DataState from '../../components/DataState.vue'

interface AchievementItem {
  id: string; icon?: string; name: string; description?: string
  isUnlocked: boolean; unlockedAt?: string; condition?: string
  currentProgress: number; targetProgress: number
  rarity: string; rewardPoints: number; rewardBadge?: string
}
interface CategoryItem { key: string; name: string; icon: string; unlocked: number; total: number }
interface AchievementsData {
  stats: { unlockedCount: number; totalCount: number; totalPoints: number; recentUnlocked?: AchievementItem[] }
  categories: CategoryItem[]
  achievements: AchievementItem[]
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const data = ref<AchievementsData | null>(null)
const selectedCategory = ref<string>('all')
const selectedAchievement = ref<AchievementItem | null>(null)
const detailData = ref<{ relatedAchievements?: AchievementItem[] } | null>(null)

const progressPercent = computed(() => {
  if (!data.value) return 0
  return Math.round((data.value.stats.unlockedCount / data.value.stats.totalCount) * 100)
})

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    const params: any = {}
    if (selectedCategory.value !== 'all') params.category = selectedCategory.value
    const res: any = await api.get('/achievements', params)
    data.value = res && (res.data || res)
    if (!data.value) {
      data.value = {
        stats: { unlockedCount: 2, totalCount: 4, totalPoints: 200, recentUnlocked: [] },
        categories: [{ key: 'study', name: '学习成就', icon: '📚', unlocked: 1, total: 2 }],
        achievements: [
          { id: '1', icon: '📚', name: '初学者', isUnlocked: true, currentProgress: 1, targetProgress: 1, rarity: 'common', rewardPoints: 50, description: '完成第一门课程' },
          { id: '2', icon: '🎓', name: '学有所成', isUnlocked: true, unlockedAt: '2026-05-20', currentProgress: 5, targetProgress: 5, rarity: 'rare', rewardPoints: 100, description: '完成5门课程' },
          { id: '3', icon: '✍️', name: '笔耕不辍', isUnlocked: false, condition: '发布10篇帖子', currentProgress: 3, targetProgress: 10, rarity: 'epic', rewardPoints: 200, description: '发布10篇帖子' },
          { id: '4', icon: '🏅', name: '竞赛达人', isUnlocked: false, condition: '赢得3场竞赛', currentProgress: 1, targetProgress: 3, rarity: 'legendary', rewardPoints: 500, description: '赢得3场竞赛' },
        ],
      }
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function openDetail(ach: AchievementItem) {
  selectedAchievement.value = ach
  detailData.value = null
  try {
    const res: any = await api.get(`/achievements/${ach.id}`)
    if (res) detailData.value = res.data || res
  } catch { /* ignore */ }
}

function rarityColor(rarity: string): string {
  const map: Record<string, string> = { common: '#999', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF6D00' }
  return map[rarity] || '#999'
}
function rarityName(rarity: string): string {
  const map: Record<string, string> = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }
  return map[rarity] || rarity
}
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }
.header { position: sticky; top: 0; z-index: 10; background: #F5F0E8; border-bottom: 1rpx solid rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: space-between; padding: 24rpx 24rpx 20rpx; }
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 40rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 40rpx; }

.content { padding: 0 24rpx; }
.overview-card { background: linear-gradient(135deg, #C41E3A, #9a1830); border-radius: 16rpx; padding: 24rpx; color: #fff; margin-top: 24rpx; }
.overview-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.overview-icon-wrap { width: 72rpx; height: 72rpx; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.overview-info { flex: 1; }
.overview-label { font-size: 22rpx; opacity: 0.8; }
.overview-count { font-size: 40rpx; font-weight: bold; }
.overview-points { text-align: right; }
.overview-points-val { font-size: 32rpx; font-weight: 600; color: #C9A96E; }
.progress-wrap { display: flex; align-items: center; gap: 12rpx; }
.progress-bar { flex: 1; height: 12rpx; background: rgba(255,255,255,0.2); border-radius: 6rpx; overflow: hidden; }
.progress-fill { height: 100%; background: #C9A96E; border-radius: 6rpx; transition: width 0.3s; }
.progress-text { font-size: 22rpx; opacity: 0.8; }

.cats-scroll { margin-top: 24rpx; white-space: nowrap; }
.cats-inner { display: inline-flex; gap: 12rpx; }
.cat-btn { display: inline-block; font-size: 24rpx; color: #666; padding: 12rpx 28rpx; border-radius: 28rpx; background: #fff; border: 1rpx solid #E5E1DB; }
.cat-btn.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 24rpx; }
.ach-item { background: #fff; border-radius: 16rpx; padding: 20rpx; text-align: center; }
.ach-item.locked { background: #f5f5f5; opacity: 0.6; }
.ach-icon { font-size: 56rpx; display: block; margin-bottom: 8rpx; }
.ach-icon.grayscale { filter: grayscale(1); }
.ach-name { font-size: 22rpx; color: #2C2C2C; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ach-status { display: flex; align-items: center; justify-content: center; gap: 4rpx; margin-top: 8rpx; }
.ach-check { font-size: 20rpx; color: #22C55E; }
.ach-status-txt { font-size: 20rpx; color: #22C55E; }
.ach-progress { margin-top: 8rpx; }
.ach-progress-bar { height: 8rpx; background: #E5E1DB; border-radius: 4rpx; overflow: hidden; }
.ach-progress-fill { height: 100%; background: #C41E3A; border-radius: 4rpx; }
.ach-progress-num { font-size: 18rpx; color: #999; margin-top: 4rpx; display: block; }
.ach-rarity { font-size: 18rpx; display: block; margin-top: 4rpx; }

.recent-section { margin-top: 40rpx; }
.section-title { font-size: 24rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.recent-item { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 12rpx; padding: 16rpx; margin-bottom: 12rpx; }
.recent-icon { font-size: 40rpx; }
.recent-info { flex: 1; }
.recent-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; }
.recent-time { font-size: 20rpx; color: #999; }
.recent-points { font-size: 24rpx; color: #C9A96E; font-weight: 500; }
.recent-arrow { font-size: 32rpx; color: #ccc; }

.sheet-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; }
.sheet-content { position: fixed; bottom: 0; left: 0; right: 0; z-index: 101; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 75vh; display: flex; flex-direction: column; }
.sheet-handle { width: 60rpx; height: 6rpx; background: #ddd; border-radius: 3rpx; margin: 16rpx auto 8rpx; }
.sheet-close { position: absolute; top: 16rpx; right: 24rpx; font-size: 32rpx; color: #999; z-index: 1; }
.sheet-title { text-align: center; font-size: 28rpx; font-weight: 600; color: #2C2C2C; padding: 16rpx 0; border-bottom: 1rpx solid #E5E1DB; }
.sheet-body { padding: 32rpx 24rpx; }
.detail-icon-wrap { text-align: center; }
.detail-icon { font-size: 96rpx; display: block; margin-bottom: 16rpx; }
.detail-icon.grayscale { filter: grayscale(1); }
.detail-name { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; }
.detail-rarity { font-size: 24rpx; display: block; margin-top: 8rpx; }
.detail-desc { font-size: 24rpx; color: #666; margin-top: 12rpx; display: block; }
.detail-status { border-radius: 16rpx; padding: 24rpx; margin-top: 24rpx; }
.status-unlocked { background: #f0fdf4; border: 1rpx solid #bbf7d0; }
.status-locked { background: #f9fafb; border: 1rpx solid #e5e7eb; }
.status-row { display: flex; align-items: center; gap: 12rpx; }
.status-ok { font-size: 40rpx; color: #22C55E; }
.status-lock-icon { font-size: 36rpx; }
.status-title { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; }
.status-time { font-size: 20rpx; color: #666; }
.status-points { margin-left: auto; text-align: right; }
.status-plabel { font-size: 20rpx; color: #999; display: block; }
.status-pval { font-size: 28rpx; font-weight: 600; color: #C9A96E; }
.detail-progress-row { display: flex; align-items: center; gap: 12rpx; margin-top: 16rpx; }
.detail-progress-bar { flex: 1; height: 12rpx; background: #E5E1DB; border-radius: 6rpx; overflow: hidden; }
.detail-progress-fill { height: 100%; background: #C41E3A; border-radius: 6rpx; }
.detail-progress-num { font-size: 22rpx; color: #666; }

.reward-box { background: #FFF9E6; border-radius: 16rpx; padding: 24rpx; margin-top: 24rpx; border: 1rpx solid rgba(201,169,110,0.3); }
.reward-title { font-size: 22rpx; font-weight: 500; color: #8B7355; display: block; margin-bottom: 12rpx; }
.reward-items { display: flex; gap: 20rpx; font-size: 24rpx; color: #2C2C2C; }

.related-section { margin-top: 40rpx; }
.related-scroll { white-space: nowrap; }
.related-item { display: inline-flex; flex-direction: column; align-items: center; width: 120rpx; padding: 16rpx; border-radius: 12rpx; background: #f5f5f5; margin-right: 12rpx; }
.related-item.locked { opacity: 0.6; }
.related-icon { font-size: 40rpx; }
.related-icon.grayscale { filter: grayscale(1); }
.related-name { font-size: 20rpx; color: #2C2C2C; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: center; }
</style>
