"use client"

import Link from "next/link"
import { ChevronLeft, History } from "lucide-react"
import { BaziInputForm } from "@/components/paipan/bazi/input-form"
import { InstantBazi } from "@/components/paipan/bazi/instant-bazi"
import { Disclaimer } from "@/components/compliance/disclaimer"

export default function BaziPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/10">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/paipan" className="flex items-center gap-0.5 text-white/80 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">返回</span>
          </Link>
          <h1 className="text-base font-bold tracking-wider">热卜八字</h1>
          <Link 
            href="/paipan/bazi/history" 
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white hover:text-white transition-all text-sm font-medium cursor-pointer z-10"
          >
            <History className="w-4 h-4" />
            <span>记录</span>
          </Link>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        
        {/* 排盘输入表单 */}
        <section>
          <BaziInputForm />
        </section>

        {/* 即时排盘 */}
        <section>
          <InstantBazi />
        </section>

        {/* 合规提示 */}
        <Disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，命理分析结果不构成任何预测或建议。"
        />

      </div>
    </main>
  )
}
