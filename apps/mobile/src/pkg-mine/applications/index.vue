<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <app-icon name="arrow-left" :size="20" color="#2D2A26" />
        </view>
        <text class="nav-title">我的申请</text>
      </view>
      <!-- Tab -->
      <view class="tabs">
        <view
          v-for="t in tabList"
          :key="t.key"
          class="tab"
          :class="{ 'tab-active': tab === t.key }"
          @click="tab = t.key"
        >
          <text class="tab-text">{{ t.label }}</text>
          <view v-if="tab === t.key" class="tab-line" />
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 功能开通申请 -->
      <template v-if="tab === 'feature'">
        <view v-for="app in featureApps" :key="app.id" class="card">
          <view class="card-row">
            <view class="icon-box">
              <app-icon :name="app.feature === 'ecommerce_live' ? 'shopping-bag' : 'sparkles'" :size="20" :color="app.feature === 'ecommerce_live' ? '#C41E3A' : '#C9A96E'" />
            </view>
            <view class="card-main">
              <view class="card-head">
                <text class="card-title">{{ app.featureLabel }}</text>
                <view class="status-tag" :class="'st-' + app.status">
                  <app-icon v-if="statusIcon(app.status)" :name="statusIcon(app.status)" :size="12" :color="statusColor(app.status)" />
                  <text class="status-text" :style="{ color: statusColor(app.status) }">{{ statusLabel(app.status) }}</text>
                </view>
              </view>
              <text class="card-sub">{{ app.circleName }}</text>
              <text class="card-time">提交于 {{ app.submittedAt }}</text>
              <text v-if="app.status === 'reviewing'" class="review-tip">预计审核时长 {{ app.reviewTime }}</text>
              <view v-if="app.status === 'rejected'" class="reject-actions">
                <text class="link-muted" @click="rejectDetail = app.rejectReason || '暂不满足开通条件'">驳回原因</text>
                <text class="link-red">重新申请</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 入圈申请 -->
      <template v-if="tab === 'join'">
        <view v-for="app in joinApps" :key="app.id" class="card">
          <view class="card-row">
            <view class="icon-box">
              <app-icon name="users" :size="20" color="#6B5B9E" />
            </view>
            <view class="card-main">
              <view class="card-head">
                <text class="card-title">{{ app.circleName }}</text>
                <view class="status-tag" :class="'st-' + app.status">
                  <app-icon v-if="statusIcon(app.status)" :name="statusIcon(app.status)" :size="12" :color="statusColor(app.status)" />
                  <text class="status-text" :style="{ color: statusColor(app.status) }">{{ statusLabel(app.status) }}</text>
                </view>
              </view>
              <text class="card-time">提交于 {{ app.submittedAt }}</text>
              <text v-if="app.status === 'reviewing'" class="review-tip">等待圈主审批中</text>
              <text v-else-if="app.status === 'approved'" class="link-green" @click="goCircles">已通过，进入圈子</text>
              <text v-else-if="app.status === 'rejected'" class="link-muted" @click="rejectDetail = app.rejectReason || '申请未通过'">查看驳回原因</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 退出申请 -->
      <template v-if="tab === 'exit'">
        <view v-if="exitApps.length === 0" class="empty">
          <view class="empty-icon">
            <app-icon name="log-out" :size="32" color="rgba(45,42,38,0.3)" />
          </view>
          <text class="empty-text">暂无退出申请</text>
        </view>
        <view v-for="app in exitApps" :key="app.id" class="card">
          <view class="card-row">
            <view class="icon-box">
              <app-icon name="log-out" :size="20" color="#C41E3A" />
            </view>
            <view class="card-main">
              <view class="card-head">
                <text class="card-title">{{ app.circleName }}</text>
                <view class="status-tag" :class="'tone-' + app.tone">
                  <text class="status-text" :style="{ color: toneColor(app.tone) }">{{ app.stageLabel }}</text>
                </view>
              </view>
              <text class="card-time">申请于 {{ app.applyDate }}</text>
            </view>
          </view>
          <!-- 退款金额 -->
          <view class="refund-row">
            <app-icon name="coins" :size="14" color="#C41E3A" />
            <text class="refund-label">应退金额</text>
            <text class="refund-amount">¥{{ app.refundAmount }}</text>
            <text class="refund-used">（已用 {{ app.usedDays }} 天）</text>
          </view>
          <!-- 被驳回 -->
          <view v-if="app.stage === 'rejected'" class="reject-box">
            <text class="reject-by">{{ app.rejectBy === 'owner' ? '圈主驳回' : '平台驳回' }}</text>
            <view class="reject-actions">
              <text class="link-muted" @click="rejectDetail = app.rejectReason || '申请未通过'">查看驳回原因</text>
              <text class="link-red">重新申请</text>
            </view>
          </view>
          <!-- 双向审核进度条 -->
          <view v-else class="steps">
            <view v-for="(step, idx) in flowSteps" :key="step.key" class="step-item" :class="{ 'step-last': idx === flowSteps.length - 1 }">
              <view class="step-col">
                <view class="step-dot" :class="stepDotClass(app, idx)">
                  <app-icon v-if="idx <= app.completedIdx" name="check" :size="12" color="#FFFFFF" />
                  <text v-else class="step-num" :class="{ 'step-num-cur': idx === app.completedIdx + 1 }">{{ idx + 1 }}</text>
                </view>
                <text class="step-label" :class="{ 'step-label-on': idx <= app.completedIdx || idx === app.completedIdx + 1 }">{{ step.label }}</text>
              </view>
              <view v-if="idx < flowSteps.length - 1" class="step-line" :class="{ 'step-line-on': idx < app.completedIdx }" />
            </view>
          </view>
          <!-- 当前状态提示 -->
          <text v-if="app.stage === 'owner_reviewing'" class="stage-tip">圈主正在审核你的退出申请</text>
          <text v-else-if="app.stage === 'platform_reviewing'" class="stage-tip">圈主已同意，平台审核中</text>
          <text v-else-if="app.stage === 'refunding'" class="stage-tip">审核通过，退款处理中，预计 1-3 个工作日到账</text>
          <text v-else-if="app.stage === 'refunded'" class="stage-tip stage-tip-green">退款 ¥{{ app.refundAmount }} 已于 {{ app.refundedAt }} 到账</text>
        </view>
      </template>
    </view>

    <!-- 驳回原因弹窗 -->
    <view v-if="rejectDetail" class="modal-mask" @click="rejectDetail = null">
      <view class="modal" @click.stop>
        <view class="modal-body">
          <view class="modal-icon">
            <app-icon name="alert-circle" :size="24" color="#C41E3A" />
          </view>
          <text class="modal-title">申请未通过</text>
          <view class="modal-reason">
            <text class="modal-reason-text">{{ rejectDetail }}</text>
          </view>
        </view>
        <view class="modal-btn" @click="rejectDetail = null">
          <text class="modal-btn-text">知道了</text>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

