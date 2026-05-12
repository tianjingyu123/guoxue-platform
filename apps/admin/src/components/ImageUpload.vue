<template>
  <div class="image-upload">
    <el-upload
      class="uploader"
      action="/api/v1/upload/image"
      :headers="uploadHeaders"
      :show-file-list="false"
      :on-success="handleSuccess"
      :before-upload="beforeUpload"
      accept="image/*"
    >
      <img
        v-if="modelValue"
        :src="modelValue"
        class="preview"
      >
      <el-icon
        v-else
        class="upload-icon"
      >
        <Plus />
      </el-icon>
    </el-upload>
    <el-button
      v-if="modelValue"
      text
      type="danger"
      size="small"
      @click="handleRemove"
    >
      移除图片
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { ElMessage } from "element-plus"

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
}))

function handleSuccess(res: any) {
  if (res?.url) {
    emit("update:modelValue", res.url)
  }
}

function beforeUpload(file: File) {
  const isImage = file.type.startsWith("image/")
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) { ElMessage.error("只能上传图片文件"); return false }
  if (!isLt2M) { ElMessage.error("图片大小不能超过2MB"); return false }
  return true
}

function handleRemove() {
  emit("update:modelValue", "")
}
</script>

<style scoped>
.image-upload { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.uploader { border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; width: 128px; height: 128px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.uploader:hover { border-color: #409eff; }
.preview { width: 100%; height: 100%; object-fit: cover; }
.upload-icon { font-size: 28px; color: #8c939d; }
</style>
