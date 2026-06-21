'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Camera, Check, Eye, Loader2, Save, Upload, User, Phone, Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { getStationConfig, updateStationConfig, uploadImage, getStationSummary } from '@/lib/api/station-config'
import { THEME_COLOR_PRESETS } from '@/lib/types/station-config'
import type { StationConfig, StationConfigUpdateRequest } from '@/lib/types/station-config'

export default function StationConfigPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <StationConfigContent />
    </Suspense>
  )
}

function StationConfigContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stationId = searchParams.get('id') ? Number(searchParams.get('id')) : undefined

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<StationConfig | null>(null)
  const [summary, setSummary] = useState<{ memberCount: number; totalRevenue: number; contentCount: number; visitCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 表单状态
  const [formData, setFormData] = useState<StationConfigUpdateRequest>({})
  const [selectedTheme, setSelectedTheme] = useState('guoxue')
  const [customColor, setCustomColor] = useState({ primary: '#C41E3A', secondary: '#C9A96E' })
  const [useCustomColor, setUseCustomColor] = useState(false)

  // 上传状态
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingQrcode, setUploadingQrcode] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const qrcodeInputRef = useRef<HTMLInputElement>(null)

  // 加载配置
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [configRes, summaryRes] = await Promise.all([
          getStationConfig(stationId),
          stationId ? getStationSummary(stationId) : Promise.resolve({ code: 200, data: null, message: '' }),
        ])

        if (configRes.code === 200 && configRes.data) {
          setConfig(configRes.data)
          setFormData({
            name: configRes.data.name,
            logo: configRes.data.logo,
            description: configRes.data.description,
            themeColorId: configRes.data.themeColorId,
            contactPhone: configRes.data.contactPhone,
            contactWechat: configRes.data.contactWechat,
            contactEmail: configRes.data.contactEmail,
            miniProgramQrcode: configRes.data.miniProgramQrcode,
          })
          setSelectedTheme(configRes.data.themeColorId || 'guoxue')
          if (configRes.data.customPrimaryColor) {
            setUseCustomColor(true)
            setCustomColor({
              primary: configRes.data.customPrimaryColor,
              secondary: configRes.data.customSecondaryColor || '#C9A96E',
            })
          }
        }

        if (summaryRes.code === 200 && summaryRes.data) {
          setSummary(summaryRes.data)
        }
      } catch (err) {
        setError('加载配置失败')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [stationId])

  // 处理Logo上传
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 验证文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过2MB')
      return
    }

    try {
      setUploadingLogo(true)
      const res = await uploadImage(file, 'logo')
      if (res.code === 200 && res.data) {
        setFormData(prev => ({ ...prev, logo: res.data.url }))
        toast.success('Logo上传成功')
      }
    } catch {
      toast.error('上传失败，请重试')
    } finally {
      setUploadingLogo(false)
    }
  }

  // 处理小程序码上传
  const handleQrcodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    try {
      setUploadingQrcode(true)
      const res = await uploadImage(file, 'qrcode')
      if (res.code === 200 && res.data) {
        setFormData(prev => ({ ...prev, miniProgramQrcode: res.data.url }))
        toast.success('小程序码上传成功')
      }
    } catch {
      toast.error('上传失败，请重试')
    } finally {
      setUploadingQrcode(false)
    }
  }

  // 保存配置
  const handleSave = async () => {
    if (!config) return

    // 验证必填项
    if (!formData.name?.trim()) {
      toast.error('请输入分站名称')
      return
    }

    try {
      setSaving(true)
      const updateData: StationConfigUpdateRequest = {
        ...formData,
        themeColorId: useCustomColor ? 'custom' : selectedTheme,
        customPrimaryColor: useCustomColor ? customColor.primary : undefined,
        customSecondaryColor: useCustomColor ? customColor.secondary : undefined,
      }

      const res = await updateStationConfig(config.id, updateData)
      if (res.code === 200) {
        toast.success('保存成功')
        setConfig(res.data)
      } else {
        toast.error(res.message || '保存失败')
      }
    } catch {
      toast.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 获取当前主题色
  const getCurrentThemeColor = () => {
    if (useCustomColor) {
      return customColor
    }
    const preset = THEME_COLOR_PRESETS.find(p => p.id === selectedTheme)
    return preset ? { primary: preset.primary, secondary: preset.secondary } : { primary: '#C41E3A', secondary: '#C9A96E' }
  }

  const themeColor = getCurrentThemeColor()

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <header 
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: themeColor.primary }}
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">分站配置</h1>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="p-2 -mr-2 text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        </button>
      </header>

      <DataState
        loading={loading}
        error={error}
        data={config}
        skeleton={<ConfigSkeleton />}
        emptyText="暂无配置信息"
      >
        {config && (
          <div className="pb-24">
            {/* 运营数据摘要 */}
            {summary && (
              <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold" style={{ color: themeColor.primary }}>{summary.memberCount}</div>
                    <div className="text-xs text-gray-500">成员</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold" style={{ color: themeColor.primary }}>{(summary.totalRevenue / 10000).toFixed(1)}w</div>
                    <div className="text-xs text-gray-500">收益</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold" style={{ color: themeColor.primary }}>{summary.contentCount}</div>
                    <div className="text-xs text-gray-500">内容</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold" style={{ color: themeColor.primary }}>{(summary.visitCount / 10000).toFixed(1)}w</div>
                    <div className="text-xs text-gray-500">访问</div>
                  </div>
                </div>
              </div>
            )}

            {/* Logo 上传 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">分站Logo</Label>
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 cursor-pointer group"
                  style={{ borderColor: themeColor.primary }}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">建议尺寸：200x200像素</p>
                  <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG 格式，最大 2MB</p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            {/* 基本信息 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm space-y-4">
              <h3 className="font-medium text-gray-800">基本信息</h3>

              <div>
                <Label htmlFor="name" className="text-sm text-gray-600">分站名称 *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入分站名称"
                  className="mt-1"
                  maxLength={20}
                />
                <p className="text-xs text-gray-400 mt-1">{formData.name?.length || 0}/20</p>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm text-gray-600">分站简介</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="介绍一下你的分站..."
                  className="mt-1 min-h-[100px]"
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{formData.description?.length || 0}/200</p>
              </div>
            </div>

            {/* 主题色选择 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">主题色</h3>
                <button
                  onClick={() => setUseCustomColor(!useCustomColor)}
                  className="text-sm"
                  style={{ color: themeColor.primary }}
                >
                  {useCustomColor ? '使用预设' : '自定义'}
                </button>
              </div>

              {!useCustomColor ? (
                <div className="grid grid-cols-4 gap-3">
                  {THEME_COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedTheme(preset.id)}
                      className={`relative p-2 rounded-lg border-2 transition-all ${
                        selectedTheme === preset.id ? 'border-gray-800' : 'border-transparent'
                      }`}
                    >
                      <div 
                        className="w-full aspect-square rounded-lg mb-1"
                        style={{ 
                          background: `linear-gradient(135deg, ${preset.primary} 50%, ${preset.secondary} 50%)`
                        }}
                      />
                      <span className="text-xs text-gray-600">{preset.name}</span>
                      {selectedTheme === preset.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-gray-600 w-20">主色调</Label>
                    <input
                      type="color"
                      value={customColor.primary}
                      onChange={(e) => setCustomColor(prev => ({ ...prev, primary: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={customColor.primary}
                      onChange={(e) => setCustomColor(prev => ({ ...prev, primary: e.target.value }))}
                      className="flex-1 font-mono text-sm"
                      placeholder="#C41E3A"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-gray-600 w-20">辅助色</Label>
                    <input
                      type="color"
                      value={customColor.secondary}
                      onChange={(e) => setCustomColor(prev => ({ ...prev, secondary: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={customColor.secondary}
                      onChange={(e) => setCustomColor(prev => ({ ...prev, secondary: e.target.value }))}
                      className="flex-1 font-mono text-sm"
                      placeholder="#C9A96E"
                    />
                  </div>
                </div>
              )}

              {/* 预览效果 */}
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: themeColor.primary + '10' }}>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" style={{ color: themeColor.primary }} />
                  <span className="text-sm" style={{ color: themeColor.primary }}>预览效果</span>
                </div>
                <div 
                  className="mt-2 h-12 rounded-lg flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: themeColor.primary }}
                >
                  导航栏样式
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex-1 py-2 rounded-lg text-white text-sm"
                    style={{ backgroundColor: themeColor.primary }}
                  >
                    主按钮
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg text-sm border"
                    style={{ borderColor: themeColor.primary, color: themeColor.primary }}
                  >
                    次按钮
                  </button>
                </div>
              </div>
            </div>

            {/* 联系方式 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm space-y-4">
              <h3 className="font-medium text-gray-800">联系方式</h3>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gray-500" />
                </div>
                <Input
                  value={formData.contactPhone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="联系电话"
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-gray-500" />
                </div>
                <Input
                  value={formData.contactWechat || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactWechat: e.target.value }))}
                  placeholder="微信号"
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-500" />
                </div>
                <Input
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="邮箱地址"
                  className="flex-1"
                  type="email"
                />
              </div>
            </div>

            {/* 小程序码 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">小程序码</Label>
              <div className="flex items-start gap-4">
                <div 
                  className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer group"
                  onClick={() => qrcodeInputRef.current?.click()}
                >
                  {formData.miniProgramQrcode ? (
                    <img src={formData.miniProgramQrcode} alt="小程序码" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">上传小程序码</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingQrcode ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <p className="text-sm text-gray-600">上传小程序码供用户扫码访问</p>
                  <p className="text-xs text-gray-400 mt-1">建议尺寸：430x430像素</p>
                </div>
                <input
                  ref={qrcodeInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQrcodeUpload}
                />
              </div>
            </div>

            {/* 站长信息（只读） */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm">
              <h3 className="font-medium text-gray-800 mb-3">站长信息</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                  {config.masterInfo.avatar ? (
                    <img src={config.masterInfo.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{config.masterInfo.nickname}</div>
                  <div className="text-sm text-gray-500">{config.masterInfo.phone}</div>
                </div>
                <div className="text-xs text-gray-400">
                  入驻：{config.masterInfo.joinDate}
                </div>
              </div>
            </div>

            {/* 状态信息 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">分站状态</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  config.status === 'active' ? 'bg-green-100 text-green-600' :
                  config.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {config.status === 'active' ? '运营中' : config.status === 'pending' ? '审核中' : '已暂停'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">分站代码</span>
                <span className="font-mono text-gray-700">{config.code}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">最后更新</span>
                <span className="text-gray-700">{config.updatedAt}</span>
              </div>
            </div>

            <div className="h-4" />
          </div>
        )}
      </DataState>

      {/* 底部保存按钮 */}
      {config && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base text-white"
            style={{ backgroundColor: themeColor.primary }}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存配置'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// 骨架屏组件
function ConfigSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* 数据摘要骨架 */}
      <div className="h-20 bg-white rounded-xl" />
      
      {/* Logo区域骨架 */}
      <div className="p-4 bg-white rounded-xl">
        <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* 基本信息骨架 */}
      <div className="p-4 bg-white rounded-xl space-y-4">
        <div className="h-5 w-20 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>

      {/* 主题色骨架 */}
      <div className="p-4 bg-white rounded-xl">
        <div className="h-5 w-16 bg-gray-200 rounded mb-3" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>

      {/* 联系方式骨架 */}
      <div className="p-4 bg-white rounded-xl space-y-4">
        <div className="h-5 w-20 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
