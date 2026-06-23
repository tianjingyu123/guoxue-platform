'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, User, GraduationCap, Store, Radio, Sparkles, Lock, ArrowRight, Shield, Award, Building2, MapPin } from 'lucide-react'

interface UserRole {
  id: string
  type: 'student' | 'teacher' | 'merchant' | 'host' | 'creator' | 'station_master' | 'operator' | 'station_manager'
  name: string
  description: string
  icon: 'User' | 'GraduationCap' | 'Store' | 'Radio' | 'Sparkles' | 'Award' | 'Building2' | 'MapPin'
  status: 'active' | 'pending' | 'inactive'
  activatedAt?: string
  workspaceUrl?: string
}

const iconMap = {
  User,
  GraduationCap,
  Store,
  Radio,
  Sparkles,
  Award,
  Building2,
  MapPin,
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  student: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  teacher: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  merchant: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  host: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  creator: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  station_master: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  operator: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  station_manager: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
}

export default function IdentitySwitchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentRoleId, setCurrentRoleId] = useState('role_1')
  const [roles, setRoles] = useState<UserRole[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    // Mock data
    setTimeout(() => {
      setRoles([
        {
          id: 'role_1',
          type: 'student',
          name: '学员',
          description: '学习课程、参与圈子、购买商品',
          icon: 'User',
          status: 'active',
          activatedAt: '2024-01-15',
          workspaceUrl: '/',
        },
        {
          id: 'role_2',
          type: 'teacher',
          name: '讲师',
          description: '创建课程、开设直播、解答问题',
          icon: 'GraduationCap',
          status: 'active',
          activatedAt: '2024-03-20',
          workspaceUrl: '/creator/dashboard',
        },
        {
          id: 'role_3',
          type: 'merchant',
          name: '商家',
          description: '管理店铺、上架商品、处理订单',
          icon: 'Store',
          status: 'pending',
        },
        {
          id: 'role_4',
          type: 'host',
          name: '主播',
          description: '开设直播、获取打赏、粉丝互动',
          icon: 'Radio',
          status: 'inactive',
        },
        {
          id: 'role_5',
          type: 'creator',
          name: '内容创作者',
          description: '发布文章、短视频、知识分享',
          icon: 'Sparkles',
          status: 'active',
          activatedAt: '2024-06-01',
          workspaceUrl: '/creator/content',
        },
        {
          id: 'role_6',
          type: 'station_master',
          name: '分站站长',
          description: '推广平台内容，获取推广佣金',
          icon: 'Award',
          status: 'active',
          activatedAt: '2024-07-10',
          workspaceUrl: '/mine/role-panels/station-master-panel',
        },
        {
          id: 'role_7',
          type: 'operator',
          name: '运营商',
          description: '管理站长团队，获得管理奖与名额收益',
          icon: 'Building2',
          status: 'pending',
        },
        {
          id: 'role_8',
          type: 'station_manager',
          name: '驿站管理者',
          description: '运营线下驿站，开设课程、销售商品、核销签到',
          icon: 'MapPin',
          status: 'active',
          activatedAt: '2024-08-05',
          workspaceUrl: '/offline/manage',
        },
      ])
      setLoading(false)
    }, 800)
  }, [])

  const currentRole = roles.find(r => r.id === currentRoleId)
  const activeRoles = roles.filter(r => r.status === 'active' && r.id !== currentRoleId)
  const pendingRoles = roles.filter(r => r.status === 'pending')
  const inactiveRoles = roles.filter(r => r.status === 'inactive')

  const handleRoleClick = (role: UserRole) => {
    if (role.status === 'active' && role.id !== currentRoleId) {
      setSelectedRole(role)
      setShowConfirm(true)
    } else if (role.status === 'inactive') {
      router.push(`/mine/apply-role?type=${role.type}`)
    }
  }

  const handleSwitch = async () => {
    if (!selectedRole) return
    setSwitching(true)
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setCurrentRoleId(selectedRole.id)
    setSwitching(false)
    setShowConfirm(false)
    if (selectedRole.workspaceUrl) {
      router.push(selectedRole.workspaceUrl)
    }
  }

  // Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center h-14 px-4">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 mx-4 h-5 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          <div className="h-24 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  // 只有一个身份时隐藏入口
  if (roles.filter(r => r.status === 'active').length <= 1 && pendingRoles.length === 0 && inactiveRoles.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-center">当前仅有一个身份</p>
        <button
          onClick={() => router.back()}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm"
        >
          返回
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-medium">身份切换</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Role */}
        {currentRole && (
          <div>
            <h2 className="text-sm text-muted-foreground mb-3">当前身份</h2>
            <div className={`p-4 rounded-2xl border-2 ${roleColors[currentRole.type].border} ${roleColors[currentRole.type].bg}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl ${roleColors[currentRole.type].bg} flex items-center justify-center`}>
                  {(() => {
                    const Icon = iconMap[currentRole.icon]
                    return <Icon className={`w-7 h-7 ${roleColors[currentRole.type].text}`} />
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{currentRole.name}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      当前
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{currentRole.description}</p>
                  {currentRole.activatedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      激活于 {currentRole.activatedAt}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Roles */}
        {activeRoles.length > 0 && (
          <div>
            <h2 className="text-sm text-muted-foreground mb-3">可切换身份</h2>
            <div className="space-y-3">
              {activeRoles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleClick(role)}
                  className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${roleColors[role.type].bg} flex items-center justify-center`}>
                      {(() => {
                        const Icon = iconMap[role.icon]
                        return <Icon className={`w-6 h-6 ${roleColors[role.type].text}`} />
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                          已激活
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pending Roles */}
        {pendingRoles.length > 0 && (
          <div>
            <h2 className="text-sm text-muted-foreground mb-3">审核中</h2>
            <div className="space-y-3">
              {pendingRoles.map(role => (
                <div
                  key={role.id}
                  className="p-4 rounded-2xl bg-card border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                      {(() => {
                        const Icon = iconMap[role.icon]
                        return <Icon className="w-6 h-6 text-amber-600" />
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          审核中
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      您的申请正在审核中，预计1-3个工作日完成
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Roles */}
        {inactiveRoles.length > 0 && (
          <div>
            <h2 className="text-sm text-muted-foreground mb-3">更多身份</h2>
            <div className="space-y-3">
              {inactiveRoles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleClick(role)}
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      {(() => {
                        const Icon = iconMap[role.icon]
                        return <Icon className="w-6 h-6 text-muted-foreground" />
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">{role.name}</span>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          未开通
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground/70 mt-0.5">{role.description}</p>
                    </div>
                    <span className="text-xs text-primary">申请开通</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">身份切换说明</p>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                <li>• 切换身份后，界面将自动跳转至对应工作台</li>
                <li>• 不同身份的数据和权限相互独立</li>
                <li>• 您可以随时切换回其他已激活身份</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Switch Confirm Dialog */}
      {showConfirm && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => !switching && setShowConfirm(false)}>
          <div className="w-full max-w-lg bg-background rounded-t-3xl p-6 pb-safe" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
            
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-2xl ${roleColors[selectedRole.type].bg} flex items-center justify-center mx-auto mb-4`}>
                {(() => {
                  const Icon = iconMap[selectedRole.icon]
                  return <Icon className={`w-8 h-8 ${roleColors[selectedRole.type].text}`} />
                })()}
              </div>
              <h3 className="text-lg font-semibold">切换至「{selectedRole.name}」身份</h3>
              <p className="text-sm text-muted-foreground mt-2">
                切换后将跳转至{selectedRole.name}工作台
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 mb-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">提示：</span>
                切换身份不会影响您在其他身份下的数据，您可以随时切换回来。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={switching}
                className="flex-1 h-12 rounded-xl border border-border text-sm font-medium disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSwitch}
                disabled={switching}
                className={`flex-1 h-12 rounded-xl text-white text-sm font-medium disabled:opacity-50 ${roleColors[selectedRole.type].text.replace('text-', 'bg-')}`}
              >
                {switching ? '切换中...' : '确认切换'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
