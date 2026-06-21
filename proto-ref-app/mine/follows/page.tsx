'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, UserCheck, UserPlus, Users } from 'lucide-react'

interface FollowUser {
  id: string
  name: string
  avatar: string
  bio?: string
  followers: number
  isFollowing: boolean
  isFollowedBy: boolean
}

function FollowsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'followers' ? 'followers' : 'following'
  
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>(initialTab)
  const [followingList, setFollowingList] = useState<FollowUser[]>([])
  const [followersList, setFollowersList] = useState<FollowUser[]>([])
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const mockFollowing: FollowUser[] = [
        { id: '1', name: '易学大师王老师', avatar: '/placeholder.svg', bio: '专注易经研究30年，擅长八字命理与风水布局', followers: 12580, isFollowing: true, isFollowedBy: true },
        { id: '2', name: '道法自然', avatar: '/placeholder.svg', bio: '传播传统文化，弘扬国学智慧', followers: 8920, isFollowing: true, isFollowedBy: false },
        { id: '3', name: '玄学研究院', avatar: '/placeholder.svg', bio: '专业玄学研究机构官方账号', followers: 45600, isFollowing: true, isFollowedBy: true },
        { id: '4', name: '风水师李明', avatar: '/placeholder.svg', bio: '阳宅风水、办公室布局、家居环境优化', followers: 6780, isFollowing: true, isFollowedBy: false },
        { id: '5', name: '命理学堂', avatar: '/placeholder.svg', bio: '八字命理入门到精通，系统学习命理知识', followers: 23400, isFollowing: true, isFollowedBy: true },
      ]
      
      const mockFollowers: FollowUser[] = [
        { id: '6', name: '学习者小王', avatar: '/placeholder.svg', bio: '国学爱好者，正在学习易经', followers: 128, isFollowing: false, isFollowedBy: true },
        { id: '7', name: '传统文化粉', avatar: '/placeholder.svg', bio: '热爱传统文化', followers: 256, isFollowing: true, isFollowedBy: true },
        { id: '8', name: '易学初学者', avatar: '/placeholder.svg', bio: '刚开始接触易学，求指导', followers: 45, isFollowing: false, isFollowedBy: true },
        { id: '9', name: '风水研究者', avatar: '/placeholder.svg', bio: '从事风水研究5年', followers: 890, isFollowing: true, isFollowedBy: true },
        { id: '10', name: '命理爱好者', avatar: '/placeholder.svg', bio: '对八字命理很感兴趣', followers: 320, isFollowing: false, isFollowedBy: true },
      ]
      
      setFollowingList(mockFollowing)
      setFollowersList(mockFollowers)
      setFollowingCount(mockFollowing.length)
      setFollowersCount(mockFollowers.length)
      setLoading(false)
    }
    loadData()
  }, [])

  const handleToggleFollow = (userId: string, listType: 'following' | 'followers') => {
    if (listType === 'following') {
      setFollowingList(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: !user.isFollowing } : user
      ))
    } else {
      setFollowersList(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: !user.isFollowing } : user
      ))
    }
  }

  const currentList = activeTab === 'following' ? followingList : followersList

  const getFollowButton = (user: FollowUser, listType: 'following' | 'followers') => {
    if (user.isFollowing && user.isFollowedBy) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleFollow(user.id, listType) }}
          className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-full"
        >
          <Users className="w-3 h-3" />
          互相关注
        </button>
      )
    }
    if (user.isFollowing) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleFollow(user.id, listType) }}
          className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-full"
        >
          <UserCheck className="w-3 h-3" />
          已关注
        </button>
      )
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleToggleFollow(user.id, listType) }}
        className="flex items-center gap-1 px-3 py-1.5 bg-[#C41E3A] text-white text-xs rounded-full"
      >
        <UserPlus className="w-3 h-3" />
        关注
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">关注与粉丝</h1>
          <div className="w-8" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-center relative ${
              activeTab === 'following' ? 'text-[#C41E3A] font-medium' : 'text-muted-foreground'
            }`}
          >
            <span>关注</span>
            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{followingCount}</span>
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#C41E3A] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-center relative ${
              activeTab === 'followers' ? 'text-[#C41E3A] font-medium' : 'text-muted-foreground'
            }`}
          >
            <span>粉丝</span>
            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{followersCount}</span>
            {activeTab === 'followers' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#C41E3A] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
                <div className="w-20 h-8 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg mb-2">
              {activeTab === 'following' ? '暂无关注' : '暂无粉丝'}
            </p>
            <p className="text-sm">
              {activeTab === 'following' 
                ? '去发现更多感兴趣的人吧' 
                : '分享优质内容吸引更多关注'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {currentList.map(user => (
              <div
                key={user.id}
                onClick={() => router.push(`/user/${user.id}`)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {user.isFollowing && user.isFollowedBy && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#C41E3A] rounded-full flex items-center justify-center">
                      <Users className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{user.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.bio || `${user.followers} 粉丝`}
                  </p>
                </div>
                {getFollowButton(user, activeTab)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FollowsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-12 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <FollowsContent />
    </Suspense>
  )
}
