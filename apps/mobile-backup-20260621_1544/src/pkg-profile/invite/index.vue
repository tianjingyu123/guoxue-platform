<template>
  <view class="page">
    <app-nav-bar
      title="邀请好友"
      :back-icon="'arrow-left'"
      :back-size="40"
      :title-size="32"
      :title-weight="600"
      :bar-height="112"
    />

    <scroll-view
      scroll-y
      class="scroll"
    >
      <!-- 邀请奖励卡 -->
      <view class="reward-card">
        <view class="reward-deco">
          <app-icon
            name="gift"
            :size="96"
            color="#FFFFFF"
          />
        </view>
        <view class="reward-body">
          <view class="reward-title-row">
            <app-icon
              name="sparkles"
              :size="36"
              color="#FFFFFF"
            />
            <text class="reward-title">
              邀请好友，双方有礼
            </text>
          </view>
          <text class="reward-desc">
            邀请1位好友注册，双方各得 7天会员体验。多邀多得，上不封顶。
          </text>
          <view class="reward-stats">
            <view class="rstat">
              <text class="rstat-num">
                {{ invitedFriends.length }}
              </text>
              <text class="rstat-label">
                已邀请
              </text>
            </view>
            <view class="rstat">
              <text class="rstat-num">
                {{ registeredCount }}
              </text>
              <text class="rstat-label">
                已注册
              </text>
            </view>
            <view class="rstat">
              <text class="rstat-num">
                {{ registeredCount * 7 }}
              </text>
              <text class="rstat-label">
                获得天数
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 邀请方式 -->
      <text class="section-title">
        邀请方式
      </text>
      <view class="ways">
        <view
          class="way"
          @tap="onShare"
        >
          <view
            class="way-icon"
            style="background:rgba(196,30,45,0.1)"
          >
            <app-icon
              name="share-2"
              :size="40"
              color="#C41E2D"
            />
          </view>
          <text class="way-label">
            分享链接
          </text>
        </view>
        <view
          class="way"
          @tap="showPoster = true"
        >
          <view
            class="way-icon"
            style="background:rgba(201,169,110,0.12)"
          >
            <app-icon
              name="image"
              :size="40"
              color="#C9A96E"
            />
          </view>
          <text class="way-label">
            生成海报
          </text>
        </view>
        <view
          class="way"
          @tap="onCopy"
        >
          <view
            class="way-icon"
            style="background:rgba(46,160,67,0.1)"
          >
            <app-icon
              :name="copied ? 'check' : 'copy'"
              :size="40"
              :color="'#2EA043'"
            />
          </view>
          <text class="way-label">
            {{ copied ? '已复制' : '复制邀请码' }}
          </text>
        </view>
      </view>

      <!-- 邀请码展示 -->
      <view class="code-card">
        <view class="code-left">
          <text class="code-hint">
            我的邀请码
          </text>
          <text class="code-val">
            {{ inviteCode }}
          </text>
        </view>
        <view
          class="code-btn"
          @tap="onCopy"
        >
          <text class="code-btn-txt">
            {{ copied ? '已复制' : '复制' }}
          </text>
        </view>
      </view>

      <!-- 排行榜 -->
      <view class="rank-head">
        <view class="rank-title-row">
          <app-icon
            name="crown"
            :size="32"
            color="#C9A96E"
          />
          <text class="section-title inline">
            邀请排行榜
          </text>
        </view>
        <view class="seg">
          <text
            :class="['seg-item', leaderboardTab === 'today' && 'seg-on']"
            @tap="leaderboardTab = 'today'"
          >
            今日
          </text>
          <text
            :class="['seg-item', leaderboardTab === 'total' && 'seg-on']"
            @tap="leaderboardTab = 'total'"
          >
            累计
          </text>
        </view>
      </view>
      <view class="card">
        <view
          v-for="(u, i) in leaderboard"
          :key="u.rank"
          :class="['rank-row', i < leaderboard.length - 1 && 'bb']"
        >
          <text :class="['rank-no', u.rank === 1 && 'r1', u.rank === 2 && 'r2', u.rank === 3 && 'r3']">
            {{ u.rank }}
          </text>
          <view class="avatar">
            <text class="avatar-txt">
              {{ u.name[0] }}
            </text>
          </view>
          <text class="rank-name">
            {{ u.name }}
          </text>
          <view class="rank-cnt">
            <text class="rank-cnt-num">
              {{ u.count }}
            </text><text class="rank-cnt-unit">
              人
            </text>
          </view>
        </view>
      </view>

      <!-- 已邀请好友 -->
      <view class="rank-head">
        <view class="rank-title-row">
          <app-icon
            name="users"
            :size="32"
            color="#C41E2D"
          />
          <text class="section-title inline">
            已邀请好友
          </text>
          <text class="badge">
            {{ invitedFriends.length }}人
          </text>
        </view>
        <view
          class="more"
          @tap="go('/invite/history')"
        >
          <text class="more-txt">
            全部记录
          </text>
          <app-icon
            name="chevron-right"
            :size="24"
            color="#9A8F80"
          />
        </view>
      </view>
      <view
        v-if="invitedFriends.length"
        class="card"
      >
        <view
          v-for="(f, i) in invitedFriends"
          :key="f.id"
          :class="['friend-row', i < invitedFriends.length - 1 && 'bb']"
        >
          <view class="avatar lg">
            <text class="avatar-txt">
              {{ f.name[0] }}
            </text>
          </view>
          <view class="friend-info">
            <text class="friend-name">
              {{ f.name }}
            </text>
            <text class="friend-time">
              {{ f.registerTime }}
            </text>
          </view>
          <text :class="['fstatus', f.status === 'registered' ? 'fs-ok' : 'fs-pend']">
            {{ f.status === 'registered' ? '已注册' : '待激活' }}
          </text>
        </view>
      </view>
      <view
        v-else
        class="empty"
      >
        <view class="empty-icon">
          <app-icon
            name="users"
            :size="64"
            color="#9A8F80"
          />
        </view>
        <text class="empty-t">
          还没有邀请好友
        </text>
        <text class="empty-s">
          快去分享邀请链接吧
        </text>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 海报弹窗 -->
    <view
      v-if="showPoster"
      class="mask"
      @tap="showPoster = false"
    >
      <view
        class="poster-wrap"
        @tap.stop
      >
        <view class="poster">
          <view class="poster-top">
            <view class="poster-logo">
              <text class="poster-logo-txt">
                卜
              </text>
            </view>
            <text class="poster-brand">
              热卜国学
            </text>
            <text class="poster-sub">
              探索易学智慧
            </text>
          </view>
          <view class="poster-mid">
            <text class="poster-mid-t">
              邀请你一起学习国学
            </text>
            <text class="poster-mid-s">
              注册即送7天会员体验
            </text>
          </view>
          <view class="poster-qr">
            <view class="qr-box">
              <text class="qr-txt">
                二维码
              </text>
            </view>
            <text class="qr-hint">
              长按识别二维码
            </text>
            <text class="qr-code">
              邀请码: {{ inviteCode }}
            </text>
          </view>
        </view>
        <view class="poster-actions">
          <view
            class="pa-btn pa-cancel"
            @tap="showPoster = false"
          >
            <text class="pa-cancel-txt">
              取消
            </text>
          </view>
          <view
            class="pa-btn pa-save"
            @tap="onSavePoster"
          >
            <text class="pa-save-txt">
              保存海报
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo } from '@/utils/router'

