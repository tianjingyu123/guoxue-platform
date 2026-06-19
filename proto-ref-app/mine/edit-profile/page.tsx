'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera, Check, X, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'

interface UserProfile {
  avatar: string
  nickname: string
  bio: string
  interests: string[]
}

const defaultInterests = [
  '易经', '风水', '八字', '梅花易数', '六爻',
  '奇门遁甲', '紫微斗数', '面相', '手相', '姓名学',
  '择日', '阴宅', '阳宅', '命理', '占卜',
  '国学', '道学', '佛学', '儒学', '周易'
]

export default function EditProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [profile, setProfile] = useState<UserProfile>({
    avatar: '',
    nickname: '',
    bio: '',
    interests: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAvatarSheet, setShowAvatarSheet] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // Mock data
      await new Promise(r => setTimeout(r, 500))
      setProfile({
        avatar: 'https://picsum.photos/200/200?random=user',
        nickname: '国学爱好者',
        bio: '热爱传统文化，专注易学研究十年',
        interests: ['易经', '风水', '八字']
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    setShowAvatarSheet(true)
  }

  const handleSelectFromAlbum = () => {
    fileInputRef.current?.click()
    setShowAvatarSheet(false)
  }

  const handleTakePhoto = () => {
    // In real app, would use camera API
    fileInputRef.current?.click()
    setShowAvatarSheet(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setProfile(prev => ({ ...prev, avatar: e.target?.result as string }))
    }
    reader.readAsDataURL(file)

    // In real app, would upload to server
    // const formData = new FormData()
    // formData.append('file', file)
    // const { url } = await uploadApi.image(formData)
    // setProfile(prev => ({ ...prev, avatar: url }))
  }

  const toggleInterest = (interest: string) => {
    setProfile(prev => {
      const isSelected = prev.interests.includes(interest)
      if (isSelected) {
        return { ...prev, interests: prev.interests.filter(i => i !== interest) }
      } else {
        if (prev.interests.length >= 5) {
          return prev
        }
        return { ...prev, interests: [...prev.interests, interest] }
      }
    })
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!profile.nickname.trim()) {
      newErrors.nickname = '请输入昵称'
    } else if (profile.nickname.length > 20) {
      newErrors.nickname = '昵称不能超过20个字'
    }
    
    if (profile.bio.length > 200) {
      newErrors.bio = '简介不能超过200个字'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    
    setSaving(true)
    try {
      await authApi.updateProfile(profile)
      router.back()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="w-20 h-5 bg-muted rounded animate-pulse" />
            <div className="w-10 h-5 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-14 bg-muted rounded-xl animate-pulse" />
            <div className="h-32 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="flex items-center text-[#666666]">
            <ChevronLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          <h1 className="font-medium text-[#2C2C2C]">编辑资料</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[#C41E3A] font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存'}
          </button>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center py-8 bg-white">
        <button
          onClick={handleAvatarClick}
          className="relative group"
        >
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
            {profile.avatar ? (
              <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#C41E3A] to-[#8B0000] flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {profile.nickname.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#C41E3A] rounded-full flex items-center justify-center shadow-md">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </button>
        <p className="text-sm text-[#999999] mt-3">点击更换头像</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Nickname */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-sm text-[#666666] mb-2">昵称</label>
          <div className="relative">
            <input
              type="text"
              value={profile.nickname}
              onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
              placeholder="请输入昵称"
              maxLength={20}
              className={`w-full h-12 px-4 rounded-xl border ${
                errors.nickname ? 'border-red-500' : 'border-[#E8E3DB]'
              } bg-[#FAF8F5] text-[#2C2C2C] placeholder:text-[#CCCCCC] focus:outline-none focus:border-[#C41E3A]`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#999999]">
              {profile.nickname.length}/20
            </span>
          </div>
          {errors.nickname && (
            <p className="text-sm text-red-500 mt-1">{errors.nickname}</p>
          )}
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-sm text-[#666666] mb-2">个人简介</label>
          <div className="relative">
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="介绍一下自己吧..."
              maxLength={200}
              rows={4}
              className={`w-full p-4 rounded-xl border ${
                errors.bio ? 'border-red-500' : 'border-[#E8E3DB]'
              } bg-[#FAF8F5] text-[#2C2C2C] placeholder:text-[#CCCCCC] focus:outline-none focus:border-[#C41E3A] resize-none`}
            />
            <span className="absolute right-4 bottom-4 text-xs text-[#999999]">
              {profile.bio.length}/200
            </span>
          </div>
          {errors.bio && (
            <p className="text-sm text-red-500 mt-1">{errors.bio}</p>
          )}
        </div>

        {/* Interests */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-[#666666]">兴趣标签</label>
            <span className="text-xs text-[#999999]">
              已选 {profile.interests.length}/5
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {defaultInterests.map((interest) => {
              const isSelected = profile.interests.includes(interest)
              const isDisabled = !isSelected && profile.interests.length >= 5
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  disabled={isDisabled}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    isSelected
                      ? 'bg-[#C41E3A] text-white'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#FAF8F5] text-[#666666] border border-[#E8E3DB] hover:border-[#C41E3A] hover:text-[#C41E3A]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                  {interest}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-[#999999] mt-3">
            选择你感兴趣的领域，我们将为你推荐相关内容
          </p>
        </div>
      </div>

      {/* Avatar Action Sheet */}
      {showAvatarSheet && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAvatarSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="p-4 space-y-2">
              <button
                onClick={handleTakePhoto}
                className="w-full py-4 text-center text-[#2C2C2C] font-medium hover:bg-gray-50 rounded-xl"
              >
                拍照
              </button>
              <button
                onClick={handleSelectFromAlbum}
                className="w-full py-4 text-center text-[#2C2C2C] font-medium hover:bg-gray-50 rounded-xl"
              >
                从相册选择
              </button>
            </div>
            <div className="border-t border-[#E8E3DB]">
              <button
                onClick={() => setShowAvatarSheet(false)}
                className="w-full py-4 text-center text-[#666666] font-medium"
              >
                取消
              </button>
            </div>
            <div className="h-safe-area-inset-bottom bg-white" />
          </div>
        </>
      )}
    </div>
  )
}
