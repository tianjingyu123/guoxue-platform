'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, UserX, MoreHorizontal, Plus, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { DataState, DataStateSkeleton } from '@/components/data-state'
import { getBlacklist, removeFromBlacklist, searchUsersForBlock, addToBlacklist } from '@/lib/api/blacklist'
import type { BlacklistItem, SearchUserItem } from '@/lib/types/blacklist'

export default function BlacklistPage() {
  const router = useRouter()
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 移除确认弹窗
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<BlacklistItem | null>(null)
  const [removing, setRemoving] = useState(false)
  
  // 添加黑名单 Sheet
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)

  // 加载黑名单
  const loadBlacklist = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getBlacklist()
      if (res.code === 200) {
        setBlacklist(res.data.list)
      } else {
        setError(res.message || '加载失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBlacklist()
  }, [])

  // 搜索用户
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await searchUsersForBlock(searchKeyword)
      if (res.code === 200) {
        setSearchResults(res.data.list)
      }
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchKeyword.trim()) {
        handleSearch()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchKeyword])

  // 移除黑名单
  const handleRemove = async () => {
    if (!selectedUser) return
    setRemoving(true)
    try {
      const res = await removeFromBlacklist(selectedUser.userId)
      if (res.code === 200) {
        setBlacklist(prev => prev.filter(u => u.id !== selectedUser.id))
        setRemoveDialogOpen(false)
        setSelectedUser(null)
      }
    } catch {
      // ignore
    } finally {
      setRemoving(false)
    }
  }

  // 添加到黑名单
  const handleAddToBlacklist = async (user: SearchUserItem) => {
    setAdding(user.id)
    try {
      const res = await addToBlacklist(user.id)
      if (res.code === 200) {
        // 更新搜索结果状态
        setSearchResults(prev => prev.map(u => 
          u.id === user.id ? { ...u, isBlocked: true } : u
        ))
        // 重新加载黑名单
        loadBlacklist()
      }
    } catch {
      // ignore
    } finally {
      setAdding(null)
    }
  }

  // 骨架屏
  const renderSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-3">
            <DataStateSkeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <DataStateSkeleton className="h-4 w-24 mb-2" />
              <DataStateSkeleton className="h-3 w-32" />
            </div>
            <DataStateSkeleton className="h-8 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E8E3D7]">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2D2A26]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2D2A26]">黑名单管理</h1>
          <button onClick={() => setAddSheetOpen(true)} className="p-1 -mr-1">
            <Plus className="w-6 h-6 text-[#C41E3A]" />
          </button>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="p-4">
        <DataState
          loading={loading}
          error={error}
          empty={blacklist.length === 0}
          skeleton={renderSkeleton()}
          emptyIcon={<UserX className="w-12 h-12 text-[#B8B0A4]" />}
          emptyText="暂无黑名单用户"
          emptyDescription="点击右上角添加黑名单"
          onRetry={loadBlacklist}
        >
          <div className="space-y-3">
            {blacklist.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  {/* 头像 */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar} alt={user.nickname} />
                    <AvatarFallback className="bg-[#F5F0E8] text-[#8B7E6A]">
                      {user.nickname.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>

                  {/* 用户信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2D2A26] truncate">
                      {user.nickname}
                    </p>
                    <p className="text-xs text-[#8B7E6A] mt-0.5">
                      {user.blockedAt} 加入黑名单
                    </p>
                    {user.reason && (
                      <p className="text-xs text-[#B8B0A4] mt-0.5 truncate">
                        原因：{user.reason}
                      </p>
                    )}
                  </div>

                  {/* 移除按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#C41E3A] border-[#C41E3A] hover:bg-[#C41E3A]/10"
                    onClick={() => {
                      setSelectedUser(user)
                      setRemoveDialogOpen(true)
                    }}
                  >
                    移出
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 底部提示 */}
          {blacklist.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-[#B8B0A4]">
                共 {blacklist.length} 人在黑名单中
              </p>
              <p className="text-xs text-[#B8B0A4] mt-1">
                黑名单用户无法与您互动
              </p>
            </div>
          )}
        </DataState>
      </main>

      {/* 移除确认弹窗 */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>移出黑名单</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将「{selectedUser?.nickname}」移出黑名单吗？移出后对方可以与您互动。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-[#C41E3A] hover:bg-[#A31830]"
            >
              {removing ? '移出中...' : '确定移出'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加黑名单 Sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle>添加黑名单</SheetTitle>
          </SheetHeader>

          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8B0A4]" />
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索用户昵称"
              className="pl-10 bg-[#FAF8F5] border-[#E8E3D7]"
            />
            {searchKeyword && (
              <button
                onClick={() => {
                  setSearchKeyword('')
                  setSearchResults([])
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-[#B8B0A4]" />
              </button>
            )}
          </div>

          {/* 搜索结果 */}
          <div className="space-y-2 overflow-y-auto max-h-[calc(70vh-140px)]">
            {searching ? (
              <div className="text-center py-8 text-[#8B7E6A]">搜索中...</div>
            ) : searchKeyword && searchResults.length === 0 ? (
              <div className="text-center py-8 text-[#8B7E6A]">
                未找到相关用户
              </div>
            ) : !searchKeyword ? (
              <div className="text-center py-8 text-[#B8B0A4]">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-[#E8E3D7]" />
                <p>输入用户昵称进行搜索</p>
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-lg"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar} alt={user.nickname} />
                    <AvatarFallback className="bg-[#E8E3D7] text-[#8B7E6A]">
                      {user.nickname.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium text-[#2D2A26]">
                    {user.nickname}
                  </span>
                  {user.isBlocked ? (
                    <span className="text-sm text-[#B8B0A4]">已拉黑</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#C41E3A] border-[#C41E3A] hover:bg-[#C41E3A]/10"
                      disabled={adding === user.id}
                      onClick={() => handleAddToBlacklist(user)}
                    >
                      {adding === user.id ? '添加中...' : '拉黑'}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
