"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Clock, Calendar, Coins, LogOut, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  mockExitRequests,
  getExitStageDisplay,
  type ExitApplication,
} from "@/lib/circle-exit"

export default function ExitRequestsPage() {
  const params = useParams()
  const router = useRouter()

  const [requests, setRequests] = useState<ExitApplication[]>(mockExitRequests)
  const [filter, setFilter] = useState<"pending" | "processed">("pending")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const pending = requests.filter((r) => r.stage === "owner_reviewing")
  const processed = requests.filter((r) => r.stage !== "owner_reviewing")
  const display = filter === "pending" ? pending : processed

  // 圈主同意 → 进入平台审核
  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, stage: "platform_reviewing", ownerReviewedAt: new Date().toISOString().slice(0, 10) }
          : r,
      ),
    )
  }

  // 圈主拒绝 → 驳回
  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              stage: "rejected",
              rejectBy: "owner",
              rejectReason: rejectReason || "圈主未通过退出申请",
              ownerReviewedAt: new Date().toISOString().slice(0, 10),
            }
          : r,
      ),
    )
    setRejectingId(null)
    setRejectReason("")
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#F2EFEA]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">退出申请审核</h1>
          <div className="w-8" />
        </div>

        {/* 统计 */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-[#C41E3A]/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#C41E3A]/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-[#C41E3A]" />
            </div>
            <div>
              <div className="text-lg font-bold text-[#C41E3A]">{pending.length}</div>
              <div className="text-xs text-[#999999]">待审核</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#E8E3DB]" />
          <div>
            <div className="text-lg font-bold text-[#2C2C2C]">{processed.length}</div>
            <div className="text-xs text-[#999999]">已处理</div>
          </div>
        </div>

        {/* 筛选 Tab */}
        <div className="flex border-b border-[#F2EFEA]">
          {[
            { key: "pending", label: "待审核" },
            { key: "processed", label: "已处理" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={cn(
                "flex-1 py-3 text-sm font-medium relative",
                filter === tab.key ? "text-[#C41E3A]" : "text-[#999999]",
              )}
            >
              {tab.label}
              {filter === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 圈主审核说明 */}
      {filter === "pending" && pending.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-[#C9A96E]/10 border border-[#C9A96E]/20">
          <p className="text-xs text-[#7A6A4F] leading-relaxed">
            请核对成员身份与圈内行为记录后审核。同意后将进入平台审核与退款处理；退款金额由系统按使用天数自动核算。
          </p>
        </div>
      )}

      {/* 列表 */}
      {display.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#F2EFEA] flex items-center justify-center mb-4">
            <LogOut className="w-8 h-8 text-[#CCCCCC]" />
          </div>
          <p className="text-[#999999]">{filter === "pending" ? "暂无待审核申请" : "暂无已处理记录"}</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {display.map((req) => (
            <ExitRequestCard
              key={req.id}
              req={req}
              onApprove={() => handleApprove(req.id)}
              onReject={() => setRejectingId(req.id)}
            />
          ))}
        </div>
      )}

      {/* 拒绝原因弹窗 */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectingId(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-[#2C2C2C] mb-4">拒绝退出申请</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写拒绝原因，便于成员了解情况（选填）"
              className="w-full h-24 p-3 border border-[#E8E3DB] rounded-lg text-sm resize-none focus:outline-none focus:border-[#C41E3A]"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectingId(null)}
                className="flex-1 py-2.5 rounded-lg border border-[#E8E3DB] text-[#666666] text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                className="flex-1 py-2.5 rounded-lg bg-[#C41E3A] text-white text-sm"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExitRequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: ExitApplication
  onApprove: () => void
  onReject: () => void
}) {
  const isPending = req.stage === "owner_reviewing"
  const display = getExitStageDisplay(req.stage)
  const toneCls =
    display.tone === "approved"
      ? "bg-green-50 text-green-600"
      : display.tone === "rejected"
        ? "bg-red-50 text-red-600"
        : "bg-[#C9A96E]/10 text-[#C9A96E]"

  return (
    <div className={cn("bg-white rounded-xl overflow-hidden", isPending ? "shadow-[0_2px_12px_rgba(0,0,0,0.06)]" : "opacity-80")}>
      <div className="p-4">
        {/* 用户信息 */}
        <div className="flex items-start gap-3">
          <img src={req.user.avatar || "/placeholder.svg"} alt={req.user.name} className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#2C2C2C]">{req.user.name}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full whitespace-nowrap", toneCls)}>{display.label}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#999999]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                加入 {req.joinDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                已用 {req.breakdown.usedDays} 天
              </span>
            </div>
          </div>
        </div>

        {/* 申请原因 */}
        {req.reason && (
          <p className="text-sm text-[#666666] mt-3">
            <span className="text-[#999999]">退出原因：</span>
            {req.reason}
          </p>
        )}

        {/* 退款金额预览 */}
        <div className="mt-3 p-3 rounded-xl bg-[#FAF8F5] space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-[#999999] mb-1">
            <Coins className="w-3.5 h-3.5 text-[#C41E3A]" />
            退款核算
          </div>
          <div className="flex justify-between text-xs text-[#666666]">
            <span>已付 ¥{req.breakdown.paidAmount} · 扣 ¥{req.breakdown.deduction}（{req.breakdown.usedDays}天 × ¥{req.breakdown.dailyRate}）</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-[#999999]">应退金额</span>
            <span className="text-lg font-bold text-[#C41E3A]">¥{req.breakdown.refundAmount}</span>
          </div>
        </div>

        {/* 驳回原因 */}
        {req.stage === "rejected" && req.rejectReason && (
          <div className="mt-2 text-xs text-red-500">
            {req.rejectBy === "owner" ? "圈主驳回：" : "平台驳回："}
            {req.rejectReason}
          </div>
        )}
        {/* 已处理流转说明 */}
        {req.stage === "platform_reviewing" && (
          <p className="mt-2 text-xs text-[#C9A96E]">已同意，等待平台审核与退款处理</p>
        )}
        {req.stage === "refunded" && (
          <p className="mt-2 text-xs text-green-600">退款 ¥{req.breakdown.refundAmount} 已于 {req.refundedAt} 到账</p>
        )}
      </div>

      {/* 操作按钮（仅待审核） */}
      {isPending && (
        <div className="flex border-t border-[#F2EFEA]">
          <button onClick={onReject} className="flex-1 py-3 text-sm text-[#666666] hover:bg-[#F5F0E8] flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4" />
            拒绝
          </button>
          <div className="w-px bg-[#F2EFEA]" />
          <button onClick={onApprove} className="flex-1 py-3 text-sm text-[#C41E3A] hover:bg-red-50 font-medium flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4" />
            同意退出
          </button>
        </div>
      )}
    </div>
  )
}
