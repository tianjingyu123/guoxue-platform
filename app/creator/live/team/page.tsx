"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, Search, Plus, MoreHorizontal, Edit2, Trash2, Phone,
  Shield, Mic, ShoppingBag, Gift, MessageSquare, Users, AlertTriangle,
  Check, X, Crown, UserCheck, Headphones
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// 角色配置（按权限层级排列）
const roleConfig = {
  host: { label: "主播", color: "bg-red-500", icon: Crown, level: 1, desc: "Owner - 最高权限" },
  cohost: { label: "副播", color: "bg-orange-500", icon: Mic, level: 2, desc: "Co-Host - 开播时协助" },
  operator: { label: "场控/运营", color: "bg-blue-500", icon: Headphones, level: 3, desc: "偏重台下管理" },
  guest: { label: "嘉宾", color: "bg-green-500", icon: Users, level: 4, desc: "仅参与连麦互动" },
}

// 模拟团队成员数据
const mockTeamMembers = [
  {
    id: 1,
    name: "易道先生",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    role: "host" as const,
    expertise: ["八字命理", "紫微斗数"],
    phone: "138****8888",
    joinDate: "2024-01-15",
    liveCount: 56,
    hasActiveLive: true,
    status: "online",
  },
  {
    id: 2,
    name: "紫微大师",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    role: "host" as const,
    expertise: ["紫微斗数", "风水堪舆"],
    phone: "139****6666",
    joinDate: "2024-02-20",
    liveCount: 32,
    hasActiveLive: false,
    status: "offline",
  },
  {
    id: 3,
    name: "小雅助理",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    role: "cohost" as const,
    expertise: ["商品讲解", "互动管理"],
    phone: "137****5555",
    joinDate: "2024-03-10",
    liveCount: 28,
    hasActiveLive: true,
    status: "online",
  },
  {
    id: 4,
    name: "运营小李",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    role: "operator" as const,
    expertise: ["数据分析", "活动策划"],
    phone: "136****4444",
    joinDate: "2024-04-05",
    liveCount: 15,
    hasActiveLive: false,
    status: "online",
  },
]

// 模拟可添加的成员（签约讲师/圈内成员）
const mockAvailableMembers = [
  { id: 101, name: "风水堂主", avatar: "", expertise: ["风水堪舆", "择日择吉"], type: "lecturer" },
  { id: 102, name: "起名大师", avatar: "", expertise: ["姓名学", "五行分析"], type: "lecturer" },
  { id: 103, name: "周易研究", avatar: "", expertise: ["周易", "梅花易数"], type: "member" },
  { id: 104, name: "命理助手", avatar: "", expertise: ["八字入门", "流年运势"], type: "member" },
]

// 权限配置（按角色层级详细定义）
const permissions = {
  host: [
    { icon: Crown, label: "创建/编辑/删除直播", desc: "完全管理直播内容和设置" },
    { icon: Users, label: "管理所有成员", desc: "添加、编辑、移除团队成员" },
    { icon: Shield, label: "获取推流码", desc: "获取OBS推流地址和密钥" },
    { icon: Mic, label: "开启/关闭直播", desc: "控制直播开始和结束" },
    { icon: ShoppingBag, label: "推送商品", desc: "在直播间推送商品讲解" },
    { icon: Gift, label: "发放优惠券", desc: "向观众发放优惠券" },
    { icon: MessageSquare, label: "评论管理", desc: "置顶/删除评论、禁言/踢人" },
  ],
  cohost: [
    { icon: ShoppingBag, label: "推送商品", desc: "在直播间推送商品讲解" },
    { icon: Gift, label: "发放优惠券", desc: "向观众发放优惠券" },
    { icon: Users, label: "发起抽奖", desc: "创建抽奖并查看中奖名单" },
    { icon: MessageSquare, label: "弹幕管理", desc: "置顶/删除评论、禁言用户" },
  ],
  operator: [
    { icon: Shield, label: "后台活动配置", desc: "配置营销活动和商品" },
    { icon: Users, label: "直播监控", desc: "查看直播间实时数据" },
    { icon: MessageSquare, label: "数据复盘", desc: "查看直播数据报告" },
  ],
  guest: [
    { icon: Mic, label: "连麦互动", desc: "参与连麦与主播互动" },
  ],
}

