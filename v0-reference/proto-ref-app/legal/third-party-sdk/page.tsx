"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  ExternalLink, 
  Shield, 
  Smartphone,
  CreditCard,
  Share2,
  BarChart3,
  MapPin,
  MessageSquare,
  Play,
  Search,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// SDK类型
type SDKCategory = 'analytics' | 'payment' | 'social' | 'push' | 'map' | 'ad' | 'login' | 'media' | 'other'

// SDK信息
interface ThirdPartySDK {
  id: number
  name: string
  provider: string
  category: SDKCategory
  purpose: string
  collectedData: string[]
  privacyPolicyUrl: string
  officialWebsite?: string
}

// Mock SDK数据
const mockSDKList: ThirdPartySDK[] = [
  {
    id: 1,
    name: '微信开放平台SDK',
    provider: '深圳市腾讯计算机系统有限公司',
    category: 'login',
    purpose: '用于微信登录、微信分享功能',
    collectedData: ['设备标识符', '网络状态', '微信用户ID'],
    privacyPolicyUrl: 'https://weixin.qq.com/cgi-bin/readtemplate?lang=zh_CN&t=weixin_agreement&s=privacy',
    officialWebsite: 'https://open.weixin.qq.com',
  },
  {
    id: 2,
    name: '支付宝SDK',
    provider: '支付宝（杭州）信息技术有限公司',
    category: 'payment',
    purpose: '用于支付宝支付功能',
    collectedData: ['设备标识符', '网络状态', '交易信息'],
    privacyPolicyUrl: 'https://render.alipay.com/p/c/k2cx0tg8',
    officialWebsite: 'https://open.alipay.com',
  },
  {
    id: 3,
    name: '微信支付SDK',
    provider: '财付通支付科技有限公司',
    category: 'payment',
    purpose: '用于微信支付功能',
    collectedData: ['设备标识符', '网络状态', '交易信息'],
    privacyPolicyUrl: 'https://pay.weixin.qq.com/index.php/public/wechatpay_portal/privacy',
    officialWebsite: 'https://pay.weixin.qq.com',
  },
  {
    id: 4,
    name: '高德地图SDK',
    provider: '高德软件有限公司',
    category: 'map',
    purpose: '用于地图展示、位置定位、路线规划',
    collectedData: ['位置信息', '设备标识符', 'WiFi状态'],
    privacyPolicyUrl: 'https://lbs.amap.com/pages/privacy/',
    officialWebsite: 'https://lbs.amap.com',
  },
  {
    id: 5,
    name: '友盟统计SDK',
    provider: '友盟同欣（北京）科技有限公司',
    category: 'analytics',
    purpose: '用于应用数据统计分析',
    collectedData: ['设备标识符', '应用使用数据', '崩溃日志'],
    privacyPolicyUrl: 'https://www.umeng.com/page/policy',
    officialWebsite: 'https://www.umeng.com',
  },
  {
    id: 6,
    name: '极光推送SDK',
    provider: '深圳市和讯华谷信息技术有限公司',
    category: 'push',
    purpose: '用于消息推送服务',
    collectedData: ['设备标识符', '网络状态', '推送消息内容'],
    privacyPolicyUrl: 'https://www.jiguang.cn/license/privacy',
    officialWebsite: 'https://www.jiguang.cn',
  },
  {
    id: 7,
    name: '腾讯Bugly SDK',
    provider: '深圳市腾讯计算机系统有限公司',
    category: 'analytics',
    purpose: '用于应用崩溃监控和性能分析',
    collectedData: ['设备信息', '崩溃日志', '应用状态'],
    privacyPolicyUrl: 'https://privacy.qq.com/document/preview/fc748b3d96224fdb825ea79e132c1a56',
    officialWebsite: 'https://bugly.qq.com',
  },
  {
    id: 8,
    name: '阿里云播放器SDK',
    provider: '阿里云计算有限公司',
    category: 'media',
    purpose: '用于视频播放功能',
    collectedData: ['设备标识符', '网络状态', '播放记录'],
    privacyPolicyUrl: 'https://terms.alicdn.com/legal-agreement/terms/privacy_policy_full/20220519162334947/20220519162334947.html',
    officialWebsite: 'https://www.aliyun.com/product/vod',
  },
  {
    id: 9,
    name: 'QQ互联SDK',
    provider: '深圳市腾讯计算机系统有限公司',
    category: 'login',
    purpose: '用于QQ登录、QQ分享功能',
    collectedData: ['设备标识符', '网络状态', 'QQ用户ID'],
    privacyPolicyUrl: 'https://wiki.connect.qq.com/qq%e4%ba%92%e8%81%94sdk%e9%9a%90%e7%a7%81%e4%bf%9d%e6%8a%a4%e5%a3%b0%e6%98%8e',
    officialWebsite: 'https://connect.qq.com',
  },
  {
    id: 10,
    name: '新浪微博SDK',
    provider: '北京微梦创科网络技术有限公司',
    category: 'social',
    purpose: '用于微博登录、微博分享功能',
    collectedData: ['设备标识符', '网络状态', '微博用户ID'],
    privacyPolicyUrl: 'https://weibo.com/signup/v5/privacy',
    officialWebsite: 'https://open.weibo.com',
  },
]

