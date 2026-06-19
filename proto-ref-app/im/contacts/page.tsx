'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, UserPlus, MessageCircle, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState } from '@/components/data-state'
import { 
  getFriendListWithPinyin, 
  groupFriendsByLetter, 
  searchFriends,
  getLetterIndexList 
} from '@/lib/api/im'
import type { FriendItem, FriendGroup } from '@/lib/types/im'

export default function ContactsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<FriendGroup[]>([])
  const [letterList, setLetterList] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<FriendItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(null)
  const [activeLetterIndex, setActiveLetterIndex] = useState<number>(0)
  
  const listRef = useRef<HTMLDivElement>(null)
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // 加载好友列表
  const loadFriends = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getFriendListWithPinyin()
      if (res.code === 200) {
        const grouped = groupFriendsByLetter(res.data)
        setGroups(grouped)
        setLetterList(getLetterIndexList(grouped))
      } else {
        setError(res.message || '加载失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFriends()
  }, [])

  // 搜索好友
  const handleSearch = async (keyword: string) => {
    setSearchKeyword(keyword)
    if (!keyword.trim()) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const res = await searchFriends(keyword)
      if (res.code === 200) {
        setSearchResults(res.data)
      }
    } finally {
      setIsSearching(false)
    }
  }

  // 滚动到指定字母
  const scrollToLetter = useCallback((letter: string, index: number) => {
    setActiveLetterIndex(index)
    const element = groupRefs.current.get(letter)
    if (element && listRef.current) {
      const containerTop = listRef.current.getBoundingClientRect().top
      const elementTop = element.getBoundingClientRect().top
      const scrollTop = listRef.current.scrollTop + (elementTop - containerTop) - 60
      listRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  }, [])

  // 监听滚动更新活跃字母
  const handleScroll = useCallback(() => {
    if (!listRef.current) return
    const containerTop = listRef.current.getBoundingClientRect().top + 80
    
    let activeIndex = 0
    groups.forEach((group, index) => {
      const element = groupRefs.current.get(group.letter)
      if (element) {
        const elementTop = element.getBoundingClientRect().top
        if (elementTop <= containerTop) {
          activeIndex = index
        }
      }
    })
    setActiveLetterIndex(activeIndex)
  }, [groups])

  // 好友操作弹窗
  const handleFriendAction = (action: 'chat' | 'profile') => {
    if (!selectedFriend) return
    
    if (action === 'chat') {
      router.push(`/im/chat/${selectedFriend.id}`)
    } else {
      router.push(`/user/${selectedFriend.id}`)
    }
    setSelectedFriend(null)
  }

  // 渲染骨架屏
  const renderSkeleton = () => (
    <div className="p-4 space-y-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )

  // 渲染好友项
  const renderFriendItem = (friend: FriendItem) => (
    <div
      key={friend.id}
      onClick={() => setSelectedFriend(friend)}
      className="flex items-center gap-3 p-3 hover:bg-muted/50 active:bg-muted rounded-lg cursor-pointer transition-colors"
    >
      <div className="relative">
        <img
          src={friend.avatar}
          alt={friend.nickname}
          className="w-12 h-12 rounded-full object-cover"
        />
        {friend.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {friend.remark || friend.nickname}
          </span>
          {friend.remark && (
            <span className="text-xs text-muted-foreground">
              ({friend.nickname})
            </span>
          )}
        </div>
        {friend.signature ? (
          <p className="text-sm text-muted-foreground truncate">
            {friend.signature}
          </p>
        ) : friend.lastActiveAt && !friend.isOnline ? (
          <p className="text-xs text-muted-foreground">
            {friend.lastActiveAt}活跃
          </p>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 导航栏 */}
      <header className="sticky top-0 z-20 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">通讯录</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSearch(true)} 
              className="p-2"
            >
              <Search className="w-5 h-5" />
            </button>
            <Link href="/im/add-friend" className="p-2 -mr-2">
              <UserPlus className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 好友列表 */}
        <div 
          ref={listRef} 
          className="flex-1 overflow-y-auto pr-6"
          onScroll={handleScroll}
        >
          <DataState
            data={groups}
            loading={loading}
            error={error}
            onRetry={loadFriends}
            loadingComponent={renderSkeleton()}
            emptyMessage="暂无好友"
            emptyDescription="快去添加好友吧"
          >
            {groups.map((group) => (
              <div 
                key={group.letter}
                ref={(el) => {
                  if (el) groupRefs.current.set(group.letter, el)
                }}
              >
                {/* 字母标题 */}
                <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-4 py-1.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    {group.letter}
                  </span>
                </div>
                {/* 好友列表 */}
                <div className="px-2">
                  {group.friends.map(renderFriendItem)}
                </div>
              </div>
            ))}
          </DataState>
        </div>

        {/* 右侧字母索引条 */}
        {letterList.length > 0 && (
          <div className="absolute right-0 top-0 bottom-0 w-6 flex flex-col items-center justify-center py-2">
            {letterList.map((letter, index) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter, index)}
                className={`w-5 h-5 flex items-center justify-center text-[10px] font-medium transition-colors ${
                  activeLetterIndex === index 
                    ? 'text-primary bg-primary/10 rounded-full' 
                    : 'text-muted-foreground'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 搜索弹层 */}
      <Sheet open={showSearch} onOpenChange={setShowSearch}>
        <SheetContent side="top" className="h-full">
          <SheetHeader className="text-left">
            <SheetTitle>搜索好友</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索昵称、备注"
                value={searchKeyword}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-9"
                autoFocus
              />
              {searchKeyword && (
                <button 
                  onClick={() => {
                    setSearchKeyword('')
                    setSearchResults([])
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 搜索结果 */}
            <div className="mt-4">
              {isSearching ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : searchKeyword ? (
                searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map(renderFriendItem)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    未找到相关好友
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  输入关键词搜索好友
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 好友操作弹窗 */}
      <Sheet open={!!selectedFriend} onOpenChange={(open) => !open && setSelectedFriend(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          {selectedFriend && (
            <>
              <div className="flex items-center gap-4 py-4">
                <div className="relative">
                  <img
                    src={selectedFriend.avatar}
                    alt={selectedFriend.nickname}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {selectedFriend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {selectedFriend.remark || selectedFriend.nickname}
                  </h3>
                  {selectedFriend.remark && (
                    <p className="text-sm text-muted-foreground">
                      昵称: {selectedFriend.nickname}
                    </p>
                  )}
                  {selectedFriend.signature && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedFriend.signature}
                    </p>
                  )}
                  <p className={`text-xs mt-1 ${selectedFriend.isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {selectedFriend.isOnline ? '在线' : selectedFriend.lastActiveAt ? `${selectedFriend.lastActiveAt}活跃` : '离线'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-4">
                <Button
                  onClick={() => handleFriendAction('chat')}
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  发消息
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleFriendAction('profile')}
                  className="gap-2"
                >
                  <User className="w-4 h-4" />
                  查看主页
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
