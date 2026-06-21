/** 讲师详情数据 - 从原型 institute/instructors/[id]/page.tsx 迁移 */
// @data-needs: 讲师详情聚合, 参数 instructorId, 返回 InstructorDetail
// mock 数据，交付时由 Claude Code 替换为真实接口

export interface InstructorCertificate { name: string; issuer: string; year: string }
export interface InstructorFeaturedCourse {
  id: string
  title: string
  cover: string
  studentCount: string
  rating: number
}
export interface InstructorReview {
  id: string
  user: { id: string; name: string; avatar: string }
  rating: number
  content: string
  time: string
}
export interface InstructorDetail {
  id: string
  name: string
  avatar: string
  title: string
  level: 'gold' | 'silver' | 'normal'
  verified: boolean
  specialties: string[]
  studentCount: string
  courseCount: number
  rating: number
  reviewCount: number
  isFollowing: boolean
  introduction: string
  education: string[]
  experience: string[]
  certificates: InstructorCertificate[]
  featuredCourses: InstructorFeaturedCourse[]
  reviews: InstructorReview[]
}

/** 讲师等级标签 */
export function getInstructorLevelLabel(level: InstructorDetail['level']): string {
  return { gold: '金牌讲师', silver: '银牌讲师', normal: '认证讲师' }[level] || '认证讲师'
}
/** 讲师等级配色（返回 {color,bg}） */
export function getInstructorLevelStyle(level: InstructorDetail['level']): { color: string; bg: string } {
  const map = {
    gold: { color: '#B45309', bg: '#FEF3C7' },
    silver: { color: '#475569', bg: '#E2E8F0' },
    normal: { color: '#C41E3A', bg: '#FBE8EA' },
  }
  return map[level] || map.normal
}

export const instructorDetail: InstructorDetail = {
  id: '1',
  name: '李明德',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=limingde',
  title: '国学研究院首席讲师 · 易学博士',
  level: 'gold',
  verified: true,
  specialties: ['八字命理', '周易预测', '风水堪舆', '国学经典'],
  studentCount: '1.2万',
  courseCount: 18,
  rating: 4.9,
  reviewCount: 326,
  isFollowing: false,
  introduction:
    '李明德教授，国学研究院首席讲师，从事易学研究与教学二十余年。师承当代易学名家，精研《周易》《黄帝内经》《滴天髓》等经典，将传统命理与现代生活智慧相结合，授课深入浅出，深受学员喜爱。累计培养专业命理师三百余名。',
  education: [
    '北京大学哲学系 易学方向博士',
    '中国社会科学院 国学研究访问学者',
    '台湾师范大学 中国文学硕士',
  ],
  experience: [
    '国学研究院首席讲师（2015 至今）',
    '某知名易学平台特约顾问（2010-2015）',
    '多家企业风水堪舆顾问',
  ],
  certificates: [
    { name: '高级周易预测师', issuer: '中国周易学会', year: '2012' },
    { name: '国家二级心理咨询师', issuer: '人力资源和社会保障部', year: '2014' },
    { name: '传统文化讲师认证', issuer: '中华传统文化促进会', year: '2016' },
  ],
  featuredCourses: [
    {
      id: 'c1',
      title: '八字命理从入门到精通：21天系统课',
      cover: 'https://api.dicebear.com/7.x/shapes/svg?seed=course1',
      studentCount: '3.5千',
      rating: 4.9,
    },
    {
      id: 'c2',
      title: '周易六十四卦详解与实战占断',
      cover: 'https://api.dicebear.com/7.x/shapes/svg?seed=course2',
      studentCount: '2.1千',
      rating: 4.8,
    },
    {
      id: 'c3',
      title: '家居风水布局：财位与健康',
      cover: 'https://api.dicebear.com/7.x/shapes/svg?seed=course3',
      studentCount: '1.8千',
      rating: 4.7,
    },
  ],
  reviews: [
    {
      id: 'r1',
      user: { id: 'u1', name: '王*华', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u1' },
      rating: 5,
      content: '李老师讲课非常细致，把复杂的八字理论讲得通俗易懂，跟着学了两个月已经能自己排盘分析了，强烈推荐！',
      time: '2026-05-12',
    },
    {
      id: 'r2',
      user: { id: 'u2', name: '陈*明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u2' },
      rating: 5,
      content: '系统性很强，从基础到实战循序渐进，老师答疑也很耐心。',
      time: '2026-04-28',
    },
    {
      id: 'r3',
      user: { id: 'u3', name: '刘*芳', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u3' },
      rating: 4,
      content: '内容很扎实，就是课程节奏稍快，需要反复回看，总体满意。',
      time: '2026-04-15',
    },
  ],
}
