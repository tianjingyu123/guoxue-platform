"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Search,
  User,
  Download,
  Filter,
  AlertTriangle,
  LogIn,
  Eye,
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Heart,
  Share2,
  Settings,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  RefreshCw,
  ChevronDown,
  Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// 操作类型
type ActionType = 'login' | 'logout' | 'view' | 'order' | 'payment' | 'comment' | 'like' | 'share' | 'setting' | 'other'

// 审计日志
interface AuditLog {
  id: number
  actionType: ActionType
  actionName: string
  description: string
  timestamp: string
  device: string
  deviceType: 'mobile' | 'desktop' | 'tablet'
  ip: string
  location?: string
  isAbnormal: boolean
  abnormalReason?: string
  extra?: Record<string, string>
}

// 用户信息
interface AuditUser {
  id: number
  uid: string
  nickname: string
  avatar: string
  phone: string
  registerTime: string
  lastActiveTime: string
  loginCount: number
  orderCount: number
  riskLevel: 'low' | 'medium' | 'high'
}

// Mock 用户数据
const mockUsers: AuditUser[] = [
  {
    id: 1,
    uid: 'U10086',
    nickname: '国学爱好者',
    avatar: '/placeholder.svg',
    phone: '138****8888',
    registerTime: '2025-03-15 10:30',
    lastActiveTime: '2026-06-03 09:45',
    loginCount: 156,
    orderCount: 23,
    riskLevel: 'low',
  },
  {
    id: 2,
    uid: 'U20088',
    nickname: '可疑用户001',
    avatar: '/placeholder.svg',
    phone: '139****9999',
    registerTime: '2026-06-01 02:30',
    lastActiveTime: '2026-06-03 03:15',
    loginCount: 50,
    orderCount: 0,
    riskLevel: 'high',
  },
]

