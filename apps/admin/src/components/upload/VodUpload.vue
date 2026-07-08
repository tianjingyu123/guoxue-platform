<script setup lang="ts">
/** 通用 VOD 视频上传组件：选本地视频 → 直传腾讯云点播(自动转码压缩) → 进度 → v-model 回填播放地址。
 *  用法：<VodUpload v-model="form.videoUrl" /> 替代原来的"视频URL"输入框。
 *
 *  交互：以「本地上传」为主操作；已上传后显示地址与「重新上传」；
 *  手动填写地址收进「高级」折叠（默认隐藏），避免误以为仍是 URL 填写。
 *  实现：原生隐藏 <input type="file"> + ref 手动触发，规避 el-upload 首次点击不触发的时序问题。 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadApi } from '@/api'
// @ts-ignore vod-js-sdk-v6 无类型声明
import TcVod from 'vod-js-sdk-v6'

defineProps<{ modelValue?: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)
const progress = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const showManual = ref(false)

function pick() {
  if (uploading.value) return
  inputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 立即清空，保证再次选同一文件也能触发 change
  if (!file) return
  uploading.value = true
  progress.value = 0
  try {
    const tcVod = new TcVod({
      getSignature: async () => {
        const res: any = await uploadApi.getVodSignature()
        // 兼容拦截器解包差异：signature 可能在 res.signature / res.data.signature / res.data.data.signature
        const sig =
          typeof res === 'string'
            ? res
            : res?.signature ?? res?.data?.signature ?? res?.data?.data?.signature
        if (typeof sig !== 'string' || !sig) {
          // 暴露真实返回结构，避免腾讯云 SDK 抛出难以定位的 "signature.split is not a function"
          console.error('[VodUpload] 签名返回非字符串：', res)
          throw new Error('签名格式异常，请查看控制台 [VodUpload] 日志')
        }
        return sig
      },
    })
    const uploader = tcVod.upload({ mediaFile: file })
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
    <input
      ref="inputRef"
      type="file"
      accept="video/*"
      class="hidden-input"
      @change="onFileChange"
    >

    <!-- 已上传：显示预览 + 地址 + 重新上传 -->
    <div
      v-if="modelValue && !uploading"
      class="vod-done"
    >
      <video
        :src="modelValue"
        class="vod-preview"
        controls
        preload="metadata"
      />
      <div class="vod-done-row">
        <span class="vod-done-tag">✓ 视频已上传</span>
        <el-button
          type="primary"
          size="small"
          plain
          @click="pick"
        >
          重新上传
        </el-button>
      </div>
    </div>

    <!-- 未上传 / 上传中：主操作 = 本地上传 -->
    <div
      v-else
      class="vod-empty"
    >
      <el-button
        type="primary"
        :loading="uploading"
        @click="pick"
      >
        {{ uploading ? `上传中 ${progress}%` : '本地上传视频' }}
      </el-button>
      <el-progress
        v-if="uploading"
        :percentage="progress"
        :stroke-width="6"
        style="margin-top: 8px"
      />
      <div class="vod-tip">本地视频直传，自动转码压缩；大视频建议用电脑上传</div>
    </div>

    <!-- 高级：手动填写视频地址（默认折叠，供已有链接/上传失败时兜底） -->
    <div class="vod-manual">
      <el-link
        type="info"
        :underline="false"
        class="vod-manual-toggle"
        @click="showManual = !showManual"
      >
        {{ showManual ? '收起手动填写' : '或手动填写视频地址' }}
      </el-link>
      <el-input
        v-if="showManual"
        :model-value="modelValue"
        :placeholder="placeholder || '粘贴视频播放地址（https://...）'"
        class="vod-manual-input"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.hidden-input { display: none; }
.vod-preview { width: 240px; max-width: 100%; border-radius: 8px; background: #000; display: block; }
.vod-done-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.vod-done-tag { font-size: 13px; color: var(--el-color-success, #67c23a); }
.vod-tip { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; }
.vod-manual { margin-top: 10px; }
.vod-manual-toggle { font-size: 12px; }
.vod-manual-input { margin-top: 6px; }
</style>
