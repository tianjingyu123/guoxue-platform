'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  UserPlus, 
  Clock,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { DataState } from '@/components/data-state'
import { 
  getFriendRequests, 
  approveFriendRequest, 
  rejectFriendRequest,
  approveAllFriendRequests
} from '@/lib/api/im'
import type { FriendRequestItem, FriendRequestsResponse } from '@/lib/types/im'

export default function FriendRequestsPage() {
  const router = useRouter()
  
  // 数据状态
  const [data, setData] = useState<FriendRequestsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI 状态
  const [showProcessed, setShowProcessed] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
  const [approveAllLoading, setApproveAllLoading] = useState(false)
  
  // 拒绝弹窗
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean
    requestId: number | null
    userName: string
  }>({ open: false, requestId: null, userName: '' })
  const [rejectReason, setRejectReason] = useState('')
  
  // 加载数据
  useEffect(() => {
    loadData()
  }, [])
  
  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const res = await getFriendRequests()
      if (res.code === 200) {
        setData(res.data)
      } else {
        setError(res.message || '加载失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }
  
  // 同意请求
  async function handleApprove(request: FriendRequestItem) {
    setProcessingIds(prev => new Set(prev).add(request.id))
    try {
      const res = await approveFriendRequest(request.id)
      if (res.code === 200) {
        toast.success(`已添加 ${request.fromUser.nickname} 为好友`)
        // 更新本地状态
        setData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            pending: prev.pending.filter(r => r.id !== request.id),
            processed: [{ ...request, status: 'approved', processedAt: new Date().toISOString() } as FriendRequestItem, ...prev.processed],
            totalPending: prev.totalPending - 1,
          }
        })
      } else {
        toast.error(res.message || '操作失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(request.id)
        return next
      })
    }
  }
  
  // 打开拒绝弹窗
  function openRejectDialog(request: FriendRequestItem) {
    setRejectDialog({
      open: true,
      requestId: request.id,
      userName: request.fromUser.nickname,
    })
    setRejectReason('')
  }
  
  // 确认拒绝
  async function handleReject() {
    if (!rejectDialog.requestId) return
    
    setProcessingIds(prev => new Set(prev).add(rejectDialog.requestId!))
    setRejectDialog(prev => ({ ...prev, open: false }))
    
    try {
      const res = await rejectFriendRequest(rejectDialog.requestId, rejectReason || undefined)
      if (res.code === 200) {
        toast.success('已拒绝请求')
        // 更新本地状态
        setData(prev => {
          if (!prev) return prev
          const request = prev.pending.find(r => r.id === rejectDialog.requestId)
          if (!request) return prev
          return {
            ...prev,
            pending: prev.pending.filter(r => r.id !== rejectDialog.requestId),
            processed: [{ 
              ...request, 
              status: 'rejected', 
              processedAt: new Date().toISOString(),
              rejectReason: rejectReason || undefined 
            } as FriendRequestItem, ...prev.processed],
            totalPending: prev.totalPending - 1,
          }
        })
      } else {
        toast.error(res.message || '操作失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(rejectDialog.requestId!)
        return next
      })
    }
  }
  
  // 全部同意
  async function handleApproveAll() {
    if (!data || data.pending.length === 0) return
    
    setApproveAllLoading(true)
    try {
      const requestIds = data.pending.map(r => r.id)
      const res = await approveAllFriendRequests(requestIds)
      if (res.code === 200) {
        toast.success(res.message || `已添加${res.data.successCount}位好友`)
        // 更新本地状态
        setData(prev => {
          if (!prev) return prev
          const now = new Date().toISOString()
          return {
            ...prev,
            pending: [],
            processed: [
              ...prev.pending.map(r => ({ ...r, status: 'approved' as const, processedAt: now })),
              ...prev.processed,
            ],
            totalPending: 0,
          }
        })
      } else {
        toast.error(res.message || '操作失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setApproveAllLoading(false)
    }
  }
  
  // 获取状态图标
  function getStatusIcon(status: string) {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }
  
  // 获取状态文本
  function getStatusText(status: string) {
    switch (status) {
      case 'approved':
        return '已同意'
      case 'rejected':
        return '已拒绝'
      case 'expired':
        return '已过期'
      default:
        return '待处理'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-medium">好友请求</h1>
          <div className="w-9" />
        </div>
      </header>

      <DataState
        loading={loading}
        error={error}
        empty={!data || (data.pending.length === 0 && data.processed.length === 0)}
        emptyMessage="暂无好友请求"
        emptyIcon={<UserPlus className="w-12 h-12 text-muted-foreground" />}
        onRetry={loadData}
      >
        <div className="pb-6">
          {/* 待处理请求 */}
          {data && data.pending.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  待处理 ({data.pending.length})
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleApproveAll}
                  disabled={approveAllLoading}
                  className="text-primary"
                >
                  {approveAllLoading ? '处理中...' : '全部同意'}
                </Button>
              </div>
              
              <div className="divide-y">
                {data.pending.map(request => (
                  <div 
                    key={request.id}
                    className="flex items-start gap-3 p-4 bg-background"
                  >
                    {/* 头像 */}
                    <Link href={`/user/${request.fromUser.id}`}>
                      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
                        <img 
                          src={request.fromUser.avatar} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {request.fromUser.nickname}
                        </span>
                      </div>
                      
                      {request.fromUser.signature && (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {request.fromUser.signature}
                        </p>
                      )}
                      
                      {request.message && (
                        <p className="text-sm text-foreground/80 mb-2">
                          {request.message}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        {request.createdAt}
                      </p>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRejectDialog(request)}
                        disabled={processingIds.has(request.id)}
                        className="h-8 px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request)}
                        disabled={processingIds.has(request.id)}
                        className="h-8 px-3 bg-primary"
                      >
                        {processingIds.has(request.id) ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 已处理请求 */}
          {data && data.processed.length > 0 && (
            <div>
              <button
                onClick={() => setShowProcessed(!showProcessed)}
                className="flex items-center justify-between w-full px-4 py-3 bg-muted/30"
              >
                <span className="text-sm text-muted-foreground">
                  已处理 ({data.processed.length})
                </span>
                {showProcessed ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {showProcessed && (
                <div className="divide-y">
                  {data.processed.map(request => (
                    <div 
                      key={request.id}
                      className="flex items-start gap-3 p-4 bg-background opacity-70"
                    >
                      {/* 头像 */}
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                        <img 
                          src={request.fromUser.avatar} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">
                            {request.fromUser.nickname}
                          </span>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(request.status)}
                            <span className="text-xs text-muted-foreground">
                              {getStatusText(request.status)}
                            </span>
                          </div>
                        </div>
                        
                        {request.message && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {request.message}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          {request.processedAt || request.createdAt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* 空态 - 仅待处理为空 */}
          {data && data.pending.length === 0 && data.processed.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                暂无待处理的好友请求
              </p>
            </div>
          )}
        </div>
      </DataState>
      
      {/* 拒绝确认弹窗 */}
      <AlertDialog 
        open={rejectDialog.open} 
        onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[90%] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>拒绝好友请求</AlertDialogTitle>
            <AlertDialogDescription>
              确定要拒绝 {rejectDialog.userName} 的好友请求吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-2">
            <Textarea
              placeholder="可选：填写拒绝理由"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive hover:bg-destructive/90">
              拒绝
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 骨架屏 */}
      {loading && (
        <div className="absolute inset-0 top-14 bg-background">
          <div className="px-4 py-3 bg-muted/30">
            <Skeleton className="h-4 w-20" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 p-4 border-b">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded" />
                <Skeleton className="w-8 h-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
