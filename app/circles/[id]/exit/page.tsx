"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Info, Calendar, Coins, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { calcRefund, mockMembership } from "@/lib/circle-exit"

export default function CircleExitPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [reason, setReason] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // 当前会员信息 + 退款金额计算（实际由 API 返回）
  const membership = mockMembership
  const today = new Date().toISOString().slice(0, 10)
  const breakdown = calcRefund({
    paidAmount: membership.paidAmount,
    joinDate: membership.joinDate,
    applyDate: today,
    totalDays: membership.totalDays,
  })

  const handleSubmit = () => {
    // TODO: 调用 circleApi.submitExitApplication
    setShowConfirm(false)
    setSubmitted(true)
  }

  // 提交成功页
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#3D7A5C]/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#3D7A5C]" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">退出申请已提交</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          你的申请将经过圈主审核与平台审核，双向通过后退款将原路退回。可在「我的申请」中查看进度。
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-8">
          <button
            onClick={() => router.push("/mine/applications?tab=exit")}
            className="w-full py-3 rounded-full bg-[#C41E3A] text-white text-sm font-medium"
          >
            查看申请进度
          </button>
          <button
            onClick={() => router.push(`/circle/${circleId}/home`)}
            className="w-full py-3 rounded-full bg-secondary text-foreground text-sm"
          >
            返回圈子
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center px-4 h-14 gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-base text-foreground">申请退出圈子</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* 圈子信息 */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{membership.circleName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              加入于 {membership.joinDate} · 已加入 {breakdown.usedDays} 天
            </p>
          </div>
        </div>

        {/* 退出规则说明 */}
        <div className="bg-[#C9A96E]/10 rounded-2xl border border-[#C9A96E]/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-[#C9A96E]" />
            <span className="text-sm font-medium text-foreground">退出与退款规则</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <li>· 按实际使用天数扣费，剩余部分原路退还</li>
            <li>· 每天费用 = 已付费用 ÷ 总服务天数（年费按 365 天）</li>
            <li>· 应退金额 = 已付费用 − 每天费用 × 已使用天数</li>
            <li>· 退出需经「圈主审核 + 平台审核」双向通过</li>
            <li>· 已购课程、电子书等不受退出影响，可继续使用</li>
          </ul>
        </div>

        {/* 退款金额预览 */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#C41E3A]" />
            <span className="text-sm font-medium text-foreground">退款金额预览</span>
            <span className="ml-auto text-[10px] text-muted-foreground">系统自动计算</span>
          </div>
          <div className="p-4 space-y-3">
            <Row label="已付费用" value={`¥${breakdown.paidAmount}`} />
            <Row
              label="已使用天数"
              value={`${breakdown.usedDays} 天`}
              icon={<Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
            />
            <Row label="每天费用" value={`¥${breakdown.dailyRate} / 天`} />
            <Row label="已扣除费用" value={`− ¥${breakdown.deduction}`} valueClass="text-muted-foreground" />
            <div className="pt-3 border-t border-dashed border-border flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">应退金额</span>
              <span className="text-2xl font-bold text-[#C41E3A]">¥{breakdown.refundAmount}</span>
            </div>
          </div>
        </div>

        {/* 申请原因 */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            申请原因 <span className="text-xs text-muted-foreground font-normal">（选填）</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="填写退出原因，有助于圈主更快审核（选填）"
            maxLength={200}
            className="w-full h-24 p-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-[#C41E3A]"
          />
          <p className="text-right text-[11px] text-muted-foreground mt-1">{reason.length}/200</p>
        </div>

        {/* 双向审核流程提示 */}
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-[#3D7A5C] flex-shrink-0" />
          <p className="text-xs text-muted-foreground">提交后进入「圈主审核 → 平台审核」流程，全程可追溯</p>
        </div>
      </div>

      {/* 底部提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-3.5 rounded-full bg-[#C41E3A] text-white font-semibold shadow-lg shadow-[#C41E3A]/25"
        >
          提交退出申请
        </button>
      </div>

      {/* 二次确认弹窗 */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-8"
          onClick={() => setShowConfirm(false)}
        >
          <div className="w-full max-w-xs bg-card rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#C41E3A]/10 mx-auto flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-[#C41E3A]" />
              </div>
              <h4 className="font-semibold text-foreground">确认申请退出？</h4>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                退出后你将失去该圈子的成员身份，预计退款 <span className="text-[#C41E3A] font-medium">¥{breakdown.refundAmount}</span>。已购课程、电子书不受影响。
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-border">
              <button
                onClick={() => setShowConfirm(false)}
                className="py-3 text-sm text-muted-foreground hover:bg-secondary/30"
              >
                再想想
              </button>
              <button
                onClick={handleSubmit}
                className="py-3 text-sm font-medium text-white bg-[#C41E3A] hover:bg-[#A01829] border-l border-border"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  valueClass,
  icon,
}: {
  label: string
  value: string
  valueClass?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={cn("text-sm font-medium text-foreground", valueClass)}>{value}</span>
    </div>
  )
}
