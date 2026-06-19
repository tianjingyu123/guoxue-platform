"use client"

import { useState, useRef } from "react"
import { ChevronRight, Plus, Calendar, Settings, X, Trash2, ChevronDown, Mic, MicOff, Image, Play, Pause, Square } from "lucide-react"

// 命主反馈条目配置
const CLIENT_ITEMS = [
  { key: "career", label: "职业", type: "expand" as const },
  { key: "education", label: "学历", type: "expand" as const },
  { key: "wealth", label: "财富", type: "expand" as const },
  { key: "marriage", label: "婚姻", type: "expand" as const },
  { key: "health", label: "健康状态", type: "input" as const },
  { key: "relatives", label: "六亲状况", type: "input" as const },
  { key: "personality", label: "性情描述", type: "input" as const },
]

// 师傅点评条目配置
const MASTER_ITEMS = [
  { key: "wangShuai", label: "旺衰", type: "expand" as const },
  { key: "geJu1", label: "格局(一)", type: "expand" as const },
  { key: "geJu2", label: "格局(二)", type: "expand" as const },
  { key: "geJu3", label: "格局(三)", type: "expand" as const },
  { key: "xi1", label: "喜(一)", type: "expand" as const },
  { key: "xi2", label: "喜(二)", type: "expand" as const },
  { key: "xi3", label: "喜(三)", type: "expand" as const },
  { key: "ji1", label: "忌(一)", type: "expand" as const },
  { key: "ji2", label: "忌(二)", type: "expand" as const },
  { key: "ji3", label: "忌(三)", type: "expand" as const },
]

// 默认显示的条目
const DEFAULT_CLIENT_VISIBLE: Record<string, boolean> = {
  career: true, education: true, wealth: true, marriage: true,
  health: true, relatives: true, personality: false,
}
const DEFAULT_MASTER_VISIBLE: Record<string, boolean> = {
  wangShuai: true, geJu1: true, geJu2: false, geJu3: false,
  xi1: true, xi2: false, xi3: false,
  ji1: true, ji2: false, ji3: false,
}

interface NotesPanelProps {
  open: boolean
  onClose: () => void
}

