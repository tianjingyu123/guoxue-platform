<script setup lang="ts">
/**
 * 圈子排行榜（从原型 app/circles/ranking/page.tsx 167行高保真迁移）
 * 渐变顶部 + 三Tab(成员数/最活跃/高质量) + 前3名台阶式 + 4名后列表
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

type RankTab = 'members' | 'active' | 'quality'
interface RankItem {
  id: string; rank: number; name: string; cover: string
  value: string; subValue: string; category: string; owner: string
}

const rankData: Record<RankTab, RankItem[]> = {
  members: [
    { id: '4', rank: 1, name: '易经研究会', cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop', value: '15,200', subValue: '成员', category: '易学', owner: '李玄机' },
    { id: '1', rank: 2, name: '八字命理研习社', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', value: '12,580', subValue: '成员', category: '命理', owner: '周易大师' },
    { id: '2', rank: 3, name: '紫微斗数学院', cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop', value: '8,960', subValue: '成员', category: '命理', owner: '张玄风' },
    { id: '3', rank: 4, name: '风水堪舆交流', cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop', value: '6,320', subValue: '成员', category: '风水', owner: '王德华' },
    { id: '6', rank: 5, name: '国学文化圈', cover: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=200&h=200&fit=crop', value: '5,870', subValue: '成员', category: '国学', owner: '陈学文' },
    { id: '5', rank: 6, name: '奇门遁甲精研', cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop', value: '4,580', subValue: '成员', category: '命理', owner: '林奇门' },
    { id: '7', rank: 7, name: '六爻神断', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop', value: '3,920', subValue: '成员', category: '命理', owner: '赵六爻' },
    { id: '8', rank: 8, name: '梅花易数', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop', value: '3,240', subValue: '成员', category: '易学', owner: '钱梅花' },
  ],
  active: [
    { id: '1', rank: 1, name: '八字命理研习社', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', value: '3,256', subValue: '今日帖子', category: '命理', owner: '周易大师' },
    { id: '2', rank: 2, name: '紫微斗数学院', cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop', value: '2,890', subValue: '今日帖子', category: '命理', owner: '张玄风' },
    { id: '4', rank: 3, name: '易经研究会', cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop', value: '2,560', subValue: '今日帖子', category: '易学', owner: '李玄机' },
    { id: '3', rank: 4, name: '风水堪舆交流', cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop', value: '1,980', subValue: '今日帖子', category: '风水', owner: '王德华' },
    { id: '6', rank: 5, name: '国学文化圈', cover: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=200&h=200&fit=crop', value: '1,750', subValue: '今日帖子', category: '国学', owner: '陈学文' },
    { id: '5', rank: 6, name: '奇门遁甲精研', cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop', value: '1,320', subValue: '今日帖子', category: '命理', owner: '林奇门' },
    { id: '7', rank: 7, name: '六爻神断', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop', value: '980', subValue: '今日帖子', category: '命理', owner: '赵六爻' },
    { id: '8', rank: 8, name: '梅花易数', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop', value: '860', subValue: '今日帖子', category: '易学', owner: '钱梅花' },
  ],
  quality: [
    { id: '2', rank: 1, name: '紫微斗数学院', cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop', value: '98.5%', subValue: '精华率', category: '命理', owner: '张玄风' },
    { id: '4', rank: 2, name: '易经研究会', cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop', value: '96.2%', subValue: '精华率', category: '易学', owner: '李玄机' },
    { id: '1', rank: 3, name: '八字命理研习社', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', value: '95.8%', subValue: '精华率', category: '命理', owner: '周易大师' },
    { id: '5', rank: 4, name: '奇门遁甲精研', cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop', value: '94.1%', subValue: '精华率', category: '命理', owner: '林奇门' },
    { id: '3', rank: 5, name: '风水堪舆交流', cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop', value: '93.5%', subValue: '精华率', category: '风水', owner: '王德华' },
    { id: '6', rank: 6, name: '国学文化圈', cover: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=200&h=200&fit=crop', value: '92.0%', subValue: '精华率', category: '国学', owner: '陈学文' },
    { id: '8', rank: 7, name: '梅花易数', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop', value: '91.3%', subValue: '精华率', category: '易学', owner: '钱梅花' },
    { id: '7', rank: 8, name: '六爻神断', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop', value: '89.7%', subValue: '精华率', category: '命理', owner: '赵六爻' },
  ],
}

const activeTab = ref<RankTab>('members')
const tabs: { value: RankTab; label: string }[] = [
  { value: 'members', label: '成员数' },
  { value: 'active', label: '最活跃' },
  { value: 'quality', label: '高质量' },
]
const list = computed(() => rankData[activeTab.value])
const top3 = computed(() => list.value.slice(0, 3))
const rest = computed(() => list.value.slice(3))

function openCircle(id: string) { navigateTo(`/pkg-circle/circles/detail?id=${id}`) }
</script>

<template>
  <view class="rk">
    <!-- 渐变顶部 -->
    <view class="rk-top">
      <view class="rk-head">
        <view @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
        <text class="rk-title">圈子排行榜</text>
        <app-icon name="trophy" :size="44" color="#FCD34D" />
      </view>
      <view class="rk-tabs">
        <view v-for="tab in tabs" :key="tab.value" class="rk-tab" :class="{ on: activeTab === tab.value }" @tap="activeTab = tab.value">
          <text class="rk-tab-txt" :class="{ on: activeTab === tab.value }">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 前3名台阶式 -->
    <view class="rk-podium">
      <!-- 第2名 -->
      <view class="rk-pod rk-pod-2">
        <view class="rk-pod-avatar-wrap">
          <image :src="top3[1]?.cover" class="rk-pod-avatar silver" mode="aspectFill" />
          <view class="rk-pod-rank silver">2</view>
        </view>
        <text class="rk-pod-name">{{ top3[1]?.name }}</text>
        <text class="rk-pod-value">{{ top3[1]?.value }}</text>
        <text class="rk-pod-sub">{{ top3[1]?.subValue }}</text>
      </view>
      <!-- 第1名 -->
      <view class="rk-pod rk-pod-1">
        <view class="rk-pod-crown"><app-icon name="crown" :size="32" color="#F59E0B" /></view>
        <view class="rk-pod-avatar-wrap">
          <image :src="top3[0]?.cover" class="rk-pod-avatar gold" mode="aspectFill" />
          <view class="rk-pod-rank gold">1</view>
        </view>
        <text class="rk-pod-name">{{ top3[0]?.name }}</text>
        <text class="rk-pod-value gold">{{ top3[0]?.value }}</text>
        <text class="rk-pod-sub">{{ top3[0]?.subValue }}</text>
      </view>
      <!-- 第3名 -->
      <view class="rk-pod rk-pod-2">
        <view class="rk-pod-avatar-wrap">
          <image :src="top3[2]?.cover" class="rk-pod-avatar bronze" mode="aspectFill" />
          <view class="rk-pod-rank bronze">3</view>
        </view>
        <text class="rk-pod-name">{{ top3[2]?.name }}</text>
        <text class="rk-pod-value">{{ top3[2]?.value }}</text>
        <text class="rk-pod-sub">{{ top3[2]?.subValue }}</text>
      </view>
    </view>

    <!-- 4名后列表 -->
    <view class="rk-list">
      <view v-for="c in rest" :key="c.id" class="rk-row" @tap="openCircle(c.id)">
        <text class="rk-row-rank">{{ c.rank }}</text>
        <image :src="c.cover" class="rk-row-avatar" mode="aspectFill" />
        <view class="rk-row-main">
          <view class="rk-row-name-row">
            <text class="rk-row-name">{{ c.name }}</text>
            <text class="rk-row-cat">{{ c.category }}</text>
          </view>
          <text class="rk-row-owner">{{ c.owner }}</text>
        </view>
        <view class="rk-row-val">
          <text class="rk-row-value">{{ c.value }}</text>
          <text class="rk-row-sub">{{ c.subValue }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.rk { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.rk-top { background: linear-gradient(135deg, #C41E3A, #8B0000); padding: 24rpx 32rpx 128rpx; padding-top: calc(48rpx + var(--status-bar-height, 0px)); }
.rk-head { display: flex; align-items: center; gap: 24rpx; margin-bottom: 48rpx; }
.rk-title { flex: 1; font-size: 40rpx; font-weight: 700; color: #fff; }
.rk-tabs { display: flex; background: rgba(255,255,255,0.1); border-radius: 24rpx; padding: 8rpx; gap: 8rpx; }
.rk-tab { flex: 1; padding: 16rpx 0; border-radius: 16rpx; text-align: center; }
.rk-tab.on { background: #fff; }
.rk-tab-txt { font-size: 28rpx; font-weight: 500; color: rgba(255,255,255,0.8); }
.rk-tab-txt.on { color: var(--brand, #C41E3A); }
/* 台阶 */
.rk-podium { display: flex; gap: 16rpx; padding: 0 32rpx; margin-top: -80rpx; align-items: flex-end; }
.rk-pod { flex: 1; display: flex; flex-direction: column; align-items: center; background: var(--card, #fff); border-radius: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); padding-bottom: 24rpx; }
.rk-pod-2 { margin-top: 48rpx; padding-top: 16rpx; border: 2rpx solid var(--border, #EDE8E0); }
.rk-pod-1 { border: 2rpx solid #FDE68A; }
.rk-pod-crown { width: 100%; background: rgba(251,191,36,0.2); padding: 8rpx 0; text-align: center; border-radius: 24rpx 24rpx 0 0; margin-bottom: 16rpx; display: flex; justify-content: center; }
.rk-pod-avatar-wrap { position: relative; margin-bottom: 16rpx; }
.rk-pod-avatar { width: 112rpx; height: 112rpx; border-radius: 24rpx; border: 4rpx solid #CBD5E1; }
.rk-pod-avatar.gold { width: 128rpx; height: 128rpx; border-color: #FBBF24; }
.rk-pod-avatar.silver { border-color: #CBD5E1; }
.rk-pod-avatar.bronze { border-color: #FDBA74; }
.rk-pod-rank { position: absolute; bottom: -8rpx; right: -8rpx; width: 40rpx; height: 40rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; color: #fff; }
.rk-pod-rank.gold { background: #FBBF24; color: #78350F; }
.rk-pod-rank.silver { background: #94A3B8; }
.rk-pod-rank.bronze { background: #FB923C; }
.rk-pod-name { font-size: 24rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); text-align: center; padding: 0 8rpx; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-pod-value { font-size: 28rpx; font-weight: 700; color: var(--brand, #C41E3A); margin-top: 4rpx; }
.rk-pod-value.gold { font-size: 32rpx; color: #D97706; }
.rk-pod-sub { font-size: 20rpx; color: #999; }
/* 列表 */
.rk-list { padding: 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.rk-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: var(--card, #fff); border-radius: 24rpx; border: 2rpx solid var(--border, #EDE8E0); }
.rk-row-rank { width: 48rpx; text-align: center; font-size: 28rpx; font-weight: 700; color: #999; flex-shrink: 0; }
.rk-row-avatar { width: 88rpx; height: 88rpx; border-radius: 20rpx; flex-shrink: 0; }
.rk-row-main { flex: 1; min-width: 0; }
.rk-row-name-row { display: flex; align-items: center; gap: 12rpx; }
.rk-row-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280rpx; }
.rk-row-cat { font-size: 20rpx; padding: 2rpx 12rpx; background: #F5F0E8; color: #999; border-radius: 8rpx; flex-shrink: 0; }
.rk-row-owner { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.rk-row-val { text-align: right; flex-shrink: 0; }
.rk-row-value { display: block; font-size: 28rpx; font-weight: 700; color: var(--brand, #C41E3A); }
.rk-row-sub { font-size: 20rpx; color: #999; }
</style>
