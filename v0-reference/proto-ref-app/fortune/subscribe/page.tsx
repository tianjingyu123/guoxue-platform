'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Bell, BellOff, User, Save, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { DataState } from '@/components/data-state'
import {
  getFortuneSubscribeSettings,
  updateBirthInfo,
  updatePushSettings,
  SHICHEN_OPTIONS,
  PUSH_TIME_OPTIONS,
  getShichenLabel,
} from '@/lib/api/fortune'
import type { FortuneSubscribeSettings, ShiChen, BirthInfo, FortunePushSettings } from '@/lib/types/fortune'

export default function FortuneSubscribePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // 设置数据
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    solarDate: '',
    isLunar: false,
    shichen: 'unknown',
    gender: 'male',
  })
  const [pushSettings, setPushSettings] = useState<FortunePushSettings>({
    enabled: true,
    pushTime: '08:00',
    pushTypes: {
      daily: true,
      weekly: true,
      important: true,
    },
  })
  
  // 弹层控制
  const [showShichenSheet, setShowShichenSheet] = useState(false)
  const [showTimeSheet, setShowTimeSheet] = useState(false)

  // 加载设置
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await getFortuneSubscribeSettings()
        if (response.code === 200 && response.data) {
          setBirthInfo(response.data.birthInfo)
          setPushSettings(response.data.pushSettings)
        } else {
          setError(response.message || '加载失败')
        }
      } catch {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  // 保存出生信息
  const handleSaveBirthInfo = async () => {
    if (!birthInfo.solarDate) {
      toast.error('请选择出生日期')
      return
    }
    
    setSaving(true)
    try {
      const response = await updateBirthInfo(birthInfo)
      if (response.code === 200) {
        toast.success('出生信息已保存')
      } else {
        toast.error(response.message || '保存失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  // 保存推送设置
  const handleSavePushSettings = async (newSettings: FortunePushSettings) => {
    try {
      const response = await updatePushSettings(newSettings)
      if (response.code === 200) {
        setPushSettings(newSettings)
        toast.success('设置已保存')
      } else {
        toast.error(response.message || '保存失败')
      }
    } catch {
      toast.error('网络错误')
    }
  }

  // 切换推送开关
  const togglePushEnabled = () => {
    const newSettings = { ...pushSettings, enabled: !pushSettings.enabled }
    handleSavePushSettings(newSettings)
  }

  // 切换推送类型
  const togglePushType = (type: 'daily' | 'weekly' | 'important') => {
    const newSettings = {
      ...pushSettings,
      pushTypes: {
        ...pushSettings.pushTypes,
        [type]: !pushSettings.pushTypes[type],
      },
    }
    handleSavePushSettings(newSettings)
  }

  // 选择推送时间
  const selectPushTime = (time: string) => {
    const newSettings = { ...pushSettings, pushTime: time }
    handleSavePushSettings(newSettings)
    setShowTimeSheet(false)
  }

  if (loading) {
    return (
      <DataState loading>
        <div className="min-h-screen" />
      </DataState>
    )
  }

  if (error) {
    return (
      <DataState error={error} onRetry={() => window.location.reload()}>
        <div className="min-h-screen" />
      </DataState>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">运势设置</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 出生信息 */}
        <section className="bg-card rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">出生信息</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            准确的出生信息可以让运势预测更加精准
          </p>

          {/* 出生日期 */}
          <div className="space-y-2">
            <Label>出生日期</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={birthInfo.solarDate}
                onChange={(e) => setBirthInfo({ ...birthInfo, solarDate: e.target.value })}
                className="flex-1"
              />
              <div className="flex items-center gap-2 px-3 bg-secondary rounded-lg">
                <span className="text-sm text-muted-foreground">农历</span>
                <Switch
                  checked={birthInfo.isLunar}
                  onCheckedChange={(checked) => setBirthInfo({ ...birthInfo, isLunar: checked })}
                />
              </div>
            </div>
            {birthInfo.lunarDate && (
              <p className="text-sm text-muted-foreground">
                农历：{birthInfo.lunarDate}
              </p>
            )}
          </div>

          {/* 出生时辰 */}
          <div className="space-y-2">
            <Label>出生时辰</Label>
            <button
              onClick={() => setShowShichenSheet(true)}
              className="w-full flex items-center justify-between p-3 bg-secondary rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{getShichenLabel(birthInfo.shichen)}</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
          </div>

          {/* 性别 */}
          <div className="space-y-2">
            <Label>性别</Label>
            <RadioGroup
              value={birthInfo.gender}
              onValueChange={(value) => setBirthInfo({ ...birthInfo, gender: value as 'male' | 'female' })}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className="font-normal cursor-pointer">男</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className="font-normal cursor-pointer">女</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 保存按钮 */}
          <Button 
            onClick={handleSaveBirthInfo} 
            disabled={saving}
            className="w-full bg-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存出生信息
          </Button>
        </section>

        {/* 推送设置 */}
        <section className="bg-card rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">推送设置</h2>
          </div>

          {/* 总开关 */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {pushSettings.enabled ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">每日运势推送</p>
                <p className="text-xs text-muted-foreground">开启后每天按时推送运势</p>
              </div>
            </div>
            <Switch
              checked={pushSettings.enabled}
              onCheckedChange={togglePushEnabled}
            />
          </div>

          {pushSettings.enabled && (
            <>
              {/* 推送时间 */}
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="font-medium">推送时间</p>
                  <p className="text-xs text-muted-foreground">选择每天接收运势的时间</p>
                </div>
                <button
                  onClick={() => setShowTimeSheet(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-lg"
                >
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">{pushSettings.pushTime}</span>
                </button>
              </div>

              {/* 推送类型 */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground">推送内容</p>
                
                <div className="flex items-center justify-between">
                  <span>每日运势</span>
                  <Switch
                    checked={pushSettings.pushTypes.daily}
                    onCheckedChange={() => togglePushType('daily')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span>每周运势</span>
                  <Switch
                    checked={pushSettings.pushTypes.weekly}
                    onCheckedChange={() => togglePushType('weekly')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span>重要日子提醒</span>
                  <Switch
                    checked={pushSettings.pushTypes.important}
                    onCheckedChange={() => togglePushType('important')}
                  />
                </div>
              </div>
            </>
          )}
        </section>

        {/* 说明 */}
        <p className="text-xs text-muted-foreground text-center px-4">
          运势预测仅供参考，请理性看待
        </p>
      </div>

      {/* 时辰选择弹层 */}
      <Sheet open={showShichenSheet} onOpenChange={setShowShichenSheet}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>选择出生时辰</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4 overflow-y-auto max-h-[calc(60vh-80px)]">
            {SHICHEN_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setBirthInfo({ ...birthInfo, shichen: option.value })
                  setShowShichenSheet(false)
                }}
                className={`flex flex-col items-start p-3 rounded-lg border transition-colors ${
                  birthInfo.shichen === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-medium">{option.label}</span>
                  {birthInfo.shichen === option.value && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </div>
                {option.time && (
                  <span className="text-xs text-muted-foreground">{option.time}</span>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* 推送时间选择弹层 */}
      <Sheet open={showTimeSheet} onOpenChange={setShowTimeSheet}>
        <SheetContent side="bottom" className="h-[50vh]">
          <SheetHeader>
            <SheetTitle>选择推送时间</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {PUSH_TIME_OPTIONS.map((time) => (
              <button
                key={time}
                onClick={() => selectPushTime(time)}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  pushSettings.pushTime === time
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-medium">{time}</span>
                {pushSettings.pushTime === time && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
