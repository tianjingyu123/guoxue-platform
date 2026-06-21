'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Download, 
  FileText, 
  MessageSquare, 
  Bookmark, 
  ShoppingBag, 
  GraduationCap, 
  BookOpen, 
  Users,
  User,
  Check,
  Clock,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react'

interface DataType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  estimatedSize: string
}

interface ExportRecord {
  id: string
  types: string[]
  status: 'processing' | 'completed' | 'expired' | 'failed'
  createdAt: string
  completedAt?: string
  expireAt?: string
  downloadUrl?: string
  fileSize?: string
}

const dataTypes: DataType[] = [
  { id: 'profile', name: '个人信息', description: '账号资料、头像、昵称、简介等', icon: <User className="w-5 h-5" />, estimatedSize: '< 1MB' },
  { id: 'posts', name: '帖子内容', description: '发布的圈子帖子、评论、回复', icon: <FileText className="w-5 h-5" />, estimatedSize: '约 5MB' },
  { id: 'comments', name: '评论互动', description: '课程评论、视频评论、点赞记录', icon: <MessageSquare className="w-5 h-5" />, estimatedSize: '约 2MB' },
  { id: 'favorites', name: '收藏内容', description: '收藏的课程、帖子、商品等', icon: <Bookmark className="w-5 h-5" />, estimatedSize: '约 1MB' },
  { id: 'orders', name: '订单数据', description: '购买记录、支付信息、发票', icon: <ShoppingBag className="w-5 h-5" />, estimatedSize: '约 3MB' },
  { id: 'learning', name: '学习记录', description: '课程进度、学习时长、测验成绩', icon: <GraduationCap className="w-5 h-5" />, estimatedSize: '约 2MB' },
  { id: 'notes', name: '笔记内容', description: '课程笔记、批注、高亮标记', icon: <BookOpen className="w-5 h-5" />, estimatedSize: '约 4MB' },
  { id: 'follows', name: '关注列表', description: '关注的用户、圈子、讲师', icon: <Users className="w-5 h-5" />, estimatedSize: '< 1MB' },
]

