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

    <!-- 诚实空态：暂无法按编号查询举报处理结果（后端查询端点未开放） -->
    <view v-if="!report" class="rd-empty">
      <app-icon name="inbox" :size="96" color="#D8D2C8" />
      <text class="rd-empty-txt">未找到该举报记录</text>
      <text class="rd-empty-sub">举报处理结果查询功能完善中，如有疑问可联系客服</text>
      <view class="rd-empty-btn" @tap="goHelp">
        <text class="rd-empty-btn-txt">联系客服</text>
      </view>
    </view>

    <view v-else class="rd-body">
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
// 举报处理结果详情（真实详情端点就绪后按此结构填充）
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

// 举报处理结果详情：后端 audit 模块尚未开放「按举报编号查处理结果」的查询端点，
// 故这里绝不硬编码假数据兜底。拿不到真实详情时统一走诚实空态（见模板 v-else）。
const report = ref<ReportResult | null>(null)
const isProcessed = computed(() => report.value?.result === 'processed')

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

/* 诚实空态 */
.rd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 140rpx 48rpx;
  gap: 16rpx;
}
.rd-empty-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #666;
  margin-top: 16rpx;
}
.rd-empty-sub {
  font-size: 24rpx;
  color: #aaa;
  text-align: center;
  line-height: 1.6;
}
.rd-empty-btn {
  margin-top: 24rpx;
  padding: 16rpx 56rpx;
  border: 2rpx solid var(--brand);
  border-radius: 999rpx;
}
.rd-empty-btn-txt {
  font-size: 26rpx;
  color: var(--brand);
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
