"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ChevronLeft, Plus, Search, MoreVertical, UserPlus, Crown, 
  Shield, Trash2, Edit, TrendingUp, FileText, BookOpen, Radio,
  Check, X, Clock, ChevronRight, Copy, QrCode
} from "lucide-react"

// Mock: 圈子嘉宾/老师列表
const mockGuests = [
  {
    id: "1",
    name: "张玄风",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhang",
    title: "资深命理师",
    role: "guest" as const, // guest: 嘉宾, teacher: 老师
    joinedAt: "2024-01-10",
    status: "active" as const,
    stats: {
      articles: 28,
      courses: 3,
      lives: 12,
      totalRevenue: 12680.50,
      thisMonthRevenue: 2350.00,
    },
    revenueShare: 70, // 分成比例 70%
    permissions: ["article", "course", "live", "qa"],
  },
  {
    id: "2",
    name: "李易安",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=li",
    title: "紫微斗数讲师",
    role: "teacher" as const,
    joinedAt: "2024-02-15",
    status: "active" as const,
    stats: {
      articles: 15,
      courses: 5,
      lives: 8,
      totalRevenue: 8920.00,
      thisMonthRevenue: 1680.00,
    },
    revenueShare: 60,
    permissions: ["article", "course"],
  },
  {
    id: "3",
    name: "王命理",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wang",
    title: "八字研究者",
    role: "guest" as const,
    joinedAt: "2024-03-01",
    status: "pending" as const, // 待审核
    stats: {
      articles: 0,
      courses: 0,
      lives: 0,
      totalRevenue: 0,
      thisMonthRevenue: 0,
    },
    revenueShare: 50,
    permissions: ["article"],
  },
]

// Mock: 待处理的邀请
const mockPendingInvites = [
  { id: "inv1", name: "陈风水", invitedAt: "2024-03-10", status: "pending" },
  { id: "inv2", name: "周易学", invitedAt: "2024-03-08", status: "expired" },
]

const permissionLabels: Record<string, string> = {
  article: "文章",
  course: "课程",
  live: "直播",
  qa: "问答",
  post: "帖子",
}

