/**
 * 热卜国学平台 - 高级功能申请与审核机制
 *
 * 核心原则：
 * - 平台资源有限，音视频课程、直播、圈主助理、付费问答、短视频、电商直播
 *   等高级功能需要圈主/站长向平台后台申请，审核通过后才能使用。
 * - 未审核通过前，用户只能看到"申请开通"入口，不能直接使用功能。
 * - 后期平台会根据运营数据自动判定是否满足开通条件（由后端实现），
 *   前端只需预留申请入口与审核状态展示。
 */

// ============================================
// 高级功能类型
// ============================================

export type FeatureType =
  | "av_course" // 音视频课程（圈主申请）
  | "live" // 直播-知识授课（圈主申请）
  | "ai_assistant" // 圈主助理-AI智能体（圈主申请）
  | "paid_qa" // 付费问答（圈主申请）
  | "short_video" // 短视频发布（圈主申请）
  | "ecommerce_live" // 电商直播（分站站长申请）

// ============================================
// 审核状态
// ============================================

export type FeatureAuditStatus =
  | "not_applied" // 未申请 - 展示"申请开通"
  | "reviewing" // 审核中 - 置灰不可点击
  | "approved" // 已通过 - 展示正常功能入口
  | "rejected" // 已驳回 - 展示驳回原因 + 重新申请

// ============================================
// 功能元信息
// ============================================

export interface FeatureMeta {
  type: FeatureType
  label: string
  description: string
  /** 申请主体 */
  applicant: "circle_owner" | "station_owner"
  /** 预计审核时长文案 */
  reviewTime: string
}

export const FEATURE_META: Record<FeatureType, FeatureMeta> = {
  av_course: {
    type: "av_course",
    label: "音视频课程",
    description: "开通后可发布音频、视频形式的系统课程",
    applicant: "circle_owner",
    reviewTime: "1-3 个工作日",
  },
  live: {
    type: "live",
    label: "直播授课",
    description: "开通后可在圈内发起知识授课直播",
    applicant: "circle_owner",
    reviewTime: "1-3 个工作日",
  },
  ai_assistant: {
    type: "ai_assistant",
    label: "圈主助理",
    description: "开通后可启用 AI 智能体自动回复成员问题",
    applicant: "circle_owner",
    reviewTime: "1-3 个工作日",
  },
  paid_qa: {
    type: "paid_qa",
    label: "付费问答",
    description: "开通后成员可向你发起付费提问",
    applicant: "circle_owner",
    reviewTime: "1-3 个工作日",
  },
  short_video: {
    type: "short_video",
    label: "短视频",
    description: "开通后可发布短视频内容",
    applicant: "circle_owner",
    reviewTime: "1-3 个工作日",
  },
  ecommerce_live: {
    type: "ecommerce_live",
    label: "电商直播",
    description: "开通后可在分站发起电商带货直播",
    applicant: "station_owner",
    reviewTime: "3-5 个工作日",
  },
}

// ============================================
// 功能开通状态记录
// ============================================

export interface FeaturePermission {
  type: FeatureType
  status: FeatureAuditStatus
  /** 提交申请的时间 */
  appliedAt?: string
  /** 驳回原因（status=rejected 时） */
  rejectReason?: string
}

// ============================================
// 状态展示辅助
// ============================================

export interface StatusDisplay {
  label: string
  /** 按钮/标签是否可点击 */
  actionable: boolean
  /** 文字颜色类 */
  textClass: string
  /** 背景类（用于标签） */
  bgClass: string
}

export function getStatusDisplay(status: FeatureAuditStatus): StatusDisplay {
  switch (status) {
    case "not_applied":
      return {
        label: "申请开通",
        actionable: true,
        textClass: "text-muted-foreground",
        bgClass: "bg-secondary",
      }
    case "reviewing":
      return {
        label: "审核中",
        actionable: false,
        textClass: "text-[#C9A96E]",
        bgClass: "bg-[#C9A96E]/10",
      }
    case "approved":
      return {
        label: "已开通",
        actionable: true,
        textClass: "text-[#3D7A5C]",
        bgClass: "bg-[#3D7A5C]/10",
      }
    case "rejected":
      return {
        label: "重新申请",
        actionable: true,
        textClass: "text-[#C41E3A]",
        bgClass: "bg-[#C41E3A]/10",
      }
  }
}

// ============================================
// Mock 数据 - 当前圈子的功能开通状态
// 实际应从 API 获取。这里覆盖各种状态用于演示完整交互。
// ============================================

export const mockCircleFeatures: Record<FeatureType, FeaturePermission> = {
  // 已开通：音视频课程
  av_course: { type: "av_course", status: "approved", appliedAt: "2024-05-01" },
  // 审核中：直播
  live: { type: "live", status: "reviewing", appliedAt: "2024-06-10" },
  // 已驳回：圈主助理
  ai_assistant: {
    type: "ai_assistant",
    status: "rejected",
    appliedAt: "2024-06-01",
    rejectReason: "当前圈子活跃成员数未达到开通标准（需 ≥ 200 活跃成员），请提升圈子活跃度后重新申请。",
  },
  // 未申请：付费问答
  paid_qa: { type: "paid_qa", status: "not_applied" },
  // 未申请：短视频
  short_video: { type: "short_video", status: "not_applied" },
  // 已开通：电商直播（站长）
  ecommerce_live: { type: "ecommerce_live", status: "not_applied" },
}

/** 自动审核说明文案 */
export const AUTO_REVIEW_TIP = "满足运营条件的圈子将自动通过审核"
