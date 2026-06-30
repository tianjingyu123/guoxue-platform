<script setup lang="ts">
/**
 * 我的徽章（圈子成长体系）—— 真连 growth 后端
 * 已获得网格 + 待解锁列表(进度条)；徽章用 app-icon 图标（与后端 icon 字段一致）
 * 数据：GET /circles/:id/badges。三态：loading / error / empty。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { growthApi, type BadgeItem } from '@/lib/circle-growth-data'

const RARITY_CFG = {
  common: { label: '普通', cls: 'common', color: '#475569' },
  rare: { label: '稀有', cls: 'rare', color: '#2563EB' },
  epic: { label: '史诗', cls: 'epic', color: '#9333EA' },
  legendary: { label: '传说', cls: 'legendary', color: '#D97706' },
}

const circleId = ref('')
const isLoading = ref(true)
const loadError = ref(false)
const badges = ref<BadgeItem[]>([])

onLoad((query) => {
  circleId.value = (query?.id as string) || ''
  loadBadges()
})

async function loadBadges() {
  if (!circleId.value) { isLoading.value = false; loadError.value = true; return }
  isLoading.value = true
  loadError.value = false
  try {
    const res = await growthApi.badges(circleId.value)
    badges.value = res.badges
  } catch (e) {
    loadError.value = true
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

const earned = computed(() => badges.value.filter((b) => b.earned))
const locked = computed(() => badges.value.filter((b) => !b.earned))
function pct(b: BadgeItem) { return b.total ? Math.min(100, (b.progress / b.total) * 100) : 0 }
function rarityColor(r: BadgeItem['rarity']) { return RARITY_CFG[r]?.color ?? '#475569' }
function fmtDate(s: string | null) { if (!s) return ''; const d = new Date(s); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` }
</script>

<template>
  <view class="bg">
    <view class="bg-header">
      <view @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <text class="bg-title">我的徽章</text>
      <text class="bg-count">{{ earned.length }}/{{ badges.length }}</text>
    </view>

    <!-- 骨架屏 -->
    <view v-if="isLoading" class="bg-body">
      <view class="bg-grid">
        <view v-for="i in 6" :key="i" class="bg-card common bg-skel" />
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="loadError" class="bg-state">
      <app-icon name="alert-circle" :size="72" color="#CCCCCC" />
      <text class="bg-state-t">加载失败</text>
      <view class="bg-retry" @tap="loadBadges">重试</view>
    </view>

    <!-- 空态 -->
    <view v-else-if="badges.length === 0" class="bg-state">
      <app-icon name="award" :size="72" color="#CCCCCC" />
      <text class="bg-state-t">暂无徽章</text>
    </view>

    <view v-else class="bg-body">
      <!-- 已获得 -->
      <text class="bg-section">已获得 {{ earned.length }} 枚</text>
      <view v-if="earned.length" class="bg-grid">
        <view v-for="b in earned" :key="b.code" class="bg-card" :class="RARITY_CFG[b.rarity].cls">
          <view class="bg-badge-ic" :style="{ background: rarityColor(b.rarity) + '22' }">
            <app-icon :name="b.icon" :size="44" :color="rarityColor(b.rarity)" />
          </view>
          <text class="bg-name">{{ b.name }}</text>
          <text class="bg-rarity" :class="RARITY_CFG[b.rarity].cls">{{ RARITY_CFG[b.rarity].label }}</text>
          <text v-if="b.gainedAt" class="bg-date">{{ fmtDate(b.gainedAt) }}</text>
        </view>
      </view>
      <view v-else class="bg-mini-empty">还没有获得徽章，快去签到/发帖解锁吧</view>

      <!-- 待解锁 -->
      <text class="bg-section mt">待解锁 {{ locked.length }} 枚</text>
      <view class="bg-locked-list">
        <view v-for="b in locked" :key="b.code" class="bg-locked">
          <view class="bg-locked-icon"><app-icon :name="b.icon" :size="40" color="#BBBBBB" /></view>
          <view class="bg-locked-main">
            <view class="bg-locked-top">
              <text class="bg-locked-name">{{ b.name }}</text>
              <text class="bg-rarity-tag" :class="RARITY_CFG[b.rarity].cls">{{ RARITY_CFG[b.rarity].label }}</text>
            </view>
            <text class="bg-locked-desc">{{ b.desc }}</text>
            <view class="bg-progress-row">
              <view class="bg-progress"><view class="bg-progress-bar" :style="{ width: pct(b) + '%' }" /></view>
              <text class="bg-progress-txt">{{ b.progress }}/{{ b.total }}</text>
            </view>
          </view>
          <app-icon name="lock" :size="28" color="#999999" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bg { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.bg-header { position: sticky; top: 0; z-index: 10; background: var(--bg-paper, #FAF8F5); border-bottom: 2rpx solid var(--border, #EDE8E0); display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 96rpx; padding-top: var(--status-bar-height, 0px); }
.bg-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.bg-count { font-size: 24rpx; color: #999; }
.bg-body { padding: 0 32rpx 160rpx; }
.bg-section { display: block; font-size: 22rpx; font-weight: 600; color: #999; letter-spacing: 2rpx; margin: 40rpx 0 24rpx; }
.bg-section.mt { margin-top: 64rpx; }
.bg-grid { display: flex; flex-wrap: wrap; gap: 24rpx; }
.bg-card { width: calc((100% - 48rpx) / 3); display: flex; flex-direction: column; align-items: center; padding: 24rpx; border-radius: 24rpx; border: 2rpx solid; box-sizing: border-box; }
.bg-card.common { background: #F8FAFC; border-color: #E2E8F0; }
.bg-card.rare { background: #EFF6FF; border-color: #BFDBFE; }
.bg-card.epic { background: #FAF5FF; border-color: #E9D5FF; }
.bg-card.legendary { background: #FFFBEB; border-color: #FCD34D; }
.bg-skel { height: 200rpx; opacity: 0.5; }
.bg-badge-ic { width: 96rpx; height: 96rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.bg-name { font-size: 24rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); text-align: center; }
.bg-rarity { font-size: 20rpx; margin-top: 8rpx; }
.bg-rarity.common { color: #475569; }
.bg-rarity.rare { color: #2563EB; }
.bg-rarity.epic { color: #9333EA; }
.bg-rarity.legendary { color: #D97706; }
.bg-date { font-size: 20rpx; color: #999; margin-top: 8rpx; }
.bg-mini-empty { font-size: 24rpx; color: #999; padding: 24rpx 0; }
.bg-locked-list { display: flex; flex-direction: column; gap: 16rpx; }
.bg-locked { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: rgba(240,235,227,0.4); border: 2rpx solid var(--border, #EDE8E0); border-radius: 24rpx; }
.bg-locked-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; background: #F0EBE3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: 0.6; }
.bg-locked-main { flex: 1; min-width: 0; }
.bg-locked-top { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.bg-locked-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.bg-rarity-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 999rpx; border: 2rpx solid; }
.bg-rarity-tag.common { background: #F8FAFC; border-color: #E2E8F0; color: #475569; }
.bg-rarity-tag.rare { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }
.bg-rarity-tag.epic { background: #FAF5FF; border-color: #E9D5FF; color: #9333EA; }
.bg-rarity-tag.legendary { background: #FFFBEB; border-color: #FCD34D; color: #D97706; }
.bg-locked-desc { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.bg-progress-row { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.bg-progress { flex: 1; height: 12rpx; background: #F0EBE3; border-radius: 999rpx; overflow: hidden; }
.bg-progress-bar { height: 100%; background: rgba(196,30,58,0.5); border-radius: 999rpx; }
.bg-progress-txt { font-size: 20rpx; color: #999; flex-shrink: 0; }
.bg-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; gap: 24rpx; }
.bg-state-t { font-size: 28rpx; color: #999; }
.bg-retry { padding: 14rpx 48rpx; background: var(--brand); color: #fff; font-size: 26rpx; border-radius: 999rpx; }
</style>
