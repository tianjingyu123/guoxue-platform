'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, FileText, Link2, Trash2, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface KnowledgeItem {
  id: string
  type: 'doc' | 'link' | 'qa'
  title: string
  desc: string
  enabled: boolean
  updatedAt: string
}

const mockItems: KnowledgeItem[] = [
  { id: '1', type: 'doc',  title: '圈子规则手册',     desc: '圈子基本规则与行为准则',    enabled: true,  updatedAt: '2024-01-15' },
  { id: '2', type: 'qa',   title: '命理常见问题解答',  desc: '28条常见命理问题标准回答',   enabled: true,  updatedAt: '2024-01-18' },
  { id: '3', type: 'link', title: '易经基础资料',      desc: 'https://example.com/yijing', enabled: true,  updatedAt: '2024-01-10' },
  { id: '4', type: 'doc',  title: '专家介绍合集',      desc: '圈内专家背景与专长介绍',    enabled: false, updatedAt: '2024-01-05' },
  { id: '5', type: 'qa',   title: '报名流程说明',      desc: '活动报名常见疑问及解答',    enabled: true,  updatedAt: '2024-01-20' },
]

const TYPE_CFG = {
  doc:  { label: '文档', icon: FileText, bg: 'bg-blue-50',   text: 'text-blue-600' },
  link: { label: '链接', icon: Link2,    bg: 'bg-green-50',  text: 'text-green-600' },
  qa:   { label: '问答', icon: FileText, bg: 'bg-orange-50', text: 'text-orange-600' },
}

export default function KnowledgePage() {
  const router = useRouter()
  const [items, setItems] = useState(mockItems)

  const toggle = (id: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i))

  const remove = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id))

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">知识库</h1>
        <Button size="sm" className="h-8 gap-1 bg-primary hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" />添加
        </Button>
      </header>

      <div className="px-4 pt-4 pb-20">
        {/* Stats */}
        <div className="flex gap-3 mb-5">
          {[
            { label: '文档', count: items.filter(i => i.type === 'doc').length },
            { label: '链接', count: items.filter(i => i.type === 'link').length },
            { label: '问答', count: items.filter(i => i.type === 'qa').length },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center p-3 bg-muted/40 rounded-xl">
              <p className="text-xl font-bold text-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {items.map(item => {
            const cfg = TYPE_CFG[item.type]
            const Icon = cfg.icon
            return (
              <div
                key={item.id}
                className={cn('flex items-center gap-3 p-3 bg-card border border-border rounded-xl transition-opacity', !item.enabled && 'opacity-60')}
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                  <Icon className={cn('w-4 h-4', cfg.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.desc}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">更新于 {item.updatedAt}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggle(item.id)} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.enabled
                      ? <ToggleRight className="w-5 h-5 text-primary" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            )
          })}
        </div>

        {items.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">暂无知识库内容</p>
            <p className="text-xs text-muted-foreground mt-1">添加文档、链接或问答，让 AI 助手更了解您的圈子</p>
          </div>
        )}
      </div>
    </div>
  )
}
