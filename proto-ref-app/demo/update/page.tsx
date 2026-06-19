"use client"

import { UpdateModalDemo } from "@/components/update-modal"
import { BackButton } from "@/components/common/back-button"
import { } from "lucide-react"
import Link from "next/link"

export default function UpdateDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 h-12">
          <BackButton />
          <h1 className="font-semibold text-foreground">版本更新弹窗演示</h1>
        </div>
      </header>

      <UpdateModalDemo />
    </div>
  )
}
