<template>
  <!-- 经营顾问建议卡：自包含拉取；加载失败或列表为空时整体不渲染，绝不打扰工作台主流程 -->
  <view v-if="visibleInsights.length" class="advisor-card">
    <view class="advisor-head">
      <text class="advisor-title">经营顾问</text>
      <view class="advisor-count"><text class="advisor-count-txt">{{ visibleInsights.length }}</text></view>
    </view>

    <view v-for="item in visibleInsights" :key="item.id" class="advisor-item" :class="item.severity.toLowerCase()">
      <view class="advisor-item-top">
        <view class="advisor-badge" :class="item.severity.toLowerCase()">
          <text class="advisor-badge-txt">{{ severityLabel[item.severity] }}</text>
        </view>
        <text class="advisor-content">{{ item.content }}</text>
      </view>
      <view class="advisor-actions">
        <view
          v-for="(action, ai) in item.actions"
          :key="ai"
          class="advisor-btn primary"
          :class="{ disabled: submittingId === item.id }"
          @tap="onAct(item, action)"
        >
          <text class="advisor-btn-txt primary">{{ action.label }}</text>
        </view>
        <view class="advisor-btn" :class="{ disabled: submittingId === item.id }" @tap="onDismiss(item)">
          <text class="advisor-btn-txt">忽略</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { advisorApi, type AdvisorRoleType, type AdvisorInsight, type AdvisorAction, type AdvisorSeverity } from '@/lib/advisor-data'

const props = defineProps<{
  /** 顾问建议面向的角色（站长 / 驿站运营者） */
  roleType: AdvisorRoleType
}>()

/** 严重级别 → 中文徽标文案 */
const severityLabel: Record<AdvisorSeverity, string> = {
  INFO: '提示',
  WARN: '预警',
  CRITICAL: '严重',
}

const insights = ref<AdvisorInsight[]>([])
/** 正在提交写操作的建议 id（防重复提交） */
const submittingId = ref('')

/** 最多展示 3 条 */
const visibleInsights = computed(() => insights.value.slice(0, 3))

onMounted(async () => {
  try {
    const list = await advisorApi.list(props.roleType)
    insights.value = list
    // 展示即回执：对未读建议静默标记已读，失败不影响展示
    list
      .slice(0, 3)
      .filter((it) => it.status === 'OPEN')
      .forEach((it) => advisorApi.read(it.id).catch(() => {}))
  } catch {
    // 拉取失败：组件整体不渲染，不打扰工作台主流程
    insights.value = []
  }
})

/** 点击动作按钮：标记采纳 + 跳转目标页 */
async function onAct(item: AdvisorInsight, action: AdvisorAction) {
  if (submittingId.value) return
  submittingId.value = item.id
  try {
    // 标记采纳失败不阻断跳转（跳转是用户核心意图）
    await advisorApi.act(item.id).catch(() => {})
    if (action.type === 'NAVIGATE' && action.target) navigateTo(action.target)
  } finally {
    submittingId.value = ''
  }
}

/** 忽略建议：调后端后从列表移除（清空后组件自动隐藏） */
async function onDismiss(item: AdvisorInsight) {
  if (submittingId.value) return
  submittingId.value = item.id
  try {
    await advisorApi.dismiss(item.id)
    insights.value = insights.value.filter((it) => it.id !== item.id)
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}
</script>

<style scoped lang="scss">
.advisor-card {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
}

.advisor-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.advisor-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.advisor-count {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.advisor-count-txt {
  font-size: 20rpx;
  font-weight: 600;
  color: #ffffff;
}

/* 单条建议：左侧强调色条按严重级别着色 */
.advisor-item {
  position: relative;
  margin-top: 20rpx;
  padding: 20rpx 20rpx 20rpx 32rpx;
  border-radius: 16rpx;
  background: #fafafa;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8rpx;
  }
  &.info::before { background: #2563eb; }
  &.warn::before { background: #ea580c; }
  &.critical::before { background: #dc2626; }
}

.advisor-item-top {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.advisor-badge {
  flex-shrink: 0;
  padding: 2rpx 14rpx;
  border-radius: 8rpx;
  margin-top: 2rpx;

  &.info { background: #dbeafe; }
  &.warn { background: #ffedd5; }
  &.critical { background: #fee2e2; }
}
.advisor-badge-txt {
  font-size: 20rpx;
  font-weight: 600;

  .advisor-badge.info & { color: #2563eb; }
  .advisor-badge.warn & { color: #ea580c; }
  .advisor-badge.critical & { color: #dc2626; }
}
.advisor-content {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  line-height: 1.5;
  color: #333333;
}

.advisor-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}
.advisor-btn {
  padding: 8rpx 28rpx;
  border-radius: 999rpx;
  border: 1rpx solid #e5e5e5;
  background: #ffffff;

  &.primary {
    border-color: #c41e3a;
    background: #c41e3a;
  }
  &.disabled { opacity: 0.5; }
}
.advisor-btn-txt {
  font-size: 24rpx;
  color: #666666;

  &.primary {
    font-weight: 600;
    color: #ffffff;
  }
}
</style>
