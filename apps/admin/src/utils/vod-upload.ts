/**
 * VOD 视频直传工具：拿后端签名 → vod-js-sdk-v6 直传腾讯云点播 → 返回播放地址。
 * 抽出此工具，供 VodUpload 组件与富文本编辑器(RichEditor)的视频插入共用同一套成熟签名逻辑，
 * 避免"签名格式异常/split is not a function"类历史坑重复出现。
 */
import TcVod from 'vod-js-sdk-v6'
import { uploadApi } from '@/api'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 兼容历史签名响应包装，但只接受最终的非空字符串。 */
function readSignature(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined
  if (!isRecord(value)) return undefined
  return readSignature(value.signature) ?? readSignature(value.data)
}

function readVideoUrl(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.video)) return undefined
  return typeof value.video.url === 'string' ? value.video.url : undefined
}

/** 上传单个视频文件到腾讯云点播，返回播放 URL。onProgress 回传 0-100 进度。 */
export async function uploadVodFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const tcVod = new TcVod({
    getSignature: async () => {
      const response = await uploadApi.getVodSignature()
      // 兼容拦截器解包差异：signature 可能在 res / res.signature / res.data.signature / res.data.data.signature
      const sig = readSignature(response.data) ?? readSignature(response)
      if (!sig) {
        console.error('[uploadVodFile] 签名返回非字符串：', response)
        throw new Error('签名格式异常，请查看控制台 [uploadVodFile] 日志')
      }
      return sig
    },
  })
  const uploader = tcVod.upload({ mediaFile: file })
  if (onProgress) {
    uploader.on('media_progress', (info: { percent?: number }) => {
      onProgress(Math.round((info.percent || 0) * 100))
    })
  }
  const result: unknown = await uploader.done()
  return readVideoUrl(result) || ''
}
