<script setup lang="ts">
/**
 * 八字排盘记录 · 分组管理（自 V0 app/<工具>/history/groups/page.tsx 还原）
 * 🔴 原页写死 4 个分组、条数是编的、改名退出即失效；现在分组名落本地存储、条数按真实记录统计。
 */
import HistoryGroups from '@/components/paipan/history-groups.vue'
import { baziGroups, baziStore } from '../bazi-history'
import { ref } from 'vue'
import { useNativePreviewPage } from '@/composables/useNativePreviewPage'
import { changePrivateHistoryGroup, type PrivateGroupChange } from '@/lib/paipan/private-history'
import { navigateTo } from '@/utils/router'

const groups = ref<string[]>([])
const records = ref<ReturnType<typeof baziStore.load>>([])
function reload() { groups.value = baziGroups.load(); records.value = baziStore.load() }
const preview = useNativePreviewPage(reload, () => { groups.value = []; records.value = [] })
const { allowed, checking } = preview
function change(command: PrivateGroupChange) {
  const target = { ...command }
  return preview.run(() => { changePrivateHistoryGroup(baziGroups, baziStore, target); reload() })
}
</script>

<template>
  <view v-if="!allowed" role="status">
    <text>{{ checking ? '正在核验访问权限' : '页面不存在或当前无法访问' }}</text>
    <button :disabled="checking" @tap="preview.run()">重新核验</button>
    <button @tap="navigateTo('/pages/index/index')">返回首页</button>
  </view>
  <HistoryGroups v-else title="分组管理" back-href="/paipan/bazi/history" :groups="groups" :records="records"
    @add="name => change({ type: 'add', name })"
    @rename="event => change({ type: 'rename', ...event })"
    @remove="old => change({ type: 'remove', old })" />
</template>
