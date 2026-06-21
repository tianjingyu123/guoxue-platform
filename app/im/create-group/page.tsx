'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Check, Camera, Users, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Friend {
  id: string
  name: string
  avatar: string
  bio: string
}

const friends: Friend[] = [
  { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', bio: '八字命理' },
  { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', bio: '紫微斗数' },
  { id: '3', name: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', bio: '易经占卜' },
  { id: '4', name: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', bio: '风水堪舆' },
  { id: '5', name: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', bio: '奇门遁甲' },
  { id: '6', name: '陈梅花', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', bio: '梅花易数' },
]

export default function CreateGroupPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const [step, setStep] = useState<'select' | 'name'>('select')
  const [loading, setLoading] = useState(false)

  const filtered = friends.filter(f => f.name.includes(search) || f.bio.includes(search))

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const nextStep = () => {
    if (selected.length < 2) return
    const names = friends.filter(f => selected.includes(f.id)).map(f => f.name).join('、')
    setGroupName(names.length > 15 ? names.slice(0, 15) + '…' : names)
    setStep('name')
  }

  const create = async () => {
    if (!groupName.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    router.push('/im/conversations')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => step === 'name' ? setStep('select') : router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground flex-1">
          {step === 'select' ? '创建群聊' : '群聊设置'}
        </h1>
        {step === 'select' && selected.length >= 2 && (
          <button onClick={nextStep} className="text-primary text-sm font-medium">下一步</button>
        )}
      </header>

      {step === 'select' ? (
        <div className="px-4 pt-4 pb-24">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索好友" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {selected.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">已选 {selected.length} 人（至少选 2 人）</p>
              <div className="flex gap-2 flex-wrap">
                {friends.filter(f => selected.includes(f.id)).map(f => (
                  <button key={f.id} onClick={() => toggle(f.id)} className="relative">
                    <Avatar className="w-10 h-10"><AvatarImage src={f.avatar} /><AvatarFallback>{f.name[0]}</AvatarFallback></Avatar>
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map(friend => (
              <button key={friend.id} onClick={() => toggle(friend.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card text-left hover:bg-muted/20 transition-colors">
                <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  selected.includes(friend.id) ? 'bg-primary border-primary' : 'border-border')}>
                  {selected.includes(friend.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={friend.avatar} />
                  <AvatarFallback>{friend.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{friend.name}</p>
                  <p className="text-xs text-muted-foreground">{friend.bio}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 pt-6 pb-24 space-y-6">
          {/* Group avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-muted/80 transition-colors cursor-pointer">
              <Camera className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">群头像</span>
            </div>
            <div className="flex gap-1 flex-wrap justify-center max-w-xs">
              {friends.filter(f => selected.includes(f.id)).map(f => (
                <Avatar key={f.id} className="w-7 h-7">
                  <AvatarImage src={f.avatar} />
                  <AvatarFallback>{f.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>

          {/* Group name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">群聊名称</label>
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="设置群聊名称" maxLength={20} />
            <p className="text-xs text-muted-foreground text-right mt-1">{groupName.length}/20</p>
          </div>

          {/* Members count */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">群成员：{selected.length + 1} 人（含自己）</span>
          </div>
        </div>
      )}

      {step === 'name' && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-background border-t border-border">
          <Button onClick={create} disabled={loading || !groupName.trim()} className="w-full bg-primary hover:bg-primary/90 h-12 text-base">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />创建中…</> : '创建群聊'}
          </Button>
        </div>
      )}

      {step === 'select' && selected.length >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-background border-t border-border">
          <Button onClick={nextStep} className="w-full bg-primary hover:bg-primary/90 h-12 text-base">
            下一步（已选 {selected.length} 人）
          </Button>
        </div>
      )}
    </div>
  )
}
