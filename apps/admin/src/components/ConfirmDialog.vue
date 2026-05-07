<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="420px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="confirm-content">
      <el-icon :size="48" :color="iconColor">
        <WarningFilled v-if="type === 'danger' || type === 'warning'" />
        <InfoFilled v-else />
      </el-icon>
      <p>{{ content }}</p>
    </div>
    <template #footer>
      <el-button @click="$emit('cancel')">{{ cancelText }}</el-button>
      <el-button :type="type === 'info' ? 'primary' : type" @click="$emit('confirm')">
        {{ confirmText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(defineProps<{
  visible: boolean
  title: string
  content: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}>(), {
  confirmText: '确定',
  cancelText: '取消',
  type: 'warning',
})

defineEmits<{
  confirm: []
  cancel: []
  'update:visible': [value: boolean]
}>()

const iconColor = computed(() => props.type === 'danger' ? '#f56c6c' : props.type === 'warning' ? '#e6a23c' : '#409eff')
</script>

<style scoped>
.confirm-content { text-align: center; padding: 16px 0; }
.confirm-content p { margin-top: 16px; font-size: 15px; color: #606266; }
</style>