export default function DataExportPage() {
  const router = useRouter()
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [records, setRecords] = useState<ExportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'records'>('create')

  useEffect(() => {
    // 模拟加载导出记录
    setTimeout(() => {
      setRecords([
        {
          id: '1',
          types: ['profile', 'posts', 'comments'],
          status: 'completed',
          createdAt: '2026-06-01T10:30:00',
          completedAt: '2026-06-01T10:35:00',
          expireAt: '2026-06-08T10:35:00',
          downloadUrl: '/api/export/download/1',
          fileSize: '8.2MB'
        },
        {
          id: '2',
          types: ['orders', 'learning'],
          status: 'processing',
          createdAt: '2026-06-03T08:00:00',
        },
        {
          id: '3',
          types: ['profile', 'favorites', 'notes', 'follows'],
          status: 'expired',
          createdAt: '2026-05-20T14:00:00',
          completedAt: '2026-05-20T14:10:00',
          expireAt: '2026-05-27T14:10:00',
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    )
  }

  const selectAll = () => {
    if (selectedTypes.length === dataTypes.length) {
      setSelectedTypes([])
    } else {
      setSelectedTypes(dataTypes.map(t => t.id))
    }
  }

  const handleSubmit = async () => {
    if (selectedTypes.length === 0) return
    setSubmitting(true)
    
    // 模拟提交
    setTimeout(() => {
      const newRecord: ExportRecord = {
        id: Date.now().toString(),
        types: selectedTypes,
        status: 'processing',
        createdAt: new Date().toISOString(),
      }
      setRecords(prev => [newRecord, ...prev])
      setSelectedTypes([])
      setSubmitting(false)
      setActiveTab('records')
    }, 1000)
  }

  const getStatusConfig = (status: ExportRecord['status']) => {
    switch (status) {
      case 'processing':
        return { label: '处理中', color: 'text-blue-600 bg-blue-50', icon: <RefreshCw className="w-4 h-4 animate-spin" /> }
      case 'completed':
        return { label: '已完成', color: 'text-green-600 bg-green-50', icon: <Check className="w-4 h-4" /> }
      case 'expired':
        return { label: '已过期', color: 'text-gray-500 bg-gray-100', icon: <Clock className="w-4 h-4" /> }
      case 'failed':
        return { label: '失败', color: 'text-red-600 bg-red-50', icon: <AlertCircle className="w-4 h-4" /> }
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const getTypeNames = (typeIds: string[]) => {
    return typeIds.map(id => dataTypes.find(t => t.id === id)?.name || id).join('、')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">数据导出</span>
          <div className="w-9" />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'create' 
              ? 'text-[#C41E3A] border-[#C41E3A]' 
              : 'text-muted-foreground border-transparent'
          }`}
        >
          申请导出
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'records' 
              ? 'text-[#C41E3A] border-[#C41E3A]' 
              : 'text-muted-foreground border-transparent'
          }`}
        >
          导出记录
          {records.filter(r => r.status === 'completed').length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#C41E3A] text-white rounded-full">
              {records.filter(r => r.status === 'completed').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="p-4 space-y-4">
          {/* 说明卡片 */}
          <div className="flex gap-3 p-4 bg-blue-50 rounded-xl">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">数据导出说明</p>
              <ul className="space-y-1 text-blue-700">
                <li>• 导出文件为 ZIP 压缩包格式</li>
                <li>• 处理时间约 5-30 分钟，完成后通知您</li>
                <li>• 文件有效期 7 天，请及时下载</li>
                <li>• 每月最多申请 3 次导出</li>
              </ul>
            </div>
          </div>

          {/* 数据类型选择 */}
          <div className="bg-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-medium">选择导出数据</span>
              <button
                onClick={selectAll}
                className="text-sm text-[#C41E3A]"
              >
                {selectedTypes.length === dataTypes.length ? '取消全选' : '全选'}
              </button>
            </div>
            
            <div className="divide-y divide-border">
              {dataTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedTypes.includes(type.id) ? 'bg-[#C41E3A] text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{type.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{type.estimatedSize}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedTypes.includes(type.id) 
                        ? 'bg-[#C41E3A] border-[#C41E3A]' 
                        : 'border-muted-foreground/30'
                    }`}>
                      {selectedTypes.includes(type.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 预估大小 */}
          {selectedTypes.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <span className="text-sm text-muted-foreground">
                已选 {selectedTypes.length} 项数据
              </span>
              <span className="text-sm font-medium">
                预估大小: 约 {selectedTypes.length * 2}MB
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
                  <div className="h-5 w-24 bg-muted rounded mb-3" />
                  <div className="h-4 w-48 bg-muted rounded mb-2" />
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Download className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">暂无导出记录</p>
              <button
                onClick={() => setActiveTab('create')}
                className="text-[#C41E3A] text-sm"
              >
                去申请导出
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map(record => {
                const statusConfig = getStatusConfig(record.status)
                return (
                  <div key={record.id} className="bg-card rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(record.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm mb-2">
                      {getTypeNames(record.types)}
                    </p>
                    
                    {record.status === 'completed' && record.expireAt && (
                      <p className="text-xs text-muted-foreground mb-3">
                        文件大小: {record.fileSize} · 有效期至 {formatDate(record.expireAt)}
                      </p>
                    )}
                    
                    {record.status === 'processing' && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-blue-500 rounded-full animate-pulse" />
                        </div>
                        <span>处理中...</span>
                      </div>
                    )}
                    
                    {record.status === 'completed' && (
                      <button
                        onClick={() => window.open(record.downloadUrl, '_blank')}
                        className="w-full mt-3 py-2.5 bg-[#C41E3A] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        下载文件
                      </button>
                    )}
                    
                    {record.status === 'expired' && (
                      <button
                        onClick={() => {
                          setSelectedTypes(record.types)
                          setActiveTab('create')
                        }}
                        className="w-full mt-3 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium"
                      >
                        重新申请
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 底部提交按钮 */}
      {activeTab === 'create' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={selectedTypes.length === 0 || submitting}
            className="w-full py-3.5 bg-[#C41E3A] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                申请导出 ({selectedTypes.length} 项)
              </>
            )}
          </button>
        </div>
      )}

      {/* 底部占位 */}
      {activeTab === 'create' && <div className="h-24" />}
    </div>
  )
}
