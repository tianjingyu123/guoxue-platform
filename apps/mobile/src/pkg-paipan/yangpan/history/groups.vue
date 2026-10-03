<script setup lang="ts">
/**
 * 阳盘排盘记录 · 分组管理（自 V0 app/<工具>/history/groups/page.tsx 还原）
 * 🔴 原页写死 4 个分组、条数是编的、改名退出即失效；现在分组名落本地存储、条数按真实记录统计。
 */
import HistoryGroups from '@/components/paipan/history-groups.vue'
import { yangpanGroups, yangpanStore } from '../yangpan-history'
</script>

<template>
  <HistoryGroups title="分组管理" back-href="/paipan/yangpan/history" :group-store="yangpanGroups" :record-store="yangpanStore" />
</template>
