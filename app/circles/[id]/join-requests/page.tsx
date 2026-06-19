"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Check, X, Users, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

// Types
interface JoinRequest {
  id: string
  user: {
    id: string
    name: string
    avatar: string
    bio?: string
  }
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  processedAt?: string
  rejectReason?: string
}

// Mock data
const mockRequests: JoinRequest[] = [
  {
    id: "1",
    user: { id: "u1", name: "张三", avatar: "/placeholder.svg?height=48&width=48", bio: "命理爱好者，学习八字3年" },
    reason: "对八字命理非常感兴趣，希望能加入圈子与各位老师交流学习，提升自己的命理水平。",
    status: "pending",
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    user: { id: "u2", name: "李四", avatar: "/placeholder.svg?height=48&width=48", bio: "风水师，从业5年" },
    reason: "想与圈内同好交流风水心得，分享实战经验。",
    status: "pending",
    createdAt: "2024-01-15T09:20:00Z",
  },
  {
    id: "3",
    user: { id: "u3", name: "王五", avatar: "/placeholder.svg?height=48&width=48" },
    reason: "朋友推荐的圈子，想来学习。",
    status: "pending",
    createdAt: "2024-01-14T18:45:00Z",
  },
  {
    id: "4",
    user: { id: "u4", name: "赵六", avatar: "/placeholder.svg?height=48&width=48", bio: "国学爱好者" },
    reason: "希望学习传统文化知识",
    status: "approved",
    createdAt: "2024-01-13T14:00:00Z",
    processedAt: "2024-01-13T16:30:00Z",
  },
  {
    id: "5",
    user: { id: "u5", name: "钱七", avatar: "/placeholder.svg?height=48&width=48" },
    reason: "...",
    status: "rejected",
    createdAt: "2024-01-12T11:00:00Z",
    processedAt: "2024-01-12T15:00:00Z",
    rejectReason: "申请理由过于简单",
  },
]

