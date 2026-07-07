<script setup lang="ts">
/** 通用图片上传组件：选本地图片 → 传 COS → 缩略图预览 → v-model 回填 URL。
 *  用法：<CosImageUpload v-model="form.cover" /> 替代原来的"图片URL"输入框。 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { uploadApi } from '@/api'

defineProps<{ modelValue?: string; tip?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)

async function handleUpload(options: any) {
  uploading.value = true
  try {
    const { data } = await uploadApi.image(options.file)
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
    <el-upload
      :show-file-list="false"
      :http-request="handleUpload"
      accept="image/*"
      :disabled="uploading"
    >
      <div class="uploader-box">
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
    </el-upload>
    <div
      v-if="tip"
      class="upload-tip"
    >
      {{ tip }}
    </div>
  </div>
</template>

<style scoped>
.uploader-box {
  width: 120px; height: 120px;
  border: 1px dashed var(--el-border-color, #dcdfe6); border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; overflow: hidden; transition: border-color 0.2s;
}
.uploader-box:hover { border-color: var(--el-color-primary, #409eff); }
.preview { width: 100%; height: 100%; object-fit: cover; }
.placeholder { text-align: center; color: #8c939d; font-size: 22px; }
.ph-text { font-size: 12px; margin-top: 6px; }
.upload-tip { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; }
</style>
