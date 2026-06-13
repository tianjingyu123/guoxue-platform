<template>
  <text v-if="char" :class="className" :style="{ fontSize: size + 'px', lineHeight: 1 }">{{ char }}</text>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  size?: number
  className?: string
}>()

// Use Unicode/emoji fallbacks for common lucide icons
const iconMap: Record<string, string> = {
  search: '🔍',
  calendar: '📅',
  'chevron-right': '›',
  'chevron-left': '‹',
  plus: '+',
  x: '✕',
  check: '✓',
  clock: '🕐',
  flame: '🔥',
  zap: '⚡',
  award: '🏆',
  crown: '👑',
  users: '👥',
  'message-square': '💬',
  bell: '🔔',
  'book-open': '📖',
  radio: '📻',
  star: '⭐',
  heart: '♥',
  share: '↗',
  edit: '✎',
  trash: '🗑',
  filter: '☰',
  'arrow-up': '↑',
  'arrow-down': '↓',
  'more-horizontal': '⋯',
  'more-vertical': '⋮',
  home: '⌂',
  settings: '⚙',
  user: '👤',
  map: '📍',
  'shopping-cart': '🛒',
  tag: '#',
  eye: '👁',
  'eye-off': '⊘',
  lock: '🔒',
  mail: '✉',
  phone: '📞',
  camera: '📷',
  video: '▶',
  play: '▶',
  pause: '⏸',
  music: '🎵',
  image: '🖼',
  file: '📄',
  folder: '📁',
  download: '⬇',
  upload: '⬆',
  link: '🔗',
  'external-link': '↗',
  refresh: '↻',
  rotate: '↻',
  'arrow-left': '←',
  'arrow-right': '→',
  menu: '☰',
  grid: '⊞',
  list: '☰',
  info: 'ℹ',
  alert: '⚠',
  help: '?',
  minus: '−',
  'chevron-up': '⌃',
  'chevron-down': '⌄',
  'alert-circle': '⚠',
  'check-circle': '✓',
  microphone: '🎤',
  send: '➤',
  copy: '📋',
  book: '📖',
  globe: '🌐',
  sun: '☀',
  moon: '☾',
}

const char = computed(() => iconMap[props.name] || '')
</script>
