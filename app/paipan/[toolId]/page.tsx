"use client"

import { useState, useEffect, use } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/common/back-button"
import { DataState } from "@/components/data-state"
import { getInputSchema, calculateTool } from "@/lib/api/tools"
import type { InputSchema, InputField, CalculateResponse, BaziResult } from "@/lib/types/tools"
import { 
  Calendar, Clock, MapPin, Sparkles, 
  ChevronDown, Info, Share2, Download, BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"

// 工具名称映射
const toolNames: Record<string, string> = {
  bazi: "八字排盘",
  ziwei: "紫微斗数",
  liuyao: "六爻起卦",
  qimen: "奇门遁甲",
  liuren: "大六壬",
  taiyi: "太乙神数",
}

// 五行颜色映射
const elementColors: Record<string, string> = {
  木: "bg-green-500",
  火: "bg-red-500",
  土: "bg-yellow-600",
  金: "bg-gray-400",
  水: "bg-blue-500",
}

interface PageProps {
  params: Promise<{ toolId: string }>
}

export default function ToolPage({ params }: PageProps) {
  const { toolId } = use(params)
  const [schema, setSchema] = useState<InputSchema | null>(null)
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<CalculateResponse | null>(null)

  const toolName = toolNames[toolId] || toolId

  // 获取输入 Schema
  const fetchSchema = async () => {
    setIsLoading(true)
    setError(null)
    const response = await getInputSchema(toolId)
    if (response.code === 0) {
      setSchema(response.data)
      // 设置默认值
      const defaults: Record<string, string | number | boolean> = {}
      Object.entries(response.data.properties).forEach(([key, field]) => {
        if (field.default !== undefined) {
          defaults[key] = field.default
        }
      })
      setFormData(defaults)
    } else {
      setError(response.message)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSchema()
  }, [toolId])

  // 更新表单值
  const updateField = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // 检查表单是否有效
  const isFormValid = () => {
    if (!schema) return false
    return schema.required.every(key => {
      const value = formData[key]
      return value !== undefined && value !== ''
    })
  }

  // 提交计算
  const handleCalculate = async () => {
    if (!isFormValid()) return
    setIsCalculating(true)
    const response = await calculateTool(toolId, formData)
    if (response.code === 0) {
      setResult(response.data)
    } else {
      setError(response.message)
    }
    setIsCalculating(false)
  }

  // 重新排盘
  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  // 渲染表单字段
  const renderField = (key: string, field: InputField) => {
    const value = formData[key]
    const isRequired = schema?.required.includes(key)

    switch (field.type) {
      case 'enum':
        return (
          <div key={key}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.values && field.values.length <= 3 ? (
              // 少量选项用按钮组
              <div className="flex gap-3">
                {field.values.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField(key, option.value)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 transition-colors",
                      value === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              // 多选项用下拉
              <div className="relative">
                <select
                  value={value as string || ''}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  <option value="">{field.placeholder || `请选择${field.label}`}</option>
                  {field.values?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              </div>
            )}
          </div>
        )

      case 'date':
        return (
          <div key={key}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                value={value as string || ''}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )

      case 'datetime':
        return (
          <div key={key}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="datetime-local"
                value={value as string || ''}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )

      case 'string':
        return (
          <div key={key}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
              {!isRequired && <span className="text-muted-foreground text-xs ml-1">（可选）</span>}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={value as string || ''}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )

      case 'number':
        return (
          <div key={key}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value as number || ''}
              onChange={(e) => updateField(key, Number(e.target.value))}
              min={field.min}
              max={field.max}
              placeholder={field.placeholder}
              className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )

      case 'boolean':
        return (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {field.label}
            </label>
            <button
              type="button"
              onClick={() => updateField(key, !value)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                value ? "bg-primary" : "bg-secondary"
              )}
            >
              <span className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                value ? "right-1" : "left-1"
              )} />
            </button>
          </div>
        )

      default:
        return null
    }
  }

  // 渲染八字结果
  const renderBaziResult = (data: BaziResult) => (
    <>
      {/* 四柱八字 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">四柱八字</h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            {data.pattern}
          </Badge>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {data.fourPillars.map((pillar, index) => (
            <div key={index} className="text-center">
              <p className="text-xs text-muted-foreground mb-2">{pillar.pillar}</p>
              <div className="space-y-1">
                <div className={cn(
                  "h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold",
                  elementColors[pillar.element]
                )}>
                  {pillar.heavenlyStem}
                </div>
                <div className="h-12 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold text-foreground">
                  {pillar.earthlyBranch}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{pillar.animal}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 五行分析 */}
      <Card className="p-4">
        <h2 className="font-semibold text-foreground mb-4">五行分布</h2>
        <div className="flex items-center justify-between gap-2">
          {Object.entries(data.fiveElements).map(([element, count]) => {
            const names: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" }
            const colors: Record<string, string> = { wood: "bg-green-500", fire: "bg-red-500", earth: "bg-yellow-600", metal: "bg-gray-400", water: "bg-blue-500" }
            return (
              <div key={element} className="flex-1 text-center">
                <div className={cn("h-2 rounded-full mb-2", colors[element])} style={{ opacity: 0.3 + count * 0.2 }} />
                <p className="text-sm font-medium text-foreground">{names[element]}</p>
                <p className="text-xs text-muted-foreground">{count}个</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 基本信息 */}
      <Card className="p-4">
        <h2 className="font-semibold text-foreground mb-3">命盘概要</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">日主</span>
            <span className="font-medium text-foreground">{data.dayMaster}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">格局</span>
            <span className="font-medium text-foreground">{data.pattern}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">身强弱</span>
            <span className="font-medium text-foreground">{data.strength}</span>
          </div>
        </div>
      </Card>
    </>
  )

  // 渲染通用结果（JSON树形）
  const renderGenericResult = (data: unknown) => (
    <Card className="p-4">
      <h2 className="font-semibold text-foreground mb-4">计算结果</h2>
      <pre className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-4 overflow-auto max-h-96">
        {JSON.stringify(data, null, 2)}
      </pre>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/paipan" />
          <h1 className="font-semibold text-base text-foreground">{toolName}</h1>
          <button className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
            <Info className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <DataState
        isLoading={isLoading}
        isError={!!error && !result}
        errorMessage={error || undefined}
        onRetry={fetchSchema}
        minHeight="min-h-[400px]"
      >
        {!result ? (
          /* 输入表单 */
          <div className="p-4 space-y-6">
            {schema && Object.entries(schema.properties).map(([key, field]) => 
              renderField(key, field)
            )}

            {/* 排盘按钮 */}
            <button
              onClick={handleCalculate}
              disabled={!isFormValid() || isCalculating}
              className={cn(
                "w-full py-4 rounded-xl font-semibold text-base transition-all",
                isFormValid() && !isCalculating
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isCalculating ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  正在排盘...
                </span>
              ) : (
                "开始排盘"
              )}
            </button>
          </div>
        ) : (
          /* 结果展示 */
          <div className="p-4 space-y-4">
            {/* 根据工具类型渲染不同结果 */}
            {toolId === 'bazi' && result.result 
              ? renderBaziResult(result.result as BaziResult)
              : renderGenericResult(result.result)
            }

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground">
                <Share2 className="w-4 h-4" />
                分享
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground">
                <Download className="w-4 h-4" />
                保存
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="w-4 h-4" />
                AI解读
              </button>
            </div>

            {/* 重新排盘 */}
            <button
              onClick={handleReset}
              className="w-full py-3 text-primary text-sm"
            >
              重新排盘
            </button>
          </div>
        )}
      </DataState>
    </div>
  )
}
