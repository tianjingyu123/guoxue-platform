"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  FEATURE_META,
  getStatusDisplay,
  AUTO_REVIEW_TIP,
  type FeatureType,
  type FeatureAuditStatus,
  type FeaturePermission,
} from "@/lib/feature-permissions"
import { Clock, Check, AlertCircle, Sparkles, X, ChevronRight } from "lucide-react"

interface FeatureGateProps {
  feature: FeaturePermission
  /** 已开通时点击的回调（进入功能） */
  onUse?: () => void
  /** 图标 */
  icon?: React.ReactNode
  /** 卡片样式：list 行内 / card 卡片 */
  variant?: "list" | "card"
  className?: string
}

/**
 * 功能门控入口：根据审核状态渲染
 * - 未申请：申请开通（次按钮）
 * - 审核中：审核中（置灰不可点）
 * - 已通过：正常功能入口
 * - 已驳回：查看原因 + 重新申请
 */
export function FeatureGate({ feature, onUse, icon, variant = "card", className }: FeatureGateProps) {
  const [showApply, setShowApply] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [localStatus, setLocalStatus] = useState<FeatureAuditStatus>(feature.status)

  const meta = FEATURE_META[feature.type]
  const display = getStatusDisplay(localStatus)

  const handleClick = () => {
    if (localStatus === "approved") {
      onUse?.()
    } else if (localStatus === "reviewing") {
      // 审核中不可点击
    } else if (localStatus === "rejected") {
      setShowReject(true)
    } else {
      setShowApply(true)
    }
  }

  const handleSubmit = () => {
    setLocalStatus("reviewing")
    setShowApply(false)
    setShowReject(false)
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={localStatus === "reviewing"}
        className={cn(
          "w-full flex items-center gap-3 text-left transition-colors",
          variant === "card" ? "p-4 rounded-xl border border-border bg-card" : "p-3",
          localStatus === "reviewing" ? "opacity-60 cursor-not-allowed" : "hover:bg-secondary/40 active:scale-[0.99]",
          className,
        )}
      >
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{meta.label}</span>
            {localStatus === "approved" && <Check className="w-3.5 h-3.5 text-[#3D7A5C]" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {localStatus === "reviewing"
              ? `审核中 · 预计 ${meta.reviewTime}`
              : localStatus === "rejected"
                ? "申请未通过，点击查看原因"
                : localStatus === "approved"
                  ? "已开通，点击进入"
                  : meta.description}
          </p>
        </div>
        <StatusBadge status={localStatus} />
      </button>

      {/* 申请弹窗 */}
      {showApply && (
        <FeatureApplyModal feature={feature.type} onClose={() => setShowApply(false)} onSubmit={handleSubmit} />
      )}

      {/* 驳回详情弹窗 */}
      {showReject && (
        <RejectModal
          feature={feature.type}
          reason={feature.rejectReason}
          onClose={() => setShowReject(false)}
          onReapply={() => {
            setShowReject(false)
            setShowApply(true)
          }}
        />
      )}
    </>
  )
}

// ============================================
// 状态徽章（可单独复用）
// ============================================

export function StatusBadge({ status }: { status: FeatureAuditStatus }) {
  const display = getStatusDisplay(status)
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0",
        display.bgClass,
        display.textClass,
      )}
    >
      {status === "reviewing" && <Clock className="w-3 h-3" />}
      {status === "approved" && <Check className="w-3 h-3" />}
      {status === "rejected" && <AlertCircle className="w-3 h-3" />}
      {status === "not_applied" && <ChevronRight className="w-3 h-3" />}
      {display.label}
    </span>
  )
}

// ============================================
// 申请表单弹窗
// ============================================

export function FeatureApplyModal({
  feature,
  onClose,
  onSubmit,
}: {
  feature: FeatureType
  onClose: () => void
  onSubmit: () => void
}) {
  const meta = FEATURE_META[feature]
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitting(false)
    onSubmit()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-card rounded-t-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-foreground">申请开通{meta.label}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{meta.description}</p>

        {/* 申请理由 */}
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          申请理由 <span className="text-[#C41E3A]">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="请简要说明开通该功能的用途与计划"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none mb-3"
        />

        {/* 补充说明 */}
        <label className="text-sm font-medium text-foreground mb-1.5 block">补充说明</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="选填，可补充圈子运营情况等"
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none mb-3"
        />

        {/* 自动审核说明 */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#C9A96E]/10 mb-4">
          <Sparkles className="w-4 h-4 text-[#C9A96E] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#8B7355] leading-relaxed">
            {AUTO_REVIEW_TIP}，预计审核时长 {meta.reviewTime}。
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!reason.trim() || submitting}
          className="w-full py-3.5 rounded-full bg-[#C41E3A] text-white font-semibold disabled:opacity-50 transition-opacity"
        >
          {submitting ? "提交中..." : "提交申请"}
        </button>
      </div>
    </div>
  )
}

// ============================================
// 驳回详情弹窗
// ============================================

function RejectModal({
  feature,
  reason,
  onClose,
  onReapply,
}: {
  feature: FeatureType
  reason?: string
  onClose: () => void
  onReapply: () => void
}) {
  const meta = FEATURE_META[feature]
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-8" onClick={onClose}>
      <div
        className="w-full max-w-xs bg-card rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="w-12 h-12 rounded-xl bg-[#C41E3A]/10 mx-auto flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-[#C41E3A]" />
          </div>
          <h4 className="font-medium text-center text-foreground">{meta.label}申请未通过</h4>
          <div className="mt-3 p-3 rounded-xl bg-secondary/60">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {reason || "暂不满足开通条件，请完善后重新申请。"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border">
          <button onClick={onClose} className="py-3 text-sm text-muted-foreground hover:bg-secondary/30">
            知道了
          </button>
          <button
            onClick={onReapply}
            className="py-3 text-sm font-medium text-white bg-[#C41E3A] hover:bg-[#A01829] border-l border-border"
          >
            重新申请
          </button>
        </div>
      </div>
    </div>
  )
}
