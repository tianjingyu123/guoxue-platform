"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, Plus, Trash2, Edit, Save, AlertCircle, 
  HelpCircle, ChevronRight, Percent, Users, BookOpen, Radio,
  FileText, MessageCircle, Check, Info
} from "lucide-react"

// 内容类型配置
const contentTypes = [
  { key: "article", label: "文章", icon: FileText, color: "#4A90D9" },
  { key: "course", label: "课程", icon: BookOpen, color: "#C9A96E" },
  { key: "live", label: "直播", icon: Radio, color: "#C41E3A" },
  { key: "qa", label: "问答", icon: MessageCircle, color: "#10B981" },
]

// Mock: 当前分配方案
const mockDistributionPlans = [
  {
    id: "default",
    name: "默认分配方案",
    isDefault: true,
    description: "适用于所有内容类型的通用分配方案",
    rules: {
      platform: 10, // 平台抽成
      circle: 20,   // 圈子收益
      creator: 70,  // 创作者收益
    },
    contentTypes: ["article", "course", "live", "qa"],
    createdAt: "2024-01-01",
  },
  {
    id: "course-special",
    name: "课程专属方案",
    isDefault: false,
    description: "针对付费课程的特殊分配比例",
    rules: {
      platform: 15,
      circle: 15,
      creator: 70,
    },
    contentTypes: ["course"],
    createdAt: "2024-02-15",
  },
  {
    id: "live-tips",
    name: "直播打赏方案",
    isDefault: false,
    description: "直播打赏收益的分配规则",
    rules: {
      platform: 20,
      circle: 10,
      creator: 70,
    },
    contentTypes: ["live"],
    createdAt: "2024-03-01",
  },
]

