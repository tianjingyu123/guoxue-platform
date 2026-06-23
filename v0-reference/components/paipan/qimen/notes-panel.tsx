"use client"

import { useState, useRef } from "react"
import { ChevronRight, Plus, Settings, X, Trash2, Mic, Image, Play, Pause, Square } from "lucide-react"

// 奇门笔记条目配置
const NOTE_ITEMS = [
  { key: "qiuce", label: "求测事项", type: "expand" as const },
  { key: "yongshen", label: "用神分析", type: "expand" as const },
  { key: "geju", label: "格局分析", type: "expand" as const },
  { key: "duanshi", label: "断事结论", type: "expand" as const },
  { key: "yingqi", label: "应期预测", type: "expand" as const },
  { key: "fankui", label: "反馈验证", type: "expand" as const },
]

// 默认显示的条目
const DEFAULT_VISIBLE: Record<string, boolean> = {
  qiuce: true,
  yongshen: true,
  geju: true,
  duanshi: true,
  yingqi: true,
  fankui: true,
}

interface QimenNotesPanelProps {
  open: boolean
  onClose: () => void
}

export function QimenNotesPanel({ open, onClose }: QimenNotesPanelProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [itemVisible, setItemVisible] = useState(DEFAULT_VISIBLE)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  // 语音笔记
  const [voiceNotes, setVoiceNotes] = useState<Record<string, { url: string; duration: number }[]>>({})
  const [recording, setRecording] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 图片笔记
  const [imageNotes, setImageNotes] = useState<Record<string, string[]>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeImageKey, setActiveImageKey] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // 开始录音
  const startRecording = async (key: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        const duration = recordingTime
        setVoiceNotes(prev => ({ ...prev, [key]: [...(prev[key] || []), { url, duration }] }))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()
      setRecording(key)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      alert("无法访问麦克风，请检查权限设置")
    }
  }

  // 停止录音
  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(null)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // 播放语音
  const playVoice = (url: string, id: string) => {
    if (audioRef.current) { audioRef.current.pause() }
    const audio = new Audio(url)
    audioRef.current = audio
    setPlayingVoice(id)
    audio.onended = () => setPlayingVoice(null)
    audio.play()
  }

  const stopVoice = () => {
    audioRef.current?.pause()
    setPlayingVoice(null)
  }

  // 删除语音
  const deleteVoice = (key: string, index: number) => {
    setVoiceNotes(prev => {
      const list = [...(prev[key] || [])]
      if (list[index]) URL.revokeObjectURL(list[index].url)
      list.splice(index, 1)
      return { ...prev, [key]: list }
    })
  }

  // 添加图片
  const handleImageSelect = (key: string) => {
    setActiveImageKey(key)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !activeImageKey) return
    const urls = Array.from(files).map(f => URL.createObjectURL(f))
    setImageNotes(prev => ({ ...prev, [activeImageKey]: [...(prev[activeImageKey] || []), ...urls] }))
    e.target.value = ""
  }

  // 删除图片
  const deleteImage = (key: string, index: number) => {
    setImageNotes(prev => {
      const list = [...(prev[key] || [])]
      if (list[index]) URL.revokeObjectURL(list[index])
      list.splice(index, 1)
      return { ...prev, [key]: list }
    })
  }

  const formatSeconds = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  // 语音+图片附件工具栏
  const AttachmentBar = ({ noteKey }: { noteKey: string }) => (
    <div className="mt-2">
      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mb-2">
        {recording === noteKey ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
          >
            <Square className="w-3 h-3 fill-current" />
            <span className="tabular-nums">{formatSeconds(recordingTime)}</span>
            <span>停止</span>
          </button>
        ) : (
          <button
            onClick={() => startRecording(noteKey)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-medium hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            语音
          </button>
        )}
        <button
          onClick={() => handleImageSelect(noteKey)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-medium hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Image className="w-3.5 h-3.5" />
          图片
        </button>
      </div>

      {/* 已有语音列表 */}
      {(voiceNotes[noteKey] || []).length > 0 && (
        <div className="space-y-1.5 mb-2">
          {(voiceNotes[noteKey] || []).map((v, i) => {
            const voiceId = `${noteKey}-${i}`
            return (
              <div key={i} className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
                <button
                  onClick={() => playingVoice === voiceId ? stopVoice() : playVoice(v.url, voiceId)}
                  className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"
                >
                  {playingVoice === voiceId ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={`h-full bg-primary rounded-full transition-all ${playingVoice === voiceId ? "animate-pulse w-full" : "w-0"}`} />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{formatSeconds(v.duration)}</span>
                <button onClick={() => deleteVoice(noteKey, i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* 已有图片 */}
      {(imageNotes[noteKey] || []).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {(imageNotes[noteKey] || []).map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group">
              <img
                src={url}
                alt={`图片${i + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                crossOrigin="anonymous"
                onClick={() => setPreviewImage(url)}
              />
              <button
                onClick={() => deleteImage(noteKey, i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (!open) return null

  const toggleVisibility = (key: string) => {
    setItemVisible(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const visibleItems = NOTE_ITEMS.filter(item => itemVisible[item.key])

  // 删除笔记项
  const deleteNoteItem = (key: string) => {
    setItemVisible(prev => ({ ...prev, [key]: false }))
    setNotes(prev => {
      const newNotes = { ...prev }
      delete newNotes[key]
      return newNotes
    })
    if (expandedItem === key) setExpandedItem(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center" onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={previewImage} alt="预览" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" crossOrigin="anonymous" />
        </div>
      )}

      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-foreground">奇门笔记</h2>
        <button onClick={() => setShowSettings(true)} className="text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {visibleItems.map(item => (
          <div key={item.key} className="border-b border-border">
            <button
              className="w-full flex items-center justify-between py-3.5"
              onClick={() => setExpandedItem(expandedItem === item.key ? null : item.key)}
            >
              <span className="text-base font-medium text-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNoteItem(item.key)
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedItem === item.key ? "rotate-90" : ""}`} />
              </div>
            </button>
            {expandedItem === item.key && (
              <div className="pb-3">
                <textarea
                  className="w-full bg-secondary/30 rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[80px] border border-border focus:outline-none focus:border-primary/50"
                  placeholder="请输入"
                  value={notes[item.key] || ""}
                  onChange={e => setNotes(prev => ({ ...prev, [item.key]: e.target.value }))}
                />
                <AttachmentBar noteKey={item.key} />
              </div>
            )}
          </div>
        ))}

        {/* 添加笔记项按钮 */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-full py-4 flex items-center justify-center gap-2 text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">添加笔记项</span>
        </button>
      </div>

      {/* 设置弹窗 - 管理笔记项 */}
      {showSettings && (
        <div className="fixed inset-0 z-[55] bg-black/40" onClick={() => setShowSettings(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">管理笔记项</span>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground mb-3">选择要显示的笔记项目：</p>
              {NOTE_ITEMS.map(item => (
                <button
                  key={item.key}
                  onClick={() => toggleVisibility(item.key)}
                  className="w-full flex items-center justify-between py-3 border-b border-border/60"
                >
                  <span className="text-sm text-foreground">{item.label}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    itemVisible[item.key] ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {itemVisible[item.key] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-primary text-white rounded-full font-medium"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
