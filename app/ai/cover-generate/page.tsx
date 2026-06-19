'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Download, Check, RefreshCw, Save, History, ChevronRight, Wand2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { 
  getCoverStyles, 
  generateSmartPrompt, 
  generateCover, 
  saveCoverToLibrary, 
  downloadCover,
  getCoverHistory,
  getStyleName
} from '@/lib/api/ai-cover'
import type { CoverStyle, CoverSize, CoverGenerateResult, CoverStyleOption, CoverHistoryItem } from '@/lib/types/ai-cover'

export default function CoverGeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <CoverGenerateContent />
    </Suspense>
  )
}

function CoverGenerateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 从 URL 获取内容信息
  const contentTitle = searchParams.get('title') || ''
  const contentSummary = searchParams.get('summary') || ''
  const contentId = searchParams.get('contentId') || ''
  const contentType = searchParams.get('contentType') || 'article'
  
  // 状态
  const [title, setTitle] = useState(contentTitle)
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>('traditional')
  const [selectedSize, setSelectedSize] = useState<CoverSize>('16:9')
  const [generateCount, setGenerateCount] = useState(4)
  
  const [styles, setStyles] = useState<CoverStyleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<CoverGenerateResult[]>([])
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<CoverHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // 尺寸选项
  const sizeOptions: { value: CoverSize; label: string; ratio: string }[] = [
    { value: '16:9', label: '横版', ratio: '16:9' },
    { value: '4:3', label: '标准', ratio: '4:3' },
    { value: '1:1', label: '方形', ratio: '1:1' },
    { value: '3:4', label: '竖版', ratio: '3:4' },
  ]

  // 加载风格选项
  useEffect(() => {
    const loadStyles = async () => {
      const res = await getCoverStyles()
      if (res.code === 200) {
        setStyles(res.data)
      }
      setLoading(false)
    }
    loadStyles()
  }, [])

  // 智能生成 Prompt
  const handleSmartPrompt = async () => {
    if (!title.trim()) return
    const res = await generateSmartPrompt(title, contentSummary, selectedStyle)
    if (res.code === 200) {
      setPrompt(res.data.prompt)
    }
  }

  // 生成封面
  const handleGenerate = async () => {
    if (!title.trim()) return
    
    setGenerating(true)
    setResults([])
    setSelectedResultId(null)
    
    try {
      const res = await generateCover({
        title,
        summary: contentSummary,
        prompt: prompt || undefined,
        style: selectedStyle,
        size: selectedSize,
        count: generateCount,
      })
      
      if (res.code === 200 && res.data.status === 'completed') {
        setResults(res.data.results)
        if (res.data.results.length > 0) {
          setSelectedResultId(res.data.results[0].id)
        }
      }
    } finally {
      setGenerating(false)
    }
  }

  // 保存到素材库
  const handleSave = async () => {
    if (!selectedResultId) return
    setSaving(true)
    try {
      const res = await saveCoverToLibrary(selectedResultId)
      if (res.code === 200) {
        alert('已保存到素材库')
      }
    } finally {
      setSaving(false)
    }
  }

  // 下载封面
  const handleDownload = async () => {
    if (!selectedResultId) return
    const res = await downloadCover(selectedResultId)
    if (res.code === 200) {
      // 触发下载
      const link = document.createElement('a')
      link.href = res.data.downloadUrl
      link.download = `cover_${selectedResultId}.png`
      link.click()
    }
  }

  // 应用封面（返回上一页并传递选中的封面）
  const handleApply = () => {
    const selected = results.find(r => r.id === selectedResultId)
    if (selected && contentId) {
      // 实际应用中这里会调用API更新内容封面
      router.back()
    }
  }

  // 加载历史记录
  const loadHistory = async () => {
    setHistoryLoading(true)
    const res = await getCoverHistory()
    if (res.code === 200) {
      setHistory(res.data)
    }
    setHistoryLoading(false)
  }

  const selectedResult = results.find(r => r.id === selectedResultId)

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#9a1830] text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">AI 封面生成</h1>
          </div>
          <button 
            onClick={() => { setShowHistory(true); loadHistory() }}
            className="p-2"
          >
            <History className="h-5 w-5" />
          </button>
        </div>
      </header>

      <DataState loading={loading}>
        <div className="p-4 space-y-6">
          {/* 内容标题 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">内容标题</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入文章/帖子标题"
              className="bg-white"
            />
          </div>

          {/* Prompt 输入 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">生成描述 (Prompt)</label>
              <button 
                onClick={handleSmartPrompt}
                disabled={!title.trim()}
                className="flex items-center gap-1 text-xs text-[#C41E3A] disabled:opacity-50"
              >
                <Wand2 className="h-3 w-3" />
                智能生成
              </button>
            </div>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="描述你想要的封面风格、元素、色调等（可选，AI会根据标题自动生成）"
              rows={3}
              className="bg-white resize-none"
            />
          </div>

          {/* 风格选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">封面风格</label>
            <div className="grid grid-cols-3 gap-2">
              {styles.map(style => (
                <button
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value)}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    selectedStyle === style.value
                      ? 'border-[#C41E3A] bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-full h-12 rounded bg-gray-100 mb-2 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <span className={`text-xs font-medium ${
                      selectedStyle === style.value ? 'text-[#C41E3A]' : 'text-gray-700'
                    }`}>
                      {style.label}
                    </span>
                  </div>
                  {selectedStyle === style.value && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 尺寸选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">封面尺寸</label>
            <div className="flex gap-2">
              {sizeOptions.map(size => (
                <button
                  key={size.value}
                  onClick={() => setSelectedSize(size.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-center transition-all ${
                    selectedSize === size.value
                      ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <div className="text-sm font-medium">{size.label}</div>
                  <div className="text-xs text-gray-500">{size.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 生成数量 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">生成数量</label>
            <div className="flex gap-2">
              {[2, 4, 6].map(count => (
                <button
                  key={count}
                  onClick={() => setGenerateCount(count)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    generateCount === count
                      ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {count} 张
                </button>
              ))}
            </div>
          </div>

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerate}
            disabled={!title.trim() || generating}
            className="w-full h-12 bg-gradient-to-r from-[#C41E3A] to-[#9a1830] hover:from-[#a31830] hover:to-[#7a1428] text-white font-semibold"
          >
            {generating ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                AI 生成中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                生成封面
              </div>
            )}
          </Button>

          {/* 生成结果 */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">生成结果</h3>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1 text-sm text-[#C41E3A]"
                >
                  <RefreshCw className="h-4 w-4" />
                  重新生成
                </button>
              </div>

              {/* 结果网格 */}
              <div className="grid grid-cols-2 gap-3">
                {results.map(result => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResultId(result.id)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      selectedResultId === result.id
                        ? 'border-[#C41E3A] ring-2 ring-[#C41E3A]/30'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="aspect-video bg-gray-100">
                      <img
                        src={result.url}
                        alt="生成的封面"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedResultId === result.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#C41E3A] rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* 选中的封面预览 */}
              {selectedResult && (
                <div className="bg-white rounded-xl p-4 space-y-4">
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedResult.url}
                      alt="选中的封面"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {getStyleName(selectedResult.style)}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {selectedResult.size}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {selectedResult.prompt}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 border-gray-300"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="flex-1 border-gray-300"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      下载
                    </Button>
                  </div>

                  {contentId && (
                    <Button
                      onClick={handleApply}
                      className="w-full bg-[#C41E3A] hover:bg-[#a31830] text-white"
                    >
                      应用为封面
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DataState>

      {/* 历史记录弹层 */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>生成历史</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(70vh-80px)]">
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                暂无生成历史
              </div>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800 line-clamp-1">
                      {item.title}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {item.createdAt}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {item.results.map(result => (
                      <div
                        key={result.id}
                        className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 ${
                          result.id === item.selectedId
                            ? 'border-[#C41E3A]'
                            : 'border-transparent'
                        }`}
                      >
                        <img
                          src={result.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <button className="flex items-center gap-1 text-xs text-[#C41E3A]">
                    查看详情 <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
