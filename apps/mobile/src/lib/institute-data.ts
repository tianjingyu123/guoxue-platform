// 研究院（书院）相关 mock 数据 —— 1:1 复刻原型 lib/api/institute.ts
import { apiGet, apiPost, apiPut, useMock } from '@/utils/request'

export type InstructorLevel = 'junior' | 'senior' | 'expert' | 'master'
export type InstructorStatus = 'active' | 'inactive' | 'pending'
export type InstituteEventType = 'lecture' | 'seminar' | 'workshop' | 'conference' | 'online'
export type InstituteEventStatus = 'upcoming' | 'enrolling' | 'ongoing' | 'ended'
export type ApplicationStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected'
export type TaskStatus = 'available' | 'in_progress' | 'submitted' | 'completed' | 'expired' | 'abandoned'
export type TaskType = 'course' | 'article' | 'qa' | 'live' | 'review' | 'other'

export interface Instructor {
  id: number
  name: string
  avatar: string
  title: string
  level: InstructorLevel
  verified: boolean
  specialties: string[]
  bio?: string
  studentCount: number
  courseCount: number
  rating: number
  reviewCount: number
  status: InstructorStatus
  isFollowing?: boolean
}

export interface InstituteEvent {
  id: number
  title: string
  cover: string
  type: InstituteEventType
  status: InstituteEventStatus
  startTime: string
  endTime: string
  location?: string
  isOnline: boolean
  speakers: { id: number; name: string; avatar: string; title: string }[]
  maxParticipants?: number
  currentParticipants: number
  price: number
  originalPrice?: number
  description?: string
  tags?: string[]
}

export interface InstituteInfo {
  name: string
  slogan: string
  mission: string
  description: string
  bannerUrl: string
  stats: { instructorCount: number; studentCount: number; courseCount: number; eventCount: number }
}

// ===== 讲师 =====
export const _mockInstructors: Instructor[] = [
  { id: 1, name: '李明德', avatar: '/placeholder.svg', title: '资深命理师', level: 'master', verified: true, specialties: ['八字命理', '紫微斗数', '姓名学'], bio: '从事命理研究20余年，培养学员超过3000人', studentCount: 3256, courseCount: 12, rating: 4.9, reviewCount: 856, status: 'active', isFollowing: false },
  { id: 2, name: '王玄机', avatar: '/placeholder.svg', title: '紫微斗数专家', level: 'expert', verified: true, specialties: ['紫微斗数', '流年运势', '事业规划'], bio: '紫微斗数研究15年，精通命盘分析与流年推断', studentCount: 2189, courseCount: 8, rating: 4.8, reviewCount: 567, status: 'active', isFollowing: true },
  { id: 3, name: '赵风水', avatar: '/placeholder.svg', title: '风水堪舆大师', level: 'master', verified: true, specialties: ['风水堪舆', '家居布局', '商业选址'], bio: '风水堪舆实战派大师，服务企业500+', studentCount: 1567, courseCount: 6, rating: 4.9, reviewCount: 423, status: 'active', isFollowing: false },
  { id: 4, name: '孙易道', avatar: '/placeholder.svg', title: '周易研究学者', level: 'senior', verified: true, specialties: ['周易', '六爻', '梅花易数'], bio: '专注周易研究，著有多部易学著作', studentCount: 987, courseCount: 5, rating: 4.7, reviewCount: 234, status: 'active', isFollowing: false },
  { id: 5, name: '钱奇门', avatar: '/placeholder.svg', title: '奇门遁甲专家', level: 'expert', verified: true, specialties: ['奇门遁甲', '择日', '预测决策'], bio: '奇门遁甲实战应用专家，企业决策顾问', studentCount: 756, courseCount: 4, rating: 4.8, reviewCount: 189, status: 'active', isFollowing: false },
]

