'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  MoreVertical, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  Plus, 
  Camera,
  Users,
  Bell,
  ChevronRight,
  X,
  AtSign,
  Crown,
  Shield,
  Loader2,
  Copy,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { DataState } from '@/components/data-state'
import { 
  getGroupDetail,
  getGroupChatHistory,
  sendGroupMessage,
  getGroupMembers,
  searchGroupMembersForAt,
  withdrawGroupMessage,
  getGroupRoleName,
  formatMessageTime,
  shouldShowTimeLabel,
  canWithdrawMessage
} from '@/lib/api/im'
import type { 
  GroupDetail, 
  GroupChatMessage, 
  GroupMember,
  MessageContentType
} from '@/lib/types/im'

export default function GroupChatPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.id)
  
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null)
  const [messages, setMessages] = useState<GroupChatMessage[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMorePanel, setShowMorePanel] = useState(false)
  const [showMembersSheet, setShowMembersSheet] = useState(false)
  const [showNoticeSheet, setShowNoticeSheet] = useState(false)
  const [showAtList, setShowAtList] = useState(false)
  const [atSearchKeyword, setAtSearchKeyword] = useState('')
  const [atSearchResults, setAtSearchResults] = useState<GroupMember[]>([])
  const [selectedAtMembers, setSelectedAtMembers] = useState<number[]>([])
  const [selectedMessage, setSelectedMessage] = useState<GroupChatMessage | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentUserId = 0

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [detailRes, historyRes, membersRes] = await Promise.all([
          getGroupDetail(groupId),
          getGroupChatHistory(groupId),
          getGroupMembers(groupId)
        ])
        
        if (detailRes.code === 200 && detailRes.data) {
          setGroupDetail(detailRes.data)
        }
        if (historyRes.code === 200 && historyRes.data) {
          setMessages(historyRes.data.messages)
        }
        if (membersRes.code === 200 && membersRes.data) {
          setMembers(membersRes.data)
        }
      } catch (err) {
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [groupId])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 搜索@成员
  useEffect(() => {
    if (!showAtList) return
    async function search() {
      const res = await searchGroupMembersForAt(groupId, atSearchKeyword)
      if (res.code === 200 && res.data) {
        setAtSearchResults(res.data.filter(m => m.id !== currentUserId))
      }
    }
    search()
  }, [showAtList, atSearchKeyword, groupId])

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputText.trim() && selectedAtMembers.length === 0) return
    
    setSending(true)
    try {
      const res = await sendGroupMessage({
        groupId,
        type: 'text' as MessageContentType,
        content: inputText,
        atMembers: selectedAtMembers.length > 0 ? selectedAtMembers : undefined,
      })
      
      if (res.code === 200 && res.data) {
        const newMessage: GroupChatMessage = {
          id: res.data.messageId,
          senderId: currentUserId,
          senderName: '我',
          senderAvatar: '/placeholder.svg',
          senderRole: groupDetail?.myRole,
          type: 'text',
          content: inputText,
          atMembers: selectedAtMembers.length > 0 ? selectedAtMembers : undefined,
          status: 'sending',
          isWithdrawn: false,
          createdAt: new Date().toLocaleString('zh-CN'),
          timestamp: res.data.timestamp,
        }
        setMessages(prev => [...prev, newMessage])
        setInputText('')
        setSelectedAtMembers([])
        
        // 模拟发送成功
        setTimeout(() => {
          setMessages(prev => 
            prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m)
          )
        }, 500)
      }
    } catch (err) {
      toast.error('发送失败')
    } finally {
      setSending(false)
    }
  }, [inputText, selectedAtMembers, groupId, groupDetail?.myRole])

  // 选择@成员
  const handleSelectAtMember = (member: GroupMember) => {
    if (!selectedAtMembers.includes(member.id)) {
      setSelectedAtMembers(prev => [...prev, member.id])
      setInputText(prev => prev + `@${member.nickname} `)
    }
    setShowAtList(false)
    setAtSearchKeyword('')
    inputRef.current?.focus()
  }

  // @所有人
  const handleAtAll = () => {
    setInputText(prev => prev + '@所有人 ')
    setShowAtList(false)
    inputRef.current?.focus()
  }

  // 撤回消息
  const handleWithdraw = async (message: GroupChatMessage) => {
    const res = await withdrawGroupMessage(groupId, message.id)
    if (res.code === 200) {
      setMessages(prev => 
        prev.map(m => m.id === message.id ? { ...m, isWithdrawn: true } : m)
      )
      toast.success('消息已撤回')
    }
    setSelectedMessage(null)
  }

  // 复制消息
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('已复制')
    setSelectedMessage(null)
  }

  // 获取在线人数
  const onlineCount = members.filter((_, i) => i % 3 === 0).length

  // 渲染消息气泡
  const renderMessage = (message: GroupChatMessage, index: number) => {
    const isMe = message.senderId === currentUserId
    const prevMessage = messages[index - 1]
    const showTime = shouldShowTimeLabel(message.timestamp, prevMessage?.timestamp)
    
    if (message.isWithdrawn) {
      return (
        <div key={message.id}>
          {showTime && (
            <div className="text-center text-xs text-muted-foreground py-2">
              {formatMessageTime(message.timestamp)}
            </div>
          )}
          <div className="text-center text-xs text-muted-foreground py-2">
            {isMe ? '你' : message.senderName}撤回了一条消息
          </div>
        </div>
      )
    }
    
    return (
      <div key={message.id}>
        {showTime && (
          <div className="text-center text-xs text-muted-foreground py-2">
            {formatMessageTime(message.timestamp)}
          </div>
        )}
        <div className={`flex gap-2 mb-3 ${isMe ? 'flex-row-reverse' : ''}`}>
          {/* 头像 */}
          {!isMe && (
            <Link href={`/user/${message.senderId}`}>
              <div className="relative">
                <img 
                  src={message.senderAvatar} 
                  alt={message.senderName}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                {message.senderRole === 'owner' && (
                  <Crown className="w-3.5 h-3.5 text-amber-500 absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5" />
                )}
                {message.senderRole === 'admin' && (
                  <Shield className="w-3.5 h-3.5 text-blue-500 absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5" />
                )}
              </div>
            </Link>
          )}
          
          {/* 消息内容 */}
          <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
            {/* 发送者名称 */}
            {!isMe && (
              <span className="text-xs text-muted-foreground mb-1 ml-1">
                {message.senderName}
                {message.senderRole && message.senderRole !== 'member' && (
                  <span className="ml-1 text-primary">({getGroupRoleName(message.senderRole)})</span>
                )}
              </span>
            )}
            
            {/* 气泡 */}
            <div 
              className={`rounded-2xl px-4 py-2.5 ${
                isMe 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-secondary rounded-tl-sm'
              }`}
              onContextMenu={(e) => {
                e.preventDefault()
                setSelectedMessage(message)
              }}
              onClick={() => setSelectedMessage(message)}
            >
              {message.type === 'text' && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.atAll && <span className="text-blue-400">@所有人 </span>}
                  {message.content}
                </p>
              )}
              
              {message.type === 'image' && message.image && (
                <img 
                  src={message.image.url} 
                  alt="图片消息"
                  className="max-w-[200px] rounded-lg"
                />
              )}
              
              {message.type === 'voice' && message.voice && (
                <div className="flex items-center gap-2 min-w-[80px]">
                  <Mic className="w-4 h-4" />
                  <span className="text-sm">{message.voice.duration}&quot;</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DataState status="loading" />
      </div>
    )
  }

  if (error || !groupDetail) {
    return (
      <div className="min-h-screen bg-background">
        <DataState status="error" errorMessage={error || '群聊不存在'} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 导航栏 */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-medium text-sm line-clamp-1">{groupDetail.name}</h1>
              <p className="text-xs text-muted-foreground">{onlineCount}人在线 / {groupDetail.memberCount}人</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowMembersSheet(true)}>
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* 群公告 */}
      {groupDetail.notice && (
        <div 
          className="mx-4 mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-center gap-2 cursor-pointer"
          onClick={() => setShowNoticeSheet(true)}
        >
          <Bell className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-1 flex-1">{groupDetail.notice}</p>
          <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => renderMessage(message, index))}
        <div ref={messagesEndRef} />
      </div>

      {/* 消息操作菜单 */}
      {selectedMessage && (
        <div 
          className="fixed inset-0 z-50 bg-black/20" 
          onClick={() => setSelectedMessage(null)}
        >
          <div 
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-background rounded-xl shadow-lg p-2 flex gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMessage.type === 'text' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleCopy(selectedMessage.content)}
              >
                <Copy className="w-5 h-5" />
                <span className="text-xs">复制</span>
              </Button>
            )}
            {selectedMessage.senderId === currentUserId && canWithdrawMessage(selectedMessage.timestamp) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleWithdraw(selectedMessage)}
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-xs">撤回</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* @成员列表 */}
      {showAtList && (
        <div className="absolute bottom-24 left-0 right-0 mx-4 bg-background border rounded-xl shadow-lg max-h-64 overflow-y-auto z-30">
          <div className="p-2 border-b">
            <Input 
              placeholder="搜索成员..."
              value={atSearchKeyword}
              onChange={(e) => setAtSearchKeyword(e.target.value)}
              className="h-8"
            />
          </div>
          {(groupDetail.myRole === 'owner' || groupDetail.myRole === 'admin') && (
            <div 
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary cursor-pointer border-b"
              onClick={handleAtAll}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">@所有人</span>
            </div>
          )}
          {atSearchResults.map(member => (
            <div 
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary cursor-pointer"
              onClick={() => handleSelectAtMember(member)}
            >
              <img src={member.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium">{member.remark || member.nickname}</p>
                {member.role !== 'member' && (
                  <p className="text-xs text-muted-foreground">{getGroupRoleName(member.role)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 更多功能面板 */}
      {showMorePanel && (
        <div className="border-t bg-background px-4 py-4">
          <div className="grid grid-cols-4 gap-4">
            <button className="flex flex-col items-center gap-2" onClick={() => toast.info('相册功能开发中')}>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs">相册</span>
            </button>
            <button className="flex flex-col items-center gap-2" onClick={() => toast.info('拍照功能开发中')}>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs">拍照</span>
            </button>
            <button 
              className="flex flex-col items-center gap-2" 
              onClick={() => {
                setShowMorePanel(false)
                setShowAtList(true)
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <AtSign className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs">@成员</span>
            </button>
            <button className="flex flex-col items-center gap-2" onClick={() => toast.info('语音功能开发中')}>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Mic className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs">语音</span>
            </button>
          </div>
        </div>
      )}

      {/* 底部输入区 */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-3 safe-bottom">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0"
            onClick={() => setShowMorePanel(!showMorePanel)}
          >
            <Plus className={`w-5 h-5 transition-transform ${showMorePanel ? 'rotate-45' : ''}`} />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="发送消息..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                // 检测@符号
                if (e.target.value.endsWith('@')) {
                  setShowAtList(true)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              className="pr-10"
            />
          </div>
          
          <Button 
            size="icon" 
            className="shrink-0"
            disabled={!inputText.trim() || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* 群成员侧边栏 */}
      <Sheet open={showMembersSheet} onOpenChange={setShowMembersSheet}>
        <SheetContent className="w-[85vw] sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>群聊信息</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100vh-80px)]">
            {/* 群头像和名称 */}
            <div className="p-4 flex items-center gap-3 border-b">
              <img src={groupDetail.avatar} alt="" className="w-14 h-14 rounded-lg" />
              <div className="flex-1">
                <h3 className="font-medium">{groupDetail.name}</h3>
                <p className="text-sm text-muted-foreground">{groupDetail.memberCount}人</p>
              </div>
            </div>
            
            {/* 群成员 */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">群成员</span>
                <Button variant="ghost" size="sm" className="text-primary h-auto p-0">
                  查看全部 &gt;
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {members.slice(0, 10).map(member => (
                  <div key={member.id} className="flex flex-col items-center gap-1">
                    <div className="relative">
                      <img src={member.avatar} alt="" className="w-10 h-10 rounded-full" />
                      {member.role === 'owner' && (
                        <Crown className="w-3.5 h-3.5 text-amber-500 absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5" />
                      )}
                      {member.role === 'admin' && (
                        <Shield className="w-3.5 h-3.5 text-blue-500 absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5" />
                      )}
                    </div>
                    <span className="text-xs text-center line-clamp-1 w-full">{member.nickname}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 群公告 */}
            {groupDetail.notice && (
              <div className="p-4 border-b" onClick={() => { setShowMembersSheet(false); setShowNoticeSheet(true) }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">群公告</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm mt-2 line-clamp-2">{groupDetail.notice}</p>
              </div>
            )}
            
            {/* 我的角色 */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">我在本群的身份</span>
                <span className="text-sm">{getGroupRoleName(groupDetail.myRole)}</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 群公告详情 */}
      <Sheet open={showNoticeSheet} onOpenChange={setShowNoticeSheet}>
        <SheetContent className="w-[85vw] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>群公告</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {groupDetail.noticeDetail ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span>{groupDetail.noticeDetail.publisher}</span>
                  <span>发布于 {groupDetail.noticeDetail.publishedAt}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{groupDetail.noticeDetail.content}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">暂无群公告</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
