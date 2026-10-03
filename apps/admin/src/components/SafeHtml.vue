<template>
  <!-- HTML 在组件边界内统一经过 DOMPurify 白名单消毒。 -->
  <!-- eslint-disable vue/no-v-html -->
  <span
    v-if="tag === 'span'"
    v-bind="$attrs"
    v-html="cleanHtml"
  />
  <div
    v-else
    v-bind="$attrs"
    v-html="cleanHtml"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sanitize } from '@/utils/sanitize'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  html?: string | null
  tag?: 'div' | 'span'
}>(), {
  html: '',
  tag: 'div',
})

const cleanHtml = computed(() => sanitize(props.html ?? ''))
</script>