// ===== 活动 =====
export const _mockInstituteEvents: InstituteEvent[] = [
  { id: 1, title: '八字命理高峰论坛', cover: '/placeholder.svg', type: 'conference', status: 'upcoming', startTime: '2026-06-15 09:00', endTime: '2026-06-15 17:00', location: '北京国际会议中心', isOnline: false, speakers: [{ id: 1, name: '李明德', avatar: '/placeholder.svg', title: '资深命理师' }, { id: 2, name: '王玄机', avatar: '/placeholder.svg', title: '紫微斗数专家' }], maxParticipants: 200, currentParticipants: 156, price: 299, originalPrice: 399, description: '汇聚业内顶尖专家，探讨八字命理前沿研究', tags: ['高峰论坛', '八字', '行业盛会'] },
  { id: 2, title: '风水堪舆实战研讨会', cover: '/placeholder.svg', type: 'seminar', status: 'enrolling', startTime: '2026-06-20 14:00', endTime: '2026-06-20 18:00', location: '上海易学书院', isOnline: false, speakers: [{ id: 3, name: '赵风水', avatar: '/placeholder.svg', title: '风水堪舆大师' }], maxParticipants: 50, currentParticipants: 38, price: 199, description: '风水实战案例分享，现场互动答疑', tags: ['研讨会', '风水', '实战'] },
  { id: 3, title: '周易入门线上公开课', cover: '/placeholder.svg', type: 'online', status: 'enrolling', startTime: '2026-06-10 20:00', endTime: '2026-06-10 21:30', isOnline: true, speakers: [{ id: 4, name: '孙易道', avatar: '/placeholder.svg', title: '周易研究学者' }], currentParticipants: 1256, price: 0, description: '免费公开课，带你走进周易的奥秘世界', tags: ['公开课', '免费', '周易'] },
]

// ===== 研究院信息 =====
export const _mockInstituteInfo: InstituteInfo = {
  name: '热卜国学研究院',
  slogan: '传承国学智慧，点亮人生方向',
  mission: '致力于国学文化的传承与创新，培养专业人才，推动国学智慧服务现代生活',
  description: '热卜国学研究院是国内领先的国学教育与研究机构，汇聚业内顶尖专家学者，提供系统化的国学课程体系，包括八字命理、紫微斗数、风水堪舆、周易六爻等专业方向。',
  bannerUrl: '/placeholder.svg',
  stats: { instructorCount: 56, studentCount: 32000, courseCount: 128, eventCount: 86 },
}

// ===== 讲师详情（扩展信息，复刻 getInstructorDetail 拼装逻辑）=====
export function getInstructorDetail(id: number) {
  const instructor = _mockInstructors.find((i) => i.id === id) || _mockInstructors[0]
  return {
    ...instructor,
    introduction: `${instructor.name}老师，${instructor.bio}。长期致力于${instructor.specialties.join('、')}等领域的研究与教学工作，积累了丰富的理论知识和实战经验。教学风格深入浅出，善于将复杂的理论知识以通俗易懂的方式传授给学员。`,
    education: ['北京大学哲学系', '中国传统文化研究院'],
    experience: [
      '2006-2010 某知名命理机构 高级命理师',
      '2010-2015 国学培训学院 首席讲师',
      '2015-至今 热卜国学研究院 金牌讲师',
    ],
    certificates: [
      { name: '高级命理咨询师', issuer: '中国传统文化研究会', year: 2012 },
      { name: '国学文化传承师', issuer: '国学教育协会', year: 2018 },
    ],
    featuredCourses: [
      { id: 1, title: '八字命理系统课', cover: '/placeholder.svg', studentCount: 1256, rating: 4.9 },
      { id: 2, title: '紫微斗数精讲', cover: '/placeholder.svg', studentCount: 890, rating: 4.8 },
    ],
    reviews: [
      { id: 1, user: { name: '学员A', avatar: '/placeholder.svg' }, rating: 5, content: '老师讲解非常清晰，受益匪浅', time: '2天前' },
      { id: 2, user: { name: '学员B', avatar: '/placeholder.svg' }, rating: 5, content: '课程内容很系统，推荐给大家', time: '5天前' },
    ],
  }
}

