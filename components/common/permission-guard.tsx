"use client"

import Link from "next/link"
import { Shield, Crown, Users, Plus } from "lucide-react"
import { UserRole } from "@/lib/permissions"

interface PermissionGuardProps {
  /** 用户当前角色 */
  userRole?: UserRole
  /** 所需的最低角色 */
  requiredRole: UserRole
  /** 功能名称，用于提示 */
  featureName: string
  /** 子组件 - 有权限时显示 */
  children: React.ReactNode
  /** 自定义无权限时的提示内容 */
  customFallback?: React.ReactNode
}

/**
 * 权限守卫组件
 * 根据用户角色决定是否显示内容，无权限时显示引导提示
 */
export function PermissionGuard({
  userRole = "user",
  requiredRole,
  featureName,
  children,
  customFallback,
}: PermissionGuardProps) {
  // 角色优先级
  const rolePriority: Record<UserRole, number> = {
    user: 0,
    station_master: 1,
    operator: 2,
    guest: 3,
    circle_owner: 4,
    offline_teacher: 5,
    platform_admin: 6,
  }

  const hasPermission = rolePriority[userRole] >= rolePriority[requiredRole]

  if (hasPermission) {
    return <>{children}</>
  }

  // 无权限时的默认提示
  if (customFallback) {
    return <>{customFallback}</>
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Shield className="w-16 h-16 text-gold mb-4" />
      <h2 className="text-lg font-semibold text-foreground mb-2">暂无{featureName}权限</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {getPermissionMessage(requiredRole)}
      </p>
      {getActionButton(requiredRole)}
    </div>
  )
}

function getPermissionMessage(role: UserRole): string {
  switch (role) {
    case "circle_owner":
      return "此功能仅限圈主使用。创建自己的圈子即可成为圈主，开始发布内容并获得收益。"
    case "guest":
      return "此功能仅限圈主和嘉宾使用。您可以申请成为圈子嘉宾，或创建自己的圈子。"
    case "station_master":
      return "此功能仅限分站站长使用。如需成为站长，请联系平台运营。"
    case "operator":
      return "此功能仅限运营商使用。如需成为运营商，请联系平台管理员。"
    case "offline_teacher":
      return "此功能仅限线下老师使用。如需开通，请通过文化研究院申请认证。"
    case "platform_admin":
      return "此功能仅限平台管理员使用。"
    default:
      return "您当前没有使用此功能的权限。"
  }
}

function getActionButton(role: UserRole) {
  switch (role) {
    case "circle_owner":
    case "guest":
      return (
        <Link
          href="/circles/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium"
        >
          <Plus className="w-5 h-5" />
          创建圈子
        </Link>
      )
    case "station_master":
    case "operator":
      return (
        <Link
          href="/become-partner"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-xl font-medium"
        >
          <Users className="w-5 h-5" />
          了解合作计划
        </Link>
      )
    case "offline_teacher":
      return (
        <Link
          href="/teacher-certification"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-xl font-medium"
        >
          <Crown className="w-5 h-5" />
          申请认证
        </Link>
      )
    default:
      return null
  }
}

/**
 * 圈主权限守卫 - 快捷组件
 */
export function CircleOwnerGuard({
  children,
  featureName = "此功能",
}: {
  children: React.ReactNode
  featureName?: string
}) {
  // TODO: 从用户上下文获取实际角色
  const userRole: UserRole = "user" // 模拟普通用户

  return (
    <PermissionGuard
      userRole={userRole}
      requiredRole="circle_owner"
      featureName={featureName}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * 内容发布权限守卫 - 圈主或嘉宾可发布
 */
export function ContentPublishGuard({
  children,
  featureName = "发布内容",
}: {
  children: React.ReactNode
  featureName?: string
}) {
  // TODO: 从用户上下文获取实际角色
  const userRole: UserRole = "user" // 模拟普通用户

  return (
    <PermissionGuard
      userRole={userRole}
      requiredRole="guest"
      featureName={featureName}
    >
      {children}
    </PermissionGuard>
  )
}
