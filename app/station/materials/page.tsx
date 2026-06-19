'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Download, Share2, Check, QrCode, FileText, Image, Search, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DataState } from '@/components/data-state'
import { getMaterials, useMaterial, getMaterialTypeName } from '@/lib/api/materials'
import type { Material, MaterialType, PosterMaterial, CopywritingMaterial, QrcodeMaterial, MaterialsData } from '@/lib/types/materials'

export default function MaterialsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<MaterialType | 'all'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [data, setData] = useState<MaterialsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 海报预览
  const [selectedPoster, setSelectedPoster] = useState<PosterMaterial | null>(null)
  // 文案展开
  const [expandedCopy, setExpandedCopy] = useState<number | null>(null)
  // 二维码详情
  const [selectedQrcode, setSelectedQrcode] = useState<QrcodeMaterial | null>(null)
  // 复制成功提示
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getMaterials(activeTab)
      if (res.code === 200) {
        setData(res.data)
      } else {
        setError(res.message)
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 复制文案
  const handleCopy = async (item: CopywritingMaterial) => {
    try {
      await navigator.clipboard.writeText(item.content)
      setCopiedId(item.id)
      await useMaterial(item.id, 'copywriting', 'copy')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      alert('复制失败')
    }
  }

  // 保存海报
  const handleSavePoster = async (poster: PosterMaterial) => {
    await useMaterial(poster.id, 'poster', 'download')
    // 模拟下载
    const link = document.createElement('a')
    link.href = poster.fullImage
    link.download = `${poster.title}.png`
    link.click()
  }

  // 过滤素材
  const filteredMaterials = data?.materials.filter(item => {
    if (!searchKeyword) return true
    if (item.type === 'poster') {
      return (item as PosterMaterial).title.includes(searchKeyword) || 
             (item as PosterMaterial).tags.some(t => t.includes(searchKeyword))
    }
    if (item.type === 'copywriting') {
      return (item as CopywritingMaterial).title.includes(searchKeyword) || 
             (item as CopywritingMaterial).content.includes(searchKeyword)
    }
    if (item.type === 'qrcode') {
      return (item as QrcodeMaterial).title.includes(searchKeyword)
    }
    return true
  }) || []

  // 按类型分组
  const posters = filteredMaterials.filter(m => m.type === 'poster') as PosterMaterial[]
  const copywritings = filteredMaterials.filter(m => m.type === 'copywriting') as CopywritingMaterial[]
  const qrcodes = filteredMaterials.filter(m => m.type === 'qrcode') as QrcodeMaterial[]

  const getTabIcon = (type: string) => {
    switch(type) {
      case 'poster': return <Image className="w-4 h-4" />
      case 'copywriting': return <FileText className="w-4 h-4" />
      case 'qrcode': return <QrCode className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">推广素材库</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* 搜索框 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索素材..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-10 bg-gray-50 border-none"
          />
        </div>
      </div>

      {/* 生成专属海报入口 */}
      <div className="px-4 pt-3">
        <button
          onClick={() => router.push('/station/poster')}
          className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-[#C41E3A] to-[#A01830] px-4 py-3 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Image className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">生成专属分站海报</p>
              <p className="text-xs text-white/70">自定义风格，含专属二维码</p>
            </div>
          </div>
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* 分类Tab */}
      <div className="px-4 py-3 bg-white">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MaterialType | 'all')}>
          <TabsList className="w-full grid grid-cols-4 bg-gray-100/80">
            <TabsTrigger value="all" className="text-sm">全部</TabsTrigger>
            <TabsTrigger value="poster" className="text-sm flex items-center gap-1">
              <Image className="w-3 h-3" /> 海报
            </TabsTrigger>
            <TabsTrigger value="copywriting" className="text-sm flex items-center gap-1">
              <FileText className="w-3 h-3" /> 文案
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="text-sm flex items-center gap-1">
              <QrCode className="w-3 h-3" /> 二维码
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 内容区 */}
      <DataState
        loading={loading}
        error={error}
        empty={filteredMaterials.length === 0}
        emptyMessage="暂无素材"
        onRetry={loadData}
      >
        <div className="px-4 py-4 space-y-6">
          {/* 海报区 */}
          {(activeTab === 'all' || activeTab === 'poster') && posters.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Image className="w-4 h-4 text-[#C41E3A]" />
                海报素材
                <span className="text-xs text-gray-400">({posters.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {posters.map((poster) => (
                  <div
                    key={poster.id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm"
                    onClick={() => setSelectedPoster(poster)}
                  >
                    <div className="aspect-[3/4] bg-gray-100 relative">
                      <img
                        src={poster.thumbnail}
                        alt={poster.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-xs text-white/80">使用 {poster.useCount} 次</p>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{poster.title}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {poster.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 文案区 */}
          {(activeTab === 'all' || activeTab === 'copywriting') && copywritings.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C41E3A]" />
                文案素材
                <span className="text-xs text-gray-400">({copywritings.length})</span>
              </h3>
              <div className="space-y-3">
                {copywritings.map((copy) => (
                  <div key={copy.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{copy.title}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">适用: {copy.scene}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={copiedId === copy.id ? 'default' : 'outline'}
                        className={copiedId === copy.id ? 'bg-green-500 hover:bg-green-500' : ''}
                        onClick={() => handleCopy(copy)}
                      >
                        {copiedId === copy.id ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                    <div 
                      className={`text-sm text-gray-600 whitespace-pre-wrap ${expandedCopy !== copy.id ? 'line-clamp-3' : ''}`}
                    >
                      {copy.content}
                    </div>
                    {copy.content.split('\n').length > 3 && (
                      <button
                        className="text-xs text-[#C41E3A] mt-2"
                        onClick={() => setExpandedCopy(expandedCopy === copy.id ? null : copy.id)}
                      >
                        {expandedCopy === copy.id ? '收起' : '展开全文'}
                      </button>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">已被复制 {copy.copyCount} 次</span>
                      <div className="flex gap-1">
                        {copy.tags.map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-[#C41E3A]/5 text-[#C41E3A] rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 二维码区 */}
          {(activeTab === 'all' || activeTab === 'qrcode') && qrcodes.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#C41E3A]" />
                二维码
                <span className="text-xs text-gray-400">({qrcodes.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {qrcodes.map((qr) => (
                  <div
                    key={qr.id}
                    className="bg-white rounded-xl p-4 shadow-sm text-center"
                    onClick={() => setSelectedQrcode(qr)}
                  >
                    <div className="w-24 h-24 mx-auto bg-gray-100 rounded-lg overflow-hidden mb-3">
                      <img
                        src={qr.qrcodeUrl}
                        alt={qr.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{qr.title}</p>
                    <p className="text-xs text-gray-400 mt-1">扫描 {qr.scanCount} 次</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </DataState>

      {/* 海报预览弹层 */}
      <Dialog open={!!selectedPoster} onOpenChange={() => setSelectedPoster(null)}>
        <DialogContent className="max-w-[90vw] p-0 bg-black/90">
          {selectedPoster && (
            <div className="relative">
              <img
                src={selectedPoster.fullImage}
                alt={selectedPoster.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <p className="text-white font-medium mb-3">{selectedPoster.title}</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-white text-gray-900 hover:bg-gray-100"
                    onClick={() => handleSavePoster(selectedPoster)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    保存图片
                  </Button>
                  <Button
                    className="flex-1 bg-[#C41E3A] hover:bg-[#A01830]"
                    onClick={() => {
                      useMaterial(selectedPoster.id, 'poster', 'share')
                      alert('分享功能开发中')
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    分享
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 二维码详情弹层 */}
      <Sheet open={!!selectedQrcode} onOpenChange={() => setSelectedQrcode(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{selectedQrcode?.title}</SheetTitle>
          </SheetHeader>
          {selectedQrcode && (
            <div className="py-6">
              <div className="w-48 h-48 mx-auto bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <img
                  src={selectedQrcode.qrcodeUrl}
                  alt={selectedQrcode.title}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-center text-sm text-gray-500 mb-2">长按二维码保存到相册</p>
              <p className="text-center text-xs text-gray-400 mb-6">扫描次数: {selectedQrcode.scanCount}</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    useMaterial(selectedQrcode.id, 'qrcode', 'save')
                    const link = document.createElement('a')
                    link.href = selectedQrcode.qrcodeUrl
                    link.download = `${selectedQrcode.title}.png`
                    link.click()
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  保存图片
                </Button>
                <Button
                  className="flex-1 bg-[#C41E3A] hover:bg-[#A01830]"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedQrcode.targetUrl)
                    alert('链接已复制')
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制链接
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
