"use client"

import { useState } from "react"
import Link from "next/link"
import Masonry from "react-masonry-css"
import {
  Search, Sparkles, Award, Flame, Clock, Crown, Star,
  Compass, Mountain, Stethoscope, Leaf, PenTool, BookMarked, ScrollText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/common/back-button"
import { CourseCard, type CourseCardData } from "@/components/cards"
import { HomeBanner } from "@/components/home/home-banner"
import { SectionHeader } from "@/components/courses/section-header"

// 课程首页 Banner（精选课程 / 运营活动）
const courseBanners = [
  { id: "b1", image: "/images/banners/banner-1.png", title: "八字命理系统精讲 · 限时五折", link: "/course/c4" },
  { id: "b2", image: "/images/banners/banner-2.png", title: "紫微斗数大师直播课 火热报名", link: "/course/c1" },
  { id: "b3", image: "/images/banners/banner-3.png", title: "新人专享 · 名师好课首单立减", link: "/courses/flash-sale" },
]

// 分类导航（图标式，国学特色）
const categoryNav = [
  { id: "bazi", label: "八字命理", icon: ScrollText, color: "#c0392b" },
  { id: "ziwei", label: "紫微斗数", icon: Star, color: "#8e44ad" },
  { id: "fengshui", label: "风水堪舆", icon: Compass, color: "#16a085" },
  { id: "yijing", label: "易经", icon: BookMarked, color: "#2980b9" },
  { id: "zhongyi", label: "中医养生", icon: Stethoscope, color: "#27ae60" },
  { id: "yangsheng", label: "养生", icon: Leaf, color: "#7f8c8d" },
  { id: "shufa", label: "书法", icon: PenTool, color: "#d35400" },
  { id: "qimen", label: "奇门遁甲", icon: Mountain, color: "#2c3e50" },
]

// 课程数据
type Course = CourseCardData & { category: string; isNew?: boolean; flashSale?: boolean }

const allCourses: Course[] = [
  { id: "c1", category: "ziwei", title: "紫微斗数入门到精通", cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80", coverRatio: "1:1", teacher: "林道长", teacherAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80", price: 199, originalPrice: 399, students: 3200, lessons: 36, rating: 4.9, tag: "热销", flashSale: true },
  { id: "c2", category: "fengshui", title: "风水堪舆实战班", cover: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80", coverRatio: "1:1", teacher: "王大师", teacherAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", price: 299, originalPrice: 599, students: 1800, lessons: 48, rating: 4.8, tag: "热销" },
  { id: "c3", category: "liuyao", title: "六爻预测从零开始", cover: "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80", coverRatio: "3:4", teacher: "陈老师", teacherAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80", price: 128, originalPrice: 299, students: 1300, lessons: 24, rating: 4.7, flashSale: true },
  { id: "c4", category: "bazi", title: "八字命理系统精讲", cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80", coverRatio: "1:1", teacher: "张师傅", teacherAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80", price: 268, originalPrice: 498, students: 4100, lessons: 52, rating: 4.9, tag: "热销" },
  { id: "c5", category: "qimen", title: "奇门遁甲实战应用", cover: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&q=80", coverRatio: "3:4", teacher: "赵先生", teacherAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80", price: 388, originalPrice: 688, students: 920, lessons: 40, rating: 4.8 },
  { id: "c6", category: "qiming", title: "宝宝起名改名全攻略", cover: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80", coverRatio: "1:1", teacher: "李老师", teacherAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80", price: 99, originalPrice: 199, students: 2700, lessons: 18, rating: 4.7, tag: "新品", isNew: true },
  { id: "c7", category: "mianxiang", title: "面相识人快速入门", cover: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80", coverRatio: "3:4", teacher: "周老师", teacherAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80", price: 0, free: true, students: 8600, lessons: 12, rating: 4.6 },
  { id: "c8", category: "bazi", title: "八字合婚实操课", cover: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80", coverRatio: "1:1", teacher: "孙大师", teacherAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80", price: 0, free: true, students: 1500, lessons: 20, rating: 4.8 },
  { id: "c9", category: "ziwei", title: "紫微飞星进阶秘传", cover: "https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?w=400&q=80", coverRatio: "3:4", teacher: "林道长", teacherAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80", price: 458, originalPrice: 888, students: 680, lessons: 60, rating: 4.9, tag: "新品", isNew: true },
  { id: "c10", category: "fengshui", title: "阳宅风水布局详解", cover: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", coverRatio: "1:1", teacher: "王大师", teacherAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", price: 199, originalPrice: 399, students: 2200, lessons: 32, rating: 4.7, isNew: true },
]

// 专栏数据派生
const featured = allCourses.filter((c) => c.tag === "热销").slice(0, 6)
const ranking = [...allCourses].sort((a, b) => (b.students ?? 0) - (a.students ?? 0)).slice(0, 5)
const flashSale = allCourses.filter((c) => c.flashSale)
const freeCourses = allCourses.filter((c) => c.free)
const newCourses = allCourses.filter((c) => c.isNew)

const breakpointColumns = { default: 2, 640: 2 }

export default function CoursesPage() {
  const [activeCategory, setActiveCategory] = useState("all")

  const selected = allCourses.filter(
    (c) => activeCategory === "all" || c.category === activeCategory,
  )

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 px-4 h-14">
          <BackButton fallbackPath="/discover" />
          <h1 className="text-lg font-semibold text-foreground">国学课程</h1>
        </div>
        {/* AI 搜索栏 */}
        <div className="px-4 pb-3">
          <Link
            href="/search?from=course"
            className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-secondary text-muted-foreground"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="text-sm flex-1 truncate">搜索课程、讲师...</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium shrink-0">
              <Sparkles className="w-3 h-3" />
              AI
            </span>
          </Link>
        </div>
      </header>

      {/* Banner 轮播 */}
      <HomeBanner banners={courseBanners} />

      {/* 分类导航 */}
      <section className="px-4 py-3">
        <div className="grid grid-cols-4 gap-y-4">
          {categoryNav.map((cat) => (
            <Link
              key={cat.id}
              href={`/courses-list?category=${cat.id}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className="flex items-center justify-center w-12 h-12 rounded-2xl"
                style={{ background: `${cat.color}1a` }}
              >
                <cat.icon className="w-6 h-6" style={{ color: cat.color }} />
              </span>
              <span className="text-[12px] text-foreground">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 限时优惠（突出展示） */}
      {flashSale.length > 0 && (
        <section className="mt-2">
          <SectionHeader
            icon={Clock}
            title="限时优惠"
            subtitle="好课五折抢"
            moreHref="/courses/flash-sale"
            iconColor="#e67e22"
          />
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
            {flashSale.map((c) => (
              <CourseCard key={c.id} data={c} variant="rail" />
            ))}
          </div>
        </section>
      )}

      {/* 精选好课 */}
      {featured.length > 0 && (
        <section className="mt-5">
          <SectionHeader
            icon={Award}
            title="精选好课"
            subtitle="编辑严选"
            moreHref="/courses-list?sort=recommend"
            iconColor="#c0392b"
          />
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
            {featured.map((c) => (
              <CourseCard key={c.id} data={c} variant="rail" />
            ))}
          </div>
        </section>
      )}

      {/* 热门排行 */}
      {ranking.length > 0 && (
        <section className="mt-5">
          <SectionHeader
            icon={Flame}
            title="热门排行"
            subtitle="学员都在学"
            moreHref="/courses-list?sort=popular"
            iconColor="#e74c3c"
          />
          <div className="mx-4 rounded-2xl bg-card border border-border px-3 divide-y divide-border">
            {ranking.map((c, i) => (
              <CourseCard key={c.id} data={c} variant="rank" rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* 会员免费 */}
      {freeCourses.length > 0 && (
        <section className="mt-5">
          <SectionHeader
            icon={Crown}
            title="会员免费"
            subtitle="开通会员畅学"
            moreHref="/courses-list?filter=free"
            iconColor="#16a085"
          />
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
            {freeCourses.map((c) => (
              <CourseCard key={c.id} data={c} variant="rail" />
            ))}
          </div>
        </section>
      )}

      {/* 新上架 */}
      {newCourses.length > 0 && (
        <section className="mt-5">
          <SectionHeader
            icon={Sparkles}
            title="新上架"
            subtitle="抢先学习"
            moreHref="/courses-list?sort=newest"
            iconColor="#2980b9"
          />
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
            {newCourses.map((c) => (
              <CourseCard key={c.id} data={c} variant="rail" />
            ))}
          </div>
        </section>
      )}

      {/* 精选课程瀑布流 + 分类切换 */}
      <section className="mt-6">
        <div className="flex items-center gap-2 px-4 mb-3">
          <h2 className="text-[17px] font-bold tracking-tight text-foreground">为你精选</h2>
          <Link href="/courses-list" className="ml-auto text-[13px] text-muted-foreground">
            更多课程
          </Link>
        </div>
        {/* 分类筛选 */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {[{ id: "all", label: "全部" },
            { id: "bazi", label: "八字命理" },
            { id: "ziwei", label: "紫微斗数" },
            { id: "fengshui", label: "风水堪舆" },
            { id: "qimen", label: "奇门遁甲" },
            { id: "mianxiang", label: "面相手相" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-sm transition-colors",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="px-4">
          {selected.length > 0 ? (
            <Masonry
              breakpointCols={breakpointColumns}
              className="flex gap-3"
              columnClassName="flex flex-col gap-3"
            >
              {selected.map((course) => (
                <CourseCard key={course.id} data={course} variant="feed" />
              ))}
            </Masonry>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">该分类暂无课程</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
