"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle, Eye, MousePointerClick, ShoppingCart, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MemberPerf {
  id: string
  name: string
  level: string
  visits: number
  clicks: number
  orders: number
  commission: number
  trend: number // 环比百分比
  // 自动诊断
  diagnosis: { type: "good" | "warn"; text: string }
}

const members: MemberPerf[] = [
  { id: "m1", name: "孙悦", level: "金牌站长", visits: 3200, clicks: 890, orders: 142, commission: 8600, trend: 18, diagnosis: { type: "good", text: "转化漏斗健康，流量与成交均衡" } },
  { id: "m2", name: "周明轩", level: "银牌站长", visits: 2800, clicks: 210, orders: 12, commission: 720, trend: -32, diagnosis: { type: "warn", text: "点击率偏低，建议优化推广文案与素材" } },
  { id: "m3", name: "吴芳", level: "普通站长", visits: 480, clicks: 156, orders: 38, commission: 2280, trend: 8, diagnosis: { type: "warn", text: "转化率高但流量不足，建议加大推广曝光" } },
  { id: "m4", name: "郑浩", level: "普通站长", visits: 1900, clicks: 620, orders: 8, commission: 480, trend: -15, diagnosis: { type: "warn", text: "点击多成交少，建议推荐高性价比内容" } },
]

export default function DownlineAnalysisPage() {
  const [selected, setSelected] = useState<MemberPerf | null>(null)

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-10">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/operator/dashboard" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">下线业绩分析</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-gray-400">系统自动分析每位下线的推广漏斗（曝光→点击→成交），诊断转化瓶颈。</p>

        {members.map(m => {
          const ctr = ((m.clicks / m.visits) * 100).toFixed(1)
          const cvr = ((m.orders / m.clicks) * 100).toFixed(1)
          return (
            <Card key={m.id} className="p-4">
              {/* 头部 */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-operator/10 flex items-center justify-center">
                  <span className="font-bold text-operator">{m.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">{m.name}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{m.level}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">佣金 ¥{m.commission}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  m.trend >= 0 ? "text-success" : "text-destructive"
                )}>
                  {m.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(m.trend)}%
                </div>
              </div>

              {/* 漏斗数据 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-lg bg-gray-50">
                  <Eye className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm font-bold text-gray-900">{m.visits}</p>
                  <p className="text-[10px] text-gray-400">曝光</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50">
                  <MousePointerClick className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm font-bold text-gray-900">{m.clicks}</p>
                  <p className="text-[10px] text-gray-400">点击 {ctr}%</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50">
                  <ShoppingCart className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm font-bold text-gray-900">{m.orders}</p>
                  <p className="text-[10px] text-gray-400">成交 {cvr}%</p>
                </div>
              </div>

              {/* 自动诊断 */}
              <div className={cn(
                "flex items-start gap-2 p-2.5 rounded-lg text-xs",
                m.diagnosis.type === "good" ? "bg-success/5 text-success" : "bg-amber-50 text-amber-700"
              )}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{m.diagnosis.text}</span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
