"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, Heart, MessageCircle, Star, Share2, Play, Pause,
  Volume2, VolumeX, Maximize, MoreHorizontal, Send, AtSign
} from "lucide-react"

interface VideoDetail {
  id: string
  videoUrl: string
  coverUrl: string
  title: string
  description: string
  duration: number
  author: {
    id: string
    name: string
    avatar: string
    followers: number
    isFollowed: boolean
  }
  likes: number
  comments: number
  shares: number
  collects: number
  isLiked: boolean
  isCollected: boolean
  product?: {
    id: string
    name: string
    cover: string
    price: number
  }
  tags: string[]
  createdAt: string
}

interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  likes: number
  isLiked: boolean
  replies: Comment[]
  replyCount: number
  createdAt: string
}

export default function VideoPlayPage() {
  const params = useParams()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFollowed, setIsFollowed] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isCollected, setIsCollected] = useState(false)
  const [likes, setLikes] = useState(0)
  const [collects, setCollects] = useState(0)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [showFullDesc, setShowFullDesc] = useState(false)
  const controlsTimer = useRef<NodeJS.Timeout>()

  const video: VideoDetail = {
    id: params.id as string,
    videoUrl: "/demo-video.mp4",
    coverUrl: "/placeholder.svg?height=800&width=450",
    title: "八字入门：如何看日元强弱",
    description: "八字命理中，日元的强弱是分析命局的基础。本视频将详细讲解如何判断日元的旺衰，包括得令、得地、得生、得助四个方面的判断方法。掌握这些基础知识，才能准确分析命局喜忌。",
    duration: 185,
    author: {
      id: "1",
      name: "易学大师张三",
      avatar: "/placeholder.svg?height=60&width=60",
      followers: 128000,
      isFollowed: false
    },
    likes: 3256,
    comments: 428,
    shares: 156,
    collects: 892,
    isLiked: false,
    isCollected: false,
    product: {
      id: "p1",
      name: "八字命理全套课程",
      cover: "/placeholder.svg?height=80&width=80",
      price: 299
    },
    tags: ["八字", "命理", "入门教程"],
    createdAt: "2024-01-15T10:30:00Z"
  }

  const mockComments: Comment[] = [
    {
      id: "c1",
      userId: "u1",
      userName: "易学爱好者",
      userAvatar: "/placeholder.svg?height=40&width=40",
      content: "讲得太好了！终于理解日元强弱的判断方法了",
      likes: 128,
      isLiked: false,
      replies: [],
      replyCount: 3,
      createdAt: "2024-01-15T12:00:00Z"
    },
    {
      id: "c2",
      userId: "u2",
      userName: "命理初学",
      userAvatar: "/placeholder.svg?height=40&width=40",
      content: "请问老师，得令和得地有什么区别？",
      likes: 56,
      isLiked: false,
      replies: [
        {
          id: "r1",
          userId: "1",
          userName: "易学大师张三",
          userAvatar: "/placeholder.svg?height=40&width=40",
          content: "得令是指日元生于当令之月，得地是指日元在地支有根",
          likes: 89,
          isLiked: false,
          replies: [],
          replyCount: 0,
          createdAt: "2024-01-15T13:00:00Z"
        }
      ],
      replyCount: 1,
      createdAt: "2024-01-15T12:30:00Z"
    },
    {
      id: "c3",
      userId: "u3",
      userName: "风水玄学",
      userAvatar: "/placeholder.svg?height=40&width=40",
      content: "已收藏，反复学习中",
      likes: 23,
      isLiked: false,
      replies: [],
      replyCount: 0,
      createdAt: "2024-01-15T14:00:00Z"
    }
  ]

  useEffect(() => {
    setIsFollowed(video.author.isFollowed)
    setIsLiked(video.isLiked)
    setIsCollected(video.isCollected)
    setLikes(video.likes)
    setCollects(video.collects)
    setComments(mockComments)
  }, [])

  useEffect(() => {
    if (showControls) {
      controlsTimer.current = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 3000)
    }
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
    }
  }, [showControls, isPlaying])

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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const duration = videoRef.current.duration
      setCurrentTime(current)
      setProgress((current / duration) * 100)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    if (videoRef.current) {
      const duration = videoRef.current.duration
      videoRef.current.currentTime = (value / 100) * duration
      setProgress(value)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikes(prev => isLiked ? prev - 1 : prev + 1)
  }

  const handleCollect = () => {
    setIsCollected(!isCollected)
    setCollects(prev => isCollected ? prev - 1 : prev + 1)
  }

  const handleFollow = () => {
    setIsFollowed(!isFollowed)
  }

  const handleCommentLike = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
      }
      return c
    }))
  }

  const handleSubmitComment = () => {
    if (!commentText.trim()) return
    const newComment: Comment = {
      id: `c${Date.now()}`,
      userId: "me",
      userName: "我",
      userAvatar: "/placeholder.svg?height=40&width=40",
      content: commentText,
      likes: 0,
      isLiked: false,
      replies: [],
      replyCount: 0,
      createdAt: new Date().toISOString()
    }
    setComments(prev => [newComment, ...prev])
    setCommentText("")
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Video Section */}
      <div className="relative bg-black aspect-video">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* More Button */}
        <button className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
          <MoreHorizontal className="w-6 h-6 text-white" />
        </button>

        {/* Video */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={video.coverUrl}
          onTimeUpdate={handleTimeUpdate}
          onClick={() => setShowControls(true)}
          playsInline
        >
          <source src={video.videoUrl} type="video/mp4" />
        </video>

        {/* Play/Pause Overlay */}
        {showControls && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
            onClick={togglePlay}
          >
            <button className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>
          </div>
        )}

        {/* Controls Bar */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-xs">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C41E3A]"
              />
              <span className="text-white text-xs">{formatTime(video.duration)}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
              <button className="text-white">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="bg-[#FAF8F5] min-h-[calc(100vh-56.25vw)]">
        {/* Author Info */}
        <div className="p-4 bg-white border-b border-[#E8E3DB]">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push(`/profile/${video.author.id}`)}
            >
              <img
                src={video.author.avatar}
                alt={video.author.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-medium text-[#2C2C2C]">{video.author.name}</h3>
                <p className="text-xs text-[#999999]">
                  {(video.author.followers / 10000).toFixed(1)}万粉丝
                </p>
              </div>
            </div>
            <button
              onClick={handleFollow}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isFollowed
                  ? "bg-[#F5F5F5] text-[#999999]"
                  : "bg-[#C41E3A] text-white"
              }`}
            >
              {isFollowed ? "已关注" : "+ 关注"}
            </button>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 bg-white border-b border-[#E8E3DB]">
          <h1 className="text-lg font-semibold text-[#2C2C2C] mb-2">{video.title}</h1>
          <p className={`text-sm text-[#666666] ${showFullDesc ? "" : "line-clamp-2"}`}>
            {video.description}
          </p>
          {video.description.length > 60 && (
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-[#C41E3A] text-sm mt-1"
            >
              {showFullDesc ? "收起" : "展开"}
            </button>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {video.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-[#FFF5F5] text-[#C41E3A] text-xs rounded"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#999999]">
            <span>{video.likes} 点赞</span>
            <span>{video.comments} 评论</span>
            <span>{video.shares} 分享</span>
          </div>
        </div>

        {/* Product Card */}
        {video.product && (
          <div
            className="mx-4 mt-4 p-3 bg-white rounded-xl border border-[#E8E3DB] flex items-center gap-3 cursor-pointer"
            onClick={() => router.push(`/shop/product/${video.product!.id}`)}
          >
            <img
              src={video.product.cover}
              alt={video.product.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[#2C2C2C] truncate">{video.product.name}</h4>
              <p className="text-[#C41E3A] font-bold mt-1">¥{video.product.price}</p>
            </div>
            <span className="px-3 py-1.5 bg-[#C41E3A] text-white text-xs rounded-full">
              去购买
            </span>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-around py-4 bg-white mx-4 mt-4 rounded-xl">
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLiked ? "bg-[#FFF5F5]" : "bg-[#F5F5F5]"}`}>
              <Heart className={`w-5 h-5 ${isLiked ? "text-[#C41E3A] fill-[#C41E3A]" : "text-[#666666]"}`} />
            </div>
            <span className={`text-xs ${isLiked ? "text-[#C41E3A]" : "text-[#666666]"}`}>{likes}</span>
          </button>
          <button onClick={handleCollect} className="flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCollected ? "bg-[#FFF9E6]" : "bg-[#F5F5F5]"}`}>
              <Star className={`w-5 h-5 ${isCollected ? "text-[#C9A96E] fill-[#C9A96E]" : "text-[#666666]"}`} />
            </div>
            <span className={`text-xs ${isCollected ? "text-[#C9A96E]" : "text-[#666666]"}`}>{collects}</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#666666]" />
            </div>
            <span className="text-xs text-[#666666]">{video.comments}</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <Share2 className="w-5 h-5 text-[#666666]" />
            </div>
            <span className="text-xs text-[#666666]">分享</span>
          </button>
        </div>

        {/* Comments Section */}
        <div className="mt-4 bg-white">
          <div className="p-4 border-b border-[#E8E3DB]">
            <h3 className="font-semibold text-[#2C2C2C]">评论 ({comments.length})</h3>
          </div>

          {/* Comment Input */}
          <div className="p-4 border-b border-[#E8E3DB] flex items-center gap-3">
            <img
              src="/placeholder.svg?height=36&width=36"
              alt="我"
              className="w-9 h-9 rounded-full"
            />
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#F5F5F5] rounded-full">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="发表评论..."
                className="flex-1 bg-transparent text-sm outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button className="text-[#999999]">
                <AtSign className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              className={`p-2 rounded-full ${commentText.trim() ? "bg-[#C41E3A] text-white" : "bg-[#F5F5F5] text-[#999999]"}`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Comment List */}
          <div className="divide-y divide-[#E8E3DB]">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex gap-3">
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    className="w-9 h-9 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2C2C2C]">{comment.userName}</span>
                      {comment.userId === video.author.id && (
                        <span className="px-1.5 py-0.5 bg-[#C41E3A] text-white text-[10px] rounded">作者</span>
                      )}
                    </div>
                    <p className="text-sm text-[#666666] mt-1">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#999999]">
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleCommentLike(comment.id)}
                        className={`flex items-center gap-1 ${comment.isLiked ? "text-[#C41E3A]" : ""}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-[#C41E3A]" : ""}`} />
                        {comment.likes}
                      </button>
                      <button>回复</button>
                    </div>

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-3 pl-3 border-l-2 border-[#E8E3DB] space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id}>
                            <div className="flex items-center gap-2">
                              <img
                                src={reply.userAvatar}
                                alt={reply.userName}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-sm font-medium text-[#2C2C2C]">{reply.userName}</span>
                              {reply.userId === video.author.id && (
                                <span className="px-1.5 py-0.5 bg-[#C41E3A] text-white text-[10px] rounded">作者</span>
                              )}
                            </div>
                            <p className="text-sm text-[#666666] mt-1 ml-8">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {comment.replyCount > comment.replies.length && (
                      <button className="text-[#C41E3A] text-xs mt-2">
                        查看全部 {comment.replyCount} 条回复
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  )
}
