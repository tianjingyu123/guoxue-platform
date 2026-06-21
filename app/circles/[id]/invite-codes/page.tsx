"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Copy, Share2, MoreHorizontal, Ban, Trash2, Check, Users, Gift, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock数据
const mockStats = {
  totalInvited: 156,
  usedCodes: 12,
  pendingCodes: 5,
  thisWeek: 23,
}

const mockInviteCodes = [
  {
    id: "1",
    code: "GUOXUE2024A",
    maxUses: 10,
    usedCount: 8,
    status: "active" as const,
    createdAt: "2024-01-15T10:00:00Z",
    usedBy: [
      { id: "1", name: "张三", avatar: "/placeholder.svg?height=32&width=32", usedAt: "2024-01-16" },
      { id: "2", name: "李四", avatar: "/placeholder.svg?height=32&width=32", usedAt: "2024-01-17" },
    ],
  },
  {
    id: "2",
    code: "GUOXUE2024B",
    maxUses: 5,
    usedCount: 5,
    status: "expired" as const,
    createdAt: "2024-01-10T10:00:00Z",
    expiresAt: "2024-01-20T10:00:00Z",
  },
  {
    id: "3",
    code: "VIP888",
    maxUses: 100,
    usedCount: 45,
    status: "active" as const,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "4",
    code: "TEST123",
    maxUses: 3,
    usedCount: 1,
    status: "disabled" as const,
    createdAt: "2024-01-05T10:00:00Z",
  },
]

interface InviteCode {
  id: string
  code: string
  maxUses: number
  usedCount: number
  status: "active" | "disabled" | "expired"
  createdAt: string
  expiresAt?: string
  usedBy?: { id: string; name: string; avatar: string; usedAt: string }[]
}

