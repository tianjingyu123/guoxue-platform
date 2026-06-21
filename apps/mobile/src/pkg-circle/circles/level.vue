<!--
  我的等级（从原型 app/circles/[id]/level/page.tsx 高保真迁移）
  深色渐变头部(用户等级卡/经验进度/数据统计) + 三Tab(等级详情/我的勋章/获取经验)
-->
<template>
  <view class="page">
    <!-- 顶部深色区 -->
    <view class="top" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav">
        <view class="nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#ffffff" /></view>
        <text class="nav-title">我的等级</text>
        <view class="nav-rank" @tap="toastComingSoon"><text class="nav-rank-t">排行</text><app-icon name="chevron-right" :size="28" color="rgba(255,255,255,0.7)" /></view>
      </view>

      <!-- 用户等级卡片 -->
      <view class="ucard">
        <view class="ucard-top">
          <view class="avatar-wrap">
            <image class="avatar" :src="userData.avatar" mode="aspectFill" :style="{ borderColor: currentLevel.color }" />
            <view class="avatar-badge" :style="{ background: currentLevel.color }"><text class="avatar-badge-t">{{ currentLevel.level }}</text></view>
          </view>
          <view class="uinfo">
            <view class="uname-row">
              <text class="uname">{{ userData.name }}</text>
              <text class="ulevel" :style="{ background: currentLevel.color }">Lv.{{ currentLevel.level }} {{ currentLevel.name }}</text>
            </view>
            <text class="usub">圈内排名 #{{ userData.rank }} · 已加入{{ userData.joinedDays }}天</text>
          </view>
        </view>

        <!-- 经验进度 -->
        <view class="xp-box">
          <view class="xp-head"><text class="xp-label">经验值</text><text class="xp-val">{{ userData.currentXp }} / {{ nextLevel ? nextLevel.minXp : 'MAX' }}</text></view>
          <view class="xp-track"><view class="xp-fill" :style="{ width: progressToNext + '%', background: currentLevel.color }" /></view>
          <text v-if="nextLevel" class="xp-hint">距离 Lv.{{ nextLevel.level }} {{ nextLevel.name }} 还需 {{ nextLevel.minXp - userData.currentXp }} 经验</text>
        </view>

        <!-- 数据统计 -->
        <view class="ustats">
          <view class="ustat"><text class="ustat-n">{{ userData.posts }}</text><text class="ustat-l">发帖</text></view>
          <view class="ustat"><text class="ustat-n">{{ userData.likes }}</text><text class="ustat-l">获赞</text></view>
          <view class="ustat"><text class="ustat-n">{{ userData.badges }}</text><text class="ustat-l">勋章</text></view>
          <view class="ustat"><text class="ustat-n">{{ userData.totalXp }}</text><text class="ustat-l">总经验</text></view>
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
            <view v-for="lv in levels" :key="lv.level" class="lv-row" :class="{ cur: lv.level === currentLevel.level, passed: lv.level < currentLevel.level }" :style="lv.level === currentLevel.level ? { boxShadow: `0 0 0 4rpx ${lv.color}30` } : {}">
              <view class="lv-icon" :style="lv.level <= currentLevel.level ? { background: lv.color } : { background: '#E8E3DB' }">
                <app-icon v-if="lv.level > currentLevel.level" name="lock" :size="24" color="#999999" />
                <text v-else class="lv-icon-t">{{ lv.level }}</text>
              </view>
              <view class="lv-info">
                <view class="lv-name-row">
                  <text class="lv-name" :class="{ locked: lv.level > currentLevel.level }">Lv.{{ lv.level }} {{ lv.name }}</text>
                  <text v-if="lv.level === currentLevel.level" class="lv-cur-tag">当前</text>
                  <app-icon v-else-if="lv.level < currentLevel.level" name="check-circle" :size="24" color="#52C41A" />
                </view>
                <text class="lv-xp">{{ lv.minXp }} - {{ lv.maxXp === 999999 ? '∞' : lv.maxXp }} 经验</text>
              </view>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="card-head"><app-icon name="gift" :size="32" color="#C9A96E" /><text class="card-title">当前等级特权</text></view>
          <view class="priv-grid">
            <view v-for="(p, i) in currentPrivileges" :key="i" class="priv"><app-icon name="check-circle" :size="24" color="#52C41A" /><text class="priv-t">{{ p }}</text></view>
          </view>
        </view>

        <view v-if="nextLevel" class="next-card">
          <view class="card-head"><app-icon name="sparkles" :size="32" color="#C9A96E" /><text class="card-title">Lv.{{ nextLevel.level }} {{ nextLevel.name }} 解锁特权</text></view>
          <view class="next-chips">
            <view v-for="(p, i) in nextPrivileges" :key="i" class="next-chip"><app-icon name="lock" :size="20" color="#C9A96E" /><text class="next-chip-t">{{ p }}</text></view>
          </view>
        </view>
      </view>

      <!-- 我的勋章 -->
      <view v-else-if="activeTab === 'badges'" class="sec-group">
        <view class="card">
          <view class="card-head between"><view class="card-head-l"><app-icon name="award" :size="32" color="#C9A96E" /><text class="card-title">已获得勋章</text></view><text class="card-count">{{ obtainedBadges.length }}个</text></view>
          <view class="badge-grid">
            <view v-for="b in obtainedBadges" :key="b.id" class="badge-obt">
              <view class="badge-ic" :style="{ background: b.color + '26' }"><app-icon :name="b.icon" :size="32" :color="b.color" /></view>
              <text class="badge-name">{{ b.name }}</text>
              <text class="badge-date">{{ b.obtainedAt }}</text>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="card-head between"><view class="card-head-l"><app-icon name="target" :size="32" color="#999999" /><text class="card-title">待解锁勋章</text></view><text class="card-count">{{ lockedBadges.length }}个</text></view>
          <view class="locked-list">
            <view v-for="b in lockedBadges" :key="b.id" class="locked-row">
              <view class="badge-ic dim" :style="{ background: b.color + '26' }"><app-icon :name="b.icon" :size="32" :color="b.color" /></view>
              <view class="locked-info">
                <view class="locked-name-row"><text class="locked-name">{{ b.name }}</text><app-icon name="lock" :size="20" color="#999999" /></view>
                <text class="locked-desc">{{ b.desc }}</text>
                <view v-if="b.progress !== undefined" class="prog">
                  <view class="prog-head"><text class="prog-l">进度</text><text class="prog-l">{{ b.progress }}/{{ b.total || 0 }}</text></view>
                  <view class="prog-track"><view class="prog-fill" :style="{ width: (b.progress / b.total || 0 * 100) + '%', background: b.color }" /></view>
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
          <view class="signin-head"><view class="card-head-l"><app-icon name="calendar" :size="30" color="#ffffff" /><text class="signin-title">每日签到</text></view><text class="signin-sub">已连续签到 7 天</text></view>
          <view class="signin-grid">
            <view v-for="(xp, idx) in signinXp" :key="idx" class="signin-day" :class="signinCls(idx)">
              <app-icon v-if="idx < 3" name="check-circle" :size="24" color="#ffffff" />
              <template v-else>
                <text class="signin-xp" :class="{ today: idx === 3 }">+{{ xp }}</text>
                <text class="signin-d" :class="{ today: idx === 3 }">Day{{ idx + 1 }}</text>
              </template>
            </view>
          </view>
          <view class="signin-btn" @tap="toastComingSoon"><text class="signin-btn-t">立即签到 (+10经验)</text></view>
        </view>

        <!-- 经验记录 -->
        <view class="card">
          <view class="card-head between"><text class="card-title">最近获得</text><text class="card-link" @tap="toastComingSoon">全部记录</text></view>
          <view class="rec-list">
            <view v-for="(r, i) in recentXp" :key="i" class="rec-row">
              <view><text class="rec-title">{{ r.title }}</text><text class="rec-time">{{ r.time }}</text></view>
              <text class="rec-xp">{{ r.xp }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 我的等级页（纯展示+本地Tab切换）
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, toastComingSoon } from '@/utils/router'

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

