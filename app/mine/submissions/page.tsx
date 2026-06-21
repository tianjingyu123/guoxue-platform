"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle, 
  Eye, Heart, ChevronRight, FileText, AlertCircle, Edit3
} from "lucide-react"
import { contentApi, type Submission } from "@/lib/api"

export default function SubmissionsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const tabs = [
    { key: '', label: '全部', icon: FileText },
    { key: 'pending', label: '审核中', icon: Clock },
    { key: 'approved', label: '已通过', icon: CheckCircle },
    { key: 'rejected', label: '未通过', icon: XCircle },
  ]

  useEffect(() => {
    loadSubmissions()
  }, [activeTab])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const res = await contentApi.mySubmissions({ 
        status: activeTab as 'pending' | 'approved' | 'rejected' | undefined 
      })
      setSubmissions(res.data)
    } catch {
      // Mock data
      setSubmissions([
        {
          id: '1',
          title: '八字命理入门：如何看懂自己的命盘',
          type: 'article',
          cover: '/placeholder.svg?height=120&width=180',
          status: 'pending',
          submittedAt: '2024-01-15T10:30:00Z',
          targetPosition: '首页推荐',
        },
        {
          id: '2',
          title: '紫微斗数与八字的区别解析',
          type: 'article',
          cover: '/placeholder.svg?height=120&width=180',
          status: 'approved',
          submittedAt: '2024-01-12T14:20:00Z',
          reviewedAt: '2024-01-13T09:00:00Z',
          targetPosition: '发现页精选',
          views: 2580,
          likes: 186,
        },
        {
          id: '3',
          title: '风水布局的基本原则',
          type: 'article',
          status: 'rejected',
          submittedAt: '2024-01-10T08:15:00Z',
          reviewedAt: '2024-01-11T16:30:00Z',
          rejectReason: '内容与已有文章重复度较高，建议增加原创观点或案例分析',
          targetPosition: '首页推荐',
        },
        {
          id: '4',
          title: '易经六十四卦详解系列',
          type: 'article',
          cover: '/placeholder.svg?height=120&width=180',
          status: 'approved',
          submittedAt: '2024-01-08T11:00:00Z',
          reviewedAt: '2024-01-09T10:00:00Z',
          targetPosition: '专题推荐',
          views: 5680,
          likes: 423,
        },
      ].filter(s => !activeTab || s.status === activeTab))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSubmissions()
    setRefreshing(false)
  }

  const handleResubmit = async (id: string) => {
    try {
      await contentApi.resubmit(id)
      router.push(`/editor?id=${id}`)
    } catch {
      router.push(`/editor?id=${id}`)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const getStatusConfig = (status: Submission['status']) => {
    switch (status) {
      case 'pending':
        return { label: '审核中', color: 'bg-amber-500/10 text-amber-600', icon: Clock }
      case 'approved':
        return { label: '已通过', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle }
      case 'rejected':
        return { label: '未通过', color: 'bg-red-500/10 text-red-600', icon: XCircle }
    }
  }

  const counts = {
    '': submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">我的投稿</h1>
          <button 
            onClick={handleRefresh}
            className="p-2 -mr-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 text-[#666666] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                  isActive
                    ? 'bg-[#C41E3A] text-white'
                    : 'bg-white text-[#666666] border border-[#E8E3DB]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.key && (
                  <span className={`text-xs ${isActive ? 'text-white/80' : 'text-[#999999]'}`}>
                    {counts[tab.key as keyof typeof counts]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          // Skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-20 h-14 bg-[#E8E3DB] rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-[#E8E3DB] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[#E8E3DB] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[#999999]" />
            </div>
            <p className="text-[#999999] mb-4">暂无投稿记录</p>
            <button
              onClick={() => router.push('/editor')}
              className="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
            >
              去投稿
            </button>
          </div>
        ) : (
          submissions.map((item) => {
            const statusConfig = getStatusConfig(item.status)
            const StatusIcon = statusConfig.icon
            
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Cover */}
                    {item.cover && (
                      <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#F5F5F5]">
                        <img
                          src={item.cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#2C2C2C] line-clamp-2 mb-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#999999]">
                        <span>投稿至 {item.targetPosition}</span>
                        <span>·</span>
                        <span>{formatDate(item.submittedAt)}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs flex-shrink-0 ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>

                  {/* Stats for approved */}
                  {item.status === 'approved' && (item.views || item.likes) && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F5F5F5]">
                      {item.views !== undefined && (
                        <div className="flex items-center gap-1 text-sm text-[#666666]">
                          <Eye className="w-4 h-4" />
                          <span>{item.views}</span>
                        </div>
                      )}
                      {item.likes !== undefined && (
                        <div className="flex items-center gap-1 text-sm text-[#666666]">
                          <Heart className="w-4 h-4" />
                          <span>{item.likes}</span>
                        </div>
                      )}
                      <div className="flex-1" />
                      <button
                        onClick={() => router.push(`/articles/${item.id}`)}
                        className="flex items-center gap-1 text-sm text-[#C41E3A]"
                      >
                        <span>查看详情</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Reject reason */}
                  {item.status === 'rejected' && item.rejectReason && (
                    <div className="mt-3 pt-3 border-t border-[#F5F5F5]">
                      <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-600 font-medium mb-1">未通过原因</p>
                          <p className="text-sm text-red-500/80">{item.rejectReason}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResubmit(item.id)}
                        className="w-full mt-3 py-2.5 bg-gradient-to-r from-[#C41E3A] to-[#E85050] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>修改并重新投稿</span>
                      </button>
                    </div>
                  )}

                  {/* Pending status */}
                  {item.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-[#F5F5F5]">
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>预计1-3个工作日内完成审核</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
