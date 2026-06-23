"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  User, 
  MapPin, 
  Smartphone, 
  Activity,
  CreditCard,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Check,
  AlertCircle,
  Settings,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 信息分组类型
interface DataField {
  name: string
  purpose: string
  isRequired: boolean
  legalBasis?: string
}

interface DataCategory {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  fields: DataField[]
  canManage: boolean
}

// 数据分类
const dataCategories: DataCategory[] = [
  {
    id: 'account',
    name: '账号信息',
    icon: <User className="w-5 h-5" />,
    description: '用于创建和维护您的账户',
    canManage: false,
    fields: [
      { name: '手机号码', purpose: '账号注册、登录验证、找回密码', isRequired: true, legalBasis: '合同履行' },
      { name: '用户昵称', purpose: '展示身份、社区互动', isRequired: true, legalBasis: '合同履行' },
      { name: '头像', purpose: '个人形象展示', isRequired: false, legalBasis: '同意' },
      { name: '性别', purpose: '个性化推荐、社区功能', isRequired: false, legalBasis: '同意' },
      { name: '出生日期', purpose: '命理服务、年龄验证', isRequired: false, legalBasis: '同意' },
      { name: '出生时辰', purpose: '命理排盘服务', isRequired: false, legalBasis: '同意' },
      { name: '出生地点', purpose: '命理排盘服务（时区计算）', isRequired: false, legalBasis: '同意' },
      { name: '邮箱地址', purpose: '重要通知、找回密码', isRequired: false, legalBasis: '同意' },
    ],
  },
  {
    id: 'location',
    name: '位置信息',
    icon: <MapPin className="w-5 h-5" />,
    description: '用于附近功能和位置服务',
    canManage: true,
    fields: [
      { name: '精确位置', purpose: '附近的人/驿站、同城发现', isRequired: false, legalBasis: '同意' },
      { name: '城市信息', purpose: '本地化内容推荐、活动筛选', isRequired: false, legalBasis: '同意' },
      { name: 'IP地址', purpose: '安全防护、区域服务', isRequired: true, legalBasis: '合法利益' },
    ],
  },
  {
    id: 'device',
    name: '设备信息',
    icon: <Smartphone className="w-5 h-5" />,
    description: '用于安全防护和服务优化',
    canManage: false,
    fields: [
      { name: '设备型号', purpose: '界面适配、问题排查', isRequired: true, legalBasis: '合法利益' },
      { name: '操作系统版本', purpose: '兼容性保障、功能适配', isRequired: true, legalBasis: '合法利益' },
      { name: '设备标识符', purpose: '账号安全、防欺诈', isRequired: true, legalBasis: '合法利益' },
      { name: '网络类型', purpose: '服务质量优化', isRequired: true, legalBasis: '合法利益' },
      { name: '应用版本', purpose: '功能更新、问题排查', isRequired: true, legalBasis: '合法利益' },
    ],
  },
  {
    id: 'behavior',
    name: '行为记录',
    icon: <Activity className="w-5 h-5" />,
    description: '用于改善产品体验和个性化推荐',
    canManage: true,
    fields: [
      { name: '浏览历史', purpose: '个性化内容推荐', isRequired: false, legalBasis: '同意' },
      { name: '搜索记录', purpose: '搜索建议、历史记录', isRequired: false, legalBasis: '同意' },
      { name: '点击行为', purpose: '产品体验优化', isRequired: false, legalBasis: '合法利益' },
      { name: '学习进度', purpose: '课程续学、学习统计', isRequired: false, legalBasis: '合同履行' },
      { name: '收藏/关注', purpose: '内容聚合、更新提醒', isRequired: false, legalBasis: '合同履行' },
    ],
  },
  {
    id: 'transaction',
    name: '交易记录',
    icon: <CreditCard className="w-5 h-5" />,
    description: '用于订单处理和售后服务',
    canManage: false,
    fields: [
      { name: '订单信息', purpose: '交易记录、售后服务', isRequired: true, legalBasis: '合同履行' },
      { name: '支付记录', purpose: '支付完成、退款处理', isRequired: true, legalBasis: '合同履行' },
      { name: '发票信息', purpose: '开具发票', isRequired: false, legalBasis: '法律义务' },
      { name: '收货地址', purpose: '实物商品配送', isRequired: false, legalBasis: '合同履行' },
    ],
  },
  {
    id: 'interaction',
    name: '互动数据',
    icon: <MessageCircle className="w-5 h-5" />,
    description: '用于社区功能和内容审核',
    canManage: true,
    fields: [
      { name: '发布内容', purpose: '社区展示、内容审核', isRequired: false, legalBasis: '合同履行' },
      { name: '评论/回复', purpose: '社区互动、内容审核', isRequired: false, legalBasis: '合同履行' },
      { name: '私信记录', purpose: '用户间通讯', isRequired: false, legalBasis: '合同履行' },
      { name: '举报记录', purpose: '内容治理、违规处理', isRequired: false, legalBasis: '合法利益' },
    ],
  },
]