const levels = [
  { level: 1, name: '入门学徒', minXp: 0, maxXp: 100, color: '#999999' },
  { level: 2, name: '初窥门径', minXp: 100, maxXp: 300, color: '#52C41A' },
  { level: 3, name: '略有小成', minXp: 300, maxXp: 600, color: '#1890FF' },
  { level: 4, name: '登堂入室', minXp: 600, maxXp: 1000, color: '#722ED1' },
  { level: 5, name: '炉火纯青', minXp: 1000, maxXp: 1500, color: '#FF6B35' },
  { level: 6, name: '出神入化', minXp: 1500, maxXp: 2200, color: '#C41E3A' },
  { level: 7, name: '登峰造极', minXp: 2200, maxXp: 3000, color: '#C9A96E' },
  { level: 8, name: '一代宗师', minXp: 3000, maxXp: 999999, color: '#FFD700' },
]

const badges = [
  { id: 'b1', name: '阅读达人', desc: '完成阅读打卡21天', icon: 'book-open', color: '#52C41A', obtained: true, obtainedAt: '2024-01-15' },
  { id: 'b2', name: '热心助人', desc: '回答问题获得100赞', icon: 'heart', color: '#FF6B6B', obtained: true, obtainedAt: '2024-01-10' },
  { id: 'b3', name: '笔耕不辍', desc: '发布帖子50篇', icon: 'message-circle', color: '#1890FF', obtained: true, obtainedAt: '2024-01-08' },
  { id: 'b4', name: '知识分享者', desc: '原创内容被加精10次', icon: 'star', color: '#C9A96E', obtained: false, progress: 7, total: 10 },
  { id: 'b5', name: '问答之星', desc: '付费问答获得好评50次', icon: 'trophy', color: '#722ED1', obtained: false, progress: 32, total: 50 },
  { id: 'b6', name: '圈子达人', desc: '加入10个圈子', icon: 'crown', color: '#FF6B35', obtained: false, progress: 5, total: 10 },
] as { id: string; name: string; desc: string; icon: string; color: string; obtained: boolean; obtainedAt?: string; progress?: number; total?: number }[]

