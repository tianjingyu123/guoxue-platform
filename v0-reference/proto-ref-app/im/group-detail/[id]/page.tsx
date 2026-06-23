'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Copy, 
  Bell, 
  BellOff, 
  Pin, 
  PinOff,
  ChevronRight, 
  LogOut, 
  Trash2, 
  Shield, 
  Crown,
  UserPlus,
  QrCode,
  Edit3,
  Check,
  X,
  MoreVertical,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { 
  getGroupDetail, 
  getGroupSettings, 
  getGroupMembers,
  updateMyGroupNickname,
  updateGroupSettings,
  getGroupPermissions,
  removeGroupMember,
  toggleGroupAdmin,
  transferGroupOwner,
  quitGroup,
  dismissGroup,
  generateGroupQrcode,
  getGroupRoleName
} from '@/lib/api/im'
import type { GroupDetail, GroupMember, GroupSettings, GroupPermissions } from '@/lib/types/im'

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [permissions, setPermissions] = useState<GroupPermissions | null>(null)

  // 编辑昵称
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')

  // 成员管理
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)
  const [showMemberAction, setShowMemberAction] = useState(false)

  // 确认弹窗
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  // 二维码
  const [showQrcode, setShowQrcode] = useState(false)
  const [qrcodeUrl, setQrcodeUrl] = useState('')

  useEffect(() => {
    loadData()
  }, [groupId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [groupRes, settingsRes, membersRes] = await Promise.all([
        getGroupDetail(groupId),
        getGroupSettings(groupId),
        getGroupMembers(groupId),
      ])
      
      if (groupRes.code === 200 && groupRes.data) {
        setGroup(groupRes.data)
        setPermissions(getGroupPermissions(groupRes.data.myRole))
      }
      if (settingsRes.code === 200 && settingsRes.data) {
        setSettings(settingsRes.data)
        setNicknameInput(settingsRes.data.myNickname || '')
      }
      if (membersRes.code === 200 && membersRes.data) {
        setMembers(membersRes.data)
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyGroupId = () => {
    navigator.clipboard.writeText(String(groupId))
    toast.success('群号已复制')
  }

  const handleSaveNickname = async () => {
    const res = await updateMyGroupNickname(groupId, nicknameInput)
    if (res.code === 200) {
      setSettings(prev => prev ? { ...prev, myNickname: nicknameInput } : null)
      setEditingNickname(false)
      toast.success('昵称已更新')
    }
  }

  const handleToggleMute = async () => {
    if (!settings) return
    const res = await updateGroupSettings(groupId, { isMuted: !settings.isMuted })
    if (res.code === 200) {
      setSettings(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null)
      toast.success(settings.isMuted ? '已开启消息通知' : '已开启消息免打扰')
    }
  }

  const handleTogglePin = async () => {
    if (!settings) return
    const res = await updateGroupSettings(groupId, { isPinned: !settings.isPinned })
    if (res.code === 200) {
      setSettings(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null)
      toast.success(settings.isPinned ? '已取消置顶' : '已置顶')
    }
  }

  const handleQuit = async () => {
    const res = await quitGroup(groupId)
    if (res.code === 200) {
      toast.success('已退出群聊')
      router.push('/im/group-list')
    }
  }

  const handleDismiss = async () => {
    const res = await dismissGroup(groupId)
    if (res.code === 200) {
      toast.success('群聊已解散')
      router.push('/im/group-list')
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return
    const res = await removeGroupMember(groupId, selectedMember.id)
    if (res.code === 200) {
      setMembers(prev => prev.filter(m => m.id !== selectedMember.id))
      setShowRemoveConfirm(false)
      setSelectedMember(null)
      toast.success('已移除成员')
    }
  }

  const handleToggleAdmin = async (member: GroupMember) => {
    const isCurrentlyAdmin = member.role === 'admin'
    const res = await toggleGroupAdmin(groupId, member.id, !isCurrentlyAdmin)
    if (res.code === 200) {
      setMembers(prev => prev.map(m => 
        m.id === member.id 
          ? { ...m, role: isCurrentlyAdmin ? 'member' : 'admin' } 
          : m
      ))
      toast.success(isCurrentlyAdmin ? '已取消管理员' : '已设为管理员')
    }
  }

  const handleTransfer = async () => {
    if (!selectedMember) return
    const res = await transferGroupOwner(groupId, selectedMember.id)
    if (res.code === 200) {
      setShowTransferConfirm(false)
      toast.success('群主已转让')
      loadData()
    }
  }

  const handleShowQrcode = async () => {
    const res = await generateGroupQrcode(groupId)
    if (res.code === 200 && res.data) {
      setQrcodeUrl(res.data.qrcodeUrl)
      setShowQrcode(true)
    }
  }

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-amber-500" />
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-blue-500" />
    return null
  }

  return (
    <DataState
      loading={loading}
      error={error}
      empty={!group}
      loadingComponent={<LoadingSkeleton />}
      onRetry={loadData}
    >
      <div className="min-h-screen bg-background">
        {/* 导航栏 */}
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="flex-1 text-center font-medium">群聊设置</h1>
            <div className="w-10" />
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* 群基本信息 */}
          {group && (
            <div className="bg-card rounded-xl p-4 space-y-4">
              {/* 群头像和名称 */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden">
                  <img 
                    src={group.avatar} 
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg truncate">{group.name}</h2>
                    {permissions?.canUpdateNotice && (
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">群号: {groupId}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5"
                      onClick={handleCopyGroupId}
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" size="icon" onClick={handleShowQrcode}>
                  <QrCode className="w-5 h-5" />
                </Button>
              </div>

              {/* 群成员 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">群成员 ({group.memberCount}人)</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary h-7"
                    onClick={() => setShowAllMembers(true)}
                  >
                    查看全部
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {members.slice(0, 8).map(member => (
                    <div 
                      key={member.id} 
                      className="flex flex-col items-center w-12"
                      onClick={() => {
                        setSelectedMember(member)
                        setShowMemberAction(true)
                      }}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden">
                          <img 
                            src={member.avatar} 
                            alt={member.nickname}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {member.role !== 'member' && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                            {getRoleIcon(member.role)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                        {member.remark || member.nickname}
                      </span>
                    </div>
                  ))}
                  {permissions?.canInvite && (
                    <Link href={`/im/invite-members?groupId=${groupId}`}>
                      <div className="flex flex-col items-center w-12">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">邀请</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 群公告 */}
          {group?.noticeDetail && (
            <div className="bg-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">群公告</span>
                {permissions?.canUpdateNotice && (
                  <Button variant="ghost" size="sm" className="text-primary h-7">
                    编辑
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {group.noticeDetail.content}
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                {group.noticeDetail.publisher} 发布于 {group.noticeDetail.publishedAt}
              </div>
            </div>
          )}

          {/* 我的设置 */}
          <div className="bg-card rounded-xl divide-y">
            {/* 我的群昵称 */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm">我在本群的昵称</span>
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <Input 
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    className="w-32 h-8 text-sm"
                    placeholder="请输入昵称"
                    maxLength={20}
                  />
                  <Button size="icon" className="h-8 w-8" onClick={handleSaveNickname}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => setEditingNickname(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-muted-foreground h-8 px-2"
                  onClick={() => setEditingNickname(true)}
                >
                  {settings?.myNickname || '未设置'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>

            {/* 消息免打扰 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {settings?.isMuted ? (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Bell className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm">消息免打扰</span>
              </div>
              <Switch 
                checked={settings?.isMuted || false}
                onCheckedChange={handleToggleMute}
              />
            </div>

            {/* 置顶聊天 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {settings?.isPinned ? (
                  <Pin className="w-5 h-5 text-primary" />
                ) : (
                  <PinOff className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm">置顶聊天</span>
              </div>
              <Switch 
                checked={settings?.isPinned || false}
                onCheckedChange={handleTogglePin}
              />
            </div>
          </div>

          {/* 退出/解散群聊 */}
          <div className="bg-card rounded-xl">
            {group?.myRole === 'owner' ? (
              <Button 
                variant="ghost" 
                className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDismissConfirm(true)}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                解散群聊
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowQuitConfirm(true)}
              >
                <LogOut className="w-5 h-5 mr-2" />
                退出群聊
              </Button>
            )}
          </div>
        </div>

        {/* 全部成员抽屉 */}
        <Sheet open={showAllMembers} onOpenChange={setShowAllMembers}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>群成员 ({members.length})</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
              {members.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                        <img 
                          src={member.avatar} 
                          alt={member.nickname}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.remark || member.nickname}</span>
                        {member.role !== 'member' && (
                          <Badge variant="secondary" className="text-xs py-0">
                            {getRoleIcon(member.role)}
                            <span className="ml-1">{getGroupRoleName(member.role)}</span>
                          </Badge>
                        )}
                      </div>
                      {member.remark && (
                        <span className="text-xs text-muted-foreground">{member.nickname}</span>
                      )}
                    </div>
                  </div>
                  
                  {member.id !== 0 && permissions && (permissions.canRemoveMember || permissions.canSetAdmin) && member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {permissions.canSetAdmin && member.role !== 'owner' && (
                          <DropdownMenuItem onClick={() => handleToggleAdmin(member)}>
                            <Shield className="w-4 h-4 mr-2" />
                            {member.role === 'admin' ? '取消管理员' : '设为管理员'}
                          </DropdownMenuItem>
                        )}
                        {permissions.canTransfer && member.role !== 'owner' && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedMember(member)
                              setShowTransferConfirm(true)
                            }}
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            转让群主
                          </DropdownMenuItem>
                        )}
                        {permissions.canRemoveMember && member.role !== 'owner' && (
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedMember(member)
                              setShowRemoveConfirm(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            移除成员
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* 二维码弹窗 */}
        <Sheet open={showQrcode} onOpenChange={setShowQrcode}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>群二维码</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col items-center py-8">
              <div className="w-48 h-48 bg-white rounded-xl p-4 shadow-lg">
                <img src={qrcodeUrl} alt="群二维码" className="w-full h-full" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">扫一扫，加入群聊</p>
              <p className="text-xs text-muted-foreground mt-1">二维码7天内有效</p>
            </div>
          </SheetContent>
        </Sheet>

        {/* 退出确认 */}
        <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>退出群聊</AlertDialogTitle>
              <AlertDialogDescription>
                确定要退出群聊「{group?.name}」吗？退出后将不再接收此群消息。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleQuit}
              >
                退出
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 解散确认 */}
        <AlertDialog open={showDismissConfirm} onOpenChange={setShowDismissConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>解散群聊</AlertDialogTitle>
              <AlertDialogDescription>
                确定要解散群聊「{group?.name}」吗？解散后所有成员将被移出，此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDismiss}
              >
                解散
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 转让确认 */}
        <AlertDialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>转让群主</AlertDialogTitle>
              <AlertDialogDescription>
                确定要将群主转让给「{selectedMember?.nickname}」吗？转让后您将成为普通成员。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleTransfer}>
                确认转让
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 移除确认 */}
        <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>移除成员</AlertDialogTitle>
              <AlertDialogDescription>
                确定要将「{selectedMember?.nickname}」移出群聊吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleRemoveMember}
              >
                移除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DataState>
  )
}