// Mock: 嘉宾个性化分成
const mockGuestOverrides = [
  { guestId: "1", guestName: "张玄风", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhang", sharePercent: 75, contentTypes: ["article", "course"] },
  { guestId: "2", guestName: "李易安", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=li", sharePercent: 65, contentTypes: ["course"] },
]

export default function DistributionSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [activeTab, setActiveTab] = useState<"plans" | "guests">("plans")
  const [plans, setPlans] = useState(mockDistributionPlans)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-muted">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-foreground">收益分配设置</h1>
          <button 
            onClick={() => setShowHelp(true)}
            className="p-2 -mr-2 text-muted-foreground"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-muted">
          <button
            onClick={() => setActiveTab("plans")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "plans"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent"
            }`}
          >
            分配方案
          </button>
          <button
            onClick={() => setActiveTab("guests")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "guests"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent"
            }`}
          >
            嘉宾个性化
          </button>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">分配说明</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              收益分配顺序：平台抽成 → 圈子收益 → 创作者（嘉宾/老师）收益。
              您可以为不同内容类型设置不同方案，也可以为特定嘉宾设置个性化分成比例。
            </p>
          </div>
        </div>
      </div>

      {activeTab === "plans" ? (
        /* 分配方案列表 */
        <div className="p-4 space-y-3">
          {plans.map(plan => (
            <div 
              key={plan.id}
              className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{plan.name}</span>
                    {plan.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        默认
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                </div>
                <button 
                  onClick={() => setEditingPlan(plan.id)}
                  className="p-2 text-muted-foreground"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {/* 适用内容类型 */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.contentTypes.map(type => {
                  const cfg = contentTypes.find(t => t.key === type)
                  if (!cfg) return null
                  return (
                    <span 
                      key={type}
                      className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                    >
                      <cfg.icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  )
                })}
              </div>

              {/* 分配比例可视化 */}
              <div className="mt-3 pt-3 border-t border-muted">
                <div className="flex h-8 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-center text-white text-[10px] font-medium"
                    style={{ 
                      width: `${plan.rules.platform}%`, 
                      backgroundColor: "#999",
                      minWidth: plan.rules.platform > 5 ? "auto" : "20px"
                    }}
                  >
                    {plan.rules.platform > 8 && `${plan.rules.platform}%`}
                  </div>
                  <div 
                    className="flex items-center justify-center text-white text-[10px] font-medium"
                    style={{ 
                      width: `${plan.rules.circle}%`, 
                      backgroundColor: "#C9A96E" 
                    }}
                  >
                    {plan.rules.circle}%
                  </div>
                  <div 
                    className="flex items-center justify-center text-white text-[10px] font-medium"
                    style={{ 
                      width: `${plan.rules.creator}%`, 
                      backgroundColor: "#C41E3A" 
                    }}
                  >
                    {plan.rules.creator}%
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                    平台 {plan.rules.platform}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gold"></span>
                    圈子 {plan.rules.circle}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    创作者 {plan.rules.creator}%
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* 添加方案按钮 */}
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full py-4 border-2 border-dashed border-muted rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">添加分配方案</span>
          </button>
        </div>
      ) : (
        /* 嘉宾个性化分成 */
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground mb-2">
            为特定嘉宾/老师设置个性化分成比例，覆盖默认方案
          </p>

          {mockGuestOverrides.map(guest => (
            <div 
              key={guest.guestId}
              className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-3">
                <img alt="图片" 
                  src={guest.avatar} 
                  alt={guest.guestName}
                  className="w-10 h-10 rounded-xl"
                />
                <div className="flex-1">
                  <span className="font-medium text-foreground">{guest.guestName}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {guest.contentTypes.map(type => {
                      const cfg = contentTypes.find(t => t.key === type)
                      return cfg ? (
                        <span 
                          key={type}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{guest.sharePercent}%</span>
                  <p className="text-[10px] text-muted-foreground">创作者分成</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          ))}

          {mockGuestOverrides.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">暂无个性化分成设置</p>
              <p className="text-xs text-muted-foreground mt-1">所有嘉宾使用默认分配方案</p>
            </div>
          )}

          <button 
            className="w-full py-4 border-2 border-dashed border-muted rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">添加个性化分成</span>
          </button>
        </div>
      )}

      {/* 创建/编辑方案弹窗 */}
      {(showCreateModal || editingPlan) && (
        <PlanEditorModal
          plan={editingPlan ? plans.find(p => p.id === editingPlan) : undefined}
          onClose={() => { setShowCreateModal(false); setEditingPlan(null) }}
          onSave={(newPlan) => {
            if (editingPlan) {
              setPlans(plans.map(p => p.id === editingPlan ? { ...p, ...newPlan } : p))
            } else {
              setPlans([...plans, { ...newPlan, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] }])
            }
            setShowCreateModal(false)
            setEditingPlan(null)
          }}
        />
      )}

      {/* 帮助说明弹窗 */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
    </div>
  )
}

// 方案编辑弹窗
function PlanEditorModal({ 
  plan, 
  onClose, 
  onSave 
}: { 
  plan?: typeof mockDistributionPlans[0]
  onClose: () => void
  onSave: (plan: Partial<typeof mockDistributionPlans[0]>) => void
}) {
  const [name, setName] = useState(plan?.name || "")
  const [description, setDescription] = useState(plan?.description || "")
  const [isDefault, setIsDefault] = useState(plan?.isDefault || false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(plan?.contentTypes || ["article"])
  const [platform, setPlatform] = useState(plan?.rules.platform || 10)
  const [circle, setCircle] = useState(plan?.rules.circle || 20)
  const [creator, setCreator] = useState(plan?.rules.creator || 70)
  const [error, setError] = useState("")

  const total = platform + circle + creator

  const handleSave = () => {
    if (!name.trim()) {
      setError("请输入方案名称")
      return
    }
    if (selectedTypes.length === 0) {
      setError("请选择至少一种内容类型")
      return
    }
    if (total !== 100) {
      setError("分配比例总和必须为100%")
      return
    }
    onSave({
      name,
      description,
      isDefault,
      contentTypes: selectedTypes,
      rules: { platform, circle, creator }
    })
  }

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  // 自动调整创作者比例
  const adjustCreator = (newPlatform: number, newCircle: number) => {
    const remaining = 100 - newPlatform - newCircle
    if (remaining >= 0 && remaining <= 100) {
      setCreator(remaining)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-muted">
          <button onClick={onClose} className="text-muted-foreground">取消</button>
          <span className="font-medium text-foreground">
            {plan ? "编辑方案" : "创建方案"}
          </span>
          <button onClick={handleSave} className="text-primary font-medium">保存</button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 方案名称 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">方案名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError("") }}
              placeholder="如：课程专属方案"
              className="w-full px-4 py-3 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* 方案描述 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">方案描述（可选）</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述此方案的用途"
              className="w-full px-4 py-3 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* 适用内容类型 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">适用内容类型</label>
            <div className="flex flex-wrap gap-2">
              {contentTypes.map(type => (
                <button
                  key={type.key}
                  onClick={() => { toggleType(type.key); setError("") }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all ${
                    selectedTypes.includes(type.key)
                      ? "text-white"
                      : "bg-background text-muted-foreground"
                  }`}
                  style={selectedTypes.includes(type.key) ? { backgroundColor: type.color } : {}}
                >
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* 分配比例设置 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">分配比例</label>
            
            {/* 平台抽成 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">平台抽成</span>
                <span className="text-sm font-medium text-foreground">{platform}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={platform}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  setPlatform(val)
                  adjustCreator(val, circle)
                  setError("")
                }}
                className="w-full accent-muted-foreground"
              />
              <p className="text-[10px] text-muted-foreground mt-1">平台技术服务费，固定比例5%-30%</p>
            </div>

            {/* 圈子收益 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">圈子收益</span>
                <span className="text-sm font-medium text-gold">{circle}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={circle}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  setCircle(val)
                  adjustCreator(platform, val)
                  setError("")
                }}
                className="w-full accent-gold"
              />
              <p className="text-[10px] text-muted-foreground mt-1">归圈主所有，用于圈子运营</p>
            </div>

            {/* 创作者收益 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">创作者收益</span>
                <span className="text-sm font-medium text-primary">{creator}%</span>
              </div>
              <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${creator}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">归内容创作者（嘉宾/老师）所有</p>
            </div>

            {/* 比例校验 */}
            <div className={`flex items-center justify-between p-3 rounded-xl ${
              total === 100 ? "bg-green-50" : "bg-red-50"
            }`}>
              <span className={`text-sm ${total === 100 ? "text-green-600" : "text-red-600"}`}>
                比例总和
              </span>
              <span className={`font-medium ${total === 100 ? "text-green-600" : "text-red-600"}`}>
                {total}% {total === 100 ? <Check className="w-4 h-4 inline ml-1" /> : "(需为100%)"}
              </span>
            </div>
          </div>

          {/* 设为默认 */}
          <div className="flex items-center justify-between p-3 bg-background rounded-xl">
            <div>
              <span className="text-sm font-medium text-foreground">设为默认方案</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">新内容将自动使用此方案</p>
            </div>
            <button
              onClick={() => setIsDefault(!isDefault)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isDefault ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isDefault ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 帮助说明弹窗
function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-muted">
          <span className="font-medium text-foreground">收益分配说明</span>
          <button onClick={onClose} className="text-muted-foreground">关闭</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <h3 className="font-medium text-foreground mb-2">分配流程</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. 用户付费购买内容</p>
              <p>2. 平台扣除技术服务费</p>
              <p>3. 圈子获得运营收益</p>
              <p>4. 创作者获得内容收益</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-2">角色说明</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>平台</strong>：提供技术服务，收取固定比例服务费</p>
              <p><strong>圈子</strong>：圈主获得的运营收益，用于圈子建设</p>
              <p><strong>创作者</strong>：内容创作者（嘉宾/老师）的收益</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-2">注意事项</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 分配比例总和必须为100%</p>
              <p>• 可为不同内容类型设置不同方案</p>
              <p>• 可为特定嘉宾设置个性化比例</p>
              <p>• 修改方案不影响已结算的收益</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