type TabKey = 'feature' | 'join' | 'exit'
const tab = ref<TabKey>('feature')
const tabList = [
  { key: 'feature' as const, label: '功能开通' },
  { key: 'join' as const, label: '入圈申请' },
  { key: 'exit' as const, label: '退出申请' },
]

const rejectDetail = ref<string | null>(null)

function goBack() { uni.navigateBack() }
function goCircles() { uni.navigateTo({ url: '/pkg-circle/index/index' }) }

// 状态文案/图标/颜色
function statusLabel(s: string) {
  return { reviewing: '审核中', approved: '已通过', rejected: '已驳回' }[s] || '未申请'
}
function statusIcon(s: string) {
  return { reviewing: 'clock', approved: 'check', rejected: 'alert-circle' }[s] || ''
}
function statusColor(s: string) {
  return { reviewing: '#C9A96E', approved: '#3D7A5C', rejected: '#C41E3A' }[s] || '#8C8378'
}
function toneColor(t: string) {
  return { approved: '#3D7A5C', rejected: '#C41E3A', pending: '#C9A96E' }[t] || '#C9A96E'
}

// 功能开通申请
const featureApps = [
  { id: 'f1', feature: 'av_course', featureLabel: '音视频课程', circleName: '八字命理研习社', status: 'approved', submittedAt: '2024-05-01', reviewTime: '1-3 个工作日' },
  { id: 'f2', feature: 'live', featureLabel: '直播授课', circleName: '八字命理研习社', status: 'reviewing', submittedAt: '2024-06-10', reviewTime: '1-3 个工作日' },
  { id: 'f3', feature: 'ai_assistant', featureLabel: '圈主助理', circleName: '八字命理研习社', status: 'rejected', submittedAt: '2024-06-01', reviewTime: '1-3 个工作日', rejectReason: '当前圈子活跃成员数未达到开通标准（需 ≥ 200 活跃成员），请提升圈子活跃度后重新申请。' },
  { id: 'f4', feature: 'ecommerce_live', featureLabel: '电商直播', circleName: '儒布命理文化站', status: 'reviewing', submittedAt: '2024-06-12', reviewTime: '3-5 个工作日' },
]

