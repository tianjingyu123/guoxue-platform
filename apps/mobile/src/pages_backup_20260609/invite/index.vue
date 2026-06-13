<template>
  <view class="invite-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">邀请好友</text>
        <view class="header-spacer" />
      </view>
    </view>

    <!-- 奖励卡片 -->
    <view class="reward-card">
      <view class="rc-deco">🎁</view>
      <view class="rc-content">
        <view class="rc-title-row">
          <text class="rc-sparkle">✨</text>
          <text class="rc-title">邀请好友，双方有礼</text>
        </view>
        <text class="rc-desc">
          邀请1位好友注册，双方各得<text class="rc-hl"> 7天会员体验</text>。
          多邀多得，上不封顶。
        </text>
        <view class="rc-stats">
          <view class="rcs-item">
            <text class="rcs-num">{{ invitedFriends.length }}</text>
            <text class="rcs-label">已邀请</text>
          </view>
          <view class="rcs-item">
            <text class="rcs-num">{{ registeredCount }}</text>
            <text class="rcs-label">已注册</text>
          </view>
          <view class="rcs-item">
            <text class="rcs-num">{{ registeredCount * 7 }}</text>
            <text class="rcs-label">获得天数</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请方式 -->
    <view class="section">
      <text class="section-title">邀请方式</text>
      <view class="invite-methods">
        <view class="im-card" @click="handleShareLink">
          <view class="im-icon-wrap">📤</view>
          <text class="im-label">分享链接</text>
        </view>
        <view class="im-card" @click="showPoster = true">
          <view class="im-icon-wrap ic-accent">🖼️</view>
          <text class="im-label">生成海报</text>
        </view>
        <view class="im-card" @click="handleCopyCode">
          <view class="im-icon-wrap ic-green">
            <text>{{ copied ? '✅' : '📋' }}</text>
          </view>
          <text class="im-label">{{ copied ? '已复制' : '复制邀请码' }}</text>
        </view>
      </view>

      <!-- 邀请码 -->
      <view class="code-card">
        <view class="code-info">
          <text class="code-label">我的邀请码</text>
          <text class="code-val">{{ inviteCode }}</text>
        </view>
        <view class="code-copy-btn" :class="{ done: copied }" @click="handleCopyCode">
          <text>{{ copied ? '已复制' : '复制' }}</text>
        </view>
      </view>
    </view>

    <!-- 排行榜 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">👑 邀请排行榜</text>
        <view class="leader-tabs">
          <text class="ltab" :class="{ active: leaderTab === 'today' }" @click="leaderTab = 'today'">今日</text>
          <text class="ltab" :class="{ active: leaderTab === 'total' }" @click="leaderTab = 'total'">累计</text>
        </view>
      </view>
      <view class="leader-list">
        <view v-for="(user, idx) in leaderboard" :key="user.rank" class="leader-item">
          <view class="leader-rank">
            <text v-if="user.rank <= 3" class="lr-medal" :class="'m' + user.rank">{{ user.rank }}</text>
            <text v-else class="lr-num">{{ user.rank }}</text>
          </view>
          <view class="leader-avatar">{{ user.name[0] }}</view>
          <text class="leader-name">{{ user.name }}</text>
          <text class="leader-count">{{ user.count }}<text class="lrc-unit">人</text></text>
        </view>
      </view>
    </view>

    <!-- 已邀请好友 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">👥 已邀请好友</text>
        <text class="section-badge">{{ invitedFriends.length }}人</text>
      </view>
      <view v-if="invitedFriends.length > 0" class="friend-list">
        <view v-for="f in invitedFriends" :key="f.id" class="friend-item">
          <view class="friend-avatar">{{ f.name[0] }}</view>
          <view class="friend-info">
            <text class="friend-name">{{ f.name }}</text>
            <text class="friend-time">{{ f.registerTime }}</text>
          </view>
          <text class="friend-status" :class="f.status === 'registered' ? 'fs-ok' : 'fs-pend'">
            {{ f.status === 'registered' ? '已注册' : '待激活' }}
          </text>
        </view>
      </view>
      <view v-else class="empty-friends">
        <text class="ef-icon">👥</text>
        <text class="ef-text">还没有邀请好友</text>
        <text class="ef-sub">快去分享邀请链接吧</text>
      </view>
    </view>

    <!-- 海报弹窗 -->
    <view v-if="showPoster" class="modal-mask" @click="showPoster = false">
      <view class="poster-dialog" @click.stop>
        <view class="poster-preview">
          <view class="poster-bg">
            <view class="poster-top">
              <view class="pt-logo">卜</view>
              <text class="pt-brand">热卜国学</text>
              <text class="pt-slogan">探索易学智慧</text>
            </view>
            <view class="poster-mid">
              <text class="pm-text">邀请你一起学习国学</text>
              <text class="pm-sub">注册即送7天会员体验</text>
            </view>
            <view class="poster-qr">
              <view class="pqr-box">
                <text class="pqr-text">二维码</text>
              </view>
              <text class="pqr-tip">长按识别二维码</text>
              <text class="pqr-code">邀请码: {{ inviteCode }}</text>
            </view>
          </view>
        </view>
        <view class="poster-actions">
          <view class="pa-btn cancel" @click="showPoster = false">取消</view>
          <view class="pa-btn save" @click="showPoster = false; uni.showToast({ title: '海报已保存', icon: 'success' })">保存海报</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const inviteCode = 'REBU2024'
