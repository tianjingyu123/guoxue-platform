<template>
  <view class="page">
    <app-nav-bar title="邀请好友" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <scroll-view scroll-y class="scroll">
      <!-- 邀请奖励卡 -->
      <view class="reward-card">
        <view class="reward-deco">
          <app-icon name="gift" :size="96" color="#FFFFFF" />
        </view>
        <view class="reward-body">
          <view class="reward-title-row">
            <app-icon name="sparkles" :size="36" color="#FFFFFF" />
            <text class="reward-title">邀请好友，双方有礼</text>
            <text class="reward-soon">即将开放</text>
          </view>
          <text class="reward-desc">邀请体系正在建设，开放时间、会员奖励与发放规则以正式公告为准。</text>
          <view class="reward-stats">
            <view class="rstat">
              <text class="rstat-num">{{ invitedFriends.length }}</text>
              <text class="rstat-label">已邀请</text>
            </view>
            <view class="rstat">
              <text class="rstat-num">{{ registeredCount }}</text>
              <text class="rstat-label">已注册</text>
            </view>
            <view class="rstat">
              <text class="rstat-num">{{ registeredCount * 7 }}</text>
              <text class="rstat-label">获得天数</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 邀请方式 -->
      <text class="section-title">邀请方式</text>
      <view class="ways">
        <view class="way" role="button" aria-disabled="true" aria-label="分享链接即将开放" @tap="onShare">
          <view class="way-icon" style="background:rgba(196,30,45,0.1)">
            <app-icon name="share-2" :size="40" color="#C41E2D" />
          </view>
          <text class="way-label">分享链接</text>
          <text class="way-status">即将开放</text>
        </view>
        <view class="way" role="button" aria-disabled="true" aria-label="生成海报即将开放" @tap="onPoster">
          <view class="way-icon" style="background:rgba(201,169,110,0.12)">
            <app-icon name="image" :size="40" color="#C9A96E" />
          </view>
          <text class="way-label">生成海报</text>
          <text class="way-status">即将开放</text>
        </view>
        <view class="way" role="button" aria-disabled="true" aria-label="复制邀请码即将开放" @tap="onCopy">
          <view class="way-icon" style="background:rgba(46,160,67,0.1)">
            <app-icon name="copy" :size="40" color="#2EA043" />
          </view>
          <text class="way-label">复制邀请码</text>
          <text class="way-status">即将开放</text>
        </view>
      </view>

      <!-- 邀请码展示（后端暂无用户专属邀请码来源，不伪造全体同码，诚实显示生成中） -->
      <view class="code-card">
        <view class="code-left">
          <text class="code-hint">我的邀请码</text>
          <text class="code-val pending">即将开放</text>
        </view>
      </view>

      <!-- 排行榜（后端无邀请排行数据时整段隐藏，不展示占位假榜） -->
      <template v-if="leaderboard.length">
        <view class="rank-head">
          <view class="rank-title-row">
            <app-icon name="crown" :size="32" color="#C9A96E" />
            <text class="section-title inline">邀请排行榜</text>
          </view>
          <view class="seg">
            <text :class="['seg-item', leaderboardTab === 'today' && 'seg-on']" @tap="leaderboardTab = 'today'">今日</text>
            <text :class="['seg-item', leaderboardTab === 'total' && 'seg-on']" @tap="leaderboardTab = 'total'">累计</text>
          </view>
        </view>
        <view class="card">
          <view v-for="(u, i) in leaderboard" :key="u.rank" :class="['rank-row', i < leaderboard.length - 1 && 'bb']">
            <text :class="['rank-no', u.rank === 1 && 'r1', u.rank === 2 && 'r2', u.rank === 3 && 'r3']">{{ u.rank }}</text>
            <view class="avatar"><text class="avatar-txt">{{ u.name[0] }}</text></view>
            <text class="rank-name">{{ u.name }}</text>
            <view class="rank-cnt"><text class="rank-cnt-num">{{ u.count }}</text><text class="rank-cnt-unit">人</text></view>
          </view>
        </view>
      </template>

      <!-- 已邀请好友 -->
      <view class="rank-head">
        <view class="rank-title-row">
          <app-icon name="users" :size="32" color="#C41E2D" />
          <text class="section-title inline">已邀请好友</text>
          <text class="badge">{{ invitedFriends.length }}人</text>
        </view>
        <view class="more" @tap="go('/invite/history')">
          <text class="more-txt">全部记录</text>
          <app-icon name="chevron-right" :size="24" color="#9A8F80" />
        </view>
      </view>
      <view class="card" v-if="invitedFriends.length">
        <view v-for="(f, i) in invitedFriends" :key="f.id" :class="['friend-row', i < invitedFriends.length - 1 && 'bb']">
          <view class="avatar lg"><text class="avatar-txt">{{ f.name[0] }}</text></view>
          <view class="friend-info">
            <text class="friend-name">{{ f.name }}</text>
            <text class="friend-time">{{ f.registerTime }}</text>
          </view>
          <text :class="['fstatus', f.status === 'registered' ? 'fs-ok' : 'fs-pend']">
            {{ f.status === 'registered' ? '已注册' : '待激活' }}
          </text>
        </view>
      </view>
      <view class="empty" v-else>
        <view class="empty-icon"><app-icon name="users" :size="64" color="#9A8F80" /></view>
        <text class="empty-t">还没有邀请好友</text>
        <text class="empty-s">开放后可在这里查看邀请与激活记录</text>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo } from '@/utils/router'

