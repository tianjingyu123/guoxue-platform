<template>
  <div class="page">
    <!-- 本页已并入"AI调用中心"（体验标准第九节：一个业务一个入口·2026-07-18）。
         原页面调用的 /ai/media/tasks 仅覆盖媒体三场景，对话数据本就不在其中；
         全场景真实调用日志统一在 AI 调用中心（/ai/usage-stats + /ai/call-logs）查看。
         菜单项已下架，路由暂留作引导；拍板确认后删路由。 -->
    <el-result
      icon="info"
      title="「对话日志」已并入 AI 调用中心"
      sub-title="全平台 AI 调用记录（含对话、排盘解析等全场景）已统一到 AI 调用中心集中查看，本页不再单独维护。"
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
