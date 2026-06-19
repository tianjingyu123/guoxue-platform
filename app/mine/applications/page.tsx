"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Clock, Check, AlertCircle, Sparkles, ShoppingBag, Users, LogOut, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FEATURE_META,
  getStatusDisplay,
  type FeatureType,
  type FeatureAuditStatus,
} from "@/lib/feature-permissions"
import { FeatureApplyModal } from "@/components/feature/feature-gate"
import {
  mockMyExitApps,
  getExitStageDisplay,
  getCompletedStepIndex,
  EXIT_FLOW_STEPS,
  type ExitApplication,
} from "@/lib/circle-exit"

// 功能开通申请记录
interface FeatureApplication {
  id: string
  feature: FeatureType
  circleName: string
  status: FeatureAuditStatus
  submittedAt: string
  rejectReason?: string
}

// 入圈申请记录
interface JoinApplication {
  id: string
  circleName: string
  status: "reviewing" | "approved" | "rejected"
  submittedAt: string
  rejectReason?: string
}

const mockFeatureApps: FeatureApplication[] = [
  { id: "f1", feature: "av_course", circleName: "八字命理研习社", status: "approved", submittedAt: "2024-05-01" },
  { id: "f2", feature: "live", circleName: "八字命理研习社", status: "reviewing", submittedAt: "2024-06-10" },
  {
    id: "f3",
    feature: "ai_assistant",
    circleName: "八字命理研习社",
    status: "rejected",
    submittedAt: "2024-06-01",
    rejectReason: "当前圈子活跃成员数未达到开通标准（需 ≥ 200 活跃成员），请提升圈子活跃度后重新申请。",
  },
  { id: "f4", feature: "ecommerce_live", circleName: "儒布命理文化站", status: "reviewing", submittedAt: "2024-06-12" },
]

const mockJoinApps: JoinApplication[] = [
  { id: "j1", circleName: "紫微斗数高阶班", status: "reviewing", submittedAt: "2024-06-13" },
  { id: "j2", circleName: "风水堪舆交流会", status: "approved", submittedAt: "2024-06-05" },
  {
    id: "j3",
    circleName: "奇门遁甲研修社",
    status: "rejected",
    submittedAt: "2024-05-28",
    rejectReason: "圈子当前仅向有基础的学员开放，欢迎完成入门课程后再申请。",
  },
]

type TabKey = "feature" | "join" | "exit"

function MyApplicationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TabKey) || "feature"
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [reapplyFeature, setReapplyFeature] = useState<FeatureType | null>(null)
  const [rejectDetail, setRejectDetail] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-10">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-lg border-b border-[#E8E0D5] safe-area-pt">
        <div className="flex items-center px-4 h-14 gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-base text-foreground">我的申请</h1>
        </div>
        {/* Tab */}
        <div className="flex px-4">
          {[
            { key: "feature" as const, label: "功能开通" },
            { key: "join" as const, label: "入圈申请" },
            { key: "exit" as const, label: "退出申请" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t.key ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* 功能开通申请 */}
        {tab === "feature" &&
          mockFeatureApps.map((app) => {
            const meta = FEATURE_META[app.feature]
            const display = getStatusDisplay(app.status)
            return (
              <div key={app.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    {app.feature === "ecommerce_live" ? (
                      <ShoppingBag className="w-5 h-5 text-[#C41E3A]" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-[#C9A96E]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{meta.label}</span>
                      <StatusTag status={app.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{app.circleName}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">提交于 {app.submittedAt}</p>

                    {app.status === "reviewing" && (
                      <p className="text-xs text-[#C9A96E] mt-2">预计审核时长 {meta.reviewTime}</p>
                    )}
                    {app.status === "rejected" && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => setRejectDetail(app.rejectReason || "暂不满足开通条件")}
                          className="text-xs text-muted-foreground underline"
                        >
                          驳回原因
                        </button>
                        <button
                          onClick={() => setReapplyFeature(app.feature)}
                          className="text-xs font-medium text-[#C41E3A]"
                        >
                          重新申请
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

        {/* 入圈申请 */}
        {tab === "join" &&
          mockJoinApps.map((app) => (
            <div key={app.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#6B5B9E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{app.circleName}</span>
                    <StatusTag status={app.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">提交于 {app.submittedAt}</p>

                  {app.status === "reviewing" && (
                    <p className="text-xs text-[#C9A96E] mt-2">等待圈主审批中</p>
                  )}
                  {app.status === "approved" && (
                    <button
                      onClick={() => router.push("/circles")}
                      className="text-xs font-medium text-[#3D7A5C] mt-2"
                    >
                      已通过，进入圈子
                    </button>
                  )}
                  {app.status === "rejected" && (
                    <button
                      onClick={() => setRejectDetail(app.rejectReason || "申请未通过")}
                      className="text-xs text-muted-foreground underline mt-2"
                    >
                      查看驳回原因
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        {/* 退出申请 */}
        {tab === "exit" && (
          mockMyExitApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <LogOut className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">暂无退出申请</p>
            </div>
          ) : (
            mockMyExitApps.map((app) => (
              <ExitAppCard key={app.id} app={app} onViewReject={() => setRejectDetail(app.rejectReason || "申请未通过")} />
            ))
          )
        )}
      </div>

      {/* 重新申请弹窗 */}
      {reapplyFeature && (
        <FeatureApplyModal
          feature={reapplyFeature}
          onClose={() => setReapplyFeature(null)}
          onSubmit={() => setReapplyFeature(null)}
        />
      )}

      {/* 驳回原因弹窗 */}
      {rejectDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-8"
          onClick={() => setRejectDetail(null)}
        >
          <div className="w-full max-w-xs bg-card rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="w-12 h-12 rounded-xl bg-[#C41E3A]/10 mx-auto flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-[#C41E3A]" />
              </div>
              <h4 className="font-medium text-center text-foreground">申请未通过</h4>
              <div className="mt-3 p-3 rounded-xl bg-secondary/60">
                <p className="text-xs text-muted-foreground leading-relaxed">{rejectDetail}</p>
              </div>
            </div>
            <button
              onClick={() => setRejectDetail(null)}
              className="w-full py-3 text-sm font-medium text-foreground border-t border-border hover:bg-secondary/30"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <MyApplicationsContent />
    </Suspense>
  )
}

// 状态标签
function StatusTag({ status }: { status: FeatureAuditStatus }) {
  const map: Record<FeatureAuditStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    not_applied: { label: "未申请", cls: "bg-secondary text-muted-foreground", icon: null },
    reviewing: { label: "审核中", cls: "bg-[#C9A96E]/10 text-[#C9A96E]", icon: <Clock className="w-3 h-3" /> },
    approved: { label: "已通过", cls: "bg-[#3D7A5C]/10 text-[#3D7A5C]", icon: <Check className="w-3 h-3" /> },
    rejected: { label: "已驳回", cls: "bg-[#C41E3A]/10 text-[#C41E3A]", icon: <AlertCircle className="w-3 h-3" /> },
  }
  const s = map[status]
  return (
    <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0", s.cls)}>
      {s.icon}
      {s.label}
    </span>
  )
}

// 退出申请卡片（含双向审核进度）
function ExitAppCard({ app, onViewReject }: { app: ExitApplication; onViewReject: () => void }) {
  const display = getExitStageDisplay(app.stage)
  const completedIdx = getCompletedStepIndex(app.stage)
  const isRejected = app.stage === "rejected"
  const toneCls =
    display.tone === "approved"
      ? "bg-[#3D7A5C]/10 text-[#3D7A5C]"
      : display.tone === "rejected"
        ? "bg-[#C41E3A]/10 text-[#C41E3A]"
        : "bg-[#C9A96E]/10 text-[#C9A96E]"

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <LogOut className="w-5 h-5 text-[#C41E3A]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground truncate">{app.circleName}</span>
            <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0", toneCls)}>
              {display.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1">申请于 {app.applyDate}</p>
        </div>
      </div>

      {/* 退款金额 */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Coins className="w-3.5 h-3.5 text-[#C41E3A]" />
        应退金额
        <span className="text-sm font-bold text-[#C41E3A] ml-1">¥{app.breakdown.refundAmount}</span>
        <span className="text-[11px] text-muted-foreground/70">（已用 {app.breakdown.usedDays} 天）</span>
      </div>

      {/* 被驳回 */}
      {isRejected ? (
        <div className="mt-3 p-3 rounded-xl bg-[#C41E3A]/5 border border-[#C41E3A]/10">
          <p className="text-xs text-[#C41E3A]">
            {app.rejectBy === "owner" ? "圈主驳回" : "平台驳回"}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={onViewReject} className="text-xs text-muted-foreground underline">
              查看驳回原因
            </button>
            <button
              onClick={() => {}}
              className="text-xs font-medium text-[#C41E3A]"
            >
              重新申请
            </button>
          </div>
        </div>
      ) : (
        // 双向审核进度条
        <div className="mt-4 flex items-center">
          {EXIT_FLOW_STEPS.map((step, idx) => {
            const reached = idx <= completedIdx
            const isCurrent = idx === completedIdx + 1
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-colors",
                      reached
                        ? "bg-[#3D7A5C] text-white"
                        : isCurrent
                          ? "bg-[#C9A96E] text-white"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {reached ? <Check className="w-3 h-3" /> : <span className="text-[10px]">{idx + 1}</span>}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] mt-1 whitespace-nowrap",
                      reached || isCurrent ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < EXIT_FLOW_STEPS.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-1 -mt-4", idx < completedIdx ? "bg-[#3D7A5C]" : "bg-secondary")} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 当前状态提示 */}
      {app.stage === "owner_reviewing" && (
        <p className="mt-3 text-xs text-[#C9A96E]">圈主正在审核你的退出申请</p>
      )}
      {app.stage === "platform_reviewing" && (
        <p className="mt-3 text-xs text-[#C9A96E]">圈主已同意，平台审核中</p>
      )}
      {app.stage === "refunding" && (
        <p className="mt-3 text-xs text-[#C9A96E]">审核通过，退款处理中，预计 1-3 个工作日到账</p>
      )}
      {app.stage === "refunded" && (
        <p className="mt-3 text-xs text-[#3D7A5C]">退款 ¥{app.breakdown.refundAmount} 已于 {app.refundedAt} 到账</p>
      )}
    </div>
  )
}
