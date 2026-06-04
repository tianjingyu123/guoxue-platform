<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    confirmText?: string;
    level?: "danger" | "warning";
    requireInput?: boolean;
    inputPlaceholder?: string;
  }>(),
  {
    title: "操作确认",
    message: "此操作不可逆，确认继续？",
    confirmText: "",
    level: "danger",
    requireInput: false,
    inputPlaceholder: "请输入确认文字",
  },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const visible = ref(false);
const inputValue = ref("");

function open() {
  inputValue.value = "";
  visible.value = true;
}

function handleConfirm() {
  if (props.requireInput && inputValue.value !== props.confirmText) return;
  visible.value = false;
  emit("confirm");
}

function handleCancel() {
  visible.value = false;
  emit("cancel");
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="props.title"
    width="420px"
    append-to-body
  >
    <div style="margin-bottom: 16px">
      <el-alert
        :type="props.level === 'danger' ? 'error' : 'warning'"
        :closable="false"
        show-icon
      >
        <template #title>
          {{ props.message }}
        </template>
      </el-alert>
    </div>
    <div v-if="props.requireInput">
      <p style="margin-bottom: 8px; color: #666; font-size: 13px">
        请输入「<strong>{{ props.confirmText }}</strong>」以确认操作
      </p>
      <el-input
        v-model="inputValue"
        :placeholder="props.inputPlaceholder"
        @keyup.enter="handleConfirm"
      />
    </div>
    <template #footer>
      <el-button @click="handleCancel">
        取消
      </el-button>
      <el-button
        :type="props.level === 'danger' ? 'danger' : 'warning'"
        :disabled="props.requireInput && inputValue !== props.confirmText"
        @click="handleConfirm"
      >
        确认执行
      </el-button>
    </template>
  </el-dialog>
</template>
