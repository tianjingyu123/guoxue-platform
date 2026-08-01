<script setup lang="ts">
/**
 * 我的加入申请 — V0 circle-join-requests.html 还原（2026-07-10）
 * 卡片式列表：封面+圈名+时间行+状态徽章（待审核橙/已通过绿/已拒绝灰）。
 * 已拒绝显示圈主留言（rejectReason·后端已有字段）+「重新申请」；已通过给「进入圈子」。
 * 数据：growthApi.myJoinRequests（真连 GET /circles/my-join-requests）。
 * 降级（后端缺）：撤回申请无端点→不做撤回按钮；「查看推荐圈子」→跳圈子首页发现。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { goBack, navigateTo } from '@/utils/router'
import { growthApi, type MyJoinRequestItem } from '@/lib/circle-growth-data'

const loading = ref(true)
const error = ref('')
const list = ref<MyJoinRequestItem[]>([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await growthApi.myJoinRequests()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const STATUS_LABEL: Record<MyJoinRequestItem['status'], string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
}

/** 相对时间「x天前 / x周前 / M月D日」 */
function relTime(iso: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const day = Math.floor((Date.now() - t) / 86400000)
  if (day < 1) return '今天'
  if (day < 7) return `${day} 天前`
  if (day < 30) return `${Math.floor(day / 7)} 周前`
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function timeLine(r: MyJoinRequestItem): string {
  const submitted = `${relTime(r.createdAt)}提交`
  if (r.status === 'PENDING') return `${submitted} · 等待圈主处理`
  if (!r.reviewedAt) return submitted
  return `${submitted} · ${relTime(r.reviewedAt)}${r.status === 'APPROVED' ? '通过' : '处理'}`
}

function enterCircle(r: MyJoinRequestItem) {
  if (r.circleId) navigateTo(`/pkg-circle/circles/detail?id=${r.circleId}`)
}
function reapply(r: MyJoinRequestItem) {
  if (r.circleId) navigateTo(`/pkg-circle/circles/preview?id=${r.circleId}`)
}
function discover() { navigateTo('/pages/circles/index') }

onMounted(load)
</script>

<template>
  <view class="jr-page">
    <!-- 顶栏 -->
    <view class="jr-topbar">
      <view class="jr-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="jr-title">我的加入申请</text>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="jr-state">
      <view class="jr-skel" /><view class="jr-skel" /><view class="jr-skel" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="jr-state center">
      <text class="jr-state-t">{{ error }}</text>
      <view class="jr-retry" @tap="load"><text class="jr-retry-t">重试</text></view>
    </view>
    <!-- 空态 -->
    <view v-else-if="!list.length" class="jr-state center">
      <view class="jr-empty-icon"><app-icon name="inbox" :size="56" color="#999999" /></view>
      <text class="jr-empty-title">还没有加入申请</text>
      <text class="jr-empty-sub">加入需审批的圈子时，申请会显示在这里</text>
      <view class="jr-empty-btn" @tap="discover"><text class="jr-empty-btn-t">去发现圈子</text></view>
    </view>

    <!-- 申请卡片列表 -->
    <template v-else>
      <view v-for="r in list" :key="r.id" class="jr-request">
        <view class="jr-head" @tap="enterCircle(r)">
          <view class="jr-cover">
            <smart-cover class="jr-cover-img" :src="r.circleCover" :title="r.circleName" type="circle" />
          </view>
          <view class="jr-main">
            <text class="jr-name">{{ r.circleName }}</text>
            <text class="jr-time">{{ timeLine(r) }}</text>
          </view>
          <text class="jr-badge" :class="r.status.toLowerCase()">{{ STATUS_LABEL[r.status] }}</text>
        </view>

        <!-- 已拒绝：圈主留言 + 操作 -->
        <text v-if="r.status === 'REJECTED' && r.rejectReason" class="jr-reject-reason">
          <text class="jr-reject-b">圈主留言：</text>{{ r.rejectReason }}
        </text>
        <view v-if="r.status === 'REJECTED'" class="jr-actions">
          <view class="jr-btn primary" @tap="reapply(r)"><text class="jr-btn-t primary">重新申请</text></view>
          <view class="jr-btn plain" @tap="discover"><text class="jr-btn-t plain">查看推荐圈子</text></view>
        </view>

        <!-- 已通过：进入圈子 -->
        <view v-if="r.status === 'APPROVED'" class="jr-enter-btn" @tap="enterCircle(r)">
          <text class="jr-enter-btn-t">进入圈子</text>
        </view>
      </view>
      <view class="jr-bottom-pad" />
    </template>
  </view>
</template>

<style scoped lang="scss">
.jr-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 */
.jr-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.jr-back {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.jr-title { font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }

/* 三态 */
.jr-state { padding: 24rpx 32rpx; }
.jr-state.center { padding: 180rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.jr-skel { height: 160rpx; border-radius: 36rpx; background: #fff; margin-bottom: 24rpx; }
.jr-state-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.jr-retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.jr-retry-t { font-size: 26rpx; color: #fff; }
.jr-empty-icon {
  width: 128rpx; height: 128rpx; border-radius: 40rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.jr-empty-title { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 20rpx; }
.jr-empty-sub { font-size: 26rpx; color: var(--text-tertiary, #999); text-align: center; line-height: 1.7; }
.jr-empty-btn {
  margin-top: 24rpx; height: 80rpx; padding: 0 48rpx; border-radius: 40rpx;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; align-items: center; justify-content: center;
}
.jr-empty-btn-t { font-size: 28rpx; color: var(--text-secondary, #6e6e73); font-weight: 500; }

/* 申请卡片 */
.jr-request {
  margin: 24rpx 32rpx 0; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 28rpx 32rpx;
}
.jr-head { display: flex; align-items: center; gap: 24rpx; }
.jr-cover { width: 88rpx; height: 88rpx; border-radius: 22rpx; overflow: hidden; flex-shrink: 0; }
.jr-cover-img { width: 88rpx; height: 88rpx; }
.jr-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.jr-name { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.jr-time { font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.jr-badge {
  flex-shrink: 0; padding: 6rpx 20rpx; border-radius: 24rpx;
  font-size: 24rpx; font-weight: 500;
}
.jr-badge.pending { background: rgba(201, 123, 45, 0.1); color: #c97b2d; }
.jr-badge.approved { background: rgba(91, 138, 94, 0.1); color: #5b8a5e; }
.jr-badge.rejected { background: var(--bg-warm, #f8f4ec); color: var(--text-tertiary, #999); }

/* 拒绝原因 */
.jr-reject-reason {
  display: block; margin-top: 24rpx; padding: 20rpx 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 16rpx;
  font-size: 25rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6;
}
.jr-reject-b { font-weight: 600; color: var(--text-primary, #2c2c2c); }
.jr-actions { display: flex; gap: 20rpx; margin-top: 24rpx; }
.jr-btn {
  flex: 1; height: 72rpx; border-radius: 36rpx;
  display: flex; align-items: center; justify-content: center;
}
.jr-btn.primary { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.jr-btn.plain { background: var(--bg-warm, #f8f4ec); }
.jr-btn:active { opacity: 0.85; }
.jr-btn-t { font-size: 26rpx; font-weight: 500; }
.jr-btn-t.primary { color: var(--brand, #c41e3a); }
.jr-btn-t.plain { color: var(--text-secondary, #6e6e73); }

/* 已通过进入按钮 */
.jr-enter-btn {
  margin-top: 24rpx; height: 72rpx; border-radius: 36rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.jr-enter-btn:active { opacity: 0.88; }
.jr-enter-btn-t { font-size: 26rpx; font-weight: 500; color: #fff; }

.jr-bottom-pad { height: 40rpx; }
</style>