const inviteCode = 'REBU2024'
const copied = ref(false)
const showPoster = ref(false)
const leaderboardTab = ref<'today' | 'total'>('total')

const invitedFriends = ref([
  { id: 1, name: '张三', registerTime: '2024-03-15 14:30', status: 'registered' },
  { id: 2, name: '李四', registerTime: '2024-03-14 09:20', status: 'registered' },
  { id: 3, name: '王五', registerTime: '2024-03-13 16:45', status: 'pending' },
  { id: 4, name: '赵六', registerTime: '2024-03-12 11:00', status: 'registered' },
])

const leaderboard = ref([
  { rank: 1, name: '周易大师', count: 128 },
  { rank: 2, name: '张玄风', count: 96 },
  { rank: 3, name: '陈风水', count: 72 },
  { rank: 4, name: '李易安', count: 58 },
  { rank: 5, name: '王命理', count: 45 },
])

const registeredCount = computed(() => invitedFriends.value.filter(f => f.status === 'registered').length)

function go(path: string) { navigateTo(path) }
function onCopy() {
  uni.setClipboardData({ data: inviteCode, success: () => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }})
}
function onShare() {
  uni.setClipboardData({ data: `https://rebu.com/register?invite=${inviteCode}`, success: () => {
    uni.showToast({ title: '链接已复制', icon: 'none' })
  }})
}
function onSavePoster() {
  uni.showToast({ title: '海报已保存到相册', icon: 'none' })
  showPoster.value = false
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
.scroll { flex: 1; }
.section-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; padding: 32rpx 32rpx 24rpx; }
.section-title.inline { padding: 0; }

