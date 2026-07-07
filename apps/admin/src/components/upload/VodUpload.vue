<script setup lang="ts">
/** 通用 VOD 视频上传组件：选本地视频 → 直传腾讯云点播(自动转码压缩) → 进度 → v-model 回填播放地址。
 *  用法：<VodUpload v-model="form.videoUrl" /> 替代原来的"视频URL"输入框。 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadApi } from '@/api'
// @ts-ignore vod-js-sdk-v6 无类型声明
import TcVod from 'vod-js-sdk-v6'

defineProps<{ modelValue?: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)
const progress = ref(0)

async function handleUpload(options: any) {
  uploading.value = true
  progress.value = 0
  try {
    const tcVod = new TcVod({
      getSignature: async () => {
        const { data } = await uploadApi.getVodSignature()
        return (data as any).signature
      },
    })
    const uploader = tcVod.upload({ mediaFile: options.file })
    uploader.on('media_progress', (info: any) => {
      progress.value = Math.round((info.percent || 0) * 100)
    })
    const result: any = await uploader.done()
    emit('update:modelValue', result?.video?.url || '')
    ElMessage.success('视频上传成功，已自动填入地址')
  } catch {
    ElMessage.error('视频上传失败，请重试')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="vod-upload">
    <el-input
      :model-value="modelValue"
      :placeholder="placeholder || '视频URL·可手填，或用下方本地上传'"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div class="vod-upload-row">
      <el-upload
        :show-file-list="false"
        :http-request="handleUpload"
        accept="video/*"
        :disabled="uploading"
      >
        <el-button
          type="primary"
          size="small"
          :loading="uploading"
        >
          {{ uploading ? `上传中 ${progress}%` : '本地上传视频' }}
        </el-button>
      </el-upload>
      <el-progress
        v-if="uploading"
        :percentage="progress"
        :stroke-width="6"
        style="margin-top: 8px"
      />
      <div class="vod-tip">本地视频直传，自动转码压缩；大视频建议用电脑上传</div>
    </div>
  </div>
</template>

<style scoped>
.vod-upload-row { margin-top: 8px; }
.vod-tip { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; }
</style>
