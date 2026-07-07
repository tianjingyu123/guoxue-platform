<template>
  <div class="image-upload">
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="onFileChange"
    >
    <!-- 原生隐藏 input + ref 手动触发，规避 el-upload 首次点击不触发文件选择的时序问题（23 处复用此组件） -->
    <div
      class="uploader"
      :class="{ 'is-loading': uploading }"
      @click="pick"
    >
      <img
        v-if="modelValue"
        :src="modelValue"
        class="preview"
      >
      <div
        v-else
        class="ph"
      >
        <el-icon class="upload-icon"><Plus /></el-icon>
        <span class="ph-text">{{ uploading ? '上传中…' : '点击上传' }}</span>
      </div>
    </div>
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
import { ref } from "vue"
import { ElMessage } from "element-plus"
import { Plus } from "@element-plus/icons-vue"
import { uploadApi } from "@/api"

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uploading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

function pick() {
  if (!uploading.value) inputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = "" // 立即清空，保证连续选同一文件也能再次触发 change
  if (!file) return
  if (!file.type.startsWith("image/")) { ElMessage.error("只能上传图片文件"); return }
  if (file.size / 1024 / 1024 >= 2) { ElMessage.error("图片大小不能超过2MB"); return }
  uploading.value = true
  try {
    const { data } = await uploadApi.image(file)
    if ((data as any)?.url) {
      emit("update:modelValue", (data as any).url)
      ElMessage.success("上传成功")
    }
  } catch {
    ElMessage.error("上传失败，请重试")
  } finally {
    uploading.value = false
  }
}

function handleRemove() {
  emit("update:modelValue", "")
}
</script>

<style scoped>
.image-upload { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.hidden-input { display: none; }
.uploader { border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; width: 128px; height: 128px; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: border-color .2s; }
.uploader:hover { border-color: #409eff; }
.uploader.is-loading { cursor: not-allowed; opacity: .6; }
.preview { width: 100%; height: 100%; object-fit: cover; }
.ph { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #8c939d; }
.upload-icon { font-size: 28px; }
.ph-text { font-size: 12px; }
</style>
