<script setup lang="ts">
/** 通用图片上传组件：选本地图片 → 传 COS → 缩略图预览 → v-model 回填 URL。
 *  用法：<CosImageUpload v-model="form.cover" /> 替代原来的"图片URL"输入框。
 *
 *  实现说明：改用原生隐藏 <input type="file"> + ref 手动触发，
 *  彻底规避 el-upload 在 dialog 内首次点击不触发文件选择的时序问题。 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { uploadApi } from '@/api'

defineProps<{ modelValue?: string; tip?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

function pick() {
  if (uploading.value) return
  inputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 立即清空，保证连续选同一文件也能再次触发 change
  input.value = ''
  if (!file) return
  uploading.value = true
  try {
    const { data } = await uploadApi.image(file)
    emit('update:modelValue', (data as any).url)
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败，请重试')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="cos-image-upload">
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="onFileChange"
    >
    <div
      class="uploader-box"
      :class="{ 'is-disabled': uploading }"
      @click="pick"
    >
      <img
        v-if="modelValue"
        :src="modelValue"
        class="preview"
      >
      <div
        v-else
        class="placeholder"
      >
        <el-icon><Plus /></el-icon>
        <div class="ph-text">{{ uploading ? '上传中...' : '点击上传' }}</div>
      </div>
    </div>
    <div
      v-if="tip"
      class="upload-tip"
    >
      {{ tip }}
    </div>
  </div>
</template>

<style scoped>
.hidden-input { display: none; }
.uploader-box {
  width: 120px; height: 120px;
  border: 1px dashed var(--el-border-color, #dcdfe6); border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; overflow: hidden; transition: border-color 0.2s;
}
.uploader-box:hover { border-color: var(--el-color-primary, #409eff); }
.uploader-box.is-disabled { cursor: not-allowed; opacity: 0.6; }
.preview { width: 100%; height: 100%; object-fit: cover; }
.placeholder { text-align: center; color: #8c939d; font-size: 22px; }
.ph-text { font-size: 12px; margin-top: 6px; }
.upload-tip { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; }
</style>
