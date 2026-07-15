<script setup lang="ts">
/**
 * 发布审核 — 圈子事务「发布审核与草稿」入口页（2026-07-10 新建）
 * 我发布的「向全平台开放」内容的平台审核台账：审核中 / 已通过 / 已驳回（带原因）。
 * 数据：contentAuditApi.mine（真连 GET /audit/content-audits/mine·JWT）。
 * 降级：草稿聚合暂未做（后端 /circles/drafts 仅帖子草稿且前端无草稿续编流程），本页先做审核记录。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { contentAuditApi, type MyContentAudit, type AuditFinalStatus } from '@/lib/content-audit-data'

type Filter = 'ALL' | AuditFinalStatus
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: '全部' },
  { id: 'PENDING', label: '审核中' },
  { id: 'APPROVED', label: '已通过' },
  { id: 'REJECTED', label: '已驳回' },
]
const TYPE_LABEL: Record<string, string> = {
  ARTICLE: '文章', COURSE: '课程', VIDEO: '短视频', LIVE: '直播', POST: '帖子',
}
const STATUS_CFG: Record<AuditFinalStatus, { label: string; cls: string }> = {
  PENDING: { label: '审核中', cls: 'pending' },
  APPROVED: { label: '已通过', cls: 'approved' },
  REJECTED: { label: '已驳回', cls: 'rejected' },
}

const filter = ref<Filter>('ALL')
const loading = ref(true)
const error = ref('')
const list = ref<MyContentAudit[]>([])
const total = ref(0)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await contentAuditApi.mine({ finalStatus: filter.value, pageSize: 50 })
    list.value = r.records
    total.value = r.total
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchFilter(f: Filter) {
  if (filter.value === f) return
  filter.value = f
  load()
}

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(load)
</script>

<template>
  <view class="ma-page">
    <!-- 顶栏 -->
    <view class="ma-topbar">
      <view class="ma-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="ma-title">发布审核</text>
    </view>

    <!-- 状态筛选 -->
    <view class="ma-filters">
      <view
        v-for="f in FILTERS" :key="f.id"
        class="ma-filter" :class="{ on: filter === f.id }"
        @tap="switchFilter(f.id)"
      >
        <text class="ma-filter-t" :class="{ on: filter === f.id }">{{ f.label }}</text>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="ma-state">
      <view class="ma-skel" /><view class="ma-skel" /><view class="ma-skel" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="ma-state center">
      <text class="ma-state-t">{{ error }}</text>
      <view class="ma-retry" @tap="load"><text class="ma-retry-t">重试</text></view>
    </view>
    <!-- 空态 -->
    <view v-else-if="!list.length" class="ma-state center">
      <view class="ma-empty-icon"><app-icon name="file-text" :size="52" color="#999999" /></view>
      <text class="ma-empty-title">暂无审核记录</text>
      <text class="ma-empty-sub">发布内容选择「向全平台开放」后，平台审核进度会显示在这里；仅圈内可见的内容无需平台审核。</text>
    </view>

    <!-- 审核记录列表 -->
    <template v-else>
      <view v-for="r in list" :key="r.id" class="ma-card">
        <view class="ma-head">
          <text class="ma-type">{{ TYPE_LABEL[r.contentType] || r.contentType }}</text>
          <view class="ma-main">
            <text class="ma-name">{{ r.contentTitle || '（内容已删除或无标题）' }}</text>
            <text class="ma-time">{{ fmtDate(r.createdAt) }} 提交</text>
          </view>
          <text class="ma-badge" :class="STATUS_CFG[r.finalStatus].cls">{{ STATUS_CFG[r.finalStatus].label }}</text>
        </view>
        <text v-if="r.finalStatus === 'REJECTED' && r.rejectReason" class="ma-reject">
          <text class="ma-reject-b">驳回原因：</text>{{ r.rejectReason }}
        </text>
        <text v-if="r.finalStatus === 'REJECTED'" class="ma-reject-note">内容仍在圈内正常可见，可修改后重新提交开放申请。</text>
      </view>
      <view class="ma-bottom-pad" />
    </template>
  </view>
</template>

<style scoped lang="scss">
.ma-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 */
.ma-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.ma-back {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ma-title { font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }

/* 筛选 */
.ma-filters { display: flex; gap: 16rpx; padding: 8rpx 32rpx 8rpx; }
.ma-filter {
  height: 60rpx; padding: 0 28rpx; border-radius: 30rpx;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.04);
  display: flex; align-items: center; justify-content: center;
}
.ma-filter.on { background: var(--brand, #c41e3a); }
.ma-filter-t { font-size: 25rpx; color: var(--text-secondary, #6e6e73); }
.ma-filter-t.on { color: #fff; font-weight: 500; }

/* 三态 */
.ma-state { padding: 24rpx 32rpx; }
.ma-state.center { padding: 160rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.ma-skel { height: 150rpx; border-radius: 32rpx; background: #fff; margin-bottom: 24rpx; }
.ma-state-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.ma-retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.ma-retry-t { font-size: 26rpx; color: #fff; }
.ma-empty-icon {
  width: 128rpx; height: 128rpx; border-radius: 40rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.ma-empty-title { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 20rpx; }
.ma-empty-sub { font-size: 25rpx; color: var(--text-tertiary, #999); line-height: 1.7; text-align: center; }

/* 记录卡片 */
.ma-card {
  margin: 20rpx 32rpx 0; background: var(--bg-card, #fff);
  border-radius: 32rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 28rpx 32rpx;
}
.ma-head { display: flex; align-items: center; gap: 20rpx; }
.ma-type {
  flex-shrink: 0; padding: 4rpx 16rpx; border-radius: 10rpx;
  background: var(--bg-warm, #f8f4ec); color: var(--gold, #c9a96e);
  font-size: 22rpx; font-weight: 500;
}
.ma-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ma-name {
  font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ma-time { font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.ma-badge {
  flex-shrink: 0; padding: 6rpx 20rpx; border-radius: 24rpx;
  font-size: 23rpx; font-weight: 500;
}
.ma-badge.pending { background: rgba(201, 123, 45, 0.1); color: #c97b2d; }
.ma-badge.approved { background: rgba(91, 138, 94, 0.1); color: #5b8a5e; }
.ma-badge.rejected { background: var(--bg-warm, #f8f4ec); color: var(--text-tertiary, #999); }

/* 驳回原因 */
.ma-reject {
  display: block; margin-top: 20rpx; padding: 20rpx 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 16rpx;
  font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.6;
}
.ma-reject-b { font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ma-reject-note { display: block; margin-top: 12rpx; font-size: 22rpx; color: var(--text-tertiary, #999); }

.ma-bottom-pad { height: 40rpx; }
</style>