// Mock 审计日志
const mockLogs: AuditLog[] = [
  {
    id: 1,
    actionType: 'login',
    actionName: '用户登录',
    description: '密码登录成功',
    timestamp: '2026-06-03 09:45:23',
    device: 'iPhone 15 Pro',
    deviceType: 'mobile',
    ip: '223.104.xxx.xxx',
    location: '北京市朝阳区',
    isAbnormal: false,
  },
  {
    id: 2,
    actionType: 'view',
    actionName: '浏览课程',
    description: '浏览《八字命理入门》课程详情',
    timestamp: '2026-06-03 09:46:15',
    device: 'iPhone 15 Pro',
    deviceType: 'mobile',
    ip: '223.104.xxx.xxx',
    location: '北京市朝阳区',
    isAbnormal: false,
    extra: { courseId: 'C1001', courseName: '八字命理入门' },
  },
  {
    id: 3,
    actionType: 'order',
    actionName: '创建订单',
    description: '购买《八字命理入门》课程',
    timestamp: '2026-06-03 09:48:30',
    device: 'iPhone 15 Pro',
    deviceType: 'mobile',
    ip: '223.104.xxx.xxx',
    location: '北京市朝阳区',
    isAbnormal: false,
    extra: { orderId: 'O202606030001', amount: '299' },
  },
  {
    id: 4,
    actionType: 'payment',
    actionName: '支付成功',
    description: '微信支付 ¥299.00',
    timestamp: '2026-06-03 09:49:05',
    device: 'iPhone 15 Pro',
    deviceType: 'mobile',
    ip: '223.104.xxx.xxx',
    location: '北京市朝阳区',
    isAbnormal: false,
    extra: { payMethod: '微信支付', amount: '299.00' },
  },
  {
    id: 5,
    actionType: 'login',
    actionName: '用户登录',
    description: '短信验证码登录',
    timestamp: '2026-06-02 14:20:00',
    device: 'Chrome 125',
    deviceType: 'desktop',
    ip: '116.25.xxx.xxx',
    location: '广东省深圳市',
    isAbnormal: true,
    abnormalReason: '异地登录：与上次登录地点不一致',
  },
  {
    id: 6,
    actionType: 'comment',
    actionName: '发表评论',
    description: '对《紫微斗数》课程发表评价',
    timestamp: '2026-06-02 15:30:00',
    device: 'Chrome 125',
    deviceType: 'desktop',
    ip: '116.25.xxx.xxx',
    location: '广东省深圳市',
    isAbnormal: false,
  },
  {
    id: 7,
    actionType: 'like',
    actionName: '点赞',
    description: '点赞文章《易经入门指南》',
    timestamp: '2026-06-02 15:35:00',
    device: 'Chrome 125',
    deviceType: 'desktop',
    ip: '116.25.xxx.xxx',
    location: '广东省深圳市',
    isAbnormal: false,
  },
  {
    id: 8,
    actionType: 'share',
    actionName: '分享',
    description: '分享课程到微信',
    timestamp: '2026-06-01 10:00:00',
    device: 'iPhone 15 Pro',
    deviceType: 'mobile',
    ip: '223.104.xxx.xxx',
    location: '北京市朝阳区',
    isAbnormal: false,
  },
  {
    id: 9,
    actionType: 'setting',
    actionName: '修改设置',
    description: '修改隐私设置',
    timestamp: '2026-05-28 16:00:00',
    device: 'iPhone 15 Pro',
    deviceType: 'mobile',
    ip: '223.104.xxx.xxx',
    location: '北京市朝阳区',
    isAbnormal: false,
  },
]

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 操作类型图标
function getActionIcon(type: ActionType) {
  const icons: Record<ActionType, React.ReactNode> = {
    login: <LogIn className="w-4 h-4" />,
    logout: <LogIn className="w-4 h-4 rotate-180" />,
    view: <Eye className="w-4 h-4" />,
    order: <ShoppingCart className="w-4 h-4" />,
    payment: <CreditCard className="w-4 h-4" />,
    comment: <MessageSquare className="w-4 h-4" />,
    like: <Heart className="w-4 h-4" />,
    share: <Share2 className="w-4 h-4" />,
    setting: <Settings className="w-4 h-4" />,
    other: <Clock className="w-4 h-4" />,
  }
  return icons[type]
}

// 操作类型颜色
function getActionColor(type: ActionType): string {
  const colors: Record<ActionType, string> = {
    login: 'text-green-600 bg-green-50',
    logout: 'text-gray-600 bg-gray-50',
    view: 'text-blue-600 bg-blue-50',
    order: 'text-orange-600 bg-orange-50',
    payment: 'text-primary bg-primary/10',
    comment: 'text-purple-600 bg-purple-50',
    like: 'text-pink-600 bg-pink-50',
    share: 'text-cyan-600 bg-cyan-50',
    setting: 'text-gray-600 bg-gray-50',
    other: 'text-gray-500 bg-gray-100',
  }
  return colors[type]
}

// 风险等级
function getRiskLevelInfo(level: 'low' | 'medium' | 'high') {
  const info = {
    low: { label: '低风险', color: 'text-green-600 bg-green-50' },
    medium: { label: '中风险', color: 'text-orange-600 bg-orange-50' },
    high: { label: '高风险', color: 'text-red-600 bg-red-50' },
  }
  return info[level]
}

const actionTypes = [
  { value: 'all', label: '全部' },
  { value: 'login', label: '登录' },
  { value: 'view', label: '浏览' },
  { value: 'order', label: '下单' },
  { value: 'payment', label: '支付' },
  { value: 'comment', label: '评论' },
  { value: 'like', label: '点赞' },
  { value: 'share', label: '分享' },
]

