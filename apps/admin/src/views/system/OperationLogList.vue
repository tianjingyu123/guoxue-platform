<script setup lang="ts">
// 操作日志与「审计日志」为同一后端数据源（auditApi.list），属重复入口。
// 依《后台管理端体验标准 V1.0》第九节「一个业务一个入口」，本页收敛为引导卡，统一跳转审计日志。
// 菜单项 system/operation-logs 的摘除需在 menu-structure 中处理（本代理禁改，已上报主进程）。
import { useRouter } from 'vue-router'

const router = useRouter()
function goAudit() { router.push({ name: 'AuditLog' }) }
</script>

<template>
  <div class="page">
    <el-result
      icon="info"
      title="操作日志已并入「审计日志」"
      sub-title="为避免重复入口，操作日志与审计日志已统一。请前往「审计日志」查看全部管理端操作留痕，并支持按操作类型、时间范围筛选与 CSV 导出。"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="goAudit"
        >
          前往审计日志
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
</style>
