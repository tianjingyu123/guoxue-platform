<!--
  我的等级（圈子成长体系）—— 真连 growth 后端
  深色头部(等级卡/经验进度/数据统计) + 三Tab(等级详情/我的勋章/获取经验)
  数据：GET /circles/:id/growth + GET /circles/:id/badges；签到 POST /circles/:id/checkin
-->
<template>
  <view class="page">
    <!-- 状态态返回栏：加载/硬失败时也能退出，避免卡死 -->
    <view v-if="isLoading || loadError" class="state-back" :style="{ top: 'calc(' + statusBarH + 'px + 20rpx)' }" @tap="goBack">
      <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
    </view>
    <!-- 骨架/错误态覆盖 -->
    <view v-if="isLoading" class="state"><AppLoading /></view>
    <view v-else-if="loadError" class="state">
      <app-icon name="alert-circle" :size="72" color="#CCCCCC" />
      <text class="state-t">加载失败</text>
      <view class="retry" @tap="loadAll">重试</view>
    </view>

    <template v-else>
      <!-- 顶部深色区 -->
      <view class="top" :style="{ paddingTop: statusBarH + 'px' }">
        <view class="nav">
          <view class="nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
          <text class="nav-title">我的等级</text>
          <view class="nav-rank" @tap="goRank"><text class="nav-rank-t">排行</text><app-icon name="chevron-right" :size="28" color="rgba(255,255,255,0.7)" /></view>
        </view>

        <!-- 用户等级卡片 -->
        <view class="ucard">
          <view class="ucard-top">
            <view class="avatar-wrap">
              <image lazy-load class="avatar" :src="me.avatar" mode="aspectFill" :style="{ borderColor: currentLevel.color }" />
              <view class="avatar-badge" :style="{ background: currentLevel.color }"><text class="avatar-badge-t">{{ me.level }}</text></view>
            </view>
            <view class="uinfo">
              <view class="uname-row">
                <text class="uname">{{ me.nickname }}</text>
                <text class="ulevel" :style="{ background: currentLevel.color }">Lv.{{ me.level }} {{ me.levelName }}</text>
              </view>
              <text class="usub">圈内排名 #{{ me.rank }} · 已加入{{ me.joinedDays }}天</text>
            </view>
          </view>

          <!-- 经验进度 -->
          <view class="xp-box">
            <view class="xp-head"><text class="xp-label">经验值</text><text class="xp-val">{{ me.totalExp }} / {{ me.isMax ? 'MAX' : me.nextLevelMinExp }}</text></view>
            <view class="xp-track"><view class="xp-fill" :style="{ width: me.progressPercent + '%', background: currentLevel.color }" /></view>
            <text v-if="!me.isMax && me.nextLevelMinExp" class="xp-hint">距离下一级还需 {{ me.nextLevelMinExp - me.totalExp }} 经验</text>
            <text v-else class="xp-hint">已达最高等级</text>
          </view>

          <!-- 数据统计 -->
          <view class="ustats">
            <view class="ustat"><text class="ustat-n">{{ me.posts }}</text><text class="ustat-l">发帖</text></view>
            <view class="ustat"><text class="ustat-n">{{ me.likes }}</text><text class="ustat-l">获赞</text></view>
            <view class="ustat"><text class="ustat-n">{{ me.badgesCount }}</text><text class="ustat-l">勋章</text></view>
            <view class="ustat"><text class="ustat-n">{{ me.totalExp }}</text><text class="ustat-l">总经验</text></view>
          </view>
        </view>
      </view>

      <!-- Tab -->
      <view class="tabs-wrap">
        <view class="tabs">
          <view v-for="t in tabs" :key="t.id" class="tab" :class="{ on: activeTab === t.id }" @tap="activeTab = t.id">{{ t.label }}</view>
        </view>
      </view>

      <view class="content">
        <!-- 等级详情 -->
        <view v-if="activeTab === 'level'" class="sec-group">
          <view class="card">
            <view class="card-head"><app-icon name="trending-up" :size="32" color="#C41E3A" /><text class="card-title">等级体系</text></view>
            <view class="lv-list">
              <view v-for="lv in levels" :key="lv.level" class="lv-row" :class="{ cur: lv.level === me.level, passed: lv.level < me.level }">
                <view class="lv-icon" :style="lv.level <= me.level ? { background: lv.color } : { background: '#E8E3DB' }">
                  <app-icon v-if="lv.level > me.level" name="lock" :size="24" color="#999999" />
                  <text v-else class="lv-icon-t">{{ lv.level }}</text>
                </view>
                <view class="lv-info">
                  <view class="lv-name-row">
                    <text class="lv-name" :class="{ locked: lv.level > me.level }">Lv.{{ lv.level }} {{ lv.name }}</text>
                    <text v-if="lv.level === me.level" class="lv-cur-tag">当前</text>
                    <app-icon v-else-if="lv.level < me.level" name="check-circle" :size="24" color="#52C41A" />
                  </view>
                  <text class="lv-xp">{{ lv.minXp }} - {{ lv.maxXp === null ? '∞' : lv.maxXp }} 经验</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 我的勋章 -->
        <view v-else-if="activeTab === 'badges'" class="sec-group">
          <view class="card">
            <view class="card-head between"><view class="card-head-l"><app-icon name="award" :size="32" color="#C9A96E" /><text class="card-title">已获得勋章</text></view><text class="card-count">{{ obtainedBadges.length }}个</text></view>
            <view v-if="obtainedBadges.length" class="badge-grid">
              <view v-for="b in obtainedBadges" :key="b.code" class="badge-obt" @tap="goBadges">
                <view class="badge-ic" :style="{ background: b.color + '26' }"><app-icon :name="b.icon" :size="32" :color="b.color" /></view>
                <text class="badge-name">{{ b.name }}</text>
                <text v-if="b.gainedAt" class="badge-date">{{ fmtDate(b.gainedAt) }}</text>
              </view>
            </view>
            <view v-else class="mini-empty">还没有获得勋章</view>
          </view>

          <view class="card">
            <view class="card-head between"><view class="card-head-l"><app-icon name="target" :size="32" color="#999999" /><text class="card-title">待解锁勋章</text></view><text class="card-count">{{ lockedBadges.length }}个</text></view>
            <view class="locked-list">
              <view v-for="b in lockedBadges" :key="b.code" class="locked-row">
                <view class="badge-ic dim" :style="{ background: b.color + '26' }"><app-icon :name="b.icon" :size="32" :color="b.color" /></view>
                <view class="locked-info">
                  <view class="locked-name-row"><text class="locked-name">{{ b.name }}</text><app-icon name="lock" :size="20" color="#999999" /></view>
                  <text class="locked-desc">{{ b.desc }}</text>
                  <view class="prog">
                    <view class="prog-head"><text class="prog-l">进度</text><text class="prog-l">{{ b.progress }}/{{ b.total }}</text></view>
                    <view class="prog-track"><view class="prog-fill" :style="{ width: (b.total ? b.progress / b.total * 100 : 0) + '%', background: b.color }" /></view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 获取经验 -->
        <view v-else class="sec-group">
          <view class="card">
            <view class="card-head"><app-icon name="zap" :size="32" color="#FF6B35" /><text class="card-title">经验获取途径</text></view>
            <view class="xp-src-list">
              <view v-for="(s, i) in xpSources" :key="i" class="xp-src">
                <view class="xp-src-ic" :style="{ background: s.color + '26' }"><app-icon :name="s.icon" :size="28" :color="s.color" /></view>
                <view class="xp-src-info"><text class="xp-src-title">{{ s.title }}</text><text class="xp-src-desc">{{ s.desc }}</text></view>
                <text class="xp-src-val" :style="{ color: s.color }">{{ s.xp }}</text>
              </view>
            </view>
          </view>

          <!-- 每日签到 -->
          <view class="signin-card">
            <view class="signin-head"><view class="card-head-l"><app-icon name="calendar" :size="30" color="#ffffff" /><text class="signin-title">每日签到</text></view><text class="signin-sub">已连续签到 {{ me.checkinStreak }} 天</text></view>
            <view class="signin-info">
              <text class="signin-info-t">累计签到 {{ checkinExp ? Math.round(checkinExp / 10) : me.checkinStreak }} 次 · 签到经验 {{ checkinExp }}</text>
            </view>
            <view class="signin-btn" :class="{ done: checkedToday, disabled: submitting }" @tap="doCheckin">
              <text class="signin-btn-t">{{ checkedToday ? '今日已签到' : (submitting ? '签到中...' : '立即签到 (+10经验)') }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 我的等级页（真连后端，三态 + 签到防重复）
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack, navigateTo } from '@/utils/router'
import { growthApi, type LevelMe, type BadgeItem } from '@/lib/circle-growth-data'

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