export default function UserAuditPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<AuditUser | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [showAbnormalOnly, setShowAbnormalOnly] = useState(false)
  const [exporting, setExporting] = useState(false)

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const user = mockUsers.find(u => 
      u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.nickname.includes(searchQuery)
    )
    
    if (user) {
      setSelectedUser(user)
      setLogs(mockLogs)
    } else {
      setSelectedUser(null)
      setLogs([])
    }
    setLoading(false)
  }

  // 筛选日志
  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.actionType !== filterType) return false
    if (showAbnormalOnly && !log.isAbnormal) return false
    return true
  })

  // 导出日志
  const handleExport = async () => {
    setExporting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setExporting(false)
    alert('日志已导出')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">用户行为审计</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 搜索框 */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户ID/手机号/昵称"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : '搜索'}
          </Button>
        </div>

        {/* 用户信息卡片 */}
        {selectedUser && (
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-full bg-muted overflow-hidden">
                <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{selectedUser.nickname}</span>
                  <span className="text-xs text-muted-foreground">UID: {selectedUser.uid}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    getRiskLevelInfo(selectedUser.riskLevel).color
                  )}>
                    {getRiskLevelInfo(selectedUser.riskLevel).label}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  手机：{selectedUser.phone}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>注册：{selectedUser.registerTime}</span>
                  <span>最后活跃：{selectedUser.lastActiveTime}</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">{selectedUser.loginCount}</div>
                    <div className="text-xs text-muted-foreground">登录次数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">{selectedUser.orderCount}</div>
                    <div className="text-xs text-muted-foreground">订单数</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选和操作 */}
        {selectedUser && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {actionTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
                    filterType === type.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowAbnormalOnly(!showAbnormalOnly)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg border transition-colors",
                  showAbnormalOnly
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-border text-muted-foreground"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                异常
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1" />
                    导出
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 操作轨迹时间轴 */}
        {selectedUser && (
          <div className="space-y-0">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无操作记录</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={log.id} className="relative pl-8">
                  {/* 时间轴线 */}
                  {index < filteredLogs.length - 1 && (
                    <div className="absolute left-[14px] top-8 bottom-0 w-0.5 bg-border" />
                  )}
                  
                  {/* 时间轴点 */}
                  <div className={cn(
                    "absolute left-0 top-2 w-7 h-7 rounded-full flex items-center justify-center",
                    log.isAbnormal ? "bg-red-100 text-red-600" : getActionColor(log.actionType)
                  )}>
                    {log.isAbnormal ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      getActionIcon(log.actionType)
                    )}
                  </div>

                  {/* 日志内容 */}
                  <div className={cn(
                    "pb-4 ml-2",
                    log.isAbnormal && "bg-red-50/50 -mx-2 px-2 rounded-lg"
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.actionName}</span>
                          {log.isAbnormal && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                              异常
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {log.description}
                        </p>
                        {log.isAbnormal && log.abnormalReason && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                            <Shield className="w-3 h-3" />
                            {log.abnormalReason}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {log.timestamp.split(' ')[1]}
                      </span>
                    </div>
                    
                    {/* 详细信息 */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        {log.deviceType === 'mobile' ? (
                          <Smartphone className="w-3 h-3" />
                        ) : (
                          <Monitor className="w-3 h-3" />
                        )}
                        {log.device}
                      </span>
                      <span>IP: {log.ip}</span>
                      {log.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {log.location}
                        </span>
                      )}
                    </div>

                    {/* 额外信息 */}
                    {log.extra && Object.keys(log.extra).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                        {Object.entries(log.extra).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-muted-foreground">{key}:</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 日期分隔 */}
                    {index < filteredLogs.length - 1 && 
                     log.timestamp.split(' ')[0] !== filteredLogs[index + 1].timestamp.split(' ')[0] && (
                      <div className="mt-4 pt-2 border-t border-dashed border-border">
                        <span className="text-xs text-muted-foreground">
                          {filteredLogs[index + 1].timestamp.split(' ')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 未搜索提示 */}
        {!selectedUser && !loading && (
          <div className="py-20 text-center text-muted-foreground">
            <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">搜索用户查看操作轨迹</p>
            <p className="text-sm">支持用户ID、手机号、昵称搜索</p>
          </div>
        )}
      </div>
    </div>
  )
}
