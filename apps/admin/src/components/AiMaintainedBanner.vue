<template>
  <el-alert
    type="warning"
    :closable="false"
    show-icon
    class="ai-maintained-banner"
  >
    <template #title>
      {{ title || "🤖 本库由 AI 数字员工采集维护" }}
    </template>
    {{ description || "人工请勿直接编辑正文——发现数据问题请走工单或 AI 兜底通道订正（人工改动反而增加错误风险）。本页保留查看与运营操作。" }}
  </el-alert>
</template>

<script setup lang="ts">
// 机器人 vs 人工分离标识（目录重构批 2026-07-11）：
// 明确由 AI 数字员工维护的类目页统一挂此说明条，员工一眼分清"该谁干"
defineProps<{ title?: string; description?: string }>();
</script>

<style scoped>
.ai-maintained-banner {
  margin-bottom: 12px;
}
</style>
