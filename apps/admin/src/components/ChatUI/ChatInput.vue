<template>
  <div class="chat-input-container">
    <div class="chat-input-wrapper">
      <el-input
        v-model="text"
        :placeholder="placeholder"
        :disabled="disabled"
        type="textarea"
        :rows="1"
        :autosize="{ minRows: 1, maxRows: 5 }"
        resize="none"
        class="chat-input"
        @keyup.enter.exact="send"
        @keyup.shift.enter="text += '\n'"
      />
      <el-button
        type="primary"
        :disabled="disabled || !text.trim()"
        :loading="loading"
        class="send-btn"
        @click="send"
      >
        <el-icon v-if="!loading">
          <Position />
        </el-icon>
      </el-button>
    </div>
    <div
      v-if="hint && !disabled"
      class="chat-hint"
    >
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Position } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  hint?: string
  clearOnSend?: boolean
}>(), {
  placeholder: '输入消息...',
  hint: 'Enter 发送，Shift+Enter 换行',
  clearOnSend: true,
})

const emit = defineEmits<{
  send: [text: string]
}>()

const text = ref('')

function send() {
  const val = text.value.trim()
  if (!val || props.disabled || props.loading) return
  emit('send', val)
  if (props.clearOnSend) text.value = ''
}

defineExpose({ clear: () => { text.value = '' }, focus: () => {} })
</script>

<style scoped>
.chat-input-container { padding:12px 0 0; border-top:1px solid #ebeef5 }
.chat-input-wrapper { display:flex; gap:8px; align-items:flex-end }
.chat-input { flex:1 }
.chat-input :deep(.el-textarea__inner) { border-radius:8px; resize:none; line-height:1.5 }
.send-btn { border-radius:8px; width:40px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0 }
.chat-hint { font-size:11px; color:#c0c4cc; margin-top:6px }
</style>
