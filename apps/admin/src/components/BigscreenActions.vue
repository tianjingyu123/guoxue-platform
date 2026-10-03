<template>
  <button
    ref="trigger"
    type="button"
    class="screen-presentation-button"
    :aria-pressed="presenting"
    :title="presenting ? '退出演示，也可按 Esc' : '隐藏后台导航，专注展示数据'"
    @click="toggle"
  >
    <el-icon aria-hidden="true">
      <FullScreen v-if="!presenting" /><Close v-else />
    </el-icon>
    {{ presenting ? '退出演示' : '进入演示' }}
    <kbd v-if="presenting">Esc</kbd>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { FullScreen, Close } from '@element-plus/icons-vue'

const emit = defineEmits<{ resize: [] }>()
const trigger = ref<HTMLButtonElement>()
const presenting = ref(false)
let observer: ResizeObserver | undefined
let workspace: HTMLElement | null = null
let previousScroll = 0

async function toggle() {
  if (!presenting.value) previousScroll = workspace?.scrollTop ?? 0
  presenting.value = !presenting.value
  document.body.classList.toggle('is-screen-presenting', presenting.value)
  await nextTick()
  if (workspace) workspace.scrollTop = presenting.value ? 0 : previousScroll
  emit('resize')
  trigger.value?.focus({ preventScroll: true })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && presenting.value) {
    event.preventDefault()
    void toggle()
  }
}

onMounted(() => {
  workspace = trigger.value?.closest('main') ?? null
  const screen = trigger.value?.closest('.tech-screen')
  if (screen) {
    observer = new ResizeObserver(() => emit('resize'))
    observer.observe(screen)
  }
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  // 切换大屏或离开页面时恢复导航，不让演示状态影响其他工作区。
  document.body.classList.remove('is-screen-presenting')
})
</script>