export default function DataCollectionListPage() {
  const router = useRouter()
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['account'])

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
  }

  const expandAll = () => {
    setExpandedCategories(dataCategories.map(c => c.id))
  }

  const collapseAll = () => {
    setExpandedCategories([])
  }

  // 统计
  const totalFields = dataCategories.reduce((sum, cat) => sum + cat.fields.length, 0)
  const requiredFields = dataCategories.reduce(
    (sum, cat) => sum + cat.fields.filter(f => f.isRequired).length, 
    0
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">个人信息收集清单</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings/privacy')}
          >
            <Settings className="w-4 h-4 mr-1" />
            管理授权
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 说明卡片 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-blue-800">
                根据《个人信息保护法》第17条规定，我们向您明示收集的个人信息清单。
                您可以随时在「设置-隐私」中管理您的授权。
              </p>
              <div className="flex gap-4 text-xs text-blue-700">
                <span>共 {totalFields} 项信息</span>
                <span>必需 {requiredFields} 项</span>
                <span>可选 {totalFields - requiredFields} 项</span>
              </div>
            </div>
          </div>
        </div>

        {/* 展开/收起 */}
        <div className="flex justify-end gap-2">
          <button 
            onClick={expandAll}
            className="text-xs text-primary hover:underline"
          >
            全部展开
          </button>
          <span className="text-muted-foreground">|</span>
          <button 
            onClick={collapseAll}
            className="text-xs text-primary hover:underline"
          >
            全部收起
          </button>
        </div>

        {/* 分组列表 */}
        <div className="space-y-3">
          {dataCategories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            const requiredCount = category.fields.filter(f => f.isRequired).length
            
            return (
              <div 
                key={category.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* 分组头部 */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{category.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          {category.fields.length}项
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {category.canManage && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        可管理
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* 字段列表 */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {category.fields.map((field, index) => (
                      <div 
                        key={field.name}
                        className={cn(
                          "px-4 py-3",
                          index !== category.fields.length - 1 && "border-b border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{field.name}</span>
                              {field.isRequired ? (
                                <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                  必需
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  可选
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {field.purpose}
                            </p>
                          </div>
                          {field.legalBasis && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {field.legalBasis}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* 管理授权入口 */}
                    {category.canManage && (
                      <div className="px-4 py-3 bg-muted/30">
                        <button
                          onClick={() => router.push('/settings/privacy')}
                          className="text-sm text-primary flex items-center gap-1 hover:underline"
                        >
                          管理此类信息的授权
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 图例说明 */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-sm">标签说明</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">必需</span>
              <span className="text-muted-foreground">提供基本服务所必需</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">可选</span>
              <span className="text-muted-foreground">可拒绝，不影响基本功能</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">可管理</span>
              <span className="text-muted-foreground">可在设置中开启/关闭</span>
            </div>
          </div>
        </div>

        {/* 法律依据说明 */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-sm">处理依据说明</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <span className="font-medium text-foreground w-16 flex-shrink-0">合同履行</span>
              <span>为履行与您签订的用户协议所必需</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-foreground w-16 flex-shrink-0">同意</span>
              <span>基于您的明示同意收集，可随时撤回</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-foreground w-16 flex-shrink-0">合法利益</span>
              <span>为维护平台安全、优化服务所必需</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-foreground w-16 flex-shrink-0">法律义务</span>
              <span>为履行法定义务所必需</span>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">
            如有疑问，请联系我们
          </p>
          <p className="text-sm">
            <a href="mailto:privacy@rebu.com" className="text-primary hover:underline">
              privacy@rebu.com
            </a>
          </p>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-pb">
        <Button 
          className="w-full bg-primary hover:bg-primary/90"
          onClick={() => router.push('/settings/privacy')}
        >
          管理我的授权
        </Button>
      </div>
    </div>
  )
}
