import Link from "next/link"
import { ChevronRight, BadgeCheck } from "lucide-react"

interface InstructorCardProps {
  id?: string | number
  name: string
  avatar: string
  title: string
  description: string
  coursesCount: number
  studentsCount: number
  isVerified?: boolean
}

export function InstructorCard({
  id,
  name,
  avatar,
  title,
  description,
  coursesCount,
  studentsCount,
  isVerified = false
}: InstructorCardProps) {
  const href = id ? `/expert/${id}` : `/user/${encodeURIComponent(name)}`
  
  return (
    <Link href={href} className="block p-4 bg-card border-b border-border hover:bg-secondary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 头像 */}
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
            />
            {isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <BadgeCheck className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>
          
          {/* 讲师信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                {title}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{coursesCount}门课程</span>
              <span>{studentsCount.toLocaleString()}学员</span>
            </div>
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  )
}