// ===== 标签 / 色彩工具 =====
export const instructorLevelLabel: Record<InstructorLevel, string> = {
  junior: '初级讲师', senior: '高级讲师', expert: '专家讲师', master: '大师级讲师',
}
export const instructorLevelColor: Record<InstructorLevel, { color: string; bg: string }> = {
  junior: { color: '#4b5563', bg: '#f3f4f6' },
  senior: { color: '#2563eb', bg: '#eff6ff' },
  expert: { color: '#9333ea', bg: '#faf5ff' },
  master: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
}
export const eventTypeLabel: Record<InstituteEventType, string> = {
  lecture: '学术讲座', seminar: '研讨会', workshop: '工作坊', conference: '学术会议', online: '线上活动',
}
export const eventTypeColor: Record<InstituteEventType, { color: string; bg: string }> = {
  lecture: { color: '#2563eb', bg: '#eff6ff' },
  seminar: { color: '#9333ea', bg: '#faf5ff' },
  workshop: { color: '#16a34a', bg: '#f0fdf4' },
  conference: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
  online: { color: '#0891b2', bg: '#ecfeff' },
}
export const eventStatusLabel: Record<InstituteEventStatus, string> = {
  upcoming: '即将开始', enrolling: '报名中', ongoing: '进行中', ended: '已结束',
}
export const eventStatusColor: Record<InstituteEventStatus, { color: string; bg: string }> = {
  upcoming: { color: '#2563eb', bg: '#eff6ff' },
  enrolling: { color: '#16a34a', bg: '#f0fdf4' },
  ongoing: { color: '#ea580c', bg: '#fff7ed' },
  ended: { color: '#6b7280', bg: '#f3f4f6' },
}
const applicationStatusLabelMap: Record<ApplicationStatus, string> = {
  draft: '草稿', submitted: '已提交', reviewing: '审核中', approved: '已通过', rejected: '未通过',
}
const applicationStatusColorMap: Record<ApplicationStatus, { color: string; bg: string }> = {
  draft: { color: '#6b7280', bg: '#f3f4f6' },
  submitted: { color: '#2563eb', bg: '#eff6ff' },
  reviewing: { color: '#ea580c', bg: '#fff7ed' },
  approved: { color: '#16a34a', bg: '#f0fdf4' },
  rejected: { color: '#dc2626', bg: '#fef2f2' },
}
export const applicationStatusLabel = (status: ApplicationStatus) => applicationStatusLabelMap[status] || ''
export const applicationStatusColor = (status: ApplicationStatus) => applicationStatusColorMap[status] || { color: '#9a2e25', bg: 'rgba(154,46,37,0.1)' }

export interface InstituteApplication {
  id?: number
  realName: string
  phone: string
  email?: string
  specialties: string[]
  experience: string
  introduction: string
  certificates: string[]
  trialVideoUrl?: string
  status: ApplicationStatus
  submittedAt?: string
  reviewComment?: string
}

// ===== 讲师申请：专长选项 =====
export const applySpecialtyOptions = ['八字命理', '紫微斗数', '风水堪舆', '周易六爻', '奇门遁甲', '姓名学', '梅花易数', '手相面相', '塔罗占卜', '其他']

// ===== 讲师任务 =====
export interface InstructorTask {
  id: number
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  reward: { points: number; bonus?: number }
  deadline: string
  acceptedAt?: string
  submittedAt?: string
  completedAt?: string
  requirements?: string[]
  submission?: { content: string; attachments?: string[]; submittedAt: string }
  reviewComment?: string
  createdAt: string
}

export const _mockInstructorTasks: InstructorTask[] = [
  { id: 1, title: '录制八字入门视频课程', description: '录制一套完整的八字命理入门视频课程，包含基础理论、排盘方法、实例解析等内容，时长不少于3小时。', type: 'course', status: 'available', reward: { points: 500, bonus: 2000 }, deadline: '2026-06-30', requirements: ['视频清晰度1080P以上', '配套PPT讲义', '至少10个实例分析'], createdAt: '2026-06-01' },
  { id: 2, title: '撰写紫微斗数专栏文章', description: '撰写5篇紫微斗数相关的专栏文章，每篇不少于2000字，需原创且具有专业深度。', type: 'article', status: 'in_progress', reward: { points: 200, bonus: 500 }, deadline: '2026-06-20', acceptedAt: '2026-06-05', requirements: ['原创内容', '每篇2000字以上', '配图3张以上'], createdAt: '2026-06-01' },
  { id: 3, title: '回答学员问题（20题）', description: '在问答区回答学员提出的命理相关问题，需认真详细解答，帮助学员理解。', type: 'qa', status: 'completed', reward: { points: 100 }, deadline: '2026-06-10', acceptedAt: '2026-06-03', completedAt: '2026-06-08', createdAt: '2026-05-28' },
  { id: 4, title: '开展一场直播公开课', description: '面向平台用户开展一场时长不少于1小时的直播公开课，主题自定。', type: 'live', status: 'available', reward: { points: 300, bonus: 800 }, deadline: '2026-06-25', requirements: ['时长1小时以上', '互动答疑环节', '提前3天报备主题'], createdAt: '2026-06-02' },
  { id: 5, title: '审核新讲师试讲视频', description: '审核3位新申请讲师的试讲视频，给出专业评价和建议。', type: 'review', status: 'submitted', reward: { points: 150 }, deadline: '2026-06-15', acceptedAt: '2026-06-08', submittedAt: '2026-06-12', submission: { content: '已完成3位讲师的试讲视频审核，详细评价已提交。', submittedAt: '2026-06-12 15:30' }, createdAt: '2026-06-05' },
]