const leaderboardTab = ref<'today' | 'total'>('total')

// 后端暂无用户侧邀请数据聚合接口（user/auth 控制器无 invite 端点）→ 诚实降级为空，不伪造好友/排行
const invitedFriends = ref<{ id: number; name: string; registerTime: string; status: string }[]>([])
const leaderboard = ref<{ rank: number; name: string; count: number }[]>([])

const registeredCount = computed(() => invitedFriends.value.filter(f => f.status === 'registered').length)

function go(path: string) { navigateTo(path) }
// 邀请码尚未生成（后端无用户专属码来源），复制/分享暂不可用，诚实提示
function onCopy() {
  uni.showToast({ title: '邀请码即将开放', icon: 'none' })
}
function onShare() {
  uni.showToast({ title: '邀请功能即将开放', icon: 'none' })
}
function onPoster() {
  uni.showToast({ title: '邀请海报即将开放', icon: 'none' })
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
.reward-soon { margin-left: auto; padding: 5rpx 12rpx; border: 1rpx solid rgba(255,255,255,0.5); border-radius: 999rpx; font-size: 18rpx; color: #FFFFFF; background: rgba(255,255,255,0.12); }
.reward-desc { display: block; font-size: 26rpx; color: rgba(255,255,255,0.9); line-height: 1.6; }
.reward-stats { display: flex; gap: 48rpx; margin-top: 32rpx; padding-top: 32rpx; border-top: 1rpx solid rgba(255,255,255,0.2); }
.rstat { display: flex; flex-direction: column; align-items: center; }
.rstat-num { font-size: 44rpx; font-weight: 700; color: #FFFFFF; }
.rstat-label { font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; }

/* 邀请方式 */
.ways { display: flex; gap: 24rpx; padding: 0 32rpx; }
.way { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding: 28rpx 0; background: #FFFFFF; border-radius: 20rpx; border: 1rpx solid #EFEAE2; }
.way-icon { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.way-label { font-size: 24rpx; color: #2C2C2C; font-weight: 500; }
.way-status { padding: 3rpx 10rpx; border-radius: 999rpx; background: #F3F0EB; color: #9A8F80; font-size: 18rpx; }

/* 邀请码 */
.code-card { display: flex; align-items: center; justify-content: space-between; margin: 32rpx; padding: 32rpx; background: rgba(201,169,110,0.08); border: 2rpx dashed #D9CDB8; border-radius: 20rpx; }
.code-hint { display: block; font-size: 22rpx; color: #9A8F80; }
.code-val { display: block; font-size: 40rpx; font-weight: 700; color: #C41E2D; letter-spacing: 6rpx; margin-top: 8rpx; }
.code-val.pending { font-size: 30rpx; color: #9A8F80; letter-spacing: 2rpx; }
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

</style>
