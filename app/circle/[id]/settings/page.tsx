"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, ChevronRight, Image, Edit3, Tag, Users, Lock, 
  Eye, EyeOff, MessageCircle, Share2, Shield, Bot, Search,
  Gift, AlertTriangle, Trash2, UserMinus, Camera, X, Check
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"

// 圈子设置数据
const circleSettings = {
  // 基础信息
  name: "八字命理研习社",
  cover: "",
  description: "专注八字命理学习与实践的高质量社群",
  tags: ["八字", "命理", "易学", "排盘"],
  
  // 入圈规则
  type: "paid", // free | paid | yearly
  price: 199,
  yearlyPrice: 99,
  joinMethod: "direct", // direct | approval | invite
  allowRefund: true, // 是否允许付费成员申请退出退款
  welcomeMessage: "欢迎加入八字命理研习社！请先阅读圈规，有问题可以@管理员。",
  
  // 成员权限
  postPermission: "all", // all | admin
  commentPermission: "all",
  chatPermission: "all",
  sharePermission: true,
  memberListVisible: true,
  
  // 内容保护
  contentProtection: true,
  
  // 圈主助理
  assistantEnabled: true,
  assistantWelcome: "你好，我是圈主助理小卜，有任何问题都可以问我~",
  
  // 搜索可见性
  searchVisible: true,
  
  // 分享有赏
  shareRewardEnabled: true,
  shareRewardRate: 10, // 10%
}