// 等级体系（与后端 LEVEL_THRESHOLDS / LEVEL_NAMES 一致）
const levels = [
  { level: 1,  name: '初入门径', minXp: 0,    maxXp: 100,  color: '#999999' },
  { level: 2,  name: '略窥门庭', minXp: 100,  maxXp: 250,  color: '#52C41A' },
  { level: 3,  name: '登堂入室', minXp: 250,  maxXp: 500,  color: '#1890FF' },
  { level: 4,  name: '渐有所成', minXp: 500,  maxXp: 900,  color: '#13C2C2' },
  { level: 5,  name: '融会贯通', minXp: 900,  maxXp: 1500, color: '#722ED1' },
  { level: 6,  name: '博学多识', minXp: 1500, maxXp: 2300, color: '#FF6B35' },
  { level: 7,  name: '出类拔萃', minXp: 2300, maxXp: 3300, color: '#C41E3A' },
  { level: 8,  name: '学富五车', minXp: 3300, maxXp: 4500, color: '#C9A96E' },
  { level: 9,  name: '通儒达士', minXp: 4500, maxXp: 6000, color: '#EB2F96' },
  { level: 10, name: '一代宗师', minXp: 6000, maxXp: null,  color: '#FFD700' },
]

// 经验获取规则（说明性内容，与后端规则一致）
const xpSources = [
  { icon: 'check-circle',   title: '每日签到', desc: '连续签到奖励更多（第7天+20/第30天+50）', xp: '+10', color: '#52C41A' },
  { icon: 'edit-3',         title: '发布帖子', desc: '在圈内发帖', xp: '+10', color: '#1890FF' },
  { icon: 'heart',          title: '获得点赞', desc: '帖子每获 1 赞', xp: '+2', color: '#FF6B6B' },
]

