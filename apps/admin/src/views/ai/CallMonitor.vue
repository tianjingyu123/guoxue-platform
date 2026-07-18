<template>
  <div class="page">
    <!-- 本页已并入"AI调用中心"（体验标准第九节：一个业务一个入口·2026-07-18）。
         原页面调用的 /ai/media/tasks 仅覆盖媒体三场景（配图/摘要/标签），
         真实的全场景调用监控数据在 /ai/usage-stats 与 /ai/call-logs，已由 AI 调用中心统一承接。
         菜单项已下架，路由暂留作引导；拍板确认后删路由。 -->
    <el-result
      icon="info"
      title="「调用监控」已并入 AI 调用中心"
      sub-title="调用统计、Token 用量趋势与全场景调用日志已统一到 AI 调用中心集中查看，本页不再单独维护。"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="goCenter"
        >
          前往 AI 调用中心
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
function goCenter() {
  router.replace("/ai/usage");
}
</script>

<style scoped>
.page { padding: 40px 0; }
</style>
