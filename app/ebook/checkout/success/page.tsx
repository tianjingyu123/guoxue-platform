"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle, BookOpen, ChevronRight } from "lucide-react"
import Link from "next/link"

const relatedBooks = [
  { id: "2", title: "紫微斗数入门", author: "紫微居士", price: 58, coverColor: "#1a4731" },
  { id: "3", title: "六爻预测实战", author: "陈易卦", price: 68, coverColor: "#4a1942" },
  { id: "4", title: "风水学基础", author: "张天师", price: 88, coverColor: "#3d1f00" },
]

export default function EbookCheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--ebook-bg)] flex flex-col items-center">
      {/* Success hero */}
      <div className="w-full bg-white pt-16 pb-10 px-8 text-center border-b border-[var(--ebook-border)]">
        <div className="w-20 h-20 rounded-full bg-[var(--ebook-primary)]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-[var(--ebook-primary)]" />
        </div>
        <h1 className="text-xl font-bold text-[var(--ebook-text)]">支付成功！</h1>
        <p className="text-sm text-[var(--ebook-text-soft)] mt-2">《八字命理精解》已添加到你的书架</p>

        {/* Quick actions */}
        <div className="flex gap-3 mt-6 justify-center">
          <Button className="bg-[var(--ebook-primary)] hover:bg-[var(--ebook-primary)]/90 px-6 gap-2" asChild>
            <Link href="/ebook/reader/1">
              <BookOpen className="w-4 h-4" />
              立即阅读
            </Link>
          </Button>
          <Button variant="outline" className="border-[var(--ebook-border)] text-[var(--ebook-text-soft)] px-6 gap-2" asChild>
            <Link href="/ebook/bookshelf">
              去书架
            </Link>
          </Button>
        </div>
      </div>

      {/* Order details */}
      <div className="w-full max-w-lg px-4 py-5">
        <div className="bg-white rounded-xl border border-[var(--ebook-border)] divide-y divide-[var(--ebook-border)]">
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-[var(--ebook-text-soft)]">订单号</span>
            <span className="text-[var(--ebook-text)] font-mono text-xs">#EB2024031501</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-[var(--ebook-text-soft)]">支付方式</span>
            <span className="text-[var(--ebook-text)]">微信支付</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-[var(--ebook-text-soft)]">实付金额</span>
            <span className="text-[var(--ebook-price)] font-bold">¥68</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-[var(--ebook-text-soft)]">购买时间</span>
            <span className="text-[var(--ebook-text)]">2024-03-15 14:32</span>
          </div>
        </div>
      </div>

      {/* Related recommendation */}
      <div className="w-full px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--ebook-text)]">买了此书的人还买了</h2>
          <Link href="/ebook" className="text-sm text-[var(--ebook-primary)] flex items-center gap-0.5">
            更多<ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {relatedBooks.map((rb) => (
            <Link key={rb.id} href={`/ebook/${rb.id}`} className="flex-shrink-0 w-24">
              <div
                className="w-full aspect-[2/3] rounded-xl shadow-md mb-2 relative overflow-hidden"
                style={{ background: rb.coverColor }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10" />
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <p className="text-white/80 text-[10px] text-center font-medium leading-snug line-clamp-4">{rb.title}</p>
                </div>
              </div>
              <p className="text-xs font-medium text-[var(--ebook-text)] line-clamp-1">{rb.title}</p>
              <p className="text-[var(--ebook-price)] text-xs font-bold">¥{rb.price}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
