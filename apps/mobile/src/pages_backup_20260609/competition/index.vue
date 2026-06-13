<template>
  <view class="comp-page">
    <view class="comp-header">
      <view class="ch-row">
        <text class="ch-back" @click="uni.navigateBack()">‹</text>
        <text class="ch-title">赛事中心</text>
        <text class="ch-archive" @click="goPage('/pages/competition/archive/index')">往期</text>
      </view>
    </view>

    <view class="search-row">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input v-model="searchQuery" class="search-input" placeholder="搜索赛事名称..." />
      </view>
    </view>

    <!-- 热门赛事横幅 -->
    <view v-if="hotComp" class="hot-banner" @click="goPage('/pages/competition/detail/index?id=' + hotComp.id)">
      <view class="hb-deco hb-d1" /><view class="hb-deco hb-d2" />
      <view class="hb-content">
        <view class="hb-badges">
          <text class="hb-hot-badge">🔥 热门赛事</text>
          <text class="hb-status" :class="statusClass(hotComp.status)">{{ statusLabel(hotComp.status) }}</text>
        </view>
        <text class="hb-title">{{ hotComp.title }}</text>
        <text class="hb-sub">{{ hotComp.organizer }} · {{ hotComp.participants }}人已报名</text>
        <view class="hb-prize">🏆 {{ hotComp.prizes[0] }}</view>
        <view class="hb-bottom">
          <text class="hb-deadline">报名截止: {{ hotComp.registrationDeadline }}</text>
          <view class="hb-btn">立即报名</view>
        </view>
      </view>
    </view>

    <!-- 分类 -->
    <scroll-view scroll-x class="cat-row">
      <text v-for="c in compCategories" :key="c.id" class="cat-chip" :class="{ active: activeCat === c.id }" @click="activeCat = c.id">{{ c.label }}</text>
    </scroll-view>

    <!-- 状态Tab -->
    <view class="status-tabs">
      <text v-for="t in statusTabs" :key="t.id" class="st-item" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">{{ t.label }}</text>
    </view>

    <!-- 赛事列表 -->
    <view class="comp-list">
      <view v-for="c in filteredComps" :key="c.id" class="comp-card" @click="goPage('/pages/competition/detail/index?id=' + c.id)">
        <view class="cc-cover">
          <text class="cc-cover-icon">🏆</text>
          <view class="cc-cover-badges">
            <text class="cc-status-badge" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</text>
            <text class="cc-type-badge">{{ typeLabel(c.type) }}</text>
          </view>
          <view v-if="c.status === 'ended' && c.winner" class="cc-winner">
            <text>👑 冠军: {{ c.winner.name }}</text>
          </view>
        </view>
        <view class="cc-body">
          <text class="cc-title">{{ c.title }}</text>
          <view class="cc-organizer">
            <text>{{ c.organizer }}</text>
          </view>
          <view class="cc-tags">
            <text v-for="t in c.tags" :key="t" class="cc-tag">{{ t }}</text>
          </view>
          <view class="cc-footer">
            <view class="cc-stats">
              <text>👥 {{ c.participants }}/{{ c.maxParticipants }}</text>
              <text>📅 {{ c.startTime }}</text>
            </view>
            <text v-if="c.status === 'registering'" class="cc-action pri">立即报名</text>
            <text v-else-if="c.status === 'ongoing'" class="cc-action link">查看详情</text>
            <text v-else class="cc-action dim">查看结果</text>
          </view>
          <view class="cc-prize">
            <text>🏅 {{ c.prizes[0] }}</text>
          </view>
        </view>
      </view>

      <view v-if="filteredComps.length === 0" class="empty-wrap">
        <text class="empty-icon">🏆</text>
        <text class="empty-text">暂无相关赛事</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const activeCat = ref('all')
const activeTab = ref('all')

const compCategories = [
  { id: 'all', label: '全部' }, { id: 'bazi', label: '八字命理' }, { id: 'ziwei', label: '紫微斗数' },
  { id: 'fengshui', label: '风水堪舆' }, { id: 'yijing', label: '易经占卜' }, { id: 'qiming', label: '起名择日' },
]

const statusTabs = [
  { id: 'all', label: '全部' }, { id: 'registering', label: '报名中' },
  { id: 'ongoing', label: '进行中' }, { id: 'ended', label: '已结束' },
]

const competitions = [
  { id: '1', title: '2024热卜杯·八字命理大赛', type: 'platform', status: 'registering', startTime: '2024-04-01', endTime: '2024-04-30', registrationDeadline: '2024-03-25', participants: 1286, maxParticipants: 2000, prizes: ['冠军奖金10000元', '亚军5000元', '季军3000元'], organizer: '热卜平台', isHot: true, tags: ['八字', '命理', '实战'] },
  { id: '2', title: '紫微斗数实战挑战赛', type: 'circle', status: 'ongoing', startTime: '2024-03-15', endTime: '2024-04-15', registrationDeadline: '2024-03-10', participants: 568, maxParticipants: 800, prizes: ['冠军免费入圈1年'], organizer: '紫微斗数研习社', isHot: false, tags: ['紫微', '斗数'] },
  { id: '3', title: '第三届风水布局设计大赛', type: 'joint', status: 'upcoming', startTime: '2024-05-01', endTime: '2024-06-30', registrationDeadline: '2024-04-25', participants: 326, maxParticipants: 1000, prizes: ['总奖金池50000元'], organizer: '热卜平台 × 玄空风水学院', isHot: true, tags: ['风水', '设计', '实战'] },
  { id: '4', title: '易经六十四卦知识竞赛', type: 'circle', status: 'ended', startTime: '2024-02-01', endTime: '2024-02-28', registrationDeadline: '2024-01-25', participants: 892, maxParticipants: 1000, prizes: ['冠军获大师1v1指导'], organizer: '易经研习堂', isHot: false, tags: ['易经', '六十四卦'], winner: { name: '张易学' } },
]