export default function CircleSettingsPage() {
  const [settings, setSettings] = useState(circleSettings)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [showDangerModal, setShowDangerModal] = useState<"transfer" | "dissolve" | null>(null)
  const [confirmText, setConfirmText] = useState("")

  const handleEdit = (field: string, value: string) => {
    setEditingField(field)
    setTempValue(value)
  }

  const handleSave = (field: string) => {
    setSettings(prev => ({ ...prev, [field]: tempValue }))
    setEditingField(null)
  }

  const handleToggle = (field: string) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] }))
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/circle/1/home" />
          <h1 className="font-semibold text-base text-foreground">圈子设置</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* 基础信息设置 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">基础信息</h2>
          <Card className="divide-y divide-border">
            {/* 圈子封面 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">圈子封面</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Image className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* 圈子名称 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">圈子名称</span>
              </div>
              {editingField === "name" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="w-32 px-2 py-1 text-sm bg-secondary rounded border-0 outline-none text-foreground"
                    autoFocus
                  />
                  <button onClick={() => handleSave("name")} className="p-1 text-primary">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingField(null)} className="p-1 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleEdit("name", settings.name)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <span className="text-sm">{settings.name}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 圈子简介 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">圈子简介</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm max-w-[120px] truncate">{settings.description}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 圈子标签 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">圈子标签</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {settings.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                  ))}
                  {settings.tags.length > 2 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{settings.tags.length - 2}</Badge>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </Card>
        </div>

        {/* 入圈规则设置 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">入圈规则</h2>
          <Card className="divide-y divide-border">
            {/* 圈子类型 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">圈子类型</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-0">
                  {settings.type === "free" ? "免费" : settings.type === "paid" ? "付费" : "年费"}
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* 付费价格 */}
            {settings.type !== "free" && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {settings.type === "yearly" ? "年费价格" : "入圈价格"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm text-primary font-medium">
                    ¥{settings.type === "yearly" ? settings.yearlyPrice : settings.price}
                    <span className="text-xs text-muted-foreground font-normal"> / 年</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* 加入方式 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">加入方式</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">
                  {settings.joinMethod === "direct" ? "直接加入" : 
                   settings.joinMethod === "approval" ? "需要审批" : "仅限邀请"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 允许成员申请退款（仅付费圈子） */}
            {settings.type !== "free" && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <UserMinus className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-foreground">允许成员申请退款</span>
                    <p className="text-xs text-muted-foreground mt-0.5">按使用天数扣费，剩余退还</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle("allowRefund")}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    settings.allowRefund ? "bg-primary" : "bg-secondary"
                  }`}
                  aria-label="允许成员申请退款"
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    settings.allowRefund ? "left-6" : "left-1"
                  }`} />
                </button>
              </div>
            )}

            {/* 欢迎语 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">自动欢迎语</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm max-w-[100px] truncate">{settings.welcomeMessage}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* 成员权限设置 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">成员权限</h2>
          <Card className="divide-y divide-border">
            {/* 发帖权限 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">发帖权限</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">
                  {settings.postPermission === "all" ? "所有成员" : "仅管理员"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 评论权限 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">评论权限</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">
                  {settings.commentPermission === "all" ? "所有成员" : "仅管理员"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 分享权限 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">允许分享到圈外</span>
              </div>
              <button
                onClick={() => handleToggle("sharePermission")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.sharePermission ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.sharePermission ? "left-6" : "left-1"
                }`} />
              </button>
            </div>

            {/* 成员列表可见性 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {settings.memberListVisible ? (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">成员列表对外公开</span>
              </div>
              <button
                onClick={() => handleToggle("memberListVisible")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.memberListVisible ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.memberListVisible ? "left-6" : "left-1"
                }`} />
              </button>
            </div>
          </Card>
        </div>

        {/* 成员管理 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">成员管理</h2>
          <Card className="divide-y divide-border">
            {/* 入圈申请审核 */}
            <Link href="/circles/1/join-requests" className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">入圈申请审核</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">3 待处理</Badge>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>

            {/* 退出申请审核（仅付费圈子且开启退款时） */}
            {settings.type !== "free" && settings.allowRefund && (
              <Link href="/circles/1/exit-requests" className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <UserMinus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">退出申请审核</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">2 待处理</Badge>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            )}
          </Card>
        </div>

        {/* 内容保护设置 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">内容保护</h2>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-foreground">内容保护模式</span>
                  <p className="text-xs text-muted-foreground mt-0.5">开启后禁止截图和复制</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("contentProtection")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.contentProtection ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.contentProtection ? "left-6" : "left-1"
                }`} />
              </button>
            </div>
          </Card>
        </div>

        {/* 圈主助理设置 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">圈主助理</h2>
          <Card className="divide-y divide-border">
            {/* 开启/关闭 */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-foreground">启用圈主助理</span>
                  <p className="text-xs text-muted-foreground mt-0.5">AI助理自动回复成员问题</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("assistantEnabled")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.assistantEnabled ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.assistantEnabled ? "left-6" : "left-1"
                }`} />
              </button>
            </div>

            {settings.assistantEnabled && (
              <>
                {/* 助理欢迎语 */}
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-foreground">助理欢迎语</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm max-w-[120px] truncate">{settings.assistantWelcome}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 知识库管理 */}
                <Link href="/circles/1/settings/knowledge" className="flex items-center justify-between p-4">
                  <span className="text-sm text-foreground">知识库管理</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">12篇文档</Badge>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </>
            )}
          </Card>
        </div>

        {/* 搜索可见性 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">搜索可见性</h2>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-foreground">平台搜索中可见</span>
                  <p className="text-xs text-muted-foreground mt-0.5">关闭后仅通过链接可访问</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("searchVisible")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.searchVisible ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.searchVisible ? "left-6" : "left-1"
                }`} />
              </button>
            </div>
          </Card>
        </div>

        {/* 分享有赏 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">分享有赏</h2>
          <Card className="divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-foreground">启用分享有赏</span>
                  <p className="text-xs text-muted-foreground mt-0.5">成员邀请新人可获得佣金</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("shareRewardEnabled")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.shareRewardEnabled ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.shareRewardEnabled ? "left-6" : "left-1"
                }`} />
              </button>
            </div>

            {settings.shareRewardEnabled && (
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-foreground">佣金比例</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm text-accent font-medium">{settings.shareRewardRate}%</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 危险操作 */}
        <div>
          <h2 className="text-sm font-medium text-destructive mb-2 px-1">危险操作</h2>
          <Card className="divide-y divide-border">
            <button 
              onClick={() => setShowDangerModal("transfer")}
              className="flex items-center justify-between p-4 w-full text-left"
            >
              <div className="flex items-center gap-3">
                <UserMinus className="w-5 h-5 text-amber-500" />
                <div>
                  <span className="text-sm text-foreground">转让圈主</span>
                  <p className="text-xs text-muted-foreground mt-0.5">将圈主身份转让给其他成员</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => setShowDangerModal("dissolve")}
              className="flex items-center justify-between p-4 w-full text-left"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-destructive" />
                <div>
                  <span className="text-sm text-destructive">解散圈子</span>
                  <p className="text-xs text-muted-foreground mt-0.5">此操作不可逆，请谨慎操作</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </Card>
        </div>
      </div>

      {/* 危险操作确认弹窗 */}
      {showDangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-card rounded-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                showDangerModal === "dissolve" ? "bg-destructive/10" : "bg-amber-500/10"
              }`}>
                <AlertTriangle className={`w-8 h-8 ${
                  showDangerModal === "dissolve" ? "text-destructive" : "text-amber-500"
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {showDangerModal === "transfer" ? "确认转让圈主？" : "确认解散圈子？"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {showDangerModal === "transfer" 
                  ? "转让后你将失去圈主权限，成为普通成员" 
                  : "解散后所有内容将被删除，此操作不可撤销"}
              </p>
              
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">
                  请输入「{showDangerModal === "transfer" ? "确认转让" : "确认解散"}」以继续
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={showDangerModal === "transfer" ? "确认转让" : "确认解散"}
                  className="w-full px-4 py-2 bg-secondary rounded-lg border-0 outline-none text-sm text-foreground text-center"
                />
              </div>
            </div>
            
            <div className="flex border-t border-border">
              <button
                onClick={() => { setShowDangerModal(null); setConfirmText("") }}
                className="flex-1 py-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                disabled={confirmText !== (showDangerModal === "transfer" ? "确认转让" : "确认解散")}
                className={`flex-1 py-4 text-sm font-medium border-l border-border transition-colors ${
                  confirmText === (showDangerModal === "transfer" ? "确认转让" : "确认解散")
                    ? showDangerModal === "dissolve" ? "text-destructive hover:bg-destructive/10" : "text-amber-500 hover:bg-amber-500/10"
                    : "text-muted-foreground cursor-not-allowed"
                }`}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
