<template>
  <div class="ts-breakdown">
    <div
      v-if="!rows.length"
      class="ts-empty"
    >
      <span
        class="ts-empty-mark"
        aria-hidden="true"
      >∅</span><strong>{{ empty }}</strong><p>{{ hint }}</p>
    </div>
    <div
      v-else
      class="ts-breakdown-list"
      :aria-label="label"
      tabindex="0"
    >
      <button
        v-for="row in rows"
        :key="row.key"
        class="ts-breakdown-row"
        :aria-pressed="selected === row.key"
        :style="{ '--item-color': row.color }"
        @click="$emit('select', selected === row.key ? null : row.key)"
      >
        <span class="ts-row-name"><i />{{ row.label }}</span><b>{{ metric(row.value, money) }}</b><small>{{ percent(row.share) }}</small>
        <span
          class="ts-row-track"
          aria-hidden="true"
        ><i :style="{ width: `${row.share ?? 0}%` }" /></span>
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { metric, percent, type distribution } from '@/utils/topic-screen'
defineProps<{ rows: ReturnType<typeof distribution>['items']; selected: string | null; label: string; empty: string; hint: string; money?: boolean }>()
defineEmits<{ select: [key: string | null] }>()
</script>