const tabs = [
  { id: 'level', label: '等级详情' },
  { id: 'badges', label: '我的勋章' },
  { id: 'xp', label: '获取经验' },
] as const
const activeTab = ref<'level' | 'badges' | 'xp'>('level')

const circleId = ref('')
const isLoading = ref(true)
const loadError = ref(false)
const submitting = ref(false)

const DEFAULT_ME: LevelMe = {
  userId: '', rank: 0, memberCount: 0, joinedDays: 0, posts: 0, likes: 0, checkinExp: 0,
  checkinStreak: 0, badgesCount: 0, level: 1, levelName: '初入门径', totalExp: 0,
  currentLevelMinExp: 0, nextLevelMinExp: 100, expIntoLevel: 0, expForNextLevel: 100,
  progressPercent: 0, isMax: false,
}
const me = ref<LevelMe & { nickname: string; avatar: string }>({ ...DEFAULT_ME, nickname: '我', avatar: '' })
const badges = ref<BadgeItem[]>([])
const checkedToday = ref(false)

const RARITY_COLOR: Record<string, string> = { common: '#475569', rare: '#2563EB', epic: '#9333EA', legendary: '#D97706' }
const obtainedBadges = computed(() => badges.value.filter((b) => b.earned).map((b) => ({ ...b, color: RARITY_COLOR[b.rarity] })))
const lockedBadges = computed(() => badges.value.filter((b) => !b.earned).map((b) => ({ ...b, color: RARITY_COLOR[b.rarity] })))
const currentLevel = computed(() => levels.find((l) => l.level === me.value.level) ?? levels[0])
const checkinExp = computed(() => me.value.checkinExp)