// 骨架屏
function RequestSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-[#F2EFEA] rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#F2EFEA] rounded w-24" />
              <div className="h-3 bg-[#F2EFEA] rounded w-32" />
            </div>
          </div>
          <div className="mt-3 h-4 bg-[#F2EFEA] rounded w-full" />
          <div className="mt-2 h-4 bg-[#F2EFEA] rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

// 申请卡片
function RequestCard({ 
  request, 
  isSelected,
  onSelect,
  onApprove,
  onReject,
  expanded,
  onToggleExpand,
}: { 
  request: JoinRequest
  isSelected: boolean
  onSelect: () => void
  onApprove: () => void
  onReject: () => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const isPending = request.status === 'pending'
  const isApproved = request.status === 'approved'
  const isRejected = request.status === 'rejected'
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }
  
  return (
    <div className={cn(
      "bg-white rounded-xl overflow-hidden transition-all",
      isPending ? "shadow-[0_2px_12px_rgba(0,0,0,0.06)]" : "opacity-70",
      isSelected && "ring-2 ring-[#C41E3A]"
    )}>
      {/* 头部 */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 选择框（仅待审批显示） */}
          {isPending && (
            <button
              onClick={onSelect}
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors",
                isSelected 
                  ? "bg-[#C41E3A] border-[#C41E3A]" 
                  : "border-[#D9D9D9] hover:border-[#C41E3A]"
              )}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </button>
          )}
          
          {/* 用户信息 */}
          <img
            src={request.user.avatar}
            alt={request.user.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#2C2C2C]">{request.user.name}</span>
              {!isPending && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  isApproved ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                )}>
                  {isApproved ? "已通过" : "已拒绝"}
                </span>
              )}
            </div>
            {request.user.bio && (
              <p className="text-xs text-[#999999] mt-0.5 truncate">{request.user.bio}</p>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs text-[#999999]">
              <Clock className="w-3 h-3" />
              <span>{formatTime(request.createdAt)}</span>
            </div>
          </div>
          
          {/* 展开按钮 */}
          <button 
            onClick={onToggleExpand}
            className="p-1 text-[#999999] hover:text-[#666666]"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        
        {/* 申请理由 */}
        <div className="mt-3 pl-8">
          <p className="text-sm text-[#666666]">
            <span className="text-[#999999]">申请理由：</span>
            {request.reason}
          </p>
        </div>
        
        {/* 展开详情 */}
        {expanded && (
          <div className="mt-3 pl-8 pt-3 border-t border-[#F2EFEA] space-y-2">
            <div className="text-xs text-[#999999]">
              申请时间：{new Date(request.createdAt).toLocaleString('zh-CN')}
            </div>
            {request.processedAt && (
              <div className="text-xs text-[#999999]">
                处理时间：{new Date(request.processedAt).toLocaleString('zh-CN')}
              </div>
            )}
            {request.rejectReason && (
              <div className="text-xs text-red-500">
                拒绝原因：{request.rejectReason}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 操作按钮（仅待审批显示） */}
      {isPending && (
        <div className="flex border-t border-[#F2EFEA]">
          <button
            onClick={onReject}
            className="flex-1 py-3 text-sm text-[#666666] hover:bg-[#F5F0E8] transition-colors flex items-center justify-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            拒绝
          </button>
          <div className="w-px bg-[#F2EFEA]" />
          <button
            onClick={onApprove}
            className="flex-1 py-3 text-sm text-[#C41E3A] hover:bg-red-50 transition-colors flex items-center justify-center gap-1 font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            通过
          </button>
        </div>
      )}
    </div>
  )
}

// 拒绝原因弹窗
function RejectModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-[85%] max-w-sm p-5">
        <h3 className="text-lg font-semibold text-[#2C2C2C] mb-4">拒绝申请</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="请输入拒绝原因（选填）"
          className="w-full h-24 p-3 border border-[#E8E3DB] rounded-lg text-sm resize-none focus:outline-none focus:border-[#C41E3A]"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#E8E3DB] text-[#666666] text-sm"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm(reason)
              setReason("")
            }}
            className="flex-1 py-2.5 rounded-lg bg-[#C41E3A] text-white text-sm"
          >
            确认拒绝
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JoinRequestsPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [filter, setFilter] = useState<'pending' | 'processed'>('pending')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [isBatchMode, setIsBatchMode] = useState(false)
  
  useEffect(() => {
    // TODO: 调用 circleApi.listJoinRequests
    setTimeout(() => {
      setRequests(mockRequests)
      setIsLoading(false)
    }, 800)
  }, [circleId])
  
  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')
  const displayRequests = filter === 'pending' ? pendingRequests : processedRequests
  
  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  
  const handleSelectAll = () => {
    if (selectedIds.size === pendingRequests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingRequests.map(r => r.id)))
    }
  }
  
  const handleApprove = async (id: string) => {
    // TODO: 调用 circleApi.approveJoinRequest
    setRequests(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'approved' as const, processedAt: new Date().toISOString() } : r
    ))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }
  
  const handleReject = async (id: string, reason: string) => {
    // TODO: 调用 circleApi.rejectJoinRequest
    setRequests(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'rejected' as const, processedAt: new Date().toISOString(), rejectReason: reason || undefined } : r
    ))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setRejectingId(null)
  }
  
  const handleBatchApprove = async () => {
    // TODO: 调用 circleApi.batchApproveRequests
    const ids = Array.from(selectedIds)
    setRequests(prev => prev.map(r => 
      ids.includes(r.id) ? { ...r, status: 'approved' as const, processedAt: new Date().toISOString() } : r
    ))
    setSelectedIds(new Set())
    setIsBatchMode(false)
  }
  
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#F2EFEA]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">入圈申请</h1>
          <div className="w-8" />
        </div>
        
        {/* 统计信息 */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-[#C41E3A]/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#C41E3A]/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#C41E3A]" />
            </div>
            <div>
              <div className="text-lg font-bold text-[#C41E3A]">{pendingRequests.length}</div>
              <div className="text-xs text-[#999999]">待审批</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#E8E3DB]" />
          <div>
            <div className="text-lg font-bold text-[#2C2C2C]">{processedRequests.length}</div>
            <div className="text-xs text-[#999999]">已处理</div>
          </div>
        </div>
        
        {/* 筛选Tab */}
        <div className="flex border-b border-[#F2EFEA]">
          {[
            { key: 'pending', label: '待审批' },
            { key: 'processed', label: '已处理' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key as typeof filter)
                setSelectedIds(new Set())
                setIsBatchMode(false)
              }}
              className={cn(
                "flex-1 py-3 text-sm font-medium relative transition-colors",
                filter === tab.key ? "text-[#C41E3A]" : "text-[#999999]"
              )}
            >
              {tab.label}
              {filter === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* 批量操作栏 */}
      {filter === 'pending' && pendingRequests.length > 0 && (
        <div className="sticky top-[142px] z-30 bg-[#FAF8F5] px-4 py-2 flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-[#666666]"
          >
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
              selectedIds.size === pendingRequests.length && pendingRequests.length > 0
                ? "bg-[#C41E3A] border-[#C41E3A]" 
                : "border-[#D9D9D9]"
            )}>
              {selectedIds.size === pendingRequests.length && pendingRequests.length > 0 && (
                <Check className="w-2.5 h-2.5 text-white" />
              )}
            </div>
            全选
          </button>
          
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchApprove}
              className="px-4 py-1.5 bg-[#C41E3A] text-white text-sm rounded-full"
            >
              批量通过 ({selectedIds.size})
            </button>
          )}
        </div>
      )}
      
      {/* 申请列表 */}
      {isLoading ? (
        <RequestSkeleton />
      ) : displayRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#F2EFEA] flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[#CCCCCC]" />
          </div>
          <p className="text-[#999999]">
            {filter === 'pending' ? "暂无待审批申请" : "暂无已处理申请"}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {displayRequests.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              isSelected={selectedIds.has(request.id)}
              onSelect={() => handleSelect(request.id)}
              onApprove={() => handleApprove(request.id)}
              onReject={() => setRejectingId(request.id)}
              expanded={expandedId === request.id}
              onToggleExpand={() => setExpandedId(expandedId === request.id ? null : request.id)}
            />
          ))}
        </div>
      )}
      
      {/* 拒绝原因弹窗 */}
      <RejectModal
        isOpen={!!rejectingId}
        onClose={() => setRejectingId(null)}
        onConfirm={(reason) => rejectingId && handleReject(rejectingId, reason)}
      />
    </div>
  )
}