export const taskStats = { available: 2, inProgress: 2, completed: 1, totalReward: 3800 }

export const taskTypeLabel: Record<TaskType, string> = {
  course: '课程制作', article: '文章撰写', qa: '问答解答', live: '直播授课', review: '内容审核', other: '其他',
}
export const taskTypeColor: Record<TaskType, { color: string; bg: string }> = {
  course: { color: '#2563eb', bg: '#eff6ff' },
  article: { color: '#16a34a', bg: '#f0fdf4' },
  qa: { color: '#9333ea', bg: '#faf5ff' },
  live: { color: '#dc2626', bg: '#fef2f2' },
  review: { color: '#ea580c', bg: '#fff7ed' },
  other: { color: '#4b5563', bg: '#f9fafb' },
}
export const taskStatusLabel: Record<TaskStatus, string> = {
  available: '可领取', in_progress: '进行中', submitted: '已提交', completed: '已完成', expired: '已过期', abandoned: '已放弃',
}
export const taskStatusColor: Record<TaskStatus, { color: string; bg: string }> = {
  available: { color: '#16a34a', bg: '#f0fdf4' },
  in_progress: { color: '#2563eb', bg: '#eff6ff' },
  submitted: { color: '#ea580c', bg: '#fff7ed' },
  completed: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
  expired: { color: '#6b7280', bg: '#f3f4f6' },
  abandoned: { color: '#dc2626', bg: '#fef2f2' },
}

// ===== 线下老师人才库 teacher-pool（原型页面内联mock，含自定义色token gold/info/success）=====
export type OfflineTeacherLevel = 'senior' | 'intermediate' | 'junior'
export interface OfflineTeacher {
  id: number
  name: string
  level: OfflineTeacherLevel
  specialty: string[]
  location: string
  rating: number
  coursesCount: number
  studentsCount: number
  price: { min: number; max: number }
  available: boolean
  nextAvailable?: string
  intro: string
  tags: string[]
}
export const offlineTeacherLevelConfig: Record<OfflineTeacherLevel, { label: string; color: string; bg: string }> = {
  senior: { label: '高级讲师', color: '#d4a017', bg: 'rgba(212,160,23,0.1)' },
  intermediate: { label: '中级讲师', color: '#2563eb', bg: '#eff6ff' },
  junior: { label: '初级讲师', color: '#16a34a', bg: '#f0fdf4' },
}
export const _mockOfflineTeachers: OfflineTeacher[] = [
  { id: 1, name: '张道玄', level: 'senior', specialty: ['八字命理', '六爻预测'], location: '北京', rating: 4.9, coursesCount: 128, studentsCount: 3680, price: { min: 3000, max: 8000 }, available: true, intro: '从事命理研究30余年，师承多位名家，擅长八字格局分析和六爻实战预测。', tags: ['理论扎实', '案例丰富', '通俗易懂'] },
  { id: 2, name: '李易安', level: 'senior', specialty: ['紫微斗数', '星象占卜'], location: '上海', rating: 4.8, coursesCount: 96, studentsCount: 2850, price: { min: 2500, max: 6000 }, available: true, intro: '紫微斗数传承人，深耕斗数研究20年，独创「易安飞星派」。', tags: ['体系完整', '实战派', '答疑耐心'] },
  { id: 3, name: '王明德', level: 'senior', specialty: ['风水堪舆', '阳宅布局'], location: '广州', rating: 4.9, coursesCount: 86, studentsCount: 2160, price: { min: 5000, max: 15000 }, available: false, nextAvailable: '2024-04-15', intro: '玄空风水第四代传人，实地考察案例超过500例。', tags: ['实地教学', '案例真实', '经验丰富'] },
  { id: 4, name: '陈太极', level: 'intermediate', specialty: ['易经占卜', '梅花易数'], location: '成都', rating: 4.7, coursesCount: 62, studentsCount: 1580, price: { min: 1500, max: 4000 }, available: true, intro: '易经研究15年，擅长将复杂理论简单化，适合初学者入门。', tags: ['入门首选', '讲解清晰', '互动性强'] },
  { id: 5, name: '赵无极', level: 'intermediate', specialty: ['奇门遁甲', '大六壬'], location: '南京', rating: 4.6, coursesCount: 48, studentsCount: 1260, price: { min: 2000, max: 5000 }, available: true, intro: '奇门遁甲实战派代表，注重理论与实践结合。', tags: ['实战为主', '案例教学', '思路清晰'] },
  { id: 6, name: '周天师', level: 'junior', specialty: ['面相手相', '体相学'], location: '西安', rating: 4.5, coursesCount: 32, studentsCount: 860, price: { min: 1000, max: 2500 }, available: true, intro: '相学研究10年，擅长面相、手相、体相综合分析。', tags: ['细致入微', '实用性强', '性价比高'] },
]
export const offlineTeacherSpecialties = ['全部', '八字命理', '紫微斗数', '风水堪舆', '易经占卜', '奇门遁甲', '面相手相']
export const offlineTeacherCities = ['全部', '北京', '上海', '广州', '成都', '南京', '西安']

