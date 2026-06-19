"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, Upload, Camera, Video, Image, X, Plus, Search, 
  Hash, ShoppingBag, Eye, EyeOff, Play, Pause, Check
} from "lucide-react"

interface VideoProduct {
  id: string
  name: string
  cover: string
  price: number
  commission?: number  // 佣金比例
  stock?: number       // 库存
}

// 模拟商品库
const myProductLibrary: VideoProduct[] = [
  { id: '1', name: '八字命理学入门书籍', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop', price: 68, commission: 10, stock: 500 },
  { id: '2', name: '招财貔貅摆件', cover: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop', price: 298, commission: 15, stock: 200 },
  { id: '3', name: '五帝钱挂件', cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop', price: 128, commission: 12, stock: 350 },
  { id: '4', name: '姓名学全解', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop', price: 88, commission: 10, stock: 800 },
  { id: '5', name: '风水堪舆实战课程', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', price: 199, commission: 20, stock: 999 },
]

export default function VideoPublishPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [step, setStep] = useState<'select' | 'edit' | 'publish'>('select')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>('')
  const [coverFrame, setCoverFrame] = useState<string>('')
  const [coverFrameIndex, setCoverFrameIndex] = useState(0)
  const [frames, setFrames] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productKeyword, setProductKeyword] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<VideoProduct[]>([])  // 改为支持多商品
  const [searchResults, setSearchResults] = useState<VideoProduct[]>(myProductLibrary)
  const [showMyProducts, setShowMyProducts] = useState(true)  // 显示我的商品库
  
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hotTags = ['易经', '风水', '八字', '命理', '国学', '周易', '梅花易数', '六爻']

  // 提取视频帧
  useEffect(() => {
    if (videoPreview && videoRef.current) {
      const video = videoRef.current
      const extractFrames = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        canvas.width = 160
        canvas.height = 90
        const duration = video.duration
        const frameCount = 8
        const extractedFrames: string[] = []
        
        let frameIndex = 0
        const extractFrame = () => {
          if (frameIndex >= frameCount) {
            setFrames(extractedFrames)
            if (extractedFrames.length > 0) {
              setCoverFrame(extractedFrames[0])
            }
            return
          }
          
          video.currentTime = (duration / frameCount) * frameIndex
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            extractedFrames.push(canvas.toDataURL('image/jpeg', 0.8))
            frameIndex++
            extractFrame()
          }
        }
        
        video.onloadedmetadata = () => {
          extractFrame()
        }
      }
      extractFrames()
    }
  }, [videoPreview])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
      setStep('edit')
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSelectHotTag = (tag: string) => {
    if (tags.length < 5 && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
  }

  const handleSearchProducts = () => {
    if (productKeyword.trim()) {
      const results = myProductLibrary.filter(p => 
        p.name.toLowerCase().includes(productKeyword.toLowerCase())
      )
      setSearchResults(results)
      setShowMyProducts(false)
    } else {
      setSearchResults(myProductLibrary)
      setShowMyProducts(true)
    }
  }
  
  // 添加/移除商品
  const handleToggleProduct = (product: VideoProduct) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id))
    } else if (selectedProducts.length < 5) {
      setSelectedProducts([...selectedProducts, product])
    }
  }
  
  // 计算预计佣金
  const estimatedCommission = selectedProducts.reduce((sum, p) => {
    return sum + (p.price * (p.commission || 10) / 100)
  }, 0)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = '请输入视频标题'
    if (title.length > 50) newErrors.title = '标题不能超过50字'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePublish = async () => {
    if (!validateForm()) return
    
    setUploading(true)
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      setUploadProgress(i)
    }
    
    // Mock publish
    setTimeout(() => {
      setUploading(false)
      router.push('/videos')
    }, 500)
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // 视频选择页
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <span className="text-lg font-medium">发布视频</span>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
            <Video className="w-12 h-12 text-white/80" />
          </div>
          
          <h2 className="text-white text-xl font-medium mb-2">选择视频</h2>
          <p className="text-white/60 text-sm text-center mb-8">
            支持 MP4、MOV 格式，最长60秒
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-[#C41E3A] text-white rounded-xl flex items-center justify-center gap-2"
            >
              <Image className="w-5 h-5" />
              从相册选择
            </button>
            
            <button
              className="w-full py-4 bg-white/10 text-white rounded-xl flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              拍摄视频
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    )
  }

  // 视频编辑页
  if (step === 'edit') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <button onClick={() => setStep('select')} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-lg font-medium">编辑视频</span>
          <button
            onClick={() => setStep('publish')}
            className="text-[#C41E3A] font-medium"
          >
            下一步
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative flex-1 flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={videoPreview}
            className="max-w-full max-h-full"
            playsInline
            loop
          />
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            {!isPlaying && (
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            )}
          </button>
        </div>

        {/* Cover Selection */}
        <div className="bg-zinc-900 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white text-sm">选择封面</span>
            <button className="text-[#C41E3A] text-sm flex items-center gap-1">
              <Upload className="w-4 h-4" />
              上传封面
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {frames.map((frame, index) => (
              <button
                key={index}
                onClick={() => {
                  setCoverFrame(frame)
                  setCoverFrameIndex(index)
                }}
                className={`relative flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden ${
                  coverFrameIndex === index ? 'ring-2 ring-[#C41E3A]' : ''
                }`}
              >
                <img src={frame} alt={`帧${index + 1}`} className="w-full h-full object-cover" />
                {coverFrameIndex === index && (
                  <div className="absolute inset-0 bg-[#C41E3A]/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 发布设置页
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setStep('edit')} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <span className="text-lg font-medium text-[#2C2C2C]">发布设置</span>
          <button
            onClick={handlePublish}
            disabled={uploading}
            className="px-4 py-1.5 bg-[#C41E3A] text-white text-sm rounded-full disabled:opacity-50"
          >
            {uploading ? '发布中...' : '发布'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-safe">
        {/* Video Preview */}
        <div className="p-4">
          <div className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm">
            <div className="relative w-24 h-32 rounded-xl overflow-hidden flex-shrink-0">
              {coverFrame ? (
                <img src={coverFrame} alt="封面" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                  <Video className="w-8 h-8 text-zinc-400" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                00:30
              </div>
            </div>
            <div className="flex-1">
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="添加标题，让更多人看到"
                maxLength={50}
                className={`w-full h-full resize-none text-[#2C2C2C] placeholder-[#999] bg-transparent outline-none text-sm ${
                  errors.title ? 'border border-red-500 rounded p-2' : ''
                }`}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述..."
              maxLength={200}
              rows={3}
              className="w-full resize-none text-[#2C2C2C] placeholder-[#999] bg-transparent outline-none text-sm"
            />
            <div className="text-right text-xs text-[#999]">{description.length}/200</div>
          </div>
        </div>

        {/* Tags */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-5 h-5 text-[#C41E3A]" />
              <span className="text-sm text-[#2C2C2C] font-medium">话题标签</span>
              <span className="text-xs text-[#999]">(最多5个)</span>
            </div>
            
            {/* Selected Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded-full text-sm"
                  >
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Tag Input */}
            <div className="flex gap-2 mb-3">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="输入标签，回车添加"
                className="flex-1 px-3 py-2 bg-[#FAF8F5] rounded-lg text-sm outline-none"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-[#C41E3A] text-white rounded-lg text-sm"
              >
                添加
              </button>
            </div>
            
            {/* Hot Tags */}
            <div>
              <span className="text-xs text-[#999] mb-2 block">热门标签</span>
              <div className="flex flex-wrap gap-2">
                {hotTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleSelectHotTag(tag)}
                    disabled={tags.includes(tag)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      tags.includes(tag)
                        ? 'bg-zinc-100 text-zinc-400'
                        : 'bg-[#FAF8F5] text-[#666] hover:bg-[#C41E3A]/10 hover:text-[#C41E3A]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Link - 多商品支持 */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#C9A96E]" />
                <span className="text-sm text-[#2C2C2C] font-medium">关联商品</span>
                <span className="text-xs text-[#999]">(最多5件)</span>
              </div>
              <button
                onClick={() => setShowProductSearch(true)}
                className="text-[#C41E3A] text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
            
            {/* 已选商品列表 */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 bg-[#FAF8F5] rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-[#C41E3A] text-white text-xs flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <img
                      src={product.cover}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#2C2C2C] truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#C41E3A] font-medium">¥{product.price}</span>
                        <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">{product.commission}%佣金</span>
                      </div>
                    </div>
                    <button onClick={() => handleToggleProduct(product)}>
                      <X className="w-4 h-4 text-[#999]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* 佣金预览 */}
            {selectedProducts.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#C9A96E]/10 to-[#C9A96E]/5 rounded-xl">
                <span className="text-xs text-[#666]">预计每单佣金收益</span>
                <span className="text-sm text-[#C9A96E] font-bold">¥{estimatedCommission.toFixed(2)}</span>
              </div>
            )}
            
            {selectedProducts.length === 0 && (
              <p className="text-xs text-[#999] text-center py-4">添加商品，开启带货赚佣金</p>
            )}
          </div>
        </div>

        {/* Privacy */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Eye className="w-5 h-5 text-green-500" />
                ) : (
                  <EyeOff className="w-5 h-5 text-[#999]" />
                )}
                <span className="text-sm text-[#2C2C2C] font-medium">
                  {isPublic ? '公开可见' : '仅自己可见'}
                </span>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  isPublic ? 'bg-green-500' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-72">
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#C41E3A]/10 flex items-center justify-center mb-3">
                <Upload className="w-8 h-8 text-[#C41E3A] animate-bounce" />
              </div>
              <p className="text-[#2C2C2C] font-medium">正在发布...</p>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C41E3A] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-[#999] mt-2">{uploadProgress}%</p>
          </div>
        </div>
      )}

      {/* Product Search Modal - 增强版 */}
      {showProductSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#E8E3DB]">
              <span className="text-lg font-medium text-[#2C2C2C]">选择商品</span>
              <div className="flex items-center gap-2">
                {selectedProducts.length > 0 && (
                  <span className="text-xs text-[#C41E3A]">已选 {selectedProducts.length}/5</span>
                )}
                <button onClick={() => setShowProductSearch(false)}>
                  <X className="w-6 h-6 text-[#666]" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" />
                  <input
                    value={productKeyword}
                    onChange={(e) => setProductKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchProducts()}
                    placeholder="搜索商品"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] rounded-xl text-sm outline-none"
                  />
                </div>
                <button
                  onClick={handleSearchProducts}
                  className="px-4 py-2 bg-[#C41E3A] text-white rounded-xl text-sm"
                >
                  搜索
                </button>
              </div>
            </div>
            
            {/* 我的商品库 / 搜索结果 */}
            <div className="px-4 pb-2">
              <span className="text-xs text-[#999]">{showMyProducts ? '我的商品库' : '搜索结果'}</span>
            </div>
            
            <div className="flex-1 overflow-auto px-4 pb-safe">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-[#999] text-sm">
                  暂无商品，去<a href="/videos/creator" className="text-[#C41E3A]">商品管理</a>添加
                </div>
              ) : (
                searchResults.map(product => {
                  const isSelected = selectedProducts.find(p => p.id === product.id)
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleToggleProduct(product)}
                      disabled={!isSelected && selectedProducts.length >= 5}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors ${
                        isSelected ? 'bg-[#C41E3A]/5 border border-[#C41E3A]/30' : 'hover:bg-[#FAF8F5]'
                      } ${!isSelected && selectedProducts.length >= 5 ? 'opacity-50' : ''}`}
                    >
                      <div className="relative">
                        <img
                          src={product.cover}
                          alt={product.name}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm text-[#2C2C2C] truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#C41E3A] font-bold">¥{product.price}</span>
                          <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{product.commission}%佣金</span>
                        </div>
                        <p className="text-[10px] text-[#999] mt-0.5">库存 {product.stock}</p>
                      </div>
                      <div className="text-xs text-[#666]">
                        {isSelected ? '已选' : '选择'}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
            
            {/* 确认按钮 */}
            {selectedProducts.length > 0 && (
              <div className="p-4 border-t border-[#E8E3DB] safe-area-pb">
                <button
                  onClick={() => setShowProductSearch(false)}
                  className="w-full py-3 bg-[#C41E3A] text-white rounded-xl font-medium"
                >
                  确认选择 ({selectedProducts.length}件商品)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
