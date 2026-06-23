'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { BackButton } from '@/components/common/back-button'
import { 
  Share2, MoreHorizontal, MessageCircle, Heart, 
  Eye, FileText, Video, Users, ChevronRight, BadgeCheck,
  Phone, HelpCircle, Play
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { DataState } from '@/components/data-state'
import {
  getUserProfile,
  getUserPosts,
  getUserFavorites,
  followUser,
  unfollowUser,
  getContentTypeName,
  getContentUrl
} from '@/lib/api/user-profile'
import type { UserProfileResponse, UserPostItem, UserFavoriteItem } from '@/lib/types/user-profile'

// 内容Tab配置
const contentTabs = [
  { id: 'all', label: '动态' },
  { id: 'posts', label: '帖子' },
  { id: 'articles', label: '文章' },
  { id: 'videos', label: '短视频' },
]

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = Number(params.id) || 1
  
  const [profileData, setProfileData] = useState<UserProfileResponse | null>(null)
  const [posts, setPosts] = useState<UserPostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [followLoading, setFollowLoading] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // 加载用户资料
  useEffect(() => {
    loadUserProfile()
  }, [userId])
  
  // 切换Tab时加载对应数据
  useEffect(() => {
    if (posts.length === 0 && profileData) {
      loadUserPosts()
    }
  }, [profileData])

  async function loadUserProfile() {
    setLoading(true)
    setError(null)
    try {
      const res = await getUserProfile(userId)
      if (res.code === 200 && res.data) {
        setProfileData(res.data)
      } else {
        setError(res.message || '加载失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }
  
  async function loadUserPosts() {
    setPostsLoading(true)
    try {
      const res = await getUserPosts(userId, 'all')
      if (res.code === 200 && res.data) {
        setPosts(res.data.list)
      }
    } catch {
      // ignore
    } finally {
      setPostsLoading(false)
    }
  }

  // 关注/取关 - 乐观更新
  async function handleFollow() {
    if (!profileData || followLoading) return
    setFollowLoading(true)
    
    const wasFollowing = profileData.isFollowing
    // 乐观更新
    setProfileData(prev => prev ? {
      ...prev,
      isFollowing: !wasFollowing,
      stats: {
        ...prev.stats,
        followerCount: prev.stats.followerCount + (wasFollowing ? -1 : 1)
      }
    } : null)
    
    try {
      const res = wasFollowing 
        ? await unfollowUser(userId)
        : await followUser(userId)
      
      if (res.code === 200) {
        toast.success(wasFollowing ? '已取消关注' : '关注成功')
        if (!wasFollowing && 'isMutualFollow' in res.data && res.data.isMutualFollow) {
          setProfileData(prev => prev ? { ...prev, isMutualFollow: true } : null)
          toast.success('你们已互相关注')
        }
      } else {
        // 回滚
        setProfileData(prev => prev ? {
          ...prev,
          isFollowing: wasFollowing,
          stats: {
            ...prev.stats,
            followerCount: prev.stats.followerCount + (wasFollowing ? 1 : -1)
          }
        } : null)
        toast.error(res.message || '操作失败')
      }
    } catch {
      // 回滚
      setProfileData(prev => prev ? {
        ...prev,
        isFollowing: wasFollowing,
        stats: {
          ...prev.stats,
          followerCount: prev.stats.followerCount + (wasFollowing ? 1 : -1)
        }
      } : null)
      toast.error('网络错误')
    } finally {
      setFollowLoading(false)
    }
  }

  // 分享
  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: profileData?.profile.nickname,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('链接已复制')
    }
  }

  // 格式化数字
  function formatNumber(num: number): string {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
  }

  // 渲染帖子卡片
  const renderPostCard = (post: UserPostItem) => (
    <Card 
      key={post.id} 
      className="p-3 bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
      onClick={() => router.push(getContentUrl(post))}
    >
      <p className="text-sm text-foreground line-clamp-3">{post.content}</p>
      {post.images && post.images.length > 0 && (
        <div className={cn(
          'mt-2 gap-1',
          post.images.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2'
        )}>
          {post.images.slice(0, 4).map((img, index) => (
            <div key={index} className="aspect-square bg-secondary rounded-lg overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>{post.createdAt}</span>
        <div className="flex items-center gap-4">
          <span className={cn('flex items-center gap-1', post.isLiked && 'text-[#C41E3A]')}>
            <Heart className={cn('w-3.5 h-3.5', post.isLiked && 'fill-current')} /> {post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" /> {post.commentCount}
          </span>
        </div>
      </div>
    </Card>
  )

  // 渲染文章卡片
  const renderArticleCard = (article: UserPostItem) => (
    <Link key={article.id} href={getContentUrl(article)}>
      <Card className="flex gap-3 p-3 bg-card hover:bg-secondary/50 transition-colors">
        <div className="w-24 h-16 bg-secondary rounded-lg flex-shrink-0 overflow-hidden">
          {article.cover ? (
            <img src={article.cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground line-clamp-2">{article.title}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" /> {article.likeCount}
            </span>
            <span>{article.createdAt}</span>
          </div>
        </div>
      </Card>
    </Link>
  )

  // 渲染视频卡片
  const renderVideoCard = (video: UserPostItem) => (
    <Link key={video.id} href={getContentUrl(video)}>
      <Card className="overflow-hidden bg-card">
        <div className="relative aspect-[9/16] bg-secondary overflow-hidden">
          {video.cover ? (
            <img src={video.cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-10 h-10 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
        <div className="p-2">
          <p className="text-xs text-foreground line-clamp-2">{video.title || video.content}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" /> {video.likeCount}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )

  // 渲染内容列表
  const renderContent = () => {
    const filteredPosts = activeTab === 'all' 
      ? posts 
      : posts.filter(p => {
          if (activeTab === 'posts') return p.type === 'post'
          if (activeTab === 'articles') return p.type === 'article'
          if (activeTab === 'videos') return p.type === 'video'
          return true
        })

    if (postsLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          暂无内容
        </div>
      )
    }

    switch (activeTab) {
      case 'posts':
        return (
          <div className="space-y-3">
            {filteredPosts.map(renderPostCard)}
          </div>
        )
      case 'articles':
        return (
          <div className="space-y-3">
            {filteredPosts.map(renderArticleCard)}
          </div>
        )
      case 'videos':
        return (
          <div className="grid grid-cols-2 gap-3">
            {filteredPosts.map(renderVideoCard)}
          </div>
        )
      default:
        // 动态Tab：混合展示
        return (
          <div className="space-y-3">
            {filteredPosts.map(post => {
              if (post.type === 'video') return renderVideoCard(post)
              if (post.type === 'article') return renderArticleCard(post)
              return renderPostCard(post)
            })}
          </div>
        )
    }
  }

  // 骨架屏
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pb-6">
        <div className="relative">
          <Skeleton className="h-40 w-full" />
          <div className="absolute -bottom-12 left-4">
            <Skeleton className="w-24 h-24 rounded-full" />
          </div>
        </div>
        <div className="px-4 pt-14 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-8 justify-around py-4">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 w-16" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <DataState
      loading={loading}
      error={error}
      empty={!profileData}
      emptyMessage="用户不存在"
      onRetry={loadUserProfile}
    >
      {profileData && (
        <div className="min-h-screen bg-[#FAF8F5] pb-6">
          {/* 顶部背景区 */}
          <div className="relative">
            <div 
              className="h-40 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary"
              style={profileData.profile.coverImage ? {
                backgroundImage: `url(${profileData.profile.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : undefined}
            />
            
            {/* 顶部导航 */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 safe-area-pt">
              <BackButton overlay />
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleShare}
                  className="p-2 rounded-full bg-black/20 backdrop-blur-sm"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 rounded-full bg-black/20 backdrop-blur-sm"
                  >
                    <MoreHorizontal className="w-5 h-5 text-white" />
                  </button>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                      <Card className="absolute right-0 top-full mt-2 w-32 py-1 z-50 shadow-lg">
                        <button 
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-secondary"
                          onClick={() => {
                            setShowMoreMenu(false)
                            router.push(`/report/user/${userId}`)
                          }}
                        >
                          举报
                        </button>
                        <button 
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-secondary text-red-600"
                          onClick={() => {
                            setShowMoreMenu(false)
                            router.push('/mine/blacklist')
                          }}
                        >
                          拉黑
                        </button>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 头像 */}
            <div className="absolute -bottom-12 left-4">
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarImage src={profileData.profile.avatar} alt={profileData.profile.nickname} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {profileData.profile.nickname[0]}
                </AvatarFallback>
              </Avatar>
              {profileData.profile.verified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center border-2 border-background">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* 用户信息区 */}
          <div className="px-4 pt-14">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{profileData.profile.nickname}</h1>
                  {profileData.profile.verified && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                      {profileData.profile.verifiedTitle}
                    </Badge>
                  )}
                </div>
                {profileData.profile.bio && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{profileData.profile.bio}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/30">
                    Lv.{profileData.profile.level} {profileData.profile.levelName}
                  </Badge>
                  {profileData.isMutualFollow && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-pink-50 text-pink-600 border-pink-200">
                      互相关注
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 数据看板 */}
            <div className="flex items-center justify-around py-4 mt-4 bg-secondary/30 rounded-xl">
              <Link href={`/user/${userId}/following`} className="text-center">
                <p className="text-lg font-bold text-foreground">{formatNumber(profileData.stats.followingCount)}</p>
                <p className="text-xs text-muted-foreground">关注</p>
              </Link>
              <div className="w-px h-8 bg-border" />
              <Link href={`/user/${userId}/followers`} className="text-center">
                <p className="text-lg font-bold text-foreground">{formatNumber(profileData.stats.followerCount)}</p>
                <p className="text-xs text-muted-foreground">粉丝</p>
              </Link>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{formatNumber(profileData.stats.likeCount)}</p>
                <p className="text-xs text-muted-foreground">获赞</p>
              </div>
            </div>

            {/* 操作按钮行 */}
            {!profileData.isSelf && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={cn(
                    'flex-1 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50',
                    profileData.isFollowing 
                      ? 'bg-secondary text-muted-foreground' 
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {profileData.isFollowing ? '已关注' : '+ 关注'}
                </button>
                <Link href={`/im/chat/${userId}`} className="flex-1">
                  <button className="w-full py-2.5 rounded-full text-sm font-medium border border-border text-foreground hover:bg-secondary transition-colors">
                    发私信
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* 内容Tab栏 */}
          <div className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E8E0D5] mt-6">
            <div className="flex items-center px-4 overflow-x-auto scrollbar-hide">
              {contentTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-3 text-sm font-medium whitespace-nowrap relative transition-colors',
                    activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C41E3A] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 内容列表 */}
          <div className="px-4 py-4">
            {renderContent()}
          </div>
        </div>
      )}
    </DataState>
  )
}