// ===== 课程需求大厅 teacher-demand（原型页面内联mock）=====
export type DemandStatus = 'recruiting' | 'matched' | 'confirmed' | 'completed' | 'cancelled'
export interface TeacherDemand {
  id: number
  stationName: string
  stationLocation: string
  title: string
  specialty: string
  date: string
  duration: string
  studentCount: number
  budget: { min: number; max: number }
  status: DemandStatus
  applicants: number
  description: string
  requirements: string[]
  createdAt: string
}
export const demandStatusConfig: Record<DemandStatus, { label: string; color: string; bg: string }> = {
  recruiting: { label: '招募中', color: '#16a34a', bg: '#f0fdf4' },
  matched: { label: '已匹配', color: '#2563eb', bg: '#eff6ff' },
  confirmed: { label: '已确认', color: '#ea580c', bg: '#fff7ed' },
  completed: { label: '已完成', color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: '已取消', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}
export const _mockTeacherDemands: TeacherDemand[] = [
  { id: 1, stationName: '北京国学驿站', stationLocation: '北京·朝阳区', title: '八字命理高级班授课老师', specialty: '八字命理', date: '2024-04-15 至 2024-04-17', duration: '3天/18课时', studentCount: 30, budget: { min: 15000, max: 25000 }, status: 'recruiting', applicants: 5, description: '招募资深八字命理老师，为高级班学员授课，要求有丰富的实战经验和教学经验。', requirements: ['5年以上授课经验', '研究院成员优先', '可提供往期课程录像'], createdAt: '2024-03-18' },
  { id: 2, stationName: '上海易学馆', stationLocation: '上海·静安区', title: '紫微斗数入门班讲师', specialty: '紫微斗数', date: '2024-04-20 至 2024-04-21', duration: '2天/12课时', studentCount: 25, budget: { min: 8000, max: 12000 }, status: 'recruiting', applicants: 3, description: '招募紫微斗数讲师，负责入门班教学，需要有系统的教学大纲。', requirements: ['3年以上授课经验', '有完整教学体系', '善于与学员互动'], createdAt: '2024-03-20' },
  { id: 3, stationName: '广州玄学堂', stationLocation: '广州·天河区', title: '风水堪舆实地教学', specialty: '风水堪舆', date: '2024-05-01 至 2024-05-03', duration: '3天实地考察', studentCount: 15, budget: { min: 20000, max: 35000 }, status: 'matched', applicants: 8, description: '组织风水实地考察教学，需要老师带队讲解真实案例。', requirements: ['高级讲师', '本地有多个可考察案例', '配合度高'], createdAt: '2024-03-15' },
  { id: 4, stationName: '成都周易学社', stationLocation: '成都·武侯区', title: '易经基础班周末课程', specialty: '易经占卜', date: '2024-04-06、07、13、14', duration: '4天/24课时', studentCount: 40, budget: { min: 12000, max: 18000 }, status: 'confirmed', applicants: 6, description: '周末易经基础课程，面向零基础学员。', requirements: ['教学经验丰富', '课程内容通俗易懂', '周末时间充裕'], createdAt: '2024-03-10' },
]
export const demandTabs = [
  { id: 'all', label: '全部' },
  { id: 'recruiting', label: '招募中' },
  { id: 'matched', label: '已匹配' },
  { id: 'completed', label: '已完成' },
]

// ===== 发布师资需求 teacher-demand/create 表单选项 =====
export const demandSpecialtyOptions = ['八字命理', '紫微斗数', '风水堪舆', '奇门遁甲', '易经', '梅花易数', '六爻', '其他']
export const demandTeachTypes = ['线上直播', '线下授课', '录播课程', '一对一咨询', '不限']
export const demandSalaries = ['面议', '500-1000元/次', '1000-3000元/次', '3000元以上/次', '月薪制']

// ===== 研究院成员 members（原型页面内联mock，职位排序 院长>副院长>秘书长>成员）=====
export type MemberRole = 'dean' | 'vice_dean' | 'secretary' | 'member'
export interface InstituteMember {
  id: number
  name: string
  role: MemberRole
  title: string
  circleName: string
  circleMembers: number
  joinDate: string
  contributions: number
  isOnlineTeacher: boolean
  location?: string
}
export const memberRoleConfig: Record<MemberRole, { label: string; color: string; bg: string; order: number }> = {
  dean: { label: '院长', color: '#d4a017', bg: 'rgba(212,160,23,0.12)', order: 1 },
  vice_dean: { label: '副院长', color: '#64748b', bg: '#f1f5f9', order: 2 },
  secretary: { label: '秘书长', color: '#2563eb', bg: '#eff6ff', order: 3 },
  member: { label: '成员', color: '#9ca3af', bg: '#f3f4f6', order: 4 },
}
export const _mockInstituteMembers: InstituteMember[] = [
  { id: 1, name: '张道玄', role: 'dean', title: '八字命理', circleName: '玄学命理研习社', circleMembers: 3280, joinDate: '2022-01-01', contributions: 48, isOnlineTeacher: true, location: '北京' },
  { id: 2, name: '李易安', role: 'secretary', title: '紫微斗数', circleName: '紫微斗数研究会', circleMembers: 2150, joinDate: '2022-03-15', contributions: 36, isOnlineTeacher: true, location: '上海' },
  { id: 3, name: '王明德', role: 'secretary', title: '风水堪舆', circleName: '风水地理学社', circleMembers: 1860, joinDate: '2022-02-20', contributions: 32, isOnlineTeacher: true, location: '广州' },
  { id: 4, name: '陈太极', role: 'vice_dean', title: '易经占卜', circleName: '周易研习圈', circleMembers: 1520, joinDate: '2022-06-10', contributions: 28, isOnlineTeacher: true, location: '成都' },
  { id: 5, name: '刘玄机', role: 'vice_dean', title: '六爻预测', circleName: '六爻占卦研究会', circleMembers: 1380, joinDate: '2022-08-05', contributions: 24, isOnlineTeacher: false, location: '杭州' },
  { id: 6, name: '赵无极', role: 'vice_dean', title: '奇门遁甲', circleName: '奇门遁甲学社', circleMembers: 1260, joinDate: '2022-09-12', contributions: 22, isOnlineTeacher: true, location: '南京' },
  { id: 7, name: '孙易理', role: 'member', title: '梅花易数', circleName: '梅花易数研习社', circleMembers: 980, joinDate: '2023-01-20', contributions: 18, isOnlineTeacher: false, location: '武汉' },
  { id: 8, name: '周天师', role: 'member', title: '面相手相', circleName: '相学研究会', circleMembers: 1120, joinDate: '2023-03-08', contributions: 16, isOnlineTeacher: true, location: '西安' },
  { id: 9, name: '吴玄真', role: 'member', title: '起名择日', circleName: '姓名学研习社', circleMembers: 860, joinDate: '2023-05-15', contributions: 14, isOnlineTeacher: false, location: '重庆' },
  { id: 10, name: '郑易心', role: 'member', title: '八字命理', circleName: '命理实战研究会', circleMembers: 720, joinDate: '2023-07-22', contributions: 12, isOnlineTeacher: false, location: '天津' },
]
export const memberFilterOptions = [
  { id: 'all', label: '全部' },
  { id: 'leadership', label: '管理层' },
  { id: 'teacher', label: '人才库' },
]

// ===== 成员申请 member-apply（4步向导：资格检查/填资料/支付保证金/完成）=====
export const memberApplyRequirements = [
  { id: 'circle_owner', icon: 'crown', label: '必须是圈主', desc: '拥有自己的圈子', met: true },
  { id: 'members', icon: 'users', label: '圈成员≥100人', desc: '圈子有一定规模', met: true },
  { id: 'days', icon: 'calendar', label: '圈子运营≥90天', desc: '持续运营能力', met: true },
  { id: 'verified', icon: 'shield', label: '完成实名认证', desc: '身份认证', met: true },
]
export const memberApplyTasks = [
  { icon: 'video', label: '每月至少2场线上直播', period: '月度任务' },
  { icon: 'map-pin', label: '每季度至少1次线下小范围交流分享', period: '季度任务' },
  { icon: 'mic', label: '每年至少1次大范围交流分享', period: '年度任务' },
]
export const _mockMemberApplyUserCircles = [
  { id: '1', name: '八字命理研习社', members: 1280, days: 365 },
  { id: '2', name: '紫微斗数学习班', members: 560, days: 120 },
]
export const memberApplySteps = ['资格检查', '填写资料', '支付保证金', '申请完成']

// ===== 发布需求 demands/create（与师资需求不同，通用合作需求）=====
export const demandCreateCategories = ['课程合作', '内容创作', '讲师邀约', '联合运营', '品牌推广', '其他']
export const demandCreateBudgets = ['面议', '1万以内', '1-5万', '5-10万', '10万以上']

// ============ API 层 ============

export const instituteApi = {
  /** 获取书院介绍 — GET /institute/intro */
  async getIntro(): Promise<InstituteInfo> {
    if (true) return _mockInstituteInfo
    try {
      const data = await apiGet<any>('/institute/intro')
      return data as InstituteInfo
    } catch {
      return _mockInstituteInfo
    }
  },

  /** 获取成员列表 — GET /institute/members */
  async getMembers(): Promise<InstituteMember[]> {
    if (true) return _mockInstituteMembers
    try {
      const data = await apiGet<any[]>('/institute/members')
      return data || _mockInstituteMembers
    } catch {
      return _mockInstituteMembers
    }
  },

  /** 获取成员详情 — GET /institute/members/:id */
  async getMember(id: number): Promise<any> {
    if (true) {
      const member = _mockInstituteMembers.find(m => m.id === id) || _mockInstituteMembers[0]
      return member
    }
    try {
      const data = await apiGet<any>(`/institute/members/${id}`)
      return data || (_mockInstituteMembers.find(m => m.id === id) || _mockInstituteMembers[0])
    } catch {
      return _mockInstituteMembers.find(m => m.id === id) || _mockInstituteMembers[0]
    }
  },

  /** 获取活动列表 — GET /institute/events */
  async getEvents(): Promise<InstituteEvent[]> {
    if (true) return _mockInstituteEvents
    try {
      const data = await apiGet<any[]>('/institute/events')
      return data || _mockInstituteEvents
    } catch {
      return _mockInstituteEvents
    }
  },

  /** 获取人才库 — GET /institute/talent-pool */
  async getTalentPool(): Promise<OfflineTeacher[]> {
    if (true) return _mockOfflineTeachers
    try {
      const data = await apiGet<any[]>('/institute/talent-pool')
      return data || _mockOfflineTeachers
    } catch {
      return _mockOfflineTeachers
    }
  },

  /** 申请加入 — POST /institute/members */
  async applyMember(data: InstituteApplication): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: '申请已提交' }
    try {
      await apiPost('/institute/members', data)
      return { success: true, message: '申请已提交' }
    } catch (e: any) {
      return { success: false, message: e?.message || '申请失败' }
    }
  },

  /** 我的书院 — GET /institute/my */
  async getMy(): Promise<any> {
    if (true) return { name: _mockInstituteInfo.name, role: 'member', joinDate: '2024-01-15' }
    try {
      const data = await apiGet<any>('/institute/my')
      return data || { name: _mockInstituteInfo.name, role: 'member', joinDate: '2024-01-15' }
    } catch {
      return { name: _mockInstituteInfo.name, role: 'member', joinDate: '2024-01-15' }
    }
  },

  /** 获取我的任务 — GET /institute/my/tasks */
  async getMyTasks(): Promise<InstructorTask[]> {
    if (true) return _mockInstructorTasks
    try {
      const data = await apiGet<any[]>('/institute/my/tasks')
      return data || _mockInstructorTasks
    } catch {
      return _mockInstructorTasks
    }
  },

  /** 完成任务 — POST /institute/my/tasks/:id/complete */
  async completeTask(id: number): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: '任务已完成' }
    try {
      await apiPost(`/institute/my/tasks/${id}/complete`)
      return { success: true, message: '任务已完成' }
    } catch (e: any) {
      return { success: false, message: e?.message || '操作失败' }
    }
  },

  /** 押金退还 — POST /institute/my/deposit-refund */
  async depositRefund(): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: '押金退还申请已提交' }
    try {
      await apiPost('/institute/my/deposit-refund')
      return { success: true, message: '押金退还申请已提交' }
    } catch (e: any) {
      return { success: false, message: e?.message || '申请失败' }
    }
  },

  /** 分红记录 — GET /institute/my/dividends */
  async getDividends(): Promise<any[]> {
    if (true) return []
    try {
      const data = await apiGet<any[]>('/institute/my/dividends')
      return data || []
    } catch {
      return []
    }
  },

  /** 管理概览 — GET /institute/manage/overview */
  async getManageOverview(): Promise<any> {
    if (true) return { totalMembers: 10, pendingApprovals: 3, activeTasks: 5, monthlyRevenue: 50000 }
    try {
      const data = await apiGet<any>('/institute/manage/overview')
      return data || { totalMembers: 10, pendingApprovals: 3, activeTasks: 5, monthlyRevenue: 50000 }
    } catch {
      return { totalMembers: 10, pendingApprovals: 3, activeTasks: 5, monthlyRevenue: 50000 }
    }
  },

  /** 待审核成员 — GET /institute/manage/pending-members */
  async getPendingMembers(): Promise<InstituteMember[]> {
    if (true) return _mockInstituteMembers.filter(m => m.role === 'member').slice(0, 3)
    try {
      const data = await apiGet<any[]>('/institute/manage/pending-members')
      return data || _mockInstituteMembers.filter(m => m.role === 'member').slice(0, 3)
    } catch {
      return _mockInstituteMembers.filter(m => m.role === 'member').slice(0, 3)
    }
  },

  /** 审核成员 — PUT /institute/manage/members/:id/approve */
  async approveMember(id: number, approved: boolean): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: approved ? '已通过' : '已拒绝' }
    try {
      await apiPut(`/institute/manage/members/${id}/approve`, { approved })
      return { success: true, message: approved ? '已通过' : '已拒绝' }
    } catch (e: any) {
      return { success: false, message: e?.message || '操作失败' }
    }
  },

  /** 角色变更 — PUT /institute/manage/members/:id/role */
  async changeRole(id: number, role: string): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: '角色已更新' }
    try {
      await apiPut(`/institute/manage/members/${id}/role`, { role })
      return { success: true, message: '角色已更新' }
    } catch (e: any) {
      return { success: false, message: e?.message || '操作失败' }
    }
  },
}

// 向后兼容导出（页面仍使用旧名称，后续统一升级到API模式后移除）
export const instructors = _mockInstructors
export const instituteEvents = _mockInstituteEvents
export const instituteInfo = _mockInstituteInfo
export const instructorTasks = _mockInstructorTasks
export const offlineTeachers = _mockOfflineTeachers
export const teacherDemands = _mockTeacherDemands
export const instituteMembers = _mockInstituteMembers
export const memberApplyUserCircles = _mockMemberApplyUserCircles
