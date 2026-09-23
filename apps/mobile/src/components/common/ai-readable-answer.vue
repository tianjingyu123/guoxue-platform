<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { presentAiAnswer } from '@/lib/ai-readable-answer'

const props = defineProps<{ content: string }>()
const expanded = ref(false)
const answer = computed(() => presentAiAnswer(props.content))

watch(() => props.content, () => { expanded.value = false })

function toggle() { expanded.value = !expanded.value }
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  toggle()
}
</script>

<template>
  <view class="readable-answer">
    <text class="readable-answer__lead">{{ answer.lead }}</text>
    <view
      v-if="answer.detail"
      class="readable-answer__toggle"
      role="button"
      tabindex="0"
      :aria-expanded="expanded"
      @tap="toggle"
      @keydown="onKeydown"
    >
      <text>{{ expanded ? '收起详细解答' : '展开详细解答' }}</text>
      <text aria-hidden="true">{{ expanded ? '⌃' : '⌄' }}</text>
    </view>
    <text v-if="answer.detail && expanded" class="readable-answer__detail">{{ answer.detail }}</text>
  </view>
</template>

<style scoped>
.readable-answer { min-width: 0; }
.readable-answer__lead { display: block; color: #252a34; font-size: 32rpx; font-weight: 600; line-height: 1.72; white-space: pre-wrap; }
.readable-answer__toggle { display: flex; align-items: center; justify-content: space-between; min-height: 72rpx; margin-top: 12rpx; color: #a42b3c; font-size: 26rpx; font-weight: 600; }
.readable-answer__detail { display: block; padding-top: 20rpx; border-top: 1rpx solid #ebe6df; color: #3f4652; font-size: 30rpx; line-height: 1.8; white-space: pre-wrap; }
</style>