const levelPrivileges = [
  { level: 1, privileges: ['基础功能', '每日签到'] },
  { level: 2, privileges: ['发布帖子', '参与讨论'] },
  { level: 3, privileges: ['头像挂件', '专属昵称色'] },
  { level: 4, privileges: ['优先展示', '免费精华'] },
  { level: 5, privileges: ['专属勋章', '提问折扣'] },
  { level: 6, privileges: ['圈主推荐', '专栏投稿'] },
  { level: 7, privileges: ['嘉宾申请', '活动优先'] },
  { level: 8, privileges: ['终身会员', '专属服务'] },
]

const xpSources = [
  { icon: 'check-circle', title: '每日签到', desc: '连续签到奖励更多', xp: '+5~20', color: '#52C41A' },
  { icon: 'message-circle', title: '发布帖子', desc: '发布优质内容', xp: '+10', color: '#1890FF' },
  { icon: 'star', title: '获得精华', desc: '帖子被加精', xp: '+50', color: '#C9A96E' },
  { icon: 'heart', title: '获得点赞', desc: '每10个赞', xp: '+5', color: '#FF6B6B' },
  { icon: 'book-open', title: '完成打卡', desc: '参与打卡活动', xp: '+10', color: '#722ED1' },
  { icon: 'trophy', title: '问答采纳', desc: '回答被采纳', xp: '+30', color: '#FF6B35' },
]

const userData = { name: '命理学习者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user', level: 5, currentXp: 1280, totalXp: 1500, joinedDays: 128, posts: 156, likes: 2800, badges: 3, rank: 28 }