/* 奖励卡 */
.reward-card { position: relative; overflow: hidden; margin: 32rpx; border-radius: 24rpx; background: linear-gradient(135deg, #C41E2D 0%, #B01828 60%, #C9A96E 100%); padding: 40rpx; }
.reward-deco { position: absolute; right: -24rpx; top: -24rpx; opacity: 0.1; }
.reward-body { position: relative; z-index: 1; }
.reward-title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.reward-title { font-size: 36rpx; font-weight: 700; color: #FFFFFF; }
.reward-desc { display: block; font-size: 26rpx; color: rgba(255,255,255,0.9); line-height: 1.6; }
.reward-stats { display: flex; gap: 48rpx; margin-top: 32rpx; padding-top: 32rpx; border-top: 1rpx solid rgba(255,255,255,0.2); }
.rstat { display: flex; flex-direction: column; align-items: center; }
.rstat-num { font-size: 44rpx; font-weight: 700; color: #FFFFFF; }
.rstat-label { font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; }

/* 邀请方式 */
.ways { display: flex; gap: 24rpx; padding: 0 32rpx; }
.way { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 32rpx 0; background: #FFFFFF; border-radius: 20rpx; border: 1rpx solid #EFEAE2; }
.way-icon { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.way-label { font-size: 24rpx; color: #2C2C2C; font-weight: 500; }

/* 邀请码 */
.code-card { display: flex; align-items: center; justify-content: space-between; margin: 32rpx; padding: 32rpx; background: rgba(201,169,110,0.08); border: 2rpx dashed #D9CDB8; border-radius: 20rpx; }
.code-hint { display: block; font-size: 22rpx; color: #9A8F80; }
.code-val { display: block; font-size: 40rpx; font-weight: 700; color: #C41E2D; letter-spacing: 6rpx; margin-top: 8rpx; }
.code-btn { padding: 16rpx 32rpx; background: #C41E2D; border-radius: 12rpx; }
.code-btn-txt { font-size: 26rpx; color: #FFFFFF; font-weight: 500; }

/* 排行/列表头 */
.rank-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 32rpx 24rpx; }
.rank-title-row { display: flex; align-items: center; gap: 12rpx; }
.badge { font-size: 20rpx; color: #9A8F80; background: #EFEAE2; padding: 2rpx 12rpx; border-radius: 8rpx; }
.seg { display: flex; gap: 4rpx; background: #EFEAE2; border-radius: 999rpx; padding: 4rpx; }
.seg-item { font-size: 24rpx; color: #9A8F80; padding: 8rpx 24rpx; border-radius: 999rpx; }
.seg-on { background: #C41E2D; color: #FFFFFF; }
.more { display: flex; align-items: center; gap: 4rpx; }
.more-txt { font-size: 24rpx; color: #9A8F80; }

.card { margin: 0 32rpx; background: #FFFFFF; border-radius: 20rpx; border: 1rpx solid #EFEAE2; overflow: hidden; }
.bb { border-bottom: 1rpx solid #F0ECE4; }

/* 排行行 */
.rank-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; }
.rank-no { width: 48rpx; text-align: center; font-size: 28rpx; color: #9A8F80; font-weight: 600; }
.rank-no.r1 { color: #E5B53A; font-size: 34rpx; font-weight: 700; }
.rank-no.r2 { color: #A8A8A8; font-size: 34rpx; font-weight: 700; }
.rank-no.r3 { color: #D38A3F; font-size: 34rpx; font-weight: 700; }
.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #EFEAE2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar.lg { width: 80rpx; height: 80rpx; }
.avatar-txt { font-size: 28rpx; color: #2C2C2C; }
.rank-name { flex: 1; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.rank-cnt-num { font-size: 28rpx; font-weight: 600; color: #C41E2D; }
.rank-cnt-unit { font-size: 22rpx; color: #9A8F80; margin-left: 4rpx; }

/* 好友行 */
.friend-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; }
.friend-info { flex: 1; min-width: 0; }
.friend-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.friend-time { display: block; font-size: 22rpx; color: #9A8F80; margin-top: 4rpx; }
.fstatus { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 8rpx; }
.fs-ok { background: rgba(46,160,67,0.1); color: #2EA043; }
.fs-pend { background: #EFEAE2; color: #9A8F80; }

/* 空态 */
.empty { margin: 0 32rpx; padding: 64rpx 0; background: #FFFFFF; border-radius: 20rpx; border: 1rpx solid #EFEAE2; display: flex; flex-direction: column; align-items: center; }
.empty-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: #EFEAE2; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.empty-t { font-size: 28rpx; color: #9A8F80; }
.empty-s { font-size: 24rpx; color: #BBB2A6; margin-top: 8rpx; }

.safe-bottom { height: 48rpx; }

/* 海报弹窗 */
.mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; padding: 32rpx; }
.poster-wrap { width: 100%; max-width: 560rpx; }
.poster { border-radius: 20rpx; overflow: hidden; aspect-ratio: 9/16; background: linear-gradient(135deg, #C41E2D 0%, #B01828 55%, #C9A96E 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 48rpx; }
.poster-top { text-align: center; }
.poster-logo { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 24rpx; }
.poster-logo-txt { font-size: 44rpx; font-weight: 700; color: #FFFFFF; }
.poster-brand { display: block; font-size: 40rpx; font-weight: 700; color: #FFFFFF; }
.poster-sub { display: block; font-size: 24rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; }
.poster-mid { text-align: center; }
.poster-mid-t { display: block; font-size: 34rpx; font-weight: 600; color: #FFFFFF; margin-bottom: 12rpx; }
.poster-mid-s { display: block; font-size: 26rpx; color: rgba(255,255,255,0.8); }
.poster-qr { background: #FFFFFF; border-radius: 20rpx; padding: 32rpx; display: flex; flex-direction: column; align-items: center; }
.qr-box { width: 160rpx; height: 160rpx; background: #EFEAE2; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.qr-txt { font-size: 22rpx; color: #9A8F80; }
.qr-hint { font-size: 22rpx; color: #9A8F80; }
.qr-code { font-size: 20rpx; color: #9A8F80; margin-top: 8rpx; }
.poster-actions { display: flex; gap: 24rpx; margin-top: 32rpx; }
.pa-btn { flex: 1; padding: 28rpx 0; border-radius: 20rpx; text-align: center; }
.pa-cancel { background: rgba(255,255,255,0.2); }
.pa-cancel-txt { font-size: 28rpx; color: #FFFFFF; font-weight: 500; }
.pa-save { background: #FFFFFF; }
.pa-save-txt { font-size: 28rpx; color: #C41E2D; font-weight: 600; }
</style>
