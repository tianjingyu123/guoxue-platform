<script setup lang="ts">
/**
 * 八字排盘记录 · 分组管理（自 V0 app/<工具>/history/groups/page.tsx 还原）
 * 🔴 原页写死 4 个分组、条数是编的、改名退出即失效；现在分组名落本地存储、条数按真实记录统计。
 */
import HistoryGroups from '@/components/paipan/history-groups.vue'
import { baziGroups, baziStore } from '../bazi-history'
</script>

<template>
  <HistoryGroups title="分组管理" back-href="/paipan/bazi/history" :group-store="baziGroups" :record-store="baziStore" />
</template>
