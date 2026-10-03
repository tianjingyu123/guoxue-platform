<script setup lang="ts">
/**
 * 「生成报告」按钮（对应 V0 generate-report-button.tsx）
 *
 * 排盘结果页 → 从业者工作台报告工坊 的入口。
 * 把**引擎已算好的真盘面**原样塞进种子，跳工作台后自动建一份带盘面的报告草稿。
 *
 * 放主包：各排盘结果页散在 pkg-paipan / pkg-paipan2 两个分包里，
 * 而工作台在 pkg-workspace —— 分包之间引不到，只有主包三方都够得着。
 */
import AppIcon from '@/components/common/app-icon.vue'
import { stashReportSeed, goWorkspaceReport } from '@/lib/paipan/report-seed'
import { TOOL_REPORT_TYPE, type SeedReportType } from '@/lib/paipan/report-chapters'

const props = defineProps<{
  /** 工具 key，如 bazi / ziwei（决定默认报告类型） */
  toolKey: string
  /** 工具名，如「八字排盘」（报告里注明盘面来源） */
  toolLabel: string
  clientName?: string
  clientBirth?: string
  /** 引擎算出的结构化结果（原样存档，工坊与 AI 都只读不改） */
  data: Record<string, unknown>
  /** 一句话摘要（报告列表与封面用） */
  summary?: string
}>()

function go() {
  const reportType: SeedReportType = TOOL_REPORT_TYPE[props.toolKey] ?? 'bazi'
  stashReportSeed({
    toolKey: props.toolKey,
    toolLabel: props.toolLabel,
    reportType,
    clientName: props.clientName || '',
    clientBirth: props.clientBirth || '',
    data: props.data,
    summary: props.summary,
  })
  goWorkspaceReport()
}
</script>

<template>
  <view class="grb" @tap="go">
    <AppIcon name="scroll-text" :size="18" color="#C41E3A" />
    <view class="grb-text">
      <text class="grb-title">生成报告</text>
      <text class="grb-sub">把这个盘带进工作台，AI 起草 + 你定稿 → 交付客户</text>
    </view>
    <AppIcon name="chevron-right" :size="16" color="#C41E3A" />
  </view>
</template>

<style lang="scss" scoped>
.grb {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 24rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.35);
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.04);
}

.grb-text {
  flex: 1;
  min-width: 0;
}

.grb-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #C41E3A;
}

.grb-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  line-height: 1.4;
  color: #9A8C7E;
}
</style>
