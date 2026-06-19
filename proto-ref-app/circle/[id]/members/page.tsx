"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Search, MoreHorizontal, ChevronDown, Users, X, Shield, Star, Award, Heart, UserMinus, UserCog } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 角色配置
const roles = [
  { id: "all", label: "全部", count: 1280 },
  { id: "owner", label: "圈主", count: 1, color: "bg-accent text-accent-foreground" },
  { id: "partner", label: "合伙人", count: 3, color: "bg-purple-500/20 text-purple-400" },
  { id: "admin", label: "管理员", count: 5, color: "bg-blue-500/20 text-blue-400" },
  { id: "guest", label: "嘉宾", count: 12, color: "bg-green-500/20 text-green-400" },
  { id: "volunteer", label: "志愿者", count: 8, color: "bg-orange-500/20 text-orange-400" },
]

// 成员数据
const membersData = [
  { id: 1, name: "周易大师", avatar: "", memberNo: "001", role: "owner", joinTime: "2024-01-15", lastActive: "刚刚", isVerified: true, intro: "八字命理资深讲师" },
  { id: 2, name: "张玄风", avatar: "", memberNo: "002", role: "partner", joinTime: "2024-01-20", lastActive: "3小时前", isVerified: true, intro: "紫微斗数传承人" },
  { id: 3, name: "陈风水", avatar: "", memberNo: "003", role: "partner", joinTime: "2024-02-01", lastActive: "昨天", isVerified: true, intro: "风水堪舆专家" },
  { id: 4, name: "李易安", avatar: "", memberNo: "008", role: "admin", joinTime: "2024-02-15", lastActive: "2小时前", isVerified: false, intro: "国学传播者" },
  { id: 5, name: "王命理", avatar: "", memberNo: "015", role: "admin", joinTime: "2024-03-01", lastActive: "5分钟前", isVerified: false, intro: "八字爱好者" },
  { id: 6, name: "赵星辰", avatar: "", memberNo: "023", role: "guest", joinTime: "2024-03-10", lastActive: "1天前", isVerified: true, intro: "知名命理博主" },
  { id: 7, name: "孙紫微", avatar: "", memberNo: "056", role: "volunteer", joinTime: "2024-04-01", lastActive: "3天前", isVerified: false, intro: "热心圈友" },
  { id: 8, name: "刘八字", avatar: "", memberNo: "128", role: "member", joinTime: "2024-05-15", lastActive: "1周前", isVerified: false, intro: "命理学习中" },
  { id: 9, name: "杨天干", avatar: "", memberNo: "256", role: "member", joinTime: "2024-06-01", lastActive: "2天前", isVerified: false, intro: "新手入门" },
  { id: 10, name: "吴地支", avatar: "", memberNo: "512", role: "member", joinTime: "2024-06-20", lastActive: "刚刚", isVerified: false, intro: "" },
]

// 当前用户是否为管理员
const isAdmin = true

