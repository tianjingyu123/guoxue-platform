<template>
  <view class="rd-page">
    <!-- 顶部导航 -->
    <view class="rd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rd-header-row">
        <view class="rd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2c2c2c" />
        </view>
        <text class="rd-header-title">举报处理结果</text>
        <view class="rd-header-spacer" />
      </view>
    </view>

    <view class="rd-body">
      <!-- 处理结果状态卡片 -->
      <view class="rd-result-card" :class="isProcessed ? 'rd-result-success' : 'rd-result-neutral'">
        <view class="rd-result-icon" :class="isProcessed ? 'rd-result-icon-success' : 'rd-result-icon-neutral'">
          <app-icon :name="isProcessed ? 'check' : 'info'" :size="64" :color="isProcessed ? '#22C55E' : '#999999'" />
        </view>
        <text class="rd-result-title" :class="isProcessed ? 'rd-result-title-success' : 'rd-result-title-neutral'">{{ report.resultTitle }}</text>
        <text class="rd-result-time">处理时间：{{ report.processTime }}</text>
      </view>

      <!-- 被举报对象摘要 -->
      <view class="rd-card">
        <view class="rd-card-title-row">
          <app-icon name="alert-triangle" :size="32" color="#f59e0b" />
          <text class="rd-card-title">被举报对象</text>
        </view>
        <view class="rd-target">
          <!-- 用户 -->
          <template v-if="report.targetType === 'user'">
            <view class="rd-avatar">
              <text class="rd-avatar-letter">{{ report.target.nickname[0] }}</text>
            </view>
            <view class="rd-target-main">
              <text class="rd-badge rd-badge-blue">用户</text>
              <text class="rd-target-name">{{ report.target.nickname }}</text>
            </view>
          </template>
          <!-- 帖子/评论 -->
          <template v-else>
            <view class="rd-target-thumb">
              <app-icon :name="report.targetType === 'post' ? 'file-text' : 'user'" :size="36" color="#999999" />
            </view>
            <view class="rd-target-main">
              <text class="rd-badge rd-badge-primary">{{ report.targetType === 'post' ? '帖子' : '评论' }}</text>
              <text v-if="report.target.title" class="rd-target-title">{{ report.target.title }}</text>
              <text class="rd-target-content">{{ report.target.content }}</text>
              <text class="rd-target-author">发布者：{{ report.target.nickname }}</text>
            </view>
          </template>
        </view>
      </view>

      <!-- 举报信息 -->
      <view class="rd-card">
        <text class="rd-card-title rd-mb">举报信息</text>
        <view class="rd-info-row rd-info-border">
          <text class="rd-info-key">举报编号</text>
          <text class="rd-info-val rd-mono">{{ report.id }}</text>
        </view>
        <view class="rd-info-row rd-info-border">
          <text class="rd-info-key">举报类型</text>
          <text class="rd-info-tag">{{ report.reportType }}</text>
        </view>
        <view class="rd-info-row">
          <text class="rd-info-key">举报时间</text>
          <text class="rd-info-val">{{ report.reportTime }}</text>
        </view>
      </view>

      <!-- 处理说明 -->
      <view class="rd-card">
        <view class="rd-card-title-row">
          <app-icon name="shield" :size="32" color="#C41E3A" />
          <text class="rd-card-title">处理说明</text>
        </view>
        <text class="rd-desc">{{ report.resultDescription }}</text>
        <view v-if="report.punishment" class="rd-punish">
          <text class="rd-punish-label">处罚措施</text>
          <text class="rd-punish-text">{{ report.punishment }}</text>
        </view>
      </view>

      <!-- 内容规范入口 -->
      <view class="rd-card rd-rules" @tap="goRules">
        <view class="rd-rules-left">
          <view class="rd-rules-icon">
            <app-icon name="help-circle" :size="40" color="#C41E3A" />
          </view>
          <view>
            <text class="rd-rules-title">查看平台内容规范</text>
            <text class="rd-rules-sub">了解什么是违规内容</text>
          </view>
        </view>
        <app-icon name="chevron-right" :size="36" color="#cccccc" />
      </view>

      <!-- 反馈提示 -->
      <view class="rd-feedback">
        <text class="rd-feedback-text">如对处理结果有异议，可<text class="rd-link" @tap="goHelp">联系客服</text>进一步反馈</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="rd-footer">
      <view class="rd-home-btn" @tap="goHome">
        <app-icon name="home" :size="32" color="#ffffff" />
        <text class="rd-home-text">返回首页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}

// 被举报对象（用户无 title/content，帖子/评论有）
interface ReportResultTarget {
  title?: string
  content?: string
  nickname: string
}
// 举报处理结果详情（对应下方内联 mock 的元素结构）
interface ReportResult {
  id: string
  targetType: string
  target: ReportResultTarget
  reportType: string
  reportTime: string
  result: string
  resultTitle: string
  resultDescription: string
  processTime: string
  punishment?: string // 处罚措施（仅成立时有）
}