// 骨架屏
function Skeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-14 bg-white" />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function InviteCodesPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState(mockStats)
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(10)
  const [creating, setCreating] = useState(false)
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setInviteCodes(mockInviteCodes)
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const handleCreateCode = async () => {
    setCreating(true)
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    const newCode: InviteCode = {
      id: Date.now().toString(),
      code: `NEW${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      maxUses: newCodeMaxUses,
      usedCount: 0,
      status: "active",
      createdAt: new Date().toISOString(),
    }
    setInviteCodes([newCode, ...inviteCodes])
    setStats({ ...stats, pendingCodes: stats.pendingCodes + 1 })
    setShowCreateModal(false)
    setCreating(false)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleShareCode = (code: string) => {
    const shareUrl = `${window.location.origin}/circles/${circleId}/join?code=${code}`
    if (navigator.share) {
      navigator.share({ title: "加入圈子", text: `使用邀请码 ${code} 加入圈子`, url: shareUrl })
    } else {
      navigator.clipboard.writeText(shareUrl)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }

  const handleDisableCode = (codeId: string) => {
    setInviteCodes(inviteCodes.map(c => 
      c.id === codeId ? { ...c, status: "disabled" as const } : c
    ))
    setActiveMenu(null)
  }

  const handleDeleteCode = (codeId: string) => {
    setInviteCodes(inviteCodes.filter(c => c.id !== codeId))
    setActiveMenu(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  if (isLoading) return <Skeleton />

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="font-semibold text-[#2C2C2C]">邀请码管理</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 -mr-2 text-[#C41E3A]"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-[#C41E3A] to-[#A01830] rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 opacity-80" />
              <span className="text-sm opacity-80">总邀请人数</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalInvited}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-[#C9A96E]" />
              <span className="text-sm text-[#666666]">本周新增</span>
            </div>
            <div className="text-2xl font-bold text-[#2C2C2C]">{stats.thisWeek}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-[#666666]">已使用码</span>
            </div>
            <div className="text-2xl font-bold text-[#2C2C2C]">{stats.usedCodes}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#C41E3A]" />
              <span className="text-sm text-[#666666]">待使用码</span>
            </div>
            <div className="text-2xl font-bold text-[#2C2C2C]">{stats.pendingCodes}</div>
          </div>
        </div>
      </div>

      {/* 邀请码列表 */}
      <div className="px-4 space-y-3">
        <h2 className="text-sm font-medium text-[#666666]">邀请码列表</h2>
        
        {inviteCodes.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-[#999999]" />
            </div>
            <p className="text-[#666666] mb-4">还没有创建邀请码</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
            >
              创建邀请码
            </button>
          </div>
        ) : (
          inviteCodes.map(code => (
            <div
              key={code.id}
              className={cn(
                "bg-white rounded-xl overflow-hidden shadow-sm",
                code.status === "disabled" && "opacity-60"
              )}
            >
              {/* 邀请码头部 */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg text-[#2C2C2C]">{code.code}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        code.status === "active" && "bg-green-100 text-green-600",
                        code.status === "disabled" && "bg-gray-100 text-gray-500",
                        code.status === "expired" && "bg-orange-100 text-orange-600"
                      )}>
                        {code.status === "active" ? "有效" : code.status === "disabled" ? "已禁用" : "已过期"}
                      </span>
                    </div>
                    <p className="text-sm text-[#999999] mt-1">
                      创建于 {formatDate(code.createdAt)}
                      {code.expiresAt && ` · 过期于 ${formatDate(code.expiresAt)}`}
                    </p>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === code.id ? null : code.id)}
                      className="p-2 hover:bg-[#F5F0E8] rounded-lg"
                    >
                      <MoreHorizontal className="w-5 h-5 text-[#666666]" />
                    </button>
                    
                    {activeMenu === code.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-[#E8E3DB] py-1 z-10 min-w-32">
                        {code.status === "active" && (
                          <button
                            onClick={() => handleDisableCode(code.id)}
                            className="w-full px-4 py-2 text-left text-sm text-[#666666] hover:bg-[#F5F0E8] flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" />
                            禁用
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          className="w-full px-4 py-2 text-left text-sm text-[#C41E3A] hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 使用进度 */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[#666666]">使用进度</span>
                    <span className="text-[#2C2C2C] font-medium">{code.usedCount}/{code.maxUses}</span>
                  </div>
                  <div className="h-2 bg-[#F2EFEA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C41E3A] to-[#E85A5A] rounded-full transition-all"
                      style={{ width: `${(code.usedCount / code.maxUses) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleCopyCode(code.code)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all",
                      copiedCode === code.code
                        ? "bg-green-100 text-green-600"
                        : "bg-[#F5F0E8] text-[#666666]"
                    )}
                  >
                    {copiedCode === code.code ? (
                      <>
                        <Check className="w-4 h-4" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        复制
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleShareCode(code.code)}
                    className="flex-1 py-2 rounded-lg text-sm bg-[#C41E3A] text-white flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    分享
                  </button>
                </div>
              </div>

              {/* 使用记录 */}
              {code.usedBy && code.usedBy.length > 0 && (
                <div className="border-t border-[#E8E3DB]">
                  <button
                    onClick={() => setExpandedCode(expandedCode === code.id ? null : code.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm text-[#666666]"
                  >
                    <span>查看使用记录 ({code.usedBy.length})</span>
                    <svg
                      className={cn("w-4 h-4 transition-transform", expandedCode === code.id && "rotate-180")}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedCode === code.id && (
                    <div className="px-4 pb-4 space-y-2">
                      {code.usedBy.map(user => (
                        <div key={user.id} className="flex items-center gap-3 bg-[#F5F0E8] rounded-lg p-2">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#2C2C2C]">{user.name}</p>
                            <p className="text-xs text-[#999999]">{user.usedAt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 创建邀请码弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-t-2xl animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#E8E3DB]">
              <h3 className="font-semibold text-[#2C2C2C]">生成新邀请码</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1">
                <X className="w-5 h-5 text-[#666666]" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C2C2C] mb-2">最大使用次数</label>
                <div className="flex gap-2">
                  {[5, 10, 20, 50, 100].map(num => (
                    <button
                      key={num}
                      onClick={() => setNewCodeMaxUses(num)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm transition-all",
                        newCodeMaxUses === num
                          ? "bg-[#C41E3A] text-white"
                          : "bg-[#F5F0E8] text-[#666666]"
                      )}
                    >
                      {num}次
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-[#FFF8E6] rounded-lg p-3 text-sm text-[#8B6914]">
                邀请码生成后，被邀请人可通过邀请码直接加入圈子，无需审批
              </div>
            </div>
            
            <div className="p-4 border-t border-[#E8E3DB]">
              <button
                onClick={handleCreateCode}
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E85A5A] text-white rounded-xl font-medium disabled:opacity-50"
              >
                {creating ? "生成中..." : "生成邀请码"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
