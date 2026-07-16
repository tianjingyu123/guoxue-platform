<script setup lang="ts">
/**
 * 邀请好友加入 — V0 circle-invite.html 还原（批⑥ 2026-07-10 重写视图层）
 * 结构：邀请卡片预览(真实圈子信息+邀请人) → 我的专属邀请码(复制/无码时生成) → 邀请说明
 *       → 我的邀请(三格真实统计) → 邀请记录 → 吸底(生成海报/复制邀请链接)。
 * 数据：circleDetailApi.detail + inviteApi.listCodes/getStats/generate + mineApi.getProfile(邀请人·尽力而为)。
 * 降级（后端缺·待办#35）：双向奖励（好友立减 30 元/邀请人得金币/引路人标识）后端无结算模型
 *       → 奖励规则区不展示任何金额承诺，仅保留邀请功能本体与真实统计；
 *       V0 记录行「+30 金币/待生效」奖励列 → 仅显加入时间；海报二维码为占位图标（复用 share-poster 现有能力）。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { inviteApi, type InviteCodeItem, type InviteRecord } from '@/lib/circle-invite-data'
import { circleDetailApi, type CircleDetail } from '@/lib/circle-detail-data'
import { mineApi } from '@/lib/mine-data'

const circleId = ref('')
const isLoading = ref(true)
const error = ref('')

const circle = ref<CircleDetail | null>(null)
const codes = ref<InviteCodeItem[]>([])
const totalInvited = ref(0)
const records = ref<InviteRecord[]>([])
const me = ref<{ nickname: string; avatar: string } | null>(null)

const generating = ref(false)
const copied = ref(false)

/** 当前可用邀请码（无过期/未用尽的第一个） */
const activeCode = computed(() => codes.value.find((c) => c.status === 'active') || null)
const totalUsed = computed(() => codes.value.reduce((s, c) => s + c.usedCount, 0))

async function load() {
  isLoading.value = true
  error.value = ''
  try {
    const [c, list, stats] = await Promise.all([
      circleDetailApi.detail(circleId.value),
      inviteApi.listCodes(circleId.value),
      inviteApi.getStats(circleId.value),
    ])
    circle.value = c
    codes.value = list
    totalInvited.value = stats.total
    records.value = stats.records
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
  // 邀请人信息（海报预览行）尽力而为，失败不影响主流程
  try { me.value = await mineApi.getProfile() } catch { me.value = null }
}

/** 生成邀请码（后端 get-or-create 口径按 expiredAt 判断，仅在无可用码时手动触发；maxUses=0 不限次数） */
async function generateCode() {
  if (generating.value) return
  generating.value = true
  try {
    await inviteApi.generate(circleId.value, 0)
    codes.value = await inviteApi.listCodes(circleId.value)
    uni.showToast({ title: '邀请码已生成', icon: 'success' })
  } catch {
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    generating.value = false
  }
}

function copyCode() {
  const code = activeCode.value?.code
  if (!code) return
  uni.setClipboardData({
    data: code,
    success: () => { copied.value = true; setTimeout(() => (copied.value = false), 2000) },
  })
}

/** 分享给好友：复制邀请链接（H5/App）；小程序引导右上角分享 */
function shareLink() {
  const code = activeCode.value?.code
  if (!code) { uni.showToast({ title: '请先生成邀请码', icon: 'none' }); return }
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请点击右上角分享', icon: 'none' })
  // #endif
  // #ifndef MP-WEIXIN
  // 链接进圈子预览页；邀请码以文案携带（预览页无自动核销邀请码参数，避免造假查询参数）
  const url = `https://api.rebugx.cn/h5/pkg-circle/circles/preview?id=${circleId.value}`
  const text = `邀请你加入「${circle.value?.name || '圈子'}」：${url} 邀请码 ${code}`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '邀请文案已复制', icon: 'none' }) })
  // #endif
}

/** 生成海报（复用 share-poster 现有能力） */
function openPoster() {
  navigateTo(`/pkg-circle/common/share-poster?type=circle&targetId=${circleId.value}`)
}

function fmtJoinDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日加入`
}

function formatCount(n: number): string { return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n) }

onLoad((opt) => { circleId.value = (opt?.id || opt?.circleId || '') as string })
onMounted(load)
</script>

<template>
  <view class="iv-page">
    <!-- 顶栏 -->
    <view class="iv-topbar">
      <view class="iv-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="iv-title">邀请好友加入</text>
    </view>

    <!-- 骨架 -->
    <view v-if="isLoading" class="iv-state">
      <view class="iv-skel tall" /><view class="iv-skel" /><view class="iv-skel" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error || !circle" class="iv-state center">
      <text class="iv-state-t">{{ error || '加载失败' }}</text>
      <view class="iv-retry" @tap="load"><text class="iv-retry-t">重试</text></view>
    </view>

    <template v-else>
      <!-- 邀请卡片预览：分享出去的样子（真实圈子信息） -->
      <text class="iv-label center">分享出去的邀请卡片</text>
      <view class="iv-poster">
        <view class="iv-poster-cover">
          <image v-if="circle.cover" :src="circle.cover" class="iv-poster-cover-img" mode="aspectFill" />
          <view v-else class="iv-poster-cover-ph"><app-icon name="users" :size="56" color="#C9A96E" /></view>
        </view>
        <view class="iv-poster-body">
          <text class="iv-poster-title">{{ circle.name }}</text>
          <text class="iv-poster-stats">{{ formatCount(circle.members) }} 位成员 · {{ formatCount(circle.posts) }} 条内容</text>
          <view class="iv-poster-inviter">
            <image v-if="me?.avatar" :src="me.avatar" class="iv-poster-avatar" mode="aspectFill" />
            <view v-else class="iv-poster-avatar ph"><app-icon name="user" :size="28" color="#999999" /></view>
            <text class="iv-poster-inviter-t"><text class="iv-poster-inviter-b">{{ me?.nickname || '我' }}</text> 邀请你加入这个圈子</text>
            <view class="iv-poster-qr"><app-icon name="qr-code" :size="44" color="#999999" /></view>
          </view>
        </view>
      </view>
      <text class="iv-poster-note">可生成分享海报，或复制邀请码、邀请链接发给好友</text>

      <!-- 我的专属邀请码 -->
      <text class="iv-label">我的专属邀请码</text>
      <view class="iv-code-card">
        <template v-if="activeCode">
          <view class="iv-code-main">
            <text class="iv-code-sub">{{ activeCode.maxUses > 0 ? `可用 ${activeCode.maxUses} 次 · 已用 ${activeCode.usedCount}` : '长期有效 · 不限次数' }}</text>
            <text class="iv-code-value">{{ activeCode.code }}</text>
          </view>
          <view class="iv-code-copy" :class="{ ok: copied }" @tap="copyCode">
            <text class="iv-code-copy-t" :class="{ ok: copied }">{{ copied ? '已复制' : '复制' }}</text>
          </view>
        </template>
        <template v-else>
          <view class="iv-code-main">
            <text class="iv-code-sub">你还没有可用的邀请码</text>
            <text class="iv-code-empty-t">生成后即可邀请好友加入</text>
          </view>
          <view class="iv-code-gen" :class="{ disabled: generating }" @tap="generateCode">
            <text class="iv-code-gen-t">{{ generating ? '生成中…' : '生成邀请码' }}</text>
          </view>
        </template>
      </view>

      <!-- 邀请说明（V0 奖励规则降级：无奖励结算后端，只写真实机制，不做金额承诺） -->
      <text class="iv-label">邀请说明</text>
      <view class="iv-rule-card">
        <view class="iv-rule-row">
          <view class="iv-rule-num"><text class="iv-rule-num-t">1</text></view>
          <text class="iv-rule-t">好友凭你的邀请码可直接加入圈子，无需审批</text>
        </view>
        <view class="iv-rule-row">
          <view class="iv-rule-num"><text class="iv-rule-num-t">2</text></view>
          <text class="iv-rule-t">邀请码长期有效，可重复使用，随时可复制分享</text>
        </view>
        <view class="iv-rule-row">
          <view class="iv-rule-num"><text class="iv-rule-num-t">3</text></view>
          <text class="iv-rule-t">通过你的邀请码加入的好友会记入下方邀请记录</text>
        </view>
      </view>

      <!-- 我的邀请：真实统计三格 -->
      <text class="iv-label">我的邀请</text>
      <view class="iv-stats-row">
        <view class="iv-stat-cell">
          <text class="iv-stat-num">{{ totalInvited }}</text>
          <text class="iv-stat-label">已邀请</text>
        </view>
        <view class="iv-stat-cell">
          <text class="iv-stat-num">{{ codes.length }}</text>
          <text class="iv-stat-label">我的邀请码</text>
        </view>
        <view class="iv-stat-cell">
          <text class="iv-stat-num">{{ totalUsed }}</text>
          <text class="iv-stat-label">累计使用</text>
        </view>
      </view>

      <!-- 邀请记录 -->
      <view v-if="records.length" class="iv-record-card">
        <view v-for="r in records" :key="r.id" class="iv-record-row">
          <image v-if="r.avatar" :src="r.avatar" class="iv-record-avatar" mode="aspectFill" lazy-load />
          <view v-else class="iv-record-avatar ph"><app-icon name="user" :size="30" color="#999999" /></view>
          <view class="iv-record-main">
            <text class="iv-record-name">{{ r.nickname }}</text>
            <text class="iv-record-time">{{ fmtJoinDate(r.joinedAt) }}</text>
          </view>
        </view>
      </view>
      <view v-else class="iv-record-card empty">
        <text class="iv-record-empty-t">还没有邀请记录，把邀请码分享给好友吧</text>
      </view>

      <!-- 吸底分享栏 -->
      <view class="iv-share-bar">
        <view class="iv-share-btn secondary" @tap="openPoster"><text class="iv-share-btn-t">生成海报</text></view>
        <view class="iv-share-btn primary" @tap="shareLink"><text class="iv-share-btn-t light">分享给好友</text></view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.iv-page { min-height: 100vh; background: var(--bg-page, #FAF8F5); padding-bottom: 216rpx; }

/* 顶栏 */
.iv-topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.iv-back {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.iv-title { font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2C2C2C); }

/* 三态 */
.iv-state { padding: 24rpx 32rpx; }
.iv-state.center { padding: 180rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.iv-state-t { font-size: 28rpx; color: var(--text-tertiary, #999); text-align: center; }
.iv-retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #C41E3A); }
.iv-retry-t { font-size: 26rpx; color: #fff; }
.iv-skel { height: 180rpx; border-radius: 36rpx; background: #fff; margin-bottom: 24rpx; animation: iv-pulse 1.4s ease-in-out infinite; }
.iv-skel.tall { height: 420rpx; }
@keyframes iv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

/* 分区标题 */
.iv-label { display: block; margin: 44rpx 40rpx 16rpx; font-size: 26rpx; color: var(--text-tertiary, #999); }
.iv-label.center { text-align: center; margin-top: 20rpx; }

/* 邀请卡片预览 */
.iv-poster {
  margin: 16rpx 84rpx 0; border-radius: 36rpx; overflow: hidden;
  background: var(--bg-card, #fff);
  box-shadow: 0 12rpx 48rpx rgba(44, 44, 44, 0.1);
}
.iv-poster-cover { width: 100%; aspect-ratio: 16 / 9; background: var(--bg-warm, #F8F4EC); }
.iv-poster-cover-img { width: 100%; height: 100%; }
.iv-poster-cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.iv-poster-body { padding: 28rpx 32rpx 32rpx; }
.iv-poster-title { font-size: 30rpx; font-weight: 700; color: var(--text-primary, #2C2C2C); line-height: 1.4; }
.iv-poster-stats { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 8rpx; }
.iv-poster-inviter {
  display: flex; align-items: center; gap: 16rpx; margin-top: 24rpx;
  padding-top: 24rpx; border-top: 1rpx dashed var(--separator, #EDE7DD);
}
.iv-poster-avatar { width: 52rpx; height: 52rpx; border-radius: 999rpx; flex-shrink: 0; }
.iv-poster-avatar.ph { background: var(--bg-warm, #F8F4EC); display: flex; align-items: center; justify-content: center; }
.iv-poster-inviter-t { flex: 1; font-size: 23rpx; color: var(--text-secondary, #6E6E73); line-height: 1.5; }
.iv-poster-inviter-b { color: var(--text-primary, #2C2C2C); font-weight: 600; }
.iv-poster-qr {
  width: 88rpx; height: 88rpx; border-radius: 16rpx; flex-shrink: 0;
  background: var(--bg-warm, #F8F4EC); border: 1rpx solid var(--separator, #EDE7DD);
  display: flex; align-items: center; justify-content: center;
}
.iv-poster-note { display: block; margin: 20rpx 84rpx 0; font-size: 21rpx; color: var(--text-tertiary, #999); text-align: center; }

/* 我的邀请码 */
.iv-code-card {
  margin: 0 32rpx; padding: 28rpx 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; align-items: center; gap: 24rpx;
}
.iv-code-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.iv-code-sub { font-size: 22rpx; color: var(--text-tertiary, #999); }
.iv-code-value {
  font-size: 44rpx; font-weight: 700; letter-spacing: 6rpx;
  color: var(--text-primary, #2C2C2C); margin-top: 4rpx;
  font-family: monospace; word-break: break-all;
}
.iv-code-empty-t { font-size: 26rpx; color: var(--text-secondary, #6E6E73); margin-top: 6rpx; }
.iv-code-copy {
  flex-shrink: 0; padding: 14rpx 32rpx; border-radius: 32rpx;
  border: 1rpx solid #C9A96E;
}
.iv-code-copy.ok { border-color: #34A853; }
.iv-code-copy-t { font-size: 25rpx; font-weight: 600; color: #C9A96E; }
.iv-code-copy-t.ok { color: #34A853; }
.iv-code-gen { flex-shrink: 0; padding: 16rpx 32rpx; border-radius: 999rpx; background: var(--brand, #C41E3A); }
.iv-code-gen.disabled { opacity: 0.5; }
.iv-code-gen-t { font-size: 25rpx; font-weight: 500; color: #fff; }

/* 邀请说明 */
.iv-rule-card {
  margin: 0 32rpx; padding: 8rpx 0;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.iv-rule-row { display: flex; gap: 20rpx; padding: 24rpx 32rpx; }
.iv-rule-row + .iv-rule-row { border-top: 1rpx solid var(--separator, #EDE7DD); }
.iv-rule-num {
  width: 40rpx; height: 40rpx; border-radius: 999rpx; flex-shrink: 0;
  background: var(--bg-warm, #F8F4EC);
  display: flex; align-items: center; justify-content: center;
}
.iv-rule-num-t { font-size: 22rpx; font-weight: 700; color: #C9A96E; }
.iv-rule-t { flex: 1; font-size: 26rpx; color: var(--text-secondary, #6E6E73); line-height: 1.65; }

/* 邀请战绩 */
.iv-stats-row { display: flex; gap: 20rpx; margin: 16rpx 32rpx 0; }
.iv-stat-cell {
  flex: 1; padding: 24rpx 0; text-align: center;
  background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; flex-direction: column; align-items: center;
}
.iv-stat-num { font-size: 40rpx; font-weight: 700; color: #C9A96E; }
.iv-stat-label { font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }

/* 邀请记录 */
.iv-record-card {
  margin: 20rpx 32rpx 0; padding: 8rpx 0;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.iv-record-card.empty { padding: 48rpx 32rpx; display: flex; justify-content: center; }
.iv-record-empty-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.iv-record-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 32rpx; }
.iv-record-row + .iv-record-row { border-top: 1rpx solid var(--separator, #EDE7DD); }
.iv-record-avatar { width: 68rpx; height: 68rpx; border-radius: 999rpx; flex-shrink: 0; }
.iv-record-avatar.ph { background: var(--bg-warm, #F8F4EC); display: flex; align-items: center; justify-content: center; }
.iv-record-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.iv-record-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2C2C2C); }
.iv-record-time { font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }

/* 吸底分享栏 */
.iv-share-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #EDE7DD);
  display: flex; gap: 20rpx;
}
.iv-share-btn { flex: 1; height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center; }
.iv-share-btn.secondary { border: 1rpx solid var(--separator, #EDE7DD); background: var(--bg-card, #fff); }
.iv-share-btn.primary { background: var(--brand, #C41E3A); }
.iv-share-btn-t { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2C2C2C); }
.iv-share-btn-t.light { color: #fff; letter-spacing: 2rpx; }
</style>