export default function CircleMembersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [sortBy, setSortBy] = useState<"time" | "active">("time")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<typeof membersData[0] | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"remove" | "changeRole" | null>(null)
  const [newRole, setNewRole] = useState("")

  // 筛选成员
  const filteredMembers = membersData
    .filter(m => {
      const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.memberNo.includes(searchQuery)
      const matchRole = selectedRole === "all" || m.role === selectedRole
      return matchSearch && matchRole
    })
    .sort((a, b) => {
      if (sortBy === "time") {
        return new Date(b.joinTime).getTime() - new Date(a.joinTime).getTime()
      }
      // 按活跃度排序（简化处理）
      const activeOrder = ["刚刚", "5分钟前", "2小时前", "3小时前", "昨天", "1天前", "2天前", "3天前", "1周前"]
      return activeOrder.indexOf(a.lastActive) - activeOrder.indexOf(b.lastActive)
    })

  const getRoleConfig = (role: string) => {
    const config = roles.find(r => r.id === role)
    return config || { label: "成员", color: "bg-secondary text-muted-foreground" }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Star className="w-3 h-3" />
      case "partner": return <Award className="w-3 h-3" />
      case "admin": return <Shield className="w-3 h-3" />
      case "guest": return <Heart className="w-3 h-3" />
      default: return null
    }
  }

  const handleManage = (member: typeof membersData[0]) => {
    setSelectedMember(member)
    setShowManageModal(true)
  }

  const handleChangeRole = (role: string) => {
    setNewRole(role)
    setConfirmAction("changeRole")
    setShowManageModal(false)
    setShowConfirmModal(true)
  }

  const handleRemove = () => {
    setConfirmAction("remove")
    setShowManageModal(false)
    setShowConfirmModal(true)
  }

  const confirmActionHandler = () => {
    // 执行操作
    setShowConfirmModal(false)
    setSelectedMember(null)
    setConfirmAction(null)
    setNewRole("")
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-12">
          <BackButton fallbackPath="/circle/1/home" />
          <h1 className="font-semibold text-base text-foreground">圈子成员</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="sticky top-12 z-30 bg-background px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索成员昵称或编号"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 角色筛选Tab */}
      <div className="sticky top-[100px] z-30 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                selectedRole === role.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {role.label}
              <span className="ml-1 opacity-70">{role.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 排序选项 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">
          共 {filteredMembers.length} 位成员
        </span>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {sortBy === "time" ? "按加入时间" : "按活跃度"}
            <ChevronDown className={cn("w-3 h-3 transition-transform", showSortMenu && "rotate-180")} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-6 z-50 w-28 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
                <button
                  onClick={() => { setSortBy("time"); setShowSortMenu(false) }}
                  className={cn(
                    "w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors",
                    sortBy === "time" && "text-primary"
                  )}
                >
                  按加入时间
                </button>
                <button
                  onClick={() => { setSortBy("active"); setShowSortMenu(false) }}
                  className={cn(
                    "w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors",
                    sortBy === "active" && "text-primary"
                  )}
                >
                  按活跃度
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 成员列表 */}
      <div className="divide-y divide-border">
        {filteredMembers.length > 0 ? (
          filteredMembers.map(member => {
            const roleConfig = getRoleConfig(member.role)
            const roleIcon = getRoleIcon(member.role)
            
            return (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <Link href={`/user/${member.id}`} className="flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="bg-secondary text-foreground">
                      {member.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`/user/${member.id}`} className="font-medium text-sm text-foreground hover:text-primary">
                      {member.name}
                    </Link>
                    {member.isVerified && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                    )}
                    {member.role !== "member" && (
                      <Badge className={cn("text-[10px] px-1.5 py-0 border-0 flex items-center gap-0.5", roleConfig.color)}>
                        {roleIcon}
                        {roleConfig.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">#{member.memberNo}</span>
                    <span className="text-[10px] text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground/70">{member.joinTime} 加入</span>
                  </div>
                  {member.intro && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{member.intro}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground/60">{member.lastActive}</span>
                  {isAdmin && member.role !== "owner" && (
                    <button
                      onClick={() => handleManage(member)}
                      className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">未找到相关成员</p>
            <p className="text-xs text-muted-foreground/70 mt-1">试试其他搜索条件</p>
          </div>
        )}
      </div>

      {/* 成员管理弹窗 */}
      {showManageModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowManageModal(false)} 
          />
          <div className="relative w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* 成员信息 */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedMember.avatar} alt={selectedMember.name} />
                <AvatarFallback className="bg-secondary text-foreground">
                  {selectedMember.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{selectedMember.name}</p>
                <p className="text-xs text-muted-foreground">#{selectedMember.memberNo}</p>
              </div>
            </div>

            {/* 修改角色 */}
            <div className="p-4 border-b border-border">
              <p className="text-xs text-muted-foreground mb-3">修改角色</p>
              <div className="grid grid-cols-3 gap-2">
                {roles.filter(r => r.id !== "all" && r.id !== "owner").map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleChangeRole(role.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      selectedMember.role === role.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {role.label}
                  </button>
                ))}
                <button
                  onClick={() => handleChangeRole("member")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    selectedMember.role === "member"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  普通成员
                </button>
              </div>
            </div>

            {/* 危险操作 */}
            <div className="p-4">
              <button
                onClick={handleRemove}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                <UserMinus className="w-4 h-4" />
                移出圈子
              </button>
            </div>

            {/* 取消按钮 */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowManageModal(false)}
                className="w-full py-3 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      {showConfirmModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-4">
              {confirmAction === "remove" ? (
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                  <UserMinus className="w-6 h-6 text-red-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <UserCog className="w-6 h-6 text-primary" />
                </div>
              )}
              <h3 className="font-semibold text-foreground">
                {confirmAction === "remove" ? "确认移出成员?" : "确认修改角色?"}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {confirmAction === "remove" 
                  ? `将 ${selectedMember.name} 移出圈子后，其发布的内容将保留，但无法再访问圈子内容。`
                  : `将 ${selectedMember.name} 的角色修改为「${getRoleConfig(newRole).label}」`
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmModal(false); setSelectedMember(null) }}
                className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmActionHandler}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  confirmAction === "remove"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                确认
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