const copied = ref(false)
const showPoster = ref(false)
const leaderTab = ref<'today' | 'total'>('total')

const invitedFriends = [
  { id: 1, name: '张三', avatar: '', registerTime: '2024-03-15 14:30', status: 'registered' as const },
  { id: 2, name: '李四', avatar: '', registerTime: '2024-03-14 09:20', status: 'registered' as const },
  { id: 3, name: '王五', avatar: '', registerTime: '2024-03-13 16:45', status: 'pending' as const },
  { id: 4, name: '赵六', avatar: '', registerTime: '2024-03-12 11:00', status: 'registered' as const },
]

const leaderboard = [
  { rank: 1, name: '周易大师', avatar: '', count: 128 },
  { rank: 2, name: '张玄风', avatar: '', count: 96 },
  { rank: 3, name: '陈风水', avatar: '', count: 72 },
  { rank: 4, name: '李易安', avatar: '', count: 58 },
  { rank: 5, name: '王命理', avatar: '', count: 45 },
]

const registeredCount = computed(() => invitedFriends.filter(f => f.status === 'registered').length)

function handleCopyCode() {
  uni.setClipboardData({ data: inviteCode })
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function handleShareLink() {
  const shareUrl = `https://rebu.com/register?invite=${inviteCode}`
  uni.setClipboardData({ data: shareUrl })
  uni.showToast({ title: '链接已复制，分享给好友吧', icon: 'success' })
}
</script>

<style scoped>
.invite-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 60rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-spacer { width: 64rpx; }

.reward-card { margin: 20rpx 24rpx; background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 24rpx; padding: 36rpx 28rpx; position: relative; overflow: hidden; }
.rc-deco { position: absolute; right: -20rpx; top: -20rpx; font-size: 120rpx; opacity: 0.1; }
.rc-content { position: relative; }
.rc-title-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 10rpx; }
.rc-sparkle { font-size: 32rpx; }
.rc-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.rc-desc { font-size: 24rpx; color: rgba(255,255,255,0.85); line-height: 1.6; }
.rc-hl { color: #FFD700; font-weight: 600; }

.rc-stats { display: flex; gap: 40rpx; margin-top: 24rpx; padding-top: 20rpx; border-top: 1px solid rgba(255,255,255,0.2); }
.rcs-item { text-align: center; }
.rcs-num { font-size: 40rpx; font-weight: 700; color: #fff; display: block; }
.rcs-label { font-size: 20rpx; color: rgba(255,255,255,0.7); display: block; }

.section { padding: 0 24rpx; margin-bottom: 28rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 14rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.section-badge { font-size: 22rpx; color: #999; background: #F5F1EB; padding: 4rpx 16rpx; border-radius: 12rpx; }

.invite-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.im-card { display: flex; flex-direction: column; align-items: center; padding: 24rpx 12rpx; background: #fff; border-radius: 16rpx; border: 1px solid #F0EDE5; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.im-icon-wrap { width: 88rpx; height: 88rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-bottom: 10rpx; }
.im-icon-wrap.ic-accent { background: rgba(201,169,110,0.1); }
.im-icon-wrap.ic-green { background: rgba(82,196,26,0.08); }
.im-label { font-size: 24rpx; font-weight: 500; color: #333; }

.code-card { display: flex; align-items: center; justify-content: space-between; background: #FBF9F6; border: 1px dashed #DDD; border-radius: 16rpx; padding: 20rpx 24rpx; margin-top: 16rpx; }
.code-label { font-size: 22rpx; color: #999; display: block; }
.code-val { font-size: 40rpx; font-weight: 700; color: #C41E3A; letter-spacing: 4rpx; }
.code-copy-btn { padding: 12rpx 28rpx; border-radius: 12rpx; background: #C41E3A; color: #fff; font-size: 26rpx; }
.code-copy-btn.done { background: #52C41A; }

.leader-tabs { display: flex; gap: 4rpx; background: #F0EDE5; border-radius: 24rpx; padding: 4rpx; }
.ltab { padding: 6rpx 20rpx; border-radius: 24rpx; font-size: 22rpx; color: #999; }
.ltab.active { background: #C41E3A; color: #fff; }

.leader-list { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.leader-item { display: flex; align-items: center; gap: 14rpx; padding: 18rpx 24rpx; }
.leader-item + .leader-item { border-top: 1px solid #F5F1EB; }
.leader-rank { width: 48rpx; text-align: center; }
.lr-medal { font-size: 32rpx; font-weight: 700; }
.m1 { color: #FFD700; }
.m2 { color: #A0A0A0; }
.m3 { color: #CD7F32; }
.lr-num { font-size: 26rpx; color: #999; }
.leader-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A20, #C9A96E20); display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; color: #C9A96E; flex-shrink: 0; }
.leader-name { flex: 1; font-size: 26rpx; font-weight: 500; color: #333; }
.leader-count { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.lrc-unit { font-size: 20rpx; color: #999; margin-left: 4rpx; }

.friend-list { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.friend-item { display: flex; align-items: center; gap: 14rpx; padding: 18rpx 24rpx; }
.friend-item + .friend-item { border-top: 1px solid #F5F1EB; }
.friend-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 500; color: #999; flex-shrink: 0; }
.friend-info { flex: 1; }
.friend-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.friend-time { font-size: 20rpx; color: #BBB; margin-top: 4rpx; display: block; }
.friend-status { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 8rpx; }
.fs-ok { background: rgba(82,196,26,0.08); color: #52C41A; }
.fs-pend { background: #F5F1EB; color: #999; }

.empty-friends { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; background: #fff; border-radius: 16rpx; }
.ef-icon { font-size: 80rpx; opacity: 0.3; margin-bottom: 16rpx; }
.ef-text { font-size: 26rpx; color: #999; margin-bottom: 8rpx; }
.ef-sub { font-size: 22rpx; color: #BBB; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.poster-dialog { width: 100%; max-width: 560rpx; }
.poster-preview { margin-bottom: 24rpx; }
.poster-bg { aspect-ratio: 9/16; background: linear-gradient(180deg, #C41E3A, #B8323A, #C9A96E); border-radius: 20rpx; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 48rpx 32rpx; }
.poster-top { text-align: center; }
.pt-logo { width: 100rpx; height: 100rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 700; color: #fff; margin: 0 auto 16rpx; }
.pt-brand { font-size: 36rpx; font-weight: 700; color: #fff; display: block; }
.pt-slogan { font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 6rpx; display: block; }
.poster-mid { text-align: center; }
.pm-text { font-size: 30rpx; font-weight: 600; color: #fff; display: block; }
.pm-sub { font-size: 24rpx; color: rgba(255,255,255,0.75); margin-top: 8rpx; display: block; }
.poster-qr { background: #fff; border-radius: 20rpx; padding: 24rpx 32rpx; text-align: center; }
.pqr-box { width: 140rpx; height: 140rpx; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; margin: 0 auto 12rpx; }
.pqr-text { font-size: 20rpx; color: #999; }
.pqr-tip { font-size: 22rpx; color: #666; display: block; }
.pqr-code { font-size: 18rpx; color: #BBB; margin-top: 6rpx; display: block; }

.poster-actions { display: flex; gap: 16rpx; }
.pa-btn { flex: 1; padding: 22rpx 0; border-radius: 16rpx; font-size: 28rpx; text-align: center; }
.pa-btn.cancel { background: rgba(255,255,255,0.2); color: #fff; }
.pa-btn.save { background: #C41E3A; color: #fff; font-weight: 500; }
</style>
