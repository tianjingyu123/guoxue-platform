"use client"

import { useState } from "react"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav"
import { ToolsGrid } from "@/components/paipan/tools-grid"
import { ToolIcon } from "@/components/paipan/tool-icon"
import { tools, medicalTools, agents } from "@/lib/tools-data"
import { Disclaimer } from "@/components/compliance/disclaimer"
import { 
  History, ChevronRight, Sparkles, ChevronDown, ChevronUp,
  Stethoscope
} from "lucide-react"

// 智能体头像组件
function AgentAvatar({ type }: { type: string }) {
  const colors: Record<string, string> = {
    master: "from-amber-500 to-orange-600",
    classic: "from-emerald-500 to-teal-600",
    report: "from-blue-500 to-indigo-600",
    study: "from-purple-500 to-violet-600",
    qimen: "from-rose-500 to-pink-600",
    ziwei: "from-cyan-500 to-sky-600",
    fengshui: "from-lime-500 to-green-600",
    naming: "from-fuchsia-500 to-purple-600",
  }
  
  return (
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[type] || colors.master} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
      <Sparkles className="w-5 h-5" />
    </div>
  )
}

export default function PaipanPage() {
  const [showAllTools, setShowAllTools] = useState(false)
  const [showMedical, setShowMedical] = useState(false)
  
  // 前32个默认展示
  const displayTools = showAllTools ? tools : tools.slice(0, 32)
  const displayMedical = showMedical ? medicalTools : medicalTools.slice(0, 8)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <h1 className="text-lg font-bold text-foreground">排盘工具</h1>
          <Link href="/paipan/history" className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
            <History className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* AI智能解盘入口 */}
      <div className="px-4 pt-4">
        <Link href="/paipan/ai" className="block">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-4">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg">AI 智能解盘</h3>
                  <span className="px-2 py-0.5 text-[10px] bg-white/20 text-white rounded-full">新功能</span>
                </div>
                <p className="text-white/80 text-sm mt-0.5">输入命盘信息，AI 为您深度解析</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </div>
        </Link>
      </div>

      {/* 排盘工具网格 */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">排盘工具</h2>
          <Link href="/paipan/history" className="text-xs text-primary flex items-center gap-0.5">
            历史记录 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        {/* 工具网格 */}
        <div className="grid grid-cols-4 gap-3">
          {displayTools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="flex flex-col items-center gap-1.5 py-2"
            >
              <div className="relative">
                <ToolIcon iconId={tool.iconId} size={44} />
                {tool.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span className="text-xs text-foreground text-center leading-tight">{tool.name}</span>
            </Link>
          ))}
        </div>
        
        {/* 展开/收起按钮 */}
        {tools.length > 32 && (
          <button
            onClick={() => setShowAllTools(!showAllTools)}
            className="w-full flex items-center justify-center gap-1 py-3 mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAllTools ? (
              <>收起 <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>展开更多 <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>

      {/* 中医工具 */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-foreground">中医工具</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          {displayMedical.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="flex flex-col items-center gap-1.5 py-2"
            >
              <div className="relative">
                <ToolIcon iconId={tool.iconId} size={44} />
                {tool.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </div>
              <span className="text-xs text-foreground text-center leading-tight">{tool.name}</span>
            </Link>
          ))}
        </div>
        
        {medicalTools.length > 8 && (
          <button
            onClick={() => setShowMedical(!showMedical)}
            className="w-full flex items-center justify-center gap-1 py-3 mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMedical ? (
              <>收起 <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>展开更多 <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>

      {/* AI智能体 */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">AI 智能体</h2>
          <Link href="/agents" className="text-xs text-primary flex items-center gap-0.5">
            查看全部 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        {/* 横向滚动智能体列表 */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {agents.slice(0, 6).map((agent) => (
            <Link
              key={agent.id}
              href={agent.href}
              className="flex-shrink-0 w-[140px] p-3 bg-card rounded-xl border border-border hover:shadow-md transition-shadow"
            >
              <AgentAvatar type={agent.avatar} />
              <h3 className="font-medium text-foreground text-sm mt-2 truncate">{agent.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{agent.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 合规提示 */}
      <div className="px-4 pb-2">
        <Disclaimer
          variant="custom"
          tone="subtle"
          text="平台命理工具仅供传统文化爱好者研究学习，排盘与分析结果不构成任何决策建议。"
        />
      </div>

      <BottomNav />
    </div>
  )
}