export function NotesPanel({ open, onClose }: NotesPanelProps) {
  const [activeTab, setActiveTab] = useState<"client" | "master">("client")
  const [showSettings, setShowSettings] = useState(false)
  const [clientVisible, setClientVisible] = useState(DEFAULT_CLIENT_VISIBLE)
  const [masterVisible, setMasterVisible] = useState(DEFAULT_MASTER_VISIBLE)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  // 语音笔记
  const [voiceNotes, setVoiceNotes] = useState<Record<string, { url: string; duration: number }[]>>({})
  const [recording, setRecording] = useState<string | null>(null) // 当前正在录音的条目 key
  const [recordingTime, setRecordingTime] = useState(0)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null) // "key-index" 标记正在播放的语音
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

  const [events, setEvents] = useState<{ id: number; date: string; content: string }[]>([
    { id: 1, date: "2017-06", content: "升职加薪，任部门主管" },
    { id: 2, date: "2019-03", content: "购置房产" },
    { id: 3, date: "2022-10", content: "因身体不适住院检查" },
  ])
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEventDate, setNewEventDate] = useState("")
  const [newEventContent, setNewEventContent] = useState("")
  const [newEventDateType, setNewEventDateType] = useState<"year" | "month" | "day">("month")
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const nextId = () => (events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1)

  if (!open) return null

  const toggleVisibility = (key: string, role: "client" | "master") => {
    if (role === "client") {
      setClientVisible(prev => ({ ...prev, [key]: !prev[key] }))
    } else {
      setMasterVisible(prev => ({ ...prev, [key]: !prev[key] }))
    }
  }

  const visibleClientItems = CLIENT_ITEMS.filter(item => clientVisible[item.key])
  const visibleMasterItems = MASTER_ITEMS.filter(item => masterVisible[item.key])

  // 师傅点评合并同类项（格局一二三 -> 格局，喜一二三 -> 喜，忌一二三 -> 忌）
  const getMasterDisplayItems = () => {
    const groups: { key: string; label: string; subItems: typeof MASTER_ITEMS }[] = []
    const processed = new Set<string>()

    for (const item of visibleMasterItems) {
      if (processed.has(item.key)) continue

      if (item.key === "wangShuai") {
        groups.push({ key: "wangShuai", label: "旺衰", subItems: [item] })
        processed.add(item.key)
      } else if (item.key.startsWith("geJu")) {
        const related = visibleMasterItems.filter(i => i.key.startsWith("geJu"))
        if (related.length === 1) {
          groups.push({ key: "geJu", label: "格局", subItems: related })
        } else {
          groups.push({ key: "geJu", label: "格局", subItems: related })
        }
        related.forEach(r => processed.add(r.key))
      } else if (item.key.startsWith("xi")) {
        const related = visibleMasterItems.filter(i => i.key.startsWith("xi"))
        if (related.length === 1) {
          groups.push({ key: "xi", label: "喜", subItems: related })
        } else {
          groups.push({ key: "xi", label: "喜", subItems: related })
        }
        related.forEach(r => processed.add(r.key))
      } else if (item.key.startsWith("ji")) {
        const related = visibleMasterItems.filter(i => i.key.startsWith("ji"))
        if (related.length === 1) {
          groups.push({ key: "ji", label: "忌", subItems: related })
        } else {
          groups.push({ key: "ji", label: "忌", subItems: related })
        }
        related.forEach(r => processed.add(r.key))
      }
    }
    return groups
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
        <h2 className="text-base font-semibold text-foreground">断事笔记</h2>
        <button onClick={() => setShowSettings(true)} className="text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 角色切换 Tab */}
      <div className="flex justify-center gap-3 py-3">
        {[
          { key: "client" as const, label: "命主反馈" },
          { key: "master" as const, label: "师傅点评" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setExpandedItem(null) }}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors border ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {activeTab === "client" ? (
          <>
            {visibleClientItems.map(item => (
              <div key={item.key} className="border-b border-border">
                {item.type === "expand" ? (
                  <>
                    <button
                      className="w-full flex items-center justify-between py-3.5"
                      onClick={() => setExpandedItem(expandedItem === item.key ? null : item.key)}
                    >
                      <span className="text-base font-medium text-foreground">{item.label}</span>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedItem === item.key ? "rotate-90" : ""}`} />
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
                  </>
                ) : (
                  <div className="py-3.5">
                    <div className="text-base font-medium text-foreground mb-1.5">{item.label}:</div>
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      placeholder="请输入"
                      value={notes[item.key] || ""}
                      onChange={e => setNotes(prev => ({ ...prev, [item.key]: e.target.value }))}
                    />
                    <AttachmentBar noteKey={item.key} />
                  </div>
                )}
              </div>
            ))}

            {/* 关键事件反馈记录 - 时间轴 */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">关键事件反馈记录</h3>
                <button
                  onClick={() => { setShowAddEvent(true); setNewEventDate(""); setNewEventContent(""); setNewEventDateType("month") }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加事件
                </button>
              </div>

              {/* 添加事件表单 */}
              {showAddEvent && (
                <div className="mb-4 bg-secondary/20 rounded-xl p-4 border border-border">
                  <div className="text-sm font-medium text-foreground mb-2">选择时间精度</div>
                  <div className="flex gap-2 mb-3">
                    {([
                      { key: "year" as const, label: "年" },
                      { key: "month" as const, label: "年月" },
                      { key: "day" as const, label: "年月日" },
                    ]).map(t => (
                      <button
                        key={t.key}
                        onClick={() => { setNewEventDateType(t.key); setNewEventDate("") }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          newEventDateType === t.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type={newEventDateType === "year" ? "number" : newEventDateType === "month" ? "month" : "date"}
                      value={newEventDate}
                      onChange={e => setNewEventDate(e.target.value)}
                      placeholder={newEventDateType === "year" ? "2024" : newEventDateType === "month" ? "2024-06" : "2024-06-15"}
                      min={newEventDateType === "year" ? "1900" : undefined}
                      max={newEventDateType === "year" ? "2100" : undefined}
                      className="flex-1 bg-card rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <textarea
                    value={newEventContent}
                    onChange={e => setNewEventContent(e.target.value)}
                    placeholder="描述发生的关键事件..."
                    className="w-full bg-card rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[60px] border border-border focus:outline-none focus:border-primary/50 mb-2"
                  />
                  <AttachmentBar noteKey="new-event" />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setShowAddEvent(false)}
                      className="flex-1 py-2 rounded-full text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        if (!newEventDate || !newEventContent.trim()) return
                        const dateStr = newEventDateType === "year" ? `${newEventDate}` : newEventDate
                        setEvents(prev => [...prev, { id: nextId(), date: dateStr, content: newEventContent.trim() }].sort((a, b) => a.date.localeCompare(b.date)))
                        setShowAddEvent(false)
                        setNewEventDate("")
                        setNewEventContent("")
                      }}
                      disabled={!newEventDate || !newEventContent.trim()}
                      className="flex-1 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      确认添加
                    </button>
                  </div>
                </div>
              )}

              {/* 时间轴 */}
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  暂无记录，点击上方按钮添加关键事件
                </div>
              ) : (
                <div className="relative pl-5">
                  {/* 时间轴线 */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                  {events.map((evt, i) => (
                    <div key={evt.id} className="relative pb-4 last:pb-0">
                      {/* 时间轴圆点 */}
                      <div className="absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-primary bg-card" />

                      <div className="group">
                        {editingEventId === evt.id ? (
                          <div className="bg-secondary/20 rounded-xl p-3 border border-border">
                            <input
                              type="text"
                              value={evt.date}
                              onChange={e => setEvents(prev => prev.map(ev => ev.id === evt.id ? { ...ev, date: e.target.value } : ev))}
                              className="w-full bg-card rounded-lg px-3 py-1.5 text-xs text-foreground border border-border focus:outline-none focus:border-primary/50 mb-2"
                            />
                            <textarea
                              value={evt.content}
                              onChange={e => setEvents(prev => prev.map(ev => ev.id === evt.id ? { ...ev, content: e.target.value } : ev))}
                              className="w-full bg-card rounded-lg p-2 text-sm text-foreground resize-none min-h-[50px] border border-border focus:outline-none focus:border-primary/50 mb-2"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEvents(prev => prev.filter(ev => ev.id !== evt.id))}
                                className="px-3 py-1.5 rounded-full text-xs text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                              >
                                删除
                              </button>
                              <button
                                onClick={() => {
                                  setEditingEventId(null)
                                  setEvents(prev => [...prev].sort((a, b) => a.date.localeCompare(b.date)))
                                }}
                                className="flex-1 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
                              >
                                完成
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingEventId(evt.id)}
                            className="cursor-pointer hover:bg-secondary/20 rounded-xl p-2 -mx-1 transition-colors"
                          >
                            <div className="text-xs font-semibold text-primary mb-0.5">
                              {evt.date.length === 4 ? `${evt.date}年` : evt.date.length === 7 ? `${evt.date.replace("-", "年")}月` : evt.date.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1年$2月$3日")}
                            </div>
                            <div className="text-sm text-foreground leading-relaxed">{evt.content}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {getMasterDisplayItems().map(group => (
              <div key={group.key} className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-3.5"
                  onClick={() => setExpandedItem(expandedItem === group.key ? null : group.key)}
                >
                  <span className="text-base font-medium text-foreground">{group.label}</span>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedItem === group.key ? "rotate-90" : ""}`} />
                </button>
                {expandedItem === group.key && (
                  <div className="pb-3 space-y-2">
                    {group.subItems.map(sub => (
                      <div key={sub.key}>
                        {group.subItems.length > 1 && (
                          <div className="text-xs text-muted-foreground mb-1">{sub.label}</div>
                        )}
                        <textarea
                          className="w-full bg-secondary/30 rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[60px] border border-border focus:outline-none focus:border-primary/50"
                          placeholder="请输入"
                          value={notes[sub.key] || ""}
                          onChange={e => setNotes(prev => ({ ...prev, [sub.key]: e.target.value }))}
                        />
                        <AttachmentBar noteKey={sub.key} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* 总结 */}
            <div className="mt-4">
              <div className="text-base font-semibold text-foreground mb-2">总结:</div>
              <textarea
                className="w-full bg-secondary/30 rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[100px] border border-border focus:outline-none focus:border-primary/50"
                placeholder="请输入"
                value={notes["summary"] || ""}
                onChange={e => setNotes(prev => ({ ...prev, summary: e.target.value }))}
              />
              <AttachmentBar noteKey="summary" />
            </div>
          </>
        )}
      </div>

      {/* 底部保存栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex gap-3 items-center">
        <button className="flex-1 bg-primary text-primary-foreground py-3 rounded-full text-base font-semibold hover:opacity-90 transition-opacity">
          保存
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 显示设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 z-60 flex items-end" onClick={() => setShowSettings(false)}>
          <div
            className="w-full bg-card rounded-t-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">显示设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90"
              >
                完成
              </button>
            </div>

            <div className="grid grid-cols-2 gap-0">
              {/* 命主反馈列 */}
              <div className="border-r border-border">
                <div className="text-center py-3 font-semibold text-foreground">命主反馈</div>
                {CLIENT_ITEMS.map(item => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <button
                      onClick={() => toggleVisibility(item.key, "client")}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        clientVisible[item.key] ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${
                        clientVisible[item.key] ? "translate-x-[22px]" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 师傅点评列 */}
              <div>
                <div className="text-center py-3 font-semibold text-foreground">师傅点评</div>
                {MASTER_ITEMS.map(item => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <button
                      onClick={() => toggleVisibility(item.key, "master")}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        masterVisible[item.key] ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${
                        masterVisible[item.key] ? "translate-x-[22px]" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