const reportResults: Record<string, ReportResult> = {
  '1': {
    id: 'R202401150001',
    targetType: 'post',
    target: {
      title: '这个八字太神奇了，大家来看看',
      content: '昨天遇到一个案例，真的是让我大开眼界...',
      nickname: '算命先生',
    },
    reportType: '虚假宣传/欺诈',
    reportTime: '2024-01-15 10:30',
    result: 'processed',
    resultTitle: '举报成立，已处理',
    resultDescription: '经核实，该内容存在虚假宣传行为，已对相关内容进行下架处理，并对发布者进行警告处分。感谢你的举报，你的反馈有助于维护平台健康环境。',
    processTime: '2024-01-16 14:22',
    punishment: '内容下架 + 账号警告',
  },
  '2': {
    id: 'R202401160002',
    targetType: 'user',
    target: { nickname: '神棍大师' },
    reportType: '人身攻击/骚扰',
    reportTime: '2024-01-16 15:45',
    result: 'rejected',
    resultTitle: '举报不成立',
    resultDescription: '经平台审核，被举报用户的行为未违反平台社区规范。如有其他问题，建议你直接使用拉黑功能屏蔽该用户。如有异议，可联系客服进一步反馈。',
    processTime: '2024-01-17 09:15',
  },
  '3': {
    id: 'R202401170003',
    targetType: 'comment',
    target: {
      content: '你这个分析完全是胡说八道，一点都不专业...',
      nickname: '路人甲',
    },
    reportType: '人身攻击/骚扰',
    reportTime: '2024-01-17 08:20',
    result: 'processed',
    resultTitle: '举报成立，已处理',
    resultDescription: '经核实，该评论内容含有攻击性言论，已删除相关评论并对发布者进行禁言3天处理。感谢你对社区环境的维护。',
    processTime: '2024-01-17 16:40',
    punishment: '评论删除 + 禁言3天',
  },
}

const reportId = ref('1')
try {
  const pages = getCurrentPages()
  // uni-app Page 类型未声明 options/$page，保留 any 以兼容多端取参
  const cur: any = pages[pages.length - 1]
  const opt = cur?.options || cur?.$page?.options || {}
  if (opt.id) reportId.value = String(opt.id)
} catch (e) {}

const report = computed(() => reportResults[reportId.value] || reportResults['1'])
const isProcessed = computed(() => report.value.result === 'processed')

function goRules() {
  navigateTo('/content/community-rules')
}
function goHelp() {
  navigateTo('/help')
}
function goHome() {
  navigateTo('/')
}
function goBack() {
  navigateBack()
}
</script>

<style scoped>
.rd-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 160rpx;
}

/* Header */
.rd-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 2rpx solid #ececec;
}
.rd-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
}
.rd-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rd-header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.rd-header-spacer {
  width: 64rpx;
}

.rd-body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 结果卡片 */
.rd-result-card {
  border-radius: 20rpx;
  padding: 48rpx;
  text-align: center;
  border: 2rpx solid;
}
.rd-result-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.02));
  border-color: rgba(34, 197, 94, 0.2);
}
.rd-result-neutral {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.04), transparent);
  border-color: #ececec;
}
.rd-result-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  margin: 0 auto 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rd-result-icon-success {
  background: rgba(34, 197, 94, 0.2);
}
.rd-result-icon-neutral {
  background: #eee;
}
.rd-result-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
}
.rd-result-title-success {
  color: #16a34a;
}
.rd-result-title-neutral {
  color: #999;
}
.rd-result-time {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 8rpx;
}

/* 卡片 */
.rd-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
}
.rd-card-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.rd-card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rd-mb {
  display: block;
  margin-bottom: 20rpx;
}

/* 被举报对象 */
.rd-target {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 24rpx;
  background: rgba(245, 240, 232, 0.5);
  border-radius: 16rpx;
}
.rd-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rd-avatar-letter {
  font-size: 36rpx;
  color: var(--brand);
}
.rd-target-thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rd-target-main {
  flex: 1;
  min-width: 0;
}
.rd-badge {
  display: inline-block;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  border: 2rpx solid;
  margin-bottom: 8rpx;
}
.rd-badge-blue {
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}
.rd-badge-primary {
  border-color: rgba(196, 30, 58, 0.3);
  color: var(--brand);
}
.rd-target-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rd-target-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rd-target-content {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 24rpx;
  color: #888;
  margin-top: 4rpx;
  line-height: 1.4;
}
.rd-target-author {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 8rpx;
}

/* 举报信息 */
.rd-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.rd-info-border {
  border-bottom: 2rpx solid rgba(236, 236, 236, 0.5);
}
.rd-info-key {
  font-size: 26rpx;
  color: #888;
}
.rd-info-val {
  font-size: 26rpx;
  color: #2c2c2c;
}
.rd-mono {
  font-family: monospace;
}
.rd-info-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

/* 处理说明 */
.rd-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}
.rd-punish {
  margin-top: 24rpx;
  padding: 24rpx;
  background: rgba(34, 197, 94, 0.1);
  border: 2rpx solid rgba(34, 197, 94, 0.2);
  border-radius: 16rpx;
}
.rd-punish-label {
  display: block;
  font-size: 22rpx;
  color: #888;
  margin-bottom: 4rpx;
}
.rd-punish-text {
  display: block;
  font-size: 28rpx;
  color: #16a34a;
  font-weight: 500;
}

/* 规范入口 */
.rd-rules {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rd-rules-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.rd-rules-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rd-rules-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rd-rules-sub {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-top: 4rpx;
}

/* 反馈 */
.rd-feedback {
  text-align: center;
  padding: 24rpx 0;
}
.rd-feedback-text {
  font-size: 22rpx;
  color: #aaa;
}
.rd-link {
  color: var(--brand);
}

/* 底部 */
.rd-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border-top: 2rpx solid #ececec;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.rd-home-btn {
  height: 88rpx;
  background: var(--brand);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.rd-home-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
</style>