// 获取分类图标
function getCategoryIcon(category: SDKCategory) {
  const icons: Record<SDKCategory, typeof Shield> = {
    analytics: BarChart3,
    payment: CreditCard,
    social: Share2,
    push: MessageSquare,
    map: MapPin,
    ad: Play,
    login: Smartphone,
    media: Play,
    other: Shield,
  }
  return icons[category]
}

// 获取分类标签
function getCategoryLabel(category: SDKCategory): string {
  const labels: Record<SDKCategory, string> = {
    analytics: '数据统计',
    payment: '支付服务',
    social: '社交分享',
    push: '消息推送',
    map: '地图服务',
    ad: '广告服务',
    login: '账号登录',
    media: '媒体播放',
    other: '其他服务',
  }
  return labels[category]
}

// 获取分类颜色
function getCategoryColor(category: SDKCategory): string {
  const colors: Record<SDKCategory, string> = {
    analytics: 'text-blue-600 bg-blue-50',
    payment: 'text-green-600 bg-green-50',
    social: 'text-purple-600 bg-purple-50',
    push: 'text-orange-600 bg-orange-50',
    map: 'text-cyan-600 bg-cyan-50',
    ad: 'text-red-600 bg-red-50',
    login: 'text-indigo-600 bg-indigo-50',
    media: 'text-pink-600 bg-pink-50',
    other: 'text-gray-600 bg-gray-50',
  }
  return colors[category]
}

export default function ThirdPartySDKPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sdkList, setSdkList] = useState<ThirdPartySDK[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SDKCategory | 'all'>('all')
  
  // 所有分类
  const categories: (SDKCategory | 'all')[] = ['all', 'login', 'payment', 'social', 'map', 'analytics', 'push', 'media', 'other']
  
  useEffect(() => {
    loadSDKList()
  }, [])
  
  const loadSDKList = async () => {
    setLoading(true)
    // Mock API
    await new Promise(resolve => setTimeout(resolve, 500))
    setSdkList(mockSDKList)
    setLoading(false)
  }
  
  // 筛选列表
  const filteredList = sdkList.filter(sdk => {
    const matchCategory = selectedCategory === 'all' || sdk.category === selectedCategory
    const matchKeyword = !searchKeyword || 
      sdk.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      sdk.provider.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchCategory && matchKeyword
  })
  
  // 按分类分组
  const groupedByCategory = filteredList.reduce((acc, sdk) => {
    if (!acc[sdk.category]) {
      acc[sdk.category] = []
    }
    acc[sdk.category].push(sdk)
    return acc
  }, {} as Record<SDKCategory, ThirdPartySDK[]>)
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0"
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">第三方SDK列表</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto shrink-0"
            onClick={loadSDKList}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>
      
      {/* 说明卡片 */}
      <div className="p-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">关于第三方SDK说明</p>
              <p className="text-blue-700">
                为保障App相关功能的正常运行，我们集成了以下第三方SDK。这些SDK可能会收集您的部分信息，
                我们已对合作方的信息收集行为进行严格审查，确保符合相关法律法规要求。
              </p>
            </div>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索SDK名称或提供方"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* 分类筛选 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat === 'all' ? '全部' : getCategoryLabel(cat)}
            </button>
          ))}
        </div>
        
        {/* 统计信息 */}
        <p className="text-sm text-muted-foreground mb-4">
          共 {filteredList.length} 个第三方SDK
        </p>
        
        {/* SDK列表 */}
        <div className="space-y-3">
          {filteredList.map(sdk => {
            const Icon = getCategoryIcon(sdk.category)
            return (
              <div 
                key={sdk.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      getCategoryColor(sdk.category)
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{sdk.name}</h3>
                      <p className="text-xs text-muted-foreground">{sdk.provider}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs",
                    getCategoryColor(sdk.category)
                  )}>
                    {getCategoryLabel(sdk.category)}
                  </span>
                </div>
                
                {/* 使用目的 */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">使用目的</p>
                  <p className="text-sm text-foreground">{sdk.purpose}</p>
                </div>
                
                {/* 收集信息 */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">收集的信息类型</p>
                  <div className="flex flex-wrap gap-1">
                    {sdk.collectedData.map((data, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                      >
                        {data}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* 链接 */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <a
                    href={sdk.privacyPolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Shield className="w-3 h-3" />
                    隐私政策
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {sdk.officialWebsite && (
                    <a
                      href={sdk.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      官方网站
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {filteredList.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">未找到匹配的SDK</p>
          </div>
        )}
        
        {/* 底部说明 */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>温馨提示：</strong>
            如您对上述第三方SDK有任何疑问，或希望了解更多信息，请通过以下方式联系我们：
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            邮箱：privacy@rebu.com | 电话：400-888-8888
          </p>
        </div>
      </div>
    </div>
  )
}
