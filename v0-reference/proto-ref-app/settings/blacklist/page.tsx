'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserX, Trash2, Search } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface BlockedUser {
  id: string
  name: string
  avatar: string
  blockedAt: string
}

const mockBlocked: BlockedUser[] = [
  { id: '1', name: '用户123456', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80', blockedAt: '2024-01-18' },
  { id: '2', name: '匿名用户', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80', blockedAt: '2024-01-10' },
  { id: '3', name: '神秘访客', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', blockedAt: '2023-12-25' },
]

export default function BlacklistPage() {
  const router = useRouter()
  const [blocked, setBlocked] = useState<BlockedUser[]>(mockBlocked)
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const filtered = blocked.filter(u => u.name.includes(search))

  const unblock = async (id: string) => {
    setRemoving(id)
    await new Promise(r => setTimeout(r, 400))
    setBlocked(prev => prev.filter(u => u.id !== id))
    setRemoving(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">黑名单</h1>
        <span className="ml-auto text-xs text-muted-foreground">{blocked.length} 人</span>
      </header>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索黑名单"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UserX className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{search ? '未找到匹配用户' : '黑名单为空'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">拉黑于 {user.blockedAt}</p>
                </div>
                <button
                  onClick={() => unblock(user.id)}
                  disabled={removing === user.id}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  移除
                </button>
              </div>
            ))}
          </div>
        )}

        {blocked.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            黑名单用户无法查看您的内容或向您发送消息
          </p>
        )}
      </div>
    </div>
  )
}

