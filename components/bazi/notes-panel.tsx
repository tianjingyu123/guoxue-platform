"use client"

import { useState } from "react"
import { X, BookOpen, Mic, Image as ImageIcon, Plus, ChevronDown, ChevronUp } from "lucide-react"

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
}

interface NotesPanelProps {
  open: boolean
  onClose: () => void
}

export function NotesPanel({ open, onClose }: NotesPanelProps) {
  const [activeTab, setActiveTab] = useState<"feedback" | "comment" | "events">("feedback")
  const [expandedSection, setExpandedSection] = useState<string | null>("career")
  
  // 模拟笔记数据
  const [feedbackData, setFeedbackData] = useState({
    career: "",
    wealth: "",
    marriage: "",
    health: "",
    other: ""
  })
  
  const [masterComment, setMasterComment] = useState("")
  const [events, setEvents] = useState<{ date: string; content: string }[]>([])
  const [newEvent, setNewEvent] = useState({ date: "", content: "" })
  const [showAddEvent, setShowAddEvent] = useState(false)

  if (!open) return null

  const sections = [
    { key: "career", label: "事业", placeholder: "记录事业方面的实际情况..." },
    { key: "wealth", label: "财运", placeholder: "记录财运方面的实际情况..." },
    { key: "marriage", label: "婚姻", placeholder: "记录婚姻感情的实际情况..." },
    { key: "health", label: "健康", placeholder: "记录健康方面的实际情况..." },
    { key: "other", label: "其他", placeholder: "记录其他方面的反馈..." },
  ]

  const handleAddEvent = () => {
    if (newEvent.date && newEvent.content) {
      setEvents([...events, newEvent])
      setNewEvent({ date: "", content: "" })
      setShowAddEvent(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div 
        className="bg-card w-full rounded-t-2xl overflow-hidden animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold text-foreground">断事笔记</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签栏 */}
        <div className="flex border-b border-border shrink-0">
          {([
            { key: "feedback" as const, label: "命主反馈" },
            { key: "comment" as const, label: "师傅点评" },
            { key: "events" as const, label: "事件反馈" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "feedback" && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground mb-3">
                记录命主各方面的实际情况，用于验证和学习
              </p>
              {sections.map((section) => (
                <div key={section.key} className="bg-secondary/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm font-medium text-foreground">{section.label}</span>
                    {expandedSection === section.key ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {expandedSection === section.key && (
                    <div className="px-4 pb-4">
                      <textarea
                        value={feedbackData[section.key as keyof typeof feedbackData]}
                        onChange={(e) => setFeedbackData({ ...feedbackData, [section.key]: e.target.value })}
                        placeholder={section.placeholder}
                        className="w-full h-24 p-3 bg-card rounded-lg text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-card rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                          <Mic className="w-4 h-4" />
                          <span className="text-xs">语音</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-card rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-xs">图片</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "comment" && (
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3">
                记录师傅对命局的专业分析和点评
              </p>
              <textarea
                value={masterComment}
                onChange={(e) => setMasterComment(e.target.value)}
                placeholder="输入师傅的分析点评..."
                className="w-full h-48 p-3 bg-secondary/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button className="flex items-center gap-1 px-4 py-2 bg-card rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <Mic className="w-4 h-4" />
                  <span className="text-sm">语音输入</span>
                </button>
                <button className="flex items-center gap-1 px-4 py-2 bg-card rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">添加图片</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3">
                记录关键事件的时间和内容，形成时间轴
              </p>
              
              {/* 已有事件列表 */}
              {events.length > 0 && (
                <div className="space-y-2 mb-4">
                  {events.map((event, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-secondary/30 rounded-lg">
                      <div className="text-xs text-primary font-medium whitespace-nowrap">{event.date}</div>
                      <div className="text-sm text-foreground">{event.content}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 添加事件 */}
              {showAddEvent ? (
                <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 bg-card rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <textarea
                    value={newEvent.content}
                    onChange={(e) => setNewEvent({ ...newEvent, content: e.target.value })}
                    placeholder="描述事件内容..."
                    className="w-full h-20 px-3 py-2 bg-card rounded-lg text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddEvent(false)}
                      className="flex-1 py-2 text-sm text-muted-foreground bg-card rounded-lg border border-border"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddEvent}
                      disabled={!newEvent.date || !newEvent.content}
                      className="flex-1 py-2 text-sm text-white bg-primary rounded-lg disabled:opacity-50"
                    >
                      添加
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="w-full py-3 border-2 border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">添加事件记录</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-border shrink-0">
          <button className="w-full py-3 bg-primary text-white rounded-xl font-medium">
            保存笔记
          </button>
        </div>
      </div>
    </div>
  )
}