// 入圈申请
const joinApps = [
  { id: 'j1', circleName: '紫微斗数高阶班', status: 'reviewing', submittedAt: '2024-06-13' },
  { id: 'j2', circleName: '风水堪舆交流会', status: 'approved', submittedAt: '2024-06-05' },
  { id: 'j3', circleName: '奇门遁甲研修社', status: 'rejected', submittedAt: '2024-05-28', rejectReason: '圈子当前仅向有基础的学员开放，欢迎完成入门课程后再申请。' },
]

// 退出申请双向审核流程节点
const flowSteps = [
  { key: 'submit', label: '提交申请' },
  { key: 'owner', label: '圈主审核' },
  { key: 'platform', label: '平台审核' },
  { key: 'refund', label: '退款到账' },
]

// 退出申请（预计算退款金额，与原型 calcRefund 一致）
const exitApps = [
  { id: 'me1', circleName: '紫微斗数高阶班', applyDate: '2024-06-13', stage: 'platform_reviewing', tone: 'pending', stageLabel: '平台审核中', completedIdx: 1, refundAmount: '254.72', usedDays: 54 },
  { id: 'me2', circleName: '风水堪舆交流会', applyDate: '2024-05-10', stage: 'refunded', tone: 'approved', stageLabel: '已退出', completedIdx: 3, refundAmount: '144.55', usedDays: 99, refundedAt: '2024-05-14' },
  { id: 'me3', circleName: '奇门遁甲研修社', applyDate: '2024-06-02', stage: 'rejected', tone: 'rejected', stageLabel: '申请被驳回', completedIdx: -1, refundAmount: '445.12', usedDays: 32, rejectBy: 'platform', rejectReason: '退款金额核算存在异议，平台已驳回，请核对加入时间后重新申请或联系客服。' },
]

function stepDotClass(app: any, idx: number) {
  if (idx <= app.completedIdx) return 'dot-done'
  if (idx === app.completedIdx + 1) return 'dot-cur'
  return 'dot-todo'
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }

.nav { position: sticky; top: 0; z-index: 40; background: rgba(250, 248, 245, 0.95); backdrop-filter: blur(12px); border-bottom: 1rpx solid #E8E0D5; }
.nav-bar { display: flex; align-items: center; height: 96rpx; padding: 0 32rpx; gap: 24rpx; }
.nav-back { padding: 8rpx; margin-left: -8rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2D2A26; }
.tabs { display: flex; padding: 0 32rpx; }
.tab { position: relative; padding: 20rpx 32rpx; }
.tab-text { font-size: 28rpx; font-weight: 500; color: #8C8378; }
.tab-active .tab-text { color: #2D2A26; }
.tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: #C41E3A; border-radius: 999rpx; }

.body { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }

.card { background: #FFFFFF; border-radius: 24rpx; border: 1rpx solid #EDE6DC; padding: 32rpx; }
.card-row { display: flex; align-items: flex-start; gap: 24rpx; }
.icon-box { width: 80rpx; height: 80rpx; border-radius: 24rpx; background: #F5F0E8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-main { flex: 1; min-width: 0; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.card-title { font-size: 28rpx; font-weight: 500; color: #2D2A26; }
.card-sub { font-size: 24rpx; color: #8C8378; margin-top: 4rpx; display: block; }
.card-time { font-size: 22rpx; color: rgba(140, 131, 120, 0.7); margin-top: 8rpx; display: block; }
.review-tip { font-size: 24rpx; color: #C9A96E; margin-top: 16rpx; display: block; }

.status-tag { display: flex; align-items: center; gap: 6rpx; padding: 2rpx 16rpx; border-radius: 999rpx; white-space: nowrap; flex-shrink: 0; }
.st-reviewing, .tone-pending { background: rgba(201, 169, 110, 0.1); }
.st-approved, .tone-approved { background: rgba(61, 122, 92, 0.1); }
.st-rejected, .tone-rejected { background: rgba(196, 30, 58, 0.1); }
.status-text { font-size: 22rpx; }

.reject-actions { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.link-muted { font-size: 24rpx; color: #8C8378; text-decoration: underline; }
.link-red { font-size: 24rpx; font-weight: 500; color: #C41E3A; }
.link-green { font-size: 24rpx; font-weight: 500; color: #3D7A5C; margin-top: 16rpx; display: block; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.empty-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-text { color: #8C8378; font-size: 28rpx; }

.refund-row { display: flex; align-items: center; gap: 10rpx; margin-top: 24rpx; font-size: 24rpx; color: #8C8378; }
.refund-label { font-size: 24rpx; color: #8C8378; }
.refund-amount { font-size: 28rpx; font-weight: 700; color: #C41E3A; margin-left: 8rpx; }
.refund-used { font-size: 22rpx; color: rgba(140, 131, 120, 0.7); }

.reject-box { margin-top: 24rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(196, 30, 58, 0.05); border: 1rpx solid rgba(196, 30, 58, 0.1); }
.reject-by { font-size: 24rpx; color: #C41E3A; }

.steps { margin-top: 32rpx; display: flex; align-items: center; }
.step-item { display: flex; align-items: center; flex: 1; }
.step-last { flex: none; }
.step-col { display: flex; flex-direction: column; align-items: center; }
.step-dot { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.dot-done { background: #3D7A5C; }
.dot-cur { background: #C9A96E; }
.dot-todo { background: #F5F0E8; }
.step-num { font-size: 20rpx; color: #8C8378; }
.step-num-cur { color: #FFFFFF; }
.step-label { font-size: 20rpx; margin-top: 8rpx; white-space: nowrap; color: #8C8378; }
.step-label-on { color: #2D2A26; }
.step-line { flex: 1; height: 4rpx; margin: 0 8rpx; margin-top: -32rpx; background: #F5F0E8; }
.step-line-on { background: #3D7A5C; }

.stage-tip { margin-top: 24rpx; font-size: 24rpx; color: #C9A96E; display: block; }
.stage-tip-green { color: #3D7A5C; }

.modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 0 64rpx; }
.modal { width: 100%; max-width: 560rpx; background: #FFFFFF; border-radius: 32rpx; overflow: hidden; }
.modal-body { padding: 40rpx; }
.modal-icon { width: 96rpx; height: 96rpx; border-radius: 24rpx; background: rgba(196, 30, 58, 0.1); margin: 0 auto 24rpx; display: flex; align-items: center; justify-content: center; }
.modal-title { font-size: 30rpx; font-weight: 500; color: #2D2A26; text-align: center; display: block; }
.modal-reason { margin-top: 24rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(245, 240, 232, 0.6); }
.modal-reason-text { font-size: 24rpx; color: #8C8378; line-height: 1.6; }
.modal-btn { padding: 28rpx 0; border-top: 1rpx solid #EDE6DC; }
.modal-btn-text { font-size: 28rpx; font-weight: 500; color: #2D2A26; text-align: center; display: block; }
</style>
