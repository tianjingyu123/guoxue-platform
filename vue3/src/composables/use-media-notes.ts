/**
 * 跨端媒体笔记适配（录音 / 播放 / 选图）——迁移三大风险之一的落地方案
 * 原型用 Web API：MediaRecorder + new Audio + <input type=file>
 * uni-app 跨端用：uni.getRecorderManager + uni.createInnerAudioContext + uni.chooseImage
 * H5 端 uni 会自动 polyfill 到对应 Web API，故一套代码三端通用。
 */
import { reactive, ref, onUnmounted } from 'vue'

export interface VoiceNote { url: string; duration: number }

export function useMediaNotes() {
  // ---- 数据 ----
  const voiceNotes = reactive<Record<string, VoiceNote[]>>({})
  const imageNotes = reactive<Record<string, string[]>>({})

  // ---- 录音 ----
  const recordingKey = ref<string | null>(null)
  const recordingTime = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null
  // #ifndef H5
  const recorder = uni.getRecorderManager()
  let pendingKey: string | null = null
  recorder.onStop((res: any) => {
    if (pendingKey) {
      if (!voiceNotes[pendingKey]) voiceNotes[pendingKey] = []
      voiceNotes[pendingKey].push({ url: res.tempFilePath, duration: recordingTime.value })
    }
    pendingKey = null
  })
  recorder.onError(() => { uni.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' }); resetTimer() })
  // #endif

  // #ifdef H5
  let mediaRecorder: any = null
  let chunks: any[] = []
  let h5Stream: any = null
  // #endif

  function resetTimer() {
    if (timer) { clearInterval(timer); timer = null }
    recordingKey.value = null
  }

  async function startRecording(key: string) {
    recordingTime.value = 0
    // #ifdef H5
    try {
      h5Stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new (window as any).MediaRecorder(h5Stream)
      chunks = []
      mediaRecorder.ondataavailable = (e: any) => { if (e.data.size > 0) chunks.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        if (!voiceNotes[key]) voiceNotes[key] = []
        voiceNotes[key].push({ url, duration: recordingTime.value })
        h5Stream?.getTracks().forEach((t: any) => t.stop())
      }
      mediaRecorder.start()
    } catch {
      uni.showToast({ title: '无法访问麦克风，请检查权限设置', icon: 'none' })
      return
    }
    // #endif
    // #ifndef H5
    pendingKey = key
    recorder.start({ format: 'mp3', duration: 600000 })
    // #endif
    recordingKey.value = key
    timer = setInterval(() => { recordingTime.value += 1 }, 1000)
  }

  function stopRecording() {
    // #ifdef H5
    mediaRecorder?.stop()
    // #endif
    // #ifndef H5
    recorder.stop()
    // #endif
    resetTimer()
  }

  function deleteVoice(key: string, index: number) {
    const list = voiceNotes[key]
    if (!list) return
    // #ifdef H5
    if (list[index]) { try { URL.revokeObjectURL(list[index].url) } catch {} }
    // #endif
    list.splice(index, 1)
  }

  // ---- 播放 ----
  const playingId = ref<string | null>(null)
  let audioCtx: any = null
  function playVoice(url: string, id: string) {
    if (audioCtx) { try { audioCtx.stop(); audioCtx.destroy() } catch {} }
    audioCtx = uni.createInnerAudioContext()
    audioCtx.src = url
    audioCtx.onEnded(() => { playingId.value = null })
    audioCtx.onError(() => { playingId.value = null; uni.showToast({ title: '播放失败', icon: 'none' }) })
    audioCtx.play()
    playingId.value = id
  }
  function stopVoice() {
    if (audioCtx) { try { audioCtx.stop() } catch {} }
    playingId.value = null
  }

  // ---- 图片 ----
  function chooseImage(key: string) {
    uni.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res: any) => {
        const paths: string[] = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths]
        if (!imageNotes[key]) imageNotes[key] = []
        imageNotes[key].push(...paths)
      },
    })
  }
  function deleteImage(key: string, index: number) {
    const list = imageNotes[key]
    if (!list) return
    // #ifdef H5
    if (list[index] && list[index].startsWith('blob:')) { try { URL.revokeObjectURL(list[index]) } catch {} }
    // #endif
    list.splice(index, 1)
  }
  function previewImage(urls: string[], current: string) {
    uni.previewImage({ urls, current })
  }

  function formatSeconds(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  onUnmounted(() => {
    resetTimer()
    if (audioCtx) { try { audioCtx.destroy() } catch {} }
  })

  return {
    voiceNotes, imageNotes,
    recordingKey, recordingTime, startRecording, stopRecording, deleteVoice,
    playingId, playVoice, stopVoice,
    chooseImage, deleteImage, previewImage,
    formatSeconds,
  }
}