onLoad((query) => {
  circleId.value = (query?.id as string) || ''
  loadAll()
})

async function loadAll() {
  if (!circleId.value) { isLoading.value = false; loadError.value = true; return }
  isLoading.value = true
  loadError.value = false
  try {
    const [growth, badgeRes, cal] = await Promise.all([
      growthApi.growth(circleId.value),
      growthApi.badges(circleId.value),
      growthApi.calendar(circleId.value),
    ])
    // me 自身昵称/头像从排行榜中匹配（后端 growth.me 不含昵称）
    const mine = growth.leaderboard.find((x) => x.userId === growth.me.userId)
    me.value = { ...growth.me, nickname: mine?.nickname ?? '我', avatar: mine?.avatar ?? '' }
    badges.value = badgeRes.badges
    checkedToday.value = cal.checkedToday
  } catch (e) {
    loadError.value = true
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

async function doCheckin() {
  if (submitting.value || checkedToday.value) return // 防重复提交
  submitting.value = true
  try {
    const res = await growthApi.checkin(circleId.value)
    if (res.alreadyChecked) {
      uni.showToast({ title: '今日已签到', icon: 'none' })
    } else {
      uni.showToast({ title: res.message || '签到成功', icon: 'success' })
    }
    checkedToday.value = true
    await loadAll() // 刷新经验/等级
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '签到失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goRank() { navigateTo(`/pkg-circle/circles/checkin?id=${circleId.value}`) }
function goBadges() { navigateTo(`/pkg-circle/circles/badges?id=${circleId.value}`) }
function fmtDate(s: string | null) { if (!s) return ''; const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}` }
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 64rpx; }
.state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 24rpx; }
.state-t { font-size: 28rpx; color: #999; }
.state-back { position: fixed; left: 24rpx; z-index: 10; width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.retry { padding: 14rpx 48rpx; background: var(--brand); color: #fff; font-size: 26rpx; border-radius: 999rpx; }
.top { background: linear-gradient(135deg, #2C2C2C, #1a1a1a); padding-bottom: 64rpx; }
.nav { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 32rpx 32rpx; }
.nav-btn { width: 64rpx; height: 64rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 30rpx; font-weight: 600; color: #ffffff; }
.nav-rank { display: flex; align-items: center; }
.nav-rank-t { font-size: 24rpx; color: rgba(255,255,255,0.7); }

.ucard { margin: 0 32rpx; background: rgba(255,255,255,0.08); border-radius: 28rpx; padding: 32rpx; }
.ucard-top { display: flex; align-items: center; gap: 24rpx; margin-bottom: 28rpx; }
.avatar-wrap { position: relative; }
.avatar { width: 112rpx; height: 112rpx; border-radius: 999rpx; border: 4rpx solid #FF6B35; background: #333; }
.avatar-badge { position: absolute; bottom: -6rpx; right: -6rpx; width: 48rpx; height: 48rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.avatar-badge-t { font-size: 22rpx; font-weight: 700; color: #ffffff; }
.uinfo { flex: 1; }
.uname-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.uname { font-size: 32rpx; font-weight: 600; color: #ffffff; }
.ulevel { padding: 2rpx 16rpx; border-radius: 999rpx; font-size: 18rpx; font-weight: 500; color: #ffffff; }
.usub { font-size: 22rpx; color: rgba(255,255,255,0.6); }

.xp-box { background: rgba(0,0,0,0.2); border-radius: 20rpx; padding: 24rpx; }
.xp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.xp-label { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.xp-val { font-size: 22rpx; color: #ffffff; }
.xp-track { height: 14rpx; background: rgba(0,0,0,0.3); border-radius: 999rpx; overflow: hidden; }
.xp-fill { height: 100%; border-radius: 999rpx; }
.xp-hint { display: block; font-size: 20rpx; color: rgba(255,255,255,0.5); margin-top: 10rpx; }

.ustats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20rpx; margin-top: 28rpx; }
.ustat { text-align: center; }
.ustat-n { display: block; font-size: 34rpx; font-weight: 700; color: #ffffff; }
.ustat-l { font-size: 20rpx; color: rgba(255,255,255,0.5); }

.tabs-wrap { padding: 0 32rpx; margin-top: -32rpx; position: relative; z-index: 10; }
.tabs { display: flex; gap: 8rpx; background: #ffffff; border-radius: 20rpx; padding: 8rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); }
.tab { flex: 1; text-align: center; padding: 20rpx 0; font-size: 24rpx; font-weight: 500; color: #666666; border-radius: 14rpx; }
.tab.on { background: #2C2C2C; color: #ffffff; }

.content { padding: 32rpx; }
.sec-group { display: flex; flex-direction: column; gap: 28rpx; }
.card { background: #ffffff; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 28rpx; }
.card-head.between { justify-content: space-between; }
.card-head-l { display: flex; align-items: center; gap: 12rpx; }
.card-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.card-count { font-size: 22rpx; color: #999999; }
.mini-empty { font-size: 24rpx; color: #999; padding: 12rpx 0; }

.lv-list { display: flex; flex-direction: column; gap: 20rpx; }
.lv-row { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; border-radius: 20rpx; }
.lv-row.cur { background: #FAF8F5; }
.lv-row.passed { opacity: 0.6; }
.lv-icon { width: 72rpx; height: 72rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lv-icon-t { font-size: 28rpx; font-weight: 700; color: #ffffff; }
.lv-info { flex: 1; }
.lv-name-row { display: flex; align-items: center; gap: 12rpx; }
.lv-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.lv-name.locked { color: #999999; }
.lv-cur-tag { padding: 2rpx 14rpx; background: var(--brand); color: #ffffff; font-size: 18rpx; border-radius: 999rpx; }
.lv-xp { display: block; font-size: 20rpx; color: #999999; margin-top: 4rpx; }

.badge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.badge-obt { display: flex; flex-direction: column; align-items: center; padding: 24rpx 12rpx; background: #FAF8F5; border-radius: 20rpx; }
.badge-ic { width: 84rpx; height: 84rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 14rpx; }
.badge-ic.dim { opacity: 0.5; }
.badge-name { font-size: 22rpx; font-weight: 500; color: #2C2C2C; text-align: center; }
.badge-date { font-size: 18rpx; color: #999999; }
.locked-list { display: flex; flex-direction: column; gap: 20rpx; }
.locked-row { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; background: #FAF8F5; border-radius: 20rpx; }
.locked-info { flex: 1; }
.locked-name-row { display: flex; align-items: center; gap: 12rpx; }
.locked-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.locked-desc { display: block; font-size: 22rpx; color: #999999; margin-top: 2rpx; }
.prog { margin-top: 14rpx; }
.prog-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.prog-l { font-size: 18rpx; color: #999999; }
.prog-track { height: 12rpx; background: #E8E3DB; border-radius: 999rpx; overflow: hidden; }
.prog-fill { height: 100%; border-radius: 999rpx; }

.xp-src-list { display: flex; flex-direction: column; gap: 14rpx; }
.xp-src { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; background: #FAF8F5; border-radius: 20rpx; }
.xp-src-ic { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.xp-src-info { flex: 1; }
.xp-src-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.xp-src-desc { display: block; font-size: 22rpx; color: #999999; margin-top: 2rpx; }
.xp-src-val { font-size: 26rpx; font-weight: 700; }

.signin-card { background: linear-gradient(90deg, var(--brand), #E74C3C); border-radius: 20rpx; padding: 28rpx; }
.signin-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.signin-title { font-size: 28rpx; font-weight: 500; color: #ffffff; }
.signin-sub { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.signin-info { margin-bottom: 24rpx; }
.signin-info-t { font-size: 22rpx; color: rgba(255,255,255,0.85); }
.signin-btn { width: 100%; padding: 22rpx 0; background: #ffffff; border-radius: 14rpx; text-align: center; }
.signin-btn.done { background: rgba(255,255,255,0.3); }
.signin-btn.disabled { opacity: 0.6; }
.signin-btn-t { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.signin-btn.done .signin-btn-t { color: #ffffff; }
</style>