const hotComp = computed(() => competitions.find(c => c.isHot && c.status !== 'ended'))

const filteredComps = computed(() => {
  return competitions.filter(c => {
    if (activeTab.value !== 'all' && c.status !== activeTab.value) return false
    if (searchQuery.value && !c.title.includes(searchQuery.value)) return false
    return true
  })
})

function statusLabel(s: string) {
  const map: Record<string, string> = { registering: '报名中', ongoing: '进行中', ended: '已结束', upcoming: '即将开始' }
  return map[s] || s
}

function statusClass(s: string) {
  const map: Record<string, string> = { registering: 's-green', ongoing: 's-red', ended: 's-gray', upcoming: 's-amber' }
  return map[s] || ''
}

function typeLabel(t: string) {
  const map: Record<string, string> = { platform: '平台赛事', circle: '圈子赛事', joint: '联合主办' }
  return map[t] || t
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.comp-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.comp-header { background: #C41E3A; }
.ch-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.ch-back { font-size: 48rpx; color: #fff; width: 64rpx; }
.ch-title { font-size: 34rpx; font-weight: 700; color: #fff; flex: 1; }
.ch-archive { font-size: 24rpx; color: rgba(255,255,255,0.75); }

.search-row { padding: 14rpx 24rpx; background: #fff; border-bottom: 1px solid #E8E0D5; }
.search-box { display: flex; align-items: center; height: 68rpx; background: #F5F1EB; border-radius: 34rpx; padding: 0 20rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 24rpx; color: #333; }

.hot-banner { margin: 16rpx 24rpx; background: linear-gradient(135deg, #C41E3A, #E85A6B); border-radius: 20rpx; padding: 28rpx; position: relative; overflow: hidden; }
.hb-deco { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); }
.hb-d1 { width: 160rpx; height: 160rpx; top: -50rpx; right: -30rpx; }
.hb-d2 { width: 100rpx; height: 100rpx; bottom: -20rpx; left: -20rpx; }
.hb-content { position: relative; z-index: 1; }
.hb-badges { display: flex; gap: 8rpx; margin-bottom: 10rpx; }
.hb-hot-badge { font-size: 18rpx; color: #fff; background: rgba(255,255,255,0.15); padding: 2rpx 10rpx; border-radius: 6rpx; }
.hb-status { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; color: #fff; }
.s-green { background: #52C41A; } .s-red { background: #C41E3A; } .s-gray { background: #999; } .s-amber { background: #FA8C16; }
.hb-title { font-size: 32rpx; font-weight: 700; color: #fff; display: block; margin-bottom: 4rpx; }
.hb-sub { font-size: 22rpx; color: rgba(255,255,255,0.75); display: block; margin-bottom: 8rpx; }
.hb-prize { font-size: 22rpx; color: #fff; }
.hb-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 14rpx; }
.hb-deadline { font-size: 18rpx; color: rgba(255,255,255,0.6); }
.hb-btn { padding: 8rpx 24rpx; background: #fff; color: #C41E3A; border-radius: 24rpx; font-size: 22rpx; font-weight: 500; }

.cat-row { display: flex; padding: 14rpx 24rpx; white-space: nowrap; }
.cat-chip { font-size: 22rpx; color: #666; background: #F5F1EB; padding: 8rpx 20rpx; border-radius: 24rpx; margin-right: 10rpx; display: inline-block; }
.cat-chip.active { background: #C41E3A; color: #fff; }

.status-tabs { display: flex; padding: 6rpx 24rpx 14rpx; gap: 16rpx; }
.st-item { font-size: 24rpx; color: #999; padding-bottom: 6rpx; border-bottom: 2px solid transparent; }
.st-item.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 500; }

.comp-list { padding: 0 24rpx; }
.comp-card { background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cc-cover { height: 220rpx; background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(196,30,58,0.02)); display: flex; align-items: center; justify-content: center; position: relative; }
.cc-cover-icon { font-size: 72rpx; opacity: 0.15; }
.cc-cover-badges { position: absolute; top: 14rpx; left: 14rpx; display: flex; gap: 8rpx; }
.cc-status-badge { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; color: #fff; background: #52C41A; }
.cc-type-badge { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; color: #C41E3A; background: rgba(196,30,58,0.08); }
.cc-winner { position: absolute; bottom: 14rpx; right: 14rpx; padding: 4rpx 14rpx; background: rgba(0,0,0,0.5); border-radius: 20rpx; }
.cc-winner text { font-size: 18rpx; color: #fff; }

.cc-body { padding: 16rpx 18rpx; }
.cc-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 6rpx; }
.cc-organizer { font-size: 20rpx; color: #BBB; margin-bottom: 8rpx; }
.cc-tags { display: flex; gap: 6rpx; margin-bottom: 10rpx; }
.cc-tag { font-size: 18rpx; color: #999; background: #F5F1EB; padding: 2rpx 10rpx; border-radius: 4rpx; }
.cc-footer { display: flex; justify-content: space-between; align-items: center; }
.cc-stats { display: flex; gap: 14rpx; font-size: 20rpx; color: #BBB; }
.cc-action { font-size: 20rpx; padding: 4rpx 18rpx; border-radius: 24rpx; }
.cc-action.pri { background: #C41E3A; color: #fff; }
.cc-action.link { color: #C41E3A; }
.cc-action.dim { color: #BBB; }
.cc-prize { margin-top: 12rpx; padding-top: 10rpx; border-top: 1px solid #F5F1EB; }
.cc-prize text { font-size: 20rpx; color: #999; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; opacity: 0.3; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