export default function LiveTeamPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<typeof mockTeamMembers[0] | null>(null)
  const [addSearchQuery, setAddSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("cohost")
  const [showPermissions, setShowPermissions] = useState(false)

  // 筛选成员
  const filteredMembers = mockTeamMembers.filter(member => {
    const matchTab = activeTab === "all" || member.role === activeTab || (activeTab === "guest" && member.role === "guest")
    const matchSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       member.expertise.some(e => e.includes(searchQuery))
    return matchTab && matchSearch
  })

  // 筛选可添加的成员
  const filteredAvailable = mockAvailableMembers.filter(m => 
    m.name.includes(addSearchQuery) || m.expertise.some(e => e.includes(addSearchQuery))
  )

  // 处理移除
  const handleRemove = () => {
    if (selectedMember?.hasActiveLive) {
      // 有进行中的直播，不允许移除
      return
    }
    // 实际移除逻辑
    setShowRemoveDialog(false)
    setSelectedMember(null)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">主播团队管理</h1>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            添加成员
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-red-500">
              {mockTeamMembers.filter(m => m.role === "host").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">主播</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">
              {mockTeamMembers.filter(m => m.role === "cohost").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">副播</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {mockTeamMembers.filter(m => m.role === "operator").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">运营</p>
          </Card>
        </div>

        {/* 权限说明卡片 */}
        <Card 
          className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 cursor-pointer"
          onClick={() => setShowPermissions(!showPermissions)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium">角色权限说明</span>
            </div>
            <ChevronLeft className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              showPermissions ? "rotate-90" : "-rotate-90"
            )} />
          </div>
          
          {showPermissions && (
            <div className="mt-3 space-y-3 pt-3 border-t border-amber-500/20">
              {Object.entries(permissions).map(([role, perms]) => (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={cn("text-white border-0", roleConfig[role as keyof typeof roleConfig].color)}>
                      {roleConfig[role as keyof typeof roleConfig].label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <perm.icon className="w-3 h-3" />
                        <span>{perm.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 搜索和筛选 */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索成员姓名或擅长领域"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="host">主播</TabsTrigger>
              <TabsTrigger value="cohost">副播</TabsTrigger>
              <TabsTrigger value="operator">运营</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 成员列表 */}
        <div className="space-y-3">
          {filteredMembers.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">暂无成员</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowAddDialog(true)}
              >
                添加成员
              </Button>
            </Card>
          ) : (
            filteredMembers.map((member) => {
              const RoleIcon = roleConfig[member.role].icon
              return (
                <Card key={member.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 头像 */}
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                      </Avatar>
                      {/* 在线状态 */}
                      <span className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                        member.status === "online" ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{member.name}</h3>
                        <Badge className={cn("text-white border-0 text-[10px]", roleConfig[member.role].color)}>
                          <RoleIcon className="w-3 h-3 mr-0.5" />
                          {roleConfig[member.role].label}
                        </Badge>
                        {member.hasActiveLive && (
                          <Badge variant="outline" className="text-[10px] border-red-500 text-red-500">
                            直播中
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {member.expertise.map((exp, idx) => (
                          <span 
                            key={idx} 
                            className="px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground"
                          >
                            {exp}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {member.phone}
                        </span>
                        <span>已直播 {member.liveCount} 场</span>
                      </div>
                    </div>
                    
                    {/* 操作菜单 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedMember(member)
                          setSelectedRole(member.role)
                          setShowEditDialog(true)
                        }}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          编辑信息
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-500"
                          onClick={() => {
                            setSelectedMember(member)
                            setShowRemoveDialog(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          移除成员
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* 添加成员对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加团队成员</DialogTitle>
            <DialogDescription>从签约讲师或圈内成员中搜索添加</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或擅长领域"
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* 角色选择 */}
            <div className="space-y-2">
              <Label>分配角色</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="host">主播</SelectItem>
                  <SelectItem value="cohost">副播</SelectItem>
                  <SelectItem value="operator">运营</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 搜索结果 */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs text-muted-foreground">搜索结果</p>
              {filteredAvailable.map((member) => (
                <Card 
                  key={member.id} 
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{member.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {member.type === "lecturer" ? "签约讲师" : "圈内成员"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.expertise.join("、")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="w-3 h-3 mr-1" />
                    添加
                  </Button>
                </Card>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑成员对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑成员信息</DialogTitle>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedMember.avatar} alt={selectedMember.name} />
                  <AvatarFallback>{selectedMember.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">加入时间：{selectedMember.joinDate}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="host">主播</SelectItem>
                    <SelectItem value="cohost">副播</SelectItem>
                    <SelectItem value="operator">运营</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">当前角色权限</p>
                <div className="flex flex-wrap gap-2">
                  {permissions[selectedRole as keyof typeof permissions]?.map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      <Check className="w-3 h-3 text-green-500" />
                      {perm.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={() => setShowEditDialog(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除确认对话框 */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>移除成员</DialogTitle>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4">
              {selectedMember.hasActiveLive ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-600">无法移除</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        该成员当前有进行中的直播，请在直播结束后再进行移除操作。
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarImage src={selectedMember.avatar} alt={selectedMember.name} />
                    <AvatarFallback>{selectedMember.name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-muted-foreground">
                    确定要移除 <span className="font-medium text-foreground">{selectedMember.name}</span> 吗？
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    移除后该成员将无法参与直播管理
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>取消</Button>
            {selectedMember && !selectedMember.hasActiveLive && (
              <Button variant="destructive" onClick={handleRemove}>确认移除</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
