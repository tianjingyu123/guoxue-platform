'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, UserPlus, QrCode, Phone, AtSign, Check, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchUser {
  id: string
  name: string
  avatar: string
  bio: string
  mutual: number
  added: boolean
}

const TIPS = [
  { icon: <QrCode className="w-5 h-5" />, label: '扫一扫', desc: '扫描好友二维码' },
  { icon: <Phone className="w-5 h-5" />, label: '手机联系人', desc: '从通讯录添加好友' },
  { icon: <AtSign className="w-5 h-5" />, label: '智玄号', desc: '通过智玄号搜索' },
]

export default function AddFriendPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchUser[]>([])
  const [sending, setSending] = useState<Record<string, boolean>>({})

  const doSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setResults([
      { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', bio: '八字命理研究者，从业二十年', mutual: 12, added: false },
      { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', bio: '紫微斗数专家 · 台湾传承', mutual: 5, added: false },
    ])
    setSearched(true)
    setLoading(false)
  }

  const addFriend = async (id: string) => {
    setSending(prev => ({ ...prev, [id]: true }))
    await new Promise(r => setTimeout(r, 800))
    setResults(prev => prev.map(u => u.id === id ? { ...u, added: true } : u))
    setSending(prev => ({ ...prev, [id]: false }))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">添加好友</h1>
      </header>

      <div className="px-4 pt-4 pb-20">
        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索手机号 / 智玄号 / 昵称" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-9" />
          </div>
          <Button onClick={doSearch} disabled={loading || !query.trim()} className="bg-primary hover:bg-primary/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
          </Button>
        </div>

        {/* Methods */}
        {!searched && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">其他方式</h2>
            <div className="space-y-2">
              {TIPS.map(tip => (
                <button key={tip.label} className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {tip.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tip.label}</p>
                    <p className="text-xs text-muted-foreground">{tip.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {searched && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">搜索结果</h2>
            {results.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground">未找到该用户</p>
            ) : (
              <div className="space-y-3">
                {results.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                      <p className="text-xs text-muted-foreground">{user.mutual} 个共同好友</p>
                    </div>
                    <Button size="sm" variant={user.added ? 'outline' : 'default'} disabled={user.added || sending[user.id]}
                      onClick={() => !user.added && addFriend(user.id)}
                      className={cn(!user.added && 'bg-primary hover:bg-primary/90')}>
                      {sending[user.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : user.added ? <><Check className="w-3.5 h-3.5 mr-1" />已添加</>
                        : <><UserPlus className="w-3.5 h-3.5 mr-1" />添加</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
