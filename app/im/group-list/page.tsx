'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Users, 
  Bell, 
  BellOff, 
  Pin, 
  LogOut, 
  MoreVertical,
  Crown,
  Shield,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { DataState } from '@/components/data-state'
import { toast } from 'sonner'
import { 
  getGroupList, 
  searchGroups, 
  togglePinGroup, 
  toggleMuteGroup, 
  quitGroup,
  dismissGroup,
  getGroupRoleName
} from '@/lib/api/im'
import type { GroupItem, GroupListResponse } from '@/lib/types/im'

export default function GroupListPage() {
  const router = useRouter()
  const [data, setData] = useState<GroupListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 搜索
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<GroupItem[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  
  // 退出/解散确认
  const [quitConfirm, setQuitConfirm] = useState<GroupItem | null>(null)
  
  // 加载数据
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getGroupList()
      if (res.code === 200) {
        setData(res.data)
      } else {
        setError(res.message)
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [])
  
  // 搜索
  const handleSearch = async (keyword: string) => {
    setSearchKeyword(keyword)
    if (!keyword.trim()) {
      setSearchResults(null)
      return
    }
    
    setIsSearching(true)
    try {
      const res = await searchGroups(keyword)
      if (res.code === 200) {
        setSearchResults(res.data)
      }
    } finally {
      setIsSearching(false)
    }
  }
  
  // 清除搜索
  const clearSearch = () => {
    setSearchKeyword('')
    setSearchResults(null)
  }
  
  // 置顶
  const handleTogglePin = async (group: GroupItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await togglePinGroup(group.id)
      if (res.code === 200) {
        // 更新本地状态
        setData(prev => {
          if (!prev) return prev
          const updated = prev.list.map(g => 
            g.id === group.id ? { ...g, isPinned: res.data.isPinned } : g
          )
          // 重新排序
          updated.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
            return 0
          })
          return { ...prev, list: updated }
        })
        toast.success(res.data.isPinned ? '已置顶' : '已取消置顶')
      }
    } catch {
      toast.error('操作失败')
    }
  }
  
  // 免打扰
  const handleToggleMute = async (group: GroupItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await toggleMuteGroup(group.id)
      if (res.code === 200) {
        setData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            list: prev.list.map(g => 
              g.id === group.id ? { ...g, isMuted: res.data.isMuted } : g
            )
          }
        })
        toast.success(res.data.isMuted ? '已开启免打扰' : '已关闭免打扰')
      }
    } catch {
      toast.error('操作失败')
    }
  }
  
  // 退出/解散群聊
  const handleQuit = async () => {
    if (!quitConfirm) return
    
    try {
      const isOwner = quitConfirm.myRole === 'owner'
      const res = isOwner 
        ? await dismissGroup(quitConfirm.id)
        : await quitGroup(quitConfirm.id)
      
      if (res.code === 200) {
        setData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            list: prev.list.filter(g => g.id !== quitConfirm.id),
            total: prev.total - 1,
          }
        })
        toast.success(res.message)
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setQuitConfirm(null)
    }
  }
  
  // 显示的列表
  const displayList = searchResults ?? data?.list ?? []
  
  // 角色图标
  const RoleIcon = ({ role }: { role: string }) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-amber-500" />
    if (role === 'admin') return <Shield className="w-3 h-3 text-blue-500" />
    return null
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">群聊</h1>
          <Link href="/im/create-group" className="p-2 -mr-2">
            <Plus className="w-5 h-5 text-[#C41E3A]" />
          </Link>
        </div>
      </header>
      
      {/* 搜索框 */}
      <div className="sticky top-14 z-40 bg-[#FAF8F5] p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="搜索群聊"
            className="pl-9 pr-9 bg-white border-gray-200"
          />
          {searchKeyword && (
            <button 
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      
      {/* 群聊列表 */}
      <div className="bg-white">
        <DataState
          loading={loading}
          error={error}
          empty={displayList.length === 0}
          emptyMessage={searchKeyword ? '未找到相关群聊' : '暂无群聊'}
          onRetry={loadData}
        >
          {/* 搜索中 */}
          {isSearching && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 群聊列表 */}
          {!isSearching && (
            <div className="divide-y divide-gray-50">
              {displayList.map((group) => (
                <div 
                  key={group.id}
                  className={`flex items-center gap-3 p-4 active:bg-gray-50 cursor-pointer ${
                    group.isPinned ? 'bg-gray-50/50' : ''
                  }`}
                  onClick={() => router.push(`/im/group-chat/${group.id}`)}
                >
                  {/* 群头像 */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] flex items-center justify-center overflow-hidden">
                      {group.avatar ? (
                        <img 
                          src={group.avatar} 
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-white" />
                      )}
                    </div>
                    {/* 免打扰标识 */}
                    {group.isMuted && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                        <BellOff className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* 群信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium text-gray-900 truncate ${
                        group.unreadCount > 0 && !group.isMuted ? 'font-semibold' : ''
                      }`}>
                        {group.name}
                      </span>
                      <RoleIcon role={group.myRole} />
                      <span className="text-xs text-gray-400">({group.memberCount})</span>
                      {group.isPinned && (
                        <Pin className="w-3 h-3 text-gray-400 shrink-0" />
                      )}
                    </div>
                    {group.lastMessage && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {group.lastMessage.senderName}: {group.lastMessage.content}
                      </p>
                    )}
                  </div>
                  
                  {/* 右侧信息 */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-gray-400">
                      {group.lastMessage?.time}
                    </span>
                    {group.unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className={`h-5 min-w-5 px-1.5 text-xs ${
                          group.isMuted ? 'bg-gray-400' : ''
                        }`}
                      >
                        {group.unreadCount > 99 ? '99+' : group.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  {/* 操作菜单 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 -mr-1.5 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleTogglePin(group, e as unknown as React.MouseEvent)}>
                        <Pin className="w-4 h-4 mr-2" />
                        {group.isPinned ? '取消置顶' : '置顶'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleToggleMute(group, e as unknown as React.MouseEvent)}>
                        {group.isMuted ? (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            关闭免打扰
                          </>
                        ) : (
                          <>
                            <BellOff className="w-4 h-4 mr-2" />
                            开启免打扰
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          setQuitConfirm(group)
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {group.myRole === 'owner' ? '解散群聊' : '退出群聊'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </DataState>
      </div>
      
      {/* 创建群聊浮动按钮 */}
      <Link 
        href="/im/create-group"
        className="fixed bottom-24 right-4 w-14 h-14 bg-[#C41E3A] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-white" />
      </Link>
      
      {/* 退出/解散确认 */}
      <AlertDialog open={!!quitConfirm} onOpenChange={() => setQuitConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {quitConfirm?.myRole === 'owner' ? '解散群聊' : '退出群聊'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {quitConfirm?.myRole === 'owner' 
                ? `确定要解散「${quitConfirm?.name}」吗？解散后所有成员将被移出，且无法恢复。`
                : `确定要退出「${quitConfirm?.name}」吗？退出后将不再接收该群消息。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuit}
              className="bg-red-600 hover:bg-red-700"
            >
              {quitConfirm?.myRole === 'owner' ? '解散' : '退出'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