export default function GuestsManagePage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "guest" | "teacher" | "pending">("all")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState<string | null>(null)

  // 筛选嘉宾
  const filteredGuests = mockGuests.filter(guest => {
    if (activeTab === "pending") return guest.status === "pending"
    if (activeTab === "guest") return guest.role === "guest" && guest.status === "active"
    if (activeTab === "teacher") return guest.role === "teacher" && guest.status === "active"
    return guest.status === "active"
  }).filter(guest => 
    guest.name.includes(searchQuery) || guest.title.includes(searchQuery)
  )

  const pendingCount = mockGuests.filter(g => g.status === "pending").length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-muted">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-foreground">嘉宾/老师管理</h1>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="p-2 -mr-2 text-primary"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索嘉宾/老师"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          {[
            { key: "all", label: "全部" },
            { key: "guest", label: "嘉宾" },
            { key: "teacher", label: "老师" },
            { key: "pending", label: "待审核", count: pendingCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-background text-muted-foreground"
              }`}
            >
              {tab.label}
              {tab.count ? <span className="ml-1 text-xs">({tab.count})</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* 嘉宾列表 */}
      <div className="p-4 space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">暂无嘉宾/老师</p>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="mt-4 px-6 py-2 bg-primary text-white text-sm rounded-xl"
            >
              邀请嘉宾
            </button>
          </div>
        ) : (
          filteredGuests.map(guest => (
            <div 
              key={guest.id}
              className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            >
              {/* 头部信息 */}
              <div className="flex items-start gap-3">
                <img alt="图片" 
                  src={guest.avatar} 
                  alt={guest.name}
                  className="w-12 h-12 rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{guest.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      guest.role === "teacher" 
                        ? "bg-info/10 text-info" 
                        : "bg-gold/10 text-gold"
                    }`}>
                      {guest.role === "teacher" ? "老师" : "嘉宾"}
                    </span>
                    {guest.status === "pending" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">
                        待审核
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{guest.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">加入于 {guest.joinedAt}</p>
                </div>
                <button 
                  onClick={() => setShowActionMenu(showActionMenu === guest.id ? null : guest.id)}
                  className="p-2 -mr-2 text-muted-foreground"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* 操作菜单 */}
              {showActionMenu === guest.id && (
                <div className="mt-3 pt-3 border-t border-muted flex gap-2">
                  <button 
                    onClick={() => { setShowEditModal(guest.id); setShowActionMenu(null) }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground bg-background rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <Link 
                    href={`/circles/${circleId}/guests/${guest.id}/revenue`}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground bg-background rounded-lg"
                  >
                    <TrendingUp className="w-4 h-4" />
                    收益
                  </Link>
                  <button className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-red-500 bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                    移除
                  </button>
                </div>
              )}

              {/* 权限标签 */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground">可发布：</span>
                {guest.permissions.map(perm => (
                  <span key={perm} className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                    {permissionLabels[perm]}
                  </span>
                ))}
              </div>

              {/* 数据统计 */}
              {guest.status === "active" && (
                <div className="mt-3 pt-3 border-t border-muted">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span className="text-sm font-medium">{guest.stats.articles}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">文章</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        <span className="text-sm font-medium">{guest.stats.courses}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">课程</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Radio className="w-3 h-3" />
                        <span className="text-sm font-medium">{guest.stats.lives}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">直播</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gold">
                        ¥{guest.stats.thisMonthRevenue.toFixed(0)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">本月收益</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">分成比例：{guest.revenueShare}%</span>
                    <span className="text-muted-foreground">累计收益：¥{guest.stats.totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* 待审核操作 */}
              {guest.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-muted flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-white bg-primary rounded-xl">
                    <Check className="w-4 h-4" />
                    通过
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-muted-foreground bg-background rounded-xl">
                    <X className="w-4 h-4" />
                    拒绝
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 邀请嘉宾弹窗 */}
      {showInviteModal && (
        <InviteGuestModal 
          circleId={circleId}
          onClose={() => setShowInviteModal(false)} 
        />
      )}

      {/* 编辑嘉宾弹窗 */}
      {showEditModal && (
        <EditGuestModal
          guest={mockGuests.find(g => g.id === showEditModal)!}
          onClose={() => setShowEditModal(null)}
        />
      )}
    </div>
  )
}

// 邀请嘉宾弹窗
function InviteGuestModal({ circleId, onClose }: { circleId: string; onClose: () => void }) {
  const [inviteType, setInviteType] = useState<"link" | "search">("link")
  const [role, setRole] = useState<"guest" | "teacher">("guest")
  const [revenueShare, setRevenueShare] = useState(50)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["article"])
  
  const inviteLink = `https://rebugx.com/invite/${circleId}?role=${role}`

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-muted">
          <button onClick={onClose} className="text-muted-foreground">取消</button>
          <span className="font-medium text-foreground">邀请嘉宾/老师</span>
          <button className="text-primary font-medium">确定</button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* 邀请方式 */}
          <div className="flex gap-2">
            <button
              onClick={() => setInviteType("link")}
              className={`flex-1 py-2.5 rounded-xl text-sm ${
                inviteType === "link" ? "bg-primary text-white" : "bg-background text-muted-foreground"
              }`}
            >
              链接邀请
            </button>
            <button
              onClick={() => setInviteType("search")}
              className={`flex-1 py-2.5 rounded-xl text-sm ${
                inviteType === "search" ? "bg-primary text-white" : "bg-background text-muted-foreground"
              }`}
            >
              搜索用户
            </button>
          </div>

          {/* 角色选择 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">角色类型</label>
            <div className="flex gap-2">
              <button
                onClick={() => setRole("guest")}
                className={`flex-1 p-3 rounded-xl border-2 text-left ${
                  role === "guest" ? "border-primary bg-primary/5" : "border-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Crown className={`w-5 h-5 ${role === "guest" ? "text-gold" : "text-muted-foreground"}`} />
                  <span className={`font-medium ${role === "guest" ? "text-foreground" : "text-muted-foreground"}`}>嘉宾</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">受邀创作者，可发布内容</p>
              </button>
              <button
                onClick={() => setRole("teacher")}
                className={`flex-1 p-3 rounded-xl border-2 text-left ${
                  role === "teacher" ? "border-primary bg-primary/5" : "border-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${role === "teacher" ? "text-info" : "text-muted-foreground"}`} />
                  <span className={`font-medium ${role === "teacher" ? "text-foreground" : "text-muted-foreground"}`}>老师</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">签约讲师，可开设课程</p>
              </button>
            </div>
          </div>

          {/* 权限设置 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">发布权限</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => togglePermission(key)}
                  className={`px-4 py-2 rounded-xl text-sm ${
                    selectedPermissions.includes(key)
                      ? "bg-primary text-white"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 分成比例 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              收益分成比例（嘉宾/老师）
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={revenueShare}
                onChange={(e) => setRevenueShare(parseInt(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-lg font-bold text-primary w-16 text-right">{revenueShare}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              嘉宾/老师获得 {revenueShare}%，圈子获得 {100 - revenueShare}%
            </p>
          </div>

          {/* 邀请链接 */}
          {inviteType === "link" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">邀请链接</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 bg-background rounded-xl text-sm text-muted-foreground truncate">
                  {inviteLink}
                </div>
                <button className="px-4 py-2.5 bg-primary text-white rounded-xl">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="px-4 py-2.5 bg-background text-muted-foreground rounded-xl">
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">链接7天内有效，对方接受邀请后自动成为嘉宾/老师</p>
            </div>
          )}

          {/* 搜索用户 */}
          {inviteType === "search" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">搜索用户</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="输入用户名或ID搜索"
                  className="w-full pl-9 pr-4 py-2.5 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 编辑嘉宾弹窗
function EditGuestModal({ guest, onClose }: { guest: typeof mockGuests[0]; onClose: () => void }) {
  const [role, setRole] = useState(guest.role)
  const [revenueShare, setRevenueShare] = useState(guest.revenueShare)
  const [selectedPermissions, setSelectedPermissions] = useState(guest.permissions)

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-muted">
          <button onClick={onClose} className="text-muted-foreground">取消</button>
          <span className="font-medium text-foreground">编辑 {guest.name}</span>
          <button className="text-primary font-medium">保存</button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* 角色选择 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">角色类型</label>
            <div className="flex gap-2">
              <button
                onClick={() => setRole("guest")}
                className={`flex-1 py-2.5 rounded-xl text-sm ${
                  role === "guest" ? "bg-gold text-white" : "bg-background text-muted-foreground"
                }`}
              >
                嘉宾
              </button>
              <button
                onClick={() => setRole("teacher")}
                className={`flex-1 py-2.5 rounded-xl text-sm ${
                  role === "teacher" ? "bg-info text-white" : "bg-background text-muted-foreground"
                }`}
              >
                老师
              </button>
            </div>
          </div>

          {/* 权限设置 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">发布权限</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => togglePermission(key)}
                  className={`px-4 py-2 rounded-xl text-sm ${
                    selectedPermissions.includes(key)
                      ? "bg-primary text-white"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 分成比例 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">收益分成比例</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={revenueShare}
                onChange={(e) => setRevenueShare(parseInt(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-lg font-bold text-primary w-16 text-right">{revenueShare}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
