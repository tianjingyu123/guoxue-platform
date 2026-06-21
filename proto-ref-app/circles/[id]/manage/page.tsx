"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, Users, FileText, Settings, BarChart3, 
  Crown, Shield, MoreVertical, Trash2, Star, Pin,
  Bell, Save, RefreshCw, Search, AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { circleApi, type CircleDetail, type CircleMember, type CirclePost, type CircleStats } from "@/lib/api"

// Tab类型
type TabType = 'overview' | 'members' | 'posts' | 'settings'

// 骨架屏
function ManageSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-14 bg-white" />
      <div className="p-4 space-y-4">
        <div className="h-10 bg-white rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CircleManagePage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [circle, setCircle] = useState<CircleDetail | null>(null)
  const [stats, setStats] = useState<CircleStats | null>(null)
  const [members, setMembers] = useState<CircleMember[]>([])
  const [posts, setPosts] = useState<(CirclePost & { isEssence?: boolean })[]>([])
  const [announcement, setAnnouncement] = useState("")
  const [showConfirm, setShowConfirm] = useState<{ type: string; id: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  
  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [detailRes, statsRes] = await Promise.all([
          circleApi.detail(circleId),
          circleApi.getStats(circleId)
        ])
        setCircle(detailRes)
        setStats(statsRes)
        setAnnouncement(detailRes.announcement || "")
      } catch {
        // Mock data
        setCircle({
          id: circleId,
          name: "八字命理研习社",
          cover: "/images/placeholder.svg",
          description: "探讨八字命理学问，分享预测心得",
          category: "命理",
          members: 12800,
          posts: 3560,
          isJoined: true,
          owner: { id: "1", name: "周易大师", avatar: "/images/avatar.svg" },
          announcement: "欢迎加入圈子！请遵守圈规，友善交流。"
        })
        setStats({
          totalMembers: 12800,
          newMembersToday: 56,
          totalPosts: 3560,
          newPostsToday: 128,
          activeMembers: 2340,
          essencePosts: 89
        })
        setAnnouncement("欢迎加入圈子！请遵守圈规，友善交流。")
      }
      setIsLoading(false)
    }
    loadData()
  }, [circleId])
  
  // 加载成员
  useEffect(() => {
    if (activeTab === 'members') {
      circleApi.listMembers(circleId).then(res => {
        setMembers(res.data)
      }).catch(() => {
        setMembers([
          { id: "1", name: "周易大师", avatar: "/images/avatar.svg", role: "owner", joinedAt: "2024-01-01", posts: 568, title: "创始人" },
          { id: "2", name: "紫微真人", avatar: "/images/avatar.svg", role: "admin", joinedAt: "2024-02-15", posts: 234 },
          { id: "3", name: "命理学徒", avatar: "/images/avatar.svg", role: "member", joinedAt: "2024-06-01", posts: 45 },
          { id: "4", name: "易学新手", avatar: "/images/avatar.svg", role: "member", joinedAt: "2024-06-10", posts: 12 },
        ])
      })
    }
  }, [activeTab, circleId])
  
  // 加载帖子
  useEffect(() => {
    if (activeTab === 'posts') {
      circleApi.posts(circleId).then(res => {
        setPosts(res.data.map(p => ({ ...p, isEssence: false })))
      }).catch(() => {
        setPosts([
          { id: "1", content: "八字入门必看：如何快速掌握基础知识", images: [], author: { id: "1", name: "周易大师", avatar: "/images/avatar.svg" }, createdAt: "2024-06-01", likes: 256, comments: 89, isLiked: false, isPinned: true, isEssence: true },
          { id: "2", content: "今日分享一个有趣的八字案例分析", images: [], author: { id: "2", name: "紫微真人", avatar: "/images/avatar.svg" }, createdAt: "2024-06-02", likes: 128, comments: 45, isLiked: false, isEssence: true },
          { id: "3", content: "新人报道，请多多指教", images: [], author: { id: "3", name: "命理学徒", avatar: "/images/avatar.svg" }, createdAt: "2024-06-03", likes: 34, comments: 12, isLiked: false },
        ])
      })
    }
  }, [activeTab, circleId])
  
  // 设置成员角色
  const handleSetRole = async (memberId: string, role: 'admin' | 'member') => {
    try {
      await circleApi.updateMemberRole(circleId, memberId, role)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
    } catch {
      alert("操作失败")
    }
    setShowConfirm(null)
  }
  
  // 移除成员
  const handleRemoveMember = async (memberId: string) => {
    try {
      await circleApi.removeMember(circleId, memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch {
      alert("操作失败")
    }
    setShowConfirm(null)
  }
  
  // 切换精华
  const handleToggleEssence = async (postId: string) => {
    try {
      const res = await circleApi.toggleEssence(circleId, postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isEssence: res.isEssence } : p))
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isEssence: !p.isEssence } : p))
    }
  }
  
  // 切换置顶
  const handleToggleTop = async (postId: string) => {
    try {
      const res = await circleApi.toggleTop(circleId, postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: res.isPinned } : p))
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: !p.isPinned } : p))
    }
  }
  
  // 删除帖子
  const handleDeletePost = async (postId: string) => {
    try {
      await circleApi.deletePost(circleId, postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch {
      alert("删除失败")
    }
    setShowConfirm(null)
  }
  
  // 保存公告
  const handleSaveAnnouncement = async () => {
    setSaving(true)
    try {
      await circleApi.setAnnouncement(circleId, announcement)
      alert("保存成功")
    } catch {
      alert("保存失败")
    }
    setSaving(false)
  }
  
  if (isLoading) return <ManageSkeleton />
  
  const tabs = [
    { key: 'overview', label: '概览', icon: BarChart3 },
    { key: 'members', label: '成员', icon: Users },
    { key: 'posts', label: '帖子', icon: FileText },
    { key: 'settings', label: '设置', icon: Settings },
  ]
  
  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 导航栏 */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold">圈子管理</h1>
          <div className="w-9" />
        </div>
        
        {/* Tab栏 */}
        <div className="flex border-t border-[#E8E3DB]">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                  activeTab === tab.key ? "text-[#C41E3A]" : "text-[#666666]"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#C41E3A] rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="p-4">
        {/* 概览Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-4">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-[#C41E3A]">{stats.totalMembers.toLocaleString()}</div>
                <div className="text-xs text-[#666666] mt-1">总成员数</div>
                <div className="text-xs text-green-500 mt-1">+{stats.newMembersToday} 今日新增</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-[#C9A96E]">{stats.totalPosts.toLocaleString()}</div>
                <div className="text-xs text-[#666666] mt-1">总帖子数</div>
                <div className="text-xs text-green-500 mt-1">+{stats.newPostsToday} 今日新增</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-[#2C2C2C]">{stats.activeMembers.toLocaleString()}</div>
                <div className="text-xs text-[#666666] mt-1">活跃成员</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-[#2C2C2C]">{stats.essencePosts}</div>
                <div className="text-xs text-[#666666] mt-1">精华帖子</div>
              </div>
            </div>
            
            {/* 公告编辑 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#C9A96E]" />
                  <span className="font-medium">圈子公告</span>
                </div>
                <button 
                  onClick={handleSaveAnnouncement}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#C41E3A] text-white text-xs rounded-full"
                >
                  <Save className="w-3 h-3" />
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
              <textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="输入圈子公告..."
                className="w-full h-24 p-3 bg-[#FAF8F5] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
              />
            </div>
          </div>
        )}
        
        {/* 成员Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
              <input
                type="text"
                placeholder="搜索成员"
                className="w-full h-10 pl-10 pr-4 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
              />
            </div>
            
            {/* 成员列表 */}
            {members.map(member => (
              <div key={member.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={member.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    {member.role === 'owner' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C9A96E] rounded-full flex items-center justify-center">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {member.role === 'admin' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{member.name}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        member.role === 'owner' ? "bg-[#C9A96E]/10 text-[#C9A96E]" :
                        member.role === 'admin' ? "bg-blue-50 text-blue-500" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {member.role === 'owner' ? '圈主' : member.role === 'admin' ? '管理员' : '成员'}
                      </span>
                    </div>
                    <div className="text-xs text-[#999999] mt-1">
                      发帖 {member.posts} · 加入于 {member.joinedAt}
                    </div>
                  </div>
                  
                  {member.role !== 'owner' && (
                    <div className="relative group">
                      <button className="p-2 hover:bg-[#FAF8F5] rounded-full">
                        <MoreVertical className="w-4 h-4 text-[#666666]" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#E8E3DB] py-1 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        {member.role === 'member' ? (
                          <button 
                            onClick={() => setShowConfirm({ type: 'setAdmin', id: member.id, name: member.name })}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAF8F5]"
                          >
                            设为管理员
                          </button>
                        ) : (
                          <button 
                            onClick={() => setShowConfirm({ type: 'removeAdmin', id: member.id, name: member.name })}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAF8F5]"
                          >
                            取消管理员
                          </button>
                        )}
                        <button 
                          onClick={() => setShowConfirm({ type: 'remove', id: member.id, name: member.name })}
                          className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                        >
                          移出圈子
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 帖子Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{post.author.name}</span>
                      {post.isPinned && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded">置顶</span>
                      )}
                      {post.isEssence && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] rounded">精华</span>
                      )}
                    </div>
                    <p className="text-sm text-[#2C2C2C] mt-1 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#999999]">
                      <span>{post.likes} 赞</span>
                      <span>{post.comments} 评论</span>
                      <span>{post.createdAt}</span>
                    </div>
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8E3DB]">
                  <button 
                    onClick={() => handleToggleTop(post.id)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors",
                      post.isPinned ? "bg-[#C41E3A] text-white" : "bg-[#FAF8F5] text-[#666666]"
                    )}
                  >
                    <Pin className="w-3 h-3" />
                    {post.isPinned ? "取消置顶" : "置顶"}
                  </button>
                  <button 
                    onClick={() => handleToggleEssence(post.id)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors",
                      post.isEssence ? "bg-[#C9A96E] text-white" : "bg-[#FAF8F5] text-[#666666]"
                    )}
                  >
                    <Star className="w-3 h-3" />
                    {post.isEssence ? "取消精华" : "设为精华"}
                  </button>
                  <button 
                    onClick={() => setShowConfirm({ type: 'deletePost', id: post.id, name: post.content.slice(0, 20) })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 设置Tab */}
        {activeTab === 'settings' && circle && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium mb-4">基本信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#666666] mb-1">圈子名称</label>
                  <input
                    type="text"
                    defaultValue={circle.name}
                    className="w-full h-10 px-3 bg-[#FAF8F5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] mb-1">圈子简介</label>
                  <textarea
                    defaultValue={circle.description}
                    className="w-full h-20 p-3 bg-[#FAF8F5] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] mb-1">圈子分类</label>
                  <select className="w-full h-10 px-3 bg-[#FAF8F5] rounded-lg text-sm focus:outline-none">
                    <option value="命理">命理</option>
                    <option value="风水">风水</option>
                    <option value="养生">养生</option>
                    <option value="书法">书法</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium mb-4">圈规设置</h3>
              <textarea
                defaultValue={circle.rules?.join('\n')}
                placeholder="请输入圈规，每行一条"
                className="w-full h-32 p-3 bg-[#FAF8F5] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
              />
            </div>
            
            <button className="w-full h-12 bg-gradient-to-r from-[#C41E3A] to-[#E85050] text-white rounded-xl font-medium">
              保存设置
            </button>
          </div>
        )}
      </div>
      
      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-orange-50">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-center font-semibold mb-2">
              {showConfirm.type === 'setAdmin' && "设为管理员"}
              {showConfirm.type === 'removeAdmin' && "取消管理员"}
              {showConfirm.type === 'remove' && "移出圈子"}
              {showConfirm.type === 'deletePost' && "删除帖子"}
            </h3>
            <p className="text-center text-sm text-[#666666] mb-6">
              {showConfirm.type === 'setAdmin' && `确定将 "${showConfirm.name}" 设为管理员？`}
              {showConfirm.type === 'removeAdmin' && `确定取消 "${showConfirm.name}" 的管理员权限？`}
              {showConfirm.type === 'remove' && `确定将 "${showConfirm.name}" 移出圈子？此操作不可撤销。`}
              {showConfirm.type === 'deletePost' && `确定删除帖子 "${showConfirm.name}..."？此操作不可撤销。`}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(null)}
                className="flex-1 h-10 bg-[#FAF8F5] text-[#666666] rounded-lg font-medium"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (showConfirm.type === 'setAdmin') handleSetRole(showConfirm.id, 'admin')
                  else if (showConfirm.type === 'removeAdmin') handleSetRole(showConfirm.id, 'member')
                  else if (showConfirm.type === 'remove') handleRemoveMember(showConfirm.id)
                  else if (showConfirm.type === 'deletePost') handleDeletePost(showConfirm.id)
                }}
                className={cn(
                  "flex-1 h-10 rounded-lg font-medium text-white",
                  showConfirm.type === 'remove' || showConfirm.type === 'deletePost' 
                    ? "bg-red-500" 
                    : "bg-[#C41E3A]"
                )}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