const signinXp = [5, 5, 5, 10, 10, 15, 20]
const recentXp = [
  { title: '发布帖子', time: '今天 10:30', xp: '+10' },
  { title: '每日签到', time: '今天 09:00', xp: '+10' },
  { title: '获得点赞', time: '昨天 22:15', xp: '+5' },
  { title: '完成打卡', time: '昨天 21:00', xp: '+10' },
]

const tabs = [
  { id: 'level', label: '等级详情' },
  { id: 'badges', label: '我的勋章' },
  { id: 'xp', label: '获取经验' },
] as const
const activeTab = ref<'level' | 'badges' | 'xp'>('level')

const currentLevel = computed(() => levels.find(l => userData.currentXp >= l.minXp && userData.currentXp < l.maxXp) || levels[levels.length - 1])
const nextLevel = computed(() => levels.find(l => l.level === currentLevel.value.level + 1))
const progressToNext = computed(() => nextLevel.value ? ((userData.currentXp - currentLevel.value.minXp) / (nextLevel.value.minXp - currentLevel.value.minXp)) * 100 : 100)

const currentPrivileges = computed(() => levelPrivileges.filter(p => p.level <= currentLevel.value.level).flatMap(p => p.privileges))
const nextPrivileges = computed(() => nextLevel.value ? (levelPrivileges.find(p => p.level === nextLevel.value!.level)?.privileges || []) : [])

const obtainedBadges = computed(() => badges.filter(b => b.obtained))
const lockedBadges = computed(() => badges.filter(b => !b.obtained))

function signinCls(idx: number) { return idx < 3 ? 'passed' : idx === 3 ? 'today' : 'future' }
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 64rpx; }
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
.card-link { font-size: 22rpx; color: #C41E3A; }

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
.lv-cur-tag { padding: 2rpx 14rpx; background: #C41E3A; color: #ffffff; font-size: 18rpx; border-radius: 999rpx; }
.lv-xp { display: block; font-size: 20rpx; color: #999999; margin-top: 4rpx; }

.priv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.priv { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 20rpx; background: #FAF8F5; border-radius: 14rpx; }
.priv-t { font-size: 24rpx; color: #2C2C2C; }

.next-card { background: linear-gradient(90deg, #FFF8E7, #FFFBF0); border: 1rpx solid #F0E6D3; border-radius: 20rpx; padding: 28rpx; }
.next-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.next-chip { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 24rpx; background: #ffffff; border-radius: 999rpx; }
.next-chip-t { font-size: 22rpx; color: #666666; }

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

.signin-card { background: linear-gradient(90deg, #C41E3A, #E74C3C); border-radius: 20rpx; padding: 28rpx; }
.signin-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.signin-title { font-size: 28rpx; font-weight: 500; color: #ffffff; }
.signin-sub { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.signin-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12rpx; margin-bottom: 24rpx; }
.signin-day { aspect-ratio: 1; border-radius: 14rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.signin-day.passed { background: rgba(255,255,255,0.2); }
.signin-day.today { background: #ffffff; }
.signin-day.future { background: rgba(255,255,255,0.1); }
.signin-xp { font-size: 18rpx; color: rgba(255,255,255,0.7); }
.signin-xp.today { color: #C41E3A; }
.signin-d { font-size: 16rpx; color: rgba(255,255,255,0.5); }
.signin-d.today { color: #C41E3A; }
.signin-btn { width: 100%; padding: 22rpx 0; background: #ffffff; border-radius: 14rpx; text-align: center; }
.signin-btn-t { font-size: 26rpx; font-weight: 500; color: #C41E3A; }

.rec-list { display: flex; flex-direction: column; }
.rec-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.rec-row:last-child { border-bottom: none; }
.rec-title { font-size: 24rpx; color: #2C2C2C; }
.rec-time { display: block; font-size: 20rpx; color: #999999; margin-top: 2rpx; }
.rec-xp { font-size: 26rpx; font-weight: 500; color: #52C41A; }
</style>
