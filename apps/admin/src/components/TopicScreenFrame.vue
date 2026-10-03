<template>
  <div
    class="tech-screen topic-screen"
    :class="`topic-${topic}`"
  >
    <header class="ts-header">
      <div class="ts-heading">
        <svg
          class="ts-mark"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        ><path
          d="M6 27V13l14-8 14 8v14l-14 8Z"
          stroke="currentColor"
        /><path
          d="m6 13 14 8 14-8M20 21v14M13 17v-4l7-4 7 4v4"
          stroke="currentColor"
        /></svg>
        <div><h1>{{ title }}</h1><p>{{ subtitle }}</p></div>
      </div>
      <div class="ts-tools">
        <span
          class="ts-sync"
          :class="{ 'is-delayed': snapshot.failed }"
          role="status"
        ><i />{{ snapshot.refreshing ? '正在同步' : snapshot.failed ? (snapshot.data ? '数据延迟' : '暂不可用') : '已同步' }}</span>
        <button
          class="ts-button"
          :disabled="snapshot.refreshing"
          @click="$emit('refresh')"
        >
          {{ snapshot.refreshing ? '刷新中…' : '刷新数据' }}
        </button>
        <BigscreenActions />
      </div>
    </header>
    <div class="ts-provenance">
      <span>{{ BRAND.name }}数据中枢</span><span>数据更新：{{ formatScreenTime(updatedAt) }}</span><span>每 {{ interval }} 秒同步，页面隐藏时暂停</span>
    </div>
    <div
      v-if="snapshot.failed && snapshot.data"
      class="ts-notice"
      role="status"
    >
      连接暂时中断，保留上次快照；恢复后自动更新，也可点击“刷新数据”。
    </div>
    <div
      v-if="!snapshot.data"
      class="ts-state"
      role="status"
    >
      <svg
        viewBox="0 0 160 80"
        fill="none"
        aria-hidden="true"
      ><path
        d="M0 40h45l12-24 24 48 20-36 12 12h47"
        stroke="currentColor"
        stroke-width="2"
      /><path
        d="M0 70h160M0 10h160"
        stroke="currentColor"
        opacity=".15"
      /></svg>
      <h2>{{ snapshot.refreshing ? '正在读取数据' : snapshot.forbidden ? '当前访问已失效' : '暂时无法读取数据' }}</h2>
      <p>{{ snapshot.refreshing ? '同步完成后显示实际数据，不用示例数据替代。' : snapshot.forbidden ? '请检查大屏令牌或重新登录。原有快照已清除。' : '请检查连接后点击刷新数据。后台将继续自动重试。' }}</p>
    </div>
    <div
      v-else
      class="ts-body"
    >
      <slot />
    </div>
    <footer class="ts-footer">
      <details><summary>查看统计口径</summary><slot name="scope" /></details><span>{{ footer }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import BigscreenActions from '@/components/BigscreenActions.vue'
import { BRAND } from '@/lib/brand'
import { formatScreenTime } from '@/utils/platform-screen'
import type { SnapshotState } from '@/utils/topic-screen'
import '@/styles/topic-screen.css'
withDefaults(defineProps<{ title: string; subtitle: string; topic: string; snapshot: SnapshotState<unknown>; updatedAt?: string; interval?: number; footer: string }>(), { interval: 30 })
defineEmits<{ refresh: [] }>()
</script>
